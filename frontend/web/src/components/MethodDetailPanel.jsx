export default function MethodDetailPanel({ detail, methodTitle }) {
  if (!detail) {
    return (
      <div className="detail-panel empty">
        <p className="card-desc">选择左侧方法卡片查看详细说明。</p>
      </div>
    );
  }

  const ListSection = ({ title, items }) => {
    if (!items || items.length === 0) return null;
    return (
      <div className="detail-section">
        <h4 className="detail-heading">{title}</h4>
        <ul className="detail-list">
          {items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </div>
    );
  };

  return (
    <div className="detail-panel">
      <h3 className="detail-title">{detail.title || methodTitle}</h3>

      {detail.problem && (
        <div className="detail-section">
          <h4 className="detail-heading">解决的问题</h4>
          <p>{detail.problem}</p>
        </div>
      )}

      <ListSection title="核心思想" items={detail.core_idea} />
      <ListSection title="算法流程" items={detail.pipeline} />
      <ListSection title="优点" items={detail.advantages} />
      <ListSection title="局限" items={detail.limitations} />
      <ListSection title="适用场景" items={detail.suitable_for} />

      {detail.code_entry && (
        <div className="detail-section">
          <h4 className="detail-heading">代码入口</h4>
          <code className="detail-code">{detail.code_entry}</code>
        </div>
      )}

      {detail.paper_relation && (
        <div className="detail-section">
          <h4 className="detail-heading">论文关联</h4>
          <p>{detail.paper_relation}</p>
        </div>
      )}

      {detail.teaching_notes && (
        <div className="detail-section detail-notes">
          <h4 className="detail-heading">教学提示</h4>
          <p>{detail.teaching_notes}</p>
        </div>
      )}
    </div>
  );
}
