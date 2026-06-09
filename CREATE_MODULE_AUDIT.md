# Create 模块结构检查报告

> 检查日期：2026-06-09  
> 项目路径：`E:\A_Exp_ML\GoodLearnApp`  
> 阶段：开发模式（不 build / 不打包）

---

## 1. 当前节点结构

### 1.1 领域与节点概览

| 路径 | 类型 | metadata | content | papers | resources | experiment | dataset | metrics | methods | README |
|------|------|----------|---------|--------|-----------|------------|---------|---------|---------|--------|
| `knowledge/cv/denoise` | leaf / ready | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ (4) | — |
| `knowledge/cv/super_resolution` | leaf / ready | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ (6) | — |
| `knowledge/cv/feature_matching` | leaf / ready | ✅ | ✅ | ✅ | ✅ | — | ✅ | ✅ | ✅ (3) | ✅ |
| `knowledge/cv/image_classification` | leaf / theory | ✅ | ✅ | ✅ | ✅ | — | ✅ | ✅ | ✅ (6) | ✅ |
| `knowledge/cv/object_detection` | leaf / theory | ✅ | ✅ | ✅ | ✅ | — | ✅ | ✅ | ✅ (7) | ✅ |
| `knowledge/cv/combined/pipeline_builder` | combined | ✅ | — | — | — | — | — | — | — | ✅ |

其他领域（`machine_learning`、`embedded`、`operating_system`、`computer_graphics`）为教学型节点，通常仅含 `metadata.json`、`content.md`、`references.json`，不含 `methods/` 与实验接口。

### 1.2 层级现状

当前 CV 节点均为扁平结构：

```text
knowledge/cv/{node_id}/
```

尚未大规模迁移至：

```text
knowledge/cv/{parent_group}/{node_id}/
```

`metadata.json` 中暂无 `parent_path` / `node_path` 字段（升级后将支持）。

---

## 2. 当前方法结构

### 2.1 文件布局

| 节点 | 方法数 | metadata | detail | README | model.py | weights |
|------|--------|----------|--------|--------|----------|---------|
| denoise | 4 | ✅ | — | ✅ | ✅ | — |
| super_resolution | 6 | ✅ | ✅ (DNN) | ✅ | ✅ | 外部 / methods |
| feature_matching | 3 | ✅ | ✅ | ✅ | ✅ | — |
| image_classification | 6 | ✅ | ✅ | ✅ | ✅ (stub) | — |
| object_detection | 7 | ✅ | ✅ | ✅ | ✅ (stub) | — |

### 2.2 metadata 字段覆盖

| 字段 | denoise | super_resolution (DNN) | Node Manager 模板 |
|------|---------|------------------------|-------------------|
| id / title / category | ✅ | ✅ | ✅ |
| backend | — | ✅ | ✅ |
| available / reason | — | ✅ | ✅ |
| requirements / weights | 部分 | ✅ | ✅ |
| input_spec / output_spec | ✅ | ✅ | ✅ |
| params_schema | ✅ | ✅ | ✅ |

---

## 3. 当前导入导出结构

### 3.1 后端模块

| 文件 | 职责 |
|------|------|
| `backend/core/packer.py` | `validate_node`、`export_node`、`import_node_template` |
| `backend/core/node_generator.py` | `create_node_template`、`create_method_template` |
| `backend/core/method_packer.py` | `validate_method_template`、`import_method_template` |
| `backend/core/zip_import.py` | ZIP 安全解压、权重/脚本拦截 |
| `backend/core/delete_manager.py` | 软删除、保护列表、`list_domain_nodes_detail` |
| `backend/api/node_manager.py` | 节点管理 REST API |

### 3.2 已支持能力

| 能力 | 状态 |
|------|------|
| 节点模板创建 | ✅ `POST /api/node-manager/create-template` |
| 方法模板创建 | ✅ `POST /api/node-manager/create-method-template` |
| 节点 zip 导出 | ✅ 默认不含权重 |
| 节点 zip 导入 | ✅ 需用户指定 target_domain |
| 方法 zip 导入 | ✅ 需用户指定 target_node_id |
| 节点/方法删除 | ✅ 软删除到 trash |
| validate_node | ✅ |
| validate_method_template | ✅ |

### 3.3 升级前缺失

| 能力 | 升级前 | 本次升级 |
|------|--------|----------|
| 独立专业节点包 (`package_manifest.json`) | ❌ | ✅ |
| 导入位置由 zip 声明 | ❌ | ✅ |
| 创建时选择 parent_path | ❌ | ✅ |
| 界面上传论文 PDF | ❌ | ✅ |
| 界面上传 model.py / 权重 | ❌ | ✅ |
| Create 专用 API (`/api/create/*`) | ❌ | ✅ |

---

## 4. 当前模型文件存放规则

### 4.1 配置

`config.yaml`：

```yaml
external_model_root: "E:/A_Exp_ML/other used"
external_models:
  espcn_pb: "ESPCN_x2.pb"
  edsr_pb: "EDSR_x2.pb"
```

### 4.2 权重查找顺序（ESPCN / EDSR）

1. `methods/{method}/weights/{name}.pb`
2. `methods/{method}/{name}.pb`
3. `{external_model_root}/{name}.pb`
4. `external_model_root` 下递归搜索

由 `backend/core/model_checker.py` 与 `runner.py` 注入 `weight_path`、`method_dir`、`external_model_root` 到 `process()`。

### 4.3 各方法加载方式

| 方法 | backend | 权重 | 说明 |
|------|---------|------|------|
| ESPCN / EDSR | opencv_dnn_superres | `.pb` | OpenCV dnn_superres |
| SIFT | opencv_sift | 无 | opencv-contrib |
| ORB / RANSAC | opencv | 无 | 内置 OpenCV |
| 传统去噪 / 插值 SR | custom / opencv | 无 | 纯代码 |
| 分类 / 检测 | planned | 无 | teaching stub，`available: false` |

---

## 5. 输出结论

| # | 问题 | 升级前 | 升级后 |
|---|------|--------|--------|
| 1 | 是否支持独立专业节点包 | 部分（普通 zip，无 manifest） | ✅ `package_manifest.json` |
| 2 | zip 是否携带目标位置 | ❌ 需用户选 domain | ✅ `target_path` 自动导入 |
| 3 | 界面给节点添加方法（含上传） | 仅空模板 | ✅ PDF + model.py + 权重 |
| 4 | 上传论文 PDF | ❌ | ✅ → `papers/files/` + `papers.json` |
| 5 | 上传模型文件 | ❌（ZIP 拒绝） | ✅ 本地 Add Method 可上传 |
| 6 | 新增方法与 process 对齐 | 模板含占位 `process()` | ✅ 上传时校验 `def process` |
| 7 | 还缺哪些模块 | manifest、Create API、parent_path | 本次补齐第一版 |

---

## 6. 本次升级范围（第一版）

- 新增 `backend/core/create_manager.py`
- 新增 `backend/api/create_api.py`（`/api/create/*`）
- 扩展 `packer.py` 专业节点导出
- 扩展 `node_generator.py` 支持 `parent_path`
- 前端节点管理页新增：创建专业节点、导入专业节点包、添加方法（含上传）
- `.gitignore` 排除权重与用户上传 PDF

**不做：** 大规模迁移已有节点目录；ZIP 导入权重；build / 打包 exe。
