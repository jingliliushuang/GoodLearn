import cv2


def process(image, scale=2, **kwargs):
    scale = int(scale)
    scale = max(2, scale)
    h, w = image.shape[:2]
    small = cv2.resize(image, (w // scale, h // scale), interpolation=cv2.INTER_CUBIC)
    result = cv2.resize(small, (w, h), interpolation=cv2.INTER_CUBIC)
    return result
