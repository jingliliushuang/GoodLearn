import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  createMethodTemplate,
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

const METHOD_CATEGORIES = [
  'traditional', 'cnn', 'gan', 'transformer', 'detector', 'classifier', 'feature', 'other',
];

const METHOD_BACKENDS = [
  'custom', 'opencv', 'opencv_dnn_superres', 'opencv_sift', 'torch', 'onnxruntime', 'planned',
];

export default function NodeManagerPage() {
  const [domains, setDomains] = useState([]);
  const [domain, setDomain] = useState('cv');
  const [nodes, setNodes] = useState([]);

  const [nodeId, setNodeId] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [nodeType, setNodeType] = useState('leaf');

  const [methodNodeId, setMethodNodeId] = useState('');
  const [methodId, setMethodId] = useState('');
  const [methodTitle, setMethodTitle] = useState('');
  const [methodDescription, setMethodDescription] = useState('');
  const [methodCategory, setMethodCategory] = useState('traditional');
  const [methodBackend, setMethodBackend] = useState('planned');
  const [methodAvailable, setMethodAvailable] = useState(false);

  const [exportNodeId, setExportNodeId] = useState('');
  const [importFile, setImportFile] = useState(null);
  const [importDomain, setImportDomain] = useState('cv');
  const [overwrite, setOverwrite] = useState(false);

  const [loading, setLoading] = useState('');
  const [error, setError] = useState(null);
  const [createResult, setCreateResult] = useState(null);
  const [methodResult, setMethodResult] = useState(null);
  const [exportResult, setExportResult] = useState(null);
  const [importResult, setImportResult] = useState(null);

  const leafNodes = useMemo(
    () => nodes.filter((n) => n.type === 'leaf'),
    [nodes],
  );

  const loadNodes = useCallback(() => {
    fetchManagerNodes(domain)
      .then((data) => {
        const list = data.nodes || [];
        setNodes(list);
        const leaves = list.filter((n) => n.type === 'leaf');
        if (leaves.length) {
          setExportNodeId((prev) => (prev && leaves.some((n) => n.id === prev) ? prev : leaves[0].id));
          setMethodNodeId((prev) => (prev && leaves.some((n) => n.id === prev) ? prev : leaves[0].id));
        }
      })
      .catch(() => setNodes([]));
  }, [domain]);

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

  const handleCreateMethod = async () => {
    setLoading('method');
    setError(null);
    setMethodResult(null);
    try {
      const result = await createMethodTemplate({
        domain,
        node_id: methodNodeId,
        method_id: methodId.trim(),
        method_title: methodTitle.trim(),
        description: methodDescription.trim(),
        category: methodCategory,
        backend: methodBackend,
        available: methodAvailable,
      });
      setMethodResult(result);
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
      <div className="info-box manager-intro">
        <p><strong>节点模板：</strong>用于创建新的任务节点，例如图像去模糊、边缘检测。</p>
        <p><strong>方法模板：</strong>在已有节点下创建算法方法，例如在图像超分下创建 SRCNN / ESPCN，在图像去噪下创建 DnCNN。</p>
        <p><strong>导出节点：</strong>将整个任务节点打包为 zip，默认不导出模型权重。</p>
        <p><strong>导入节点：</strong>导入标准节点 zip 并校验结构，不会执行其中代码。</p>
      </div>

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
        <h2 className="section-title">新建方法模板</h2>
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
            所属节点
            <select value={methodNodeId} onChange={(e) => setMethodNodeId(e.target.value)}>
              {leafNodes.map((n) => (
                <option key={n.id} value={n.id}>{n.title} ({n.id})</option>
              ))}
            </select>
          </label>
          <label>
            方法 ID
            <input
              value={methodId}
              onChange={(e) => setMethodId(e.target.value)}
              placeholder="espcn / edsr / dncnn / yolo"
            />
          </label>
          <label>
            方法名称
            <input
              value={methodTitle}
              onChange={(e) => setMethodTitle(e.target.value)}
              placeholder="ESPCN / EDSR / DnCNN"
            />
          </label>
          <label>
            方法类别
            <select value={methodCategory} onChange={(e) => setMethodCategory(e.target.value)}>
              {METHOD_CATEGORIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </label>
          <label>
            后端类型
            <select value={methodBackend} onChange={(e) => setMethodBackend(e.target.value)}>
              {METHOD_BACKENDS.map((b) => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>
          </label>
          <label className="span-2">
            描述
            <textarea
              rows={2}
              value={methodDescription}
              onChange={(e) => setMethodDescription(e.target.value)}
              placeholder="方法简介"
            />
          </label>
          <label className="manager-checkbox">
            <input
              type="checkbox"
              checked={methodAvailable}
              onChange={(e) => setMethodAvailable(e.target.checked)}
            />
            立即可运行 (available)
          </label>
        </div>
        <button
          type="button"
          className="btn btn-primary"
          disabled={loading === 'method' || !methodNodeId || !methodId.trim() || !methodTitle.trim()}
          onClick={handleCreateMethod}
        >
          {loading === 'method' ? '生成中...' : '生成方法模板'}
        </button>
        {methodResult && (
          <div className="manager-result">
            <p>{methodResult.message}</p>
            <p>路径：<code>{methodResult.method_path}</code></p>
            <p className="card-desc">刷新对应节点页面后可看到新方法。</p>
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
              {leafNodes.map((n) => (
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
