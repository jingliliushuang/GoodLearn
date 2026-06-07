# GoodLearnApp 架构一致性检查报告

> 检查日期：2026-06-05  
> 项目路径：`E:\A_Exp_ML\GoodLearnApp`  
> 阶段：开发模式（Electron + React + FastAPI）

---

## 1. 总体结论

**当前项目基本符合原始架构的核心思想**，已在教学桌面 App 形态下落地知识树、叶子节点、方法动态加载与统一运行器。与最初设计的差异主要是命名约定、部分模块尚未实现，以及运行流程为「上传图像 + 节点内退化/评测」的实用化简化。

| 类别 | 结论 |
|------|------|
| **已实现** | 知识树（`knowledge/`）、叶子节点（denoise / super_resolution / feature_matching / image_classification / object_detection）、`methods/` 方法目录、`model.py` 统一 `process()`、动态加载（`loader.py`）、统一运行（`runner.py` + `POST /api/run`）、双图特征匹配（`POST /api/feature-matching/run`）、前端 React、Electron 壳、`config.yaml`、实验记录 |
| **部分符合** | `dataset.py` / 节点级 `metrics.py`（已补齐文件，denoise 已接入 runner；super_resolution 的 dataset 暂未接入 runner）、指标仍保留全局 `backend/core/metrics.py` 作为回退 |
| **偏离** | 原设计 `nodes/` → 现用 `knowledge/`；原设计 `history/` → 现用 `methods/`；超分评测未走完整「HR→LR→SR→HR」流水线（ESPCN/EDSR 在 `model.py` 内自行下采样）；无节点级 `tests/`、无 `report.json` |
| **未实现** | parallel/fusion 组合、CLI 层、分类/检测模型权重推理 |

### CV 模块节点状态（2026-06）

| 节点 | 状态 | 说明 |
|------|------|------|
| denoise | 可运行 | 单图输入，4 种传统去噪 |
| super_resolution | 可运行 | 6 个模型全部可运行 |
| feature_matching | 可运行 | 双图输入，SIFT / ORB / RANSAC |
| image_classification | 教学已补齐 | 理论 + 论文 + resources.json，模型推理待接入 |
| object_detection | 教学已补齐 | 理论 + 论文 + resources.json，模型推理待接入 |
| pipeline_builder | 可运行 | cascade 组合实验 |

**本次 CV 扩展**：新增 `feature_matching`、`image_classification`、`object_detection` 知识节点；`resources.json` 学习资料；`POST /api/feature-matching/run`；前端 `LearningResources`、`FeatureMatchingTester`、`TheoryNodePage`。

**学习资料与主题（2026-06）**：
- 全部 CV 节点已补齐 `resources.json`（denoise / super_resolution 新增；其余节点格式统一）
- `papers.json` 存论文；`resources.json` 存非论文资料（文档、教程、课程、代码、数据集等）
- 前端 `LearningResources` 支持类型筛选与展开/收起
- 全局主题：`ThemeContext` + `data-theme` CSS 变量，支持 dark/light 切换并持久化到 localStorage

**本次小范围补齐**：denoise / super_resolution 的 `dataset.py`、`metrics.py`；`knowledge/cv/combined/` 占位 README；`backend/core/combiner.py`、`packer.py` 占位；runner 优先调用节点 `dataset.degrade()`（denoise）与 `metrics.evaluate()`。

---

## 2. 对照表

