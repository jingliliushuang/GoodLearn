const ROWS = [
  {
    id: 'nearest',
    name: 'Nearest',
    type: '传统插值',
    runnable: true,
    speed: '最快',
    quality: '较差',
    highlight: '直接复制最近像素',
    limitation: '块状伪影明显',
  },
  {
    id: 'bilinear',
    name: 'Bilinear',
    type: '传统插值',
    runnable: true,
    speed: '很快',
    quality: '一般',
    highlight: '根据周围像素线性加权',
    limitation: '细节容易模糊',
  },
  {
    id: 'bicubic',
    name: 'Bicubic',
    type: '传统插值',
    runnable: true,
    speed: '快',
    quality: '中等',
    highlight: '经典传统超分基线',
    limitation: '无法恢复真实高频细节',
  },
  {
    id: 'lanczos',
    name: 'Lanczos',
    type: '传统插值',
    runnable: true,
    speed: '快',
    quality: '中等偏好',
    highlight: '边缘更锐利',
    limitation: '可能产生振铃伪影',
  },
  {
    id: 'espcn',
    name: 'ESPCN',
    type: 'CNN',
    runnable: true,
    speed: '中等',
    quality: '较好',
    highlight: '低分辨率空间卷积 + PixelShuffle',
    limitation: '对真实复杂退化图像有限',
  },
  {
    id: 'edsr',
    name: 'EDSR',
    type: 'CNN',
    runnable: true,
    speed: '较慢',
    quality: '较好',
    highlight: '增强残差网络，去掉 BatchNorm',
    limitation: '模型更重，推理更慢',
  },
];

export default function MethodCompareTable({ selectedMethod, onSelect }) {
  return (
    <div className="compare-table-wrap">
      <table className="method-compare-table">
        <thead>
          <tr>
            <th>方法</th>
            <th>类型</th>
            <th>可运行</th>
            <th>速度</th>
            <th>效果</th>
            <th>核心特点</th>
            <th>局限</th>
          </tr>
        </thead>
        <tbody>
          {ROWS.map((row) => (
            <tr
              key={row.id}
              className={selectedMethod === row.id ? 'selected-row' : ''}
              onClick={() => onSelect?.(row.id)}
            >
              <td className="col-name">{row.name}</td>
              <td>{row.type}</td>
              <td>{row.runnable ? '是' : '否'}</td>
              <td>{row.speed}</td>
              <td>{row.quality}</td>
              <td>{row.highlight}</td>
              <td>{row.limitation}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
