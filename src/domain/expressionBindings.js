import { evaluateScalarExpression } from '../utils/expressionEngine.js'
import { setTemplateTextValue } from '../utils/templateVariables.js'
import { canElementHaveTextValue } from './templateTargets.js'

export function canElementHaveExpression(item) {
  return canElementHaveTextValue(item)
}

export function getNormalizedExpressionSettings(settings = {}) {
  return {
    enabled: Boolean(settings?.enabled),
    value: String(settings?.value || settings?.expression || settings?.formula || '').trim()
  }
}

export function ensureExpressionSettings(item) {
  if (!canElementHaveExpression(item)) return

  item.expression = getNormalizedExpressionSettings(item.expression)
}

const expressionSettingSetters = {
  enabled: (settings, value) => {
    settings.enabled = Boolean(value)
  },
  value: (settings, value) => {
    settings.value = String(value || '')
  }
}

export function setExpressionSettingValue(target, key, value) {
  if (!canElementHaveExpression(target)) return false

  const setter = expressionSettingSetters[key]
  if (!setter) return false

  ensureExpressionSettings(target)
  setter(target.expression, value)

  return true
}

export function applyExpressionValuesToElements(elements, contextValues = {}) {
  const result = {
    matched: 0,
    changed: 0
  }
  const visit = item => {
    if (!item || typeof item !== 'object') return

    if (canElementHaveExpression(item)) {
      ensureExpressionSettings(item)

      if (item.expression.enabled && item.expression.value) {
        setTemplateTextValue(item, evaluateScalarExpression(item.expression.value, contextValues))
        result.matched += 1
        result.changed += 1
      }
    }

    if (Array.isArray(item.cells)) {
      item.cells.forEach(cell => {
        if (!cell?.repeatGeneratedFrom) visit(cell)
      })
    }

    if (Array.isArray(item.children)) item.children.forEach(visit)
  }

  elements.forEach(visit)

  return result
}
