"""Resolve and enrich method paper_relation from node papers."""

from __future__ import annotations

from typing import Any


def find_matching_paper(
    papers: list[dict[str, Any]],
    method_id: str | None = None,
    method_title: str | None = None,
    paper_id: str | None = None,
) -> dict[str, Any] | None:
    if not papers:
        return None

    if paper_id:
        for paper in papers:
            if paper.get("id") == paper_id:
                return paper

    if method_id:
        for paper in papers:
            if paper.get("id") == method_id:
                return paper

    if method_title:
        for paper in papers:
            if paper.get("method") == method_title:
                return paper

    return None


def _build_citation(paper: dict[str, Any]) -> str:
    name = paper.get("method") or paper.get("id") or ""
    year = paper.get("year")
    if year:
        return f"{name}, {year}"
    return name


def enrich_paper_relation(
    paper_relation: Any,
    method_id: str,
    method_title: str | None,
    papers: list[dict[str, Any]],
) -> Any:
    if isinstance(paper_relation, str):
        return paper_relation

    relation: dict[str, Any] = dict(paper_relation) if isinstance(paper_relation, dict) else {}

    if relation.get("paper_url"):
        return relation

    matched = find_matching_paper(
        papers,
        method_id=method_id,
        method_title=method_title,
        paper_id=relation.get("paper_id"),
    )
    if not matched:
        return relation if relation else None

    relation.setdefault("paper_id", matched.get("id", ""))
    relation.setdefault("paper_url", matched.get("paper_url", ""))
    relation.setdefault("code_url", matched.get("code_url", ""))
    relation.setdefault("title", matched.get("title", ""))
    if not relation.get("citation"):
        relation["citation"] = _build_citation(matched)

    return relation


def enrich_method_details(
    method_details: dict[str, dict[str, Any]],
    papers: list[dict[str, Any]],
) -> dict[str, dict[str, Any]]:
    enriched: dict[str, dict[str, Any]] = {}
    for method_id, detail in method_details.items():
        updated = dict(detail)
        if "paper_relation" in updated:
            updated["paper_relation"] = enrich_paper_relation(
                updated["paper_relation"],
                method_id,
                updated.get("title"),
                papers,
            )
        enriched[method_id] = updated
    return enriched
