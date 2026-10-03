import {readFileSync,writeFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {isDeepStrictEqual} from 'node:util';
import {decodeSource} from '../expansion-batch-01/compact.mjs';
import {growthAdmissions} from '../production-growth/batch.mjs';
import {restoreTrace} from '../promotion/partial-review.mjs';
import {evidenceHash} from '../promotion/first-batch.mjs';
import {factSelectors} from '../observations/facts.mjs';
import {observationContext} from '../observations/context.mjs';
import {byteHash,hpStaticChain} from './policy.mjs';

// The existing HP reader accepts expanded bounded traces with schemaRefs.
// Project only three HP chains from the pinned compact sources; no policy or
// compact reader change, new field semantics, or source-row rewriting.
export function projectArtillerySources() {
  const definitions=new Map(),inputs=new Map(),candidates=[];
  for(const [batch,mainKey]of [['expansion-batch-02','wh_main_brt_art_field_trebuchet'],
    ['expansion-batch-03','wh2_dlc09_tmb_art_screaming_skull_catapult_0'],['expansion-batch-03','wh2_main_skv_art_plagueclaw_catapult']]) {
    const file=`tools/wh3-importer/${batch}/sources.json`,bytes=readFileSync(file),compact=JSON.parse(bytes),pin=growthAdmissions[batch];
    if(evidenceHash(compact)!==pin.compactSourceHash)throw Error('HP source compact hash changed');
    const expanded=decodeSource(compact,pin.sourceHash),matches=expanded.candidates.filter(c=>c.identity.caMainUnitKey===mainKey);
    if(matches.length!==1)throw Error('HP source identity missing/ambiguous');
    inputs.set(file,{file,bytesSha256:byteHash(bytes),compactSha256:pin.compactSourceHash,expandedSha256:pin.sourceHash});
    const candidate=matches[0],dump=restoreTrace(expanded,candidate.dump),s=factSelectors(dump),c=observationContext(dump,s);
    const selected=[c.root,c.land,c.rider,c.engine,c.engineEntity];
    if(selected.some(r=>!r))throw Error('HP source exact role missing');
    const ids=new Set(selected.map(r=>r.id)),schemas=dump.schemas.filter(schema=>selected.some(r=>r.table===schema.table&&r.tableVersion===schema.version));
    for(const schema of schemas) {
      const ref=`${schema.table}:${schema.version}`;
      if(definitions.has(ref)&&!isDeepStrictEqual(definitions.get(ref),schema))throw Error('Conflicting HP schema projection');
      definitions.set(ref,schema);
    }
    const projection={format:dump.format,sourceKind:dump.sourceKind,unit:dump.unit,provenance:dump.provenance,rootRow:dump.rootRow,
      rows:dump.rows.filter(r=>ids.has(r.id)).map(r=> {
        const packs=dump.provenance.packs.filter(p=>p.file_name===r.sourcePack);
        if(packs.length!==1||typeof packs[0].file_name!=='string')throw Error('HP source pack locator missing/ambiguous');
        // Use the committed portable pack filename, as in partial-sources.
        // No machine installation path is inferred or introduced.
        return {...r,sourcePackPath:r.sourcePackPath??packs[0].file_name};
      }),relationships:dump.relationships.filter(e=>ids.has(e.from)&&ids.has(e.to)),
      schemaRefs:schemas.map(schema=>`${schema.table}:${schema.version}`)};
    const withoutLocator=value=>JSON.parse(JSON.stringify(value,(key,v)=>key==='sourcePackPath'?undefined:v));
    if(!isDeepStrictEqual(withoutLocator(hpStaticChain({...projection,schemas})),withoutLocator(hpStaticChain(dump))))throw Error('HP source projection changed meaning');
    candidates.push({slug:candidate.slug,identity:candidate.identity,source:candidate.source,dump:projection});
  }
  return {format:'warhammer-vault-partial-review-source-v1',sourceProjection:[...inputs.values()],schemas:[...definitions.values()],candidates};
}
if(process.argv[1]===fileURLToPath(import.meta.url)) {
  const mode=process.argv[2],file='tools/wh3-importer/hp-policy/artillery-sources.json';
  if(process.argv.length!==3||!['--check','--write'].includes(mode))throw Error('Use --check or --write (bounded HP source projection only).');
  const bytes=JSON.stringify(projectArtillerySources(),null,2)+'\n';
  if(mode==='--write')writeFileSync(file,bytes);else if(readFileSync(file,'utf8')!==bytes)throw Error('HP source projection replay differs');
  console.log('HP artillery source projection '+mode+' PASS');
}
