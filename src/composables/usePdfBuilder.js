import { ref, computed, nextTick, watch } from 'vue'
import { Extension, Mark } from '@tiptap/core'
import { onMounted, onBeforeUnmount } from 'vue'
import { useEditor } from '@tiptap/vue-3'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import QRCode from 'qrcode'
import {
  ArrowElement,
  ChartElement,
  CircleElement,
  GroupElement,
  ImageElement,
  LabelElement,
  LineElement,
  PieChartElement,
  RectElement,
  RegularPolygonElement,
  RightTriangleElement,
  TableElement,
  TextElement
} from '../models/canvasElements'

export function usePdfBuilder() {

/* -------------------------
   STATE
--------------------------*/

const elements = ref([])

const PX_PER_INCH = 96
const CM_PER_INCH = 2.54
const PAGE_OFFSET_X = 100
const PAGE_OFFSET_Y = 50
const PAGE_STAGE_PADDING_X = 200
const PAGE_STAGE_PADDING_Y = 200
const MIN_PAGE_INCHES = 1
const MAX_PAGE_INCHES = 80

const pageSizePresets = [
  { label: 'A5', value: 'a5', widthCm: 14.8, heightCm: 21 },
  { label: 'A4', value: 'a4', widthCm: 21, heightCm: 29.7 },
  { label: 'A3', value: 'a3', widthCm: 29.7, heightCm: 42 },
  { label: 'Custom', value: 'custom' }
]
const pageMarginPresets = [
  { label: 'Normal', value: 'normal', marginsInches: { top: 1, right: 1, bottom: 1, left: 1 } },
  { label: 'Narrow', value: 'narrow', marginsInches: { top: 0.5, right: 0.5, bottom: 0.5, left: 0.5 } },
  { label: 'Moderate', value: 'moderate', marginsInches: { top: 1, right: 0.75, bottom: 1, left: 0.75 } },
  { label: 'Wide', value: 'wide', marginsInches: { top: 1, right: 2, bottom: 1, left: 2 } },
  { label: 'Custom', value: 'custom' }
]
const selectedPagePreset = ref('a4')
const pageUnit = ref('cm')
const pageOrientation = ref('portrait')
const canvasColor = ref('#ffffff')
const selectedPageMarginPreset = ref('normal')
const customPageSizeInches = ref({
  width: 21 / CM_PER_INCH,
  height: 29.7 / CM_PER_INCH
})
const customPageMarginsInches = ref({
  top: 1,
  right: 1,
  bottom: 1,
  left: 1
})
const isPdfExporting = ref(false)
const pdfExportError = ref('')

const pageDimensionStep = computed(() => pageUnit.value === 'cm' ? 0.1 : 0.05)
const pageDimensionMin = computed(() => convertInchesToPageUnit(MIN_PAGE_INCHES))
const pageDimensionMax = computed(() => convertInchesToPageUnit(MAX_PAGE_INCHES))
const customPageWidth = computed({
  get: () => formatPageDimension(convertInchesToPageUnit(customPageSizeInches.value.width)),
  set: value => {
    customPageSizeInches.value.width = getPageUnitInches(value)
  }
})
const customPageHeight = computed({
  get: () => formatPageDimension(convertInchesToPageUnit(customPageSizeInches.value.height)),
  set: value => {
    customPageSizeInches.value.height = getPageUnitInches(value)
  }
})
const pageSizeInches = computed(() => {
  const preset = pageSizePresets.find(item => item.value === selectedPagePreset.value)
  let size

  if (!preset || preset.value === 'custom') {
    size = {
      width: customPageSizeInches.value.width,
      height: customPageSizeInches.value.height
    }
  } else {
    size = {
      width: preset.widthCm / CM_PER_INCH,
      height: preset.heightCm / CM_PER_INCH
    }
  }

  const shortSide = Math.min(size.width, size.height)
  const longSide = Math.max(size.width, size.height)

  return pageOrientation.value === 'landscape'
    ? { width: longSide, height: shortSide }
    : { width: shortSide, height: longSide }
})
const pageMarginsInches = computed(() => {
  const preset = pageMarginPresets.find(item => item.value === selectedPageMarginPreset.value)
  const margins = preset?.marginsInches || customPageMarginsInches.value

  return getClampedPageMargins(margins)
})
const pageMarginStep = computed(() => pageUnit.value === 'cm' ? 0.1 : 0.05)
const pageMarginHorizontalMax = computed(() => convertInchesToPageUnit(pageSizeInches.value.width))
const pageMarginVerticalMax = computed(() => convertInchesToPageUnit(pageSizeInches.value.height))
const customPageMarginTop = computed({
  get: () => formatPageDimension(convertInchesToPageUnit(customPageMarginsInches.value.top)),
  set: value => {
    customPageMarginsInches.value.top = getPageMarginUnitInches(value, 'top')
  }
})
const customPageMarginRight = computed({
  get: () => formatPageDimension(convertInchesToPageUnit(customPageMarginsInches.value.right)),
  set: value => {
    customPageMarginsInches.value.right = getPageMarginUnitInches(value, 'right')
  }
})
const customPageMarginBottom = computed({
  get: () => formatPageDimension(convertInchesToPageUnit(customPageMarginsInches.value.bottom)),
  set: value => {
    customPageMarginsInches.value.bottom = getPageMarginUnitInches(value, 'bottom')
  }
})
const customPageMarginLeft = computed({
  get: () => formatPageDimension(convertInchesToPageUnit(customPageMarginsInches.value.left)),
  set: value => {
    customPageMarginsInches.value.left = getPageMarginUnitInches(value, 'left')
  }
})
const pagePixelSize = computed(() => ({
  width: Math.round(pageSizeInches.value.width * PX_PER_INCH),
  height: Math.round(pageSizeInches.value.height * PX_PER_INCH)
}))
const currentPageWidth = computed(() => formatPageDimension(convertInchesToPageUnit(pageSizeInches.value.width)))
const currentPageHeight = computed(() => formatPageDimension(convertInchesToPageUnit(pageSizeInches.value.height)))
const currentPageMargins = computed(() => ({
  top: formatPageDimension(convertInchesToPageUnit(pageMarginsInches.value.top)),
  right: formatPageDimension(convertInchesToPageUnit(pageMarginsInches.value.right)),
  bottom: formatPageDimension(convertInchesToPageUnit(pageMarginsInches.value.bottom)),
  left: formatPageDimension(convertInchesToPageUnit(pageMarginsInches.value.left))
}))
const pageConfig = computed(() => ({
  width: pagePixelSize.value.width,
  height: pagePixelSize.value.height,
  fill: canvasColor.value,
  stroke: isPdfExporting.value ? canvasColor.value : '#d1d5db',
  strokeWidth: isPdfExporting.value ? 0 : 1,
  x: PAGE_OFFSET_X,
  y: PAGE_OFFSET_Y
}))
const pageMarginGuideConfig = computed(() => {
  const margins = pageMarginsInches.value
  const left = Math.round(margins.left * PX_PER_INCH)
  const top = Math.round(margins.top * PX_PER_INCH)
  const right = Math.round(margins.right * PX_PER_INCH)
  const bottom = Math.round(margins.bottom * PX_PER_INCH)

  return {
    x: pageConfig.value.x + left,
    y: pageConfig.value.y + top,
    width: Math.max(1, pageConfig.value.width - left - right),
    height: Math.max(1, pageConfig.value.height - top - bottom),
    fill: 'transparent',
    stroke: '#94a3b8',
    strokeWidth: 1,
    dash: [6, 4],
    visible: !isPdfExporting.value,
    listening: false
  }
})
const pageClipConfig = computed(() => ({
  clipX: pageConfig.value.x,
  clipY: pageConfig.value.y,
  clipWidth: pageConfig.value.width,
  clipHeight: pageConfig.value.height
}))
const stageConfig = computed(() => ({
  width: pagePixelSize.value.width + PAGE_STAGE_PADDING_X,
  height: pagePixelSize.value.height + PAGE_STAGE_PADDING_Y
}))
const stageShellStyle = computed(() => ({
  width: `${stageConfig.value.width}px`,
  height: `${stageConfig.value.height}px`
}))
const rulerSize = 24
const rulerUnitPixels = computed(() => (
  pageUnit.value === 'cm'
    ? PX_PER_INCH / CM_PER_INCH
    : PX_PER_INCH
))
const rulerMinorDivisions = computed(() => pageUnit.value === 'cm' ? 10 : 8)
const rulerUnitLabel = computed(() => pageUnit.value)
const canvasRulerCornerStyle = computed(() => ({
  left: `${PAGE_OFFSET_X - rulerSize}px`,
  top: `${PAGE_OFFSET_Y - rulerSize}px`,
  width: `${rulerSize}px`,
  height: `${rulerSize}px`
}))
const canvasRulerHorizontalStyle = computed(() => ({
  left: `${PAGE_OFFSET_X}px`,
  top: `${PAGE_OFFSET_Y - rulerSize}px`,
  width: `${pagePixelSize.value.width}px`,
  height: `${rulerSize}px`
}))
const canvasRulerVerticalStyle = computed(() => ({
  left: `${PAGE_OFFSET_X - rulerSize}px`,
  top: `${PAGE_OFFSET_Y}px`,
  width: `${rulerSize}px`,
  height: `${pagePixelSize.value.height}px`
}))
const horizontalRulerTicks = computed(() => getRulerTicks(pagePixelSize.value.width))
const verticalRulerTicks = computed(() => getRulerTicks(pagePixelSize.value.height))

const selectedId = ref(null)
const selectedIds = ref([])
const stageRef = ref(null)
const transformerRef = ref(null)
const nodeRefs = ref({})
const editingId = ref(null)
const editingTextTarget = ref('text')
const activeSidebarElementTab = ref('text')
const sidebarElementTabs = [
  { id: 'text', label: 'Текстовые элементы' },
  { id: 'shapes', label: 'Фигуры' },
  { id: 'charts', label: 'Диаграммы' },
  { id: 'images', label: 'Изображения' },
  { id: 'other', label: 'Другое' }
]
const SIDEBAR_ELEMENT_DRAG_TYPE = 'application/x-pdf-builder-sidebar-element'
const sidebarElementDragTypes = new Set([
  'text',
  'label',
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
const tableRowsInput = ref(3)
const tableColsInput = ref(3)
const selectedTableCellIds = ref([])
const editingTableCell = ref(null)
const tableCellEditorValue = ref('')
const draggedSidebarElementType = ref(null)
const draggedLayerId = ref(null)
const dragOverLayerId = ref(null)
const isImageDragActive = ref(false)
const qrLink = ref('')
const qrError = ref('')
const barcodeValue = ref('')
const barcodeError = ref('')
const isImportingLayout = ref(false)
const layoutImportError = ref('')
const layoutImportMessage = ref('')
const copiedCanvasItems = ref([])
const contextMenu = ref({
  visible: false,
  type: 'canvas',
  positionMode: 'stage',
  targetId: null,
  cellId: null,
  x: 0,
  y: 0,
  pastePoint: null
})
const lastCanvasPastePoint = ref(null)
const richRenderVersions = new Map()
let canvasVersion = 0
let generatedCanvasIdCounter = 0
let clipboardPasteCount = 0
const defaultImageSettings = {
  cornerRadius: 0,
  opacity: 1,
  objectFit: 'cover',
  cropLeft: 0,
  cropRight: 0,
  cropTop: 0,
  cropBottom: 0
}
const defaultTextSettings = {
  fontSize: 20,
  lineHeight: 1.35,
  letterSpacing: 0
}
const defaultTableCellSettings = {
  fill: '#ffffff',
  textColor: '#111827',
  fontSize: 14,
  textAlign: 'left',
  verticalAlign: 'middle',
  borderColor: '#111827',
  borderWidth: 1,
  borderStyle: 'solid'
}
const MIN_TABLE_ROWS = 1
const MAX_TABLE_ROWS = 30
const MIN_TABLE_COLS = 1
const MAX_TABLE_COLS = 20
const DEFAULT_TABLE_CELL_WIDTH = 100
const DEFAULT_TABLE_CELL_HEIGHT = 40
const CLIPBOARD_PASTE_OFFSET = 24
const shapeTypes = ['rect', 'circle', 'polygon', 'triangle', 'rightTriangle', 'line', 'arrow']
const regularPolygonShapeTypes = ['polygon', 'triangle']
const borderableElementTypes = ['text', 'image', 'label', 'chart']
const dimensionEditableTypes = ['image', 'rect', 'circle', 'polygon', 'triangle', 'rightTriangle', 'line', 'arrow', 'table']
const fillableShapeTypes = ['rect', 'circle', 'polygon', 'triangle', 'rightTriangle']
const cornerRadiusFields = [
  { label: 'Top left', index: 0 },
  { label: 'Top right', index: 1 },
  { label: 'Bottom right', index: 2 },
  { label: 'Bottom left', index: 3 }
]
const shapeLabels = {
  rect: 'Rectangle',
  circle: 'Circle',
  polygon: 'Polygon',
  triangle: 'Triangle',
  rightTriangle: 'Right Triangle',
  line: 'Line',
  arrow: 'Arrow'
}
const defaultShapeSettings = {
  stroke: '#111827',
  strokeWidth: 2,
  borderStyle: 'solid',
  opacity: 1
}
const defaultElementBorderSettings = {
  borderColor: '#111827',
  borderWidth: 0,
  borderStyle: 'solid'
}
const borderStyleOptions = [
  { label: 'Solid', value: 'solid' },
  { label: 'Dashed', value: 'dashed' },
  { label: 'Dotted', value: 'dotted' },
  { label: 'Dash-dot', value: 'dashDot' }
]
const borderStyleValues = new Set(borderStyleOptions.map(option => option.value))
const borderStyleAliases = {
  dashdot: 'dashDot',
  'dash-dot': 'dashDot',
  dash_dot: 'dashDot'
}
const defaultLineHitStrokeWidth = 18
const defaultShapeFills = {
  rect: '#dddddd',
  circle: '#87ceeb',
  polygon: '#f1c40f',
  triangle: '#f59e0b',
  rightTriangle: '#60a5fa'
}
const defaultChartSettings = {
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
const defaultPieChartColors = [
  '#2563eb',
  '#ef4444',
  '#10b981',
  '#f59e0b',
  '#8b5cf6',
  '#14b8a6',
  '#f97316',
  '#64748b'
]
const defaultPieChartSettings = {
  chartTitle: 'Pie chart',
  pieData: 'Design, 45\nDevelopment, 30\nTesting, 25',
  showLabels: true,
  backgroundColor: '#ffffff',
  labelColor: '#111827',
  sliceColors: [...defaultPieChartColors]
}
const editorPosition = ref({
  x: 0,
  y: 0,
  width: 240,
  rotation: 0
})

const fontOptions = [
  { label: 'Arial', value: 'Arial, sans-serif' },
  { label: 'Times', value: 'Times New Roman, serif' },
  { label: 'Georgia', value: 'Georgia, serif' },
  { label: 'Courier', value: 'Courier New, monospace' },
  { label: 'Verdana', value: 'Verdana, sans-serif' },
  { label: 'Roboto', value: 'Roboto, Arial, sans-serif' }
]

const RichTextStyle = Mark.create({
  name: 'richTextStyle',

  addAttributes() {
    return {
      color: {
        default: null,
        parseHTML: element => getHexColor(element.style.color, null),
        renderHTML: () => ({})
      },
      backgroundColor: {
        default: null,
        parseHTML: element => getHexColor(element.style.backgroundColor, null),
        renderHTML: () => ({})
      },
      fontFamily: {
        default: null,
        parseHTML: element => element.style.fontFamily || null,
        renderHTML: () => ({})
      },
      fontSize: {
        default: null,
        parseHTML: element => getNormalizedTextFontSize(element.style.fontSize),
        renderHTML: () => ({})
      },
      opacity: {
        default: null,
        parseHTML: element => element.style.opacity || null,
        renderHTML: () => ({})
      }
    }
  },

  parseHTML() {
    return [
      {
        tag: 'span',
        getAttrs: element => {
          const style = element.getAttribute('style') || ''
          return style ? null : false
        }
      }
    ]
  },

  renderHTML({ mark }) {
    const styles = []
    const { color, backgroundColor, fontFamily, fontSize, opacity } = mark.attrs

    if (color) styles.push(`color:${color}`)
    if (backgroundColor) styles.push(`background-color:${backgroundColor}`)
    if (fontFamily) styles.push(`font-family:${fontFamily}`)
    if (fontSize) {
      const normalizedFontSize = getNormalizedTextFontSize(fontSize)
      if (normalizedFontSize) styles.push(`font-size:${normalizedFontSize}px`)
    }
    if (opacity !== null && opacity !== undefined) styles.push(`opacity:${opacity}`)

    return ['span', styles.length ? { style: styles.join(';') } : {}, 0]
  }
})

const TextAlign = Extension.create({
  name: 'textAlign',

  addGlobalAttributes() {
    return [
      {
        types: ['paragraph', 'heading'],
        attributes: {
          textAlign: {
            default: null,
            parseHTML: element => element.style.textAlign || null,
            renderHTML: attributes => {
              if (!attributes.textAlign) return {}

              return {
                style: `text-align:${attributes.textAlign}`
              }
            }
          }
        }
      }
    ]
  },

  addCommands() {
    return {
      setTextAlign:
        alignment =>
        ({ state, tr, dispatch }) => {
          const { from, to } = state.selection
          let changed = false

          state.doc.nodesBetween(from, to, (node, pos) => {
            if (!node.isTextblock) return
            if (!['paragraph', 'heading'].includes(node.type.name)) return

            tr.setNodeMarkup(pos, undefined, {
              ...node.attrs,
              textAlign: alignment
            })
            changed = true
          })

          if (changed && dispatch) dispatch(tr)

          return changed
        }
    }
  }
})

const editor = useEditor({
  extensions: [
    StarterKit,
    Underline,
    RichTextStyle,
    TextAlign
  ],
  content: '<p></p>',
  editorProps: {
    attributes: {
      class: 'rich-text-content'
    },
    handleKeyDown: (_view, event) => {
      if (event.key === 'Escape') {
        finishTextEditing()
        return true
      }

      if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
        finishTextEditing()
        return true
      }

      return false
    }
  },
  onUpdate: syncEditorContent
})

/* -------------------------
   COMPUTED FILTERS
--------------------------*/

const textItems = computed(() => elements.value.filter(i => i.type === 'text' && !i.tableGroup))
const imageItems = computed(() => elements.value.filter(i => i.type === 'image'))
const rectItems = computed(() => elements.value.filter(i => i.type === 'rect' && !i.tableGroup))
const circleItems = computed(() => elements.value.filter(i => i.type === 'circle'))
const lineItems = computed(() => elements.value.filter(i => i.type === 'line'))
const arrowItems = computed(() => elements.value.filter(i => i.type === 'arrow'))
const labelItems = computed(() => elements.value.filter(i => i.type === 'label'))
const polygonItems = computed(() => elements.value.filter(i => i.type === 'polygon'))
const triangleItems = computed(() => elements.value.filter(i => i.type === 'triangle'))
const chartItems = computed(() => elements.value.filter(i => i.type === 'chart'))
const pieChartItems = computed(() => elements.value.filter(i => i.type === 'pieChart'))
const shapeTextItems = computed(() => elements.value.filter(i => shapeTypes.includes(i.type) && i.shapeRichImage))
const canvasItems = computed(() => elements.value.filter(item => !item.tableGroup))
const hasCanvasElements = computed(() => elements.value.length > 0)
const layerSidebarItems = computed(() => (
  canvasItems.value
    .map((item, layerIndex) => ({
      item,
      layerIndex,
      title: getLayerItemTitle(item)
    }))
    .reverse()
))

// Table elements (rects and text) handled separately to keep positioning group-logical
const tableItems = computed(() => elements.value.filter(i => i.tableGroup))
const selectedItems = computed(() => {
  const selectedIdSet = new Set(selectedIds.value)

  return canvasItems.value.filter(item => selectedIdSet.has(item.id))
})
const canDeleteSelected = computed(() => selectedItems.value.length > 0)
const canPasteCopiedItems = computed(() => copiedCanvasItems.value.length > 0 && !editingId.value)
const contextMenuStyle = computed(() => {
  const style = {
    left: `${contextMenu.value.x}px`,
    top: `${contextMenu.value.y}px`
  }

  if (contextMenu.value.positionMode === 'viewport') {
    style.position = 'fixed'
  }

  return style
})
const selectedItem = computed(() => elements.value.find(i => i.id === selectedId.value) || null)
const selectedLayerIndex = computed(() => canvasItems.value.findIndex(item => item.id === selectedId.value))
const canMoveSelectedBackward = computed(() => selectedLayerIndex.value > 0)
const canMoveSelectedForward = computed(() => (
  selectedLayerIndex.value >= 0 && selectedLayerIndex.value < canvasItems.value.length - 1
))
const selectedElementDimensions = computed(() => getElementDimensionReadout(selectedItem.value))
const canAlignSelected = computed(() => selectedItems.value.length > 1)
const canGroupSelected = computed(() => (
  selectedItems.value.length > 1 &&
  selectedItems.value.every(item => item.type !== 'group')
))
const selectedText = computed(() => selectedItem.value?.type === 'text' && !selectedItem.value.tableGroup ? selectedItem.value : null)
const selectedGroup = computed(() => selectedItem.value?.type === 'group' ? selectedItem.value : null)
const selectedTable = computed(() => selectedItem.value?.type === 'table' ? selectedItem.value : null)
const selectedTableCells = computed(() => {
  if (!selectedTable.value) return []

  const selectedCellIdSet = new Set(selectedTableCellIds.value.map(String))

  return getVisibleTableCells(selectedTable.value)
    .filter(cell => selectedCellIdSet.has(String(cell.id)))
})
const selectedLabel = computed(() => {
  const item = selectedItem.value

  if (item?.type !== 'label') return null

  return item
})
const selectedImage = computed(() => selectedItem.value?.type === 'image' ? selectedItem.value : null)
const selectedChart = computed(() => selectedItem.value?.type === 'chart' ? selectedItem.value : null)
const selectedPieChart = computed(() => selectedItem.value?.type === 'pieChart' ? selectedItem.value : null)
const selectedShape = computed(() => {
  const item = selectedItem.value

  if (!item || !shapeTypes.includes(item.type)) return null

  return item
})
const editingItem = computed(() => elements.value.find(i => i.id === editingId.value) || null)
const tableCellEditorStyle = computed(() => {
  if (!editingTableCell.value) return null

  const table = getCanvasItemById(editingTableCell.value.tableId)
  const cell = getTableCellById(table, editingTableCell.value.cellId)

  if (!table || !cell) return null

  return getTableCellEditorStyle(table, cell)
})
const transformerConfig = computed(() => {
  const freeResizeAnchors = [
    'top-left',
    'top-center',
    'top-right',
    'middle-left',
    'middle-right',
    'bottom-left',
    'bottom-center',
    'bottom-right'
  ]
  const defaultAnchors = [
    'top-left',
    'top-right',
    'bottom-left',
    'bottom-right'
  ]
  const isMoveOnlySelection = selectedIds.value.length > 1 || selectedItem.value?.type === 'group'
  const canResizeFreely = !isMoveOnlySelection && ['text', 'image', 'chart', 'pieChart'].includes(selectedItem.value?.type)

  return {
    visible: !isPdfExporting.value,
    rotateEnabled: !isMoveOnlySelection,
    keepRatio: !canResizeFreely,
    flipEnabled: false,
    enabledAnchors: isMoveOnlySelection ? [] : (canResizeFreely ? freeResizeAnchors : defaultAnchors)
  }
})
const richEditorStyle = computed(() => {
  const item = editingItem.value

  return {
    left: `${editorPosition.value.x}px`,
    top: `${editorPosition.value.y}px`,
    width: `${editorPosition.value.width}px`,
    transform: `rotate(${editorPosition.value.rotation}deg)`,
    '--editor-font-size': `${getEditingTextBaseFontSize(item)}px`,
    '--editor-color': getEditingTextColor(item),
    '--editor-font-family': getEditingTextFontFamily(item),
    '--editor-line-height': getEditingTextLineHeight(item),
    '--editor-letter-spacing': `${getEditingTextLetterSpacing(item)}px`
  }
})

/* -------------------------
   ADD ELEMENTS
--------------------------*/

const BARCODE_MAX_LENGTH = 80
const BARCODE_MODULE_WIDTH = 2
const BARCODE_BAR_HEIGHT = 80
const BARCODE_LABEL_HEIGHT = 24
const BARCODE_QUIET_ZONE_MODULES = 10
const CODE128_START_B = 104
const CODE128_STOP = 106
const CODE128_B_PATTERNS = [
  '212222', '222122', '222221', '121223', '121322', '131222',
  '122213', '122312', '132212', '221213', '221312', '231212',
  '112232', '122132', '122231', '113222', '123122', '123221',
  '223211', '221132', '221231', '213212', '223112', '312131',
  '311222', '321122', '321221', '312212', '322112', '322211',
  '212123', '212321', '232121', '111323', '131123', '131321',
  '112313', '132113', '132311', '211313', '231113', '231311',
  '112133', '112331', '132131', '113123', '113321', '133121',
  '313121', '211331', '231131', '213113', '213311', '213131',
  '311123', '311321', '331121', '312113', '312311', '332111',
  '314111', '221411', '431111', '111224', '111422', '121124',
  '121421', '141122', '141221', '112214', '112412', '122114',
  '122411', '142112', '142211', '241211', '221114', '413111',
  '241112', '134111', '111242', '121142', '121241', '114212',
  '124112', '124211', '411212', '421112', '421211', '212141',
  '214121', '412121', '111143', '111341', '131141', '114113',
  '114311', '411113', '411311', '113141', '114131', '311141',
  '411131', '211412', '211214', '211232', '2331112'
]

function getNormalizedQRLink(value) {
  const trimmedValue = value.trim()

  if (!trimmedValue) return ''

  const linkWithProtocol = /^[a-z][a-z\d+.-]*:/i.test(trimmedValue)
    ? trimmedValue
    : `https://${trimmedValue}`

  try {
    const url = new URL(linkWithProtocol)

    if (!['http:', 'https:'].includes(url.protocol)) return ''

    return url.toString()
  } catch {
    return ''
  }
}

function addQR(dropPoint = null) {
  const link = getNormalizedQRLink(qrLink.value)
  const targetCanvasVersion = canvasVersion

  if (!link) {
    qrError.value = qrLink.value.trim()
      ? 'Enter a valid http or https link.'
      : 'Enter a link first.'
    return
  }

  qrError.value = ''

  QRCode.toDataURL(link).then((url) => {
    const img = new window.Image()
    img.src = url

    img.onload = () => {
      if (targetCanvasVersion !== canvasVersion) return

      const id = Date.now()
      const position = dropPoint
        ? getTopLeftForDropPoint(dropPoint, 120, 120)
        : { x: 200, y: 200 }

      elements.value.push(new ImageElement({
        id,
        image: img,
        x: position.x,
        y: position.y,
        width: 120,
        height: 120
      }))

      nextTick(() => selectElement(id))
    }
  }).catch(() => {
    qrError.value = 'Could not generate this QR code.'
  })
}

function getBarcodeValidationError(value) {
  if (!value) return 'Enter a value first.'
  if (value.length > BARCODE_MAX_LENGTH) return `Use ${BARCODE_MAX_LENGTH} characters or fewer.`

  const hasUnsupportedCharacter = Array.from(value).some(char => {
    const code = char.charCodeAt(0)

    return code < 32 || code > 126
  })

  return hasUnsupportedCharacter
    ? 'Use printable ASCII characters only.'
    : ''
}

function getCode128BSequence(value) {
  const dataCodes = Array.from(value, char => char.charCodeAt(0) - 32)
  const checksum = dataCodes.reduce(
    (sum, code, index) => sum + code * (index + 1),
    CODE128_START_B
  ) % 103

  return [CODE128_START_B, ...dataCodes, checksum, CODE128_STOP]
}

function getPatternModuleCount(pattern) {
  return Array.from(pattern).reduce((sum, width) => sum + Number(width), 0)
}

function drawBarcodeLabel(context, value, width, y) {
  let fontSize = 14
  const minFontSize = 8

  do {
    context.font = `${fontSize}px Arial`
    if (context.measureText(value).width <= width - 16) break
    fontSize -= 1
  } while (fontSize >= minFontSize)

  context.fillStyle = '#111'
  context.textAlign = 'center'
  context.textBaseline = 'middle'
  context.fillText(value, width / 2, y)
}

function createBarcodeDataURL(value) {
  const sequence = getCode128BSequence(value)
  const barcodeModules = sequence.reduce((sum, code) => (
    sum + getPatternModuleCount(CODE128_B_PATTERNS[code])
  ), 0)
  const width = (barcodeModules + BARCODE_QUIET_ZONE_MODULES * 2) * BARCODE_MODULE_WIDTH
  const height = BARCODE_BAR_HEIGHT + BARCODE_LABEL_HEIGHT
  const canvas = document.createElement('canvas')
  const context = canvas.getContext('2d')

  if (!context) throw new Error('Canvas is not available.')

  canvas.width = width
  canvas.height = height

  context.fillStyle = '#fff'
  context.fillRect(0, 0, width, height)

  let x = BARCODE_QUIET_ZONE_MODULES * BARCODE_MODULE_WIDTH

  sequence.forEach(code => {
    const pattern = CODE128_B_PATTERNS[code]
    let isBar = true

    Array.from(pattern).forEach(moduleWidth => {
      const segmentWidth = Number(moduleWidth) * BARCODE_MODULE_WIDTH

      if (isBar) {
        context.fillStyle = '#000'
        context.fillRect(x, 0, segmentWidth, BARCODE_BAR_HEIGHT)
      }

      x += segmentWidth
      isBar = !isBar
    })
  })

  drawBarcodeLabel(context, value, width, BARCODE_BAR_HEIGHT + BARCODE_LABEL_HEIGHT / 2)

  return canvas.toDataURL('image/png')
}

function addBarcode(dropPoint = null) {
  const value = barcodeValue.value.trim()
  const validationError = getBarcodeValidationError(value)
  const targetCanvasVersion = canvasVersion

  if (validationError) {
    barcodeError.value = validationError
    return
  }

  barcodeError.value = ''

  const img = new window.Image()

  try {
    img.src = createBarcodeDataURL(value)
  } catch {
    barcodeError.value = 'Could not generate this barcode.'
    return
  }

  img.onload = () => {
    if (targetCanvasVersion !== canvasVersion) return

    const id = Date.now()
    const width = Math.min(Math.max(img.width, 260), 520)
    const height = Math.round(width * img.height / img.width)
    const position = dropPoint
      ? getTopLeftForDropPoint(dropPoint, width, height)
      : { x: 200, y: 200 }

    elements.value.push(new ImageElement({
      id,
      image: img,
      x: position.x,
      y: position.y,
      width,
      height,
      objectFit: 'contain'
    }))

    nextTick(() => selectElement(id))
  }

  img.onerror = () => {
    barcodeError.value = 'Could not generate this barcode.'
  }
}

function addText() {
  elements.value.push(new TextElement())
}

function addClipboardText(text, pastePoint = null) {
  const value = String(text || '')

  if (!value.trim()) return false

  const bounds = getCanvasBounds()
  const fontSize = 20
  const lineHeight = 1.35
  const lines = value.split(/\r\n|\r|\n/)
  const longestLineLength = Math.max(1, ...lines.map(line => line.length))
  const width = Math.min(420, Math.max(180, Math.round(longestLineLength * fontSize * 0.58) + 18))
  const height = Math.max(40, Math.ceil(lines.length * fontSize * lineHeight) + 12)
  const point = getCanvasPastePoint(pastePoint)
  const id = Date.now()

  elements.value.push(new TextElement({
    id,
    text: value,
    x: clampNumber(point.x, bounds.x, Math.max(bounds.x, bounds.right - width)),
    y: clampNumber(point.y, bounds.y, Math.max(bounds.y, bounds.bottom - height)),
    width,
    height,
    fontSize,
    lineHeight
  }))

  nextTick(() => selectElement(id))

  return true
}

function isImageFile(file) {
  return file?.type?.startsWith('image/') ||
      /\.(avif|bmp|gif|jpe?g|png|svg|webp)$/i.test(file?.name || '')
}

function getFirstImageFile(files) {
  return Array.from(files || []).find(isImageFile)
}

function hasFileDrag(event) {
  return Array.from(event.dataTransfer?.types || []).includes('Files')
}

function hasSidebarElementDrag(event) {
  const types = Array.from(event.dataTransfer?.types || [])

  return Boolean(
    draggedSidebarElementType.value ||
    types.includes(SIDEBAR_ELEMENT_DRAG_TYPE)
  )
}

function getSidebarElementDragType(event) {
  const dataTransferType = event.dataTransfer?.getData(SIDEBAR_ELEMENT_DRAG_TYPE)
  const type = dataTransferType || draggedSidebarElementType.value

  return sidebarElementDragTypes.has(type) ? type : null
}

function handleSidebarElementDragStart(event, type) {
  if (!sidebarElementDragTypes.has(type) || !event.dataTransfer) return

  draggedSidebarElementType.value = type
  event.dataTransfer.effectAllowed = 'copy'
  event.dataTransfer.setData(SIDEBAR_ELEMENT_DRAG_TYPE, type)
}

function handleSidebarElementDragEnd() {
  draggedSidebarElementType.value = null
  isImageDragActive.value = false
}

function getCanvasDropPoint(event) {
  const rect = event.currentTarget.getBoundingClientRect()
  const bounds = getCanvasBounds()

  return {
    x: clampNumber(event.clientX - rect.left, bounds.x, bounds.right),
    y: clampNumber(event.clientY - rect.top, bounds.y, bounds.bottom)
  }
}

function addUploadedImage(file, dropPoint = null) {
  if (!isImageFile(file)) return

  const objectUrl = URL.createObjectURL(file)
  const img = new window.Image()
  const targetCanvasVersion = canvasVersion

  img.onload = () => {
    URL.revokeObjectURL(objectUrl)
    if (targetCanvasVersion !== canvasVersion) return

    const maxSize = 240
    const scale = Math.min(maxSize / img.width, maxSize / img.height, 1)
    const width = Math.round(img.width * scale)
    const height = Math.round(img.height * scale)
    const id = Date.now()
    const bounds = getCanvasBounds()
    const x = dropPoint
      ? clampNumber(dropPoint.x - width / 2, bounds.x, bounds.right - width)
      : 200
    const y = dropPoint
      ? clampNumber(dropPoint.y - height / 2, bounds.y, bounds.bottom - height)
      : 200

    elements.value.push(new ImageElement({
      id,
      image: img,
      x,
      y,
      width,
      height
    }))

    nextTick(() => selectElement(id))
  }

  img.onerror = () => {
    URL.revokeObjectURL(objectUrl)
  }

  img.src = objectUrl
}

function uploadImage(event) {
  const input = event.target
  const file = getFirstImageFile(input.files)

  if (file) addUploadedImage(file)
  input.value = ''
}

function handleImageDragEnter(event) {
  if (!hasFileDrag(event) && !hasSidebarElementDrag(event)) return

  event.preventDefault()
  isImageDragActive.value = true
}

function handleImageDragOver(event) {
  if (!hasFileDrag(event) && !hasSidebarElementDrag(event)) return

  event.preventDefault()
  event.dataTransfer.dropEffect = 'copy'
  isImageDragActive.value = true
}

function handleImageDragLeave(event) {
  if (event.relatedTarget && event.currentTarget.contains(event.relatedTarget)) return

  isImageDragActive.value = false
}

function handleImageDrop(event) {
  if (!hasFileDrag(event) && !hasSidebarElementDrag(event)) return

  event.preventDefault()
  isImageDragActive.value = false
  const dropPoint = getCanvasDropPoint(event)
  const sidebarElementType = getSidebarElementDragType(event)

  if (sidebarElementType) {
    addSidebarElementToCanvas(sidebarElementType, dropPoint)
    draggedSidebarElementType.value = null
    return
  }

  const file = getFirstImageFile(event.dataTransfer?.files)
  if (!file) return

  addUploadedImage(file, dropPoint)
}

function addRect() {
  elements.value.push(new RectElement())
}

function addCircle() {
  elements.value.push(new CircleElement())
}

function addTriangle() {
  elements.value.push(new RegularPolygonElement({
    type: 'triangle',
    sides: 3,
    radius: 55,
    fill: '#f59e0b',
    stroke: '#111827'
  }))
}

function addRightTriangle() {
  elements.value.push(new RightTriangleElement())
}

function addLine() {
  elements.value.push(new LineElement())
}

function addArrow() {
  elements.value.push(new ArrowElement())
}

function addLabel() {
  elements.value.push(new LabelElement())
}

function addPolygon() {
  elements.value.push(new RegularPolygonElement())
}

function addChart() {
  const id = Date.now()

  elements.value.push(new ChartElement({
    id,
    ...defaultChartSettings
  }))

  nextTick(() => selectElement(id))
}

function addPieChart() {
  const id = Date.now()

  elements.value.push(new PieChartElement({
    id,
    ...defaultPieChartSettings,
    sliceColors: [...defaultPieChartSettings.sliceColors]
  }))

  nextTick(() => selectElement(id))
}

function createSidebarCanvasElement(type) {
  const id = createUniqueCanvasItemId(collectCanvasItemIds(elements.value))

  switch (type) {
    case 'text':
      return new TextElement({ id })
    case 'label':
      return new LabelElement({ id })
    case 'rect':
      return new RectElement({ id })
    case 'triangle':
      return new RegularPolygonElement({
        id,
        type: 'triangle',
        sides: 3,
        radius: 55,
        fill: '#f59e0b',
        stroke: '#111827'
      })
    case 'circle':
      return new CircleElement({ id })
    case 'rightTriangle':
      return new RightTriangleElement({ id })
    case 'arrow':
      return new ArrowElement({ id })
    case 'line':
      return new LineElement({ id })
    case 'polygon':
      return new RegularPolygonElement({ id })
    case 'chart':
      return new ChartElement({
        id,
        ...defaultChartSettings
      })
    case 'pieChart':
      return new PieChartElement({
        id,
        ...defaultPieChartSettings,
        sliceColors: [...defaultPieChartSettings.sliceColors]
      })
    case 'table': {
      const rows = getTableDimensionValue(tableRowsInput.value, MIN_TABLE_ROWS, MAX_TABLE_ROWS, 3)
      const cols = getTableDimensionValue(tableColsInput.value, MIN_TABLE_COLS, MAX_TABLE_COLS, 3)

      return new TableElement({
        id,
        rows,
        cols,
        width: cols * DEFAULT_TABLE_CELL_WIDTH,
        height: rows * DEFAULT_TABLE_CELL_HEIGHT,
        colWidths: Array.from({ length: cols }, () => DEFAULT_TABLE_CELL_WIDTH),
        rowHeights: Array.from({ length: rows }, () => DEFAULT_TABLE_CELL_HEIGHT),
        cells: createDefaultTableCells(id, rows, cols)
      })
    }
    default:
      return null
  }
}

function addSidebarElementToCanvas(type, dropPoint) {
  if (type === 'qr') {
    addQR(dropPoint)
    return true
  }

  if (type === 'barcode') {
    addBarcode(dropPoint)
    return true
  }

  const item = createSidebarCanvasElement(type)

  if (!item) return false

  placeCanvasElementAtDropPoint(item, dropPoint)
  elements.value.push(item)
  nextTick(() => selectElement(item.id))

  return true
}

function getTableDimensionValue(value, min, max, fallback) {
  const numericValue = Math.round(Number.parseFloat(value))

  if (!Number.isFinite(numericValue)) return fallback

  return clampNumber(numericValue, min, max)
}

function setTableRowsInput(value) {
  tableRowsInput.value = getTableDimensionValue(value, MIN_TABLE_ROWS, MAX_TABLE_ROWS, tableRowsInput.value)
}

function setTableColsInput(value) {
  tableColsInput.value = getTableDimensionValue(value, MIN_TABLE_COLS, MAX_TABLE_COLS, tableColsInput.value)
}

function createTableCellId(tableId, row, col) {
  generatedCanvasIdCounter += 1

  return `${tableId}-cell-${row}-${col}-${generatedCanvasIdCounter}`
}

function getTableCellCoordinates(cell) {
  return {
    row: Math.max(0, Math.round(Number(cell?.row) || 0)),
    col: Math.max(0, Math.round(Number(cell?.col) || 0)),
    rowSpan: Math.max(1, Math.round(Number(cell?.rowSpan) || 1)),
    colSpan: Math.max(1, Math.round(Number(cell?.colSpan) || 1))
  }
}

function createTableCell(tableId, row, col, overrides = {}) {
  return {
    id: createTableCellId(tableId, row, col),
    row,
    col,
    rowSpan: 1,
    colSpan: 1,
    text: '',
    ...defaultTableCellSettings,
    ...overrides
  }
}

function createDefaultTableCells(tableId, rows, cols) {
  const cells = []

  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      cells.push(createTableCell(tableId, row, col))
    }
  }

  return cells
}

function ensureTableCellSettings(cell, tableId) {
  const coordinates = getTableCellCoordinates(cell)

  return {
    id: cell.id ?? createTableCellId(tableId, coordinates.row, coordinates.col),
    row: coordinates.row,
    col: coordinates.col,
    rowSpan: coordinates.rowSpan,
    colSpan: coordinates.colSpan,
    text: cell.text ?? '',
    fill: getHexColor(cell.fill, defaultTableCellSettings.fill),
    textColor: getHexColor(cell.textColor, defaultTableCellSettings.textColor),
    fontSize: Math.max(6, Math.round(Number(cell.fontSize) || defaultTableCellSettings.fontSize)),
    textAlign: ['left', 'center', 'right'].includes(cell.textAlign) ? cell.textAlign : defaultTableCellSettings.textAlign,
    verticalAlign: ['top', 'middle', 'bottom'].includes(cell.verticalAlign) ? cell.verticalAlign : defaultTableCellSettings.verticalAlign,
    borderColor: getHexColor(cell.borderColor, defaultTableCellSettings.borderColor),
    borderWidth: getBorderWidthValue(cell.borderWidth ?? defaultTableCellSettings.borderWidth),
    borderStyle: getShapeBorderStyle(cell.borderStyle || defaultTableCellSettings.borderStyle)
  }
}

function normalizeTableCells(table) {
  const rows = table.rows
  const cols = table.cols
  const occupied = new Set()
  const normalizedCells = []
  const sourceCells = Array.isArray(table.cells) && table.cells.length
    ? table.cells
    : createDefaultTableCells(table.id, rows, cols)

  sourceCells
    .map(cell => ensureTableCellSettings(cell, table.id))
    .sort((a, b) => a.row - b.row || a.col - b.col)
    .forEach(cell => {
      if (cell.row >= rows || cell.col >= cols) return

      cell.rowSpan = clampNumber(cell.rowSpan, 1, rows - cell.row)
      cell.colSpan = clampNumber(cell.colSpan, 1, cols - cell.col)

      let overlaps = false

      for (let row = cell.row; row < cell.row + cell.rowSpan; row += 1) {
        for (let col = cell.col; col < cell.col + cell.colSpan; col += 1) {
          if (occupied.has(`${row}:${col}`)) overlaps = true
        }
      }

      if (overlaps) return

      normalizedCells.push(cell)

      for (let row = cell.row; row < cell.row + cell.rowSpan; row += 1) {
        for (let col = cell.col; col < cell.col + cell.colSpan; col += 1) {
          occupied.add(`${row}:${col}`)
        }
      }
    })

  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      if (!occupied.has(`${row}:${col}`)) {
        normalizedCells.push(createTableCell(table.id, row, col))
      }
    }
  }

  table.cells = normalizedCells.sort((a, b) => a.row - b.row || a.col - b.col)
}

