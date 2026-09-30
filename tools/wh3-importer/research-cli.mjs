import path from 'node:path';
import { extractProfile, resolveOptions } from './extract.mjs';
import { getResearchProfile } from './research-profiles.mjs';
try {
  const args = process.argv.slice(2);
  const profile = getResearchProfile(args.shift());
  const options = await resolveOptions(args);
  options.outputDir = path.join(options.outputDir, 'research');
  await extractProfile(options, profile);
} catch (error) { console.error(`WH3 research extraction failed: ${error.message}`); process.exitCode = 1; }
