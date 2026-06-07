import cv2


def process(image, h=10, template_window_size=7, search_window_size=21, **kwargs):
    return cv2.fastNlMeansDenoisingColored(
        image,
        None,
        float(h),
        float(h),
        int(template_window_size),
        int(search_window_size),
    )
