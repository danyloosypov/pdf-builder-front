export const PX_PER_INCH = 96
export const CM_PER_INCH = 2.54
export const PAGE_OFFSET_X = 100
export const PAGE_OFFSET_Y = 50
export const PAGE_STAGE_PADDING_X = 200
export const PAGE_STAGE_PADDING_Y = 200
export const MIN_PAGE_INCHES = 1
export const MAX_PAGE_INCHES = 80

export const pageSizePresets = [
  { label: 'A5', value: 'a5', widthCm: 14.8, heightCm: 21 },
  { label: 'A4', value: 'a4', widthCm: 21, heightCm: 29.7 },
  { label: 'A3', value: 'a3', widthCm: 29.7, heightCm: 42 },
  { label: 'Custom', value: 'custom' }
]

export const pageMarginPresets = [
  { label: 'Normal', value: 'normal', marginsInches: { top: 1, right: 1, bottom: 1, left: 1 } },
  { label: 'Narrow', value: 'narrow', marginsInches: { top: 0.5, right: 0.5, bottom: 0.5, left: 0.5 } },
  { label: 'Moderate', value: 'moderate', marginsInches: { top: 1, right: 0.75, bottom: 1, left: 0.75 } },
  { label: 'Wide', value: 'wide', marginsInches: { top: 1, right: 2, bottom: 1, left: 2 } },
  { label: 'Custom', value: 'custom' }
]

export const bandTypeGroups = [
  { id: 'document', label: 'Document Bands' },
  { id: 'page', label: 'Page Bands' },
  { id: 'data', label: 'Data Bands' },
  { id: 'group', label: 'Group Bands' },
  { id: 'support', label: 'Support Bands' },
  { id: 'table', label: 'Table Bands' }
]

export const bandTypeOptions = [
  { value: 'document-header', label: 'Document Header', group: 'document', placement: 'top', scope: 'document-start', defaultHeight: 72, color: '#2563eb' },
  { value: 'document-footer', label: 'Document Footer', group: 'document', placement: 'bottom', scope: 'document-end', defaultHeight: 72, color: '#2563eb' },
  { value: 'no-data', label: 'No Data Band', group: 'document', placement: 'body', scope: 'when-empty', defaultHeight: 96, color: '#64748b' },
  { value: 'page-header', label: 'Page Header', group: 'page', placement: 'top', scope: 'every-page', defaultHeight: 64, color: '#0f766e' },
  { value: 'page-footer', label: 'Page Footer', group: 'page', placement: 'bottom', scope: 'every-page', defaultHeight: 64, color: '#0f766e' },
  { value: 'master-data', label: 'Master Data Band', group: 'data', placement: 'body', scope: 'master-records', defaultHeight: 80, color: '#15803d' },
  { value: 'data-header', label: 'Data Header', group: 'data', placement: 'body', scope: 'before-data', defaultHeight: 48, color: '#65a30d' },
  { value: 'data-footer', label: 'Data Footer', group: 'data', placement: 'body', scope: 'after-data', defaultHeight: 48, color: '#65a30d' },
  { value: 'detail-header', label: 'Detail Header', group: 'data', placement: 'body', scope: 'before-detail', defaultHeight: 44, color: '#84cc16' },
  { value: 'detail-footer', label: 'Detail Footer', group: 'data', placement: 'body', scope: 'after-detail', defaultHeight: 44, color: '#84cc16' },
  { value: 'empty-data', label: 'Empty Data Band', group: 'data', placement: 'body', scope: 'empty-fill', defaultHeight: 40, color: '#4d7c0f' },
  { value: 'group-header', label: 'Group Header', group: 'group', placement: 'body', scope: 'group-start', defaultHeight: 52, color: '#db2777' },
  { value: 'group-footer', label: 'Group Footer', group: 'group', placement: 'body', scope: 'group-end', defaultHeight: 52, color: '#db2777' },
  { value: 'nested-group-header', label: 'Nested Group Header', group: 'group', placement: 'body', scope: 'nested-group-start', defaultHeight: 44, color: '#be185d' },
  { value: 'nested-group-footer', label: 'Nested Group Footer', group: 'group', placement: 'body', scope: 'nested-group-end', defaultHeight: 44, color: '#be185d' },
  { value: 'child', label: 'Child Band', group: 'support', placement: 'body', scope: 'after-parent', defaultHeight: 48, color: '#475569' },
  { value: 'continuation', label: 'Continuation Band', group: 'support', placement: 'top', scope: 'continued-page', defaultHeight: 44, color: '#475569' },
  { value: 'break', label: 'Break Band', group: 'support', placement: 'body', scope: 'page-or-column-break', defaultHeight: 24, color: '#dc2626' },
  { value: 'spacer', label: 'Spacer Band', group: 'support', placement: 'body', scope: 'spacing', defaultHeight: 36, color: '#64748b' },
  { value: 'overlay', label: 'Overlay Band', group: 'support', placement: 'full', scope: 'over-content', defaultHeight: 0, color: '#0ea5e9' },
  { value: 'background', label: 'Background Band', group: 'support', placement: 'full', scope: 'under-content', defaultHeight: 0, color: '#64748b' },
  { value: 'table-header', label: 'Table Header Band', group: 'table', placement: 'body', scope: 'table-header', defaultHeight: 44, color: '#7c2d12' },
  { value: 'table-detail', label: 'Table Detail Band', group: 'table', placement: 'body', scope: 'table-row', defaultHeight: 44, color: '#9a3412' },
  { value: 'table-footer', label: 'Table Footer Band', group: 'table', placement: 'body', scope: 'table-footer', defaultHeight: 44, color: '#7c2d12' }
]

