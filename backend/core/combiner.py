"""Combined node pipeline — placeholder for future implementation.

TODO:
- Validate parent leaf nodes exist
- Generate combined node folder (metadata.json, strategy.json, runtime/combiner.py)
- Execute cascade / parallel / fusion strategies by referencing parent model.py modules
- Expose API or CLI for creating combined nodes
"""

from __future__ import annotations

from typing import Any

import numpy as np


def combine(images: list[np.ndarray], strategy: str = "cascade") -> np.ndarray:
    """Combine multiple intermediate images according to strategy.

    Not implemented yet. See knowledge/cv/combined/README.md.
    """
    raise NotImplementedError(
        "Combined nodes are not implemented yet. "
        f"strategy={strategy!r}, images={len(images)}"
    )


def create_combined_node(
    domain_id: str,
    combined_id: str,
    parents: list[str],
    strategy: str = "cascade",
    **options: Any,
) -> str:
    """Create a combined node directory under knowledge/{domain}/combined/{combined_id}.

    TODO: generate metadata.json, strategy.json, README.md, runtime/combiner.py
    """
    raise NotImplementedError(
        "Combined node generation is not implemented yet. "
        f"domain={domain_id}, combined_id={combined_id}, parents={parents}"
    )
