const STATUS_LABELS = {
  runnable: '可运行',
  theory: '仅理论',
  future: '后续扩展',
};

const STATUS_CLASS = {
  runnable: 'status-ready',
  theory: 'status-deps',
  future: 'status-disabled',
};

const DIFF_LABELS = { easy: '入门', medium: '中等', hard: '进阶' };

export default function LearningPath({ items, methods, selectedMethod, onSelect }) {
  if (!items || items.length === 0) return null;

  const methodIds = new Set((methods || []).map((m) => m.id));

  const handleClick = (item) => {
    if (methodIds.has(item.id)) {
      onSelect(item.id);
    }
  };

  return (
    <div className="learning-path">
      {items.map((item, index) => {
        const clickable = methodIds.has(item.id);
        const selected = selectedMethod === item.id;
        return (
          <div
            key={item.id}
            className={`learning-step ${selected ? 'selected' : ''} ${clickable ? 'clickable' : ''}`}
            onClick={() => handleClick(item)}
            onKeyDown={(e) => e.key === 'Enter' && handleClick(item)}
            role={clickable ? 'button' : undefined}
            tabIndex={clickable ? 0 : undefined}
          >
            <div className="learning-step-index">{index + 1}</div>
            <div className="learning-step-body">
              <div className="learning-step-header">
                <span className="learning-step-title">{item.title}</span>
                <span className={`method-status ${STATUS_CLASS[item.status] || 'status-disabled'}`}>
                  {STATUS_LABELS[item.status] || item.status}
                </span>
              </div>
              <div className="learning-step-meta">
                <span className="learning-stage">{item.stage}</span>
                {item.difficulty && (
                  <span className={`badge badge-diff badge-diff-${item.difficulty}`}>
                    {DIFF_LABELS[item.difficulty] || item.difficulty}
                  </span>
                )}
              </div>
              <p className="learning-step-desc">{item.description}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