| 原始设计项 | 当前实现位置 | 状态 | 说明 | 建议 |
|-----------|-------------|------|------|------|
| 知识树 | `knowledge/` + `knowledge/domains.json` | 符合 | 5 个领域，CV 含可运行节点 | 在 README 中说明 `knowledge/` ≡ 原 `nodes/` |
| 叶子节点 | `knowledge/cv/denoise/`, `super_resolution/`, `feature_matching/`, `image_classification/`, `object_detection/` | 部分符合 | 恢复类可运行；分类/检测为 theory_first | 后续接入 TorchVision 权重 |
| 组合节点 | `knowledge/cv/combined/` + Pipeline Builder | 部分实现 | 可视化 cascade 流水线已可用；parallel/fusion 与 packer 未实现 | 见 Pipeline Builder 页面 |
| 方法目录 | `methods/{method_name}/` | 符合 | 对应原 `history/` | README 说明映射，不强制改名 |
| dataset.py | `knowledge/cv/*/dataset.py` | 部分符合 | 已补齐；denoise runner 已调用；超分暂未接入 runner | P1 统一超分退化策略时需协调 ESPCN/EDSR |
| metrics.py | 节点 + `backend/core/metrics.py` | 部分符合 | 节点 evaluate 已接入 runner，全局为回退 | 保持双轨，节点可覆盖 |
| model.py | `methods/*/model.py` | 符合 | 10 个方法均有 `process()` | 保持 |
| 动态加载器 | `backend/core/loader.py` | 符合 | 动态 import model/dataset/metrics | 保持 |
| 统一运行器 | `backend/core/runner.py` | 部分符合 | 完整流程缺 report.json；超分未用 dataset | P2 补 report.json |
| 组合节点生成器 | `backend/core/combiner.py` | 部分实现 | `run_pipeline()` 支持 cascade；`create_combined_node()` 未实现 | P2 持久化组合节点 |
| 导入导出模块 | `backend/core/packer.py` + `node_generator.py` | 部分实现 | 模板生成、导出 zip、导入校验；权重导出暂不支持 | 见节点管理页 |
| 前端层 | `frontend/web/` | 符合 | React + Vite | 保持 |
| Electron 桌面壳 | `desktop/` | 符合 | 加载 Vite dev URL | 保持 |
| CLI 层 | — | 未实现 | 无 `frontend/cli/` | 非当前阶段必须项 |
| 输出目录 | `backend/runtime/outputs/` | 符合 | input/output/comparison PNG | gitignore 已排除 |
| 实验记录 | `backend/runtime/experiments/` | 符合 | 支持 single（默认）/ pipeline / comparison 三种 type | gitignore 已排除 |
| config.yaml | 项目根 | 符合 | project_root、external_model_root、端口、runtime | 保持 |

---

## 3. 当前目录树摘要

```
GoodLearnApp/
├── config.yaml
├── desktop/                    # Electron 桌面壳
├── frontend/web/               # React + Vite UI
├── backend/
│   ├── main.py
│   ├── api/                    # domains, nodes, methods, run, demos, experiments
│   └── core/
│       ├── tree.py             # 知识树遍历
│       ├── loader.py           # 动态加载 model/dataset/metrics
│       ├── runner.py           # 统一评测运行
│       ├── metrics.py          # 全局指标（回退）
│       ├── model_checker.py
│       ├── experiments.py
│       ├── combiner.py         # 占位
│       └── packer.py           # 占位
└── knowledge/
    ├── domains.json
    ├── cv/
    │   ├── denoise/
    │   │   ├── metadata.json, content.md, papers.json
    │   │   ├── dataset.py, metrics.py
    │   │   └── methods/        # 4 方法，各有 metadata/model/README
    │   ├── super_resolution/
    │   │   ├── metadata.json, content.md, papers.json, learning_path.json
    │   │   ├── dataset.py, metrics.py
    │   │   └── methods/        # 6 方法，各有 detail/metadata/model/README
    │   └── combined/
    │       └── README.md       # 架构预留占位
    ├── embedded/
    ├── machine_learning/
    ├── operating_system/
    └── computer_graphics/
```

（已省略 `.conda/`、`node_modules/`、`backend/runtime/uploads|outputs|experiments/`、模型权重）

---

## 4. 叶子节点逐项检查

### `knowledge/cv/denoise`

