import { useEffect } from 'react';
import { Link, Route, Routes, useLocation } from 'react-router-dom';
import { entityRoutes } from './domain/entities';
import Icon from './components/Icon';
import NavItems from './components/NavItems';
import HomePage from './pages/HomePage';
import FactionsPage from './pages/FactionsPage';
import FactionPage from './pages/FactionPage';
import UnitPage from './pages/UnitPage';
import UnitsPage from './pages/UnitsPage';
import ComparePage from './pages/ComparePage';
import CalculatorPage from './pages/CalculatorPage';
import LordPage from './pages/LordPage';
import NotesPage from './pages/NotesPage';
import SettingsPage from './pages/SettingsPage';
import NotFound from './pages/NotFound';

export default function AppShell() {
  const location = useLocation();
  useEffect(() => { window.scrollTo(0, 0); }, [location.pathname]);
  return <div className="app-shell">
    <header className="topbar"><Link className="brand" to="/"><span className="brand-mark">W</span><span><strong>전쟁 서고</strong><small>WARHAMMER III · 개인 위키</small></span></Link><Link className="top-link" to="/settings" aria-label="설정 및 백업"><Icon name="settings"/></Link></header>
    <div className="layout">
      <aside className="sidebar"><div className="sidebar-label">내 서고</div><NavItems/><div className="sidebar-foot">개인 기록 · 이 기기에 저장됨</div></aside>
      <main className="main">
        <Routes>
          <Route path="/" element={<HomePage/>}/>
          <Route path={`/${entityRoutes.faction}`} element={<FactionsPage/>}/>
          <Route path={`/${entityRoutes.faction}/:id`} element={<FactionPage/>}/>
          <Route path={`/${entityRoutes.unit}/:id`} element={<UnitPage/>}/>
          <Route path={`/${entityRoutes.unit}`} element={<UnitsPage/>}/>
          <Route path={`/${entityRoutes.lord}/:id`} element={<LordPage/>}/>
          <Route path="/notes" element={<NotesPage/>}/>
          <Route path="/compare" element={<ComparePage/>}/>
          <Route path="/calculator" element={<CalculatorPage/>}/>
          <Route path="/settings" element={<SettingsPage/>}/>
          <Route path="*" element={<NotFound/>}/>
        </Routes>
      </main>
    </div>
    <nav className="bottom-nav" aria-label="주요 메뉴"><NavItems mobile/></nav>
  </div>;
}
