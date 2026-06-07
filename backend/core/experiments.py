"""Experiment record persistence."""

from __future__ import annotations

import json
from datetime import datetime
from pathlib import Path
from typing import Any

from core.utils import get_experiments_dir


def save_experiment(record: dict[str, Any]) -> Path:
    experiments_dir = get_experiments_dir()
    experiments_dir.mkdir(parents=True, exist_ok=True)

    run_id = record.get("run_id", datetime.now().strftime("%Y%m%d_%H%M%S"))
    if record.get("type") == "pipeline":
        filename = f"{run_id}_pipeline.json"
    else:
        method = record.get("method", "unknown")
        filename = f"{run_id}_{method}.json"
    path = experiments_dir / filename

    with open(path, "w", encoding="utf-8") as f:
        json.dump(record, f, ensure_ascii=False, indent=2)

    return path


def list_experiments(
    domain: str | None = None,
    node: str | None = None,
    method: str | None = None,
    limit: int = 20,
) -> list[dict[str, Any]]:
    experiments_dir = get_experiments_dir()
    if not experiments_dir.exists():
        return []

    records: list[dict[str, Any]] = []
    for path in experiments_dir.glob("*.json"):
        try:
            with open(path, encoding="utf-8") as f:
                record = json.load(f)
            if domain and record.get("domain") != domain:
                continue
            if node:
                record_node = record.get("node")
                if record.get("type") == "pipeline":
                    step_nodes = [s.get("node") for s in record.get("steps", [])]
                    if record_node != node and node not in step_nodes:
                        continue
                elif record_node != node:
                    continue
            if method and record.get("method") != method:
                continue
            records.append(record)
        except (json.JSONDecodeError, OSError):
            continue

    records.sort(key=lambda r: r.get("timestamp", ""), reverse=True)
    return records[:limit]