function getTableTrackSizes(table, key, count, total, defaultSize) {
  const source = Array.isArray(table?.[key]) ? table[key] : []
  const normalizedTotal = Math.max(count, Number(total) || count * defaultSize)
  const fallbackSize = normalizedTotal / Math.max(1, count)
  const sizes = Array.from({ length: count }, (_, index) => (
    Math.max(1, Number(source[index]) || fallbackSize)
  ))
  const sizeTotal = sizes.reduce((sum, size) => sum + size, 0)
  const scale = sizeTotal > 0 ? normalizedTotal / sizeTotal : 1

  return sizes.map(size => size * scale)
}

function getTableColumnWidths(table) {
  return getTableTrackSizes(table, 'colWidths', table.cols, table.width, DEFAULT_TABLE_CELL_WIDTH)
}

function getTableRowHeights(table) {
  return getTableTrackSizes(table, 'rowHeights', table.rows, table.height, DEFAULT_TABLE_CELL_HEIGHT)
}

function ensureTableTrackSettings(table) {
  table.colWidths = getTableColumnWidths(table)
  table.rowHeights = getTableRowHeights(table)
}

function getTableTrackOffset(sizes, index) {
  return sizes
    .slice(0, index)
    .reduce((sum, size) => sum + size, 0)
}

function getTableTrackSpanSize(sizes, start, span) {
  return sizes
    .slice(start, start + span)
    .reduce((sum, size) => sum + size, 0)
}

function ensureTableSettings(item) {
  if (!item || item.type !== 'table') return

  item.rows = getTableDimensionValue(item.rows, MIN_TABLE_ROWS, MAX_TABLE_ROWS, 3)
  item.cols = getTableDimensionValue(item.cols, MIN_TABLE_COLS, MAX_TABLE_COLS, 3)
  item.width = Math.max(item.cols * 16, Number(item.width) || item.cols * DEFAULT_TABLE_CELL_WIDTH)
  item.height = Math.max(item.rows * 16, Number(item.height) || item.rows * DEFAULT_TABLE_CELL_HEIGHT)
  item.rotation = normalizeElementRotation(item.rotation || 0)
  item.draggable = item.draggable !== false

  ensureTableTrackSettings(item)
  normalizeTableCells(item)
}

function getVisibleTableCells(table) {
  if (!table || table.type !== 'table') return []

  return Array.isArray(table.cells) ? table.cells : []
}

function getTableCellById(table, cellId) {
  if (!table || !cellId) return null

  return getVisibleTableCells(table).find(cell => String(cell.id) === String(cellId)) || null
}

function getTableCellLayout(table, cell) {
  const colWidths = getTableColumnWidths(table)
  const rowHeights = getTableRowHeights(table)

  return {
    x: getTableTrackOffset(colWidths, cell.col),
    y: getTableTrackOffset(rowHeights, cell.row),
    width: getTableTrackSpanSize(colWidths, cell.col, cell.colSpan),
    height: getTableTrackSpanSize(rowHeights, cell.row, cell.rowSpan)
  }
}

function getTableConfig(item) {
  return {
    x: item.x,
    y: item.y,
    width: item.width,
    height: item.height,
    rotation: item.rotation || 0,
    draggable: item.draggable !== false
  }
}

function getTableCellGroupConfig(table, cell) {
  const layout = getTableCellLayout(table, cell)

  return {
    x: layout.x,
    y: layout.y
  }
}

function getTableCellRectConfig(table, cell) {
  const layout = getTableCellLayout(table, cell)

  return {
    x: 0,
    y: 0,
    width: layout.width,
    height: layout.height,
    fill: cell.fill || defaultTableCellSettings.fill,
    strokeWidth: 0,
    listening: true
  }
}

function getTableCellTextConfig(table, cell) {
  const layout = getTableCellLayout(table, cell)

  return {
    x: 0,
    y: 0,
    width: layout.width,
    height: layout.height,
    text: String(cell.text || ''),
    fill: cell.textColor || defaultTableCellSettings.textColor,
    fontSize: cell.fontSize || defaultTableCellSettings.fontSize,
    fontFamily: 'Arial, sans-serif',
    padding: 6,
    align: cell.textAlign || defaultTableCellSettings.textAlign,
    verticalAlign: cell.verticalAlign || defaultTableCellSettings.verticalAlign,
    listening: false
  }
}

function getTableCellSelectionConfig(table, cell) {
  const layout = getTableCellLayout(table, cell)

  return {
    x: 0,
    y: 0,
    width: layout.width,
    height: layout.height,
    fill: 'rgba(37,99,235,0.12)',
    stroke: '#2563eb',
    strokeWidth: 2,
    listening: false,
    visible: selectedTableCellIds.value.map(String).includes(String(cell.id))
  }
}

function getTableBorderEdgeKey(x1, y1, x2, y2) {
  const start = `${Number(x1).toFixed(3)}:${Number(y1).toFixed(3)}`
  const end = `${Number(x2).toFixed(3)}:${Number(y2).toFixed(3)}`

  return start < end ? `${start}|${end}` : `${end}|${start}`
}

function getTableCellBorderEdges(table, cell) {
  const layout = getTableCellLayout(table, cell)
  const x = layout.x
  const y = layout.y
  const right = layout.x + layout.width
  const bottom = layout.y + layout.height

  return [
    [x, y, right, y],
    [right, y, right, bottom],
    [right, bottom, x, bottom],
    [x, bottom, x, y]
  ]
}

function getTableBorderLineConfigs(table) {
  const edgeMap = new Map()
  const selectedCellIdSet = new Set(selectedTableCellIds.value.map(String))

  getVisibleTableCells(table).forEach(cell => {
    const isSelected = selectedCellIdSet.has(String(cell.id))
    const borderWidth = getBorderWidthValue(cell.borderWidth)

    getTableCellBorderEdges(table, cell).forEach(([x1, y1, x2, y2], index) => {
      const key = getTableBorderEdgeKey(x1, y1, x2, y2)
      const existing = edgeMap.get(key)

      if (existing?.isSelected && !isSelected) return

      edgeMap.set(key, {
        id: `${cell.id}-edge-${index}`,
        isSelected,
        points: [x1, y1, x2, y2],
        stroke: cell.borderColor || defaultTableCellSettings.borderColor,
        strokeWidth: borderWidth,
        listening: false,
        ...getBorderLineConfig(cell.borderStyle, borderWidth)
      })
    })
  })

  return Array.from(edgeMap.values())
    .filter(line => line.strokeWidth > 0)
    .map(({ isSelected, ...line }) => line)
}

function getTableCellEditorStyle(table, cell) {
  const layout = getTableCellLayout(table, cell)
  const point = getRotatedPoint(table.x, table.y, layout.x, layout.y, table.rotation || 0)

  return {
    left: `${point.x}px`,
    top: `${point.y}px`,
    width: `${Math.max(1, layout.width)}px`,
    height: `${Math.max(1, layout.height)}px`,
    color: cell.textColor || defaultTableCellSettings.textColor,
    background: cell.fill || defaultTableCellSettings.fill,
    fontSize: `${cell.fontSize || defaultTableCellSettings.fontSize}px`,
    textAlign: cell.textAlign || defaultTableCellSettings.textAlign,
    transform: `rotate(${table.rotation || 0}deg)`,
    transformOrigin: 'top left'
  }
}

function isTableCellSelected(cellId) {
  return selectedTableCellIds.value.map(String).includes(String(cellId))
}

function selectTableCell(tableId, cellId, options = {}) {
  const table = getCanvasItemById(tableId)
  const cell = getTableCellById(table, cellId)

  if (!table || !cell) return

  if (selectedId.value !== table.id) selectElement(table.id)

  const currentIds = selectedTableCellIds.value.map(String)
  const cellIdString = String(cell.id)

  if (options.toggle) {
    selectedTableCellIds.value = currentIds.includes(cellIdString)
      ? selectedTableCellIds.value.filter(id => String(id) !== cellIdString)
      : [...selectedTableCellIds.value, cell.id]
  } else {
    selectedTableCellIds.value = [cell.id]
  }
}

function getTableCellContext(tableId, cellId) {
  const table = getCanvasItemById(tableId)
  const cell = getTableCellById(table, cellId)

  return { table, cell }
}

function getSelectedTableCellStyleValue(property, fallback) {
  const cells = selectedTableCells.value
  const source = cells.length ? cells[0] : null

  return source?.[property] ?? fallback
}

