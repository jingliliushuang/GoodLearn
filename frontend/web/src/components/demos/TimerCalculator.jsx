import { useState } from 'react';
import { runTimerDemo } from '../../api/client';

export default function TimerCalculator() {
  const [clockHz, setClockHz] = useState(72000000);
  const [prescaler, setPrescaler] = useState(7199);
  const [arr, setArr] = useState(9999);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleCalc = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await runTimerDemo({ clock_hz: clockHz, prescaler, arr });
      setResult(data);
    } catch (err) {
      setError(err.response?.data?.detail || err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="demo-panel">
      <h3 className="demo-title">Timer 周期计算器</h3>
      <div className="demo-form">
        <label>
          时钟频率 clock_hz (Hz)
          <input type="number" value={clockHz} onChange={(e) => setClockHz(Number(e.target.value))} />
        </label>
        <label>
          预分频 prescaler
          <input type="number" value={prescaler} onChange={(e) => setPrescaler(Number(e.target.value))} />
        </label>
        <label>
          自动重装载 arr
          <input type="number" value={arr} onChange={(e) => setArr(Number(e.target.value))} />
        </label>
        <button type="button" className="btn btn-primary" onClick={handleCalc} disabled={loading}>
          {loading ? '计算中...' : '计算'}
        </button>
      </div>
      {error && <div className="error">{String(error)}</div>}
      {result && (
        <div className="demo-result">
          <div className="metrics-grid">
            <div className="metric-card">
              <div className="metric-value">{result.timer_frequency_hz}</div>
              <div className="metric-label">timer_frequency_hz</div>
            </div>
            <div className="metric-card">
              <div className="metric-value">{result.period_seconds}</div>
              <div className="metric-label">period_seconds</div>
            </div>
            <div className="metric-card">
              <div className="metric-value">{result.interrupt_frequency_hz}</div>
              <div className="metric-label">interrupt_frequency_hz</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
