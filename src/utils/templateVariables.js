export const TEMPLATE_VARIABLE_ELEMENT_TYPES = new Set(['text', 'label', 'image'])

function isTemplateTableCell(item) {
  return Boolean(
    item &&
    typeof item === 'object' &&
    !item.type &&
    Object.prototype.hasOwnProperty.call(item, 'row') &&
    Object.prototype.hasOwnProperty.call(item, 'col') &&
    Object.prototype.hasOwnProperty.call(item, 'text')
  )
}

export function normalizeTemplateVariableKey(value) {
  return String(value || '').trim()
}

export function canElementHaveTemplateVariable(item) {
  return TEMPLATE_VARIABLE_ELEMENT_TYPES.has(item?.type) || isTemplateTableCell(item)
}

export function getTemplateVariableKey(item) {
  if (!canElementHaveTemplateVariable(item)) return ''

  return normalizeTemplateVariableKey(item.templateVariable)
}

export function getTemplateVariableValueType(item) {
  return item?.type === 'image' ? 'image' : 'text'
}

export function getTemplateVariableCurrentValue(item) {
  if (item?.type === 'text' || item?.type === 'label' || isTemplateTableCell(item)) return String(item.text || '')

  if (item?.type === 'image') {
    return [
      item.imageDataUrl,
      item.imageUrl,
      item.imageSource,
      item.sourceUrl,
      item.url
    ].find(value => typeof value === 'string' && value.trim()) || ''
  }

  return ''
}

function getRepeatVariableKey(cell) {
  return normalizeTemplateVariableKey(cell?.repeatVariable)
}

function getTableCellsForRow(table, row) {
  return Array.isArray(table?.cells)
    ? table.cells.filter(cell => cell.row === row && !cell.repeatGeneratedFrom)
    : []
}

function getTableRepeatRows(table) {
  if (!Array.isArray(table?.cells)) return []

  const rowMap = new Map()

  table.cells.forEach(cell => {
    if (!isTemplateTableCell(cell) || cell.repeatGeneratedFrom) return

    const repeatVariable = getRepeatVariableKey(cell)

    if (!repeatVariable || rowMap.has(cell.row)) return

    rowMap.set(cell.row, {
      row: cell.row,
      key: repeatVariable,
      cells: getTableCellsForRow(table, cell.row)
    })
  })

  return Array.from(rowMap.values())
}

function visitTemplateElements(elements, visitor) {
  if (!Array.isArray(elements)) return

  elements.forEach(item => {
    if (!item || typeof item !== 'object') return

    visitor(item, {})

    if (Array.isArray(item.cells)) {
      item.cells.forEach(cell => {
        if (!cell || typeof cell !== 'object') return

        visitor(cell, {
          parent: item,
          targetType: 'tableCell'
        })
      })
    }

    visitTemplateElements(item.children, visitor)
  })
}

function addTemplateVariableBinding(variableMap, key, valueType, defaultValue, binding) {
  const existing = variableMap.get(key)

  if (existing) {
    existing.bindings.push(binding)
    if (existing.valueType !== valueType) existing.valueType = 'mixed'
    return
  }

  variableMap.set(key, {
    key,
    valueType,
    defaultValue,
    bindings: [binding]
  })
}

export function getTemplateVariablesFromElements(elements) {
  const variableMap = new Map()

  visitTemplateElements(elements, (item, context = {}) => {
    if (item?.type === 'table') {
      getTableRepeatRows(item).forEach(rowConfig => {
        addTemplateVariableBinding(
          variableMap,
          rowConfig.key,
          'array',
          [],
          {
            elementId: item.id,
            elementType: 'table',
            targetType: 'tableRow',
            row: rowConfig.row,
            itemProperties: rowConfig.cells
              .map(cell => getTemplateVariableKey(cell))
              .filter(Boolean)
          }
        )
      })
    }

    if (context.targetType === 'tableCell' && item.repeatGeneratedFrom) return

    const key = getTemplateVariableKey(item)

    if (!key) return

    const valueType = getTemplateVariableValueType(item)
    const binding = {
      elementId: context.parent?.id ?? item.id,
      elementType: context.parent?.type ?? item.type,
      targetType: context.targetType || item.type,
      valueType
    }

    if (context.targetType === 'tableCell') {
      binding.cellId = item.id
      binding.row = item.row
      binding.col = item.col
      binding.rowSpan = item.rowSpan
      binding.colSpan = item.colSpan
    }

    addTemplateVariableBinding(
      variableMap,
      key,
      valueType,
      getTemplateVariableCurrentValue(item),
      binding
    )
  })

  return Array.from(variableMap.values())
}

function cloneTemplateData(data) {
  if (typeof structuredClone === 'function') {
    try {
      return structuredClone(data)
    } catch {
      // Fall back to JSON cloning for exported template data.
    }
  }

  return JSON.parse(JSON.stringify(data))
}

