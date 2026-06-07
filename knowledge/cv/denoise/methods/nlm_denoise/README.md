# Non-Local Means 非局部均值

使用 OpenCV `cv2.fastNlMeansDenoisingColored` 进行彩色图像去噪。

## 参数

- `h`：滤波强度（越大去噪越强）
- `template_window_size`：块大小
- `search_window_size`：搜索窗口大小

## 注意

计算量比高斯/中值滤波大，大图可能较慢。
