import {
  aggregateFunctionOptions,
  aggregateScopeOptions,
  defaultAggregateSettings
} from '../constants/pdfBuilderSettings.js'
import {
  getDataEntriesFromValue,
  getDataValueByPath
} from '../utils/dataAccess.js'
import { setTemplateTextValue } from '../utils/templateVariables.js'
import { canElementHaveTextValue } from './templateTargets.js'

export function canElementHaveAggregate(item) {
  return canElementHaveTextValue(item)
}

export function getNormalizedAggregateFunction(value) {
  const normalized = String(value || '').trim().toUpperCase()

  return aggregateFunctionOptions.some(option => option.value === normalized)
    ? normalized
    : defaultAggregateSettings.function
}

export function getNormalizedAggregateScope(value) {
  const normalized = String(value || '').trim()

  return aggregateScopeOptions.some(option => option.value === normalized)
    ? normalized
    : defaultAggregateSettings.scope
}

export function getNormalizedAggregateSettings(settings = {}) {
  return {
    enabled: Boolean(settings?.enabled),
    function: getNormalizedAggregateFunction(settings?.function || settings?.operation),
    scope: getNormalizedAggregateScope(settings?.scope),
    dataSource: String(settings?.dataSource || settings?.source || '').trim(),
    field: String(settings?.field || settings?.valuePath || settings?.path || '').trim()
  }
}

export function ensureAggregateSettings(item) {
  if (!canElementHaveAggregate(item)) return

  item.aggregate = getNormalizedAggregateSettings(item.aggregate)
}

const aggregateSettingSetters = {
  enabled: (settings, value) => {
    settings.enabled = Boolean(value)
  },
  function: (settings, value) => {
    settings.function = getNormalizedAggregateFunction(value)
  },
  scope: (settings, value) => {
    settings.scope = getNormalizedAggregateScope(value)
  },
  dataSource: (settings, value) => {
    settings.dataSource = String(value || '').trim()
  },
  field: (settings, value) => {
    settings.field = String(value || '').trim()
  }
}

export function setAggregateSettingValue(target, key, value) {
  if (!canElementHaveAggregate(target)) return false

  const setter = aggregateSettingSetters[key]
  if (!setter) return false

  ensureAggregateSettings(target)
  setter(target.aggregate, value)

  return true
}

export function resolveAggregatePathValue(path, ...sources) {
  const sourcePath = String(path || '').trim()

  if (!sourcePath) return undefined

  for (const source of sources) {
    const value = getDataValueByPath(source, sourcePath)

    if (value !== undefined) return value
  }

  return undefined
}

export function getDocumentAggregateRecords(state, settings, dependencies = {}) {
  const source = String(settings?.dataSource || '').trim()

  if (source) {
    return getDataEntriesFromValue(resolveAggregatePathValue(
      source,
      state.rootContext.valueContext,
      state.rootContext.rootValues
    ))
  }

  const rootValue = state.rootContext.rootValues

  if (Array.isArray(rootValue)) return rootValue

  const rootDataBands = typeof dependencies.getRootDataBands === 'function'
    ? dependencies.getRootDataBands()
    : []

  if (rootDataBands.length === 1 && typeof dependencies.getDataBandEntries === 'function') {
    return dependencies.getDataBandEntries(rootDataBands[0], state.rootContext)
  }

  return []
}

