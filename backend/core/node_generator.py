"""Generate standard knowledge node templates."""

from __future__ import annotations

import json
import re
from datetime import datetime
from pathlib import Path
from typing import Any

from core.packer import validate_node
from core.tree import get_node_dir, load_domain_metadata
from core.utils import get_knowledge_root

NODE_ID_PATTERN = re.compile(r"^[a-z][a-z0-9_]*$")

DATASET_PY = '''"""Node dataset — synthetic degradation for evaluation."""

from __future__ import annotations

import numpy as np


def degrade(clean_image: np.ndarray, **params) -> np.ndarray:
    """Generate a degraded observation from a clean image. TODO: implement."""
    return clean_image.copy()
'''

METRICS_PY = '''"""Node metrics — evaluation against clean reference."""

from __future__ import annotations

import numpy as np


def evaluate(clean: np.ndarray, recovered: np.ndarray) -> dict:
    """Return basic metrics. TODO: implement node-specific metrics."""
    if clean.shape != recovered.shape:
        h = min(clean.shape[0], recovered.shape[0])
        w = min(clean.shape[1], recovered.shape[1])
        clean = clean[:h, :w]
        recovered = recovered[:h, :w]
    mse = float(np.mean((clean.astype(np.float64) - recovered.astype(np.float64)) ** 2))
    return {"mse": round(mse, 4), "psnr": None, "ssim": None}
'''

BASELINE_MODEL_PY = '''"""Baseline method — placeholder implementation."""

from __future__ import annotations

import numpy as np


def process(degraded_image: np.ndarray, **kwargs) -> np.ndarray:
    """Return processed image. Replace with a real algorithm."""
    return degraded_image.copy()
'''

BASELINE_README = """# Baseline

自动生成的占位方法。请补充算法说明并实现 `model.py` 中的 `process()`。
"""

NODE_README = """# {title}

本节点由 GoodLearnApp 节点管理器自动生成，状态为 **draft**。

请补充：
- `content.md` 教学内容
- `papers.json` 相关论文
- `dataset.py` 的 `degrade()` 退化逻辑
- `methods/` 下的具体算法
"""

CONTENT_MD = """# {title}

## 任务定义

{description}

## 输入输出

- 输入：待处理图像
- 输出：恢复/处理后的图像

## 常见方法

（待补充）

## 学习目标

（待补充）

## 后续补充

（待补充）
"""


def _validate_node_id(node_id: str) -> None:
    if not NODE_ID_PATTERN.match(node_id):
        raise ValueError(
            "node_id 非法：仅允许小写字母、数字、下划线，且必须以字母开头"
        )


def register_node_in_domain(domain_id: str, node_entry: dict[str, Any]) -> None:
    meta_path = get_knowledge_root() / domain_id / "metadata.json"
    if not meta_path.exists():
        raise FileNotFoundError(f"领域不存在: {domain_id}")

    with open(meta_path, encoding="utf-8") as f:
        meta = json.load(f)

    nodes = meta.get("nodes", [])
    if any(n.get("id") == node_entry["id"] for n in nodes):
        raise ValueError(f"节点 {node_entry['id']} 已在领域 {domain_id} 中注册")

    nodes.append(node_entry)
    meta["nodes"] = nodes

    with open(meta_path, "w", encoding="utf-8") as f:
        json.dump(meta, f, ensure_ascii=False, indent=2)


def create_node_template(
    domain: str,
    node_id: str,
    title: str,
    description: str,
    node_type: str = "leaf",
) -> dict[str, Any]:
    _validate_node_id(node_id)

    node_dir = get_node_dir(domain, node_id)
    if node_dir.exists():
        raise FileExistsError(f"节点目录已存在: {node_dir}")

    domain_meta_path = get_knowledge_root() / domain / "metadata.json"
    if not domain_meta_path.exists():
        raise FileNotFoundError(f"领域不存在: {domain}")

    load_domain_metadata(domain)

    now = datetime.now().isoformat(timespec="seconds")
    node_dir.mkdir(parents=True)

    metadata = {
        "id": node_id,
        "title": title,
        "type": node_type,
        "domain": domain,
        "description": description,
        "status": "draft",
        "created_at": now,
    }
    (node_dir / "metadata.json").write_text(
        json.dumps(metadata, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    (node_dir / "content.md").write_text(
        CONTENT_MD.format(title=title, description=description),
        encoding="utf-8",
    )
    (node_dir / "papers.json").write_text("[]\n", encoding="utf-8")
    (node_dir / "dataset.py").write_text(DATASET_PY, encoding="utf-8")
    (node_dir / "metrics.py").write_text(METRICS_PY, encoding="utf-8")
    (node_dir / "README.md").write_text(NODE_README.format(title=title), encoding="utf-8")

    methods_dir = node_dir / "methods" / "baseline"
    methods_dir.mkdir(parents=True)
    (methods_dir / "metadata.json").write_text(
        json.dumps(
            {
                "id": "baseline",
                "title": "Baseline 占位方法",
                "description": "自动生成的占位方法，待替换",
                "category": "baseline",
                "inference_enabled": True,
            },
            ensure_ascii=False,
            indent=2,
        ),
        encoding="utf-8",
    )
    (methods_dir / "README.md").write_text(BASELINE_README, encoding="utf-8")
    (methods_dir / "model.py").write_text(BASELINE_MODEL_PY, encoding="utf-8")

    tests_dir = node_dir / "tests"
    tests_dir.mkdir()
    (tests_dir / ".gitkeep").write_text("", encoding="utf-8")

    register_node_in_domain(
        domain,
        {
            "id": node_id,
            "title": title,
            "description": description,
            "status": "draft",
            "section": "planned",
            "order": 200,
        },
    )

    validation = validate_node(node_dir)
    return {
        "success": True,
        "domain": domain,
        "node_id": node_id,
        "node_path": str(node_dir),
        "validation": validation,
    }


def list_domain_nodes(domain: str) -> list[dict[str, Any]]:
    domain_dir = get_knowledge_root() / domain
    if not domain_dir.exists():
        return []

    nodes: list[dict[str, Any]] = []
    for item in sorted(domain_dir.iterdir()):
        if not item.is_dir():
            continue
        if item.name in {"combined"}:
            continue
        meta_path = item / "metadata.json"
        if not meta_path.exists():
            continue
        with open(meta_path, encoding="utf-8") as f:
            meta = json.load(f)
        nodes.append(
            {
                "id": meta.get("id", item.name),
                "title": meta.get("title", item.name),
                "description": meta.get("description", ""),
                "status": meta.get("status", "draft"),
                "path": str(item),
            }
        )
    return nodes
