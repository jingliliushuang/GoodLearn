"""Node export/import — placeholder for future implementation.

TODO:
- export_node(node_path) -> zip under outputs/exports/
- import_node(zip_path) -> validate interfaces -> register to knowledge tree
- Validate dataset.py / metrics.py / model.py process() exist for leaf nodes
"""

from __future__ import annotations

from pathlib import Path
from typing import Any


def export_node(domain_id: str, node_id: str, output_dir: Path | None = None) -> Path:
    """Export a knowledge node folder to a zip archive."""
    raise NotImplementedError(
        f"Node export is not implemented yet. domain={domain_id}, node={node_id}"
    )


def import_node(archive_path: Path, domain_id: str | None = None) -> dict[str, Any]:
    """Import a node zip, validate interfaces, and register under knowledge/."""
    raise NotImplementedError(
        f"Node import is not implemented yet. archive={archive_path}"
    )


def validate_node_interfaces(node_dir: Path) -> dict[str, Any]:
    """Check that a node folder exposes expected teaching/runtime interfaces."""
    checks = {
        "metadata.json": (node_dir / "metadata.json").exists(),
        "content_or_readme": (node_dir / "content.md").exists() or (node_dir / "README.md").exists(),
        "dataset.py": (node_dir / "dataset.py").exists(),
        "metrics.py": (node_dir / "metrics.py").exists(),
        "methods_dir": (node_dir / "methods").is_dir(),
    }
    checks["valid"] = checks["metadata.json"] and checks["methods_dir"]
    return checks
