import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { runStandardExperiment } from '../api/client';
import { buildDefaultParams } from '../utils/methodParams';
import MethodParamsPanel from './MethodParamsPanel';

function MetricSelector({ metrics = [], selected, onChange }) {
  return (
    <div className="metric-options">
      {metrics.map((metric) => {
        const checked = selected.includes(metric.id);
        return (
          <label key={metric.id} className="metric-chip">
            <input
              type="checkbox"
              checked={checked}
              onChange={() => {
                if (checked) {
                  onChange(selected.filter((id) => id !== metric.id));
                } else {
                  onChange([...selected, metric.id]);
                }
              }}
            />
            <span>{metric.title || metric.id}</span>
          </label>
        );
      })}
    </div>
  );
}

const METRIC_LABELS = {
  mse: 'MSE',
  psnr: 'PSNR',
  ssim: 'SSIM',
  runtime_ms: '运行时间 (ms)',
};

export default function StandardExperimentPanel({ domain, node, nodeData, onRunComplete }) {
  const fileRef = useRef(null);
  const experimentConfig = nodeData?.experiment_config;
  const methods = nodeData?.methods || [];

  const degradationMethods =
    experimentConfig?.stages?.dataset_generation?.methods || [];

  const evaluationMetrics =
    experimentConfig?.stages?.evaluation?.metrics || [];

  const availableMethods = useMemo(
    () => methods.filter((m) => m.available),
    [methods],
  );

  const [imageFile, setImageFile] = useState(null);
  const [preview, setPreview] = useState(null);

  const [selectedDegradation, setSelectedDegradation] = useState(
    degradationMethods[0]?.id || '',
  );
  const [degradationParams, setDegradationParams] = useState({});

  const [selectedMethod, setSelectedMethod] = useState(
    availableMethods[0]?.id || '',
  );
  const [methodParams, setMethodParams] = useState({});

  const [selectedMetrics, setSelectedMetrics] = useState(
    evaluationMetrics.map((m) => m.id).filter((id) => id !== 'runtime_ms'),
  );

  const [running, setRunning] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const selectedDegConfig = useMemo(
    () => degradationMethods.find((m) => m.id === selectedDegradation),
    [degradationMethods, selectedDegradation],
  );

  const selectedMethodConfig = useMemo(
    () => availableMethods.find((m) => m.id === selectedMethod),
    [availableMethods, selectedMethod],
  );

  useEffect(() => {
    if (degradationMethods.length > 0 && !selectedDegradation) {
      setSelectedDegradation(degradationMethods[0].id);
    }
  }, [degradationMethods, selectedDegradation]);

  useEffect(() => {
    if (availableMethods.length > 0 && !selectedMethod) {
      setSelectedMethod(availableMethods[0].id);
    }
  }, [availableMethods, selectedMethod]);

  useEffect(() => {
    setDegradationParams(buildDefaultParams(selectedDegConfig?.params_schema || []));
  }, [selectedDegConfig?.id, selectedDegConfig?.params_schema]);

  useEffect(() => {
    setMethodParams(buildDefaultParams(selectedMethodConfig?.params_schema || []));
  }, [selectedMethodConfig?.id, selectedMethodConfig?.params_schema]);

  const handleRun = useCallback(async () => {
    if (!imageFile) {
      setError('请先上传 clean image。');
      return;
    }
    if (!selectedDegradation) {
      setError('请选择测试集生成方式。');
      return;
    }
    if (!selectedMethod) {
      setError('请选择推理方法。');
      return;
    }

    setRunning(true);
    setError('');
    setResult(null);

    try {
      const data = await runStandardExperiment({
        image: imageFile,
        domain,
        node,
        degradation: selectedDegradation,
        method: selectedMethod,
        degradationParams,
        methodParams,
        metrics: selectedMetrics,
      });
      setResult(data);
      onRunComplete?.();
    } catch (err) {
      const detail = err.response?.data?.detail;
      setError(typeof detail === 'string' ? detail : err.message || '标准实验运行失败。');
    } finally {
      setRunning(false);
    }
  }, [
    imageFile,
    selectedDegradation,
    selectedMethod,
    domain,
    node,
    degradationParams,
    methodParams,
    selectedMetrics,
    onRunComplete,
  ]);

  if (!experimentConfig) {
    return null;
  }

  const isX2Model = selectedMethod === 'espcn' || selectedMethod === 'edsr';

  return (
    <section className="panel-section standard-experiment-panel">
      <div className="section-heading">
        <h3 className="subsection-title">标准三阶段实验</h3>
        <p className="card-desc">
          按照「测试集生成 → 模型推理 → 结果评价」的流程运行当前节点实验。
        </p>
      </div>

      <div className="experiment-steps">
        <div className="experiment-step">
          <h4 className="experiment-step-title">Step 1：测试集生成</h4>

          <label className="form-label">
            上传 clean image
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              onChange={(e) => {
                const picked = e.target.files?.[0];
                if (!picked) return;
                setImageFile(picked);
                setPreview(URL.createObjectURL(picked));
                setResult(null);
                setError('');
              }}
            />
          </label>
          {preview && <img src={preview} alt="预览" className="preview-thumb" />}

          <label className="form-label">
            退化方法
            <select
              value={selectedDegradation}
              onChange={(e) => setSelectedDegradation(e.target.value)}
            >
              {degradationMethods.map((method) => (
                <option key={method.id} value={method.id}>
                  {method.title || method.id}
                </option>
              ))}
            </select>
          </label>

          {selectedDegConfig?.description && (
            <p className="muted-text">{selectedDegConfig.description}</p>
          )}

          <MethodParamsPanel
            paramsSchema={selectedDegConfig?.params_schema || []}
            values={degradationParams}
            onChange={setDegradationParams}
          />
        </div>

        <div className="experiment-step">
          <h4 className="experiment-step-title">Step 2：模型推理</h4>

          <label className="form-label">
            选择方法
            <select
              value={selectedMethod}
              onChange={(e) => setSelectedMethod(e.target.value)}
            >
              {availableMethods.map((method) => (
                <option key={method.id} value={method.id}>
                  {method.title || method.id}
                </option>
              ))}
            </select>
          </label>

          {availableMethods.length === 0 && (
            <p className="warning-text">当前节点没有可运行方法。</p>
          )}

          {isX2Model && (
            <p className="muted-text">提示：ESPCN / EDSR 当前权重主要支持 x2，建议退化 scale=2。</p>
          )}

          <MethodParamsPanel
            paramsSchema={selectedMethodConfig?.params_schema || []}
            values={methodParams}
            onChange={setMethodParams}
          />
        </div>

        <div className="experiment-step">
          <h4 className="experiment-step-title">Step 3：结果评价</h4>

          <MetricSelector
            metrics={evaluationMetrics.filter((m) => m.id !== 'runtime_ms')}
            selected={selectedMetrics}
            onChange={setSelectedMetrics}
          />

          <button
            type="button"
            className="btn btn-primary"
            onClick={handleRun}
            disabled={running || !imageFile || !selectedMethod}
          >
            {running ? '运行中...' : '运行标准实验'}
          </button>

          {error && <div className="error-box">{error}</div>}
        </div>
      </div>

      {result && (
        <div className="experiment-result">
          <h4 className="subsection-title">实验结果</h4>

          <div className="image-result-grid">
            <div>
              <div className="image-label">Clean</div>
              <img src={result.clean_url} alt="Clean" />
            </div>
            <div>
              <div className="image-label">Degraded</div>
              <img src={result.degraded_url} alt="Degraded" />
            </div>
            <div>
              <div className="image-label">Recovered</div>
              <img src={result.recovered_url} alt="Recovered" />
            </div>
          </div>

          {result.comparison_url && (
            <div className="comparison-block">
              <div className="image-label">Comparison</div>
              <img src={result.comparison_url} alt="Comparison" />
            </div>
          )}

          <table className="metrics-table">
            <thead>
              <tr>
                <th>指标</th>
                <th>数值</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(result.metrics || {}).map(([key, value]) => (
                <tr key={key}>
                  <td>{METRIC_LABELS[key] || key}</td>
                  <td>
                    {value == null ? '—' : (typeof value === 'number' ? value.toFixed(4) : String(value))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
