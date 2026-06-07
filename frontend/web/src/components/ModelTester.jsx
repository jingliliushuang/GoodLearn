import { useCallback, useEffect, useRef, useState } from 'react';
import { runModel } from '../api/client';
import { buildDefaultParams } from '../utils/methodParams';
import MethodParamsPanel from './MethodParamsPanel';
import ResultCompare from './ResultCompare';

export default function ModelTester({ domainId, nodeId, methods, selectedMethod, onRunComplete }) {
  const fileRef = useRef(null);
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);
  const [params, setParams] = useState({});

  const selected = methods?.find((m) => m.id === selectedMethod);
  const canRun = selected?.available === true;
  const hasAnyAvailable = methods?.some((m) => m.available);
  const paramsSchema = selected?.params_schema || [];

  const resetParams = useCallback((schema) => {
    setParams(buildDefaultParams(schema || []));
  }, []);

  useEffect(() => {
    resetParams(selected?.params_schema);
  }, [selectedMethod, selected?.params_schema, resetParams]);

  const handleParamsChange = useCallback((next) => {
    setParams(next);
  }, []);

  const handleFileChange = (e) => {
    const picked = e.target.files?.[0];
    if (!picked) return;
    setFile(picked);
    setPreview(URL.createObjectURL(picked));
    setResult(null);
    setError(null);
  };

  const handleRun = async () => {
    if (!file || !selectedMethod || !canRun) return;

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const data = await runModel(domainId, nodeId, selectedMethod, file, params);
      setResult(data);
      onRunComplete?.(data);
    } catch (err) {
      const msg = err.response?.data?.detail || err.message || '运行失败';
      setError(typeof msg === 'string' ? msg : JSON.stringify(msg));
    } finally {
      setLoading(false);
    }
  };

  if (!hasAnyAvailable) {
    return (
      <div className="tester-panel">
        <div className="warn-box">
          当前节点没有可运行的模型。请检查是否缺少 Python 依赖或模型权重，
          或将权重放入对应方法的 weights/ 目录及 external_model_root。
        </div>
      </div>
    );
  }

  return (
    <div className="tester-panel">
      {selected && !selected.available && (
        <div className="warn-box">
          「{selected.title}」不可运行：{selected.reason || '未启用'}
        </div>
      )}

      <MethodParamsPanel
        paramsSchema={paramsSchema}
        values={params}
        onChange={handleParamsChange}
      />

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
          onChange={handleFileChange}
        />
        <p>点击上传测试图片</p>
        {preview && (
          <img src={preview} alt="预览" className="preview-thumb" />
        )}
      </div>

      <button
        type="button"
        className="btn btn-primary"
        disabled={!file || !selectedMethod || !canRun || loading}
        onClick={handleRun}
      >
        {loading ? '运行中...' : '运行模型'}
      </button>

      {!selectedMethod && (
        <p className="card-desc" style={{ marginTop: '0.75rem' }}>
          请先选择一个方法
        </p>
      )}

      {error && <div className="error" style={{ marginTop: '1rem' }}>{error}</div>}

      {result && <ResultCompare result={result} />}
    </div>
  );
}
