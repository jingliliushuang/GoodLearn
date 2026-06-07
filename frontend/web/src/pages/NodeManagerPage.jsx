import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  createNodeTemplate,
  exportNode,
  fetchDomains,
  fetchManagerNodes,
  importNode,
} from '../api/client';

function ValidationBox({ validation }) {
  if (!validation) return null;
  return (
    <div className={`validation-box ${validation.valid ? 'valid' : 'invalid'}`}>
      <p><strong>校验：</strong>{validation.valid ? '通过' : '失败'}</p>
      {validation.errors?.length > 0 && (
        <ul>{validation.errors.map((e) => <li key={e}>{e}</li>)}</ul>
      )}
      {validation.warnings?.length > 0 && (
        <ul className="validation-warn">{validation.warnings.map((w) => <li key={w}>{w}</li>)}</ul>
      )}
    </div>
  );
}

export default function NodeManagerPage() {
  const [domains, setDomains] = useState([]);
  const [domain, setDomain] = useState('cv');
  const [nodes, setNodes] = useState([]);

  const [nodeId, setNodeId] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [nodeType, setNodeType] = useState('leaf');

  const [exportNodeId, setExportNodeId] = useState('');
  const [importFile, setImportFile] = useState(null);
  const [importDomain, setImportDomain] = useState('cv');
  const [overwrite, setOverwrite] = useState(false);

  const [loading, setLoading] = useState('');
  const [error, setError] = useState(null);
  const [createResult, setCreateResult] = useState(null);
  const [exportResult, setExportResult] = useState(null);
  const [importResult, setImportResult] = useState(null);

  const loadNodes = useCallback(() => {
    fetchManagerNodes(domain)
      .then((data) => {
        setNodes(data.nodes || []);
        if (data.nodes?.length && !exportNodeId) {
          setExportNodeId(data.nodes[0].id);
        }
      })
      .catch(() => setNodes([]));
  }, [domain, exportNodeId]);

  useEffect(() => {
    fetchDomains().then(setDomains).catch(() => setDomains([]));
  }, []);

  useEffect(() => {
    loadNodes();
  }, [loadNodes]);

  const handleCreate = async () => {
    setLoading('create');
    setError(null);
    setCreateResult(null);
    try {
      const result = await createNodeTemplate({
        domain,
        node_id: nodeId.trim(),
        title: title.trim(),
        description: description.trim(),
        node_type: nodeType,
      });
      setCreateResult(result);
      loadNodes();
    } catch (err) {
      setError(err.response?.data?.detail || err.message);
    } finally {
      setLoading('');
    }
  };

  const handleExport = async () => {
    setLoading('export');
    setError(null);
    setExportResult(null);
    try {
      const result = await exportNode({
        domain,
        node_id: exportNodeId,
        include_weights: false,
      });
      setExportResult(result);
    } catch (err) {
      setError(err.response?.data?.detail || err.message);
    } finally {
      setLoading('');
    }
  };

  const handleImport = async () => {
    if (!importFile) return;
    setLoading('import');
    setError(null);
    setImportResult(null);
    try {
      const result = await importNode(importFile, importDomain, overwrite);
      setImportResult(result);
      loadNodes();
    } catch (err) {
      setError(err.response?.data?.detail || err.message);
    } finally {
      setLoading('');
    }
  };

  const domainOptions = domains.length
    ? domains.filter((d) => d.status === 'ready').map((d) => d.id)
    : ['cv'];

  return (
    <div className="node-manager-page">
      <Link to="/" className="back-link">← 返回首页</Link>
      <h1 className="page-title">节点管理</h1>
      <p className="page-desc">
        自动生成标准节点模板、导出 zip、导入并校验结构。默认不导出模型权重。
      </p>

      {error && <div className="error manager-error">{error}</div>}

      <section className="manager-section card">
        <h2 className="section-title">新建节点模板</h2>
        <div className="manager-form-grid">
          <label>
            领域
            <select value={domain} onChange={(e) => setDomain(e.target.value)}>
              {domainOptions.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </label>
          <label>
            节点 ID
            <input value={nodeId} onChange={(e) => setNodeId(e.target.value)} placeholder="deblur" />
          </label>
          <label>
            节点名称
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="图像去模糊" />
          </label>
          <label className="span-2">
            描述
            <input value={description} onChange={(e) => setDescription(e.target.value)} />
          </label>
          <label>
            类型
            <select value={nodeType} onChange={(e) => setNodeType(e.target.value)}>
              <option value="leaf">leaf</option>
              <option value="combined">combined</option>
            </select>
          </label>
        </div>
        <button
          type="button"
          className="btn btn-primary"
          disabled={loading === 'create' || !nodeId.trim() || !title.trim()}
          onClick={handleCreate}
        >
          {loading === 'create' ? '生成中...' : '生成节点模板'}
        </button>
        {createResult && (
          <div className="manager-result">
            <p>已创建：<code>{createResult.node_path}</code></p>
            <ValidationBox validation={createResult.validation} />
            <p className="card-desc">请刷新 CV 领域页面查看新节点。</p>
          </div>
        )}
      </section>

      <section className="manager-section card">
        <h2 className="section-title">导出节点</h2>
        <div className="manager-form-grid">
          <label>
            领域
            <select value={domain} onChange={(e) => setDomain(e.target.value)}>
              {domainOptions.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </label>
          <label>
            节点
            <select value={exportNodeId} onChange={(e) => setExportNodeId(e.target.value)}>
              {nodes.map((n) => (
                <option key={n.id} value={n.id}>{n.title} ({n.id})</option>
              ))}
            </select>
          </label>
        </div>
        <p className="card-desc">当前版本暂不导出模型权重（include_weights 不可用）。</p>
        <button
          type="button"
          className="btn btn-primary"
          disabled={loading === 'export' || !exportNodeId}
          onClick={handleExport}
        >
          {loading === 'export' ? '导出中...' : '导出节点'}
        </button>
        {exportResult && (
          <div className="manager-result">
            <p>导出文件：{exportResult.export_path}</p>
            {exportResult.download_url && (
              <a href={exportResult.download_url} className="btn btn-secondary btn-sm" download>
                下载 zip
              </a>
            )}
            <ValidationBox validation={exportResult.validation} />
          </div>
        )}
      </section>

      <section className="manager-section card">
        <h2 className="section-title">导入节点</h2>
        <p className="card-desc manager-risk">
          导入节点只会进行结构校验，不会执行其中代码。拒绝权重文件与可执行脚本。
        </p>
        <div className="manager-form-grid">
          <label>
            目标领域
            <select value={importDomain} onChange={(e) => setImportDomain(e.target.value)}>
              {domainOptions.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </label>
          <label className="manager-checkbox">
            <input
              type="checkbox"
              checked={overwrite}
              onChange={(e) => setOverwrite(e.target.checked)}
            />
            覆盖已存在节点 (overwrite)
          </label>
          <label className="span-2">
            zip 文件
            <input
              type="file"
              accept=".zip"
              onChange={(e) => setImportFile(e.target.files?.[0] || null)}
            />
          </label>
        </div>
        <button
          type="button"
          className="btn btn-primary"
          disabled={loading === 'import' || !importFile}
          onClick={handleImport}
        >
          {loading === 'import' ? '导入中...' : '校验并导入'}
        </button>
        {importResult && (
          <div className="manager-result">
            <p>已导入：{importResult.domain}/{importResult.node_id}</p>
            <p><code>{importResult.node_path}</code></p>
            <ValidationBox validation={importResult.validation} />
          </div>
        )}
      </section>
    </div>
  );
}
