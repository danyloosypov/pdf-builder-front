import { getDataValueByPath } from './dataAccess.js'

export const SCALAR_FUNCTION_NAMES = [
  'UPPER',
  'LOWER',
  'TRIM',
  'CONCAT',
  'SUBSTRING',
  'LENGTH',
  'ROUND',
  'FLOOR',
  'CEIL',
  'ABS',
  'FORMAT_DATE',
  'YEAR',
  'MONTH',
  'DAY',
  'DATE_DIFF'
]

function normalizeExpressionSource(value) {
  let source = String(value || '').trim()

  if (source.startsWith('=')) source = source.slice(1).trim()
  if (source.startsWith('{{') && source.endsWith('}}')) {
    source = source.slice(2, -2).trim()
  }

  return source
}

function isQuotedString(value) {
  return (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  )
}

function getStringValue(value) {
  return value === null || value === undefined ? '' : String(value)
}

function unquoteString(value) {
  const quote = value[0]
  const content = value.slice(1, -1)
  let output = ''
  let escaped = false

  for (const character of content) {
    if (escaped) {
      output += character
      escaped = false
      continue
    }

    if (character === '\\') {
      escaped = true
      continue
    }

    output += character
  }

  return quote ? output : content
}

function getMatchingParenIndex(source, openIndex) {
  let depth = 0
  let quote = ''
  let escaped = false

  for (let index = openIndex; index < source.length; index += 1) {
    const character = source[index]

    if (escaped) {
      escaped = false
      continue
    }

    if (quote) {
      if (character === '\\') {
        escaped = true
      } else if (character === quote) {
        quote = ''
      }
      continue
    }

    if (character === '"' || character === "'") {
      quote = character
      continue
    }

    if (character === '(') depth += 1
    if (character === ')') {
      depth -= 1
      if (depth === 0) return index
    }
  }

  return -1
}

function splitArguments(source) {
  const args = []
  let current = ''
  let depth = 0
  let quote = ''
  let escaped = false

  for (const character of source) {
    if (escaped) {
      current += character
      escaped = false
      continue
    }

    if (quote) {
      current += character
      if (character === '\\') {
        escaped = true
      } else if (character === quote) {
        quote = ''
      }
      continue
    }

    if (character === '"' || character === "'") {
      quote = character
      current += character
      continue
    }

    if (character === '(') depth += 1
    if (character === ')') depth -= 1

    if (character === ',' && depth === 0) {
      args.push(current.trim())
      current = ''
      continue
    }

    current += character
  }

  if (current.trim() || source.trim()) args.push(current.trim())

  return args
}

function getFunctionCall(source) {
  const match = source.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*\(/)

  if (!match) return null

  const openIndex = source.indexOf('(', match[1].length)
  const closeIndex = getMatchingParenIndex(source, openIndex)

  if (closeIndex !== source.length - 1) return null

  return {
    name: match[1].toUpperCase(),
    args: splitArguments(source.slice(openIndex + 1, closeIndex))
  }
}

function getNumber(value, fallback = 0) {
  if (typeof value === 'number' && Number.isFinite(value)) return value

  const normalized = String(value ?? '')
    .trim()
    .replace(/\s+/g, '')
    .replace(/,(?=\d{1,2}$)/, '.')
    .replace(/[^0-9.+-]/g, '')
  const numeric = Number(normalized)

  return Number.isFinite(numeric) ? numeric : fallback
}

function getInteger(value, fallback = 0) {
  const numeric = Math.trunc(getNumber(value, fallback))

  return Number.isFinite(numeric) ? numeric : fallback
}

function getDateValue(value) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value

  if (typeof value === 'number' && Number.isFinite(value)) {
    const date = new Date(value)

    return Number.isNaN(date.getTime()) ? null : date
  }

  if (typeof value === 'string' && value.trim()) {
    const source = /^\d{4}-\d{2}-\d{2}$/.test(value.trim())
      ? `${value.trim()}T00:00:00`
      : value.trim()
    const date = new Date(source)

    return Number.isNaN(date.getTime()) ? null : date
  }

  return null
}

function padNumber(value, width = 2) {
  return String(Math.abs(value)).padStart(width, '0')
}

function formatDate(value, pattern = 'YYYY-MM-DD') {
  const date = getDateValue(value)

  if (!date) return ''

  const replacements = {
    YYYY: String(date.getFullYear()),
    YY: String(date.getFullYear()).slice(-2),
    M: String(date.getMonth() + 1),
    MM: padNumber(date.getMonth() + 1),
    D: String(date.getDate()),
    DD: padNumber(date.getDate()),
    H: String(date.getHours()),
    HH: padNumber(date.getHours()),
    m: String(date.getMinutes()),
    mm: padNumber(date.getMinutes()),
    s: String(date.getSeconds()),
    ss: padNumber(date.getSeconds())
  }

  return String(pattern || 'YYYY-MM-DD').replace(
    /YYYY|YY|MM|M|DD|D|HH|H|mm|m|ss|s/g,
    token => replacements[token] ?? token
  )
}

