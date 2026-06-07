import { useCallback, useEffect, useState } from 'react';
import { fetchExperiments } from '../api/client';
import { formatParamsBrief } from '../utils/methodParams';

function formatMethodCell(rec) {
  if (rec.type === 'comparison') {
    const names = (rec.methods || []).slice(0, 3).join(', ');
    const suffix = (rec.methods || []).length > 3 ? '…' : '';
    return `对比实验: ${names}${suffix}`;
  }
  if (rec.type === 'pipeline') {
    return `流水线 (${rec.steps?.length || 0} 步)`;
  }
  const base = rec.method || '-';
  const paramsStr = formatParamsBrief(rec.params);
  return paramsStr ? `${base} / ${paramsStr}` : base;
}

export default function ExperimentHistory({ domainId, nodeId, refreshKey }) {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    fetchExperiments(domainId, nodeId)
      .then(setRecords)
      .catch(() => setRecords([]))
      .finally(() => setLoading(false));
  }, [domainId, nodeId]);

  useEffect(() => {
    load();
  }, [load, refreshKey]);

  if (loading) return <p className="card-desc">加载实验记录...</p>;
  if (records.length === 0) {
    return <p className="card-desc">暂无实验记录，运行模型测试后会自动保存。</p>;
  }

  return (
    <div className="experiment-history">
      <table className="demo-table">
        <thead>
          <tr>
            <th>时间</th>
            <th>方法</th>
            <th>PSNR</th>
            <th>MSE</th>
            <th>Runtime (ms)</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          {records.map((rec) => (
            <tr key={rec.run_id}>
              <td>{rec.timestamp?.replace('T', ' ') || rec.run_id}</td>
              <td>{formatMethodCell(rec)}</td>
              <td>{rec.metrics?.psnr ?? '-'}</td>
              <td>{rec.metrics?.mse ?? '-'}</td>
              <td>{rec.metrics?.runtime_ms ?? '-'}</td>
              <td>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => setExpanded(expanded === rec.run_id ? null : rec.run_id)}
                >
                  {expanded === rec.run_id ? '收起' : '查看结果'}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {expanded && records.find((r) => r.run_id === expanded) && (
        <div className="experiment-preview">
          {(() => {
            const rec = records.find((r) => r.run_id === expanded);
            return (
              <>
                <div className="compare-images">
                  <div>
                    <div className="image-label">输入</div>
                    <img src={rec.comparison_url ? rec.input_url : rec.input_url} alt="输入" />
                  </div>
                  <div>
                    <div className="image-label">输出</div>
                    <img src={rec.output_url} alt="输出" />
                  </div>
                </div>
                {rec.comparison_url && (
                  <div className="compare-full">
                    <div className="image-label">对比图</div>
                    <img src={rec.comparison_url} alt="对比" />
                  </div>
                )}
              </>
            );
          })()}
        </div>
      )}
    </div>
  );
}
