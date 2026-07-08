<script setup>
defineProps({
  item: { type: Object, required: true },
  editingId: { type: [String, Number], default: null },
  shapeTypes: { type: Array, required: true },
  regularPolygonShapeTypes: { type: Array, required: true },
  setRef: { type: Function, required: true },
  getGroupConfig: { type: Function, required: true },
  getGroupHitAreaConfig: { type: Function, required: true },
  getGroupedRichTextImageConfig: { type: Function, required: true },
  getGroupedTextConfig: { type: Function, required: true },
  getGroupedImageBoxConfig: { type: Function, required: true },
  getGroupedImageContentConfig: { type: Function, required: true },
  getGroupedRectConfig: { type: Function, required: true },
  getGroupedChildConfig: { type: Function, required: true },
  getGroupedChartBoxConfig: { type: Function, required: true },
  getGroupedShapeTextImageConfig: { type: Function, required: true },
  getRichTextImageConfig: { type: Function, required: true },
  getTextConfig: { type: Function, required: true },
  getImageBoxConfig: { type: Function, required: true },
  getImageHitAreaConfig: { type: Function, required: true },
  getImageContentConfig: { type: Function, required: true },
  getRectConfig: { type: Function, required: true },
  getChartBoxConfig: { type: Function, required: true },
  getChartHitAreaConfig: { type: Function, required: true },
  getChartTitleConfig: { type: Function, required: true },
  getChartXAxisLabelConfig: { type: Function, required: true },
  getChartYAxisLabelConfig: { type: Function, required: true },
  getChartFrameConfig: { type: Function, required: true },
  getChartGridLines: { type: Function, required: true },
  getChartGridLineConfig: { type: Function, required: true },
  getChartAxisValueLabelConfigs: { type: Function, required: true },
  getChartAreaConfig: { type: Function, required: true },
  getChartLineConfig: { type: Function, required: true },
  getChartPointConfigs: { type: Function, required: true },
  getShapeTextImageConfig: { type: Function, required: true }
})

const emit = defineEmits([
  'selectable-pointer-down',
  'selectable-click',
  'text-edit',
  'shape-text-edit',
  'position-update',
  'position-drag',
  'transform-update'
])
</script>