function setSelectedTableCellsStyle(attrs) {
  const cells = selectedTableCells.value

  cells.forEach(cell => {
    Object.entries(attrs).forEach(([key, value]) => {
      if (key === 'fill' || key === 'textColor' || key === 'borderColor') {
        cell[key] = getHexColor(value, cell[key] || defaultTableCellSettings[key])
        return
      }

      if (key === 'borderWidth') {
        cell.borderWidth = getBorderWidthValue(value)
        return
      }

      if (key === 'borderStyle') {
        cell.borderStyle = getShapeBorderStyle(value)
        return
      }

      cell[key] = value
    })
  })
}

function cloneTableCellStyle(cell) {
  return {
    fill: cell.fill,
    textColor: cell.textColor,
    fontSize: cell.fontSize,
    textAlign: cell.textAlign,
    verticalAlign: cell.verticalAlign,
    borderColor: cell.borderColor,
    borderWidth: cell.borderWidth,
    borderStyle: cell.borderStyle
  }
}

function fillMissingTableCells(table) {
  normalizeTableCells(table)
}

function insertTableRow(table, rowIndex) {
  if (!table) return

  ensureTableTrackSettings(table)

  const insertAt = clampNumber(rowIndex, 0, table.rows)
  const sourceIndex = clampNumber(insertAt, 0, Math.max(0, table.rowHeights.length - 1))
  const insertedHeight = table.rowHeights[sourceIndex] || DEFAULT_TABLE_CELL_HEIGHT

  table.cells.forEach(cell => {
    if (cell.row >= insertAt) {
      cell.row += 1
    } else if (cell.row + cell.rowSpan > insertAt) {
      cell.rowSpan += 1
    }
  })

  table.rows += 1
  table.rowHeights.splice(insertAt, 0, insertedHeight)
  table.height += insertedHeight
  fillMissingTableCells(table)
}

function insertTableColumn(table, colIndex) {
  if (!table) return

  ensureTableTrackSettings(table)

  const insertAt = clampNumber(colIndex, 0, table.cols)
  const sourceIndex = clampNumber(insertAt, 0, Math.max(0, table.colWidths.length - 1))
  const insertedWidth = table.colWidths[sourceIndex] || DEFAULT_TABLE_CELL_WIDTH

  table.cells.forEach(cell => {
    if (cell.col >= insertAt) {
      cell.col += 1
    } else if (cell.col + cell.colSpan > insertAt) {
      cell.colSpan += 1
    }
  })

  table.cols += 1
  table.colWidths.splice(insertAt, 0, insertedWidth)
  table.width += insertedWidth
  fillMissingTableCells(table)
}

function deleteTableRow(table, rowIndex) {
  if (!table || table.rows <= 1) return

  ensureTableTrackSettings(table)

  const targetRow = clampNumber(rowIndex, 0, table.rows - 1)
  const removedHeight = table.rowHeights[targetRow] || table.height / table.rows

  table.cells = table.cells
    .map(cell => {
      if (targetRow >= cell.row && targetRow < cell.row + cell.rowSpan) {
        if (cell.rowSpan <= 1) return null
        cell.rowSpan -= 1
        if (cell.row === targetRow && targetRow < table.rows - 1) cell.row = targetRow
        return cell
      }

      if (cell.row > targetRow) cell.row -= 1

      return cell
    })
    .filter(Boolean)

  table.rows -= 1
  table.rowHeights.splice(targetRow, 1)
  table.height = Math.max(table.rows * 16, table.height - removedHeight)
  fillMissingTableCells(table)
  selectedTableCellIds.value = []
}

function deleteTableColumn(table, colIndex) {
  if (!table || table.cols <= 1) return

  ensureTableTrackSettings(table)

  const targetCol = clampNumber(colIndex, 0, table.cols - 1)
  const removedWidth = table.colWidths[targetCol] || table.width / table.cols

  table.cells = table.cells
    .map(cell => {
      if (targetCol >= cell.col && targetCol < cell.col + cell.colSpan) {
        if (cell.colSpan <= 1) return null
        cell.colSpan -= 1
        if (cell.col === targetCol && targetCol < table.cols - 1) cell.col = targetCol
        return cell
      }

      if (cell.col > targetCol) cell.col -= 1

      return cell
    })
    .filter(Boolean)

  table.cols -= 1
  table.colWidths.splice(targetCol, 1)
  table.width = Math.max(table.cols * 16, table.width - removedWidth)
  fillMissingTableCells(table)
  selectedTableCellIds.value = []
}

function addTableRowFromContext() {
  const { table, cell } = getTableCellContext(contextMenu.value.targetId, contextMenu.value.cellId)

  if (!table || !cell || table.rows >= MAX_TABLE_ROWS) return

  insertTableRow(table, cell.row + cell.rowSpan)
  hideContextMenu()
}

function addTableColumnFromContext() {
  const { table, cell } = getTableCellContext(contextMenu.value.targetId, contextMenu.value.cellId)

  if (!table || !cell || table.cols >= MAX_TABLE_COLS) return

  insertTableColumn(table, cell.col + cell.colSpan)
  hideContextMenu()
}

function deleteTableRowFromContext() {
  const { table, cell } = getTableCellContext(contextMenu.value.targetId, contextMenu.value.cellId)

  if (!table || !cell) return

  deleteTableRow(table, cell.row)
  hideContextMenu()
}

function deleteTableColumnFromContext() {
  const { table, cell } = getTableCellContext(contextMenu.value.targetId, contextMenu.value.cellId)

  if (!table || !cell) return

  deleteTableColumn(table, cell.col)
  hideContextMenu()
}

function splitTableCellVertically(table, cell) {
  if (!table || !cell) return

  ensureTableTrackSettings(table)

  const style = cloneTableCellStyle(cell)

  if (cell.colSpan <= 1) {
    if (table.cols >= MAX_TABLE_COLS) return

    const splitCol = cell.col
    const originalWidth = table.colWidths[splitCol] || DEFAULT_TABLE_CELL_WIDTH
    const leftWidth = Math.max(1, originalWidth / 2)
    const rightWidth = Math.max(1, originalWidth - leftWidth)
    const targetCellId = String(cell.id)
    const newCell = createTableCell(table.id, cell.row, cell.col + 1, {
      rowSpan: cell.rowSpan,
      ...style
    })

    table.colWidths[splitCol] = leftWidth
    table.colWidths.splice(splitCol + 1, 0, rightWidth)
    table.cols += 1

    table.cells.forEach(otherCell => {
      if (String(otherCell.id) === targetCellId) return

      if (otherCell.col > splitCol) {
        otherCell.col += 1
      } else if (otherCell.col <= splitCol && otherCell.col + otherCell.colSpan > splitCol) {
        otherCell.colSpan += 1
      }
    })

    table.cells.push(newCell)
    selectedTableCellIds.value = [cell.id, newCell.id]
    fillMissingTableCells(table)
    return
  }

  const originalSpan = cell.colSpan
  const leftSpan = Math.floor(originalSpan / 2)
  const rightSpan = originalSpan - leftSpan
  const newCell = createTableCell(table.id, cell.row, cell.col + leftSpan, {
    rowSpan: cell.rowSpan,
    colSpan: rightSpan,
    ...style
  })

  cell.colSpan = leftSpan
  table.cells.push(newCell)
  selectedTableCellIds.value = [cell.id, newCell.id]

  fillMissingTableCells(table)
}

function splitTableCellHorizontally(table, cell) {
  if (!table || !cell) return

  ensureTableTrackSettings(table)

  const style = cloneTableCellStyle(cell)

  if (cell.rowSpan <= 1) {
    if (table.rows >= MAX_TABLE_ROWS) return

    const splitRow = cell.row
    const originalHeight = table.rowHeights[splitRow] || DEFAULT_TABLE_CELL_HEIGHT
    const topHeight = Math.max(1, originalHeight / 2)
    const bottomHeight = Math.max(1, originalHeight - topHeight)
    const targetCellId = String(cell.id)
    const newCell = createTableCell(table.id, cell.row + 1, cell.col, {
      colSpan: cell.colSpan,
      ...style
    })

    table.rowHeights[splitRow] = topHeight
    table.rowHeights.splice(splitRow + 1, 0, bottomHeight)
    table.rows += 1

    table.cells.forEach(otherCell => {
      if (String(otherCell.id) === targetCellId) return

      if (otherCell.row > splitRow) {
        otherCell.row += 1
      } else if (otherCell.row <= splitRow && otherCell.row + otherCell.rowSpan > splitRow) {
        otherCell.rowSpan += 1
      }
    })

    table.cells.push(newCell)
    selectedTableCellIds.value = [cell.id, newCell.id]
    fillMissingTableCells(table)
    return
  }

  const originalSpan = cell.rowSpan
  const topSpan = Math.floor(originalSpan / 2)
  const bottomSpan = originalSpan - topSpan
  const newCell = createTableCell(table.id, cell.row + topSpan, cell.col, {
    rowSpan: bottomSpan,
    colSpan: cell.colSpan,
    ...style
  })

  cell.rowSpan = topSpan
  table.cells.push(newCell)
  selectedTableCellIds.value = [cell.id, newCell.id]

  fillMissingTableCells(table)
}

function splitTableCellVerticallyFromContext() {
  const { table, cell } = getTableCellContext(contextMenu.value.targetId, contextMenu.value.cellId)

  splitTableCellVertically(table, cell)
  hideContextMenu()
}

function splitTableCellHorizontallyFromContext() {
  const { table, cell } = getTableCellContext(contextMenu.value.targetId, contextMenu.value.cellId)

  splitTableCellHorizontally(table, cell)
  hideContextMenu()
}

function mergeSelectedTableCells() {
  const table = selectedTable.value
  const cells = selectedTableCells.value

  if (!table || cells.length < 2) return false

  const coverage = new Set()
  const selectedIds = new Set(cells.map(cell => String(cell.id)))
  const minRow = Math.min(...cells.map(cell => cell.row))
  const minCol = Math.min(...cells.map(cell => cell.col))
  const maxRow = Math.max(...cells.map(cell => cell.row + cell.rowSpan - 1))
  const maxCol = Math.max(...cells.map(cell => cell.col + cell.colSpan - 1))

  cells.forEach(cell => {
    for (let row = cell.row; row < cell.row + cell.rowSpan; row += 1) {
      for (let col = cell.col; col < cell.col + cell.colSpan; col += 1) {
        coverage.add(`${row}:${col}`)
      }
    }
  })

  for (let row = minRow; row <= maxRow; row += 1) {
    for (let col = minCol; col <= maxCol; col += 1) {
      if (!coverage.has(`${row}:${col}`)) return false
    }
  }

  const targetCell = cells.find(cell => cell.row === minRow && cell.col === minCol) || cells[0]
  const mergedText = cells
    .map(cell => String(cell.text || '').trim())
    .filter(Boolean)
    .join('\n')

  targetCell.row = minRow
  targetCell.col = minCol
  targetCell.rowSpan = maxRow - minRow + 1
  targetCell.colSpan = maxCol - minCol + 1
  if (mergedText) targetCell.text = mergedText

  table.cells = table.cells.filter(cell => !selectedIds.has(String(cell.id)) || String(cell.id) === String(targetCell.id))
  selectedTableCellIds.value = [targetCell.id]
  fillMissingTableCells(table)

  return true
}

function addTable() {
  const rows = getTableDimensionValue(tableRowsInput.value, MIN_TABLE_ROWS, MAX_TABLE_ROWS, 3)
  const cols = getTableDimensionValue(tableColsInput.value, MIN_TABLE_COLS, MAX_TABLE_COLS, 3)
  const id = Date.now()

  elements.value.push(new TableElement({
    id,
    rows,
    cols,
    width: cols * DEFAULT_TABLE_CELL_WIDTH,
    height: rows * DEFAULT_TABLE_CELL_HEIGHT,
    colWidths: Array.from({ length: cols }, () => DEFAULT_TABLE_CELL_WIDTH),
    rowHeights: Array.from({ length: rows }, () => DEFAULT_TABLE_CELL_HEIGHT),
    cells: createDefaultTableCells(id, rows, cols)
  }))

  nextTick(() => selectElement(id))
}

/* -------------------------
   REFS
--------------------------*/

function setRef(el, id) {
  if (el) {
    nodeRefs.value[id] = el.getNode()
  } else {
    delete nodeRefs.value[id]
  }
}

function clampNumber(value, min, max) {
  const numericValue = Number(value)
  if (!Number.isFinite(numericValue)) return min

  return Math.min(Math.max(numericValue, min), max)
}

function getRulerTicks(length) {
  const unitPixels = rulerUnitPixels.value
  const minorDivisions = rulerMinorDivisions.value
  const minorPixels = unitPixels / minorDivisions
  const tickCount = Math.floor(length / minorPixels)

  return Array.from({ length: tickCount + 1 }, (_, index) => {
    const isMajor = index % minorDivisions === 0
    const isMid = !isMajor && index % (minorDivisions / 2) === 0
    const value = index / minorDivisions

    return {
      key: `${pageUnit.value}-${index}`,
      offset: Math.min(length, Number((index * minorPixels).toFixed(2))),
      isMajor,
      isMid,
      label: isMajor ? String(value) : ''
    }
  })
}

function formatPageDimension(value) {
  return Number(Number(value).toFixed(2))
}

function convertInchesToPageUnit(value) {
  return pageUnit.value === 'cm'
    ? value * CM_PER_INCH
    : value
}

function getPageUnitInches(value) {
  const numericValue = clampNumber(value, pageDimensionMin.value, pageDimensionMax.value)

  return pageUnit.value === 'cm'
    ? numericValue / CM_PER_INCH
    : numericValue
}

function getPageMarginUnitInches(value, edge) {
  const max = ['top', 'bottom'].includes(edge)
    ? pageSizeInches.value.height
    : pageSizeInches.value.width
  const numericValue = clampNumber(value, 0, convertInchesToPageUnit(max))

  return pageUnit.value === 'cm'
    ? numericValue / CM_PER_INCH
    : numericValue
}

function getPresetPageSizeInches(presetValue) {
  const preset = pageSizePresets.find(item => item.value === presetValue)

  if (!preset || preset.value === 'custom') return null

  return {
    width: preset.widthCm / CM_PER_INCH,
    height: preset.heightCm / CM_PER_INCH
  }
}

function getPageMarginPresetInches(presetValue) {
  const preset = pageMarginPresets.find(item => item.value === presetValue)

  return preset?.marginsInches ? { ...preset.marginsInches } : null
}

function getClampedPageMargins(margins) {
  const pageWidth = pageSizeInches.value.width
  const pageHeight = pageSizeInches.value.height
  const top = clampNumber(margins.top, 0, pageHeight)
  const right = clampNumber(margins.right, 0, pageWidth)
  const bottom = clampNumber(margins.bottom, 0, pageHeight)
  const left = clampNumber(margins.left, 0, pageWidth)
  const horizontalScale = left + right > pageWidth && left + right > 0
    ? pageWidth / (left + right)
    : 1
  const verticalScale = top + bottom > pageHeight && top + bottom > 0
    ? pageHeight / (top + bottom)
    : 1

  return {
    top: top * verticalScale,
    right: right * horizontalScale,
    bottom: bottom * verticalScale,
    left: left * horizontalScale
  }
}

function getCanvasBounds() {
  const config = pageConfig.value

  return {
    x: config.x,
    y: config.y,
    width: config.width,
    height: config.height,
    right: config.x + config.width,
    bottom: config.y + config.height
  }
}

function getTopLeftForDropPoint(dropPoint, width, height) {
  const bounds = getCanvasBounds()
  const itemWidth = Math.max(1, Number(width) || 1)
  const itemHeight = Math.max(1, Number(height) || 1)
  const maxX = Math.max(bounds.x, bounds.right - itemWidth)
  const maxY = Math.max(bounds.y, bounds.bottom - itemHeight)

  return {
    x: clampNumber((dropPoint?.x ?? bounds.x) - itemWidth / 2, bounds.x, maxX),
    y: clampNumber((dropPoint?.y ?? bounds.y) - itemHeight / 2, bounds.y, maxY)
  }
}

function getCenterForDropPoint(dropPoint, width, height) {
  const bounds = getCanvasBounds()
  const itemWidth = Math.max(1, Number(width) || 1)
  const itemHeight = Math.max(1, Number(height) || 1)
  const horizontalInset = Math.min(itemWidth / 2, bounds.width / 2)
  const verticalInset = Math.min(itemHeight / 2, bounds.height / 2)

  return {
    x: clampNumber(dropPoint?.x ?? bounds.x + bounds.width / 2, bounds.x + horizontalInset, bounds.right - horizontalInset),
    y: clampNumber(dropPoint?.y ?? bounds.y + bounds.height / 2, bounds.y + verticalInset, bounds.bottom - verticalInset)
  }
}

function getLinePositionForDropPoint(item, dropPoint) {
  const bounds = getCanvasBounds()
  const lineBounds = getLineLocalBounds(item)
  const maxX = Math.max(bounds.x - lineBounds.minX, bounds.right - lineBounds.minX - lineBounds.width)
  const maxY = Math.max(bounds.y - lineBounds.minY, bounds.bottom - lineBounds.minY - lineBounds.height)

  return {
    x: clampNumber(
      (dropPoint?.x ?? bounds.x + bounds.width / 2) - lineBounds.minX - lineBounds.width / 2,
      bounds.x - lineBounds.minX,
      maxX
    ),
    y: clampNumber(
      (dropPoint?.y ?? bounds.y + bounds.height / 2) - lineBounds.minY - lineBounds.height / 2,
      bounds.y - lineBounds.minY,
      maxY
    )
  }
}

function placeCanvasElementAtDropPoint(item, dropPoint) {
  if (!item || !dropPoint) return item

  const dimensions = getFallbackElementPixelDimensions(item) || { width: 1, height: 1 }

  if (item.type === 'circle' || regularPolygonShapeTypes.includes(item.type)) {
    const center = getCenterForDropPoint(dropPoint, dimensions.width, dimensions.height)

    item.x = center.x
    item.y = center.y
    return item
  }

  if (item.type === 'line' || item.type === 'arrow') {
    const position = getLinePositionForDropPoint(item, dropPoint)

    item.x = position.x
    item.y = position.y
    return item
  }

  const position = getTopLeftForDropPoint(dropPoint, dimensions.width, dimensions.height)

  item.x = position.x
  item.y = position.y
  return item
}

function getItemCoordinate(item, key) {
  const value = Number(item?.[key])

  return Number.isFinite(value) ? value : 0
}

function shouldKeepRuntimeCloneReference(key, value) {
  if (['image', 'richImage', 'shapeRichImage'].includes(key)) return true

  return Boolean(
    value &&
    typeof window !== 'undefined' &&
    typeof window.Element !== 'undefined' &&
    value instanceof window.Element
  )
}

function cloneCanvasItemValue(value, key = '') {
  if (shouldKeepRuntimeCloneReference(key, value)) return value

  if (Array.isArray(value)) return value.map(entry => cloneCanvasItemValue(entry))

  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([entryKey, entryValue]) => [
        entryKey,
        cloneCanvasItemValue(entryValue, entryKey)
      ])
    )
  }

  return value
}

function cloneCanvasItem(item) {
  return cloneCanvasItemValue(item)
}

function getSelectedItemsBounds(items) {
  const rects = items
    .map(item => nodeRefs.value[item.id]?.getClientRect())
    .filter(Boolean)

  if (!rects.length || rects.length !== items.length) return null

  const x = Math.min(...rects.map(rect => rect.x))
  const y = Math.min(...rects.map(rect => rect.y))
  const right = Math.max(...rects.map(rect => rect.x + rect.width))
  const bottom = Math.max(...rects.map(rect => rect.y + rect.height))

  return {
    x,
    y,
    width: Math.max(1, right - x),
    height: Math.max(1, bottom - y)
  }
}

function getSelectedItemRects(items) {
  return items
    .map(item => {
      const rect = nodeRefs.value[item.id]?.getClientRect()

      return rect ? { item, rect } : null
    })
    .filter(Boolean)
}

function getRectsBounds(rects) {
  if (!rects.length) return null

  const x = Math.min(...rects.map(({ rect }) => rect.x))
  const y = Math.min(...rects.map(({ rect }) => rect.y))
  const right = Math.max(...rects.map(({ rect }) => rect.x + rect.width))
  const bottom = Math.max(...rects.map(({ rect }) => rect.y + rect.height))

  return {
    x,
    y,
    right,
    bottom,
    centerX: x + (right - x) / 2,
    centerY: y + (bottom - y) / 2
  }
}

function moveCanvasItemByDelta(item, dx, dy) {
  item.x = getItemCoordinate(item, 'x') + dx
  item.y = getItemCoordinate(item, 'y') + dy
}

function getGroupedCanvasItem(item, groupX, groupY) {
  const child = cloneCanvasItem(item)

  child.x = getItemCoordinate(item, 'x') - groupX
  child.y = getItemCoordinate(item, 'y') - groupY

  return child
}

function getUngroupedCanvasItem(item, group) {
  const child = cloneCanvasItem(item)

  child.x = getItemCoordinate(item, 'x') + getItemCoordinate(group, 'x')
  child.y = getItemCoordinate(item, 'y') + getItemCoordinate(group, 'y')

  return child
}

function getGroupConfig(item) {
  return {
    x: item.x,
    y: item.y,
    rotation: item.rotation || 0,
    draggable: item.draggable !== false
  }
}

function getGroupHitAreaConfig(item) {
  return {
    x: 0,
    y: 0,
    width: item.width,
    height: item.height,
    fill: 'rgba(0,0,0,0)'
  }
}

function getGroupedChildConfig(config) {
  return {
    ...config,
    draggable: false,
    listening: false
  }
}

function getGroupedTextConfig(item) {
  return getGroupedChildConfig(getTextConfig(item))
}

function getGroupedRichTextImageConfig(item) {
  return getGroupedChildConfig(getRichTextImageConfig(item))
}

function getGroupedTextBorderConfig(item) {
  return getGroupedChildConfig(getTextBorderConfig(item))
}

function getGroupedImageBoxConfig(item) {
  return getGroupedChildConfig(getImageBoxConfig(item))
}

function getGroupedImageContentConfig(item) {
  return getGroupedChildConfig(getImageContentConfig(item))
}

function getGroupedImageBorderConfig(item) {
  return getGroupedChildConfig(getImageBorderConfig(item))
}

function getGroupedRectConfig(item) {
  return getGroupedChildConfig(getRectConfig(item))
}

function getGroupedChartBoxConfig(item) {
  return getGroupedChildConfig(getChartBoxConfig(item))
}

function getGroupedChartBorderConfig(item) {
  return getGroupedChildConfig(getChartBorderConfig(item))
}

function getGroupedPieChartBoxConfig(item) {
  return getGroupedChildConfig(getPieChartBoxConfig(item))
}

function getGroupedShapeTextImageConfig(item) {
  return getGroupedChildConfig(getShapeTextImageConfig(item))
}

function ensureImageSettings(item) {
  if (!item || item.type !== 'image') return

  Object.entries(defaultImageSettings).forEach(([key, value]) => {
    if (item[key] === undefined) item[key] = value
  })
}

function ensureChartSettings(item) {
  if (!item || item.type !== 'chart') return

  if (item.yAxisValues === undefined && item.chartData !== undefined) {
    item.yAxisValues = item.chartData
  }

  Object.entries(defaultChartSettings).forEach(([key, value]) => {
    if (item[key] === undefined) item[key] = value
  })
}

function ensurePieChartSettings(item) {
  if (!item || item.type !== 'pieChart') return

  Object.entries(defaultPieChartSettings).forEach(([key, value]) => {
    if (item[key] === undefined) {
      item[key] = Array.isArray(value) ? [...value] : value
    }
  })

  if (!Array.isArray(item.sliceColors)) item.sliceColors = [...defaultPieChartColors]

  item.backgroundColor = getHexColor(item.backgroundColor, defaultPieChartSettings.backgroundColor)
  item.labelColor = getHexColor(item.labelColor, defaultPieChartSettings.labelColor)
  item.sliceColors = item.sliceColors.map((color, index) => (
    getHexColor(color, defaultPieChartColors[index % defaultPieChartColors.length])
  ))
}

function ensureLabelSettings(item) {
  if (!item || item.type !== 'label') return

  if (!item.tag) item.tag = {}
  if (item.tag.fill === undefined) item.tag.fill = '#3498db'
  item.tag.fill = getHexColor(item.tag.fill, '#3498db')
  if (item.tag.cornerRadius === undefined) item.tag.cornerRadius = 4
  if (item.opacity === undefined) item.opacity = 1
  if (!item.textConfig) item.textConfig = {}
  if (item.textConfig.fontSize === undefined) item.textConfig.fontSize = 14
  if (item.textConfig.fill === undefined) item.textConfig.fill = '#ffffff'
  item.textConfig.fill = getHexColor(item.textConfig.fill, '#ffffff')
  if (item.textConfig.fontFamily === undefined) item.textConfig.fontFamily = fontOptions[0].value
  if (item.textConfig.padding === undefined) item.textConfig.padding = 5
}

function ensureTextSettings(item) {
  if (!item || item.type !== 'text') return

  item.fontSize = getFontSizeValue(item.fontSize ?? defaultTextSettings.fontSize)
  item.lineHeight = getTextLineHeightValue(item.lineHeight ?? defaultTextSettings.lineHeight)
  item.letterSpacing = getTextLetterSpacingValue(item.letterSpacing ?? defaultTextSettings.letterSpacing)
}

function getNormalizedTextFontSize(value) {
  if (value === null || value === undefined || value === '') return null

  return Math.round(clampNumber(Number.parseFloat(value), 8, 144))
}

function getFontSizeValue(value) {
  return getNormalizedTextFontSize(value) || 20
}

function getTextLineHeightValue(value) {
  const numericValue = Number.parseFloat(value)
  const resolvedValue = Number.isFinite(numericValue) ? numericValue : defaultTextSettings.lineHeight

  return Number(clampNumber(resolvedValue, 0.8, 3).toFixed(2))
}

function getTextLetterSpacingValue(value) {
  const numericValue = Number.parseFloat(value)
  const resolvedValue = Number.isFinite(numericValue) ? numericValue : defaultTextSettings.letterSpacing

  return Number(clampNumber(resolvedValue, -10, 40).toFixed(1))
}

