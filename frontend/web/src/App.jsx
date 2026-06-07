import { Routes, Route } from 'react-router-dom';
import HomePage from './pages/HomePage';
import DomainPage from './pages/DomainPage';
import NodePage from './pages/NodePage';

export default function App() {
  return (
    <div className="app">
      <header className="app-header">
        <a href="/" className="logo">
          <span className="logo-icon">G</span>
          <span className="logo-text">GoodLearnApp</span>
        </a>
        <span className="tagline">本地计算机知识树教学桌面应用</span>
      </header>
      <main className="app-main">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/domain/:domainId" element={<DomainPage />} />
          <Route path="/node/:domainId/:nodeId" element={<NodePage />} />
        </Routes>
      </main>
      <footer className="app-footer">
        GoodLearnApp v0.1 — 本地桌面应用，数据不出本机
      </footer>
    </div>
  );
}
