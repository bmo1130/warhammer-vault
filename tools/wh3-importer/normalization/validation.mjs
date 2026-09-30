import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdir, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

// Reuse the app's actual validator, compiled with the already installed tsc.
// No copied validation rules, custom loader or test-run prerequisite for CLI.
const require = createRequire(import.meta.url);
const root = fileURLToPath(new URL('../../../', import.meta.url));
let validator;
export function loadUnitValidator() {
  return validator ??= (async () => {
    const output = fileURLToPath(new URL('../.local/validation/', import.meta.url));
    await promisify(execFile)(process.execPath, [require.resolve('typescript/bin/tsc'), 'src/domain/unitValidation.ts', '--target', 'ES2022', '--module', 'commonjs', '--moduleResolution', 'node', '--skipLibCheck', '--rootDir', '.', '--outDir', output], { cwd: root, windowsHide: true, timeout: 60_000 });
    await mkdir(output, { recursive: true });
    await writeFile(path.join(output, 'package.json'), '{"type":"commonjs"}\n');
    return require(path.join(output, 'src/domain/unitValidation.js')).validateUnits;
  })();
}
