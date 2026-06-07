import cv2


def process(image, d=9, sigmaColor=75, sigmaSpace=75, sigma_color=None, sigma_space=None, **kwargs):
    d = int(d)
    if d % 2 == 0:
        d += 1
    d = max(3, d)

    sc = float(sigmaColor if sigma_color is None else sigma_color)
    ss = float(sigmaSpace if sigma_space is None else sigma_space)

    return cv2.bilateralFilter(image, d, sc, ss)
