import { Extension, Mark } from '@tiptap/core'

export function createRichTextStyleExtension({ getHexColor, getNormalizedTextFontSize }) {
  return Mark.create({
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
}

export function createTextAlignExtension() {
  return Extension.create({
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
}
