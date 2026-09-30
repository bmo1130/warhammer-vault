// RPFM v5.1.0 exposes MCP Streamable HTTP at /mcp. The adapter discovers
// tools/list and checks capabilities before making any tool call.
export class RpfmClient {
  constructor(url = 'http://127.0.0.1:45127/mcp') {
    const parsed = new URL(url);
    if (!['127.0.0.1', 'localhost', '[::1]'].includes(parsed.hostname)) throw new Error('RPFM endpoint must be local loopback.');
    this.url = parsed.href;
    this.id = 0;
    this.sessionId = undefined;
    this.protocolVersion = undefined;
    this.tools = new Map();
  }

  async request(method, params = {}, notification = false) {
    const headers = { 'Content-Type': 'application/json', Accept: 'application/json, text/event-stream' };
    if (this.sessionId) headers['Mcp-Session-Id'] = this.sessionId;
    if (this.protocolVersion) headers['MCP-Protocol-Version'] = this.protocolVersion;
    const payload = { jsonrpc: '2.0', method, params };
    if (!notification) payload.id = ++this.id;
    const response = await fetch(this.url, { method: 'POST', headers, body: JSON.stringify(payload), signal: AbortSignal.timeout(180_000) });
    this.sessionId = response.headers.get('mcp-session-id') ?? this.sessionId;
    if (!response.ok) throw new Error(`RPFM HTTP ${response.status}: ${await response.text()}`);
    if (notification || response.status === 202 || response.status === 204) return;
    let message;
    if (response.headers.get('content-type')?.includes('text/event-stream')) {
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      try {
        while (true) {
          const chunk = await reader.read();
          if (chunk.done) break;
          buffer += decoder.decode(chunk.value, { stream: true }).replace(/\r\n/g, '\n');
          let boundary;
          while ((boundary = buffer.indexOf('\n\n')) >= 0) {
            const event = buffer.slice(0, boundary); buffer = buffer.slice(boundary + 2);
            const data = event.split('\n').filter((line) => line.startsWith('data:')).map((line) => line.slice(5).trimStart()).join('\n');
            if (!data) continue;
            const candidate = JSON.parse(data);
            if (candidate.id === payload.id) { message = candidate; break; }
          }
          if (message) break;
        }
      } finally { await reader.cancel(); }
    } else message = await response.json();
    if (!message) throw new Error(`RPFM response missing for ${method}`);
    if (message.error) throw new Error(`${method}: ${message.error.message}`);
    return message.result;
  }

  async connect() {
    const info = await this.request('initialize', { protocolVersion: '2025-03-26', capabilities: {}, clientInfo: { name: 'warhammer-vault-raw-extractor', version: '0.1.0' } });
    this.protocolVersion = info.protocolVersion;
    await this.request('notifications/initialized', {}, true);
    let cursor;
    do {
      const listed = await this.request('tools/list', cursor ? { cursor } : {});
      for (const tool of listed.tools) this.tools.set(tool.name, tool);
      cursor = listed.nextCursor;
    } while (cursor);
    this.serverInfo = info.serverInfo;
    return this;
  }

  async call(name, args = {}) {
    if (!this.tools.has(name)) throw new Error(`Installed RPFM does not expose required tool: ${name}`);
    const result = await this.request('tools/call', { name, arguments: args });
    const blocks = result.content?.filter((item) => item.type === 'text').map((item) => item.text) ?? [];
    if (result.isError) throw new Error(`${name}: ${blocks.join('\n')}`);
    if (blocks.length !== 1) throw new Error(`${name}: expected one JSON response block`);
    return JSON.parse(blocks[0]);
  }

  async close() {
    if (!this.sessionId) return;
    await fetch(this.url, { method: 'DELETE', headers: { 'Mcp-Session-Id': this.sessionId, 'MCP-Protocol-Version': this.protocolVersion }, signal: AbortSignal.timeout(10_000) });
    this.sessionId = undefined;
  }
}
