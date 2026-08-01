export function isPlainObjectValue(value) {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value))
}

export function getDataValueByPath(source, path) {
  if (!source || typeof source !== 'object') return undefined
  if (Object.prototype.hasOwnProperty.call(source, path)) return source[path]

  return String(path || '')
    .split('.')
    .filter(Boolean)
    .reduce((value, segment) => {
      if (!value || typeof value !== 'object') return undefined

      return value[segment]
    }, source)
}

export function getDataEntriesFromValue(value) {
  if (Array.isArray(value)) return value
  if (value === null || value === undefined) return []

  return []
}
