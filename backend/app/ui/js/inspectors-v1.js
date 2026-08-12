let inspectorV1ActiveSection = "overview";
let inspectorV1DrawerName = "";
let inspectorV1DrawerExpanded = false;
let inspectorV1DirectoryRows = [];
let inspectorV1DirectoryMetric = "monthly";
let inspectorV1DirectoryControls = [];
let inspectorV1CategoriesExpanded = false;
let inspectorV1ProfileName = "";
let inspectorV1ProfileTypesExpanded = false;
let inspectorV1ProfileControlsExpanded = false;
let inspectorV1ProfileAnalysisTab = "activity";
let inspectorV1ProfileCategoryDomain = "all";
let inspectorV1ProfileStructureTab = "types";
let inspectorV1ProfileFocus = { kind: "all", value: "" };
let inspectorV1ProfileSelectedCategory = "all";

const INSPECTOR_CONTROL_CATEGORY_CATALOG = [
  { domain: "silvic", key: "control_fond", label: "Control de fond" },
  { domain: "silvic", key: "control_partial", label: "Control par\u021bial" },
  { domain: "silvic", key: "instalatii_depozite_materiale_lemnoase", label: "Instala\u021bii / depozite materiale lemnoase" },
  { domain: "silvic", key: "exploatarea_masei_lemnoase", label: "Exploatarea masei lemnoase" },
  { domain: "silvic", key: "control_anual_regenerari", label: "Control anual regener\u0103ri" },
  { domain: "silvic", key: "lucrari_regenerare_impadurire", label: "Lucr\u0103ri regenerare / \u00eemp\u0103durire" },
  { domain: "silvic", key: "verificare_acte_punere_in_valoare", label: "Verificarea actelor de punere \u00een valoare" },
  { domain: "silvic", key: "control_circulatie_materiale_lemnoase", label: "Controlul circula\u021biei materialelor lemnoase" },
  { domain: "cinegetic", key: "control_fond", label: "Control de fond" },
  { domain: "cinegetic", key: "criterii_licentiere", label: "Criterii de licen\u021biere" },
  { domain: "cinegetic", key: "respectare_prevederi_legale_vanatoare", label: "Respectarea prevederilor legale la v\u00e2n\u0103toare" },
  { domain: "cinegetic", key: "populare_repopulare", label: "Populare / repopulare" },
  { domain: "cinegetic", key: "prevenire_combatere_braconaj", label: "Prevenire / combatere braconaj" },
  { domain: "cinegetic", key: "studii_evaluare_teren", label: "Studii de evaluare \u00een teren" },
  { domain: "cinegetic", key: "procese_verbale_pagube", label: "Procese-verbale de pagube" }
].map(item => ({ ...item, id: `${item.domain}/${item.key}` }));

const INSPECTOR_V1_COLORS = ["#0b8f58", "#25c66f", "#ffab1f"];
const INSPECTOR_V1_METRICS = {
  monthly: { label: "Controale / inspector / luna", short: "controale / luna", decimals: 1, risk: false },
  total: { label: "Total controale", short: "controale", decimals: 0, risk: false },
  problemRate: { label: "% controale cu probleme", short: "% probleme", decimals: 1, risk: true },
  petitions: { label: "Controale din sesizari", short: "sesizari", decimals: 0, risk: false },
  nonconform: { label: "Controale neconforme", short: "neconforme", decimals: 0, risk: true },
  thematic: { label: "Controale tematice", short: "tematice", decimals: 0, risk: false },
  operative: { label: "Controale operative", short: "operative", decimals: 0, risk: false }
};

function inspectorV1MetricDefinition(metric) {
  if (INSPECTOR_V1_METRICS[metric]) return INSPECTOR_V1_METRICS[metric];
  if (String(metric).startsWith("type:")) {
    const type = String(metric).slice(5);
    return { label: type.charAt(0).toUpperCase() + type.slice(1), short: type, decimals: 0, risk: false };
  }
  if (String(metric).startsWith("category:")) {
    const category = String(metric).slice(9);
    return { label: category, short: category, decimals: 0, risk: false, neutral: true };
  }
  return INSPECTOR_V1_METRICS.total;
}

function inspectorV1SelectValue(id, fallback = "") {
  const el = q(id);
  return el ? el.value : fallback;
}

function inspectorV1Date(value) {
  const parsed = normalizeInspectorChartDate(value);
  return parsed && !Number.isNaN(parsed.getTime()) ? parsed : null;
}

