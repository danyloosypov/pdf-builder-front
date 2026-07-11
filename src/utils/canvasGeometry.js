export function clampNumber(value, min, max) {
  const numericValue = Number(value)
  if (!Number.isFinite(numericValue)) return min

  return Math.min(Math.max(numericValue, min), max)
}

export function getRotatedPoint(originX, originY, localX, localY, rotation = 0) {
  const angle = rotation * Math.PI / 180
  const cos = Math.cos(angle)
  const sin = Math.sin(angle)

  return {
    x: originX + localX * cos - localY * sin,
    y: originY + localX * sin + localY * cos
  }
}

export function getLineRawBounds(item) {
  const points = item.points || []
  const xs = []
  const ys = []

  for (let index = 0; index < points.length; index += 2) {
    xs.push(points[index])
    ys.push(points[index + 1])
  }

  if (!xs.length || !ys.length) {
    return {
      minX: 0,
      minY: 0,
      width: 160,
      height: 0,
      pointCount: 0
    }
  }

  const minX = Math.min(...xs)
  const maxX = Math.max(...xs)
  const minY = Math.min(...ys)
  const maxY = Math.max(...ys)

  return {
    minX,
    minY,
    width: maxX - minX,
    height: maxY - minY,
    pointCount: xs.length
  }
}

export function getLineLocalBounds(item) {
  const bounds = getLineRawBounds(item)

  return {
    ...bounds,
    width: Math.max(1, bounds.width),
    height: Math.max(1, bounds.height)
  }
}
