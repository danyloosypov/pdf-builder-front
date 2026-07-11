export function getNormalizedQRLink(value) {
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
