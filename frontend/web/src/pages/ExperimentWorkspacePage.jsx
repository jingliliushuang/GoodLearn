import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  fetchNodeModules,
  fetchProfessionalNodes,
  runWorkspaceExperiment,
} from '../api/client';

const MODULE_TYPES = ['preprocess', 'process', 'judge'];

function emptyBlock() {
  return {
    block_id: `step_${Date.now()}`,
    source_node: '',
    module_type: 'preprocess',
    module_id: '',
    params: {},
  };
}

export default function ExperimentWorkspacePage() {
  const domainId = 'cv';
  const workspacePath = 'cv/experiment_workspace';

  const [nodes, setNodes] = useState([]);
  const [selectedNodes, setSelectedNodes] = useState([]);
  const [moduleCache, setModuleCache] = useState({});
  const [blocks, setBlocks] = useState([emptyBlock()]);
  const [imageFile, setImageFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);

  useEffect(() => {
    fetchProfessionalNodes(domainId)
      .then((data) => {
        const leafNodes = (data.nodes || []).filter((n) => n.type === 'leaf');
        setNodes(leafNodes);
        const defaults = leafNodes
          .filter((n) => ['cv/denoise', 'cv/super_resolution'].includes(n.node_path))
          .map((n) => n.node_path);
        setSelectedNodes(defaults.length ? defaults : leafNodes.slice(0, 2).map((n) => n.node_path));
      })
      .catch(() => setNodes([]));
  }, [domainId]);

  const loadModules = useCallback(async (nodePath) => {
    if (!nodePath || moduleCache[nodePath]) return;
    try {
      const data = await fetchNodeModules(nodePath);
      setModuleCache((prev) => ({ ...prev, [nodePath]: data }));
    } catch {
      setModuleCache((prev) => ({ ...prev, [nodePath]: { preprocess: [], process: [], judge: [] } }));
    }
  }, [moduleCache]);

  useEffect(() => {
    selectedNodes.forEach((np) => loadModules(np));
  }, [selectedNodes, loadModules]);

  const toggleNode = (nodePath) => {
    setSelectedNodes((prev) => (
      prev.includes(nodePath) ? prev.filter((p) => p !== nodePath) : [...prev, nodePath]
    ));
  };

  const updateBlock = (index, patch) => {
    setBlocks((prev) => prev.map((b, i) => (i === index ? { ...b, ...patch } : b)));
  };

  const moveBlock = (index, dir) => {
    setBlocks((prev) => {
      const next = [...prev];
      const target = index + dir;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  const modulesForBlock = useMemo(() => {
    return blocks.map((block) => {
      const cache = moduleCache[block.source_node] || {};
      return cache[block.module_type] || [];
    });
  }, [blocks, moduleCache]);

  const handleRun = async () => {
    if (!imageFile) {
      setError('请先上传输入图像。');
      return;
    }
    if (blocks.some((b) => !b.source_node || !b.module_id)) {
      setError('请完善每个流水线 block 的节点与模块选择。');
      return;
    }
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const data = await runWorkspaceExperiment(workspacePath, blocks, imageFile);
      setResult(data);
    } catch (err) {
      setError(err.response?.data?.detail || err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="workspace-page">
      <Link to={`/domain/${domainId}`} className="back-link">← 返回 CV 领域</Link>
      <h1 className="page-title">CV 实验工作台</h1>
      <p className="page-desc">
        从多个专业节点选择 preprocess / process / judge 模块，按顺序组成串行实验流水线。
      </p>

      <section className="section card">
        <h2 className="section-title">参与实验的专业节点</h2>
        <div className="workspace-node-grid">
          {nodes.map((n) => (
            <label key={n.node_path} className="workspace-node-chip">
              <input
                type="checkbox"
                checked={selectedNodes.includes(n.node_path)}
                onChange={() => toggleNode(n.node_path)}
              />
              <span>{n.title} ({n.node_path})</span>
            </label>
          ))}
        </div>
      </section>

      <section className="section card">
        <h2 className="section-title">工作台流水线</h2>
        {blocks.map((block, index) => (
          <div key={block.block_id || index} className="workspace-block card card-compact">
            <div className="workspace-block-header">
              <strong>Step {index + 1}</strong>
              <div className="workspace-block-actions">
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => moveBlock(index, -1)} disabled={index === 0}>↑</button>
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => moveBlock(index, 1)} disabled={index === blocks.length - 1}>↓</button>
                <button type="button" className="btn btn-danger btn-sm" onClick={() => setBlocks((prev) => prev.filter((_, i) => i !== index))} disabled={blocks.length <= 1}>删除</button>
              </div>
            </div>
            <div className="manager-form-grid">
              <label>
                来源节点
                <select
                  value={block.source_node}
                  onChange={(e) => {
                    updateBlock(index, { source_node: e.target.value, module_id: '' });
                    loadModules(e.target.value);
                  }}
                >
                  <option value="">选择节点</option>
                  {selectedNodes.map((np) => (
                    <option key={np} value={np}>{np}</option>
                  ))}
                </select>
              </label>
              <label>
                模块类型
                <select
                  value={block.module_type}
                  onChange={(e) => updateBlock(index, { module_type: e.target.value, module_id: '' })}
                >
                  {MODULE_TYPES.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </label>
              <label className="span-2">
                模块 ID
                <select
                  value={block.module_id}
                  onChange={(e) => updateBlock(index, { module_id: e.target.value })}
                  disabled={!block.source_node}
                >
                  <option value="">选择模块</option>
                  {(modulesForBlock[index] || []).map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.title || m.id}{m.legacy ? ' (兼容)' : ''}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </div>
        ))}
        <button type="button" className="btn btn-secondary" onClick={() => setBlocks((prev) => [...prev, emptyBlock()])}>
          添加模块
        </button>
      </section>

      <section className="section card">
        <h2 className="section-title">运行实验</h2>
        <label className="form-label">
          上传输入图像
          <input
            type="file"
            accept="image/*"
            onChange={(e) => {
              const f = e.target.files?.[0];
              setImageFile(f || null);
              setPreview(f ? URL.createObjectURL(f) : null);
            }}
          />
        </label>
        {preview && <img src={preview} alt="预览" className="preview-thumb" />}
        {error && <div className="error-box">{error}</div>}
        <button type="button" className="btn btn-primary" disabled={loading} onClick={handleRun}>
          {loading ? '运行中...' : '运行工作台实验'}
        </button>
      </section>

      {result && (
        <section className="section card">
          <h2 className="section-title">实验结果</h2>
          <p>run_id: <code>{result.run_id}</code></p>
          {result.input_url && <img src={result.input_url} alt="输入" className="preview-thumb" />}
          <div className="image-result-grid">
            {(result.step_urls || []).map((url) => (
              <img key={url} src={url} alt="步骤输出" />
            ))}
          </div>
          <h3 className="subsection-title">评价指标</h3>
          <pre className="report-pre">{JSON.stringify(result.metrics, null, 2)}</pre>
          <h3 className="subsection-title">report.txt</h3>
          <pre className="report-pre">{result.report_text}</pre>
        </section>
      )}
    </div>
  );
}
