# CV 实验工作台

组合多个专业节点的 **preprocess / process / judge** 模块，构建串行实验流水线。

实验结果保存到 `test/{run_id}/`，包含 `result.json` 与 `report.txt`。

## 示例流水线

1. cv/denoise / preprocess / gaussian_noise
2. cv/denoise / process / nlm_denoise
3. cv/super_resolution / process / edsr
4. cv/super_resolution / judge / psnr
