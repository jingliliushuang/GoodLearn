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

## 架构与原始设计映射

GoodLearnApp 在原始「知识树 + 叶子节点 + 方法 + 统一运行器」设计上，采用 Electron 桌面开发形态。目录命名对照：

| 原始设计 | 当前 GoodLearnApp | 说明 |
|----------|-------------------|------|
| `nodes/` | `knowledge/` | 教学型节点根目录，按领域组织叶子节点 |
| `history/{method}/` | `methods/{method}/` | 节点下的具体算法（metadata、model.py、README） |
| `frontend/web/` | `frontend/web/` | React UI |
| `frontend/cli/` | — | **暂未实现**，开发阶段用 `start_dev.bat` |
| `core/` | `backend/core/` | tree、loader、runner、metrics 等 |
| `main.py` | `backend/main.py` | FastAPI 入口 |
| `desktop/` | `desktop/` | Electron 壳，承载 Web 前端 |

叶子节点标准接口（CV denoise / super_resolution 已部分落地）：

- `dataset.py` → `degrade(clean_image, **params)` 生成退化输入
- `methods/*/model.py` → `process(image, **kwargs)` 执行算法
- `metrics.py` → `evaluate(clean, recovered)` 返回 MSE/PSNR/SSIM

组合节点（`knowledge/cv/combined/`）与导入导出（`backend/core/packer.py`）为**架构预留**，详见 [ARCHITECTURE_AUDIT.md](./ARCHITECTURE_AUDIT.md)。

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

## 支持的领域

| 领域 | 说明 |
|------|------|
| Computer Vision | 图像去噪、超分、特征匹配、分类/检测教学、模型测试 |
| Embedded System | GPIO、UART、Timer、中断 |
| Machine Learning | 线性/逻辑回归、决策树、K-Means |
| Operating System | 进程调度、内存分页、死锁、文件系统 |
| Computer Graphics | 渲染管线、变换矩阵、光栅化、光照 |

## 图像超分课程页（CV → 图像超分）

该节点已升级为完整教学课程页，包含：

| 功能 | 说明 |
|------|------|
| 课程导航 | 紧凑 pill 路线图（基础插值 → CNN → 生成式/Transformer） |
| 方法详情 | 当前选中方法的 problem / pipeline / 优缺点 |
| 方法对比表 | 6 个可运行方法的速度、效果、特点一览 |
| 模型对比实验 | 多方法同图推理，对比网格 + 指标表 + 教学结论 |
| 模型测试 | Nearest / Bilinear / Bicubic / Lanczos / ESPCN / EDSR |
| 论文资料 | 默认精选 3 篇，可展开全部 10 篇 |
| 实验记录 | 每次运行自动保存，展示最近 20 条 |

## 可交互 Demo

| Demo | 位置 | 接口 |
|------|------|------|
| CV 图像模型测试 | CV 节点 | `POST /api/run` |
| **组合实验流水线** | CV → 组合实验流水线 | `POST /api/run-pipeline` |
| **模型对比实验** | CV → 图像超分 | `POST /api/compare-methods` |
| Timer 周期计算器 | Embedded → Timer | `POST /api/demos/embedded/timer` |
| Round Robin 调度模拟 | OS → Process Scheduling | `POST /api/demos/os/round_robin` |

## 组合实验流水线（Pipeline Builder）

支持**类型安全的 cascade 顺序组合**。每个方法在 `metadata.json` 中声明 `input_spec` / `output_spec`，Pipeline Builder 根据输入输出类型判断方法是否能串联。

1. 进入 **Computer Vision → 组合实验流水线**
2. 从左侧拖入任务节点（去噪、超分、特征匹配、分类、检测）到 Step 1–4
3. 为每个 Step 选择具体方法；下拉显示 `输入类型 → 输出类型` 与可运行状态
4. 上传单张图片（默认 Pipeline 输入为 `single_image`），点击「运行流水线」

系统按 Step 顺序依次调用各方法的 `model.process()`，展示每一步中间结果与最终输出。前后步骤必须满足 `上一阶段 output_spec.kind == 下一阶段 input_spec.kind` 且 media_type 兼容。

| 能力 | 状态 |
|------|------|
| cascade 顺序组合 | ✅ 已实现 |
| 类型安全校验（前端 + 后端） | ✅ 已实现 |
| single_image → single_image 串联 | ✅ 去噪 ↔ 超分可自由组合 |
| image_pair → match_visualization | ⚠️ 特征匹配不参与默认单图 Pipeline |
| parallel / fusion | ❌ 尚未实现 |
| 保存为永久组合节点 | ❌ 第一版不支持 |

新建方法模板时需在节点管理中选择输入/输出类型，写入 `input_spec` / `output_spec`。

> 当前仍为**开发阶段**，使用 `start_dev.bat` 启动，**不要** build / 打包 exe。

## 模型对比实验（Model Comparison Lab）

图像超分节点支持**多方法同图对比**：

