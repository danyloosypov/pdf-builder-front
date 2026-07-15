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

        <div class="grid-settings">
          <div class="panel-subtitle">Grid</div>

          <label class="checkbox-control">
            <input v-model="canvasGridVisible" type="checkbox">
            <span>Show grid</span>
          </label>

          <label class="checkbox-control">
            <input v-model="canvasSnapToGrid" type="checkbox">
            <span>Snap to grid</span>
          </label>

          <label class="control-row">
            <span>Size (px)</span>
            <input
                v-model.number="canvasGridSize"
                class="number-input"
                type="number"
                :min="MIN_PAGE_GRID_SIZE"
                :max="MAX_PAGE_GRID_SIZE"
                step="1"
            >
          </label>
        </div>

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

        <label class="control-row">
          <span>Columns</span>
          <input
              v-model.number="pageColumnCount"
              class="number-input"
              type="number"
              min="1"
              max="12"
              step="1"
          >
        </label>

        <label class="checkbox-control">
          <input v-model="applyPageColumnsToAllPages" type="checkbox">
          <span>Apply to all pages</span>
        </label>

        <div v-if="pageColumnCount > 1" class="page-size-grid">
          <label>
            <span>Gap ({{ pageUnit }})</span>
            <input
                v-model.number="pageColumnGap"
                type="number"
                min="0"
                :max="pageColumnGapMax"
                :step="pageMarginStep"
            >
          </label>
          <label>
            <span>Width ({{ pageUnit }})</span>
            <input
                v-model.number="pageColumnWidth"
                type="number"
                :min="pageColumnWidthMin"
                :max="pageColumnWidthMax"
                :step="pageMarginStep"
            >
          </label>
        </div>

        <div class="page-size-readout">
          <span>{{ pageColumnSummary }}</span>
        </div>
      </div>

      <div class="page-list-panel">
        <div class="panel-title">Pages</div>

        <div class="page-list" aria-label="Document pages">
          <button
              v-for="(page, index) in pages"
              :key="page.id"
              type="button"
              :class="{ active: page.id === activePageId }"
              @click="selectPage(page.id)"
          >
            <span>{{ getPageTitle(page, index) }}</span>
            <small>
              {{ page.orientation === 'landscape' ? 'Landscape' : 'Portrait' }}
              / {{ getCanvasPageColumnCount(page) }} col
              / {{ page.elements.length }} item{{ page.elements.length === 1 ? '' : 's' }}
            </small>
          </button>
        </div>

        <label class="control-row page-name-row">
          <span>Name</span>
          <input
              :value="activePageName"
              type="text"
              @input="renamePage(activePageId, $event.target.value)"
          >
        </label>

        <div class="page-button-grid">
          <button type="button" @click="addPage">Add</button>
          <button type="button" @click="duplicatePage()">Duplicate</button>
          <button
              type="button"
              :disabled="!hasMultiplePages && !hasCanvasElements"
              @click="deletePage()"
          >
            {{ hasMultiplePages ? 'Delete' : 'Clear' }}
          </button>
        </div>

        <div class="page-number-settings">
          <label class="checkbox-control">
            <span>Page numbers</span>
            <input v-model="pageNumberSettings.enabled" type="checkbox">
          </label>

          <label class="control-row">
            <span>Position</span>
            <select
                v-model="pageNumberSettings.position"
                class="control-select"
                :disabled="!pageNumberSettings.enabled"
            >
              <option
                  v-for="option in pageNumberPositionOptions"
                  :key="option.value"
                  :value="option.value"
              >
                {{ option.label }}
              </option>
            </select>
          </label>

          <div class="page-number-style-grid">
            <label>
              <span>Color</span>
              <input
                  v-model="pageNumberSettings.color"
                  type="color"
                  :disabled="!pageNumberSettings.enabled"
              >
            </label>
            <label>
              <span>Size</span>
              <input
                  v-model.number="pageNumberSettings.fontSize"
                  type="number"
                  min="6"
                  max="96"
                  step="1"
                  :disabled="!pageNumberSettings.enabled"
              >
            </label>
          </div>

          <label class="control-row">
            <span>Font</span>
            <select
                v-model="pageNumberSettings.fontFamily"
                class="control-select"
                :disabled="!pageNumberSettings.enabled"
            >
              <option
                  v-for="font in fontOptions"
                  :key="font.value"
                  :value="font.value"
              >
                {{ font.label }}
              </option>
            </select>
          </label>

          <label class="checkbox-control">
            <span>Hide first page</span>
            <input
                v-model="pageNumberSettings.hideFirstPage"
                type="checkbox"
                :disabled="!pageNumberSettings.enabled"
            >
          </label>
        </div>

        <div class="page-watermark-settings">
          <label class="checkbox-control">
            <span>Watermark</span>
            <input v-model="activePageWatermark.enabled" type="checkbox">
          </label>

          <label class="checkbox-control">
            <span>Apply to all pages</span>
            <input v-model="applyPageWatermarkToAllPages" type="checkbox">
          </label>

          <label class="control-row">
            <span>Type</span>
            <select
                v-model="activePageWatermark.type"
                class="control-select"
                :disabled="!activePageWatermark.enabled"
            >
              <option
                  v-for="option in pageWatermarkTypeOptions"
                  :key="option.value"
                  :value="option.value"
              >
                {{ option.label }}
              </option>
            </select>
          </label>

          <label v-if="activePageWatermark.type === 'text'" class="control-row">
            <span>Text</span>
            <input
                v-model="activePageWatermark.text"
                class="chart-text-input"
                type="text"
                :disabled="!activePageWatermark.enabled"
            >
          </label>

          <template v-else>
            <label class="control-row">
              <span>Image URL</span>
              <input
                  v-model.lazy.trim="activePageWatermark.imageUrl"
                  class="chart-text-input"
                  type="text"
                  :disabled="!activePageWatermark.enabled"
              >
            </label>

            <label
                class="file-upload-button watermark-upload-button"
                :class="{ disabled: !activePageWatermark.enabled }"
            >
              Upload image
              <input
                  type="file"
                  accept="image/*"
                  :disabled="!activePageWatermark.enabled"
                  @change="uploadPageWatermarkImage"
              >
            </label>
          </template>

          <div class="page-number-style-grid">
            <label>
              <span>X</span>
              <input
                  v-model.number="activePageWatermark.x"
                  type="number"
                  step="1"
                  :disabled="!activePageWatermark.enabled"
              >
            </label>
            <label>
              <span>Y</span>
              <input
                  v-model.number="activePageWatermark.y"
                  type="number"
                  step="1"
                  :disabled="!activePageWatermark.enabled"
              >
            </label>
          </div>

          <div class="page-number-style-grid">
            <label>
              <span>Width</span>
              <input
                  v-model.number="activePageWatermark.width"
                  type="number"
                  min="8"
                  step="1"
                  :disabled="!activePageWatermark.enabled"
              >
            </label>
            <label>
              <span>Height</span>
              <input
                  v-model.number="activePageWatermark.height"
                  type="number"
                  min="8"
                  step="1"
                  :disabled="!activePageWatermark.enabled"
              >
            </label>
          </div>

          <div class="page-number-style-grid">
            <label>
              <span>Rotate</span>
              <input
                  v-model.number="activePageWatermark.rotation"
                  type="number"
                  min="-360"
                  max="360"
                  step="1"
                  :disabled="!activePageWatermark.enabled"
              >
            </label>
            <label>
              <span>Opacity</span>
              <input
                  v-model.number="activePageWatermark.opacity"
                  type="number"
                  min="0"
                  max="1"
                  step="0.05"
                  :disabled="!activePageWatermark.enabled"
              >
            </label>
          </div>

          <template v-if="activePageWatermark.type === 'text'">
            <div class="page-number-style-grid">
              <label>
                <span>Color</span>
                <input
                    v-model="activePageWatermark.color"
                    type="color"
                    :disabled="!activePageWatermark.enabled"
                >
              </label>
              <label>
                <span>Size</span>
                <input
                    v-model.number="activePageWatermark.fontSize"
                    type="number"
                    min="6"
                    max="240"
                    step="1"
                    :disabled="!activePageWatermark.enabled"
                >
              </label>
            </div>

            <label class="control-row">
              <span>Font</span>
              <select
                  v-model="activePageWatermark.fontFamily"
                  class="control-select"
                  :disabled="!activePageWatermark.enabled"
              >
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
              <span>Style</span>
              <select
                  v-model="activePageWatermark.fontStyle"
                  class="control-select"
                  :disabled="!activePageWatermark.enabled"
              >
                <option
                    v-for="option in pageWatermarkFontStyleOptions"
                    :key="option.value"
                    :value="option.value"
                >
                  {{ option.label }}
                </option>
              </select>
            </label>
          </template>

          <label class="checkbox-control">
            <span>Repeat</span>
            <input
                v-model="activePageWatermark.repeat"
                type="checkbox"
                :disabled="!activePageWatermark.enabled"
            >
          </label>

          <div v-if="activePageWatermark.repeat" class="page-number-style-grid">
            <label>
              <span>Gap X</span>
              <input
                  v-model.number="activePageWatermark.repeatGapX"
                  type="number"
                  min="0"
                  step="1"
                  :disabled="!activePageWatermark.enabled"
              >
            </label>
            <label>
              <span>Gap Y</span>
              <input
                  v-model.number="activePageWatermark.repeatGapY"
                  type="number"
                  min="0"
                  step="1"
                  :disabled="!activePageWatermark.enabled"
              >
            </label>
          </div>
        </div>
      </div>

      <div class="bands-panel">
        <div class="panel-title">Bands</div>

        <label class="control-row">
          <span>New Band</span>
          <select v-model="newBandType" class="control-select">
            <optgroup
                v-for="group in bandTypeGroups"
                :key="group.id"
                :label="group.label"
            >
              <option
                  v-for="option in getBandTypeOptionsForGroup(group.id)"
                  :key="option.value"
                  :value="option.value"
              >
                {{ option.label }}
              </option>
            </optgroup>
          </select>
        </label>

        <button type="button" class="band-add-button" @click="addBand()">
          Add Band
        </button>

        <div v-if="hasBands" class="band-list">
          <button
              v-for="(band, index) in bands"
              :key="band.id"
              type="button"
              :class="{ active: band.id === activeBandId, disabled: !band.enabled }"
              @click="selectBand(band.id)"
          >
            <span>{{ getBandTitle(band, index) }}</span>
            <small>{{ getBandListMeta(band) }}</small>
          </button>
        </div>
        <p v-else class="empty-layer-list">
          Add a band to define reusable document sections.
        </p>

        <div v-if="activeBand" class="band-settings">
          <label class="checkbox-control">
            <input v-model="activeBand.enabled" type="checkbox">
            <span>Enabled</span>
          </label>

          <label class="control-row">
            <span>Name</span>
            <input v-model.trim="activeBand.name" class="chart-text-input" type="text">
          </label>

          <label class="control-row">
            <span>Type</span>
            <select
                :value="activeBand.type"
                class="control-select"
                @change="setBandType(activeBand, $event.target.value)"
            >
              <optgroup
                  v-for="group in bandTypeGroups"
                  :key="group.id"
                  :label="group.label"
              >
                <option
                    v-for="option in getBandTypeOptionsForGroup(group.id)"
                    :key="option.value"
                    :value="option.value"
                >
                  {{ option.label }}
                </option>
              </optgroup>
            </select>
          </label>

          <label class="control-row">
            <span>Height (px)</span>
            <input
                :value="activeBand.height"
                class="chart-text-input"
                type="number"
                min="12"
                max="2000"
                step="1"
                :disabled="getBandPlacement(activeBand) === 'full'"
                @input="setBandHeight(activeBand, $event.target.value)"
            >
          </label>

          <label class="control-row">
            <span>Data Source</span>
            <input
                v-model.trim="activeBand.dataSource"
                class="chart-text-input"
                type="text"
                placeholder="orders.items"
            >
          </label>

          <label class="control-row">
            <span>Group By</span>
            <input
                v-model.trim="activeBand.groupBy"
                class="chart-text-input"
                type="text"
                placeholder="country.city"
            >
          </label>

          <label class="control-row">
            <span>Parent Band</span>
            <select v-model="activeBand.parentBandId" class="control-select">
              <option value="">None</option>
              <option
                  v-for="band in bands"
                  :key="band.id"
                  :value="band.id"
                  :disabled="band.id === activeBand.id"
              >
                {{ getBandTitle(band) }}
              </option>
            </select>
          </label>

          <div class="band-button-grid">
            <button
                type="button"
                :disabled="bands[0]?.id === activeBand.id"
                @click="moveBand(activeBand.id, -1)"
            >
              Up
            </button>
            <button
                type="button"
                :disabled="bands[bands.length - 1]?.id === activeBand.id"
                @click="moveBand(activeBand.id, 1)"
            >
              Down
            </button>
            <button
                type="button"
                :disabled="!selectedItems.length"
                @click="assignSelectedElementsToActiveBand"
            >
              Assign
            </button>
            <button type="button" class="band-delete-button" @click="deleteBand(activeBand.id)">
              Delete
            </button>
          </div>
        </div>
      </div>

      <div class="element-tabs-panel">
        <div class="panel-title">Элементы</div>

        <div class="element-tab-list" role="tablist" aria-label="Element categories">
          <button
              v-for="tab in sidebarElementTabs"
              :key="tab.id"
              type="button"
              role="tab"
              :class="{ active: activeSidebarElementTab === tab.id }"
              :aria-selected="activeSidebarElementTab === tab.id"
              :tabindex="activeSidebarElementTab === tab.id ? 0 : -1"
              @click="activeSidebarElementTab = tab.id"
          >
            {{ tab.label }}
          </button>
        </div>

        <div class="element-tab-content">
          <div v-if="activeSidebarElementTab === 'text'" class="element-button-grid">
            <button
                type="button"
                draggable="true"
                @click="addText"
                @dragstart="handleSidebarElementDragStart($event, 'text')"
                @dragend="handleSidebarElementDragEnd"
            >
              Text
            </button>
            <button
                type="button"
                draggable="true"
                @click="addLabel"
                @dragstart="handleSidebarElementDragStart($event, 'label')"
                @dragend="handleSidebarElementDragEnd"
            >
              Label
            </button>
          </div>

          <div v-else-if="activeSidebarElementTab === 'shapes'" class="element-button-grid">
            <button
                type="button"
                draggable="true"
                @click="addRect"
                @dragstart="handleSidebarElementDragStart($event, 'rect')"
                @dragend="handleSidebarElementDragEnd"
            >
              Rect
            </button>
            <button
                type="button"
                draggable="true"
                @click="addTriangle"
                @dragstart="handleSidebarElementDragStart($event, 'triangle')"
                @dragend="handleSidebarElementDragEnd"
            >
              Triangle
            </button>
            <button
                type="button"
                draggable="true"
                @click="addCircle"
                @dragstart="handleSidebarElementDragStart($event, 'circle')"
                @dragend="handleSidebarElementDragEnd"
            >
              Circle
            </button>
            <button
                type="button"
                draggable="true"
                @click="addRightTriangle"
                @dragstart="handleSidebarElementDragStart($event, 'rightTriangle')"
                @dragend="handleSidebarElementDragEnd"
            >
              Right Triangle
            </button>
            <button
                type="button"
                draggable="true"
                @click="addArrow"
                @dragstart="handleSidebarElementDragStart($event, 'arrow')"
                @dragend="handleSidebarElementDragEnd"
            >
              Arrow
            </button>
            <button
                type="button"
                draggable="true"
                @click="addLine"
                @dragstart="handleSidebarElementDragStart($event, 'line')"
                @dragend="handleSidebarElementDragEnd"
            >
              Line
            </button>
            <button
                type="button"
                draggable="true"
                @click="addPolygon"
                @dragstart="handleSidebarElementDragStart($event, 'polygon')"
                @dragend="handleSidebarElementDragEnd"
            >
              Polygon
            </button>
          </div>

          <div v-else-if="activeSidebarElementTab === 'charts'" class="element-button-grid">
            <button
                type="button"
                draggable="true"
                @click="addChart"
                @dragstart="handleSidebarElementDragStart($event, 'chart')"
                @dragend="handleSidebarElementDragEnd"
            >
              Graph
            </button>
            <button
                type="button"
                draggable="true"
                @click="addPieChart"
                @dragstart="handleSidebarElementDragStart($event, 'pieChart')"
                @dragend="handleSidebarElementDragEnd"
            >
              Pie Chart
            </button>
          </div>

          <div v-else-if="activeSidebarElementTab === 'images'" class="element-button-grid">
            <label class="file-upload-button element-upload-button">
              Upload Image
              <input type="file" accept="image/*" @change="uploadImage">
            </label>
          </div>

          <div v-else class="element-tab-stack">
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
                  :draggable="!!qrLink.trim()"
                  @click="addQR"
                  @dragstart="handleSidebarElementDragStart($event, 'qr')"
                  @dragend="handleSidebarElementDragEnd"
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
                  :draggable="!!barcodeValue.trim()"
                  @click="addBarcode"
                  @dragstart="handleSidebarElementDragStart($event, 'barcode')"
                  @dragend="handleSidebarElementDragEnd"
              >
                Barcode
              </button>
              <p v-if="barcodeError" class="field-error">{{ barcodeError }}</p>
            </div>

            <div class="table-create-panel">
              <div class="table-create-grid">
                <label>
                  <span>Rows</span>
                  <input
                      :value="tableRowsInput"
                      type="number"
                      min="1"
                      max="30"
                      step="1"
                      @input="setTableRowsInput($event.target.value)"
                  >
                </label>
                <label>
                  <span>Columns</span>
                  <input
                      :value="tableColsInput"
                      type="number"
                      min="1"
                      max="20"
                      step="1"
                      @input="setTableColsInput($event.target.value)"
                  >
                </label>
              </div>
              <button
                  type="button"
                  draggable="true"
                  @click="addTable"
                  @dragstart="handleSidebarElementDragStart($event, 'table')"
                  @dragend="handleSidebarElementDragEnd"
              >
                Add Table
              </button>
            </div>
          </div>
        </div>
      </div>
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
      <button
          class="export-layout-button"
          type="button"
          @click="exportTemplateAsJson"
      >
        Save Template
      </button>
      <label
          class="file-upload-button import-layout-button"
          :class="{ 'is-disabled': isApplyingTemplateValues }"
      >
        {{ isApplyingTemplateValues ? 'Filling...' : 'Fill Template JSON' }}
        <input
            type="file"
            accept="application/json,.json"
            :disabled="isApplyingTemplateValues"
            @change="importTemplateValuesFile"
        >
      </label>
      <p v-if="templateValuesImportError" class="field-error">{{ templateValuesImportError }}</p>
      <p v-if="templateValuesImportMessage" class="field-success">{{ templateValuesImportMessage }}</p>
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

        <label v-if="hasBands" class="control-row">
          <span>Band</span>
          <select
              :value="getElementBandId(selectedItem)"
              class="control-select"
              @change="setSelectedElementsBand($event.target.value)"
          >
            <option value="">None</option>
            <option
                v-for="band in bands"
                :key="band.id"
                :value="band.id"
            >
              {{ getBandTitle(band) }}
            </option>
          </select>
        </label>

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

        <label v-if="canEditElementRotation(selectedItem)" class="rotation-input-row">
          <span>Rotation (deg)</span>
          <input
              :value="getElementRotationValue(selectedItem)"
              type="number"
              min="-180"
              max="180"
              step="1"
              @input="setElementRotation(selectedItem, $event.target.value)"
          >
        </label>
      </div>

      <div v-if="selectedTable" class="image-editor-panel table-settings-panel">
        <div class="panel-title">Table Settings</div>

        <div class="layer-readout">
          {{ selectedTable.rows }} x {{ selectedTable.cols }}
          <span v-if="selectedTableCells.length"> - {{ selectedTableCells.length }} selected</span>
        </div>

        <label class="checkbox-control">
          <input v-model="selectedTable.alternateRowFillEnabled" type="checkbox">
          <span>Alternate row background</span>
        </label>

        <div class="chart-color-grid">
          <label>
            <span>Every other row</span>
            <input
                v-model="selectedTable.alternateRowFill"
                type="color"
                :disabled="!selectedTable.alternateRowFillEnabled"
            >
          </label>
        </div>

        <div v-if="selectedTableCells.length" class="table-cell-settings">
          <label class="control-row">
            <span>Repeat Row</span>
            <input
                :value="getSelectedTableRowRepeatVariable()"
                class="chart-text-input"
                type="text"
                placeholder="items"
                @input="setSelectedTableRowRepeatVariable($event.target.value)"
            >
          </label>

          <label class="control-row">
            <span>Variable</span>
            <input
                :value="getSelectedTableCellStyleValue('templateVariable', '')"
                class="chart-text-input"
                type="text"
                placeholder="name"
                @input="setSelectedTableCellsStyle({ templateVariable: $event.target.value.trim() })"
            >
          </label>

          <div class="chart-color-grid">
            <label>
              <span>Cell</span>
              <input
                  :value="getSelectedTableCellStyleValue('fill', '#ffffff')"
                  type="color"
                  @input="setSelectedTableCellsStyle({ fill: $event.target.value })"
              >
            </label>
            <label>
              <span>Text</span>
              <input
                  :value="getSelectedTableCellStyleValue('textColor', '#111827')"
                  type="color"
                  @input="setSelectedTableCellsStyle({ textColor: $event.target.value })"
              >
            </label>
          </div>

          <div class="control-row">
            <span>Text Align</span>
            <div class="segmented-control">
              <button
                  type="button"
                  :class="{ active: getSelectedTableCellStyleValue('textAlign', 'left') === 'left' }"
                  @click="setSelectedTableCellsStyle({ textAlign: 'left' })"
              >
                Left
              </button>
              <button
                  type="button"
                  :class="{ active: getSelectedTableCellStyleValue('textAlign', 'left') === 'center' }"
                  @click="setSelectedTableCellsStyle({ textAlign: 'center' })"
              >
                Center
              </button>
              <button
                  type="button"
                  :class="{ active: getSelectedTableCellStyleValue('textAlign', 'left') === 'right' }"
                  @click="setSelectedTableCellsStyle({ textAlign: 'right' })"
              >
                Right
              </button>
            </div>
          </div>

          <div class="control-row">
            <span>Vertical Align</span>
            <div class="segmented-control">
              <button
                  type="button"
                  :class="{ active: getSelectedTableCellStyleValue('verticalAlign', 'middle') === 'top' }"
                  @click="setSelectedTableCellsStyle({ verticalAlign: 'top' })"
              >
                Top
              </button>
              <button
                  type="button"
                  :class="{ active: getSelectedTableCellStyleValue('verticalAlign', 'middle') === 'middle' }"
                  @click="setSelectedTableCellsStyle({ verticalAlign: 'middle' })"
              >
                Middle
              </button>
              <button
                  type="button"
                  :class="{ active: getSelectedTableCellStyleValue('verticalAlign', 'middle') === 'bottom' }"
                  @click="setSelectedTableCellsStyle({ verticalAlign: 'bottom' })"
              >
                Bottom
              </button>
            </div>
          </div>

          <div class="control-row">
            <span>Text Direction</span>
            <div class="segmented-control">
              <button
                  type="button"
                  :class="{ active: getSelectedTableCellStyleValue('textOrientation', 'horizontal') === 'horizontal' }"
                  @click="setSelectedTableCellsStyle({ textOrientation: 'horizontal' })"
              >
                Horizontal
              </button>
              <button
                  type="button"
                  :class="{ active: getSelectedTableCellStyleValue('textOrientation', 'horizontal') === 'vertical' }"
                  @click="setSelectedTableCellsStyle({ textOrientation: 'vertical' })"
              >
                Vertical
              </button>
            </div>
          </div>

          <div class="chart-color-grid">
            <label>
              <span>Border</span>
              <input
                  :value="getSelectedTableCellStyleValue('borderColor', '#111827')"
                  type="color"
                  @input="setSelectedTableCellsStyle({ borderColor: $event.target.value })"
              >
            </label>
          </div>

          <label class="control-row">
            <span>Border Width</span>
            <input
                :value="getSelectedTableCellStyleValue('borderWidth', 1)"
                type="range"
                min="0"
                max="24"
                step="1"
                @input="setSelectedTableCellsStyle({ borderWidth: $event.target.value })"
            >
            <input
                :value="getSelectedTableCellStyleValue('borderWidth', 1)"
                class="number-input"
                type="number"
                min="0"
                max="24"
                step="1"
                @input="setSelectedTableCellsStyle({ borderWidth: $event.target.value })"
            >
          </label>

          <label class="control-row">
            <span>Border Style</span>
            <select
                :value="getSelectedTableCellStyleValue('borderStyle', 'solid')"
                class="control-select"
                @change="setSelectedTableCellsStyle({ borderStyle: $event.target.value })"
            >
              <option
                  v-for="option in borderStyleOptions"
                  :key="option.value"
                  :value="option.value"
              >
                {{ option.label }}
              </option>
            </select>
          </label>

          <button
              type="button"
              :disabled="selectedTableCells.length < 2"
              @click="mergeSelectedTableCells"
          >
            Merge Cells
          </button>
        </div>
      </div>

      <div v-if="selectedText" class="image-editor-panel">
        <div class="panel-title">Text Settings</div>

        <label class="control-row">
          <span>Variable</span>
          <input
              v-model.trim="selectedText.templateVariable"
              class="chart-text-input"
              type="text"
              placeholder="customer_name"
          >
        </label>

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
          <span>Variable</span>
          <input
              v-model.trim="selectedLabel.templateVariable"
              class="chart-text-input"
              type="text"
              placeholder="status_label"
          >
        </label>

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

        <label class="control-row">
          <span>Variable</span>
          <input
              v-model.trim="selectedImage.templateVariable"
              class="chart-text-input"
              type="text"
              placeholder="logo_image"
          >
        </label>

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
        <div
            class="canvas-ruler-corner"
            :style="canvasRulerCornerStyle"
            aria-hidden="true"
        >
          {{ rulerUnitLabel }}
        </div>
        <div
            class="canvas-ruler canvas-ruler--horizontal"
            :style="canvasRulerHorizontalStyle"
            aria-hidden="true"
        >
          <span
              v-for="tick in horizontalRulerTicks"
              :key="tick.key"
              class="canvas-ruler-tick"
              :class="{ major: tick.isMajor, mid: tick.isMid }"
              :style="{ left: `${tick.offset}px` }"
          >
            <span v-if="tick.label" class="canvas-ruler-label">{{ tick.label }}</span>
          </span>
        </div>
        <div
            class="canvas-ruler canvas-ruler--vertical"
            :style="canvasRulerVerticalStyle"
            aria-hidden="true"
        >
          <span
              v-for="tick in verticalRulerTicks"
              :key="tick.key"
              class="canvas-ruler-tick"
              :class="{ major: tick.isMajor, mid: tick.isMid }"
              :style="{ top: `${tick.offset}px` }"
          >
            <span v-if="tick.label" class="canvas-ruler-label">{{ tick.label }}</span>
          </span>
        </div>

        <v-stage
            ref="stageRef"
            :config="stageConfig"
            @mousedown="handleStagePointerDown"
            @mousemove="handleStagePointerMove"
            @contextmenu="handleStageContextMenu"
        >
          <v-layer>
            <v-rect :config="pageConfig" />
            <v-line
                v-for="line in pageGridLineConfigs"
                :key="line.id"
                :config="line"
            />
            <v-rect :config="pageMarginGuideConfig" />
            <v-rect
                v-for="guide in pageColumnGuideConfigs"
                :key="guide.id"
                :config="guide"
            />
            <v-group :config="pageClipConfig">
              <v-group
                  v-for="guide in bandGuideConfigs"
                  :key="guide.id"
              >
                <v-rect :config="guide.rect" />
                <v-text :config="guide.label" />
              </v-group>

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
                  :get-visible-table-cells="getVisibleTableCells"
                  :get-table-config="getTableConfig"
                  :get-table-cell-group-config="getTableCellGroupConfig"
                  :get-table-cell-rect-config="getTableCellRectConfig"
                  :get-table-cell-text-config="getTableCellTextConfig"
                  :get-table-cell-selection-config="getTableCellSelectionConfig"
                  :get-table-border-line-configs="getTableBorderLineConfigs"
                  :get-table-resize-handle-configs="getTableResizeHandleConfigs"
                  :get-shape-text-image-config="getShapeTextImageConfig"
                  @selectable-pointer-down="handleSelectablePointerDown"
                  @selectable-click="stopSelectableClick"
                  @selectable-context-menu="handleSelectableContextMenu"
                  @text-edit="startTextEditing"
                  @shape-text-edit="startShapeTextEditing"
                  @table-cell-pointer-down="handleTableCellPointerDown"
                  @table-cell-edit="startTableCellEditing"
                  @table-cell-context-menu="handleTableCellContextMenu"
                  @table-resize-pointer-down="handleTableResizeHandlePointerDown"
                  @table-resize-drag-start="startTableResizeDrag"
                  @table-resize-drag-move="resizeTableFromHandleDrag"
                  @table-resize-drag-end="finishTableResizeDrag"
                  @position-update="updatePosition"
                  @position-drag="updatePositionDuringDrag"
                  @transform-update="updateTransform"
              />

              <template v-for="item in tableItems" :key="item.id">
                <v-rect v-if="item.type === 'rect'" :config="item" />
                <v-text v-if="item.type === 'text'" :config="item" />
              </template>

              <v-text
                  v-if="pageNumberConfig.visible"
                  :config="pageNumberConfig"
              />

              <v-line
                  v-for="handle in bandResizeHandleConfigs"
                  :key="handle.id"
                  :config="handle"
                  @mousedown="handleBandResizePointerDown($event, handle)"
                  @touchstart="handleBandResizePointerDown($event, handle)"
                  @mouseenter="setBandResizeCursor($event)"
                  @mouseleave="clearBandResizeCursor($event)"
                  @dragstart="startBandResizeDrag($event, handle)"
                  @dragmove="resizeBandFromHandleDrag($event, handle)"
                  @dragend="finishBandResizeDrag($event, handle)"
              />
            </v-group>

            <v-transformer
                ref="transformerRef"
                :config="transformerConfig"
            />
          </v-layer>

          <v-layer :config="{ listening: false }">
            <v-group :config="pageClipConfig">
              <v-text
                  v-for="watermark in pageWatermarkTextConfigs"
                  :key="watermark.id"
                  :config="watermark"
              />
              <v-image
                  v-for="watermark in pageWatermarkImageConfigs"
                  :key="watermark.id"
                  :config="watermark"
              />
            </v-group>
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
          <template v-if="contextMenu.type === 'table-cell'">
            <button type="button" @click="addTableRowFromContext">Add Row</button>
            <button type="button" @click="addTableColumnFromContext">Add Column</button>
            <button type="button" @click="deleteTableRowFromContext">Delete Row</button>
            <button type="button" @click="deleteTableColumnFromContext">Delete Column</button>
            <button type="button" @click="splitTableCellVerticallyFromContext">Split Vertical</button>
            <button type="button" @click="splitTableCellHorizontallyFromContext">Split Horizontal</button>
          </template>
          <template v-else-if="contextMenu.type === 'element'">
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

        <textarea
            v-if="editingTableCell && tableCellEditorStyle"
            class="table-cell-editor"
            :style="tableCellEditorStyle"
            :value="tableCellEditorValue"
            @input="handleTableCellEditorInput($event.target.value)"
            @keydown="handleTableCellEditorKeydown"
            @blur="finishTableCellEditing"
            @mousedown.stop
            @contextmenu.stop
        />

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

            <div class="toolbar-group link-toolbar-group">
              <input
                  v-model="linkUrlInput"
                  type="url"
                  placeholder="https://..."
                  title="Link URL"
                  @keydown.enter.prevent="applySelectedTextLink()"
                  @mousedown.stop
              >
              <button
                  type="button"
                  :class="{ active: editor.isActive('link') }"
                  title="Apply link"
                  @mousedown.prevent="applySelectedTextLink()"
              >
                Link
              </button>
              <button
                  type="button"
                  :disabled="!editor.isActive('link')"
                  title="Remove link"
                  @mousedown.prevent="removeSelectedTextLink"
              >
                Unlink
              </button>
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
