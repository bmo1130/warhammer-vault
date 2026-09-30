import { resolveOptions, extractUnit } from './extract.mjs';
import { getProfile } from './profiles.mjs';

if (process.argv.includes('--help')) {
  console.log('npm run extract:wh3-unit -- <grail-knights|helstorm|bloodthirster> --game-path "GAME_ROOT" [--rpfm-url http://127.0.0.1:45127/mcp] [--output-dir DIRECTORY] [--config LOCAL_JSON]\nnpm run extract:grail-knights remains supported. WH3_GAME_PATH and RPFM_MCP_URL are also supported. Start the installed rpfm_server.exe and install WH3 schemas in RPFM first.');
} else {
  try {
    const args = process.argv.slice(2);
    const name = args[0] && !args[0].startsWith('--') ? args.shift() : 'grail-knights';
    getProfile(name); // Reject typos before reading paths or opening RPFM.
    await extractUnit(await resolveOptions(args), name);
  }
  catch (error) { console.error(`WH3 extraction failed: ${error.message}\nCheck game path, installed RPFM server, CA pack inventory and WH3 schema. No raw result is fabricated.`); process.exitCode = 1; }
}