<template>
  <v-group
      v-if="item.type === 'group'"
      :ref="el => setRef(el, item.id)"
      :config="getGroupConfig(item)"
      @mousedown="emit('selectable-pointer-down', $event, item.id)"
      @touchstart="emit('selectable-pointer-down', $event, item.id)"
      @click="emit('selectable-click', $event)"
      @dragend="emit('position-update', $event, item.id)"
      @transformend="emit('transform-update', $event, item.id)"
  >
    <v-rect :config="getGroupHitAreaConfig(item)" />

    <template v-for="child in item.children" :key="child.id">
      <template v-if="child.type === 'text'">
        <v-image
            v-if="child.richImage"
            :config="getGroupedRichTextImageConfig(child)"
        />
        <v-text
            v-else
            :config="getGroupedTextConfig(child)"
        />
      </template>

      <v-group
          v-else-if="child.type === 'image'"
          :config="getGroupedImageBoxConfig(child)"
      >
        <v-image :config="getGroupedImageContentConfig(child)" />
      </v-group>

      <v-rect
          v-else-if="child.type === 'rect'"
          :config="getGroupedRectConfig(child)"
      />

      <v-circle
          v-else-if="child.type === 'circle'"
          :config="getGroupedChildConfig(child)"
      />

      <v-regular-polygon
          v-else-if="regularPolygonShapeTypes.includes(child.type)"
          :config="getGroupedChildConfig(child)"
      />

      <v-group
          v-else-if="child.type === 'chart'"
          :config="getGroupedChartBoxConfig(child)"
      >
        <v-text
            v-if="child.chartTitle"
            :config="getChartTitleConfig(child)"
        />
        <v-text
            v-if="child.xAxisLabel"
            :config="getChartXAxisLabelConfig(child)"
        />
        <v-text
            v-if="child.yAxisLabel"
            :config="getChartYAxisLabelConfig(child)"
        />
        <v-rect :config="getChartFrameConfig(child)" />
        <v-line
            v-for="line in getChartGridLines(child)"
            :key="line.id"
            :config="getChartGridLineConfig(child, line)"
        />
        <v-text
            v-for="label in getChartAxisValueLabelConfigs(child)"
            :key="label.id"
            :config="label"
        />
        <v-line
            v-if="child.chartType === 'polygon'"
            :config="getChartAreaConfig(child)"
        />
        <v-line :config="getChartLineConfig(child)" />
        <v-circle
            v-for="point in getChartPointConfigs(child)"
            :key="point.id"
            :config="point"
        />
      </v-group>

      <v-line
          v-else-if="child.type === 'line'"
          :config="getGroupedChildConfig(child)"
      />

      <v-arrow
          v-else-if="child.type === 'arrow'"
          :config="getGroupedChildConfig(child)"
      />

      <v-label
          v-else-if="child.type === 'label'"
          :config="getGroupedChildConfig({ x: child.x, y: child.y, rotation: child.rotation || 0 })"
      >
        <v-tag :config="getGroupedChildConfig(child.tag)" />
        <v-text :config="getGroupedChildConfig({ ...child.textConfig, text: child.text })" />
      </v-label>

      <v-image
          v-if="shapeTypes.includes(child.type) && child.shapeRichImage"
          :config="getGroupedShapeTextImageConfig(child)"
      />
    </template>
  </v-group>

  <template v-else-if="item.type === 'text'">
    <v-image
        v-if="item.richImage"
        :ref="el => setRef(el, item.id)"
        :config="getRichTextImageConfig(item)"
        @mousedown="emit('selectable-pointer-down', $event, item.id)"
        @touchstart="emit('selectable-pointer-down', $event, item.id)"
        @click="emit('selectable-click', $event)"
        @dblclick="emit('text-edit', item)"
        @dragend="emit('position-update', $event, item.id)"
        @transformend="emit('transform-update', $event, item.id)"
    />
    <v-text
        v-else
        :ref="el => setRef(el, item.id)"
        :config="getTextConfig(item)"
        @mousedown="emit('selectable-pointer-down', $event, item.id)"
        @touchstart="emit('selectable-pointer-down', $event, item.id)"
        @click="emit('selectable-click', $event)"
        @dblclick="emit('text-edit', item)"
        @dragend="emit('position-update', $event, item.id)"
        @transformend="emit('transform-update', $event, item.id)"
    />
  </template>

  <v-group
      v-else-if="item.type === 'image'"
      :ref="el => setRef(el, item.id)"
      :config="getImageBoxConfig(item)"
      @mousedown="emit('selectable-pointer-down', $event, item.id)"
      @touchstart="emit('selectable-pointer-down', $event, item.id)"
      @click="emit('selectable-click', $event)"
      @dragend="emit('position-update', $event, item.id)"
      @transformend="emit('transform-update', $event, item.id)"
  >
    <v-rect :config="getImageHitAreaConfig(item)" />
    <v-image :config="getImageContentConfig(item)" />
  </v-group>

  <v-rect
      v-else-if="item.type === 'rect'"
      :ref="el => setRef(el, item.id)"
      :config="getRectConfig(item)"
      @mousedown="emit('selectable-pointer-down', $event, item.id)"
      @touchstart="emit('selectable-pointer-down', $event, item.id)"
      @click="emit('selectable-click', $event)"
      @dblclick="emit('shape-text-edit', item)"
      @dragmove="emit('position-drag', $event, item.id)"
      @dragend="emit('position-update', $event, item.id)"
      @transformend="emit('transform-update', $event, item.id)"
  />

  <v-circle
      v-else-if="item.type === 'circle'"
      :ref="el => setRef(el, item.id)"
      :config="item"
      @mousedown="emit('selectable-pointer-down', $event, item.id)"
      @touchstart="emit('selectable-pointer-down', $event, item.id)"
      @click="emit('selectable-click', $event)"
      @dblclick="emit('shape-text-edit', item)"
      @dragmove="emit('position-drag', $event, item.id)"
      @dragend="emit('position-update', $event, item.id)"
      @transformend="emit('transform-update', $event, item.id)"
  />

  <v-regular-polygon
      v-else-if="regularPolygonShapeTypes.includes(item.type)"
      :ref="el => setRef(el, item.id)"
      :config="item"
      @mousedown="emit('selectable-pointer-down', $event, item.id)"
      @touchstart="emit('selectable-pointer-down', $event, item.id)"
      @click="emit('selectable-click', $event)"
      @dblclick="emit('shape-text-edit', item)"
      @dragmove="emit('position-drag', $event, item.id)"
      @dragend="emit('position-update', $event, item.id)"
      @transformend="emit('transform-update', $event, item.id)"
  />

  <v-group
      v-else-if="item.type === 'chart'"
      :ref="el => setRef(el, item.id)"
      :config="getChartBoxConfig(item)"
      @mousedown="emit('selectable-pointer-down', $event, item.id)"
      @touchstart="emit('selectable-pointer-down', $event, item.id)"
      @click="emit('selectable-click', $event)"
      @dragend="emit('position-update', $event, item.id)"
      @transformend="emit('transform-update', $event, item.id)"
  >
    <v-rect :config="getChartHitAreaConfig(item)" />
    <v-text
        v-if="item.chartTitle"
        :config="getChartTitleConfig(item)"
    />
    <v-text
        v-if="item.xAxisLabel"
        :config="getChartXAxisLabelConfig(item)"
    />
    <v-text
        v-if="item.yAxisLabel"
        :config="getChartYAxisLabelConfig(item)"
    />
    <v-rect :config="getChartFrameConfig(item)" />
    <v-line
        v-for="line in getChartGridLines(item)"
        :key="line.id"
        :config="getChartGridLineConfig(item, line)"
    />
    <v-text
        v-for="label in getChartAxisValueLabelConfigs(item)"
        :key="label.id"
        :config="label"
    />
    <v-line
        v-if="item.chartType === 'polygon'"
        :config="getChartAreaConfig(item)"
    />
    <v-line :config="getChartLineConfig(item)" />
    <v-circle
        v-for="point in getChartPointConfigs(item)"
        :key="point.id"
        :config="point"
    />
  </v-group>

  <v-line
      v-else-if="item.type === 'line'"
      :ref="el => setRef(el, item.id)"
      :config="item"
      @mousedown="emit('selectable-pointer-down', $event, item.id)"
      @touchstart="emit('selectable-pointer-down', $event, item.id)"
      @click="emit('selectable-click', $event)"
      @dblclick="emit('shape-text-edit', item)"
      @dragmove="emit('position-drag', $event, item.id)"
      @dragend="emit('position-update', $event, item.id)"
      @transformend="emit('transform-update', $event, item.id)"
  />

  <v-arrow
      v-else-if="item.type === 'arrow'"
      :ref="el => setRef(el, item.id)"
      :config="item"
      @mousedown="emit('selectable-pointer-down', $event, item.id)"
      @touchstart="emit('selectable-pointer-down', $event, item.id)"
      @click="emit('selectable-click', $event)"
      @dragend="emit('position-update', $event, item.id)"
      @transformend="emit('transform-update', $event, item.id)"
  />

  <v-label
      v-else-if="item.type === 'label'"
      :ref="el => setRef(el, item.id)"
      :config="{ x: item.x, y: item.y, draggable: item.draggable, rotation: item.rotation || 0 }"
      @mousedown="emit('selectable-pointer-down', $event, item.id)"
      @touchstart="emit('selectable-pointer-down', $event, item.id)"
      @click="emit('selectable-click', $event)"
      @dragend="emit('position-update', $event, item.id)"
      @transformend="emit('transform-update', $event, item.id)"
  >
    <v-tag :config="item.tag" />
    <v-text :config="item.textConfig" :text="item.text" />
  </v-label>

  <v-image
      v-if="shapeTypes.includes(item.type) && item.shapeRichImage"
      :config="getShapeTextImageConfig(item)"
  />
</template>
