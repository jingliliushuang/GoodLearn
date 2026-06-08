import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { fetchNode, runPipeline } from '../api/client';
import {
  PIPELINE_INPUT,
  findFirstCompatibleMethod,
  formatIoArrow,
  getMethodCompat,
  getMethodTypeCompat,
  getRequiredInputForStep,
  kindLabel,
} from '../utils/ioSpec';

const STEP_COUNT = 4;
const DND_TYPE = 'application/x-pipeline-node';

const PALETTE = [
  { id: 'denoise', title: '图像去噪', domain: 'cv' },
  { id: 'super_resolution', title: '图像超分', domain: 'cv' },
  { id: 'feature_matching', title: '特征匹配', domain: 'cv' },
  { id: 'image_classification', title: '图像分类', domain: 'cv' },
  { id: 'object_detection', title: '目标检测', domain: 'cv' },
];

function emptySteps() {
  return Array.from({ length: STEP_COUNT }, () => null);
}

function StepBox({
  index,
  step,
  methods,
  requiredInput,
  dragOver,
  onDragOver,
  onDragLeave,
  onDrop,
  onMethodChange,
  onClear,
  onRemove,
}) {
  const hasNode = Boolean(step?.nodeId);
  const selectedMethod = methods.find((m) => m.id === step?.method);
  const selectedCompat = selectedMethod ? getMethodCompat(selectedMethod, requiredInput) : null;

  return (
    <div className="pipeline-step-wrap">
      {index > 0 && <span className="pipeline-arrow">→</span>}
      <div
        className={`pipeline-step ${dragOver ? 'drag-over' : ''} ${hasNode ? 'filled' : 'empty'}`}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
      >
        <div className="pipeline-step-header">
          <span className="pipeline-step-label">Step {index + 1}</span>
          {index === 0 && (
            <span className="pipeline-io-tag">Pipeline 输入：{kindLabel(PIPELINE_INPUT.kind)}</span>
          )}
          {index > 0 && requiredInput && (
            <span className="pipeline-io-tag">需要：{kindLabel(requiredInput.kind)}</span>
          )}
          {hasNode && (
            <div className="pipeline-step-actions">
              <button type="button" className="btn-link" onClick={onClear}>清空</button>
              <button type="button" className="btn-link btn-link-danger" onClick={onRemove}>删除</button>
            </div>
          )}
        </div>

        {hasNode ? (
          <>
            <div className="pipeline-step-node">
              <span className="roadmap-dot dot-ready" />
              {step.nodeTitle}
            </div>
            <select
              className="pipeline-method-select"
              value={step.method || ''}
              onChange={(e) => onMethodChange(e.target.value)}
            >
              <option value="" disabled>选择方法</option>
              {methods.map((m) => {
                const typeCompat = getMethodTypeCompat(m, requiredInput);
                const disabled = !typeCompat.compatible || !m.available;
                const hint = !typeCompat.compatible
                  ? typeCompat.reason
                  : (!m.available ? (m.reason || '不可运行') : '');
                return (
                  <option key={m.id} value={m.id} disabled={disabled} title={hint}>
                    {m.title || m.id} · {formatIoArrow(m.input_spec, m.output_spec)}
                    {!typeCompat.compatible ? ' · 类型不兼容' : ''}
                    {typeCompat.compatible && !m.available ? ' · 不可运行' : ''}
                  </option>
                );
              })}
            </select>
            {selectedMethod && (
              <p className="pipeline-method-io">
                {formatIoArrow(selectedMethod.input_spec, selectedMethod.output_spec)}
                {selectedCompat && !selectedCompat.compatible && (
                  <span className="pipeline-incompat-reason"> {selectedCompat.reason}</span>
                )}
              </p>
            )}
          </>
        ) : (
          <p className="pipeline-step-placeholder">拖入任务节点</p>
        )}
      </div>
    </div>
  );
}