export const sidebarElementTabs = [
  { id: 'text', label: 'Текстовые элементы' },
  { id: 'shapes', label: 'Фигуры' },
  { id: 'charts', label: 'Диаграммы' },
  { id: 'images', label: 'Изображения' },
  { id: 'other', label: 'Другое' }
]

export const SIDEBAR_ELEMENT_DRAG_TYPE = 'application/x-pdf-builder-sidebar-element'
export const sidebarElementDragTypes = new Set([
  'text',
  'label',
  'checkbox',
  'rect',
  'triangle',
  'circle',
  'rightTriangle',
  'arrow',
  'line',
  'polygon',
  'chart',
  'pieChart',
  'qr',
  'barcode',
  'table'
])

export const defaultImageSettings = {
  cornerRadius: 0,
  opacity: 1,
  objectFit: 'cover',
  cropLeft: 0,
  cropRight: 0,
  cropTop: 0,
  cropBottom: 0
}

export const defaultTextSettings = {
  fontSize: 20,
  lineHeight: 1.35,
  letterSpacing: 0
}

export const defaultTableCellSettings = {
  fill: '#ffffff',
  textColor: '#111827',
  fontSize: 14,
  textAlign: 'left',
  verticalAlign: 'middle',
  textOrientation: 'horizontal',
  borderColor: '#111827',
  borderWidth: 1,
  borderStyle: 'solid'
}

export const MIN_TABLE_ROWS = 1
export const MAX_TABLE_ROWS = 30
export const MIN_TABLE_COLS = 1
export const MAX_TABLE_COLS = 20
export const DEFAULT_TABLE_CELL_WIDTH = 100
export const DEFAULT_TABLE_CELL_HEIGHT = 40
export const CLIPBOARD_PASTE_OFFSET = 24

export const checkboxStyleOptions = [
  { label: 'Cross', value: 'cross' },
  { label: 'Check', value: 'check' },
  { label: 'Struck rectangle', value: 'strikeRect' },
  { label: 'Rectangle + check', value: 'rectCheck' },
  { label: 'Struck circle', value: 'strikeCircle' },
  { label: 'Circle + dot', value: 'circleDot' },
  { label: 'Rectangle + dot', value: 'rectDot' }
]

