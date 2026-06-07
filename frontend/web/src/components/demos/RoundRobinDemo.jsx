import { useState } from 'react';
import { runRoundRobinDemo } from '../../api/client';

const DEFAULT_PROCESSES = [
  { pid: 'P1', arrival_time: 0, burst_time: 5 },
  { pid: 'P2', arrival_time: 1, burst_time: 3 },
  { pid: 'P3', arrival_time: 2, burst_time: 4 },
];

export default function RoundRobinDemo() {
  const [timeQuantum, setTimeQuantum] = useState(2);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleRun = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await runRoundRobinDemo({
        time_quantum: timeQuantum,
        processes: DEFAULT_PROCESSES,
      });
      setResult(data);
    } catch (err) {
      setError(err.response?.data?.detail || err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="demo-panel">
      <h3 className="demo-title">Round Robin 调度模拟</h3>
      <p className="card-desc">
        默认进程：P1(0,5)、P2(1,3)、P3(2,4) — 到达时间与 burst time
      </p>
      <div className="demo-form">
        <label>
          时间片 time_quantum
          <input type="number" min="1" value={timeQuantum} onChange={(e) => setTimeQuantum(Number(e.target.value))} />
        </label>
        <button type="button" className="btn btn-primary" onClick={handleRun} disabled={loading}>
          {loading ? '模拟中...' : '运行模拟'}
        </button>
      </div>
      {error && <div className="error">{String(error)}</div>}
      {result && (
        <div className="demo-result">
          <div className="metrics-grid">
            <div className="metric-card">
              <div className="metric-value">{result.metrics.average_waiting_time}</div>
              <div className="metric-label">平均等待时间</div>
            </div>
            <div className="metric-card">
              <div className="metric-value">{result.metrics.average_turnaround_time}</div>
              <div className="metric-label">平均周转时间</div>
            </div>
          </div>
          <h4 className="demo-subtitle">Timeline</h4>
          <table className="demo-table">
            <thead>
              <tr>
                <th>进程</th>
                <th>开始</th>
                <th>结束</th>
              </tr>
            </thead>
            <tbody>
              {result.timeline.map((row, idx) => (
                <tr key={`${row.pid}-${row.start}-${idx}`}>
                  <td>{row.pid}</td>
                  <td>{row.start}</td>
                  <td>{row.end}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