function rerenderTextRichImage(item) {
  if (!item || item.type !== 'text' || item.id === editingId.value || !item.richText) return

  const width = item.width || 240
  const height = item.height || Math.ceil((item.fontSize || defaultTextSettings.fontSize) * (item.lineHeight || defaultTextSettings.lineHeight))

  renderRichText(item, item.richText, width, height)
}

function setTextFontSize(item, value) {
  if (!item || item.type !== 'text') return

  ensureTextSettings(item)
  item.fontSize = getFontSizeValue(value)
  rerenderTextRichImage(item)
}

function setTextLineHeight(item, value) {
  if (!item || item.type !== 'text') return

  ensureTextSettings(item)
  item.lineHeight = getTextLineHeightValue(value)
  rerenderTextRichImage(item)
}

function setTextLetterSpacing(item, value) {
  if (!item || item.type !== 'text') return

  ensureTextSettings(item)
  item.letterSpacing = getTextLetterSpacingValue(value)
  rerenderTextRichImage(item)
}

function setLabelFontSize(item, value) {
  ensureLabelSettings(item)
  if (!item || item.type !== 'label') return

  item.textConfig.fontSize = getFontSizeValue(value)
}

function canShapeHaveFill(item) {
  return fillableShapeTypes.includes(item?.type)
}

function canShapeHaveCornerRadius(item) {
  return item?.type === 'rect'
}

function getShapeStrokeWidthMin(item) {
  return item?.type === 'line' ? 1 : 0
}

function getShapeCornerRadiusMax(item) {
  if (!item || item.type !== 'rect') return 0

  return Math.floor(Math.min(item.width || 0, item.height || 0) / 2)
}

function getCornerRadiusMax(item) {
  if (!item) return 0

  if (item.type === 'image' || item.type === 'rect') {
    return Math.floor(Math.min(item.width || 0, item.height || 0) / 2)
  }

  return 0
}

function getCornerRadiusValues(item) {
  const max = getCornerRadiusMax(item)
  const source = item?.cornerRadius
  let values

  if (Array.isArray(source)) {
    values = source
  } else if (typeof source === 'object' && source) {
    values = [
      source.topLeft,
      source.topRight,
      source.bottomRight,
      source.bottomLeft
    ]
  } else {
    values = [source, source, source, source]
  }

  return values.map(value => Math.round(clampNumber(value, 0, max)))
}

function getCornerRadiusValue(item, index) {
  return getCornerRadiusValues(item)[index] || 0
}

function setCornerRadiusValue(item, index, value) {
  if (!item) return

  const values = getCornerRadiusValues(item)
  values[index] = Math.round(clampNumber(value, 0, getCornerRadiusMax(item)))
  item.cornerRadius = values
}

function getCornerRadiusConfig(item) {
  return getCornerRadiusValues(item)
}

function getShapePanelTitle(item) {
  return `${shapeLabels[item?.type] || 'Shape'} Settings`
}

function getShapeBorderStyle(value) {
  const borderStyle = String(value || '').trim()

  if (borderStyleValues.has(borderStyle)) return borderStyle

  return borderStyleAliases[borderStyle.toLowerCase()] || defaultShapeSettings.borderStyle
}

function getShapeBorderStyleFromDash(dash) {
  if (!Array.isArray(dash) || !dash.length) return defaultShapeSettings.borderStyle

  const pattern = dash
    .map(value => Number(value))
    .filter(value => Number.isFinite(value) && value > 0)

  if (pattern.length >= 4) return 'dashDot'
  if (pattern[0] <= 2) return 'dotted'

  return 'dashed'
}

function getBorderWidthValue(value) {
  return Math.round(clampNumber(value, 0, 24))
}

function getBorderDash(borderStyleValue, borderWidthValue) {
  const borderStyle = getShapeBorderStyle(borderStyleValue)
  const borderWidth = Math.max(1, Number(borderWidthValue) || defaultShapeSettings.strokeWidth)
  const gapLength = Math.max(3, Math.round(borderWidth * 2))
  const dashLength = Math.max(6, Math.round(borderWidth * 4))
  const dotLength = Math.max(1, Math.round(borderWidth))

  if (borderStyle === 'dashed') return [dashLength, gapLength]
  if (borderStyle === 'dotted') return [dotLength, gapLength]
  if (borderStyle === 'dashDot') return [dashLength, gapLength, dotLength, gapLength]

  return []
}

function getBorderLineConfig(borderStyleValue, borderWidthValue) {
  const dash = getBorderDash(borderStyleValue, borderWidthValue)

  return {
    dash,
    dashEnabled: dash.length > 0,
    ...(dash.length ? { lineCap: 'round' } : {})
  }
}

function getShapeBorderDash(item) {
  return getBorderDash(item?.borderStyle, item?.strokeWidth)
}

function getShapeBorderConfig(item) {
  return getBorderLineConfig(item?.borderStyle, item?.strokeWidth)
}

function getElementBorderColor(item) {
  return getHexColor(item?.borderColor, defaultElementBorderSettings.borderColor)
}

function getElementBorderConfig(item, config = {}) {
  const borderWidth = getBorderWidthValue(item?.borderWidth ?? defaultElementBorderSettings.borderWidth)

  return {
    x: config.x ?? 0,
    y: config.y ?? 0,
    width: Math.max(1, Number(config.width) || 1),
    height: Math.max(1, Number(config.height) || 1),
    rotation: config.rotation || 0,
    fill: 'rgba(0,0,0,0)',
    stroke: getElementBorderColor(item),
    strokeWidth: borderWidth,
    cornerRadius: config.cornerRadius ?? 0,
    visible: borderWidth > 0 && config.visible !== false,
    listening: false,
    ...getBorderLineConfig(item?.borderStyle, borderWidth)
  }
}

function getHexColor(value, fallback) {
  const color = String(value || '').trim().toLowerCase()
  const namedColors = {
    black: '#000000',
    white: '#ffffff',
    red: '#ff0000',
    skyblue: '#87ceeb',
    transparent: fallback
  }

  if (/^#[\da-f]{6}$/i.test(color)) return color

  if (/^#[\da-f]{3}$/i.test(color)) {
    return `#${color[1]}${color[1]}${color[2]}${color[2]}${color[3]}${color[3]}`
  }

  const rgbMatch = color.match(/^rgba?\(([^)]+)\)$/)

  if (rgbMatch) {
    const channels = rgbMatch[1]
      .split(',')
      .slice(0, 3)
      .map(channel => Math.round(clampNumber(Number.parseFloat(channel), 0, 255)))

    if (channels.length === 3 && channels.every(Number.isFinite)) {
      return `#${channels.map(channel => channel.toString(16).padStart(2, '0')).join('')}`
    }
  }

  return namedColors[color] || fallback
}

function canElementHaveBorder(item) {
  return borderableElementTypes.includes(item?.type)
}

function ensureElementBorderSettings(item) {
  if (!canElementHaveBorder(item)) return

  if (item.borderColor === undefined) item.borderColor = defaultElementBorderSettings.borderColor
  if (item.borderWidth === undefined) item.borderWidth = defaultElementBorderSettings.borderWidth
  if (item.borderStyle === undefined) item.borderStyle = getShapeBorderStyleFromDash(item.dash)

  item.borderColor = getElementBorderColor(item)
  item.borderWidth = getBorderWidthValue(item.borderWidth)
  item.borderStyle = getShapeBorderStyle(item.borderStyle)
}

function ensureShapeSettings(item) {
  if (!item || !shapeTypes.includes(item.type)) return

  if (item.stroke === undefined) item.stroke = defaultShapeSettings.stroke
  if (item.strokeWidth === undefined) item.strokeWidth = defaultShapeSettings.strokeWidth
  if (item.borderStyle === undefined) item.borderStyle = getShapeBorderStyleFromDash(item.dash)
  if (item.opacity === undefined) item.opacity = defaultShapeSettings.opacity

  item.stroke = getHexColor(item.stroke, defaultShapeSettings.stroke)
  item.borderStyle = getShapeBorderStyle(item.borderStyle)

  if (canShapeHaveFill(item) && item.fill === undefined) {
    item.fill = defaultShapeFills[item.type]
  }

  if (canShapeHaveFill(item)) {
    item.fill = getHexColor(item.fill, defaultShapeFills[item.type])
  }

  if (canShapeHaveCornerRadius(item) && item.cornerRadius === undefined) {
    item.cornerRadius = 0
  }

  if (item.type === 'line' || item.type === 'arrow') {
    if (item.lineCap === undefined) item.lineCap = 'round'
    if (item.lineJoin === undefined) item.lineJoin = 'round'
  }

  if (item.type === 'line') {
    if (item.hitStrokeWidth === undefined) {
      item.hitStrokeWidth = Math.max(defaultLineHitStrokeWidth, item.strokeWidth || 0)
    }
  }
}

function canShapeHaveRichText(item) {
  return item && ['rect', 'circle', 'polygon', 'triangle', 'line'].includes(item.type)
}

function getEditingTextBaseFontSize(item = editingItem.value) {
  if (editingTextTarget.value === 'shape') return item?.shapeTextFontSize || 20

  return item?.fontSize || 20
}

function getEditingTextColor(item = editingItem.value) {
  if (editingTextTarget.value === 'shape') return item?.shapeTextFill || '#111111'

  return item?.fill || '#111111'
}

function getEditingTextFontFamily(item = editingItem.value) {
  if (editingTextTarget.value === 'shape') return item?.shapeTextFontFamily || 'Arial, sans-serif'

  return item?.fontFamily || 'Arial, sans-serif'
}

function getEditingTextLineHeight(item = editingItem.value) {
  return item?.lineHeight ?? defaultTextSettings.lineHeight
}

function getEditingTextLetterSpacing(item = editingItem.value) {
  return item?.letterSpacing ?? defaultTextSettings.letterSpacing
}

function ensureShapeTextSettings(item) {
  if (!canShapeHaveRichText(item)) return

  const defaultSize = getDefaultShapeTextSize(item)

  if (item.shapeText === undefined) item.shapeText = 'Text'
  if (item.shapeRichText === undefined) item.shapeRichText = `<p>${escapeHtml(item.shapeText)}</p>`
  if (item.shapeTextFontSize === undefined) item.shapeTextFontSize = 20
  if (item.shapeTextFill === undefined) item.shapeTextFill = '#111111'
  if (item.shapeTextFontFamily === undefined) item.shapeTextFontFamily = 'Arial, sans-serif'
  if (item.shapeTextLineHeight === undefined) item.shapeTextLineHeight = 1.35
  if (item.shapeTextWidth === undefined) item.shapeTextWidth = defaultSize.width
  if (item.shapeTextHeight === undefined) item.shapeTextHeight = defaultSize.height
}

function getRotatedPoint(originX, originY, localX, localY, rotation = 0) {
  const angle = rotation * Math.PI / 180
  const cos = Math.cos(angle)
  const sin = Math.sin(angle)

  return {
    x: originX + localX * cos - localY * sin,
    y: originY + localX * sin + localY * cos
  }
}

function getLineRawBounds(item) {
  const points = item.points || []
  const xs = []
  const ys = []

  for (let index = 0; index < points.length; index += 2) {
    xs.push(points[index])
    ys.push(points[index + 1])
  }

  if (!xs.length || !ys.length) {
    return {
      minX: 0,
      minY: 0,
      width: 160,
      height: 0,
      pointCount: 0
    }
  }

  const minX = Math.min(...xs)
  const maxX = Math.max(...xs)
  const minY = Math.min(...ys)
  const maxY = Math.max(...ys)

  return {
    minX,
    minY,
    width: maxX - minX,
    height: maxY - minY,
    pointCount: xs.length
  }
}

function getLineLocalBounds(item) {
  const bounds = getLineRawBounds(item)

  return {
    ...bounds,
    width: Math.max(1, bounds.width),
    height: Math.max(1, bounds.height)
  }
}

function getFallbackElementPixelDimensions(item) {
  if (!item) return null

  const rotation = Number(item.rotation) || 0

  if (['text', 'image', 'rect', 'rightTriangle', 'chart', 'pieChart', 'table', 'group'].includes(item.type)) {
    return {
      width: Math.max(0, Number(item.width) || 0),
      height: Math.max(0, Number(item.height) || 0),
      rotation
    }
  }

  if (item.type === 'circle' || regularPolygonShapeTypes.includes(item.type)) {
    const diameter = Math.max(0, (Number(item.radius) || 0) * 2)

    return {
      width: diameter,
      height: diameter,
      rotation
    }
  }

  if (item.type === 'line' || item.type === 'arrow') {
    const bounds = getLineLocalBounds(item)

    return {
      width: bounds.width,
      height: bounds.height,
      rotation
    }
  }

  if (item.type === 'label') {
    const fontSize = Number(item.textConfig?.fontSize) || 14
    const padding = Number(item.textConfig?.padding) || 0
    const text = String(item.text || '')

    return {
      width: text.length * fontSize * 0.65 + padding * 2,
      height: fontSize + padding * 2,
      rotation
    }
  }

  return null
}

function getElementPixelDimensions(item) {
  const fallback = getFallbackElementPixelDimensions(item)
  const rect = item ? nodeRefs.value[item.id]?.getClientRect?.() : null

  if (rect) {
    return {
      width: Math.max(0, rect.width),
      height: Math.max(0, rect.height)
    }
  }

  return fallback
}

function formatDimensionNumber(value, decimals = 2) {
  const numericValue = Number(value)

  if (!Number.isFinite(numericValue)) return '0'

  return Number(numericValue.toFixed(decimals)).toString()
}

function formatDimensionPair(width, height, unit, decimals = 2) {
  return `${formatDimensionNumber(width, decimals)} x ${formatDimensionNumber(height, decimals)} ${unit}`
}

function getElementDimensionReadout(item) {
  const dimensions = getElementPixelDimensions(item)

  if (!dimensions) return null

  const widthPx = dimensions.width
  const heightPx = dimensions.height
  const widthInches = widthPx / PX_PER_INCH
  const heightInches = heightPx / PX_PER_INCH
  const widthCm = widthInches * CM_PER_INCH
  const heightCm = heightInches * CM_PER_INCH

  return {
    px: formatDimensionPair(widthPx, heightPx, 'px', 0),
    cm: formatDimensionPair(widthCm, heightCm, 'cm'),
    in: formatDimensionPair(widthInches, heightInches, 'in')
  }
}

function canEditElementDimensions(item) {
  return dimensionEditableTypes.includes(item?.type)
}

function getEditableElementDimensions(item) {
  if (!canEditElementDimensions(item)) return null

  if (item.type === 'image' || item.type === 'rect' || item.type === 'rightTriangle' || item.type === 'table') {
    return {
      width: Math.max(1, Number(item.width) || 1),
      height: Math.max(1, Number(item.height) || 1)
    }
  }

  if (item.type === 'circle' || regularPolygonShapeTypes.includes(item.type)) {
    const diameter = Math.max(1, (Number(item.radius) || 0) * 2)

    return {
      width: diameter,
      height: diameter
    }
  }

  if (item.type === 'line' || item.type === 'arrow') {
    const bounds = getLineLocalBounds(item)

    return {
      width: bounds.width,
      height: bounds.height
    }
  }

  return null
}

function getEditableElementDimensionValue(item, dimension) {
  const dimensions = getEditableElementDimensions(item)

  return dimensions ? formatDimensionNumber(dimensions[dimension], 0) : '1'
}

function getDimensionInputValue(value, fallback) {
  const numericValue = Math.round(Number.parseFloat(value))

  if (!Number.isFinite(numericValue)) return Math.max(1, Math.round(fallback || 1))

  return Math.max(1, numericValue)
}

function normalizeElementRotation(value, fallback = 0) {
  const numericValue = Number.parseFloat(value)

  if (!Number.isFinite(numericValue)) return normalizeElementRotation(fallback, 0)

  const normalized = ((numericValue + 180) % 360 + 360) % 360 - 180

  if (normalized === -180 && numericValue > 0) return 180

  return Number(normalized.toFixed(2))
}

function canEditElementRotation(item) {
  return Boolean(item && !item.tableGroup && item.type !== 'group' && selectedIds.value.length <= 1)
}

function getElementRotationValue(item) {
  return formatDimensionNumber(normalizeElementRotation(item?.rotation || 0), 2)
}

function setElementRotation(item, value) {
  if (!canEditElementRotation(item)) return

  item.rotation = normalizeElementRotation(value, item.rotation || 0)
  updateTransformerSelection()
}

function resizeLineElementDimension(item, dimension, targetValue) {
  const points = Array.isArray(item.points) ? item.points : []
  const bounds = getLineRawBounds(item)
  const pointCount = Math.max(1, bounds.pointCount || points.length / 2)
  const targetWidth = dimension === 'width' ? targetValue : bounds.width
  const targetHeight = dimension === 'height' ? targetValue : bounds.height
  const nextPoints = []

  for (let index = 0; index < points.length; index += 2) {
    const pointIndex = index / 2
    const x = Number(points[index]) || 0
    const y = Number(points[index + 1]) || 0
    const fallbackRatio = pointCount > 1 ? pointIndex / (pointCount - 1) : 0
    const xRatio = bounds.width
      ? (x - bounds.minX) / bounds.width
      : fallbackRatio
    const yRatio = bounds.height
      ? (y - bounds.minY) / bounds.height
      : fallbackRatio

    nextPoints.push(
      bounds.minX + xRatio * targetWidth,
      bounds.minY + yRatio * targetHeight
    )
  }

  item.points = nextPoints
}

function setEditableElementDimension(item, dimension, value) {
  if (!canEditElementDimensions(item)) return

  const currentDimensions = getEditableElementDimensions(item)
  const targetValue = getDimensionInputValue(value, currentDimensions?.[dimension])

  if (item.type === 'image' || item.type === 'rect' || item.type === 'rightTriangle' || item.type === 'table') {
    item[dimension] = targetValue
  } else if (item.type === 'circle' || regularPolygonShapeTypes.includes(item.type)) {
    item.radius = targetValue / 2
  } else if (item.type === 'line' || item.type === 'arrow') {
    resizeLineElementDimension(item, dimension, targetValue)
  }

  updateTransformerSelection()
}

function getShapeTextCenter(item) {
  const rotation = item.rotation || 0

  if (item.type === 'rect' || item.type === 'rightTriangle') {
    return getRotatedPoint(
      item.x || 0,
      item.y || 0,
      (item.width || 0) / 2,
      (item.height || 0) / 2,
      rotation
    )
  }

  if (item.type === 'circle' || regularPolygonShapeTypes.includes(item.type)) {
    return {
      x: item.x || 0,
      y: item.y || 0
    }
  }

  const bounds = getLineLocalBounds(item)

  return getRotatedPoint(
    item.x || 0,
    item.y || 0,
    bounds.minX + bounds.width / 2,
    bounds.minY + bounds.height / 2,
    rotation
  )
}

function getDefaultShapeTextSize(item) {
  if (item.type === 'rect' || item.type === 'rightTriangle') {
    return {
      width: Math.max(80, (item.width || 120) * 0.8),
      height: Math.max(32, Math.min(80, (item.height || 80) * 0.6))
    }
  }

  if (item.type === 'circle' || regularPolygonShapeTypes.includes(item.type)) {
    const radius = item.radius || 50

    return {
      width: Math.max(80, radius * 1.4),
      height: Math.max(32, Math.min(80, radius * 0.8))
    }
  }

  const bounds = getLineLocalBounds(item)

  return {
    width: Math.max(100, Math.min(240, bounds.width)),
    height: 36
  }
}

function getShapeTextBox(item) {
  const center = getShapeTextCenter(item)
  const defaultSize = getDefaultShapeTextSize(item)

  return {
    center,
    width: item.shapeTextWidth || defaultSize.width,
    height: item.shapeTextHeight || defaultSize.height,
    rotation: item.rotation || 0
  }
}

function getShapeTextImageConfig(item) {
  const box = getShapeTextBox(item)

  return {
    x: box.center.x,
    y: box.center.y,
    width: box.width,
    height: box.height,
    offsetX: box.width / 2,
    offsetY: box.height / 2,
    rotation: box.rotation,
    image: item.shapeRichImage,
    listening: false,
    visible: !(item.id === editingId.value && editingTextTarget.value === 'shape')
  }
}

function getTextConfig(item) {
  const { richText, richTextJson, richImage, ...config } = item
  return {
    ...config,
    fontSize: item.fontSize ?? defaultTextSettings.fontSize,
    lineHeight: item.lineHeight ?? defaultTextSettings.lineHeight,
    letterSpacing: item.letterSpacing ?? defaultTextSettings.letterSpacing,
    visible: item.id !== editingId.value
  }
}

function getTextBorderConfig(item) {
  return getElementBorderConfig(item, {
    x: item.x,
    y: item.y,
    width: item.width,
    height: item.height,
    rotation: item.rotation || 0,
    visible: item.id !== editingId.value
  })
}

function getRectConfig(item) {
  return {
    ...item,
    stroke: item.stroke ?? defaultShapeSettings.stroke,
    strokeWidth: item.strokeWidth ?? defaultShapeSettings.strokeWidth,
    opacity: item.opacity ?? defaultShapeSettings.opacity,
    fill: item.fill ?? defaultShapeFills.rect,
    cornerRadius: getCornerRadiusConfig(item),
    ...getShapeBorderConfig(item)
  }
}

function getCircleConfig(item) {
  return {
    ...item,
    stroke: item.stroke ?? defaultShapeSettings.stroke,
    strokeWidth: item.strokeWidth ?? defaultShapeSettings.strokeWidth,
    opacity: item.opacity ?? defaultShapeSettings.opacity,
    fill: item.fill ?? defaultShapeFills.circle,
    ...getShapeBorderConfig(item)
  }
}

function getRegularPolygonConfig(item) {
  return {
    ...item,
    stroke: item.stroke ?? defaultShapeSettings.stroke,
    strokeWidth: item.strokeWidth ?? defaultShapeSettings.strokeWidth,
    opacity: item.opacity ?? defaultShapeSettings.opacity,
    fill: item.fill ?? defaultShapeFills[item.type],
    ...getShapeBorderConfig(item)
  }
}

function getRightTriangleConfig(item) {
  const width = Math.max(1, Number(item.width) || 1)
  const height = Math.max(1, Number(item.height) || 1)

  return {
    x: item.x,
    y: item.y,
    width,
    height,
    points: [0, height, 0, 0, width, height],
    closed: true,
    fill: item.fill ?? defaultShapeFills.rightTriangle,
    stroke: item.stroke ?? defaultShapeSettings.stroke,
    strokeWidth: item.strokeWidth ?? defaultShapeSettings.strokeWidth,
    opacity: item.opacity ?? defaultShapeSettings.opacity,
    lineJoin: 'round',
    rotation: item.rotation || 0,
    draggable: item.draggable !== false,
    ...getShapeBorderConfig(item)
  }
}

function getLineConfig(item) {
  return {
    ...item,
    stroke: item.stroke ?? defaultShapeSettings.stroke,
    strokeWidth: item.strokeWidth ?? defaultShapeSettings.strokeWidth,
    opacity: item.opacity ?? defaultShapeSettings.opacity,
    lineCap: item.lineCap ?? 'round',
    lineJoin: item.lineJoin ?? 'round',
    hitStrokeWidth: item.hitStrokeWidth ?? Math.max(defaultLineHitStrokeWidth, item.strokeWidth || 0),
    draggable: item.draggable !== false,
    ...getShapeBorderConfig(item)
  }
}

function getArrowConfig(item) {
  return {
    ...item,
    stroke: item.stroke ?? defaultShapeSettings.stroke,
    strokeWidth: item.strokeWidth ?? defaultShapeSettings.strokeWidth,
    opacity: item.opacity ?? defaultShapeSettings.opacity,
    lineCap: item.lineCap ?? 'round',
    lineJoin: item.lineJoin ?? 'round',
    draggable: item.draggable !== false,
    ...getShapeBorderConfig(item)
  }
}

function getRichTextImageConfig(item) {
  return {
    x: item.x,
    y: item.y,
    width: item.width,
    height: item.height,
    rotation: item.rotation || 0,
    draggable: item.draggable,
    image: item.richImage,
    visible: item.id !== editingId.value
  }
}

function getImageBoxConfig(item) {
  return {
    x: item.x,
    y: item.y,
    width: item.width,
    height: item.height,
    rotation: item.rotation || 0,
    draggable: item.draggable
  }
}

function getImageHitAreaConfig(item) {
  return {
    x: 0,
    y: 0,
    width: item.width,
    height: item.height,
    fill: 'rgba(0,0,0,0)'
  }
}

function getImageBorderConfig(item) {
  return getElementBorderConfig(item, {
    width: item.width,
    height: item.height,
    cornerRadius: getCornerRadiusConfig(item)
  })
}

function getLabelConfig(item) {
  return {
    x: item.x,
    y: item.y,
    draggable: item.draggable,
    rotation: item.rotation || 0,
    opacity: item.opacity ?? 1
  }
}

function getLabelTagConfig(item) {
  const borderWidth = getBorderWidthValue(item?.borderWidth ?? defaultElementBorderSettings.borderWidth)

  return {
    ...item.tag,
    stroke: getElementBorderColor(item),
    strokeWidth: borderWidth,
    ...getBorderLineConfig(item?.borderStyle, borderWidth)
  }
}

function getLabelTextConfig(item) {
  return {
    ...item.textConfig,
    text: item.text
  }
}

function getImageCropRect(item) {
  const imageWidth = item.image?.naturalWidth || item.image?.width || item.width || 1
  const imageHeight = item.image?.naturalHeight || item.image?.height || item.height || 1
  const left = clampNumber(item.cropLeft, 0, 95)
  const right = Math.min(clampNumber(item.cropRight, 0, 95), 95 - left)
  const top = clampNumber(item.cropTop, 0, 95)
  const bottom = Math.min(clampNumber(item.cropBottom, 0, 95), 95 - top)
  const cropX = imageWidth * left / 100
  const cropY = imageHeight * top / 100
  const cropWidth = Math.max(1, imageWidth * (100 - left - right) / 100)
  const cropHeight = Math.max(1, imageHeight * (100 - top - bottom) / 100)

  return {
    x: cropX,
    y: cropY,
    width: cropWidth,
    height: cropHeight
  }
}