1. 进入 **CV → 图像超分**，在「模型对比实验」区域勾选多个方法（默认 Bicubic / Lanczos / ESPCN / EDSR）
2. 上传图片，点击「运行对比实验」
3. 查看对比网格图、各方法 runtime / PSNR / MSE、教学结论

| 能力 | 说明 |
|------|------|
| 同时运行 | 对同一张上传图依次调用各 `model.process()`，不调用 `dataset.degrade()` |
| 输出 | `backend/runtime/comparisons/{id}/` 含各方法 PNG 与 `comparison_grid.png` |
| 实验记录 | `type: "comparison"` 写入 `runtime/experiments/` |

## 方法参数可调

单模型测试支持**方法参数可调**（`metadata.json` → `params_schema`）：

- **图像去噪**：ksize、h、sigmaColor / sigmaSpace 等
- **图像超分（传统）**：scale（2/3/4）
- **ESPCN / EDSR**：scale=2（只读）

`POST /api/run` 通过 `params` 字段传递 JSON；实验记录保存本次参数。

Pipeline Builder 与模型对比实验暂使用**默认参数**。

## 节点管理

支持扩展知识树（开发阶段功能），包含**两类模板**：

| 类型 | 用途 | API |
|------|------|-----|
| **节点模板** | 创建新任务节点（如 `knowledge/cv/deblur/`） | `POST /api/node-manager/create-template` |
| **方法模板** | 在已有 leaf 节点下创建算法（如 `methods/srcnn/`） | `POST /api/node-manager/create-method-template` |
| 导出 zip | 打包整个节点 | `POST /api/node-manager/export` |
| **ZIP 导入节点模板** | 上传节点 zip，校验后导入 `knowledge/{domain}/{node_id}/` | `POST /api/node-manager/import-node-template` |
| **ZIP 导入方法模板** | 上传方法 zip，导入到已有 leaf 节点的 `methods/{method_id}/` | `POST /api/node-manager/import-method-template` |
| 导入 zip（兼容） | 同节点模板导入 | `POST /api/node-manager/import` |

导出前会校验 `metadata.json`、`dataset.py`、`metrics.py`、`methods/` 结构。若老节点 `metadata.json` 缺少 `domain`，系统会从路径推断并**自动写回**后再导出。

方法模板默认 `available=false`，显示「方法模板已创建，模型实现或权重暂未接入」，不影响其他可运行方法。

创建方法模板时需选择 **input_spec / output_spec**（kind、count、media_type），供 Pipeline Builder 类型校验使用。

**ZIP 手动导入：**
- **节点模板 ZIP**：根目录含完整节点（`metadata.json`、`methods/`、`dataset.py` 等），导入到 `knowledge/{domain}/{node_id}/`
- **方法模板 ZIP**：根目录含单个方法（`metadata.json`、`model.py`、`README.md` 等），导入到 `knowledge/{domain}/{node_id}/methods/{method_id}/`
- 导入前进行结构校验与安全检查（zip slip 防护、拒绝可执行脚本与模型权重）
- 当前版本**不支持**通过 ZIP 导入模型权重（`.pth` / `.onnx` / `.pb` 等）；权重需手动放入 `external_model_root` 或 `methods/{method}/weights/`，且不要提交到 Git
- ZIP 大小上限 50MB；不执行 zip 内任何 Python 代码

**删除（软删除）：**
- `DELETE /api/node-manager/node` — 将节点移动到 `backend/runtime/trash/`
- `DELETE /api/node-manager/method` — 将方法移动到回收站
- 系统核心节点（denoise、super_resolution 等）与核心方法（espcn、edsr 等）受保护，不可删除
- draft / 模板方法可删除；第一版无 UI 恢复，可手动从 trash 复制回 `knowledge/`

前端入口：首页或顶栏 **节点管理**。

## CV 模块扩展（特征匹配 / 分类 / 检测）

CV 模块已从图像恢复扩展到特征匹配、图像分类与目标检测：

| 节点 | 类型 | 说明 |
|------|------|------|
| 图像去噪 | 可运行 | 单图输入，4 种传统去噪 |
| 图像超分 | 可运行 | 6 个模型（含 ESPCN / EDSR） |
| **特征匹配** | 可运行 | 双图上传，SIFT / ORB / RANSAC Homography |
| **图像分类** | 理论学习 | CNN 发展史 + 迁移学习，模型推理待接入 |
| **目标检测** | 理论学习 | 两阶段 / 一阶段 / DETR，模型推理待接入 |
| 组合实验流水线 | 进阶实验 | Pipeline Builder |

### 特征匹配实验

1. 进入 **CV → 特征匹配**
2. 上传 Image A 与 Image B
3. 选择 SIFT、ORB 或 RANSAC Homography，点击运行
4. 查看匹配可视化、keypoints / matches / inliers 等指标

> SIFT 需要 `opencv-contrib-python`（与 ESPCN/EDSR 相同依赖）。若不可用，页面会显示明确原因；ORB 与 RANSAC 使用标准 OpenCV。

API：`POST /api/feature-matching/run`（multipart：`image_a`、`image_b`、`method`、`params`）

