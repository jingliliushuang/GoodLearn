import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  addMethodToNode,
  createMethodTemplate,
  createNodeTemplate,
  createProfessionalNode,
  deleteMethod,
  deleteNode,
  exportNode,
  exportProfessionalNode,
  fetchDomains,
  fetchManagerNodes,
  fetchParentPathPresets,
  fetchProfessionalNodes,
  importMethodTemplate,
  importNodeTemplate,
  importProfessionalNode,
} from '../api/client';
import {
  INPUT_KIND_OPTIONS,
  MEDIA_TYPE_OPTIONS,
  OUTPUT_KIND_OPTIONS,
  formatIoArrow,
} from '../utils/ioSpec';

function ValidationBox({ validation }) {
  if (!validation) return null;
  return (
    <div className={`validation-box ${validation.valid ? 'valid' : 'invalid'}`}>
      <p><strong>校验：</strong>{validation.valid ? '通过' : '失败'}</p>
      {validation.errors?.length > 0 && (
        <ul>{validation.errors.map((e) => <li key={e}>{e}</li>)}</ul>
      )}
      {validation.warnings?.length > 0 && (
        <ul className="validation-warn">{validation.warnings.map((w) => <li key={w}>{w}</li>)}</ul>
      )}
    </div>
  );
}

const METHOD_CATEGORIES = [
  'traditional', 'cnn', 'gan', 'transformer', 'optimization',
  'detector', 'classifier', 'feature', 'other',
];

const METHOD_BACKENDS = [
  'custom', 'opencv', 'opencv_dnn_superres', 'opencv_sift', 'torch', 'onnxruntime', 'planned',
];

