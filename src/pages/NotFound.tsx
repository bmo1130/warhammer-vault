import { Link } from 'react-router-dom';
export default function NotFound() { return <div className="not-found"><div className="eyebrow">NOT FOUND</div><h1>항목을 찾을 수 없습니다</h1><p>주소가 잘못되었거나 아직 추가되지 않은 항목입니다.</p><Link className="button button-primary" to="/">탐색으로 돌아가기</Link></div>; }