### 学习资料 resources.json

除 `papers.json` 外，每个 CV 节点均包含 `resources.json`，用于教程、课程、文档、代码仓库、数据集等非论文资源：

| 节点 | 资料数（约） | 说明 |
|------|-------------|------|
| denoise | 8 | OpenCV 滤波、NLM、BM3D、DnCNN、指标与数据集 |
| super_resolution | 10 | dnn_superres、BasicSR、DIV2K、benchmark、PixelShuffle |
| feature_matching | 6 | OpenCV 匹配、Homography、多视图几何 |
| image_classification | 6 | PyTorch 迁移学习、CS231n、ImageNet |
| object_detection | 7 | COCO、YOLO、MMDetection、Detectron2 |

前端「学习资料」区域支持按类型筛选、展开全部/收起；无 URL 的资料显示「暂无链接」。

### 深色 / 浅色主题

- 顶部导航可切换 **深色 / 浅色** 模式（默认深色）
- 主题选择保存在 `localStorage`（`goodlearn-theme`），下次打开 App 自动恢复
- 主要页面使用 CSS 变量，两种主题下文字与卡片均清晰可读

> 当前仍为**开发阶段**，使用 `start_dev.bat` 启动，**不要** build / 打包 exe。

## 当前可运行模型

### 图像超分 (super_resolution)

| 方法 | 说明 | 依赖 |
|------|------|------|
| nearest | 最近邻插值 | OpenCV |
| bilinear | 双线性插值 | OpenCV |
| bicubic | 双三次插值 | OpenCV |
| lanczos | Lanczos 插值 | OpenCV |
| ESPCN | 亚像素卷积超分 | opencv-contrib-python + ESPCN_x2.pb |
| EDSR | 增强深度残差超分 | opencv-contrib-python + EDSR_x2.pb |

`.pb` 权重通过 OpenCV `dnn_superres` 加载，**不需要** onnxruntime。

### 图像去噪 (denoise)

| 方法 | 说明 |
|------|------|
| gaussian_blur | 高斯模糊 |
| median_filter | 中值滤波 |
| bilateral_filter | 双边滤波 |
| nlm_denoise | 非局部均值 |

### 特征匹配 (feature_matching)

| 方法 | 说明 | 依赖 |
|------|------|------|
| sift | SIFT + BFMatcher + ratio test | opencv-contrib-python |
| orb | ORB + Hamming 匹配 | OpenCV |
| ransac_homography | 特征匹配 + RANSAC 单应矩阵 | OpenCV（SIFT 可用时优先 SIFT） |

## 深度学习模型依赖说明

节点页会自动检测每个方法的运行时状态：

| 权重后缀 | 所需依赖 |
|----------|----------|
| `.pb` | `opencv-contrib-python`（`cv2.dnn_superres`） |
| `.onnx` | `onnxruntime` |
| `.pth` / `.pt` | `torch` |

ESPCN / EDSR 使用 `.pb` 格式，通过 OpenCV DNN Super Resolution 推理，**不会**要求 onnxruntime。

### OpenCV contrib 安装（仅项目内环境）

若页面显示「缺少 opencv-contrib-python」：

```bat
E:\A_Exp_ML\GoodLearnApp\.conda\goodlearnapp-backend\python.exe -m pip uninstall -y opencv-python opencv-contrib-python
E:\A_Exp_ML\GoodLearnApp\.conda\goodlearnapp-backend\python.exe -m pip install opencv-contrib-python==4.10.0.84
```

或重新运行 `setup_env.bat`（已包含卸载/切换逻辑）。

验证：

```bat
E:\A_Exp_ML\GoodLearnApp\.conda\goodlearnapp-backend\python.exe -c "import cv2; print(cv2.__version__); print(hasattr(cv2, 'dnn_superres'))"
```

应输出 `True`。

## 模型状态含义

| 状态 | 含义 |
|------|------|
| 可运行 | 依赖齐全、权重就绪 |
| 缺少依赖 | 如 `opencv-contrib-python`、`torch` 未安装 |
| 缺少权重 | 权重不在 `weights/` 或 `external_model_root` |
| 未启用 | 推理接口尚未接入 |

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
REM .pb 超分模型（ESPCN/EDSR）— 安装 opencv-contrib-python 即可
E:\A_Exp_ML\GoodLearnApp\.conda\goodlearnapp-backend\python.exe -m pip install opencv-contrib-python==4.10.0.84

REM .onnx 模型
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
| POST | /api/run | 运行单方法（支持 params JSON 参数） |
| POST | /api/feature-matching/run | 双图特征匹配实验 |
| POST | /api/run-pipeline | 运行 cascade 组合流水线 |
| POST | /api/compare-methods | 多方法同图对比实验 |
| POST | /api/node-manager/create-template | 生成节点模板 |
| POST | /api/node-manager/export | 导出节点 zip |
| POST | /api/node-manager/import | 导入节点 zip |

## 版本

- v0.1 — 开发模式桌面 App，扩充论文库 + 传统方法 + 可用性自动检测
