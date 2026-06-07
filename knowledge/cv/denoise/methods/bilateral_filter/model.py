import cv2


def process(image, d=9, sigma_color=75, sigma_space=75, **kwargs):
    d = int(d)
    if d % 2 == 0:
        d += 1
    d = max(3, d)
    return cv2.bilateralFilter(
        image,
        d,
        float(sigma_color),
        float(sigma_space),
    )