function getImageContentConfig(item) {
  const boxWidth = Math.max(1, item.width || 1)
  const boxHeight = Math.max(1, item.height || 1)
  const cropRect = getImageCropRect(item)
  const cropAspectRatio = cropRect.width / cropRect.height
  const boxAspectRatio = boxWidth / boxHeight
  const isCover = (item.objectFit || defaultImageSettings.objectFit) === 'cover'

  let displayX = 0
  let displayY = 0
  let displayWidth = boxWidth
  let displayHeight = boxHeight
  let cropX = cropRect.x
  let cropY = cropRect.y
  let cropWidth = cropRect.width
  let cropHeight = cropRect.height

  if (isCover) {
    if (cropAspectRatio > boxAspectRatio) {
      cropWidth = cropRect.height * boxAspectRatio
      cropX = cropRect.x + (cropRect.width - cropWidth) / 2
    } else {
      cropHeight = cropRect.width / boxAspectRatio
      cropY = cropRect.y + (cropRect.height - cropHeight) / 2
    }
  } else if (cropAspectRatio > boxAspectRatio) {
    displayHeight = boxWidth / cropAspectRatio
    displayY = (boxHeight - displayHeight) / 2
  } else {
    displayWidth = boxHeight * cropAspectRatio
    displayX = (boxWidth - displayWidth) / 2
  }

  return {
    x: displayX,
    y: displayY,
    width: displayWidth,
    height: displayHeight,
    image: item.image,
    opacity: item.opacity ?? defaultImageSettings.opacity,
    cornerRadius: getCornerRadiusConfig(item),
    cropX,
    cropY,
    cropWidth,
    cropHeight
  }
}

function getImageCornerRadiusMax(item) {
  if (!item) return 0

  return Math.floor(Math.min(item.width || 0, item.height || 0) / 2)
}

function resetImageCrop(item) {
  if (!item) return

  item.cropLeft = 0
  item.cropRight = 0
  item.cropTop = 0
  item.cropBottom = 0
}

function setImageObjectFit(item, objectFit) {
  if (!item) return

  item.objectFit = objectFit
}

function setChartType(item, chartType) {
  if (!item) return

  item.chartType = chartType
}

function getChartBoxConfig(item) {
  return {
    x: item.x,
    y: item.y,
    width: item.width,
    height: item.height,
    rotation: item.rotation || 0,
    draggable: item.draggable
  }
}

function getChartHitAreaConfig(item) {
  return {
    x: 0,
    y: 0,
    width: item.width,
    height: item.height,
    fill: item.backgroundColor || defaultChartSettings.backgroundColor
  }
}

function getChartBorderConfig(item) {
  return getElementBorderConfig(item, {
    width: item.width,
    height: item.height
  })
}

function parseChartNumberList(value) {
  return String(value || '')
    .split(/[\s,;]+/)
    .map(entry => Number(entry.trim()))
    .filter(Number.isFinite)
}

function getChartSeries(item) {
  const ySource = item.yAxisValues !== undefined ? item.yAxisValues : item.chartData
  const yValues = parseChartNumberList(ySource)
  const xValues = parseChartNumberList(item.xAxisValues)
  const hasXValues = xValues.length > 0
  const nextYValues = yValues.length ? yValues : [0]
  const pointCount = hasXValues
    ? Math.max(1, Math.min(xValues.length, nextYValues.length))
    : nextYValues.length

  return {
    xValues: hasXValues
      ? xValues.slice(0, pointCount)
      : nextYValues.map((_, index) => index),
    yValues: nextYValues.slice(0, pointCount)
  }
}

function getChartRange(values) {
  const min = Math.min(...values)
  const max = Math.max(...values)

  return {
    min,
    max,
    range: max - min
  }
}

function formatChartAxisValue(value) {
  if (!Number.isFinite(value)) return ''
  if (Number.isInteger(value)) return String(value)

  return Number(value.toFixed(2)).toString()
}

function getChartTickValues(min, max, count = 4) {
  if (!Number.isFinite(min) || !Number.isFinite(max)) return []
  if (min === max) return [min]

  return Array.from({ length: count + 1 }, (_, index) => (
    min + (max - min) * index / count
  ))
}

function getChartPlotMeta(item) {
  const width = Math.max(1, item.width || 1)
  const height = Math.max(1, item.height || 1)
  const hasTitle = Boolean(item.chartTitle)
  const hasXAxisLabel = Boolean(item.xAxisLabel)
  const hasYAxisLabel = Boolean(item.yAxisLabel)
  const padding = 14
  const axisValueLabelWidth = 30
  const axisValueLabelHeight = 16
  const leftPadding = padding + axisValueLabelWidth + (hasYAxisLabel ? 24 : 0)
  const rightPadding = padding + 8
  const topPadding = padding + (hasTitle ? 22 : 0)
  const bottomPadding = padding + axisValueLabelHeight + (hasXAxisLabel ? 24 : 0)
  const plotWidth = Math.max(1, width - leftPadding - rightPadding)
  const plotHeight = Math.max(1, height - topPadding - bottomPadding)
  const series = getChartSeries(item)
  const xRange = getChartRange(series.xValues)
  const yRange = getChartRange(series.yValues)

  return {
    padding,
    leftPadding,
    rightPadding,
    topPadding,
    bottomPadding,
    width,
    height,
    plotWidth,
    plotHeight,
    xValues: series.xValues,
    yValues: series.yValues,
    minX: xRange.min,
    maxX: xRange.max,
    xRange: xRange.range,
    minY: yRange.min,
    maxY: yRange.max,
    yRange: yRange.range
  }
}

function getChartPointPosition(meta, xValue, yValue) {
  const x = meta.xRange
    ? meta.leftPadding + (xValue - meta.minX) / meta.xRange * meta.plotWidth
    : meta.leftPadding + meta.plotWidth / 2
  const y = meta.yRange
    ? meta.topPadding + (meta.maxY - yValue) / meta.yRange * meta.plotHeight
    : meta.topPadding + meta.plotHeight / 2

  return { x, y }
}

function getChartLinePoints(item) {
  const meta = getChartPlotMeta(item)

  return meta.yValues.flatMap((value, index) => {
    const point = getChartPointPosition(meta, meta.xValues[index], value)

    return [point.x, point.y]
  })
}

function getChartAreaPoints(item) {
  const meta = getChartPlotMeta(item)
  const points = getChartLinePoints(item)
  const firstX = points[0] || meta.leftPadding
  const lastX = points[points.length - 2] || firstX
  const baselineY = meta.height - meta.bottomPadding

  return [
    ...points,
    lastX,
    baselineY,
    firstX,
    baselineY
  ]
}

function getChartGridLines(item) {
  if (!item.showGrid) return []

  const meta = getChartPlotMeta(item)
  const lines = []
  const yTicks = getChartTickValues(meta.minY, meta.maxY)
  const xTicks = getChartTickValues(meta.minX, meta.maxX)

  yTicks.forEach((value, index) => {
    const { y } = getChartPointPosition(meta, meta.minX, value)
    lines.push({
      id: `h-${index}`,
      points: [meta.leftPadding, y, meta.width - meta.rightPadding, y]
    })
  })

  xTicks.forEach((value, index) => {
    const { x } = getChartPointPosition(meta, value, meta.minY)
    lines.push({
      id: `v-${index}`,
      points: [x, meta.topPadding, x, meta.topPadding + meta.plotHeight]
    })
  })

  return lines
}

function getChartGridLineConfig(item, line) {
  return {
    points: line.points,
    stroke: '#e2e8f0',
    strokeWidth: 1,
    listening: false
  }
}

function getChartFrameConfig(item) {
  const meta = getChartPlotMeta(item)

  return {
    x: meta.leftPadding,
    y: meta.topPadding,
    width: meta.plotWidth,
    height: meta.plotHeight,
    stroke: '#cbd5e1',
    strokeWidth: 1,
    listening: false
  }
}

function getChartAreaConfig(item) {
  return {
    points: getChartAreaPoints(item),
    closed: true,
    fill: item.fill,
    opacity: item.fillOpacity,
    listening: false
  }
}

function getChartLineConfig(item) {
  return {
    points: getChartLinePoints(item),
    stroke: item.stroke,
    strokeWidth: Math.max(1, item.strokeWidth || 1),
    lineCap: 'round',
    lineJoin: 'round',
    listening: false
  }
}

function getChartPointConfigs(item) {
  if (!item.showPoints) return []

  const points = getChartLinePoints(item)
  const radius = Math.max(0, item.pointRadius || 0)
  const pointConfigs = []

  for (let i = 0; i < points.length; i += 2) {
    pointConfigs.push({
      id: i / 2,
      x: points[i],
      y: points[i + 1],
      radius,
      fill: item.stroke,
      stroke: '#fff',
      strokeWidth: 1,
      listening: false
    })
  }

  return pointConfigs
}

function getChartAxisValueLabelConfigs(item) {
  const meta = getChartPlotMeta(item)
  const labels = []
  const fontSize = 9
  const yTicks = getChartTickValues(meta.minY, meta.maxY)
  const xTicks = getChartTickValues(meta.minX, meta.maxX)

  yTicks.forEach((value, index) => {
    const { y } = getChartPointPosition(meta, meta.minX, value)

    labels.push({
      id: `y-${index}`,
      x: Math.max(0, meta.leftPadding - 32),
      y: y - fontSize / 2,
      width: 28,
      text: formatChartAxisValue(value),
      fontSize,
      fill: '#64748b',
      align: 'right',
      listening: false
    })
  })

  xTicks.forEach((value, index) => {
    const { x } = getChartPointPosition(meta, value, meta.minY)

    labels.push({
      id: `x-${index}`,
      x: x - 18,
      y: meta.topPadding + meta.plotHeight + 4,
      width: 36,
      text: formatChartAxisValue(value),
      fontSize,
      fill: '#64748b',
      align: 'center',
      listening: false
    })
  })

  return labels
}

function getChartTitleConfig(item) {
  const meta = getChartPlotMeta(item)

  return {
    x: 0,
    y: 4,
    width: meta.width,
    text: item.chartTitle || '',
    fontSize: 14,
    fontStyle: 'bold',
    fill: '#0f172a',
    align: 'center',
    listening: false
  }
}

function getChartXAxisLabelConfig(item) {
  const meta = getChartPlotMeta(item)

  return {
    x: meta.leftPadding,
    y: meta.height - 18,
    width: meta.plotWidth,
    text: item.xAxisLabel || '',
    fontSize: 12,
    fill: '#475569',
    align: 'center',
    listening: false
  }
}

function getChartYAxisLabelConfig(item) {
  const meta = getChartPlotMeta(item)

  return {
    x: 4,
    y: meta.topPadding + meta.plotHeight,
    width: meta.plotHeight,
    text: item.yAxisLabel || '',
    fontSize: 12,
    fill: '#475569',
    align: 'center',
    rotation: -90,
    listening: false
  }
}

function getPieChartBoxConfig(item) {
  return {
    x: item.x,
    y: item.y,
    width: item.width,
    height: item.height,
    rotation: item.rotation || 0,
    draggable: item.draggable
  }
}

function getPieChartBackgroundConfig(item) {
  return {
    x: 0,
    y: 0,
    width: item.width,
    height: item.height,
    fill: item.backgroundColor || defaultPieChartSettings.backgroundColor
  }
}

function parsePieChartData(value) {
  return String(value || '')
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(Boolean)
    .map((line, index) => {
      const separatorIndex = line.search(/[,;\t:]/)
      const rawName = separatorIndex >= 0 ? line.slice(0, separatorIndex) : line
      const rawValue = separatorIndex >= 0 ? line.slice(separatorIndex + 1) : ''
      const numericValue = Number.parseFloat(rawValue.replace(',', '.'))

      return {
        index,
        label: rawName.trim() || `Slice ${index + 1}`,
        value: Number.isFinite(numericValue) ? Math.max(0, numericValue) : 0
      }
    })
    .filter(entry => entry.value > 0)
}

function getPieChartSliceColor(item, index) {
  const sourceColor = Array.isArray(item?.sliceColors) ? item.sliceColors[index] : null

  return getHexColor(sourceColor, defaultPieChartColors[index % defaultPieChartColors.length])
}

function setPieChartSliceColor(item, index, value) {
  if (!item || item.type !== 'pieChart') return

  if (!Array.isArray(item.sliceColors)) item.sliceColors = []
  item.sliceColors[index] = getHexColor(value, defaultPieChartColors[index % defaultPieChartColors.length])
}

function getPieChartEntries(item) {
  const entries = parsePieChartData(item?.pieData)
  let usedTotal = 0
  const nextEntries = []

  entries.forEach((entry, index) => {
    if (usedTotal >= 100) return

    const visibleValue = Math.min(entry.value, 100 - usedTotal)

    usedTotal += visibleValue
    nextEntries.push({
      ...entry,
      value: visibleValue,
      index,
      color: getPieChartSliceColor(item, index),
      percentage: visibleValue / 100,
      isRemainder: false
    })
  })

  if (usedTotal < 100) {
    nextEntries.push({
      index: nextEntries.length,
      label: 'Remaining',
      value: 100 - usedTotal,
      color: 'rgba(255,255,255,0.01)',
      percentage: (100 - usedTotal) / 100,
      isRemainder: true
    })
  }

  return nextEntries
}

function getPieChartPlotMeta(item) {
  const width = Math.max(1, item.width || 1)
  const height = Math.max(1, item.height || 1)
  const hasTitle = Boolean(item.chartTitle)
  const padding = 12
  const titleHeight = hasTitle ? 30 : 8
  const bottomPadding = 12
  const plotWidth = Math.max(1, width - padding * 2)
  const plotHeight = Math.max(1, height - titleHeight - bottomPadding)
  const radius = Math.max(8, Math.min(plotWidth, plotHeight) / 2)

  return {
    width,
    height,
    padding,
    titleHeight,
    plotWidth,
    plotHeight,
    radius,
    centerX: width / 2,
    centerY: titleHeight + plotHeight / 2
  }
}

function getPieChartSliceConfigs(item) {
  const meta = getPieChartPlotMeta(item)
  let rotation = -90

  return getPieChartEntries(item).map(entry => {
    const angle = entry.percentage * 360
    const config = {
      id: entry.index,
      x: meta.centerX,
      y: meta.centerY,
      radius: meta.radius,
      angle,
      rotation,
      fill: entry.color,
      stroke: entry.isRemainder ? '#94a3b8' : '#ffffff',
      strokeWidth: entry.isRemainder ? 1.5 : 1,
      dash: entry.isRemainder ? [5, 4] : undefined
    }

    rotation += angle

    return config
  })
}

function getPieChartLabelConfigs(item) {
  if (!item.showLabels) return []

  const meta = getPieChartPlotMeta(item)
  let rotation = -90

  return getPieChartEntries(item)
    .filter(entry => !entry.isRemainder)
    .map(entry => {
    const angle = entry.percentage * 360
    const midAngle = (rotation + angle / 2) * Math.PI / 180
    const labelRadius = meta.radius * 0.62
    const labelWidth = Math.min(96, Math.max(54, meta.radius * 1.25))
    const x = meta.centerX + Math.cos(midAngle) * labelRadius - labelWidth / 2
    const y = meta.centerY + Math.sin(midAngle) * labelRadius - 10

    rotation += angle

    return {
      id: entry.index,
      x,
      y,
      width: labelWidth,
      text: `${entry.label}\n${formatChartAxisValue(entry.value)}`,
      fontSize: 10,
      fill: item.labelColor || defaultPieChartSettings.labelColor,
      align: 'center',
      lineHeight: 1.1,
      listening: false
    }
  })
}

function getPieChartTitleConfig(item) {
  return {
    x: 0,
    y: 6,
    width: Math.max(1, item.width || 1),
    text: item.chartTitle || '',
    fontSize: 14,
    fontStyle: 'bold',
    fill: '#0f172a',
    align: 'center',
    listening: false
  }
}

function getCurrentTextStyle(attributeName, fallback) {
  if (!editor.value) return fallback

  return editor.value.getAttributes('richTextStyle')?.[attributeName] || fallback
}

function getCurrentTextColor() {
  return getCurrentTextStyle('color', '#111111')
}

function getCurrentTextBackground() {
  return getCurrentTextStyle('backgroundColor', '#ffffff')
}

function getCurrentTextFontFamily() {
  return getCurrentTextStyle('fontFamily', fontOptions[0].value)
}

function getCurrentTextFontSize() {
  return getCurrentTextStyle('fontSize', getEditingTextBaseFontSize())
}

function getCurrentTextOpacity() {
  return getCurrentTextStyle('opacity', 1)
}

function getCleanTextStyleAttrs(attrs) {
  return Object.fromEntries(
    Object.entries(attrs).filter(([, value]) => value !== null && value !== undefined && value !== '')
  )
}

function applyTextStyle(attrs) {
  if (!editor.value) return

  const currentAttrs = editor.value.getAttributes('richTextStyle') || {}
  const nextAttrs = getCleanTextStyleAttrs({
    ...currentAttrs,
    ...attrs
  })
  const chain = editor.value.chain().focus()

  if (Object.keys(nextAttrs).length) {
    chain.setMark('richTextStyle', nextAttrs).run()
  } else {
    chain.unsetMark('richTextStyle').run()
  }
}

function applyRichTextFontSize(value) {
  applyTextStyle({ fontSize: getNormalizedTextFontSize(value) })
}

function clearTextStyleAttribute(attributeName) {
  applyTextStyle({ [attributeName]: null })
}

function setTextAlign(alignment) {
  editor.value?.chain().focus().setTextAlign(alignment).run()
}

function isTextAlignActive(alignment) {
  if (!editor.value) return false

  return (
    editor.value.isActive('paragraph', { textAlign: alignment }) ||
    editor.value.isActive('heading', { textAlign: alignment })
  )
}

/* -------------------------
   SELECT ELEMENT
--------------------------*/

function truncateLayerText(value, maxLength = 28) {
  const text = String(value || '').replace(/\s+/g, ' ').trim()

  if (!text) return ''
  if (text.length <= maxLength) return text

  return `${text.slice(0, maxLength - 3)}...`
}

function getLayerTitleSuffix(value) {
  const preview = truncateLayerText(value)

  return preview ? `: ${preview}` : ''
}

function getLayerItemTitle(item) {
  if (!item) return 'Element'

  if (item.type === 'text') return `Text${getLayerTitleSuffix(item.text)}`
  if (item.type === 'image') return 'Image'
  if (item.type === 'rect') return `Rectangle${getLayerTitleSuffix(item.shapeText)}`
  if (item.type === 'circle') return `Circle${getLayerTitleSuffix(item.shapeText)}`
  if (item.type === 'polygon') return `Polygon${getLayerTitleSuffix(item.shapeText)}`
  if (item.type === 'triangle') return `Triangle${getLayerTitleSuffix(item.shapeText)}`
  if (item.type === 'rightTriangle') return `Right Triangle${getLayerTitleSuffix(item.shapeText)}`
  if (item.type === 'line') return `Line${getLayerTitleSuffix(item.shapeText)}`
  if (item.type === 'arrow') return 'Arrow'
  if (item.type === 'label') return `Label${getLayerTitleSuffix(item.text)}`
  if (item.type === 'chart') return `Graph${getLayerTitleSuffix(item.chartTitle)}`
  if (item.type === 'pieChart') return `Pie Chart${getLayerTitleSuffix(item.chartTitle)}`
  if (item.type === 'table') return `Table (${item.rows || 0} x ${item.cols || 0})`
  if (item.type === 'group' && item.groupKind === 'table') {
    return `Table (${item.tableRows || 0} x ${item.tableCols || 0})`
  }
  if (item.type === 'group') return `${item.title || 'Group'} (${item.children?.length || 0})`

  return String(item.type || 'Element')
}

function getCanvasItemById(id) {
  return canvasItems.value.find(item => String(item.id) === String(id)) || null
}

function syncCanvasLayerOrder() {
  let layer = null

  canvasItems.value.forEach((item, index) => {
    const node = nodeRefs.value[item.id]

    if (!node) return

    node.zIndex(index)
    layer = layer || node.getLayer()
  })

  layer?.batchDraw()
}

function reorderCanvasItemLayer(itemId, targetLayerIndex) {
  const layerItems = canvasItems.value
  const currentLayerIndex = layerItems.findIndex(item => String(item.id) === String(itemId))

  if (
    currentLayerIndex < 0 ||
    targetLayerIndex < 0 ||
    targetLayerIndex >= layerItems.length ||
    targetLayerIndex === currentLayerIndex
  ) {
    return
  }

  const item = layerItems[currentLayerIndex]
  const targetItem = layerItems[targetLayerIndex]
  const nextElements = [...elements.value]
  const currentElementIndex = nextElements.findIndex(element => String(element.id) === String(item.id))

  if (currentElementIndex < 0) return

  nextElements.splice(currentElementIndex, 1)

  const targetElementIndex = nextElements.findIndex(element => String(element.id) === String(targetItem.id))
  const insertIndex = targetLayerIndex > currentLayerIndex
    ? targetElementIndex + 1
    : targetElementIndex

  nextElements.splice(insertIndex, 0, item)
  elements.value = nextElements

  nextTick(() => {
    syncCanvasLayerOrder()
    selectElement(item.id)
  })
}

function reorderSelectedLayer(targetLayerIndex) {
  if (selectedId.value === null) return

  reorderCanvasItemLayer(selectedId.value, targetLayerIndex)
}

function moveSelectedLayerBackward() {
  reorderSelectedLayer(selectedLayerIndex.value - 1)
}

function moveSelectedLayerForward() {
  reorderSelectedLayer(selectedLayerIndex.value + 1)
}

function moveSelectedLayerToBack() {
  reorderSelectedLayer(0)
}

function moveSelectedLayerToFront() {
  reorderSelectedLayer(canvasItems.value.length - 1)
}

function alignSelectedElements(axis, alignment) {
  if (!canAlignSelected.value) return

  if (editingId.value) finishTextEditing()

  const rectEntries = getSelectedItemRects(selectedItems.value)
  if (rectEntries.length !== selectedItems.value.length) return

  const bounds = getRectsBounds(rectEntries)
  if (!bounds) return

  rectEntries.forEach(({ item, rect }) => {
    let dx = 0
    let dy = 0

    if (axis === 'x') {
      if (alignment === 'start') dx = bounds.x - rect.x
      if (alignment === 'center') dx = bounds.centerX - (rect.x + rect.width / 2)
      if (alignment === 'end') dx = bounds.right - (rect.x + rect.width)
    }

    if (axis === 'y') {
      if (alignment === 'start') dy = bounds.y - rect.y
      if (alignment === 'center') dy = bounds.centerY - (rect.y + rect.height / 2)
      if (alignment === 'end') dy = bounds.bottom - (rect.y + rect.height)
    }

    moveCanvasItemByDelta(item, dx, dy)
  })

  updateTransformerSelection()
}

function collectCanvasItemIds(items, ids = new Set()) {
  const sourceItems = Array.isArray(items) ? items : [items]

  sourceItems.forEach(item => {
    if (!item || typeof item !== 'object') return
    if (item.id !== undefined && item.id !== null) ids.add(String(item.id))
    if (Array.isArray(item.children)) collectCanvasItemIds(item.children, ids)
    if (Array.isArray(item.cells)) collectCanvasItemIds(item.cells, ids)
  })

  return ids
}

function createUniqueCanvasItemId(usedIds) {
  let id = null

  do {
    generatedCanvasIdCounter += 1
    id = Date.now() + generatedCanvasIdCounter
  } while (usedIds.has(String(id)))

  usedIds.add(String(id))

  return id
}

function assignClonedCanvasItemIds(item, usedIds) {
  if (!item || typeof item !== 'object') return

  item.id = createUniqueCanvasItemId(usedIds)

  if (Array.isArray(item.children)) {
    item.children.forEach(child => assignClonedCanvasItemIds(child, usedIds))
  }

  if (Array.isArray(item.cells)) {
    item.cells.forEach(cell => {
      cell.id = createUniqueCanvasItemId(usedIds)
    })
  }
}

function getSelectedCanvasItemsForClipboard() {
  const selectedIdSet = new Set(selectedIds.value.map(id => String(id)))

  return canvasItems.value.filter(item => selectedIdSet.has(String(item.id)))
}

function copySelectedCanvasItems() {
  if (editingId.value) return false

  const itemsToCopy = getSelectedCanvasItemsForClipboard()

  if (!itemsToCopy.length) return false

  copiedCanvasItems.value = itemsToCopy.map(cloneCanvasItem)
  clipboardPasteCount = 0

  return true
}

function getClipboardItemRect(item) {
  const dimensions = getFallbackElementPixelDimensions(item)
  let x = getItemCoordinate(item, 'x')
  let y = getItemCoordinate(item, 'y')
  let width = Math.max(1, Number(dimensions?.width) || 1)
  let height = Math.max(1, Number(dimensions?.height) || 1)

  if (item?.type === 'circle' || regularPolygonShapeTypes.includes(item?.type)) {
    const radius = Number(item.radius) || 0

    x -= radius
    y -= radius
  }

  if (item?.type === 'line' || item?.type === 'arrow') {
    const bounds = getLineLocalBounds(item)

    x += bounds.minX
    y += bounds.minY
    width = bounds.width
    height = bounds.height
  }

  return {
    x,
    y,
    width,
    height,
    right: x + width,
    bottom: y + height
  }
}

function getClipboardItemsBounds(items) {
  const rects = items.map(getClipboardItemRect).filter(Boolean)

  if (!rects.length) return null

  const x = Math.min(...rects.map(rect => rect.x))
  const y = Math.min(...rects.map(rect => rect.y))
  const right = Math.max(...rects.map(rect => rect.right))
  const bottom = Math.max(...rects.map(rect => rect.bottom))

  return {
    x,
    y,
    right,
    bottom,
    width: Math.max(1, right - x),
    height: Math.max(1, bottom - y)
  }
}

function getPasteDelta(options = {}) {
  const pastePoint = options.pastePoint

  if (pastePoint && copiedCanvasItems.value.length) {
    const bounds = getClipboardItemsBounds(copiedCanvasItems.value)

    if (bounds) {
      return {
        x: getItemCoordinate(pastePoint, 'x') - bounds.x,
        y: getItemCoordinate(pastePoint, 'y') - bounds.y
      }
    }
  }

  const pasteOffset = CLIPBOARD_PASTE_OFFSET * (clipboardPasteCount + 1)

  return {
    x: pasteOffset,
    y: pasteOffset
  }
}

