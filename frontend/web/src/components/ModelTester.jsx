import { useRef, useState } from 'react';
import { runModel } from '../api/client';
import ResultCompare from './ResultCompare';

export default function ModelTester({ domainId, nodeId, selectedMethod }) {
  const fileRef = useRef(null);
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);

  const handleFileChange = (e) => {
    const selected = e.target.files?.[0];
    if (!selected) return;
    setFile(selected);
    setPreview(URL.createObjectURL(selected));
    setResult(null);
    setError(null);
  };

  const handleRun = async () => {
    if (!file || !selectedMethod) return;

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const data = await runModel(domainId, nodeId, selectedMethod, file);
      setResult(data);
    } catch (err) {
      const msg = err.response?.data?.detail || err.message || '运行失败';
      setError(typeof msg === 'string' ? msg : JSON.stringify(msg));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="tester-panel">
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
        <p>点击或拖拽上传测试图片</p>
        {preview && (
          <img src={preview} alt="预览" className="preview-thumb" />
        )}
      </div>

      <button
        type="button"
        className="btn btn-primary"
        disabled={!file || !selectedMethod || loading}
        onClick={handleRun}
      >
        {loading ? '运行中...' : '运行模型'}
      </button>

      {!selectedMethod && (
        <p className="card-desc" style={{ marginTop: '0.75rem' }}>
          请先选择一个可用的方法
        </p>
      )}

      {error && <div className="error" style={{ marginTop: '1rem' }}>{error}</div>}

      {result && <ResultCompare result={result} />}
    </div>
  );
}
