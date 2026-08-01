export const TEMPLATE_VARIABLE_ELEMENT_TYPES = new Set(['text', 'label', 'image', 'checkbox'])
export const TEXT_VALUE_ELEMENT_TYPES = new Set(['text', 'label'])

export function isTableCellTextTarget(item) {
  return Boolean(
    item &&
    typeof item === 'object' &&
    !item.type &&
    Object.prototype.hasOwnProperty.call(item, 'row') &&
    Object.prototype.hasOwnProperty.call(item, 'col') &&
    Object.prototype.hasOwnProperty.call(item, 'text')
  )
}

export function canElementHaveTemplateVariable(item) {
  return TEMPLATE_VARIABLE_ELEMENT_TYPES.has(item?.type) || isTableCellTextTarget(item)
}

export function canElementHaveTextValue(item) {
  return TEXT_VALUE_ELEMENT_TYPES.has(item?.type) || isTableCellTextTarget(item)
}
