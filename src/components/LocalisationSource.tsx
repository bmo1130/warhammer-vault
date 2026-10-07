import { archiveLocalisation, type ArchiveNameType } from '../repositories/archiveLocalisation';
export default function LocalisationSource({item,type}:{item:{id:string;name:string;gameVersion:string};type:ArchiveNameType}) {
  const source=archiveLocalisation(item,type) ?? (type==='lord'||type==='hero'?archiveLocalisation(item,`legacy_${type}`):undefined);
  return source ? <p className="data-note">한국어 이름: CA {source.sourcePack} · {source.localisationKeys.join(', ')} · pack SHA256 {source.packHash} · source SHA256 {source.sourceHash}</p> : null;
}
