// Local integration: project the ignored, original RPFM extraction. Replay does
// not call this command or depend on generated files/game installation.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { projectExtraction } from '../tools/wh3-importer/research-scan-bretonnia/source.mjs';
import { policySha256, originalClassifierSha256 } from '../tools/wh3-importer/research-scan-bretonnia/scan.mjs';
import { sha256 } from '../tools/wh3-importer/research-classifier/classify.mjs';
const folder='tools/wh3-importer/research-scan-bretonnia';
const source=projectExtraction(readFileSync('generated/wh3/research-scan-bretonnia/raw.json'));
const bytes=JSON.stringify(source,null,2)+'\n';
mkdirSync(folder,{recursive:true});
writeFileSync(`${folder}/source.json`,bytes);
writeFileSync(`${folder}/manifest.json`,JSON.stringify({format:'wh3-bretonnia-research-scan-manifest-v1',
  classifierCommit:'031666d408d8c92aa144c84b959410314859e099',sourceSha256:sha256(bytes),
  originalExtractionSha256:source.originalExtraction.sha256,processedSchemasSha256:sha256(JSON.stringify(source.schemas)),
  policySha256,originalClassifierSha256},null,2)+'\n');
console.log('Scan source projected:',source.rows.length,'rows');