export const defaultCheckboxSettings = {
  checkboxStyle: 'rectCheck',
  checked: true,
  borderColor: '#111827',
  borderWidth: 2,
  borderStyle: 'solid',
  markColor: '#2563eb',
  fill: '#ffffff',
  opacity: 1
}

export const shapeTypes = ['rect', 'circle', 'polygon', 'triangle', 'rightTriangle', 'line', 'arrow']
export const regularPolygonShapeTypes = ['polygon', 'triangle']
export const borderableElementTypes = ['text', 'image', 'label', 'chart', 'checkbox']
export const dimensionEditableTypes = ['image', 'rect', 'circle', 'polygon', 'triangle', 'rightTriangle', 'line', 'arrow', 'table', 'checkbox']
export const fillableShapeTypes = ['rect', 'circle', 'polygon', 'triangle', 'rightTriangle']

export const cornerRadiusFields = [
  { label: 'Top left', index: 0 },
  { label: 'Top right', index: 1 },
  { label: 'Bottom right', index: 2 },
  { label: 'Bottom left', index: 3 }
]

export const shapeLabels = {
  rect: 'Rectangle',
  circle: 'Circle',
  polygon: 'Polygon',
  triangle: 'Triangle',
  rightTriangle: 'Right Triangle',
  line: 'Line',
  arrow: 'Arrow'
}

export const defaultShapeSettings = {
  stroke: '#111827',
  strokeWidth: 2,
  borderStyle: 'solid',
  opacity: 1
}

export const defaultElementBorderSettings = {
  borderColor: '#111827',
  borderWidth: 0,
  borderStyle: 'solid'
}

export const borderStyleOptions = [
  { label: 'Solid', value: 'solid' },
  { label: 'Dashed', value: 'dashed' },
  { label: 'Dotted', value: 'dotted' },
  { label: 'Dash-dot', value: 'dashDot' }
]

export const borderStyleValues = new Set(borderStyleOptions.map(option => option.value))
export const borderStyleAliases = {
  dashdot: 'dashDot',
  'dash-dot': 'dashDot',
  dash_dot: 'dashDot'
}

export const defaultLineHitStrokeWidth = 18
export const defaultShapeFills = {
  rect: '#dddddd',
  circle: '#87ceeb',
  polygon: '#f1c40f',
  triangle: '#f59e0b',
  rightTriangle: '#60a5fa'
}

export const defaultChartSettings = {
  chartType: 'line',
  chartTitle: 'Graph title',
  xAxisLabel: 'X axis',
  yAxisLabel: 'Y axis',
  chartData: '12, 48, 32, 76, 54, 92, 68',
  xAxisValues: '0, 1, 2, 3, 4, 5, 6',
  yAxisValues: '12, 48, 32, 76, 54, 92, 68',
  stroke: '#2563eb',
  fill: '#93c5fd',
  backgroundColor: '#ffffff',
  fillOpacity: 0.35,
  strokeWidth: 3,
  pointRadius: 4,
  showGrid: true,
  showPoints: true
}

export const defaultPieChartColors = [
  '#2563eb',
  '#ef4444',
  '#10b981',
  '#f59e0b',
  '#8b5cf6',
  '#14b8a6',
  '#f97316',
  '#64748b'
]

export const defaultPieChartSettings = {
  chartTitle: 'Pie chart',
  pieData: 'Design, 45\nDevelopment, 30\nTesting, 25',
  showLabels: true,
  backgroundColor: '#ffffff',
  labelColor: '#111827',
  sliceColors: [...defaultPieChartColors]
}

export const fontOptions = [
  { label: 'Arial', value: 'Arial, sans-serif' },
  { label: 'Times', value: 'Times New Roman, serif' },
  { label: 'Georgia', value: 'Georgia, serif' },
  { label: 'Courier', value: 'Courier New, monospace' },
  { label: 'Verdana', value: 'Verdana, sans-serif' },
  { label: 'Roboto', value: 'Roboto, Arial, sans-serif' }
]