function inspectorV1Iso(value) {
  const date = inspectorV1Date(value);
  if (!date) return "";
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function inspectorV1RangeForPreset(preset) {
  const dates = (allControls || []).map(getControlDateValue).map(inspectorV1Date).filter(Boolean);
  const dataEnd = dates.length ? new Date(Math.max(...dates.map(item => item.getTime()))) : new Date();
  const today = new Date();
  const end = dataEnd > today ? today : dataEnd;
  const start = new Date(end);
  if (preset === "last30") start.setDate(start.getDate() - 29);
  if (preset === "last90") start.setDate(start.getDate() - 89);
  if (preset === "last180") {
    start.setDate(1);
    start.setMonth(start.getMonth() - 5);
  }
  if (preset === "year") {
    start.setMonth(0, 1);
  }
  if (preset === "all" && dates.length) {
    return {
      from: inspectorV1Iso(new Date(Math.min(...dates.map(item => item.getTime())))),
      to: inspectorV1Iso(end)
    };
  }
  return { from: inspectorV1Iso(start), to: inspectorV1Iso(end) };
}

function inspectorV1SyncPeriod(force = false) {
  const preset = inspectorV1SelectValue("inspectorV1Period", "last180");
  const from = q("inspectorV1DateFrom");
  const to = q("inspectorV1DateTo");
  if (!from || !to || preset === "custom") return;
  if (!force && from.value && to.value) return;
  const range = inspectorV1RangeForPreset(preset);
  from.value = range.from;
  to.value = range.to;
}

function inspectorV1State() {
  inspectorV1SyncPeriod(false);
  return {
    period: inspectorV1SelectValue("inspectorV1Period", "last180"),
    from: inspectorV1SelectValue("inspectorV1DateFrom", ""),
    to: inspectorV1SelectValue("inspectorV1DateTo", ""),
    guard: inspectorV1SelectValue("inspectorV1Guard", "toate"),
    inspector: inspectorV1SelectValue("inspectorV1Inspector", "toate"),
    type: inspectorV1SelectValue("inspectorV1Type", "toate"),
    result: inspectorV1SelectValue("inspectorV1Result", "toate"),
    category: inspectorV1SelectValue("inspectorV1Category", "toate"),
    metric: inspectorV1SelectValue("inspectorV1Metric", "monthly")
  };
}

function inspectorV1FilteredControls(options = {}) {
  const state = inspectorV1State();
  const from = inspectorV1Date(state.from);
  const to = inspectorV1Date(state.to);
  const guardKey = canonicalGuardName(state.guard);
  return (allControls || []).filter(control => {
    const date = inspectorV1Date(getControlDateValue(control));
    if (from && (!date || date < from)) return false;
    if (to && (!date || date > to)) return false;
    if (!options.ignoreGuard && state.guard !== "toate" && canonicalGuardName(control.garda) !== guardKey) return false;
    if (state.type !== "toate" && normalizeText(control.control_type) !== normalizeText(state.type)) return false;
    if (state.result !== "toate" && normalizeText(control.result) !== normalizeText(state.result)) return false;
    if (state.category !== "toate" && normalizeText(getControlCategory(control)) !== normalizeText(state.category)) return false;
    if (!options.ignoreInspector && state.inspector !== "toate") {
      if (!(control.echipa || []).some(member => member && member.nume === state.inspector)) return false;
    }
    return true;
  });
}

function inspectorV1MonthsInRange(controls) {
  const state = inspectorV1State();
  const from = inspectorV1Date(state.from);
  const to = inspectorV1Date(state.to);
  if (from && to) return Math.max(1, (to.getFullYear() - from.getFullYear()) * 12 + to.getMonth() - from.getMonth() + 1);
  return Math.max(1, getPeriodMonths(controls, { dateFrom: state.from, dateTo: state.to }));
}

function inspectorV1MetricValue(item, metric) {
  if (!item) return 0;
  if (metric === "monthly") return Number(item.monthly || 0);
  if (metric === "total") return Number(item.total || 0);
  if (metric === "problemRate") return Number(item.problemRate || 0);
  if (metric === "petitions") return Number(item.petitions || 0);
  if (metric === "thematic") return Number(item.byType?.tematic || item.byType?.Tematic || 0);
  if (metric === "operative") return Number(item.byType?.operativ || item.byType?.Operativ || 0);
  if (String(metric).startsWith("type:")) {
    const type = normalizeText(String(metric).slice(5));
    return Object.entries(item.byType || {}).reduce((sum, [key, value]) => normalizeText(key) === type ? sum + Number(value || 0) : sum, 0);
  }
  if (String(metric).startsWith("category:")) return Number(item.byCategory?.[String(metric).slice(9)] || 0);
  if (String(metric).startsWith("domain:")) {
    const domain = normalizeText(String(metric).slice(7));
    return Object.entries(item.byDomain || {}).reduce((sum, [key, value]) => normalizeText(key) === domain ? sum + Number(value || 0) : sum, 0);
  }
  if (metric === "nonconform") {
    return Object.entries(item.byResult || {}).reduce((sum, entry) => {
      return normalizeText(entry[0]) === "neconform" ? sum + Number(entry[1] || 0) : sum;
    }, 0);
  }
  return Number(item.total || 0);
}

function inspectorV1FormatMetric(value, metric) {
  const definition = inspectorV1MetricDefinition(metric);
  const numeric = Number(value || 0);
  if (metric === "problemRate") return `${numeric.toFixed(1)}%`;
  return numeric.toLocaleString("ro-RO", {
    minimumFractionDigits: definition.decimals,
    maximumFractionDigits: definition.decimals
  });
}

function inspectorV1EnrichStats(stats, controls) {
  Object.values(stats || {}).forEach(item => {
    item.byCategory = {};
    item.byDomain = {};
    item.financialAmount = 0;
    item.financialDataCount = 0;
  });
  (controls || []).forEach(control => {
    const category = getControlCategory(control);
    const domain = getControlDomainRaw(control);
    const fine = getFineAmount(control);
    const damage = getDamageAmount(control);
    (control.echipa || []).forEach(member => {
      const item = stats && stats[member && member.nume];
      if (!item) return;
      if (category) item.byCategory[category] = (item.byCategory[category] || 0) + 1;
      if (domain) item.byDomain[domain] = (item.byDomain[domain] || 0) + 1;
      if (Number.isFinite(fine) && fine > 0) {
        item.financialAmount += fine;
        item.financialDataCount += 1;
      }
      if (Number.isFinite(damage) && damage > 0) {
        item.financialAmount += damage;
        item.financialDataCount += 1;
      }
    });
  });
  return stats;
}

function inspectorV1SetOptions(id, values, placeholder, preferred = "") {
  const select = q(id);
  if (!select) return;
  const current = preferred || select.value;
  const unique = [...new Set((values || []).filter(Boolean))];
  select.innerHTML = `${placeholder ? `<option value="">${escapeHtml(placeholder)}</option>` : ""}${unique.map(value => `<option value="${escapeAttr(value)}">${escapeHtml(value)}</option>`).join("")}`;
  if (unique.includes(current) || (!current && placeholder)) select.value = current;
  else if (unique.length) select.value = unique[0];
}

function inspectorV1PopulateFilters() {
  const guardSelect = q("inspectorV1Guard");
  const currentGuard = guardSelect ? guardSelect.value : "toate";
  const guards = [...new Set((allControls || []).map(item => canonicalGuardName(item.garda)).filter(Boolean))].sort((a, b) => guardDisplayName(a).localeCompare(guardDisplayName(b), "ro"));
  if (guardSelect) {
    guardSelect.innerHTML = `<option value="toate">Toate garzile</option>${guards.map(value => `<option value="${escapeAttr(value)}">${escapeHtml(guardDisplayName(value))}</option>`).join("")}`;
    guardSelect.value = guards.includes(currentGuard) ? currentGuard : "toate";
  }

  const inspectorSelect = q("inspectorV1Inspector");
  const currentInspector = inspectorSelect ? inspectorSelect.value : "toate";
  const eligibleControls = inspectorV1FilteredControls({ ignoreInspector: true });
  const names = [...new Set(eligibleControls.flatMap(control => (control.echipa || []).map(member => member && member.nume)).filter(Boolean))].sort((a, b) => a.localeCompare(b, "ro"));
  if (inspectorSelect) {
    inspectorSelect.innerHTML = `<option value="toate">Toti inspectorii</option>${names.map(name => `<option value="${escapeAttr(name)}">${escapeHtml(name)}</option>`).join("")}`;
    inspectorSelect.value = names.includes(currentInspector) ? currentInspector : "toate";
  }

  const categorySelect = q("inspectorV1Category");
  const currentCategory = categorySelect ? categorySelect.value : "toate";
  const categories = [...new Set((allControls || []).map(getControlCategory).filter(Boolean))].sort((a, b) => a.localeCompare(b, "ro"));
  if (categorySelect) {
    categorySelect.innerHTML = categories.length
      ? `<option value="toate">Toate categoriile</option>${categories.map(value => `<option value="${escapeAttr(value)}">${escapeHtml(value)}</option>`).join("")}`
      : '<option value="toate">Categorii indisponibile in date</option>';
    categorySelect.disabled = !categories.length;
    categorySelect.value = categories.includes(currentCategory) ? currentCategory : "toate";
  }

  const metricSelect = q("inspectorV1Metric");
  if (metricSelect) {
    const currentMetric = metricSelect.value || "monthly";
    metricSelect.querySelectorAll('optgroup[data-dynamic-categories]').forEach(group => group.remove());
    if (categories.length) {
      const group = document.createElement("optgroup");
      group.label = "Categorii control";
      group.dataset.dynamicCategories = "true";
      group.innerHTML = categories.map(value => `<option value="category:${escapeAttr(value)}">${escapeHtml(value)}</option>`).join("");
      metricSelect.appendChild(group);
    }
    if ([...metricSelect.options].some(option => option.value === currentMetric)) metricSelect.value = currentMetric;
  }
  inspectorV1PopulateTemporalPeriods();
}

function inspectorV1PopulateTemporalPeriods() {
  const years = [...new Set((allControls || []).map(control => inspectorV1Date(getControlDateValue(control))?.getFullYear()).filter(Boolean))].sort((a, b) => b - a);
  ["inspectorV1ComparePeriodA", "inspectorV1ComparePeriodB"].forEach(id => {
    const select = q(id);
    if (!select) return;
    const current = select.value || "current";
    select.innerHTML = `<option value="current">Perioada selectata</option>${years.map(year => `<option value="year:${year}">Anul ${year}</option>`).join("")}`;
    select.value = [...select.options].some(option => option.value === current) ? current : "current";
  });
}

function inspectorV1GuardFor(name, controls) {
  const key = getInspectorPrimaryGuard(name, controls || []);
  return key ? guardDisplayName(key) : "Garda neprecizata";
}

function inspectorV1Kpi(icon, label, value, note, accent) {
  const paths = {
    users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M19 8l2 1v3c0 2-1.2 3.6-3 4.5"></path>',
    activity: '<path d="M4 19V5a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z"></path><path d="M8 8h8M8 12h5M8 16h3"></path>',
    risk: '<path d="M12 3 2.8 20h18.4L12 3Z"></path><path d="M12 9v5M12 17h.01"></path>',
    total: '<rect x="5" y="3" width="14" height="18" rx="2"></rect><path d="M9 3h6v4H9zM9 12l2 2 4-4"></path>'
  };
  return `<article class="inspector-v1-kpi guard-kpi" style="--inspector-accent:${accent};--kpi-color:${accent};--kpi-soft:color-mix(in srgb,${accent} 10%,white)"><span class="inspector-v1-kpi-icon guard-kpi-icon"><svg viewBox="0 0 24 24" aria-hidden="true">${paths[icon]}</svg></span><div><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong><small>${escapeHtml(note)}</small></div></article>`;
}

function inspectorV1RenderKpis(stats, controls, months) {
  const rows = Object.values(stats || {});
  const active = rows.length;
  const avgMonthly = active ? rows.reduce((sum, item) => sum + Number(item.monthly || 0), 0) / active : 0;
  const problems = controls.filter(control => isProblemResult(control.result)).length;
  const problemRate = controls.length ? problems / controls.length * 100 : 0;
  setHtml("inspectorV1Kpis", [
    inspectorV1Kpi("users", "Inspectori activi", String(active), "in selectia curenta", "#0b8f58"),
    inspectorV1Kpi("activity", "Controale / inspector / luna", avgMonthly.toFixed(1), `${months} luni analizate`, "#25c66f"),
    inspectorV1Kpi("risk", "Controale cu probleme", `${problemRate.toFixed(1)}%`, `${problems} controale`, "#ff7417"),
    inspectorV1Kpi("total", "Controale in perioada", controls.length.toLocaleString("ro-RO"), "controale unice", "#38a9ff")
  ].join(""));
}

function inspectorV1SortedRows(stats, metric) {
  return Object.values(stats || {}).sort((a, b) => inspectorV1MetricValue(b, metric) - inspectorV1MetricValue(a, metric) || a.name.localeCompare(b.name, "ro"));
}

function inspectorV1MetricColor(value, min, max, metric) {
  const definition = inspectorV1MetricDefinition(metric);
  if (definition.risk) return quantitativeColor(value, min, max, true);
  const greens = ["#b9dfcf", "#86cfad", "#55b986", "#25a16a", "#0b8f58", "#086742"];
  const ratio = max > min ? Math.max(0, Math.min(1, (Number(value) - min) / (max - min))) : 1;
  return greens[Math.min(greens.length - 1, Math.floor(ratio * greens.length))];
}

function inspectorV1OverviewColor(value, min, max, metric = "total") {
  return quantitativeColor(value, min, max, inspectorV1MetricDefinition(metric).risk);
}

function inspectorV1RenderOverviewChart(rows, metric, controls) {
  const canvas = q("chartInspectorsV1Overview");
  if (!canvas) return;
  if (charts.chartInspectorsV1Overview) charts.chartInspectorsV1Overview.destroy();
  const visibleRows = rows.slice(0, 10);
  const values = visibleRows.map(item => inspectorV1MetricValue(item, metric));
  const range = getQuantitativeRange(values);
  const definition = inspectorV1MetricDefinition(metric);
  setText("inspectorV1ChartTitle", `Activitate inspectori - ${definition.label}`);
  setText("inspectorV1ChartSubtitle", `${visibleRows.length} inspectori afisati din ${rows.length} disponibili`);
  charts.chartInspectorsV1Overview = new Chart(canvas, {
    type: "bar",
    data: {
      labels: visibleRows.map(item => item.name),
      datasets: [{
        label: definition.label,
        data: values,
        backgroundColor: values.map(value => inspectorV1OverviewColor(value, range.min, range.max, metric)),
        borderColor: values.map(value => inspectorV1OverviewColor(value, range.min, range.max, metric)),
        borderWidth: 1,
        borderRadius: 6,
        borderSkipped: false,
        categoryPercentage: .76,
        barPercentage: .72,
        maxBarThickness: 22
      }]
    },
    options: {
      indexAxis: "y",
      responsive: true,
      maintainAspectRatio: false,
      layout: { padding: { right: 42 } },
      animation: { duration: 240 },
      onClick: (_event, elements) => {
        if (elements.length) openInspectorV1Summary(visibleRows[elements[0].index].name);
      },
      onHover: (_event, elements, chart) => { chart.canvas.style.cursor = elements.length ? "pointer" : "default"; },
      plugins: {
        legend: { display: false },
        valueLabelPlugin: { display: true, horizontal: true, color: "#17231f", fontWeight: 750, shadowColor: "transparent", shadowBlur: 0 },
        tooltip: {
          backgroundColor: "#ffffff",
          titleColor: "#17231f",
          bodyColor: "#66736e",
          borderColor: "#dce6e1",
          borderWidth: 1,
          padding: 11,
          cornerRadius: 9,
          displayColors: true,
          callbacks: {
            afterTitle: items => items.length ? inspectorV1GuardFor(visibleRows[items[0].dataIndex].name, controls) : "",
            label: context => `${definition.label}: ${inspectorV1FormatMetric(context.parsed.x, metric)}`
          }
        }
      },
      scales: {
        x: { beginAtZero: true, grid: { color: "#e8eeeb", lineWidth: 1 }, border: { color: "#dce6e1" }, ticks: { color: "#66736e", precision: metric === "problemRate" ? 1 : 0, padding: 7 } },
        y: { grid: { display: false }, border: { display: false }, ticks: { color: "#17231f", padding: 9, font: { size: 12, weight: "650" } } }
      }
    }
  });
}

function inspectorV1RenderRanking(rows, metric, controls) {
  const values = rows.map(item => inspectorV1MetricValue(item, metric));
  const range = getQuantitativeRange(values);
  const definition = inspectorV1MetricDefinition(metric);
  setText("inspectorV1RankingTitle", "Clasament inspectori");
  setText("inspectorV1RankingSubtitle", `${definition.label} · Top 10`);
  setText("inspectorV1RankingCount", `${rows.length} inspectori`);
  setHtml("inspectorV1Ranking", rows.length ? rows.slice(0, 10).map((item, index) => {
    const value = inspectorV1MetricValue(item, metric);
    const width = range.max > range.min ? 10 + (value - range.min) / (range.max - range.min) * 90 : 100;
    const color = inspectorV1OverviewColor(value, range.min, range.max, metric);
    return `<button type="button" class="inspector-v1-ranking-row guard-rank-row" style="--guard-rank-color:${color}" onclick="openInspectorV1Summary('${escapeAttr(item.name)}')"><b class="guard-rank-index">#${index + 1}</b><span class="inspector-v1-rank-identity"><strong class="guard-rank-name">${escapeHtml(item.name)}</strong><small>${escapeHtml(inspectorV1GuardFor(item.name, controls))}</small></span><strong class="guard-rank-value">${escapeHtml(inspectorV1FormatMetric(value, metric))}</strong><div class="guard-rank-bar"><i style="width:${width}%"></i></div></button>`;
  }).join("") : '<div class="inspector-v1-empty">Nu exista inspectori pentru selectia curenta.</div>');
}

function inspectorV1CategoryIcon(type) {
  const key = normalizeText(type);
  if (key.includes("sesiz")) return '<path d="M5 4h14v13H8l-3 3z"></path><path d="M8 8h8M8 12h5"></path>';
  if (key.includes("fond")) return '<path d="m12 3-4 6h3l-5 7h5v5h2v-5h5l-5-7h3z"></path>';
  if (key.includes("oper")) return '<circle cx="12" cy="12" r="8"></circle><path d="m12 7 2 5-5 2 3-7z"></path>';
  if (key.includes("temat")) return '<path d="M4 5h16v14H4z"></path><path d="M8 9h8M8 13h5"></path>';
  if (key.includes("rutin")) return '<path d="M5 12a7 7 0 1 0 2-5"></path><path d="M5 5v5h5"></path>';
  if (key.includes("solicit")) return '<path d="M7 3h10v4H7z"></path><path d="M5 5h14v16H5zM8 12h8M8 16h5"></path>';
  if (key.includes("necunos")) return '<circle cx="12" cy="12" r="9"></circle><path d="M9.8 9a2.4 2.4 0 1 1 3.1 2.3c-.9.4-.9 1-.9 1.7M12 17h.01"></path>';
  return '<path d="M4 19V5h16v14z"></path><path d="M8 9h8M8 13h6"></path>';
}

function inspectorV1RenderCategories(controls) {
  const container = q("inspectorV1Categories");
  if (!container) return;
  const source = countBy(controls, control => control.control_type || "Tip neprecizat");
  const rows = Object.entries(source).sort((a, b) => b[1] - a[1]);
  const visible = inspectorV1CategoriesExpanded ? rows : rows.slice(0, 6);
  const total = Math.max(1, controls.length);
  const range = getQuantitativeRange(rows.map(entry => entry[1]));
  setHtml("inspectorV1Categories", visible.length ? visible.map(([label, value]) => {
    const color = inspectorV1OverviewColor(value, range.min, range.max, "total");
    return `<article class="inspector-v1-category" style="--category-accent:${color}"><span><svg viewBox="0 0 24 24">${inspectorV1CategoryIcon(label)}</svg></span><div><small>${escapeHtml(label)}</small><strong>${Number(value).toLocaleString("ro-RO")}</strong><em>${(value / total * 100).toFixed(1)}% din controale</em></div></article>`;
  }).join("") : '<div class="inspector-v1-empty">Nu exista date de clasificare pentru selectia curenta.</div>');
  const more = q("inspectorV1CategoriesMore");
  if (more) {
    more.hidden = rows.length <= 6;
    more.innerHTML = inspectorV1CategoriesExpanded ? 'Restrange <span aria-hidden="true">&uarr;</span>' : 'Vezi toate <span aria-hidden="true">&rarr;</span>';
  }
}

function toggleInspectorV1Categories() {
  inspectorV1CategoriesExpanded = !inspectorV1CategoriesExpanded;
  inspectorV1RenderCategories(inspectorV1DirectoryControls);
}

function renderInspectorV1Directory() {
  const container = q("inspectorV1DirectoryList");
  if (!container) return;
  const term = normalizeText(inspectorV1SelectValue("inspectorV1DirectorySearch", ""));
  const rows = inspectorV1DirectoryRows.filter(item => {
    if (!term) return true;
    return normalizeText(`${item.name} ${inspectorV1GuardFor(item.name, inspectorV1DirectoryControls)}`).includes(term);
  });
  const values = inspectorV1DirectoryRows.map(item => inspectorV1MetricValue(item, inspectorV1DirectoryMetric));
  const range = getQuantitativeRange(values);
  setHtml("inspectorV1DirectoryList", rows.length ? rows.map((item, index) => {
    const value = inspectorV1MetricValue(item, inspectorV1DirectoryMetric);
    const width = range.max > range.min ? 10 + (value - range.min) / (range.max - range.min) * 90 : 100;
    const color = inspectorV1MetricColor(value, range.min, range.max, inspectorV1DirectoryMetric);
    return `<button type="button" class="inspector-v1-directory-row" onclick="closeInspectorV1Directory(); openInspectorV1Summary('${escapeAttr(item.name)}')"><b>#${index + 1}</b><span><strong>${escapeHtml(item.name)}</strong><small>${escapeHtml(inspectorV1GuardFor(item.name, inspectorV1DirectoryControls))}</small><i><em style="width:${width}%;background:${color}"></em></i></span><strong>${escapeHtml(inspectorV1FormatMetric(value, inspectorV1DirectoryMetric))}</strong></button>`;
  }).join("") : '<div class="inspector-v1-empty">Nu exista inspectori pentru cautarea curenta.</div>');
}

function openInspectorV1Directory() {
  const drawer = q("inspectorV1DirectoryDrawer");
  const backdrop = q("inspectorV1DirectoryBackdrop");
  if (!drawer || !backdrop) return;
  if (q("inspectorV1DirectorySearch")) q("inspectorV1DirectorySearch").value = "";
  setText("inspectorV1DirectorySubtitle", `${inspectorV1DirectoryRows.length} inspectori · ${INSPECTOR_V1_METRICS[inspectorV1DirectoryMetric]?.label || "indicator"}`);
  drawer.hidden = false;
  backdrop.hidden = false;
  drawer.setAttribute("aria-hidden", "false");
  requestAnimationFrame(() => drawer.classList.add("open"));
  renderInspectorV1Directory();
}

function closeInspectorV1Directory() {
  const drawer = q("inspectorV1DirectoryDrawer");
  const backdrop = q("inspectorV1DirectoryBackdrop");
  if (!drawer || !backdrop) return;
  drawer.classList.remove("open");
  drawer.setAttribute("aria-hidden", "true");
  setTimeout(() => { drawer.hidden = true; backdrop.hidden = true; }, 220);
}

function inspectorV1AverageRow(stats) {
  const rows = Object.values(stats || {});
  if (!rows.length) return null;
  const sum = key => rows.reduce((total, item) => total + Number(item[key] || 0), 0) / rows.length;
  const averageMap = key => {
    const keys = [...new Set(rows.flatMap(item => Object.keys(item[key] || {})))];
    return Object.fromEntries(keys.map(mapKey => [mapKey, rows.reduce((total, item) => total + Number(item[key]?.[mapKey] || 0), 0) / rows.length]));
  };
  return {
    name: "Reper",
    monthly: sum("monthly"),
    total: sum("total"),
    problemRate: sum("problemRate"),
    petitionShare: sum("petitionShare"),
    petitions: sum("petitions"),
    problems: sum("problems"),
    byType: averageMap("byType"),
    byCategory: averageMap("byCategory"),
    byDomain: averageMap("byDomain"),
    byResult: { Neconform: rows.reduce((total, item) => total + inspectorV1MetricValue(item, "nonconform"), 0) / rows.length }
  };
}

function inspectorV1Benchmark(selectedName, mode, months) {
  let controls = inspectorV1FilteredControls({ ignoreInspector: true, ignoreGuard: mode === "national" });
  let label = "Media nationala";
  if (mode === "guard") {
    const selectedGuard = inspectorV1SelectValue("inspectorV1Guard", "toate");
    let guardKey = selectedGuard !== "toate" ? canonicalGuardName(selectedGuard) : "";
    if (!guardKey && selectedName) {
      const nationalControls = inspectorV1FilteredControls({ ignoreInspector: true, ignoreGuard: true });
      guardKey = getInspectorPrimaryGuard(selectedName, nationalControls);
    }
    if (guardKey) {
      controls = controls.filter(control => canonicalGuardName(control.garda) === guardKey);
      label = `Media ${guardDisplayName(guardKey)}`;
    }
  }
  return { row: inspectorV1AverageRow(buildInspectorStats(controls, months)), label, controls };
}

function inspectorV1EnsureComparisonSelectors(rows) {
  const names = rows.map(item => item.name);
  const ids = ["inspectorV1CompareA", "inspectorV1CompareB", "inspectorV1CompareC", "inspectorV1EvolutionA", "inspectorV1EvolutionB", "inspectorV1EvolutionC"];
  ids.forEach((id, index) => {
    const optional = id.endsWith("B") || id.endsWith("C");
    const current = inspectorV1SelectValue(id, "");
    inspectorV1SetOptions(id, names, optional ? "Fara selectie" : "", current || (!optional ? names[0] : ""));
  });
}

function inspectorV1SelectedNames(prefix) {
  return ["A", "B", "C"].map(suffix => inspectorV1SelectValue(`${prefix}${suffix}`, "")).filter((value, index, arr) => value && arr.indexOf(value) === index).slice(0, 3);
}

function inspectorV1RangeForMode(mode) {
  const state = inspectorV1State();
  const currentFrom = inspectorV1Date(state.from);
  const currentTo = inspectorV1Date(state.to);
  if (String(mode).startsWith("year:")) {
    const year = Number(String(mode).slice(5));
    return { from: new Date(year, 0, 1), to: new Date(year, 11, 31), label: String(year) };
  }
  if (mode === "previous" && currentFrom && currentTo) {
    const duration = currentTo.getTime() - currentFrom.getTime();
    const to = new Date(currentFrom.getTime() - 86400000);
    const from = new Date(to.getTime() - duration);
    return { from, to, label: "Perioada anterioara" };
  }
  return { from: currentFrom, to: currentTo, label: "Perioada selectata" };
}

function inspectorV1ControlsForRange(range, options = {}) {
  const state = inspectorV1State();
  const guardKey = canonicalGuardName(state.guard);
  return (allControls || []).filter(control => {
    const date = inspectorV1Date(getControlDateValue(control));
    if (range.from && (!date || date < range.from)) return false;
    if (range.to && (!date || date > range.to)) return false;
    if (!options.ignoreGuard && state.guard !== "toate" && canonicalGuardName(control.garda) !== guardKey) return false;
    if (state.type !== "toate" && normalizeText(control.control_type) !== normalizeText(state.type)) return false;
    if (state.result !== "toate" && normalizeText(control.result) !== normalizeText(state.result)) return false;
    if (state.category !== "toate" && normalizeText(getControlCategory(control)) !== normalizeText(state.category)) return false;
    return true;
  });
}

function inspectorV1MonthsForRange(range) {
  if (!range.from || !range.to) return 1;
  return Math.max(1, (range.to.getFullYear() - range.from.getFullYear()) * 12 + range.to.getMonth() - range.from.getMonth() + 1);
}

function inspectorV1StatForPeriod(name, mode) {
  const range = inspectorV1RangeForMode(mode);
  const controls = inspectorV1ControlsForRange(range);
  const months = inspectorV1MonthsForRange(range);
  const stats = inspectorV1EnrichStats(buildInspectorStats(controls, months), controls);
  return { name, mode, range, controls, months, row: stats[name] || null };
}

function inspectorV1PeriodDelta(value, reference, metric) {
  const difference = Number(value || 0) - Number(reference || 0);
  if (metric === "problemRate") return `${difference >= 0 ? "+" : ""}${difference.toFixed(1)} pp`;
  if (!Number(reference)) return difference ? `${difference >= 0 ? "+" : ""}${inspectorV1FormatMetric(difference, metric)}` : "0";
  const percent = difference / Math.abs(Number(reference)) * 100;
  return `${percent >= 0 ? "+" : ""}${percent.toFixed(1)}%`;
}

function inspectorV1RenderComparativeLegacy(stats, months, controls) {
  const nameA = inspectorV1SelectValue("inspectorV1CompareA", "");
  const selectedB = inspectorV1SelectValue("inspectorV1CompareB", "");
  const periodA = inspectorV1SelectValue("inspectorV1ComparePeriodA", "current");
  const periodB = inspectorV1SelectValue("inspectorV1ComparePeriodB", "previous");
  const nameB = selectedB || nameA;
  const columnA = inspectorV1StatForPeriod(nameA, periodA);
  const columnB = inspectorV1StatForPeriod(nameB, periodB);
  if (!columnA.row) {
    setHtml("inspectorV1Comparison", '<div class="inspector-v1-empty">Selecteaza cel putin un inspector.</div>');
    return;
  }
  const benchmarkMode = inspectorV1SelectValue("inspectorV1CompareBenchmark", "guard");
  const benchmark = inspectorV1Benchmark(nameA, benchmarkMode, columnA.months);
  const metrics = ["monthly", "problemRate", "petitions", "thematic", "operative", "nonconform"];
  const comparisonColumns = "minmax(190px,1.15fr) repeat(3,minmax(170px,1fr))";
  const periodLabel = item => `${escapeHtml(item.name)}<small>${escapeHtml(item.range.label)} · ${escapeHtml(inspectorV1GuardFor(item.name, item.controls))}</small>`;
  setHtml("inspectorV1Comparison", `<div class="inspector-v1-comparison-grid"><div class="inspector-v1-comparison-head" style="grid-template-columns:${comparisonColumns}"><span>Indicator</span><button type="button" onclick="openInspectorV1Summary('${escapeAttr(nameA)}')">${periodLabel(columnA)}</button><button type="button" onclick="openInspectorV1Summary('${escapeAttr(nameB)}')">${periodLabel(columnB)}</button><span>${escapeHtml(benchmark.label)}</span></div>${metrics.map(metric => {
    const definition = inspectorV1MetricDefinition(metric);
    const valueA = inspectorV1MetricValue(columnA.row, metric);
    const valueB = inspectorV1MetricValue(columnB.row, metric);
    const reference = inspectorV1MetricValue(benchmark.row, metric);
    return `<div class="inspector-v1-comparison-row" style="grid-template-columns:${comparisonColumns}"><span>${escapeHtml(definition.label)}</span><strong>${escapeHtml(inspectorV1FormatMetric(valueA, metric))}<small>perioada A</small></strong><strong>${escapeHtml(inspectorV1FormatMetric(valueB, metric))}<small class="same">${escapeHtml(inspectorV1PeriodDelta(valueB, valueA, metric))} fata de A</small></strong><strong class="benchmark">${escapeHtml(inspectorV1FormatMetric(reference, metric))}</strong></div>`;
  }).join("")}</div>`);
}

function syncInspectorV1ComparativeControls() {
  const mode = inspectorV1SelectValue("inspectorV1CompareMode", "guard");
  if (q("inspectorV1CompareBField")) q("inspectorV1CompareBField").hidden = mode !== "other";
  if (q("inspectorV1PreviousPresetField")) q("inspectorV1PreviousPresetField").hidden = mode !== "previous";
  if (mode === "other") {
    const selected = inspectorV1SelectValue("inspectorV1CompareA", "");
    const compared = q("inspectorV1CompareB");
    if (compared) {
      [...compared.options].forEach(option => { option.disabled = Boolean(option.value && option.value === selected); });
      if (!compared.value || compared.value === selected) {
        const alternative = [...compared.options].find(option => option.value && option.value !== selected);
        compared.value = alternative ? alternative.value : "";
      }
    }
  }
}

function inspectorV1PreviousRange(currentRange, preset) {
  const currentFrom = new Date(currentRange.from);
  const currentTo = new Date(currentRange.to);
  if (preset === "year") {
    return { from: new Date(currentFrom.getFullYear() - 1, currentFrom.getMonth(), currentFrom.getDate()), to: new Date(currentTo.getFullYear() - 1, currentTo.getMonth(), currentTo.getDate()), label: `Aceeasi perioada ${currentTo.getFullYear() - 1}` };
  }
  const months = preset === "semester" ? 6 : preset === "quarter" ? 3 : 0;
  if (months) {
    const to = new Date(currentFrom.getFullYear(), currentFrom.getMonth(), currentFrom.getDate() - 1);
    const from = new Date(to.getFullYear(), to.getMonth() - months + 1, 1);
    return { from, to, label: preset === "semester" ? "Semestrul anterior" : "Trimestrul anterior" };
  }
  const duration = currentTo.getTime() - currentFrom.getTime();
  const to = new Date(currentFrom.getTime() - 86400000);
  return { from: new Date(to.getTime() - duration), to, label: "Perioada precedenta echivalenta" };
}

function inspectorV1RangeLabel(range) {
  if (!range?.from || !range?.to) return "Perioada selectata";
  const format = value => new Intl.DateTimeFormat("ro-RO", { day: "2-digit", month: "short", year: "numeric" }).format(value);
  return `${format(range.from)} - ${format(range.to)}`;
}

function inspectorV1StatsForRange(range, options = {}) {
  const controls = inspectorV1ControlsForRange(range, options);
  const months = inspectorV1MonthsForRange(range);
  return { controls, months, stats: inspectorV1EnrichStats(buildInspectorStats(controls, months), controls) };
}

function inspectorV1ComparativeMetrics(controlSets) {
  const controls = controlSets.flat().filter(Boolean);
  const types = [...new Set(controls.map(control => control.control_type).filter(Boolean))].sort((a, b) => String(a).localeCompare(String(b), "ro"));
  const categories = [...new Set(controls.map(getControlCategory).filter(Boolean))].sort((a, b) => String(a).localeCompare(String(b), "ro"));
  return ["total", "monthly", "problemRate", "petitions", "nonconform", ...types.map(type => `type:${type}`), ...categories.map(category => `category:${category}`)];
}

function inspectorV1DeltaBadge(value, reference, metric) {
  const current = Number(value);
  const base = Number(reference);
  if (!Number.isFinite(current) || !Number.isFinite(base)) return { text: "-", tone: "neutral" };
  const delta = current - base;
  const definition = inspectorV1MetricDefinition(metric);
  let text;
  if (metric === "problemRate") text = `${delta > 0 ? "+" : delta < 0 ? "-" : ""}${Math.abs(delta).toFixed(1)} pp`;
  else if (base !== 0) text = `${delta > 0 ? "+" : delta < 0 ? "-" : ""}${Math.abs(delta / base * 100).toFixed(1)}%`;
  else text = delta === 0 ? "0%" : `${delta > 0 ? "+" : "-"}${inspectorV1FormatMetric(Math.abs(delta), metric)}`;
  if (delta === 0 || definition.neutral) return { text, tone: "neutral" };
  const favorable = definition.risk ? delta < 0 : delta > 0;
  return { text, tone: favorable ? "good" : "bad" };
}

function inspectorV1RenderComparative(stats, months, controls) {
  syncInspectorV1ComparativeControls();
  const nameA = inspectorV1SelectValue("inspectorV1CompareA", "");
  const mode = inspectorV1SelectValue("inspectorV1CompareMode", "guard");
  const selectedB = inspectorV1SelectValue("inspectorV1CompareB", "");
  const currentRange = inspectorV1RangeForMode(inspectorV1SelectValue("inspectorV1ComparePeriodA", "current"));
  const current = inspectorV1StatsForRange(currentRange);
  const rowA = current.stats[nameA];
  if (!rowA) {
    setHtml("inspectorV1Comparison", '<div class="inspector-v1-empty">Selecteaza cel putin un inspector.</div>');
    return;
  }

  let rowB = null;
  let labelB = "";
  let referenceControls = current.controls;
  if (mode === "other") {
    rowB = current.stats[selectedB] || null;
    labelB = selectedB || "Inspector comparat";
  } else if (mode === "guard" || mode === "national") {
    const base = inspectorV1StatsForRange(currentRange, { ignoreGuard: mode === "national" });
    let benchmarkStats = base.stats;
    if (mode === "guard") {
      const guardKey = getInspectorPrimaryGuard(nameA, base.controls);
      referenceControls = base.controls.filter(control => canonicalGuardName(control.garda) === guardKey);
      benchmarkStats = inspectorV1EnrichStats(buildInspectorStats(referenceControls, current.months), referenceControls);
      labelB = `Media ${guardDisplayName(guardKey)}`;
    } else {
      referenceControls = base.controls;
      labelB = "Media nationala";
    }
    rowB = inspectorV1AverageRow(benchmarkStats);
  } else {
    const previousRange = inspectorV1PreviousRange(currentRange, inspectorV1SelectValue("inspectorV1PreviousPreset", "equivalent"));
    const previous = inspectorV1StatsForRange(previousRange);
    rowB = previous.stats[nameA] || null;
    referenceControls = previous.controls;
    labelB = previousRange.label;
  }
  if (!rowB) {
    setHtml("inspectorV1Comparison", '<div class="inspector-v1-empty">Nu exista date pentru reperul selectat.</div>');
    return;
  }

  const metrics = inspectorV1ComparativeMetrics([current.controls, referenceControls]);
  const labelA = mode === "previous" ? inspectorV1RangeLabel(currentRange) : nameA;
  setText("inspectorV1ComparisonTitle", `${nameA} comparativ`);
  setText("inspectorV1ComparisonSubtitle", `${labelA} fata de ${labelB}`);
  setHtml("inspectorV1Comparison", `<div class="guard-comparison-head"><span>Indicator</span><span>${escapeHtml(labelA)}</span><span>${escapeHtml(labelB)}</span><span>Diferenta</span></div>${metrics.map(metric => {
    const definition = inspectorV1MetricDefinition(metric);
    const valueA = inspectorV1MetricValue(rowA, metric);
    const valueB = inspectorV1MetricValue(rowB, metric);
    const delta = inspectorV1DeltaBadge(valueA, valueB, metric);
    return `<div class="guard-comparison-row"><span>${escapeHtml(definition.label)}</span><strong>${escapeHtml(inspectorV1FormatMetric(valueA, metric))}</strong><strong>${escapeHtml(inspectorV1FormatMetric(valueB, metric))}</strong><span class="guard-comparison-delta ${delta.tone}">${escapeHtml(delta.text)}</span></div>`;
  }).join("")}`);
}

function inspectorV1MonthKeys() {
  const state = inspectorV1State();
  const start = inspectorV1Date(state.from);
  const end = inspectorV1Date(state.to);
  if (!start || !end) return [];
  const keys = [];
  const cursor = new Date(start.getFullYear(), start.getMonth(), 1);
  while (cursor <= end) {
    keys.push(`${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, "0")}`);
    cursor.setMonth(cursor.getMonth() + 1, 1);
  }
  return keys;
}

function inspectorV1MonthKeysForRange(range) {
  if (!range.from || !range.to) return [];
  const keys = [];
  const cursor = new Date(range.from.getFullYear(), range.from.getMonth(), 1);
  while (cursor <= range.to) {
    keys.push(`${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, "0")}`);
    cursor.setMonth(cursor.getMonth() + 1, 1);
  }
  return keys;
}

function inspectorV1MonthlySeries(name, range, metric) {
  const keys = inspectorV1MonthKeysForRange(range);
  const controls = inspectorV1ControlsForRange(range).filter(control => (control.echipa || []).some(member => member && member.nume === name));
  return keys.map(key => {
    const monthControls = controls.filter(control => monthKey(control) === key);
    if (metric === "problemRate") return monthControls.length ? monthControls.filter(control => isProblemResult(control.result)).length / monthControls.length * 100 : 0;
    if (metric === "petitions") return monthControls.filter(isPetition).length;
    if (metric === "nonconform") return monthControls.filter(control => normalizeText(control.result) === "neconform").length;
    if (metric === "thematic") return monthControls.filter(control => normalizeText(control.control_type) === "tematic").length;
    if (metric === "operative") return monthControls.filter(control => normalizeText(control.control_type) === "operativ").length;
    if (String(metric).startsWith("category:")) {
      const category = String(metric).slice(9);
      return monthControls.filter(control => normalizeText(getControlCategory(control)) === normalizeText(category)).length;
    }
    return monthControls.length;
  });
}

function inspectorV1MonthLabel(key) {
  const [year, month] = key.split("-").map(Number);
  return new Intl.DateTimeFormat("ro-RO", { month: "short", year: "2-digit" }).format(new Date(year, month - 1, 1));
}

function inspectorV1RenderEvolution(stats, months, controls) {
  const canvas = q("chartInspectorsV1Evolution");
  if (!canvas) return;
  if (charts.chartInspectorsV1Evolution) charts.chartInspectorsV1Evolution.destroy();
  const names = inspectorV1SelectedNames("inspectorV1Evolution");
  const currentRange = inspectorV1RangeForMode("current");
  const previousRange = inspectorV1RangeForMode("previous");
  const keys = inspectorV1MonthKeysForRange(currentRange);
  const metric = inspectorV1SelectValue("inspectorV1Metric", "monthly");
  const definition = inspectorV1MetricDefinition(metric);
  const benchmarkMode = inspectorV1SelectValue("inspectorV1EvolutionBenchmark", "guard");
  const benchmark = inspectorV1Benchmark(names[0], benchmarkMode, months);
  const datasets = names.map((name, index) => ({
    label: name,
    data: inspectorV1MonthlySeries(name, currentRange, metric),
    borderColor: INSPECTOR_V1_COLORS[index],
    backgroundColor: inspectorSeriesFill(INSPECTOR_V1_COLORS[index], .10),
    borderWidth: 2,
    pointRadius: 2,
    pointHoverRadius: 5,
    tension: .32,
    fill: true
  }));
  if (q("inspectorV1EvolutionPrevious")?.checked && names[0]) {
    datasets.push({
      label: `${names[0]} · perioada anterioara`,
      data: inspectorV1MonthlySeries(names[0], previousRange, metric),
      borderColor: "#7b8a84",
      backgroundColor: "rgba(123,138,132,.05)",
      borderWidth: 2,
      borderDash: [5, 4],
      pointRadius: 1,
      pointHoverRadius: 4,
      tension: .32,
      fill: true
    });
  }
  const benchmarkNames = Object.keys(buildInspectorStats(benchmark.controls, months));
  const benchmarkSeries = benchmarkNames.map(name => inspectorV1MonthlySeries(name, currentRange, metric));
  const benchmarkValues = keys.map((_key, index) => {
    const values = benchmarkSeries.map(series => series[index]).filter(Number.isFinite);
    return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
  });
  datasets.push({
    label: benchmark.label,
    data: benchmarkValues,
    borderColor: "#1686c9",
    backgroundColor: "transparent",
    borderWidth: 3,
    borderDash: [7, 5],
    pointRadius: 0,
    pointHoverRadius: 5,
    tension: .25,
    fill: false
  });
  setText("inspectorV1EvolutionTitle", names.length ? `Evolutie - ${names.join(" / ")}` : "Evolutie inspectori");
  setTimeout(() => setText("inspectorV1EvolutionSubtitle", `${definition.label} · ${keys.length} luni · ${benchmark.label}${q("inspectorV1EvolutionPrevious")?.checked ? " · comparatie temporala activa" : ""}`), 0);
  setText("inspectorV1EvolutionSubtitle", `${keys.length} luni · ${benchmark.label}`);
  charts.chartInspectorsV1Evolution = new Chart(canvas, {
    type: "line",
    data: { labels: keys.map(inspectorV1MonthLabel), datasets },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: "index", intersect: false },
      plugins: {
        valueLabelPlugin: { display: false },
        legend: { position: "top", align: "start", labels: { color: "#17231f", usePointStyle: true, boxWidth: 8, padding: 16 } },
        tooltip: { backgroundColor: "#ffffff", titleColor: "#17231f", bodyColor: "#66736e", borderColor: "#dce6e1", borderWidth: 1, padding: 10, callbacks: { label: context => `${context.dataset.label}: ${inspectorV1FormatMetric(context.parsed.y, metric)}` } }
      },
      scales: {
        x: { grid: { display: false }, ticks: { color: "#66736e" } },
        y: { beginAtZero: true, grid: { color: "#e4ebe7" }, ticks: { color: "#66736e", precision: 0 } }
      }
    }
  });
}

