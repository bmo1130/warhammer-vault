import fs from 'node:fs';
import assert from 'node:assert/strict';
import {gzipSync,gunzipSync} from 'node:zlib';
import {digest} from '../runtime-evidence/contract.mjs';

// Generic lossless envelope: all processed rows, schema fields and selection
// coverage survive compression. Hash the expanded JSON as well as the envelope.
export function encodeSource(source) {
  return {format:'ca-missile-source-gzip-json-v1',expandedHash:digest(source),
    gzipBase64:gzipSync(Buffer.from(JSON.stringify(source)),{level:9}).toString('base64')};
}
export function decodeSource(envelope) {
  assert.equal(envelope.format,'ca-missile-source-gzip-json-v1');
  const source=JSON.parse(gunzipSync(Buffer.from(envelope.gzipBase64,'base64')));
  assert.equal(digest(source),envelope.expandedHash,'Expanded missile source drift');
  return source;
}
export const loadSource=()=>decodeSource(JSON.parse(fs.readFileSync('tools/wh3-importer/missile-rules/catalog.source.json')));
