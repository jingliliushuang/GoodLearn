const STATUS = {
  runnable: { label: '可运行', dot: 'dot-ready' },
  theory: { label: '仅理论', dot: 'dot-theory' },
  future: { label: '后续扩展', dot: 'dot-future' },
};

const ROADMAP_GROUPS = [
  {
    label: '基础插值',
    items: [
      { id: 'nearest', short: 'Nearest' },
      { id: 'bilinear', short: 'Bilinear' },
      { id: 'bicubic', short: 'Bicubic' },
      { id: 'lanczos', short: 'Lanczos' },
    ],
  },
  {
    label: 'CNN 超分',
    items: [
      { id: 'srcnn', short: 'SRCNN' },
      { id: 'fsrcnn', short: 'FSRCNN' },
      { id: 'espcn', short: 'ESPCN' },
      { id: 'edsr', short: 'EDSR' },
    ],
  },
  {
    label: '生成式 / Transformer',
    items: [
      { id: 'esrgan', short: 'ESRGAN' },
      { id: 'real_esrgan', short: 'Real-ESRGAN' },
      { id: 'swinir', short: 'SwinIR' },
    ],
  },
];

const DEFAULT_STATUS = {
  fsrcnn: 'theory',
  esrgan: 'theory',
};

function buildStatusMap(learningPath) {
  const map = { ...DEFAULT_STATUS };
  (learningPath || []).forEach((item) => {
    map[item.id] = item.status;
  });
  return map;
}

export default function CourseRoadmap({ learningPath, selectedMethod, onSelect }) {
  const statusMap = buildStatusMap(learningPath);

  return (
    <div className="course-roadmap">
      {ROADMAP_GROUPS.map((group) => (
        <div key={group.label} className="roadmap-row">
          <span className="roadmap-label">{group.label}：</span>
          <div className="roadmap-pills">
            {group.items.map((item, idx) => {
              const status = statusMap[item.id] || 'future';
              const meta = STATUS[status] || STATUS.future;
              const selected = selectedMethod === item.id;
              return (
                <span key={item.id} className="roadmap-pill-wrap">
                  {idx > 0 && <span className="roadmap-arrow">→</span>}
                  <button
                    type="button"
                    className={`roadmap-pill ${selected ? 'selected' : ''}`}
                    onClick={() => onSelect(item.id)}
                    title={meta.label}
                  >
                    <span className={`roadmap-dot ${meta.dot}`} />
                    {item.short}
                  </button>
                </span>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
