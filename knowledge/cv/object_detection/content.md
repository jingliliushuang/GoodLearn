# 目标检测

## 任务定义

在图像中同时定位（Bounding Box）并识别（Class）多个目标实例。

## 分类、定位、检测的区别

- **分类**：整图一个类别
- **定位**：一个目标的框 + 类别
- **检测**：多个目标的框 + 类别

## Bounding Box

通常用 (x, y, w, h) 或 (x1, y1, x2, y2) 表示。训练时需要匹配预测框与 GT。

## IoU

交并比衡量预测框与 GT 重叠程度，是 mAP 计算的基础。

## NMS

非极大值抑制去除 redundant 重叠框，保留得分最高的检测。

## Anchor

在特征图上预设多尺度先验框，回归偏移量。Faster R-CNN、SSD、YOLO 各代对 anchor 设计不同。

## Two-stage Detector

**R-CNN → Fast R-CNN → Faster R-CNN**：先生成候选区域，再分类与回归。精度高，速度相对慢。

## One-stage Detector

**SSD / YOLO / RetinaNet**：直接在特征图上密集预测。YOLO 强调实时性；RetinaNet 用 Focal Loss 解决类别不平衡。

## Transformer Detector

**DETR**：用 Transformer 编码器-解码器与匈牙利匹配，端到端集合预测，无需 NMS（原版）。

## mAP 指标

mean Average Precision，在多个 IoU 阈值下综合衡量检测性能。COCO 常用 AP@0.5:0.95。

## 后续模型接入说明

本节点第一版以理论为主。后续可接入 YOLOv8、Faster R-CNN 等预训练权重，实现单图检测可视化。

## 学习建议

先理解 IoU/NMS，再对比 two-stage 与 one-stage 流程，最后了解 DETR 的范式转变。
