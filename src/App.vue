<script setup>
import { ref, computed, nextTick, watch } from 'vue'
import { Extension, Mark } from '@tiptap/core'
import { EditorContent, useEditor } from '@tiptap/vue-3'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import QRCode from 'qrcode'

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
  stroke: '#d1d5db',
  strokeWidth: 1,
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

const selectedId = ref(null)
const selectedIds = ref([])
const transformerRef = ref(null)
const nodeRefs = ref({})
const editingId = ref(null)
const editingTextTarget = ref('text')
const isImageDragActive = ref(false)
const qrLink = ref('')
const qrError = ref('')
const barcodeValue = ref('')
const barcodeError = ref('')
const richRenderVersions = new Map()
let canvasVersion = 0
const defaultImageSettings = {
  cornerRadius: 0,
  opacity: 1,
  objectFit: 'cover',
  cropLeft: 0,
  cropRight: 0,
  cropTop: 0,
  cropBottom: 0
}
const shapeTypes = ['rect', 'circle', 'polygon', 'line']
const fillableShapeTypes = ['rect', 'circle', 'polygon']
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
  line: 'Line'
}
const defaultShapeSettings = {
  stroke: '#111827',
  strokeWidth: 2,
  opacity: 1
}
const defaultShapeFills = {
  rect: '#dddddd',
  circle: '#87ceeb',
  polygon: '#f1c40f'
}
const defaultChartSettings = {
  chartType: 'line',
  chartTitle: 'Graph title',
  xAxisLabel: 'X axis',
  yAxisLabel: 'Y axis',
  chartData: '12, 48, 32, 76, 54, 92, 68',
  stroke: '#2563eb',
  fill: '#93c5fd',
  fillOpacity: 0.35,
  strokeWidth: 3,
  pointRadius: 4,
  showGrid: true,
  showPoints: true
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
        parseHTML: element => element.style.color || null,
        renderHTML: () => ({})
      },
      backgroundColor: {
        default: null,
        parseHTML: element => element.style.backgroundColor || null,
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
const chartItems = computed(() => elements.value.filter(i => i.type === 'chart'))
const shapeTextItems = computed(() => elements.value.filter(i => shapeTypes.includes(i.type) && i.shapeRichImage))
const canvasItems = computed(() => elements.value.filter(item => !item.tableGroup))
const hasCanvasElements = computed(() => elements.value.length > 0)

// Table elements (rects and text) handled separately to keep positioning group-logical
const tableItems = computed(() => elements.value.filter(i => i.tableGroup))
const selectedItems = computed(() => {
  const selectedIdSet = new Set(selectedIds.value)

  return canvasItems.value.filter(item => selectedIdSet.has(item.id))
})
const selectedItem = computed(() => elements.value.find(i => i.id === selectedId.value) || null)
const selectedLayerIndex = computed(() => canvasItems.value.findIndex(item => item.id === selectedId.value))
const canMoveSelectedBackward = computed(() => selectedLayerIndex.value > 0)
const canMoveSelectedForward = computed(() => (
  selectedLayerIndex.value >= 0 && selectedLayerIndex.value < canvasItems.value.length - 1
))
const canGroupSelected = computed(() => (
  selectedItems.value.length > 1 &&
  selectedItems.value.every(item => item.type !== 'group')
))
const selectedText = computed(() => selectedItem.value?.type === 'text' && !selectedItem.value.tableGroup ? selectedItem.value : null)
const selectedGroup = computed(() => selectedItem.value?.type === 'group' ? selectedItem.value : null)
const selectedLabel = computed(() => {
  const item = selectedItem.value

  if (item?.type !== 'label') return null

  return item
})
const selectedImage = computed(() => selectedItem.value?.type === 'image' ? selectedItem.value : null)
const selectedChart = computed(() => selectedItem.value?.type === 'chart' ? selectedItem.value : null)
const selectedShape = computed(() => {
  const item = selectedItem.value

  if (!item || !shapeTypes.includes(item.type)) return null

  return item
})
const editingItem = computed(() => elements.value.find(i => i.id === editingId.value) || null)
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
  const canResizeFreely = !isMoveOnlySelection && ['text', 'image', 'chart'].includes(selectedItem.value?.type)

  return {
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
    '--editor-font-family': getEditingTextFontFamily(item)
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

function addQR() {
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

      elements.value.push({
        id,
        type: 'image',
        image: img,
        x: 200,
        y: 200,
        width: 120,
        height: 120,
        ...defaultImageSettings,
        draggable: true
      })

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

function addBarcode() {
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

    elements.value.push({
      id,
      type: 'image',
      image: img,
      x: 200,
      y: 200,
      width,
      height,
      ...defaultImageSettings,
      objectFit: 'contain',
      draggable: true
    })

    nextTick(() => selectElement(id))
  }

  img.onerror = () => {
    barcodeError.value = 'Could not generate this barcode.'
  }
}

function addText() {
  elements.value.push({
    id: Date.now(),
    type: 'text',
    text: 'Text',
    x: 150,
    y: 150,
    width: 240,
    height: 80,
    fontSize: 20,
    wrap: 'word',
    draggable: true
  })
}

function addImage() {
  const img = new window.Image()
  const targetCanvasVersion = canvasVersion

  img.crossOrigin = 'anonymous'
  img.src = 'https://konvajs.org/assets/yoda.jpg'

  img.onload = () => {
    if (targetCanvasVersion !== canvasVersion) return

    elements.value.push({
      id: Date.now(),
      type: 'image',
      image: img,
      x: 200,
      y: 200,
      width: 150,
      height: 150,
      ...defaultImageSettings,
      draggable: true
    })
  }
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

    elements.value.push({
      id,
      type: 'image',
      image: img,
      x,
      y,
      width,
      height,
      ...defaultImageSettings,
      draggable: true
    })

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
  if (!hasFileDrag(event)) return

  event.preventDefault()
  isImageDragActive.value = true
}

function handleImageDragOver(event) {
  if (!hasFileDrag(event)) return

  event.preventDefault()
  event.dataTransfer.dropEffect = 'copy'
  isImageDragActive.value = true
}

function handleImageDragLeave(event) {
  if (event.relatedTarget && event.currentTarget.contains(event.relatedTarget)) return

  isImageDragActive.value = false
}

function handleImageDrop(event) {
  if (!hasFileDrag(event)) return

  event.preventDefault()
  isImageDragActive.value = false

  const file = getFirstImageFile(event.dataTransfer?.files)
  if (!file) return

  addUploadedImage(file, getCanvasDropPoint(event))
}

function addRect() {
  elements.value.push({
    id: Date.now(),
    type: 'rect',
    x: 200,
    y: 200,
    width: 120,
    height: 80,
    fill: '#dddddd',
    stroke: '#111827',
    strokeWidth: 2,
    cornerRadius: 0,
    opacity: 1,
    draggable: true
  })
}

function addCircle() {
  elements.value.push({
    id: Date.now(),
    type: 'circle',
    x: 250,
    y: 250,
    radius: 40,
    fill: '#87ceeb',
    stroke: '#111827',
    strokeWidth: 2,
    opacity: 1,
    draggable: true
  })
}

function addLine() {
  elements.value.push({
    id: Date.now(),
    type: 'line',
    points: [100, 100, 300, 300],
    stroke: '#000000',
    strokeWidth: 2,
    opacity: 1,
    lineCap: 'round',
    lineJoin: 'round',
    draggable: true
  })
}

function addArrow() {
  elements.value.push({
    id: Date.now(),
    type: 'arrow',
    points: [100, 200, 300, 200],
    stroke: 'red',
    strokeWidth: 3,
    pointerLength: 10,
    pointerWidth: 10,
    draggable: true
  })
}

function addLabel() {
  elements.value.push({
    id: Date.now(),
    type: 'label',
    x: 200,
    y: 200,
    draggable: true,
    text: 'LABEL',
    tag: {
      fill: '#3498db',
      cornerRadius: 4
    },
    textConfig: {
      fontSize: 14,
      fill: 'white',
      padding: 5
    }
  })
}

function addPolygon() {
  elements.value.push({
    id: Date.now(),
    type: 'polygon',
    x: 300,
    y: 300,
    sides: 6,
    radius: 50,
    fill: '#f1c40f',
    stroke: '#000000',
    strokeWidth: 2,
    opacity: 1,
    draggable: true
  })
}

function addChart() {
  const id = Date.now()

  elements.value.push({
    id,
    type: 'chart',
    x: 180,
    y: 220,
    width: 280,
    height: 170,
    rotation: 0,
    draggable: true,
    ...defaultChartSettings
  })

  nextTick(() => selectElement(id))
}

function addTable() {
  const rows = 3
  const cols = 3
  const cellW = 100
  const cellH = 40
  const groupId = Date.now()

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      // background cell
      elements.value.push({
        id: `${groupId}-cell-${r}-${c}`,
        type: 'rect',
        x: 200 + c * cellW,
        y: 200 + r * cellH,
        width: cellW,
        height: cellH,
        fill: '#fff',
        stroke: '#000',
        strokeWidth: 1,
        draggable: false,
        tableGroup: groupId
      })

      // text inside cell
      elements.value.push({
        id: `${groupId}-text-${r}-${c}`,
        type: 'text',
        text: `${r},${c}`,
        x: 200 + c * cellW + 10,
        y: 200 + r * cellH + 10,
        fontSize: 14,
        draggable: false,
        tableGroup: groupId
      })
    }
  }
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

function getItemCoordinate(item, key) {
  const value = Number(item?.[key])

  return Number.isFinite(value) ? value : 0
}

function cloneCanvasItem(item) {
  const clone = { ...item }

  if (Array.isArray(item.points)) clone.points = [...item.points]
  if (Array.isArray(item.cornerRadius)) clone.cornerRadius = [...item.cornerRadius]
  if (item.tag) clone.tag = { ...item.tag }
  if (item.textConfig) clone.textConfig = { ...item.textConfig }
  if (Array.isArray(item.children)) clone.children = item.children.map(cloneCanvasItem)

  return clone
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

function getGroupedImageBoxConfig(item) {
  return getGroupedChildConfig(getImageBoxConfig(item))
}

function getGroupedImageContentConfig(item) {
  return getGroupedChildConfig(getImageContentConfig(item))
}

function getGroupedRectConfig(item) {
  return getGroupedChildConfig(getRectConfig(item))
}

function getGroupedChartBoxConfig(item) {
  return getGroupedChildConfig(getChartBoxConfig(item))
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

  Object.entries(defaultChartSettings).forEach(([key, value]) => {
    if (item[key] === undefined) item[key] = value
  })
}

function ensureLabelSettings(item) {
  if (!item || item.type !== 'label') return

  if (!item.textConfig) item.textConfig = {}
  if (item.textConfig.fontSize === undefined) item.textConfig.fontSize = 14
  if (item.textConfig.fill === undefined) item.textConfig.fill = 'white'
  if (item.textConfig.padding === undefined) item.textConfig.padding = 5
}

function getNormalizedTextFontSize(value) {
  if (value === null || value === undefined || value === '') return null

  return Math.round(clampNumber(Number.parseFloat(value), 8, 144))
}

function getFontSizeValue(value) {
  return getNormalizedTextFontSize(value) || 20
}

function setTextFontSize(item, value) {
  if (!item || item.type !== 'text') return

  item.fontSize = getFontSizeValue(value)

  if (item.richText && item.id !== editingId.value) {
    const width = item.width || 240
    const height = item.height || Math.ceil(item.fontSize * 1.5)

    renderRichText(item, item.richText, width, height)
  }
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

  return namedColors[color] || fallback
}

function ensureShapeSettings(item) {
  if (!item || !shapeTypes.includes(item.type)) return

  if (item.stroke === undefined) item.stroke = defaultShapeSettings.stroke
  if (item.strokeWidth === undefined) item.strokeWidth = defaultShapeSettings.strokeWidth
  if (item.opacity === undefined) item.opacity = defaultShapeSettings.opacity

  item.stroke = getHexColor(item.stroke, defaultShapeSettings.stroke)

  if (canShapeHaveFill(item) && item.fill === undefined) {
    item.fill = defaultShapeFills[item.type]
  }

  if (canShapeHaveFill(item)) {
    item.fill = getHexColor(item.fill, defaultShapeFills[item.type])
  }

  if (canShapeHaveCornerRadius(item) && item.cornerRadius === undefined) {
    item.cornerRadius = 0
  }

  if (item.type === 'line') {
    if (item.lineCap === undefined) item.lineCap = 'round'
    if (item.lineJoin === undefined) item.lineJoin = 'round'
  }
}

function canShapeHaveRichText(item) {
  return item && ['rect', 'circle', 'polygon', 'line'].includes(item.type)
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

function getLineLocalBounds(item) {
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
      height: 1
    }
  }

  const minX = Math.min(...xs)
  const maxX = Math.max(...xs)
  const minY = Math.min(...ys)
  const maxY = Math.max(...ys)

  return {
    minX,
    minY,
    width: Math.max(1, maxX - minX),
    height: Math.max(1, maxY - minY)
  }
}

function getShapeTextCenter(item) {
  const rotation = item.rotation || 0

  if (item.type === 'rect') {
    return getRotatedPoint(
      item.x || 0,
      item.y || 0,
      (item.width || 0) / 2,
      (item.height || 0) / 2,
      rotation
    )
  }

  if (item.type === 'circle' || item.type === 'polygon') {
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
  if (item.type === 'rect') {
    return {
      width: Math.max(80, (item.width || 120) * 0.8),
      height: Math.max(32, Math.min(80, (item.height || 80) * 0.6))
    }
  }

  if (item.type === 'circle' || item.type === 'polygon') {
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
  const { richText, richImage, ...config } = item
  return {
    ...config,
    visible: item.id !== editingId.value
  }
}

function getRectConfig(item) {
  return {
    ...item,
    stroke: item.stroke ?? defaultShapeSettings.stroke,
    strokeWidth: item.strokeWidth ?? defaultShapeSettings.strokeWidth,
    opacity: item.opacity ?? defaultShapeSettings.opacity,
    fill: item.fill ?? defaultShapeFills.rect,
    cornerRadius: getCornerRadiusConfig(item)
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
    fill: 'rgba(0,0,0,0)'
  }
}

function parseChartValues(item) {
  const values = String(item.chartData || '')
    .split(/[\s,;]+/)
    .map(value => Number(value.trim()))
    .filter(Number.isFinite)

  return values.length ? values : [0]
}

function getChartPlotMeta(item) {
  const width = Math.max(1, item.width || 1)
  const height = Math.max(1, item.height || 1)
  const hasTitle = Boolean(item.chartTitle)
  const hasXAxisLabel = Boolean(item.xAxisLabel)
  const hasYAxisLabel = Boolean(item.yAxisLabel)
  const padding = 14
  const leftPadding = padding + (hasYAxisLabel ? 24 : 0)
  const rightPadding = padding
  const topPadding = padding + (hasTitle ? 22 : 0)
  const bottomPadding = padding + (hasXAxisLabel ? 24 : 0)
  const plotWidth = Math.max(1, width - leftPadding - rightPadding)
  const plotHeight = Math.max(1, height - topPadding - bottomPadding)
  const values = parseChartValues(item)
  const min = Math.min(...values)
  const max = Math.max(...values)
  const range = max - min || 1

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
    values,
    min,
    max,
    range
  }
}

function getChartLinePoints(item) {
  const meta = getChartPlotMeta(item)
  const step = meta.values.length > 1 ? meta.plotWidth / (meta.values.length - 1) : 0

  return meta.values.flatMap((value, index) => {
    const x = meta.values.length > 1
      ? meta.leftPadding + step * index
      : meta.leftPadding + meta.plotWidth / 2
    const y = meta.topPadding + (meta.max - value) / meta.range * meta.plotHeight

    return [x, y]
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
  const count = 4

  for (let i = 0; i <= count; i++) {
    const y = meta.topPadding + meta.plotHeight / count * i
    lines.push({
      id: `h-${i}`,
      points: [meta.leftPadding, y, meta.width - meta.rightPadding, y]
    })
  }

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

function reorderSelectedLayer(targetLayerIndex) {
  const layerItems = canvasItems.value
  const currentLayerIndex = selectedLayerIndex.value

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
  const currentElementIndex = nextElements.findIndex(element => element.id === item.id)

  if (currentElementIndex < 0) return

  nextElements.splice(currentElementIndex, 1)

  const targetElementIndex = nextElements.findIndex(element => element.id === targetItem.id)
  const insertIndex = targetLayerIndex > currentLayerIndex
    ? targetElementIndex + 1
    : targetElementIndex

  nextElements.splice(insertIndex, 0, item)
  elements.value = nextElements

  nextTick(() => selectElement(item.id))
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

function ensureSelectableItemSettings(item) {
  ensureImageSettings(item)
  ensureChartSettings(item)
  ensureLabelSettings(item)
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

  nextIds.forEach(id => {
    const item = elements.value.find(i => i.id === id)
    ensureSelectableItemSettings(item)
  })

  updateTransformerSelection(nextIds)
}

function selectElement(id) {
  selectElements([id])
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

  if (isMultiSelectEvent(event)) {
    toggleElementSelection(id)
    return
  }

  selectElement(id)
}

function stopSelectableClick(event) {
  event.cancelBubble = true
}

function clearSelection() {
  selectedId.value = null
  selectedIds.value = []

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
  const groupItem = {
    id: groupId,
    type: 'group',
    x: bounds.x,
    y: bounds.y,
    width: bounds.width,
    height: bounds.height,
    draggable: true,
    children: itemsToGroup.map(item => getGroupedCanvasItem(item, bounds.x, bounds.y))
  }
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
    item.shapeText = editor.value.getText({ blockSeparator: '\n' })
    return
  }

  item.richText = editor.value.getHTML()
  item.text = editor.value.getText({ blockSeparator: '\n' })
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
  const content = item.richText || `<p>${plainTextContent}</p>`
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
  const content = item.shapeRichText || `<p>${plainTextContent}</p>`
  editor.value.commands.setContent(content, { emitUpdate: false })

  nextTick(() => editor.value?.commands.focus('end'))
}

function handleStagePointerDown(event) {
  const target = event.target
  const isEditingTarget = isTargetInsideNode(target, nodeRefs.value[editingId.value])

  if (editingId.value && !isEditingTarget) {
    finishTextEditing()
  }

  if (isSelectableCanvasTarget(target) || isTransformerTarget(target)) return

  clearSelection()
}

function finishTextEditing() {
  const item = editingItem.value
  if (!item || !editor.value) return

  const target = editingTextTarget.value

  syncEditorContent()

  const html = target === 'shape' ? item.shapeRichText : item.richText
  const width = editorPosition.value.width
  const contentElement = editor.value.view.dom
  const height = Math.max(
    Math.ceil(contentElement.scrollHeight),
    Math.ceil(getEditingTextBaseFontSize(item) * 1.5)
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
    renderShapeRichText(item, html, width, height)
  } else {
    renderRichText(item, html, width, height)
  }
}

function renderShapeRichText(item, html, width, height) {
  renderRichText(item, html, width, height, {
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
    `font-size:${styleOptions.fontSize || item.fontSize || 20}px`,
    `line-height:${styleOptions.lineHeight || item.lineHeight || 1.35}`,
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

  content.innerHTML = html
  wrapper.append(style, content)
  foreignObject.append(wrapper)
  svg.append(foreignObject)

  const serializedSvg = new XMLSerializer().serializeToString(svg)
  const objectUrl = URL.createObjectURL(new Blob([serializedSvg], {
    type: 'image/svg+xml;charset=utf-8'
  }))
  const image = new window.Image()

  image.onload = () => {
    URL.revokeObjectURL(objectUrl)
    if (richRenderVersions.get(renderKey) !== renderVersion) return

    item[imageKey] = image

    nextTick(() => {
      if (selectedId.value === item.id) selectElement(item.id)
    })
  }

  image.onerror = () => URL.revokeObjectURL(objectUrl)
  image.src = objectUrl
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

  if (el.type === 'image' || el.type === 'rect' || el.type === 'chart') {
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

  if (el.type === 'polygon') {
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
</script>

<template>
  <div class="layout">

    <div class="toolbar">
      <div class="page-size-panel">
        <div class="panel-title">Canvas Size</div>

        <label class="control-row canvas-color-row">
          <span>Canvas Color</span>
          <input v-model="canvasColor" type="color" aria-label="Canvas color">
        </label>

        <label class="control-row">
          <span>Preset</span>
          <select v-model="selectedPagePreset" class="control-select">
            <option
                v-for="preset in pageSizePresets"
                :key="preset.value"
                :value="preset.value"
            >
              {{ preset.label }}
            </option>
          </select>
        </label>

        <label class="control-row">
          <span>Units</span>
          <select v-model="pageUnit" class="control-select">
            <option value="cm">Centimeters</option>
            <option value="in">Inches</option>
          </select>
        </label>

        <div class="control-row">
          <span>Orientation</span>
          <div class="segmented-control">
            <button
                type="button"
                :class="{ active: pageOrientation === 'portrait' }"
                @click="pageOrientation = 'portrait'"
            >
              Portrait
            </button>
            <button
                type="button"
                :class="{ active: pageOrientation === 'landscape' }"
                @click="pageOrientation = 'landscape'"
            >
              Landscape
            </button>
          </div>
        </div>

        <div v-if="selectedPagePreset === 'custom'" class="page-size-grid">
          <label>
            <span>Width</span>
            <input
                v-model.number="customPageWidth"
                type="number"
                :min="pageDimensionMin"
                :max="pageDimensionMax"
                :step="pageDimensionStep"
            >
          </label>
          <label>
            <span>Height</span>
            <input
                v-model.number="customPageHeight"
                type="number"
                :min="pageDimensionMin"
                :max="pageDimensionMax"
                :step="pageDimensionStep"
            >
          </label>
        </div>

        <div class="page-size-readout">
          {{ currentPageWidth }} x {{ currentPageHeight }} {{ pageUnit }}
          <span>{{ pagePixelSize.width }} x {{ pagePixelSize.height }} px</span>
        </div>

        <label class="control-row">
          <span>Margins</span>
          <select v-model="selectedPageMarginPreset" class="control-select">
            <option
                v-for="preset in pageMarginPresets"
                :key="preset.value"
                :value="preset.value"
            >
              {{ preset.label }}
            </option>
          </select>
        </label>

        <div v-if="selectedPageMarginPreset === 'custom'" class="page-margin-grid">
          <label>
            <span>Top ({{ pageUnit }})</span>
            <input
                v-model.number="customPageMarginTop"
                type="number"
                min="0"
                :max="pageMarginVerticalMax"
                :step="pageMarginStep"
            >
          </label>
          <label>
            <span>Right ({{ pageUnit }})</span>
            <input
                v-model.number="customPageMarginRight"
                type="number"
                min="0"
                :max="pageMarginHorizontalMax"
                :step="pageMarginStep"
            >
          </label>
          <label>
            <span>Bottom ({{ pageUnit }})</span>
            <input
                v-model.number="customPageMarginBottom"
                type="number"
                min="0"
                :max="pageMarginVerticalMax"
                :step="pageMarginStep"
            >
          </label>
          <label>
            <span>Left ({{ pageUnit }})</span>
            <input
                v-model.number="customPageMarginLeft"
                type="number"
                min="0"
                :max="pageMarginHorizontalMax"
                :step="pageMarginStep"
            >
          </label>
        </div>

        <div v-else class="page-margin-readout">
          <span>Top {{ currentPageMargins.top }} {{ pageUnit }}</span>
          <span>Right {{ currentPageMargins.right }} {{ pageUnit }}</span>
          <span>Bottom {{ currentPageMargins.bottom }} {{ pageUnit }}</span>
          <span>Left {{ currentPageMargins.left }} {{ pageUnit }}</span>
        </div>
      </div>

      <button @click="addText">Text</button>
      <button @click="addImage">Image</button>
      <label class="file-upload-button">
        Upload Image
        <input type="file" accept="image/*" @change="uploadImage">
      </label>
      <div class="qr-panel">
        <label class="control-row">
          <span>QR Link</span>
          <input
              v-model="qrLink"
              class="qr-link-input"
              type="url"
              placeholder="https://example.com"
              @input="qrError = ''"
              @keydown.enter.prevent="addQR"
          >
        </label>
        <button
            type="button"
            :disabled="!qrLink.trim()"
            @click="addQR"
        >
          QR Code
        </button>
        <p v-if="qrError" class="field-error">{{ qrError }}</p>
      </div>
      <div class="barcode-panel">
        <label class="control-row">
          <span>Barcode Value</span>
          <input
              v-model="barcodeValue"
              class="barcode-value-input"
              type="text"
              :maxlength="BARCODE_MAX_LENGTH"
              placeholder="ABC-12345"
              autocomplete="off"
              @input="barcodeError = ''"
              @keydown.enter.prevent="addBarcode"
          >
        </label>
        <button
            type="button"
            :disabled="!barcodeValue.trim()"
            @click="addBarcode"
        >
          Barcode
        </button>
        <p v-if="barcodeError" class="field-error">{{ barcodeError }}</p>
      </div>
      <button @click="addRect">Rect</button>
      <button @click="addCircle">Circle</button>
      <button @click="addPolygon">Polygon</button>
      <button @click="addChart">Graph</button>
      <button @click="addLine">Line</button>
      <button @click="addArrow">Arrow</button>
      <button @click="addLabel">Label</button>
      <button @click="addTable">Table</button>
      <button
          class="clear-canvas-button"
          type="button"
          :disabled="!hasCanvasElements"
          @click="clearCanvas"
      >
        Clear Canvas
      </button>
      <p class="toolbar-hint">
        Double-click text to edit it. Press Ctrl+Enter or use Done to finish.
      </p>

      <div v-if="canGroupSelected || selectedGroup" class="image-editor-panel">
        <div class="panel-title">{{ selectedGroup ? 'Group' : 'Selection' }}</div>

        <div class="selection-button-grid">
          <button
              v-if="canGroupSelected"
              type="button"
              @click="groupSelectedElements"
          >
            Group
          </button>
          <button
              v-if="selectedGroup"
              type="button"
              @click="ungroupSelectedGroup"
          >
            Ungroup
          </button>
        </div>

        <div class="layer-readout">
          {{ selectedGroup ? `${selectedGroup.children.length} elements` : `${selectedItems.length} selected` }}
        </div>
      </div>

      <div v-if="selectedItem && selectedLayerIndex >= 0" class="image-editor-panel">
        <div class="panel-title">Layer</div>

        <div class="layer-button-grid">
          <button
              type="button"
              :disabled="!canMoveSelectedBackward"
              @click="moveSelectedLayerBackward"
          >
            Backward
          </button>
          <button
              type="button"
              :disabled="!canMoveSelectedForward"
              @click="moveSelectedLayerForward"
          >
            Forward
          </button>
          <button
              type="button"
              :disabled="!canMoveSelectedBackward"
              @click="moveSelectedLayerToBack"
          >
            Bottom
          </button>
          <button
              type="button"
              :disabled="!canMoveSelectedForward"
              @click="moveSelectedLayerToFront"
          >
            Top
          </button>
        </div>

        <div class="layer-readout">
          Layer {{ selectedLayerIndex + 1 }} of {{ canvasItems.length }}
        </div>
      </div>

      <div v-if="selectedText" class="image-editor-panel">
        <div class="panel-title">Text Settings</div>

        <label class="control-row">
          <span>Font Size</span>
          <input
              :value="selectedText.fontSize || 20"
              type="range"
              min="8"
              max="144"
              step="1"
              @input="setTextFontSize(selectedText, $event.target.value)"
          >
          <input
              :value="selectedText.fontSize || 20"
              class="number-input"
              type="number"
              min="8"
              max="144"
              step="1"
              @input="setTextFontSize(selectedText, $event.target.value)"
          >
        </label>
      </div>

      <div v-if="selectedLabel" class="image-editor-panel">
        <div class="panel-title">Label Settings</div>

        <label class="control-row">
          <span>Font Size</span>
          <input
              :value="selectedLabel.textConfig.fontSize"
              type="range"
              min="8"
              max="144"
              step="1"
              @input="setLabelFontSize(selectedLabel, $event.target.value)"
          >
          <input
              :value="selectedLabel.textConfig.fontSize"
              class="number-input"
              type="number"
              min="8"
              max="144"
              step="1"
              @input="setLabelFontSize(selectedLabel, $event.target.value)"
          >
        </label>
      </div>

      <div v-if="selectedShape" class="image-editor-panel">
        <div class="panel-title">{{ getShapePanelTitle(selectedShape) }}</div>

        <div class="chart-color-grid">
          <label>
            <span>Border</span>
            <input v-model="selectedShape.stroke" type="color">
          </label>
          <label v-if="canShapeHaveFill(selectedShape)">
            <span>Fill</span>
            <input v-model="selectedShape.fill" type="color">
          </label>
        </div>

        <label class="control-row">
          <span>Border Width</span>
          <input
              v-model.number="selectedShape.strokeWidth"
              type="range"
              :min="getShapeStrokeWidthMin(selectedShape)"
              max="24"
              step="1"
          >
          <input
              v-model.number="selectedShape.strokeWidth"
              class="number-input"
              type="number"
              :min="getShapeStrokeWidthMin(selectedShape)"
              max="24"
              step="1"
          >
        </label>

        <div v-if="canShapeHaveCornerRadius(selectedShape)" class="control-row">
          <span>Border Radius</span>
          <div class="corner-radius-grid">
            <label
                v-for="field in cornerRadiusFields"
                :key="field.index"
            >
              <span>{{ field.label }}</span>
              <input
                  :value="getCornerRadiusValue(selectedShape, field.index)"
                  type="number"
                  min="0"
                  :max="getShapeCornerRadiusMax(selectedShape)"
                  step="1"
                  @input="setCornerRadiusValue(selectedShape, field.index, $event.target.value)"
              >
            </label>
          </div>
        </div>

        <label class="control-row">
          <span>Opacity</span>
          <input
              v-model.number="selectedShape.opacity"
              type="range"
              min="0"
              max="1"
              step="0.05"
          >
          <input
              v-model.number="selectedShape.opacity"
              class="number-input"
              type="number"
              min="0"
              max="1"
              step="0.05"
          >
        </label>
      </div>

      <div v-if="selectedImage" class="image-editor-panel">
        <div class="panel-title">Image Settings</div>

        <div class="control-row">
          <span>Radius</span>
          <div class="corner-radius-grid">
            <label
                v-for="field in cornerRadiusFields"
                :key="field.index"
            >
              <span>{{ field.label }}</span>
              <input
                  :value="getCornerRadiusValue(selectedImage, field.index)"
                  type="number"
                  min="0"
                  :max="getImageCornerRadiusMax(selectedImage)"
                  step="1"
                  @input="setCornerRadiusValue(selectedImage, field.index, $event.target.value)"
              >
            </label>
          </div>
        </div>

        <label class="control-row">
          <span>Opacity</span>
          <input
              v-model.number="selectedImage.opacity"
              type="range"
              min="0"
              max="1"
              step="0.05"
          >
          <input
              v-model.number="selectedImage.opacity"
              class="number-input"
              type="number"
              min="0"
              max="1"
              step="0.05"
          >
        </label>

        <div class="control-row">
          <span>Object Fit</span>
          <div class="segmented-control">
            <button
                type="button"
                :class="{ active: selectedImage.objectFit === 'cover' }"
                @click="setImageObjectFit(selectedImage, 'cover')"
            >
              Cover
            </button>
            <button
                type="button"
                :class="{ active: selectedImage.objectFit === 'contain' }"
                @click="setImageObjectFit(selectedImage, 'contain')"
            >
              Contain
            </button>
          </div>
        </div>

        <div class="crop-controls">
          <div class="crop-header">
            <span>Crop</span>
            <button type="button" @click="resetImageCrop(selectedImage)">Reset</button>
          </div>

          <label>
            <span>Left</span>
            <input v-model.number="selectedImage.cropLeft" type="range" min="0" max="95" step="1">
          </label>
          <label>
            <span>Right</span>
            <input v-model.number="selectedImage.cropRight" type="range" min="0" max="95" step="1">
          </label>
          <label>
            <span>Top</span>
            <input v-model.number="selectedImage.cropTop" type="range" min="0" max="95" step="1">
          </label>
          <label>
            <span>Bottom</span>
            <input v-model.number="selectedImage.cropBottom" type="range" min="0" max="95" step="1">
          </label>
        </div>
      </div>

      <div v-if="selectedChart" class="image-editor-panel">
        <div class="panel-title">Graph Settings</div>

        <label class="control-row">
          <span>Title</span>
          <input
              v-model="selectedChart.chartTitle"
              class="chart-text-input"
              type="text"
              placeholder="Graph title"
          >
        </label>

        <label class="control-row">
          <span>X Label</span>
          <input
              v-model="selectedChart.xAxisLabel"
              class="chart-text-input"
              type="text"
              placeholder="X axis"
          >
        </label>

        <label class="control-row">
          <span>Y Label</span>
          <input
              v-model="selectedChart.yAxisLabel"
              class="chart-text-input"
              type="text"
              placeholder="Y axis"
          >
        </label>

        <div class="control-row">
          <span>Type</span>
          <div class="segmented-control">
            <button
                type="button"
                :class="{ active: selectedChart.chartType === 'line' }"
                @click="setChartType(selectedChart, 'line')"
            >
              Line
            </button>
            <button
                type="button"
                :class="{ active: selectedChart.chartType === 'polygon' }"
                @click="setChartType(selectedChart, 'polygon')"
            >
              Polygon
            </button>
          </div>
        </div>

        <label class="control-row">
          <span>Data</span>
          <textarea
              v-model="selectedChart.chartData"
              class="chart-data-input"
              rows="3"
              placeholder="12, 48, 32, 76"
          />
        </label>

        <div class="chart-color-grid">
          <label>
            <span>Line</span>
            <input v-model="selectedChart.stroke" type="color">
          </label>
          <label>
            <span>Fill</span>
            <input v-model="selectedChart.fill" type="color">
          </label>
        </div>

        <label class="control-row">
          <span>Stroke</span>
          <input v-model.number="selectedChart.strokeWidth" type="range" min="1" max="12" step="1">
        </label>

        <label class="control-row">
          <span>Fill Opacity</span>
          <input v-model.number="selectedChart.fillOpacity" type="range" min="0" max="1" step="0.05">
        </label>

        <label class="control-row">
          <span>Point Radius</span>
          <input v-model.number="selectedChart.pointRadius" type="range" min="0" max="10" step="1">
        </label>

        <label class="checkbox-control">
          <input v-model="selectedChart.showGrid" type="checkbox">
          <span>Show grid</span>
        </label>

        <label class="checkbox-control">
          <input v-model="selectedChart.showPoints" type="checkbox">
          <span>Show points</span>
        </label>
      </div>
    </div>

    <div class="canvas-area">
      <div
          class="stage-shell"
          :class="{ 'stage-shell--dragging': isImageDragActive }"
          :style="stageShellStyle"
          @dragenter="handleImageDragEnter"
          @dragover="handleImageDragOver"
          @dragleave="handleImageDragLeave"
          @drop="handleImageDrop"
      >
        <v-stage :config="stageConfig" @mousedown="handleStagePointerDown">
          <v-layer>

            <v-rect :config="pageConfig" />
            <v-rect :config="pageMarginGuideConfig" />
            <v-group :config="pageClipConfig">

            <template v-for="item in canvasItems" :key="item.id">
              <v-group
                  v-if="item.type === 'group'"
                  :ref="el => setRef(el, item.id)"
                  :config="getGroupConfig(item)"
                  @mousedown="handleSelectablePointerDown($event, item.id)"
                  @touchstart="handleSelectablePointerDown($event, item.id)"
                  @click="stopSelectableClick"
                  @dragend="updatePosition($event, item.id)"
                  @transformend="updateTransform($event, item.id)"
              >
                <v-rect :config="getGroupHitAreaConfig(item)" />

                <template v-for="child in item.children" :key="child.id">
                  <template v-if="child.type === 'text'">
                    <v-image
                        v-if="child.richImage"
                        :config="getGroupedRichTextImageConfig(child)"
                    />
                    <v-text
                        v-else
                        :config="getGroupedTextConfig(child)"
                    />
                  </template>

                  <v-group
                      v-else-if="child.type === 'image'"
                      :config="getGroupedImageBoxConfig(child)"
                  >
                    <v-image :config="getGroupedImageContentConfig(child)" />
                  </v-group>

                  <v-rect
                      v-else-if="child.type === 'rect'"
                      :config="getGroupedRectConfig(child)"
                  />

                  <v-circle
                      v-else-if="child.type === 'circle'"
                      :config="getGroupedChildConfig(child)"
                  />

                  <v-regular-polygon
                      v-else-if="child.type === 'polygon'"
                      :config="getGroupedChildConfig(child)"
                  />

                  <v-group
                      v-else-if="child.type === 'chart'"
                      :config="getGroupedChartBoxConfig(child)"
                  >
                    <v-text
                        v-if="child.chartTitle"
                        :config="getChartTitleConfig(child)"
                    />
                    <v-text
                        v-if="child.xAxisLabel"
                        :config="getChartXAxisLabelConfig(child)"
                    />
                    <v-text
                        v-if="child.yAxisLabel"
                        :config="getChartYAxisLabelConfig(child)"
                    />
                    <v-rect :config="getChartFrameConfig(child)" />
                    <v-line
                        v-for="line in getChartGridLines(child)"
                        :key="line.id"
                        :config="getChartGridLineConfig(child, line)"
                    />
                    <v-line
                        v-if="child.chartType === 'polygon'"
                        :config="getChartAreaConfig(child)"
                    />
                    <v-line :config="getChartLineConfig(child)" />
                    <v-circle
                        v-for="point in getChartPointConfigs(child)"
                        :key="point.id"
                        :config="point"
                    />
                  </v-group>

                  <v-line
                      v-else-if="child.type === 'line'"
                      :config="getGroupedChildConfig(child)"
                  />

                  <v-arrow
                      v-else-if="child.type === 'arrow'"
                      :config="getGroupedChildConfig(child)"
                  />

                  <v-label
                      v-else-if="child.type === 'label'"
                      :config="getGroupedChildConfig({ x: child.x, y: child.y, rotation: child.rotation || 0 })"
                  >
                    <v-tag :config="getGroupedChildConfig(child.tag)" />
                    <v-text :config="getGroupedChildConfig({ ...child.textConfig, text: child.text })" />
                  </v-label>

                  <v-image
                      v-if="shapeTypes.includes(child.type) && child.shapeRichImage"
                      :config="getGroupedShapeTextImageConfig(child)"
                  />
                </template>
              </v-group>

              <template v-else-if="item.type === 'text'">
                <v-image
                    v-if="item.richImage"
                    :ref="el => setRef(el, item.id)"
                    :config="getRichTextImageConfig(item)"
                    @mousedown="handleSelectablePointerDown($event, item.id)"
                    @touchstart="handleSelectablePointerDown($event, item.id)"
                    @click="stopSelectableClick"
                    @dblclick="startTextEditing(item)"
                    @dragend="updatePosition($event, item.id)"
                    @transformend="updateTransform($event, item.id)"
                />
                <v-text
                    v-else
                    :ref="el => setRef(el, item.id)"
                    :config="getTextConfig(item)"
                    @mousedown="handleSelectablePointerDown($event, item.id)"
                    @touchstart="handleSelectablePointerDown($event, item.id)"
                    @click="stopSelectableClick"
                    @dblclick="startTextEditing(item)"
                    @dragend="updatePosition($event, item.id)"
                    @transformend="updateTransform($event, item.id)"
                />
              </template>

              <v-group
                  v-else-if="item.type === 'image'"
                  :ref="el => setRef(el, item.id)"
                  :config="getImageBoxConfig(item)"
                  @mousedown="handleSelectablePointerDown($event, item.id)"
                  @touchstart="handleSelectablePointerDown($event, item.id)"
                  @click="stopSelectableClick"
                  @dragend="updatePosition($event, item.id)"
                  @transformend="updateTransform($event, item.id)"
              >
                <v-rect :config="getImageHitAreaConfig(item)" />
                <v-image :config="getImageContentConfig(item)" />
              </v-group>

              <v-rect
                  v-else-if="item.type === 'rect'"
                  :ref="el => setRef(el, item.id)"
                  :config="getRectConfig(item)"
                  @mousedown="handleSelectablePointerDown($event, item.id)"
                  @touchstart="handleSelectablePointerDown($event, item.id)"
                  @click="stopSelectableClick"
                  @dblclick="startShapeTextEditing(item)"
                  @dragmove="updatePositionDuringDrag($event, item.id)"
                  @dragend="updatePosition($event, item.id)"
                  @transformend="updateTransform($event, item.id)"
              />

              <v-circle
                  v-else-if="item.type === 'circle'"
                  :ref="el => setRef(el, item.id)"
                  :config="item"
                  @mousedown="handleSelectablePointerDown($event, item.id)"
                  @touchstart="handleSelectablePointerDown($event, item.id)"
                  @click="stopSelectableClick"
                  @dblclick="startShapeTextEditing(item)"
                  @dragmove="updatePositionDuringDrag($event, item.id)"
                  @dragend="updatePosition($event, item.id)"
                  @transformend="updateTransform($event, item.id)"
              />

              <v-regular-polygon
                  v-else-if="item.type === 'polygon'"
                  :ref="el => setRef(el, item.id)"
                  :config="item"
                  @mousedown="handleSelectablePointerDown($event, item.id)"
                  @touchstart="handleSelectablePointerDown($event, item.id)"
                  @click="stopSelectableClick"
                  @dblclick="startShapeTextEditing(item)"
                  @dragmove="updatePositionDuringDrag($event, item.id)"
                  @dragend="updatePosition($event, item.id)"
                  @transformend="updateTransform($event, item.id)"
              />

              <v-group
                  v-else-if="item.type === 'chart'"
                  :ref="el => setRef(el, item.id)"
                  :config="getChartBoxConfig(item)"
                  @mousedown="handleSelectablePointerDown($event, item.id)"
                  @touchstart="handleSelectablePointerDown($event, item.id)"
                  @click="stopSelectableClick"
                  @dragend="updatePosition($event, item.id)"
                  @transformend="updateTransform($event, item.id)"
              >
                <v-rect :config="getChartHitAreaConfig(item)" />
                <v-text
                    v-if="item.chartTitle"
                    :config="getChartTitleConfig(item)"
                />
                <v-text
                    v-if="item.xAxisLabel"
                    :config="getChartXAxisLabelConfig(item)"
                />
                <v-text
                    v-if="item.yAxisLabel"
                    :config="getChartYAxisLabelConfig(item)"
                />
                <v-rect :config="getChartFrameConfig(item)" />
                <v-line
                    v-for="line in getChartGridLines(item)"
                    :key="line.id"
                    :config="getChartGridLineConfig(item, line)"
                />
                <v-line
                    v-if="item.chartType === 'polygon'"
                    :config="getChartAreaConfig(item)"
                />
                <v-line :config="getChartLineConfig(item)" />
                <v-circle
                    v-for="point in getChartPointConfigs(item)"
                    :key="point.id"
                    :config="point"
                />
              </v-group>

              <v-line
                  v-else-if="item.type === 'line'"
                  :ref="el => setRef(el, item.id)"
                  :config="item"
                  @mousedown="handleSelectablePointerDown($event, item.id)"
                  @touchstart="handleSelectablePointerDown($event, item.id)"
                  @click="stopSelectableClick"
                  @dblclick="startShapeTextEditing(item)"
                  @dragmove="updatePositionDuringDrag($event, item.id)"
                  @dragend="updatePosition($event, item.id)"
                  @transformend="updateTransform($event, item.id)"
              />

              <v-arrow
                  v-else-if="item.type === 'arrow'"
                  :ref="el => setRef(el, item.id)"
                  :config="item"
                  @mousedown="handleSelectablePointerDown($event, item.id)"
                  @touchstart="handleSelectablePointerDown($event, item.id)"
                  @click="stopSelectableClick"
                  @dragend="updatePosition($event, item.id)"
                  @transformend="updateTransform($event, item.id)"
              />

              <v-label
                  v-else-if="item.type === 'label'"
                  :ref="el => setRef(el, item.id)"
                  :config="{ x: item.x, y: item.y, draggable: item.draggable, rotation: item.rotation || 0 }"
                  @mousedown="handleSelectablePointerDown($event, item.id)"
                  @touchstart="handleSelectablePointerDown($event, item.id)"
                  @click="stopSelectableClick"
                  @dragend="updatePosition($event, item.id)"
                  @transformend="updateTransform($event, item.id)"
              >
                <v-tag :config="item.tag" />
                <v-text :config="item.textConfig" :text="item.text" />
              </v-label>

              <v-image
                  v-if="shapeTypes.includes(item.type) && item.shapeRichImage"
                  :config="getShapeTextImageConfig(item)"
              />
            </template>

        <template v-for="item in tableItems" :key="item.id">
          <v-rect v-if="item.type === 'rect'" :config="item" />
          <v-text v-if="item.type === 'text'" :config="item" />
        </template>
            </v-group>

            <v-transformer
                ref="transformerRef"
                :config="transformerConfig"
            />

          </v-layer>
        </v-stage>

        <div
            v-if="editingItem && editor"
            class="rich-text-editor"
            :style="richEditorStyle"
            @mousedown.stop
        >
          <div class="rich-text-toolbar">
            <div class="toolbar-group">
              <select
                  :value="getCurrentTextFontFamily()"
                  title="Font"
                  @change="applyTextStyle({ fontFamily: $event.target.value })"
              >
                <option
                    v-for="font in fontOptions"
                    :key="font.value"
                    :value="font.value"
                >
                  {{ font.label }}
                </option>
              </select>
            </div>

            <div class="toolbar-group font-size-toolbar-group">
              <label title="Font size">
                <span>Size</span>
                <input
                    :value="getCurrentTextFontSize()"
                    type="number"
                    min="8"
                    max="144"
                    step="1"
                    @change="applyRichTextFontSize($event.target.value)"
                    @keydown.enter.prevent="applyRichTextFontSize($event.target.value)"
                >
              </label>
              <button
                  type="button"
                  title="Use base font size"
                  @mousedown.prevent="clearTextStyleAttribute('fontSize')"
              >
                Base
              </button>
            </div>

            <div class="toolbar-group">
              <button
                  type="button"
                  :class="{ active: editor.isActive('bold') }"
                  title="Bold"
                  @mousedown.prevent="editor.chain().focus().toggleBold().run()"
              >
                B
              </button>
              <button
                  type="button"
                  :class="{ active: editor.isActive('italic') }"
                  title="Italic"
                  @mousedown.prevent="editor.chain().focus().toggleItalic().run()"
              >
                I
              </button>
              <button
                  type="button"
                  :class="{ active: editor.isActive('underline') }"
                  title="Underline"
                  @mousedown.prevent="editor.chain().focus().toggleUnderline().run()"
              >
                U
              </button>
              <button
                  type="button"
                  :class="{ active: editor.isActive('strike') }"
                  title="Strike"
                  @mousedown.prevent="editor.chain().focus().toggleStrike().run()"
              >
                S
              </button>
            </div>

            <div class="toolbar-group">
              <button
                  type="button"
                  :class="{ active: isTextAlignActive('left') }"
                  title="Align left"
                  @mousedown.prevent="setTextAlign('left')"
              >
                L
              </button>
              <button
                  type="button"
                  :class="{ active: isTextAlignActive('center') }"
                  title="Align center"
                  @mousedown.prevent="setTextAlign('center')"
              >
                C
              </button>
              <button
                  type="button"
                  :class="{ active: isTextAlignActive('right') }"
                  title="Align right"
                  @mousedown.prevent="setTextAlign('right')"
              >
                R
              </button>
              <button
                  type="button"
                  :class="{ active: isTextAlignActive('justify') }"
                  title="Justify"
                  @mousedown.prevent="setTextAlign('justify')"
              >
                J
              </button>
            </div>

            <div class="toolbar-group color-toolbar-group">
              <label title="Text color">
                <span>Text</span>
                <input
                    :value="getCurrentTextColor()"
                    type="color"
                    @input="applyTextStyle({ color: $event.target.value })"
                >
              </label>
              <label title="Text background">
                <span>Bg</span>
                <input
                    :value="getCurrentTextBackground()"
                    type="color"
                    @input="applyTextStyle({ backgroundColor: $event.target.value })"
                >
              </label>
              <button
                  type="button"
                  title="Clear background"
                  @mousedown.prevent="clearTextStyleAttribute('backgroundColor')"
              >
                No Bg
              </button>
            </div>

            <div class="toolbar-group opacity-toolbar-group">
              <label title="Text opacity">
                <span>Opacity</span>
                <input
                    :value="getCurrentTextOpacity()"
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    @input="applyTextStyle({ opacity: $event.target.value })"
                >
              </label>
            </div>

            <div class="toolbar-group">
              <button
                  type="button"
                  :class="{ active: editor.isActive('bulletList') }"
                  title="Bullet list"
                  @mousedown.prevent="editor.chain().focus().toggleBulletList().run()"
              >
                List
              </button>
              <button
                  type="button"
                  :class="{ active: editor.isActive('orderedList') }"
                  title="Numbered list"
                  @mousedown.prevent="editor.chain().focus().toggleOrderedList().run()"
              >
                1.
              </button>
            </div>

            <button
                type="button"
                title="Clear formatting"
                @mousedown.prevent="editor.chain().focus().clearNodes().unsetAllMarks().run()"
            >
              Clear
            </button>
            <button
                type="button"
                class="done-button"
                title="Finish editing"
                @mousedown.prevent="finishTextEditing"
            >
              Done
            </button>
          </div>

          <EditorContent :editor="editor" />
        </div>
      </div>
    </div>
  </div>
</template>

<style>
.layout {
  display: flex;
  height: 100vh;
  overflow: hidden;
}

.toolbar {
  width: 200px;
  background: #f3f3f3;
  padding: 10px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  overflow-y: auto;
  flex: 0 0 auto;
}

.toolbar-hint {
  margin: 8px 2px 0;
  color: #64748b;
  font-size: 12px;
  line-height: 1.4;
}

.clear-canvas-button {
  border-color: #fecaca;
  color: #b91c1c;
  background: #fff5f5;
}

.clear-canvas-button:disabled {
  border-color: buttonborder;
  color: #94a3b8;
  background: buttonface;
  cursor: not-allowed;
}

.file-upload-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 24px;
  padding: 2px 6px;
  font: 13.3333px Arial;
  color: buttontext;
  background: buttonface;
  border: 2px outset buttonborder;
  cursor: pointer;
  text-align: center;
  user-select: none;
}

.file-upload-button input {
  display: none;
}

.qr-panel,
.barcode-panel {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 10px;
  background: #fff;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
}

.qr-link-input,
.barcode-value-input {
  width: 100%;
  box-sizing: border-box;
  border: 1px solid #cbd5e1;
  border-radius: 4px;
  padding: 6px;
  font: 12px Arial;
}

.qr-panel button,
.barcode-panel button {
  min-height: 28px;
}

.qr-panel button:disabled,
.barcode-panel button:disabled {
  color: #94a3b8;
  cursor: not-allowed;
}

.field-error {
  margin: 0;
  color: #b91c1c;
  font-size: 12px;
  line-height: 1.35;
}

.page-size-panel {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 10px;
  background: #fff;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
}

.control-select {
  width: 100%;
  min-height: 30px;
  box-sizing: border-box;
  border: 1px solid #cbd5e1;
  border-radius: 4px;
  background: #fff;
}

.page-size-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 6px;
}

.page-size-grid label {
  display: grid;
  grid-template-columns: 1fr;
  gap: 5px;
  font-size: 12px;
  color: #334155;
}

.page-size-grid input {
  width: 100%;
  min-width: 0;
  box-sizing: border-box;
  border: 1px solid #cbd5e1;
  border-radius: 4px;
  padding: 5px;
}

.page-margin-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 6px;
}

.page-margin-grid label {
  display: grid;
  grid-template-columns: 1fr;
  gap: 5px;
  font-size: 12px;
  color: #334155;
}

.page-margin-grid input {
  width: 100%;
  min-width: 0;
  min-height: 30px;
  box-sizing: border-box;
  border: 1px solid #cbd5e1;
  border-radius: 4px;
  padding: 5px;
}

.page-margin-readout {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 4px 8px;
  color: #475569;
  font-size: 12px;
  line-height: 1.35;
}

.page-size-readout {
  display: grid;
  gap: 3px;
  color: #334155;
  font-size: 12px;
  line-height: 1.35;
}

.page-size-readout span {
  color: #64748b;
}

.image-editor-panel {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-top: 8px;
  padding: 10px;
  background: #fff;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
}

.panel-title {
  font-weight: 700;
  font-size: 13px;
  color: #0f172a;
}

.layer-button-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 6px;
}

.selection-button-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 6px;
}

.layer-button-grid button {
  min-height: 28px;
  border: 1px solid #cbd5e1;
  border-radius: 4px;
  background: #f8fafc;
  cursor: pointer;
}

.selection-button-grid button {
  min-height: 28px;
  border: 1px solid #cbd5e1;
  border-radius: 4px;
  background: #f8fafc;
  cursor: pointer;
}

.layer-button-grid button:disabled {
  color: #94a3b8;
  cursor: not-allowed;
}

.layer-readout {
  color: #64748b;
  font-size: 12px;
  line-height: 1.35;
}

.control-row {
  display: grid;
  grid-template-columns: 1fr;
  gap: 5px;
  font-size: 12px;
  color: #334155;
}

.canvas-color-row {
  grid-template-columns: 1fr auto;
  align-items: center;
}

.canvas-color-row input[type="color"] {
  width: 36px;
  height: 28px;
  padding: 0;
  border: 1px solid #cbd5e1;
  border-radius: 4px;
  background: transparent;
  cursor: pointer;
}

.control-row input[type="range"] {
  width: 100%;
}

.corner-radius-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 6px;
}

.corner-radius-grid label {
  display: grid;
  gap: 4px;
  min-width: 0;
  color: #334155;
  font-size: 11px;
}

.corner-radius-grid input {
  width: 100%;
  min-width: 0;
  box-sizing: border-box;
}

.number-input {
  width: 100%;
  box-sizing: border-box;
}

.segmented-control {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 4px;
}

.segmented-control button,
.crop-header button {
  min-height: 26px;
  border: 1px solid #cbd5e1;
  border-radius: 4px;
  background: #f8fafc;
  cursor: pointer;
}

.segmented-control button.active {
  color: #fff;
  background: #2563eb;
  border-color: #2563eb;
}

.crop-controls {
  display: flex;
  flex-direction: column;
  gap: 7px;
}

.crop-header,
.crop-controls label {
  display: grid;
  grid-template-columns: 52px 1fr;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: #334155;
}

.crop-header {
  grid-template-columns: 1fr auto;
}

.crop-controls input {
  width: 100%;
}

.chart-data-input {
  width: 100%;
  min-height: 62px;
  box-sizing: border-box;
  resize: vertical;
  border: 1px solid #cbd5e1;
  border-radius: 4px;
  padding: 6px;
  font: 12px Arial;
}

.chart-text-input {
  width: 100%;
  box-sizing: border-box;
  border: 1px solid #cbd5e1;
  border-radius: 4px;
  padding: 6px;
  font: 12px Arial;
}

.chart-color-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 6px;
}

.chart-color-grid label,
.checkbox-control {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
  font-size: 12px;
  color: #334155;
}

.chart-color-grid input[type="color"] {
  width: 32px;
  height: 26px;
  padding: 0;
  border: 1px solid #cbd5e1;
  border-radius: 4px;
  background: transparent;
  cursor: pointer;
}

.checkbox-control {
  justify-content: flex-start;
}

.canvas-area {
  flex: 1;
  overflow: auto;
  padding: 16px;
  background: #dfe3e8;
}

.stage-shell {
  position: relative;
  width: 800px;
  height: 1100px;
}

.stage-shell::after {
  content: '';
  position: absolute;
  inset: 0;
  pointer-events: none;
  border: 2px dashed transparent;
  background: transparent;
  box-sizing: border-box;
  transition: border-color 0.15s ease, background-color 0.15s ease;
}

.stage-shell--dragging::after {
  border-color: #2563eb;
  background: rgb(37 99 235 / 8%);
}

.rich-text-editor {
  position: absolute;
  z-index: 10;
  min-height: calc(var(--editor-font-size) * 1.5);
  color: var(--editor-color);
  font-family: var(--editor-font-family);
  font-size: var(--editor-font-size);
  line-height: 1.35;
  background: white;
  border: 1px solid #2563eb;
  box-shadow: 0 4px 14px rgb(0 0 0 / 18%);
  transform-origin: top left;
}

.rich-text-toolbar {
  position: absolute;
  left: -1px;
  bottom: calc(100% + 6px);
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 3px;
  width: max-content;
  max-width: 720px;
  padding: 4px;
  background: #fff;
  border: 1px solid #cbd5e1;
  border-radius: 5px;
  box-shadow: 0 3px 10px rgb(0 0 0 / 15%);
}

.toolbar-group {
  display: flex;
  align-items: center;
  gap: 3px;
  padding-right: 4px;
  border-right: 1px solid #e2e8f0;
}

.toolbar-group select {
  height: 28px;
  max-width: 104px;
  border: 1px solid #cbd5e1;
  border-radius: 3px;
  background: #fff;
}

.color-toolbar-group label,
.opacity-toolbar-group label,
.font-size-toolbar-group label {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  height: 28px;
  padding: 0 4px;
  border: 1px solid #cbd5e1;
  border-radius: 3px;
  font-size: 12px;
}

.font-size-toolbar-group input[type="number"] {
  width: 52px;
  height: 22px;
  box-sizing: border-box;
  border: 1px solid #cbd5e1;
  border-radius: 3px;
}

.color-toolbar-group input[type="color"] {
  width: 22px;
  height: 22px;
  padding: 0;
  border: 0;
  background: transparent;
  cursor: pointer;
}

.opacity-toolbar-group input[type="range"] {
  width: 72px;
}

.rich-text-toolbar button {
  min-width: 28px;
  height: 28px;
  padding: 0 7px;
  border: 1px solid transparent;
  border-radius: 3px;
  background: transparent;
  cursor: pointer;
}

.rich-text-toolbar button:hover,
.rich-text-toolbar button.active {
  background: #e2e8f0;
  border-color: #cbd5e1;
}

.rich-text-toolbar .done-button {
  margin-left: 4px;
  color: white;
  background: #2563eb;
}

.rich-text-toolbar .done-button:hover {
  background: #1d4ed8;
  border-color: #1d4ed8;
}

.rich-text-content {
  min-height: calc(var(--editor-font-size) * 1.5);
  padding: 4px;
  outline: none;
  overflow-wrap: anywhere;
}

.rich-text-content p {
  margin: 0 0 0.35em;
}

.rich-text-content p:last-child {
  margin-bottom: 0;
}

.rich-text-content h1,
.rich-text-content h2,
.rich-text-content h3 {
  margin: 0 0 0.35em;
  line-height: 1.15;
}

.rich-text-content ul,
.rich-text-content ol {
  margin: 0.25em 0;
  padding-left: 1.4em;
}
</style>