function inspectorV1Rgba(hex, alpha) {
  const value = String(hex).replace("#", "");
  const red = parseInt(value.slice(0, 2), 16);
  const green = parseInt(value.slice(2, 4), 16);
  const blue = parseInt(value.slice(4, 6), 16);
  return `rgba(${red},${green},${blue},${alpha})`;
}

function inspectorV1RenderMatrixLegacy(rows, controls) {
  const monthlyRange = getQuantitativeRange(rows.map(item => Number(item.monthly || 0)));
  const riskRange = getQuantitativeRange(rows.map(item => Number(item.problemRate || 0)));
  const financialRows = rows.filter(item => Number(item.financialDataCount || 0) > 0);
  const averageMonthly = rows.length ? rows.reduce((sum, item) => sum + Number(item.monthly || 0), 0) / rows.length : 0;
  const averageProblems = rows.length ? rows.reduce((sum, item) => sum + Number(item.problemRate || 0), 0) / rows.length : 0;
  const financialTotal = financialRows.reduce((sum, item) => sum + Number(item.financialAmount || 0), 0);
  setHtml("inspectorV1MatrixKpis", [
    inspectorV1Kpi("activity", "Controale / inspector / luna", averageMonthly.toFixed(1), "media selectiei curente", "#0b8f58"),
    inspectorV1Kpi("risk", "% controale cu probleme", `${averageProblems.toFixed(1)}%`, "indicator de risc", "#ff7417"),
    inspectorV1Kpi("total", "Amenzi / prejudicii", financialRows.length ? formatMoney(financialTotal) : "—", financialRows.length ? `${financialRows.length} inspectori cu date` : "Date indisponibile", "#7b8a84")
  ].join(""));
  setHtml("inspectorV1MatrixTable", rows.length ? `<div class="inspector-v1-matrix-scroll"><table><thead><tr><th>Inspector</th><th>Garda</th><th>Controale / inspector / luna</th><th>% controale cu probleme</th><th>Amenzi / prejudicii</th></tr></thead><tbody>${rows.map(item => {
    const activityColor = inspectorV1MetricColor(item.monthly, monthlyRange.min, monthlyRange.max, "monthly");
    const riskColor = inspectorV1MetricColor(item.problemRate, riskRange.min, riskRange.max, "problemRate");
    const financialValue = Number(item.financialDataCount || 0) > 0 ? formatMoney(item.financialAmount) : "—";
    return `<tr tabindex="0" onclick="openInspectorV1Summary('${escapeAttr(item.name)}')"><th><strong>${escapeHtml(item.name)}</strong></th><td class="inspector-v1-matrix-guard">${escapeHtml(inspectorV1GuardFor(item.name, controls))}</td><td style="background:${inspectorV1Rgba(activityColor, .18)}"><strong>${escapeHtml(inspectorV1FormatMetric(item.monthly, "monthly"))}</strong></td><td style="background:${inspectorV1Rgba(riskColor, .25)}"><strong>${escapeHtml(inspectorV1FormatMetric(item.problemRate, "problemRate"))}</strong></td><td class="inspector-v1-matrix-financial"><strong>${escapeHtml(financialValue)}</strong><small>${financialValue === "—" ? "Date indisponibile" : "valoare factuala"}</small></td></tr>`;
  }).join("")}</tbody></table></div>` : '<div class="inspector-v1-empty">Nu exista date pentru matrice.</div>');
}

