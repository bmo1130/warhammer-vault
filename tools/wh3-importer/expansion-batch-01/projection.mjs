import { createHash } from 'node:crypto';
import { pilotAffiliations } from '../pilot-catalog.mjs';
import { expansionCatalog, validateExpansionCatalog } from './catalog.mjs';

export const byteHash = bytes => createHash('sha256').update(bytes).digest('hex');
export const portable = value => JSON.parse(JSON.stringify(value, (key, item) =>
  ['sourcePackPath','file_path','filesystemModifiedAt'].includes(key) ? undefined : item));

// A projection of selected rows, not a DB export. Original results stay ignored.
export function projectExpansion(preflight, results) {
  validateExpansionCatalog(preflight.catalog);
  if (JSON.stringify(preflight.catalog)!==JSON.stringify(expansionCatalog) || results.length!==24 || preflight.gameExecuted!==false) throw new Error('Expansion catalog/source differs');
  const schemas=new Map();
  const trace=value=> {
    if(!value)return null;
    const clean=portable(value);
    for(const original of clean.schemas) {
      const schema={table:original.table,version:original.version,
        fields:original.fields.map(({name,field_type,is_key,is_reference})=>({name,field_type,is_key,is_reference})),
        ...(original.localisedFields ? {localisedFields:original.localisedFields}: {})};
      const ref=`${schema.table}:${schema.version}`, existing=schemas.get(ref);
      if(existing && JSON.stringify(existing.fields)!==JSON.stringify(schema.fields))throw new Error(`Schema conflict: ${ref}`);
      schemas.set(ref,{...existing,...schema});
    }
    const {schemas:definitions,...rest}=clean;
    return {...rest,schemaRefs:definitions.map(s=>`${s.table}:${s.version}`)};
  };
  const entries=preflight.entries.map(({sample,localisationMatches,discovery},index)=> {
    const {result,bytes}=results[index];
    if(result.sample.slug!==sample.slug)throw new Error('Staging candidate order differs');
    const roots=discovery.candidates.map(c=>({
      mainKey:c.mainKey,landKey:c.landKey,localisation:c.localisation,mainRow:c.mainRow,landRow:c.landRow,
      permissionGroups:c.permissionGroups,
      primaryAliases:c.permissionGroups.filter(g=>Object.hasOwn(pilotAffiliations,g)).map(militaryGroup=>({militaryGroup,factionId:pilotAffiliations[militaryGroup]})),
      rawVariant:{isRenown:c.main.is_renown,unitSets:c.unitSets,recruitmentOverrides:c.recruitmentOverrides},
      structure:{category:c.land.category,caste:c.main.caste,isMonstrous:c.main.is_monstrous,man:c.land.man_entity,mount:c.land.mount,engine:c.land.engine,articulated:c.land.articulated_record},
      missile:{primary:c.land.primary_missile_weapon,
        junctions:discovery.evidence.rows.filter(r=>r.table==='unit_missile_weapon_junctions_tables' && r.row.unit===c.mainKey),
        inspectionCoverage:discovery.evidence.coverage.filter(c=>/missile/.test(JSON.stringify(c)))},
    }));
    return {sample,localisationMatches,roots,status:result.status,
      blockers:result.exceptions.filter(e=>e.severity==='BLOCKING').map(({category,reason})=>({category,reason})),
      permissionTrace:trace(discovery.evidence),unavailableRelations:discovery.unavailableRelations??[],
      source:{reference:`generated/wh3/expansion-batch-01/units/${sample.slug}.result.json`,sha256:byteHash(bytes)}};
  });
  const candidates=results.filter(({result})=>result.normalized && result.status!=='BLOCKED').map(({result,bytes})=>({
    slug:result.sample.slug,name:result.sample.displayName,status:result.status,identity:result.normalized.provenance.identity,
    affiliation:result.affiliation,originalUnmapped:portable(result.normalized.unmapped),
    source:{reference:`generated/wh3/expansion-batch-01/units/${result.sample.slug}.result.json`,sha256:byteHash(bytes)},
    dump:trace(result.dump),missileExtras:trace(result.missileExtras),
  }));
  return {format:'warhammer-vault-expansion-01-source-v1',gameExecuted:false,provenance:portable(preflight.provenance),
    catalog:expansionCatalog,preflight:entries,candidates,schemas:[...schemas.values()]};
}
