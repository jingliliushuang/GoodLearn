function findMatchingPaper(papers, methodId, methodTitle, paperId) {
  if (!papers?.length) return null;

  if (paperId) {
    const byPaperId = papers.find((p) => p.id === paperId);
    if (byPaperId) return byPaperId;
  }

  if (methodId) {
    const byMethodId = papers.find((p) => p.id === methodId);
    if (byMethodId) return byMethodId;
  }

  if (methodTitle) {
    const byTitle = papers.find((p) => p.method === methodTitle);
    if (byTitle) return byTitle;
  }

  return null;
}

function buildCitationFromPaper(paper) {
  if (!paper) return '';
  const name = paper.method || paper.id || '';
  const year = paper.year;
  return year ? `${name}, ${year}` : name;
}

function mergePaperIntoRelation(relation, paper) {
  if (!paper) return relation;

  const merged = { ...relation };
  if (!merged.paper_id) merged.paper_id = paper.id || '';
  if (!merged.paper_url) merged.paper_url = paper.paper_url || '';
  if (!merged.code_url) merged.code_url = paper.code_url || '';
  if (!merged.title) merged.title = paper.title || '';
  if (!merged.citation) merged.citation = buildCitationFromPaper(paper);
  return merged;
}

/**
 * Resolve paper_relation for display.
 * Returns { kind: 'string', text } | { kind: 'object', data } | null
 */
export function resolvePaperRelation(detail, methodId, methodTitle, papers) {
  const raw = detail?.paper_relation;
  if (typeof raw === 'string' && raw.trim()) {
    return { kind: 'string', text: raw };
  }

  let relation = typeof raw === 'object' && raw !== null ? { ...raw } : {};

  if (!relation.paper_url) {
    const matched = findMatchingPaper(
      papers,
      methodId,
      methodTitle || detail?.title,
      relation.paper_id,
    );
    relation = mergePaperIntoRelation(relation, matched);
  }

  const hasContent =
    relation.citation ||
    relation.title ||
    relation.note ||
    relation.paper_url ||
    relation.code_url;

  if (!hasContent) return null;

  return { kind: 'object', data: relation };
}

export function openExternalLink(url) {
  if (!url) return;
  window.open(url, '_blank', 'noopener,noreferrer');
}