function inspectorV1MatrixIcon(kind) {
  const paths = {
    activity: '<path d="M5 3h14v18H5z"></path><path d="M8 8h8M8 12h5M8 16h3"></path>',
    risk: '<path d="M12 3 2.8 20h18.4z"></path><path d="M12 9v5M12 17h.01"></path>',
    financial: '<circle cx="12" cy="12" r="9"></circle><path d="M8 9.5c0-1.2 1.3-2 3-2s3 .8 3 2-1.3 2-3 2-3 .8-3 2 1.3 2 3 2 3-.8 3-2M11 5v14"></path>'
  };
  return `<svg viewBox="0 0 24 24" aria-hidden="true">${paths[kind]}</svg>`;
}

function inspectorV1RenderMatrix(rows, controls) {
  const monthlyRange = getQuantitativeRange(rows.map(item => Number(item.monthly || 0)));
  const riskRange = getQuantitativeRange(rows.map(item => Number(item.problemRate || 0)));
  const financialRows = rows.filter(item => Number(item.financialDataCount || 0) > 0);
  const financialRange = getQuantitativeRange(financialRows.map(item => Number(item.financialAmount || 0)));
  const averageMonthly = rows.length ? rows.reduce((sum, item) => sum + Number(item.monthly || 0), 0) / rows.length : 0;
  const averageProblems = rows.length ? rows.reduce((sum, item) => sum + Number(item.problemRate || 0), 0) / rows.length : 0;
  const financialTotal = financialRows.reduce((sum, item) => sum + Number(item.financialAmount || 0), 0);

  setHtml("inspectorV1MatrixKpis", `
    <div class="guard-matrix-kpi matrix-kpi-controls"><span class="guard-kpi-icon">${inspectorV1MatrixIcon("activity")}</span><span class="guard-kpi-label">Controale / inspector / luna</span><strong>${averageMonthly.toFixed(1)}</strong><small>media selectiei curente</small></div>
    <div class="guard-matrix-kpi matrix-kpi-overdue"><span class="guard-kpi-icon">${inspectorV1MatrixIcon("risk")}</span><span class="guard-kpi-label">% controale cu probleme</span><strong>${averageProblems.toFixed(1)}%</strong><small>indicator de risc</small></div>
    <div class="guard-matrix-kpi matrix-kpi-financial"><span class="guard-kpi-icon">${inspectorV1MatrixIcon("financial")}</span><span class="guard-kpi-label">Amenzi / prejudicii</span><strong>${financialRows.length ? escapeHtml(formatMoney(financialTotal)) : "&mdash;"}</strong><small>${financialRows.length ? `${financialRows.length} inspectori cu date` : "Date indisponibile"}</small></div>
  `);

  if (!rows.length) {
    setHtml("inspectorV1MatrixTable", '<div class="inspector-v1-empty">Nu exista date pentru matrice.</div>');
    return;
  }

  const body = rows.map(item => {
    const activityColor = inspectorV1OverviewColor(item.monthly, monthlyRange.min, monthlyRange.max, "monthly");
    const riskColor = inspectorV1OverviewColor(item.problemRate, riskRange.min, riskRange.max, "problemRate");
    const hasFinancial = Number(item.financialDataCount || 0) > 0;
    const financialColor = hasFinancial ? quantitativeColor(item.financialAmount, financialRange.min, financialRange.max, false) : "#dfe7e3";
    return `<div class="guard-score-row inspector-matrix-score-grid" tabindex="0" role="button" onclick="openInspectorV1Summary('${escapeAttr(item.name)}')">
      <div class="guard-score-main"><strong>${escapeHtml(item.name)}</strong><span>profil inspector</span></div>
      <div class="inspector-matrix-guard">${escapeHtml(inspectorV1GuardFor(item.name, controls))}</div>
      <div class="guard-heat-cell" style="--guard-cell:${activityColor}">${escapeHtml(inspectorV1FormatMetric(item.monthly, "monthly"))}</div>
      <div class="guard-heat-cell" style="--guard-cell:${riskColor}">${escapeHtml(inspectorV1FormatMetric(item.problemRate, "problemRate"))}</div>
      <div class="guard-heat-cell inspector-matrix-financial ${hasFinancial ? "" : "unavailable"}" style="--guard-cell:${financialColor}"><strong>${hasFinancial ? escapeHtml(formatMoney(item.financialAmount)) : "&mdash;"}</strong><small>${hasFinancial ? "valoare factuala" : "Date indisponibile"}</small></div>
    </div>`;
  }).join("");

  setHtml("inspectorV1MatrixTable", `<div class="guard-score-head inspector-matrix-score-grid"><span>Inspector</span><span>Garda</span><span>Controale / inspector / luna</span><span>% probleme</span><span>Amenzi / prejudicii</span></div><div class="guard-score-body">${body}</div>`);
}

function inspectorProfileDirectory() {
  const names = [...new Set((allControls || []).flatMap(control => (control.echipa || []).map(member => member && member.nume).filter(Boolean)))];
  return names.map(name => ({ name, guard: inspectorV1GuardFor(name, allControls || []), guardKey: getInspectorPrimaryGuard(name, allControls || []) }))
    .sort((a, b) => a.name.localeCompare(b.name, "ro"));
}

