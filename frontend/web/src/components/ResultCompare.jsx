export default function ResultCompare({ result }) {
  const { metrics, input_url, output_url, comparison_url, run_id } = result;

  return (
    <div style={{ marginTop: '1.5rem' }}>
      <div className="section-title">运行结果 — {run_id}</div>

      <div className="metrics-grid">
        <div className="metric-card">
          <div className="metric-value">{metrics.mse}</div>
          <div className="metric-label">MSE</div>
        </div>
        <div className="metric-card">
          <div className="metric-value">{metrics.psnr}</div>
          <div className="metric-label">PSNR (dB)</div>
        </div>
        <div className="metric-card">
          <div className="metric-value">{metrics.runtime_ms}</div>
          <div className="metric-label">Runtime (ms)</div>
        </div>
      </div>

      <div className="compare-images">
        <div>
          <div className="image-label">输入</div>
          <img src={input_url} alt="输入" />
        </div>
        <div>
          <div className="image-label">输出</div>
          <img src={output_url} alt="输出" />
        </div>
      </div>

      <div className="compare-full">
        <div className="image-label">对比图（左：输入，右：输出）</div>
        <img src={comparison_url} alt="对比" />
      </div>
    </div>
  );
}
