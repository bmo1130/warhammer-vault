import { mkdirSync, readdirSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const require = createRequire(import.meta.url);
// Compile with the project's existing TypeScript dependency, then run Node's
// built-in tests. No framework, custom module loader, or runtime dependency.
const compiled = spawnSync(process.execPath, [require.resolve('typescript/bin/tsc'), '-p', 'tsconfig.test.json'], { cwd: root, stdio: 'inherit' });
if (compiled.error) throw compiled.error;
if (compiled.status !== 0) process.exit(compiled.status ?? 1);
mkdirSync(new URL('../.test-build/', import.meta.url), { recursive: true });
writeFileSync(new URL('../.test-build/package.json', import.meta.url), '{"type":"commonjs"}\n');
const files = readdirSync(new URL('../tests/', import.meta.url)).filter((file) => file.endsWith('.test.cjs')).map((file) => `tests/${file}`);
const tested = spawnSync(process.execPath, ['--test', ...files], { cwd: root, stdio: 'inherit' });
if (tested.error) throw tested.error;
process.exit(tested.status ?? 1);
