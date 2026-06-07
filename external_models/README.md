# External Models

GoodLearnApp 第一版通过 `config.yaml` 引用已有模型目录，不复制模型文件。

## 配置路径

```yaml
external_model_root: "E:/A_Exp_ML/other used"
```

## 已知模型文件

| 文件 | 用途 |
|------|------|
| ESPCN_x2.pb | ESPCN 超分 (TensorFlow) |
| ESPCN_x2_DL.pb | ESPCN 深度学习版本 |
| EDSR_x2.pb | EDSR 超分 |
| FSRCNN_x2.pb | FSRCNN 超分 |
| LapSRN_x2.pb | LapSRN 超分 |

第一版仅使用 OpenCV 方法进行推理；上述模型在后续版本接入。

## 注意事项

路径 `other used` 含空格，代码中必须使用完整引号路径，不可在 shell 命令中裸拼路径。