function populateInspectorProfileGuards() {
  const select = q("inspectorProfileGuard");
  if (!select) return;
  const current = select.value || "toate";
  const guards = [...new Map(inspectorProfileDirectory().filter(item => item.guardKey).map(item => [item.guardKey, item.guard])).entries()]
    .sort((a, b) => a[1].localeCompare(b[1], "ro"));
  select.innerHTML = `<option value="toate">Toate garzile</option>${guards.map(([key, label]) => `<option value="${escapeAttr(key)}">${escapeHtml(label)}</option>`).join("")}`;
  select.value = [...select.options].some(option => option.value === current) ? current : "toate";
}

function renderInspectorProfileSuggestions() {
  const container = q("inspectorProfileSuggestions");
  const input = q("inspectorProfileSearch");
  if (!container || !input) return;
  const term = normalizeText(input.value);
  if (term.length < 2) {
    container.hidden = true;
    container.innerHTML = "";
    return;
  }
  const guard = inspectorV1SelectValue("inspectorProfileGuard", "toate");
  const rows = inspectorProfileDirectory().filter(item => (guard === "toate" || item.guardKey === guard) && normalizeText(item.name).includes(term)).slice(0, 8);
  container.innerHTML = rows.length ? rows.map(item => `<button type="button" data-inspector="${escapeAttr(item.name)}" onclick="selectInspectorV1Profile(this.dataset.inspector)"><span class="inspector-profile-suggestion-avatar">${escapeHtml(inspectorProfileInitials(item.name))}</span><span><strong>${escapeHtml(item.name)}</strong><small>${escapeHtml(item.guard)}</small></span><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 18 6-6-6-6"></path></svg></button>`).join("") : '<div class="inspector-profile-no-results">Nu exista inspectori pentru cautarea curenta.</div>';
  container.hidden = false;
}

function handleInspectorProfileSearchKey(event) {
  if (event.key !== "Enter") return;
  const first = q("inspectorProfileSuggestions")?.querySelector("button[data-inspector]");
  if (!first) return;
  event.preventDefault();
  selectInspectorV1Profile(first.dataset.inspector);
}

function handleInspectorProfileGuardChange() {
  const guard = inspectorV1SelectValue("inspectorProfileGuard", "toate");
  if (inspectorV1ProfileName && guard !== "toate") {
    const selected = inspectorProfileDirectory().find(item => item.name === inspectorV1ProfileName);
    if (!selected || selected.guardKey !== guard) clearInspectorV1Profile();
  }
  renderInspectorProfileSuggestions();
}

function selectInspectorV1Profile(name) {
  if (!name) return;
  inspectorV1ProfileName = name;
  inspectorV1ProfileTypesExpanded = false;
  inspectorV1ProfileControlsExpanded = false;
  inspectorV1ProfileAnalysisTab = "activity";
  inspectorV1ProfileCategoryDomain = "all";
  inspectorV1ProfileStructureTab = "types";
  inspectorV1ProfileFocus = { kind: "all", value: "" };
  inspectorV1ProfileSelectedCategory = "all";
  if (q("inspectorProfileSearch")) q("inspectorProfileSearch").value = name;
  if (q("inspectorProfileSuggestions")) q("inspectorProfileSuggestions").hidden = true;
  renderInspectorV1Profile();
}

function clearInspectorV1Profile() {
  inspectorV1ProfileName = "";
  if (q("inspectorProfileSearch")) q("inspectorProfileSearch").value = "";
  if (q("inspectorProfileContent")) q("inspectorProfileContent").hidden = true;
  if (q("inspectorProfileEmpty")) q("inspectorProfileEmpty").hidden = false;
  if (charts.chartInspectorProfile) {
    charts.chartInspectorProfile.destroy();
    delete charts.chartInspectorProfile;
  }
}

function inspectorProfileInitials(name) {
  const parts = String(name || "").trim().split(/\s+/).filter(Boolean);
  return parts.slice(0, 2).map(part => part.charAt(0).toUpperCase()).join("") || "IN";
}

function inspectorProfileBaseRange() {
  const raw = inspectorV1RangeForPreset(inspectorV1SelectValue("inspectorProfilePeriod", "last180"));
  return { from: inspectorV1Date(raw.from), to: inspectorV1Date(raw.to) };
}

function inspectorProfileEffectiveRange(base, preset) {
  if (!base.from || !base.to) return base;
  if (preset !== "semester" && preset !== "quarter") return { from: new Date(base.from), to: new Date(base.to) };
  const months = preset === "semester" ? 6 : 3;
  return { from: new Date(base.to.getFullYear(), base.to.getMonth() - months + 1, 1), to: new Date(base.to) };
}

function inspectorProfilePreviousRange(current, preset) {
  if (preset === "none" || !current.from || !current.to) return null;
  if (preset === "year") {
    return { from: new Date(current.from.getFullYear() - 1, current.from.getMonth(), current.from.getDate()), to: new Date(current.to.getFullYear() - 1, current.to.getMonth(), current.to.getDate()), label: "Aceeasi perioada din anul anterior" };
  }
  const duration = current.to.getTime() - current.from.getTime();
  const to = new Date(current.from.getTime() - 86400000);
  const from = new Date(to.getTime() - duration);
  return { from, to, label: preset === "semester" ? "Semestrul anterior" : preset === "quarter" ? "Trimestrul anterior" : "Perioada precedenta echivalenta" };
}

function inspectorProfileMatchesSharedFilters(control) {
  const type = inspectorV1SelectValue("inspectorV1Type", "toate");
  const result = inspectorV1SelectValue("inspectorV1Result", "toate");
  const category = inspectorV1SelectValue("inspectorV1Category", "toate");
  if (type !== "toate" && normalizeText(control.control_type) !== normalizeText(type)) return false;
  if (result !== "toate" && normalizeText(control.result) !== normalizeText(result)) return false;
  if (category !== "toate" && !categoryMatchesControl(control, category)) return false;
  return true;
}

function inspectorProfileMatchesGuardFilter(control) {
  const guard = inspectorV1SelectValue("inspectorProfileGuard", "toate");
  return guard === "toate" || canonicalGuardName(control.garda) === canonicalGuardName(guard);
}

function inspectorProfileControlsForRange(name, range) {
  if (!name || !range?.from || !range?.to) return [];
  const end = new Date(range.to);
  end.setHours(23, 59, 59, 999);
  return (allControls || []).filter(control => {
    const date = inspectorV1Date(getControlDateValue(control));
    return date && date >= range.from && date <= end
      && inspectorProfileMatchesSharedFilters(control)
      && inspectorProfileMatchesGuardFilter(control)
      && (control.echipa || []).some(member => member && member.nume === name);
  });
}

function inspectorProfileAllControlsForRange(range) {
  if (!range?.from || !range?.to) return [];
  const end = new Date(range.to);
  end.setHours(23, 59, 59, 999);
  return (allControls || []).filter(control => {
    const date = inspectorV1Date(getControlDateValue(control));
    return date && date >= range.from && date <= end && inspectorProfileMatchesSharedFilters(control);
  });
}

function inspectorProfileMetricDefinition(metric) {
  if (INSPECTOR_V1_METRICS[metric]) return INSPECTOR_V1_METRICS[metric];
  if (String(metric).startsWith("category-id:")) {
    const id = String(metric).slice(12);
    const category = INSPECTOR_CONTROL_CATEGORY_CATALOG.find(item => item.id === id);
    return { label: category?.label || id.split("/").pop() || "Categorie", short: "Categorie control", decimals: 0, risk: false, neutral: true };
  }
  const prefixes = { "type:": "Tip", "category:": "Categorie", "domain:": "Domeniu" };
  const prefix = Object.keys(prefixes).find(item => String(metric).startsWith(item));
  const label = prefix ? String(metric).slice(prefix.length) : String(metric || "Indicator");
  return { label, short: label, decimals: 0, risk: false, neutral: true };
}

function inspectorProfileMetricAggregate(controls, metric, months = 1) {
  if (!controls.length && metric === "problemRate") return null;
  if (metric === "monthly") return controls.length / Math.max(1, months);
  if (metric === "problemRate") return controls.filter(control => isProblemResult(control.result)).length / controls.length * 100;
  if (metric === "petitions") return controls.filter(isPetition).length;
  if (String(metric).startsWith("type:")) {
    const key = normalizeText(String(metric).slice(5));
    return controls.filter(control => normalizeText(control.control_type) === key).length;
  }
  if (String(metric).startsWith("category:")) {
    const key = normalizeText(String(metric).slice(9));
    return controls.filter(control => normalizeText(getControlCategory(control)) === key).length;
  }
  if (String(metric).startsWith("category-id:")) {
    const id = String(metric).slice(12);
    const identities = controls.map(inspectorProfileCategoryIdentity);
    if (controls.length && !identities.some(Boolean)) return null;
    return identities.filter(identity => identity?.id === id).length;
  }
  if (String(metric).startsWith("domain:")) {
    const key = normalizeText(String(metric).slice(7));
    return controls.filter(control => normalizeText(getControlDomainRaw(control)) === key).length;
  }
  return controls.length;
}

function inspectorProfileFormatMetric(value, metric) {
  if (value === null || value === undefined || !Number.isFinite(Number(value))) return "-";
  const definition = inspectorProfileMetricDefinition(metric);
  if (metric === "problemRate") return `${Number(value).toFixed(1)}%`;
  return Number(value).toLocaleString("ro-RO", { minimumFractionDigits: definition.decimals || 0, maximumFractionDigits: definition.decimals || 0 });
}

function inspectorProfileMonthKeys(range) {
  if (!range?.from || !range?.to) return [];
  const keys = [];
  const cursor = new Date(range.from.getFullYear(), range.from.getMonth(), 1);
  while (cursor <= range.to) {
    keys.push(`${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, "0")}`);
    cursor.setMonth(cursor.getMonth() + 1, 1);
  }
  return keys;
}