export function resolveAggregateSourceRecords(state, settings, aggregateContext = {}, dependencies = {}) {
  const scope = getNormalizedAggregateScope(settings?.scope)
  const source = String(settings?.dataSource || '').trim()
  const dataContext = aggregateContext.context || state.rootContext
  const parentContext = aggregateContext.parentContext || null

  if (scope === 'group' && !source && Array.isArray(aggregateContext.groupRecords)) {
    return aggregateContext.groupRecords
  }

  if (scope === 'band' && !source && Array.isArray(aggregateContext.dataRecords)) {
    return aggregateContext.dataRecords
  }

  if (scope === 'parent' && !source) {
    if (Array.isArray(parentContext?.record)) return parentContext.record
    return parentContext?.record === undefined ? [] : [parentContext.record]
  }

  if (scope === 'document') {
    return getDocumentAggregateRecords(state, settings, dependencies)
  }

  if (source) {
    const value = scope === 'parent'
      ? resolveAggregatePathValue(
        source,
        parentContext?.valueContext,
        parentContext?.record,
        dataContext?.valueContext,
        state.rootContext.rootValues
      )
      : resolveAggregatePathValue(
        source,
        dataContext?.valueContext,
        dataContext?.record,
        parentContext?.valueContext,
        state.rootContext.rootValues
      )

    return getDataEntriesFromValue(value)
  }

  const normalizeBandType = typeof dependencies.getNormalizedBandType === 'function'
    ? dependencies.getNormalizedBandType
    : value => String(value || '').trim()
  const bandType = normalizeBandType(aggregateContext.band?.type)

  if (scope === 'auto') {
    if (['group-header', 'group-footer'].includes(bandType) && Array.isArray(aggregateContext.groupRecords)) {
      return aggregateContext.groupRecords
    }

    if (['data', 'data-header', 'data-footer', 'continuation'].includes(bandType) && Array.isArray(aggregateContext.dataRecords)) {
      return aggregateContext.dataRecords
    }
  }

  return getDocumentAggregateRecords(state, settings, dependencies)
}

export function getAggregateFieldValue(record, field) {
  const fieldPath = String(field || '').trim()

  if (fieldPath) return getDataValueByPath(record, fieldPath)
  if (record && typeof record === 'object') return record.value

  return record
}

export function getAggregateNumber(value) {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null

  if (typeof value === 'string') {
    const normalized = value
      .trim()
      .replace(/\s+/g, '')
      .replace(/,(?=\d{1,2}$)/, '.')
      .replace(/[^0-9.+-]/g, '')
    const numeric = Number(normalized)

    return Number.isFinite(numeric) ? numeric : null
  }

  return null
}

export function formatAggregateValue(value) {
  if (value === null || value === undefined) return ''
  if (typeof value !== 'number') return String(value)
  if (!Number.isFinite(value)) return ''
  if (Number.isInteger(value)) return String(value)

  return String(Number(value.toFixed(4)))
}

export function getAggregateComparableValues(records, field) {
  return records
    .map(record => getAggregateFieldValue(record, field))
    .filter(value => value !== null && value !== undefined && value !== '')
}

export function calculateAggregateValue(records, settings) {
  const fn = getNormalizedAggregateFunction(settings?.function)
  const field = String(settings?.field || '').trim()
  const values = getAggregateComparableValues(records, field)

  if (fn === 'COUNT') {
    return field ? values.length : records.length
  }

  const numericValues = values
    .map(getAggregateNumber)
    .filter(value => value !== null)

  if (['SUM', 'AVG'].includes(fn)) {
    const sum = numericValues.reduce((total, value) => total + value, 0)

    return fn === 'AVG'
      ? (numericValues.length ? sum / numericValues.length : 0)
      : sum
  }

  if (!values.length) return ''

  if (numericValues.length === values.length) {
    return fn === 'MIN'
      ? Math.min(...numericValues)
      : Math.max(...numericValues)
  }

  const sortedValues = values.map(value => String(value)).sort((a, b) => a.localeCompare(b))

  return fn === 'MIN' ? sortedValues[0] : sortedValues[sortedValues.length - 1]
}

export function applyAggregateValuesToElements(elements, state, aggregateContext = {}, dependencies = {}) {
  const result = {
    matched: 0,
    changed: 0
  }
  const visit = item => {
    if (!item || typeof item !== 'object') return

    if (canElementHaveAggregate(item)) {
      ensureAggregateSettings(item)

      if (item.aggregate.enabled) {
        const records = resolveAggregateSourceRecords(state, item.aggregate, aggregateContext, dependencies)
        const value = calculateAggregateValue(records, item.aggregate)

        setTemplateTextValue(item, formatAggregateValue(value))
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
