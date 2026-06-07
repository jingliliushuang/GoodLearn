# GoodLearnApp

本地运行的计算机知识树教学**桌面应用**（Electron + React + FastAPI）。

> **当前阶段：开发模式** — 仅 `start_dev.bat` 启动，**不要** `npm run build`、不要打包 exe/installer。

## 开发模式架构

```
Electron 桌面窗口 (desktop/)
    ↓ 加载 http://127.0.0.1:5173
React + Vite 前端 (frontend/web/)
    ↓ 调用 /api
FastAPI 后端 (backend/)
    ↓ 动态检测 + 加载
knowledge/ 知识树 + model.py
```

## 环境隔离

| 组件 | 位置 |
|------|------|
| Python 3.10 | `.conda/goodlearnapp-backend/` |
| 前端依赖 | `frontend/web/node_modules/` |
| Electron | `desktop/node_modules/` |

不使用系统 Python、base Conda、全局 pip、npm -g，不修改系统环境变量。

## 快速开始

### 第一次配置

```
E:\A_Exp_ML\GoodLearnApp\setup_env.bat
```

### 每次开发

```
E:\A_Exp_ML\GoodLearnApp\start_dev.bat
```

打开三个窗口：Backend → Frontend → Electron。

### 停止

```
E:\A_Exp_ML\GoodLearnApp\stop_dev.bat
```

## 当前可运行模型（OpenCV / NumPy，无需权重）

### 图像超分 (super_resolution)

| 方法 | 说明 |
|------|------|
| nearest | 最近邻插值 |
| bilinear | 双线性插值 |
| bicubic | 双三次插值 |
| lanczos | Lanczos 插值 |

### 图像去噪 (denoise)

| 方法 | 说明 |
|------|------|
| gaussian_blur | 高斯模糊 |
| median_filter | 中值滤波 |
| bilateral_filter | 双边滤波 |
| nlm_denoise | 非局部均值 |

## 深度学习模型为何显示「未启用」

节点页会自动检测每个方法的运行时状态，可能原因：

| 状态 | 含义 |
|------|------|
| 可运行 | 依赖齐全、权重就绪、推理已接入 |
| 缺少依赖 | 如 `onnxruntime`、`torch` 未安装在项目 Conda 环境 |
| 缺少权重 | 权重文件不在 `weights/` 或 `external_model_root` |
| 未启用 | 推理接口尚未接入（如 ESPCN、EDSR） |

当前 ESPCN / EDSR 已有外部权重引用，但缺少 `onnxruntime` 且推理代码未接入，因此显示不可用及具体原因。

## 如何放置模型权重

### 方式一：方法目录内

```
knowledge/cv/super_resolution/methods/espcn/weights/ESPCN_x2.pb
```

### 方式二：外部模型目录（推荐，不重复占用空间）

在 `config.yaml` 中配置：

```yaml
external_model_root: "E:/A_Exp_ML/other used"
```

注意路径含空格，代码中使用 `Path` 完整引用，bat 脚本中需加引号。

### 安装深度学习依赖（可选，仍在项目内环境）

```bat
E:\A_Exp_ML\GoodLearnApp\.conda\goodlearnapp-backend\python.exe -m pip install onnxruntime
```

## 论文库

- 超分：SRCNN、FSRCNN、ESPCN、VDSR、EDSR、MDSR、RCAN、ESRGAN、Real-ESRGAN、SwinIR
- 去噪：Gaussian、Median、Bilateral、NLM、BM3D、DnCNN、FFDNet、CBDNet、Restormer

前端支持按 traditional / cnn / gan / transformer 筛选。

## API

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /api/domains | 领域列表 |
| GET | /api/nodes/{domain}/{node} | 节点详情（含方法可用性检测） |
| POST | /api/run | 运行模型（仅 available=true） |

## 版本

- v0.1 — 开发模式桌面 App，扩充论文库 + 传统方法 + 可用性自动检测