| 检查项 | 状态 |
|--------|------|
| metadata.json | ✅ |
| content.md（等同 README） | ✅ |
| dataset.py | ✅（本次补齐，runner 已调用） |
| metrics.py | ✅（本次补齐，runner 已调用） |
| methods/ | ✅ 4 个方法 |
| 每方法 metadata.json | ✅ |
| 每方法 README.md | ✅ |
| 每方法 model.py + process() | ✅ |
| tests/ | ❌ 缺失 |
| 后端动态加载 | ✅ 非硬编码 |

### `knowledge/cv/super_resolution`

| 检查项 | 状态 |
|--------|------|
| metadata.json | ✅ |
| content.md | ✅ |
| dataset.py | ✅（已补齐；runner 暂未调用，见 §4 说明） |
| metrics.py | ✅（已补齐，runner 已调用） |
| methods/ | ✅ 6 个可运行方法 |
| 每方法 metadata.json / README.md / model.py | ✅ |
| detail.json（教学扩展） | ✅ 6 个方法均有 |
| tests/ | ❌ 缺失 |
| 后端动态加载 | ✅ |

---

## 5. 组合节点检查

| 检查项 | 状态 |
|--------|------|
| `knowledge/cv/combined/` 目录 | ✅ 占位 README |
| 示例 `denoise_super_resolution` | ❌ 未实现 |
| metadata type=combined + parents | ❌ |
| strategy.json | ❌ |
| runtime/combiner.py | ❌ |
| backend/core/combiner.py | ⚠️ 占位，未接入 API |

**结论**：未实现完整组合节点目录生成，但 **已支持可视化 cascade Pipeline Builder**（`POST /api/run-pipeline` + `PipelinePage`）。parallel / fusion 与 packer / CLI 尚未实现。

---

## 6. 核心流程检查

### 流程 1：运行单个方法评测（`POST /api/run`）

| 步骤 | 状态 | 说明 |
|------|------|------|
| 接收 domain/node/method/image | ✅ | `backend/api/run.py` |
| 定位知识节点 | ✅ | `tree.get_method_dir()` |
| dataset.py 生成 degraded | 部分 | denoise ✅；super_resolution 文件存在但 runner 跳过（避免 ESPCN/EDSR 双重下采样） |
| metrics.py 评价 | ✅ | 优先节点 `evaluate()`，否则 `core/metrics.py` |
| 动态加载 model.py | ✅ | `loader.load_process_fn()` |
| 调用 process() | ✅ | 注入 method_dir、external_model_root、weight_path |
| 输出 input/output/comparison | ✅ | PNG + URL |
| MSE/PSNR/SSIM/runtime_ms | ✅ | |
| 实验记录 | ✅ | `runtime/experiments/*.json` |
| report.json / 日志 | ❌ | 未实现 |

### 流程 2：组合两个节点

全部未实现（combiner 占位）。**后续优先级 P2**。

### 流程 3：节点分享（packer）

**部分实现**：`POST /api/node-manager/export` 导出 zip；`POST /api/node-manager/import` 导入并校验；默认不含权重。

---

## 7. 关键接口扫描

| 接口 | 位置 | 状态 |
|------|------|------|
| `dataset.degrade(clean, **params)` | denoise/dataset.py, super_resolution/dataset.py | ✅ 已实现 |
| `model.process(degraded, **kwargs)` | 10 个 model.py | ✅ 已实现 | 支持用户参数（`params_schema` + `POST /api/run` 的 params） |
| `metadata.json` → `params_schema` | 去噪 4 法 + 超分 6 法 | ✅ 已实现 | 前端 `MethodParamsPanel` 动态表单 |
| `metrics.evaluate(clean, recovered)` | 两节点 metrics.py + core/metrics.py 函数级 | ✅ 已实现 |
| `combiner.combine(images, strategy)` | backend/core/combiner.py | ⚠️ 占位，NotImplementedError |

**参数不统一**：`process(image, ...)` vs 设计文档 `process(degraded_image, ...)` — 仅命名差异，不影响运行。

---

## 8. 主要偏离点

