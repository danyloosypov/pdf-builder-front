function createId() {
  return Date.now()
}

class CanvasElement {
  constructor(config) {
    Object.assign(this, config)
  }
}

export class TextElement extends CanvasElement {
  constructor(config = {}) {
    super({
      id: createId(),
      type: 'text',
      text: 'Text',
      x: 150,
      y: 150,
      width: 240,
      height: 80,
      fontSize: 20,
      wrap: 'word',
      draggable: true,
      ...config
    })
  }
}

export class ImageElement extends CanvasElement {
  constructor(config = {}) {
    super({
      id: createId(),
      type: 'image',
      x: 200,
      y: 200,
      width: 150,
      height: 150,
      cornerRadius: 0,
      opacity: 1,
      objectFit: 'cover',
      cropLeft: 0,
      cropRight: 0,
      cropTop: 0,
      cropBottom: 0,
      draggable: true,
      ...config
    })
  }
}

export class RectElement extends CanvasElement {
  constructor(config = {}) {
    super({
      id: createId(),
      type: 'rect',
      x: 200,
      y: 200,
      width: 120,
      height: 80,
      fill: '#dddddd',
      stroke: '#111827',
      strokeWidth: 2,
      cornerRadius: 0,
      opacity: 1,
      draggable: true,
      ...config
    })
  }
}

export class CircleElement extends CanvasElement {
  constructor(config = {}) {
    super({
      id: createId(),
      type: 'circle',
      x: 250,
      y: 250,
      radius: 40,
      fill: '#87ceeb',
      stroke: '#111827',
      strokeWidth: 2,
      opacity: 1,
      draggable: true,
      ...config
    })
  }
}

export class RegularPolygonElement extends CanvasElement {
  constructor(config = {}) {
    super({
      id: createId(),
      type: 'polygon',
      x: 300,
      y: 300,
      sides: 6,
      radius: 50,
      fill: '#f1c40f',
      stroke: '#000000',
      strokeWidth: 2,
      opacity: 1,
      draggable: true,
      ...config
    })
  }
}

export class LineElement extends CanvasElement {
  constructor(config = {}) {
    super({
      id: createId(),
      type: 'line',
      points: [100, 100, 300, 300],
      stroke: '#000000',
      strokeWidth: 2,
      opacity: 1,
      lineCap: 'round',
      lineJoin: 'round',
      draggable: true,
      ...config
    })
  }
}

export class ArrowElement extends CanvasElement {
  constructor(config = {}) {
    super({
      id: createId(),
      type: 'arrow',
      points: [100, 200, 300, 200],
      stroke: 'red',
      strokeWidth: 3,
      pointerLength: 10,
      pointerWidth: 10,
      draggable: true,
      ...config
    })
  }
}

export class LabelElement extends CanvasElement {
  constructor(config = {}) {
    super({
      id: createId(),
      type: 'label',
      x: 200,
      y: 200,
      draggable: true,
      text: 'LABEL',
      opacity: 1,
      tag: {
        fill: '#3498db',
        cornerRadius: 4
      },
      textConfig: {
        fontSize: 14,
        fill: '#ffffff',
        fontFamily: 'Arial, sans-serif',
        padding: 5
      },
      ...config
    })
  }
}

export class ChartElement extends CanvasElement {
  constructor(config = {}) {
    super({
      id: createId(),
      type: 'chart',
      x: 180,
      y: 220,
      width: 280,
      height: 170,
      rotation: 0,
      draggable: true,
      ...config
    })
  }
}

export class GroupElement extends CanvasElement {
  constructor(config = {}) {
    super({
      id: createId(),
      type: 'group',
      x: 0,
      y: 0,
      width: 1,
      height: 1,
      draggable: true,
      children: [],
      ...config
    })
  }
}
