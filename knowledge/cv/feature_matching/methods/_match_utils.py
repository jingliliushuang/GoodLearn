"""Shared helpers for feature matching methods."""
from __future__ import annotations

import time
from typing import Any

import cv2
import numpy as np


def _draw_matches(img_a: np.ndarray, kp_a, img_b: np.ndarray, kp_b, matches, mask=None) -> np.ndarray:
    if mask is not None:
        good = [m for i, m in enumerate(matches) if mask[i]]
    else:
        good = matches
    return cv2.drawMatches(img_a, kp_a, img_b, kp_b, good, None,
                           matchColor=(0, 255, 0), singlePointColor=(255, 0, 0),
                           flags=cv2.DrawMatchesFlags_NOT_DRAW_SINGLE_POINTS)


def _ratio_test_matches(des_a, des_b, matcher, ratio: float = 0.75):
    pairs = matcher.knnMatch(des_a, des_b, k=2)
    good = []
    for pair in pairs:
        if len(pair) < 2:
            continue
        m, n = pair
        if m.distance < ratio * n.distance:
            good.append(m)
    return good


def _base_metrics(kp_a, kp_b, matches, good_matches, inliers=0, runtime_ms=0.0) -> dict[str, Any]:
    return {
        "keypoints_a": len(kp_a),
        "keypoints_b": len(kp_b),
        "matches": len(matches),
        "good_matches": len(good_matches),
        "inliers": int(inliers),
        "runtime_ms": round(runtime_ms, 2),
    }