function inspectorProfileMonthKey(value) {
  const date = inspectorV1Date(value);
  return date ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}` : "";
}

function inspectorProfileSeries(name, range, metric) {
  const controls = inspectorProfileControlsForRange(name, range);
  const keys = inspectorProfileMonthKeys(range);
  const values = keys.map(key => inspectorProfileMetricAggregate(controls.filter(control => inspectorProfileMonthKey(getControlDateValue(control)) === key), metric, 1));
  return { keys, controls, values };
}

function inspectorProfileAverageRow(controls, months) {
  const stats = inspectorV1EnrichStats(buildInspectorStats(controls, months), controls);
  return inspectorV1AverageRow(stats);
}

function inspectorProfileBenchmarkAggregate(range, metric, guardKey = "") {
  const controls = inspectorProfileAllControlsForRange(range).filter(control => !guardKey || canonicalGuardName(control.garda) === guardKey);
  if (String(metric).includes(":")) {
    const names = [...new Set(controls.flatMap(control => (control.echipa || []).map(member => member?.nume).filter(Boolean)))];
    const values = names.map(name => inspectorProfileMetricAggregate(controls.filter(control => (control.echipa || []).some(member => member?.nume === name)), metric, inspectorV1MonthsForRange(range))).filter(value => value !== null && Number.isFinite(Number(value)));
    return values.length ? values.reduce((sum, value) => sum + Number(value), 0) / values.length : null;
  }
  const row = inspectorProfileAverageRow(controls, inspectorV1MonthsForRange(range));
  return row ? inspectorV1MetricValue(row, metric) : null;
}

function inspectorProfileBenchmarkSeries(range, metric, guardKey = "") {
  const keys = inspectorProfileMonthKeys(range);
  return keys.map(key => {
    const monthControls = inspectorProfileAllControlsForRange(range).filter(control => inspectorProfileMonthKey(getControlDateValue(control)) === key && (!guardKey || canonicalGuardName(control.garda) === guardKey));
    if (String(metric).includes(":")) {
      const names = [...new Set(monthControls.flatMap(control => (control.echipa || []).map(member => member?.nume).filter(Boolean)))];
      const values = names.map(name => inspectorProfileMetricAggregate(monthControls.filter(control => (control.echipa || []).some(member => member?.nume === name)), metric, 1)).filter(value => value !== null && Number.isFinite(Number(value)));
      return values.length ? values.reduce((sum, value) => sum + Number(value), 0) / values.length : null;
    }
    const row = inspectorProfileAverageRow(monthControls, 1);
    let value = row ? inspectorV1MetricValue(row, metric) : null;
    return value;
  });
}

function populateInspectorProfileMetrics(name) {
  const select = q("inspectorProfileMetric");
  if (!select || !name) return;
  const current = select.value || "total";
  select.innerHTML = '<option value="total">Total controale</option><option value="problemRate">% controale cu probleme</option>';
  select.value = [...select.options].some(option => option.value === current) ? current : "total";
}

function inspectorProfileDelta(value, reference, metric) {
  if (value === null || reference === null || !Number.isFinite(Number(value)) || !Number.isFinite(Number(reference))) return { text: "Date insuficiente", tone: "neutral" };
  const difference = Number(value) - Number(reference);
  const definition = inspectorProfileMetricDefinition(metric);
  let text;
  if (metric === "problemRate") text = `${difference > 0 ? "+" : difference < 0 ? "-" : ""}${Math.abs(difference).toFixed(1)} pp`;
  else if (Number(reference) !== 0) text = `${difference > 0 ? "+" : difference < 0 ? "-" : ""}${Math.abs(difference / Math.abs(Number(reference)) * 100).toFixed(1)}%`;
  else text = difference === 0 ? "0%" : `${difference > 0 ? "+" : "-"}${inspectorProfileFormatMetric(Math.abs(difference), metric)}`;
  if (difference === 0 || definition.neutral) return { text, tone: "neutral" };
  const favorable = definition.risk ? difference < 0 : difference > 0;
  return { text, tone: favorable ? "good" : "bad" };
}

function inspectorProfileRangeLabel(range) {
  if (!range?.from || !range?.to) return "Perioada indisponibila";
  const format = value => new Intl.DateTimeFormat("ro-RO", { day: "numeric", month: "short", year: "numeric" }).format(value);
  return `${format(range.from)} - ${format(range.to)}`;
}

function renderInspectorProfileChart(name, guardKey, currentRange, previousRange, metric, benchmarkMode) {
  const canvas = q("chartInspectorProfile");
  if (!canvas) return;
  if (charts.chartInspectorProfile) charts.chartInspectorProfile.destroy();
  const current = inspectorProfileSeries(name, currentRange, metric);
  const previous = previousRange ? inspectorProfileSeries(name, previousRange, metric) : null;
  const benchmarkGuard = benchmarkMode === "guard" ? guardKey : "";
  const benchmark = inspectorProfileBenchmarkSeries(currentRange, metric, benchmarkGuard);
  const labels = current.keys.map(inspectorV1MonthLabel);
  const previousValues = previous && previous.controls.length ? current.keys.map((_, index) => previous.values[index] ?? null) : null;
  const benchmarkLabel = benchmarkMode === "guard" ? `Media ${guardDisplayName(guardKey)}` : "Media nationala";
  const datasets = [{ label: `${name} - perioada curenta`, data: current.values, borderColor: "#0b8f58", backgroundColor: "rgba(11,143,88,.10)", borderWidth: 2.6, fill: true, tension: .28, pointRadius: 2, pointHoverRadius: 5 }];
  if (previousValues) datasets.push({ label: `${name} - perioada anterioara`, data: previousValues, borderColor: "#ffab1f", backgroundColor: "transparent", borderWidth: 2, borderDash: [7, 5], fill: false, tension: .28, pointRadius: 1.5, pointHoverRadius: 5 });
  datasets.push({ label: benchmarkLabel, data: benchmark, borderColor: "#1687b8", backgroundColor: "transparent", borderWidth: 3, fill: false, tension: .24, pointRadius: 0, pointHoverRadius: 5 });
  const definition = inspectorProfileMetricDefinition(metric);
  charts.chartInspectorProfile = new Chart(canvas, {
    type: "line",
    data: { labels, datasets },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: "index", intersect: false },
      plugins: {
        legend: { position: "bottom", align: "start", labels: { color: "#43534d", usePointStyle: true, pointStyle: "line", boxWidth: 24, padding: 12, font: { size: 10, weight: "650" } } },
        valueLabelPlugin: { display: false },
        tooltip: {
          backgroundColor: "#fff", titleColor: "#17231f", bodyColor: "#43534d", borderColor: "#dce6e1", borderWidth: 1, padding: 12, cornerRadius: 10, displayColors: true,
          callbacks: {
            title: items => items.length ? labels[items[0].dataIndex] : "",
            label: context => `${context.dataset.label}: ${inspectorProfileFormatMetric(context.parsed.y, metric)}`,
            afterBody: items => {
              if (!items.length) return [];
              const index = items[0].dataIndex;
              const lines = [];
              if (previousValues && previousValues[index] !== null) lines.push(`Diferenta fata de perioada anterioara: ${inspectorProfileDelta(current.values[index], previousValues[index], metric).text}`);
              if (benchmark[index] !== null) lines.push(`Diferenta fata de reper: ${inspectorProfileDelta(current.values[index], benchmark[index], metric).text}`);
              return lines;
            }
          }
        }
      },
      scales: {
        x: { grid: { display: false }, border: { color: "#dce6e1" }, ticks: { color: "#52645d", font: { size: 10, weight: "650" }, maxRotation: 0, autoSkip: true } },
        y: { beginAtZero: true, grid: { color: "rgba(102,115,110,.12)" }, border: { display: false }, ticks: { color: "#52645d", font: { size: 10, weight: "650" }, callback: value => metric === "problemRate" ? `${value}%` : value } }
      }
    }
  });
  setText("inspectorProfileChartSubtitle", `${definition.label} - ${inspectorProfileRangeLabel(currentRange)}`);
  return { current, previous, benchmark, benchmarkLabel };
}

function inspectorProfileKpiIcon(kind) {
  const paths = {
    total: '<path d="M9 5h6M9 3h6v4H9z"></path><rect x="5" y="5" width="14" height="16" rx="2"></rect><path d="M8 11h8M8 15h8"></path>',
    monthly: '<path d="M4 19V5h16v14z"></path><path d="M8 15v-3M12 15V8M16 15v-5"></path>',
    risk: '<path d="M12 3 2.8 20h18.4z"></path><path d="M12 9v5M12 17h.01"></path>',
    compare: '<path d="M4 17 9 12l4 3 7-8"></path><path d="M16 7h4v4"></path>'
  };
  return `<svg viewBox="0 0 24 24" aria-hidden="true">${paths[kind]}</svg>`;
}

function renderInspectorProfileTypes(controls) {
  const source = Object.entries(countBy(controls, control => control.control_type || "Tip neprecizat")).sort((a, b) => b[1] - a[1]);
  const canvas = q("chartInspectorProfileTypes");
  if (charts.chartInspectorProfileTypes) { charts.chartInspectorProfileTypes.destroy(); delete charts.chartInspectorProfileTypes; }
  if (canvas && source.length) {
    const range = getQuantitativeRange(source.map(item => item[1]));
    charts.chartInspectorProfileTypes = new Chart(canvas, {
      type: "bar",
      data: { labels: source.map(item => item[0]), datasets: [{ data: source.map(item => item[1]), backgroundColor: source.map(([label, value]) => inspectorV1ProfileFocus.kind === "type" && inspectorV1ProfileFocus.value === label ? "#0b8f58" : quantitativeColor(value, range.min, range.max, false)), borderRadius: 7, borderSkipped: false, barThickness: 18, maxBarThickness: 22 }] },
      options: {
        indexAxis: "y",
        responsive: true,
        maintainAspectRatio: false,
        onClick: (_event, elements) => {
          if (!elements.length) return;
          inspectorV1ProfileFocus = { kind: "type", value: source[elements[0].index][0] };
          renderInspectorV1Profile();
        },
        plugins: {
          legend: { display: false },
          valueLabelPlugin: { display: true, color: "#17231f", horizontal: true, shadowColor: "transparent", shadowBlur: 0 },
          tooltip: {
            backgroundColor: "#fff",
            titleColor: "#17231f",
            bodyColor: "#43534d",
            borderColor: "#dce6e1",
            borderWidth: 1,
            callbacks: { label: context => `${context.parsed.x} controale - ${(context.parsed.x / Math.max(1, controls.length) * 100).toFixed(1)}%` }
          }
        },
        layout: { padding: { right: 42 } },
        scales: {
          x: { beginAtZero: true, grid: { color: "#e8eeeb" }, border: { display: false }, ticks: { color: "#66736e", precision: 0 } },
          y: { grid: { display: false }, border: { display: false }, ticks: { color: "#43534d", font: { size: 11, weight: "650" } } }
        }
      }
    });
  }
  const resultRows = [
    ["Conforme", controls.filter(control => normalizeText(control.result) === "conform").length, "conform"],
    ["Cu probleme", controls.filter(control => isProblemResult(control.result)).length, "problem"],
    ["Sanctiuni", controls.filter(control => normalizeText(control.result) === "sanctiune").length, "sanction"],
    ["Sesizari penale", controls.filter(control => normalizeText(control.result) === "sesizare penala" || normalizeText(control.result) === "sesizare_penala").length, "penal"]
  ];
  setHtml("inspectorProfileResults", resultRows.map(([label, value, tone]) => `<span class="inspector-profile-result ${tone}"><b>${Number(value).toLocaleString("ro-RO")}</b>${escapeHtml(label)}</span>`).join(""));
}

function inspectorProfileCategoryToken(value) {
  return normalizeText(value).replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
}

function inspectorProfileCategoryIdentity(control) {
  const domain = getControlDomainKey(control);
  const rawCategory = getControlCategoryRaw(control);
  if (!rawCategory || !["silvic", "cinegetic"].includes(domain)) return null;
  const token = inspectorProfileCategoryToken(rawCategory);
  const catalog = INSPECTOR_CONTROL_CATEGORY_CATALOG.find(item => item.domain === domain && (item.key === token || inspectorProfileCategoryToken(item.label) === token));
  if (catalog) return catalog;
  return { domain, key: token, id: `${domain}/${token}`, label: String(rawCategory) };
}

function buildInspectorCategoryMatrixData(controls, domainFilter = "all") {
  const identities = (controls || []).map(inspectorProfileCategoryIdentity).filter(Boolean);
  const counts = new Map();
  identities.forEach(item => counts.set(item.id, Number(counts.get(item.id) || 0) + 1));
  const catalogRows = INSPECTOR_CONTROL_CATEGORY_CATALOG.filter(item => domainFilter === "all" || item.domain === domainFilter);
  const catalogIds = new Set(catalogRows.map(item => item.id));
  const reportedExtras = identities.filter(item => (domainFilter === "all" || item.domain === domainFilter) && !catalogIds.has(item.id));
  const uniqueExtras = [...new Map(reportedExtras.map(item => [item.id, item])).values()];
  const denominator = identities.length;
  const rows = [...catalogRows, ...uniqueExtras].map(item => {
    const count = Number(counts.get(item.id) || 0);
    return { ...item, count, share: denominator ? count / denominator * 100 : null };
  });
  return {
    rows,
    identities,
    reportedCount: denominator,
    missingCount: Math.max(0, (controls || []).length - denominator),
    totalControls: (controls || []).length
  };
}

function inspectorProfileGuardCategoryAverages(controls, domainFilter) {
  const names = [...new Set((controls || []).flatMap(control => (control.echipa || []).map(member => member?.nume).filter(Boolean)))];
  const shares = new Map();
  names.forEach(name => {
    const inspectorControls = (controls || []).filter(control => (control.echipa || []).some(member => member?.nume === name));
    const data = buildInspectorCategoryMatrixData(inspectorControls, domainFilter);
    if (!data.reportedCount) return;
    data.rows.forEach(row => {
      if (!shares.has(row.id)) shares.set(row.id, []);
      shares.get(row.id).push(Number(row.share || 0));
    });
  });
  return new Map([...shares].map(([id, values]) => [id, values.reduce((sum, value) => sum + value, 0) / values.length]));
}

function inspectorProfileCategoryNarrative(rows, guardAverages) {
  const active = rows.filter(row => row.count > 0).sort((a, b) => b.count - a.count);
  if (!active.length) return "Nu exista activitate raportata pentru domeniul selectat in perioada curenta.";
  const names = active.slice(0, 2).map(row => row.label.toLocaleLowerCase("ro-RO"));
  let text = `Activitatea inspectorului este concentrata in principal pe ${names.join(names.length > 1 ? " si " : "")}.`;
  const above = active.find(row => guardAverages.has(row.id) && row.share - guardAverages.get(row.id) >= 5);
  const below = active.find(row => guardAverages.has(row.id) && row.share - guardAverages.get(row.id) <= -5);
  if (above) text += ` Ponderea categoriei ${above.label.toLocaleLowerCase("ro-RO")} este peste media Garzii.`;
  if (below) text += ` Ponderea categoriei ${below.label.toLocaleLowerCase("ro-RO")} este sub media Garzii.`;
  return text;
}

function inspectorProfileRenderCategoryChart(rows) {
  if (charts.chartInspectorProfileCategories) charts.chartInspectorProfileCategories.destroy();
  const canvas = q("chartInspectorProfileCategories");
  const active = rows.filter(row => row.count > 0).sort((a, b) => b.count - a.count);
  if (!canvas || !active.length) return;
  const range = getQuantitativeRange(active.map(row => row.count));
  charts.chartInspectorProfileCategories = new Chart(canvas, {
    type: "bar",
    data: {
      labels: active.map(row => row.label),
      datasets: [{
        label: "Controale",
        data: active.map(row => row.count),
         backgroundColor: active.map(row => inspectorV1ProfileSelectedCategory === row.id ? "#0b8f58" : quantitativeColor(row.count, range.min, range.max, false)),
        borderRadius: 7,
        borderSkipped: false,
        barThickness: 18,
        maxBarThickness: 22
      }]
    },
    options: {
      indexAxis: "y",
      responsive: true,
      maintainAspectRatio: false,
      onClick: (_event, elements) => {
        if (!elements.length) return;
        inspectorV1ProfileSelectedCategory = active[elements[0].index].id;
        inspectorV1ProfileFocus = { kind: "category", value: inspectorV1ProfileSelectedCategory };
        renderInspectorV1Profile();
      },
      interaction: { mode: "nearest", intersect: false },
      plugins: {
        legend: { display: false },
        valueLabelPlugin: { display: true, color: "#17231f", horizontal: true, shadowColor: "transparent", shadowBlur: 0 },
        tooltip: {
          backgroundColor: "#fff", titleColor: "#17231f", bodyColor: "#43534d", borderColor: "#dce6e1", borderWidth: 1, padding: 12, cornerRadius: 10,
          callbacks: { label: context => { const row = active[context.dataIndex]; return `${row.count} controale - ${row.share.toFixed(1)}% din activitatea raportata`; } }
        }
      },
      layout: { padding: { right: 38 } },
      scales: {
        x: { beginAtZero: true, grid: { color: "#e8eeeb" }, border: { display: false }, ticks: { color: "#66736e", precision: 0 } },
        y: { grid: { display: false }, border: { display: false }, ticks: { color: "#43534d", font: { size: 11, weight: "650" }, autoSkip: false } }
      }
    }
  });
}

function renderInspectorProfileCategories(controls, guardControls) {
  const domain = inspectorV1ProfileCategoryDomain;
  const data = buildInspectorCategoryMatrixData(controls, domain);
  const guardAverages = inspectorProfileGuardCategoryAverages(guardControls, domain);
  const empty = q("inspectorProfileCategoryEmpty");
  const content = q("inspectorProfileCategoryContent");
  const filteredRows = data.rows;
  const active = filteredRows.filter(row => row.count > 0).sort((a, b) => b.count - a.count);
  const allData = buildInspectorCategoryMatrixData(controls, "all");
  const unavailable = data.totalControls > 0 && allData.reportedCount === 0;
  const noControls = data.totalControls === 0;
  const select = q("inspectorProfileCategorySelect");
  if (select) {
    const options = active.map(row => `<option value="${escapeAttr(row.id)}">${escapeHtml(row.label)}</option>`).join("");
    select.innerHTML = `<option value="all">Toate categoriile</option>${options}`;
    if (!active.some(row => row.id === inspectorV1ProfileSelectedCategory)) inspectorV1ProfileSelectedCategory = "all";
    select.value = inspectorV1ProfileSelectedCategory;
  }

  if (empty) {
    empty.hidden = !(unavailable || noControls || (allData.reportedCount > 0 && !active.length));
    if (unavailable) empty.innerHTML = `<span>${inspectorProfileKpiIcon("total")}</span><h3>Categorii de control</h3><p>Controalele din perioada selectata nu contin inca informatia privind categoria de control.</p><small>Structura este pregatita pentru noile raportari.</small><div><b>Silvic</b> - 8 categorii <b>Cinegetic</b> - 7 categorii</div>`;
    else if (noControls) empty.innerHTML = `<span>${inspectorProfileKpiIcon("total")}</span><h3>Fara controale in perioada selectata</h3><p>Modifica perioada sau filtrele pentru a analiza categoriile raportate.</p>`;
    else if (!active.length) empty.innerHTML = `<span>${inspectorProfileKpiIcon("total")}</span><h3>Fara activitate in domeniul selectat</h3><p>Exista categorii raportate in perioada curenta, dar nu pentru domeniul ales.</p>`;
  }
  if (content) content.hidden = unavailable || noControls || (allData.reportedCount > 0 && !active.length);
  if (unavailable || noControls || !active.length) {
    if (charts.chartInspectorProfileCategories) { charts.chartInspectorProfileCategories.destroy(); delete charts.chartInspectorProfileCategories; }
    return;
  }

  inspectorProfileRenderCategoryChart(filteredRows);
  setText("inspectorProfileActivityNarrative", inspectorProfileCategoryNarrative(filteredRows, guardAverages));
}

function renderInspectorProfileSummary(controls) {
  const types = Object.entries(countBy(controls, control => control.control_type || "Tip neprecizat")).sort((a, b) => b[1] - a[1]);
  const categories = buildInspectorCategoryMatrixData(controls, "all");
  const topCategory = categories.rows.filter(row => row.count > 0).sort((a, b) => b.count - a.count)[0];
  const problems = controls.filter(control => isProblemResult(control.result)).length;
  setHtml("inspectorProfileSummary", `<div><span>Tip principal</span><strong>${escapeHtml(types[0]?.[0] || "-")}</strong><small>${types[0] ? `${types[0][1]} controale` : "Date indisponibile"}</small></div><div><span>Categorie principala</span><strong>${topCategory ? escapeHtml(topCategory.label) : "-"}</strong><small>${topCategory ? `${topCategory.count} controale cu categorie raportata` : "Categoria nu era raportata in aceasta perioada"}</small></div><div><span>Controale cu probleme</span><strong>${problems}</strong><small>${controls.length ? `${(problems / controls.length * 100).toFixed(1)}% din activitate` : "Fara controale"}</small></div><div><span>Acoperire categorii</span><strong>${categories.reportedCount ? `${categories.reportedCount} / ${controls.length}` : "-"}</strong><small>${categories.reportedCount ? "controale cu categorie disponibila" : "Date indisponibile"}</small></div>`);
}

function setInspectorProfileAnalysisTab(tab) {
  const valid = ["summary", "activity", "comparison"];
  inspectorV1ProfileAnalysisTab = valid.includes(tab) ? tab : "summary";
  document.querySelectorAll("#inspectorV1Profile [data-inspector-profile-tab]").forEach(button => {
    const active = button.dataset.inspectorProfileTab === inspectorV1ProfileAnalysisTab;
    button.classList.toggle("active", active);
    button.setAttribute("aria-selected", active ? "true" : "false");
  });
  const panels = { summary: "inspectorProfileSummaryPanel", activity: "inspectorProfileActivityPanel", comparison: "inspectorProfileComparisonPanel" };
  Object.entries(panels).forEach(([key, id]) => { if (q(id)) q(id).hidden = key !== inspectorV1ProfileAnalysisTab; });
  renderInspectorV1Profile();
}

function setInspectorProfileStructureTab(tab) {
  inspectorV1ProfileStructureTab = tab === "categories" ? "categories" : "types";
  document.querySelectorAll("#inspectorV1Profile [data-inspector-structure-tab]").forEach(button => button.classList.toggle("active", button.dataset.inspectorStructureTab === inspectorV1ProfileStructureTab));
  if (q("inspectorProfileTypesLocal")) q("inspectorProfileTypesLocal").hidden = inspectorV1ProfileStructureTab !== "types";
  if (q("inspectorProfileCategoriesLocal")) q("inspectorProfileCategoriesLocal").hidden = inspectorV1ProfileStructureTab !== "categories";
  renderInspectorV1Profile();
}

function selectInspectorProfileCategoryDomain(domain) {
  inspectorV1ProfileCategoryDomain = ["silvic", "cinegetic"].includes(domain) ? domain : "all";
  inspectorV1ProfileSelectedCategory = "all";
  if (inspectorV1ProfileFocus.kind === "category") inspectorV1ProfileFocus = { kind: "all", value: "" };
  document.querySelectorAll("#inspectorV1Profile [data-profile-domain]").forEach(button => button.classList.toggle("active", button.dataset.profileDomain === inspectorV1ProfileCategoryDomain));
  renderInspectorV1Profile();
}

function handleInspectorProfileCategorySelection() {
  inspectorV1ProfileSelectedCategory = inspectorV1SelectValue("inspectorProfileCategorySelect", "all");
  inspectorV1ProfileFocus = inspectorV1ProfileSelectedCategory === "all" ? { kind: "all", value: "" } : { kind: "category", value: inspectorV1ProfileSelectedCategory };
  renderInspectorV1Profile();
}

function handleInspectorProfileMetricChange() {
  inspectorV1ProfileFocus = { kind: "all", value: "" };
  renderInspectorV1Profile();
}

function renderInspectorProfileRecent(controls) {
  const rows = [...controls].sort((a, b) => new Date(getControlDateValue(b)) - new Date(getControlDateValue(a)));
  const visible = inspectorV1ProfileControlsExpanded ? rows : rows.slice(0, 10);
  const head = '<div class="inspector-profile-table-head"><span>Data</span><span>Tip</span><span>Categorie</span><span>Entitate</span><span>Localitate</span><span>Rezultat</span><span>Actiune</span></div>';
  const body = visible.map(control => `<div class="inspector-profile-control-row"><span><strong>${escapeHtml(formatDay(getControlDateValue(control)))}</strong><small>#${escapeHtml(control.id)}</small></span><span title="${escapeAttr(control.control_type || "-")}">${escapeHtml(control.control_type || "-")}</span><span title="${escapeAttr(getControlCategory(control) || "-")}">${escapeHtml(getControlCategory(control) || "-")}</span><span title="${escapeAttr(control.entitate_controlata || "-")}">${escapeHtml(control.entitate_controlata || "-")}</span><span title="${escapeAttr(control.localitate || "-")}">${escapeHtml(control.localitate || "-")}</span><span><b class="inspector-profile-result-badge ${escapeAttr(normalizeText(control.result).replace(/\s+/g, "-"))}">${escapeHtml(resultLabel(control.result))}</b></span><span><button type="button" data-control-id="${escapeAttr(control.id)}" onclick="openControlFullModal(this.dataset.controlId)">Deschide <span aria-hidden="true">&rarr;</span></button></span></div>`).join("");
  setHtml("inspectorProfileRecentControls", rows.length ? head + `<div class="inspector-profile-table-body">${body}</div>` : '<div class="inspector-v1-empty">Nu exista controale in perioada selectata.</div>');
  setText("inspectorProfileRecentSubtitle", `${Math.min(visible.length, rows.length)} din ${rows.length} controale in perioada selectata`);
  const toggle = q("inspectorProfileControlsToggle");
  if (toggle) {
    toggle.hidden = rows.length <= 10;
    toggle.innerHTML = inspectorV1ProfileControlsExpanded ? 'Restrange lista <span aria-hidden="true">&uarr;</span>' : 'Vezi toate controalele <span aria-hidden="true">&rarr;</span>';
  }
}

