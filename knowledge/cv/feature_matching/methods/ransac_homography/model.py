import sys
import time
from pathlib import Path

import cv2
import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from _match_utils import _base_metrics, _draw_matches, _ratio_test_matches


def process(image_a: np.ndarray, image_b: np.ndarray, ratio: float = 0.75, ransac_threshold: float = 5.0, **kwargs) -> dict:
    start = time.perf_counter()
    use_sift = hasattr(cv2, "SIFT_create")
    if use_sift:
        detector = cv2.SIFT_create()
        norm = cv2.NORM_L2
    else:
        detector = cv2.ORB_create(nfeatures=1000)
        norm = cv2.NORM_HAMMING

    kp_a, des_a = detector.detectAndCompute(image_a, None)
    kp_b, des_b = detector.detectAndCompute(image_b, None)
    homography: list = []
    inliers = 0

    if des_a is None or des_b is None:
        runtime_ms = (time.perf_counter() - start) * 1000
        return {
            "vis_image": np.hstack([image_a, image_b]),
            "metrics": _base_metrics(kp_a or [], kp_b or [], [], [], 0, runtime_ms),
            "homography": [],
        }

    matcher = cv2.BFMatcher(norm)
    raw_pairs = matcher.knnMatch(des_a, des_b, k=2)
    all_matches = [m for pair in raw_pairs for m in pair[:1]]
    good = _ratio_test_matches(des_a, des_b, matcher, ratio=ratio)

    if len(good) >= 4:
        src_pts = np.float32([kp_a[m.queryIdx].pt for m in good]).reshape(-1, 1, 2)
        dst_pts = np.float32([kp_b[m.trainIdx].pt for m in good]).reshape(-1, 1, 2)
        H, mask = cv2.findHomography(src_pts, dst_pts, cv2.RANSAC, float(ransac_threshold))
        if H is not None:
            homography = H.tolist()
        if mask is not None:
            inliers = int(mask.ravel().sum())
            vis = _draw_matches(image_a, kp_a, image_b, kp_b, good, mask.ravel().tolist())
        else:
            vis = _draw_matches(image_a, kp_a, image_b, kp_b, good)
    else:
        vis = _draw_matches(image_a, kp_a, image_b, kp_b, good)

    runtime_ms = (time.perf_counter() - start) * 1000
    return {
        "vis_image": vis,
        "metrics": _base_metrics(kp_a, kp_b, all_matches, good, inliers, runtime_ms),
        "homography": homography,
    }
