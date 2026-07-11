import {
  borderableElementTypes,
  borderStyleAliases,
  borderStyleValues,
  defaultElementBorderSettings,
  defaultLineHitStrokeWidth,
  defaultShapeFills,
  defaultShapeSettings,
  fillableShapeTypes,
  shapeLabels,
  shapeTypes
} from '../constants/pdfBuilderSettings'
import { clampNumber } from './canvasGeometry'

export function canShapeHaveFill(item) {
  return fillableShapeTypes.includes(item?.type)
}

export function canShapeHaveCornerRadius(item) {
  return item?.type === 'rect'
}

export function getShapeStrokeWidthMin(item) {
  return item?.type === 'line' ? 1 : 0
}

export function getShapeCornerRadiusMax(item) {
  if (!item || item.type !== 'rect') return 0

  return Math.floor(Math.min(item.width || 0, item.height || 0) / 2)
}

export function getCornerRadiusMax(item) {
  if (!item) return 0

  if (item.type === 'image' || item.type === 'rect') {
    return Math.floor(Math.min(item.width || 0, item.height || 0) / 2)
  }

  return 0
}

export function getCornerRadiusValues(item) {
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

export function getCornerRadiusValue(item, index) {
  return getCornerRadiusValues(item)[index] || 0
}

export function setCornerRadiusValue(item, index, value) {
  if (!item) return

  const values = getCornerRadiusValues(item)
  values[index] = Math.round(clampNumber(value, 0, getCornerRadiusMax(item)))
  item.cornerRadius = values
}

export function getCornerRadiusConfig(item) {
  return getCornerRadiusValues(item)
}

export function getShapePanelTitle(item) {
  return `${shapeLabels[item?.type] || 'Shape'} Settings`
}

export function getShapeBorderStyle(value) {
  const borderStyle = String(value || '').trim()

  if (borderStyleValues.has(borderStyle)) return borderStyle

  return borderStyleAliases[borderStyle.toLowerCase()] || defaultShapeSettings.borderStyle
}

export function getShapeBorderStyleFromDash(dash) {
  if (!Array.isArray(dash) || !dash.length) return defaultShapeSettings.borderStyle

  const pattern = dash
    .map(value => Number(value))
    .filter(value => Number.isFinite(value) && value > 0)

  if (pattern.length >= 4) return 'dashDot'
  if (pattern[0] <= 2) return 'dotted'

  return 'dashed'
}

export function getBorderWidthValue(value) {
  return Math.round(clampNumber(value, 0, 24))
}

export function getBorderDash(borderStyleValue, borderWidthValue) {
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

export function getBorderLineConfig(borderStyleValue, borderWidthValue) {
  const dash = getBorderDash(borderStyleValue, borderWidthValue)

  return {
    dash,
    dashEnabled: dash.length > 0,
    ...(dash.length ? { lineCap: 'round' } : {})
  }
}

export function getShapeBorderDash(item) {
  return getBorderDash(item?.borderStyle, item?.strokeWidth)
}

export function getShapeBorderConfig(item) {
  return getBorderLineConfig(item?.borderStyle, item?.strokeWidth)
}

export function getHexColor(value, fallback) {
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

export function getElementBorderColor(item) {
  return getHexColor(item?.borderColor, defaultElementBorderSettings.borderColor)
}

export function getElementBorderConfig(item, config = {}) {
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

export function canElementHaveBorder(item) {
  return borderableElementTypes.includes(item?.type)
}

export function ensureElementBorderSettings(item) {
  if (!canElementHaveBorder(item)) return

  if (item.borderColor === undefined) item.borderColor = defaultElementBorderSettings.borderColor
  if (item.borderWidth === undefined) item.borderWidth = defaultElementBorderSettings.borderWidth
  if (item.borderStyle === undefined) item.borderStyle = getShapeBorderStyleFromDash(item.dash)

  item.borderColor = getElementBorderColor(item)
  item.borderWidth = getBorderWidthValue(item.borderWidth)
  item.borderStyle = getShapeBorderStyle(item.borderStyle)
}

export function ensureShapeSettings(item) {
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