function renderInspectorV1Profile() {
  populateInspectorProfileGuards();
  if (!inspectorV1ProfileName) {
    if (q("inspectorProfileEmpty")) q("inspectorProfileEmpty").hidden = false;
    if (q("inspectorProfileContent")) q("inspectorProfileContent").hidden = true;
    return;
  }
  populateInspectorProfileMetrics(inspectorV1ProfileName);
  const profile = inspectorProfileDirectory().find(item => item.name === inspectorV1ProfileName);
  if (!profile) return clearInspectorV1Profile();
  const preset = inspectorV1SelectValue("inspectorProfilePrevious", "equivalent");
  const currentRange = inspectorProfileEffectiveRange(inspectorProfileBaseRange(), preset);
  const previousRange = inspectorProfilePreviousRange(currentRange, preset);
  const baseMetric = inspectorV1SelectValue("inspectorProfileMetric", "total");
  const metric = inspectorV1ProfileFocus.kind === "type" ? `type:${inspectorV1ProfileFocus.value}` : inspectorV1ProfileFocus.kind === "category" ? `category-id:${inspectorV1ProfileFocus.value}` : baseMetric;
  const benchmarkMode = inspectorV1SelectValue("inspectorProfileBenchmark", "guard");
  const currentControls = inspectorProfileControlsForRange(inspectorV1ProfileName, currentRange);
  const previousControls = previousRange ? inspectorProfileControlsForRange(inspectorV1ProfileName, previousRange) : [];
  const months = inspectorV1MonthsForRange(currentRange);
  const previousMonths = previousRange ? inspectorV1MonthsForRange(previousRange) : 0;
  const currentStats = inspectorV1EnrichStats(buildInspectorStats(currentControls, months), currentControls)[inspectorV1ProfileName] || { total: 0, monthly: 0, problemRate: 0 };
  const guardControls = inspectorProfileAllControlsForRange(currentRange).filter(control => canonicalGuardName(control.garda) === profile.guardKey);
  const nationalControls = inspectorProfileAllControlsForRange(currentRange);
  const guardAverage = inspectorProfileAverageRow(guardControls, months);
  const nationalAverage = inspectorProfileAverageRow(nationalControls, months);
  const activityDelta = inspectorProfileDelta(currentStats.monthly, guardAverage?.monthly ?? null, "monthly");
  const currentValue = inspectorProfileMetricAggregate(currentControls, metric, months);
  const previousValue = previousControls.length ? inspectorProfileMetricAggregate(previousControls, metric, previousMonths) : null;
  const periodDelta = inspectorProfileDelta(currentValue, previousValue, metric);

  q("inspectorProfileEmpty").hidden = true;
  q("inspectorProfileContent").hidden = false;
  document.querySelectorAll("#inspectorV1Profile [data-inspector-profile-tab]").forEach(button => {
    const active = button.dataset.inspectorProfileTab === inspectorV1ProfileAnalysisTab;
    button.classList.toggle("active", active);
    button.setAttribute("aria-selected", active ? "true" : "false");
  });
  const analysisPanels = { summary: "inspectorProfileSummaryPanel", activity: "inspectorProfileActivityPanel", comparison: "inspectorProfileComparisonPanel" };
  Object.entries(analysisPanels).forEach(([key, id]) => { if (q(id)) q(id).hidden = key !== inspectorV1ProfileAnalysisTab; });
  if (inspectorV1ProfileAnalysisTab === "activity") renderInspectorProfileChart(inspectorV1ProfileName, profile.guardKey, currentRange, previousRange, metric, benchmarkMode);
  setText("inspectorProfileAvatar", inspectorProfileInitials(inspectorV1ProfileName));
  setText("inspectorProfileName", inspectorV1ProfileName);
  setText("inspectorProfileGuardName", profile.guard);
  setHtml("inspectorProfileKpis", `
    <article class="guard-kpi guard-kpi-total"><span class="guard-kpi-icon">${inspectorProfileKpiIcon("total")}</span><div><span>Total controale</span><strong>${Number(currentStats.total || 0).toLocaleString("ro-RO")}</strong><small>in perioada selectata</small></div></article>
    <article class="guard-kpi guard-kpi-density"><span class="guard-kpi-icon">${inspectorProfileKpiIcon("monthly")}</span><div><span>Controale / inspector / luna</span><strong>${Number(currentStats.monthly || 0).toFixed(1)}</strong><small>${months} luni analizate</small></div></article>
    <article class="guard-kpi guard-kpi-problems"><span class="guard-kpi-icon">${inspectorProfileKpiIcon("risk")}</span><div><span>% controale cu probleme</span><strong>${Number(currentStats.problemRate || 0).toFixed(1)}%</strong><small>${Number(currentStats.problems || 0)} controale</small></div></article>
    <article class="guard-kpi guard-kpi-time"><span class="guard-kpi-icon">${inspectorProfileKpiIcon("compare")}</span><div><span>Activitate vs media Garzii</span><strong class="inspector-profile-delta ${activityDelta.tone}">${escapeHtml(activityDelta.text)}</strong><small>controale / luna</small></div></article>
  `);
  const metricDefinition = inspectorProfileMetricDefinition(metric);
  setText("inspectorProfileChartTitle", `Evolutie - ${metricDefinition.label}`);
  const benchmarkValueForInsight = inspectorProfileBenchmarkAggregate(currentRange, metric, profile.guardKey);
  const benchmarkInsightDelta = inspectorProfileDelta(currentValue, benchmarkValueForInsight, metric);
  setHtml("inspectorProfileChartInsights", `<span class="inspector-profile-insight"><small>Perioada curenta</small><b>${escapeHtml(inspectorProfileFormatMetric(currentValue, metric))}</b></span><span class="inspector-profile-insight"><small>Perioada anterioara</small><b>${previousValue === null ? "-" : escapeHtml(inspectorProfileFormatMetric(previousValue, metric))}</b></span><span class="inspector-profile-insight"><small>Diferenta</small><b class="${periodDelta.tone}">${escapeHtml(periodDelta.text)}</b></span>`);

  const inspectorProblem = Number(currentStats.problemRate || 0);
  const guardProblem = guardAverage?.problemRate ?? null;
  const problemDelta = inspectorProfileDelta(inspectorProblem, guardProblem, "problemRate");
  const benchmarkValue = benchmarkMode === "guard" ? inspectorProfileBenchmarkAggregate(currentRange, metric, profile.guardKey) : inspectorProfileBenchmarkAggregate(currentRange, metric, "");
  const benchmarkDelta = inspectorProfileDelta(currentValue, benchmarkValue, metric);
  setHtml("inspectorProfileBenchmarks", `
    <section><span>Controale / luna</span><div><small>Inspector</small><strong>${Number(currentStats.monthly || 0).toFixed(1)}</strong></div><div><small>Media Garzii</small><strong>${guardAverage ? Number(guardAverage.monthly || 0).toFixed(1) : "-"}</strong></div><div><small>Media nationala</small><strong>${nationalAverage ? Number(nationalAverage.monthly || 0).toFixed(1) : "-"}</strong></div><b class="inspector-profile-benchmark-delta ${activityDelta.tone}">${escapeHtml(activityDelta.text)} fata de Garda sa</b></section>
    <section><span>Controale cu probleme</span><div><small>Inspector</small><strong>${inspectorProblem.toFixed(1)}%</strong></div><div><small>Media Garzii</small><strong>${guardProblem === null ? "-" : `${Number(guardProblem).toFixed(1)}%`}</strong></div><b class="inspector-profile-benchmark-delta ${problemDelta.tone}">${escapeHtml(problemDelta.text)}</b></section>
    <section><span>${escapeHtml(inspectorProfileMetricDefinition(metric).label)}</span><div><small>${benchmarkMode === "guard" ? "Media Garzii" : "Media nationala"}</small><strong>${escapeHtml(inspectorProfileFormatMetric(benchmarkValue, metric))}</strong></div><b class="inspector-profile-benchmark-delta ${benchmarkDelta.tone}">${escapeHtml(benchmarkDelta.text)} fata de reper</b></section>
  `);
  setHtml("inspectorProfileActivityBenchmarks", `
    <section class="inspector-profile-reference-primary"><span>${escapeHtml(metricDefinition.label)}</span><strong>${escapeHtml(inspectorProfileFormatMetric(currentValue, metric))}</strong><small>${escapeHtml(inspectorV1ProfileName)}</small></section>
    <section><span>${benchmarkMode === "guard" ? "Media Garzii" : "Media nationala"}</span><strong>${escapeHtml(inspectorProfileFormatMetric(benchmarkValue, metric))}</strong><b class="inspector-profile-benchmark-delta ${benchmarkDelta.tone}">${escapeHtml(benchmarkDelta.text)}</b></section>
    <section><span>Perioada anterioara</span><strong>${previousValue === null ? "-" : escapeHtml(inspectorProfileFormatMetric(previousValue, metric))}</strong><b class="inspector-profile-benchmark-delta ${periodDelta.tone}">${escapeHtml(periodDelta.text)}</b></section>
    <section><span>Context</span><small>${escapeHtml(inspectorProfileRangeLabel(currentRange))}</small><small>${currentControls.length} controale analizate</small></section>
  `);
  renderInspectorProfileSummary(currentControls);
  renderInspectorProfileRecent(currentControls);
  if (inspectorV1ProfileAnalysisTab === "activity") {
    renderInspectorProfileTypes(currentControls);
    document.querySelectorAll("#inspectorV1Profile [data-inspector-structure-tab]").forEach(button => button.classList.toggle("active", button.dataset.inspectorStructureTab === inspectorV1ProfileStructureTab));
    document.querySelectorAll("#inspectorV1Profile [data-profile-domain]").forEach(button => button.classList.toggle("active", button.dataset.profileDomain === inspectorV1ProfileCategoryDomain));
    if (q("inspectorProfileTypesLocal")) q("inspectorProfileTypesLocal").hidden = inspectorV1ProfileStructureTab !== "types";
    if (q("inspectorProfileCategoriesLocal")) q("inspectorProfileCategoriesLocal").hidden = inspectorV1ProfileStructureTab !== "categories";
    if (inspectorV1ProfileStructureTab === "categories") renderInspectorProfileCategories(currentControls, guardControls);
  }
}

