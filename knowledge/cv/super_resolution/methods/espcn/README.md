# ESPCN

**Efficient Sub-Pixel Convolutional Neural Network for Real-Time Super-Resolution**

## 核心思想

ESPCN 在卷积层提取特征后，使用 **Sub-Pixel Convolution（亚像素卷积）** 直接在低分辨率特征图上完成放大，避免在高分辨率空间做卷积，大幅提高效率。

## 网络结构

1. 若干卷积层提取 LR 特征
2. 最后一层输出 `r² × C` 通道（r 为放大倍数）
3. Pixel Shuffle 重排为 HR 图像

## 外部模型

项目已配置引用：

```
E:/A_Exp_ML/other used/ESPCN_x2.pb
```

第二版将接入 TensorFlow/ONNX 推理。

## 参考

- [论文](https://arxiv.org/abs/1609.05158)
- Shi et al., CVPR 2016