function preparePastedCanvasItem(item, delta, usedIds) {
  const pastedItem = cloneCanvasItem(item)

  assignClonedCanvasItemIds(pastedItem, usedIds)
  moveCanvasItemByDelta(pastedItem, delta.x, delta.y)
  ensureImportedElementSettings(pastedItem)

  return pastedItem
}

function pasteCopiedCanvasItems(options = {}) {
  if (editingId.value || !copiedCanvasItems.value.length) return false

  const usedIds = collectCanvasItemIds(elements.value)
  const pasteDelta = getPasteDelta(options)
  const pastedItems = copiedCanvasItems.value.map(item => (
    preparePastedCanvasItem(item, pasteDelta, usedIds)
  ))

  elements.value = [...elements.value, ...pastedItems]
  clipboardPasteCount += 1

  nextTick(() => {
    pastedItems.forEach(renderImportedRichTextImages)
    selectElements(pastedItems.map(item => item.id))
    syncCanvasLayerOrder()
  })

  return true
}

function hideContextMenu() {
  if (!contextMenu.value.visible) return

  contextMenu.value = {
    ...contextMenu.value,
    visible: false,
    targetId: null,
    cellId: null,
    pastePoint: null
  }
}

function getStageLocalPointFromPointerEvent(event) {
  const stage = getStageNode()
  const nativeEvent = event?.evt || event
  const container = stage?.container?.()
  const rect = container?.getBoundingClientRect?.()

  if (!rect || typeof nativeEvent?.clientX !== 'number' || typeof nativeEvent?.clientY !== 'number') {
    return { x: 0, y: 0 }
  }

  return {
    x: nativeEvent.clientX - rect.left,
    y: nativeEvent.clientY - rect.top
  }
}

function getStagePointerPosition(event) {
  const stage = getStageNode()

  if (stage && event?.evt && typeof stage.setPointersPositions === 'function') {
    stage.setPointersPositions(event.evt)
  }

  return stage?.getPointerPosition?.() || getStageLocalPointFromPointerEvent(event)
}

function getDefaultCanvasPastePoint() {
  const bounds = getCanvasBounds()

  return {
    x: bounds.x + 40,
    y: bounds.y + 40
  }
}

function getClampedCanvasPastePoint(point) {
  const bounds = getCanvasBounds()

  if (!point) return getDefaultCanvasPastePoint()

  return {
    x: clampNumber(point.x, bounds.x, bounds.right),
    y: clampNumber(point.y, bounds.y, bounds.bottom)
  }
}

function setLastCanvasPastePoint(point) {
  lastCanvasPastePoint.value = getClampedCanvasPastePoint(point)
}

function getCanvasPastePoint(point = null) {
  return getClampedCanvasPastePoint(point || contextMenu.value.pastePoint || lastCanvasPastePoint.value)
}

function handleStagePointerMove(event) {
  setLastCanvasPastePoint(getStagePointerPosition(event))
}

function getContextMenuSize(type = 'canvas') {
  if (type === 'table-cell') return { width: 172, height: 208 }

  return type === 'element'
    ? { width: 126, height: 76 }
    : { width: 92, height: 42 }
}

function getContextMenuPosition(x, y, type = 'canvas') {
  const { width, height } = getContextMenuSize(type)

  return {
    x: clampNumber(x, 0, Math.max(0, stageConfig.value.width - width)),
    y: clampNumber(y, 0, Math.max(0, stageConfig.value.height - height))
  }
}

function getViewportContextMenuPosition(x, y, type = 'canvas') {
  const { width, height } = getContextMenuSize(type)
  const viewportWidth = typeof window === 'undefined' ? width : window.innerWidth
  const viewportHeight = typeof window === 'undefined' ? height : window.innerHeight

  return {
    x: clampNumber(x, 0, Math.max(0, viewportWidth - width)),
    y: clampNumber(y, 0, Math.max(0, viewportHeight - height))
  }
}

function getElementContextMenuPosition(itemId, event) {
  const node = nodeRefs.value[itemId]
  const rect = node?.getClientRect?.()

  if (!rect) {
    const point = getStageLocalPointFromPointerEvent(event)

    return getContextMenuPosition(point.x + 8, point.y, 'element')
  }

  return getContextMenuPosition(rect.x + rect.width + 8, rect.y, 'element')
}

function getCanvasItemIdFromKonvaTarget(target) {
  if (!target) return null

  const layerItems = [...canvasItems.value].reverse()

  for (const item of layerItems) {
    const node = nodeRefs.value[item.id]

    if (!node) continue
    if (node === target || node.isAncestorOf?.(target)) return item.id
  }

  return null
}

function showElementContextMenu(itemId, event) {
  if (editingId.value && editingId.value !== itemId) {
    finishTextEditing()
  }

  setLastCanvasPastePoint(getStagePointerPosition(event))
  selectElement(itemId)

  const position = getElementContextMenuPosition(itemId, event)

  contextMenu.value = {
    visible: true,
    type: 'element',
    positionMode: 'stage',
    targetId: itemId,
    x: position.x,
    y: position.y,
    pastePoint: null
  }
}

function showCanvasContextMenu(event) {
  const point = getStagePointerPosition(event)
  const position = getContextMenuPosition(point.x + 8, point.y + 8, 'canvas')

  setLastCanvasPastePoint(point)

  contextMenu.value = {
    visible: true,
    type: 'canvas',
    positionMode: 'stage',
    targetId: null,
    x: position.x,
    y: position.y,
    pastePoint: point
  }
}

function handleStageContextMenu(event) {
  const nativeEvent = event?.evt

  nativeEvent?.preventDefault?.()
  nativeEvent?.stopPropagation?.()

  const itemId = getCanvasItemIdFromKonvaTarget(event?.target)

  if (itemId !== null && itemId !== undefined) {
    showElementContextMenu(itemId, event)
    return
  }

  showCanvasContextMenu(event)
}

function handleSelectableContextMenu(event, itemId) {
  const nativeEvent = event?.evt

  nativeEvent?.preventDefault?.()
  nativeEvent?.stopPropagation?.()

  event.cancelBubble = true
  showElementContextMenu(itemId, event)
}

function copyContextMenuElement() {
  const itemId = contextMenu.value.targetId

  if (itemId === null || itemId === undefined) return false

  selectElement(itemId)
  const copied = copySelectedCanvasItems()

  hideContextMenu()

  return copied
}

function deleteContextMenuElement() {
  const itemId = contextMenu.value.targetId

  if (itemId === null || itemId === undefined) return false

  selectElement(itemId)
  const deleted = deleteSelectedElements()

  hideContextMenu()

  return deleted
}

function pasteContextMenuItems() {
  const pasted = pasteCopiedCanvasItems({
    pastePoint: contextMenu.value.pastePoint
  })

  hideContextMenu()

  return pasted
}

function handleContextMenuMouseDown(event) {
  event.stopPropagation()
}

function handleGlobalMouseDown(event) {
  if (!contextMenu.value.visible) return
  if (event.target?.closest?.('.canvas-context-menu')) return

  hideContextMenu()
}

function getClipboardImageFile(clipboardData) {
  const files = Array.from(clipboardData?.files || [])
  const file = getFirstImageFile(files)

  if (file) return file

  return Array.from(clipboardData?.items || [])
    .find(item => item.kind === 'file' && item.type.startsWith('image/'))
    ?.getAsFile?.() || null
}

function getClipboardPlainText(clipboardData) {
  return clipboardData?.getData?.('text/plain') || ''
}

function pasteExternalClipboardImage(file) {
  if (!isImageFile(file)) return false

  addUploadedImage(file, getCanvasPastePoint())

  return true
}

function pasteExternalClipboardText(text) {
  return addClipboardText(text, getCanvasPastePoint())
}

function handleGlobalPaste(event) {
  if (event.defaultPrevented || isEditableKeyboardTarget(event.target)) return

  const clipboardData = event.clipboardData
  let handled = false
  const imageFile = getClipboardImageFile(clipboardData)

  if (imageFile) {
    handled = pasteExternalClipboardImage(imageFile)
  } else {
    const text = getClipboardPlainText(clipboardData)

    handled = pasteExternalClipboardText(text)
  }

  if (!handled) {
    handled = pasteCopiedCanvasItems({
      pastePoint: getCanvasPastePoint()
    })
  }

  if (!handled) return

  hideContextMenu()
  event.preventDefault()
  event.stopPropagation()
}

function isEditableKeyboardTarget(target) {
  if (!target) return false

  const element = target.nodeType === 3 ? target.parentElement : target
  const tagName = element?.tagName?.toLowerCase()

  return Boolean(
    element?.isContentEditable ||
    ['input', 'textarea', 'select'].includes(tagName) ||
    element?.closest?.('.rich-text-editor')
  )
}

function handleGlobalClipboardKeyDown(event) {
  if (contextMenu.value.visible && event.key === 'Escape') {
    hideContextMenu()
    event.preventDefault()
    event.stopPropagation()
    return
  }

  if (event.defaultPrevented || isEditableKeyboardTarget(event.target)) return

  const key = String(event.key || '').toLowerCase()

  if (!event.ctrlKey && !event.metaKey && !event.altKey && !event.shiftKey) {
    const handled = ['delete', 'backspace'].includes(key) && deleteSelectedElements()

    if (!handled) return

    event.preventDefault()
    event.stopPropagation()
    return
  }

  if (!(event.ctrlKey || event.metaKey) || event.altKey || event.shiftKey) return

  let handled = false

  if (key === 'c') handled = copySelectedCanvasItems()

  if (!handled) return

  event.preventDefault()
  event.stopPropagation()
}

function ensureSelectableItemSettings(item) {
  ensureImageSettings(item)
  ensureTextSettings(item)
  ensureChartSettings(item)
  ensurePieChartSettings(item)
  ensureTableSettings(item)
  ensureLabelSettings(item)
  ensureElementBorderSettings(item)
  ensureShapeSettings(item)
}

function updateTransformerSelection(ids = selectedIds.value) {
  nextTick(() => {
    const nodes = ids.map(id => nodeRefs.value[id]).filter(Boolean)
    const tr = transformerRef.value?.getNode()

    if (!tr) return

    tr.nodes(nodes)
    tr.getLayer()?.batchDraw()
  })
}

function selectElements(ids) {
  const availableIds = new Set(canvasItems.value.map(item => item.id))
  const nextIds = ids.filter((id, index) => (
    availableIds.has(id) &&
    ids.indexOf(id) === index
  ))

  selectedIds.value = nextIds
  selectedId.value = nextIds.length === 1 ? nextIds[0] : null

  const nextSelectedItem = selectedId.value !== null ? getCanvasItemById(selectedId.value) : null

  if (nextSelectedItem?.type !== 'table') {
    selectedTableCellIds.value = []
  }

  if (editingTableCell.value && String(editingTableCell.value.tableId) !== String(nextSelectedItem?.id)) {
    finishTableCellEditing()
  }

  nextIds.forEach(id => {
    const item = elements.value.find(i => i.id === id)
    ensureSelectableItemSettings(item)
  })

  updateTransformerSelection(nextIds)
}

function selectElement(id) {
  selectElements([id])
}

function selectLayerSidebarItem(item) {
  if (!item) return

  if (editingId.value && editingId.value !== item.id) {
    finishTextEditing()
  }

  selectElement(item.id)
}

function handleLayerContextMenu(event, item) {
  if (!item) return

  event.preventDefault()
  event.stopPropagation()

  if (editingId.value && editingId.value !== item.id) {
    finishTextEditing()
  }

  selectElement(item.id)

  const position = getViewportContextMenuPosition(event.clientX + 8, event.clientY + 8, 'element')

  contextMenu.value = {
    visible: true,
    type: 'element',
    positionMode: 'viewport',
    targetId: item.id,
    x: position.x,
    y: position.y,
    pastePoint: null
  }
}

function handleLayerDragStart(event, item) {
  if (!item) return

  draggedLayerId.value = item.id
  dragOverLayerId.value = null
  selectLayerSidebarItem(item)

  if (!event.dataTransfer) return

  event.dataTransfer.effectAllowed = 'move'
  event.dataTransfer.setData('text/plain', String(item.id))
}

function handleLayerDragOver(event, item) {
  if (!item || draggedLayerId.value === null || String(draggedLayerId.value) === String(item.id)) return

  event.preventDefault()
  dragOverLayerId.value = item.id

  if (event.dataTransfer) event.dataTransfer.dropEffect = 'move'
}

function handleLayerDragLeave(item) {
  if (String(dragOverLayerId.value) === String(item?.id)) {
    dragOverLayerId.value = null
  }
}

function handleLayerDrop(event, targetEntry) {
  event.preventDefault()

  const targetItem = targetEntry?.item || targetEntry
  const draggedId = event.dataTransfer?.getData('text/plain') || draggedLayerId.value
  const targetLayerIndex = Number.isInteger(targetEntry?.layerIndex)
    ? targetEntry.layerIndex
    : canvasItems.value.findIndex(item => String(item.id) === String(targetItem?.id))

  draggedLayerId.value = null
  dragOverLayerId.value = null

  if (!draggedId || targetLayerIndex < 0 || String(draggedId) === String(targetItem?.id)) return
  if (!getCanvasItemById(draggedId)) return

  reorderCanvasItemLayer(draggedId, targetLayerIndex)
}

function handleLayerDragEnd() {
  draggedLayerId.value = null
  dragOverLayerId.value = null
}

function toggleElementSelection(id) {
  const isSelected = selectedIds.value.includes(id)
  const nextIds = isSelected
    ? selectedIds.value.filter(selectedItemId => selectedItemId !== id)
    : [...selectedIds.value, id]

  selectElements(nextIds)
}

function isMultiSelectEvent(event) {
  return Boolean(event?.evt?.ctrlKey || event?.evt?.metaKey)
}

function handleSelectablePointerDown(event, id) {
  event.cancelBubble = true

  if (editingId.value && editingId.value !== id) {
    finishTextEditing()
  }

  if (editingTableCell.value && editingTableCell.value.tableId !== id) {
    finishTableCellEditing()
  }

  if (isMultiSelectEvent(event)) {
    toggleElementSelection(id)
    return
  }

  selectElement(id)
}

function stopSelectableClick(event) {
  event.cancelBubble = true
}

function handleTableCellPointerDown(event, tableId, cellId) {
  const isToggleSelection = isMultiSelectEvent(event)
  const isRepeatedClick = (Number(event?.evt?.detail) || 0) > 1

  if (isToggleSelection || isRepeatedClick) {
    event.cancelBubble = true
    event.evt?.stopPropagation?.()
  }

  if (editingId.value) finishTextEditing()

  if (
    editingTableCell.value &&
    (
      String(editingTableCell.value.tableId) !== String(tableId) ||
      String(editingTableCell.value.cellId) !== String(cellId)
    )
  ) {
    finishTableCellEditing()
  }

  selectTableCell(tableId, cellId, { toggle: isToggleSelection })
}

function startTableCellEditing(event, tableId, cellId) {
  event.cancelBubble = true
  event.evt?.preventDefault?.()
  event.evt?.stopPropagation?.()

  selectTableCell(tableId, cellId)

  const { cell } = getTableCellContext(tableId, cellId)

  if (!cell) return

  editingTableCell.value = { tableId, cellId }
  tableCellEditorValue.value = String(cell.text || '')

  nextTick(() => {
    const editorElement = document.querySelector('.table-cell-editor')

    editorElement?.focus?.()
    editorElement?.select?.()
  })
}

function syncTableCellEditorValue() {
  if (!editingTableCell.value) return

  const { cell } = getTableCellContext(editingTableCell.value.tableId, editingTableCell.value.cellId)

  if (!cell) return

  cell.text = tableCellEditorValue.value
}

function finishTableCellEditing() {
  syncTableCellEditorValue()
  editingTableCell.value = null
  tableCellEditorValue.value = ''
}

function handleTableCellEditorInput(value) {
  tableCellEditorValue.value = value
  syncTableCellEditorValue()
}

function handleTableCellEditorKeydown(event) {
  if (event.key === 'Escape' || (event.key === 'Enter' && (event.ctrlKey || event.metaKey))) {
    event.preventDefault()
    finishTableCellEditing()
  }
}

function handleTableCellContextMenu(event, tableId, cellId) {
  const nativeEvent = event?.evt

  nativeEvent?.preventDefault?.()
  nativeEvent?.stopPropagation?.()

  event.cancelBubble = true
  selectTableCell(tableId, cellId)

  const point = getStagePointerPosition(event)
  const position = getContextMenuPosition(point.x + 8, point.y + 8, 'table-cell')

  contextMenu.value = {
    visible: true,
    type: 'table-cell',
    positionMode: 'stage',
    targetId: tableId,
    cellId,
    x: position.x,
    y: position.y,
    pastePoint: null
  }
}

function clearSelection() {
  selectedId.value = null
  selectedIds.value = []
  selectedTableCellIds.value = []

  const tr = transformerRef.value?.getNode()
  if (!tr) return

  tr.nodes([])
  tr.getLayer()?.batchDraw()
}

function groupSelectedElements() {
  if (!canGroupSelected.value) return

  if (editingId.value) finishTextEditing()

  const selectedIdSet = new Set(selectedIds.value)
  const itemsToGroup = canvasItems.value.filter(item => selectedIdSet.has(item.id))
  const bounds = getSelectedItemsBounds(itemsToGroup)

  if (!bounds) return

  const originalElements = elements.value
  const selectedIndexes = itemsToGroup
    .map(item => originalElements.findIndex(element => element.id === item.id))
    .filter(index => index >= 0)
  const insertAfterIndex = Math.max(...selectedIndexes)
  const insertIndex = originalElements
    .slice(0, insertAfterIndex + 1)
    .filter(item => !selectedIdSet.has(item.id))
    .length
  const groupId = Date.now()
  const groupItem = new GroupElement({
    id: groupId,
    x: bounds.x,
    y: bounds.y,
    width: bounds.width,
    height: bounds.height,
    children: itemsToGroup.map(item => getGroupedCanvasItem(item, bounds.x, bounds.y))
  })
  const nextElements = originalElements.filter(item => !selectedIdSet.has(item.id))

  itemsToGroup.forEach(item => {
    delete nodeRefs.value[item.id]
  })

  nextElements.splice(insertIndex, 0, groupItem)
  elements.value = nextElements
  clearSelection()

  nextTick(() => selectElement(groupId))
}

function ungroupSelectedGroup() {
  const group = selectedGroup.value
  if (!group) return

  const groupIndex = elements.value.findIndex(item => item.id === group.id)
  if (groupIndex < 0) return

  const restoredItems = (group.children || []).map(item => getUngroupedCanvasItem(item, group))
  const nextElements = [...elements.value]

  nextElements.splice(groupIndex, 1, ...restoredItems)
  elements.value = nextElements
  delete nodeRefs.value[group.id]
  clearSelection()

  nextTick(() => selectElements(restoredItems.map(item => item.id)))
}

function clearCanvas() {
  canvasVersion += 1
  elements.value = []
  nodeRefs.value = {}
  editingId.value = null
  editingTextTarget.value = 'text'
  richRenderVersions.clear()
  clearSelection()
}

function deleteSelectedElements() {
  if (!selectedIds.value.length) return false

  const selectedIdSet = new Set(selectedIds.value)

  elements.value = elements.value.filter(item => !selectedIdSet.has(item.id))

  selectedIdSet.forEach(id => {
    delete nodeRefs.value[id]
  })

  if (selectedIdSet.has(editingId.value)) {
    editingId.value = null
    editingTextTarget.value = 'text'
  }

  clearSelection()

  return true
}

function isNodeOutsideCanvas(node) {
  if (!node) return false

  const bounds = getCanvasBounds()
  const rect = node.getClientRect()

  return (
    rect.x + rect.width <= bounds.x ||
    rect.x >= bounds.right ||
    rect.y + rect.height <= bounds.y ||
    rect.y >= bounds.bottom
  )
}

function removeElement(id) {
  const wasSelected = selectedIds.value.includes(id)

  elements.value = elements.value.filter(item => item.id !== id)
  delete nodeRefs.value[id]
  selectedIds.value = selectedIds.value.filter(selectedItemId => selectedItemId !== id)

  if (selectedId.value === id) clearSelection()
  if (wasSelected && selectedId.value !== id) {
    selectedId.value = selectedIds.value.length === 1 ? selectedIds.value[0] : null
    updateTransformerSelection()
  }
  if (editingId.value === id) {
    editingId.value = null
    editingTextTarget.value = 'text'
  }
}

function removeElementIfOutsideCanvas(node, id) {
  if (!isNodeOutsideCanvas(node)) return false

  const layer = node.getLayer()

  removeElement(id)
  layer?.batchDraw()

  return true
}

function removeOutsideCanvasElements() {
  Object.entries(nodeRefs.value).forEach(([nodeId, node]) => {
    const item = elements.value.find(element => String(element.id) === nodeId)
    if (!item) return

    removeElementIfOutsideCanvas(node, item.id)
  })
}

watch(selectedPagePreset, (newValue, oldValue) => {
  if (newValue !== 'custom') return

  const presetSize = getPresetPageSizeInches(oldValue)
  if (!presetSize) return

  customPageSizeInches.value = presetSize
}, { flush: 'sync' })
watch(selectedPageMarginPreset, (newValue, oldValue) => {
  if (newValue !== 'custom') return

  const presetMargins = getPageMarginPresetInches(oldValue)
  if (!presetMargins) return

  customPageMarginsInches.value = presetMargins
}, { flush: 'sync' })
watch(pagePixelSize, () => nextTick(removeOutsideCanvasElements))

function isTargetInsideNode(target, node) {
  if (!target || !node) return false

  return target === node || node.isAncestorOf?.(target)
}

function isSelectableCanvasTarget(target) {
  return Object.values(nodeRefs.value).some(node => isTargetInsideNode(target, node))
}

function isTransformerTarget(target) {
  const tr = transformerRef.value?.getNode()

  return isTargetInsideNode(target, tr)
}

/* -------------------------
   RICH TEXT EDITING
--------------------------*/

function escapeHtml(value) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
}

function syncEditorContent() {
  const item = editingItem.value
  if (!item || !editor.value) return

  if (editingTextTarget.value === 'shape') {
    item.shapeRichText = editor.value.getHTML()
    item.shapeRichTextJson = editor.value.getJSON()
    item.shapeText = editor.value.getText({ blockSeparator: '\n' })
    return
  }

  item.richText = editor.value.getHTML()
  item.richTextJson = editor.value.getJSON()
  item.text = editor.value.getText({ blockSeparator: '\n' })
}

function getStoredRichTextEditorContent(item, htmlKey, jsonKey, fallbackHtml) {
  return item?.[jsonKey] || item?.[htmlKey] || fallbackHtml
}

function getHtmlFromRichTextJson(content) {
  if (!content || !editor.value) return ''

  const previousContent = editor.value.getJSON()

  editor.value.commands.setContent(content, { emitUpdate: false })

  const html = editor.value.getHTML()

  editor.value.commands.setContent(previousContent, { emitUpdate: false })

  return html
}

function getStoredRichTextHtml(item, htmlKey, jsonKey, fallbackHtml = '') {
  if (typeof item?.[htmlKey] === 'string' && item[htmlKey]) return item[htmlKey]

  const jsonHtml = getHtmlFromRichTextJson(item?.[jsonKey])

  return jsonHtml || fallbackHtml
}

function shouldLowercaseText(value) {
  const casedText = Array.from(String(value || ''))
    .filter(character => character.toLocaleLowerCase() !== character.toLocaleUpperCase())
    .join('')

  return Boolean(casedText) && casedText === casedText.toLocaleUpperCase()
}

function getTextCaseTransformer(value) {
  return shouldLowercaseText(value)
    ? text => String(text || '').toLocaleLowerCase()
    : text => String(text || '').toLocaleUpperCase()
}

function transformRichTextJsonText(content, transform) {
  if (Array.isArray(content)) {
    return content.map(node => transformRichTextJsonText(node, transform))
  }

  if (content && typeof content === 'object') {
    const nextContent = { ...content }

    if (typeof nextContent.text === 'string') {
      nextContent.text = transform(nextContent.text)
    }

    if (Array.isArray(nextContent.content)) {
      nextContent.content = nextContent.content.map(node => transformRichTextJsonText(node, transform))
    }

    return nextContent
  }

  return content
}

function transformRichTextHtmlText(html, transform) {
  const template = document.createElement('template')

  template.innerHTML = html || ''

  const walker = document.createTreeWalker(template.content, window.NodeFilter.SHOW_TEXT)
  let node = walker.nextNode()

  while (node) {
    node.textContent = transform(node.textContent || '')
    node = walker.nextNode()
  }

  return template.innerHTML
}

function toggleTextCase(item) {
  if (!item || item.type !== 'text') return

  ensureTextSettings(item)

  const sourceText = editingId.value === item.id && editor.value
    ? editor.value.getText({ blockSeparator: '\n' })
    : item.text
  const transform = getTextCaseTransformer(sourceText)

  if (editingId.value === item.id && editor.value) {
    const transformedContent = transformRichTextJsonText(editor.value.getJSON(), transform)

    editor.value.commands.setContent(transformedContent, { emitUpdate: false })
    syncEditorContent()
    return
  }

  item.text = transform(item.text || '')

  if (item.richTextJson) {
    item.richTextJson = transformRichTextJsonText(item.richTextJson, transform)
  }

  if (item.richText) {
    item.richText = transformRichTextHtmlText(item.richText, transform)
  } else if (item.richTextJson) {
    item.richText = getHtmlFromRichTextJson(item.richTextJson)
  }

  rerenderTextRichImage(item)
}

function syncActiveTextEditForLayoutExport() {
  if (!editingItem.value || !editor.value) return

  syncEditorContent()
}

function syncActiveTableCellEditForLayoutExport() {
  if (!editingTableCell.value) return

  syncTableCellEditorValue()
}

