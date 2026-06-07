function statusLabel(method) {
  if (method.available) return '可运行';
  if (method.missing_dependencies?.length > 0) return '缺少依赖';
  if (method.missing_weights?.length > 0) return '缺少权重';
  return '未启用';
}

function statusClass(method) {
  if (method.available) return 'status-ready';
  if (method.missing_dependencies?.length > 0) return 'status-deps';
  if (method.missing_weights?.length > 0) return 'status-weights';
  return 'status-disabled';
}

export default function MethodSelector({ methods, selected, onSelect }) {
  if (!methods || methods.length === 0) {
    return <p className="card-desc">暂无方法</p>;
  }

  const availableCount = methods.filter((m) => m.available).length;

  return (
    <div>
      <p className="method-summary">
        共 {methods.length} 个方法，{availableCount} 个可运行
      </p>
      <div className="method-grid">
        {methods.map((method) => (
          <button
            key={method.id}
            type="button"
            className={`method-card ${selected === method.id ? 'selected' : ''} ${method.available ? 'available' : 'unavailable'}`}
            onClick={() => onSelect(method.id)}
          >
            <div className="method-card-header">
              <span className="method-card-title">{method.title}</span>
              <span className={`method-status ${statusClass(method)}`}>
                {statusLabel(method)}
              </span>
            </div>
            {method.category && (
              <span className="method-category">{method.category}</span>
            )}
            {method.description && (
              <p className="method-card-desc">{method.description}</p>
            )}
            {!method.available && method.reason && (
              <p className="method-reason">{method.reason}</p>
            )}
            {method.detected_weights?.length > 0 && (
              <p className="method-meta">
                已检测到权重: {method.detected_weights.map((w) => w.split(/[/\\]/).pop()).join(', ')}
              </p>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

export { statusLabel, statusClass };
