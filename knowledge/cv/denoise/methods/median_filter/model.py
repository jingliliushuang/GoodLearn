import cv2


def process(image, ksize=5, **kwargs):
    ksize = int(ksize)
    if ksize % 2 == 0:
        ksize += 1
    ksize = max(3, ksize)
    return cv2.medianBlur(image, ksize)
