export const BARCODE_MAX_LENGTH = 80
export const BARCODE_MODULE_WIDTH = 2
export const BARCODE_BAR_HEIGHT = 80
export const BARCODE_LABEL_HEIGHT = 24
export const BARCODE_QUIET_ZONE_MODULES = 10
export const CODE128_START_B = 104
export const CODE128_STOP = 106
export const CODE128_B_PATTERNS = [
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

export function getBarcodeValidationError(value) {
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

export function getCode128BSequence(value) {
  const dataCodes = Array.from(value, char => char.charCodeAt(0) - 32)
  const checksum = dataCodes.reduce(
    (sum, code, index) => sum + code * (index + 1),
    CODE128_START_B
  ) % 103

  return [CODE128_START_B, ...dataCodes, checksum, CODE128_STOP]
}

export function getPatternModuleCount(pattern) {
  return Array.from(pattern).reduce((sum, width) => sum + Number(width), 0)
}

export function drawBarcodeLabel(context, value, width, y) {
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

export function createBarcodeDataURL(value) {
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
