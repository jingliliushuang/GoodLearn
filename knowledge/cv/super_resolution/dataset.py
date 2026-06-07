"""Super-resolution node dataset — downsample degradation for evaluation."""

from __future__ import annotations

import cv2
import numpy as np


def degrade(clean_image: np.ndarray, scale: int = 2, **params) -> np.ndarray:
    """Downsample a high-resolution image to simulate a low-resolution input."""
    scale = max(int(scale), 1)
    height, width = clean_image.shape[:2]
    lr_h = max(height // scale, 1)
    lr_w = max(width // scale, 1)
    return cv2.resize(clean_image, (lr_w, lr_h), interpolation=cv2.INTER_AREA)
