import { access, mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { RpfmClient } from './mcp-client.mjs';
import { RawPackReader } from './raw-reader.mjs';
import { traceUnit } from './trace-unit.mjs';
import { observations, addObservationUnresolved, renderSummary } from './report.mjs';
import { getProfile } from './profiles.mjs';
import { sha256File } from './hash.mjs';

const execute = promisify(execFile);
const repositoryRoot = fileURLToPath(new URL('../../', import.meta.url));
const defaultLocalConfig = fileURLToPath(new URL('.local/config.json', import.meta.url));

export async function resolveOptions(argv = [], env = process.env) {
  const flags = {};
  const supported = new Set(['--game-path', '--rpfm-url', '--output-dir', '--config']);
  for (let position = 0; position < argv.length; position++) {
    const flag = argv[position];
    if (!supported.has(flag)) throw new Error(`Unknown argument: ${flag}`);
    const value = argv[++position];
    if (!value || value.startsWith('--')) throw new Error(`Missing value for ${flag}`);
    flags[flag] = value;
  }
  let local = {};
  try { local = JSON.parse(await readFile(flags['--config'] ?? defaultLocalConfig, 'utf8')); }
  catch (error) { if (flags['--config'] || error.code !== 'ENOENT') throw error; }
  const gamePath = flags['--game-path'] ?? env.WH3_GAME_PATH ?? local.gamePath;
  if (typeof gamePath !== 'string' || !gamePath.trim()) throw new Error('WH3 game path missing. Supply --game-path, WH3_GAME_PATH, or an ignored .local/config.json.');
  const root = path.resolve(gamePath);
  try {
    if (!(await stat(root)).isDirectory()) throw new Error('not a directory');
    await access(path.join(root, 'data', 'db.pack'));
    await access(path.join(root, 'data', 'local_en.pack'));
  } catch { throw new Error(`WH3 CA packs not found under ${root}. Expected data/db.pack and data/local_en.pack; supply the game installation root, not a mod folder.`); }
  return { gamePath: root, rpfmUrl: flags['--rpfm-url'] ?? env.RPFM_MCP_URL ?? local.rpfmUrl ?? 'http://127.0.0.1:45127/mcp', outputDir: path.resolve(flags['--output-dir'] ?? local.outputDir ?? path.join(repositoryRoot, 'generated', 'wh3')) };
}

export async function gameVersion(gamePath) {
  if (process.platform !== 'win32') return { gameVersion: 'unknown', gameVersionSource: 'Windows executable version resource unavailable' };
  try {
    const exe = path.join(gamePath, 'Warhammer3.exe');
    await access(exe);
    const { stdout } = await execute('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', '[System.Diagnostics.FileVersionInfo]::GetVersionInfo($env:WV_GAME_EXE).ProductVersion'], { env: { ...process.env, WV_GAME_EXE: exe }, windowsHide: true, timeout: 10_000 });
    return { gameVersion: stdout.trim() || 'unknown', gameVersionSource: 'Warhammer3.exe ProductVersion resource (not inferred from a wiki/Steam build)' };
  } catch { return { gameVersion: 'unknown', gameVersionSource: 'Executable version resource could not be read' }; }
}

export async function extractUnit(options, profileName = 'grail-knights', log = console.log) {
  return extractProfile(options, getProfile(profileName), log);
}

