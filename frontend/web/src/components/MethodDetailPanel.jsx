import { openExternalLink, resolvePaperRelation } from '../utils/paperRelation';

function PaperRelationSection({ resolved }) {
  if (!resolved) return null;

  if (resolved.kind === 'string') {
    return (
      <div className="detail-section">
        <h4 className="detail-heading">论文关联</h4>
        <p>{resolved.text}</p>
      </div>
    );
  }

  const { citation, title, note, paper_url, code_url } = resolved.data;
  const headline = [citation, title].filter(Boolean).join(' — ');

  return (
    <div className="detail-section">
      <h4 className="detail-heading">论文关联</h4>
      {headline && <p className="paper-relation-headline">{headline}</p>}
      {note && <p className="paper-relation-note">{note}</p>}
      {(paper_url || code_url) && (
        <div className="paper-relation-actions">
          {paper_url && (
            <button
              type="button"
              className="btn btn-secondary btn-sm btn-paper-link"
              onClick={() => openExternalLink(paper_url)}
            >
              打开论文
            </button>
          )}
          {code_url && (
            <button
              type="button"
              className="btn btn-secondary btn-sm btn-paper-link"
              onClick={() => openExternalLink(code_url)}
            >
              查看代码
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default function MethodDetailPanel({
  detail,
  methodTitle,
  methodId,
  papers,
}) {
  if (!detail) {
    return (
      <div className="detail-panel empty">
        <p className="card-desc">选择课程导航中的方法查看详细说明。</p>
      </div>
    );
  }

  const paperRelation = resolvePaperRelation(
    detail,
    methodId,
    methodTitle || detail.title,
    papers,
  );

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

      <PaperRelationSection resolved={paperRelation} />

      {detail.teaching_notes && (
        <div className="detail-section detail-notes">
          <h4 className="detail-heading">教学提示</h4>
          <p>{detail.teaching_notes}</p>
        </div>
      )}
    </div>
  );
}