function replaceProseMirrorText(content, replacement) {
  let didReplace = false

  function replaceNode(node) {
    if (Array.isArray(node)) return node.map(replaceNode).filter(Boolean)
    if (!node || typeof node !== 'object') return node

    const nextNode = { ...node }

    if (typeof nextNode.text === 'string') {
      if (didReplace || !replacement) return null

      nextNode.text = replacement
      didReplace = true
    }

    if (Array.isArray(nextNode.content)) {
      nextNode.content = nextNode.content.map(replaceNode).filter(Boolean)
    }

    return nextNode
  }

  const nextContent = replaceNode(content)

  if (!didReplace && replacement && nextContent && typeof nextContent === 'object') {
    nextContent.content = [
      ...(Array.isArray(nextContent.content) ? nextContent.content : []),
      {
        type: 'paragraph',
        content: [{ type: 'text', text: replacement }]
      }
    ]
  }

  return nextContent
}

function replaceHtmlTextContent(html, replacement) {
  if (typeof DOMParser === 'undefined' || typeof XMLSerializer === 'undefined') return ''

  const parser = new DOMParser()
  const document = parser.parseFromString(String(html || '<p></p>'), 'text/html')
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT)
  let didReplace = false
  let node = walker.nextNode()

  while (node) {
    node.textContent = didReplace ? '' : replacement
    didReplace = true
    node = walker.nextNode()
  }

  if (!didReplace) {
    const target = document.body.firstElementChild || document.body.appendChild(document.createElement('p'))

    target.textContent = replacement
  }

  return document.body.innerHTML
}

function setTemplateTextValue(item, value) {
  const replacement = value === null || value === undefined ? '' : String(value)

  item.text = replacement

  if (item.richTextJson) {
    item.richTextJson = replaceProseMirrorText(item.richTextJson, replacement)
    delete item.richText
    delete item.richImage
    return
  }

  if (item.richText) {
    const updatedHtml = replaceHtmlTextContent(item.richText, replacement)

    if (updatedHtml) {
      item.richText = updatedHtml
      delete item.richImage
    } else {
      delete item.richText
      delete item.richImage
    }
  }
}

