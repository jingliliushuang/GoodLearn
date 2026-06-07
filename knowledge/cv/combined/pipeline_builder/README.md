# 自由组合实验流水线（Pipeline Builder）

本配置描述 CV 领域下的 **可视化 cascade 组合实验** 能力，由前端 Pipeline Builder 页面与 `POST /api/run-pipeline` 提供。

## 使用方式

1. 进入 **Computer Vision → 组合实验流水线**
2. 从左侧拖拽「图像去噪」或「图像超分」到 Step 框
3. 为每个 Step 选择可运行方法
4. 上传图片并点击「运行流水线」

## 当前支持

- **strategy**: `cascade`（顺序执行）
- **parents**: `cv/denoise`、`cv/super_resolution`

## 尚未实现

- `parallel` / `fusion` 策略
- 将用户自定义 pipeline 保存为永久组合节点目录
- 组合节点自动代码生成（`runtime/combiner.py`）

详见项目根目录 `ARCHITECTURE_AUDIT.md`。
