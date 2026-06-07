import { useMemo, useRef, useState } from 'react';
import { compareMethods } from '../api/client';

const DEFAULT_SELECTED = ['bicubic', 'lanczos', 'espcn', 'edsr'];
const TRADITIONAL_IDS = new Set(['nearest', 'bilinear', 'bicubic', 'lanczos']);
const CNN_IDS = new Set(['espcn', 'edsr']);

function formatMetric(value) {
  if (value === null || value === undefined) return '-';
  return value;
}

export default function ModelComparisonLab({
  domainId,
  nodeId,
  methods,
  onRunComplete,
}) {
  const available = useMemo(
    () => (methods || []).filter((m) => m.available),
    [methods],
  );

  const [expanded, setExpanded] = useState(true);
  const [selected, setSelected] = useState(() => {
    const ids = available.map((m) => m.id);
    return DEFAULT_SELECTED.filter((id) => ids.includes(id));
  });
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);
  const fileRef = useRef(null);

  const toggleMethod = (id) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const selectAll = () => setSelected(available.map((m) => m.id));
  const selectTraditional = () =>
    setSelected(available.filter((m) => TRADITIONAL_IDS.has(m.id)).map((m) => m.id));
  const selectCnn = () =>
    setSelected(available.filter((m) => CNN_IDS.has(m.id)).map((m) => m.id));
  const clearSelection = () => setSelected([]);

  const canRun = Boolean(file) && selected.length > 0;

  const handleRun = async () => {
    if (!canRun) return;

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const data = await compareMethods(domainId, nodeId, selected, file);
      setResult(data);
      onRunComplete?.(data);
    } catch (err) {
      const msg = err.response?.data?.detail || err.message || '对比实验失败';
      setError(typeof msg === 'string' ? msg : JSON.stringify(msg));
    } finally {
      setLoading(false);
    }
  };

  if (available.length === 0) {
    return null;
  }

  return (
    <details className="comparison-lab" open={expanded} onToggle={(e) => setExpanded(e.target.open)}>
      <summary className="comparison-lab-summary">
        <span className="section-title-inline">模型对比实验</span>
        <span className="comparison-lab-hint">点击展开 / 收起</span>
      </summary>

      <div className="comparison-lab-body">
        <p className="card-desc">
          选择多个超分方法，对同一张图片进行推理，比较速度、效果和典型伪影。
        </p>

        <div className="comparison-method-toolbar">
          <button type="button" className="btn btn-secondary btn-sm" onClick={selectAll}>全选</button>
          <button type="button" className="btn btn-secondary btn-sm" onClick={selectTraditional}>只选传统方法</button>
          <button type="button" className="btn btn-secondary btn-sm" onClick={selectCnn}>只选 CNN 方法</button>
          <button type="button" className="btn btn-secondary btn-sm" onClick={clearSelection}>清空</button>
        </div>

        <div className="comparison-method-grid">
          {available.map((method) => {
            const checked = selected.includes(method.id);
            return (
              <label key={method.id} className={`comparison-method-chip ${checked ? 'selected' : ''}`}>
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggleMethod(method.id)}
                />
                <span>{method.title || method.id}</span>
              </label>
            );
          })}
        </div>

        <div
          className="upload-area upload-area-compact"
          onClick={() => fileRef.current?.click()}
          onKeyDown={(e) => e.key === 'Enter' && fileRef.current?.click()}
          role="button"
          tabIndex={0}
        >
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            onChange={(e) => {
              const picked = e.target.files?.[0];
              if (!picked) return;
              setFile(picked);
              setPreview(URL.createObjectURL(picked));
              setResult(null);
              setError(null);
            }}
          />
          <p>点击上传对比用图片</p>
          {preview && <img src={preview} alt="预览" className="preview-thumb" />}
        </div>

        <button
          type="button"
          className="btn btn-primary"
          disabled={!canRun || loading}
          onClick={handleRun}
        >
          {loading ? '对比运行中...' : '运行对比实验'}
        </button>

        {error && <div className="error" style={{ marginTop: '1rem' }}>{error}</div>}

        {result && (
          <div className="comparison-results">
            <div className="compare-full">
              <div className="image-label">对比网格</div>
              <a href={result.comparison_grid_url} target="_blank" rel="noopener noreferrer">
                <img src={result.comparison_grid_url} alt="对比网格" className="comparison-grid-img" />
              </a>
            </div>

            <div className="compare-table-wrap" style={{ marginTop: '1rem' }}>
              <table className="method-compare-table comparison-result-table">
                <thead>
                  <tr>
                    <th>方法</th>
                    <th>类型</th>
                    <th>运行时间 (ms)</th>
                    <th>PSNR</th>
                    <th>MSE</th>
                    <th>说明</th>
                    <th>输出</th>
                  </tr>
                </thead>
                <tbody>
                  {result.results.map((row) => (
                    <tr key={row.method} className={row.error ? 'comparison-row-error' : ''}>
                      <td className="col-name">{row.title || row.method}</td>
                      <td>{row.type || '-'}</td>
                      <td>{formatMetric(row.metrics?.runtime_ms)}</td>
                      <td>{formatMetric(row.metrics?.psnr)}</td>
                      <td>{formatMetric(row.metrics?.mse)}</td>
                      <td>{row.error || row.note || '-'}</td>
                      <td>
                        {row.output_url ? (
                          <a href={row.output_url} target="_blank" rel="noopener noreferrer">查看</a>
                        ) : (
                          '-'
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {result.summary?.length > 0 && (
              <div className="comparison-summary">
                <h4 className="detail-heading">教学结论</h4>
                <ul className="detail-list">
                  {result.summary.map((line) => (
                    <li key={line}>{line}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </details>
  );
}