function getObjectValueByPath(source, path) {
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

function getRepeatRowEntries(values, key) {
  const value = getObjectValueByPath(values, key)

  return Array.isArray(value) ? value : null
}

function getTableRowHeight(table, row) {
  return Array.isArray(table.rowHeights) && Number.isFinite(Number(table.rowHeights[row]))
    ? Number(table.rowHeights[row])
    : Math.max(1, (Number(table.height) || Math.max(1, Number(table.rows) || 1)) / Math.max(1, Number(table.rows) || 1))
}

function collapseGeneratedRepeatRows(table) {
  if (!Array.isArray(table?.cells)) return

  const generatedRows = Array.from(new Set(
    table.cells
      .filter(cell => cell?.repeatGeneratedFrom)
      .map(cell => Number(cell.row))
      .filter(Number.isFinite)
  )).sort((a, b) => b - a)

  generatedRows.forEach(row => {
    const removedHeight = getTableRowHeight(table, row)

    table.cells = table.cells.filter(cell => Number(cell.row) !== row)
    table.cells.forEach(cell => {
      if (cell.row > row) cell.row -= 1
    })

    if (Array.isArray(table.rowHeights)) table.rowHeights.splice(row, 1)

    table.rows = Math.max(1, (Number(table.rows) || 1) - 1)
    table.height = Math.max(table.rows, (Number(table.height) || table.rows) - removedHeight)
  })
}

function createRepeatedCellId(cell, repeatVariable, entryIndex) {
  return `${cell.id}-repeat-${repeatVariable}-${entryIndex}`
}

function fillRepeatRowCells(cells, entry) {
  let changed = 0

  cells.forEach(cell => {
    const key = getTemplateVariableKey(cell)

    if (!key) return

    setTemplateTextValue(cell, getObjectValueByPath(entry, key))
    changed += 1
  })

  return changed
}

function expandTableRepeatRows(table, values) {
  const result = {
    matched: 0,
    changed: 0
  }

  if (!Array.isArray(table?.cells)) return result

  collapseGeneratedRepeatRows(table)

  getTableRepeatRows(table)
    .map(rowConfig => ({
      ...rowConfig,
      entries: getRepeatRowEntries(values, rowConfig.key)
    }))
    .filter(rowConfig => rowConfig.entries)
    .sort((a, b) => b.row - a.row)
    .forEach(rowConfig => {
      const entries = rowConfig.entries
      const sourceCells = getTableCellsForRow(table, rowConfig.row)
      const rowHeight = getTableRowHeight(table, rowConfig.row)
      const generatedCount = Math.max(0, entries.length - 1)

      result.matched += sourceCells.length * Math.max(1, entries.length)
      result.changed += fillRepeatRowCells(sourceCells, entries[0] || {})

      if (!generatedCount) return

      table.cells.forEach(cell => {
        if (cell.row > rowConfig.row) cell.row += generatedCount
      })

      if (!Array.isArray(table.rowHeights)) table.rowHeights = []

      table.rowHeights.splice(
        rowConfig.row + 1,
        0,
        ...Array.from({ length: generatedCount }, () => rowHeight)
      )

      table.rows = (Number(table.rows) || 1) + generatedCount
      table.height = (Number(table.height) || 0) + rowHeight * generatedCount

      entries.slice(1).forEach((entry, entryOffset) => {
        const entryIndex = entryOffset + 1
        const row = rowConfig.row + entryIndex
        const repeatedCells = sourceCells.map(cell => ({
          ...cell,
          id: createRepeatedCellId(cell, rowConfig.key, entryIndex),
          row,
          repeatVariable: '',
          repeatGeneratedFrom: rowConfig.key,
          repeatSourceCellId: cell.id,
          repeatSourceRow: rowConfig.row
        }))

        result.changed += fillRepeatRowCells(repeatedCells, entry)
        table.cells.push(...repeatedCells)
      })
    })

  table.cells.sort((a, b) => a.row - b.row || a.col - b.col)

  return result
}

function applyRepeatRowsToElements(elements, values) {
  const result = {
    matched: 0,
    changed: 0
  }

  visitTemplateElements(elements, item => {
    if (item?.type !== 'table') return

    const tableResult = expandTableRepeatRows(item, values)

    result.matched += tableResult.matched
    result.changed += tableResult.changed
  })

  return result
}

function getImageReplacementSource(value) {
  if (typeof value === 'string') return value.trim()

  if (value && typeof value === 'object') {
    return [
      value.imageDataUrl,
      value.dataUrl,
      value.imageUrl,
      value.imageSource,
      value.sourceUrl,
      value.url,
      value.src
    ].find(entry => typeof entry === 'string' && entry.trim())?.trim() || ''
  }

  return ''
}

function setTemplateImageValue(item, value) {
  const source = getImageReplacementSource(value)

  if (!source) return false

  delete item.image

  if (/^data:image\//i.test(source)) {
    item.imageDataUrl = source
    item.imageSource = source
    delete item.imageUrl
    return true
  }

  item.imageUrl = source
  item.imageSource = source
  delete item.imageDataUrl

  return true
}

function getObjectTemplateValues(value) {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value
    : null
}

function getArrayTemplateValues(entries) {
  if (!Array.isArray(entries)) return null

  const values = {}

  entries.forEach(entry => {
    if (!entry || typeof entry !== 'object') return

    const key = normalizeTemplateVariableKey(entry.key || entry.name || entry.variable)

    if (!key || !Object.prototype.hasOwnProperty.call(entry, 'value')) return

    values[key] = entry.value
  })

  return Object.keys(values).length ? values : null
}

export function normalizeTemplateValuesPayload(payload) {
  const objectPayload = getObjectTemplateValues(payload)

  if (objectPayload) {
    const nestedValues = getObjectTemplateValues(objectPayload.values) ||
      getObjectTemplateValues(objectPayload.data)

    if (nestedValues) return nestedValues

    const objectVariables = getObjectTemplateValues(objectPayload.variables)

    if (objectVariables) return objectVariables

    const arrayVariables = getArrayTemplateValues(objectPayload.variables)

    if (arrayVariables) return arrayVariables

    if (Array.isArray(objectPayload.elements)) return null

    return objectPayload
  }

  return getArrayTemplateValues(payload)
}

export function applyTemplateVariablesToElements(elements, values = {}) {
  const normalizedValues = normalizeTemplateValuesPayload(values) || {}
  const repeatResult = applyRepeatRowsToElements(elements, normalizedValues)
  const result = {
    matched: repeatResult.matched,
    changed: repeatResult.changed,
    imageElements: []
  }

  visitTemplateElements(elements, item => {
    if (item.repeatGeneratedFrom) return

    const key = getTemplateVariableKey(item)

    if (!key || !Object.prototype.hasOwnProperty.call(normalizedValues, key)) return
    if (
      isTemplateTableCell(item) &&
      getRepeatVariableKey(item) &&
      Array.isArray(getObjectValueByPath(normalizedValues, getRepeatVariableKey(item)))
    ) {
      return
    }

    result.matched += 1

    if (item.type === 'image') {
      if (setTemplateImageValue(item, normalizedValues[key])) {
        result.changed += 1
        result.imageElements.push(item)
      }
      return
    }

    setTemplateTextValue(item, normalizedValues[key])
    result.changed += 1
  })

  return result
}

export function applyTemplateVariables(templateData, values = {}) {
  const nextTemplateData = cloneTemplateData(templateData)
  const elements = Array.isArray(nextTemplateData)
    ? nextTemplateData
    : nextTemplateData.elements

  applyTemplateVariablesToElements(elements, values)

  if (!Array.isArray(nextTemplateData) && Array.isArray(elements)) {
    nextTemplateData.variables = getTemplateVariablesFromElements(elements)
  }

  return nextTemplateData
}