function toggleInspectorProfileTypes() {
  inspectorV1ProfileTypesExpanded = !inspectorV1ProfileTypesExpanded;
  renderInspectorV1Profile();
}

function toggleInspectorProfileControls() {
  inspectorV1ProfileControlsExpanded = !inspectorV1ProfileControlsExpanded;
  renderInspectorV1Profile();
}

function compareSelectedInspectorV1() {
  if (!inspectorV1ProfileName) return;
  setInspectorV1Section("comparative");
  if (q("inspectorV1CompareA") && [...q("inspectorV1CompareA").options].some(option => option.value === inspectorV1ProfileName)) q("inspectorV1CompareA").value = inspectorV1ProfileName;
  renderInspectorsV1();
}

function toggleInspectorV1MatrixConfig(force) {
  const panel = q("inspectorV1MatrixConfig");
  if (!panel) return;
  panel.hidden = typeof force === "boolean" ? !force : !panel.hidden;
}

function setInspectorV1MatrixMetric(metric, enabled) {
  renderInspectorsV1();
}

function inspectorV1InspectorControls(name) {
  return inspectorV1FilteredControls({ ignoreInspector: true }).filter(control => (control.echipa || []).some(member => member && member.nume === name));
}

function inspectorV1RenderDrawer(name, expanded) {
  const controls = inspectorV1InspectorControls(name);
  const months = inspectorV1MonthsInRange(controls);
  const stats = buildInspectorStats(controls, months)[name];
  if (!stats) return closeInspectorV1Drawer();
  const allStats = buildInspectorStats(inspectorV1FilteredControls({ ignoreInspector: true }), months);
  const guard = inspectorV1GuardFor(name, controls);
  const guardKey = getInspectorPrimaryGuard(name, controls);
  const guardControls = inspectorV1FilteredControls({ ignoreInspector: true, ignoreGuard: true }).filter(control => canonicalGuardName(control.garda) === guardKey);
  const guardAverage = inspectorV1AverageRow(buildInspectorStats(guardControls, months));
  const delta = guardAverage && guardAverage.monthly ? (stats.monthly - guardAverage.monthly) / guardAverage.monthly * 100 : null;
  const reportMetric = stats.reportDaysCount ? `<div><span>Timp mediu raport</span><strong>${escapeHtml(formatDays(stats.avgReportDays))}</strong></div>` : "";
  const recent = [...controls].sort((a, b) => new Date(getControlDateValue(b)) - new Date(getControlDateValue(a))).slice(0, 6);
  setHtml("inspectorV1DrawerContent", `<div class="inspector-v1-drawer-head"><span class="inspector-v1-drawer-icon"><svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="4"></circle><path d="M4 21c.8-5 3.5-7 8-7s7.2 2 8 7"></path></svg></span><div><small>Inspector</small><h2>${escapeHtml(name)}</h2><p>${escapeHtml(guard)}</p></div></div><div class="inspector-v1-drawer-primary"><strong>${stats.total}</strong><span>controale</span><b>${Number(stats.monthly || 0).toFixed(1)} controale / luna</b></div><div class="inspector-v1-drawer-metrics"><div><span>Cu probleme</span><strong>${formatPercent(stats.problemRate)}</strong></div><div><span>Din sesizari</span><strong>${formatPercent(stats.petitionShare)}</strong></div>${reportMetric}</div><div class="inspector-v1-drawer-delta ${delta !== null && delta < 0 ? "down" : "up"}">${delta === null ? "Comparatia cu media Garzii nu este disponibila" : `${delta >= 0 ? "+" : ""}${delta.toFixed(0)}% fata de media Garzii la activitate`}</div><div class="inspector-v1-sparkline"><canvas id="chartInspectorV1Sparkline"></canvas></div>${expanded ? `<div class="inspector-v1-profile-detail"><h3>Profil inspector</h3><div class="inspector-v1-type-summary">${Object.entries(stats.byType || {}).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([type, value]) => `<span>${escapeHtml(type)} <b>${value}</b></span>`).join("")}</div><h3>Controale recente</h3><div class="inspector-v1-recent-controls">${recent.map(control => `<button type="button" onclick="openControlFullModal('${escapeAttr(control.id)}')"><span>#${escapeHtml(control.id)} · ${escapeHtml(formatDay(getControlDateValue(control)))}</span><strong>${escapeHtml(resultLabel(control.result))}</strong></button>`).join("") || '<span>Nu exista controale recente.</span>'}</div></div>` : `<button class="inspector-v1-open-profile" type="button" onclick="openInspectorV1Profile()">Deschide profilul inspectorului <span aria-hidden="true">&rarr;</span></button>`}`);
  if (charts.chartInspectorV1Sparkline) charts.chartInspectorV1Sparkline.destroy();
  const keys = inspectorV1MonthKeys();
  const canvas = q("chartInspectorV1Sparkline");
  if (canvas) charts.chartInspectorV1Sparkline = new Chart(canvas, {
    type: "line",
    data: { labels: keys, datasets: [{ data: keys.map(key => Number(stats.byMonth?.[key] || 0)), borderColor: "#0b8f58", backgroundColor: "rgba(11,143,88,.10)", borderWidth: 2, pointRadius: 0, tension: .3, fill: true }] },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: { enabled: false }, valueLabelPlugin: { display: false } }, scales: { x: { display: false }, y: { display: false, beginAtZero: true } } }
  });
}

function openInspectorV1Summary(name) {
  inspectorV1DrawerName = name || "";
  inspectorV1DrawerExpanded = false;
  const drawer = q("inspectorV1Drawer");
  const backdrop = q("inspectorV1DrawerBackdrop");
  if (!drawer || !backdrop || !name) return;
  drawer.hidden = false;
  backdrop.hidden = false;
  requestAnimationFrame(() => drawer.classList.add("open"));
  drawer.setAttribute("aria-hidden", "false");
  inspectorV1RenderDrawer(name, false);
}

function openInspectorV1Profile() {
  if (!inspectorV1DrawerName) return;
  const name = inspectorV1DrawerName;
  closeInspectorV1Drawer();
  setInspectorV1Section("profile");
  selectInspectorV1Profile(name);
}

function closeInspectorV1Drawer() {
  const drawer = q("inspectorV1Drawer");
  const backdrop = q("inspectorV1DrawerBackdrop");
  if (drawer) {
    drawer.classList.remove("open", "expanded");
    drawer.hidden = true;
    drawer.setAttribute("aria-hidden", "true");
  }
  if (backdrop) backdrop.hidden = true;
  inspectorV1DrawerName = "";
  inspectorV1DrawerExpanded = false;
}

function setInspectorV1Section(section) {
  if (section === "reports") {
    setInspectorSection("reports");
    return;
  }
  if (typeof inspectorSection !== "undefined" && inspectorSection === "reports") {
    inspectorSection = "activity";
    syncInspectorSectionUi();
  }
  inspectorV1ActiveSection = ["overview", "comparative", "evolution", "profile", "matrix"].includes(section) ? section : "overview";
  if (q("inspectorV1Surface")) q("inspectorV1Surface").dataset.activeSection = inspectorV1ActiveSection;
  document.querySelectorAll("#inspectorV1Surface [data-inspector-v1-section]").forEach(button => {
    const active = button.dataset.inspectorV1Section === inspectorV1ActiveSection;
    button.classList.toggle("active", active);
    button.setAttribute("aria-selected", active ? "true" : "false");
  });
  const panels = { overview: "inspectorV1Overview", comparative: "inspectorV1Comparative", evolution: "inspectorV1Evolution", profile: "inspectorV1Profile", matrix: "inspectorV1Matrix" };
  Object.entries(panels).forEach(([key, id]) => { if (q(id)) q(id).hidden = key !== inspectorV1ActiveSection; });
  renderInspectorsV1();
}

function toggleInspectorV1FilterDrawer(force) {
  const drawer = q("inspectorV1FilterDrawer");
  if (!drawer) return;
  drawer.hidden = typeof force === "boolean" ? !force : !drawer.hidden;
}

function applyInspectorV1Filters(source = "") {
  if (source === "period") inspectorV1SyncPeriod(true);
  if (source === "custom" && q("inspectorV1Period")) q("inspectorV1Period").value = "custom";
  renderInspectorsV1();
}

function resetInspectorV1Filters() {
  const defaults = {
    inspectorV1Period: "last180",
    inspectorV1Guard: "toate",
    inspectorV1Inspector: "toate",
    inspectorV1Type: "toate",
    inspectorV1Result: "toate",
    inspectorV1Category: "toate",
    inspectorV1Metric: "monthly"
  };
  Object.entries(defaults).forEach(([id, value]) => { if (q(id)) q(id).value = value; });
  inspectorV1SyncPeriod(true);
  toggleInspectorV1FilterDrawer(false);
  renderInspectorsV1();
}

function renderInspectorsV1() {
  if (!isInternalMode || !q("inspectorV1Surface")) return;
  inspectorV1SyncPeriod(false);
  inspectorV1PopulateFilters();
  const controls = inspectorV1FilteredControls();
  const months = inspectorV1MonthsInRange(controls);
  const stats = inspectorV1EnrichStats(buildInspectorStats(controls, months), controls);
  const metric = inspectorV1SelectValue("inspectorV1Metric", "monthly");
  const rows = inspectorV1SortedRows(stats, metric);
  inspectorV1DirectoryRows = rows;
  inspectorV1DirectoryMetric = metric;
  inspectorV1DirectoryControls = controls;
  inspectorV1RenderKpis(stats, controls, months);
  inspectorV1EnsureComparisonSelectors(rows);
  if (inspectorV1ActiveSection === "overview") {
    inspectorV1RenderOverviewChart(rows, metric, controls);
    inspectorV1RenderRanking(rows, metric, controls);
    inspectorV1RenderCategories(controls);
  }
  if (inspectorV1ActiveSection === "comparative") inspectorV1RenderComparative(stats, months, controls);
  if (inspectorV1ActiveSection === "evolution") inspectorV1RenderEvolution(stats, months, controls);
  if (inspectorV1ActiveSection === "profile") renderInspectorV1Profile();
  if (inspectorV1ActiveSection === "matrix") inspectorV1RenderMatrix(rows, controls);
  if (inspectorV1DrawerName) inspectorV1RenderDrawer(inspectorV1DrawerName, inspectorV1DrawerExpanded);
}

window.setInspectorV1Section = setInspectorV1Section;
window.syncInspectorV1ComparativeControls = syncInspectorV1ComparativeControls;
window.applyInspectorV1Filters = applyInspectorV1Filters;
window.resetInspectorV1Filters = resetInspectorV1Filters;
window.toggleInspectorV1FilterDrawer = toggleInspectorV1FilterDrawer;
window.renderInspectorsV1 = renderInspectorsV1;
window.openInspectorV1Summary = openInspectorV1Summary;
window.openInspectorV1Profile = openInspectorV1Profile;
window.closeInspectorV1Drawer = closeInspectorV1Drawer;
window.openInspectorV1Directory = openInspectorV1Directory;
window.closeInspectorV1Directory = closeInspectorV1Directory;
window.renderInspectorV1Directory = renderInspectorV1Directory;
window.toggleInspectorV1MatrixConfig = toggleInspectorV1MatrixConfig;
window.setInspectorV1MatrixMetric = setInspectorV1MatrixMetric;
window.toggleInspectorV1Categories = toggleInspectorV1Categories;
window.renderInspectorProfileSuggestions = renderInspectorProfileSuggestions;
window.handleInspectorProfileSearchKey = handleInspectorProfileSearchKey;
window.handleInspectorProfileGuardChange = handleInspectorProfileGuardChange;
window.selectInspectorV1Profile = selectInspectorV1Profile;
window.clearInspectorV1Profile = clearInspectorV1Profile;
window.renderInspectorV1Profile = renderInspectorV1Profile;
window.toggleInspectorProfileTypes = toggleInspectorProfileTypes;
window.toggleInspectorProfileControls = toggleInspectorProfileControls;
window.compareSelectedInspectorV1 = compareSelectedInspectorV1;
window.setInspectorProfileAnalysisTab = setInspectorProfileAnalysisTab;
window.setInspectorProfileStructureTab = setInspectorProfileStructureTab;
window.selectInspectorProfileCategoryDomain = selectInspectorProfileCategoryDomain;
window.handleInspectorProfileCategorySelection = handleInspectorProfileCategorySelection;
window.handleInspectorProfileMetricChange = handleInspectorProfileMetricChange;
window.buildInspectorCategoryMatrixData = buildInspectorCategoryMatrixData;
