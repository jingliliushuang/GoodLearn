# GoodLearnApp

本地运行的计算机知识树教学**桌面应用**（Electron + React + FastAPI）。

## 开发模式

当前阶段**仅开发运行**，不 build、不打包 exe。

```
Electron 桌面窗口
    ↓ 加载
Vite 前端 (127.0.0.1:5173)
    ↓ 调用
FastAPI 后端 (127.0.0.1:8000)
    ↓
knowledge/ + OpenCV 模型
```

## 环境隔离

| 组件 | 位置 |
|------|------|
| Python 3.10 | `.conda/goodlearnapp-backend/` |
| 前端依赖 | `frontend/web/node_modules/` |
| Electron 依赖 | `desktop/node_modules/` |

不使用系统 Python、全局 pip、npm -g。

## 快速开始

### 第一次配置

```
E:\A_Exp_ML\GoodLearnApp\setup_env.bat
```

### 每次开发运行

```
E:\A_Exp_ML\GoodLearnApp\start_dev.bat
```

会打开三个窗口：

1. **GoodLearnApp Backend** — FastAPI
2. **GoodLearnApp Frontend** — Vite dev server
3. **GoodLearnApp Desktop** — Electron 窗口

### 停止

```
E:\A_Exp_ML\GoodLearnApp\stop_dev.bat
```

## 第一版功能

- Electron 桌面窗口
- Computer Vision：图像去噪、图像超分
- Markdown 教学 + 论文链接
- OpenCV 模型测试：Bicubic / Gaussian Blur / Median Filter
- MSE / PSNR / Runtime + 对比图
- ESPCN / EDSR 教学展示（推理待接入）

## 手动启动（可选）

**后端：**
```
conda activate "E:\A_Exp_ML\GoodLearnApp\.conda\goodlearnapp-backend"
cd /d "E:\A_Exp_ML\GoodLearnApp\backend"
uvicorn main:app --host 127.0.0.1 --port 8000 --reload
```

**前端：**
```
cd /d "E:\A_Exp_ML\GoodLearnApp\frontend\web"
npm run dev
```

**桌面：**
```
cd /d "E:\A_Exp_ML\GoodLearnApp\desktop"
npm run dev
```

## 外部模型

引用目录：`E:/A_Exp_ML/other used`（见 `config.yaml`）

## 版本

- v0.1 — 开发模式桌面 App，CV 去噪 + 超分
