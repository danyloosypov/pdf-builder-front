<template>
  <div class="expression-help">
    <p>
      Use JSON field paths from the current data context, string/number literals,
      and nested scalar functions. Leading <code>=</code> or <code v-pre>{{ }}</code>
      wrappers are optional.
    </p>

    <code class="expression-example">
      CONCAT(UPPER(TRIM(customer.name)), " / ", ROUND(price, 2))
    </code>

    <div class="expression-function-groups" aria-label="Available scalar functions">
      <div>
        <strong>Strings</strong>
        <span>UPPER, LOWER, TRIM, CONCAT, SUBSTRING, LENGTH</span>
      </div>
      <div>
        <strong>Numbers</strong>
        <span>ROUND, FLOOR, CEIL, ABS</span>
      </div>
      <div>
        <strong>Dates</strong>
        <span>FORMAT_DATE, YEAR, MONTH, DAY, DATE_DIFF</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.expression-help {
  display: grid;
  gap: 7px;
  color: #475569;
  font-size: 11px;
  line-height: 1.35;
}

.expression-help p {
  margin: 0;
}

.expression-help code {
  color: #0f172a;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace;
  font-size: 10px;
}

.expression-example {
  display: block;
  padding: 6px;
  overflow-wrap: anywhere;
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 4px;
}

.expression-function-groups {
  display: grid;
  gap: 5px;
}

.expression-function-groups div {
  display: grid;
  grid-template-columns: 58px 1fr;
  gap: 6px;
  align-items: start;
}

.expression-function-groups strong {
  color: #334155;
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
}

.expression-function-groups span {
  overflow-wrap: anywhere;
}
</style>
