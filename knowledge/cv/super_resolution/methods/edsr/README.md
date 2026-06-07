# EDSR

**Enhanced Deep Residual Networks for Single Image Super-Resolution**

## 核心思想

EDSR 在 SRResNet 基础上做了两项关键改进：

1. **移除 Batch Normalization**：减少内存占用，提升 PSNR
2. **加深加宽网络**：更多残差块和通道数

## 网络结构

- 输入 LR 图像
- 初始卷积 + 多个 ResBlock
- 全局残差连接
- 上采样模块（Sub-Pixel 或 Transposed Conv）
- 输出 HR 图像

## 外部模型

项目已配置引用：

```
E:/A_Exp_ML/other used/EDSR_x2.pb
```

第二版将接入推理接口。

## 参考

- [论文](https://arxiv.org/abs/1707.02921)
- Lim et al., CVPR 2017 Workshop