function getWholeMonthDiff(startDate, endDate) {
  const direction = endDate >= startDate ? 1 : -1
  const start = direction === 1 ? startDate : endDate
  const end = direction === 1 ? endDate : startDate
  let months = (end.getFullYear() - start.getFullYear()) * 12 + end.getMonth() - start.getMonth()

  if (end.getDate() < start.getDate()) months -= 1

  return months * direction
}

function getDateDiff(endValue, startValue, unitValue = 'days') {
  const endDate = getDateValue(endValue)
  const startDate = getDateValue(startValue)

  if (!endDate || !startDate) return ''

  const unit = String(unitValue || 'days').trim().toLowerCase()
  const diffMs = endDate.getTime() - startDate.getTime()

  if (['year', 'years', 'y'].includes(unit)) {
    return Math.trunc(getWholeMonthDiff(startDate, endDate) / 12)
  }

  if (['month', 'months', 'mth'].includes(unit)) {
    return getWholeMonthDiff(startDate, endDate)
  }

  const divisors = {
    millisecond: 1,
    milliseconds: 1,
    ms: 1,
    second: 1000,
    seconds: 1000,
    s: 1000,
    minute: 60 * 1000,
    minutes: 60 * 1000,
    min: 60 * 1000,
    hour: 60 * 60 * 1000,
    hours: 60 * 60 * 1000,
    h: 60 * 60 * 1000,
    day: 24 * 60 * 60 * 1000,
    days: 24 * 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000
  }
  const divisor = divisors[unit] || divisors.days

  return Math.trunc(diffMs / divisor)
}

function callScalarFunction(name, args) {
  switch (name) {
    case 'UPPER':
      return getStringValue(args[0]).toUpperCase()
    case 'LOWER':
      return getStringValue(args[0]).toLowerCase()
    case 'TRIM':
      return getStringValue(args[0]).trim()
    case 'CONCAT':
      return args.map(getStringValue).join('')
    case 'SUBSTRING': {
      const source = getStringValue(args[0])
      const start = Math.max(0, getInteger(args[1], 0))
      const length = args.length > 2 ? Math.max(0, getInteger(args[2], 0)) : null

      return length === null ? source.slice(start) : source.slice(start, start + length)
    }
    case 'LENGTH':
      return getStringValue(args[0]).length
    case 'ROUND': {
      const digits = Math.max(0, getInteger(args[1], 0))
      const factor = 10 ** digits

      return Math.round(getNumber(args[0]) * factor) / factor
    }
    case 'FLOOR':
      return Math.floor(getNumber(args[0]))
    case 'CEIL':
      return Math.ceil(getNumber(args[0]))
    case 'ABS':
      return Math.abs(getNumber(args[0]))
    case 'FORMAT_DATE':
      return formatDate(args[0], args[1])
    case 'YEAR': {
      const date = getDateValue(args[0])

      return date ? date.getFullYear() : ''
    }
    case 'MONTH': {
      const date = getDateValue(args[0])

      return date ? date.getMonth() + 1 : ''
    }
    case 'DAY': {
      const date = getDateValue(args[0])

      return date ? date.getDate() : ''
    }
    case 'DATE_DIFF':
      return getDateDiff(args[0], args[1], args[2])
    default:
      return ''
  }
}

export function evaluateExpressionValue(expression, context = {}) {
  const source = normalizeExpressionSource(expression)

  if (!source) return ''
  if (isQuotedString(source)) return unquoteString(source)
  if (/^[+-]?(?:\d+\.?\d*|\.\d+)$/.test(source)) return Number(source)
  if (/^(true|false)$/i.test(source)) return /^true$/i.test(source)
  if (/^null$/i.test(source)) return null

  const functionCall = getFunctionCall(source)

  if (functionCall) {
    const args = functionCall.args.map(arg => evaluateExpressionValue(arg, context))

    return callScalarFunction(functionCall.name, args)
  }

  const value = getDataValueByPath(context, source)

  return value === undefined ? '' : value
}

export function formatExpressionValue(value) {
  if (value === null || value === undefined) return ''
  if (value instanceof Date) return formatDate(value)
  if (typeof value === 'number' && Number.isFinite(value)) return String(value)

  return String(value)
}

export function evaluateScalarExpression(expression, context = {}) {
  return formatExpressionValue(evaluateExpressionValue(expression, context))
}
