import { Link, Route, Routes } from 'react-router-dom';
import HomePage from './pages/HomePage';
import DomainPage from './pages/DomainPage';
import NodePage from './pages/NodePage';
import PipelinePage from './pages/PipelinePage';
import NodeManagerPage from './pages/NodeManagerPage';

export default function App() {
  return (
    <div className="app">
      <header className="app-header">
        <a href="/" className="logo">
          <span className="logo-icon">G</span>
          <span className="logo-text">GoodLearnApp</span>
        </a>
        <nav className="app-nav">
          <Link to="/node-manager" className="nav-link">节点管理</Link>
        </nav>
        <span className="tagline">本地计算机知识树教学桌面应用</span>
      </header>
      <main className="app-main">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/domain/:domainId" element={<DomainPage />} />
          <Route path="/domain/:domainId/pipeline" element={<PipelinePage />} />
          <Route path="/node-manager" element={<NodeManagerPage />} />
          <Route path="/node/:domainId/:nodeId" element={<NodePage />} />
        </Routes>
      </main>
      <footer className="app-footer">
        GoodLearnApp v0.1 — 本地桌面应用，数据不出本机
      </footer>
    </div>
  );
}
