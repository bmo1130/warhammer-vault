import { inspectionCli } from './inspect.mjs';
try { await inspectionCli(process.argv.slice(2)); }
catch (error) { console.error(`WH3 inspection failed: ${error.message}`); process.exitCode = 1; }
