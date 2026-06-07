import sys
import time
from pathlib import Path

import cv2
import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from _match_utils import _base_metrics, _draw_matches, _ratio_test_matches


def process(image_a: np.ndarray, image_b: np.ndarray, ratio: float = 0.75, **kwargs) -> dict:
    if not hasattr(cv2, "SIFT_create"):
        raise RuntimeError("缺少 opencv-contrib-python，无法使用 SIFT。请在项目后端环境中安装 opencv-contrib-python。")

    start = time.perf_counter()
    sift = cv2.SIFT_create()
    kp_a, des_a = sift.detectAndCompute(image_a, None)
    kp_b, des_b = sift.detectAndCompute(image_b, None)

    if des_a is None or des_b is None or len(kp_a) == 0 or len(kp_b) == 0:
        runtime_ms = (time.perf_counter() - start) * 1000
        blank = np.hstack([image_a, image_b])
        return {
            "vis_image": blank,
            "metrics": _base_metrics(kp_a or [], kp_b or [], [], [], 0, runtime_ms),
            "homography": [],
        }

    matcher = cv2.BFMatcher(cv2.NORM_L2)
    raw_pairs = matcher.knnMatch(des_a, des_b, k=2)
    all_matches = [m for pair in raw_pairs for m in pair[:1]]
    good = _ratio_test_matches(des_a, des_b, matcher, ratio=ratio)
    vis = _draw_matches(image_a, kp_a, image_b, kp_b, good)
    runtime_ms = (time.perf_counter() - start) * 1000
    return {
        "vis_image": vis,
        "metrics": _base_metrics(kp_a, kp_b, all_matches, good, 0, runtime_ms),
        "homography": [],
    }