export default function PipelinePage() {
  const { domainId = 'cv' } = useParams();
  const [nodeMethods, setNodeMethods] = useState({});
  const [steps, setSteps] = useState(emptySteps);
  const [dragOverIndex, setDragOverIndex] = useState(null);
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);
  const fileRef = useRef(null);

  useEffect(() => {
    Promise.all(PALETTE.map((item) => fetchNode(item.domain, item.id)))
      .then((nodes) => {
        const map = {};
        PALETTE.forEach((item, idx) => {
          map[item.id] = nodes[idx].methods || [];
        });
        setNodeMethods(map);
      })
      .catch(() => setError('加载节点方法失败'));
  }, []);

  const activeSteps = useMemo(
    () => steps
      .map((step, idx) => (step ? { ...step, slotIndex: idx } : null))
      .filter(Boolean),
    [steps],
  );

  const canRun = useMemo(() => {
    if (!file || activeSteps.length === 0) return false;
    return activeSteps.every((s, idx) => {
      if (!s.method) return false;
      const methods = nodeMethods[s.nodeId] || [];
      const method = methods.find((m) => m.id === s.method);
      if (!method?.available) return false;
      const required = getRequiredInputForStep(s.slotIndex, steps, nodeMethods);
      return getMethodCompat(method, required).compatible;
    });
  }, [file, activeSteps, steps, nodeMethods]);

  const handlePaletteDragStart = (e, item) => {
    e.dataTransfer.setData(DND_TYPE, JSON.stringify(item));
    e.dataTransfer.effectAllowed = 'copy';
  };

  const assignStep = useCallback((slotIndex, item) => {
    const methods = nodeMethods[item.id] || [];
    setSteps((prev) => {
      const required = getRequiredInputForStep(slotIndex, prev, nodeMethods);
      const defaultMethod = findFirstCompatibleMethod(methods, required);
      const next = [...prev];
      next[slotIndex] = {
        nodeId: item.id,
        nodeTitle: item.title,
        domain: item.domain,
        method: defaultMethod,
      };
      return next;
    });
  }, [nodeMethods]);

  const handleStepDrop = (slotIndex) => (e) => {
    e.preventDefault();
    setDragOverIndex(null);
    const raw = e.dataTransfer.getData(DND_TYPE);
    if (!raw) return;
    try {
      assignStep(slotIndex, JSON.parse(raw));
    } catch {
      /* ignore */
    }
  };

  const clearPipeline = () => {
    setSteps(emptySteps());
    setResult(null);
    setError(null);
  };

  const handleRun = async () => {
    if (!canRun || !file) return;

    setLoading(true);
    setError(null);
    setResult(null);

    const pipelineSteps = activeSteps.map((step, idx) => ({
      index: idx + 1,
      domain: step.domain,
      node: step.nodeId,
      method: step.method,
      params: {},
    }));

    try {
      const data = await runPipeline(file, {
        domain: domainId,
        strategy: 'cascade',
        pipeline_input_kind: PIPELINE_INPUT.kind,
        pipeline_input_media: PIPELINE_INPUT.media_type,
        steps: pipelineSteps,
      });
      setResult(data);
    } catch (err) {
      const detail = err.response?.data?.detail;
      if (detail && typeof detail === 'object') {
        const msgs = detail.errors || [detail.message];
        setError(Array.isArray(msgs) ? msgs.join('；') : String(detail.message || detail));
      } else {
        setError(typeof detail === 'string' ? detail : err.message || '流水线运行失败');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="pipeline-page">
      <Link to={`/domain/${domainId}`} className="back-link">← 返回领域</Link>
      <h1 className="page-title">组合实验流水线</h1>
      <p className="page-desc">
        拖拽任务节点并选择方法，系统按 Step 顺序执行。仅允许输入输出类型兼容的方法组合（当前 Pipeline 输入默认为单张图片）。
      </p>

      <div className="pipeline-hint card card-compact">
        去噪与超分均为 single_image → single_image，可自由串联。特征匹配需要 image_pair 输入，不能作为单图 Pipeline 的第一步。
      </div>

      <div className="pipeline-layout">
        <aside className="pipeline-palette">
          <h2 className="section-title">可选任务节点</h2>
          <p className="card-desc">拖拽到中间 Step 框，再选择具体方法</p>
          <ul className="pipeline-palette-list">
            {PALETTE.map((item) => (
              <li
                key={item.id}
                className="pipeline-palette-item"
                draggable
                onDragStart={(e) => handlePaletteDragStart(e, item)}
              >
                <span className="roadmap-dot dot-ready" />
                <div>
                  <div className="pipeline-palette-title">{item.title}</div>
                  <div className="pipeline-palette-id">{item.id}</div>
                </div>
              </li>
            ))}
          </ul>
        </aside>

        <section className="pipeline-canvas">
          <h2 className="section-title">顺序流水线</h2>
          <div className="pipeline-steps-row">
            {steps.map((step, idx) => (
              <StepBox
                key={idx}
                index={idx}
                step={step}
                methods={step ? (nodeMethods[step.nodeId] || []) : []}
                requiredInput={getRequiredInputForStep(idx, steps, nodeMethods)}
                dragOver={dragOverIndex === idx}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOverIndex(idx);
                }}
                onDragLeave={() => setDragOverIndex(null)}
                onDrop={handleStepDrop(idx)}
                onMethodChange={(method) => {
                  setSteps((prev) => {
                    const next = [...prev];
                    next[idx] = { ...next[idx], method };
                    return next;
                  });
                }}
                onClear={() => {
                  setSteps((prev) => {
                    const next = [...prev];
                    next[idx] = null;
                    return next;
                  });
                }}
                onRemove={() => {
                  setSteps((prev) => {
                    const next = [...prev];
                    next[idx] = null;
                    return next;
                  });
                }}
              />
            ))}
          </div>
        </section>
      </div>

      <section className="section pipeline-run-panel">
        <h2 className="section-title">运行</h2>
        <div
          className="upload-area"
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
          <p>点击上传测试图片（single_image）</p>
          {preview && <img src={preview} alt="预览" className="preview-thumb" />}
        </div>

        <div className="pipeline-run-actions">
          <button
            type="button"
            className="btn btn-primary"
            disabled={!canRun || loading}
            onClick={handleRun}
          >
            {loading ? '运行中...' : '运行流水线'}
          </button>
          <button type="button" className="btn btn-secondary" onClick={clearPipeline}>
            清空流水线
          </button>
        </div>

        {!file && activeSteps.length > 0 && (
          <p className="card-desc">请上传图片后再运行</p>
        )}
        {activeSteps.some((s) => !s.method) && (
          <p className="card-desc">请为每个 Step 选择兼容且可运行的方法</p>
        )}

        {error && <div className="error pipeline-error">{error}</div>}
      </section>

      {result && (
        <section className="section pipeline-results">
          <h2 className="section-title">运行结果</h2>
          <p className="card-desc">
            总耗时：<strong>{result.total_runtime_ms} ms</strong>
            {' · '}
            Pipeline ID：{result.pipeline_id}
          </p>

          <div className="pipeline-result-grid">
            <div className="pipeline-result-item">
              <div className="image-label">输入</div>
              <img src={result.input_url} alt="输入" />
            </div>

            {result.steps.map((step) => (
              <div key={step.index} className="pipeline-result-item">
                <div className="image-label">
                  Step {step.index}: {step.node} / {step.method}
                  {step.input_spec && step.output_spec && (
                    <span className="pipeline-step-io-badge">
                      {' '}
                      {formatIoArrow(step.input_spec, step.output_spec)}
                    </span>
                  )}
                  <span className="pipeline-runtime">{step.runtime_ms} ms</span>
                </div>
                <img src={step.output_url} alt={`Step ${step.index}`} />
              </div>
            ))}

            <div className="pipeline-result-item pipeline-result-final">
              <div className="image-label">最终输出</div>
              <img src={result.final_output_url} alt="最终输出" />
            </div>
          </div>

          {result.comparison_url && (
            <div className="compare-full">
              <div className="image-label">输入 vs 最终输出</div>
              <img src={result.comparison_url} alt="对比" />
            </div>
          )}
        </section>
      )}
    </div>
  );
}
