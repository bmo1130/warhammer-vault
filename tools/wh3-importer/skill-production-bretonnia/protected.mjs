import assert from 'node:assert/strict';
import {fileHash} from '../research-admission-batch-01/protected.mjs';
export {fileHash};
export function verifyProtected(manifest,read){
 assert.equal(manifest.baselineCommit,'c07d38699e2d07e02f428a4cb4a8ffdb0454ce91');
 for(const [path,hash] of Object.entries(manifest.preservedFiles))assert.equal(fileHash(path,read(path)),hash,`Protected baseline drift: ${path}`);
 for(const [path,hash] of Object.entries(manifest.policyFiles))assert.equal(fileHash(path,read(path)),hash,`Reviewed full-pipeline policy drift: ${path}`);
}
