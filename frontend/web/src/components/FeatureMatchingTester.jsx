import { useCallback, useEffect, useState } from 'react';
import { runFeatureMatching } from '../api/client';
import MethodSelector from './MethodSelector';
import MethodParamsPanel from './MethodParamsPanel';
import { buildDefaultParams } from '../utils/methodParams';

export default function FeatureMatchingTester({
  domainId,
  nodeId,
  methods,
  selectedMethod,
  onMethodChange,
  onRunComplete,
}) {
  const [fileA, setFileA] = useState(null);
  const [fileB, setFileB] = useState(null);
  const [previewA, setPreviewA] = useState(null);
  const [previewB, setPreviewB] = useState(null);
  const [params, setParams] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);

  const selectedMeta = methods.find((m) => m.id === selectedMethod);
  const canRun = selectedMeta?.available && fileA && fileB;

  const resetParams = useCallback((schema) => {
    setParams(buildDefaultParams(schema || []));
  }, []);

  useEffect(() => {
    resetParams(selectedMeta?.params_schema);
  }, [selectedMethod, selectedMeta?.params_schema, resetParams]);

  const handleFile = (which, file) => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    if (which === 'a') {
      setFileA(file);
      setPreviewA(url);
    } else {
      setFileB(file);
      setPreviewB(url);
    }
    setResult(null);
    setError(null);
  };

  const handleRun = async () => {
    if (!canRun) return;
    setLoading(true);
    setError(null);
    try {
      const data = await runFeatureMatching(domainId, nodeId, selectedMethod, fileA, fileB, params);
      setResult(data);
      onRunComplete?.();
    } catch (err) {
      setError(err.response?.data?.detail || err.message || '运行失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="feature-matching-tester">
      <div className="fm-upload-row">
        <div className="fm-upload-box">
          <label className="fm-upload-label">Image A</label>
          <input type="file" accept="image/*" onChange={(e) => handleFile('a', e.target.files?.[0])} />
          {previewA && <img src={previewA} alt="Image A" className="fm-preview" />}
        </div>
        <div className="fm-upload-box">
          <label className="fm-upload-label">Image B</label>
          <input type="file" accept="image/*" onChange={(e) => handleFile('b', e.target.files?.[0])} />
          {previewB && <img src={previewB} alt="Image B" className="fm-preview" />}
        </div>
      </div>

      <MethodSelector methods={methods} selected={selectedMethod} onSelect={(id) => {
        onMethodChange?.(id);
      }} />

      {selectedMeta && (
        <MethodParamsPanel
          paramsSchema={selectedMeta.params_schema || []}
          values={params}
          onChange={setParams}
        />
      )}

      {selectedMeta && !selectedMeta.available && (
        <div className="warn-box">{selectedMeta.reason || '当前方法不可用'}</div>
      )}

      <div className="fm-actions">
        <button type="button" className="btn btn-primary" disabled={!canRun || loading} onClick={handleRun}>
          {loading ? '运行中...' : '运行匹配实验'}
        </button>
      </div>

      {error && <div className="error">{error}</div>}

      {result && (
        <div className="fm-results">
          <h3 className="subsection-title">匹配结果</h3>
          <div className="fm-vis-row">
            {result.image_a_url && <img src={result.image_a_url} alt="A" className="fm-result-img" />}
            {result.image_b_url && <img src={result.image_b_url} alt="B" className="fm-result-img" />}
            {result.match_vis_url && <img src={result.match_vis_url} alt="Matches" className="fm-result-img fm-vis-wide" />}
          </div>
          {result.metrics && (
            <table className="metrics-table">
              <tbody>
                {Object.entries(result.metrics).map(([key, val]) => (
                  <tr key={key}>
                    <td>{key}</td>
                    <td>{String(val)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {result.homography && result.homography.length > 0 && (
            <details className="fm-homography">
              <summary>Homography 矩阵</summary>
              <pre>{JSON.stringify(result.homography, null, 2)}</pre>
            </details>
          )}
        </div>
      )}
    </div>
  );
}
