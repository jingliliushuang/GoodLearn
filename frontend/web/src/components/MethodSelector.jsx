export default function MethodSelector({ methods, selected, onSelect }) {
  if (!methods || methods.length === 0) {
    return <p className="card-desc">暂无可用方法</p>;
  }

  return (
    <div className="method-list">
      {methods.map((method) => (
        <button
          key={method.id}
          type="button"
          className={`method-chip ${selected === method.id ? 'selected' : ''} ${method.available ? '' : 'unavailable'}`}
          onClick={() => method.available && onSelect(method.id)}
          title={method.available ? method.description : '推理功能即将接入'}
        >
          {method.title}
          {!method.available && ' (待接入)'}
        </button>
      ))}
    </div>
  );
}
