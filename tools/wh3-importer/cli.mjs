import { resolveOptions, extractGrailKnights } from './extract.mjs';

if (process.argv.includes('--help')) {
  console.log('npm run extract:grail-knights -- --game-path "GAME_ROOT" [--rpfm-url http://127.0.0.1:45127/mcp] [--output-dir DIRECTORY] [--config LOCAL_JSON]\nWH3_GAME_PATH and RPFM_MCP_URL are also supported. Start the installed rpfm_server.exe and install WH3 schemas in RPFM first.');
} else {
  try { await extractGrailKnights(await resolveOptions(process.argv.slice(2))); }
  catch (error) { console.error(`WH3 extraction failed: ${error.message}\nCheck game path, installed RPFM server, CA pack inventory and WH3 schema. No raw result is fabricated.`); process.exitCode = 1; }
}
