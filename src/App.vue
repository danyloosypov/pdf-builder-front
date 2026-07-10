<script>
import { EditorContent } from '@tiptap/vue-3'
import { usePdfBuilder } from './composables/usePdfBuilder'
import CanvasItem from './components/canvas/CanvasItem.vue'

export default {
  components: {
    EditorContent,
    CanvasItem
  },
  setup() {
    return usePdfBuilder()
  }
}
</script>

<template>
  <div class="layout">
    <div class="toolbar">
      <div class="page-size-panel">
        <div class="panel-title">Canvas Size</div>

        <label class="control-row canvas-color-row">
          <span>Canvas Color</span>
          <input v-model="canvasColor" type="color" aria-label="Canvas color">
        </label>

        <label class="control-row">
          <span>Preset</span>
          <select v-model="selectedPagePreset" class="control-select">
            <option
                v-for="preset in pageSizePresets"
                :key="preset.value"
                :value="preset.value"
            >
              {{ preset.label }}
            </option>
          </select>
        </label>

        <label class="control-row">
          <span>Units</span>
          <select v-model="pageUnit" class="control-select">
            <option value="cm">Centimeters</option>
            <option value="in">Inches</option>
          </select>
        </label>

        <div class="control-row">
          <span>Orientation</span>
          <div class="segmented-control">
            <button
                type="button"
                :class="{ active: pageOrientation === 'portrait' }"
                @click="pageOrientation = 'portrait'"
            >
              Portrait
            </button>
            <button
                type="button"
                :class="{ active: pageOrientation === 'landscape' }"
                @click="pageOrientation = 'landscape'"
            >
              Landscape
            </button>
          </div>
        </div>

        <div v-if="selectedPagePreset === 'custom'" class="page-size-grid">
          <label>
            <span>Width</span>
            <input
                v-model.number="customPageWidth"
                type="number"
                :min="pageDimensionMin"
                :max="pageDimensionMax"
                :step="pageDimensionStep"
            >
          </label>
          <label>
            <span>Height</span>
            <input
                v-model.number="customPageHeight"
                type="number"
                :min="pageDimensionMin"
                :max="pageDimensionMax"
                :step="pageDimensionStep"
            >
          </label>
        </div>

        <div class="page-size-readout">
          {{ currentPageWidth }} x {{ currentPageHeight }} {{ pageUnit }}
          <span>{{ pagePixelSize.width }} x {{ pagePixelSize.height }} px</span>
        </div>

        <label class="control-row">
          <span>Margins</span>
          <select v-model="selectedPageMarginPreset" class="control-select">
            <option
                v-for="preset in pageMarginPresets"
                :key="preset.value"
                :value="preset.value"
            >
              {{ preset.label }}
            </option>
          </select>
        </label>

        <div v-if="selectedPageMarginPreset === 'custom'" class="page-margin-grid">
          <label>
            <span>Top ({{ pageUnit }})</span>
            <input
                v-model.number="customPageMarginTop"
                type="number"
                min="0"
                :max="pageMarginVerticalMax"
                :step="pageMarginStep"
            >
          </label>
          <label>
            <span>Right ({{ pageUnit }})</span>
            <input
                v-model.number="customPageMarginRight"
                type="number"
                min="0"
                :max="pageMarginHorizontalMax"
                :step="pageMarginStep"
            >
          </label>
          <label>
            <span>Bottom ({{ pageUnit }})</span>
            <input
                v-model.number="customPageMarginBottom"
                type="number"
                min="0"
                :max="pageMarginVerticalMax"
                :step="pageMarginStep"
            >
          </label>
          <label>
            <span>Left ({{ pageUnit }})</span>
            <input
                v-model.number="customPageMarginLeft"
                type="number"
                min="0"
                :max="pageMarginHorizontalMax"
                :step="pageMarginStep"
            >
          </label>
        </div>

        <div v-else class="page-margin-readout">
          <span>Top {{ currentPageMargins.top }} {{ pageUnit }}</span>
          <span>Right {{ currentPageMargins.right }} {{ pageUnit }}</span>
          <span>Bottom {{ currentPageMargins.bottom }} {{ pageUnit }}</span>
          <span>Left {{ currentPageMargins.left }} {{ pageUnit }}</span>
        </div>
      </div>

      <button @click="addText">Text</button>
      <label class="file-upload-button">
        Upload Image
        <input type="file" accept="image/*" @change="uploadImage">
      </label>

      <div class="qr-panel">
        <label class="control-row">
          <span>QR Link</span>
          <input
              v-model="qrLink"
              class="qr-link-input"
              type="url"
              placeholder="https://example.com"
              @input="qrError = ''"
              @keydown.enter.prevent="addQR"
          >
        </label>
        <button
            type="button"
            :disabled="!qrLink.trim()"
            @click="addQR"
        >
          QR Code
        </button>
        <p v-if="qrError" class="field-error">{{ qrError }}</p>
      </div>

      <div class="barcode-panel">
        <label class="control-row">
          <span>Barcode Value</span>
          <input
              v-model="barcodeValue"
              class="barcode-value-input"
              type="text"
              :maxlength="BARCODE_MAX_LENGTH"
              placeholder="ABC-12345"
              autocomplete="off"
              @input="barcodeError = ''"
              @keydown.enter.prevent="addBarcode"
          >
        </label>
        <button
            type="button"
            :disabled="!barcodeValue.trim()"
            @click="addBarcode"
        >
          Barcode
        </button>
        <p v-if="barcodeError" class="field-error">{{ barcodeError }}</p>
      </div>

      <button @click="addRect">Rect</button>
      <button @click="addCircle">Circle</button>
      <button @click="addTriangle">Triangle</button>
      <button @click="addRightTriangle">Right Triangle</button>
      <button @click="addPolygon">Polygon</button>
      <button @click="addChart">Graph</button>
      <button @click="addPieChart">Pie Chart</button>
      <button @click="addLine">Line</button>
      <button @click="addArrow">Arrow</button>
      <button @click="addLabel">Label</button>
      <button @click="addTable">Table</button>
      <button
          class="export-pdf-button"
          type="button"
          :disabled="isPdfExporting"
          @click="exportCurrentLayoutAsPdf"
      >
        {{ isPdfExporting ? 'Exporting PDF...' : 'Export to PDF' }}
      </button>
      <p v-if="pdfExportError" class="field-error">{{ pdfExportError }}</p>
      <button
          class="export-layout-button"
          type="button"
          @click="exportLayoutWithImagesAsJson"
      >
        Export With Images
      </button>
      <button
          class="export-layout-button"
          type="button"
          @click="exportLayoutWithImageUrlsAsJson"
      >
        Save Image URL Layout
      </button>
      <label
          class="file-upload-button import-layout-button"
          :class="{ 'is-disabled': isImportingLayout }"
      >
        {{ isImportingLayout ? 'Importing...' : 'Import JSON' }}
        <input
            type="file"
            accept="application/json,.json"
            :disabled="isImportingLayout"
            @change="importLayoutFile"
        >
      </label>
      <p v-if="layoutImportError" class="field-error">{{ layoutImportError }}</p>
      <p v-if="layoutImportMessage" class="field-success">{{ layoutImportMessage }}</p>
      <button
          class="clear-canvas-button"
          type="button"
          :disabled="!hasCanvasElements"
          @click="clearCanvas"
      >
        Clear Canvas
      </button>
      <p class="toolbar-hint">
        Double-click text to edit it. Press Ctrl+Enter or use Done to finish.
      </p>

      <div class="image-editor-panel layer-list-panel">
        <div class="panel-title">Layers</div>

        <div
            v-if="layerSidebarItems.length"
            class="layer-list"
            aria-label="Canvas layers"
        >
          <div
              v-for="entry in layerSidebarItems"
              :key="entry.item.id"
              class="layer-list-item"
              :class="{
                active: selectedIds.includes(entry.item.id),
                dragging: String(draggedLayerId) === String(entry.item.id),
                'drag-over': String(dragOverLayerId) === String(entry.item.id)
              }"
              draggable="true"
              role="button"
              tabindex="0"
              @click="selectLayerSidebarItem(entry.item)"
              @contextmenu="handleLayerContextMenu($event, entry.item)"
              @keydown.enter.prevent="selectLayerSidebarItem(entry.item)"
              @keydown.space.prevent="selectLayerSidebarItem(entry.item)"
              @dragstart="handleLayerDragStart($event, entry.item)"
              @dragover="handleLayerDragOver($event, entry.item)"
              @dragleave="handleLayerDragLeave(entry.item)"
              @drop="handleLayerDrop($event, entry)"
              @dragend="handleLayerDragEnd"
          >
            <span class="layer-list-title">{{ entry.title }}</span>
            <span class="layer-list-meta">Layer {{ entry.layerIndex + 1 }}</span>
          </div>
        </div>

        <p v-else class="empty-layer-list">No elements yet</p>
      </div>

      <div v-if="canAlignSelected || selectedGroup" class="image-editor-panel">
        <div class="panel-title">{{ selectedGroup ? 'Group' : 'Selection' }}</div>

        <div v-if="canGroupSelected || selectedGroup" class="selection-button-grid">
          <button
              v-if="canGroupSelected"
              type="button"
              @click="groupSelectedElements"
          >
            Group
          </button>
          <button
              v-if="selectedGroup"
              type="button"
              @click="ungroupSelectedGroup"
          >
            Ungroup
          </button>
        </div>

        <div v-if="canAlignSelected" class="alignment-controls">
          <span>Horizontal</span>
          <div class="alignment-button-grid">
            <button type="button" @click="alignSelectedElements('x', 'start')">Left</button>
            <button type="button" @click="alignSelectedElements('x', 'center')">Center</button>
            <button type="button" @click="alignSelectedElements('x', 'end')">Right</button>
          </div>

          <span>Vertical</span>
          <div class="alignment-button-grid">
            <button type="button" @click="alignSelectedElements('y', 'start')">Top</button>
            <button type="button" @click="alignSelectedElements('y', 'center')">Middle</button>
            <button type="button" @click="alignSelectedElements('y', 'end')">Bottom</button>
          </div>
        </div>

        <div class="layer-readout">
          {{ selectedGroup ? `${selectedGroup.children.length} elements` : `${selectedItems.length} selected` }}
        </div>
      </div>

      <div v-if="selectedItem && selectedLayerIndex >= 0" class="image-editor-panel">
        <div class="panel-title">Layer</div>

        <div class="layer-button-grid">
          <button type="button" :disabled="!canMoveSelectedBackward" @click="moveSelectedLayerBackward">
            Backward
          </button>
          <button type="button" :disabled="!canMoveSelectedForward" @click="moveSelectedLayerForward">
            Forward
          </button>
          <button type="button" :disabled="!canMoveSelectedBackward" @click="moveSelectedLayerToBack">
            Bottom
          </button>
          <button type="button" :disabled="!canMoveSelectedForward" @click="moveSelectedLayerToFront">
            Top
          </button>
        </div>

        <div class="layer-readout">
          Layer {{ selectedLayerIndex + 1 }} of {{ canvasItems.length }}
        </div>
      </div>

      <div v-if="selectedItem && selectedElementDimensions" class="image-editor-panel dimension-panel">
        <div class="panel-title">Dimensions</div>

        <div class="dimension-readout">
          <span>Pixels</span>
          <strong>{{ selectedElementDimensions.px }}</strong>
          <span>Centimeters</span>
          <strong>{{ selectedElementDimensions.cm }}</strong>
          <span>Inches</span>
          <strong>{{ selectedElementDimensions.in }}</strong>
        </div>

        <div v-if="canEditElementDimensions(selectedItem)" class="dimension-input-grid">
          <label>
            <span>Width (px)</span>
            <input
                :value="getEditableElementDimensionValue(selectedItem, 'width')"
                type="number"
                min="1"
                step="1"
                @input="setEditableElementDimension(selectedItem, 'width', $event.target.value)"
            >
          </label>
          <label>
            <span>Height (px)</span>
            <input
                :value="getEditableElementDimensionValue(selectedItem, 'height')"
                type="number"
                min="1"
                step="1"
                @input="setEditableElementDimension(selectedItem, 'height', $event.target.value)"
            >
          </label>
        </div>
      </div>

      <div v-if="selectedText" class="image-editor-panel">
        <div class="panel-title">Text Settings</div>

        <label class="control-row">
          <span>Font Size</span>
          <input
              :value="selectedText.fontSize || 20"
              type="range"
              min="8"
              max="144"
              step="1"
              @input="setTextFontSize(selectedText, $event.target.value)"
          >
          <input
              :value="selectedText.fontSize || 20"
              class="number-input"
              type="number"
              min="8"
              max="144"
              step="1"
              @input="setTextFontSize(selectedText, $event.target.value)"
          >
        </label>

        <label class="control-row">
          <span>Letter Spacing</span>
          <input
              :value="selectedText.letterSpacing ?? 0"
              type="range"
              min="-10"
              max="40"
              step="0.5"
              @input="setTextLetterSpacing(selectedText, $event.target.value)"
          >
          <input
              :value="selectedText.letterSpacing ?? 0"
              class="number-input"
              type="number"
              min="-10"
              max="40"
              step="0.5"
              @input="setTextLetterSpacing(selectedText, $event.target.value)"
          >
        </label>

        <label class="control-row">
          <span>Line Height</span>
          <input
              :value="selectedText.lineHeight ?? 1.35"
              type="range"
              min="0.8"
              max="3"
              step="0.05"
              @input="setTextLineHeight(selectedText, $event.target.value)"
          >
          <input
              :value="selectedText.lineHeight ?? 1.35"
              class="number-input"
              type="number"
              min="0.8"
              max="3"
              step="0.05"
              @input="setTextLineHeight(selectedText, $event.target.value)"
          >
        </label>

        <div class="chart-color-grid">
          <label>
            <span>Border</span>
            <input v-model="selectedText.borderColor" type="color">
          </label>
        </div>

        <label class="control-row">
          <span>Border Width</span>
          <input v-model.number="selectedText.borderWidth" type="range" min="0" max="24" step="1">
          <input v-model.number="selectedText.borderWidth" class="number-input" type="number" min="0" max="24" step="1">
        </label>

        <label class="control-row">
          <span>Border Style</span>
          <select v-model="selectedText.borderStyle" class="control-select">
            <option
                v-for="option in borderStyleOptions"
                :key="option.value"
                :value="option.value"
            >
              {{ option.label }}
            </option>
          </select>
        </label>

        <div class="selection-button-grid">
          <button type="button" @click="toggleTextCase(selectedText)">Toggle Case</button>
        </div>
      </div>

      <div v-if="selectedLabel" class="image-editor-panel">
        <div class="panel-title">Label Settings</div>

        <label class="control-row">
          <span>Text</span>
          <input
              v-model="selectedLabel.text"
              class="chart-text-input"
              type="text"
          >
        </label>

        <label class="control-row">
          <span>Font</span>
          <select v-model="selectedLabel.textConfig.fontFamily" class="control-select">
            <option
                v-for="font in fontOptions"
                :key="font.value"
                :value="font.value"
            >
              {{ font.label }}
            </option>
          </select>
        </label>

        <label class="control-row">
          <span>Font Size</span>
          <input
              :value="selectedLabel.textConfig.fontSize"
              type="range"
              min="8"
              max="144"
              step="1"
              @input="setLabelFontSize(selectedLabel, $event.target.value)"
          >
          <input
              :value="selectedLabel.textConfig.fontSize"
              class="number-input"
              type="number"
              min="8"
              max="144"
              step="1"
              @input="setLabelFontSize(selectedLabel, $event.target.value)"
          >
        </label>

        <div class="chart-color-grid">
          <label>
            <span>Text</span>
            <input v-model="selectedLabel.textConfig.fill" type="color">
          </label>
          <label>
            <span>Background</span>
            <input v-model="selectedLabel.tag.fill" type="color">
          </label>
          <label>
            <span>Border</span>
            <input v-model="selectedLabel.borderColor" type="color">
          </label>
        </div>

        <label class="control-row">
          <span>Border Width</span>
          <input v-model.number="selectedLabel.borderWidth" type="range" min="0" max="24" step="1">
          <input v-model.number="selectedLabel.borderWidth" class="number-input" type="number" min="0" max="24" step="1">
        </label>

        <label class="control-row">
          <span>Border Style</span>
          <select v-model="selectedLabel.borderStyle" class="control-select">
            <option
                v-for="option in borderStyleOptions"
                :key="option.value"
                :value="option.value"
            >
              {{ option.label }}
            </option>
          </select>
        </label>

        <label class="control-row">
          <span>Opacity</span>
          <input v-model.number="selectedLabel.opacity" type="range" min="0" max="1" step="0.05">
          <input v-model.number="selectedLabel.opacity" class="number-input" type="number" min="0" max="1" step="0.05">
        </label>
      </div>

      <div v-if="selectedShape" class="image-editor-panel">
        <div class="panel-title">{{ getShapePanelTitle(selectedShape) }}</div>

        <div class="chart-color-grid">
          <label>
            <span>Border</span>
            <input v-model="selectedShape.stroke" type="color">
          </label>
          <label v-if="canShapeHaveFill(selectedShape)">
            <span>Fill</span>
            <input v-model="selectedShape.fill" type="color">
          </label>
        </div>

        <label class="control-row">
          <span>Border Width</span>
          <input
              v-model.number="selectedShape.strokeWidth"
              type="range"
              :min="getShapeStrokeWidthMin(selectedShape)"
              max="24"
              step="1"
          >
          <input
              v-model.number="selectedShape.strokeWidth"
              class="number-input"
              type="number"
              :min="getShapeStrokeWidthMin(selectedShape)"
              max="24"
              step="1"
          >
        </label>

        <label class="control-row">
          <span>Border Style</span>
          <select v-model="selectedShape.borderStyle" class="control-select">
            <option
                v-for="option in borderStyleOptions"
                :key="option.value"
                :value="option.value"
            >
              {{ option.label }}
            </option>
          </select>
        </label>

        <div v-if="canShapeHaveCornerRadius(selectedShape)" class="control-row">
          <span>Border Radius</span>
          <div class="corner-radius-grid">
            <label
                v-for="field in cornerRadiusFields"
                :key="field.index"
            >
              <span>{{ field.label }}</span>
              <input
                  :value="getCornerRadiusValue(selectedShape, field.index)"
                  type="number"
                  min="0"
                  :max="getShapeCornerRadiusMax(selectedShape)"
                  step="1"
                  @input="setCornerRadiusValue(selectedShape, field.index, $event.target.value)"
              >
            </label>
          </div>
        </div>

        <label class="control-row">
          <span>Opacity</span>
          <input v-model.number="selectedShape.opacity" type="range" min="0" max="1" step="0.05">
          <input v-model.number="selectedShape.opacity" class="number-input" type="number" min="0" max="1" step="0.05">
        </label>
      </div>

      <div v-if="selectedImage" class="image-editor-panel">
        <div class="panel-title">Image Settings</div>

        <div class="control-row">
          <span>Radius</span>
          <div class="corner-radius-grid">
            <label
                v-for="field in cornerRadiusFields"
                :key="field.index"
            >
              <span>{{ field.label }}</span>
              <input
                  :value="getCornerRadiusValue(selectedImage, field.index)"
                  type="number"
                  min="0"
                  :max="getImageCornerRadiusMax(selectedImage)"
                  step="1"
                  @input="setCornerRadiusValue(selectedImage, field.index, $event.target.value)"
              >
            </label>
          </div>
        </div>

        <label class="control-row">
          <span>Opacity</span>
          <input v-model.number="selectedImage.opacity" type="range" min="0" max="1" step="0.05">
          <input v-model.number="selectedImage.opacity" class="number-input" type="number" min="0" max="1" step="0.05">
        </label>

        <div class="chart-color-grid">
          <label>
            <span>Border</span>
            <input v-model="selectedImage.borderColor" type="color">
          </label>
        </div>

        <label class="control-row">
          <span>Border Width</span>
          <input v-model.number="selectedImage.borderWidth" type="range" min="0" max="24" step="1">
          <input v-model.number="selectedImage.borderWidth" class="number-input" type="number" min="0" max="24" step="1">
        </label>

        <label class="control-row">
          <span>Border Style</span>
          <select v-model="selectedImage.borderStyle" class="control-select">
            <option
                v-for="option in borderStyleOptions"
                :key="option.value"
                :value="option.value"
            >
              {{ option.label }}
            </option>
          </select>
        </label>

        <div class="control-row">
          <span>Object Fit</span>
          <div class="segmented-control">
            <button
                type="button"
                :class="{ active: selectedImage.objectFit === 'cover' }"
                @click="setImageObjectFit(selectedImage, 'cover')"
            >
              Cover
            </button>
            <button
                type="button"
                :class="{ active: selectedImage.objectFit === 'contain' }"
                @click="setImageObjectFit(selectedImage, 'contain')"
            >
              Contain
            </button>
          </div>
        </div>

        <div class="crop-controls">
          <div class="crop-header">
            <span>Crop</span>
            <button type="button" @click="resetImageCrop(selectedImage)">Reset</button>
          </div>

          <label><span>Left</span><input v-model.number="selectedImage.cropLeft" type="range" min="0" max="95" step="1"></label>
          <label><span>Right</span><input v-model.number="selectedImage.cropRight" type="range" min="0" max="95" step="1"></label>
          <label><span>Top</span><input v-model.number="selectedImage.cropTop" type="range" min="0" max="95" step="1"></label>
          <label><span>Bottom</span><input v-model.number="selectedImage.cropBottom" type="range" min="0" max="95" step="1"></label>
        </div>
      </div>

      <div v-if="selectedChart" class="image-editor-panel">
        <div class="panel-title">Graph Settings</div>

        <label class="control-row">
          <span>Title</span>
          <input v-model="selectedChart.chartTitle" class="chart-text-input" type="text" placeholder="Graph title">
        </label>

        <label class="control-row">
          <span>X Label</span>
          <input v-model="selectedChart.xAxisLabel" class="chart-text-input" type="text" placeholder="X axis">
        </label>

        <label class="control-row">
          <span>Y Label</span>
          <input v-model="selectedChart.yAxisLabel" class="chart-text-input" type="text" placeholder="Y axis">
        </label>

        <div class="control-row">
          <span>Type</span>
          <div class="segmented-control">
            <button
                type="button"
                :class="{ active: selectedChart.chartType === 'line' }"
                @click="setChartType(selectedChart, 'line')"
            >
              Line
            </button>
            <button
                type="button"
                :class="{ active: selectedChart.chartType === 'polygon' }"
                @click="setChartType(selectedChart, 'polygon')"
            >
              Polygon
            </button>
          </div>
        </div>

        <label class="control-row">
          <span>X Values</span>
          <textarea v-model="selectedChart.xAxisValues" class="chart-data-input" rows="2" placeholder="0, 1, 2, 3" />
        </label>

        <label class="control-row">
          <span>Y Values</span>
          <textarea v-model="selectedChart.yAxisValues" class="chart-data-input" rows="2" placeholder="12, 48, 32, 76" />
        </label>

        <div class="chart-color-grid">
          <label><span>Line</span><input v-model="selectedChart.stroke" type="color"></label>
          <label><span>Fill</span><input v-model="selectedChart.fill" type="color"></label>
          <label><span>Border</span><input v-model="selectedChart.borderColor" type="color"></label>
        </div>

        <label class="control-row">
          <span>Stroke</span>
          <input v-model.number="selectedChart.strokeWidth" type="range" min="1" max="12" step="1">
        </label>

        <label class="control-row">
          <span>Border Width</span>
          <input v-model.number="selectedChart.borderWidth" type="range" min="0" max="24" step="1">
          <input v-model.number="selectedChart.borderWidth" class="number-input" type="number" min="0" max="24" step="1">
        </label>

        <label class="control-row">
          <span>Border Style</span>
          <select v-model="selectedChart.borderStyle" class="control-select">
            <option
                v-for="option in borderStyleOptions"
                :key="option.value"
                :value="option.value"
            >
              {{ option.label }}
            </option>
          </select>
        </label>

        <label class="control-row">
          <span>Fill Opacity</span>
          <input v-model.number="selectedChart.fillOpacity" type="range" min="0" max="1" step="0.05">
        </label>

        <label class="control-row">
          <span>Point Radius</span>
          <input v-model.number="selectedChart.pointRadius" type="range" min="0" max="10" step="1">
        </label>

        <label class="checkbox-control">
          <input v-model="selectedChart.showGrid" type="checkbox">
          <span>Show grid</span>
        </label>

        <label class="checkbox-control">
          <input v-model="selectedChart.showPoints" type="checkbox">
          <span>Show points</span>
        </label>
      </div>

      <div v-if="selectedPieChart" class="image-editor-panel">
        <div class="panel-title">Pie Chart Settings</div>

        <label class="control-row">
          <span>Title</span>
          <input v-model="selectedPieChart.chartTitle" class="chart-text-input" type="text" placeholder="Pie chart title">
        </label>

        <label class="checkbox-control">
          <input v-model="selectedPieChart.showLabels" type="checkbox">
          <span>Show labels</span>
        </label>

        <label class="control-row">
          <span>Data (%)</span>
          <textarea
              v-model="selectedPieChart.pieData"
              class="chart-data-input"
              rows="5"
              placeholder="Design, 45&#10;Development, 30&#10;Testing, 25"
          />
        </label>

        <div class="pie-slice-color-list">
          <label
              v-for="slice in getPieChartEntries(selectedPieChart)"
              :key="slice.index"
              class="pie-slice-color-row"
          >
            <span>{{ slice.label }}</span>
            <input
                :value="getPieChartSliceColor(selectedPieChart, slice.index)"
                type="color"
                @input="setPieChartSliceColor(selectedPieChart, slice.index, $event.target.value)"
            >
          </label>
        </div>

        <p v-if="!getPieChartEntries(selectedPieChart).length" class="empty-layer-list">
          Add rows as Name, Value
        </p>
      </div>
    </div>

    <div class="canvas-area">
      <div
          class="stage-shell"
          :class="{ 'stage-shell--dragging': isImageDragActive }"
          :style="stageShellStyle"
          @dragenter="handleImageDragEnter"
          @dragover="handleImageDragOver"
          @dragleave="handleImageDragLeave"
          @drop="handleImageDrop"
      >
        <v-stage
            ref="stageRef"
            :config="stageConfig"
            @mousedown="handleStagePointerDown"
            @mousemove="handleStagePointerMove"
            @contextmenu="handleStageContextMenu"
        >
          <v-layer>
            <v-rect :config="pageConfig" />
            <v-rect :config="pageMarginGuideConfig" />
            <v-group :config="pageClipConfig">
              <CanvasItem
                  v-for="item in canvasItems"
                  :key="item.id"
                  :item="item"
                  :editing-id="editingId"
                  :shape-types="shapeTypes"
                  :regular-polygon-shape-types="regularPolygonShapeTypes"
                  :set-ref="setRef"
                  :get-group-config="getGroupConfig"
                  :get-group-hit-area-config="getGroupHitAreaConfig"
                  :get-grouped-rich-text-image-config="getGroupedRichTextImageConfig"
                  :get-grouped-text-border-config="getGroupedTextBorderConfig"
                  :get-grouped-text-config="getGroupedTextConfig"
                  :get-grouped-image-box-config="getGroupedImageBoxConfig"
                  :get-grouped-image-content-config="getGroupedImageContentConfig"
                  :get-grouped-image-border-config="getGroupedImageBorderConfig"
                  :get-grouped-rect-config="getGroupedRectConfig"
                  :get-grouped-child-config="getGroupedChildConfig"
                  :get-grouped-chart-box-config="getGroupedChartBoxConfig"
                  :get-grouped-chart-border-config="getGroupedChartBorderConfig"
                  :get-grouped-pie-chart-box-config="getGroupedPieChartBoxConfig"
                  :get-grouped-shape-text-image-config="getGroupedShapeTextImageConfig"
                  :get-rich-text-image-config="getRichTextImageConfig"
                  :get-text-config="getTextConfig"
                  :get-text-border-config="getTextBorderConfig"
                  :get-image-box-config="getImageBoxConfig"
                  :get-image-hit-area-config="getImageHitAreaConfig"
                  :get-image-content-config="getImageContentConfig"
                  :get-image-border-config="getImageBorderConfig"
                  :get-label-config="getLabelConfig"
                  :get-label-tag-config="getLabelTagConfig"
                  :get-label-text-config="getLabelTextConfig"
                  :get-rect-config="getRectConfig"
                  :get-circle-config="getCircleConfig"
                  :get-regular-polygon-config="getRegularPolygonConfig"
                  :get-right-triangle-config="getRightTriangleConfig"
                  :get-line-config="getLineConfig"
                  :get-arrow-config="getArrowConfig"
                  :get-chart-box-config="getChartBoxConfig"
                  :get-chart-hit-area-config="getChartHitAreaConfig"
                  :get-chart-border-config="getChartBorderConfig"
                  :get-chart-title-config="getChartTitleConfig"
                  :get-chart-x-axis-label-config="getChartXAxisLabelConfig"
                  :get-chart-y-axis-label-config="getChartYAxisLabelConfig"
                  :get-chart-frame-config="getChartFrameConfig"
                  :get-chart-grid-lines="getChartGridLines"
                  :get-chart-grid-line-config="getChartGridLineConfig"
                  :get-chart-axis-value-label-configs="getChartAxisValueLabelConfigs"
                  :get-chart-area-config="getChartAreaConfig"
                  :get-chart-line-config="getChartLineConfig"
                  :get-chart-point-configs="getChartPointConfigs"
                  :get-pie-chart-box-config="getPieChartBoxConfig"
                  :get-pie-chart-background-config="getPieChartBackgroundConfig"
                  :get-pie-chart-title-config="getPieChartTitleConfig"
                  :get-pie-chart-slice-configs="getPieChartSliceConfigs"
                  :get-pie-chart-label-configs="getPieChartLabelConfigs"
                  :get-shape-text-image-config="getShapeTextImageConfig"
                  @selectable-pointer-down="handleSelectablePointerDown"
                  @selectable-click="stopSelectableClick"
                  @selectable-context-menu="handleSelectableContextMenu"
                  @text-edit="startTextEditing"
                  @shape-text-edit="startShapeTextEditing"
                  @position-update="updatePosition"
                  @position-drag="updatePositionDuringDrag"
                  @transform-update="updateTransform"
              />

              <template v-for="item in tableItems" :key="item.id">
                <v-rect v-if="item.type === 'rect'" :config="item" />
                <v-text v-if="item.type === 'text'" :config="item" />
              </template>
            </v-group>

            <v-transformer
                ref="transformerRef"
                :config="transformerConfig"
            />
          </v-layer>
        </v-stage>

        <div
            v-if="contextMenu.visible && contextMenu.positionMode !== 'viewport'"
            class="canvas-context-menu"
            :class="`canvas-context-menu--${contextMenu.type}`"
            :style="contextMenuStyle"
            @mousedown="handleContextMenuMouseDown"
            @contextmenu.prevent
        >
          <template v-if="contextMenu.type === 'element'">
            <button type="button" @click="copyContextMenuElement">Copy</button>
            <button type="button" @click="deleteContextMenuElement">Delete</button>
          </template>
          <button
              v-else
              type="button"
              :disabled="!canPasteCopiedItems"
              @click="pasteContextMenuItems"
          >
            Paste
          </button>
        </div>

        <div
            v-if="editingItem && editor"
            class="rich-text-editor"
            :style="richEditorStyle"
            @mousedown.stop
        >
          <div class="rich-text-toolbar">
            <div class="toolbar-group">
              <select
                  :value="getCurrentTextFontFamily()"
                  title="Font"
                  @change="applyTextStyle({ fontFamily: $event.target.value })"
              >
                <option
                    v-for="font in fontOptions"
                    :key="font.value"
                    :value="font.value"
                >
                  {{ font.label }}
                </option>
              </select>
            </div>

            <div class="toolbar-group font-size-toolbar-group">
              <label title="Font size">
                <span>Size</span>
                <input
                    :value="getCurrentTextFontSize()"
                    type="number"
                    min="8"
                    max="144"
                    step="1"
                    @change="applyRichTextFontSize($event.target.value)"
                    @keydown.enter.prevent="applyRichTextFontSize($event.target.value)"
                >
              </label>
              <button
                  type="button"
                  title="Use base font size"
                  @mousedown.prevent="clearTextStyleAttribute('fontSize')"
              >
                Base
              </button>
            </div>

            <div class="toolbar-group">
              <button type="button" :class="{ active: editor.isActive('bold') }" title="Bold" @mousedown.prevent="editor.chain().focus().toggleBold().run()">B</button>
              <button type="button" :class="{ active: editor.isActive('italic') }" title="Italic" @mousedown.prevent="editor.chain().focus().toggleItalic().run()">I</button>
              <button type="button" :class="{ active: editor.isActive('underline') }" title="Underline" @mousedown.prevent="editor.chain().focus().toggleUnderline().run()">U</button>
              <button type="button" :class="{ active: editor.isActive('strike') }" title="Strike" @mousedown.prevent="editor.chain().focus().toggleStrike().run()">S</button>
            </div>

            <div class="toolbar-group">
              <button type="button" :class="{ active: isTextAlignActive('left') }" title="Align left" @mousedown.prevent="setTextAlign('left')">L</button>
              <button type="button" :class="{ active: isTextAlignActive('center') }" title="Align center" @mousedown.prevent="setTextAlign('center')">C</button>
              <button type="button" :class="{ active: isTextAlignActive('right') }" title="Align right" @mousedown.prevent="setTextAlign('right')">R</button>
              <button type="button" :class="{ active: isTextAlignActive('justify') }" title="Justify" @mousedown.prevent="setTextAlign('justify')">J</button>
            </div>

            <div class="toolbar-group color-toolbar-group">
              <label title="Text color">
                <span>Text</span>
                <input :value="getCurrentTextColor()" type="color" @input="applyTextStyle({ color: $event.target.value })">
              </label>
              <label title="Text background">
                <span>Bg</span>
                <input :value="getCurrentTextBackground()" type="color" @input="applyTextStyle({ backgroundColor: $event.target.value })">
              </label>
              <button type="button" title="Clear background" @mousedown.prevent="clearTextStyleAttribute('backgroundColor')">
                No Bg
              </button>
            </div>

            <div class="toolbar-group opacity-toolbar-group">
              <label title="Text opacity">
                <span>Opacity</span>
                <input :value="getCurrentTextOpacity()" type="range" min="0" max="1" step="0.05" @input="applyTextStyle({ opacity: $event.target.value })">
              </label>
            </div>

            <div class="toolbar-group">
              <button type="button" :class="{ active: editor.isActive('bulletList') }" title="Bullet list" @mousedown.prevent="editor.chain().focus().toggleBulletList().run()">List</button>
              <button type="button" :class="{ active: editor.isActive('orderedList') }" title="Numbered list" @mousedown.prevent="editor.chain().focus().toggleOrderedList().run()">1.</button>
            </div>

            <button type="button" title="Clear formatting" @mousedown.prevent="editor.chain().focus().clearNodes().unsetAllMarks().run()">
              Clear
            </button>
            <button type="button" class="done-button" title="Finish editing" @mousedown.prevent="finishTextEditing">
              Done
            </button>
          </div>

          <EditorContent :editor="editor" />
        </div>
      </div>
    </div>

    <div
        v-if="contextMenu.visible && contextMenu.positionMode === 'viewport'"
        class="canvas-context-menu"
        :class="`canvas-context-menu--${contextMenu.type}`"
        :style="contextMenuStyle"
        @mousedown="handleContextMenuMouseDown"
        @contextmenu.prevent
    >
      <button type="button" @click="copyContextMenuElement">Copy</button>
      <button type="button" @click="deleteContextMenuElement">Delete</button>
    </div>
  </div>
</template>

<style src="./App.css"></style>
