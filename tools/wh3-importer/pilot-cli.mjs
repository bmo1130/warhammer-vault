import { resolveOptions } from './extract.mjs';
import { runPilot } from './pilot.mjs';

try { await runPilot(await resolveOptions(process.argv.slice(2))); }
catch (error) { console.error(`WH3 pilot failed: ${error.message}`); process.exitCode = 1; }