export async function extractProfile(options, profile, log = console.log) {
  const client = new RpfmClient(options.rpfmUrl);
  try {
    log('Connecting to installed RPFM and discovering its tools...');
    await client.connect();
    for (const tool of ['set_game_selected', 'is_schema_loaded', 'get_schema', 'open_packfiles', 'open_pack_info', 'decode_packed_file', 'fields_processed']) if (!client.tools.has(tool)) throw new Error(`Installed RPFM lacks ${tool}; verified v5.1.0 MCP interface required.`);
    await client.call('set_game_selected', { game_name: 'warhammer_3', rebuild_dependencies: false });
    if (!(await client.call('is_schema_loaded')).Bool) throw new Error('WH3 schema is not loaded. Update official schemas in RPFM, then retry. No custom Pack/DB parser is used.');
    const { Schema: schema } = await client.call('get_schema');
    if (!schema?.definitions) throw new Error('Installed RPFM returned an unsupported schema shape.');
    const reader = new RawPackReader(client);
    const db = await reader.open(path.join(options.gamePath, 'data', 'db.pack'));
    if (!db.files.some((file) => file.file_type === 'DB')) throw new Error('CA db.pack exposes no DB tables. Check pack/schema loading before concluding the unit is absent.');
    const local = await reader.open(path.join(options.gamePath, 'data', 'local_en.pack'));
    const locFiles = local.files.filter((file) => file.file_type === 'Loc' && file.path === 'text/db/land_units__.loc');
    if (locFiles.length !== 1) throw new Error('Verified land-unit localisation file not found in CA local_en.pack. Inspect this version inventory before changing the profile.');
    const localisation = await reader.decode(local, locFiles[0].path);
    const supplementalLocalisations = [];
    let supplementalLocalisationIssue;
    if (profile.scopes.includes('abilityPhases')) {
      // This file and unit_abilities.onscreen_name were verified in the CA pack.
      const names = local.files.filter((file) => file.file_type === 'Loc' && file.path === 'text/db/unit_abilities__.loc');
      if (names.length === 1) supplementalLocalisations.push(await reader.decode(local, names[0].path));
      else supplementalLocalisationIssue = 'Verified unit_abilities__.loc file is missing or ambiguous in this CA pack; ability display names are unresolved.';
    }
    let rpfmVersion = 'unknown';
    try {
      const version = await fetch(new URL('/version', options.rpfmUrl), { signal: AbortSignal.timeout(5000) });
      if (version.ok) rpfmVersion = (await version.json()).version ?? 'unknown';
    } catch { /* Keep unknown; MCP transport version is not RPFM's version. */ }
    const metadata = {
      sourceKind: 'ca-pack', ...await gameVersion(options.gamePath), rpfmVersion,
      mcpServerInfo: client.serverInfo, schemaFormatVersion: schema.version,
      schemaSha256: createHash('sha256').update(JSON.stringify(schema)).digest('hex'),
      packs: await Promise.all(reader.packs.map(async (pack) => {
        const file = await stat(pack.info.file_path);
        return { ...pack.info, sizeBytes: file.size, filesystemModifiedAt: file.mtime.toISOString(), sha256: await sha256File(pack.info.file_path) };
      })),
      accessMethod: 'RPFM MCP / decode_packed_file source=PackFile, directly opened CA Release/Patch packs',
    };
    log(`Tracing localisation-confirmed ${profile.displayName} and bounded schema references...`);
    const dump = await traceUnit(reader, schema, localisation, metadata, profile, supplementalLocalisations);
    if (supplementalLocalisationIssue) dump.unresolved.push({ field: 'abilityLocalisation', reason: supplementalLocalisationIssue });
    const entries = observations(dump);
    addObservationUnresolved(dump, entries);
    dump.observations = entries;
    const manualFile = profile.slug === 'grail-knights' ? 'manual-reference.json' : `manual-references/${profile.slug}.json`;
    const manual = profile.research ? { sourceKind: 'not-provided', values: {}, notDirectlyComparable: {} } : JSON.parse(await readFile(new URL(manualFile, import.meta.url), 'utf8'));
    await mkdir(options.outputDir, { recursive: true });
    const jsonPath = path.join(options.outputDir, `${profile.slug}.raw.json`);
    const summaryPath = path.join(options.outputDir, `${profile.slug}.summary.md`);
    await writeFile(jsonPath, JSON.stringify(dump, null, 2) + '\n');
    await writeFile(summaryPath, renderSummary(dump, entries, manual));
    log(`CA key: ${dump.unit.caKey}; ${dump.rows.length} source rows; ${new Set(dump.rows.map((row) => row.table)).size} tables.`);
    log(`Raw JSON: ${jsonPath}\nSummary: ${summaryPath}`);
    return { dump, jsonPath, summaryPath };
  } finally {
    await client.close().catch(() => undefined);
  }
}

// Existing callers and npm script keep the same Grail Knights interface.
export const extractGrailKnights = (options, log = console.log) => extractUnit(options, 'grail-knights', log);