function startTextEditing(item) {
  const node = nodeRefs.value[item.id]
  if (!node || !editor.value) return

  richRenderVersions.set(item.id, (richRenderVersions.get(item.id) || 0) + 1)
  editingTextTarget.value = 'text'
  selectElement(item.id)

  const position = node.getAbsolutePosition()
  const nodeWidth = node.width() * Math.abs(node.scaleX())

  editorPosition.value = {
    x: position.x,
    y: position.y,
    width: Math.max(item.width || nodeWidth || 0, 240),
    rotation: item.rotation || 0
  }

  editingId.value = item.id
  transformerRef.value?.getNode()?.nodes([])

  const plainTextContent = escapeHtml(item.text || '').replaceAll('\n', '<br>')
  const content = getStoredRichTextEditorContent(
    item,
    'richText',
    'richTextJson',
    `<p>${plainTextContent}</p>`
  )
  editor.value.commands.setContent(content, { emitUpdate: false })

  nextTick(() => editor.value?.commands.focus('end'))
}

function startShapeTextEditing(item) {
  if (!canShapeHaveRichText(item) || !editor.value) return

  ensureShapeTextSettings(item)
  richRenderVersions.set(`${item.id}:shapeRichImage`, (richRenderVersions.get(`${item.id}:shapeRichImage`) || 0) + 1)
  editingTextTarget.value = 'shape'
  selectElement(item.id)

  const box = getShapeTextBox(item)

  editorPosition.value = {
    x: box.center.x - box.width / 2,
    y: box.center.y - box.height / 2,
    width: box.width,
    rotation: box.rotation
  }

  editingId.value = item.id
  transformerRef.value?.getNode()?.nodes([])

  const plainTextContent = escapeHtml(item.shapeText || 'Text').replaceAll('\n', '<br>')
  const content = getStoredRichTextEditorContent(
    item,
    'shapeRichText',
    'shapeRichTextJson',
    `<p>${plainTextContent}</p>`
  )
  editor.value.commands.setContent(content, { emitUpdate: false })

  nextTick(() => editor.value?.commands.focus('end'))
}

function handleStagePointerDown(event) {
  setLastCanvasPastePoint(getStagePointerPosition(event))

  if (contextMenu.value.visible) hideContextMenu()

  const target = event.target
  const isEditingTarget = isTargetInsideNode(target, nodeRefs.value[editingId.value])

  if (editingId.value && !isEditingTarget) {
    finishTextEditing()
  }

  if (editingTableCell.value) {
    finishTableCellEditing()
  }

  if (isSelectableCanvasTarget(target) || isTransformerTarget(target)) return

  clearSelection()
}

function finishTextEditing() {
  const item = editingItem.value
  if (!item || !editor.value) return false

  const target = editingTextTarget.value

  syncEditorContent()

  const html = target === 'shape' ? item.shapeRichText : item.richText
  const width = editorPosition.value.width
  const contentElement = editor.value.view.dom
  const height = Math.max(
    Math.ceil(contentElement.scrollHeight),
    Math.ceil(getEditingTextBaseFontSize(item) * getEditingTextLineHeight(item))
  )

  if (target === 'shape') {
    item.shapeTextWidth = width
    item.shapeTextHeight = height
  } else {
    item.width = width
    item.height = height
  }

  editingId.value = null
  editingTextTarget.value = 'text'

  if (target === 'shape') {
    return renderShapeRichText(item, html, width, height)
  }

  return renderRichText(item, html, width, height)
}

function renderShapeRichText(item, html, width, height) {
  return renderRichText(item, html, width, height, {
    imageKey: 'shapeRichImage',
    renderKey: `${item.id}:shapeRichImage`,
    style: {
      color: item.shapeTextFill || '#111111',
      fontFamily: item.shapeTextFontFamily || 'Arial, sans-serif',
      fontSize: item.shapeTextFontSize || 20,
      lineHeight: item.shapeTextLineHeight || 1.35
    }
  })
}

function getElementTextDecorationLines(element) {
  const tagName = element.tagName?.toLowerCase()
  const decorationValue = `${element.style.textDecoration || ''} ${element.style.textDecorationLine || ''}`
  const lines = []

  if (tagName === 'u' || decorationValue.includes('underline')) lines.push('underline')
  if (['s', 'strike', 'del'].includes(tagName) || decorationValue.includes('line-through')) {
    lines.push('line-through')
  }

  return [...new Set(lines)]
}

function setTextDecorationLines(element, lines) {
  const currentLines = getElementTextDecorationLines(element)
  const nextLines = [...new Set([...currentLines, ...lines])]

  element.style.textDecorationLine = nextLines.join(' ')
  element.style.textDecorationColor = 'currentColor'
}

function wrapTextNodeWithDecoration(textNode, lines) {
  const span = document.createElement('span')

  span.style.textDecorationLine = lines.join(' ')
  span.style.textDecorationColor = 'currentColor'
  textNode.parentNode?.insertBefore(span, textNode)
  span.append(textNode)
}

function applyTextDecorationToTextNodes(node, lines) {
  Array.from(node.childNodes).forEach(child => {
    if (child.nodeType === Node.TEXT_NODE) {
      if (child.textContent) wrapTextNodeWithDecoration(child, lines)
      return
    }

    if (child.nodeType === Node.ELEMENT_NODE) {
      applyTextDecorationToTextNodes(child, lines)
    }
  })
}

function normalizeRichTextDecorationColors(html) {
  const template = document.createElement('template')

  template.innerHTML = html

  Array.from(template.content.querySelectorAll('u, s, strike, del, [style]')).forEach(element => {
    const lines = getElementTextDecorationLines(element)

    if (!lines.length) return

    applyTextDecorationToTextNodes(element, lines)
    element.style.textDecoration = 'none'
    element.style.textDecorationLine = 'none'
  })

  return template.innerHTML
}

function renderRichText(item, html, width, height, options = {}) {
  const imageKey = options.imageKey || 'richImage'
  const renderKey = options.renderKey || item.id
  const styleOptions = options.style || {}
  const renderVersion = (richRenderVersions.get(renderKey) || 0) + 1
  richRenderVersions.set(renderKey, renderVersion)

  const svgNamespace = 'http://www.w3.org/2000/svg'
  const xhtmlNamespace = 'http://www.w3.org/1999/xhtml'
  const svg = document.createElementNS(svgNamespace, 'svg')
  const foreignObject = document.createElementNS(svgNamespace, 'foreignObject')
  const wrapper = document.createElementNS(xhtmlNamespace, 'div')
  const style = document.createElementNS(xhtmlNamespace, 'style')
  const content = document.createElementNS(xhtmlNamespace, 'div')

  svg.setAttribute('xmlns', svgNamespace)
  svg.setAttribute('width', String(width))
  svg.setAttribute('height', String(height))
  svg.setAttribute('viewBox', `0 0 ${width} ${height}`)

  foreignObject.setAttribute('width', '100%')
  foreignObject.setAttribute('height', '100%')

  wrapper.setAttribute('xmlns', xhtmlNamespace)
  wrapper.setAttribute('style', [
    'box-sizing:border-box',
    'width:100%',
    'height:100%',
    'padding:4px',
    `color:${styleOptions.color || item.fill || '#111'}`,
    `font-family:${styleOptions.fontFamily || item.fontFamily || 'Arial, sans-serif'}`,
    `font-size:${styleOptions.fontSize || item.fontSize || defaultTextSettings.fontSize}px`,
    `line-height:${styleOptions.lineHeight ?? item.lineHeight ?? defaultTextSettings.lineHeight}`,
    `letter-spacing:${styleOptions.letterSpacing ?? item.letterSpacing ?? defaultTextSettings.letterSpacing}px`,
    'overflow-wrap:anywhere'
  ].join(';'))

  style.textContent = `
    * { box-sizing: border-box; }
    p { margin: 0 0 0.35em; }
    p:last-child { margin-bottom: 0; }
    h1, h2, h3 { margin: 0 0 0.35em; line-height: 1.15; }
    ul, ol { margin: 0.25em 0; padding-left: 1.4em; }
    blockquote { margin: 0.25em 0; padding-left: 0.75em; border-left: 3px solid #aaa; }
    pre { margin: 0.25em 0; padding: 0.4em; background: #f1f1f1; white-space: pre-wrap; }
  `

  content.innerHTML = normalizeRichTextDecorationColors(html)
  wrapper.append(style, content)
  foreignObject.append(wrapper)
  svg.append(foreignObject)

  const serializedSvg = new XMLSerializer().serializeToString(svg)
  const objectUrl = URL.createObjectURL(new Blob([serializedSvg], {
    type: 'image/svg+xml;charset=utf-8'
  }))
  const image = new window.Image()

  return new Promise(resolve => {
    image.onload = () => {
      URL.revokeObjectURL(objectUrl)
      if (richRenderVersions.get(renderKey) !== renderVersion) {
        resolve(false)
        return
      }

      item[imageKey] = image

      nextTick(() => {
        if (selectedId.value === item.id) selectElement(item.id)
      })
      resolve(true)
    }

    image.onerror = () => {
      URL.revokeObjectURL(objectUrl)
      resolve(false)
    }

    image.src = objectUrl
  })
}

/* -------------------------
   DRAG
--------------------------*/

function updatePosition(e, id) {
  const el = elements.value.find(i => i.id === id)
  if (!el) return
  if (el.tableGroup) return

  el.x = e.target.x()
  el.y = e.target.y()

  removeElementIfOutsideCanvas(e.target, id)
}

function updatePositionDuringDrag(e, id) {
  const el = elements.value.find(i => i.id === id)
  if (!el || el.tableGroup) return

  el.x = e.target.x()
  el.y = e.target.y()
}

/* -------------------------
   TRANSFORM (RESIZE + ROTATE)
--------------------------*/

function updateTransform(e, id) {
  const node = e.target
  const el = elements.value.find(i => i.id === id)
  if (!el) return

  el.x = node.x()
  el.y = node.y()
  el.rotation = node.rotation()

  if (el.type === 'text') {
    el.width = Math.max(30, node.width() * Math.abs(node.scaleX()))
    el.height = Math.max(20, node.height() * Math.abs(node.scaleY()))
    node.width(el.width)
    node.height(el.height)
    node.scaleX(1)
    node.scaleY(1)
    el.x = node.x()
    el.y = node.y()

    if (removeElementIfOutsideCanvas(node, id)) return

    if (el.richText) {
      renderRichText(el, el.richText, el.width, el.height)
    }

    return
  }

  if (el.type === 'image' || el.type === 'rect' || el.type === 'rightTriangle' || el.type === 'chart' || el.type === 'pieChart' || el.type === 'table') {
    el.width = Math.max(10, node.width() * Math.abs(node.scaleX()))
    el.height = Math.max(10, node.height() * Math.abs(node.scaleY()))
    node.width(el.width)
    node.height(el.height)
    node.scaleX(1)
    node.scaleY(1)
  }

  if (el.type === 'circle') {
    el.radius = Math.max(1, node.radius() * Math.abs(node.scaleX()))
    node.radius(el.radius)
    node.scaleX(1)
    node.scaleY(1)
  }

  if (regularPolygonShapeTypes.includes(el.type)) {
    el.radius = Math.max(1, node.radius() * Math.abs(node.scaleX()))
    node.radius(el.radius)
    node.scaleX(1)
    node.scaleY(1)
  }

  if (['line', 'arrow', 'label', 'group'].includes(el.type)) {
    node.scaleX(1)
    node.scaleY(1)
  }

  el.x = node.x()
  el.y = node.y()
  removeElementIfOutsideCanvas(node, id)
}

const runtimeLayoutKeys = new Set([
  'image',
  'richImage',
  'shapeRichImage',
  'imageDataUrl',
  'imageSource'
])
const DEFAULT_EXPORTED_IMAGE_URL = ''
const PDF_POINTS_PER_INCH = 72
const PDF_EXPORT_MAX_PIXEL_RATIO = 2
const PDF_EXPORT_MAX_CANVAS_SIDE = 8192

function getStageNode() {
  return stageRef.value?.getNode?.() || null
}

function getPdfExportPixelRatio(bounds) {
  const longestSide = Math.max(Number(bounds?.width) || 1, Number(bounds?.height) || 1)

  return Math.max(0.1, Math.min(PDF_EXPORT_MAX_PIXEL_RATIO, PDF_EXPORT_MAX_CANVAS_SIDE / longestSide))
}

function formatPdfNumber(value) {
  const numericValue = Number(value)

  if (!Number.isFinite(numericValue)) return '0'

  return String(Math.round(numericValue * 1000) / 1000)
}

function getDataUrlBase64(dataUrl) {
  const marker = 'base64,'
  const markerIndex = String(dataUrl || '').indexOf(marker)

  return markerIndex >= 0 ? dataUrl.slice(markerIndex + marker.length) : ''
}

function getBase64Bytes(base64) {
  const binaryString = window.atob(String(base64 || '').replace(/\s/g, ''))
  const bytes = new Uint8Array(binaryString.length)

  for (let index = 0; index < binaryString.length; index += 1) {
    bytes[index] = binaryString.charCodeAt(index)
  }

  return bytes
}

function isJpegDataUrl(dataUrl) {
  return /^data:image\/jpe?g;base64,/i.test(String(dataUrl || ''))
}

function getCanvasJpegDataUrl(canvas) {
  if (!canvas?.width || !canvas?.height || typeof canvas.toDataURL !== 'function') {
    throw new Error('Could not capture the current canvas.')
  }

  let dataUrl

  try {
    dataUrl = canvas.toDataURL('image/jpeg', 0.96)
  } catch (error) {
    if (isTaintedCanvasError(error)) {
      throw new Error(getTaintedCanvasPdfExportMessage())
    }

    throw error
  }

  if (!isJpegDataUrl(dataUrl)) {
    throw new Error('Could not encode the current canvas as a PDF image.')
  }

  return dataUrl
}

function isTaintedCanvasError(error) {
  return /taint|cross-origin|insecure/i.test(String(error?.message || error || ''))
}

function getTaintedCanvasPdfExportMessage() {
  return 'PDF export is blocked by a cross-origin image. Re-upload that image from your computer, or use an image URL that allows cross-origin access.'
}

function getCanvasImagePixelSize(image) {
  return {
    width: image?.naturalWidth || image?.videoWidth || image?.width || 0,
    height: image?.naturalHeight || image?.videoHeight || image?.height || 0
  }
}

function isLocalImageSource(source) {
  return /^(data|blob):/i.test(String(source || ''))
}

function isRemoteImageSource(source) {
  return /^https?:\/\//i.test(String(source || ''))
}

async function isCanvasImageExportSafe(image) {
  const size = getCanvasImagePixelSize(image)

  if (!image || !size.width || !size.height) return true

  try {
    const canvas = document.createElement('canvas')
    const context = canvas.getContext('2d')

    if (!context) return false

    canvas.width = 1
    canvas.height = 1
    context.drawImage(image, 0, 0, 1, 1)
    canvas.toDataURL('image/png')

    return true
  } catch {
    return false
  }
}

function readBlobAsDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onload = () => resolve(String(reader.result || ''))
    reader.onerror = () => reject(new Error('Could not read image data.'))
    reader.readAsDataURL(blob)
  })
}

async function fetchImageDataUrl(source) {
  const response = await fetch(source, {
    mode: 'cors',
    credentials: 'omit'
  })

  if (!response.ok) {
    throw new Error('Could not load image for export.')
  }

  return readBlobAsDataUrl(await response.blob())
}

async function loadExportSafeImageFromSource(source) {
  if (!source) return null

  if (isLocalImageSource(source)) {
    return loadImageFromSource(source)
  }

  if (!isRemoteImageSource(source)) return null

  try {
    return await loadImageFromSource(source, { crossOrigin: 'anonymous' })
  } catch {
    const dataUrl = await fetchImageDataUrl(source)

    return loadImageFromSource(dataUrl)
  }
}

function getImageElementExportSource(item) {
  return [
    item?.imageDataUrl,
    item?.image?.src,
    item?.imageUrl,
    item?.sourceUrl,
    item?.url,
    item?.imageSource
  ].find(value => typeof value === 'string' && value.trim())?.trim() || ''
}

async function ensureImageElementExportSafe(item, blockedImages) {
  if (item?.type !== 'image') return
  if (await isCanvasImageExportSafe(item.image)) return

  const source = getImageElementExportSource(item)

  try {
    const exportSafeImage = await loadExportSafeImageFromSource(source)

    if (exportSafeImage && await isCanvasImageExportSafe(exportSafeImage)) {
      item.image = exportSafeImage
      return
    }
  } catch {
    // Fall through to the blocked-image message below.
  }

  blockedImages.push(item)
}

async function prepareRichTextImageForPdfExport(item, imageKey, restoreCallbacks) {
  if (!item?.[imageKey]) return
  if (await isCanvasImageExportSafe(item[imageKey])) return

  const originalImage = item[imageKey]

  item[imageKey] = null
  restoreCallbacks.push(() => {
    item[imageKey] = originalImage
  })
}

async function prepareCanvasItemForPdfExport(item, blockedImages, restoreCallbacks) {
  if (!item || typeof item !== 'object') return

  await ensureImageElementExportSafe(item, blockedImages)
  await prepareRichTextImageForPdfExport(item, 'richImage', restoreCallbacks)
  await prepareRichTextImageForPdfExport(item, 'shapeRichImage', restoreCallbacks)

  if (Array.isArray(item.children)) {
    for (const child of item.children) {
      await prepareCanvasItemForPdfExport(child, blockedImages, restoreCallbacks)
    }
  }
}

async function prepareLayoutForPdfExport() {
  const blockedImages = []
  const restoreCallbacks = []

  for (const item of elements.value) {
    await prepareCanvasItemForPdfExport(item, blockedImages, restoreCallbacks)
  }

  if (blockedImages.length) {
    restoreCallbacks.reverse().forEach(restore => restore())
    throw new Error(`${getTaintedCanvasPdfExportMessage()} Blocked image${blockedImages.length === 1 ? '' : 's'}: ${blockedImages.length}.`)
  }

  if (restoreCallbacks.length) {
    await nextTick()
  }

  return async () => {
    restoreCallbacks.reverse().forEach(restore => restore())

    if (restoreCallbacks.length) {
      await nextTick()
    }
  }
}

function createPdfBlobFromJpegDataUrl(dataUrl, options) {
  if (!isJpegDataUrl(dataUrl)) {
    throw new Error('Could not prepare PDF image data.')
  }

  const imageBytes = getBase64Bytes(getDataUrlBase64(dataUrl))

  if (!imageBytes.length) {
    throw new Error('Could not prepare PDF image data.')
  }

  const encoder = new TextEncoder()
  const chunks = []
  const offsets = [0]
  let offset = 0
  const pageWidth = formatPdfNumber(options.pageWidthInches * PDF_POINTS_PER_INCH)
  const pageHeight = formatPdfNumber(options.pageHeightInches * PDF_POINTS_PER_INCH)
  const imageWidth = Math.max(1, Math.round(options.imageWidth))
  const imageHeight = Math.max(1, Math.round(options.imageHeight))
  const contentBytes = encoder.encode(`q\n${pageWidth} 0 0 ${pageHeight} 0 0 cm\n/Im0 Do\nQ`)

  const pushBytes = bytes => {
    chunks.push(bytes)
    offset += bytes.length
  }
  const pushText = text => pushBytes(encoder.encode(text))
  const objects = [
    [`1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n`],
    [`2 0 obj\n<< /Type /Pages /Count 1 /Kids [3 0 R] >>\nendobj\n`],
    [`3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>\nendobj\n`],
    [
      `4 0 obj\n<< /Type /XObject /Subtype /Image /Width ${imageWidth} /Height ${imageHeight} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${imageBytes.length} >>\nstream\n`,
      imageBytes,
      `\nendstream\nendobj\n`
    ],
    [
      `5 0 obj\n<< /Length ${contentBytes.length} >>\nstream\n`,
      contentBytes,
      `\nendstream\nendobj\n`
    ]
  ]

  pushText('%PDF-1.4\n')

  objects.forEach(objectChunks => {
    offsets.push(offset)

    objectChunks.forEach(chunk => {
      if (typeof chunk === 'string') {
        pushText(chunk)
      } else {
        pushBytes(chunk)
      }
    })
  })

  const xrefOffset = offset
  const xrefRows = offsets
    .slice(1)
    .map(objectOffset => `${String(objectOffset).padStart(10, '0')} 00000 n \n`)
    .join('')

  pushText([
    'xref\n',
    `0 ${objects.length + 1}\n`,
    '0000000000 65535 f \n',
    xrefRows,
    'trailer\n',
    `<< /Size ${objects.length + 1} /Root 1 0 R >>\n`,
    'startxref\n',
    `${xrefOffset}\n`,
    '%%EOF'
  ].join(''))

  return new Blob(chunks, { type: 'application/pdf' })
}

function getPdfExportFileName() {
  const timestamp = new Date()
    .toISOString()
    .replace(/\.\d{3}Z$/, '')
    .replaceAll(':', '-')

  return `pdf-builder-layout-${timestamp}.pdf`
}

function downloadBlobFile(blob, fileName) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')

  link.href = url
  link.download = fileName
  document.body.append(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

async function getCurrentLayoutPdfBlob() {
  const stage = getStageNode()

  if (!stage) {
    throw new Error('Canvas is not ready yet.')
  }

  let restoreExportState = async () => {}

  try {
    if (editingItem.value) {
      await finishTextEditing()
    } else {
      syncActiveTextEditForLayoutExport()
    }

    syncActiveTableCellEditForLayoutExport()

    await nextTick()

    restoreExportState = await prepareLayoutForPdfExport()
    await nextTick()

    const crop = pageConfig.value
    const pixelRatio = getPdfExportPixelRatio(crop)
    const exportCanvas = stage.toCanvas({
      x: crop.x,
      y: crop.y,
      width: crop.width,
      height: crop.height,
      pixelRatio
    })
    const dataUrl = getCanvasJpegDataUrl(exportCanvas)

    return createPdfBlobFromJpegDataUrl(dataUrl, {
      imageWidth: exportCanvas.width,
      imageHeight: exportCanvas.height,
      pageWidthInches: pageSizeInches.value.width,
      pageHeightInches: pageSizeInches.value.height
    })
  } finally {
    await restoreExportState()
  }
}

async function exportCurrentLayoutAsPdf() {
  if (isPdfExporting.value) return

  isPdfExporting.value = true
  pdfExportError.value = ''

  try {
    await nextTick()
    const pdfBlob = await getCurrentLayoutPdfBlob()

    downloadBlobFile(pdfBlob, getPdfExportFileName())
  } catch (error) {
    pdfExportError.value = error?.message || 'Could not export the current layout to PDF.'
  } finally {
    isPdfExporting.value = false
  }
}

function getSerializableLayoutValue(value) {
  if (Array.isArray(value)) return value.map(getSerializableLayoutValue)

  if (value && typeof value === 'object') {
    const output = {}

    Object.entries(value).forEach(([key, entry]) => {
      if (runtimeLayoutKeys.has(key) || typeof entry === 'function') return

      output[key] = getSerializableLayoutValue(entry)
    })

    return output
  }

  return value
}

async function waitForExportImage(image) {
  if (!image) return false
  if (image.complete && (image.naturalWidth || image.width)) return true

  if (typeof image.decode === 'function') {
    try {
      await image.decode()
      return Boolean(image.naturalWidth || image.width)
    } catch {
      return false
    }
  }

  return false
}

async function getImageDataUrlForExport(item) {
  const image = item?.image
  const imageSource = image?.src || ''

  if (imageSource.startsWith('data:')) return imageSource
  if (!await waitForExportImage(image)) return null

  try {
    const width = image.naturalWidth || image.width
    const height = image.naturalHeight || image.height
    const canvas = document.createElement('canvas')
    const context = canvas.getContext('2d')

    if (!width || !height || !context) return null

    canvas.width = width
    canvas.height = height
    context.drawImage(image, 0, 0, width, height)

    return canvas.toDataURL('image/png')
  } catch {
    return null
  }
}

function getImageUrlForExport(item) {
  return item?.imageUrl || item?.sourceUrl || item?.url || DEFAULT_EXPORTED_IMAGE_URL
}

async function serializeLayoutElement(item, options = {}) {
  const serializedItem = getSerializableLayoutValue(item)

  if (Array.isArray(item?.children)) {
    serializedItem.children = await Promise.all(
      item.children.map(child => serializeLayoutElement(child, options))
    )
  }

  if (item?.type === 'image' && options.imageMode === 'base64') {
    serializedItem.imageDataUrl = await getImageDataUrlForExport(item)
  }

  if (item?.type === 'image' && options.imageMode === 'url') {
    serializedItem.imageUrl = getImageUrlForExport(item)
  }

  return serializedItem
}

async function createLayoutExportData(options = {}) {
  syncActiveTextEditForLayoutExport()
  syncActiveTableCellEditForLayoutExport()

  return {
    version: 1,
    imageMode: options.imageMode || 'url',
    exportedAt: new Date().toISOString(),
    page: {
      preset: selectedPagePreset.value,
      unit: pageUnit.value,
      orientation: pageOrientation.value,
      canvasColor: canvasColor.value,
      sizeInches: { ...pageSizeInches.value },
      sizePixels: { ...pagePixelSize.value },
      customSizeInches: { ...customPageSizeInches.value },
      marginPreset: selectedPageMarginPreset.value,
      marginsInches: { ...pageMarginsInches.value },
      customMarginsInches: { ...customPageMarginsInches.value }
    },
    elements: await Promise.all(
      elements.value.map(item => serializeLayoutElement(item, options))
    )
  }
}

function getLayoutExportFileName(variant = 'layout') {
  const timestamp = new Date()
    .toISOString()
    .replace(/\.\d{3}Z$/, '')
    .replaceAll(':', '-')

  return `pdf-builder-${variant}-${timestamp}.json`
}

function downloadJsonFile(data, fileName) {
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: 'application/json;charset=utf-8'
  })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')

  link.href = url
  link.download = fileName
  document.body.append(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

async function exportLayoutAsJson() {
  const data = await createLayoutExportData({ imageMode: 'url' })

  downloadJsonFile(data, getLayoutExportFileName('layout'))
}

async function exportLayoutWithImagesAsJson() {
  const data = await createLayoutExportData({ imageMode: 'base64' })

  downloadJsonFile(data, getLayoutExportFileName('with-images'))
}

async function exportLayoutWithImageUrlsAsJson() {
  const data = await createLayoutExportData({ imageMode: 'url' })

  downloadJsonFile(data, getLayoutExportFileName('image-urls'))
}

function isJsonLayoutFile(file) {
  return file?.type === 'application/json' ||
    /\.json$/i.test(file?.name || '')
}

function getImportLayoutElements(data) {
  if (Array.isArray(data)) return data
  if (Array.isArray(data?.elements)) return data.elements

  return null
}

function getImportedImageSource(item) {
  return [
    item?.imageDataUrl,
    item?.imageUrl,
    item?.imageSource
  ].find(value => typeof value === 'string' && value.trim())?.trim() || ''
}

function loadImageFromSource(source, options = {}) {
  return new Promise((resolve, reject) => {
    if (!source) {
      resolve(null)
      return
    }

    const image = new window.Image()

    if (options.crossOrigin && !source.startsWith('data:')) {
      image.crossOrigin = options.crossOrigin
    }

    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error('Could not load image.'))
    image.src = source
  })
}

