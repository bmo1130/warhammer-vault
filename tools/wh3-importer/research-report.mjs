import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { unitProfiles } from './profiles.mjs';
import { researchProfiles } from './research-profiles.mjs';
import { hypothesisEvidence } from './hypotheses.mjs';

// Offline report of the explicitly selected six samples, never an extractor
// or production normalizer. Manual comparisons occupy a separate object.
export async function buildResearchEvidence(outputDir) {
  const samples = [];
  for (const profile of [...Object.values(unitProfiles), ...Object.values(researchProfiles)]) {
    const artifact = `${profile.research ? 'research/' : ''}${profile.slug}.raw.json`;
    const dump = JSON.parse(await readFile(path.join(outputDir, artifact), 'utf8'));
    const sample = { artifact, rawAndHypotheses: hypothesisEvidence(dump) };
    if (!profile.research) {
      const file = profile.slug === 'grail-knights' ? 'manual-reference.json' : `manual-references/${profile.slug}.json`;
      sample.manualComparisonOnly = JSON.parse(await readFile(new URL(file, import.meta.url), 'utf8'));
    }
    samples.push(sample);
  }
  return { format: 'warhammer-vault-semantics-evidence-v1', purpose: 'Research only; hypotheses are not verified formulas. Never consumed by the application.', samples };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const dir = path.resolve(process.argv[2] ?? 'generated/wh3');
    const result = await buildResearchEvidence(dir);
    await mkdir(path.join(dir, 'research'), { recursive: true });
    const file = path.join(dir, 'research', 'semantics-evidence.json');
    await writeFile(file, JSON.stringify(result, null, 2) + '\n');
    console.log(`Research hypotheses and separate manual comparisons: ${file}`);
  } catch (error) { console.error(`WH3 research report failed: ${error.message}`); process.exitCode = 1; }
}