1. **`nodes/` vs `knowledge/`** — 现用 `knowledge/` 作为教学型节点根目录，语义更清晰；无需改名为 `nodes/`。
2. **`history/` vs `methods/`** — 现用 `methods/` 存放算法实现；与 `history/` 等价，文档说明即可。
3. **`dataset.py`** — 原先缺失，denoise 退化逻辑硬编码在 `runner.py`；现已补齐并接入 denoise。
4. **`metrics.py` 节点化** — 原先仅 `backend/core/metrics.py`；现已双轨，节点可覆盖。
5. **`combined`** — 已部分实现：Pipeline Builder + `run_pipeline()`；完整组合节点目录生成仍缺失。
6. **`packer`** — 已部分实现：节点模板生成、导出、导入与 `validate_node()`；权重导出暂不支持。
7. **`CLI`** — 缺失，开发阶段用 `start_dev.bat` 替代，非必须项。

---

## 9. 最小整改方案

### P0：必须立即修复

无。当前 6 个超分模型、论文链接、实验记录在补齐后应保持可运行。

### P1：建议近期补齐

1. 在 README 中固化架构映射（已完成）。
2. 为 denoise / super_resolution 增加节点级 `README.md`（可选）。
3. 规划超分统一退化：重构 ESPCN/EDSR 去掉内部下采样，再启用 `dataset.degrade()`。
4. 运行结束后写入 `report.json`（metrics + 路径 + 时间戳）。

### P2：后续扩展

1. 实现 `combiner.create_combined_node()` 与 cascade 示例。
2. 实现 `packer.export_node()` / `import_node()`。
3. 增加 `frontend/cli/` 或独立 CLI 脚本。
4. 叶子节点 `tests/` 与 CI 冒烟测试。

---

## 10. 建议后的目标结构

```
GoodLearnApp/
├── desktop/                    # Electron 桌面壳（含原 frontend 体验）
├── frontend/web/               # React UI（原 frontend/web）
├── backend/
│   ├── api/
│   └── core/
│       ├── tree.py
│       ├── loader.py
│       ├── runner.py
│       ├── combiner.py         # 组合节点（待实现）
│       └── packer.py           # 导入导出（待实现）
├── knowledge/                  # 教学版 nodes/
│   └── cv/
│       ├── denoise/
│       ├── super_resolution/
│       └── combined/           # 组合节点预留
├── outputs/                    # 导出 zip 等（待 packer 使用）
├── config.yaml
└── README.md
```

**命名映射**：

- `knowledge/` = 原 `nodes/`（按学科组织的节点文件系统树）
- `methods/` = 原 `history/`（节点下的具体算法方法层）
- `desktop/` + `frontend/web/` = 原 `frontend/` 桌面/Web 体验
- `CLI` = 暂未实现，非当前开发阶段 blocker

---

## 11. 本次补齐清单

| 文件 | 动作 |
|------|------|
| `knowledge/cv/denoise/dataset.py` | 新增 |
| `knowledge/cv/denoise/metrics.py` | 新增 |
| `knowledge/cv/super_resolution/dataset.py` | 新增 |
| `knowledge/cv/super_resolution/metrics.py` | 新增 |
| `knowledge/cv/combined/README.md` | 新增占位 |
| `backend/core/combiner.py` | 新增占位 |
| `backend/core/packer.py` | 新增占位 |
| `backend/core/loader.py` | 扩展 load_degrade_fn / load_evaluate_fn |
| `backend/core/runner.py` | 优先调用节点 dataset/metrics |
| `README.md` | 架构映射说明 |
| `ARCHITECTURE_AUDIT.md` | 本报告 |

---

## 实验记录类型

| type | 说明 | API |
|------|------|-----|
| `single`（默认） | 单模型运行 | `POST /api/run`（支持 params） |
| `pipeline` | 组合流水线 | `POST /api/run-pipeline` |
| `comparison` | 多模型同图对比 | `POST /api/compare-methods` |

---

*本报告由架构一致性检查任务生成，不触发 build / 打包 / 目录大规模迁移。*