export default function NodeManagerPage() {
  const [domains, setDomains] = useState([]);
  const [domain, setDomain] = useState('cv');
  const [nodes, setNodes] = useState([]);

  const [nodeId, setNodeId] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [nodeType, setNodeType] = useState('leaf');

  const [methodNodeId, setMethodNodeId] = useState('');
  const [methodId, setMethodId] = useState('');
  const [methodTitle, setMethodTitle] = useState('');
  const [methodDescription, setMethodDescription] = useState('');
  const [methodCategory, setMethodCategory] = useState('traditional');
  const [methodBackend, setMethodBackend] = useState('planned');
  const [methodAvailable, setMethodAvailable] = useState(false);
  const [inputKind, setInputKind] = useState('single_image');
  const [inputCount, setInputCount] = useState(1);
  const [inputMediaType, setInputMediaType] = useState('image');
  const [outputKind, setOutputKind] = useState('single_image');
  const [outputCount, setOutputCount] = useState(1);
  const [outputMediaType, setOutputMediaType] = useState('image');

  const [exportNodeId, setExportNodeId] = useState('');
  const [importFile, setImportFile] = useState(null);
  const [importDomain, setImportDomain] = useState('cv');
  const [overwrite, setOverwrite] = useState(false);

  const [zipNodeFile, setZipNodeFile] = useState(null);
  const [zipNodeDomain, setZipNodeDomain] = useState('cv');
  const [zipNodeOverwrite, setZipNodeOverwrite] = useState(false);
  const [zipNodeResult, setZipNodeResult] = useState(null);

  const [zipMethodFile, setZipMethodFile] = useState(null);
  const [zipMethodDomain, setZipMethodDomain] = useState('cv');
  const [zipMethodNodeId, setZipMethodNodeId] = useState('');
  const [zipMethodOverwrite, setZipMethodOverwrite] = useState(false);
  const [zipMethodResult, setZipMethodResult] = useState(null);

  const [loading, setLoading] = useState('');
  const [error, setError] = useState(null);
  const [createResult, setCreateResult] = useState(null);
  const [methodResult, setMethodResult] = useState(null);
  const [exportResult, setExportResult] = useState(null);
  const [importResult, setImportResult] = useState(null);

  const [deleteNodeId, setDeleteNodeId] = useState('');
  const [deleteNodeReason, setDeleteNodeReason] = useState('');
  const [deleteNodeConfirmText, setDeleteNodeConfirmText] = useState('');
  const [deleteNodeResult, setDeleteNodeResult] = useState(null);

  const [deleteMethodNodeId, setDeleteMethodNodeId] = useState('');
  const [deleteMethodId, setDeleteMethodId] = useState('');
  const [deleteMethodReason, setDeleteMethodReason] = useState('');
  const [deleteMethodConfirmText, setDeleteMethodConfirmText] = useState('');
  const [deleteMethodResult, setDeleteMethodResult] = useState(null);

  const [parentPathPresets, setParentPathPresets] = useState(['cv']);
  const [parentPath, setParentPath] = useState('cv');
  const [customParentPath, setCustomParentPath] = useState('');
  const [proNodeInputType, setProNodeInputType] = useState('single_image');
  const [proCreateResult, setProCreateResult] = useState(null);

  const [professionalNodes, setProfessionalNodes] = useState([]);
  const [addMethodNodePath, setAddMethodNodePath] = useState('');
  const [addMethodId, setAddMethodId] = useState('');
  const [addMethodTitle, setAddMethodTitle] = useState('');
  const [addMethodDescription, setAddMethodDescription] = useState('');
  const [addMethodCategory, setAddMethodCategory] = useState('other');
  const [addMethodBackend, setAddMethodBackend] = useState('planned');
  const [addMethodAvailable, setAddMethodAvailable] = useState(false);
  const [addInputKind, setAddInputKind] = useState('single_image');
  const [addOutputKind, setAddOutputKind] = useState('single_image');
  const [paperTitle, setPaperTitle] = useState('');
  const [paperAuthors, setPaperAuthors] = useState('');
  const [paperYear, setPaperYear] = useState('');
  const [paperVenue, setPaperVenue] = useState('');
  const [paperUrl, setPaperUrl] = useState('');
  const [paperSummary, setPaperSummary] = useState('');
  const [paperPdfFile, setPaperPdfFile] = useState(null);
  const [modelPyFile, setModelPyFile] = useState(null);
  const [modelWeightFile, setModelWeightFile] = useState(null);
  const [addMethodResult, setAddMethodResult] = useState(null);

  const [exportProNodePath, setExportProNodePath] = useState('');
  const [exportProResult, setExportProResult] = useState(null);

  const [proImportFile, setProImportFile] = useState(null);
  const [proImportOverwrite, setProImportOverwrite] = useState(false);
  const [proImportResult, setProImportResult] = useState(null);

  const leafNodes = useMemo(
    () => nodes.filter((n) => n.type === 'leaf'),
    [nodes],
  );

  const deleteTargetNode = useMemo(
    () => nodes.find((n) => n.id === deleteNodeId),
    [nodes, deleteNodeId],
  );

  const deleteMethodTargetNode = useMemo(
    () => nodes.find((n) => n.id === deleteMethodNodeId),
    [nodes, deleteMethodNodeId],
  );

  const deletableMethods = useMemo(
    () => deleteMethodTargetNode?.methods || [],
    [deleteMethodTargetNode],
  );

  const selectedDeleteMethod = useMemo(
    () => deletableMethods.find((m) => m.id === deleteMethodId),
    [deletableMethods, deleteMethodId],
  );

  const loadNodes = useCallback(() => {
    fetchManagerNodes(domain)
      .then((data) => {
        const list = data.nodes || [];
        setNodes(list);
        const leaves = list.filter((n) => n.type === 'leaf');
        if (leaves.length) {
          setExportNodeId((prev) => (prev && leaves.some((n) => n.id === prev) ? prev : leaves[0].id));
          setMethodNodeId((prev) => (prev && leaves.some((n) => n.id === prev) ? prev : leaves[0].id));
          setDeleteNodeId((prev) => (prev && list.some((n) => n.id === prev) ? prev : leaves[0].id));
          setDeleteMethodNodeId((prev) => (prev && leaves.some((n) => n.id === prev) ? prev : leaves[0].id));
          setZipMethodNodeId((prev) => (prev && leaves.some((n) => n.id === prev) ? prev : leaves[0].id));
        }
        const methodNode = list.find((n) => n.id === deleteMethodNodeId) || leaves[0];
        const methods = methodNode?.methods || [];
        if (methods.length) {
          setDeleteMethodId((prev) => (prev && methods.some((m) => m.id === prev) ? prev : methods[0].id));
        } else {
          setDeleteMethodId('');
        }
      })
      .catch(() => setNodes([]));
  }, [domain, deleteMethodNodeId]);

  useEffect(() => {
    fetchDomains().then(setDomains).catch(() => setDomains([]));
    fetchParentPathPresets()
      .then((data) => setParentPathPresets(data.presets || ['cv']))
      .catch(() => setParentPathPresets(['cv']));
  }, []);

  const loadProfessionalNodes = useCallback(() => {
    fetchProfessionalNodes(domain)
      .then((data) => {
        const list = data.nodes || [];
        setProfessionalNodes(list);
        const leafList = list.filter((n) => n.type === 'leaf');
        if (leafList.length) {
          setAddMethodNodePath((prev) => (
            prev && leafList.some((n) => n.node_path === prev) ? prev : leafList[0].node_path
          ));
          setExportProNodePath((prev) => (
            prev && leafList.some((n) => n.node_path === prev) ? prev : leafList[0].node_path
          ));
        }
      })
      .catch(() => setProfessionalNodes([]));
  }, [domain]);

  useEffect(() => {
    loadNodes();
    loadProfessionalNodes();
  }, [loadNodes, loadProfessionalNodes]);

  const handleCreate = async () => {
    setLoading('create');
    setError(null);
    setCreateResult(null);
    try {
      const result = await createNodeTemplate({
        domain,
        node_id: nodeId.trim(),
        title: title.trim(),
        description: description.trim(),
        node_type: nodeType,
      });
      setCreateResult(result);
      loadNodes();
      loadProfessionalNodes();
    } catch (err) {
      setError(err.response?.data?.detail || err.message);
    } finally {
      setLoading('');
    }
  };

  const effectiveParentPath = customParentPath.trim() || parentPath;

  const handleCreateProfessionalNode = async () => {
    setLoading('pro-create');
    setError(null);
    setProCreateResult(null);
    try {
      const result = await createProfessionalNode({
        domain,
        parent_path: effectiveParentPath,
        node_id: nodeId.trim(),
        title: title.trim(),
        description: description.trim(),
        node_type: nodeType,
        input_type: proNodeInputType,
      });
      setProCreateResult(result);
      loadNodes();
      loadProfessionalNodes();
    } catch (err) {
      setError(err.response?.data?.detail || err.message);
    } finally {
      setLoading('');
    }
  };

  const buildIoSpec = (kind, count, mediaType, label) => ({
    kind,
    count: Number(count) || 1,
    media_type: mediaType,
    description: label,
  });

  const handleAddMethod = async () => {
    if (!addMethodNodePath || !addMethodId.trim() || !addMethodTitle.trim()) return;
    setLoading('add-method');
    setError(null);
    setAddMethodResult(null);
    try {
      const form = new FormData();
      form.append('node_path', addMethodNodePath);
      form.append('method_id', addMethodId.trim());
      form.append('method_title', addMethodTitle.trim());
      form.append('description', addMethodDescription.trim());
      form.append('category', addMethodCategory);
      form.append('backend', addMethodBackend);
      form.append('available', addMethodAvailable ? 'true' : 'false');
      form.append('input_spec', JSON.stringify(buildIoSpec(addInputKind, 1, 'image', '输入')));
      form.append('output_spec', JSON.stringify(buildIoSpec(addOutputKind, 1, 'image', '输出')));
      form.append('paper_meta', JSON.stringify({
        id: addMethodId.trim(),
        title: paperTitle.trim() || addMethodTitle.trim(),
        authors: paperAuthors.trim(),
        year: paperYear.trim(),
        venue: paperVenue.trim(),
        paper_url: paperUrl.trim(),
        summary: paperSummary.trim(),
        type: addMethodCategory,
      }));
      if (paperPdfFile) form.append('paper_pdf', paperPdfFile);
      if (modelPyFile) form.append('model_py', modelPyFile);
      if (modelWeightFile) form.append('model_file', modelWeightFile);

      const result = await addMethodToNode(form);
      setAddMethodResult(result);
      loadNodes();
      loadProfessionalNodes();
    } catch (err) {
      setError(err.response?.data?.detail || err.message);
    } finally {
      setLoading('');
    }
  };

  const handleExportProfessional = async () => {
    if (!exportProNodePath) return;
    setLoading('export-pro');
    setError(null);
    setExportProResult(null);
    try {
      const result = await exportProfessionalNode({
        node_path: exportProNodePath,
        include_papers: true,
        include_weights: false,
      });
      setExportProResult(result);
    } catch (err) {
      setError(err.response?.data?.detail || err.message);
    } finally {
      setLoading('');
    }
  };

  const handleImportProfessional = async () => {
    if (!proImportFile) return;
    setLoading('import-pro');
    setError(null);
    setProImportResult(null);
    try {
      const result = await importProfessionalNode(proImportFile, proImportOverwrite);
      setProImportResult(result);
      loadNodes();
      loadProfessionalNodes();
    } catch (err) {
      setError(err.response?.data?.detail || err.message);
    } finally {
      setLoading('');
    }
  };

  const handleCreateMethod = async () => {
    setLoading('method');
    setError(null);
    setMethodResult(null);
    try {
      const result = await createMethodTemplate({
        domain,
        node_id: methodNodeId,
        method_id: methodId.trim(),
        method_title: methodTitle.trim(),
        description: methodDescription.trim(),
        category: methodCategory,
        backend: methodBackend,
        available: methodAvailable,
        input_kind: inputKind,
        input_count: Number(inputCount) || 1,
        input_media_type: inputMediaType,
        output_kind: outputKind,
        output_count: Number(outputCount) || 1,
        output_media_type: outputMediaType,
      });
      setMethodResult(result);
    } catch (err) {
      setError(err.response?.data?.detail || err.message);
    } finally {
      setLoading('');
    }
  };

  const handleExport = async () => {
    setLoading('export');
    setError(null);
    setExportResult(null);
    try {
      const result = await exportNode({
        domain,
        node_id: exportNodeId,
        include_weights: false,
      });
      setExportResult(result);
    } catch (err) {
      setError(err.response?.data?.detail || err.message);
    } finally {
      setLoading('');
    }
  };

  const handleImport = async () => {
    if (!importFile) return;
    setLoading('import');
    setError(null);
    setImportResult(null);
    try {
      const result = await importNodeTemplate(importFile, importDomain, overwrite);
      setImportResult(result);
      loadNodes();
    } catch (err) {
      setError(err.response?.data?.detail || err.message);
    } finally {
      setLoading('');
    }
  };

  const handleImportNodeTemplate = async () => {
    if (!zipNodeFile) return;
    setLoading('zip-node');
    setError(null);
    setZipNodeResult(null);
    try {
      const result = await importNodeTemplate(zipNodeFile, zipNodeDomain, zipNodeOverwrite);
      setZipNodeResult(result);
      loadNodes();
    } catch (err) {
      setError(err.response?.data?.detail || err.message);
    } finally {
      setLoading('');
    }
  };

  const handleImportMethodTemplate = async () => {
    if (!zipMethodFile || !zipMethodNodeId) return;
    setLoading('zip-method');
    setError(null);
    setZipMethodResult(null);
    try {
      const result = await importMethodTemplate(
        zipMethodFile,
        zipMethodDomain,
        zipMethodNodeId,
        zipMethodOverwrite,
      );
      setZipMethodResult(result);
      loadNodes();
    } catch (err) {
      setError(err.response?.data?.detail || err.message);
    } finally {
      setLoading('');
    }
  };

  const handleDeleteNode = async () => {
    if (deleteNodeConfirmText !== 'DELETE') return;
    if (!window.confirm('该操作会将节点移动到回收站，是否继续？')) return;

    setLoading('delete-node');
    setError(null);
    setDeleteNodeResult(null);
    try {
      const result = await deleteNode({
        domain,
        node_id: deleteNodeId,
        confirm: true,
        reason: deleteNodeReason.trim() || '用户删除节点',
      });
      setDeleteNodeResult(result);
      setDeleteNodeConfirmText('');
      loadNodes();
    } catch (err) {
      setError(err.response?.data?.detail || err.message);
    } finally {
      setLoading('');
    }
  };

  const handleDeleteMethod = async () => {
    if (deleteMethodConfirmText !== 'DELETE') return;
    if (!window.confirm('该操作会将方法移动到回收站，是否继续？')) return;

    setLoading('delete-method');
    setError(null);
    setDeleteMethodResult(null);
    try {
      const result = await deleteMethod({
        domain,
        node_id: deleteMethodNodeId,
        method_id: deleteMethodId,
        confirm: true,
        reason: deleteMethodReason.trim() || '用户删除方法',
      });
      setDeleteMethodResult(result);
      setDeleteMethodConfirmText('');
      loadNodes();
    } catch (err) {
      setError(err.response?.data?.detail || err.message);
    } finally {
      setLoading('');
    }
  };

  const domainOptions = domains.length
    ? domains.filter((d) => d.status === 'ready').map((d) => d.id)
    : ['cv'];

  return (
    <div className="node-manager-page">
      <Link to="/" className="back-link">← 返回首页</Link>
      <h1 className="page-title">节点管理</h1>
      <div className="info-box manager-intro">
        <p><strong>节点模板：</strong>用于创建新的任务节点，例如图像去模糊、边缘检测。</p>
        <p><strong>方法模板：</strong>在已有节点下创建算法方法，例如在图像超分下创建 SRCNN / ESPCN，在图像去噪下创建 DnCNN。</p>
        <p><strong>输入输出类型：</strong>方法模板创建时需要声明 input_spec / output_spec。Pipeline Builder 会根据这些类型判断方法是否能和前后步骤组合。例如，图像去噪和图像超分都是 single_image → single_image，因此可以串联；特征匹配是 image_pair → match_visualization，不能直接接在单图流水线后面。</p>
        <p><strong>导出节点：</strong>将整个任务节点打包为 zip，默认不导出模型权重。</p>
        <p><strong>导入节点：</strong>导入标准节点 zip 并校验结构，不会执行其中代码。</p>
        <p><strong>Create 模块：</strong>创建专业节点（可选 parent_path）、导入/导出带 <code>package_manifest.json</code> 的专业节点包、向节点添加方法并上传论文 PDF / model.py / 权重。</p>
        <p><strong>专业节点包导入：</strong>目标位置由 zip 内 <code>target_path</code> 决定，无需手动选择领域。</p>
        <p><strong>删除节点 / 方法：</strong>软删除到 <code>backend/runtime/trash/</code>，核心节点与方法受保护。第一版无 UI 恢复，可手动从 trash 复制回 knowledge/。</p>
      </div>

      {error && <div className="error manager-error">{error}</div>}

      <section className="manager-section card">
        <h2 className="section-title">Create：创建专业节点</h2>
        <p className="card-desc">选择父级路径后创建独立专业节点，自动生成 package_manifest.json 与实验脚手架。</p>
        <div className="manager-form-grid">
          <label>
            领域
            <select value={domain} onChange={(e) => setDomain(e.target.value)}>
              {domainOptions.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </label>
          <label>
            父级路径 parent_path
            <select value={parentPath} onChange={(e) => setParentPath(e.target.value)}>
              {parentPathPresets.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </label>
          <label className="span-2">
            或手动输入新父级路径
            <input
              value={customParentPath}
              onChange={(e) => setCustomParentPath(e.target.value)}
              placeholder="例如 cv/computational_imaging"
            />
          </label>
          <label>
            节点 ID
            <input value={nodeId} onChange={(e) => setNodeId(e.target.value)} placeholder="compressed_imaging" />
          </label>
          <label>
            节点名称
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="压缩成像" />
          </label>
          <label className="span-2">
            描述
            <input value={description} onChange={(e) => setDescription(e.target.value)} />
          </label>
          <label>
            输入类型
            <select value={proNodeInputType} onChange={(e) => setProNodeInputType(e.target.value)}>
              <option value="single_image">single_image</option>
              <option value="image_pair">image_pair</option>
              <option value="single_video">single_video</option>
            </select>
          </label>
          <label>
            类型
            <select value={nodeType} onChange={(e) => setNodeType(e.target.value)}>
              <option value="leaf">leaf</option>
              <option value="combined">combined</option>
            </select>
          </label>
        </div>
        <p className="card-desc">目标路径：<code>knowledge/{effectiveParentPath}/{nodeId || '...'}</code></p>
        <button
          type="button"
          className="btn btn-primary"
          disabled={loading === 'pro-create' || !nodeId.trim() || !title.trim()}
          onClick={handleCreateProfessionalNode}
        >
          {loading === 'pro-create' ? '创建中...' : '创建专业节点'}
        </button>
        {proCreateResult && (
          <div className="manager-result">
            <p>已创建：<code>{proCreateResult.target_path}</code></p>
            <ValidationBox validation={proCreateResult.validation} />
          </div>
        )}
      </section>

      <section className="manager-section card">
        <h2 className="section-title">Create：添加方法到专业节点</h2>
        <p className="card-desc">可上传论文 PDF（写入 papers.json）、model.py（须含 process）、模型权重（保存到 methods/weights/）。</p>
        <div className="manager-form-grid">
          <label className="span-2">
            专业节点 node_path
            <select value={addMethodNodePath} onChange={(e) => setAddMethodNodePath(e.target.value)}>
              {professionalNodes.filter((n) => n.type === 'leaf').map((n) => (
                <option key={n.node_path} value={n.node_path}>
                  {n.title} ({n.node_path})
                </option>
              ))}
            </select>
          </label>
          <label>
            方法 ID
            <input value={addMethodId} onChange={(e) => setAddMethodId(e.target.value)} placeholder="test_uploaded_method" />
          </label>
          <label>
            方法名称
            <input value={addMethodTitle} onChange={(e) => setAddMethodTitle(e.target.value)} />
          </label>
          <label>
            类别
            <select value={addMethodCategory} onChange={(e) => setAddMethodCategory(e.target.value)}>
              {METHOD_CATEGORIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </label>
          <label>
            后端类型
            <select value={addMethodBackend} onChange={(e) => setAddMethodBackend(e.target.value)}>
              {METHOD_BACKENDS.map((b) => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>
          </label>
          <label className="span-2">
            描述
            <textarea rows={2} value={addMethodDescription} onChange={(e) => setAddMethodDescription(e.target.value)} />
          </label>
          <label>
            输入类型
            <select value={addInputKind} onChange={(e) => setAddInputKind(e.target.value)}>
              {INPUT_KIND_OPTIONS.map((k) => (
                <option key={k} value={k}>{k}</option>
              ))}
            </select>
          </label>
          <label>
            输出类型
            <select value={addOutputKind} onChange={(e) => setAddOutputKind(e.target.value)}>
              {OUTPUT_KIND_OPTIONS.map((k) => (
                <option key={k} value={k}>{k}</option>
              ))}
            </select>
          </label>
          <label className="manager-checkbox">
            <input type="checkbox" checked={addMethodAvailable} onChange={(e) => setAddMethodAvailable(e.target.checked)} />
            立即可运行 (available)
          </label>
          <label className="span-2">
            论文 PDF（可选）
            <input type="file" accept=".pdf" onChange={(e) => setPaperPdfFile(e.target.files?.[0] || null)} />
          </label>
          <label>
            论文标题
            <input value={paperTitle} onChange={(e) => setPaperTitle(e.target.value)} />
          </label>
          <label>
            作者
            <input value={paperAuthors} onChange={(e) => setPaperAuthors(e.target.value)} />
          </label>
          <label>
            年份
            <input value={paperYear} onChange={(e) => setPaperYear(e.target.value)} />
          </label>
          <label>
            发表 venue
            <input value={paperVenue} onChange={(e) => setPaperVenue(e.target.value)} />
          </label>
          <label className="span-2">
            论文链接（可选）
            <input value={paperUrl} onChange={(e) => setPaperUrl(e.target.value)} />
          </label>
          <label className="span-2">
            论文摘要
            <textarea rows={2} value={paperSummary} onChange={(e) => setPaperSummary(e.target.value)} />
          </label>
          <label>
            model.py（可选）
            <input type="file" accept=".py" onChange={(e) => setModelPyFile(e.target.files?.[0] || null)} />
          </label>
          <label>
            模型文件（可选）
            <input type="file" onChange={(e) => setModelWeightFile(e.target.files?.[0] || null)} />
          </label>
        </div>
        <button
          type="button"
          className="btn btn-primary"
          disabled={loading === 'add-method' || !addMethodNodePath || !addMethodId.trim() || !addMethodTitle.trim()}
          onClick={handleAddMethod}
        >
          {loading === 'add-method' ? '提交中...' : '添加方法'}
        </button>
        {addMethodResult && (
          <div className="manager-result">
            <p>方法添加成功：<code>{addMethodResult.method_path}</code></p>
            <p>论文已保存：{addMethodResult.paper_saved ? '是' : '否'}；模型已保存：{addMethodResult.model_saved ? '是' : '否'}</p>
            <ValidationBox validation={addMethodResult.validation} />
          </div>
        )}
      </section>

      <section className="manager-section card">
        <h2 className="section-title">Create：导出专业节点包</h2>
        <div className="manager-form-grid">
          <label className="span-2">
            专业节点
            <select value={exportProNodePath} onChange={(e) => setExportProNodePath(e.target.value)}>
              {professionalNodes.filter((n) => n.type === 'leaf').map((n) => (
                <option key={n.node_path} value={n.node_path}>
                  {n.title} ({n.node_path})
                </option>
              ))}
            </select>
          </label>
        </div>
        <p className="card-desc">导出 zip 含 package_manifest.json，默认包含论文 PDF，不含模型权重。</p>
        <button
          type="button"
          className="btn btn-primary"
          disabled={loading === 'export-pro' || !exportProNodePath}
          onClick={handleExportProfessional}
        >
          {loading === 'export-pro' ? '导出中...' : '导出专业节点包'}
        </button>
        {exportProResult && (
          <div className="manager-result">
            <p>目标路径：{exportProResult.target_path}</p>
            {exportProResult.download_url && (
              <a href={exportProResult.download_url} className="btn btn-secondary btn-sm" download>
                下载 {exportProResult.filename}
              </a>
            )}
            <ValidationBox validation={exportProResult.validation} />
          </div>
        )}
      </section>

      <section className="manager-section card">
        <h2 className="section-title">Create：导入专业节点包</h2>
        <p className="card-desc">导入位置由 zip 内 package_manifest.json 的 target_path 自动决定（与普通节点模板导入区分）。</p>
        <div className="manager-form-grid">
          <label className="manager-checkbox">
            <input type="checkbox" checked={proImportOverwrite} onChange={(e) => setProImportOverwrite(e.target.checked)} />
            覆盖已存在节点 (overwrite)
          </label>
          <label className="span-2">
            专业节点包 ZIP
            <input type="file" accept=".zip" onChange={(e) => setProImportFile(e.target.files?.[0] || null)} />
          </label>
        </div>
        <button
          type="button"
          className="btn btn-primary"
          disabled={loading === 'import-pro' || !proImportFile}
          onClick={handleImportProfessional}
        >
          {loading === 'import-pro' ? '导入中...' : '导入专业节点包'}
        </button>
        {proImportResult && (
          <div className="manager-result">
            <p>已导入：<strong>{proImportResult.title}</strong> → <code>{proImportResult.target_path}</code></p>
            {proImportResult.warnings?.length > 0 && (
              <ul className="validation-warn">{proImportResult.warnings.map((w) => <li key={w}>{w}</li>)}</ul>
            )}
            <ValidationBox validation={proImportResult.validation} />
          </div>
        )}
      </section>

      <section className="manager-section card">
        <h2 className="section-title">新建节点模板（兼容）</h2>
        <div className="manager-form-grid">
          <label>
            领域
            <select value={domain} onChange={(e) => setDomain(e.target.value)}>
              {domainOptions.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </label>
          <label>
            节点 ID
            <input value={nodeId} onChange={(e) => setNodeId(e.target.value)} placeholder="deblur" />
          </label>
          <label>
            节点名称
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="图像去模糊" />
          </label>
          <label className="span-2">
            描述
            <input value={description} onChange={(e) => setDescription(e.target.value)} />
          </label>
          <label>
            类型
            <select value={nodeType} onChange={(e) => setNodeType(e.target.value)}>
              <option value="leaf">leaf</option>
              <option value="combined">combined</option>
            </select>
          </label>
        </div>
        <button
          type="button"
          className="btn btn-primary"
          disabled={loading === 'create' || !nodeId.trim() || !title.trim()}
          onClick={handleCreate}
        >
          {loading === 'create' ? '生成中...' : '生成节点模板'}
        </button>
        {createResult && (
          <div className="manager-result">
            <p>已创建：<code>{createResult.node_path}</code></p>
            <ValidationBox validation={createResult.validation} />
            <p className="card-desc">请刷新 CV 领域页面查看新节点。</p>
          </div>
        )}
      </section>

      <section className="manager-section card">
        <h2 className="section-title">新建方法模板</h2>
        <div className="manager-form-grid">
          <label>
            领域
            <select value={domain} onChange={(e) => setDomain(e.target.value)}>
              {domainOptions.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </label>
          <label>
            所属节点
            <select value={methodNodeId} onChange={(e) => setMethodNodeId(e.target.value)}>
              {leafNodes.map((n) => (
                <option key={n.id} value={n.id}>{n.title} ({n.id})</option>
              ))}
            </select>
          </label>
          <label>
            方法 ID
            <input
              value={methodId}
              onChange={(e) => setMethodId(e.target.value)}
              placeholder="espcn / edsr / dncnn / yolo"
            />
          </label>
          <label>
            方法名称
            <input
              value={methodTitle}
              onChange={(e) => setMethodTitle(e.target.value)}
              placeholder="ESPCN / EDSR / DnCNN"
            />
          </label>
          <label>
            方法类别
            <select value={methodCategory} onChange={(e) => setMethodCategory(e.target.value)}>
              {METHOD_CATEGORIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </label>
          <label>
            后端类型
            <select value={methodBackend} onChange={(e) => setMethodBackend(e.target.value)}>
              {METHOD_BACKENDS.map((b) => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>
          </label>
          <label className="span-2">
            描述
            <textarea
              rows={2}
              value={methodDescription}
              onChange={(e) => setMethodDescription(e.target.value)}
              placeholder="方法简介"
            />
          </label>
          <label className="manager-checkbox">
            <input
              type="checkbox"
              checked={methodAvailable}
              onChange={(e) => setMethodAvailable(e.target.checked)}
            />
            立即可运行 (available)
          </label>
          <label>
            输入类型 (kind)
            <select value={inputKind} onChange={(e) => setInputKind(e.target.value)}>
              {INPUT_KIND_OPTIONS.map((k) => (
                <option key={k} value={k}>{k}</option>
              ))}
            </select>
          </label>
          <label>
            输入数量
            <input
              type="number"
              min={1}
              value={inputCount}
              onChange={(e) => setInputCount(e.target.value)}
            />
          </label>
          <label>
            输入媒体 (media_type)
            <select value={inputMediaType} onChange={(e) => setInputMediaType(e.target.value)}>
              {MEDIA_TYPE_OPTIONS.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </label>
          <label>
            输出类型 (kind)
            <select value={outputKind} onChange={(e) => setOutputKind(e.target.value)}>
              {OUTPUT_KIND_OPTIONS.map((k) => (
                <option key={k} value={k}>{k}</option>
              ))}
            </select>
          </label>
          <label>
            输出数量
            <input
              type="number"
              min={1}
              value={outputCount}
              onChange={(e) => setOutputCount(e.target.value)}
            />
          </label>
          <label>
            输出媒体 (media_type)
            <select value={outputMediaType} onChange={(e) => setOutputMediaType(e.target.value)}>
              {MEDIA_TYPE_OPTIONS.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </label>
          <p className="card-desc span-2">
            预览：{formatIoArrow({ kind: inputKind }, { kind: outputKind })}
          </p>
        </div>
        <button
          type="button"
          className="btn btn-primary"
          disabled={loading === 'method' || !methodNodeId || !methodId.trim() || !methodTitle.trim()}
          onClick={handleCreateMethod}
        >
          {loading === 'method' ? '生成中...' : '生成方法模板'}
        </button>
        {methodResult && (
          <div className="manager-result">
            <p>{methodResult.message}</p>
            <p>路径：<code>{methodResult.method_path}</code></p>
            <p className="card-desc">刷新对应节点页面后可看到新方法。</p>
          </div>
        )}
      </section>

      <section className="manager-section card">
        <h2 className="section-title">导出节点</h2>
        <div className="manager-form-grid">
          <label>
            领域
            <select value={domain} onChange={(e) => setDomain(e.target.value)}>
              {domainOptions.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </label>
          <label>
            节点
            <select value={exportNodeId} onChange={(e) => setExportNodeId(e.target.value)}>
              {leafNodes.map((n) => (
                <option key={n.id} value={n.id}>{n.title} ({n.id})</option>
              ))}
            </select>
          </label>
        </div>
        <p className="card-desc">当前版本暂不导出模型权重（include_weights 不可用）。</p>
        <button
          type="button"
          className="btn btn-primary"
          disabled={loading === 'export' || !exportNodeId}
          onClick={handleExport}
        >
          {loading === 'export' ? '导出中...' : '导出节点'}
        </button>
        {exportResult && (
          <div className="manager-result">
            <p>导出文件：{exportResult.export_path}</p>
            {exportResult.download_url && (
              <a href={exportResult.download_url} className="btn btn-secondary btn-sm" download>
                下载 zip
              </a>
            )}
            <ValidationBox validation={exportResult.validation} />
          </div>
        )}
      </section>

      <section className="manager-section card manager-zip-import">
        <h2 className="section-title">从 ZIP 导入模板</h2>
        <div className="info-box manager-intro">
          <p><strong>节点模板 ZIP：</strong>用于导入一个完整知识节点，例如图像去模糊、边缘检测。导入后会出现在对应领域页面中。</p>
          <p><strong>方法模板 ZIP：</strong>用于导入某个已有节点下的算法方法，例如在图像超分中导入 SRCNN，在图像去噪中导入 DnCNN。</p>
          <p><strong>安全限制：</strong>当前版本不支持通过 ZIP 导入模型权重。权重请手动放入 external_model_root 或对应 methods/&#123;method&#125;/weights/ 目录。</p>
        </div>

        <div className="manager-zip-grid">
          <div className="manager-zip-card card card-compact">
            <h3 className="manager-zip-card-title">导入节点模板</h3>
            <div className="manager-form-grid">
              <label>
                目标领域
                <select value={zipNodeDomain} onChange={(e) => setZipNodeDomain(e.target.value)}>
                  {domainOptions.map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </label>
              <label className="manager-checkbox">
                <input
                  type="checkbox"
                  checked={zipNodeOverwrite}
                  onChange={(e) => setZipNodeOverwrite(e.target.checked)}
                />
                覆盖已存在节点 (overwrite)
              </label>
              <label className="span-2">
                节点模板 ZIP
                <input
                  type="file"
                  accept=".zip"
                  onChange={(e) => setZipNodeFile(e.target.files?.[0] || null)}
                />
              </label>
            </div>
            <button
              type="button"
              className="btn btn-primary"
              disabled={loading === 'zip-node' || !zipNodeFile}
              onClick={handleImportNodeTemplate}
            >
              {loading === 'zip-node' ? '导入中...' : '校验并导入节点模板'}
            </button>
            {zipNodeResult && (
              <div className="manager-result">
                <p>已导入节点：<strong>{zipNodeResult.node_id}</strong></p>
                <p>路径：<code>{zipNodeResult.target_path}</code></p>
                <ValidationBox validation={zipNodeResult.validation} />
              </div>
            )}
          </div>

          <div className="manager-zip-card card card-compact">
            <h3 className="manager-zip-card-title">导入方法模板</h3>
            <div className="manager-form-grid">
              <label>
                目标领域
                <select value={zipMethodDomain} onChange={(e) => setZipMethodDomain(e.target.value)}>
                  {domainOptions.map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </label>
              <label>
                所属节点 (leaf)
                <select value={zipMethodNodeId} onChange={(e) => setZipMethodNodeId(e.target.value)}>
                  {leafNodes.map((n) => (
                    <option key={n.id} value={n.id}>{n.title} ({n.id})</option>
                  ))}
                </select>
              </label>
              <label className="manager-checkbox">
                <input
                  type="checkbox"
                  checked={zipMethodOverwrite}
                  onChange={(e) => setZipMethodOverwrite(e.target.checked)}
                />
                覆盖已存在方法 (overwrite)
              </label>
              <label className="span-2">
                方法模板 ZIP
                <input
                  type="file"
                  accept=".zip"
                  onChange={(e) => setZipMethodFile(e.target.files?.[0] || null)}
                />
              </label>
            </div>
            <button
              type="button"
              className="btn btn-primary"
              disabled={loading === 'zip-method' || !zipMethodFile || !zipMethodNodeId}
              onClick={handleImportMethodTemplate}
            >
              {loading === 'zip-method' ? '导入中...' : '校验并导入方法模板'}
            </button>
            {zipMethodResult && (
              <div className="manager-result">
                <p>已导入方法：<strong>{zipMethodResult.method_id}</strong></p>
                <p>路径：<code>{zipMethodResult.target_path}</code></p>
                {zipMethodResult.input_spec && zipMethodResult.output_spec && (
                  <p className="card-desc">
                    类型：{formatIoArrow(zipMethodResult.input_spec, zipMethodResult.output_spec)}
                  </p>
                )}
                <ValidationBox validation={zipMethodResult.validation} />
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="manager-section card">
        <h2 className="section-title">导入节点（兼容入口）</h2>
        <p className="card-desc manager-risk">
          导入节点只会进行结构校验，不会执行其中代码。拒绝权重文件与可执行脚本。
        </p>
        <div className="manager-form-grid">
          <label>
            目标领域
            <select value={importDomain} onChange={(e) => setImportDomain(e.target.value)}>
              {domainOptions.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </label>
          <label className="manager-checkbox">
            <input
              type="checkbox"
              checked={overwrite}
              onChange={(e) => setOverwrite(e.target.checked)}
            />
            覆盖已存在节点 (overwrite)
          </label>
          <label className="span-2">
            zip 文件
            <input
              type="file"
              accept=".zip"
              onChange={(e) => setImportFile(e.target.files?.[0] || null)}
            />
          </label>
        </div>
        <button
          type="button"
          className="btn btn-primary"
          disabled={loading === 'import' || !importFile}
          onClick={handleImport}
        >
          {loading === 'import' ? '导入中...' : '校验并导入'}
        </button>
        {importResult && (
          <div className="manager-result">
            <p>已导入：{importResult.domain}/{importResult.node_id}</p>
            <p><code>{importResult.target_path || importResult.node_path}</code></p>
            <ValidationBox validation={importResult.validation} />
          </div>
        )}
      </section>

      <section className="manager-section card manager-delete-section">
        <h2 className="section-title">删除节点</h2>
        <p className="card-desc manager-risk">删除为软删除，目录将移动到 backend/runtime/trash/。</p>
        <div className="manager-form-grid">
          <label>
            领域
            <select value={domain} onChange={(e) => setDomain(e.target.value)}>
              {domainOptions.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </label>
          <label>
            节点
            <select value={deleteNodeId} onChange={(e) => setDeleteNodeId(e.target.value)}>
              {nodes.map((n) => (
                <option key={n.id} value={n.id}>
                  {n.title} ({n.id}) {n.protected ? '[保护]' : ''}
                </option>
              ))}
            </select>
          </label>
          <label className="span-2">
            删除原因（可选）
            <input
              value={deleteNodeReason}
              onChange={(e) => setDeleteNodeReason(e.target.value)}
              placeholder="例如：测试节点清理"
            />
          </label>
          <label className="span-2">
            确认输入 DELETE
            <input
              value={deleteNodeConfirmText}
              onChange={(e) => setDeleteNodeConfirmText(e.target.value)}
              placeholder="输入 DELETE 以启用删除"
            />
          </label>
        </div>
        {deleteTargetNode?.protected && (
          <p className="manager-blocked">系统核心节点，禁止删除。</p>
        )}
        {deleteTargetNode && !deleteTargetNode.deletable && !deleteTargetNode.protected && (
          <p className="manager-blocked">{deleteTargetNode.delete_blocked_reason}</p>
        )}
        <button
          type="button"
          className="btn btn-danger"
          disabled={
            loading === 'delete-node'
            || deleteNodeConfirmText !== 'DELETE'
            || !deleteNodeId
            || deleteTargetNode?.protected
            || (deleteTargetNode && !deleteTargetNode.deletable)
          }
          onClick={handleDeleteNode}
        >
          {loading === 'delete-node' ? '删除中...' : '删除节点'}
        </button>
        {deleteNodeResult && (
          <div className="manager-result">
            <p>{deleteNodeResult.message}</p>
            <p><code>{deleteNodeResult.trash_path}</code></p>
            <p className="card-desc">已移动到回收站，可在 backend/runtime/trash 中找回。</p>
          </div>
        )}
      </section>

      <section className="manager-section card manager-delete-section">
        <h2 className="section-title">删除方法</h2>
        <div className="manager-form-grid">
          <label>
            领域
            <select value={domain} onChange={(e) => setDomain(e.target.value)}>
              {domainOptions.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </label>
          <label>
            所属节点
            <select
              value={deleteMethodNodeId}
              onChange={(e) => {
                setDeleteMethodNodeId(e.target.value);
                const node = nodes.find((n) => n.id === e.target.value);
                setDeleteMethodId(node?.methods?.[0]?.id || '');
              }}
            >
              {leafNodes.map((n) => (
                <option key={n.id} value={n.id}>{n.title} ({n.id})</option>
              ))}
            </select>
          </label>
          <label>
            方法
            <select value={deleteMethodId} onChange={(e) => setDeleteMethodId(e.target.value)}>
              {deletableMethods.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.title} ({m.id}) {m.protected ? '[保护]' : ''}
                </option>
              ))}
            </select>
          </label>
          <label className="span-2">
            删除原因（可选）
            <input
              value={deleteMethodReason}
              onChange={(e) => setDeleteMethodReason(e.target.value)}
            />
          </label>
          <label className="span-2">
            确认输入 DELETE
            <input
              value={deleteMethodConfirmText}
              onChange={(e) => setDeleteMethodConfirmText(e.target.value)}
              placeholder="输入 DELETE 以启用删除"
            />
          </label>
        </div>
        {selectedDeleteMethod?.protected && (
          <p className="manager-blocked">核心方法，禁止删除。</p>
        )}
        {selectedDeleteMethod && !selectedDeleteMethod.deletable && !selectedDeleteMethod.protected && (
          <p className="manager-blocked">{selectedDeleteMethod.delete_blocked_reason}</p>
        )}
        <button
          type="button"
          className="btn btn-danger"
          disabled={
            loading === 'delete-method'
            || deleteMethodConfirmText !== 'DELETE'
            || !deleteMethodId
            || selectedDeleteMethod?.protected
            || (selectedDeleteMethod && !selectedDeleteMethod.deletable)
          }
          onClick={handleDeleteMethod}
        >
          {loading === 'delete-method' ? '删除中...' : '删除方法'}
        </button>
        {deleteMethodResult && (
          <div className="manager-result">
            <p>{deleteMethodResult.message}</p>
            <p><code>{deleteMethodResult.trash_path}</code></p>
            <p className="card-desc">已移动到回收站，可在 backend/runtime/trash 中找回。</p>
          </div>
        )}
      </section>
    </div>
  );
}