async function loadImportedImage(source, stats) {
  if (!source) return null

  try {
    return await loadImageFromSource(source, { crossOrigin: 'anonymous' })
  } catch {
    try {
      return await loadImageFromSource(source)
    } catch {
      stats.failedImages += 1
      return null
    }
  }
}

function getImportElementConfig(item) {
  const config = getSerializableLayoutValue(item)

  delete config.children

  return config
}

function getLegacyTableCellText(children, row, col, cellWidth, cellHeight) {
  const textItem = children.find(child => (
    child?.type === 'text' &&
    Math.floor((Number(child.x) || 0) / cellWidth) === col &&
    Math.floor((Number(child.y) || 0) / cellHeight) === row
  ))

  return textItem?.text || ''
}

function getLegacyTableCellRect(children, row, col, cellWidth, cellHeight) {
  return children.find(child => (
    child?.type === 'rect' &&
    Math.round((Number(child.x) || 0) / cellWidth) === col &&
    Math.round((Number(child.y) || 0) / cellHeight) === row
  )) || null
}

function getMigratedLegacyTableConfig(config) {
  const rows = getTableDimensionValue(config.tableRows, MIN_TABLE_ROWS, MAX_TABLE_ROWS, 3)
  const cols = getTableDimensionValue(config.tableCols, MIN_TABLE_COLS, MAX_TABLE_COLS, 3)
  const width = Math.max(cols * 16, Number(config.width) || cols * DEFAULT_TABLE_CELL_WIDTH)
  const height = Math.max(rows * 16, Number(config.height) || rows * DEFAULT_TABLE_CELL_HEIGHT)
  const cellWidth = width / cols
  const cellHeight = height / rows
  const children = Array.isArray(config.children) ? config.children : []
  const cells = []

  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      const rect = getLegacyTableCellRect(children, row, col, cellWidth, cellHeight)

      cells.push(createTableCell(config.id, row, col, {
        text: getLegacyTableCellText(children, row, col, cellWidth, cellHeight),
        fill: rect?.fill || defaultTableCellSettings.fill,
        borderColor: rect?.stroke || defaultTableCellSettings.borderColor,
        borderWidth: rect?.strokeWidth ?? defaultTableCellSettings.borderWidth,
        borderStyle: getShapeBorderStyleFromDash(rect?.dash)
      }))
    }
  }

  return {
    id: config.id,
    type: 'table',
    x: config.x,
    y: config.y,
    width,
    height,
    rotation: config.rotation || 0,
    rows,
    cols,
    colWidths: Array.from({ length: cols }, () => cellWidth),
    rowHeights: Array.from({ length: rows }, () => cellHeight),
    draggable: config.draggable !== false,
    cells
  }
}

function createImportedElementFromConfig(config) {
  switch (config.type) {
    case 'text':
      return new TextElement(config)
    case 'image':
      return new ImageElement(config)
    case 'rect':
      return new RectElement(config)
    case 'circle':
      return new CircleElement(config)
    case 'polygon':
    case 'triangle':
      return new RegularPolygonElement(config)
    case 'rightTriangle':
      return new RightTriangleElement(config)
    case 'line':
      return new LineElement(config)
    case 'arrow':
      return new ArrowElement(config)
    case 'label':
      return new LabelElement(config)
    case 'chart':
      return new ChartElement(config)
    case 'pieChart':
      return new PieChartElement(config)
    case 'table':
      return new TableElement(config)
    case 'group':
      if (config.groupKind === 'table') {
        return new TableElement(getMigratedLegacyTableConfig(config))
      }

      return new GroupElement(config)
    default:
      return null
  }
}

function ensureImportedElementSettings(item) {
  ensureSelectableItemSettings(item)

  if (Array.isArray(item?.children)) {
    item.children.forEach(ensureImportedElementSettings)
  }
}

async function createImportedElement(item, stats) {
  if (!item || typeof item !== 'object' || !item.type) return null

  const config = getImportElementConfig(item)

  if (Array.isArray(item.children)) {
    const children = await Promise.all(
      item.children.map(child => createImportedElement(child, stats))
    )

    config.children = children.filter(Boolean)
  }

  if (item.type === 'image') {
    const imageSource = getImportedImageSource(item)

    config.imageUrl = typeof item.imageUrl === 'string' ? item.imageUrl : config.imageUrl
    config.image = await loadImportedImage(imageSource, stats)
  }

  const importedElement = createImportedElementFromConfig(config)

  if (!importedElement) return null

  ensureImportedElementSettings(importedElement)

  return importedElement
}

function applyImportedPageSettings(page) {
  if (!page || typeof page !== 'object') return

  if (['cm', 'in'].includes(page.unit)) pageUnit.value = page.unit
  if (['portrait', 'landscape'].includes(page.orientation)) pageOrientation.value = page.orientation
  if (/^#[\da-f]{6}$/i.test(page.canvasColor || '')) canvasColor.value = page.canvasColor
  if (pageSizePresets.some(preset => preset.value === page.preset)) selectedPagePreset.value = page.preset
  if (pageMarginPresets.some(preset => preset.value === page.marginPreset)) selectedPageMarginPreset.value = page.marginPreset

  if (page.customSizeInches && typeof page.customSizeInches === 'object') {
    const width = Number(page.customSizeInches.width)
    const height = Number(page.customSizeInches.height)

    customPageSizeInches.value = {
      width: Number.isFinite(width) ? clampNumber(width, MIN_PAGE_INCHES, MAX_PAGE_INCHES) : customPageSizeInches.value.width,
      height: Number.isFinite(height) ? clampNumber(height, MIN_PAGE_INCHES, MAX_PAGE_INCHES) : customPageSizeInches.value.height
    }
  }

  if (page.customMarginsInches && typeof page.customMarginsInches === 'object') {
    customPageMarginsInches.value = getClampedPageMargins({
      ...customPageMarginsInches.value,
      ...page.customMarginsInches
    })
  }
}

function renderImportedRichTextImages(item) {
  if (!item || typeof item !== 'object') return

  if (item.type === 'text') {
    const html = getStoredRichTextHtml(item, 'richText', 'richTextJson')

    if (html) {
      item.richText = html
      ensureTextSettings(item)
      renderRichText(
        item,
        html,
        item.width || 240,
        item.height || Math.ceil(item.fontSize * item.lineHeight)
      )
    }
  }

  if (canShapeHaveRichText(item)) {
    const html = getStoredRichTextHtml(item, 'shapeRichText', 'shapeRichTextJson')

    if (html) {
      const defaultSize = getDefaultShapeTextSize(item)

      item.shapeRichText = html
      ensureShapeTextSettings(item)
      renderShapeRichText(
        item,
        html,
        item.shapeTextWidth || defaultSize.width,
        item.shapeTextHeight || defaultSize.height
      )
    }
  }

  if (Array.isArray(item.children)) {
    item.children.forEach(renderImportedRichTextImages)
  }
}

async function importLayoutData(data) {
  const layoutElements = getImportLayoutElements(data)

  if (!layoutElements) {
    throw new Error('Choose a valid layout JSON file.')
  }

  const stats = { failedImages: 0 }
  const importedElements = await Promise.all(
    layoutElements.map(item => createImportedElement(item, stats))
  )
  const nextElements = importedElements.filter(Boolean)

  applyImportedPageSettings(data?.page)
  clearCanvas()
  elements.value = nextElements
  await nextTick()
  elements.value.forEach(renderImportedRichTextImages)

  return {
    elementCount: nextElements.length,
    failedImages: stats.failedImages
  }
}

async function importLayoutFile(event) {
  const input = event.target
  const file = input.files?.[0]

  layoutImportError.value = ''
  layoutImportMessage.value = ''

  if (!file) return

  if (!isJsonLayoutFile(file)) {
    layoutImportError.value = 'Choose a JSON layout file.'
    input.value = ''
    return
  }

  isImportingLayout.value = true

  try {
    const data = JSON.parse(await file.text())
    const result = await importLayoutData(data)
    const imageWarning = result.failedImages
      ? ` ${result.failedImages} image${result.failedImages === 1 ? '' : 's'} could not be loaded.`
      : ''

    layoutImportMessage.value = `Imported ${result.elementCount} element${result.elementCount === 1 ? '' : 's'}.${imageWarning}`
  } catch (error) {
    layoutImportError.value = error?.message || 'Could not import this layout.'
  } finally {
    isImportingLayout.value = false
    input.value = ''
  }
}

onMounted(() => {
  window.addEventListener('keydown', handleGlobalClipboardKeyDown)
  window.addEventListener('paste', handleGlobalPaste)
  window.addEventListener('mousedown', handleGlobalMouseDown)
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleGlobalClipboardKeyDown)
  window.removeEventListener('paste', handleGlobalPaste)
  window.removeEventListener('mousedown', handleGlobalMouseDown)
})

  return {
    elements,
    PX_PER_INCH,
    CM_PER_INCH,
    PAGE_OFFSET_X,
    PAGE_OFFSET_Y,
    PAGE_STAGE_PADDING_X,
    PAGE_STAGE_PADDING_Y,
    MIN_PAGE_INCHES,
    MAX_PAGE_INCHES,
    pageSizePresets,
    pageMarginPresets,
    selectedPagePreset,
    pageUnit,
    pageOrientation,
    canvasColor,
    selectedPageMarginPreset,
    customPageSizeInches,
    customPageMarginsInches,
    pageDimensionStep,
    pageDimensionMin,
    pageDimensionMax,
    customPageWidth,
    customPageHeight,
    pageSizeInches,
    pageMarginsInches,
    pageMarginStep,
    pageMarginHorizontalMax,
    pageMarginVerticalMax,
    customPageMarginTop,
    customPageMarginRight,
    customPageMarginBottom,
    customPageMarginLeft,
    pagePixelSize,
    currentPageWidth,
    currentPageHeight,
    currentPageMargins,
    pageConfig,
    pageMarginGuideConfig,
    pageClipConfig,
    stageConfig,
    stageShellStyle,
    rulerSize,
    rulerUnitPixels,
    rulerMinorDivisions,
    rulerUnitLabel,
    canvasRulerCornerStyle,
    canvasRulerHorizontalStyle,
    canvasRulerVerticalStyle,
    horizontalRulerTicks,
    verticalRulerTicks,
    selectedId,
    selectedIds,
    stageRef,
    transformerRef,
    nodeRefs,
    editingId,
    editingTextTarget,
    activeSidebarElementTab,
    sidebarElementTabs,
    tableRowsInput,
    tableColsInput,
    selectedTableCellIds,
    editingTableCell,
    tableCellEditorValue,
    draggedSidebarElementType,
    draggedLayerId,
    dragOverLayerId,
    isImageDragActive,
    qrLink,
    qrError,
    barcodeValue,
    barcodeError,
    isImportingLayout,
    layoutImportError,
    layoutImportMessage,
    isPdfExporting,
    pdfExportError,
    copiedCanvasItems,
    contextMenu,
    lastCanvasPastePoint,
    richRenderVersions,
    canvasVersion,
    defaultImageSettings,
    defaultTextSettings,
    defaultTableCellSettings,
    MIN_TABLE_ROWS,
    MAX_TABLE_ROWS,
    MIN_TABLE_COLS,
    MAX_TABLE_COLS,
    DEFAULT_TABLE_CELL_WIDTH,
    DEFAULT_TABLE_CELL_HEIGHT,
    shapeTypes,
    regularPolygonShapeTypes,
    borderableElementTypes,
    dimensionEditableTypes,
    fillableShapeTypes,
    cornerRadiusFields,
    shapeLabels,
    defaultShapeSettings,
    defaultElementBorderSettings,
    borderStyleOptions,
    defaultLineHitStrokeWidth,
    defaultShapeFills,
    defaultChartSettings,
    defaultPieChartColors,
    defaultPieChartSettings,
    editorPosition,
    fontOptions,
    RichTextStyle,
    TextAlign,
    editor,
    textItems,
    imageItems,
    rectItems,
    circleItems,
    lineItems,
    arrowItems,
    labelItems,
    polygonItems,
    triangleItems,
    chartItems,
    pieChartItems,
    shapeTextItems,
    canvasItems,
    hasCanvasElements,
    layerSidebarItems,
    tableItems,
    selectedItems,
    canDeleteSelected,
    canPasteCopiedItems,
    contextMenuStyle,
    selectedItem,
    selectedLayerIndex,
    canMoveSelectedBackward,
    canMoveSelectedForward,
    selectedElementDimensions,
    canAlignSelected,
    canGroupSelected,
    selectedText,
    selectedGroup,
    selectedTable,
    selectedTableCells,
    selectedLabel,
    selectedImage,
    selectedChart,
    selectedPieChart,
    selectedShape,
    editingItem,
    tableCellEditorStyle,
    transformerConfig,
    richEditorStyle,
    BARCODE_MAX_LENGTH,
    BARCODE_MODULE_WIDTH,
    BARCODE_BAR_HEIGHT,
    BARCODE_LABEL_HEIGHT,
    BARCODE_QUIET_ZONE_MODULES,
    CODE128_START_B,
    CODE128_STOP,
    CODE128_B_PATTERNS,
    getNormalizedQRLink,
    addQR,
    getBarcodeValidationError,
    getCode128BSequence,
    getPatternModuleCount,
    drawBarcodeLabel,
    createBarcodeDataURL,
    addBarcode,
    addText,
    isImageFile,
    getFirstImageFile,
    hasFileDrag,
    hasSidebarElementDrag,
    getSidebarElementDragType,
    handleSidebarElementDragStart,
    handleSidebarElementDragEnd,
    getCanvasDropPoint,
    addUploadedImage,
    uploadImage,
    handleImageDragEnter,
    handleImageDragOver,
    handleImageDragLeave,
    handleImageDrop,
    addRect,
    addCircle,
    addTriangle,
    addRightTriangle,
    addLine,
    addArrow,
    addLabel,
    addPolygon,
    addChart,
    addPieChart,
    createSidebarCanvasElement,
    addSidebarElementToCanvas,
    getTableDimensionValue,
    setTableRowsInput,
    setTableColsInput,
    createTableCellId,
    getTableCellCoordinates,
    createTableCell,
    createDefaultTableCells,
    ensureTableCellSettings,
    normalizeTableCells,
    ensureTableSettings,
    getVisibleTableCells,
    getTableCellById,
    getTableCellLayout,
    getTableConfig,
    getTableCellGroupConfig,
    getTableCellRectConfig,
    getTableCellTextConfig,
    getTableCellSelectionConfig,
    getTableBorderEdgeKey,
    getTableCellBorderEdges,
    getTableBorderLineConfigs,
    getTableCellEditorStyle,
    isTableCellSelected,
    selectTableCell,
    getTableCellContext,
    getSelectedTableCellStyleValue,
    setSelectedTableCellsStyle,
    cloneTableCellStyle,
    fillMissingTableCells,
    insertTableRow,
    insertTableColumn,
    deleteTableRow,
    deleteTableColumn,
    addTableRowFromContext,
    addTableColumnFromContext,
    deleteTableRowFromContext,
    deleteTableColumnFromContext,
    splitTableCellVertically,
    splitTableCellHorizontally,
    splitTableCellVerticallyFromContext,
    splitTableCellHorizontallyFromContext,
    mergeSelectedTableCells,
    addTable,
    setRef,
    clampNumber,
    getRulerTicks,
    formatPageDimension,
    convertInchesToPageUnit,
    getPageUnitInches,
    getPageMarginUnitInches,
    getPresetPageSizeInches,
    getPageMarginPresetInches,
    getClampedPageMargins,
    getCanvasBounds,
    getTopLeftForDropPoint,
    getCenterForDropPoint,
    getLinePositionForDropPoint,
    placeCanvasElementAtDropPoint,
    getItemCoordinate,
    shouldKeepRuntimeCloneReference,
    cloneCanvasItemValue,
    cloneCanvasItem,
    getSelectedItemsBounds,
    getSelectedItemRects,
    getRectsBounds,
    moveCanvasItemByDelta,
    getGroupedCanvasItem,
    getUngroupedCanvasItem,
    getGroupConfig,
    getGroupHitAreaConfig,
    getGroupedChildConfig,
    getGroupedTextConfig,
    getGroupedRichTextImageConfig,
    getGroupedTextBorderConfig,
    getGroupedImageBoxConfig,
    getGroupedImageContentConfig,
    getGroupedImageBorderConfig,
    getGroupedRectConfig,
    getGroupedChartBoxConfig,
    getGroupedChartBorderConfig,
    getGroupedPieChartBoxConfig,
    getGroupedShapeTextImageConfig,
    ensureImageSettings,
    ensureChartSettings,
    ensurePieChartSettings,
    ensureLabelSettings,
    ensureTextSettings,
    getNormalizedTextFontSize,
    getFontSizeValue,
    getTextLineHeightValue,
    getTextLetterSpacingValue,
    rerenderTextRichImage,
    setTextFontSize,
    setTextLineHeight,
    setTextLetterSpacing,
    setLabelFontSize,
    canShapeHaveFill,
    canShapeHaveCornerRadius,
    getShapeStrokeWidthMin,
    getShapeCornerRadiusMax,
    getCornerRadiusMax,
    getCornerRadiusValues,
    getCornerRadiusValue,
    setCornerRadiusValue,
    getCornerRadiusConfig,
    getShapePanelTitle,
    getShapeBorderStyle,
    getShapeBorderStyleFromDash,
    getBorderWidthValue,
    getBorderDash,
    getBorderLineConfig,
    getShapeBorderDash,
    getShapeBorderConfig,
    getElementBorderColor,
    getElementBorderConfig,
    getHexColor,
    canElementHaveBorder,
    ensureElementBorderSettings,
    ensureShapeSettings,
    canShapeHaveRichText,
    getEditingTextBaseFontSize,
    getEditingTextColor,
    getEditingTextFontFamily,
    getEditingTextLineHeight,
    getEditingTextLetterSpacing,
    ensureShapeTextSettings,
    getRotatedPoint,
    getLineRawBounds,
    getLineLocalBounds,
    getFallbackElementPixelDimensions,
    getElementPixelDimensions,
    formatDimensionNumber,
    formatDimensionPair,
    getElementDimensionReadout,
    canEditElementDimensions,
    getEditableElementDimensions,
    getEditableElementDimensionValue,
    getDimensionInputValue,
    normalizeElementRotation,
    canEditElementRotation,
    getElementRotationValue,
    setElementRotation,
    resizeLineElementDimension,
    setEditableElementDimension,
    getShapeTextCenter,
    getDefaultShapeTextSize,
    getShapeTextBox,
    getShapeTextImageConfig,
    getTextConfig,
    getTextBorderConfig,
    getRectConfig,
    getCircleConfig,
    getRegularPolygonConfig,
    getRightTriangleConfig,
    getLineConfig,
    getArrowConfig,
    getRichTextImageConfig,
    getImageBoxConfig,
    getImageHitAreaConfig,
    getImageBorderConfig,
    getLabelConfig,
    getLabelTagConfig,
    getLabelTextConfig,
    getImageCropRect,
    getImageContentConfig,
    getImageCornerRadiusMax,
    resetImageCrop,
    setImageObjectFit,
    setChartType,
    getChartBoxConfig,
    getChartHitAreaConfig,
    getChartBorderConfig,
    parseChartNumberList,
    getChartSeries,
    getChartRange,
    formatChartAxisValue,
    getChartTickValues,
    getChartPlotMeta,
    getChartPointPosition,
    getChartLinePoints,
    getChartAreaPoints,
    getChartGridLines,
    getChartGridLineConfig,
    getChartFrameConfig,
    getChartAreaConfig,
    getChartLineConfig,
    getChartPointConfigs,
    getChartAxisValueLabelConfigs,
    getChartTitleConfig,
    getChartXAxisLabelConfig,
    getChartYAxisLabelConfig,
    getPieChartBoxConfig,
    getPieChartBackgroundConfig,
    parsePieChartData,
    getPieChartSliceColor,
    setPieChartSliceColor,
    getPieChartEntries,
    getPieChartPlotMeta,
    getPieChartSliceConfigs,
    getPieChartLabelConfigs,
    getPieChartTitleConfig,
    getCurrentTextStyle,
    getCurrentTextColor,
    getCurrentTextBackground,
    getCurrentTextFontFamily,
    getCurrentTextFontSize,
    getCurrentTextOpacity,
    getCleanTextStyleAttrs,
    applyTextStyle,
    applyRichTextFontSize,
    clearTextStyleAttribute,
    setTextAlign,
    isTextAlignActive,
    truncateLayerText,
    getLayerTitleSuffix,
    getLayerItemTitle,
    getCanvasItemById,
    syncCanvasLayerOrder,
    reorderCanvasItemLayer,
    reorderSelectedLayer,
    moveSelectedLayerBackward,
    moveSelectedLayerForward,
    moveSelectedLayerToBack,
    moveSelectedLayerToFront,
    alignSelectedElements,
    collectCanvasItemIds,
    createUniqueCanvasItemId,
    assignClonedCanvasItemIds,
    getSelectedCanvasItemsForClipboard,
    copySelectedCanvasItems,
    getClipboardItemRect,
    getClipboardItemsBounds,
    getPasteDelta,
    preparePastedCanvasItem,
    pasteCopiedCanvasItems,
    hideContextMenu,
    getStageLocalPointFromPointerEvent,
    getStagePointerPosition,
    getDefaultCanvasPastePoint,
    getClampedCanvasPastePoint,
    setLastCanvasPastePoint,
    getCanvasPastePoint,
    handleStagePointerMove,
    getContextMenuSize,
    getContextMenuPosition,
    getViewportContextMenuPosition,
    getElementContextMenuPosition,
    getCanvasItemIdFromKonvaTarget,
    showElementContextMenu,
    showCanvasContextMenu,
    handleStageContextMenu,
    handleSelectableContextMenu,
    copyContextMenuElement,
    deleteContextMenuElement,
    pasteContextMenuItems,
    handleContextMenuMouseDown,
    handleGlobalMouseDown,
    getClipboardImageFile,
    getClipboardPlainText,
    pasteExternalClipboardImage,
    pasteExternalClipboardText,
    handleGlobalPaste,
    isEditableKeyboardTarget,
    handleGlobalClipboardKeyDown,
    ensureSelectableItemSettings,
    updateTransformerSelection,
    selectElements,
    selectElement,
    selectLayerSidebarItem,
    handleLayerContextMenu,
    handleLayerDragStart,
    handleLayerDragOver,
    handleLayerDragLeave,
    handleLayerDrop,
    handleLayerDragEnd,
    toggleElementSelection,
    isMultiSelectEvent,
    handleSelectablePointerDown,
    stopSelectableClick,
    handleTableCellPointerDown,
    startTableCellEditing,
    syncTableCellEditorValue,
    finishTableCellEditing,
    handleTableCellEditorInput,
    handleTableCellEditorKeydown,
    handleTableCellContextMenu,
    clearSelection,
    groupSelectedElements,
    ungroupSelectedGroup,
    clearCanvas,
    deleteSelectedElements,
    isNodeOutsideCanvas,
    removeElement,
    removeElementIfOutsideCanvas,
    removeOutsideCanvasElements,
    isTargetInsideNode,
    isSelectableCanvasTarget,
    isTransformerTarget,
    escapeHtml,
    syncEditorContent,
    getStoredRichTextEditorContent,
    getHtmlFromRichTextJson,
    getStoredRichTextHtml,
    shouldLowercaseText,
    getTextCaseTransformer,
    transformRichTextJsonText,
    transformRichTextHtmlText,
    toggleTextCase,
    syncActiveTextEditForLayoutExport,
    syncActiveTableCellEditForLayoutExport,
    startTextEditing,
    startShapeTextEditing,
    handleStagePointerDown,
    finishTextEditing,
    renderShapeRichText,
    getElementTextDecorationLines,
    setTextDecorationLines,
    wrapTextNodeWithDecoration,
    applyTextDecorationToTextNodes,
    normalizeRichTextDecorationColors,
    renderRichText,
    updatePosition,
    updatePositionDuringDrag,
    updateTransform,
    runtimeLayoutKeys,
    DEFAULT_EXPORTED_IMAGE_URL,
    PDF_POINTS_PER_INCH,
    PDF_EXPORT_MAX_PIXEL_RATIO,
    PDF_EXPORT_MAX_CANVAS_SIDE,
    getStageNode,
    getPdfExportPixelRatio,
    formatPdfNumber,
    getDataUrlBase64,
    getBase64Bytes,
    isJpegDataUrl,
    getCanvasJpegDataUrl,
    createPdfBlobFromJpegDataUrl,
    getPdfExportFileName,
    downloadBlobFile,
    getCurrentLayoutPdfBlob,
    exportCurrentLayoutAsPdf,
    getSerializableLayoutValue,
    waitForExportImage,
    getImageDataUrlForExport,
    getImageUrlForExport,
    serializeLayoutElement,
    createLayoutExportData,
    getLayoutExportFileName,
    downloadJsonFile,
    exportLayoutAsJson,
    exportLayoutWithImagesAsJson,
    exportLayoutWithImageUrlsAsJson,
    isJsonLayoutFile,
    getImportLayoutElements,
    getImportedImageSource,
    loadImageFromSource,
    loadImportedImage,
    getImportElementConfig,
    createImportedElementFromConfig,
    ensureImportedElementSettings,
    createImportedElement,
    applyImportedPageSettings,
    renderImportedRichTextImages,
    importLayoutData,
    importLayoutFile
  }
}
