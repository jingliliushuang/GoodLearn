import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  fetchNodeModules,
  fetchProfessionalNodes,
  runWorkspaceExperiment,
} from '../api/client';

const MODULE_TYPES = ['preprocess', 'process', 'judge'];

function makeBlock(moduleType = 'preprocess') {
  return {
    block_id: `step_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    source_node: '',
    module_type: moduleType,
    module_id: '',
    params: {},
  };
}

function validatePipeline(blocks) {
  const errors = [];
  if (!blocks.length) {
    errors.push('流水线不能为空');
    return errors;
  }

  blocks.forEach((block, idx) => {
    if (!block.source_node) errors.push(`Step ${idx + 1} 请选择来源节点`);
    if (!block.module_id) errors.push(`Step ${idx + 1} 请选择模块 ID`);
  });

  const types = blocks.map((b) => b.module_type);
  const hasTransform = types.some((t) => t === 'preprocess' || t === 'process');
  const hasJudge = types.some((t) => t === 'judge');

  if (types.every((t) => t === 'judge')) {
    errors.push('流水线不能只包含评价模块');
  }
  if (!hasTransform) {
    errors.push('工作台实验至少需要一个数据生成或处理模块（preprocess / process），再选择评价模块');
  }
  if (!hasJudge) {
    errors.push('请至少添加一个 judge 评价模块');
  }
  if (types[0] === 'judge') {
    errors.push('judge 模块不能作为第一步');
  }

  return errors;
}

function formatApiError(err) {
  const detail = err.response?.data?.detail;
  if (typeof detail === 'object' && detail !== null) {
    if (Array.isArray(detail.errors)) {
      return detail.errors.join('\n');
    }
    if (detail.message) {
      return detail.message;
    }
  }
  if (typeof detail === 'string') return detail;
  return err.message || '运行失败';
}

function ImageCard({ title, url, label }) {
  const [failed, setFailed] = useState(false);
  return (
    <div className="workspace-result-card">
      <div className="workspace-result-card-title">{title}</div>
      {url && !failed ? (
        <img
          src={url}
          alt={label || title}
          className="workspace-result-image"
          onError={() => setFailed(true)}
        />
      ) : (
        <p className="workspace-result-error">
          {url ? `图片加载失败：${url}` : '无输出图片'}
        </p>
      )}
    </div>
  );
}

export default function ExperimentWorkspacePage() {
  const domainId = 'cv';
  const workspacePath = 'cv/experiment_workspace';

  const [nodes, setNodes] = useState([]);
  const [selectedNodes, setSelectedNodes] = useState([]);
  const [moduleCache, setModuleCache] = useState({});
  const [blocks, setBlocks] = useState([
    makeBlock('preprocess'),
    makeBlock('process'),
    makeBlock('judge'),
  ]);
  const [imageFile, setImageFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);
  const [showReport, setShowReport] = useState(false);

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
    if (!nodePath) return;
    if (moduleCache[nodePath]) return;
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

  const pipelineErrors = useMemo(() => validatePipeline(blocks), [blocks]);
  const canRun = pipelineErrors.length === 0 && Boolean(imageFile);

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

  const modulesForBlock = useMemo(() => (
    blocks.map((block) => {
      const cache = moduleCache[block.source_node] || {};
      return cache[block.module_type] || [];
    })
  ), [blocks, moduleCache]);

  const metricRows = useMemo(() => {
    if (!result?.metrics) return [];
    return Object.entries(result.metrics).filter(([key]) => key !== 'runtime_ms');
  }, [result]);

  const handleRun = async () => {
    if (!imageFile) {
      setError('请先上传输入图像。');
      return;
    }
    if (pipelineErrors.length) {
      setError(pipelineErrors.join('\n'));
      return;
    }
    setLoading(true);
    setError(null);
    setResult(null);
    setShowReport(false);
    try {
      const data = await runWorkspaceExperiment(workspacePath, blocks, imageFile);
      setResult(data);
    } catch (err) {
      setError(formatApiError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="workspace-page">
      <Link to={`/domain/${domainId}`} className="back-link">← 返回 CV 领域</Link>
      <h1 className="page-title">CV 实验工作台</h1>
      <p className="page-desc">
        推荐流水线：preprocess → process → judge。至少包含一个数据生成/处理模块和一个评价模块。
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
              <strong>
                Step {index + 1}
                {block.module_type === 'judge' && index === 0 && (
                  <span className="workspace-warn-inline"> — judge 不应作为第一步</span>
                )}
              </strong>
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
        <button type="button" className="btn btn-secondary" onClick={() => setBlocks((prev) => [...prev, makeBlock('process')])}>
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
        {pipelineErrors.length > 0 && (
          <div className="warn-box workspace-pipeline-warn">
            {pipelineErrors.map((msg) => (
              <p key={msg}>{msg}</p>
            ))}
          </div>
        )}
        {error && <div className="error-box">{error}</div>}
        <button
          type="button"
          className="btn btn-primary"
          disabled={loading || !canRun}
          onClick={handleRun}
        >
          {loading ? '运行中...' : '运行工作台实验'}
        </button>
      </section>

      {result && (
        <section className="section card workspace-results-panel">
          <h2 className="section-title">实验结果</h2>
          <div className="workspace-result-meta">
            <p><strong>run_id：</strong><code>{result.run_id}</code></p>
            <p><strong>工作台：</strong>{result.workspace_node}</p>
            <p>
              <strong>参与节点：</strong>
              {(result.participants || []).join('、') || '—'}
            </p>
          </div>

          <h3 className="subsection-title">输入</h3>
          <ImageCard title="输入图像" url={result.input_url} label="输入" />

          <h3 className="subsection-title">流水线步骤</h3>
          <div className="workspace-steps-grid">
            {(result.steps || []).map((step) => (
              <div key={step.index} className="workspace-step-card card card-compact">
                <div className="workspace-step-head">
                  <strong>Step {step.index}</strong>
                  <span className="workspace-step-badge">{step.module_type}</span>
                </div>
                <p className="workspace-step-line"><strong>节点：</strong>{step.source_node}</p>
                <p className="workspace-step-line"><strong>模块：</strong>{step.title || step.module_id}</p>
                {step.params && Object.keys(step.params).length > 0 && (
                  <p className="workspace-step-line">
                    <strong>参数：</strong>
                    <code>{JSON.stringify(step.params)}</code>
                  </p>
                )}
                <p className="workspace-step-line"><strong>耗时：</strong>{step.runtime_ms} ms</p>
                {step.module_type === 'judge' ? (
                  <div className="workspace-step-metrics">
                    {step.metrics && Object.entries(step.metrics).map(([k, v]) => (
                      <span key={k} className="metric-chip">{k}: {v}</span>
                    ))}
                  </div>
                ) : (
                  <ImageCard
                    title="步骤输出"
                    url={step.output_url}
                    label={`Step ${step.index}`}
                  />
                )}
              </div>
            ))}
          </div>

          <h3 className="subsection-title">评价指标</h3>
          <table className="metrics-table">
            <thead>
              <tr>
                <th>指标</th>
                <th>数值</th>
              </tr>
            </thead>
            <tbody>
              {metricRows.map(([key, value]) => (
                <tr key={key}>
                  <td>{key}</td>
                  <td>{typeof value === 'number' ? value.toFixed(4) : String(value)}</td>
                </tr>
              ))}
              {result.metrics?.runtime_ms != null && (
                <tr>
                  <td>runtime_ms</td>
                  <td>{result.metrics.runtime_ms}</td>
                </tr>
              )}
            </tbody>
          </table>

          <div className="workspace-report-actions">
            {result.report_txt_url && (
              <a
                href={result.report_txt_url}
                target="_blank"
                rel="noreferrer"
                className="btn btn-secondary btn-sm"
              >
                打开 report.txt
              </a>
            )}
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => setShowReport((v) => !v)}
            >
              {showReport ? '收起 report.txt' : '展开 report.txt'}
            </button>
          </div>
          {showReport && (
            <pre className="report-pre">{result.report_text}</pre>
          )}
        </section>
      )}
    </div>
  );
}
