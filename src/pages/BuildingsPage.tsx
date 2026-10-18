import PageIntro from '../components/PageIntro';
import BuildingCatalog from '../components/BuildingCatalog';

export default function BuildingsPage() {
  return <><PageIntro eyebrow="BUILDING ARCHIVE · BRETONNIA" title="브레토니아 건물" description="건물 단계와 확인된 모집 유닛 연결을 살펴보세요."/><BuildingCatalog/></>;
}
