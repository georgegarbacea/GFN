    const q = id => document.getElementById(id);
    const safeValue = (id, fallback = "") => q(id) ? q(id).value : fallback;
    function toAsciiText(value) {
      const replacements = {
        "\u0103": "a", "\u00e2": "a", "\u00ee": "i", "\u0219": "s", "\u015f": "s", "\u021b": "t", "\u0163": "t",
        "\u0102": "A", "\u00c2": "A", "\u00ce": "I", "\u0218": "S", "\u015e": "S", "\u021a": "T", "\u0162": "T",
        "\u00c4\u0192": "a", "\u00c4\u201a": "A", "\u00c3\u00a2": "a", "\u00c3\u0082": "A", "\u00c3\u00ae": "i", "\u00c3\u017d": "I",
        "\u00c8\u2122": "s", "\u00c8\u0161": "S", "\u00c8\u203a": "t", "\u00c8\u0162": "T",
        "\u00c5\u0178": "s", "\u00c5\u017d": "S", "\u00c5\u00a3": "t", "\u00c5\u00a2": "T",
        "\u00c2\u00b7": "-", "\u2022": "-", "\u2013": "-", "\u2014": "-"
      };
      let text = String(value ?? "");
      Object.entries(replacements).forEach(([from, to]) => { text = text.split(from).join(to); });
      return text;
    }
    const setText = (id, value) => { if (q(id)) q(id).textContent = toAsciiText(value); };
    const setHtml = (id, value) => { if (q(id)) q(id).innerHTML = value; };

    function isCollapseOpen(id) {
      const el = q(id);
      return Boolean(el && el.classList.contains("open"));
    }

    function refreshCharts() {
      Object.values(charts || {}).forEach(chart => {
        if (chart && typeof chart.resize === "function") chart.resize();
      });
    }

    function toggleCollapse(id) {
      const el = q(id);
      if (!el) return;
      const open = el.classList.toggle("open");
      const toggle = el.querySelector(".gfn-collapse-toggle");
      const trigger = el.querySelector("[aria-expanded]");
      if (toggle) toggle.textContent = open ? "Inchide" : "Deschide";
      if (trigger) trigger.setAttribute("aria-expanded", open ? "true" : "false");
      if (open) setTimeout(() => {
        renderCurrentView();
        refreshCharts();
      }, 80);
    }

    function openCollapse(id) {
      const el = q(id);
      if (!el || el.classList.contains("open")) return;
      el.classList.add("open");
      const toggle = el.querySelector(".gfn-collapse-toggle");
      const trigger = el.querySelector("[aria-expanded]");
      if (toggle) toggle.textContent = "Inchide";
      if (trigger) trigger.setAttribute("aria-expanded", "true");
    }

    function showMoreInspectors() {
      inspectorIndexLimit += 8;
      renderInspectorsView();
    }

    function showMoreInspectorControls() {
      inspectorControlsLimit += 11;
      renderInspectorsView();
    }

    function showMoreEntityLatestControls() {
      entityLatestLimit += 5;
      renderEntitiesView();
    }

    function showMorePetitions() {
      petitionHistoryLimit += 8;
      renderPetitionsView();
    }

    function toggleExtraCharts(id, button) {
      const el = q(id);
      if (!el) return;
      const open = el.classList.toggle("show-all");
      if (button) button.textContent = open ? "Mai putine statistici" : "Mai multe statistici";
      setTimeout(refreshCharts, 60);
    }

    let token = null;
    let currentUser = null;
    let isInternalMode = false;
    let allControls = [];
    let filteredControls = [];
    let reportWorkflowItems = [];
    let reportWorkflowLoaded = false;
    let linkedMapFilterLabel = "";
    let reportWorkflowFocusId = null;
    let inspectorSection = "activity";
    let reportStatsMap = null;
    let reportStatsLayer = null;
    let entityTimelineLimit = 20;
    let entityTimelineKey = "";
    let inspectorIndexLimit = 5;
    let inspectorControlsLimit = 11;
    let entityLatestLimit = 5;
    let petitionHistoryLimit = 8;
    let currentView = "map";
    let map = null;
    let markersLayer = null;
    let controlRenderer = null;
    let mapRenderControls = [];
    let markerRenderTimer = null;
    let inspectorFocusMarker = null;
    let gardaLayer = null;
    let gardaNameLayer = null;
    let currentBaseLayer = null;
    let currentLabelLayer = null;
    let guardStatsMap = null;
    let guardStatsLayer = null;
    let guardStatsBaseLayer = null;
    let guardStatsLabelLayer = null;
    let guardStatsGeoJson = null;
    let guardCenterCache = null;
    let entityStatsMap = null;
    let entityStatsLayer = null;
    let entityStatsBaseLayer = null;
    let entityStatsLabelLayer = null;
    let selectedEntityHistoryYear = "";
    let inspectorCompareNames = [];
    let selectedInspectorName = "";
    let inspectorSortMode = "activity";
    let inspectorRankingMode = "controls";
    let inspectorSuggestionTimer = null;
    let inspectorSuggestionIndex = -1;
    let inspectorFilterDrawerInitialized = false;
    let inspectorFilterState = {
      periodPreset: "last180",
      dateFrom: "",
      dateTo: "",
      guard: "toate",
      type: "toate",
      result: "toate"
    };
    const charts = {};
    const MAP_CLUSTER_ZOOM_THRESHOLD = 8;
    const MAP_GUARD_CLUSTER_ZOOM_THRESHOLD = 8;
    const MAP_CLUSTER_CELL_SIZE = 54;
    const MAP_CLUSTER_MIN_CONTROLS = 350;
    const MAP_GUARD_CLUSTER_MIN_CONTROLS = 120;
    let selectedControlId = null;
    let selectedPopupControlId = null;
    let isRenderingMarkers = false;
    let mapPointMode = false;
    let mapClusterMode = "guard";

    const NAV_PUBLIC = [
      { id: "map", icon: "MAP", label: "Controale", title: "Controale", subtitle: "", pill: "Harta" },
      { id: "garzi", icon: "GF", label: "Garzi", title: "Garzi", subtitle: "", pill: "Analiza" },
      { id: "petitions", icon: "SES", label: "Petitii", title: "Petitii", subtitle: "", pill: "Sesizari" },
      { id: "report", icon: "RPT", label: "Raport", title: "Raport institutional", subtitle: "", pill: "Raport" }
    ];
    const NAV_INTERNAL = [
      { id: "map", icon: "MAP", label: "Controale", title: "Controale", subtitle: "", pill: "Harta" },
      { id: "garzi", icon: "GF", label: "Garzi", title: "Garzi", subtitle: "", pill: "Analiza" },
      { id: "inspectori", icon: "INSP", label: "Inspectori", title: "Inspectori", subtitle: "", pill: "Analiza" },
      { id: "entities", icon: "ENT", label: "Entitati", title: "Entitati", subtitle: "", pill: "Istoric" },
      { id: "petitions", icon: "SES", label: "Petitii", title: "Petitii", subtitle: "", pill: "Sesizari" },
      { id: "report", icon: "RPT", label: "Raport", title: "Raport institutional", subtitle: "", pill: "Raport" }
    ];

    const CONTROL_DOMAINS = [
      { value: "silvic", label: "Domeniul silvic", categories: ["Control de fond", "Control partial", "Instalatii / depozite materiale lemnoase", "Exploatarea masei lemnoase", "Control anual regenerari", "Lucrari regenerare / impadurire", "Verificarea actelor de punere in valoare", "Controlul circulatiei materialelor lemnoase"] },
      { value: "cinegetic", label: "Domeniul cinegetic", categories: ["Control de fond", "Criterii de licentiere", "Respectarea prevederilor legale la vanatoare", "Populare / repopulare", "Prevenire / combatere braconaj", "Studii de evaluare in teren", "Procese-verbale de pagube"] }
    ];

    const GFN_COLORS = Object.freeze({
      scale: Object.freeze([
        "#ff5a52", "#ff7417", "#ffab1f", "#f7c62f",
        "#9ee000", "#75d800", "#25c66f", "#0b8f58"
      ]),
      status: Object.freeze({
        conform: "#25c66f",
        neconform: "#ff5a52",
        avertisment: "#ffab1f",
        sanctiune: "#38a9ff",
        sesizare_penala: "#a970ff",
        necunoscut: "#94a3ad",
        missing: "#a5afb6"
      }),
      role: Object.freeze({
        activity: "#38a9ff",
        positive: "#25c66f",
        document: "#22b8e6",
        attention: "#ffab1f",
        risk: "#ff5a52",
        action: "#18b86c"
      })
    });
    const INSPECTOR_COMPARE_COLORS = [
      GFN_COLORS.status.conform,
      GFN_COLORS.role.document,
      GFN_COLORS.status.avertisment,
      GFN_COLORS.status.sesizare_penala,
      GFN_COLORS.status.neconform
    ];
    const chartColors = {
      green: GFN_COLORS.status.conform,
      darkGreen: GFN_COLORS.scale[7],
      lime: GFN_COLORS.scale[4],
      teal: GFN_COLORS.role.document,
      blue: GFN_COLORS.status.sanctiune,
      amber: GFN_COLORS.status.avertisment,
      orange: GFN_COLORS.scale[1],
      yellow: GFN_COLORS.scale[3],
      coral: GFN_COLORS.status.neconform,
      red: GFN_COLORS.status.neconform,
      purple: GFN_COLORS.status.sesizare_penala,
      gray: GFN_COLORS.status.necunoscut,
      missing: GFN_COLORS.status.missing,
      neutral: "rgba(148,163,173,.28)",
      grid: "rgba(175,255,220,.10)",
      text: "rgba(244,251,248,.88)"
    };
    const palette = GFN_COLORS.scale;
    const QUANTITATIVE_PALETTE = GFN_COLORS.scale;
    const RISK_QUANTITATIVE_METRICS = new Set([
      "problemRate", "problems", "nonconformities",
      "sanctionRate", "sanctions", "criminalReferrals",
      "petitionShare", "reportAvgDays", "petitionAvgDays",
      "missingReports", "overdueReports", "overdueRate",
      "finePerControl", "fines", "damagePerControl", "damage"
    ]);

    function isRiskQuantitativeMetric(metricKey) {
      return RISK_QUANTITATIVE_METRICS.has(String(metricKey || ""));
    }

    function quantitativePaletteForMetric(metricKey) {
      return isRiskQuantitativeMetric(metricKey) ? [...QUANTITATIVE_PALETTE].reverse() : [...QUANTITATIVE_PALETTE];
    }
    Chart.defaults.color = chartColors.text;
    Chart.defaults.borderColor = chartColors.grid;
    Chart.defaults.font.family = "Inter, Arial, system-ui, sans-serif";
    Chart.defaults.font.size = 13;
    Chart.defaults.font.weight = "500";
    Chart.defaults.plugins.legend.labels.color = chartColors.text;
    Chart.defaults.plugins.legend.labels.boxWidth = 12;
    Chart.defaults.plugins.legend.labels.boxHeight = 12;
    Chart.defaults.plugins.legend.labels.padding = 16;
    Chart.defaults.plugins.legend.labels.font = { size: 13, weight: "600" };
    Chart.defaults.plugins.tooltip.backgroundColor = "rgba(4, 28, 27, .96)";
    Chart.defaults.plugins.tooltip.borderColor = "rgba(164, 230, 213, .22)";
    Chart.defaults.plugins.tooltip.borderWidth = 1;
    Chart.defaults.plugins.tooltip.titleColor = "#ffffff";
    Chart.defaults.plugins.tooltip.bodyColor = chartColors.text;
    Chart.defaults.plugins.tooltip.padding = 12;
    Chart.defaults.plugins.tooltip.cornerRadius = 10;

    const valueLabelPlugin = {
      id: "valueLabelPlugin",
      afterDatasetsDraw(chart) {
        if (chart.config.type === "doughnut") return;
        if (chart.options?.plugins?.valueLabelPlugin?.display === false) return;
        const ctx = chart.ctx;
        const dataset = chart.data.datasets[0];
        if (!dataset || !dataset.data) return;
        ctx.save();
        ctx.font = "bold 11px Inter, Arial, sans-serif";
        ctx.textAlign = "center";
        ctx.fillStyle = "#ffffff";
        ctx.shadowColor = "rgba(0,0,0,.8)";
        ctx.shadowBlur = 4;
        const meta = chart.getDatasetMeta(0);
        meta.data.forEach((el, i) => {
          const value = Number(dataset.data[i] || 0);
          if (!value) return;
          const props = el.getProps(["x", "y"], true);
          const label = Number.isInteger(value) ? String(value) : value.toFixed(1);
          const safeY = Math.max(chart.chartArea.top + 14, props.y - 8);
          ctx.fillText(label, props.x, safeY);
        });
        ctx.restore();
      }
    };
    Chart.register(valueLabelPlugin);

    function setMessage(text, ok = false) {
      const msg = q("msg");
      if (!msg) return;
      msg.textContent = toAsciiText(text || "");
      msg.className = ok ? "msg ok" : "msg";
    }

    function normalizeText(value) {
      return String(value || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[aa]/g, "a").replace(/[i]/g, "i").replace(/[ss]/g, "s").replace(/[tt]/g, "t").replace(/[\/_-]+/g, " ").replace(/\s+/g, " ").trim();
    }

    function normalizeNumber(value) {
      if (value === null || value === undefined || value === "") return 0;
      if (typeof value === "number") return isNaN(value) ? 0 : value;
      const s = String(value).replace(/RON/gi, "").replace(/lei/gi, "").replace(/\s/g, "").replace(/\./g, "").replace(",", ".").trim();
      const n = Number(s);
      return isNaN(n) ? 0 : n;
    }

    function firstValue(obj, keys) {
      for (const k of keys) if (obj && obj[k] !== undefined && obj[k] !== null && obj[k] !== "") return obj[k];
      return "";
    }

    function normalizeDomainValue(value) {
      const t = normalizeText(value);
      if (!t) return "";
      if (t.includes("cinegetic") || t.includes("vanatoare")) return "cinegetic";
      if (t.includes("silvic") || t.includes("forestier") || t.includes("padure")) return "silvic";
      return t;
    }

    function getDomainConfig(value) { return CONTROL_DOMAINS.find(d => d.value === normalizeDomainValue(value)) || null; }
    function makeCategoryFilterValue(domainKey, category) { return domainKey + "|" + category; }
    function parseCategoryFilter(value) {
      if (!value || value === "toate") return { domainKey: "", category: "", categoryNorm: "" };
      if (String(value).includes("|")) {
        const parts = String(value).split("|");
        return { domainKey: parts[0], category: parts.slice(1).join("|"), categoryNorm: normalizeText(parts.slice(1).join("|")) };
      }
      return { domainKey: "", category: value, categoryNorm: normalizeText(value) };
    }
    function findCategoryConfig(category, domainKey = "") {
      const cn = normalizeText(category);
      if (!cn) return null;
      const domains = domainKey ? CONTROL_DOMAINS.filter(d => d.value === domainKey) : CONTROL_DOMAINS;
      for (const d of domains) {
        const found = d.categories.find(c => normalizeText(c) === cn);
        if (found) return { domain: d, label: found };
      }
      return null;
    }
    function getControlDomainRaw(c) { return firstValue(c, ["domeniu_control", "domeniu", "control_domain", "domain"]); }
    function getControlDomainKey(c) { return normalizeDomainValue(getControlDomainRaw(c)); }
    function getControlCategoryRaw(c) { return firstValue(c, ["categorie_control", "categoria_controlului", "control_category", "categorie", "category"]); }
    function getControlCategory(c) { const raw = getControlCategoryRaw(c); const found = findCategoryConfig(raw, getControlDomainKey(c)); return found ? found.label : raw; }
    function categoryMatchesControl(c, filterValue) {
      if (!filterValue || filterValue === "toate") return true;
      const parsed = parseCategoryFilter(filterValue);
      const cn = normalizeText(getControlCategoryRaw(c));
      const dk = getControlDomainKey(c);
      if (parsed.domainKey && dk && dk !== parsed.domainKey) return false;
      return cn === parsed.categoryNorm;
    }

    function getEntityName(c) { return firstValue(c, ["entitate_controlata", "entitate", "entity", "operator", "ocol"]); }
    function getEntityTypeRaw(c) {
      return firstValue(c, ["tip_entitate", "entity_type", "tip_entitate_controlata", "subtip_entitate", "tip_ocol", "regim_ocol"]);
    }
    function getEntityTypeKey(c) {
      const raw = normalizeText(getEntityTypeRaw(c));
      if (!raw) return "alta_entitate";
      if (raw.includes("ocol")) {
        if (raw.includes("stat") || raw.includes("public")) return "ocol_stat";
        if (raw.includes("privat")) return "ocol_privat";
        return "ocol_silvic";
      }
      if (raw.includes("operator") || raw.includes("societ") || raw.includes("firma")) return "operator_economic";
      if (raw.includes("primar")) return "primarie";
      if (raw.includes("persoan") && raw.includes("fiz")) return "persoana_fizica";
      if (raw.includes("gestionar") || raw.includes("fond cinegetic") || raw.includes("cinegetic")) return "gestionar_cinegetic";
      return "alta_entitate";
    }
    function getEntityTypeLabel(c) {
      const key = getEntityTypeKey(c);
      return {
        ocol_stat: "Ocol silvic de stat",
        ocol_privat: "Ocol silvic privat",
        ocol_silvic: "Ocol silvic",
        operator_economic: "Operator economic",
        primarie: "Primarie",
        persoana_fizica: "Persoana fizica",
        gestionar_cinegetic: "Gestionar fond cinegetic",
        alta_entitate: getEntityTypeRaw(c) || "Alta entitate"
      }[key] || getEntityTypeRaw(c) || "Alta entitate";
    }
    function getPetitionerName(c) { return firstValue(c, ["nume_petitionar", "petitionar", "nume_petent"]); }
    function getPetitionNumber(c) { return firstValue(c, ["numar_sesizare", "numar_petitie", "nr_sesizare", "nr_petitie"]); }
    function getPetitionSubject(c) {
      const value = firstValue(c, ["obiect_sesizare", "descriere_sesizare", "rezumat_sesizare", "continut_sesizare", "motiv_sesizare"]);
      if (Array.isArray(value)) return value.filter(Boolean).join(", ");
      if (value) return value;
      const category = getControlCategory(c);
      const domain = getControlDomainRaw(c);
      if (category || domain) return [domain, category].filter(Boolean).join(" - ");
      return "";
    }
    function getPetitionFinding(c) { return firstValue(c, ["constatari_publice", "descriere_abatere", "descriere_fapta", "abatere", "fapta", "constatari"]); }
    function getPetitionMeasures(c) { return firstValue(c, ["masuri_publice", "masuri_dispuse", "masuri", "masura_dispusa"]); }
    function isPetition(c) { return Boolean(c.este_sesizare || getPetitionNumber(c) || c.control_type === "sesizare"); }
    function getInspectorNames(c) { return Array.isArray(c.echipa) ? c.echipa.map(x => x.nume).filter(Boolean).join(", ") || "-" : "-"; }
    function getOptionalAmount(c, keys) {
      for (const key of keys) {
        if (!c || !Object.prototype.hasOwnProperty.call(c, key)) continue;
        const raw = c[key];
        if (raw === null || raw === undefined || raw === "") return Number.NaN;
        const amount = normalizeNumber(raw);
        return Number.isFinite(amount) ? amount : Number.NaN;
      }
      return Number.NaN;
    }
    function getFineAmount(c) { return getOptionalAmount(c, ["cuantum_amenda_ron", "cuantum_amenda", "amenda_ron", "valoare_amenda", "valoare_amenda_ron", "amenda"]); }
    function getDamageAmount(c) { return getOptionalAmount(c, ["valoare_prejudiciu_ron", "prejudiciu_ron", "valoare_prejudiciu", "prejudiciu"]); }
    function getViolationText(c) { return firstValue(c, ["descriere_abatere", "descriere_fapta", "abatere", "fapta", "constatari"]); }
    function getMeasuresText(c) { return firstValue(c, ["masuri_dispuse", "masuri", "masura_dispusa"]); }
    function getLegalBasis(c) {
      const act = firstValue(c, ["act_normativ", "lege", "baza_legala", "temei_legal", "temei", "act_normativ_sanctiune"]);
      const article = firstValue(c, ["articol", "articol_sanctiune", "articol_lege"]);
      if (act && article) return normalizeText(article).startsWith("art") ? `${act}, ${article}` : `${act}, art. ${article}`;
      return act || article || "";
    }
    function getControlModeLabel(c) {
      const mode = firstValue(c, ["mod_desfasurare", "mod_control", "tip_control_operational", "tip_desfasurare"]);
      const partners = Array.isArray(c.parteneri) ? c.parteneri.filter(Boolean) : [];
      const isMixed = normalizeText(mode).includes("mixt") || partners.length > 0;
      const base = isMixed ? "Mixt" : "Propriu";
      const detail = mode || c.control_type || "";
      if (!detail) return base;
      const dn = normalizeText(detail);
      if (dn === normalizeText(base) || dn === "control mixt" || dn === "control propriu") return base;
      return `${base} - ${detail}`;
    }
    function getControlTimeLabel(c) {
      const raw = firstValue(c, ["ora_control", "created_at"]);
      if (!raw) return "";
      if (String(raw).includes(":") && !String(raw).includes("T")) return String(raw).slice(0, 5);
      try { return new Date(raw).toLocaleTimeString("ro-RO", { hour: "2-digit", minute: "2-digit" }); } catch { return ""; }
    }
    function dateFromParts(y, m, d) {
      const year = Number(y), month = Number(m), day = Number(d);
      if (!year || !month || !day || month < 1 || month > 12 || day < 1 || day > 31) return null;
      const date = new Date(year, month - 1, day);
      return isNaN(date.getTime()) ? null : date;
    }
    function parseLooseDate(value) {
      const raw = String(value || "");
      if (!raw.trim()) return null;
      let m = raw.match(/\b(\d{4})[.\-\/](\d{1,2})[.\-\/](\d{1,2})\b/);
      if (m) return dateFromParts(m[1], m[2], m[3]);
      m = raw.match(/\b(\d{1,2})[.\-\/](\d{1,2})[.\-\/](\d{4})\b/);
      if (m) return dateFromParts(m[3], m[2], m[1]);
      return null;
    }
    function getPetitionRegisteredDate(c) {
      return parseLooseDate(firstValue(c, ["data_sesizare", "data_inregistrare_sesizare", "data_petitie", "data_numar_sesizare"])) || parseLooseDate(getPetitionNumber(c));
    }
    function getControlDateValue(c) {
      return parseLooseDate(firstValue(c, ["data_control"])) || (c.created_at ? new Date(c.created_at) : null);
    }
    function getPetitionResponseDays(c) {
      return getControlDaysToReport(c);
    }
    function getPetitionResponseText(c) {
      const days = getPetitionResponseDays(c);
      const hasReport = getControlHasReport(c);
      if (days === null || days === undefined || isNaN(days)) return "Timp de raspuns in calcul";
      if (hasReport) return `Raport final incarcat in ${formatDays(days)}`;
      return `${formatDays(days)} de la control, raport neincarcat`;
    }
    function getPetitionReportStatus(c) {
      const hasReport = getControlHasReport(c);
      const days = getPetitionResponseDays(c);
      if (hasReport) return { label: "Finalizat", className: "done" };
      if (Number(days) > 10) return { label: "Intarziat", className: "late" };
      if (Number(days) > 5) return { label: "Fara raport", className: "warn" };
      return { label: "Fara raport", className: "ok" };
    }
    function getPetitionConfirmation(c) {
      const r = normalizeText(c.result);
      if (["neconform", "sanctiune", "sesizare penala"].includes(r)) return { label: "Confirmata", className: "confirmed" };
      if (r === "avertisment") return { label: "Confirmata partial", className: "partial" };
      if (r === "conform") return { label: "Neconfirmata", className: "rejected" };
      return { label: "In analiza", className: "pending" };
    }
    function computePetitionResponseStats(arr) {
      const days = arr.map(getPetitionResponseDays).filter(v => v !== null);
      const avg = days.length ? days.reduce((sum, v) => sum + v, 0) / days.length : null;
      const sorted = [...days].sort((a, b) => a - b);
      const median = sorted.length ? sorted[Math.floor(sorted.length / 2)] : null;
      return {
        count: days.length,
        avg,
        median,
        max: sorted.length ? sorted[sorted.length - 1] : null,
        buckets: {
          "0-7 zile": days.filter(v => v <= 7).length,
          "8-15 zile": days.filter(v => v >= 8 && v <= 15).length,
          "16-30 zile": days.filter(v => v >= 16 && v <= 30).length,
          "30+ zile": days.filter(v => v > 30).length
        }
      };
    }
    function formatDays(value) {
      if (value === null || value === undefined || isNaN(value)) return "-";
      const rounded = Math.round(value);
      return rounded === 1 ? "1 zi" : `${rounded} zile`;
    }
    function getControlHasReport(c) {
      return Boolean(c && (c.has_report || c.report_uploaded_at || c.report_status === "finalizat"));
    }
    function getControlStartDateValue(c) {
      return firstValue(c, ["field_submitted_at", "data_control", "created_at"]);
    }
    function getControlFinalDateValue(c) {
      return getControlHasReport(c) ? firstValue(c, ["report_uploaded_at"]) : new Date();
    }
    function daysBetweenDates(start, end) {
      const s = start instanceof Date ? start : new Date(start);
      const e = end instanceof Date ? end : new Date(end);
      if (isNaN(s) || isNaN(e)) return null;
      const sd = new Date(s.getFullYear(), s.getMonth(), s.getDate());
      const ed = new Date(e.getFullYear(), e.getMonth(), e.getDate());
      return Math.max(0, Math.round((ed - sd) / 86400000));
    }
    function getControlDaysToReport(c) {
      const explicit = Number(c && c.days_to_report);
      if (Number.isFinite(explicit)) return explicit;
      const legacy = Number(c && c.days_since_field);
      if (Number.isFinite(legacy)) return legacy;
      return daysBetweenDates(getControlStartDateValue(c), getControlFinalDateValue(c));
    }
    function getResponseTimeLevel(days, hasReport = false) {
      if (hasReport) return "finalized";
      if (days === null || days === undefined || isNaN(days) || Number(days) <= 5) return "green";
      if (Number(days) <= 10) return "yellow";
      return "red";
    }

    function colorByReportDays(days) {
      const value = Number(days);
      if (!Number.isFinite(value)) return chartColors.gray;
      if (value <= 5) return chartColors.green;
      if (value <= 10) return chartColors.orange;
      return chartColors.red;
    }

    function reportDaysStatusClass(days) {
      const value = Number(days);
      if (!Number.isFinite(value)) return "muted";
      if (value <= 5) return "good";
      if (value <= 10) return "warn";
      return "late";
    }
    function renderResponseTimeBar(days, hasReport = false) {
      const numericDays = Number(days);
      if (!Number.isFinite(numericDays)) {
        return `<div class="response-time-bar response-time-green"><div class="response-time-meta"><span class="response-time-label">date insuficiente</span><span class="response-time-badge">in calcul</span></div><div class="response-time-track"><i class="response-time-fill" style="width:0%"></i></div></div>`;
      }
      const rounded = Math.max(0, Math.round(numericDays));
      const level = getResponseTimeLevel(rounded, hasReport);
      const pct = Math.max(2, Math.min(100, (rounded / 30) * 100));
      const badge = hasReport ? "finalizat" : rounded <= 5 ? "in termen" : rounded <= 10 ? "atentie" : "intarziat";
      const label = hasReport ? `finalizat in ${formatDays(rounded)}` : `${formatDays(rounded)} fara raport`;
      return `<div class="response-time-bar response-time-${level}">
        <div class="response-time-meta">
          <span class="response-time-label">${escapeHtml(label)}</span>
          <span class="response-time-badge">${escapeHtml(badge)}</span>
        </div>
        <div class="response-time-track">
          <i class="response-time-fill" style="width:${pct}%"></i>
          <em class="response-time-marker" style="left:${pct}%">${escapeHtml(formatDays(rounded))}</em>
        </div>
      </div>`;
    }
    function averageDays(values) {
      const nums = values.map(v => Number(v)).filter(v => Number.isFinite(v));
      return nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : null;
    }
    function isProblemResult(r) { return ["neconform", "sanctiune", "sesizare_penala", "mixt"].includes(r); }
    function resultLabel(r) { return ({ conform: "Conform", neconform: "Neconform", avertisment: "Avertisment", sanctiune: "Sanctiune", sesizare_penala: "Sesizare penala", mixt: "Mixt", necunoscut: "Necunoscut" })[r] || r || "-"; }
    function colorByResult(r) { return ({ conform: chartColors.green, neconform: chartColors.red, avertisment: chartColors.amber, sanctiune: chartColors.blue, sesizare_penala: chartColors.purple, mixt: chartColors.amber, necunoscut: chartColors.gray })[r] || chartColors.gray; }
    function formatDate(v) { if (!v) return "-"; try { return new Date(v).toLocaleString("ro-RO"); } catch { return v; } }
    function formatDay(v) { if (!v) return "-"; try { return new Date(v).toLocaleDateString("ro-RO"); } catch { return v; } }
    function toIsoDate(d) { return d.toISOString().slice(0, 10); }
    function formatLei(v) {
      if (v === null || v === undefined || v === "") return "Date indisponibile";
      const amount = typeof v === "number" ? v : normalizeNumber(v);
      return Number.isFinite(amount)
        ? amount.toLocaleString("ro-RO", { maximumFractionDigits: 2 }) + " lei"
        : "Date indisponibile";
    }
    function formatMoney(v) { return formatLei(v); }
    function gardaShortLabel(name) { const m = {"Garda Forestiera Brasov":"BV","Garda Forestiera Bucuresti":"B","Garda Forestiera Cluj":"CJ","Garda Forestiera Suceava":"SV","Garda Forestiera Timisoara":"TM","Garda Forestiera Ramnicu Valcea":"RV","Garda Forestiera Focsani":"VN","Garda Forestiera Oradea":"BH","Garda Forestiera Ploiesti":"PH"}; return m[name] || (name || "-").replace("Garda Forestiera ", "").split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 3); }

    const GUARD_FOREST_AREA_HA = {
      brasov: 1052021,
      bucuresti: 177378.29,
      cluj: 836921.18,
      focsani: 588137,
      oradea: 580810,
      ploiesti: 542266.96,
      "ramnicu valcea": 774224.35,
      suceava: 1128751,
      timisoara: 1183505
    };

    const GUARD_DISPLAY_NAMES = {
      bucuresti: "Garda Forestiera Bucuresti",
      brasov: "Garda Forestiera Brasov",
      cluj: "Garda Forestiera Cluj",
      suceava: "Garda Forestiera Suceava",
      timisoara: "Garda Forestiera Timisoara",
      "ramnicu valcea": "Garda Forestiera Ramnicu-Valcea",
      focsani: "Garda Forestiera Focsani",
      oradea: "Garda Forestiera Oradea",
      ploiesti: "Garda Forestiera Ploiesti"
    };

    function countBy(arr, getter) {
      const out = {};
      arr.forEach(x => { const k = getter(x) || "Necunoscut"; out[k] = (out[k] || 0) + 1; });
      return out;
    }
    function sumBy(arr, getter) {
      let total = 0;
      let hasValue = false;
      for (const item of arr) {
        const raw = getter(item);
        if (raw === null || raw === undefined || raw === "" || Number.isNaN(raw)) return Number.NaN;
        const value = typeof raw === "number" ? raw : normalizeNumber(raw);
        if (!Number.isFinite(value)) return Number.NaN;
        total += value;
        hasValue = true;
      }
      return hasValue ? total : Number.NaN;
    }
    function topEntries(counts, n = 10) { return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, n); }

    function getFilters() {
      return {
        result: safeValue("resultFilter", "toate"),
        garda: safeValue("gardaFilter", "toate"),
        controlType: safeValue("controlTypeFilter", "toate"),
        category: safeValue("categoryFilter", "toate"),
        dateFrom: safeValue("dateFrom", ""),
        dateTo: safeValue("dateTo", "")
      };
    }

    function filterControls() {
      const f = getFilters();
      let arr = [...allControls];
      if (f.result !== "toate") arr = arr.filter(c => c.result === f.result);
      if (f.garda !== "toate") arr = arr.filter(c => canonicalGuardName(c.garda) === f.garda || c.garda === f.garda);
      if (f.controlType !== "toate") arr = arr.filter(c => c.control_type === f.controlType);
      if (f.category !== "toate") arr = arr.filter(c => categoryMatchesControl(c, f.category));
      if (f.dateFrom) arr = arr.filter(c => new Date(c.created_at) >= new Date(f.dateFrom));
      if (f.dateTo) arr = arr.filter(c => new Date(c.created_at) <= new Date(f.dateTo + "T23:59:59"));
      return arr;
    }

    function isAdminUser() {
      return currentUser && ["admin", "inspector_general", "ministru", "inspector_sef", "director_national"].includes(currentUser.role);
    }

    function navItemForCurrentUser(item) {
      if (item.id === "reports-workflow" && isAdminUser()) {
        return {
          ...item,
          label: "Finalizare",
          title: "Finalizare controale",
          subtitle: ""
        };
      }
      return item;
    }

    function getAvailableNavItems() {
      return isInternalMode ? NAV_INTERNAL.map(navItemForCurrentUser) : NAV_PUBLIC;
    }

    function renderNav() {
      const nav = getAvailableNavItems();
      setHtml("navButtons", nav.map(item => {
        const active = item.id === currentView;
        return `<button type="button" role="tab" class="nav-btn ${active ? "active" : ""}" data-view="${escapeAttr(item.id)}" aria-selected="${active}" aria-controls="view-${escapeAttr(item.id)}" tabindex="${active ? "0" : "-1"}"><span class="nav-icon" aria-hidden="true">${item.icon}</span><span class="nav-label">${item.label}</span></button>`;
      }).join(""));
      q("navButtons")?.querySelectorAll(".nav-btn[data-view]").forEach(button => {
        button.addEventListener("click", () => setView(button.dataset.view));
      });
    }

    function syncViewChrome() {
      document.body.classList.toggle("map-view-active", currentView === "map");
      document.body.dataset.currentView = currentView;
    }
    function applyMainView(view) {
      currentView = view;
      syncViewChrome();
      renderNav();
      document.querySelectorAll(".view").forEach(el => el.classList.remove("active"));
      const section = q("view-" + view);
      if (section) section.classList.add("active");
      const nav = getAvailableNavItems().find(x => x.id === view) || getAvailableNavItems()[0] || NAV_PUBLIC[0];
      setText("viewTitle", nav.title);
      setText("viewSubtitle", nav.subtitle);
      setText("viewPill", nav.pill);
      renderCurrentView();
      if (view === "map") setTimeout(() => { if (map) map.invalidateSize(); }, 160);
      if (view === "garzi") setTimeout(() => { renderGuardStatsMap(); if (guardStatsMap) guardStatsMap.invalidateSize(); }, 180);
      if (view === "entities") setTimeout(() => { renderEntityStatsMap(); if (entityStatsMap) entityStatsMap.invalidateSize(); }, 180);
    }

    function setView(view) {
      applyMainView(view);
    }

    function syncInspectorSectionUi() {
      const activity = q("inspectorActivitySection");
      const reports = q("inspectorReportsSection");
      if (activity) activity.hidden = inspectorSection !== "activity";
      if (reports) reports.hidden = inspectorSection !== "reports";
      document.querySelectorAll(".inspector-section-tab[data-inspector-section]").forEach(button => {
        const active = button.dataset.inspectorSection === inspectorSection;
        button.classList.toggle("active", active);
        button.setAttribute("aria-selected", active ? "true" : "false");
        button.tabIndex = active ? 0 : -1;
      });
    }

    function setInspectorSection(section) {
      inspectorSection = section === "reports" ? "reports" : "activity";
      if (currentView !== "inspectori") {
        applyMainView("inspectori");
        return;
      }
      syncInspectorSectionUi();
      if (inspectorSection === "reports") {
        ensureReportWorkflowPeriodDefault();
        loadReportWorkflowItems(false);
        setTimeout(() => {
          if (reportStatsMap) reportStatsMap.invalidateSize();
        }, 160);
      } else {
        renderInspectorsView();
      }
    }

    function setMode(internal) {
      isInternalMode = internal;
      document.body.classList.toggle("gfn-internal", internal);
      document.body.classList.toggle("gfn-public", !internal);
      document.querySelectorAll(".internal-only").forEach(el => el.style.display = internal ? "" : "none");
      if (internal) {
        q("modeBadge").className = "mode-badge";
        setText("modeBadge", "Mod intern GFN");
        if (q("visitorInfo")) q("visitorInfo").style.setProperty("display", "none", "important");
        if (q("loginForm")) q("loginForm").style.setProperty("display", "none", "important");
        if (q("loggedBox")) q("loggedBox").style.setProperty("display", "block", "important");
      } else {
        q("modeBadge").className = "mode-badge public";
        setText("modeBadge", "Mod vizitator");
        if (q("visitorInfo")) q("visitorInfo").style.setProperty("display", "block", "important");
        if (q("loginForm")) q("loginForm").style.setProperty("display", "block", "important");
        if (q("loggedBox")) q("loggedBox").style.setProperty("display", "none", "important");
        if (["inspectori", "entities", "reports-workflow"].includes(currentView)) currentView = "map";
      }
      syncViewChrome();
      renderNav();
    }

    async function login() {
      const email = safeValue("email").trim();
      const password = safeValue("password");
      try {
        const fd = new URLSearchParams();
        fd.append("username", email);
        fd.append("password", password);
        const res = await fetch("/auth/login-form", { method: "POST", body: fd });
        if (!res.ok) {
          let detail = "Autentificare esuata.";
          try { const err = await res.json(); detail = err.detail || detail; } catch {}
          throw new Error(detail);
        }
        const data = await res.json();
        token = data.access_token;
        await loadCurrentUser();
        setText("loggedUser", currentUser ? (currentUser.full_name || currentUser.email || email) : email);
        setMode(true);
        setMessage("Autentificare reusita. Se incarca datele interne...", true);
        await loadControls();
        setView("map");
      } catch (err) { setMessage(err.message, false); }
    }

    async function logout() {
      token = null;
      currentUser = null;
      reportWorkflowItems = [];
      reportWorkflowLoaded = false;
      setMode(false);
      q("password").value = "";
      setText("lastUpdate", "-");
      setMessage("Te-ai delogat. Se incarca datele publice.", true);
      await loadPublicControls();
      setView("map");
    }

    function authHeaders(extra = {}) {
      return token ? { ...extra, Authorization: "Bearer " + token } : extra;
    }

    async function loadCurrentUser() {
      if (!token) return null;
      const res = await fetch("/auth/me", { headers: authHeaders() });
      if (!res.ok) return null;
      currentUser = await res.json();
      return currentUser;
    }

    async function loadPublicControls() {
      try {
        setMode(false);
        const res = await fetch("/public/controls/map?v=" + Date.now());
        if (!res.ok) throw new Error("Nu s-au putut incarca datele publice.");
        allControls = await res.json();
        await afterDataLoaded("Date publice incarcate: " + allControls.length + " controale.");
      } catch (err) { setMessage(err.message, false); }
    }

    async function loadControls() {
      if (!token) return setMessage("Trebuie sa te autentifici pentru datele interne.", false);
      const res = await fetch("/controls/map?v=" + Date.now(), { headers: { Authorization: "Bearer " + token } });
      if (!res.ok) return setMessage("Nu s-au putut incarca datele interne.", false);
      allControls = await res.json();
      await afterDataLoaded("Date interne incarcate: " + allControls.length + " controale.");
    }

    async function afterDataLoaded(message) {
      populateFilters();
      ensureModulePeriodDefaults();
      ensureGlobalPeriodDefault();
      if (!map) initMap();
      await loadGarzi();
      if (q("guardPeriodPreset") && !q("guardDateFrom").value && !q("guardDateTo").value) applyGuardPeriodPreset(q("guardPeriodPreset").value || "last6");
      applyFilters();
      setText("lastUpdate", new Date().toLocaleString("ro-RO"));
      setMessage(message, true);
    }

    function populateFilters() {
      populateGardaFilter(); populateCategoryFilter(); populateInspectorSearch(); populateInspectorScopeGuards(); populateEntitySearch(); populateEntityFilters(); populatePetitionerSearch(); populateInstitutionTargets();
    }

    function populateGardaFilter() {
      const el = q("gardaFilter"); if (!el) return;
      const cur = el.value;
      const byKey = {};
      allControls.forEach(c => {
        const raw = c.garda;
        if (!raw) return;
        const key = canonicalGuardName(raw);
        if (!key) return;
        if (!byKey[key]) byKey[key] = guardDisplayName(raw);
      });
      const rows = Object.entries(byKey).sort((a, b) => String(a[1]).localeCompare(String(b[1]), "ro"));
      el.innerHTML = '<option value="toate">Toate garzile</option>' + rows.map(([key, label]) => `<option value="${escapeHtml(key)}">${escapeHtml(label)}</option>`).join("");
      if ([...el.options].some(o => o.value === cur)) el.value = cur;
    }

    function fillCategorySelect(el) {
      if (!el) return;
      const cur = el.value;
      el.innerHTML = '<option value="toate">Toate categoriile de control</option>';
      CONTROL_DOMAINS.forEach(d => {
        const group = document.createElement("optgroup");
        group.label = d.label;
        d.categories.forEach(cat => {
          const opt = document.createElement("option");
          opt.value = makeCategoryFilterValue(d.value, cat);
          opt.textContent = cat;
          group.appendChild(opt);
        });
        el.appendChild(group);
      });
      if ([...el.options].some(o => o.value === cur)) el.value = cur;
    }

    function populateCategoryFilter() {
      fillCategorySelect(q("categoryFilter"));
      fillCategorySelect(q("guardCategoryFilter"));
      fillCategorySelect(q("inspectorCategoryScope"));
      fillCategorySelect(q("entityCategoryFilter"));
    }

    function populateEntityFilters() {
      const guardSelect = q("entityGuardFilter");
      if (guardSelect) {
        const current = guardSelect.value;
        const rows = {};
        allControls.forEach(control => {
          if (!getEntityName(control) || !control.garda) return;
          const key = canonicalGuardName(control.garda);
          if (key && !rows[key]) rows[key] = guardDisplayName(control.garda);
        });
        guardSelect.innerHTML = '<option value="toate">Toate garzile</option>' +
          Object.entries(rows)
            .sort((a, b) => String(a[1]).localeCompare(String(b[1]), "ro"))
            .map(([key, label]) => `<option value="${escapeHtml(key)}">${escapeHtml(label)}</option>`)
            .join("");
        if ([...guardSelect.options].some(option => option.value === current)) guardSelect.value = current;
      }
    }

    function populateInspectorSearch() {
      const list = q("inspectorList"); if (!list) return;
      const names = new Set();
      if (isInternalMode) allControls.forEach(c => (c.echipa || []).forEach(m => { if (m.nume) names.add(m.nume); }));
      list.innerHTML = [...names].sort().map(n => `<option value="${escapeHtml(n)}"></option>`).join("");
    }

    function getInspectorNamesForScope() {
      const names = new Set();
      getInspectorBaseControls().forEach(c => (c.echipa || []).forEach(m => {
        if (m.nume) names.add(m.nume);
      }));
      return [...names].sort((a, b) => String(a).localeCompare(String(b), "ro"));
    }

    function findInspectorByInput(value) {
      const target = normalizeText(value || "");
      if (!target) return "";
      return getInspectorNamesForScope().find(name => normalizeText(name) === target) || "";
    }

    function renderInspectorSuggestions(showAll = false) {
      const box = q("inspectorSuggestList");
      const input = q("inspectorSearch");
      if (!box || !input || !isInternalMode) return;

      const query = normalizeText(input.value || "");
      if (query.length < 2) {
        closeInspectorSuggestions();
        return;
      }

      const controls = getInspectorBaseControls();
      const counts = {};
      controls.forEach(c => (c.echipa || []).forEach(m => {
        if (!m.nume) return;
        counts[m.nume] = (counts[m.nume] || 0) + 1;
      }));

      const rows = Object.entries(counts)
        .map(([name, count]) => {
          const guardKey = getInspectorPrimaryGuard(name, controls);
          return {
            name,
            count,
            guard: guardKey ? guardDisplayName(guardKey) : "Garda nespecificata"
          };
        })
        .filter(item =>
          !inspectorCompareNames.includes(item.name) &&
          item.name !== selectedInspectorName &&
          (normalizeText(item.name).includes(query) || normalizeText(item.guard).includes(query))
        )
        .sort((a, b) => b.count - a.count || String(a.name).localeCompare(String(b.name), "ro"))
        .slice(0, 8);

      if (!rows.length) {
        box.innerHTML = `<div class="inspector-suggest-empty">Niciun inspector disponibil pentru cautarea curenta.</div>`;
        box.classList.add("open");
        input.setAttribute("aria-expanded", "true");
        inspectorSuggestionIndex = -1;
        return;
      }

      box.innerHTML = rows.map((item, index) => {
        return `<button id="inspector-suggestion-${index}" type="button" role="option" aria-selected="false" class="inspector-suggest-item" onclick="selectInspectorSuggestion('${escapeAttr(item.name)}')">
          <span><b>${escapeHtml(item.name)}</b><small>${escapeHtml(item.guard)}</small></span>
          <strong>${item.count}</strong>
        </button>`;
      }).join("");
      box.classList.add("open");
      input.setAttribute("aria-expanded", "true");
      inspectorSuggestionIndex = -1;
    }

    function scheduleInspectorSuggestions() {
      clearTimeout(inspectorSuggestionTimer);
      inspectorSuggestionTimer = setTimeout(() => renderInspectorSuggestions(false), 300);
    }

    function focusInspectorCompareSearch() {
      if (inspectorCompareNames.length >= 5) {
        setMessage("Au fost selectati maximum 5 inspectori.", false);
        return;
      }
      q("inspectorSelectorShell")?.classList.remove("collapsed");
      const input = q("inspectorSearch");
      if (!input) return;
      input.focus();
      if (normalizeText(input.value || "").length >= 2) renderInspectorSuggestions(false);
    }

    function closeInspectorSuggestions() {
      const box = q("inspectorSuggestList");
      const input = q("inspectorSearch");
      if (box) {
        box.classList.remove("open");
        box.innerHTML = "";
      }
      if (input) {
        input.setAttribute("aria-expanded", "false");
        input.removeAttribute("aria-activedescendant");
      }
      inspectorSuggestionIndex = -1;
    }

    function closeInspectorSelector() {
      clearTimeout(inspectorSuggestionTimer);
      closeInspectorSuggestions();
      const shell = q("inspectorSelectorShell");
      const input = q("inspectorSearch");
      if (shell) shell.classList.add("collapsed");
      if (input) input.value = "";
    }

    function setInspectorSuggestionIndex(nextIndex) {
      const box = q("inspectorSuggestList");
      const input = q("inspectorSearch");
      if (!box || !input) return;
      const options = [...box.querySelectorAll(".inspector-suggest-item")];
      if (!options.length) return;
      inspectorSuggestionIndex = (nextIndex + options.length) % options.length;
      options.forEach((option, index) => {
        const active = index === inspectorSuggestionIndex;
        option.classList.toggle("active", active);
        option.setAttribute("aria-selected", active ? "true" : "false");
      });
      const active = options[inspectorSuggestionIndex];
      input.setAttribute("aria-activedescendant", active.id);
      active.scrollIntoView({ block: "nearest" });
    }

    function handleInspectorSearchKeydown(event) {
      const box = q("inspectorSuggestList");
      const options = box ? [...box.querySelectorAll(".inspector-suggest-item")] : [];
      if (event.key === "Escape") {
        event.preventDefault();
        closeInspectorSelector();
        return;
      }
      if (!options.length) return;
      if (event.key === "ArrowDown") {
        event.preventDefault();
        setInspectorSuggestionIndex(inspectorSuggestionIndex + 1);
      } else if (event.key === "ArrowUp") {
        event.preventDefault();
        setInspectorSuggestionIndex(inspectorSuggestionIndex - 1);
      } else if (event.key === "Enter" && inspectorSuggestionIndex >= 0) {
        event.preventDefault();
        options[inspectorSuggestionIndex].click();
      }
    }

    function selectInspectorSuggestion(name) {
      const previousSelection = selectedInspectorName;
      const additions = [previousSelection, name]
        .filter((item, index, arr) => item && arr.indexOf(item) === index && !inspectorCompareNames.includes(item));
      if (inspectorCompareNames.length + additions.length > 5) {
        setMessage("Au fost selectati maximum 5 inspectori.", false);
        return;
      }
      inspectorCompareNames.push(...additions);
      selectedInspectorName = name || previousSelection || "";
      closeInspectorSelector();
      inspectorControlsLimit = 11;
      renderInspectorsView();
    }

    function addInspectorComparison() {
      const exact = selectedInspectorName || "";
      if (!exact) {
        setMessage("Selecteaza un inspector din clasament sau din cautare.", false);
        focusInspectorCompareSearch();
        return;
      }
      if (inspectorCompareNames.includes(exact)) {
        openCollapse("collapseInspectorCompare");
        renderInspectorsView();
        return;
      }
      if (inspectorCompareNames.length >= 5) {
        setMessage("Lista de comparatie permite maximum 5 inspectori.", false);
        return;
      }
      inspectorCompareNames.push(exact);
      openCollapse("collapseInspectorCompare");
      setMessage("Inspector adaugat pentru comparatie: " + exact, true);
      renderInspectorsView();
    }

    function removeInspectorComparison(name) {
      inspectorCompareNames = inspectorCompareNames.filter(item => item !== name);
      if (!inspectorCompareNames.length && selectedInspectorName === name) selectedInspectorName = "";
      renderInspectorsView();
    }

    function clearInspectorComparison() {
      inspectorCompareNames = [];
      selectedInspectorName = "";
      renderInspectorsView();
    }

    function getInspectorComparisonNames(selected = "") {
      const names = [...inspectorCompareNames];
      if (selected && !names.includes(selected)) names.unshift(selected);
      return names.filter(name => name).slice(0, 5);
    }

    window.selectInspectorSuggestion = selectInspectorSuggestion;
    window.renderInspectorSuggestions = renderInspectorSuggestions;
    window.scheduleInspectorSuggestions = scheduleInspectorSuggestions;
    window.focusInspectorCompareSearch = focusInspectorCompareSearch;
    window.closeInspectorSelector = closeInspectorSelector;
    window.handleInspectorSearchKeydown = handleInspectorSearchKeydown;
    window.addInspectorComparison = addInspectorComparison;
    window.removeInspectorComparison = removeInspectorComparison;
    window.clearInspectorComparison = clearInspectorComparison;

    function populateInspectorScopeGuards() {
      const el = q("inspectorGardaScope"); if (!el) return;
      const cur = el.value;
      const byKey = {};
      allControls.forEach(c => {
        if (!c.garda) return;
        const key = canonicalGuardName(c.garda);
        if (key && !byKey[key]) byKey[key] = guardDisplayName(c.garda);
      });
      const rows = Object.entries(byKey).sort((a, b) => String(a[1]).localeCompare(String(b[1]), "ro"));
      el.innerHTML = '<option value="toate">Toate garzile</option>' + rows.map(([key, label]) => `<option value="${escapeHtml(key)}">${escapeHtml(label)}</option>`).join("");
      if ([...el.options].some(o => o.value === cur)) el.value = cur;
    }
    function populateEntitySearch() {
      const list = q("entityList"); if (!list) return;
      const names = new Set();
      if (isInternalMode) allControls.forEach(c => { const n = getEntityName(c); if (n) names.add(n); });
      list.innerHTML = [...names].sort().map(n => `<option value="${escapeHtml(n)}"></option>`).join("");
    }
    function getEntityBaseControls() {
      let arr = getModulePeriodControls("entity").filter(c => getEntityName(c));
      const guardKey = safeValue("entityGuardFilter", "toate");
      const entityType = safeValue("entityTypeFilter", "toate");
      const controlType = normalizeText(safeValue("entityControlTypeFilter", "toate"));
      const category = safeValue("entityCategoryFilter", "toate");
      const result = normalizeText(safeValue("entityResultFilter", "toate")).replace(/\s+/g, "_");

      if (guardKey !== "toate") arr = arr.filter(c => canonicalGuardName(c.garda) === guardKey);
      if (entityType !== "toate") arr = arr.filter(c => getEntityTypeKey(c) === entityType);
      if (controlType && controlType !== "toate") {
        arr = arr.filter(c => normalizeText(c.control_type || c.tip_control || "necunoscut") === controlType);
      }
      if (category && category !== "toate") arr = arr.filter(c => categoryMatchesControl(c, category));
      if (result && result !== "toate") arr = arr.filter(c => getControlResult(c) === result);
      return arr;
    }
    function renderEntitySuggestions(showAll = false) {
      const box = q("entitySuggestList");
      const input = q("entitySearch");
      if (!box || !input || !isInternalMode) return;

      const query = normalizeText(input.value || "");
      if (!showAll && !query) {
        box.classList.remove("open");
        box.innerHTML = "";
        return;
      }
      const counts = countBy(getEntityBaseControls(), getEntityName);
      const rows = Object.entries(counts)
        .filter(([name]) => showAll || normalizeText(name).includes(query))
        .sort((a, b) => b[1] - a[1] || String(a[0]).localeCompare(String(b[0]), "ro"))
        .slice(0, 12);

      if (!rows.length) {
        box.classList.remove("open");
        box.innerHTML = "";
        return;
      }

      box.innerHTML = rows.map(([name, count]) => `<button type="button" onclick="selectEntitySuggestion('${escapeAttr(name)}')">
        <span>${escapeHtml(name)}</span>
        <strong>${count}</strong>
      </button>`).join("");
      box.classList.add("open");
    }
    function selectEntitySuggestion(name) {
      const input = q("entitySearch");
      if (input) input.value = toAsciiText(name || "");
      const box = q("entitySuggestList");
      if (box) box.classList.remove("open");
      selectedEntityHistoryYear = "";
      renderEntitiesView();
    }
    window.selectEntitySuggestion = selectEntitySuggestion;
    window.renderEntitySuggestions = renderEntitySuggestions;
    function populatePetitionerSearch() {
      const list = q("petitionerList"); if (!list) return;
      const names = new Set();
      if (isInternalMode) allControls.forEach(c => { const n = getPetitionerName(c); if (n) names.add(n); });
      list.innerHTML = [...names].sort().map(n => `<option value="${escapeHtml(n)}"></option>`).join("");
    }
    function populateInstitutionTargets() {
      const el = q("institutionReportTarget"); if (!el) return;
      const cur = el.value;
      const byKey = {};
      allControls.forEach(c => {
        if (!c.garda) return;
        const key = canonicalGuardName(c.garda);
        if (key && !byKey[key]) byKey[key] = guardDisplayName(c.garda);
      });
      const rows = Object.entries(byKey).sort((a, b) => String(a[1]).localeCompare(String(b[1]), "ro"));
      el.innerHTML = '<option value="national">Garda Forestiera Nationala</option>' + rows.map(([key, label]) => `<option value="${escapeHtml(key)}">${escapeHtml(label)}</option>`).join("");
      if ([...el.options].some(o => o.value === cur)) el.value = cur;
    }

    function formatDateInput(date) {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");
      return `${year}-${month}-${day}`;
    }

    function markCustomPeriod() {
      if (q("periodPreset")) q("periodPreset").value = "custom";
    }

    function setGlobalPeriodPresetDates(value) {
      const from = q("dateFrom");
      const to = q("dateTo");
      if (!from || !to) return;

      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

      if (value === "all") {
        from.value = "";
        to.value = "";
      } else if (value === "last30") {
        const start = new Date(today);
        start.setDate(start.getDate() - 30);
        from.value = formatDateInput(start);
        to.value = formatDateInput(today);
      } else if (value === "last90") {
        const start = new Date(today);
        start.setDate(start.getDate() - 90);
        from.value = formatDateInput(start);
        to.value = formatDateInput(today);
      } else if (value === "year") {
        const start = new Date(today.getFullYear(), 0, 1);
        from.value = formatDateInput(start);
        to.value = formatDateInput(today);
      }
    }

    function ensureGlobalPeriodDefault() {
      if (!q("periodPreset") || safeValue("dateFrom") || safeValue("dateTo")) return;
      const preset = safeValue("periodPreset", "all") || "all";
      if (preset !== "custom") setGlobalPeriodPresetDates(preset);
    }

    function applyPeriodPreset(value) {
      const from = q("dateFrom");
      const to = q("dateTo");
      if (!from || !to) return applyFilters();
      if (value === "custom" && q("globalAdvancedFilters")) q("globalAdvancedFilters").open = true;
      setGlobalPeriodPresetDates(value);
      applyFilters();
    }

    function markGuardCustomPeriod() {
      if (q("guardPeriodPreset")) q("guardPeriodPreset").value = "custom";
    }

    function applyGuardPeriodPreset(value) {
      const from = q("guardDateFrom");
      const to = q("guardDateTo");
      if (!from || !to) return renderGarziView();

      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

      if (value === "all") {
        from.value = "";
        to.value = "";
      } else if (value === "last30") {
        const start = new Date(today);
        start.setDate(start.getDate() - 30);
        from.value = formatDateInput(start);
        to.value = formatDateInput(today);
      } else if (value === "last90") {
        const start = new Date(today);
        start.setDate(start.getDate() - 90);
        from.value = formatDateInput(start);
        to.value = formatDateInput(today);
      } else if (value === "last6") {
        const start = new Date(today);
        start.setMonth(start.getMonth() - 6);
        from.value = formatDateInput(start);
        to.value = formatDateInput(today);
      } else if (value === "year") {
        const start = new Date(today.getFullYear(), 0, 1);
        from.value = formatDateInput(start);
        to.value = formatDateInput(today);
      }

      renderGarziView();
    }

    function resetGuardFilters() {
      if (q("guardPeriodPreset")) q("guardPeriodPreset").value = "last6";
      if (q("guardTypeFilter")) q("guardTypeFilter").value = "toate";
      if (q("guardCategoryFilter")) q("guardCategoryFilter").value = "toate";
      if (q("guardResultFilter")) q("guardResultFilter").value = "toate";
      applyGuardPeriodPreset("last6");
    }

    function getGuardFilters() {
      return {
        type: safeValue("guardTypeFilter", "toate"),
        category: safeValue("guardCategoryFilter", "toate"),
        result: safeValue("guardResultFilter", "toate"),
        dateFrom: safeValue("guardDateFrom", ""),
        dateTo: safeValue("guardDateTo", "")
      };
    }

    function getGuardAnalyticsControls() {
      const f = getGuardFilters();
      let arr = [...allControls];
      if (f.type !== "toate") arr = arr.filter(c => c.control_type === f.type);
      if (f.category !== "toate") arr = arr.filter(c => categoryMatchesControl(c, f.category));
      if (f.result !== "toate") arr = arr.filter(c => c.result === f.result);
      if (f.dateFrom) arr = arr.filter(c => new Date(c.created_at) >= new Date(f.dateFrom));
      if (f.dateTo) arr = arr.filter(c => new Date(c.created_at) <= new Date(f.dateTo + "T23:59:59"));
      return arr;
    }

    function resetFilters() {
      ["gardaFilter", "controlTypeFilter", "categoryFilter", "resultFilter"].forEach(id => { if (q(id)) q(id).value = "toate"; });
      if (q("periodPreset")) q("periodPreset").value = "all";
      if (q("globalAdvancedFilters")) q("globalAdvancedFilters").open = false;
      setGlobalPeriodPresetDates("all");
      applyFilters();
    }

    function selectedOptionLabel(id) {
      const select = q(id);
      const option = select && select.selectedOptions ? select.selectedOptions[0] : null;
      return option ? option.textContent.trim() : "";
    }

    function renderActiveFilterChips() {
      const chips = [];
      const preset = safeValue("periodPreset", "all");
      if (preset !== "all") {
        const periodLabel = preset === "custom"
          ? [safeValue("dateFrom"), safeValue("dateTo")].filter(Boolean).join(" - ") || "Perioada personalizata"
          : selectedOptionLabel("periodPreset");
        chips.push({ id: "period", label: periodLabel });
      }
      [
        ["gardaFilter", "Garda"],
        ["controlTypeFilter", "Tip"],
        ["categoryFilter", "Categorie"],
        ["resultFilter", "Rezultat"],
      ].forEach(([id, prefix]) => {
        if (safeValue(id, "toate") !== "toate") chips.push({ id, label: `${prefix}: ${selectedOptionLabel(id)}` });
      });
      setHtml("activeFilterChips", chips.map(chip => `<button type="button" class="active-filter-chip" data-filter-id="${escapeAttr(chip.id)}" aria-label="Elimina filtrul ${escapeAttr(chip.label)}"><span>${escapeHtml(chip.label)}</span><b aria-hidden="true">&times;</b></button>`).join(""));
    }

    function clearGlobalFilter(filterId) {
      if (filterId === "period") {
        if (q("periodPreset")) q("periodPreset").value = "all";
        setGlobalPeriodPresetDates("all");
      } else if (q(filterId)) {
        q(filterId).value = "toate";
      }
      applyFilters();
    }

    function applyFilters() {
      linkedMapFilterLabel = "";
      filteredControls = filterControls();
      renderActiveFilterChips();
      renderKpis(); renderCurrentView();
      if (currentView !== "map") setText("visibleCount", filteredControls.length + " controale afisate");
    }

    function renderCurrentView() {
      syncViewChrome();
      if (!["petitions", "entities"].includes(currentView)) renderKpis();
      if (currentView === "dashboard") renderDashboardView();
      if (currentView === "map") renderMapView();
      if (currentView === "garzi") renderGarziView();
      if (currentView === "inspectori") {
        syncInspectorSectionUi();
        if (inspectorSection === "reports") renderReportsWorkflowView();
        else renderInspectorsView();
      }
      if (currentView === "petitions") renderPetitionsView();
      if (currentView === "entities") renderEntitiesView();
      if (currentView === "report") renderReportView();
    }

    function renderKpis() {
      const now = new Date();
      const startToday = new Date(now); startToday.setHours(0,0,0,0);
      const start7 = new Date(now); start7.setDate(now.getDate() - 7); start7.setHours(0,0,0,0);
      const start30 = new Date(now); start30.setDate(now.getDate() - 30); start30.setHours(0,0,0,0);
      const today = allControls.filter(c => new Date(c.created_at) >= startToday);
      const last7 = allControls.filter(c => new Date(c.created_at) >= start7);
      const last30 = allControls.filter(c => new Date(c.created_at) >= start30);
      setKpiCard(0, "OK", "Controale azi", today.length, "ziua curenta");
      setKpiCard(1, "7", "Ultimele 7 zile", last7.length, "activitate recenta");
      setKpiCard(2, "30", "Ultimele 30 zile", last30.length, "perioada operationala");
      setKpiCard(3, "!", "Neconforme 30 zile", last30.filter(c => isProblemResult(c.result)).length, "controale cu probleme", true);
      setText("kpiToday", today.length); setText("kpi7Days", last7.length); setText("kpi30Days", last30.length); setText("kpi30Bad", last30.filter(c => isProblemResult(c.result)).length);
    }

    function setKpiCard(index, icon, label, value, note, isDanger = false) {
      const card = document.querySelectorAll(".kpi-row .kpi")[index];
      if (!card) return;
      const iconEl = card.querySelector(".kpi-icon");
      const labelEl = card.querySelector(".kpi-label");
      const valueEl = card.querySelector(".kpi-value");
      const noteEl = card.querySelector(".kpi-note");
      if (iconEl) {
        iconEl.textContent = icon;
        iconEl.classList.toggle("red", isDanger);
      }
      if (labelEl) labelEl.textContent = label;
      if (valueEl) {
        valueEl.textContent = value;
        valueEl.classList.toggle("red", isDanger);
      }
      if (noteEl) noteEl.textContent = note;
    }

    function startOfLast30Days() {
      const start30 = new Date();
      start30.setDate(start30.getDate() - 30);
      start30.setHours(0,0,0,0);
      return start30;
    }

    function uniqueCount(arr, getter) {
      const values = new Set();
      arr.forEach((item, index) => {
        const value = String(getter(item) || item.id || index).trim();
        if (value) values.add(normalizeText(value));
      });
      return values.size;
    }

    function isResolvedPetition(c) {
      const result = normalizeText(c.result);
      return Boolean(result) && !["nou", "deschis", "in lucru", "nesolutionat", "nerezolvat", "pending"].includes(result);
    }

    function renderPetitionKpis() {
      const start30 = startOfLast30Days();
      const petitions30 = allControls.filter(c => isPetition(c) && new Date(c.created_at) >= start30);
      const resolved30 = petitions30.filter(isResolvedPetition);
      const total = uniqueCount(petitions30, getPetitionNumber);
      const resolved = uniqueCount(resolved30, getPetitionNumber);
      const pending = Math.max(total - resolved, 0);
      const rate = total ? Math.round((resolved / total) * 100) + "%" : "0%";
      setKpiCard(0, "30", "Petitii / sesizari 30 zile", total, "numar unic");
      setKpiCard(1, "OK", "Rezolvate 30 zile", resolved, "au rezultat final");
      setKpiCard(2, "...", "In lucru 30 zile", pending, "fara rezultat final");
      setKpiCard(3, "%", "Rata rezolvare", rate, "din ultimele 30 zile");
    }

    function renderEntityKpis(arr) {
      const entities = arr.filter(c => getEntityName(c));
      const entityTotal = uniqueCount(entities, getEntityName);
      const problemEntities = uniqueCount(entities.filter(c => isProblemResult(c.result)), getEntityName);
      const sanctionedEntities = uniqueCount(entities.filter(c => getFineAmount(c) > 0 || ["sanctiune", "sesizare_penala"].includes(c.result)), getEntityName);
      setKpiCard(0, "ENT", "Entitati controlate", entityTotal, getModulePeriodLabel("entity"));
      setKpiCard(1, "OK", "Controale pe entitati", entities.length, "in perioada selectata");
      setKpiCard(2, "!", "Entitati cu probleme", problemEntities, "neconform / sanctiuni", true);
      setKpiCard(3, "Lei", "Entitati sanctionate", sanctionedEntities, "amenzi sau sesizari");
    }

    function initMap() {
      map = L.map("map", {
        zoomControl: true,
        closePopupOnClick: false,
        maxBounds: [[43.35, 20.05], [48.75, 29.95]],
        maxBoundsViscosity: 0.85,
        minZoom: 6,
        zoomSnap: 0.25,
        zoomDelta: 0.25
      }).setView([45.85, 24.9], 7.5);
      map.createPane("basePane"); map.getPane("basePane").style.zIndex = 200;
      map.createPane("labelsPane"); map.getPane("labelsPane").style.zIndex = 360; map.getPane("labelsPane").style.pointerEvents = "none";
      map.createPane("garziPane"); map.getPane("garziPane").style.zIndex = 430;
      map.createPane("guardNamesPane"); map.getPane("guardNamesPane").style.zIndex = 440; map.getPane("guardNamesPane").style.pointerEvents = "none";
      map.createPane("controlsPane"); map.getPane("controlsPane").style.zIndex = 650;
      controlRenderer = L.canvas({ pane: "controlsPane", padding: 0.45 });
      markersLayer = createMarkersLayer();
      markersLayer.addTo(map);
      map.on("zoomend", () => {
        if (currentView !== "map") return;
        const zoom = map.getZoom();
        if (zoom < MAP_GUARD_CLUSTER_ZOOM_THRESHOLD) {
          mapPointMode = false;
          mapClusterMode = "guard";
        } else if (zoom >= MAP_CLUSTER_ZOOM_THRESHOLD) {
          mapPointMode = true;
          mapClusterMode = "points";
        } else if (mapClusterMode !== "points") {
          mapPointMode = false;
          mapClusterMode = "local";
        }
        if (mapRenderControls.length) {
          clearTimeout(markerRenderTimer);
          markerRenderTimer = setTimeout(() => renderMarkers(mapRenderControls), 90);
        }
        updateMapControlPopupPosition();
      });
      map.on("moveend", () => updateMapControlPopupPosition());
      map.on("zoom move", () => updateMapControlPopupPosition());
      const mapEl = q("map");
      if (mapEl) {
        mapEl.addEventListener("click", event => {
          const zoomIn = event.target.closest ? event.target.closest(".leaflet-control-zoom-in") : null;
          const zoomOut = event.target.closest ? event.target.closest(".leaflet-control-zoom-out") : null;
          if (zoomIn || zoomOut) {
            event.preventDefault();
            event.stopPropagation();
            forceOperationalMapZoom(zoomIn ? 1 : -1);
            return;
          }
          const markerEl = event.target.closest ? event.target.closest(".control-marker-icon[data-control-id]") : null;
          if (!markerEl) return;
          event.preventDefault();
          event.stopPropagation();
          selectMapControl(markerEl.dataset.controlId);
        }, true);
      }
      document.addEventListener("click", handleOperationalZoomClick, true);
      switchBaseLayer("satellite");
    }

    function handleOperationalZoomClick(event) {
      const zoomIn = event.target.closest ? event.target.closest("#map .leaflet-control-zoom-in") : null;
      const zoomOut = event.target.closest ? event.target.closest("#map .leaflet-control-zoom-out") : null;
      if (!zoomIn && !zoomOut) return;
      event.preventDefault();
      event.stopPropagation();
      if (event.stopImmediatePropagation) event.stopImmediatePropagation();
      forceOperationalMapZoom(zoomIn ? 1 : -1);
    }

    function forceOperationalMapZoom(delta) {
      if (!map) return;
      const nextZoom = Math.max(map.getMinZoom() || 0, Math.min(map.getMaxZoom() || 18, map.getZoom() + delta));
      if (delta > 0) {
        mapPointMode = true;
        mapClusterMode = "points";
      } else if (nextZoom < MAP_GUARD_CLUSTER_ZOOM_THRESHOLD) {
        mapPointMode = false;
        mapClusterMode = "guard";
      } else {
        mapPointMode = true;
        mapClusterMode = "points";
      }
      map.setZoom(nextZoom);
      if (delta > 0) {
        showAllMapPoints();
        setTimeout(showAllMapPoints, 180);
        return;
      }
      if (mapRenderControls.length) {
        clearTimeout(markerRenderTimer);
        markerRenderTimer = setTimeout(() => renderMarkers(mapRenderControls), 80);
      }
    }

    window.forceOperationalMapZoom = forceOperationalMapZoom;

    function createMarkersLayer() {
      return L.layerGroup();
    }

    function showAllMapPoints() {
      mapPointMode = true;
      mapClusterMode = "points";
      if (mapRenderControls.length) renderMarkers(mapRenderControls);
    }

    function resetMapClusters() {
      mapPointMode = false;
      mapClusterMode = "guard";
      if (mapRenderControls.length) renderMarkers(mapRenderControls);
    }

    window.showAllMapPoints = showAllMapPoints;
    window.resetMapClusters = resetMapClusters;

    const baseLayers = {
      gray: {
        base: () => L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png", { attribution:"&copy; OpenStreetMap contributors &copy; CARTO", subdomains:"abcd", maxZoom:20, pane:"basePane", className:"gray-map" }),
        labels: () => L.tileLayer("https://{s}.basemaps.cartocdn.com/light_only_labels/{z}/{x}/{y}{r}.png", { attribution:"&copy; OpenStreetMap contributors &copy; CARTO", subdomains:"abcd", maxZoom:20, pane:"labelsPane", className:"label-map-light" })
      },
      relief: {
        base: () => L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/Elevation/World_Hillshade/MapServer/tile/{z}/{y}/{x}", { attribution:"Tiles &copy; Esri", pane:"basePane", className:"hillshade-map", maxZoom:18 }),
        labels: () => L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_only_labels/{z}/{x}/{y}{r}.png", { attribution:"&copy; OpenStreetMap contributors &copy; CARTO", subdomains:"abcd", maxZoom:20, pane:"labelsPane", className:"label-map-dark" })
      },
      satellite: {
        base: () => L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}", { attribution:"Tiles &copy; Esri", pane:"basePane", className:"satellite-map", maxZoom:18 }),
        labels: () => L.tileLayer("https://services.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}", { attribution:"Labels &copy; Esri", pane:"labelsPane", maxZoom:18, className:"label-map-dark" })
      }
    };

    function switchBaseLayer(type) {
      if (!map) return;
      const selected = baseLayers[type] || baseLayers.satellite;
      if (currentBaseLayer) map.removeLayer(currentBaseLayer);
      if (currentLabelLayer) map.removeLayer(currentLabelLayer);
      currentBaseLayer = selected.base(); currentLabelLayer = selected.labels();
      currentBaseLayer.addTo(map); currentLabelLayer.addTo(map); keepMarkersOnTop();
    }

    async function loadGarzi() {
      if (!map) return;
      try {
        const res = await fetch("/ui/gfn_garzi.geojson?v=" + Date.now());
        if (!res.ok) return;
        const data = await res.json();
        guardStatsGeoJson = data;
        guardCenterCache = null;
        if (gardaLayer) map.removeLayer(gardaLayer);
        if (gardaNameLayer) map.removeLayer(gardaNameLayer);
        gardaLayer = L.geoJSON(data, {
          pane: "garziPane",
          style: () => ({ color: chartColors.darkGreen, weight: 2.35, opacity: .96, fill: false, fillOpacity: 0, className: "garda-boundary" }),
          onEachFeature: (feature, layer) => {
            const p = feature.properties || {};
            const name = p.GARDA || p.garda || p.NUME || p.name || p.DENUMIRE || "Garda forestiera";
            layer.bindTooltip(escapeHtml(name), { permanent: true, direction: "center", className: "garda-name-label", pane: "guardNamesPane" });
            layer.on("mouseover", () => { layer.setStyle({ color: chartColors.green, weight: 3.4 }); keepMarkersOnTop(); });
            layer.on("mouseout", () => { gardaLayer.resetStyle(layer); keepMarkersOnTop(); });
          }
        }).addTo(map);
        setOperationalMapHomeView();
        if (currentView === "map" && mapRenderControls.length) renderMarkers(mapRenderControls);
      } catch (e) { console.warn(e); }
    }

    function setOperationalMapHomeView() {
      if (!map) return;
      map.setView([45.85, 24.9], 7.5, { animate: false });
      map.setMaxBounds([[43.55, 20.05], [48.65, 29.85]]);
    }

    function keepMarkersOnTop() { if (markersLayer) markersLayer.eachLayer(m => { if (m.bringToFront) m.bringToFront(); }); }

    function renderMapView() {
      if (!map || !markersLayer) return;
      setOperationalMapHomeView();
      const sideStack = document.querySelector("#view-map .side-stack");
      if (sideStack) sideStack.scrollTop = 0;
      renderMarkers(filteredControls); renderRecent(filteredControls); renderMoneySummary(filteredControls);
      renderLinkedMapFilterPill();
      setTimeout(() => map.invalidateSize(), 100);
    }

    function renderRecent(arr) {
      const recent = [...arr].filter(c => normalizeControlCoordinates(c)).sort((a,b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 6);
      if (!recent.length) return setHtml("recentControls", `<div class="empty">Nu exista controale pentru filtrele selectate.</div>`);
      setHtml("recentControls", recent.map(c => {
        const color = colorByResult(c.result);
        const active = String(c.id) === String(selectedControlId) ? " active" : "";
        return `<div class="recent-row${active}" data-control-id="${escapeAttr(c.id)}" title="Click pentru fisa si pozitionare pe harta"><div class="status-dot" style="color:${color}">OK</div><div><div class="recent-title">${escapeHtml(c.control_type || "Control")}</div><div class="recent-meta">${escapeHtml(c.garda || "-")} - ${escapeHtml(formatDate(c.created_at))}</div><div class="recent-meta">Rezultat: <span class="result" style="color:${color}">${escapeHtml(resultLabel(c.result))}</span></div></div><div>&gt;</div></div>`;
      }).join(""));
    }

    function renderMoneySummary(arr) {
      const now = new Date();
      const startToday = new Date(now); startToday.setHours(0,0,0,0);
      const start30 = new Date(now); start30.setDate(now.getDate() - 30); start30.setHours(0,0,0,0);
      const today = arr.filter(c => new Date(c.created_at) >= startToday);
      const last30 = arr.filter(c => new Date(c.created_at) >= start30);
      setText("moneyTodayCount", today.length);
      setText("moneyTodayTotal", formatMoney(sumBy(today, getFineAmount)));
      setText("money30Count", last30.length);
      setText("money30Total", formatMoney(sumBy(last30, getFineAmount)));
      setText("damage30Total", formatMoney(sumBy(last30, getDamageAmount)));
    }

    function renderLinkedMapFilterPill() {
      const anchor = q("visibleCount");
      if (!anchor) return;
      let pill = q("linkedMapFilterPill");
      if (!linkedMapFilterLabel) {
        if (pill) pill.remove();
        return;
      }
      if (!pill) {
        pill = document.createElement("button");
        pill.id = "linkedMapFilterPill";
        pill.type = "button";
        pill.className = "linked-filter-pill";
        anchor.insertAdjacentElement("afterend", pill);
      }
      pill.innerHTML = `<span>${escapeHtml(linkedMapFilterLabel)}</span><b>Reset</b>`;
    }

    function goToMapWithControls(controls, label = "") {
      const arr = Array.isArray(controls) ? controls.filter(Boolean) : [];
      linkedMapFilterLabel = label;
      filteredControls = arr;
      setView("map");
      renderLinkedMapFilterPill();
      setMessage(arr.length ? `${arr.length} controale afisate pe harta.` : "Nu exista controale pentru legatura selectata.", Boolean(arr.length));
    }

    function controlsForInspector(inspectorName, baseArr = allControls) {
      const target = normalizeText(inspectorName);
      if (!target) return [];
      return (baseArr || []).filter(c => {
        const team = Array.isArray(c.echipa) ? c.echipa : [];
        return team.some(m => normalizeText(m && (m.nume || m.name || m.full_name || m.email)) === target)
          || normalizeText(getInspectorNames(c)).split(",").map(x => normalizeText(x)).includes(target);
      });
    }

    function controlsForGuard(guardName, baseArr = allControls) {
      const key = canonicalGuardName(guardName);
      if (!key) return [];
      return (baseArr || []).filter(c => canonicalGuardName(c.garda) === key);
    }

    function controlsForEntity(entityName, baseArr = allControls) {
      const target = normalizeText(entityName);
      if (!target) return [];
      return (baseArr || []).filter(c => normalizeText(getEntityName(c)) === target);
    }

    function openEntityFromControl(controlOrId) {
      if (!isInternalMode) return setMessage("Dosarul entitatii este disponibil doar in modul intern.", false);
      const control = typeof controlOrId === "object" ? controlOrId : getControlById(controlOrId);
      const entityName = control ? getEntityName(control) : "";
      if (!entityName) return setMessage("Controlul nu are entitate controlata completata.", false);
      closeControlFullModal();
      if (q("entitySearch")) q("entitySearch").value = entityName;
      setView("entities");
      setTimeout(() => {
        renderEntitiesView();
        q("entitySummary")?.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }, 60);
    }

    function openPetitionFromControl(controlOrId) {
      const control = typeof controlOrId === "object" ? controlOrId : getControlById(controlOrId);
      const petitionNumber = control ? getPetitionNumber(control) : "";
      if (!control || !petitionNumber) return setMessage("Controlul nu are sesizare asociata.", false);
      closeControlFullModal();
      if (q("petitionNumberSearch")) q("petitionNumberSearch").value = petitionNumber;
      setView("petitions");
      setTimeout(() => {
        renderPetitionSearch(false);
        openPetitionFullModal(control.id);
      }, 80);
    }

    function openControlReportWorkflow(controlOrId) {
      if (!isInternalMode) return setMessage("Finalizarea raportului este disponibila doar in modul intern.", false);
      const control = typeof controlOrId === "object" ? controlOrId : getControlById(controlOrId);
      if (!control) return;
      reportWorkflowFocusId = String(control.id);
      closeControlFullModal();
      inspectorSection = "reports";
      setView("inspectori");
      setTimeout(() => loadReportWorkflowItems(true), 80);
    }

    function openInspectorControls(inspectorName) {
      const base = currentView === "inspectori" ? getInspectorBaseControls() : allControls;
      goToMapWithControls(controlsForInspector(inspectorName, base), `Inspector: ${inspectorName}`);
    }

    function openGuardControls(guardName) {
      const key = canonicalGuardName(guardName);
      const select = q("gardaFilter");
      if (key && select && [...select.options].some(option => option.value === key)) {
        select.value = key;
        filteredControls = filterControls();
        linkedMapFilterLabel = `Garda: ${guardDisplayName(guardName)}`;
        setView("map");
        renderLinkedMapFilterPill();
        return;
      }
      goToMapWithControls(controlsForGuard(guardName), `Garda: ${guardDisplayName(guardName)}`);
    }

    function openEntityControls(entityName) {
      goToMapWithControls(controlsForEntity(entityName, allControls), `Entitate: ${entityName}`);
    }

    function openInstitutionReportMap() {
      const target = safeValue("institutionReportTarget", "national");
      const baseReportArr = getModulePeriodControls("report");
      const arr = target === "national" ? baseReportArr : baseReportArr.filter(c => canonicalGuardName(c.garda) === target);
      const label = target === "national" ? "Raport institutional" : `Raport: ${GUARD_DISPLAY_NAMES[target] || target}`;
      goToMapWithControls(arr, label);
    }

    function getQuantitativeRange(values) {
      const finite = (values || []).map(Number).filter(Number.isFinite);
      return {
        min: finite.length ? Math.min(...finite) : 0,
        max: finite.length ? Math.max(...finite) : 0
      };
    }

    function quantitativeColor(value, min, max, inverse = false) {
      const numeric = Number(value);
      if (!Number.isFinite(numeric)) return chartColors.neutral;
      let ratio = max > min ? Math.max(0, Math.min(1, (numeric - min) / (max - min))) : 1;
      if (inverse) ratio = 1 - ratio;
      const scaled = ratio * (QUANTITATIVE_PALETTE.length - 1);
      const lower = Math.floor(scaled);
      const upper = Math.min(QUANTITATIVE_PALETTE.length - 1, Math.ceil(scaled));
      if (lower === upper) return QUANTITATIVE_PALETTE[lower];
      return mixHex(QUANTITATIVE_PALETTE[lower], QUANTITATIVE_PALETTE[upper], scaled - lower);
    }

    function quantitativeColors(values, inverse = false) {
      const range = getQuantitativeRange(values);
      return (values || []).map(value => quantitativeColor(value, range.min, range.max, inverse));
    }

    function makeChart(id, type, labels, data, options = {}) {
      const el = q(id); if (!el) return null;
      if (charts[id]) charts[id].destroy();
      labels = (labels || []).map(toAsciiText);
      const colors = options.colors || (type === "bar"
        ? quantitativeColors(data, isRiskQuantitativeMetric(options.metricKey))
        : labels.map((_, i) => palette[i % palette.length]));
      const quiet = options.quiet === true;
      charts[id] = new Chart(el.getContext("2d"), {
        type,
        data: { labels, datasets: [{ label: options.label || "Nr.", data, backgroundColor: type === "line" ? "rgba(22,217,119,.18)" : colors, borderColor: type === "line" ? chartColors.green : colors, borderWidth: type === "doughnut" ? 2 : 1, tension: .42, fill: type === "line", pointRadius: type === "line" ? 4 : 0, pointBackgroundColor: chartColors.green }] },
        options: {
          responsive: true, maintainAspectRatio: false, animation: { duration: quiet ? 480 : 950, easing: "easeOutQuart" }, indexAxis: options.horizontal ? "y" : "x", cutout: type === "doughnut" ? "62%" : undefined,
          layout: type === "bar" ? { padding: { top: 28, right: 10, bottom: 4, left: 4 } } : { padding: { top: 8, right: 8, bottom: 4, left: 4 } },
          plugins: { legend: { display: type === "doughnut", position: "right", labels: { color: quiet ? "rgba(244,252,249,.90)" : chartColors.text, boxWidth: 11, font: { size: 11, weight: "600" } } }, tooltip: { backgroundColor: quiet ? "rgba(3,18,22,.98)" : "rgba(5,16,14,.95)", titleColor:"#fff", bodyColor: quiet ? "rgba(239,250,247,.90)" : "#d7eee6", borderColor: quiet ? "rgba(34,211,238,.28)" : "rgba(22,217,119,.35)", borderWidth:1, padding:10, callbacks: Array.isArray(options.tooltipLabels) ? { title(items) { const index = items && items.length ? items[0].dataIndex : -1; return index >= 0 ? String(options.tooltipLabels[index] || items[0].label || "") : ""; } } : undefined } },
          scales: type === "doughnut" ? {} : { x: { ticks: { color: quiet ? "rgba(235,246,242,.80)" : chartColors.text, font: { size: 13, weight: "500" } }, grid: { display: !options.horizontal, color: quiet ? "rgba(205,238,228,.08)" : chartColors.grid } }, y: { beginAtZero: true, grace: "12%", ticks: { precision: 0, color: quiet ? "rgba(235,246,242,.80)" : chartColors.text, font: { size: 13, weight: "500" } }, grid: { color: quiet ? "rgba(205,238,228,.08)" : chartColors.grid } } }
        }
      });
      return charts[id];
    }

    function monthKey(c) { const d = new Date(c.created_at); if (isNaN(d)) return "Necunoscut"; return d.getFullYear() + "-" + String(d.getMonth()+1).padStart(2,"0"); }
    function yearKey(c) { const d = new Date(c.created_at); return isNaN(d) ? "Necunoscut" : String(d.getFullYear()); }
    function monthLabel(k) { if (!/^\d{4}-\d{2}$/.test(k)) return k; const [y,m] = k.split("-"); return new Date(Number(y), Number(m)-1, 1).toLocaleString("ro-RO", { month:"short", year:"2-digit" }); }


    function renderDashboardView() {
      const arr = filteredControls;
      const sanctions = arr.filter(c => c.result === "sanctiune" || c.result === "sesizare_penala").length;
      setText("dashTotalControls", arr.length);
      setText("dashSanctions", sanctions);
      setText("dashFines", formatMoney(sumBy(arr, getFineAmount)));
      setText("dashTotalTrend", arr.length + " controale pe filtrele active");

      const byM = countBy(arr, monthKey);
      const months = Object.keys(byM).sort();
      makeChart("chartDashboardTrend", "line", months.map(monthLabel), months.map(k => byM[k]), {
        label: "Controale",
        area: true
      });

      const byType = countBy(arr, c => c.control_type);
      const typeTop = topEntries(byType, 8);
      makeChart("chartDashboardTypes", "doughnut", typeTop.map(x => x[0]), typeTop.map(x => x[1]), {
        label: "Tipuri"
      });

      const byResult = countBy(arr, c => resultLabel(c.result));
      const resultTop = topEntries(byResult, 8);
      makeChart("chartDashboardResults", "bar", resultTop.map(x => x[0]), resultTop.map(x => x[1]), {
        label: "Rezultate",
        colors: resultTop.map(x => colorByResult(normalizeResultLabelBack(x[0])))
      });

      const byG = countBy(arr, c => c.garda);
      const gTop = topEntries(byG, 8);
      makeChart("chartDashboardTopGarzi", "bar", gTop.map(x => gardaShortLabel(x[0])), gTop.map(x => x[1]), {
        label: "Controale",
        horizontal: true
      });

      renderDashboardRecentTable(arr);
    }

    function renderDashboardRecentTable(arr) {
      const recent = [...arr].sort((a,b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 12);
      if (!recent.length) {
        return setHtml("dashboardRecentTable", `<div class="empty">Nu exista controale pentru filtrele selectate.</div>`);
      }

      setHtml("dashboardRecentTable", `<table>
        <thead>
          <tr>
            <th>Data</th>
            <th>Garda</th>
            <th>Tip control</th>
            <th>Categorie</th>
            <th>Rezultat</th>
            <th>Suma</th>
          </tr>
        </thead>
        <tbody>
          ${recent.map(c => {
            const color = colorByResult(c.result);
            return `<tr>
              <td>${escapeHtml(formatDay(c.created_at))}</td>
              <td>${escapeHtml(c.garda || "-")}</td>
              <td>${escapeHtml(c.control_type || "-")}</td>
              <td>${escapeHtml(getControlCategory(c) || "-")}</td>
              <td><span class="activity-table-badge" style="color:${color}">${escapeHtml(resultLabel(c.result))}</span></td>
              <td>${escapeHtml(formatMoney(getFineAmount(c)))}</td>
            </tr>`;
          }).join("")}
        </tbody>
      </table>`);
    }

    function getGuardNameFromFeature(feature) {
      const p = feature && feature.properties ? feature.properties : {};
      return p.GARDA || p.garda || p.Garda || p.NUME || p.nume || p.NAME || p.name || p.DENUMIRE || p.denumire || p.GF || "Garda forestiera";
    }

    function getPeriodMonths(arr, range = null) {
      let start = range && range.dateFrom ? new Date(range.dateFrom) : null;
      let end = range && range.dateTo ? new Date(range.dateTo + "T23:59:59") : null;

      if (!start || isNaN(start)) {
        const dates = arr.map(c => new Date(c.created_at)).filter(d => !isNaN(d));
        start = dates.length ? new Date(Math.min(...dates)) : new Date();
      }

      if (!end || isNaN(end)) {
        const dates = arr.map(c => new Date(c.created_at)).filter(d => !isNaN(d));
        end = dates.length ? new Date(Math.max(...dates)) : new Date();
      }

      const diffDays = Math.max(1, (end - start) / (1000 * 60 * 60 * 24));
      return Math.max(1, diffDays / 30.44);
    }

    function buildGuardStats(arr, range = null) {
      const months = getPeriodMonths(arr, range);
      const stats = {};

      Object.keys(GUARD_FOREST_AREA_HA).forEach(key => {
        stats[key] = {
          garda: GUARD_DISPLAY_NAMES[key] || key,
          guard_key: key,
          forestAreaHa: GUARD_FOREST_AREA_HA[key],
          total: 0,
          monthly: 0,
          density: 0,
          problems: 0,
          problemRate: 0,
          sanctions: 0,
          sanctionRate: 0,
          petitions: 0,
          petitionShare: 0,
          fines: 0,
          finePerControl: 0,
          damage: 0,
          damagePerControl: 0,
          reportDaysSum: 0,
          reportDaysCount: 0,
          reportAvgDays: null,
          petitionReportDaysSum: 0,
          petitionReportDaysCount: 0,
          petitionAvgDays: null,
          missingReports: 0,
          overdueReports: 0,
          conform: 0,
          neconform: 0,
          avertisment: 0,
          sanctiune: 0,
          sesizare_penala: 0
        };
      });

      arr.forEach(c => {
        const rawGarda = c.garda || "Necunoscut";
        const key = canonicalGuardName(rawGarda) || normalizeText(rawGarda) || "necunoscut";
        const displayName = guardDisplayName(rawGarda);
        if (!stats[key]) {
          stats[key] = {
            garda: displayName,
            guard_key: key,
            forestAreaHa: GUARD_FOREST_AREA_HA[key] || 0,
            total: 0,
            monthly: 0,
            density: 0,
            problems: 0,
            problemRate: 0,
            sanctions: 0,
            sanctionRate: 0,
            petitions: 0,
            petitionShare: 0,
            fines: 0,
            fineDataCount: 0,
            finePerControl: 0,
            damage: 0,
            damagePerControl: 0,
            reportDaysSum: 0,
            reportDaysCount: 0,
            reportAvgDays: null,
            petitionReportDaysSum: 0,
            petitionReportDaysCount: 0,
            petitionAvgDays: null,
            missingReports: 0,
            overdueReports: 0,
            conform: 0,
            neconform: 0,
            avertisment: 0,
            sanctiune: 0,
            sesizare_penala: 0
          };
        }

        stats[key].total += 1;
        stats[key].fines += getFineAmount(c);
        stats[key].damage += getDamageAmount(c);
        if (isProblemResult(c.result)) stats[key].problems += 1;
        if (c.result === "sanctiune" || c.result === "sesizare_penala") stats[key].sanctions += 1;
        if (isPetition(c)) stats[key].petitions += 1;
        const reportDays = getControlDaysToReport(c);
        const hasReport = getControlHasReport(c);
        if (Number.isFinite(Number(reportDays))) {
          stats[key].reportDaysSum += Number(reportDays);
          stats[key].reportDaysCount += 1;
          if (isPetition(c)) {
            stats[key].petitionReportDaysSum += Number(reportDays);
            stats[key].petitionReportDaysCount += 1;
          }
        }
        if (!hasReport) stats[key].missingReports += 1;
        if (!hasReport && Number(reportDays) > 10) stats[key].overdueReports += 1;
        if (stats[key][c.result] !== undefined) stats[key][c.result] += 1;
      });

      Object.values(stats).forEach(item => {
        const total = Number(item.total || 0);
        const area = Number(item.forestAreaHa || 0);
        item.monthly = item.total / months;
        item.density = area ? (total / area) * 10000 : 0;
        item.problemRate = total ? (item.problems / total) * 100 : 0;
        item.sanctionRate = total ? (item.sanctions / total) * 100 : 0;
        item.petitionShare = total ? (item.petitions / total) * 100 : 0;
        item.finePerControl = total ? item.fines / total : 0;
        item.damagePerControl = total ? item.damage / total : 0;
        item.reportAvgDays = item.reportDaysCount ? item.reportDaysSum / item.reportDaysCount : null;
        item.petitionAvgDays = item.petitionReportDaysCount ? item.petitionReportDaysSum / item.petitionReportDaysCount : null;
      });

      return { stats, months };
    }

    function formatPercent(v) { return Number(v || 0).toFixed(1) + "%"; }

    const GUARD_METRICS = {
      monthly: { label: "Controale / luna", short: "controale/luna", format: v => Number(v || 0).toFixed(1), palette: "green" },
      total: { label: "Total controale", short: "controale", format: v => String(Math.round(v || 0)), palette: "green" },
      density: { label: "Controale / 10.000 ha", short: "controale/10k ha", format: v => Number(v || 0).toFixed(2), palette: "green" },
      problemRate: { label: "Rata controale cu probleme", short: "probleme %", format: formatPercent, palette: "red" },
      sanctionRate: { label: "Rata sanctiuni + sesizari penale", short: "masuri %", format: formatPercent, palette: "purple" },
      petitionShare: { label: "Pondere controale generate de sesizari", short: "sesizari %", format: formatPercent, palette: "blue" },
      finePerControl: { label: "Amenzi / control", short: "amenzi/control", format: v => formatMoney(v), palette: "orange" },
      damagePerControl: { label: "Prejudiciu / control", short: "prejudiciu/control", format: v => formatMoney(v), palette: "blue" },
      problems: { label: "Controale cu probleme", short: "probleme", format: v => String(Math.round(v || 0)), palette: "red" },
      sanctions: { label: "Sanctiuni + sesizari penale", short: "masuri", format: v => String(Math.round(v || 0)), palette: "purple" },
      fines: { label: "Cuantum amenzi", short: "amenzi", format: v => formatMoney(v), palette: "orange" },
      damage: { label: "Prejudiciu estimat", short: "prejudiciu", format: v => formatMoney(v), palette: "blue" },
      reportAvgDays: { label: "Timp mediu finalizare raport", short: "zile finalizare", format: v => formatDays(v), palette: "time" },
      petitionAvgDays: { label: "Timp mediu raspuns sesizari", short: "raspuns sesizari", format: v => formatDays(v), palette: "time" },
      missingReports: { label: "Controale fara raport", short: "fara raport", format: v => String(Math.round(v || 0)), palette: "red" },
      overdueReports: { label: "Controale intarziate peste 10 zile", short: "intarziate >10 zile", format: v => String(Math.round(v || 0)), palette: "timeCount" }
    };

    function hexToRgb(hex) {
      const h = String(hex || "#000000").replace("#", "");
      return {
        r: parseInt(h.substring(0, 2), 16),
        g: parseInt(h.substring(2, 4), 16),
        b: parseInt(h.substring(4, 6), 16)
      };
    }

    function rgbToHex(r, g, b) {
      return "#" + [r, g, b].map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0")).join("");
    }

    function mixHex(a, b, t) {
      const ca = hexToRgb(a);
      const cb = hexToRgb(b);
      return rgbToHex(ca.r + (cb.r - ca.r) * t, ca.g + (cb.g - ca.g) * t, ca.b + (cb.b - ca.b) * t);
    }

    function valueQuantile(sortedValues, percentile) {
      if (!sortedValues.length) return 0;
      const index = (sortedValues.length - 1) * percentile;
      const lower = Math.floor(index);
      const upper = Math.ceil(index);
      if (lower === upper) return sortedValues[lower];
      return sortedValues[lower] + (sortedValues[upper] - sortedValues[lower]) * (index - lower);
    }

    function getValueDistribution(values) {
      const positive = (values || [])
        .map(Number)
        .filter(value => Number.isFinite(value) && value > 0)
        .sort((a, b) => a - b);
      return {
        min: positive[0] || 0,
        max: positive[positive.length - 1] || 0,
        q25: valueQuantile(positive, .25),
        median: valueQuantile(positive, .5),
        q75: valueQuantile(positive, .75),
        q90: valueQuantile(positive, .9)
      };
    }

    function getPerformanceTone(value, stats, direction = "higher") {
      const numeric = Number(value || 0);
      if (!Number.isFinite(numeric) || numeric <= 0) return "neutral";
      if (!stats || stats.min === stats.max) return "amber";

      let tone = "green";
      if (numeric <= stats.q25) tone = "coral";
      else if (numeric <= stats.median) tone = "orange";
      else if (numeric <= stats.q75) tone = "amber";
      else if (numeric <= stats.q90) tone = "lime";

      if (direction !== "lower") return tone;
      return {
        coral: "green",
        orange: "lime",
        amber: "amber",
        lime: "orange",
        green: "coral"
      }[tone] || tone;
    }

    function getSemanticColor(tone) {
      return {
        neutral: chartColors.neutral,
        coral: chartColors.coral,
        red: chartColors.red,
        orange: chartColors.orange,
        amber: chartColors.amber,
        yellow: chartColors.yellow,
        lime: chartColors.lime,
        green: chartColors.green,
        cyan: chartColors.teal,
        blue: chartColors.blue,
        violet: chartColors.purple
      }[tone] || chartColors.neutral;
    }

    function getValueColor(value, stats, direction = "higher") {
      return getSemanticColor(getPerformanceTone(value, stats, direction));
    }

    function getValueColors(values, direction = "higher") {
      return quantitativeColors(values, direction === "lower");
    }

    function guardColor(value, max, metricKey) {
      return quantitativeColor(value, 0, Number(max || 0), isRiskQuantitativeMetric(metricKey));
    }


    function gradientColorsByValues(values, metricKey) {
      return quantitativeColors(values, isRiskQuantitativeMetric(metricKey));
    }

    function initGuardStatsMap() {
      if (guardStatsMap || !q("guardStatsMap")) return;
      guardStatsMap = L.map("guardStatsMap", {
        zoomControl: false,
        attributionControl: false,
        dragging: true,
        scrollWheelZoom: false
      }).setView([45.8, 24.9], 6);

      guardStatsMap.createPane("guardBasePane");
      guardStatsMap.getPane("guardBasePane").style.zIndex = 200;
      guardStatsMap.createPane("guardLabelsPane");
      guardStatsMap.getPane("guardLabelsPane").style.zIndex = 360;
      guardStatsMap.getPane("guardLabelsPane").style.pointerEvents = "none";
      guardStatsMap.createPane("guardStatsPane");
      guardStatsMap.getPane("guardStatsPane").style.zIndex = 430;

      guardStatsBaseLayer = L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
        attribution: "&copy; OpenStreetMap contributors &copy; CARTO",
        subdomains: "abcd",
        maxZoom: 20,
        pane: "guardBasePane"
      }).addTo(guardStatsMap);

      guardStatsLabelLayer = L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_only_labels/{z}/{x}/{y}{r}.png", {
        attribution: "&copy; OpenStreetMap contributors &copy; CARTO",
        subdomains: "abcd",
        maxZoom: 20,
        pane: "guardLabelsPane"
      }).addTo(guardStatsMap);

      L.control.zoom({ position: "topright" }).addTo(guardStatsMap);
    }


    function canonicalGuardName(name) {
      const raw = normalizeText(name || "");
      let s = raw
        .replace(/garda\s+forestiera/g, "")
        .replace(/garda/g, "")
        .replace(/forestiera/g, "")
        .replace(/municipiul/g, "")
        .replace(/judetul/g, "")
        .trim();

      const aliases = [
        ["bucuresti", "bucuresti"],
        ["brasov", "brasov"],
        ["cluj", "cluj"],
        ["suceava", "suceava"],
        ["timisoara", "timisoara"],
        ["ramnicu valcea", "ramnicu valcea"],
        ["rimnicu valcea", "ramnicu valcea"],
        ["valcea", "ramnicu valcea"],
        ["focsani", "focsani"],
        ["vrancea", "focsani"],
        ["oradea", "oradea"],
        ["bihor", "oradea"],
        ["ploiesti", "ploiesti"],
        ["prahova", "ploiesti"]
      ];

      for (const [needle, key] of aliases) {
        if (s.includes(needle)) return key;
      }

      return s;
    }

    function guardDisplayName(name) {
      const key = canonicalGuardName(name);
      return GUARD_DISPLAY_NAMES[key] || String(name || "Necunoscut").trim();
    }

    function buildGuardStatsLookup(stats) {
      const lookup = {};
      Object.values(stats || {}).forEach(item => {
        const key = canonicalGuardName(item.garda);
        if (key) lookup[key] = item;
      });
      return lookup;
    }

    function getGuardStatForFeature(feature, stats, lookup) {
      const name = getGuardNameFromFeature(feature);
      return (lookup && lookup[canonicalGuardName(name)])
        || stats[name]
        || stats[Object.keys(stats).find(k => normalizeText(k) === normalizeText(name))]
        || null;
    }

    function guardValueOpacity(value, max) {
      if (!max || !value) return 0.16;
      const r = Math.max(0, Math.min(1, Number(value) / Number(max || 1)));
      return 0.52 + r * 0.43;
    }

    function renderGuardStatsMap() {
      if (currentView !== "garzi" && currentView !== "dashboard") return;
      if (!q("guardStatsMap")) return;
      initGuardStatsMap();
      if (!guardStatsMap || !guardStatsGeoJson) return;

      const metricKey = safeValue("guardMapMetric", "monthly");
      const metric = GUARD_METRICS[metricKey] || GUARD_METRICS.monthly;
      const guardArr = getGuardAnalyticsControls();
      const guardRange = getGuardFilters();
      const { stats, months } = buildGuardStats(guardArr, guardRange);
      const statsLookup = buildGuardStatsLookup(stats);
      const metricValue = item => {
        const raw = item ? item[metricKey] : null;
        if (metric.palette === "time" && (raw === null || raw === undefined || raw === "")) return null;
        const n = Number(raw || 0);
        return Number.isFinite(n) ? n : 0;
      };
      const geoValues = (guardStatsGeoJson.features || []).map(feature => {
        const item = getGuardStatForFeature(feature, stats, statsLookup);
        return metricValue(item);
      }).filter(v => v !== null);
      const values = Object.values(stats).map(metricValue).filter(v => v !== null);
      const valueRange = getQuantitativeRange([...values, ...geoValues]);
      const min = valueRange.min;
      const max = valueRange.max;
      const avg = values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0;

      setText("guardMapMax", metric.palette === "time" && !values.length ? "-" : metric.format(max));
      setText("guardMapAvg", metric.palette === "time" && !values.length ? "-" : metric.format(avg));
      setText("guardMapMonths", months.toFixed(1) + " luni");
      setText("guardMetricLabel", metric.short);

      if (guardStatsLayer) guardStatsMap.removeLayer(guardStatsLayer);

      guardStatsLayer = L.geoJSON(guardStatsGeoJson, {
        pane: "guardStatsPane",
        style: feature => {
          const item = getGuardStatForFeature(feature, stats, statsLookup);
          const value = metricValue(item) || 0;
          const fill = quantitativeColor(value, min, max, isRiskQuantitativeMetric(metricKey));
          return {
            color: value ? "rgba(230,255,248,1)" : "rgba(148,213,190,.38)",
            weight: value ? 2.05 : 1.0,
            opacity: 1,
            fillColor: fill,
            fillOpacity: guardValueOpacity(value, max),
            className: "garda-boundary"
          };
        },
        onEachFeature: (feature, layer) => {
          const name = getGuardNameFromFeature(feature);
          const item = getGuardStatForFeature(feature, stats, statsLookup) || { total: 0, monthly: 0, density: 0, problems: 0, problemRate: 0, sanctions: 0, sanctionRate: 0, petitionShare: 0, fines: 0, finePerControl: 0, damage: 0, damagePerControl: 0, forestAreaHa: 0, reportAvgDays: null, petitionAvgDays: null, missingReports: 0, overdueReports: 0 };
          const html = `<div class="guard-stat-tooltip">
            <div class="guard-stat-tooltip-title">${escapeHtml(name)}</div>
            <div class="guard-stat-tooltip-row"><span>${escapeHtml(metric.label)}</span><span>${escapeHtml(metric.format(item[metricKey] || 0))}</span></div>
            <div class="guard-stat-tooltip-row"><span>Total controale</span><span>${item.total || 0}</span></div>
            <div class="guard-stat-tooltip-row"><span>Controale/luna</span><span>${Number(item.monthly || 0).toFixed(1)}</span></div>
            <div class="guard-stat-tooltip-row"><span>Suprafata padure</span><span>${Number(item.forestAreaHa || 0).toLocaleString("ro-RO")} ha</span></div>
            <div class="guard-stat-tooltip-row"><span>Controale/10.000 ha</span><span>${Number(item.density || 0).toFixed(2)}</span></div>
            <div class="guard-stat-tooltip-row"><span>Probleme</span><span>${item.problems || 0}</span></div>
            <div class="guard-stat-tooltip-row"><span>Rata probleme</span><span>${formatPercent(item.problemRate || 0)}</span></div>
            <div class="guard-stat-tooltip-row"><span>Pondere sesizari</span><span>${formatPercent(item.petitionShare || 0)}</span></div>
            <div class="guard-stat-tooltip-row"><span>Timp finalizare raport</span><span>${escapeHtml(formatDays(item.reportAvgDays))}</span></div>
            <div class="guard-stat-tooltip-row"><span>Raspuns sesizari</span><span>${escapeHtml(formatDays(item.petitionAvgDays))}</span></div>
            <div class="guard-stat-tooltip-row"><span>Fara raport</span><span>${item.missingReports || 0}</span></div>
            <div class="guard-stat-tooltip-row"><span>Intarziate &gt;10 zile</span><span>${item.overdueReports || 0}</span></div>
            <div class="guard-stat-tooltip-row"><span>Amenzi</span><span>${escapeHtml(formatMoney(item.fines))}</span></div>
            <div class="guard-stat-tooltip-row"><span>Amenzi/control</span><span>${escapeHtml(formatMoney(item.finePerControl))}</span></div>
            <div class="guard-stat-tooltip-row"><span>Prejudiciu</span><span>${escapeHtml(formatMoney(item.damage))}</span></div>
          </div>`;

          layer.bindTooltip(html, { sticky: true, direction: "auto", opacity: .96, className: "leaflet-popup-content-wrapper" });
          layer.on("mouseover", () => layer.setStyle({ weight: 2.2, color: "#ffffff", fillOpacity: .88 }));
          layer.on("mouseout", () => guardStatsLayer.resetStyle(layer));
        }
      }).addTo(guardStatsMap);

      try { guardStatsMap.fitBounds(guardStatsLayer.getBounds(), { padding: [18, 18] }); } catch {}

      const legend = q("guardMapLegend");
      if (legend) {
        const gradient = `linear-gradient(90deg,${quantitativePaletteForMetric(metricKey).join(",")})`;
        legend.innerHTML = `<div class="guard-stat-legend-title">${escapeHtml(metric.label)}</div><div class="guard-stat-gradient" style="background:${gradient}"></div><div class="guard-stat-legend-range"><span>${escapeHtml(metric.format(min))}</span><span>${escapeHtml(metric.format(max))}</span></div>`;
      }

      renderGuardRanking(stats, metricKey);
      setTimeout(() => guardStatsMap.invalidateSize(), 120);
    }

    function renderGuardRanking(stats, metricKey) {
      const metric = GUARD_METRICS[metricKey] || GUARD_METRICS.monthly;
      const rows = Object.values(stats)
        .sort((a, b) => Number(b[metricKey] || 0) - Number(a[metricKey] || 0))
        .slice(0, 8);

      if (!rows.length) {
        setHtml("guardRankingList", `<div class="empty">Nu exista date pe filtrele selectate.</div>`);
        return;
      }

      const rankingRange = getQuantitativeRange(rows.map(item => Number(item[metricKey] || 0)));
      setHtml("guardRankingList", rows.map((item, i) => `<div class="guard-rank-row">
        <div class="guard-rank-index">#${i + 1}</div>
        <div class="guard-rank-name" title="${escapeHtml(item.garda)}">${escapeHtml(item.garda)}</div>
        <div class="guard-rank-value" style="--guard-rank-color:${quantitativeColor(item[metricKey], rankingRange.min, rankingRange.max, isRiskQuantitativeMetric(metricKey))}">${escapeHtml(metric.format(item[metricKey] || 0))}</div>
      </div>`).join(""));
    }

    function getGuardDensityBenchmark(stats) {
      const rows = Object.values(stats || {});
      const totalControls = rows.reduce((sum, item) => sum + Number(item.total || 0), 0);
      const totalArea = rows.reduce((sum, item) => sum + Number(item.forestAreaHa || 0), 0);
      return totalArea ? (totalControls / totalArea) * 10000 : 0;
    }

    function guardDensityStatus(item, avgDensity) {
      if (!item || !item.total) return { label: "fara date", cls: "muted" };
      if (!avgDensity) return { label: "in calcul", cls: "neutral" };
      const ratio = Number(item.density || 0) / avgDensity;
      if (ratio >= 1.1) return { label: "peste medie", cls: "good" };
      if (ratio >= 0.75) return { label: "in parametri", cls: "neutral" };
      return { label: "sub medie", cls: "warn" };
    }

    function renderGuardScorecard(stats, months) {
      const rows = Object.values(stats || {}).sort((a, b) => Number(b.density || 0) - Number(a.density || 0));
      if (!rows.length) {
        setHtml("guardKpiScorecard", `<div class="empty">Nu exista date pentru matricea KPI.</div>`);
        return;
      }

      const avgDensity = getGuardDensityBenchmark(stats);
      const maxDensity = Math.max(0, ...rows.map(item => Number(item.density || 0)));
      const densityRange = getQuantitativeRange(rows.map(item => Number(item.density || 0)));
      const totalArea = rows.reduce((sum, item) => sum + Number(item.forestAreaHa || 0), 0);
      const totalControls = rows.reduce((sum, item) => sum + Number(item.total || 0), 0);
      const avgReportDays = averageDays(rows.map(item => item.reportAvgDays));
      const avgPetitionDays = averageDays(rows.map(item => item.petitionAvgDays));
      const totalOverdueReports = rows.reduce((sum, item) => sum + Number(item.overdueReports || 0), 0);

      const body = rows.map(item => {
        const status = guardDensityStatus(item, avgDensity);
        const densityPct = maxDensity ? Math.max(3, Math.min(100, (Number(item.density || 0) / maxDensity) * 100)) : 0;
        const delayStatus = Number(item.overdueReports || 0) ? "warn" : "good";
        return `<div class="guard-score-row">
          <div class="guard-score-main">
            <strong>${escapeHtml(item.garda)}</strong>
            <span>${Number(item.forestAreaHa || 0).toLocaleString("ro-RO")} ha padure</span>
          </div>
          <div class="guard-score-density">
            <span>${Number(item.density || 0).toFixed(2)}</span>
            <div class="guard-score-bar"><i style="width:${densityPct}%;background:${quantitativeColor(item.density, densityRange.min, densityRange.max)}"></i></div>
          </div>
          <div>${formatPercent(item.problemRate)}</div>
          <div>${formatPercent(item.petitionShare)}</div>
          <div>${escapeHtml(formatDays(item.reportAvgDays))}</div>
          <div>${escapeHtml(formatDays(item.petitionAvgDays))}</div>
          <div><span class="guard-status ${delayStatus}">${Number(item.overdueReports || 0)}</span></div>
          <div>${escapeHtml(formatMoney(item.finePerControl))}</div>
          <div><span class="guard-status ${status.cls}">${escapeHtml(status.label)}</span></div>
        </div>`;
      }).join("");

      setHtml("guardKpiScorecard", `
        <div class="guard-score-summary guard-kpi-matrix">
          <div><span class="guard-kpi-icon" aria-hidden="true">CTRL</span><span class="guard-kpi-label">Total controale</span><strong>${totalControls}</strong></div>
          <div><span class="guard-kpi-icon" aria-hidden="true">HA</span><span class="guard-kpi-label">Suprafata totala</span><strong>${totalArea.toLocaleString("ro-RO")} ha</strong></div>
          <div><span class="guard-kpi-icon" aria-hidden="true">AVG</span><span class="guard-kpi-label">Media nationala</span><strong>${avgDensity.toFixed(2)} / 10.000 ha</strong></div>
          <div><span class="guard-kpi-icon" aria-hidden="true">DOC</span><span class="guard-kpi-label">Timp finalizare</span><strong>${escapeHtml(formatDays(avgReportDays))}</strong></div>
          <div><span class="guard-kpi-icon" aria-hidden="true">SES</span><span class="guard-kpi-label">Raspuns sesizari</span><strong>${escapeHtml(formatDays(avgPetitionDays))}</strong></div>
          <div><span class="guard-kpi-icon" aria-hidden="true">LATE</span><span class="guard-kpi-label">Intarzieri &gt;10 zile</span><strong>${totalOverdueReports}</strong></div>
        </div>
        <div class="guard-score-head">
          <span>Garda</span>
          <span>Controale / 10.000 ha</span>
          <span>Probleme</span>
          <span>Sesizari</span>
          <span>Finalizare raport</span>
          <span>Raspuns sesizari</span>
          <span>Intarziate</span>
          <span>Amenzi / control</span>
          <span>Status</span>
        </div>
        <div class="guard-score-body">${body}</div>
      `);
    }

    function renderGarziView() {
      const arr = getGuardAnalyticsControls();
      const guardRange = getGuardFilters();
      const { stats, months } = buildGuardStats(arr, guardRange);
      const byG = countBy(arr, c => guardDisplayName(c.garda));
      const top = topEntries(byG, 10);
      const monthlyValues = Object.values(stats).map(s => s.monthly || 0);
      const avgMonthly = monthlyValues.length ? monthlyValues.reduce((a,b) => a+b, 0) / monthlyValues.length : 0;
      const topMonthly = Object.values(stats).sort((a,b) => b.monthly - a.monthly)[0];

      setText("garziTotal", arr.length);
      setText("garziAverage", avgMonthly.toFixed(1));
      setText("garziTop", topMonthly ? gardaShortLabel(topMonthly.garda) : "-");

      renderGuardStatsMap();

      const metricKey = safeValue("guardMapMetric", "monthly");
      const metric = GUARD_METRICS[metricKey] || GUARD_METRICS.monthly;
      const ranked = Object.values(stats).sort((a,b) => Number(b[metricKey] || 0) - Number(a[metricKey] || 0)).slice(0, 5);
      const moneyMetrics = ["fines", "damage", "finePerControl", "damagePerControl"];
      const chartValues = ranked.map(x => moneyMetrics.includes(metricKey) ? Math.round(Number(x[metricKey] || 0)) : Number(Number(x[metricKey] || 0).toFixed(2)));
      makeChart("chartGarziBars", "bar", ranked.map(x => gardaShortLabel(x.garda)), chartValues, { label: metric.short, colors: gradientColorsByValues(chartValues, metricKey), tooltipLabels: ranked.map(x => x.garda) });
      renderGuardScorecard(stats, months);

      const byM = countBy(arr, monthKey); const monthsKeys = Object.keys(byM).sort();
      makeChart("chartGarziMonthly", "line", monthsKeys.map(monthLabel), monthsKeys.map(k => byM[k]), { label: "Controale" });

      const problems = topEntries(countBy(arr.filter(c => isProblemResult(c.result)), c => guardDisplayName(c.garda)), 10);
      const problemValues = problems.map(x => Number(x[1] || 0));
      makeChart("chartGarziProblems", "bar", problems.map(x => gardaShortLabel(x[0])), problemValues, {
        colors: gradientColorsByValues(problemValues, "problems"),
        label: "Probleme"
      });

      const byType = countBy(arr, c => c.control_type); const types = Object.keys(byType); const guards = Math.max(1, Object.keys(byG).length);
      const typeAvgValues = types.map(t => Math.round(byType[t] / guards));
      makeChart("chartTypeAverage", "bar", types, typeAvgValues, {
        label: "Media / garda",
        colors: gradientColorsByValues(typeAvgValues, "total")
      });

      const moneyByG = {};
      arr.forEach(c => {
        const g = c.garda || "Necunoscut";
        moneyByG[g] = (moneyByG[g] || 0) + getFineAmount(c) + getDamageAmount(c);
      });
      const moneyTop = topEntries(moneyByG, 10);
      const moneyValues = moneyTop.map(x => Math.round(x[1]));
      makeChart("chartGarziMoney", "bar", moneyTop.map(x => gardaShortLabel(x[0])), moneyValues, {
        label: "lei",
        colors: gradientColorsByValues(moneyValues, "fines")
      });
    }

    function readInspectorFilterState() {
      inspectorFilterState = {
        periodPreset: safeValue("inspectorPeriodPreset", "last180"),
        dateFrom: safeValue("inspectorDateFrom", ""),
        dateTo: safeValue("inspectorDateTo", ""),
        guard: safeValue("inspectorGardaScope", "toate"),
        type: safeValue("inspectorTypeScope", "toate"),
        result: safeValue("inspectorResultScope", "toate")
      };
      return inspectorFilterState;
    }

    function getInspectorFilteredControls(baseArr, state = inspectorFilterState, options = {}) {
      const includePeriod = options.includePeriod !== false;
      let arr = Array.isArray(baseArr) ? [...baseArr] : [];
      const guard = state.guard || "toate";
      const type = state.type || "toate";
      const result = state.result || "toate";
      if (guard !== "toate") {
        const guardKey = canonicalGuardName(guard);
        arr = arr.filter(c => canonicalGuardName(c.garda) === guardKey);
      }
      if (type !== "toate") arr = arr.filter(c => normalizeText(c.control_type) === normalizeText(type));
      if (result !== "toate") arr = arr.filter(c => normalizeText(c.result) === normalizeText(result));
      if (includePeriod) {
        const from = normalizeInspectorChartDate(state.dateFrom);
        const to = normalizeInspectorChartDate(state.dateTo);
        arr = arr.filter(c => {
          const date = normalizeInspectorChartDate(getControlDateValue(c));
          if (!date) return false;
          return (!from || date >= from) && (!to || date <= to);
        });
      }
      return arr;
    }

    function getInspectorBaseControls() {
      return getInspectorFilteredControls(allControls, readInspectorFilterState());
    }

    function getInspectorPrimaryGuard(inspector, arr) {
      if (!inspector) return "";
      const counts = {};
      arr.forEach(c => {
        if (!(c.echipa || []).some(m => m.nume === inspector)) return;
        const key = canonicalGuardName(c.garda);
        if (key) counts[key] = (counts[key] || 0) + 1;
      });
      const top = Object.entries(counts).sort((a,b) => b[1] - a[1])[0];
      return top ? top[0] : "";
    }

    function filterInspectorComparisonScope(arr, selectedInspector) {
      const scope = safeValue("inspectorCompareScope", "national");
      if (scope === "national") return arr;

      let guardKey = "";
      if (scope === "same_guard") guardKey = getInspectorPrimaryGuard(selectedInspector, arr);
      if (scope === "selected_guard") guardKey = safeValue("inspectorGardaScope", "toate");

      if (!guardKey || guardKey === "toate") return arr;
      return arr.filter(c => canonicalGuardName(c.garda) === guardKey);
    }

    function getInspectorPeriodRange() {
      return {
        dateFrom: safeValue("inspectorDateFrom", ""),
        dateTo: safeValue("inspectorDateTo", "")
      };
    }

    function inspectorSelectedLabel(id, fallback = "") {
      const select = q(id);
      if (!select || select.selectedIndex < 0) return fallback;
      return select.options[select.selectedIndex]?.textContent || fallback;
    }

    function getInspectorActiveFilters() {
      const chips = [];
      const preset = safeValue("inspectorPeriodPreset", "last180");
      if (preset !== "all") {
        const range = getInspectorPeriodRange();
        const customLabel = preset === "custom" && (range.dateFrom || range.dateTo)
          ? `${range.dateFrom || "..."} - ${range.dateTo || "..."}`
          : inspectorSelectedLabel("inspectorPeriodPreset", "Perioada selectata");
        chips.push({ id: "period", label: customLabel });
      }
      const definitions = [
        ["compare", "inspectorCompareScope", "national"],
        ["guard", "inspectorGardaScope", "toate"],
        ["type", "inspectorTypeScope", "toate"],
        ["category", "inspectorCategoryScope", "toate"],
        ["result", "inspectorResultScope", "toate"]
      ];
      definitions.forEach(([id, selectId, defaultValue]) => {
        if (safeValue(selectId, defaultValue) !== defaultValue) {
          chips.push({ id, label: inspectorSelectedLabel(selectId, "Filtru activ") });
        }
      });
      return chips;
    }

    function renderInspectorAdvancedFilters() {
      const chips = getInspectorActiveFilters();
      setText("inspectorActiveFilterCount", `${chips.length} ${chips.length === 1 ? "filtru activ" : "filtre active"}`);
      setHtml("inspectorActiveFilterChips", chips.map(chip => `
        <button type="button" class="active-filter-chip inspector-active-filter-chip" data-inspector-filter-id="${escapeAttr(chip.id)}" title="Elimina filtrul">
          <span>${escapeHtml(chip.label)}</span><b aria-hidden="true">&times;</b>
        </button>
      `).join(""));
    }

    function applyInspectorAdvancedFilters() {
      const preset = safeValue("inspectorPeriodPreset", "last180");
      if (preset !== "custom") {
        applyModulePeriodPreset("inspector", preset);
        return;
      }
      readInspectorFilterState();
      renderInspectorsView();
    }

    function applyInspectorFiltersFromBar(source = "") {
      const preset = safeValue("inspectorPeriodPreset", "last180");
      const customPeriod = q("inspectorCustomPeriod");
      if (customPeriod) customPeriod.hidden = preset !== "custom";
      if (source === "period" && preset !== "custom") {
        applyModulePeriodPreset("inspector", preset);
        return;
      }
      if (source === "custom" && q("inspectorPeriodPreset")) q("inspectorPeriodPreset").value = "custom";
      readInspectorFilterState();
      inspectorIndexLimit = 5;
      renderInspectorsView();
    }

    function resetInspectorAdvancedFilters() {
      const defaults = {
        inspectorCompareScope: "national",
        inspectorGardaScope: "toate",
        inspectorTypeScope: "toate",
        inspectorCategoryScope: "toate",
        inspectorResultScope: "toate",
        inspectorPeriodPreset: "last180"
      };
      Object.entries(defaults).forEach(([id, value]) => {
        if (q(id)) q(id).value = value;
      });
      inspectorIndexLimit = 5;
      applyModulePeriodPreset("inspector", "last180");
    }

    function clearInspectorAdvancedFilter(filterId) {
      const mapping = {
        compare: ["inspectorCompareScope", "national"],
        guard: ["inspectorGardaScope", "toate"],
        type: ["inspectorTypeScope", "toate"],
        category: ["inspectorCategoryScope", "toate"],
        result: ["inspectorResultScope", "toate"]
      };
      if (filterId === "period") {
        if (q("inspectorPeriodPreset")) q("inspectorPeriodPreset").value = "all";
        setModulePeriod("inspector", "", "");
      } else if (mapping[filterId]) {
        const [id, value] = mapping[filterId];
        if (q(id)) q(id).value = value;
      }
      renderInspectorsView();
    }

    window.applyInspectorAdvancedFilters = applyInspectorAdvancedFilters;
    window.applyInspectorFiltersFromBar = applyInspectorFiltersFromBar;
    window.resetInspectorAdvancedFilters = resetInspectorAdvancedFilters;

    function buildInspectorStats(arr, months = 1) {
      const stats = {};
      arr.forEach(c => (c.echipa || []).forEach(m => {
        const name = m.nume || "Necunoscut";
        if (!stats[name]) {
          stats[name] = {
            name,
            total: 0,
            monthly: 0,
            problems: 0,
            problemRate: 0,
            sanctions: 0,
            sanctionRate: 0,
            petitions: 0,
            petitionShare: 0,
            fines: 0,
            finePerControl: 0,
            damage: 0,
            damagePerControl: 0,
            reportDaysSum: 0,
            reportDaysCount: 0,
            avgReportDays: null,
            petitionReportDaysSum: 0,
            petitionReportDaysCount: 0,
            avgPetitionDays: null,
            missingReports: 0,
            overdueReports: 0,
            byType: {},
            byMonth: {},
            byResult: {}
          };
        }
        stats[name].total += 1;
        if (isProblemResult(c.result)) stats[name].problems += 1;
        if (["sanctiune", "sesizare_penala"].includes(c.result)) stats[name].sanctions += 1;
        if (isPetition(c)) stats[name].petitions += 1;
        const fineAmount = getFineAmount(c);
        if (Number.isFinite(fineAmount)) {
          stats[name].fines += fineAmount;
          stats[name].fineDataCount += 1;
        }
        stats[name].damage += getDamageAmount(c);
        const hasReport = getControlHasReport(c);
        const reportDays = getControlDaysToReport(c);
        if (hasReport && Number.isFinite(Number(reportDays))) {
          stats[name].reportDaysSum += Number(reportDays);
          stats[name].reportDaysCount += 1;
          if (isPetition(c)) {
            stats[name].petitionReportDaysSum += Number(reportDays);
            stats[name].petitionReportDaysCount += 1;
          }
        }
        if (!hasReport) stats[name].missingReports += 1;
        if (!hasReport && Number(reportDays) > 10) stats[name].overdueReports += 1;
        const type = c.control_type || "Necunoscut";
        const month = monthKey(c);
        const result = resultLabel(c.result);
        stats[name].byType[type] = (stats[name].byType[type] || 0) + 1;
        stats[name].byMonth[month] = (stats[name].byMonth[month] || 0) + 1;
        stats[name].byResult[result] = (stats[name].byResult[result] || 0) + 1;
      }));
      Object.values(stats).forEach(item => {
        const total = Number(item.total || 0);
        item.monthly = total / Math.max(1, Number(months || 1));
        item.problemRate = total ? item.problems / total * 100 : 0;
        item.sanctionRate = total ? item.sanctions / total * 100 : 0;
        item.petitionShare = total ? item.petitions / total * 100 : 0;
        item.finePerControl = total ? item.fines / total : 0;
        item.damagePerControl = total ? item.damage / total : 0;
        item.avgReportDays = item.reportDaysCount ? item.reportDaysSum / item.reportDaysCount : null;
        item.avgPetitionDays = item.petitionReportDaysCount ? item.petitionReportDaysSum / item.petitionReportDaysCount : null;
      });
      return stats;
    }

    function inspectorActivityStatus(item, avgMonthly) {
      if (!item || !item.total) return { label: "fara date", cls: "muted" };
      if (!avgMonthly) return { label: "in calcul", cls: "neutral" };
      const ratio = Number(item.monthly || 0) / avgMonthly;
      if (ratio >= 1.1) return { label: "peste medie", cls: "good" };
      if (ratio >= 0.75) return { label: "in parametri", cls: "neutral" };
      return { label: "sub medie", cls: "warn" };
    }

    function renderInspectorKpiScorecard(stats, selected, months, compareNames = []) {
      let rows = Object.values(stats || {}).sort((a, b) => Number(b.monthly || 0) - Number(a.monthly || 0));
      const selectedRows = compareNames.map(name => stats[name]).filter(Boolean);
      if (selectedRows.length) {
        rows = selectedRows;
      } else if (selected && stats[selected]) {
        rows = [stats[selected]];
      }
      rows = rows.slice(0, selectedRows.length ? 5 : (selected && stats[selected] ? 13 : 12));

      if (!rows.length) {
        setHtml("inspectorKpiScorecard", `<div class="empty">Nu exista date pentru matricea KPI pe inspectori.</div>`);
        return;
      }

      const allRows = Object.values(stats || {});
      const selectedRow = selected && stats[selected] ? stats[selected] : null;
      const totalParticipations = selectedRow
        ? Number(selectedRow.total || 0)
        : allRows.reduce((sum, item) => sum + Number(item.total || 0), 0);
      const avgMonthly = allRows.length ? allRows.reduce((sum, item) => sum + Number(item.monthly || 0), 0) / allRows.length : 0;
      const maxMonthly = Math.max(0, ...rows.map(item => Number(item.monthly || 0)));
      const selectedText = selectedRows.length ? `${selectedRows.length} inspectori` : (selectedRow ? selected : "Top inspectori");
      const avgReportDays = averageDays(rows.map(item => item.avgReportDays));
      const avgPetitionDays = averageDays(rows.map(item => item.avgPetitionDays));
      const totalOverdueReports = rows.reduce((sum, item) => sum + Number(item.overdueReports || 0), 0);

      const cardBody = rows.map((item, index) => {
        const status = inspectorActivityStatus(item, avgMonthly);
        const monthlyPct = maxMonthly ? Math.max(4, Math.min(100, (Number(item.monthly || 0) / maxMonthly) * 100)) : 0;
        const reportDays = Number(item.avgReportDays);
        const reportClass = reportDaysStatusClass(reportDays);
        const accentClass = ["accent-green", "accent-blue", "accent-purple", "accent-orange", "accent-teal"][index % 5];
        return `<article class="inspector-compare-card ${accentClass}">
          <div class="inspector-compare-card-head">
            <div>
              <span>Inspector</span>
              <strong>${escapeHtml(item.name)}</strong>
              <small>${item.total || 0} controale la care a participat</small>
            </div>
            <i class="guard-status ${status.cls}">${escapeHtml(status.label)}</i>
          </div>
          <div class="inspector-compare-main-metric">
            <span>Controale / luna</span>
            <strong>${Number(item.monthly || 0).toFixed(1)}</strong>
            <div class="inspector-mini-bar"><i style="width:${monthlyPct}%"></i></div>
          </div>
          <div class="inspector-compare-metrics">
            <div class="metric-report ${reportClass}"><span>Timp raport</span><strong>${escapeHtml(formatDays(item.avgReportDays))}</strong><small>control - raport</small></div>
            <div><span>Raspuns sesizari</span><strong>${escapeHtml(formatDays(item.avgPetitionDays))}</strong><small>${Number(item.petitions || 0)} sesizari</small></div>
            <div><span>Probleme</span><strong>${formatPercent(item.problemRate)}</strong><small>${item.problems || 0} cazuri</small></div>
            <div><span>Masuri ferme</span><strong>${formatPercent(item.sanctionRate)}</strong><small>${item.sanctions || 0} sanctiuni/sesizari</small></div>
            <div><span>Intarziate</span><strong>${Number(item.overdueReports || 0)}</strong><small>${Number(item.missingReports || 0)} fara raport</small></div>
            <div><span>Amenzi / control</span><strong>${escapeHtml(formatInspectorMoney(item.finePerControl || 0))}</strong><small>total ${escapeHtml(formatInspectorMoney(item.fines || 0))}</small></div>
          </div>
        </article>`;
      }).join("");

      setHtml("inspectorKpiScorecard", `
        <div class="guard-score-summary inspector-score-summary">
          <div class="accent-teal"><span>${selectedRows.length ? "Inspectori comparati" : (selectedRow ? "Controale inspector" : "Participari control")}</span><strong>${selectedRows.length ? selectedRows.length : totalParticipations}</strong></div>
          <div class="accent-blue"><span>${selectedRows.length ? "Controale cumulate" : (selectedRow ? "Inspector analizat" : "Inspectori activi")}</span><strong>${selectedRows.length ? selectedRows.reduce((sum, item) => sum + Number(item.total || 0), 0) : (selectedRow ? "1" : allRows.length)}</strong></div>
          <div class="accent-purple"><span>Media grupului</span><strong>${avgMonthly.toFixed(1)} / luna</strong></div>
          <div class="accent-orange"><span>Timp finalizare raport</span><strong>${escapeHtml(formatDays(avgReportDays))}</strong></div>
          <div class="accent-red"><span>Intarzieri &gt;10 zile</span><strong>${totalOverdueReports}</strong></div>
          <div><span>Selectie</span><strong>${escapeHtml(selectedText)}</strong></div>
        </div>
        <div class="inspector-scorecards-grid">${cardBody}</div>
      `);
    }

    function averageForInspectors(stats, labels, getter, excludeName = "") {
      const names = Object.keys(stats).filter(name => name !== excludeName);
      const divisor = Math.max(1, names.length);
      return labels.map(label => {
        const total = names.reduce((sum, name) => sum + Number((getter(stats[name]) || {})[label] || 0), 0);
        return Number((total / divisor).toFixed(1));
      });
    }

    function renderInspectorProfile(selectedStats, selectedControls, avgMonthly, scopeText, monthsInScope) {
      if (!selectedStats) {
        setText("inspectorProfileNote", "selecteaza un inspector pentru analiza dedicata");
        setHtml("inspectorProfileKpis", `<div class="empty">Selecteaza un inspector din lista pentru indicatori dedicati, grafice comparative si statistica filtrata doar pe activitatea lui.</div>`);
        return;
      }

      const total = Number(selectedStats.total || 0);
      const conform = Number(selectedStats.byResult.Conform || 0);
      const conformRate = total ? conform / total * 100 : 0;
      const status = inspectorActivityStatus(selectedStats, avgMonthly);
      const primaryGuardKey = getInspectorPrimaryGuard(selectedStats.name, selectedControls);
      const primaryGuard = primaryGuardKey ? guardDisplayName(primaryGuardKey) : "-";
      const lastControl = [...selectedControls].sort((a,b) => new Date(b.created_at)-new Date(a.created_at))[0];

      setText("inspectorProfileNote", `${scopeText} - ${Number(monthsInScope || 0).toFixed(1)} luni analizate`);
      setHtml("inspectorProfileKpis", `
        <div class="inspector-profile-hero">
          <span>Inspector</span>
          <strong>${escapeHtml(selectedStats.name)}</strong>
          <small>Garda principala: ${escapeHtml(primaryGuard)}</small>
          <i class="guard-status ${status.cls}">${escapeHtml(status.label)}</i>
          <button class="inline-action-btn inspector-map-btn" type="button" data-inspector="${escapeAttr(selectedStats.name)}">Vezi controalele inspectorului pe harta</button>
        </div>
        <div class="inspector-profile-card accent-blue"><span>Total controale</span><strong>${total}</strong><small>participari in perioada</small></div>
        <div class="inspector-profile-card accent-teal"><span>Controale / luna</span><strong>${Number(selectedStats.monthly || 0).toFixed(1)}</strong><small>media inspectorului</small></div>
        <div class="inspector-profile-card"><span>Rata conformare</span><strong>${formatPercent(conformRate)}</strong><small>${conform} controale conforme</small></div>
        <div class="inspector-profile-card accent-orange"><span>Controale cu probleme</span><strong>${formatPercent(selectedStats.problemRate)}</strong><small>${selectedStats.problems || 0} cazuri</small></div>
        <div class="inspector-profile-card accent-red"><span>Masuri ferme</span><strong>${formatPercent(selectedStats.sanctionRate)}</strong><small>${selectedStats.sanctions || 0} sanctiuni/sesizari</small></div>
        <div class="inspector-profile-card accent-purple"><span>Sesizari</span><strong>${formatPercent(selectedStats.petitionShare)}</strong><small>${selectedStats.petitions || 0} controale din sesizari</small></div>
        <div class="inspector-profile-card accent-report"><span>Timp finalizare raport</span><strong>${escapeHtml(formatDays(selectedStats.avgReportDays))}</strong><small>de la trimitere control la raport</small></div>
        <div class="inspector-profile-card accent-warning"><span>Raspuns sesizari</span><strong>${escapeHtml(formatDays(selectedStats.avgPetitionDays))}</strong><small>controale din sesizari</small></div>
        <div class="inspector-profile-card accent-late"><span>Intarziate &gt;10 zile</span><strong>${Number(selectedStats.overdueReports || 0)}</strong><small>${Number(selectedStats.missingReports || 0)} fara raport</small></div>
        <div class="inspector-profile-card"><span>Amenzi / control</span><strong>${escapeHtml(formatInspectorMoney(selectedStats.finePerControl || 0))}</strong><small>total ${escapeHtml(formatInspectorMoney(selectedStats.fines || 0))}</small></div>
        <div class="inspector-profile-card"><span>Ultimul control</span><strong>${escapeHtml(lastControl ? formatDay(lastControl.created_at) : "-")}</strong><small>${escapeHtml(lastControl ? resultLabel(lastControl.result) : "-")}</small></div>
      `);
    }

    function getInspectorSeriesColors(names) {
      const colors = [chartColors.green, chartColors.blue, chartColors.purple, chartColors.orange, chartColors.teal || "#00f5d4"];
      return names.map((_, index) => colors[index % colors.length]);
    }

    function renderInspectorGuardSummary(names, arr) {
      const box = q("inspectorGuardSummary");
      if (!box) return;
      if (!names.length) {
        box.innerHTML = "";
        return;
      }

      const guardTotals = {};
      const matrix = {};
      arr.forEach(c => {
        const activeNames = (c.echipa || []).map(m => m.nume).filter(name => names.includes(name));
        if (!activeNames.length) return;
        const guard = guardDisplayName(c.garda || "Necunoscut");
        guardTotals[guard] = (guardTotals[guard] || 0) + activeNames.length;
        if (!matrix[guard]) matrix[guard] = {};
        activeNames.forEach(name => {
          matrix[guard][name] = (matrix[guard][name] || 0) + 1;
        });
      });

      const rows = Object.entries(guardTotals)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 9);

      if (!rows.length) {
        box.innerHTML = `<div class="empty">Nu exista controale pe garzi pentru inspectorii selectati.</div>`;
        return;
      }

      box.innerHTML = `
        <div class="inspector-guard-head">
          <span>Garda</span>
          <span>Total</span>
          ${names.map(name => `<span title="${escapeAttr(name)}">${escapeHtml(name.split(" ").map(part => part[0]).join("").slice(0, 4).toUpperCase())}</span>`).join("")}
        </div>
        ${rows.map(([guard, total]) => `<div class="inspector-guard-row">
          <strong>${escapeHtml(guardDisplayName(guard))}</strong>
          <b>${total}</b>
          ${names.map(name => `<span>${Number(matrix[guard]?.[name] || 0)}</span>`).join("")}
        </div>`).join("")}
      `;
    }

    function makeGroupedBarChart(id, labels, firstValues, secondValues, firstLabel, secondLabel, colors = [chartColors.green, chartColors.purple]) {
      const el = q(id); if (!el) return null;
      if (charts[id]) charts[id].destroy();
      charts[id] = new Chart(el.getContext("2d"), {
        type: "bar",
        data: {
          labels,
          datasets: [
            { label: firstLabel, data: firstValues, backgroundColor: colors[0], borderColor: colors[0], borderWidth: 1, borderRadius: 8 },
            { label: secondLabel, data: secondValues, backgroundColor: colors[1], borderColor: colors[1], borderWidth: 1, borderRadius: 8 }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          animation: { duration: 900, easing: "easeOutQuart" },
          layout: { padding: { top: 28, right: 10, bottom: 4, left: 4 } },
          plugins: {
            legend: { display: true, position: "top", labels: { color: chartColors.text, boxWidth: 11, font: { size: 13, weight: "800" } } },
            tooltip: { backgroundColor:"rgba(5,16,14,.95)", titleColor:"#fff", bodyColor:"#d7eee6", borderColor:"rgba(22,217,119,.35)", borderWidth:1 }
          },
          scales: {
            x: { ticks: { color: chartColors.text, font: { size: 13, weight: "800" } }, grid: { display: false } },
            y: { beginAtZero: true, grace: "12%", ticks: { precision: 0, color: chartColors.text, font: { size: 13, weight: "800" } }, grid: { color: chartColors.grid } }
          }
        }
      });
      return charts[id];
    }

    function makeCompareLineChart(id, labels, firstValues, secondValues, firstLabel, secondLabel) {
      const el = q(id); if (!el) return null;
      if (charts[id]) charts[id].destroy();
      charts[id] = new Chart(el.getContext("2d"), {
        type: "line",
        data: {
          labels,
          datasets: [
            { label: firstLabel, data: firstValues, borderColor: chartColors.green, backgroundColor: "rgba(22,217,119,.14)", tension: .42, fill: true, pointRadius: 4 },
            { label: secondLabel, data: secondValues, borderColor: chartColors.purple, backgroundColor: "rgba(160,115,255,.10)", tension: .42, fill: false, pointRadius: 3 }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          animation: { duration: 900, easing: "easeOutQuart" },
          plugins: {
            legend: { display: true, position: "top", labels: { color: chartColors.text, boxWidth: 11, font: { size: 13, weight: "800" } } },
            tooltip: { backgroundColor:"rgba(5,16,14,.95)", titleColor:"#fff", bodyColor:"#d7eee6", borderColor:"rgba(22,217,119,.35)", borderWidth:1 }
          },
          scales: {
            x: { ticks: { color: chartColors.text, font: { size: 13, weight: "800" } }, grid: { color: chartColors.grid } },
            y: { beginAtZero: true, grace: "12%", ticks: { precision: 0, color: chartColors.text, font: { size: 13, weight: "800" } }, grid: { color: chartColors.grid } }
          }
        }
      });
      return charts[id];
    }

    function makeMultiLineChart(id, labels, datasets) {
      const el = q(id); if (!el) return null;
      if (charts[id]) charts[id].destroy();
      charts[id] = new Chart(el.getContext("2d"), {
        type: "line",
        data: {
          labels,
          datasets: datasets.map((item, index) => ({
            label: item.label,
            data: item.data,
            borderColor: item.color || palette[index % palette.length],
            backgroundColor: item.fill ? (item.backgroundColor || "rgba(22,217,119,.10)") : "transparent",
            tension: .42,
            fill: Boolean(item.fill),
            pointRadius: item.pointRadius ?? 3,
            borderWidth: item.borderWidth || 2,
            borderDash: item.dash || []
          }))
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          animation: { duration: 900, easing: "easeOutQuart" },
          plugins: {
            legend: { display: true, position: "top", labels: { color: chartColors.text, boxWidth: 11, font: { size: 13, weight: "800" } } },
            tooltip: { backgroundColor:"rgba(5,16,14,.95)", titleColor:"#fff", bodyColor:"#d7eee6", borderColor:"rgba(22,217,119,.35)", borderWidth:1 }
          },
          scales: {
            x: { ticks: { color: chartColors.text, font: { size: 13, weight: "800" } }, grid: { color: chartColors.grid } },
            y: { beginAtZero: true, grace: "12%", ticks: { precision: 0, color: chartColors.text, font: { size: 13, weight: "800" } }, grid: { color: chartColors.grid } }
          }
        }
      });
      return charts[id];
    }

    function makeMultiBarChart(id, labels, datasets, horizontal = false) {
      const el = q(id); if (!el) return null;
      if (charts[id]) charts[id].destroy();
      charts[id] = new Chart(el.getContext("2d"), {
        type: "bar",
        data: {
          labels,
          datasets: datasets.map((item, index) => ({
            label: item.label,
            data: item.data,
            backgroundColor: item.color || palette[index % palette.length],
            borderColor: item.color || palette[index % palette.length],
            borderWidth: 1,
            borderRadius: 7,
            maxBarThickness: 28
          }))
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          animation: { duration: 900, easing: "easeOutQuart" },
          indexAxis: horizontal ? "y" : "x",
          layout: { padding: { top: 28, right: 10, bottom: 4, left: 4 } },
          plugins: {
            legend: { display: true, position: "top", labels: { color: chartColors.text, boxWidth: 11, font: { size: 13, weight: "800" } } },
            tooltip: { backgroundColor:"rgba(5,16,14,.95)", titleColor:"#fff", bodyColor:"#d7eee6", borderColor:"rgba(22,217,119,.35)", borderWidth:1 }
          },
          scales: {
            x: { ticks: { color: chartColors.text, font: { size: 13, weight: "800" } }, grid: { display: horizontal, color: chartColors.grid } },
            y: { beginAtZero: true, grace: "12%", ticks: { precision: 0, color: chartColors.text, font: { size: 13, weight: "800" } }, grid: { color: chartColors.grid } }
          }
        }
      });
      return charts[id];
    }

    function renderInspectorsViewLegacy() {
      if (!isInternalMode) return;
      const requestedInspector = safeValue("inspectorSearch", "").trim();
      const periodBase = getInspectorBaseControls();
      const scoped = filterInspectorComparisonScope(periodBase, requestedInspector);
      const inspectorRange = getInspectorPeriodRange();
      const monthsInScope = getPeriodMonths(scoped, inspectorRange);
      const stats = buildInspectorStats(scoped, monthsInScope);
      const inspectorNames = Object.keys(stats);
      const requestedNorm = normalizeText(requestedInspector);
      const selected = requestedNorm
        ? inspectorNames.find(name => normalizeText(name) === requestedNorm)
        : "";
      const selectedStats = selected && stats[selected] ? stats[selected] : null;
      const selectedControls = selectedStats
        ? scoped.filter(c => (c.echipa || []).some(m => m.nume === selected))
        : [];
      const comparisonNames = (inspectorCompareNames.length ? getInspectorComparisonNames(selected) : (selected ? [selected] : [])).filter(name => stats[name]);
      const profileName = selected || comparisonNames[0] || "";
      const profileStats = profileName && stats[profileName] ? stats[profileName] : null;
      const profileControls = profileStats
        ? scoped.filter(c => (c.echipa || []).some(m => m.nume === profileName))
        : [];
      renderInspectorCompareChips(inspectorCompareNames.filter(name => stats[name]));

      if (comparisonNames.length > 1) {
        const guardTotals = {};
        scoped.forEach(c => {
          const activeNames = (c.echipa || []).map(m => m.nume).filter(name => comparisonNames.includes(name));
          if (!activeNames.length) return;
          const guard = guardDisplayName(c.garda || "Necunoscut");
          guardTotals[guard] = (guardTotals[guard] || 0) + activeNames.length;
        });
        const guardRows = Object.entries(guardTotals).sort((a, b) => b[1] - a[1]).slice(0, 9);
        const guardLabels = guardRows.map(([guard]) => guardDisplayName(guard));
        const guardShortLabels = guardLabels.map(gardaShortLabel);
        const comparisonColors = getInspectorSeriesColors(comparisonNames);
        const guardDatasets = comparisonNames.map((name, index) => ({
          label: name,
          data: guardLabels.map(guard => scoped.filter(c => guardDisplayName(c.garda || "Necunoscut") === guard && (c.echipa || []).some(m => m.nume === name)).length),
          color: comparisonColors[index]
        }));
        setText("chartInspectorsTopTitle", "Activitate pe garzi");
        setText("chartInspectorsTopSub", "inspectori comparati");
        makeMultiBarChart("chartInspectorsTop", guardShortLabels, guardDatasets, false);
        renderInspectorGuardSummary(comparisonNames, scoped);
      } else if (profileStats) {
        const byGuard = topEntries(countBy(profileControls, c => guardDisplayName(c.garda)), 10);
        const guardValues = byGuard.map(x => x[1]);
        setText("chartInspectorsTopTitle", "Activitate pe garzi");
        setText("chartInspectorsTopSub", comparisonNames.length > 1 ? "inspector activ" : "inspector selectat");
        makeChart("chartInspectorsTop", "bar", byGuard.map(x => gardaShortLabel(x[0])), guardValues, {
          label: "Controale",
          colors: gradientColorsByValues(guardValues, "total")
        });
        renderInspectorGuardSummary([], scoped);
      } else {
        const top = Object.entries(stats).sort((a, b) => b[1].total - a[1].total).slice(0, 10);
        const topValues = top.map(x => x[1].total);
        setText("chartInspectorsTopTitle", "Top inspectori");
        setText("chartInspectorsTopSub", "in filtrul intern");
        makeChart("chartInspectorsTop", "bar", top.map(x => x[0]), topValues, {
          horizontal: true,
          label: "Controale",
          colors: gradientColorsByValues(topValues, "total")
        });
        renderInspectorGuardSummary([], scoped);
      }

      const avgTotal = inspectorNames.length ? Object.values(stats).reduce((sum, x) => sum + x.total, 0) / inspectorNames.length : 0;
      setText("inspectorSelectedKpi", profileName || (requestedInspector ? "Neselectat" : "Toti"));
      setText("inspectorTotalKpi", profileStats ? profileStats.total : scoped.length);
      setText("inspectorAverageKpi", avgTotal.toFixed(1));
      const inspectorReportKpi = profileStats ? profileStats.avgReportDays : averageDays(Object.values(stats).map(item => item.avgReportDays));
      setText("inspectorReportDaysKpi", formatDays(inspectorReportKpi));

      const scope = safeValue("inspectorCompareScope", "national");
      const guardForText = scope === "same_guard" && selected ? getInspectorPrimaryGuard(selected, periodBase) : safeValue("inspectorGardaScope", "toate");
      const scopeText = scope === "national" ? "media nationala" : (guardForText && guardForText !== "toate" ? `media ${guardDisplayName(guardForText)}` : "media garzii");
      const filterPieces = [`${profileStats ? profileStats.total : scoped.length} controale in ${getModulePeriodLabel("inspector")}`];
      if (safeValue("inspectorTypeScope", "toate") !== "toate") filterPieces.push("tip: " + safeValue("inspectorTypeScope", "toate"));
      if (safeValue("inspectorResultScope", "toate") !== "toate") filterPieces.push("rezultat: " + resultLabel(safeValue("inspectorResultScope", "")));
      setText("inspectorSummary", comparisonNames.length > 1
        ? `Comparatie: ${comparisonNames.length} inspectori. Inspector activ: ${profileName}. Include media nationala si media garzii principale.`
        : profileStats
        ? `Inspector: ${profileName}. Comparatie cu ${scopeText}. ${filterPieces.join(" - ")}.`
        : requestedInspector
          ? `Cautare: ${requestedInspector}. Selecteaza un inspector exact din lista pentru statistica dedicata.`
          : `Analiza generala: ${filterPieces.join(" - ")}. Selecteaza un inspector pentru profil individual.`);

      renderInspectorProfile(profileStats, profileControls, avgTotal, scopeText, monthsInScope);
      renderInspectorKpiScorecard(stats, profileName, monthsInScope, comparisonNames);

      const reportChartRows = (comparisonNames.length
        ? comparisonNames.map(name => stats[name]).filter(Boolean)
        : (profileStats ? [profileStats] : Object.values(stats).filter(item => item.reportDaysCount).sort((a, b) => Number(b.avgReportDays || 0) - Number(a.avgReportDays || 0)).slice(0, 10))
      );
      if (reportChartRows.length) {
        const reportLabels = reportChartRows.map(item => item.name);
        const reportValues = reportChartRows.map(item => Number(Number(item.avgReportDays || 0).toFixed(1)));
        const reportColors = reportChartRows.map(item => colorByReportDays(item.avgReportDays));
        setText("chartInspectorsReportTitle", comparisonNames.length > 1 ? "Timp finalizare raport" : (profileStats ? "Timp finalizare raport" : "Inspectori cu finalizare intarziata"));
        setText("chartInspectorsReportSub", comparisonNames.length > 1 ? "inspectori comparati" : "zile de la control la raport");
        makeChart("chartInspectorsReportTime", "bar", reportLabels, reportValues, { horizontal: true, label: "Zile", colors: reportColors });
      } else {
        setText("chartInspectorsReportTitle", "Timp finalizare raport");
        setText("chartInspectorsReportSub", "fara date calculate");
        makeChart("chartInspectorsReportTime", "bar", ["Fara date"], [0], { horizontal: true, label: "Zile", colors: [chartColors.gray] });
      }

      const allTypes = [...new Set(scoped.map(c => c.control_type || "Necunoscut"))].sort();
      const types = allTypes.length ? allTypes : ["fond", "tematic", "operativ", "sesizare"];
      if (comparisonNames.length > 1) {
        const comparisonColors = getInspectorSeriesColors(comparisonNames);
        const typeDatasets = comparisonNames.map((name, index) => ({
          label: name,
          data: types.map(type => Number((stats[name] || {}).byType?.[type] || 0)),
          color: comparisonColors[index]
        }));
        typeDatasets.push({
          label: "Media nationala",
          data: averageForInspectors(stats, types, st => st.byType, ""),
          color: "#d7eee6"
        });
        const guardKeyForTypes = profileName ? getInspectorPrimaryGuard(profileName, periodBase) : "";
        if (guardKeyForTypes) {
          const guardControls = periodBase.filter(c => canonicalGuardName(c.garda) === guardKeyForTypes);
          const guardStats = buildInspectorStats(guardControls, monthsInScope);
          typeDatasets.push({
            label: "Media " + gardaShortLabel(guardDisplayName(guardKeyForTypes)),
            data: averageForInspectors(guardStats, types, st => st.byType, profileName),
            color: chartColors.amber
          });
        }
        makeMultiBarChart("chartInspectorsTypes", types, typeDatasets, false);
      } else {
        const selectedByType = types.map(t => profileStats ? Number(profileStats.byType[t] || 0) : 0);
        const avgByType = averageForInspectors(stats, types, st => st.byType, profileStats ? profileName : "");
        makeGroupedBarChart("chartInspectorsTypes", types, selectedByType, avgByType, profileName || "Inspector", scopeText, [chartColors.green, chartColors.purple]);
      }

      const months = [...new Set(scoped.map(monthKey))].sort();
      if (comparisonNames.length) {
        const comparisonColors = [chartColors.green, chartColors.blue, chartColors.purple, chartColors.orange, chartColors.teal || "#00f5d4"];
        const lineSets = comparisonNames.map((name, index) => ({
          label: name,
          data: months.map(m => Number((stats[name] || {}).byMonth?.[m] || 0)),
          color: comparisonColors[index % comparisonColors.length],
          fill: index === 0,
          backgroundColor: "rgba(22,217,119,.10)",
          pointRadius: 4
        }));
        lineSets.push({
          label: "Media nationala",
          data: averageForInspectors(stats, months, st => st.byMonth, ""),
          color: "#d7eee6",
          dash: [6, 5],
          pointRadius: 2,
          borderWidth: 2
        });

        const guardKey = profileName ? getInspectorPrimaryGuard(profileName, periodBase) : "";
        if (guardKey) {
          const guardControls = periodBase.filter(c => canonicalGuardName(c.garda) === guardKey);
          const guardStats = buildInspectorStats(guardControls, monthsInScope);
          lineSets.push({
            label: "Media " + gardaShortLabel(guardDisplayName(guardKey)),
            data: averageForInspectors(guardStats, months, st => st.byMonth, profileName),
            color: chartColors.amber,
            dash: [3, 4],
            pointRadius: 2,
            borderWidth: 2
          });
        }

        makeMultiLineChart("chartInspectorsMonthly", months.map(monthLabel), lineSets);
      } else {
        const selectedMonthly = months.map(m => profileStats ? Number(profileStats.byMonth[m] || 0) : 0);
        const avgMonthly = averageForInspectors(stats, months, st => st.byMonth, profileStats ? profileName : "");
        makeCompareLineChart("chartInspectorsMonthly", months.map(monthLabel), selectedMonthly, avgMonthly, profileName || "Inspector", scopeText);
      }

      if (comparisonNames.length > 1) {
        const resultLabels = [...new Set([
          ...comparisonNames.flatMap(name => Object.keys((stats[name] || {}).byResult || {})),
          ...Object.keys(countBy(scoped, c => resultLabel(c.result)))
        ])];
        const comparisonColors = getInspectorSeriesColors(comparisonNames);
        const resultDatasets = comparisonNames.map((name, index) => ({
          label: name,
          data: resultLabels.map(label => Number((stats[name] || {}).byResult?.[label] || 0)),
          color: comparisonColors[index]
        }));
        resultDatasets.push({
          label: "Media nationala",
          data: averageForInspectors(stats, resultLabels, st => st.byResult, ""),
          color: "#d7eee6"
        });
        const guardKeyForResults = profileName ? getInspectorPrimaryGuard(profileName, periodBase) : "";
        if (guardKeyForResults) {
          const guardControls = periodBase.filter(c => canonicalGuardName(c.garda) === guardKeyForResults);
          const guardStats = buildInspectorStats(guardControls, monthsInScope);
          resultDatasets.push({
            label: "Media " + gardaShortLabel(guardDisplayName(guardKeyForResults)),
            data: averageForInspectors(guardStats, resultLabels, st => st.byResult, profileName),
            color: chartColors.amber
          });
        }
        setText("chartInspectorsResultsTitle", "Rezultate comparative");
        setText("chartInspectorsResultsSub", "inspectori vs medii");
        makeMultiBarChart("chartInspectorsResults", resultLabels, resultDatasets, false);
      } else if (profileStats) {
        const resultLabels = [...new Set([
          ...Object.keys(profileStats.byResult),
          ...Object.keys(countBy(scoped, c => resultLabel(c.result)))
        ])];
        const selectedResults = resultLabels.map(label => Number(profileStats.byResult[label] || 0));
        const avgResults = averageForInspectors(stats, resultLabels, st => st.byResult, profileName);
        setText("chartInspectorsResultsTitle", "Rezultate comparative");
        setText("chartInspectorsResultsSub", "inspector vs medie");
        makeGroupedBarChart("chartInspectorsResults", resultLabels, selectedResults, avgResults, profileName, scopeText, [chartColors.green, chartColors.purple]);
      } else {
        const resultSource = countBy(scoped, c => resultLabel(c.result));
        setText("chartInspectorsResultsTitle", "Rezultate controale");
        setText("chartInspectorsResultsSub", "filtrul intern");
        makeChart("chartInspectorsResults", "doughnut", Object.keys(resultSource), Object.values(resultSource), {
          colors: Object.keys(resultSource).map(x => colorByResult(normalizeResultLabelBack(x)))
        });
      }
    }


    function getInspectorControls(name, arr) {
      const target = normalizeText(name);
      if (!target) return [];
      return (arr || []).filter(c => (c.echipa || []).some(m => normalizeText(m && m.nume) === target));
    }

    function getInspectorGuards(name, arr) {
      const counts = {};
      getInspectorControls(name, arr).forEach(c => {
        const guard = guardDisplayName(c.garda || "Necunoscut");
        counts[guard] = (counts[guard] || 0) + 1;
      });
      return Object.entries(counts).sort((a, b) => b[1] - a[1]);
    }

    function getInspectorStatus(item, avgMonthly) {
      const reportDays = Number(item && item.avgReportDays);
      const problemRate = Number(item && item.problemRate || 0);
      const overdue = Number(item && item.overdueReports || 0);
      if (!item || !item.total) return { label: "fara date", cls: "muted", accent: "inspector-accent-blue" };
      if (overdue >= 3 || reportDays > 10 || problemRate >= 45) return { label: "atentie", cls: "late", accent: "inspector-accent-red" };
      if (overdue > 0 || reportDays > 5 || problemRate >= 25) return { label: "monitorizare", cls: "warn", accent: "inspector-accent-orange" };
      if (avgMonthly && Number(item.monthly || 0) >= avgMonthly * 1.1) return { label: "peste medie", cls: "good", accent: "inspector-accent-green" };
      return { label: "in medie", cls: "neutral", accent: "inspector-accent-blue" };
    }

    function getInspectorAccent(item, avgMonthly) {
      return getInspectorStatus(item, avgMonthly).accent || "inspector-accent-green";
    }

    function inspectorMetricValue(item, sortMode) {
      if (!item) return 0;
      if (sortMode === "report") return Number.isFinite(Number(item.avgReportDays)) ? -Number(item.avgReportDays) : -9999;
      if (sortMode === "problems") return Number(item.problemRate || 0);
      if (sortMode === "delays") return Number(item.overdueReports || 0);
      return Number(item.total || 0);
    }

    function getSortedInspectorRows(stats) {
      const rows = Object.values(stats || {});
      return rows.sort((a, b) => {
        const av = inspectorMetricValue(a, inspectorSortMode);
        const bv = inspectorMetricValue(b, inspectorSortMode);
        if (bv !== av) return bv - av;
        return Number(b.total || 0) - Number(a.total || 0) || String(a.name).localeCompare(String(b.name), "ro");
      });
    }

    function inspectorKpiIcon(icon) {
      const common = `viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"`;
      const icons = {
        INSP: `<svg ${common}><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M19 8l2 1v3c0 2-1.2 3.6-3 4.5-1.8-.9-3-2.5-3-4.5V9l2-1z"/></svg>`,
        TOTAL: `<svg ${common}><rect x="5" y="3" width="14" height="18" rx="2"/><path d="M9 3h6v4H9zM9 12l2 2 4-4"/></svg>`,
        CTRL: `<svg ${common}><path d="M4 19V5a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z"/><path d="M8 8h8M8 12h5M8 16h3"/></svg>`,
        LEI: `<svg ${common}><circle cx="8" cy="8" r="5"/><circle cx="16" cy="16" r="5"/><path d="M6 8h4M14 16h4"/></svg>`,
        "!": `<svg ${common}><path d="M10.3 3.7L2.4 18a2 2 0 0 0 1.8 3h15.6a2 2 0 0 0 1.8-3L13.7 3.7a2 2 0 0 0-3.4 0z"/><path d="M12 9v4M12 17h.01"/></svg>`
      };
      return icons[icon] || icons.CTRL;
    }

    function inspectorKpiCard(icon, label, value, note, accent = "green") {
      const compactValue = String(value || "").length > 10 ? " inspector-value-compact" : "";
      return `<article class="inspector-kpi-card inspector-accent-${accent}${compactValue}">
        <span>${inspectorKpiIcon(icon)}</span>
        <div>
          <small>${escapeHtml(label)}</small>
          <strong>${escapeHtml(value)}</strong>
          <em>${escapeHtml(note || "")}</em>
        </div>
      </article>`;
    }

    function formatInspectorMoney(value) {
      return formatMoney(value);
    }

    function renderInspectorGeneralKpis(stats, scoped, scopeTotal) {
      const rows = Object.values(stats || {});
      const inspectorCount = rows.length;
      const totalControls = (scopeTotal || []).length;
      const periodControls = (scoped || []).length;
      const fineValues = (scoped || []).map(getFineAmount).filter(Number.isFinite);
      const totalFines = fineValues.reduce((sum, value) => sum + value, 0);
      const problems = (scoped || []).filter(c => isProblemResult(c.result)).length;
      const overdue = rows.reduce((sum, item) => sum + Number(item.overdueReports || 0), 0);
      setHtml("inspectorGeneralKpis", [
        inspectorKpiCard("INSP", "Inspectori activi", String(inspectorCount), "in perioada filtrata", "green"),
        inspectorKpiCard("TOTAL", "Total controale", String(totalControls), "in selectia curenta", "blue"),
        inspectorKpiCard("CTRL", "Controale in perioada selectata", String(periodControls), getModulePeriodLabel("inspector"), "teal"),
        inspectorKpiCard("LEI", "Amenzi cumulate", fineValues.length ? formatInspectorMoney(totalFines) : "Indisponibil", "in perioada selectata", "purple"),
        inspectorKpiCard("!", "Controale neconforme", String(problems), `${overdue} intarziate fara raport`, problems ? "red" : "orange")
      ].join(""));
    }

    function renderInspectorIndex(stats, selected, avgMonthly, controls = []) {
      const box = q("inspectorIndex");
      if (!box) return;
      const allRows = Object.values(stats || {}).sort((a, b) => {
        if (inspectorRankingMode === "fines") {
          return Number(b.fines || 0) - Number(a.fines || 0) ||
            Number(b.total || 0) - Number(a.total || 0) ||
            String(a.name).localeCompare(String(b.name), "ro");
        }
        return Number(b.total || 0) - Number(a.total || 0) ||
          Number(b.fines || 0) - Number(a.fines || 0) ||
          String(a.name).localeCompare(String(b.name), "ro");
      });
      let rows = allRows.slice(0, inspectorIndexLimit);
      document.querySelectorAll("#view-inspectori .inspector-ranking-btn[data-ranking]").forEach(btn => {
        const active = btn.dataset.ranking === inspectorRankingMode;
        btn.classList.toggle("active", active);
        btn.setAttribute("aria-selected", active ? "true" : "false");
      });
      setText("inspectorDirectoryCount", `${allRows.length} disponibili`);
      if (!rows.length) {
        box.innerHTML = `<div class="empty">Nu exista inspectori in filtrul activ.</div>`;
        setHtml("inspectorDirectoryFooter", "");
        return;
      }
      const maxRankingValue = Math.max(1, ...allRows.map(item =>
        inspectorRankingMode === "fines" ? Number(item.fines || 0) : Number(item.total || 0)
      ));
      const rankingRange = getQuantitativeRange(allRows.map(item =>
        inspectorRankingMode === "fines" ? Number(item.fines || 0) : Number(item.total || 0)
      ));
      box.innerHTML = rows.map((item, index) => {
        const initials = String(item.name || "IN").split(/\s+/).filter(Boolean).slice(0,2).map(part => part[0]).join("").toUpperCase();
        const isActive = normalizeText(item.name) === normalizeText(selected);
        const guardKey = getInspectorPrimaryGuard(item.name, controls);
        const guard = guardKey ? guardDisplayName(guardKey) : "Garda neprecizata";
        const nationalRank = allRows.findIndex(row => row.name === item.name) + 1;
        const rankingValue = inspectorRankingMode === "fines" ? Number(item.fines || 0) : Number(item.total || 0);
        const progress = Math.max(4, Math.round(rankingValue / maxRankingValue * 100));
        const progressTone = inspectorRankingMode === "fines"
          ? "is-informational"
          : (progress < 35 ? "is-critical" : (progress < 60 ? "is-warning" : (progress < 82 ? "is-attention" : "is-positive")));
        return `<button type="button" class="inspector-index-card inspector-index-card-clean ${isActive ? "active" : ""}" onclick="selectInspector('${escapeAttr(item.name)}')">
          <b class="inspector-rank-badge">${nationalRank}</b>
          <b class="inspector-avatar">${escapeHtml(initials)}</b>
          <span class="inspector-index-main">
            <strong>${escapeHtml(item.name)}</strong>
            <small>${escapeHtml(guard)}</small>
            <span class="inspector-index-values"><i>${Number(item.total || 0)} controale</i><i>${item.fineDataCount ? `${escapeHtml(formatInspectorMoney(item.fines || 0))} amenzi` : "Amenzi indisponibile"}</i></span>
            <span class="inspector-ranking-progress ${progressTone}"><i style="width:${progress}%;background:${quantitativeColor(rankingValue, rankingRange.min, rankingRange.max, inspectorRankingMode === "fines")}"></i></span>
          </span>
        </button>`;
      }).join("");
      setHtml("inspectorDirectoryFooter", allRows.length > rows.length
        ? `<button type="button" class="gfn-more-btn inspector-show-more" onclick="showMoreInspectors()">Vezi mai multi inspectori (${allRows.length - rows.length})</button>`
        : "");
    }

    function setInspectorRankingMode(mode) {
      inspectorRankingMode = mode === "fines" ? "fines" : "controls";
      inspectorIndexLimit = 5;
      renderInspectorsView();
    }

    function selectInspector(name) {
      selectedInspectorName = name || "";
      const input = q("inspectorSearch");
      if (input) input.value = "";
      inspectorControlsLimit = 11;
      const suggest = q("inspectorSuggestList");
      if (suggest) suggest.classList.remove("open");
      renderInspectorsView();
      const list = q("inspectorIndex");
      const active = list?.querySelector(".inspector-index-card.active");
      if (list && active) {
        const listRect = list.getBoundingClientRect();
        const activeRect = active.getBoundingClientRect();
        if (activeRect.top < listRect.top) list.scrollTop -= listRect.top - activeRect.top;
        if (activeRect.bottom > listRect.bottom) list.scrollTop += activeRect.bottom - listRect.bottom;
      }
    }

    function syncInspectorAnalysisMode() {
      const allowedModes = ["activity", "report", "problems", "delays"];
      const mode = allowedModes.includes(inspectorSortMode) ? inspectorSortMode : "activity";
      document.querySelectorAll("#view-inspectori [data-inspector-topic]").forEach(card => {
        card.hidden = card.dataset.inspectorTopic !== mode;
      });
      document.querySelectorAll("#view-inspectori .inspector-sort-btn[data-sort]").forEach(btn => {
        const active = btn.dataset.sort === mode;
        btn.classList.toggle("active", active);
        btn.setAttribute("aria-selected", active ? "true" : "false");
      });
    }

    function setInspectorSortMode(mode) {
      inspectorSortMode = ["activity", "report", "problems", "delays"].includes(mode) ? mode : "activity";
      syncInspectorAnalysisMode();
      renderInspectorsView();
      if (isCollapseOpen("collapseInspectorCharts")) setTimeout(refreshCharts, 60);
    }

    function addInspectorComparisonByName(name) {
      if (!name) return;
      if (!inspectorCompareNames.includes(name)) {
        if (inspectorCompareNames.length >= 5) {
          setMessage("Lista de comparatie permite maximum 5 inspectori.", false);
          return;
        }
        inspectorCompareNames.push(name);
      }
      openCollapse("collapseInspectorCompare");
      renderInspectorsView();
    }

    function setInspectorComparisonScope(scope) {
      const select = q("inspectorCompareScope");
      if (select) select.value = scope || "national";
      renderInspectorsView();
    }

    function scrollInspectorControlsList() {
      q("inspectorControlsList")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }

    function renderInspectorProfile(selectedStats, selectedControls, avgMonthly, scopeText, monthsInScope, selectionNames = [], stats = {}, scoped = []) {
      const names = [...new Set((selectionNames || []).filter(Boolean))].slice(0, 5);
      if (!names.length || !selectedStats) {
        const total = (scoped || []).length;
        const fines = sumBy(scoped || [], getFineAmount);
        const conform = (scoped || []).filter(c => normalizeText(c.result) === "conform").length;
        const problems = (scoped || []).filter(c => isProblemResult(c.result)).length;
        const sanctions = (scoped || []).filter(c => ["sanctiune", "sesizare_penala"].includes(c.result)).length;
        setText("inspectorResultsTitle", "Rezultate generale");
        setText("inspectorProfileNote", getModulePeriodLabel("inspector"));
        setHtml("inspectorProfileKpis", `
          <div class="inspector-profile-metrics inspector-results-metrics">
            <div class="inspector-profile-card accent-blue"><span>Controale</span><strong>${total}</strong><small>activitate nationala</small></div>
            <div class="inspector-profile-card accent-purple"><span>Amenzi</span><strong>${escapeHtml(formatInspectorMoney(fines))}</strong><small>valoare cumulata</small></div>
            <div class="inspector-profile-card accent-green"><span>Conforme</span><strong>${total ? formatPercent(conform / total * 100) : "0%"}</strong><small>${conform} controale</small></div>
            <div class="inspector-profile-card accent-orange"><span>Cu probleme</span><strong>${total ? formatPercent(problems / total * 100) : "0%"}</strong><small>${problems} controale</small></div>
          </div>
          <div class="inspector-profile-secondary">
            <span>Masuri ferme <b>${sanctions}</b></span>
            <span>Inspectori activi <b>${Object.keys(stats || {}).length}</b></span>
            <span>Perioada <b>${escapeHtml(getModulePeriodLabel("inspector"))}</b></span>
          </div>
        `);
        return;
      }

      if (names.length > 1) {
        const selectedRows = names.map(name => stats[name]).filter(Boolean);
        const controls = (scoped || []).filter(c => (c.echipa || []).some(member => names.includes(member && member.nume)));
        const fines = sumBy(controls, getFineAmount);
        const conform = controls.filter(c => normalizeText(c.result) === "conform").length;
        const problems = controls.filter(c => isProblemResult(c.result)).length;
        setText("inspectorResultsTitle", "Comparatie agregata");
        setText("inspectorProfileNote", `${names.length} inspectori selectati`);
        setHtml("inspectorProfileKpis", `
          <div class="inspector-profile-metrics inspector-results-metrics">
            <div class="inspector-profile-card accent-blue"><span>Controale distincte</span><strong>${controls.length}</strong><small>selectie agregata</small></div>
            <div class="inspector-profile-card accent-purple"><span>Amenzi cumulate</span><strong>${escapeHtml(formatInspectorMoney(fines))}</strong><small>fara amestec de scari</small></div>
            <div class="inspector-profile-card accent-green"><span>Conforme</span><strong>${controls.length ? formatPercent(conform / controls.length * 100) : "0%"}</strong><small>${conform} controale</small></div>
            <div class="inspector-profile-card accent-orange"><span>Cu probleme</span><strong>${controls.length ? formatPercent(problems / controls.length * 100) : "0%"}</strong><small>${problems} controale</small></div>
          </div>
          <div class="inspector-results-compare-list">
            ${selectedRows.map(item => `
              <div>
                <span><b>${escapeHtml(item.name)}</b><small>${Number(item.total || 0)} controale</small></span>
                <strong>${escapeHtml(formatInspectorMoney(item.fines || 0))}</strong>
                <i>${formatPercent(100 - Number(item.problemRate || 0))} conforme</i>
              </div>
            `).join("")}
          </div>
        `);
        return;
      }

      const total = Number(selectedStats.total || 0);
      const status = getInspectorStatus(selectedStats, avgMonthly);
      const guards = getInspectorGuards(selectedStats.name, selectedControls.length ? selectedControls : getInspectorBaseControls());
      const primaryGuard = guards.length ? guardDisplayName(guards[0][0]) : "Garda neprecizata";
      const late = Number(selectedStats.overdueReports || 0);
      const missing = Number(selectedStats.missingReports || 0);
      const initials = String(selectedStats.name || "IN").split(/\s+/).filter(Boolean).slice(0,2).map(part => part[0]).join("").toUpperCase();
      setText("inspectorResultsTitle", "Profil operational");
      setText("inspectorProfileNote", `${scopeText} | ${Number(monthsInScope || 0).toFixed(1)} luni`);
      setHtml("inspectorProfileKpis", `
        <div class="inspector-profile-hero">
          <div class="inspector-profile-identity">
            <b class="inspector-profile-avatar">${escapeHtml(initials)}</b>
            <div>
              <strong>${escapeHtml(selectedStats.name)}</strong>
              <small>${escapeHtml(primaryGuard)}</small>
              <i class="inspector-profile-status ${status.cls}">${escapeHtml(status.label)}</i>
            </div>
          </div>
          <div class="inspector-profile-actions">
            <button type="button" class="inline-action-btn inspector-map-btn" data-inspector="${escapeAttr(selectedStats.name)}">Vezi pe harta</button>
            <button type="button" class="inline-action-btn" onclick="scrollInspectorControlsList()">Vezi controalele</button>
            <button type="button" class="inline-action-btn" onclick="addInspectorComparisonByName('${escapeAttr(selectedStats.name)}')">Compara</button>
          </div>
        </div>
        <div class="inspector-profile-metrics">
          <div class="inspector-profile-card accent-blue"><span>Total controale</span><strong>${total}</strong><small>participari in perioada</small></div>
          <div class="inspector-profile-card accent-purple"><span>Amenzi cumulate</span><strong>${escapeHtml(formatInspectorMoney(selectedStats.fines || 0))}</strong><small>${escapeHtml(formatInspectorMoney(selectedStats.finePerControl || 0))} / control</small></div>
          <div class="inspector-profile-card accent-report"><span>Timp raport</span><strong>${escapeHtml(formatDays(selectedStats.avgReportDays))}</strong><small>rapoarte finalizate</small></div>
          <div class="inspector-profile-card accent-orange"><span>Cu probleme</span><strong>${formatPercent(selectedStats.problemRate)}</strong><small>${Number(selectedStats.problems || 0)} controale</small></div>
        </div>
        <div class="inspector-profile-secondary">
          <span>Controale / luna <b>${Number(selectedStats.monthly || 0).toFixed(1)}</b></span>
          <span>Raspuns sesizari <b>${escapeHtml(formatDays(selectedStats.avgPetitionDays))}</b></span>
          <span>Fara raport <b>${missing}</b></span>
          <span>Intarziate <b>${late}</b></span>
        </div>
      `);
    }

    function renderInspectorCompareChips(names) {
      const box = q("inspectorCompareList");
      if (!box) return;
      box.classList.toggle("is-empty", !names.length);
      if (!names.length) {
        box.innerHTML = `<span class="inspector-compare-empty">Niciun inspector adaugat la comparatie.</span>`;
        return;
      }
      const baseControls = getInspectorBaseControls();
      box.innerHTML = `<div class="inspector-chip-list">
        ${names.map((name, index) => {
          const guardKey = getInspectorPrimaryGuard(name, baseControls);
          const guard = guardKey ? guardDisplayName(guardKey) : "Garda nespecificata";
          const color = INSPECTOR_COMPARE_COLORS[index % INSPECTOR_COMPARE_COLORS.length];
          return `<button type="button" class="inspector-chip inspector-comparison-chip" style="--inspector-series-color:${color}" title="${escapeAttr(guard)}" onclick="removeInspectorComparison('${escapeAttr(name)}')">
          <i aria-hidden="true"></i><span>${escapeHtml(name)}<small>${escapeHtml(guard)}</small></span><b aria-label="Elimina inspectorul">&times;</b>
        </button>`;
        }).join("")}
        ${names.length >= 2 ? `<button type="button" class="inspector-chip clear" onclick="clearInspectorComparison()">Sterge selectia</button>` : ""}
      </div>`;
    }

    function renderInspectorKpiScorecard(stats, selected, months, compareNames = []) {
      const rows = compareNames.map(name => stats[name]).filter(Boolean);
      if (!rows.length) {
        setHtml("inspectorKpiScorecard", `<div class="empty">Adauga inspectori pentru a vedea comparatia.</div>`);
        return;
      }
      const baseControls = getInspectorBaseControls();
      const avgMonthly = Object.values(stats || {}).length ? Object.values(stats).reduce((sum, item) => sum + Number(item.monthly || 0), 0) / Object.values(stats).length : 0;
      setHtml("inspectorKpiScorecard", `
        <div class="inspector-compare-table">
          <div class="inspector-compare-table-head">
            <span>Inspector / garda</span><span>Controale</span><span>Amenzi</span><span>Conforme</span><span>Neconforme</span><span>Probleme</span><span></span>
          </div>
          ${rows.map(item => {
            const guardKey = getInspectorPrimaryGuard(item.name, baseControls);
            const guard = guardKey ? guardDisplayName(guardKey) : "Garda neprecizata";
            const status = getInspectorStatus(item, avgMonthly);
            const conform = Number(item.byResult?.conform || 0);
            const nonconform = Number(item.byResult?.neconform || 0);
            return `<div class="inspector-compare-table-row">
              <span class="inspector-compare-person"><b>${escapeHtml(item.name)}</b><small>${escapeHtml(guard)}</small><i class="inspector-index-score ${status.cls}">${escapeHtml(status.label)}</i></span>
              <strong>${Number(item.total || 0)}</strong>
              <strong>${escapeHtml(formatInspectorMoney(item.fines || 0))}</strong>
              <span class="compare-result-good">${conform}</span>
              <span class="compare-result-bad">${nonconform}</span>
              <span>${formatPercent(item.problemRate)}</span>
              <button type="button" onclick="removeInspectorComparison('${escapeAttr(item.name)}')" aria-label="Elimina din comparatie">×</button>
            </div>`;
          }).join("")}
        </div>
      `);
    }

    function statusClassForResult(result) {
      const r = normalizeText(result || "").replace(/\s+/g, "_");
      if (r.includes("sesizare_penala")) return "status-sesizare-penala";
      if (r.includes("sanctiune")) return "status-sanctiune";
      if (r.includes("neconform")) return "status-neconform";
      if (r.includes("avertisment")) return "status-avertisment";
      if (r.includes("conform")) return "status-conform";
      return "status-document";
    }

    function inspectorReportBadge(c) {
      const hasReport = getControlHasReport(c);
      const raw = normalizeText(firstValue(c, ["report_status"]) || "");
      let label = "Lipsa";
      let cls = "status-fara-raport";
      if (hasReport) {
        label = raw.includes("nesemnat") ? "Nesemnat" : (raw.includes("semnat") ? "Semnat" : "Generat");
        cls = raw.includes("nesemnat") ? "status-avertisment" : "status-finalizat";
      } else if (raw.includes("lucru") || raw.includes("verificare")) {
        label = raw.includes("verificare") ? "In verificare" : "In lucru";
        cls = "status-sanctiune";
      }
      const content = `<span aria-hidden="true">DOC</span>${escapeHtml(label)}`;
      return hasReport
        ? `<button type="button" class="status-badge inspector-report-link ${cls} control-report-open-pdf" data-control-id="${escapeAttr(c.id)}" title="Deschide raportul">${content}</button>`
        : `<span class="status-badge inspector-report-state ${cls}" title="Raport indisponibil">${content}</span>`;
    }

    function inspectorResultBadge(result) {
      if (!result) return `<span class="status-badge status-document">Rezultat nespecificat</span>`;
      const normalized = normalizeText(result).replace(/\s+/g, "_");
      const workflowStatuses = {
        in_lucru: { label: "In lucru", cls: "status-document" },
        in_verificare: { label: "In verificare", cls: "status-document" },
        finalizat: { label: "Finalizat", cls: "status-finalizat" }
      };
      const workflow = workflowStatuses[normalized];
      const cls = workflow ? workflow.cls : statusClassForResult(result);
      const label = workflow ? workflow.label : resultLabel(result);
      return `<span class="status-badge ${cls}">${escapeHtml(label)}</span>`;
    }

    function formatInspectorFine(value) {
      const amount = normalizeNumber(value);
      return amount > 0
        ? formatInspectorMoney(amount)
        : "Fara amenda";
    }

    function formatInspectorControlAmount(value) {
      return Number.isFinite(value) ? formatInspectorMoney(value) : "—";
    }

    function renderInspectorControlsList(selectionLabel, controls) {
      const box = q("inspectorControlsList");
      if (!box) return;
      const sorted = [...(controls || [])].sort((a, b) => new Date(firstValue(b, ["data_control", "created_at"])) - new Date(firstValue(a, ["data_control", "created_at"])));
      const rows = sorted.slice(0, inspectorControlsLimit);
      setText("inspectorControlsCount", `${rows.length} din ${sorted.length} controale`);
      setText("inspectorControlsNote", "Activitate nationala");
      if (!sorted.length) {
        box.innerHTML = `<div class="empty inspector-controls-empty">
          <span>Nu exista controale pentru filtrele selectate.</span>
          <button type="button" class="secondary" onclick="resetInspectorAdvancedFilters()">Reseteaza filtrele</button>
        </div>`;
        return;
      }
      box.innerHTML = `
        <div class="inspector-control-list-head"><span>ID / Data</span><span>Tip control</span><span>Garda / inspector</span><span>Rezultat</span><span>Amenda / prejudiciu</span><span>Detalii control</span><span>Localizare</span></div>
        ${rows.map(c => {
          const date = firstValue(c, ["data_control", "created_at"]);
          const fine = getFineAmount(c);
          const damage = getDamageAmount(c);
          const inspectors = (c.echipa || []).map(member => member && member.nume).filter(Boolean);
          const inspectorLabel = inspectors[0] || "Inspector nealocat";
          const inspectorExtra = Math.max(0, inspectors.length - 1);
          const guard = c.garda ? guardDisplayName(c.garda) : "Garda nespecificata";
          const rawTime = firstValue(c, ["ora_control"]);
          const time = rawTime ? getControlTimeLabel({ ora_control: rawTime }) : "";
          const type = getControlModeLabel(c) || c.control_type || "Tip nespecificat";
          const category = getControlCategory(c) || getControlDomainRaw(c) || "Categorie nespecificata";
          const hasCoordinates = Boolean(getControlDisplayLatLng(c));
          const mapAttributes = hasCoordinates ? ' title="Vezi controlul pe harta"' : ' disabled aria-disabled="true" title="Localizare indisponibila"';
          return `<div class="inspector-control-row" data-control-id="${escapeAttr(c.id)}">
            <div class="inspector-control-date"><b class="inspector-control-id">#${escapeHtml(c.id || "-")}</b><strong>${escapeHtml(date ? formatDay(date) : "Data indisponibila")}</strong><small>${escapeHtml(time ? `Ora ${time}` : "Ora —")}</small></div>
            <div class="inspector-control-type" title="${escapeAttr(`${type} | ${category}`)}"><strong>${escapeHtml(type)}</strong><small>${escapeHtml(category)}</small></div>
            <div class="inspector-control-team"><strong title="${escapeAttr(guard)}">${escapeHtml(guard)}</strong><small title="${escapeAttr(inspectors.join(", ") || inspectorLabel)}">${escapeHtml(inspectorLabel)}${inspectorExtra ? `<b>+${inspectorExtra}</b>` : ""}</small></div>
            <div class="inspector-control-status">${inspectorResultBadge(c.result)}</div>
            <div class="inspector-control-money"><span><small>Amenda</small><strong>${escapeHtml(formatInspectorControlAmount(fine))}</strong></span><span><small>Prejudiciu</small><strong>${escapeHtml(formatInspectorControlAmount(damage))}</strong></span></div>
            <div class="inspector-control-detail"><button type="button" class="quick-control-sheet-btn" data-control-id="${escapeAttr(c.id)}" title="Deschide fisa completa a controlului"><span aria-hidden="true">i</span>Vezi detalii</button></div>
            <div class="inspector-control-location"><button type="button" class="inspector-control-map-btn" data-control-id="${escapeAttr(c.id)}"${mapAttributes}><span aria-hidden="true">PIN</span>Vezi pe harta</button></div>
          </div>`;
        }).join("")}
        ${sorted.length > rows.length ? `<button type="button" class="gfn-more-btn inspector-controls-more" onclick="showMoreInspectorControls()">Afiseaza mai multe controale (${sorted.length - rows.length})</button>` : ""}
      `;
    }

    function averageMetric(stats, getter, excludeName = "") {
      const values = Object.values(stats || {}).filter(item => item.name !== excludeName).map(getter).filter(v => Number.isFinite(Number(v)));
      return values.length ? values.reduce((sum, v) => sum + Number(v), 0) / values.length : null;
    }

    function chartRowsForInspector(stats, selected, compareNames) {
      const rows = (compareNames && compareNames.length ? compareNames : (selected ? [selected] : []))
        .map(name => stats[name])
        .filter(Boolean);
      if (rows.length) return rows;
      return getSortedInspectorRows(stats).slice(0, 8);
    }

    function addInspectorAverageRows(rows, stats, selected, periodBase, monthsInScope) {
      if (!selected || !stats[selected]) return rows;
      const out = [...rows];
      out.push({
        name: "Media nationala",
        monthly: averageMetric(stats, item => item.monthly),
        avgReportDays: averageMetric(stats, item => item.avgReportDays),
        avgPetitionDays: averageMetric(stats, item => item.avgPetitionDays),
        problemRate: averageMetric(stats, item => item.problemRate),
        finePerControl: averageMetric(stats, item => item.finePerControl),
        overdueReports: averageMetric(stats, item => item.overdueReports)
      });
      const guardKey = getInspectorPrimaryGuard(selected, periodBase);
      if (guardKey) {
        const guardControls = periodBase.filter(c => canonicalGuardName(c.garda) === guardKey);
        const guardStats = buildInspectorStats(guardControls, monthsInScope);
        out.push({
          name: "Media " + gardaShortLabel(guardDisplayName(guardKey)),
          monthly: averageMetric(guardStats, item => item.monthly, selected),
          avgReportDays: averageMetric(guardStats, item => item.avgReportDays, selected),
          avgPetitionDays: averageMetric(guardStats, item => item.avgPetitionDays, selected),
          problemRate: averageMetric(guardStats, item => item.problemRate, selected),
          finePerControl: averageMetric(guardStats, item => item.finePerControl, selected),
          overdueReports: averageMetric(guardStats, item => item.overdueReports, selected)
        });
      }
      return out;
    }

    function inspectorActivityGradient(values) {
      return getValueColors(values, "higher");
    }

    const INSPECTOR_CHART_DAY_MS = 24 * 60 * 60 * 1000;
    const INSPECTOR_ACTIVITY_GRADIENTS = {
      neutral: ["rgba(148,163,173,.24)", "rgba(148,163,173,.08)"],
      coral: [GFN_COLORS.scale[0], GFN_COLORS.scale[1]],
      orange: [GFN_COLORS.scale[1], GFN_COLORS.scale[2]],
      amber: [GFN_COLORS.scale[2], GFN_COLORS.scale[3]],
      lime: [GFN_COLORS.scale[4], GFN_COLORS.scale[5]],
      green: [GFN_COLORS.scale[6], GFN_COLORS.scale[7]]
    };

    function normalizeInspectorChartDate(value) {
      const date = value instanceof Date ? new Date(value) : parseLooseDate(value);
      if (!date || isNaN(date)) return null;
      return new Date(date.getFullYear(), date.getMonth(), date.getDate());
    }

    function inspectorChartDateKey(value) {
      const date = normalizeInspectorChartDate(value);
      if (!date) return "";
      return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
    }

    function inspectorChartDayNumber(value) {
      const date = normalizeInspectorChartDate(value);
      return date ? Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / INSPECTOR_CHART_DAY_MS : null;
    }

    function getInspectorChartRange(controls, requestedRange = {}) {
      let start = normalizeInspectorChartDate(requestedRange.dateFrom);
      let end = normalizeInspectorChartDate(requestedRange.dateTo);
      const dates = (controls || []).map(getControlDateValue).map(normalizeInspectorChartDate).filter(Boolean);
      if (!start && dates.length) start = new Date(Math.min(...dates.map(date => date.getTime())));
      if (!end && dates.length) end = new Date(Math.max(...dates.map(date => date.getTime())));
      if (!start || !end) return null;
      if (start > end) [start, end] = [end, start];
      return {
        start,
        end,
        dayCount: Math.floor(inspectorChartDayNumber(end) - inspectorChartDayNumber(start)) + 1
      };
    }

    function getChartGranularity(startDate, endDate) {
      const startDay = inspectorChartDayNumber(startDate);
      const endDay = inspectorChartDayNumber(endDate);
      const dayCount = startDay === null || endDay === null ? 0 : Math.abs(endDay - startDay) + 1;
      if (dayCount <= 92) return { mode: "daily", unit: "day", dayCount };
      if (dayCount <= 180) return { mode: "area", unit: "week", dayCount };
      if (dayCount <= 1826) return { mode: "area", unit: "month", dayCount };
      return { mode: "area", unit: "quarter", dayCount };
    }

    function addInspectorChartDays(date, amount) {
      const result = new Date(date);
      result.setDate(result.getDate() + amount);
      return result;
    }

    function buildInspectorTimeBuckets(startDate, endDate, unit) {
      const start = normalizeInspectorChartDate(startDate);
      const end = normalizeInspectorChartDate(endDate);
      if (!start || !end) return [];
      const buckets = [];
      if (unit === "day" || unit === "week") {
        const step = unit === "day" ? 1 : 7;
        const first = new Date(start);
        if (unit === "week") {
          const weekday = first.getDay() || 7;
          first.setDate(first.getDate() - weekday + 1);
        }
        for (let cursor = new Date(first); cursor <= end; cursor = addInspectorChartDays(cursor, step)) {
          const bucketEnd = unit === "day" ? new Date(cursor) : addInspectorChartDays(cursor, 6);
          const visibleStart = new Date(Math.max(cursor.getTime(), start.getTime()));
          const visibleEnd = new Date(Math.min(bucketEnd.getTime(), end.getTime()));
          const labelAnchor = new Date((visibleStart.getTime() + visibleEnd.getTime()) / 2);
          buckets.push({ key: inspectorChartDateKey(cursor), start: new Date(cursor), end: bucketEnd, labelAnchor });
        }
        return buckets;
      }
      const cursor = new Date(start.getFullYear(), start.getMonth(), 1);
      while (cursor <= end) {
        if (unit === "quarter") {
          const quarterMonth = Math.floor(cursor.getMonth() / 3) * 3;
          const quarterStart = new Date(cursor.getFullYear(), quarterMonth, 1);
          const quarterEnd = new Date(cursor.getFullYear(), quarterMonth + 3, 0);
          buckets.push({
            key: `${quarterStart.getFullYear()}-T${Math.floor(quarterMonth / 3) + 1}`,
            start: new Date(Math.max(quarterStart.getTime(), start.getTime())),
            end: new Date(Math.min(quarterEnd.getTime(), end.getTime()))
          });
          cursor.setMonth(quarterMonth + 3, 1);
        } else {
          const monthStart = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
          const monthEnd = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0);
          buckets.push({
            key: `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, "0")}`,
            start: new Date(Math.max(monthStart.getTime(), start.getTime())),
            end: new Date(Math.min(monthEnd.getTime(), end.getTime()))
          });
          cursor.setMonth(cursor.getMonth() + 1, 1);
        }
      }
      return buckets;
    }

    function findInspectorTimeBucketIndex(dateValue, buckets) {
      const date = normalizeInspectorChartDate(dateValue);
      if (!date) return -1;
      return buckets.findIndex(bucket => date >= bucket.start && date <= bucket.end);
    }

    function buildInspectorActivitySeries(controls, startDate, endDate, unit, selectedNames = []) {
      const buckets = buildInspectorTimeBuckets(startDate, endDate, unit);
      const selected = new Set((selectedNames || []).filter(Boolean));
      const values = buckets.map(() => 0);
      const inspectorCounts = buckets.map(() => new Map());

      (controls || []).forEach(control => {
        const index = findInspectorTimeBucketIndex(getControlDateValue(control), buckets);
        if (index < 0) return;
        const names = [...new Set((control.echipa || []).map(member => member && member.nume).filter(Boolean))];
        names.forEach(name => inspectorCounts[index].set(name, (inspectorCounts[index].get(name) || 0) + 1));
        if (!selected.size) {
          values[index] += 1;
        } else {
          values[index] += names.filter(name => selected.has(name)).length;
        }
      });

      const nationalAverage = inspectorCounts.map(counts => {
        const activeValues = [...counts.values()].filter(value => value > 0);
        return activeValues.length
          ? Number((activeValues.reduce((sum, value) => sum + value, 0) / activeValues.length).toFixed(2))
          : 0;
      });
      return { buckets, values, nationalAverage };
    }

    function buildInspectorWeeklyActivitySeries(controls, nationalControls, startDate, endDate, showNationalAverage) {
      const buckets = buildInspectorTimeBuckets(startDate, endDate, "week");
      const values = buckets.map(() => 0);
      const nationalTotals = buckets.map(() => 0);
      const nationalGuards = new Set((nationalControls || []).map(c => canonicalGuardName(c.garda)).filter(Boolean));
      const guardCount = Math.max(1, nationalGuards.size);
      (controls || []).forEach(control => {
        const index = findInspectorTimeBucketIndex(getControlDateValue(control), buckets);
        if (index >= 0) values[index] += 1;
      });
      (nationalControls || []).forEach(control => {
        const index = findInspectorTimeBucketIndex(getControlDateValue(control), buckets);
        if (index >= 0) nationalTotals[index] += 1;
      });
      const today = normalizeInspectorChartDate(new Date());
      const requestedEnd = normalizeInspectorChartDate(endDate);
      const currentWeekIndex = today && requestedEnd && requestedEnd >= today
        ? findInspectorTimeBucketIndex(today, buckets)
        : -1;
      return {
        buckets,
        values,
        nationalAverage: showNationalAverage
          ? nationalTotals.map(total => Number((total / guardCount).toFixed(2)))
          : [],
        includeNationalAverage: Boolean(showNationalAverage),
        currentWeekIndex
      };
    }

    function inspectorWeekMonthKey(bucket) {
      if (!bucket) return "";
      const anchor = bucket.labelAnchor || addInspectorChartDays(bucket.start, 3);
      return `${anchor.getFullYear()}-${String(anchor.getMonth() + 1).padStart(2, "0")}`;
    }

    function inspectorMonthAxisLabel(monthKeyValue) {
      const [year, month] = String(monthKeyValue || "").split("-").map(Number);
      if (!year || !month) return "";
      const label = toAsciiText(new Date(year, month - 1, 1).toLocaleDateString("ro-RO", { month: "short" })).replace(/\./g, "");
      return label ? label.charAt(0).toUpperCase() + label.slice(1) : "";
    }

    function getInspectorMonthGroups(buckets) {
      const groups = [];
      (buckets || []).forEach((bucket, index) => {
        const key = inspectorWeekMonthKey(bucket);
        const current = groups[groups.length - 1];
        if (!current || current.key !== key) {
          groups.push({ key, startIndex: index, endIndex: index });
        } else {
          current.endIndex = index;
        }
      });
      return groups.map(group => ({
        ...group,
        centerIndex: Math.floor((group.startIndex + group.endIndex) / 2),
        label: inspectorMonthAxisLabel(group.key)
      }));
    }

    function formatInspectorFullPeriod(startDate, endDate) {
      const start = normalizeInspectorChartDate(startDate);
      const end = normalizeInspectorChartDate(endDate);
      if (!start || !end) return "Perioada selectata · agregare saptamanala";
      const startText = toAsciiText(start.toLocaleDateString("ro-RO", { day: "numeric", month: "long", year: start.getFullYear() === end.getFullYear() ? undefined : "numeric" }));
      const endText = toAsciiText(end.toLocaleDateString("ro-RO", { day: "numeric", month: "long", year: "numeric" }));
      return `${startText} - ${endText} · agregare saptamanala`;
    }

    function getInspectorActivityDistribution(values) {
      return getQuantitativeRange(values);
    }

    function getActivityColor(value, stats) {
      return getPerformanceTone(value, stats, "higher");
    }

    function inspectorActivityGradientForContext(context, stats) {
      return quantitativeColor(context.raw, stats.min, stats.max);
    }

    function inspectorAreaGradient(context) {
      const chart = context.chart;
      const area = chart && chart.chartArea;
      if (!area) return "rgba(32,223,114,.20)";
      const gradient = chart.ctx.createLinearGradient(0, area.top, 0, area.bottom);
      gradient.addColorStop(0, "rgba(32,223,114,.30)");
      gradient.addColorStop(1, "rgba(32,223,114,.02)");
      return gradient;
    }

    function formatInspectorChartAxisLabel(bucket, unit) {
      if (!bucket) return "";
      if (unit === "day") return toAsciiText(bucket.start.toLocaleDateString("ro-RO", { day: "numeric", month: "short" }));
      if (unit === "week") {
        const start = toAsciiText(bucket.start.toLocaleDateString("ro-RO", { day: "numeric", month: "short" }));
        const end = toAsciiText(bucket.end.toLocaleDateString("ro-RO", { day: "numeric", month: "short" }));
        return `${start} - ${end}`;
      }
      if (unit === "quarter") return bucket.key.replace("-T", " T");
      return monthLabel(bucket.key);
    }

    function formatInspectorChartTooltipDate(bucket, unit) {
      if (!bucket) return "";
      if (unit === "day") {
        return toAsciiText(bucket.start.toLocaleDateString("ro-RO", {
          weekday: "long", day: "numeric", month: "long", year: "numeric"
        }));
      }
      if (unit === "week") return `Saptamana ${formatInspectorChartAxisLabel(bucket, unit)}`;
      if (unit === "quarter") return `Trimestrul ${bucket.key.replace("-T", " T")}`;
      return toAsciiText(bucket.start.toLocaleDateString("ro-RO", { month: "long", year: "numeric" }));
    }

    function shouldShowInspectorChartTick(index, buckets, unit) {
      const total = buckets.length;
      if (unit !== "day") return true;
      if (index === 0 || index === total - 1 || buckets[index].start.getDate() === 1) return true;
      return index % Math.max(1, Math.ceil(total / 12)) === 0;
    }

    const inspectorMonthSeparatorPlugin = {
      id: "inspectorMonthSeparators",
      beforeDatasetsDraw(chart, args, options) {
        if (!options || !options.enabled || Number(options.currentWeekIndex) < 0) return;
        const xScale = chart.scales && chart.scales.x;
        const area = chart.chartArea;
        if (!xScale || !area) return;
        const index = Number(options.currentWeekIndex);
        const center = xScale.getPixelForValue(index);
        const previous = index > 0 ? xScale.getPixelForValue(index - 1) : center - 12;
        const next = index < (options.buckets || []).length - 1 ? xScale.getPixelForValue(index + 1) : center + 12;
        const halfWidth = Math.max(7, Math.abs(next - previous) / 4);
        chart.ctx.save();
        chart.ctx.fillStyle = "rgba(34,211,238,.055)";
        chart.ctx.fillRect(center - halfWidth, area.top, halfWidth * 2, area.bottom - area.top);
        chart.ctx.restore();
      },
      afterDraw(chart, args, options) {
        if (!options || !options.enabled) return;
        const groups = options.monthGroups || [];
        const xScale = chart.scales && chart.scales.x;
        const area = chart.chartArea;
        if (!xScale || !area) return;
        const ctx = chart.ctx;
        ctx.save();
        groups.forEach((group, index) => {
          if (!index) return;
          const currentX = xScale.getPixelForValue(group.startIndex);
          const previousX = xScale.getPixelForValue(group.startIndex - 1);
          const x = (currentX + previousX) / 2;
          ctx.strokeStyle = "rgba(174,184,194,.12)";
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(x, area.top);
          ctx.lineTo(x, area.bottom);
          ctx.stroke();
        });
        ctx.restore();
      }
    };

    function buildInspectorActivityChartConfig(series, granularity, seriesLabel) {
      const { buckets, values, nationalAverage } = series;
      const daily = granularity.mode === "daily";
      const bars = daily || granularity.unit === "week";
      const weekly = granularity.unit === "week";
      const distribution = getInspectorActivityDistribution(values);
      const monthGroups = weekly ? getInspectorMonthGroups(buckets) : [];
      const monthLabelsByIndex = new Map(monthGroups.map(group => [group.centerIndex, group.label]));
      const labels = buckets.map(bucket => bucket.key);
      const mainDataset = bars ? {
        label: seriesLabel,
        data: values,
        backgroundColor: context => inspectorActivityGradientForContext(context, distribution),
        borderColor: context => quantitativeColor(context.raw, distribution.min, distribution.max),
        borderWidth: 1,
        borderRadius: 2,
        borderSkipped: false,
        barPercentage: .76,
        categoryPercentage: .9,
        maxBarThickness: granularity.unit === "week" ? 30 : 12,
        minBarLength: weekly ? 2 : 0,
        order: 2
      } : {
        label: seriesLabel,
        data: values,
        borderColor: chartColors.green,
        backgroundColor: inspectorAreaGradient,
        pointRadius: 0,
        pointHoverRadius: 4,
        pointHitRadius: 10,
        borderWidth: 2.7,
        tension: .3,
        fill: true,
        order: 2
      };
      const nationalDataset = {
        type: "line",
        label: "Media nationala / garda",
        data: nationalAverage,
        borderColor: chartColors.teal,
        backgroundColor: "rgba(34,184,230,.08)",
        pointBackgroundColor: chartColors.teal,
        pointBorderColor: "#0c2530",
        pointRadius: 0,
        pointHoverRadius: 4,
        pointHitRadius: 10,
        borderWidth: 2.5,
        tension: .3,
        fill: false,
        order: 1
      };
      return {
        type: bars ? "bar" : "line",
        data: { labels, datasets: series.includeNationalAverage === false ? [mainDataset] : [mainDataset, nationalDataset] },
        plugins: (daily || weekly) ? [inspectorMonthSeparatorPlugin] : [],
        options: {
          responsive: true,
          maintainAspectRatio: false,
          animation: { duration: 260 },
          layout: { padding: { top: bars ? 28 : 14, right: 10, bottom: 4, left: 4 } },
          interaction: { mode: "index", intersect: false },
          onHover: (event, elements, chart) => {
            if (chart && chart.canvas) chart.canvas.style.cursor = elements.length ? "crosshair" : "default";
          },
          plugins: {
            valueLabelPlugin: { display: false },
            inspectorMonthSeparators: { enabled: daily || weekly, buckets, monthGroups, currentWeekIndex: series.currentWeekIndex },
            legend: {
              position: "top",
              align: "end",
              labels: { usePointStyle: true, boxWidth: 8, color: "rgba(244,252,249,.92)", font: { size: 13, weight: "600" } }
            },
            tooltip: {
              backgroundColor: "rgba(3,18,22,.98)",
              titleColor: "#ffffff",
              bodyColor: "rgba(239,250,247,.90)",
              borderColor: "rgba(34,211,238,.30)",
              borderWidth: 1,
              padding: 10,
              callbacks: {
                title: items => items.length ? formatInspectorChartTooltipDate(buckets[items[0].dataIndex], granularity.unit) : "",
                label: context => `${context.dataset.label}: ${Number(context.parsed.y || 0)} controale`,
                footer: items => items.length && items[0].dataIndex === series.currentWeekIndex ? "Saptamana curenta · date partiale" : ""
              }
            }
          },
          scales: {
            x: {
              grid: { display: false },
              ticks: {
                autoSkip: false,
                maxRotation: 0,
                minRotation: 0,
                color: "rgba(235,246,242,.80)",
                font: { size: 13, weight: "500" },
                callback(value, index) {
                  if (weekly) return monthLabelsByIndex.get(index) || "";
                  return shouldShowInspectorChartTick(index, buckets, granularity.unit) ? formatInspectorChartAxisLabel(buckets[index], granularity.unit) : "";
                }
              }
            },
            y: {
              beginAtZero: true,
              grace: "12%",
              grid: { color: "rgba(205,238,228,.08)" },
              ticks: { precision: 0, color: "rgba(235,246,242,.80)", font: { size: 13, weight: "500" } }
            }
          }
        }
      };
    }

    function makeInspectorActivityChart(series, granularity, inspectorName) {
      const el = q("chartInspectorsMonthly");
      if (!el) return null;
      const mode = granularity.mode;
      const config = buildInspectorActivityChartConfig(series, granularity, inspectorName || "Activitate nationala");
      const current = charts.chartInspectorsMonthly;
      if (current && current.$gfnInspectorMode === mode) {
        current.data = config.data;
        current.options = config.options;
        current.update("none");
        return current;
      }
      if (current) current.destroy();
      charts.chartInspectorsMonthly = new Chart(el, config);
      charts.chartInspectorsMonthly.$gfnInspectorMode = mode;
      return charts.chartInspectorsMonthly;
    }

    window.GFNInspectorEvolution = Object.freeze({
      getChartGranularity,
      getInspectorChartRange,
      buildInspectorTimeBuckets,
      buildInspectorActivitySeries,
      buildInspectorWeeklyActivitySeries,
      getInspectorMonthGroups,
      formatInspectorFullPeriod,
      getInspectorActivityDistribution,
      getActivityColor,
      dateKey: inspectorChartDateKey
    });

    function inspectorSeriesFill(hex, alpha = .15) {
      const value = String(hex || "").replace("#", "");
      if (value.length !== 6) return `rgba(53,216,138,${alpha})`;
      const r = parseInt(value.slice(0, 2), 16);
      const g = parseInt(value.slice(2, 4), 16);
      const b = parseInt(value.slice(4, 6), 16);
      return `rgba(${r},${g},${b},${alpha})`;
    }

    function renderInspectorComparisonAreaChart(stats, nationalStats, compareNames) {
      const canvas = q("chartInspectorsComparison");
      if (!canvas) return;
      if (charts.chartInspectorsComparison) charts.chartInspectorsComparison.destroy();

      const names = [...new Set((compareNames || []).filter(name => stats[name]))].slice(0, 5);
      const months = [...new Set(
        Object.values(nationalStats || {}).flatMap(item => Object.keys(item.byMonth || {}))
      )].sort();

      if (!months.length) {
        charts.chartInspectorsComparison = null;
        return;
      }

      const inspectorDatasets = names.map((name, index) => {
        const color = INSPECTOR_COMPARE_COLORS[index % INSPECTOR_COMPARE_COLORS.length];
        return {
          label: name,
          data: months.map(month => Number(stats[name]?.byMonth?.[month] || 0)),
          borderColor: color,
          backgroundColor: inspectorSeriesFill(color, .14),
          borderWidth: 2,
          pointRadius: 0,
          pointHoverRadius: 4,
          pointHitRadius: 12,
          tension: .32,
          fill: true,
          order: 2
        };
      });

      // Formula lunara: totalul controalelor inspectorilor activi in luna /
      // numarul inspectorilor care au cel putin un control in acea luna.
      const nationalAverage = months.map(month => {
        const activeValues = Object.values(nationalStats || {})
          .map(item => Number(item.byMonth?.[month] || 0))
          .filter(value => value > 0);
        return activeValues.length
          ? Number((activeValues.reduce((sum, value) => sum + value, 0) / activeValues.length).toFixed(2))
          : 0;
      });

      charts.chartInspectorsComparison = new Chart(canvas, {
        type: "line",
        data: {
          labels: months.map(monthLabel),
          datasets: [
            ...inspectorDatasets,
            {
              label: "Media nationala",
              data: nationalAverage,
              borderColor: chartColors.teal,
              backgroundColor: "rgba(34,184,230,.04)",
              borderWidth: 3,
              borderDash: [7, 5],
              pointRadius: 0,
              pointHoverRadius: 4,
              pointHitRadius: 12,
              tension: .28,
              fill: false,
              order: 0
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          layout: { padding: { top: 14, right: 10, bottom: 4, left: 4 } },
          interaction: { mode: "index", intersect: false },
          plugins: {
            legend: {
              position: "top",
              align: "start",
              labels: { usePointStyle: true, boxWidth: 8, boxHeight: 8, color: "rgba(244,252,249,.92)", padding: 12, font: { size: 13, weight: "600" } }
            },
            tooltip: {
              backgroundColor: "rgba(3,18,22,.96)",
              titleColor: "#ffffff",
              bodyColor: "rgba(239,250,247,.90)",
              borderColor: "rgba(34,211,238,.30)",
              borderWidth: 1,
              padding: 10,
              callbacks: {
                title: items => items.length ? `Luna ${items[0].label}` : "",
                label: context => `${context.dataset.label}: ${context.parsed.y} controale`
              }
            }
          },
          scales: {
            x: { grid: { display: false }, ticks: { color: "rgba(235,246,242,.80)", font: { size: 13, weight: "500" } } },
            y: {
              beginAtZero: true,
              grace: "12%",
              grid: { color: "rgba(205,238,228,.08)" },
              ticks: { precision: 0, color: "rgba(235,246,242,.80)", font: { size: 13, weight: "500" } }
            }
          }
        }
      });
    }

    function renderInspectorComparisonCharts(stats, scoped, selected, compareNames, periodBase, monthsInScope, nationalPeriodControls = periodBase, filterState = inspectorFilterState) {
      const baseRows = chartRowsForInspector(stats, selected, compareNames);
      const rows = addInspectorAverageRows(baseRows, stats, selected || (compareNames && compareNames[0]), periodBase, monthsInScope);
      const labels = rows.map(item => item.name);
      const valuesForColor = rows.map(item => Number(item.total || item.monthly || 0));
      const colors = inspectorActivityGradient(valuesForColor);
      const activeChartIds = inspectorSortMode === "activity"
        ? ["chartInspectorsMonthly"]
        : inspectorSortMode === "report"
          ? ["chartInspectorsReportTime", "chartInspectorsPetitionResponse"]
          : inspectorSortMode === "problems"
            ? ["chartInspectorsProblems", "chartInspectorsFinePerControl"]
            : ["chartInspectorsOverdue"];
      ["chartInspectorsMonthly","chartInspectorsReportTime","chartInspectorsPetitionResponse","chartInspectorsProblems","chartInspectorsFinePerControl","chartInspectorsOverdue"].forEach(id => {
        if (!activeChartIds.includes(id) && charts[id]) { charts[id].destroy(); delete charts[id]; }
      });

      if (inspectorSortMode === "activity") {
        const range = getInspectorChartRange(scoped, getInspectorPeriodRange());
        if (range) {
          const guardSelected = filterState.guard && filterState.guard !== "toate";
          const series = buildInspectorWeeklyActivitySeries(scoped, nationalPeriodControls, range.start, range.end, guardSelected);
          const seriesLabel = guardSelected ? `Controale · ${guardDisplayName(filterState.guard)}` : "Controale · toate garzile";
          setText("chartInspectorsActivityTitle", "Controale pe saptamani");
          setText("chartInspectorsActivitySub", guardSelected ? "bare: garda selectata · linie: media nationala / garda" : "bare: activitate nationala filtrata");
          makeInspectorActivityChart(series, { mode: "weekly", unit: "week" }, seriesLabel);
        } else {
          setText("chartInspectorsActivityTitle", "Controale pe saptamani");
          setText("chartInspectorsActivitySub", "fara date in selectia curenta");
          makeChart("chartInspectorsMonthly", "bar", ["Fara date"], [0], { colors: [chartColors.gray], quiet: true });
        }
      }
      if (inspectorSortMode === "report") {
        setText("chartInspectorsReportTitle", "Timp mediu raport");
        setText("chartInspectorsReportSub", selected || compareNames.length ? "inspectori selectati vs medii" : "top inspectori");
        const reportValues = rows.map(item => Number(item.avgReportDays || 0).toFixed(1));
        const responseValues = rows.map(item => Number(item.avgPetitionDays || 0).toFixed(1));
        makeChart("chartInspectorsReportTime", "bar", labels, reportValues, { horizontal: true, label: "Zile", metricKey: "reportAvgDays", quiet: true });
        makeChart("chartInspectorsPetitionResponse", "bar", labels, responseValues, { horizontal: true, label: "Zile", metricKey: "petitionAvgDays", quiet: true });
      }
      if (inspectorSortMode === "problems") {
        const problemValues = rows.map(item => Number(item.problemRate || 0).toFixed(1));
        const fineValues = rows.map(item => Math.round(Number(item.finePerControl || 0)));
        makeChart("chartInspectorsProblems", "bar", labels, problemValues, { horizontal: true, label: "%", metricKey: "problemRate", quiet: true });
        makeChart("chartInspectorsFinePerControl", "bar", labels, fineValues, { horizontal: true, label: "lei", metricKey: "finePerControl", quiet: true });
      }
      if (inspectorSortMode === "delays") {
        const overdueValues = rows.map(item => Number(Number(item.overdueReports || 0).toFixed(1)));
        makeChart("chartInspectorsOverdue", "bar", labels, overdueValues, { horizontal: true, label: "Controale", metricKey: "overdueReports", quiet: true });
      }
    }

    function renderInspectorsView() {
      if (!isInternalMode) return;
      syncInspectorAnalysisMode();
      const filterState = readInspectorFilterState();
      const customPeriod = q("inspectorCustomPeriod");
      if (customPeriod) customPeriod.hidden = filterState.periodPreset !== "custom";
      const periodBase = getInspectorFilteredControls(allControls, filterState);
      const scopeTotal = getInspectorFilteredControls(allControls, filterState, { includePeriod: false });
      const nationalPeriodControls = getInspectorFilteredControls(allControls, { ...filterState, guard: "toate" });
      const inspectorRange = getInspectorPeriodRange();
      const nationalMonths = getPeriodMonths(nationalPeriodControls, inspectorRange);
      const nationalStats = buildInspectorStats(nationalPeriodControls, nationalMonths);

      const scoped = periodBase;
      const monthsInScope = getPeriodMonths(scoped, inspectorRange);
      const stats = buildInspectorStats(scoped, monthsInScope);
      if (selectedInspectorName && !stats[selectedInspectorName]) selectedInspectorName = "";
      const names = Object.keys(stats);
      const selected = selectedInspectorName && stats[selectedInspectorName] ? selectedInspectorName : "";
      const avgMonthly = names.length ? Object.values(stats).reduce((sum, item) => sum + Number(item.monthly || 0), 0) / names.length : 0;
      inspectorCompareNames = inspectorCompareNames.filter(name => stats[name]).slice(0, 5);
      const comparisonNames = [...inspectorCompareNames];
      const effectiveNames = comparisonNames.length ? comparisonNames : (selected ? [selected] : []);
      const profileName = effectiveNames.length === 1 ? effectiveNames[0] : "";
      const profileStats = profileName && stats[profileName] ? stats[profileName] : null;
      const profileControls = profileStats ? getInspectorControls(profileName, scoped) : [];
      const guardForText = filterState.guard;
      const scopeText = guardForText && guardForText !== "toate" ? `media ${guardDisplayName(guardForText)}` : "media nationala";
      const guardLabel = guardForText && guardForText !== "toate" ? guardDisplayName(guardForText) : "";
      const periodLabel = getModulePeriodLabel("inspector");
      const periodRangeLabel = formatInspectorFullPeriod(inspectorRange.dateFrom, inspectorRange.dateTo);
      const summaryLabel = effectiveNames.length > 1
        ? `${effectiveNames.length} inspectori comparati`
        : (profileName || "Activitate nationala");
      setText("inspectorSummary", `${summaryLabel} | ${periodLabel}`);
      setText("inspectorActiveFilterCount", periodLabel);
      setText("inspectorRankingTitle", guardLabel ? `Top 5 inspectori · ${guardLabel}` : "Top 5 inspectori · Clasament national");
      setText("inspectorRankingSubtitle", periodLabel);
      setText("inspectorEvolutionTitle", guardLabel ? `Evolutie saptamanala · ${guardLabel}` : "Evolutie saptamanala · Toate garzile");
      setText("inspectorEvolutionSubtitle", periodRangeLabel);
      renderInspectorGeneralKpis(stats, scoped, scopeTotal);
      renderInspectorIndex(stats, selected, avgMonthly, scoped);
      renderInspectorProfile(profileStats, profileControls, avgMonthly, scopeText, monthsInScope, effectiveNames, stats, scoped);
      renderInspectorCompareChips(comparisonNames);
      renderInspectorKpiScorecard(stats, profileName, monthsInScope, comparisonNames);
      renderInspectorComparisonAreaChart(stats, nationalStats, effectiveNames);
      const controlsForSelection = !effectiveNames.length
        ? scoped
        : (effectiveNames.length === 1
          ? getInspectorControls(effectiveNames[0], scoped)
          : scoped.filter(control => (control.echipa || []).some(member => effectiveNames.includes(member && member.nume))));
      const controlsLabel = effectiveNames.length > 1
        ? `${effectiveNames.length} inspectori comparati`
        : (effectiveNames[0] || "activitate nationala");
      renderInspectorControlsList(controlsLabel, controlsForSelection);
      if (isCollapseOpen("collapseInspectorCharts")) {
        renderInspectorComparisonCharts(stats, scoped, profileName, effectiveNames, nationalPeriodControls, monthsInScope, nationalPeriodControls, filterState);
      }
    }

    window.selectInspector = selectInspector;
    window.setInspectorSortMode = setInspectorSortMode;
    window.setInspectorRankingMode = setInspectorRankingMode;
    window.addInspectorComparisonByName = addInspectorComparisonByName;
    window.setInspectorComparisonScope = setInspectorComparisonScope;
    window.scrollInspectorControlsList = scrollInspectorControlsList;

    function modulePeriodIds(prefix) {
      return {
        preset: prefix + "PeriodPreset",
        from: prefix + "DateFrom",
        to: prefix + "DateTo"
      };
    }

    function setModulePeriod(prefix, fromDate, toDate) {
      const ids = modulePeriodIds(prefix);
      if (q(ids.from)) q(ids.from).value = fromDate || "";
      if (q(ids.to)) q(ids.to).value = toDate || "";
    }

    function applyModulePeriodPreset(prefix, preset) {
      const now = new Date();
      const end = new Date(now);
      const start = new Date(now);
      let from = "";
      let to = "";

      if (preset === "last30") {
        start.setDate(now.getDate() - 30);
        from = toIsoDate(start);
        to = toIsoDate(end);
      } else if (preset === "last90") {
        start.setDate(now.getDate() - 90);
        from = toIsoDate(start);
        to = toIsoDate(end);
      } else if (preset === "last180") {
        start.setDate(1);
        start.setMonth(now.getMonth() - 5);
        from = toIsoDate(start);
        to = toIsoDate(end);
      } else if (preset === "year") {
        from = now.getFullYear() + "-01-01";
        to = toIsoDate(end);
      } else if (preset === "all") {
        from = "";
        to = "";
      } else if (preset === "custom") {
        renderModuleByPrefix(prefix);
        return;
      }

      setModulePeriod(prefix, from, to);
      renderModuleByPrefix(prefix);
    }

    function markModuleCustomPeriod(prefix) {
      const ids = modulePeriodIds(prefix);
      if (q(ids.preset)) q(ids.preset).value = "custom";
    }

    function resetModulePeriod(prefix) {
      const ids = modulePeriodIds(prefix);
      const fallback = prefix === "report" ? "last90" : prefix === "entity" ? "last180" : "last30";
      if (q(ids.preset)) q(ids.preset).value = fallback;
      applyModulePeriodPreset(prefix, fallback);
    }

    function resetEntityFilters() {
      if (q("entityPeriodPreset")) q("entityPeriodPreset").value = "last180";
      ["entityGuardFilter", "entityTypeFilter", "entityControlTypeFilter", "entityCategoryFilter", "entityResultFilter"].forEach(id => {
        if (q(id)) q(id).value = "toate";
      });
      if (q("entitySearch")) q("entitySearch").value = "";
      selectedEntityHistoryYear = "";
      entityTimelineKey = "";
      entityLatestLimit = 5;
      applyModulePeriodPreset("entity", "last180");
    }

    function renderModuleByPrefix(prefix) {
      if (prefix === "inspector") renderInspectorsView();
      if (prefix === "petition") renderPetitionsView();
      if (prefix === "entity") renderEntitiesView();
      if (prefix === "report") renderReportView();
    }

    function getModulePeriodControls(prefix, baseArr = filteredControls) {
      const ids = modulePeriodIds(prefix);
      let arr = [...baseArr];
      const from = safeValue(ids.from, "");
      const to = safeValue(ids.to, "");
      if (from) arr = arr.filter(c => new Date(c.created_at) >= new Date(from));
      if (to) arr = arr.filter(c => new Date(c.created_at) <= new Date(to + "T23:59:59"));
      return arr;
    }

    function getModulePeriodLabel(prefix) {
      const ids = modulePeriodIds(prefix);
      const preset = safeValue(ids.preset, "last30");
      const from = safeValue(ids.from, "");
      const to = safeValue(ids.to, "");
      if (preset === "last30") return "ultima luna";
      if (preset === "last90") return "ultimele 3 luni";
      if (preset === "last180") return "ultimele 6 luni";
      if (preset === "year") return "anul curent";
      if (preset === "all") return "toata perioada";
      if (from && to) return from + " - " + to;
      if (from) return "de la " + from;
      if (to) return "pana la " + to;
      return "perioada selectata";
    }

    function ensureModulePeriodDefaults() {
      ["inspector", "petition", "entity", "report"].forEach(prefix => {
        const ids = modulePeriodIds(prefix);
        if (q(ids.preset) && q(ids.from) && q(ids.to) && !q(ids.from).value && !q(ids.to).value) {
          const now = new Date();
          const start = new Date(now);
          const preset = q(ids.preset).value || "last30";
          if (preset === "last30") {
            start.setDate(now.getDate() - 30);
            setModulePeriod(prefix, toIsoDate(start), toIsoDate(now));
          } else if (preset === "last90") {
            start.setDate(now.getDate() - 90);
            setModulePeriod(prefix, toIsoDate(start), toIsoDate(now));
          } else if (preset === "last180") {
            start.setDate(1);
            start.setMonth(now.getMonth() - 5);
            setModulePeriod(prefix, toIsoDate(start), toIsoDate(now));
          } else if (preset === "year") {
            setModulePeriod(prefix, now.getFullYear() + "-01-01", toIsoDate(now));
          }
        }
      });
    }

    function renderPetitionsView() { renderPetitionSearch(false); renderPetitionersView(); }
    function renderPetitionSearch(showEmpty = true) {
      const nr = normalizeText(safeValue("petitionNumberSearch", ""));
      if (!nr) { if (showEmpty) setHtml("petitionPublicResult", `<div class="empty">Introdu numarul sesizarii pentru verificare.</div>`); return; }
      const found = allControls.filter(isPetition).find(c => normalizeText(getPetitionNumber(c)) === nr);
      if (!found) return setHtml("petitionPublicResult", `<div class="empty">Nu am gasit nicio sesizare cu acest numar in datele incarcate.</div>`);
      const privateLine = isInternalMode && getPetitionerName(found) ? `<p><b>Petitionar:</b> ${escapeHtml(getPetitionerName(found))}</p>` : "";
      const confirmation = getPetitionConfirmation(found);
      const responseDays = getPetitionResponseDays(found);
      const hasReport = getControlHasReport(found);
      const registeredDate = getPetitionRegisteredDate(found);
      const controlDate = getControlDateValue(found);
      const subject = getPetitionSubject(found) || "Obiectul sesizarii nu este completat separat in fisa controlului.";
      const findingFallback = confirmation.className === "confirmed"
        ? "Controlul a confirmat aspectele sesizate si a consemnat probleme in teren."
        : confirmation.className === "partial"
          ? "Controlul a confirmat partial aspectele sesizate sau a dispus remediere."
          : confirmation.className === "rejected"
            ? "Controlul nu a confirmat aspectele sesizate, conform rezultatului inregistrat."
            : "Sesizarea este in analiza sau nu are inca rezultat final public.";
      const finding = getPetitionFinding(found) || findingFallback;
      const measures = getPetitionMeasures(found) || (confirmation.className === "confirmed" || confirmation.className === "partial"
        ? "Masurile detaliate se comunica potrivit procedurii administrative."
        : "Nu exista masuri publice suplimentare completate.");
      setHtml("petitionPublicResult", `
        <article class="petition-public-card">
          <div class="petition-public-head">
            <div>
              <span>Numar sesizare</span>
              <strong>${escapeHtml(getPetitionNumber(found) || "-")}</strong>
            </div>
            <b class="petition-confirmation ${confirmation.className}">${escapeHtml(confirmation.label)}</b>
          </div>
          <div class="petition-public-grid">
            <div><span>Data sesizare</span><b>${escapeHtml(registeredDate ? formatDay(registeredDate) : "-")}</b></div>
            <div><span>Data control</span><b>${escapeHtml(controlDate ? formatDay(controlDate) : "-")}</b></div>
            <div><span>Timp raspuns administrativ</span><b>${escapeHtml(formatDays(responseDays))}</b></div>
            <div><span>Rezultat control</span><b style="color:${colorByResult(found.result)}">${escapeHtml(resultLabel(found.result))}</b></div>
            <div><span>Garda</span><b>${escapeHtml(found.garda || "-")}</b></div>
            <div><span>Localitate</span><b>${escapeHtml(found.localitate || "-")}</b></div>
          </div>
          <div class="petition-response-card">
            <p>${escapeHtml(getPetitionResponseText(found))}</p>
            ${renderResponseTimeBar(responseDays, hasReport)}
          </div>
          ${privateLine ? `<div class="petition-private-line">${privateLine}</div>` : ""}
          <div class="petition-public-section">
            <h4>Ce a fost sesizat</h4>
            <p>${escapeHtml(subject)}</p>
          </div>
          <div class="petition-public-section">
            <h4>Constatarea controlului</h4>
            <p>${escapeHtml(finding)}</p>
          </div>
          <div class="petition-public-section">
            <h4>Masuri / concluzie</h4>
            <p>${escapeHtml(measures)}</p>
          </div>
          <button class="control-full-btn petition-detail-btn" type="button" data-control-id="${escapeAttr(found.id)}">Detalii sesizare</button>
        </article>
      `);
    }
    function renderPetitionersView() {
      renderPetitionKpis();
      let arr = getModulePeriodControls("petition").filter(isPetition);
      setText("petitionVisibleCount", arr.length + " petitii / sesizari afisate");
      const petitioner = safeValue("petitionerSearch", "").trim();
      if (isInternalMode && petitioner) arr = arr.filter(c => getPetitionerName(c) === petitioner);
      const responseStats = computePetitionResponseStats(arr);
      const confirmed = arr.filter(c => getPetitionConfirmation(c).className === "confirmed").length;
      const partial = arr.filter(c => getPetitionConfirmation(c).className === "partial").length;
      if (isInternalMode && petitioner) setText("petitionerSummary", `${petitioner}: ${arr.length} petitii / sesizari in ${getModulePeriodLabel("petition")}. Timp mediu raspuns administrativ: ${formatDays(responseStats.avg)}.`);
      else setText("petitionerSummary", `Total petitii / sesizari in ${getModulePeriodLabel("petition")}: ${arr.length}. Timp mediu raspuns administrativ: ${formatDays(responseStats.avg)}.`);
      if (q("petitionResponseStats")) {
        setHtml("petitionResponseStats", isInternalMode ? `
          <div><span>Timp mediu raspuns</span><strong>${escapeHtml(formatDays(responseStats.avg))}</strong><small>${responseStats.count} petitii / sesizari cu termen calculat</small></div>
          <div><span>Mediana raspuns</span><strong>${escapeHtml(formatDays(responseStats.median))}</strong><small>indicator robust</small></div>
          <div><span>Maxim raspuns</span><strong>${escapeHtml(formatDays(responseStats.max))}</strong><small>caz cel mai intarziat</small></div>
          <div><span>Confirmate</span><strong>${confirmed + partial}</strong><small>${confirmed} integral / ${partial} partial</small></div>
        ` : "");
      }
      if (isCollapseOpen("collapsePetitionStats")) {
        const byYear = countBy(arr, yearKey); const years = Object.keys(byYear).sort(); makeChart("chartPetitionsYears", "bar", years, years.map(y => byYear[y]));
        const byG = countBy(arr, c => c.garda); const g = topEntries(byG, 9); makeChart("chartPetitionsGarzi", "bar", g.map(x => gardaShortLabel(x[0])), g.map(x => x[1]));
        const byR = countBy(arr, c => resultLabel(c.result)); makeChart("chartPetitionsResults", "doughnut", Object.keys(byR), Object.values(byR), { colors: Object.keys(byR).map(label => colorByResult(normalizeResultLabelBack(label))) });
        if (isInternalMode && q("chartPetitionsResponse")) {
          const labels = Object.keys(responseStats.buckets);
          const responseValues = labels.map(label => responseStats.buckets[label]);
          makeChart("chartPetitionsResponse", "bar", labels, labels.map(label => responseStats.buckets[label]), {
            label: "Sesizari",
            colors: quantitativeColors(labels.map((_, index) => index), true)
          });
        }
      }
      renderPetitionTable(arr);
    }
    function renderPetitionTable(arr) {
      const sorted = [...arr].sort((a,b) => new Date(b.created_at)-new Date(a.created_at));
      const visible = sorted.slice(0, petitionHistoryLimit);
      const rows = visible.map(c => {
        const registered = getPetitionRegisteredDate(c);
        const responseDays = getPetitionResponseDays(c);
        const hasReport = getControlHasReport(c);
        const reportStatus = getPetitionReportStatus(c);
        const entityOrPlace = getEntityName(c) || c.reper || "-";
        return `<tr class="petition-history-row" data-control-id="${escapeAttr(c.id)}" tabindex="0">
          <td><b>${escapeHtml(getPetitionNumber(c) || "-")}</b><small>Control #${escapeHtml(c.id || "-")}</small></td>
          <td>${escapeHtml(registered ? formatDay(registered) : "-")}</td>
          <td>${escapeHtml(c.garda || "-")}</td>
          <td>${escapeHtml(c.localitate || "-")}</td>
          <td>${escapeHtml(entityOrPlace)}</td>
          <td><span class="status-badge ${statusClassForResult(c.result)}">${escapeHtml(resultLabel(c.result))}</span></td>
          <td>${renderResponseTimeBar(responseDays, hasReport)}</td>
          <td><span class="status-badge ${reportStatus.className === "done" ? "status-finalizat" : reportStatus.className === "late" ? "status-intarziat" : "status-fara-raport"}">${escapeHtml(reportStatus.label)}</span></td>
          <td>
            <div class="report-actions petition-actions">
              <button class="secondary petition-detail-btn" type="button" data-control-id="${escapeAttr(c.id)}">Detalii</button>
              <button class="secondary petition-map-btn" type="button" data-control-id="${escapeAttr(c.id)}"${controlMapButtonAttributes(c)}>Harta</button>
              ${isInternalMode && hasReport ? `<button class="control-report-open-pdf" type="button" data-control-id="${escapeAttr(c.id)}">Raport</button>` : ""}
            </div>
          </td>
        </tr>`;
      }).join("");
      const more = sorted.length > visible.length
        ? `<button type="button" class="gfn-more-btn petition-more-btn" onclick="showMorePetitions()">Afiseaza istoric extins (${sorted.length - visible.length})</button>`
        : "";
      setHtml("petitionHistory", `<table class="petition-history-table"><thead><tr><th>Numar sesizare</th><th>Data sesizarii</th><th>Garda</th><th>Localitate</th><th>Entitate / Reper</th><th>Rezultat</th><th>Timp raspuns</th><th>Raport</th><th>Actiune</th></tr></thead><tbody>${rows || `<tr><td colspan="9">Nu exista petitii / sesizari in filtrele active.</td></tr>`}</tbody></table>${more}`);
    }

    function getControlEntityName(control) { return getEntityName(control) || "-"; }
    function getControlDate(control) { return firstValue(control, ["field_submitted_at", "data_control", "created_at"]); }
    function getControlResult(control) { return firstValue(control, ["result", "rezultat"]) || "conform"; }
    function getControlFine(control) { return getFineAmount(control); }
    function getControlDamage(control) { return getDamageAmount(control); }
    function getControlFindings(control) { return firstValue(control, ["constatari", "constatari_publice"]) || getViolationText(control); }
    function getControlMeasures(control) { return getMeasuresText(control) || firstValue(control, ["masuri_publice", "concluzie"]); }
    function hasControlReport(control) { return getControlHasReport(control); }
    function isControlProblem(control) { return isProblemResult(getControlResult(control)); }
    function isControlPetition(control) { return isPetition(control); }

    function entityDateValue(control) {
      const value = getControlDate(control);
      const date = value ? new Date(value) : null;
      return date && !isNaN(date) ? date : new Date(0);
    }

    function computeEntityRisk(controls) {
      const total = controls.length;
      const problemCount = controls.filter(isControlProblem).length;
      const problemRate = total ? problemCount / total * 100 : 0;
      const penal = controls.some(c => getControlResult(c) === "sesizare_penala");
      const sanctions = controls.filter(c => ["sanctiune", "sesizare_penala"].includes(getControlResult(c)) || getControlFine(c) > 0).length;
      const warnings = controls.filter(c => getControlResult(c) === "avertisment").length;
      if (problemRate > 40 || penal || sanctions >= 2) {
        return { level: "high", label: "Risc ridicat", note: "indicator orientativ, calculat din controale si rezultate" };
      }
      if (problemRate >= 15 || warnings > 0 || sanctions > 0) {
        return { level: "medium", label: "Risc mediu", note: "indicator orientativ, necesita monitorizare" };
      }
      return { level: "low", label: "Risc scazut", note: "indicator orientativ, fara probleme semnificative in filtru" };
    }


    const ENTITY_MAP_METRICS = {
      entities: { label: "Entitati verificate", short: "entitati", format: v => String(Math.round(Number(v || 0))), risk: false },
      controlsPerEntity: { label: "Controale / entitate", short: "controale/entitate", format: v => Number(v || 0).toFixed(2), risk: false },
      problemEntityRate: { label: "Entitati cu probleme", short: "probleme %", format: v => formatPercent(v), risk: true },
      avgFinePerEntity: { label: "Amenda medie / entitate", short: "amenda medie", format: v => formatMoney(v), risk: true }
    };

    function buildEntityGuardStats(controls) {
      const stats = {};
      Object.keys(GUARD_DISPLAY_NAMES).forEach(key => {
        stats[key] = {
          garda: GUARD_DISPLAY_NAMES[key] || key,
          guard_key: key,
          controls: 0,
          fines: 0,
          entityKeys: new Set(),
          problemEntityKeys: new Set(),
          entities: 0,
          controlsPerEntity: 0,
          problemEntityRate: 0,
          avgFinePerEntity: 0
        };
      });

      (controls || []).forEach(control => {
        const entityName = getEntityName(control);
        if (!entityName) return;
        const rawGuard = control.garda || "Necunoscut";
        const key = canonicalGuardName(rawGuard) || normalizeText(rawGuard) || "necunoscut";
        if (!stats[key]) {
          stats[key] = {
            garda: guardDisplayName(rawGuard),
            guard_key: key,
            controls: 0,
            fines: 0,
            entityKeys: new Set(),
            problemEntityKeys: new Set(),
            entities: 0,
            controlsPerEntity: 0,
            problemEntityRate: 0,
            avgFinePerEntity: 0
          };
        }
        const entityKey = normalizeText(entityName);
        stats[key].controls += 1;
        stats[key].fines += getControlFine(control);
        stats[key].entityKeys.add(entityKey);
        if (isControlProblem(control)) stats[key].problemEntityKeys.add(entityKey);
      });

      Object.values(stats).forEach(item => {
        item.entities = item.entityKeys.size;
        item.controlsPerEntity = item.entities ? item.controls / item.entities : 0;
        item.problemEntityRate = item.entities ? (item.problemEntityKeys.size / item.entities) * 100 : 0;
        item.avgFinePerEntity = item.entities ? item.fines / item.entities : 0;
      });
      return stats;
    }

    function getEntityTopRows(groups, metricKey) {
      const rows = Object.values(groups || {}).map(item => {
        const controls = item.controls || [];
        const problems = controls.filter(isControlProblem).length;
        const fines = sumBy(controls, getControlFine);
        let value = controls.length;
        let label = "controale";
        let risk = false;
        if (metricKey === "problemEntityRate") {
          value = controls.length ? (problems / controls.length) * 100 : 0;
          label = "probleme %";
          risk = true;
        } else if (metricKey === "avgFinePerEntity") {
          value = fines;
          label = "amenzi";
          risk = true;
        } else if (metricKey === "controlsPerEntity") {
          value = controls.length;
          label = "controale";
        }
        return { name: item.name, controls, problems, fines, value, label, risk };
      });
      rows.sort((a, b) => Number(b.value || 0) - Number(a.value || 0) || String(a.name).localeCompare(String(b.name), "ro"));
      return rows;
    }

    function initEntityStatsMap() {
      if (entityStatsMap || !q("entityStatsMap")) return;
      entityStatsMap = L.map("entityStatsMap", {
        zoomControl: false,
        attributionControl: false,
        dragging: true,
        scrollWheelZoom: false
      }).setView([45.8, 24.9], 6);

      entityStatsMap.createPane("entityBasePane");
      entityStatsMap.getPane("entityBasePane").style.zIndex = 200;
      entityStatsMap.createPane("entityLabelsPane");
      entityStatsMap.getPane("entityLabelsPane").style.zIndex = 360;
      entityStatsMap.getPane("entityLabelsPane").style.pointerEvents = "none";
      entityStatsMap.createPane("entityStatsPane");
      entityStatsMap.getPane("entityStatsPane").style.zIndex = 430;

      entityStatsBaseLayer = L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
        attribution: "&copy; OpenStreetMap contributors &copy; CARTO",
        subdomains: "abcd",
        maxZoom: 20,
        pane: "entityBasePane"
      }).addTo(entityStatsMap);

      entityStatsLabelLayer = L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_only_labels/{z}/{x}/{y}{r}.png", {
        attribution: "&copy; OpenStreetMap contributors &copy; CARTO",
        subdomains: "abcd",
        maxZoom: 20,
        pane: "entityLabelsPane"
      }).addTo(entityStatsMap);

      L.control.zoom({ position: "topright" }).addTo(entityStatsMap);
    }

    function renderEntityRanking(groups, metricKey) {
      const rows = getEntityTopRows(groups, metricKey).slice(0, 8);
      const metric = ENTITY_MAP_METRICS[metricKey] || ENTITY_MAP_METRICS.entities;
      const list = q("entityRankingList");
      if (!list) return;
      if (!rows.length) {
        list.innerHTML = `<div class="empty">Nu exista entitati pe filtrele selectate.</div>`;
        return;
      }
      const range = getQuantitativeRange(rows.map(row => Number(row.value || 0)));
      list.innerHTML = rows.map((row, index) => {
        const color = quantitativeColor(row.value, range.min, range.max, Boolean(row.risk));
        const displayValue = metricKey === "problemEntityRate"
          ? formatPercent(row.value)
          : metricKey === "avgFinePerEntity"
            ? formatMoney(row.value)
            : String(Math.round(row.value || 0));
        return `<button type="button" class="entity-rank-row" data-entity="${escapeAttr(row.name)}" style="--entity-rank-color:${color}">
          <span class="entity-rank-index">#${index + 1}</span>
          <span class="entity-rank-name">${escapeHtml(row.name)}</span>
          <strong class="entity-rank-value">${escapeHtml(displayValue)}</strong>
        </button>`;
      }).join("");
    }

    function renderEntityTopChart(groups, metricKey) {
      const rows = getEntityTopRows(groups, metricKey).slice(0, 5);
      const values = rows.map(row => Number(row.value || 0));
      const labels = rows.map(row => row.name);
      const metric = ENTITY_MAP_METRICS[metricKey] || ENTITY_MAP_METRICS.entities;
      const risk = metricKey === "problemEntityRate";
      const displayValues = metricKey === "avgFinePerEntity" ? values.map(v => Math.round(v)) : values.map(v => Number(v.toFixed(2)));
      setText("entityMetricLabel", metricKey === "entities" ? "controale" : metric.short);
      makeChart("chartEntitiesTop", "bar", labels.map(name => name.length > 18 ? name.slice(0, 18) + "…" : name), displayValues, {
        label: metricKey === "avgFinePerEntity" ? "lei" : metric.short,
        colors: quantitativeColors(displayValues, risk),
        tooltipLabels: labels
      });
    }

    function renderEntityStatsMap(baseControls = null, globalStats = null) {
      if (currentView !== "entities") return;
      const controls = baseControls || getEntityBaseControls();
      const stats = globalStats || buildEntityStats(controls, "");
      const byGuard = buildEntityGuardStats(controls);
      const metricKey = safeValue("entityMapMetric", "entities");
      const metric = ENTITY_MAP_METRICS[metricKey] || ENTITY_MAP_METRICS.entities;

      setText("entityMapEntities", stats.totalEntities);
      setText("entityMapControlsAvg", stats.totalEntities ? (stats.globalControlCount / stats.totalEntities).toFixed(2) : "0.00");
      setText("entityMapProblemRate", formatPercent(stats.totalEntities ? (stats.problemEntities.length / stats.totalEntities) * 100 : 0));
      setText("entityMapFineAvg", formatMoney(stats.totalEntities ? sumBy(stats.allControls, getControlFine) / stats.totalEntities : 0));
      renderEntityTopChart(stats.groups, metricKey);
      renderEntityRanking(stats.groups, metricKey);

      if (!q("entityStatsMap")) return;
      initEntityStatsMap();
      if (!entityStatsMap || !guardStatsGeoJson) {
        setHtml("entityMapLegend", `<div class="empty">Harta statistica nu este disponibila.</div>`);
        return;
      }

      const lookup = buildGuardStatsLookup(byGuard);
      const values = Object.values(byGuard)
        .filter(item => item.entities > 0)
        .map(item => Number(item[metricKey] || 0));
      const range = getQuantitativeRange(values);
      const min = range.min;
      const max = range.max;

      if (entityStatsLayer) entityStatsMap.removeLayer(entityStatsLayer);

      entityStatsLayer = L.geoJSON(guardStatsGeoJson, {
        pane: "entityStatsPane",
        style: feature => {
          const item = getGuardStatForFeature(feature, byGuard, lookup);
          const value = item ? Number(item[metricKey] || 0) : 0;
          const fill = quantitativeColor(value, min, max, Boolean(metric.risk));
          return {
            color: value ? "rgba(230,255,248,1)" : "rgba(148,213,190,.34)",
            weight: value ? 2.05 : 1.0,
            opacity: 1,
            fillColor: fill,
            fillOpacity: value ? .82 : .14,
            className: "garda-boundary"
          };
        },
        onEachFeature: (feature, layer) => {
          const name = getGuardNameFromFeature(feature);
          const item = getGuardStatForFeature(feature, byGuard, lookup) || {
            entities: 0, controls: 0, controlsPerEntity: 0, problemEntityRate: 0, avgFinePerEntity: 0, fines: 0
          };
          const metricValue = Number(item[metricKey] || 0);
          const html = `<div class="guard-stat-tooltip">
            <div class="guard-stat-tooltip-title">${escapeHtml(name)}</div>
            <div class="guard-stat-tooltip-row"><span>${escapeHtml(metric.label)}</span><span>${escapeHtml(metric.format(metricValue))}</span></div>
            <div class="guard-stat-tooltip-row"><span>Entitati verificate</span><span>${item.entities || 0}</span></div>
            <div class="guard-stat-tooltip-row"><span>Total controale</span><span>${item.controls || 0}</span></div>
            <div class="guard-stat-tooltip-row"><span>Controale / entitate</span><span>${Number(item.controlsPerEntity || 0).toFixed(2)}</span></div>
            <div class="guard-stat-tooltip-row"><span>Entitati cu probleme</span><span>${formatPercent(item.problemEntityRate || 0)}</span></div>
            <div class="guard-stat-tooltip-row"><span>Amenda medie / entitate</span><span>${escapeHtml(formatMoney(item.avgFinePerEntity || 0))}</span></div>
          </div>`;
          layer.bindTooltip(html, { sticky: true, direction: "auto", opacity: .96, className: "leaflet-popup-content-wrapper" });
          layer.on("mouseover", () => layer.setStyle({ weight: 2.2, color: "#ffffff", fillOpacity: .9 }));
          layer.on("mouseout", () => entityStatsLayer && entityStatsLayer.resetStyle(layer));
        }
      }).addTo(entityStatsMap);

      try { entityStatsMap.fitBounds(entityStatsLayer.getBounds(), { padding: [18, 18] }); } catch {}

      const legend = q("entityMapLegend");
      if (legend) {
        const colors = metric.risk ? [...QUANTITATIVE_PALETTE].reverse() : [...QUANTITATIVE_PALETTE];
        legend.innerHTML = `<div class="entity-stat-legend-title">${escapeHtml(metric.label)}</div>
          <div class="entity-stat-gradient" style="background:linear-gradient(90deg,${colors.join(",")})"></div>
          <div class="entity-stat-legend-range"><span>${escapeHtml(metric.format(min))}</span><span>${escapeHtml(metric.format(max))}</span></div>`;
      }
      setTimeout(() => entityStatsMap.invalidateSize(), 120);
    }

    function renderEntityMainCharts(stats) {
      const monthSets = {};
      (stats.allControls || []).forEach(control => {
        const key = monthKey(control);
        if (!monthSets[key]) monthSets[key] = new Set();
        const entityName = getEntityName(control);
        if (entityName) monthSets[key].add(normalizeText(entityName));
      });
      const months = Object.keys(monthSets).sort();
      makeChart("chartEntitiesMonthly", "line", months.map(monthLabel), months.map(key => monthSets[key].size), { label: "Entitati verificate" });

      const typeGroups = {};
      (stats.allControls || []).forEach(control => {
        const type = getEntityTypeLabel(control);
        if (!typeGroups[type]) typeGroups[type] = { entities: new Set(), problemEntities: new Set() };
        const entityKey = normalizeText(getEntityName(control));
        if (!entityKey) return;
        typeGroups[type].entities.add(entityKey);
        if (isControlProblem(control)) typeGroups[type].problemEntities.add(entityKey);
      });
      const rows = Object.entries(typeGroups).map(([label, group]) => ({
        label,
        value: group.entities.size ? (group.problemEntities.size / group.entities.size) * 100 : 0
      })).sort((a, b) => b.value - a.value).slice(0, 8);
      const values = rows.map(row => Number(row.value.toFixed(1)));
      makeChart("chartEntityTypes", "bar", rows.map(row => row.label), values, {
        label: "Probleme %",
        metricKey: "problemRate"
      });
    }

    function renderEntityAdvancedStatistics(stats) {
      if (!q("chartEntitiesResults")) return;
      const controls = stats.hasSelection ? stats.displayControls : stats.allControls;
      const byR = countBy(controls, c => resultLabel(getControlResult(c)));
      makeChart("chartEntitiesResults", "doughnut", Object.keys(byR), Object.values(byR), {
        colors: Object.keys(byR).map(label => colorByResult(normalizeResultLabelBack(label)))
      });

      const fineByMonth = entityMonthlyMoney(controls, getControlFine);
      const fineMonths = Object.keys(fineByMonth).sort();
      const fineValues = fineMonths.map(month => Math.round(fineByMonth[month] || 0));
      makeChart("chartEntityFines", "bar", fineMonths.map(monthLabel), fineValues, {
        label: "lei",
        metricKey: "fines"
      });

      const damageByMonth = entityMonthlyMoney(controls, getControlDamage);
      const damageMonths = Object.keys(damageByMonth).sort();
      const damageValues = damageMonths.map(month => Math.round(damageByMonth[month] || 0));
      makeChart("chartEntityDamage", "bar", damageMonths.map(monthLabel), damageValues, {
        label: "lei",
        metricKey: "damage"
      });

      const reportStatus = countBy(controls, c => hasControlReport(c) ? "Raport incarcat" : "Fara raport");
      makeChart("chartEntityReports", "doughnut", Object.keys(reportStatus), Object.values(reportStatus), {
        colors: [chartColors.green, chartColors.amber]
      });
    }

    function renderEntityYearHistory(controls, stats) {
      const tabs = q("entityYearTabs");
      const container = q("entityTimeline");
      if (!tabs || !container) return;
      if (!stats.hasSelection) {
        tabs.innerHTML = "";
        container.innerHTML = `<div class="entity-empty-state compact">Selecteaza o entitate pentru istoricul complet.</div>`;
        return;
      }

      const byYear = {};
      (controls || []).forEach(control => {
        const date = new Date(getControlDate(control));
        const year = Number.isFinite(date.getTime()) ? String(date.getFullYear()) : "Fara data";
        if (!byYear[year]) byYear[year] = [];
        byYear[year].push(control);
      });
      const years = Object.keys(byYear).sort((a, b) => Number(b) - Number(a));
      if (!years.length) {
        tabs.innerHTML = "";
        container.innerHTML = `<div class="entity-empty-state compact">Nu exista controale in istoricul entitatii.</div>`;
        return;
      }
      if (!selectedEntityHistoryYear || !byYear[selectedEntityHistoryYear]) selectedEntityHistoryYear = years[0];

      tabs.innerHTML = years.map(year => {
        const rows = byYear[year];
        const problems = rows.filter(isControlProblem).length;
        const rate = rows.length ? (problems / rows.length) * 100 : 0;
        const tone = quantitativeColor(rate, 0, 100, true);
        return `<button type="button" class="entity-year-tab ${year === selectedEntityHistoryYear ? "active" : ""}" data-year="${escapeAttr(year)}" style="--entity-year-color:${tone}">
          <strong>${escapeHtml(year)}</strong>
          <span>${rows.length} ${rows.length === 1 ? "control" : "controale"}</span>
          <em>${problems} cu probleme</em>
        </button>`;
      }).join("");

      const rows = [...byYear[selectedEntityHistoryYear]].sort((a, b) => entityDateValue(b) - entityDateValue(a));
      container.innerHTML = rows.map(control => {
        const result = getControlResult(control);
        const tone = entityResultTone(result);
        const type = control.control_type || control.tip_control || "Control";
        const category = getControlCategory(control) || getControlCategoryRaw(control) || "-";
        const guard = guardDisplayName(control.garda) || "-";
        const locality = control.localitate || "-";
        const fine = getControlFine(control);
        const fineMissing = fine === null || fine === undefined || fine === "";
        return `<article class="entity-history-control entity-row-${tone}" data-control-id="${escapeAttr(control.id)}" role="button" tabindex="0" style="--entity-row-color:${colorByResult(result)}">
          <div class="entity-history-accent"></div>
          <div class="entity-history-cell entity-history-date" data-label="Data / ID">
            <strong>${escapeHtml(formatDay(getControlDate(control)))}</strong>
            <span>Control #${escapeHtml(control.id || "-")}</span>
          </div>
          <div class="entity-history-cell entity-history-result" data-label="Rezultat">
            <span class="entity-result-chip entity-result-${tone}" style="--entity-result-color:${colorByResult(result)}">${escapeHtml(resultLabel(result))}</span>
          </div>
          <div class="entity-history-cell entity-history-type" data-label="Tip control">
            <strong>${escapeHtml(type)}</strong><small title="${escapeAttr(category)}">${escapeHtml(category)}</small>
          </div>
          <div class="entity-history-cell entity-history-place" data-label="Garda / Localitate">
            <strong title="${escapeAttr(guard)}">${escapeHtml(guard)}</strong><small title="${escapeAttr(locality)}">${escapeHtml(locality)}</small>
          </div>
          <div class="entity-history-cell entity-history-money ${fineMissing ? "is-missing" : ""}" data-label="Amenda"><strong>${escapeHtml(formatMoney(fine))}</strong></div>
          <div class="entity-history-cell entity-history-report" data-label="Raport">${entityReportBadge(control)}</div>
          <div class="entity-history-cell entity-history-open" data-label="Fisa"><span>Deschide fisa</span><b aria-hidden="true">›</b></div>
        </article>`;
      }).join("");
    }

    function buildEntityGroups(controls) {
      const groups = {};
      controls.forEach(control => {
        const name = getControlEntityName(control);
        if (!name || name === "-") return;
        const key = normalizeText(name);
        if (!groups[key]) groups[key] = { name, controls: [] };
        groups[key].controls.push(control);
      });
      return groups;
    }

    function buildEntityStats(controls, selectedEntity = "") {
      const arr = [...(controls || [])].filter(c => getControlEntityName(c) && getControlEntityName(c) !== "-")
        .sort((a, b) => entityDateValue(b) - entityDateValue(a));
      const groups = buildEntityGroups(arr);
      const groupRows = Object.values(groups);
      const selectedNorm = normalizeText(selectedEntity);
      const exactGroup = selectedNorm ? groupRows.find(item => normalizeText(item.name) === selectedNorm) : null;
      const selectedControls = exactGroup ? [...exactGroup.controls].sort((a, b) => entityDateValue(b) - entityDateValue(a)) : arr;
      const hasSelection = Boolean(exactGroup);
      const entityControls = selectedControls;
      const problemControls = entityControls.filter(isControlProblem);
      const sanctions = entityControls.filter(c => ["sanctiune", "sesizare_penala"].includes(getControlResult(c)) || getControlFine(c) > 0);
      const petitions = entityControls.filter(isControlPetition);
      const firstControl = [...entityControls].sort((a, b) => entityDateValue(a) - entityDateValue(b))[0] || null;
      const lastControl = entityControls[0] || null;
      const fines = sumBy(entityControls, getControlFine);
      const damage = sumBy(entityControls, getControlDamage);
      const repeatedEntities = groupRows.filter(item => item.controls.length > 1);
      const problemEntities = groupRows.filter(item => item.controls.some(isControlProblem));
      const sanctionedControls = arr.filter(c => ["sanctiune", "sesizare_penala"].includes(getControlResult(c)) || getControlFine(c) > 0);
      const petitionEntities = groupRows.filter(item => item.controls.some(isControlPetition));
      const risk = computeEntityRisk(entityControls);
      const guards = [...new Set(entityControls.map(c => guardDisplayName(c.garda)).filter(Boolean))];
      const localities = [...new Set(entityControls.map(c => c.localitate).filter(Boolean))];
      const types = [...new Set(entityControls.map(getEntityTypeLabel).filter(Boolean))];
      const cui = firstValue(lastControl || firstControl || {}, ["cui", "CUI", "cod_fiscal"]);
      return {
        allControls: arr,
        groups,
        groupRows,
        hasSelection,
        selectedEntity: exactGroup ? exactGroup.name : selectedEntity,
        displayControls: entityControls,
        totalEntities: groupRows.length,
        totalControls: entityControls.length,
        globalControlCount: arr.length,
        problemControls,
        sanctions,
        petitions,
        firstControl,
        lastControl,
        fines,
        damage,
        repeatedEntities,
        problemEntities,
        sanctionedControls,
        petitionEntities,
        risk,
        guards,
        localities,
        types,
        cui
      };
    }

    function entityKpiCard(icon, label, value, note, tone = "normal") {
      return `<div class="entity-kpi-card ${tone}">
        <span>${escapeHtml(icon)}</span>
        <div>
          <small>${escapeHtml(label)}</small>
          <strong>${escapeHtml(value)}</strong>
          <em>${escapeHtml(note || "")}</em>
        </div>
      </div>`;
    }

    function renderEntityKpiCards(stats) {
      if (stats.hasSelection) {
        setHtml("entityKpiGrid", [
          entityKpiCard("CTR", "Total controale", stats.totalControls, "istoric entitate"),
          entityKpiCard("CAL", "Ultimul control", stats.lastControl ? formatDay(getControlDate(stats.lastControl)) : "-", "cea mai recenta verificare", "info"),
          entityKpiCard("!", "Controale cu probleme", stats.problemControls.length, "neconform / masuri", stats.problemControls.length ? "warn" : "good"),
          entityKpiCard("LEI", "Amenzi totale", formatMoney(stats.fines), "cumul entitate", stats.fines ? "warn" : "normal")
        ].join(""));
        setHtml("entitySecondaryKpis", [
          entityKpiCard("SAN", "Sanctiuni aplicate", stats.sanctions.length, "sanctiuni / sesizari penale", stats.sanctions.length ? "danger" : "good"),
          entityKpiCard("PREJ", "Prejudiciu total", formatMoney(stats.damage), "valoare estimata", stats.damage ? "danger" : "normal"),
          entityKpiCard("SES", "Sesizari asociate", stats.petitions.length, "controale pornite din sesizari", stats.petitions.length ? "info" : "normal"),
          entityKpiCard("RISC", "Risc operational", stats.risk.label, stats.risk.note, stats.risk.level === "high" ? "danger" : stats.risk.level === "medium" ? "warn" : "good")
        ].join(""));
        return;
      }
      setHtml("entityKpiGrid", [
        entityKpiCard("ENT", "Entitati controlate", stats.totalEntities, getModulePeriodLabel("entity")),
        entityKpiCard("CTR", "Total controale", stats.globalControlCount, "controale cu entitate"),
        entityKpiCard("!", "Entitati cu probleme", stats.problemEntities.length, "au cel putin un control problematic", stats.problemEntities.length ? "warn" : "good"),
        entityKpiCard("LEI", "Amenzi totale", formatMoney(sumBy(stats.allControls, getControlFine)), "cumul pe entitati", "warn")
      ].join(""));
      setHtml("entitySecondaryKpis", [
        entityKpiCard("SAN", "Controale cu sanctiuni", stats.sanctionedControls.length, "sanctiune / sesizare penala", stats.sanctionedControls.length ? "danger" : "normal"),
        entityKpiCard("PREJ", "Prejudiciu total", formatMoney(sumBy(stats.allControls, getControlDamage)), "valoare estimata", "danger"),
        entityKpiCard("REP", "Entitati repetate", stats.repeatedEntities.length, "mai mult de un control", "info"),
        entityKpiCard("SES", "Entitati cu sesizari", stats.petitionEntities.length, "au sesizari asociate", "info")
      ].join(""));
    }

    function renderEntityExecutiveSummary(stats) {
      if (!stats.totalControls && !stats.globalControlCount) {
        setHtml("entityExecutiveSummary", `<div class="entity-empty-state">Nu exista controale pe entitati in perioada selectata.</div>`);
        return;
      }
      if (stats.hasSelection) {
        const problemRate = stats.totalControls ? Math.round(stats.problemControls.length / stats.totalControls * 100) : 0;
        const conclusion = `Entitatea are ${stats.totalControls} controale, dintre care ${stats.problemControls.length} cu probleme, ${stats.sanctions.length} sanctiuni aplicate si ${stats.petitions.length} sesizari asociate. Riscul operational estimat este ${stats.risk.label.toLowerCase()}.`;
        setHtml("entityExecutiveSummary", `
          <div class="entity-card-head entity-card-head-tight">
            <span>Rezumat entitate</span>
            <b class="entity-risk-badge ${stats.risk.level}">${escapeHtml(stats.risk.label)}</b>
          </div>
          <div class="entity-exec-layout selected">
            <div class="entity-exec-main">
              <h3>${escapeHtml(stats.selectedEntity || "-")}</h3>
              <p>${escapeHtml(conclusion)}</p>
              <small>Indicatorul de risc este orientativ si nu reprezinta un verdict juridic.</small>
            </div>
            <div class="entity-exec-metrics">
              <div><span>Controale</span><b>${stats.totalControls}</b></div>
              <div><span>Probleme</span><b>${stats.problemControls.length}</b></div>
              <div><span>Rata probleme</span><b>${problemRate}%</b></div>
              <div><span>Amenzi</span><b>${escapeHtml(formatMoney(stats.fines))}</b></div>
            </div>
          </div>
          <div class="entity-summary-grid compact">
            <div><span>Tip entitate</span><b>${escapeHtml(stats.types[0] || "-")}</b></div>
            ${isInternalMode ? `<div><span>CUI</span><b>${escapeHtml(stats.cui || "-")}</b></div>` : ""}
            <div><span>Garzi</span><b>${escapeHtml(stats.guards.join(", ") || "-")}</b></div>
            <div><span>Prima verificare</span><b>${escapeHtml(stats.firstControl ? formatDay(getControlDate(stats.firstControl)) : "-")}</b></div>
            <div><span>Ultima verificare</span><b>${escapeHtml(stats.lastControl ? formatDay(getControlDate(stats.lastControl)) : "-")}</b></div>
            <div><span>Prejudiciu</span><b>${escapeHtml(formatMoney(stats.damage))}</b></div>
          </div>
        `);
        return;
      }
      const fines = sumBy(stats.allControls, getControlFine);
      const damage = sumBy(stats.allControls, getControlDamage);
      const problemRate = stats.globalControlCount ? Math.round(stats.problemEntities.length / Math.max(stats.totalEntities, 1) * 100) : 0;
      const topRepeated = [...stats.repeatedEntities].sort((a, b) => b.controls.length - a.controls.length)[0];
      const topProblem = [...stats.problemEntities].sort((a, b) => b.controls.filter(isControlProblem).length - a.controls.filter(isControlProblem).length)[0];
      setHtml("entityExecutiveSummary", `
        <div class="entity-card-head entity-card-head-tight">
          <span>Rezumat general</span>
          <b class="entity-risk-badge info">Sinteza</b>
        </div>
        <div class="entity-exec-layout">
          <div class="entity-exec-main">
            <h3>Portofoliu entitati controlate</h3>
            <p>In ${escapeHtml(getModulePeriodLabel("entity"))} au fost controlate ${stats.totalEntities} entitati, cu ${stats.globalControlCount} controale, ${stats.sanctionedControls.length} controale cu sanctiuni si prejudicii totale de ${escapeHtml(formatMoney(damage))}. Amenzile totale inregistrate sunt ${escapeHtml(formatMoney(fines))}.</p>
            <small>Selecteaza o entitate pentru dosarul operational complet.</small>
          </div>
          <div class="entity-exec-metrics">
            <div><span>Entitati</span><b>${stats.totalEntities}</b></div>
            <div><span>Controale</span><b>${stats.globalControlCount}</b></div>
            <div><span>Entitati cu probleme</span><b>${stats.problemEntities.length}</b></div>
            <div><span>Rata risc</span><b>${problemRate}%</b></div>
          </div>
        </div>
        <div class="entity-summary-grid compact">
          <div><span>Entitate cu controale repetate</span><b>${escapeHtml(topRepeated ? `${topRepeated.name} (${topRepeated.controls.length})` : "-")}</b></div>
          <div><span>Entitate cu probleme</span><b>${escapeHtml(topProblem ? `${topProblem.name} (${topProblem.controls.filter(isControlProblem).length})` : "-")}</b></div>
          <div><span>Sesizari asociate</span><b>${stats.petitionEntities.length}</b></div>
          <div><span>Amenzi totale</span><b>${escapeHtml(formatMoney(fines))}</b></div>
        </div>
      `);
    }

    function renderEntityProfile(stats) {
      if (!stats.hasSelection) {
        const topRepeated = [...stats.repeatedEntities].sort((a, b) => b.controls.length - a.controls.length)[0];
        const topSanctioned = [...stats.groupRows].sort((a, b) => b.controls.filter(c => getControlFine(c) > 0 || ["sanctiune", "sesizare_penala"].includes(getControlResult(c))).length - a.controls.filter(c => getControlFine(c) > 0 || ["sanctiune", "sesizare_penala"].includes(getControlResult(c))).length)[0];
        setHtml("entityProfileCard", `
          <div class="entity-card-head entity-card-head-tight"><span>Repere rapide</span><b class="entity-risk-badge info">General</b></div>
          <div class="entity-profile-list compact-profile">
            <div><span>Entitati in filtru</span><b>${stats.totalEntities}</b></div>
            <div><span>Controale pe entitati</span><b>${stats.globalControlCount}</b></div>
            <div><span>Controale repetate</span><b>${stats.repeatedEntities.length}</b></div>
            <div><span>Cu sesizari</span><b>${stats.petitionEntities.length}</b></div>
            <div><span>Top repetitivitate</span><b>${escapeHtml(topRepeated ? topRepeated.name : "-")}</b></div>
            <div><span>Top sanctiuni</span><b>${escapeHtml(topSanctioned ? topSanctioned.name : "-")}</b></div>
          </div>
        `);
        return;
      }
      const note = stats.risk.level === "high"
        ? "Necesita monitorizare operationala mai atenta."
        : stats.risk.level === "medium"
          ? "Exista semnale care merita urmarite in controalele viitoare."
          : "Nu sunt semnale operationale majore in perioada analizata.";
      setHtml("entityProfileCard", `
        <div class="entity-card-head entity-card-head-tight"><span>Profil entitate</span><b class="entity-risk-badge ${stats.risk.level}">${escapeHtml(stats.risk.label)}</b></div>
        <div class="entity-profile-list compact-profile">
          <div><span>Nume entitate</span><b>${escapeHtml(stats.selectedEntity || "-")}</b></div>
          <div><span>Tip entitate</span><b>${escapeHtml(stats.types[0] || "-")}</b></div>
          ${isInternalMode ? `<div><span>CUI</span><b>${escapeHtml(stats.cui || "-")}</b></div>` : ""}
          <div><span>Localitate principala</span><b>${escapeHtml(stats.localities[0] || "-")}</b></div>
          <div><span>Garzi asociate</span><b>${escapeHtml(stats.guards.join(", ") || "-")}</b></div>
          <div><span>Prima / ultima verificare</span><b>${escapeHtml(stats.firstControl ? formatDay(getControlDate(stats.firstControl)) : "-")} / ${escapeHtml(stats.lastControl ? formatDay(getControlDate(stats.lastControl)) : "-")}</b></div>
        </div>
        <p>${escapeHtml(note)}</p>
      `);
    }

    function entityReportBadge(control) {
      const uploaded = hasControlReport(control);
      const cls = uploaded ? "done" : reportStatusClass(control);
      const label = uploaded ? "Disponibil" : reportStatusLabel(control);
      return `<span class="entity-report-badge ${cls}">${escapeHtml(label)}</span>`;
    }

    function entityControlActionButtons(control) {
      const hasReport = hasControlReport(control);
      return `<div class="entity-action-row compact">
        <button class="inline-action-btn entity-action-detail quick-control-sheet-btn" type="button" data-control-id="${escapeAttr(control.id)}">Detalii</button>
        <button class="inline-action-btn entity-action-map control-full-center" type="button" data-control-id="${escapeAttr(control.id)}"${controlMapButtonAttributes(control)}>Harta</button>
        ${isInternalMode && hasReport ? `<button class="inline-action-btn entity-action-report control-report-open-pdf" type="button" data-control-id="${escapeAttr(control.id)}">Raport</button>` : ""}
      </div>`;
    }

    function entityResultTone(result) {
      const r = normalizeText(result).replace(/\s+/g, "_");
      if (r.includes("sesizare_penala")) return "penal";
      if (r.includes("sanctiune")) return "sanction";
      if (r.includes("neconform")) return "bad";
      if (r.includes("avertisment")) return "warn";
      if (r.includes("conform")) return "good";
      return "neutral";
    }

    function renderEntityLatestControls(controls) {
      const sorted = [...controls].sort((a, b) => entityDateValue(b) - entityDateValue(a));
      const list = sorted.slice(0, entityLatestLimit);
      const rows = list.map(control => {
        const result = getControlResult(control);
        const tone = entityResultTone(result);
        const category = getControlCategory(control) || getControlCategoryRaw(control) || "-";
        const type = control.control_type || control.tip_control || "-";
        const fine = formatMoney(getControlFine(control));
        const damage = formatMoney(getControlDamage(control));
        return `<article class="entity-control-row entity-row-${tone}" data-control-id="${escapeAttr(control.id)}" role="button" tabindex="0" style="--entity-row-color:${colorByResult(result)};">
          <div class="entity-row-accent"></div>
          <div class="entity-row-date">
            <strong>${escapeHtml(formatDay(getControlDate(control)))}</strong>
            <span>#${escapeHtml(control.id || "-")}</span>
          </div>
          <div class="entity-row-main">
            <div class="entity-row-top">
              <div class="entity-row-title-wrap">
                <span class="entity-result-chip entity-result-${tone}" style="--entity-result-color:${colorByResult(result)};">${escapeHtml(resultLabel(result))}</span>
                <div class="entity-row-title">
                  <b>${escapeHtml(getControlEntityName(control))}</b>
                  <span>${escapeHtml([guardDisplayName(control.garda), control.localitate].filter(Boolean).join(" - ") || "-")}</span>
                </div>
              </div>
            </div>
            <div class="entity-row-meta">
              <span><em>Tip</em>${escapeHtml(type)}</span>
              <span><em>Categorie</em>${escapeHtml(category)}</span>
              <span><em>Amenda</em>${escapeHtml(fine)}</span>
              <span><em>Prejudiciu</em>${escapeHtml(damage)}</span>
            </div>
          </div>
          <div class="entity-row-actions">
            ${entityControlActionButtons(control)}
          </div>
        </article>`;
      }).join("");
      const more = sorted.length > list.length
        ? `<button type="button" class="gfn-more-btn entity-latest-more" onclick="showMoreEntityLatestControls()">Afiseaza mai multe controale (${sorted.length - list.length})</button>`
        : "";
      setHtml("entityLatestControls", `<div class="entity-control-list-modern">${rows || `<div class="entity-empty-state">Nu exista controale pe entitati pentru selectia curenta.</div>`}</div>${more}`);
    }

    function renderEntityTimeline(controls, stats) {
      if (!stats.hasSelection) {
        setHtml("entityTimeline", `<div class="entity-empty-state">Selecteaza o entitate pentru istoricul complet al controalelor si constatarilor.</div>`);
        return;
      }
      const sorted = [...controls].sort((a, b) => entityDateValue(b) - entityDateValue(a));
      const shown = sorted.slice(0, entityTimelineLimit);
      const cards = shown.map(control => {
        const result = getControlResult(control);
        const findings = getControlFindings(control) || "Fara constatari completate.";
        const violation = getViolationText(control) || "";
        const legal = getLegalBasis(control);
        const measures = getControlMeasures(control) || "Fara masuri suplimentare completate.";
        const petition = getPetitionNumber(control);
        return `<article class="entity-timeline-item">
          <div class="entity-timeline-date">
            <strong>${escapeHtml(formatDay(getControlDate(control)))}</strong>
            <span>${escapeHtml(getControlTimeLabel(control) || "ora -")}</span>
          </div>
          <div class="entity-timeline-body">
            <div class="entity-timeline-title">
              <div>
                <strong>Control #${escapeHtml(control.id || "-")}</strong>
                <span>${escapeHtml([guardDisplayName(control.garda), control.localitate].filter(Boolean).join(" - ") || "-")}</span>
              </div>
              <b class="entity-result-chip" style="--entity-result-color:${colorByResult(result)};">${escapeHtml(resultLabel(result))}</b>
            </div>
            <div class="entity-timeline-meta">
              <span>${escapeHtml(control.control_type || control.tip_control || "-")}</span>
              <span>${escapeHtml(getPopupDomain(control) || getControlDomainRaw(control) || "-")}</span>
              <span>${escapeHtml(getControlCategory(control) || getControlCategoryRaw(control) || "-")}</span>
            </div>
            <div class="entity-timeline-block"><h4>Constatari</h4><p>${escapeHtml(findings)}</p></div>
            ${violation && violation !== findings ? `<div class="entity-timeline-block"><h4>Descriere abatere</h4><p>${escapeHtml(violation)}</p></div>` : ""}
            ${legal ? `<div class="entity-timeline-block"><h4>Temei legal</h4><p>${escapeHtml(legal)}</p></div>` : ""}
            <div class="entity-timeline-block"><h4>Masuri dispuse</h4><p>${escapeHtml(measures)}</p></div>
            <div class="entity-timeline-financial">
              <div><span>Amenda</span><b>${escapeHtml(formatMoney(getControlFine(control)))}</b></div>
              <div><span>Prejudiciu</span><b>${escapeHtml(formatMoney(getControlDamage(control)))}</b></div>
              <div><span>Sesizare</span><b>${escapeHtml(petition || "-")}</b></div>
              <div><span>Raport control</span><b>${entityReportBadge(control)}</b></div>
              <div><span>Numar raport</span><b>${escapeHtml(control.report_number || "-")}</b></div>
              <div><span>Data raportului</span><b>${escapeHtml(control.report_date ? formatDay(control.report_date) : "-")}</b></div>
            </div>
            ${entityControlActionButtons(control)}
          </div>
        </article>`;
      }).join("");
      const more = sorted.length > entityTimelineLimit
        ? `<button class="entity-show-more entity-more-btn" type="button">Afiseaza mai multe (${sorted.length - entityTimelineLimit})</button>`
        : "";
      setHtml("entityTimeline", cards + more);
    }

    function entityMonthlyMoney(controls, getter) {
      const values = {};
      controls.forEach(control => {
        const key = monthKey(control);
        values[key] = (values[key] || 0) + Number(getter(control) || 0);
      });
      return values;
    }

    function entityTopBy(groups, getter, limit = 10) {
      return Object.values(groups).map(item => [item.name, getter(item.controls)]).sort((a, b) => Number(b[1] || 0) - Number(a[1] || 0)).slice(0, limit);
    }

    function renderEntityStatistics(stats) {
      if (stats.hasSelection) {
        const controls = stats.displayControls;
        const byCategory = topEntries(countBy(controls, c => getControlCategory(c) || getControlCategoryRaw(c) || "Necunoscut"), 10);
        const categoryValues = byCategory.map(x => x[1]);
        setText("entityChartMainTitle", "Categorii control");
        setText("entityChartMainSub", "entitate selectata");
        makeChart("chartEntitiesTop", "bar", byCategory.map(x => x[0]), categoryValues, { horizontal: true, label: "Controale", colors: gradientColorsByValues(categoryValues, "total") });
        const byM = countBy(controls, monthKey);
        const months = Object.keys(byM).sort();
        setText("entityChartMonthlySub", "controale in timp");
        makeChart("chartEntitiesMonthly", "line", months.map(monthLabel), months.map(m => byM[m]), { label: "Controale" });
        const byR = countBy(controls, c => resultLabel(getControlResult(c)));
        setText("entityChartResultSub", "rezultate");
        makeChart("chartEntitiesResults", "doughnut", Object.keys(byR), Object.values(byR), { colors: Object.keys(byR).map(label => colorByResult(normalizeResultLabelBack(label))) });
        const fineByMonth = entityMonthlyMoney(controls, getControlFine);
        const fineMonths = Object.keys(fineByMonth).sort();
        setText("entityChartFineSub", "amenzi in timp");
        makeChart("chartEntityFines", "bar", fineMonths.map(monthLabel), fineMonths.map(m => Math.round(fineByMonth[m])), { label: "lei", colors: gradientColorsByValues(fineMonths.map(m => fineByMonth[m]), "fines") });
        const damageByMonth = entityMonthlyMoney(controls, getControlDamage);
        const damageMonths = Object.keys(damageByMonth).sort();
        setText("entityChartDamageSub", "prejudicii in timp");
        makeChart("chartEntityDamage", "bar", damageMonths.map(monthLabel), damageMonths.map(m => Math.round(damageByMonth[m])), { label: "lei", colors: gradientColorsByValues(damageMonths.map(m => damageByMonth[m]), "damage") });
        const byType = countBy(controls, c => c.control_type || c.tip_control || "Necunoscut");
        setText("entityChartSecondaryTitle", "Tipuri control");
        setText("entityChartSecondarySub", "entitate selectata");
        makeChart("chartEntitySecondary", "doughnut", Object.keys(byType), Object.values(byType));
        const reportStatus = countBy(controls, c => hasControlReport(c) ? "Raport incarcat" : "Fara raport");
        setText("entityChartReportSub", "status documentar");
        makeChart("chartEntityReports", "doughnut", Object.keys(reportStatus), Object.values(reportStatus));
        return;
      }

      const groups = stats.groups;
      const topTotal = entityTopBy(groups, controls => controls.length, 10);
      const totalValues = topTotal.map(x => x[1]);
      setText("entityChartMainTitle", "Top entitati");
      setText("entityChartMainSub", "dupa controale");
      makeChart("chartEntitiesTop", "bar", topTotal.map(x => x[0]), totalValues, { horizontal: true, label: "Controale", colors: gradientColorsByValues(totalValues, "total") });
      const topProblems = entityTopBy(groups, controls => controls.filter(isControlProblem).length, 10);
      const problemValues = topProblems.map(x => x[1]);
      setText("entityChartMonthlySub", "top probleme");
      makeChart("chartEntitiesMonthly", "bar", topProblems.map(x => x[0]), problemValues, { horizontal: true, label: "Probleme", colors: gradientColorsByValues(problemValues, "problems") });
      const byR = countBy(stats.allControls, c => resultLabel(getControlResult(c)));
      setText("entityChartResultSub", "general");
      makeChart("chartEntitiesResults", "doughnut", Object.keys(byR), Object.values(byR), { colors: Object.keys(byR).map(label => colorByResult(normalizeResultLabelBack(label))) });
      const topFines = entityTopBy(groups, controls => sumBy(controls, getControlFine), 10);
      const fineValues = topFines.map(x => Math.round(x[1]));
      setText("entityChartFineSub", "top amenzi");
      makeChart("chartEntityFines", "bar", topFines.map(x => x[0]), fineValues, { horizontal: true, label: "lei", colors: gradientColorsByValues(fineValues, "fines") });
      const topDamage = entityTopBy(groups, controls => sumBy(controls, getControlDamage), 10);
      const damageValues = topDamage.map(x => Math.round(x[1]));
      setText("entityChartDamageSub", "top prejudiciu");
      makeChart("chartEntityDamage", "bar", topDamage.map(x => x[0]), damageValues, { horizontal: true, label: "lei", colors: gradientColorsByValues(damageValues, "damage") });
      const topPetitions = entityTopBy(groups, controls => controls.filter(isControlPetition).length, 10);
      const petitionValues = topPetitions.map(x => x[1]);
      setText("entityChartSecondaryTitle", "Top sesizari");
      setText("entityChartSecondarySub", "entitati");
      makeChart("chartEntitySecondary", "bar", topPetitions.map(x => x[0]), petitionValues, { horizontal: true, label: "Sesizari", colors: gradientColorsByValues(petitionValues, "total") });
      const reportStatus = countBy(stats.allControls, c => hasControlReport(c) ? "Raport incarcat" : "Fara raport");
      setText("entityChartReportSub", "status documentar");
      makeChart("chartEntityReports", "doughnut", Object.keys(reportStatus), Object.values(reportStatus));
    }

    function entityDossierStat(icon, label, value, tone = "neutral") {
      return `<div class="entity-dossier-stat ${escapeAttr(tone)}">
        <span class="entity-dossier-stat-icon" aria-hidden="true">${escapeHtml(icon)}</span>
        <div class="entity-dossier-stat-copy">
          <small>${escapeHtml(label)}</small>
          <strong>${escapeHtml(value)}</strong>
        </div>
      </div>`;
    }

    function renderEntityDossierSummary(stats) {
      if (!stats || !stats.hasSelection) {
        setHtml("entityDossierStats", "");
        setHtml("entityDossierMeta", "");
        return;
      }

      const total = stats.totalControls || 0;
      const problems = stats.problemControls.length;
      const problemRate = total ? (problems / total) * 100 : 0;
      const reports = stats.displayControls.filter(hasControlReport).length;
      const lastDate = stats.lastControl ? formatDay(getControlDate(stats.lastControl)) : "-";
      const type = stats.types[0] || "Tip nespecificat";
      const guard = stats.guards[0] || "Garda nespecificata";
      const locality = stats.localities[0] || "Localitate nespecificata";

      const profileItems = [
        ["TIP", type],
        ["GF", guard],
        ["LOC", locality]
      ];
      if (isInternalMode && stats.cui) profileItems.push(["CUI", stats.cui]);

      setHtml("entityDossierMeta", profileItems.map(([icon, value]) => `
        <span class="entity-profile-chip"><b>${escapeHtml(icon)}</b>${escapeHtml(value)}</span>
      `).join(""));

      setHtml("entityDossierStats", [
        entityDossierStat("CTR", "Total controale", String(total), "info"),
        entityDossierStat("!", "Probleme", `${problems} · ${formatPercent(problemRate)}`, problems ? "danger" : "good"),
        entityDossierStat("SAN", "Sanctiuni", String(stats.sanctions.length), stats.sanctions.length ? "warn" : "good"),
        entityDossierStat("LEI", "Amenzi", formatMoney(stats.fines), stats.fines ? "warn" : "neutral"),
        entityDossierStat("CAL", "Ultimul control", lastDate, "info"),
        entityDossierStat("PDF", "Rapoarte", `${reports}/${total}`, reports === total && total ? "good" : "neutral")
      ].join(""));
    }

    function renderEntityConnections(stats) {
      if (!stats.hasSelection) {
        setHtml("entityQuickActions", "");
        return;
      }
      setHtml("entityQuickActions", `
        <button class="quick-action-btn entity-map-btn" type="button" data-entity="${escapeAttr(stats.selectedEntity)}"><span class="entity-action-icon">MAP</span>Harta</button>
        <button class="quick-action-btn entity-petitions-btn" type="button" data-entity="${escapeAttr(stats.selectedEntity)}"><span class="entity-action-icon">SES</span>Petitii</button>
        <button class="quick-action-btn entity-reports-btn" type="button" data-entity="${escapeAttr(stats.selectedEntity)}"><span class="entity-action-icon">PDF</span>Rapoarte</button>
      `);
    }

    function renderEntitiesView() {
      if (!isInternalMode) return;

      const baseControls = getEntityBaseControls();
      const globalStats = buildEntityStats(baseControls, "");
      const searchValue = safeValue("entitySearch", "").trim();
      const searchNorm = normalizeText(searchValue);
      const entityNames = [...new Set(baseControls.map(getEntityName).filter(Boolean))];
      const exactEntity = searchNorm ? entityNames.find(name => normalizeText(name) === searchNorm) : "";
      const selectedStats = exactEntity ? buildEntityStats(baseControls, exactEntity) : null;
      const hasSelectedEntity = Boolean(selectedStats && selectedStats.hasSelection);

      // No explanatory context line below the selector. The selected dossier itself is the context.
      setText("entitySummary", "");

      const mapSection = q("entityGeneralMapSection");
      const chartsSection = q("entityGeneralChartsSection");
      if (mapSection) mapSection.hidden = hasSelectedEntity;
      if (chartsSection) chartsSection.hidden = hasSelectedEntity;
      q("view-entities")?.classList.toggle("entity-selection-active", hasSelectedEntity);

      const dossier = q("entityDossier");
      if (!hasSelectedEntity) {
        if (dossier) dossier.classList.remove("active");
        setText("entityDossierName", "Selecteaza o entitate");
        setHtml("entityDossierMeta", "");
        setHtml("entityDossierStats", "");
        setHtml("entityQuickActions", "");
        setHtml("entityYearTabs", "");
        setHtml("entityTimeline", "");
        setHtml("entitySecondaryKpis", "");

        // General view: map + national/entity portfolio analytics remain the visual focus.
        renderEntityStatsMap(baseControls, globalStats);
        renderEntityMainCharts(globalStats);
        setTimeout(() => {
          if (entityStatsMap) entityStatsMap.invalidateSize();
          refreshCharts();
        }, 100);
        return;
      }

      if (dossier) dossier.classList.add("active");
      const selectedKey = normalizeText(selectedStats.selectedEntity || "");
      if (selectedKey !== entityTimelineKey) {
        entityTimelineKey = selectedKey;
        entityLatestLimit = 5;
        selectedEntityHistoryYear = "";
      }

      setText("entityDossierName", selectedStats.selectedEntity || "Entitate");
      renderEntityConnections(selectedStats);
      renderEntityDossierSummary(selectedStats);
      renderEntityYearHistory(selectedStats.displayControls, selectedStats);

      if (isCollapseOpen("collapseEntityStats")) {
        renderEntityKpiCards(selectedStats);
        renderEntityAdvancedStatistics(selectedStats);
      }
    }


    function openEntityPetitions(entityName) {
      const controls = controlsForEntity(entityName, allControls).filter(isControlPetition);
      setView("petitions");
      const firstPetition = controls.find(c => getPetitionNumber(c));
      if (q("petitionNumberSearch")) q("petitionNumberSearch").value = firstPetition ? getPetitionNumber(firstPetition) : "";
      setTimeout(() => {
        renderPetitionsView();
        if (firstPetition) renderPetitionSearch(false);
        setMessage(controls.length ? `${controls.length} sesizari asociate entitatii. Prima sesizare este afisata in verificarea publica.` : "Nu exista sesizari asociate entitatii selectate.", Boolean(controls.length));
      }, 80);
    }

    function openEntityReports(entityName) {
      if (!isInternalMode) return setMessage("Rapoartele PDF sunt disponibile doar in modul intern.", false);
      const controls = controlsForEntity(entityName, allControls);
      const firstReport = controls.find(hasControlReport) || controls[0];
      if (firstReport) reportWorkflowFocusId = String(firstReport.id);
      inspectorSection = "reports";
      setView("inspectori");
      setTimeout(() => {
        loadReportWorkflowItems(true);
        setMessage(firstReport ? "Am deschis lista de finalizare rapoarte si am evidentiat primul control relevant." : "Nu exista controale pentru entitatea selectata.", Boolean(firstReport));
      }, 80);
    }

    function ensureReportTargets() {
      const select = q("institutionReportTarget");
      if (!select || select.dataset.ready === "1") return;
      select.innerHTML = [
        `<option value="national">Garda Forestiera Nationala</option>`,
        ...Object.entries(GUARD_DISPLAY_NAMES).map(([key, name]) => `<option value="${escapeHtml(key)}">${escapeHtml(name)}</option>`)
      ].join("");
      select.dataset.ready = "1";
    }

    function getReportAreaHa(target) {
      if (target && target !== "national") return Number(GUARD_FOREST_AREA_HA[target] || 0);
      return Object.values(GUARD_FOREST_AREA_HA).reduce((sum, value) => sum + Number(value || 0), 0);
    }

    function buildReportStats(arr, target = "national") {
      const total = arr.length;
      const areaHa = getReportAreaHa(target);
      const conform = arr.filter(c => c.result === "conform").length;
      const problems = arr.filter(c => isProblemResult(c.result)).length;
      const sanctions = arr.filter(c => c.result === "sanctiune" || c.result === "sesizare_penala").length;
      const petitions = arr.filter(isPetition).length;
      const fines = sumBy(arr, getFineAmount);
      const damage = sumBy(arr, getDamageAmount);
      return {
        total,
        areaHa,
        conform,
        problems,
        sanctions,
        petitions,
        fines,
        damage,
        density: areaHa ? total / areaHa * 10000 : 0,
        conformRate: total ? conform / total * 100 : 0,
        problemRate: total ? problems / total * 100 : 0,
        sanctionRate: total ? sanctions / total * 100 : 0,
        petitionShare: total ? petitions / total * 100 : 0,
        finePerControl: total ? fines / total : 0,
        damagePerControl: total ? damage / total : 0
      };
    }

    function reportStatusChip(value, type) {
      if (type === "density") {
        if (value >= 0.35) return `<span class="report-status good">peste reper</span>`;
        if (value >= 0.20) return `<span class="report-status neutral">in parametri</span>`;
        return `<span class="report-status warn">sub reper</span>`;
      }
      if (type === "problem") {
        if (value >= 35) return `<span class="report-status warn">ridicat</span>`;
        if (value >= 18) return `<span class="report-status neutral">monitorizare</span>`;
        return `<span class="report-status good">scazut</span>`;
      }
      return `<span class="report-status neutral">informativ</span>`;
    }

    function reportKpiCard(label, value, note, statusHtml = "") {
      return `<div class="report-kpi-card">
        <span>${escapeHtml(label)}</span>
        <strong>${escapeHtml(value)}</strong>
        <small>${escapeHtml(note)}</small>
        ${statusHtml}
      </div>`;
    }

    function getReportPeriodRange() {
      return { dateFrom: safeValue("reportDateFrom", ""), dateTo: safeValue("reportDateTo", "") };
    }

    function renderReportGuardMatrix(baseReportArr) {
      const { stats } = buildGuardStats(baseReportArr, getReportPeriodRange());
      const rows = Object.values(stats).sort((a, b) => Number(b.density || 0) - Number(a.density || 0));
      if (!rows.length) return `<div class="empty">Nu exista date pe garzi pentru perioada selectata.</div>`;
      return `<div class="report-table-wrap"><table class="report-table">
        <thead><tr>
          <th>Garda</th><th>Suprafata</th><th>Controale</th><th>/10.000 ha</th><th>Probleme</th><th>Masuri</th><th>Sesizari</th><th>Amenzi/control</th><th>Prejudiciu/control</th>
        </tr></thead>
        <tbody>${rows.map(item => `<tr>
          <td>${escapeHtml(item.garda)}</td>
          <td>${Number(item.forestAreaHa || 0).toLocaleString("ro-RO")} ha</td>
          <td>${item.total || 0}</td>
          <td><b>${Number(item.density || 0).toFixed(2)}</b></td>
          <td>${formatPercent(item.problemRate || 0)}</td>
          <td>${formatPercent(item.sanctionRate || 0)}</td>
          <td>${formatPercent(item.petitionShare || 0)}</td>
          <td>${escapeHtml(formatMoney(item.finePerControl))}</td>
          <td>${escapeHtml(formatMoney(item.damagePerControl))}</td>
        </tr>`).join("")}</tbody>
      </table></div>`;
    }

    function reportShortGuard(name) {
      return gardaShortLabel(name || "-") || "-";
    }

    function renderReportView() {
      ensureReportTargets();
      const target = safeValue("institutionReportTarget", "national");
      const baseReportArr = getModulePeriodControls("report");
      const arr = target === "national" ? baseReportArr : baseReportArr.filter(c => canonicalGuardName(c.garda) === target);
      const name = target === "national" ? "Garda Forestiera Nationala" : (GUARD_DISPLAY_NAMES[target] || target);
      const periodLabel = getModulePeriodLabel("report");
      const stats = buildReportStats(arr, target);
      const allStats = buildReportStats(baseReportArr, "national");
      const byGuard = topEntries(countBy(arr, c => guardDisplayName(c.garda)), 5);
      const topGuardText = byGuard.length ? `${reportShortGuard(byGuard[0][0])} (${byGuard[0][1]} controale)` : "-";
      const narrative = stats.total
        ? `In ${periodLabel}, ${name} a inregistrat ${stats.total} controale pe o suprafata de ${Math.round(stats.areaHa).toLocaleString("ro-RO")} ha, cu o intensitate de ${stats.density.toFixed(2)} controale la 10.000 ha. Ponderea controalelor cu probleme este ${formatPercent(stats.problemRate)}, iar controalele generate de sesizari reprezinta ${formatPercent(stats.petitionShare)} din activitate.`
        : `Nu exista controale in ${periodLabel} pentru selectia curenta. Raportul ramane pregatit pentru export cand exista date in filtre.`;

      setHtml("institutionReport", `
        <div class="report-export-shell" id="reportPrintable">
          <div class="report-print-cover">
            <div>
              <div class="report-eyebrow">Raport institutional GFN</div>
              <h2>${escapeHtml(name)}</h2>
              <p>${escapeHtml(periodLabel)} - generat la ${escapeHtml(new Date().toLocaleString("ro-RO"))}</p>
            </div>
            <div class="report-cover-mark">GFN</div>
          </div>

          <div class="report-executive-summary">
            <h3>Sumar executiv</h3>
            <p>${escapeHtml(narrative)}</p>
          </div>

          <div class="report-kpi-grid report-kpi-primary">
            ${reportKpiCard("Total controale", String(stats.total), "controale in perioada raportata")}
            ${reportKpiCard("Controale / 10.000 ha", stats.density.toFixed(2), "normalizat dupa suprafata", reportStatusChip(stats.density, "density"))}
            ${reportKpiCard("Rata conformare", formatPercent(stats.conformRate), `${stats.conform} controale conforme`)}
            ${reportKpiCard("Rata probleme", formatPercent(stats.problemRate), `${stats.problems} controale cu probleme`, reportStatusChip(stats.problemRate, "problem"))}
          </div>

          <details class="report-kpi-more">
            <summary>Indicatori suplimentari</summary>
            <div class="report-kpi-grid report-kpi-secondary">
              ${reportKpiCard("Masuri ferme", formatPercent(stats.sanctionRate), `${stats.sanctions} sanctiuni/sesizari penale`)}
              ${reportKpiCard("Sesizari", formatPercent(stats.petitionShare), `${stats.petitions} controale generate de sesizari`)}
              ${reportKpiCard("Amenzi / control", formatMoney(stats.finePerControl), `total ${formatMoney(stats.fines)}`)}
              ${reportKpiCard("Prejudiciu / control", formatMoney(stats.damagePerControl), `total ${formatMoney(stats.damage)}`)}
            </div>
          </details>

          <div class="report-two-cols">
            <div class="report-panel">
              <h3>Interpretare rapida</h3>
              <ul>
                <li><b>Acoperire:</b> ${escapeHtml(stats.density.toFixed(2))} controale / 10.000 ha.</li>
                <li><b>Calitate rezultate:</b> ${escapeHtml(formatPercent(stats.problemRate))} controale cu probleme si ${escapeHtml(formatPercent(stats.sanctionRate))} masuri ferme.</li>
                <li><b>Reactivitate:</b> ${escapeHtml(formatPercent(stats.petitionShare))} din controale provin din sesizari.</li>
                <li><b>Impact financiar:</b> ${escapeHtml(formatMoney(stats.fines + stats.damage))} amenzi si prejudicii estimate cumulat.</li>
              </ul>
            </div>
            <div class="report-panel">
              <h3>Repere nationale</h3>
              <p><b>Activitate totala GFN in filtru:</b> ${allStats.total} controale.</p>
              <p><b>Media nationala:</b> ${allStats.density.toFixed(2)} controale / 10.000 ha.</p>
              <p><b>Garda cu volum maxim in selectie:</b> ${escapeHtml(topGuardText)}.</p>
            </div>
          </div>

          <div class="report-panel report-matrix-panel">
            <h3>Matrice KPI pe garzi</h3>
            ${renderReportGuardMatrix(baseReportArr)}
          </div>
        </div>
      `);

      const byR = countBy(arr, c => resultLabel(c.result)); makeChart("chartReportResults", "doughnut", Object.keys(byR), Object.values(byR), { colors: Object.keys(byR).map(label => colorByResult(normalizeResultLabelBack(label))) });
      const byT = countBy(arr, c => c.control_type); makeChart("chartReportTypes", "doughnut", Object.keys(byT), Object.values(byT));
      const byC = countBy(arr, c => getControlCategory(c)); const topC = topEntries(byC, 8); makeChart("chartReportCategories", "bar", topC.map(x => x[0]), topC.map(x => x[1]), { horizontal: true });
    }

    function normalizeResultLabelBack(label) {
      const n = normalizeText(label);
      if (n.includes("mixt")) return "mixt";
      if (n.includes("necunoscut")) return "necunoscut";
      if (n.includes("conform") && !n.includes("neconform")) return "conform";
      if (n.includes("neconform")) return "neconform";
      if (n.includes("avert")) return "avertisment";
      if (n.includes("sanct")) return "sanctiune";
      if (n.includes("penal")) return "sesizare_penala";
      return label;
    }

    function exportInstitutionPdf() {
      document.body.classList.add("printing-report");
      const previousTitle = document.title;
      document.title = "Raport institutional GFN";
      setTimeout(() => window.print(), 80);
      setTimeout(() => {
        document.title = previousTitle;
        document.body.classList.remove("printing-report");
      }, 900);
    }

    function escapeHtml(value) {
      return toAsciiText(value).replace(/[&<>'"]/g, ch => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", "'":"&#39;", '"':"&quot;" }[ch]));
    }
    function escapeAttr(value) {
      return String(value ?? "").replace(/[&<>'"`]/g, ch => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", "'":"&#39;", '"':"&quot;", "`":"&#96;" }[ch]));
    }



    /* === PATCH JS: category fix, stable user chip, recent click-to-control === */
    const markerByControlId = new Map();
    const markersByControlId = Object.create(null);
    const invalidCoordinateWarningIds = new Set();

    function parseCoord(value) {
      if (value === null || value === undefined || value === "") return null;

      if (typeof value === "number") {
        return Number.isFinite(value) ? value : null;
      }

      if (typeof value === "string") {
        let s = value.trim();
        if (!s) return null;

        // Accepta stringuri de tip "45.7", "45,7" sau valori cu text in jur.
        s = s
          .replace(/[^\d,.\-+]/g, "")
          .replace(/^\.+|\.+$/g, "");

        if (!s) return null;

        // Daca are si punct si virgula, presupunem punct ca separator de mii si virgula ca zecimala.
        if (s.includes(".") && s.includes(",")) {
          s = s.replace(/\./g, "").replace(",", ".");
        } else if (s.includes(",")) {
          s = s.replace(",", ".");
        }

        const n = Number(s);
        return Number.isFinite(n) ? n : null;
      }

      return null;
    }

    function isInsideRomania(lat, lon) {
      return lat >= 43.0 && lat <= 49.0 && lon >= 20.0 && lon <= 30.5;
    }

    function warnCoordinateIssue(type, control, details = {}) {
      const id = control && control.id !== undefined && control.id !== null ? String(control.id) : "necunoscut";
      const key = `${type}:${id}`;
      if (invalidCoordinateWarningIds.has(key)) return;
      invalidCoordinateWarningIds.add(key);
      if (type === "missing") {
        console.warn("Control fara coordonate valide:", control && control.id, control);
      } else if (type === "swapped") {
        console.warn("Coordonate inversate corectate:", control && control.id, details);
      } else {
        console.warn("Coordonate in afara Romaniei:", control && control.id, { ...details, control });
      }
    }

    function getNestedControlValue(control, paths) {
      for (const path of paths) {
        const parts = path.split(".");
        let value = control;
        for (const part of parts) {
          if (value === null || value === undefined) break;
          value = value[part];
        }
        if (value !== null && value !== undefined && value !== "") return value;
      }
      return null;
    }

    function normalizeControlCoordinates(control) {
      const latCandidates = [
        "lat", "latitude", "gps.lat", "gps.latitude",
        "payload.lat", "payload.latitude", "payload.gps.lat", "payload.gps.latitude"
      ];

      const lonCandidates = [
        "lon", "lng", "longitude", "gps.lon", "gps.lng", "gps.longitude",
        "payload.lon", "payload.lng", "payload.longitude", "payload.gps.lon", "payload.gps.lng", "payload.gps.longitude"
      ];

      let lat = parseCoord(getNestedControlValue(control, latCandidates));
      let lon = parseCoord(getNestedControlValue(control, lonCandidates));

      if (lat === null || lon === null) {
        warnCoordinateIssue("missing", control, { lat, lon });
        return null;
      }

      // Varianta normala: latitudine 43-49, longitudine 20-30.5.
      if (isInsideRomania(lat, lon)) {
        return { lat, lon };
      }

      // Daca sunt inversate, le corectam doar cand inversarea intra in Romania.
      if (isInsideRomania(lon, lat)) {
        warnCoordinateIssue("swapped", control, { oldLat: lat, oldLon: lon });
        return { lat: lon, lon: lat };
      }

      warnCoordinateIssue("outside", control, { lat, lon });
      return null;
    }

    function setControlMarker(controlId, marker) {
      const key = String(controlId);
      markerByControlId.set(key, marker);
      markersByControlId[key] = marker;
    }

    function getControlMarker(controlId) {
      const key = String(controlId);
      return markerByControlId.get(key) || markersByControlId[key] || null;
    }

    function clearControlMarkers() {
      markerByControlId.clear();
      Object.keys(markersByControlId).forEach(key => delete markersByControlId[key]);
    }

    function getPopupCategory(control) {
      const raw = getControlCategoryRaw(control);
      if (!raw) return "";
      const found = findCategoryConfig(raw, getControlDomainKey(control));
      return found ? found.label : raw;
    }

    function getPopupDomain(control) {
      const raw = getControlDomainRaw(control);
      const config = getDomainConfig(raw);
      return config ? config.label : raw;
    }

    function makePopupRow(label, value, extraStyle = "") {
      if (value === undefined || value === null || value === "") return "";
      return `<tr><td class="popup-label">${escapeHtml(label)}</td><td class="popup-value" ${extraStyle}>${escapeHtml(value)}</td></tr>`;
    }

    function getControlById(controlId) {
      return allControls.find(c => String(c.id) === String(controlId)) || null;
    }

    function controlDetailField(label, value, className = "") {
      return `<div class="${className}"><span>${escapeHtml(label)}</span><b>${escapeHtml(value || "-")}</b></div>`;
    }

    function formatDetailValue(value) {
      if (value === null || value === undefined || value === "") return "";
      if (Array.isArray(value)) return value.filter(Boolean).join(", ");
      return value;
    }

    function detailRow(label, value) {
      const formatted = formatDetailValue(value);
      if (formatted === "") return "";
      return `<div class="control-full-row"><span>${escapeHtml(label)}</span><b>${escapeHtml(formatted)}</b></div>`;
    }

    function detailSection(title, html) {
      const content = String(html || "").trim();
      const body = content || `<div class="control-full-notice">Nu exista date completate pentru aceasta sectiune.</div>`;
      return `<section class="control-full-section">
        <h3>${escapeHtml(title)}</h3>
        <div class="control-full-section-body">${body}</div>
      </section>`;
    }

    function detailLongBlock(label, value) {
      const formatted = formatDetailValue(value);
      if (formatted === "") return "";
      return `<div class="control-full-long"><span>${escapeHtml(label)}</span><p>${escapeHtml(formatted)}</p></div>`;
    }

    function controlGpsLabel(control) {
      const coords = normalizeControlCoordinates(control);
      return coords ? `${coords.lat.toFixed(6)}, ${coords.lon.toFixed(6)}` : "";
    }

    function getControlResponseLabel(control) {
      const days = getPetitionResponseDays(control);
      return days === null || days === undefined ? "" : `${days} zile`;
    }

    function controlReportRows(control) {
      const uploaded = getControlHasReport(control);
      const days = getControlDaysToReport(control || {});
      if (!isInternalMode) {
        return uploaded
          ? detailRow("Status public", "Control finalizat administrativ")
          : detailRow("Status public", "Raportul administrativ nu este public.");
      }

      const item = control || {};
      const status = uploaded ? "Finalizat" : reportStatusLabel(item);
      const responseBar = `<div class="control-full-long report-time-detail"><span>Timp finalizare</span>${renderResponseTimeBar(days, uploaded)}</div>`;
      return [
        detailRow("Status raport", status),
        detailRow("Data teren", formatDay(getControlStartDateValue(item))),
        detailRow("Zile pana la finalizare", formatDays(days)),
        isPetition(item) ? detailRow("Timp raspuns sesizare", formatDays(days)) : "",
        responseBar,
        detailRow("Data incarcarii", item.report_uploaded_at ? formatDate(item.report_uploaded_at) : ""),
        detailRow("Numar raport", item.report_number),
        detailRow("Data raportului", item.report_date ? formatDay(item.report_date) : ""),
        detailRow("Fisier PDF", item.report_original_filename),
        detailLongBlock("Observatii raport", item.report_notes),
        uploaded
          ? `<button class="control-full-btn control-report-open-pdf" type="button" data-control-id="${escapeAttr(item.id)}">Deschide raport PDF</button>`
          : `<button class="control-full-btn report-upload-open-btn" type="button" data-control-id="${escapeAttr(item.id)}">Incarca raport</button>`
      ].join("");
    }

    function renderControlBreadcrumb(control) {
      const items = [`<span>Harta</span>`, `<span>Control #${escapeHtml(control.id || "-")}</span>`];
      const petition = getPetitionNumber(control);
      const entityName = getEntityName(control);
      if (petition) items.push(`<span>Sesizare ${escapeHtml(petition)}</span>`);
      if (isInternalMode && entityName) items.push(`<span>Entitate ${escapeHtml(entityName)}</span>`);
      return `<nav class="detail-breadcrumb" aria-label="Context fisa">${items.join("<b>/</b>")}</nav>`;
    }

    function renderControlQuickActions(control) {
      const entityName = getEntityName(control);
      const petition = getPetitionNumber(control);
      const hasReport = getControlHasReport(control);
      return `<div class="quick-actions control-full-actions">
        <button class="quick-action-btn control-full-center" type="button" data-control-id="${escapeAttr(control.id)}"${controlMapButtonAttributes(control)}>Vezi pe harta</button>
        ${isInternalMode && entityName ? `<button class="quick-action-btn quick-entity-btn" type="button" data-control-id="${escapeAttr(control.id)}">Vezi dosar entitate</button>` : ""}
        ${petition ? `<button class="quick-action-btn quick-petition-btn" type="button" data-control-id="${escapeAttr(control.id)}">Vezi sesizarea</button>` : ""}
        ${isInternalMode && hasReport ? `<button class="quick-action-btn control-report-open-pdf" type="button" data-control-id="${escapeAttr(control.id)}">Vezi raport PDF</button>` : ""}
        ${isInternalMode && !hasReport ? `<button class="quick-action-btn quick-report-workflow-btn" type="button" data-control-id="${escapeAttr(control.id)}">Finalizare raport</button>` : ""}
      </div>`;
    }

    function renderControlFullModal(control) {
      const modal = q("controlFullModal");
      if (!modal || !control) return;

      const color = colorByResult(control.result);
      const controlDate = firstValue(control, ["data_control", "created_at"]);
      const controlTime = getControlTimeLabel(control);
      const gps = controlGpsLabel(control);
      const domain = getPopupDomain(control) || getControlDomainRaw(control);
      const category = getControlCategory(control) || getControlCategoryRaw(control);
      const legalBasis = getLegalBasis(control);
      const fine = getFineAmount(control);
      const damage = getDamageAmount(control);
      const petition = getPetitionNumber(control);
      const responseLabel = getControlResponseLabel(control);
      const isCriminalReferral = control.result === "sesizare_penala" || firstValue(control, ["sesizare_penala", "sesizare_penala_detalii"]);
      const partners = Array.isArray(control.parteneri) ? control.parteneri.filter(Boolean).join(", ") : firstValue(control, ["parteneri", "institutii_partenere"]);
      const operator = firstValue(control, ["ocol", "operator", "administrator", "gestionar"]);
      const confiscated = firstValue(control, ["material_lemnos_confiscat", "volum_confiscat", "confiscari", "bunuri_confiscate"]);
      const sanctions = firstValue(control, ["sanctiuni", "sanctiune", "tip_sanctiune"]);
      const subtitle = [control.control_type || "Control", control.garda, formatDay(controlDate)].filter(Boolean).join(" - ");
      const petitionDate = getPetitionRegisteredDate(control);

      const general = [
        detailRow("ID control", control.id || "-"),
        detailRow("Data controlului", formatDay(controlDate)),
        detailRow("Interval control", control.date_end && control.date_end !== control.date_start ? `${formatDay(control.date_start)} - ${formatDay(control.date_end)}` : ""),
        detailRow("Ora controlului", controlTime),
        detailRow("Numar act control", firstValue(control, ["numar_act_control", "numar_act", "act_control"])),
        detailRow("Garda Forestiera", control.garda),
        detailRow("Judet", control.judet),
        detailRow("Localitate", control.localitate),
        detailRow("Reper", control.reper),
        detailRow("Coordonate GPS", gps),
        detailRow("Tip control", firstValue(control, ["tip_control_original", "control_type"])),
        detailRow("Mod control", getControlModeLabel(control)),
        detailRow("Domeniu control", domain),
        detailRow("Categorie control", category),
        detailRow("Rezultat", firstValue(control, ["result_original"]) || resultLabel(control.result))
      ].join("");

      const team = [
        isInternalMode ? detailRow("Inspectori", getInspectorNames(control)) : "",
        detailRow("Parteneri / institutii", partners)
      ].join("");

      const entity = [
        isInternalMode ? detailRow("Entitate controlata", getEntityName(control)) : "",
        detailRow("Tip entitate", control.tip_entitate),
        isInternalMode ? detailRow("CUI", control.cui) : "",
        isInternalMode ? detailRow("Ocol / operator", operator) : ""
      ].join("");

      const findings = [
        detailLongBlock("Constatari", firstValue(control, ["constatari"])),
        detailLongBlock("Descriere abatere", getViolationText(control)),
        detailLongBlock("Temei legal", legalBasis),
        detailRow("Cuantum amenda", formatMoney(fine)),
        detailRow("Valoare prejudiciu", formatMoney(damage)),
        detailRow("Material lemnos confiscat", confiscated)
      ].join("");

      const measures = [
        detailLongBlock("Masuri dispuse", getMeasuresText(control)),
        detailRow("Sanctiuni", sanctions || (isProblemResult(control.result) ? resultLabel(control.result) : "")),
        detailRow("Confiscari", confiscated),
        detailRow("Sesizare penala", isCriminalReferral ? "Da" : "")
      ].join("");

      const petitionRows = [
        detailRow("Numar sesizare", petition),
        detailRow("Data sesizare", petitionDate ? formatDay(petitionDate) : firstValue(control, ["data_sesizare", "data_inregistrare_sesizare"])),
        detailRow("Timp raspuns", responseLabel),
        isInternalMode ? detailRow("Nume petitionar", getPetitionerName(control)) : ""
      ].join("");

      const location = [
        detailRow("Coordonate GPS", gps),
        `<button class="control-full-btn control-full-center" type="button" data-control-id="${escapeAttr(control.id)}"${controlMapButtonAttributes(control)}>Centreaza pe harta</button>`
      ].join("");
      const reportRows = controlReportRows(control);

      modal.innerHTML = `
        <div class="control-full-backdrop"></div>
        <article class="control-full-shell" role="dialog" aria-modal="true" aria-labelledby="controlFullTitle">
          <header class="control-full-head">
            <div>
              <p>Control #${escapeHtml(control.id || "-")}</p>
              <h2 id="controlFullTitle">Fisa controlului</h2>
              <span>${escapeHtml(subtitle || "-")}</span>
            </div>
            <b class="control-full-result" style="--detail-color:${color};">${escapeHtml(resultLabel(control.result))}</b>
            <button class="control-full-close" type="button" aria-label="Inchide fisa">x</button>
          </header>
          <div class="control-full-body">
            ${renderControlBreadcrumb(control)}
            ${renderControlQuickActions(control)}
            <div class="control-full-grid">
              ${detailSection("A. Date generale", general)}
              ${detailSection("B. Echipa de control", team)}
              ${detailSection("C. Entitatea controlata", entity)}
              ${detailSection("D. Constatari", findings)}
              ${detailSection("E. Masuri dispuse", measures)}
              ${detailSection("F. Sesizare / petitionar", petitionRows)}
              ${detailSection("G. Localizare", location)}
              ${detailSection("Raport de control", reportRows)}
            </div>
          </div>
          <footer class="control-full-footer">
            <button class="control-full-btn secondary control-full-back" type="button">Inapoi la harta</button>
            <button class="control-full-btn control-full-center" type="button" data-control-id="${escapeAttr(control.id)}"${controlMapButtonAttributes(control)}>Centreaza pe harta</button>
          </footer>
        </article>
      `;
    }

    function renderPetitionFullModal(control) {
      const modal = q("controlFullModal");
      if (!modal || !control) return;

      const color = colorByResult(control.result);
      const petitionNumber = getPetitionNumber(control);
      const petitionDate = getPetitionRegisteredDate(control);
      const confirmation = getPetitionConfirmation(control);
      const responseDays = getPetitionResponseDays(control);
      const hasReport = getControlHasReport(control);
      const reportStatus = getPetitionReportStatus(control);
      const controlDate = firstValue(control, ["field_submitted_at", "data_control", "created_at"]);
      const domain = getPopupDomain(control) || getControlDomainRaw(control);
      const category = getControlCategory(control) || getControlCategoryRaw(control);
      const gps = controlGpsLabel(control);
      const reportLine = getPetitionResponseText(control);
      const subject = getPetitionSubject(control) || "Obiectul sesizarii nu este completat separat in fisa controlului.";
      const content = firstValue(control, ["continut_sesizare", "descriere_sesizare", "rezumat_sesizare", "motiv_sesizare"]);

      const petitionRows = [
        detailRow("Numar sesizare", petitionNumber),
        detailRow("Data sesizarii", petitionDate ? formatDay(petitionDate) : firstValue(control, ["data_sesizare", "data_inregistrare_sesizare"])),
        isInternalMode ? detailRow("Petitionar", getPetitionerName(control)) : "",
        detailLongBlock("Obiect sesizare", subject),
        detailLongBlock("Descriere / continut", content),
        detailRow("Garda Forestiera", control.garda),
        detailRow("Status sesizare", confirmation.label),
        detailRow("Rezultat", resultLabel(control.result))
      ].join("");

      const controlRows = [
        detailRow("ID control", control.id),
        detailRow("Data inceperii controlului", formatDay(controlDate)),
        detailRow("Localitate", control.localitate),
        detailRow("Reper", control.reper),
        isInternalMode ? detailRow("Entitate controlata", getEntityName(control)) : detailRow("Entitate / reper", getEntityName(control) || control.reper),
        detailRow("Tip control", control.control_type),
        detailRow("Domeniu control", domain),
        detailRow("Categorie control", category),
        detailRow("Rezultat control", resultLabel(control.result))
      ].join("");

      const findingsRows = [
        isInternalMode ? detailRow("Echipa de control", getInspectorNames(control)) : "",
        detailLongBlock("Constatari", firstValue(control, ["constatari"])),
        detailLongBlock("Descriere abatere", getViolationText(control)),
        detailLongBlock("Temei legal", getLegalBasis(control)),
        detailRow("Cuantum amenda", formatMoney(getFineAmount(control))),
        detailRow("Valoare prejudiciu", formatMoney(getDamageAmount(control))),
        detailLongBlock("Masuri dispuse", getMeasuresText(control)),
        detailRow("Coordonate GPS", gps),
        `<button class="control-full-btn control-full-center" type="button" data-control-id="${escapeAttr(control.id)}">Vezi pe harta</button>`
      ].join("");

      const reportRows = isInternalMode ? [
        detailRow("Status raport", reportStatus.label),
        detailRow("Numar raport", control.report_number),
        detailRow("Data raportului", control.report_date ? formatDay(control.report_date) : ""),
        detailRow("Data incarcarii raportului", control.report_uploaded_at ? formatDate(control.report_uploaded_at) : ""),
        detailRow("Fisier PDF", control.report_original_filename),
        hasReport
          ? `<button class="control-full-btn control-report-open-pdf" type="button" data-control-id="${escapeAttr(control.id)}">Deschide raport PDF</button>`
          : `<div class="control-full-notice">Raportul de control nu a fost incarcat.</div>`
      ].join("") : [
        detailRow("Status raport", hasReport ? "Control finalizat administrativ" : "Raport administrativ in lucru"),
        `<div class="control-full-notice">Documentul PDF nu este disponibil public.</div>`
      ].join("");

      const timeRows = [
        detailRow("Timp raspuns administrativ", formatDays(responseDays)),
        detailLongBlock("Interpretare", reportLine),
        `<div class="control-full-long report-time-detail"><span>Grafic termen</span>${renderResponseTimeBar(responseDays, hasReport)}</div>`
      ].join("");

      const subtitle = [petitionNumber ? `Sesizare ${petitionNumber}` : "Sesizare", control.garda, formatDay(controlDate)].filter(Boolean).join(" - ");
      const quickActions = `<div class="quick-actions petition-full-actions">
        <button class="quick-action-btn quick-control-sheet-btn" type="button" data-control-id="${escapeAttr(control.id)}">Vezi controlul</button>
        <button class="quick-action-btn control-full-center" type="button" data-control-id="${escapeAttr(control.id)}">Vezi pe harta</button>
        ${isInternalMode && hasReport ? `<button class="quick-action-btn control-report-open-pdf" type="button" data-control-id="${escapeAttr(control.id)}">Vezi raport PDF</button>` : ""}
      </div>`;

      modal.innerHTML = `
        <div class="control-full-backdrop"></div>
        <article class="control-full-shell petition-full-shell" role="dialog" aria-modal="true" aria-labelledby="petitionFullTitle">
          <header class="control-full-head">
            <div>
              <p>Control #${escapeHtml(control.id || "-")}</p>
              <h2 id="petitionFullTitle">Fisa petitiei / sesizarii</h2>
              <span>${escapeHtml(subtitle || "-")}</span>
            </div>
            <b class="control-full-result" style="--detail-color:${color};">${escapeHtml(reportStatus.label)}</b>
            <button class="control-full-close" type="button" aria-label="Inchide fisa">x</button>
          </header>
          <div class="control-full-body">
            <nav class="detail-breadcrumb" aria-label="Context sesizare"><span>Petitii / sesizari</span><b>/</b><span>${escapeHtml(petitionNumber || "Sesizare")}</span><b>/</b><span>Control #${escapeHtml(control.id || "-")}</span></nav>
            ${quickActions}
            <div class="control-full-grid">
              ${detailSection("A. Date sesizare", petitionRows)}
              ${detailSection("B. Control asociat", controlRows)}
              ${detailSection("C. Elemente din fisa controlului", findingsRows)}
              ${detailSection("D. Raport de control", reportRows)}
              ${detailSection("E. Timp de raspuns", timeRows)}
            </div>
          </div>
          <footer class="control-full-footer">
            <button class="control-full-btn secondary control-full-back" type="button">Inapoi la harta</button>
            <button class="control-full-btn control-full-center" type="button" data-control-id="${escapeAttr(control.id)}">Vezi pe harta</button>
          </footer>
        </article>
      `;
    }

    function openPetitionFullModal(controlId) {
      const control = getControlById(controlId);
      if (!control) return;
      selectedControlId = String(control.id);
      selectedPopupControlId = String(control.id);
      renderPetitionFullModal(control);
      const modal = q("controlFullModal");
      if (modal) modal.classList.remove("hidden");
      document.body.classList.add("control-full-open");
    }

    function openControlFullModal(controlId) {
      const control = getControlById(controlId || selectedControlId);
      if (!control) return;
      selectedControlId = String(control.id);
      selectedPopupControlId = String(control.id);
      renderControlFullModal(control);
      const modal = q("controlFullModal");
      if (modal) modal.classList.remove("hidden");
      document.body.classList.add("control-full-open");
    }

    function closeControlFullModal() {
      const modal = q("controlFullModal");
      if (modal) modal.classList.add("hidden");
      document.body.classList.remove("control-full-open");
    }

    function renderControlDetail(control) {
      const box = q("controlDetailPanel");
      if (!box) return;
      if (!control) {
        selectedControlId = null;
        box.innerHTML = "Selecteaza un control de pe harta sau din lista pentru detalii.";
        renderRecent(filteredControls);
        return;
      }

      selectedControlId = String(control.id);
      const color = colorByResult(control.result);
      const category = getControlCategory(control) || "-";
      const domain = getPopupDomain(control) || "-";
      const legalBasis = getLegalBasis(control);
      const fine = getFineAmount(control);
      const damage = getDamageAmount(control);
      const controlDate = firstValue(control, ["data_control", "created_at"]);
      const controlTime = getControlTimeLabel(control);
      const petition = getPetitionNumber(control);
      const confirmation = isPetition(control) ? getPetitionConfirmation(control) : null;
      const privateGrid = isInternalMode ? `
        ${controlDetailField("Entitate", getEntityName(control), "wide")}
        ${controlDetailField("Tip entitate", control.tip_entitate)}
        ${controlDetailField("CUI", control.cui)}
        ${controlDetailField("Inspectori", getInspectorNames(control), "wide")}
        ${getPetitionerName(control) ? controlDetailField("Petitionar", getPetitionerName(control), "wide") : ""}
        ${controlDetailField("Reprezentant", [control.reprezentant_nume, control.reprezentant_calitate].filter(Boolean).join(" - "))}
      ` : "";
      const internalBlocks = isInternalMode ? `
        <div class="control-detail-block">
          <h4>Constatari</h4>
          <p>${escapeHtml(getViolationText(control) || control.constatari || "Fara constatari completate.")}</p>
        </div>
        <div class="control-detail-block">
          <h4>Masuri dispuse</h4>
          <p>${escapeHtml(getMeasuresText(control) || "Fara masuri suplimentare completate.")}</p>
        </div>
        <div class="control-detail-block legal">
          <h4>Baza legala</h4>
          <p>${escapeHtml(legalBasis || (isProblemResult(control.result) ? "Baza legala nu este completata in fisa controlului." : "Nu au fost consemnate sanctiuni sau infractiuni."))}</p>
        </div>
      ` : "";

      box.innerHTML = `
        <article class="control-detail-card">
          <div class="control-detail-head">
            <div class="control-detail-date">
              <strong>${escapeHtml(formatDay(controlDate))}</strong>
              <span>${escapeHtml(controlTime || "ora -")}</span>
            </div>
            <div class="control-detail-title">
              <span>Control #${escapeHtml(control.id || "-")}</span>
              <strong>${escapeHtml(control.control_type || "Control")}</strong>
              <small>${escapeHtml(control.garda || "-")}</small>
            </div>
            <b class="control-detail-result" style="--detail-color:${color};">${escapeHtml(resultLabel(control.result))}</b>
          </div>
          <div class="control-detail-grid">
            ${controlDetailField("Localitate", control.localitate)}
            ${controlDetailField("Reper", control.reper, "wide")}
            ${controlDetailField("Tip operational", getControlModeLabel(control))}
            ${controlDetailField("Domeniu", domain)}
            ${controlDetailField("Categorie", category, "wide")}
            ${controlDetailField("Amenda", formatMoney(fine))}
            ${controlDetailField("Prejudiciu", formatMoney(damage))}
            ${petition ? controlDetailField("Sesizare", petition, "wide") : ""}
            ${confirmation ? `<div><span>Confirmare sesizare</span><b><i class="petition-confirmation mini ${confirmation.className}">${escapeHtml(confirmation.label)}</i></b></div>` : ""}
            ${privateGrid}
          </div>
          ${internalBlocks}
          <div class="control-detail-actions">
            <button class="control-full-open-btn" type="button" data-control-id="${escapeAttr(control.id)}">Deschide fisa completa</button>
          </div>
        </article>
      `;
      renderRecent(filteredControls);
    }

    function renderMapControlPopup(control) {
      const box = q("mapControlPopup");
      if (!box) return;
      if (!control) {
        delete box.dataset.controlId;
        box.classList.add("hidden");
        box.classList.remove("below", "edge-left", "edge-right");
        box.style.left = "";
        box.style.top = "";
        box.style.right = "";
        box.innerHTML = "";
        return;
      }
      const color = colorByResult(control.result);
      const date = formatDate(firstValue(control, ["data_control", "created_at"]));
      const result = resultLabel(control.result);
      const category = getControlCategory(control) || control.control_type || "Control";
      const fine = getFineAmount(control);
      box.dataset.controlId = String(control.id || "");
      box.classList.remove("hidden");
      box.innerHTML = `
        <button class="map-control-popup-close" type="button" title="Inchide popup">x</button>
        <div class="map-control-popup-head">
          <span class="map-control-popup-dot" style="--popup-color:${color}"></span>
          <strong>Control #${escapeHtml(control.id || "-")}</strong>
        </div>
        <div class="map-control-popup-date">${escapeHtml(date)}</div>
        <div class="map-control-popup-row"><span>Rezultat</span><b style="color:${color}">${escapeHtml(result)}</b></div>
        <div class="map-control-popup-row"><span>Garda</span><b>${escapeHtml(control.garda || "-")}</b></div>
        <div class="map-control-popup-row"><span>Localitate</span><b>${escapeHtml(control.localitate || "-")}</b></div>
        ${fine ? `<div class="map-control-popup-row"><span>Amenda</span><b>${escapeHtml(formatMoney(fine))}</b></div>` : ""}
        <div class="map-control-popup-note">${escapeHtml(category)}</div>
      `;
      requestAnimationFrame(() => updateMapControlPopupPosition());
    }

    function updateMapControlPopupPosition() {
      const box = q("mapControlPopup");
      if (!box || box.classList.contains("hidden") || !map) return;
      const control = getControlById(box.dataset.controlId || selectedPopupControlId);
      if (!control) return;
      const marker = getControlMarker(control.id);
      if (!marker) return;
      const point = map.latLngToContainerPoint(marker.getLatLng());
      const mapEl = q("map");
      if (!mapEl) return;
      const margin = 12;
      const gap = 18;
      const mapWidth = mapEl.clientWidth || 0;
      const mapHeight = mapEl.clientHeight || 0;
      const width = box.offsetWidth || 245;
      const height = box.offsetHeight || 160;
      let left = point.x - width / 2;
      let top = point.y - height - gap;
      let below = false;
      if (top < margin) {
        top = point.y + gap;
        below = true;
      }
      const maxLeft = Math.max(margin, mapWidth - width - margin);
      const maxTop = Math.max(margin, mapHeight - height - margin);
      const unclampedLeft = left;
      left = Math.min(Math.max(left, margin), maxLeft);
      top = Math.min(Math.max(top, margin), maxTop);
      box.classList.toggle("below", below);
      box.classList.toggle("edge-left", left > unclampedLeft + 8);
      box.classList.toggle("edge-right", left < unclampedLeft - 8);
      box.style.left = `${Math.round(left)}px`;
      box.style.top = `${Math.round(top)}px`;
      box.style.right = "auto";
      const anchorX = Math.min(Math.max(point.x - left, 22), width - 22);
      box.style.setProperty("--popup-anchor-x", `${Math.round(anchorX)}px`);
    }

    function openControlDetail(controlId, options = {}) {
      const control = getControlById(controlId);
      if (!control) return;
      selectedControlId = String(control.id);
      selectedPopupControlId = String(control.id);
      if (options.focusMap) focusControlOnMap(controlId);
      openControlFullModal(controlId);
    }

    function clearControlDetail() {
      selectedPopupControlId = null;
      if (map) map.closePopup();
      closeControlFullModal();
    }

    function excelCell(value) {
      const text = String(value ?? "").replace(/\s+/g, " ").trim();
      return /^[=+\-@]/.test(text) ? "'" + text : text;
    }

    function exportFilteredControlsExcel() {
      const rows = filteredControls || [];
      if (!rows.length) {
        setMessage("Nu exista controale de exportat in filtrele active.", false);
        return;
      }
      const columns = [
        ["id", "ID"],
        ["created_at", "Data incarcare"],
        ["data_control", "Data control"],
        ["garda", "Garda"],
        ["judet", "Judet"],
        ["localitate", "Localitate"],
        ["control_type", "Tip control"],
        ["categorie", "Categorie"],
        ["domeniu", "Domeniu"],
        ["result", "Rezultat"],
        ["amenda", "Amenda lei"],
        ["prejudiciu", "Prejudiciu lei"],
        ["sesizare", "Nr sesizare"]
      ];
      if (isInternalMode) {
        columns.push(
          ["entitate", "Entitate controlata"],
          ["inspectori", "Inspectori"],
          ["petitionar", "Petitionar"],
          ["constatari", "Constatari"],
          ["masuri", "Masuri"],
          ["baza_legala", "Baza legala"]
        );
      }
      const valueFor = (c, key) => ({
        id: c.id,
        created_at: formatDate(c.created_at),
        data_control: formatDay(firstValue(c, ["data_control", "created_at"])),
        garda: c.garda,
        judet: c.judet,
        localitate: c.localitate,
        control_type: c.control_type,
        categorie: getControlCategory(c),
        domeniu: getPopupDomain(c),
        result: resultLabel(c.result),
        amenda: getFineAmount(c),
        prejudiciu: getDamageAmount(c),
        sesizare: getPetitionNumber(c),
        entitate: getEntityName(c),
        inspectori: getInspectorNames(c),
        petitionar: getPetitionerName(c),
        constatari: getViolationText(c) || c.constatari,
        masuri: getMeasuresText(c),
        baza_legala: getLegalBasis(c)
      })[key];
      const tableRows = [
        `<tr>${columns.map(([, label]) => `<th>${escapeHtml(label)}</th>`).join("")}</tr>`,
        ...rows.map(c => `<tr>${columns.map(([key]) => `<td>${escapeHtml(excelCell(valueFor(c, key)))}</td>`).join("")}</tr>`)
      ].join("");
      const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"></head><body><table>${tableRows}</table></body></html>`;
      const blob = new Blob([html], { type: "application/vnd.ms-excel;charset=utf-8" });
      const a = document.createElement("a");
      const stamp = new Date().toISOString().slice(0, 10);
      a.href = URL.createObjectURL(blob);
      a.download = `controale_gfn_${stamp}.xls`;
      document.body.appendChild(a);
      a.click();
      URL.revokeObjectURL(a.href);
      a.remove();
      setMessage(`Export Excel generat: ${rows.length} controale.`, true);
    }

    function reportStatusLabel(item) {
      if (!item) return "-";
      if (getControlHasReport(item)) return "Finalizat";
      const days = getControlDaysToReport(item);
      if (Number(days) > 10 || item.response_time_level === "red" || item.deadline_status === "intarziat") return "Intarziat";
      if (Number(days) > 5 || item.response_time_level === "yellow" || item.deadline_status === "atentie") return "Atentie";
      return "In termen";
    }

    function reportStatusClass(item) {
      if (!item) return "pending";
      if (getControlHasReport(item)) return "done";
      const days = getControlDaysToReport(item);
      if (Number(days) > 10 || item.response_time_level === "red" || item.deadline_status === "intarziat") return "late";
      if (Number(days) > 5 || item.response_time_level === "yellow" || item.deadline_status === "atentie") return "warn";
      return "ok";
    }

    function reportControlFromWorkflowItem(item) {
      if (!item) return null;
      return allControls.find(c => String(c.id) === String(item.id)) || item;
    }

    function mergeReportWorkflowItem(item) {
      if (!item) return;
      const control = allControls.find(c => String(c.id) === String(item.id));
      if (!control) return;
      [
        "report_status",
        "deadline_status",
        "days_since_field",
        "days_to_report",
        "has_report",
        "response_time_level",
        "field_submitted_at",
        "is_overdue",
        "report_uploaded_at",
        "report_original_filename",
        "report_number",
        "report_date",
        "report_notes",
        "report_url"
      ].forEach(key => { control[key] = item[key]; });
    }

    function getReportsWorkflowQuery() {
      const params = new URLSearchParams();
      const status = safeValue("reportWorkflowStatus", "toate");
      const period = safeValue("reportWorkflowPeriod", "toate");
      const garda = safeValue("reportWorkflowGarda", "");
      const from = safeValue("reportWorkflowDateFrom", "");
      const to = safeValue("reportWorkflowDateTo", "");
      if (status && status !== "toate") params.set("status", status);
      if (isAdminUser() && garda) params.set("garda", garda);
      if (period !== "toate" && from) params.set("date_from", from);
      if (period !== "toate" && to) params.set("date_to", to);
      return params.toString();
    }

    function setReportWorkflowPeriodDates(value) {
      const from = q("reportWorkflowDateFrom");
      const to = q("reportWorkflowDateTo");
      if (!from || !to) return;
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      if (value === "custom") return;
      if (value === "toate") {
        from.value = "";
        to.value = "";
      } else {
        const start = new Date(today);
        start.setDate(start.getDate() - Number(value || 90));
        from.value = formatDateInput(start);
        to.value = formatDateInput(today);
      }
    }

    function applyReportWorkflowPeriod(value) {
      setReportWorkflowPeriodDates(value);
      loadReportWorkflowItems(true);
    }

    function markReportWorkflowCustomPeriod() {
      if (q("reportWorkflowPeriod")) q("reportWorkflowPeriod").value = "custom";
      loadReportWorkflowItems(true);
    }

    function ensureReportWorkflowPeriodDefault() {
      if (!q("reportWorkflowPeriod") || safeValue("reportWorkflowDateFrom") || safeValue("reportWorkflowDateTo")) return;
      setReportWorkflowPeriodDates(safeValue("reportWorkflowPeriod", "90") || "90");
    }

    function resetReportWorkflowFilters() {
      if (q("reportWorkflowStatus")) q("reportWorkflowStatus").value = "toate";
      if (q("reportWorkflowPeriod")) q("reportWorkflowPeriod").value = "90";
      if (q("reportWorkflowGarda")) q("reportWorkflowGarda").value = "";
      if (q("reportWorkflowSearch")) q("reportWorkflowSearch").value = "";
      setReportWorkflowPeriodDates("90");
      loadReportWorkflowItems(true);
    }

    async function loadReportWorkflowItems(force = false) {
      if (!isInternalMode || !token) return;
      if (reportWorkflowLoaded && !force) return renderReportsWorkflowView();
      setHtml("reportWorkflowTable", `<div class="empty">Se incarca lista rapoartelor.</div>`);
      try {
        const query = getReportsWorkflowQuery();
        const res = await fetch("/controls/my-reports" + (query ? "?" + query : ""), { headers: authHeaders() });
        if (!res.ok) {
          let detail = "Nu s-au putut incarca rapoartele.";
          try { const err = await res.json(); detail = err.detail || detail; } catch {}
          throw new Error(detail);
        }
        reportWorkflowItems = await res.json();
        reportWorkflowLoaded = true;
        populateReportWorkflowAdminFilters();
        renderReportsWorkflowView();
      } catch (err) {
        setHtml("reportWorkflowTable", `<div class="empty">${escapeHtml(err.message || "Eroare la incarcarea rapoartelor.")}</div>`);
      }
    }

    function populateReportWorkflowAdminFilters() {
      const gardaSelect = q("reportWorkflowGarda");
      if (gardaSelect && !gardaSelect.dataset.ready) {
        const guards = [...new Set(allControls.map(c => c.garda).filter(Boolean))].sort();
        gardaSelect.innerHTML = `<option value="">Toate garzile</option>` + guards.map(g => `<option value="${escapeAttr(g)}">${escapeHtml(g)}</option>`).join("");
        gardaSelect.dataset.ready = "1";
      }
      const adminFilters = document.querySelectorAll(".report-admin-filter");
      const adminView = isAdminUser();
      adminFilters.forEach(el => el.style.display = adminView ? "" : "none");
      q("inspectorReportsSection")?.classList.toggle("report-admin-view", adminView);
    }

    const REPORT_TIME_PALETTE = quantitativePaletteForMetric("reportAvgDays");

    function reportFieldStart(item) {
      const raw = firstValue(item, ["field_submitted_at", "data_control", "created_at"]);
      if (!raw) return null;
      const value = new Date(raw);
      return isNaN(value) ? null : value;
    }

    function reportElaborationDays(item) {
      if (!item || !item.report_uploaded_at) return null;
      const start = reportFieldStart(item);
      const uploaded = new Date(item.report_uploaded_at);
      if (!start || isNaN(uploaded)) return null;
      return Math.max(0, (uploaded.getTime() - start.getTime()) / 86400000);
    }

    function reportInspectorNames(item) {
      const team = Array.isArray(item && item.echipa) ? item.echipa : [];
      const names = team.map(member => String(member && (member.nume || member.email) || "").trim()).filter(Boolean);
      return [...new Set(names)];
    }

    function getFilteredReportWorkflowItems(items) {
      const term = normalizeText(safeValue("reportWorkflowSearch", ""));
      if (!term) return [...(items || [])];
      return (items || []).filter(item => {
        const id = normalizeText(String(item.id || ""));
        const inspectors = normalizeText(reportInspectorNames(item).join(" "));
        return id.includes(term) || inspectors.includes(term);
      });
    }

    function reportWorkflowAverageDays(items) {
      const values = (items || []).map(reportElaborationDays).filter(Number.isFinite);
      return formatDays(values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null);
    }

    function renderReportsWorkflowKpis(items) {
      const missing = items.filter(x => !getControlHasReport(x)).length;
      const overdue = items.filter(x => !getControlHasReport(x) && Number(getControlDaysToReport(x)) > 10).length;
      const finished = items.filter(getControlHasReport).length;
      const completionRate = items.length ? (finished / items.length) * 100 : 0;
      setText("reportKpiMissing", missing);
      setText("reportKpiOverdue", overdue);
      setText("reportKpiAverage", reportWorkflowAverageDays(items));
      setText("reportKpiCompletionRate", completionRate.toFixed(1) + "%");
    }

    function reportTimeColor(value, min, max) {
      if (!Number.isFinite(Number(value))) return "#153d35";
      return quantitativeColor(value, min, max, true);
    }

    function buildReportInspectorMetrics(items) {
      const metrics = {};
      (items || []).forEach(item => {
        const names = reportInspectorNames(item);
        (names.length ? names : ["Inspector neprecizat"]).forEach(name => {
          if (!metrics[name]) metrics[name] = { name, total: 0, missing: 0, overdue: 0, finished: 0, days: [] };
          const row = metrics[name];
          row.total += 1;
          if (getControlHasReport(item)) {
            row.finished += 1;
            const days = reportElaborationDays(item);
            if (Number.isFinite(days)) row.days.push(days);
          } else {
            row.missing += 1;
            if (Number(getControlDaysToReport(item)) > 10) row.overdue += 1;
          }
        });
      });
      return Object.values(metrics).map(row => ({
        ...row,
        average: row.days.length ? row.days.reduce((sum, value) => sum + value, 0) / row.days.length : null,
        completionRate: row.total ? (row.finished / row.total) * 100 : 0
      })).sort((a, b) => b.overdue - a.overdue || b.missing - a.missing || b.total - a.total || a.name.localeCompare(b.name, "ro"));
    }

    function renderReportInspectorMetrics(items) {
      const rows = buildReportInspectorMetrics(items);
      if (!rows.length) {
        setHtml("reportInspectorMetrics", `<div class="empty">Nu exista inspectori in selectia curenta.</div>`);
        return;
      }
      setHtml("reportInspectorMetrics", rows.map(row => `
        <article class="report-inspector-row">
          <div class="report-inspector-name"><strong title="${escapeAttr(row.name)}">${escapeHtml(row.name)}</strong><small>${row.total} controale</small></div>
          <div><span>Timp mediu</span><b>${escapeHtml(formatDays(row.average))}</b></div>
          <div><span>Fara raport</span><b>${row.missing}</b></div>
          <div><span>&gt;10 zile</span><b class="${row.overdue ? "is-late" : ""}">${row.overdue}</b></div>
          <div><span>Finalizate</span><b>${row.completionRate.toFixed(1)}%</b></div>
        </article>
      `).join(""));
    }

    function initReportStatsMap() {
      if (reportStatsMap || !q("reportStatsMap")) return;
      reportStatsMap = L.map("reportStatsMap", {
        zoomControl: false,
        attributionControl: false,
        dragging: true,
        scrollWheelZoom: false
      }).setView([45.8, 24.9], 6);
      L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
        attribution: "&copy; OpenStreetMap contributors &copy; CARTO",
        subdomains: "abcd",
        maxZoom: 20
      }).addTo(reportStatsMap);
      L.control.zoom({ position: "topright" }).addTo(reportStatsMap);
    }

    async function ensureReportStatsGeoJson() {
      if (guardStatsGeoJson) return guardStatsGeoJson;
      try {
        const response = await fetch("/ui/gfn_garzi.geojson?v=" + Date.now());
        if (!response.ok) return null;
        guardStatsGeoJson = await response.json();
        return guardStatsGeoJson;
      } catch (error) {
        console.warn("Limitele garzilor nu au putut fi incarcate pentru rapoarte:", error);
        return null;
      }
    }

    async function renderReportStatsMap(items) {
      if (currentView !== "inspectori" || inspectorSection !== "reports" || !q("reportStatsMap")) return;
      const geoJson = await ensureReportStatsGeoJson();
      if (!geoJson) return;
      initReportStatsMap();
      if (!reportStatsMap) return;

      const groups = {};
      (items || []).forEach(item => {
        const days = reportElaborationDays(item);
        const key = canonicalGuardName(item.garda);
        if (!key || !Number.isFinite(days)) return;
        if (!groups[key]) groups[key] = [];
        groups[key].push(days);
      });
      const averages = Object.fromEntries(Object.entries(groups).map(([key, values]) => [key, values.reduce((sum, value) => sum + value, 0) / values.length]));
      const range = getQuantitativeRange(Object.values(averages));

      if (reportStatsLayer) reportStatsMap.removeLayer(reportStatsLayer);
      reportStatsLayer = L.geoJSON(geoJson, {
        style: feature => {
          const key = canonicalGuardName(getGuardNameFromFeature(feature));
          const value = averages[key];
          const hasValue = Number.isFinite(value);
          return {
            color: hasValue ? "rgba(233,255,247,.92)" : "rgba(153,205,188,.38)",
            weight: hasValue ? 2 : 1,
            fillColor: hasValue ? reportTimeColor(value, range.min, range.max) : "#153d35",
            fillOpacity: hasValue ? .78 : .18
          };
        },
        onEachFeature: (feature, layer) => {
          const name = getGuardNameFromFeature(feature);
          const value = averages[canonicalGuardName(name)];
          const count = (groups[canonicalGuardName(name)] || []).length;
          layer.bindTooltip(`<div class="report-map-tooltip"><strong>${escapeHtml(name)}</strong><span>${Number.isFinite(value) ? `${escapeHtml(formatDays(value))} · ${count} rapoarte` : "Date indisponibile"}</span></div>`, { sticky: true, direction: "auto" });
        }
      }).addTo(reportStatsMap);
      try { reportStatsMap.fitBounds(reportStatsLayer.getBounds(), { padding: [14, 14] }); } catch {}
      const legend = q("reportStatsLegend");
      if (legend) {
        legend.innerHTML = `<span>Timp mic</span><i style="background:linear-gradient(90deg,${REPORT_TIME_PALETTE.join(",")})"></i><span>Timp mare</span>`;
      }
      setTimeout(() => reportStatsMap.invalidateSize(), 100);
    }

    function renderReportsWorkflowTable(items) {
      if (!items.length) {
        setHtml("reportWorkflowTable", `<div class="empty">Nu exista controale pentru filtrele selectate.</div>`);
        setText("reportWorkflowCount", "0 controale");
        return;
      }
      setText("reportWorkflowCount", items.length + " controale");
      const rows = items.map(item => {
        const statusClass = reportStatusClass(item);
        const control = reportControlFromWorkflowItem(item);
        const hasReport = getControlHasReport(item);
        const elaborationDays = reportElaborationDays(item);
        const pendingRaw = getControlDaysToReport(item);
        const pendingDays = pendingRaw === null || pendingRaw === undefined ? null : Number(pendingRaw);
        const timeText = Number.isFinite(elaborationDays)
          ? formatDays(elaborationDays)
          : (Number.isFinite(pendingDays) ? `${Math.max(0, pendingDays)} zile in asteptare` : "-");
        const inspectors = reportInspectorNames(item);
        const focusClass = String(item.id) === String(reportWorkflowFocusId) ? " report-row-focus" : "";
        return `<tr class="report-row ${statusClass}${focusClass}" data-control-id="${escapeAttr(item.id)}" role="button" tabindex="0" aria-label="Deschide fisa controlului ${escapeAttr(item.id)}">
          <td><b class="report-control-id">#${escapeHtml(item.id)}</b></td>
          <td><span class="report-inspector-cell" title="${escapeAttr(inspectors.join(", ") || "Inspector neprecizat")}">${escapeHtml(inspectors.join(", ") || "Inspector neprecizat")}</span></td>
          <td>${escapeHtml(item.garda || "-")}</td>
          <td>${escapeHtml(formatDay(item.field_submitted_at || item.data_control || item.created_at))}</td>
          <td><span class="report-time-value ${!hasReport && pendingDays > 10 ? "late" : ""}">${escapeHtml(timeText)}</span></td>
          <td><span class="report-status ${statusClass}">${escapeHtml(reportStatusLabel(item))}</span></td>
          <td>
            <div class="report-actions">
              ${hasReport
                ? `<button class="report-open-pdf-btn" type="button" data-control-id="${escapeAttr(item.id)}">Deschide PDF</button>`
                : `<button class="report-upload-open-btn" type="button" data-control-id="${escapeAttr(item.id)}">Incarca PDF</button>`}
            </div>
          </td>
          <td>${control ? `<button class="secondary report-open-sheet-btn" type="button" data-control-id="${escapeAttr(item.id)}">Vezi fisa</button>` : "-"}</td>
        </tr>`;
      }).join("");
      setHtml("reportWorkflowTable", `<table class="report-workflow-table">
        <thead><tr><th>ID control</th><th>Inspector</th><th>Garda</th><th>Data teren</th><th>Timp raport</th><th>Status</th><th>Raport</th><th>Detalii</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>`);
      if (reportWorkflowFocusId) {
        setTimeout(() => {
          const row = [...document.querySelectorAll(".report-row[data-control-id]")]
            .find(el => el.dataset.controlId === String(reportWorkflowFocusId));
          if (row) row.scrollIntoView({ behavior: "smooth", block: "center" });
        }, 90);
      }
    }

    function renderReportsWorkflowView() {
      if (!isInternalMode) return;
      syncInspectorSectionUi();
      populateReportWorkflowAdminFilters();
      if (!reportWorkflowLoaded) {
        ensureReportWorkflowPeriodDefault();
        loadReportWorkflowItems(false);
        return;
      }
      const visibleItems = getFilteredReportWorkflowItems(reportWorkflowItems);
      setText("reportWorkflowTitle", "Rapoarte de control");
      setText("reportWorkflowSubtitle", isAdminUser()
        ? "Situatia nationala a elaborarii si incarcarii rapoartelor PDF."
        : "Controalele efectuate de tine si rapoartele care trebuie incarcate.");
      renderReportsWorkflowKpis(visibleItems);
      renderReportInspectorMetrics(visibleItems);
      renderReportsWorkflowTable(visibleItems);
      renderReportStatsMap(visibleItems);
    }

    function openReportUploadModal(controlId) {
      const item = reportWorkflowItems.find(x => String(x.id) === String(controlId)) || allControls.find(c => String(c.id) === String(controlId));
      if (!item) return;
      const modal = q("reportUploadModal");
      if (!modal) return;
      modal.innerHTML = `<div class="report-upload-backdrop"></div>
        <article class="report-upload-shell" role="dialog" aria-modal="true">
          <header class="report-upload-head">
            <div>
              <p>Control #${escapeHtml(item.id || "-")}</p>
              <h2>Incarca raportul de control</h2>
              <span>${escapeHtml([item.garda, item.localitate, formatDay(item.data_control)].filter(Boolean).join(" - "))}</span>
            </div>
            <button class="report-upload-close" type="button" aria-label="Inchide">x</button>
          </header>
          <form id="reportUploadForm" class="report-upload-form" data-control-id="${escapeAttr(item.id)}">
            <div class="report-upload-summary">
              <div><span>ID control</span><b>#${escapeHtml(item.id || "-")}</b></div>
              <div><span>Data teren</span><b>${escapeHtml(formatDay(item.data_control))}</b></div>
              <div><span>Garda</span><b>${escapeHtml(item.garda || "-")}</b></div>
              <div><span>Localitate</span><b>${escapeHtml(item.localitate || "-")}</b></div>
              <div class="wide"><span>Entitate</span><b>${escapeHtml(item.entitate_controlata || "-")}</b></div>
            </div>
            <label>Fisier PDF scanat<input id="reportUploadFile" name="file" type="file" accept="application/pdf,.pdf" required /></label>
            <label>Numar raport<input id="reportUploadNumber" name="report_number" type="text" required placeholder="Ex: 1234/2026" /></label>
            <label>Data raportului<input id="reportUploadDate" name="report_date" type="date" required value="${escapeAttr(formatDateInput(new Date()))}" /></label>
            <label>Observatii optionale<textarea id="reportUploadNotes" name="report_notes" rows="3" placeholder="Observatii interne, daca sunt necesare"></textarea></label>
            <div id="reportUploadMessage" class="tiny"></div>
            <footer>
              <button class="secondary report-upload-close" type="button">Renunta</button>
              <button type="submit">Finalizeaza controlul</button>
            </footer>
          </form>
        </article>`;
      modal.classList.remove("hidden");
      document.body.classList.add("control-full-open");
    }

    function closeReportUploadModal() {
      const modal = q("reportUploadModal");
      if (modal) modal.classList.add("hidden");
      document.body.classList.remove("control-full-open");
    }

    async function submitReportUpload(form) {
      const controlId = form.dataset.controlId;
      const fileInput = q("reportUploadFile");
      const msg = q("reportUploadMessage");
      if (!fileInput || !fileInput.files || !fileInput.files[0]) {
        if (msg) msg.textContent = "Alege fisierul PDF.";
        return;
      }
      const file = fileInput.files[0];
      if (!file.name.toLowerCase().endsWith(".pdf")) {
        if (msg) msg.textContent = "Se accepta doar PDF.";
        return;
      }
      const fd = new FormData(form);
      try {
        if (msg) msg.textContent = "Se incarca raportul...";
        const res = await fetch(`/controls/${encodeURIComponent(controlId)}/report`, {
          method: "POST",
          headers: authHeaders(),
          body: fd
        });
        if (!res.ok) {
          let detail = "Upload esuat.";
          try { const err = await res.json(); detail = err.detail || detail; } catch {}
          throw new Error(detail);
        }
        const item = await res.json();
        mergeReportWorkflowItem(item);
        reportWorkflowLoaded = false;
        closeReportUploadModal();
        await loadReportWorkflowItems(true);
        const control = getControlById(controlId);
        if (control && q("controlFullModal") && !q("controlFullModal").classList.contains("hidden")) {
          renderControlFullModal(control);
        }
        setMessage("Raport PDF incarcat. Controlul este finalizat administrativ.", true);
      } catch (err) {
        if (msg) msg.textContent = err.message || "Upload esuat.";
      }
    }

    async function openControlReportPdf(controlId) {
      if (!token) return setMessage("Autentificare necesara pentru PDF.", false);
      try {
        const res = await fetch(`/controls/${encodeURIComponent(controlId)}/report`, { headers: authHeaders() });
        if (!res.ok) {
          let detail = "Nu s-a putut deschide PDF-ul.";
          try { const err = await res.json(); detail = err.detail || detail; } catch {}
          throw new Error(detail);
        }
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        window.open(url, "_blank", "noopener");
        setTimeout(() => URL.revokeObjectURL(url), 60000);
      } catch (err) {
        setMessage(err.message || "Nu s-a putut deschide PDF-ul.", false);
      }
    }

    function renderLoggedAccount() {
      const box = q("loggedBox");
      if (!box) return;
      const email = q("loggedUser") ? q("loggedUser").textContent : "Inspector General";
      const updated = q("lastUpdate") ? q("lastUpdate").textContent : "-";
      box.innerHTML = `
        <div class="account-strip">
          <div class="account-avatar">IG</div>
          <div style="min-width:0;">
            <div class="account-title">Cont intern GFN</div>
            <div class="account-email">${escapeHtml(email)}</div>
            <div class="account-update">actualizat: <span id="lastUpdateInline">${escapeHtml(updated)}</span></div>
          </div>
        </div>
        <div class="account-actions">
          <button class="secondary logout-mini" onclick="logout()">Iesire</button>
          <button class="secondary reload-mini" onclick="loadControls()">Reincarca</button>
        </div>
      `;
      box.style.setProperty("display", "block", "important");
    }

    function focusControl(controlId) {
      const control = allControls.find(c => String(c.id) === String(controlId));
      if (!control || !map) return;
      setView("map");
      selectedPopupControlId = String(controlId);
      setTimeout(() => {
        if (!focusControlOnMap(controlId)) {
          console.warn("Marker inexistent pentru controlul selectat:", { id: controlId, control });
        }
      }, 120);
    }

    function focusInspectorControlOnMap(controlId) {
      const control = getControlById(controlId);
      if (!control || !map) return false;
      const point = getControlDisplayLatLng(control);
      if (!point) return false;

      setView("map");
      setTimeout(() => {
        map.flyTo([point.lat, point.lon], Math.max(map.getZoom(), 12), { duration: 0.55 });
        setTimeout(() => {
          renderMarkers(mapRenderControls.length ? mapRenderControls : filteredControls);
          if (inspectorFocusMarker && map.hasLayer(inspectorFocusMarker)) map.removeLayer(inspectorFocusMarker);
          const color = colorByResult(control.result);
          inspectorFocusMarker = L.circleMarker([point.lat, point.lon], {
            pane: "controlsPane",
            radius: 8,
            color: "#ffffff",
            weight: 2,
            opacity: 1,
            fillColor: color,
            fillOpacity: .96,
            bubblingMouseEvents: false,
            className: "control-point selected-control-marker"
          });
          bindControlPopup(inspectorFocusMarker, control, color);
          inspectorFocusMarker.addTo(map);
          selectedPopupControlId = String(controlId);
          map.panTo(inspectorFocusMarker.getLatLng(), { animate: false });
          setTimeout(() => inspectorFocusMarker && inspectorFocusMarker.openPopup(), 80);
        }, 760);
      }, 80);
      return true;
    }

    function focusControlOnMap(controlId) {
      const control = getControlById(controlId);
      if (!control || !map) return false;

      const openExisting = () => {
        const marker = getControlMarker(controlId);
        if (!marker) return false;
        const ll = marker.getLatLng();
        map.flyTo(ll, Math.max(map.getZoom(), 12), { duration: 0.55 });
        setTimeout(() => {
          const activeMarker = getControlMarker(controlId);
          if (activeMarker) activeMarker.openPopup();
        }, 600);
        return true;
      };

      if (openExisting()) return true;

      const point = getControlDisplayLatLng(control);
      if (!point) return false;

      map.flyTo([point.lat, point.lon], Math.max(map.getZoom(), 12), { duration: 0.55 });
      clearTimeout(markerRenderTimer);
      markerRenderTimer = setTimeout(() => {
        renderMarkers(mapRenderControls.length ? mapRenderControls : filteredControls);
        const marker = getControlMarker(controlId);
        if (marker) marker.openPopup();
      }, 680);

      return true;
    }

    function controlMarkerIcon(color) {
      return L.divIcon({
        className: "control-marker-icon",
        html: `<span class="control-marker-dot" style="--dot-color:${color}"></span>`,
        iconSize: [30, 30],
        iconAnchor: [15, 15],
        popupAnchor: [0, -14]
      });
    }

    function reopenSelectedControlPopup(delay = 0) {
      if (!selectedPopupControlId || currentView !== "map") return;
      setTimeout(() => {
        const marker = getControlMarker(selectedPopupControlId);
        try {
          if (marker) openMarkerPopup(marker, selectedPopupControlId);
          updateMapControlPopupPosition();
        } catch {}
      }, delay);
    }

    function getClusterStats(controls) {
      const total = controls.length || 0;
      const problems = controls.filter(c => isProblemResult(c.result)).length;
      const warnings = controls.filter(c => c.result === "avertisment").length;
      const sanctions = controls.filter(c => c.result === "sanctiune").length;
      const penal = controls.filter(c => c.result === "sesizare_penala").length;
      const problemRate = total ? problems / total : 0;
      const seriousRate = total ? (sanctions + penal) / total : 0;
      return { total, problems, warnings, sanctions, penal, problemRate, seriousRate };
    }

    function getClusterTone(controls) {
      const s = getClusterStats(controls);
      if (s.total === 0) return "normal";
      // Pastram cromatica mai aproape de dashboard: verde/teal pentru activitate,
      // amber pentru atentie si rosu doar cand ponderea problemelor este cu adevarat mare.
      if (s.problemRate >= 0.45 || s.seriousRate >= 0.28) return "critical";
      if (s.problemRate >= 0.25 || s.seriousRate >= 0.14) return "warning";
      if (s.problemRate >= 0.10) return "watch";
      return "normal";
    }

    function getGuardClusterTitle(bucket) {
      const label = bucket && bucket.label ? String(bucket.label) : "Garda";
      return label.replace(/^Garda Forestiera\s*/i, "GF ").replace("Ramnicu-Valcea", "R. Valcea").toUpperCase();
    }

    function controlClusterIcon(count, level = "local", controls = [], label = "") {
      const diameter = level === "guard"
        ? Math.max(58, Math.min(86, Math.round(54 + Math.sqrt(count) * 1.35)))
        : Math.max(34, Math.min(66, Math.round(30 + Math.sqrt(count) * 2.0)));
      const tone = getClusterTone(controls);
      const stats = getClusterStats(controls);
      const shown = count > 999 ? (Math.round(count / 100) / 10) + "k" : String(count);
      const title = level === "guard" && label ? escapeHtml(label) : "";
      const sub = stats.problems > 0 ? `${stats.problems} probleme` : "controale";
      const html = level === "guard"
        ? `<div class="gfn-cluster-inner" style="--cluster-size:${diameter}px"><em>${title}</em><strong>${shown}</strong><small>${sub}</small></div>`
        : `<div class="gfn-cluster-inner" style="--cluster-size:${diameter}px"><strong>${shown}</strong><small>${sub}</small></div>`;
      return L.divIcon({
        html,
        className: `gfn-grid-cluster gfn-grid-cluster-${tone} gfn-grid-cluster-${level}`,
        iconSize: L.point(diameter, diameter),
        iconAnchor: [diameter / 2, diameter / 2]
      });
    }

    function bindControlPopup(marker, c, color) {
      const category = getPopupCategory(c);
      const domain = getPopupDomain(c);
      const mode = getControlModeLabel(c);
      const fine = getFineAmount(c);
      const damage = getDamageAmount(c);
      const legalBasis = getLegalBasis(c);
      const violation = getViolationText(c) || c.constatari;
      const privateRows = isInternalMode ? `
          ${makePopupRow("Entitate", getEntityName(c) || "-")}
          ${makePopupRow("Inspectori", getInspectorNames(c))}
          ${getPetitionerName(c) ? makePopupRow("Petitionar", getPetitionerName(c)) : ""}
          ${violation ? makePopupRow("Constatari", violation) : ""}
          ${legalBasis ? makePopupRow("Baza legala", legalBasis) : ""}
        ` : "";
      marker.bindPopup(`<div class="control-popup-card">
        <div class="popup-title-row">
          <span class="popup-status-dot" style="--popup-color:${color}"></span>
          <div>
            <div class="popup-title">Control #${escapeHtml(c.id || "-")}</div>
            <div class="popup-date">${escapeHtml(formatDate(firstValue(c, ["data_control", "created_at"])))}</div>
          </div>
        </div>
        <table class="popup-table">
          ${makePopupRow("Tip", c.control_type || "-")}
          ${mode ? makePopupRow("Mod", mode) : ""}
          ${domain ? makePopupRow("Domeniu", domain) : ""}
          ${category ? makePopupRow("Categorie", category) : ""}
          <tr><td class="popup-label">Rezultat</td><td class="popup-value" style="color:${color};font-weight:950;">${escapeHtml(resultLabel(c.result))}</td></tr>
          ${makePopupRow("Garda", c.garda || "-")}
          ${makePopupRow("Localitate", c.localitate || "-")}
          ${getPetitionNumber(c) ? makePopupRow("Sesizare", getPetitionNumber(c)) : ""}
          ${privateRows}
          ${fine ? makePopupRow("Amenda", formatMoney(fine)) : ""}
          ${damage ? makePopupRow("Prejudiciu", formatMoney(damage)) : ""}
        </table><button class="popup-detail-btn" type="button" data-control-id="${escapeAttr(c.id)}">Deschide fisa controlului</button></div>`, {
        autoClose: true,
        closeOnClick: false,
        closeButton: true,
        keepInView: false,
        autoPan: true,
        className: "control-popup-compact",
        minWidth: 245,
        maxWidth: 380
      });
      marker.on("popupopen", () => {
        selectedPopupControlId = String(c.id);
        if (marker.getElement) marker.getElement()?.classList.add("selected-control-marker");
      });
      marker.on("popupclose", () => {
        if (!isRenderingMarkers && String(selectedPopupControlId) === String(c.id)) selectedPopupControlId = null;
        if (marker.getElement) marker.getElement()?.classList.remove("selected-control-marker");
      });
    }

    function markControlElement(marker, controlId) {
      const el = marker && marker.getElement ? marker.getElement() : null;
      if (!el) return;
      el.dataset.controlId = String(controlId);
      el.setAttribute("role", "button");
      el.setAttribute("aria-label", `Deschide control ${controlId}`);
      el.title = "Click pentru popup control";
      if (String(selectedPopupControlId) === String(controlId)) el.classList.add("selected-control-marker");
    }

    function openMarkerPopup(marker, controlId) {
      if (!marker) return;
      const open = () => {
        try {
          marker.openPopup();
          markControlElement(marker, controlId);
        } catch {}
      };
      open();
    }

    function selectMapControl(controlId, marker = null) {
      const control = getControlById(controlId);
      if (!control) return;
      selectedPopupControlId = String(controlId);
      const activeMarker = marker || getControlMarker(controlId);
      if (activeMarker) openMarkerPopup(activeMarker, controlId);
    }

    function getControlDisplayLatLng(control) {
      return normalizeControlCoordinates(control);
    }

    function controlMapButtonAttributes(control) {
      return getControlDisplayLatLng(control)
        ? ""
        : ' disabled aria-disabled="true" title="Coordonate GPS indisponibile"';
    }

    function markerRadiusByResult(result) {
      return ({
        conform: 4.2,
        avertisment: 5.2,
        sanctiune: 5.8,
        neconform: 6.2,
        sesizare_penala: 6.8
      })[result] || 5;
    }

    function markerFillOpacityByResult(result) {
      return result === "conform" ? 0.58 : 0.82;
    }

    function markerStrokeOpacityByResult(result) {
      return result === "conform" ? 0.62 : 0.86;
    }


    function addControlPoint(c) {
      const point = getControlDisplayLatLng(c);
      if (!point) return null;

      const color = colorByResult(c.result);
      const radius = markerRadiusByResult(c.result);
      const fillOpacity = markerFillOpacityByResult(c.result);
      const strokeOpacity = markerStrokeOpacityByResult(c.result);

      const marker = L.circleMarker([point.lat, point.lon], {
        pane: "controlsPane",
        radius,
        color,
        weight: c.result === "conform" ? 0.9 : 1.15,
        opacity: strokeOpacity,
        fillColor: color,
        fillOpacity,
        bubblingMouseEvents: false,
        className: isProblemResult(c.result) ? "control-point control-point-problem" : "control-point"
      });

      setControlMarker(c.id, marker);
      bindControlPopup(marker, c, color);

      marker.on("mouseover", () => {
        marker.setStyle({
          radius: radius + 2,
          weight: 1.45,
          opacity: 1,
          fillOpacity: 0.96
        });
        if (marker.bringToFront) marker.bringToFront();
      });

      marker.on("mouseout", () => {
        marker.setStyle({
          radius,
          weight: c.result === "conform" ? 0.9 : 1.15,
          opacity: strokeOpacity,
          fillOpacity
        });
      });

      marker.on("click", () => {
        selectedPopupControlId = String(c.id);
        marker.openPopup();
      });

      marker.addTo(markersLayer);
      return marker;
    }

    function getGuardClusters(arr) {
      const buckets = new Map();
      arr.forEach(c => {
        const displayPoint = getControlDisplayLatLng(c);
        if (!displayPoint) return;
        const guardKey = canonicalGuardName(c.garda) || normalizeText(c.garda) || "necunoscut";
        if (!buckets.has(guardKey)) {
          buckets.set(guardKey, {
            controls: [],
            latSum: 0,
            lonSum: 0,
            level: "guard",
            label: guardDisplayName(c.garda || GUARD_DISPLAY_NAMES[guardKey] || guardKey)
          });
        }
        const bucket = buckets.get(guardKey);
        bucket.controls.push(c);
        bucket.latSum += displayPoint.lat;
        bucket.lonSum += displayPoint.lon;
      });

      return [...buckets.values()].map(bucket => {
        const count = bucket.controls.length || 1;
        return {
          ...bucket,
          lat: bucket.latSum / count,
          lon: bucket.lonSum / count
        };
      }).sort((a, b) => b.controls.length - a.controls.length);
    }

    function getControlClusters(arr) {
      if (!map) return [];
      const zoom = map.getZoom ? map.getZoom() : 8;
      // Cu cat te apropii, celulele devin mai mici si apar mai multe clustere/puncte.
      const cellSize = zoom < 8.5 ? 112 : zoom < 9.5 ? 86 : zoom < 10.5 ? 64 : 46;
      const buckets = new Map();

      arr.forEach(c => {
        const displayPoint = getControlDisplayLatLng(c);
        if (!displayPoint) return;

        const projected = map.latLngToLayerPoint([displayPoint.lat, displayPoint.lon]);
        const guardKey = canonicalGuardName(c.garda) || "necunoscut";
        const key = `${guardKey}:${Math.floor(projected.x / cellSize)}:${Math.floor(projected.y / cellSize)}`;

        if (!buckets.has(key)) {
          buckets.set(key, {
            controls: [],
            latSum: 0,
            lonSum: 0,
            level: "local"
          });
        }

        const bucket = buckets.get(key);
        bucket.controls.push(c);
        bucket.latSum += displayPoint.lat;
        bucket.lonSum += displayPoint.lon;
      });

      return [...buckets.values()].map(bucket => {
        const count = bucket.controls.length || 1;
        return {
          ...bucket,
          lat: bucket.latSum / count,
          lon: bucket.lonSum / count
        };
      });
    }

    function addControlCluster(bucket) {
      if (!bucket || !bucket.controls || !bucket.controls.length) return null;
      if (bucket.controls.length === 1) return addControlPoint(bucket.controls[0]);

      const count = bucket.controls.length;
      const labelText = bucket.level === "guard" ? getGuardClusterTitle(bucket) : "";
      const marker = L.marker([bucket.lat, bucket.lon], {
        icon: controlClusterIcon(count, bucket.level || "local", bucket.controls, labelText),
        keyboard: false,
        riseOnHover: true
      });

      const problemCount = bucket.controls.filter(c => isProblemResult(c.result)).length;
      const label = bucket.level === "guard"
        ? `${bucket.label || "Garda"}: ${count} controale${problemCount ? `, ${problemCount} cu probleme` : ""}`
        : (problemCount ? `${count} controale, ${problemCount} cu probleme` : `${count} controale`);
      marker.bindTooltip(label, { direction: "top", opacity: .96, className: "gfn-cluster-tooltip" });

      marker.on("click", () => {
        if (!map) return;
        const points = bucket.controls.map(c => getControlDisplayLatLng(c)).filter(Boolean).map(p => [p.lat, p.lon]);
        if (points.length > 1) {
          const bounds = L.latLngBounds(points);
          const maxZoom = bucket.level === "guard" ? 9.4 : 12.2;
          map.fitBounds(bounds, { padding: [74, 74], maxZoom });
        } else {
          map.flyTo([bucket.lat, bucket.lon], Math.max((map.getZoom ? map.getZoom() : 8) + 2, 11), { duration: 0.45 });
        }
        clearTimeout(markerRenderTimer);
        markerRenderTimer = setTimeout(() => renderMarkers(mapRenderControls), 460);
      });

      marker.addTo(markersLayer);
      return marker;
    }

    function renderMarkers(arr) {
      if (!markersLayer) return;

      markersLayer.clearLayers();
      clearControlMarkers();

      mapRenderControls = Array.isArray(arr) ? arr : [];

      let displayed = 0;
      let invalid = 0;
      let clusters = 0;
      const zoom = map && map.getZoom ? map.getZoom() : 8;
      const validCount = mapRenderControls.length;
      const clusterMode = validCount > 120
        ? (zoom < 8.15 ? "guard" : (zoom < 11.15 ? "local" : "points"))
        : "points";

      if (clusterMode === "guard" || clusterMode === "local") {
        const buckets = clusterMode === "guard" ? getGuardClusters(mapRenderControls) : getControlClusters(mapRenderControls);
        buckets.forEach(bucket => {
          const layer = addControlCluster(bucket);
          if (!layer) {
            invalid += bucket && bucket.controls ? bucket.controls.length : 1;
            return;
          }
          displayed += bucket.controls.length;
          if (bucket.controls.length > 1) clusters += 1;
        });
      } else {
        mapRenderControls.forEach(c => {
          const marker = addControlPoint(c);
          if (marker) {
            displayed += 1;
          } else {
            invalid += 1;
          }
        });
      }

      setText("visibleCount", displayed + " controale afisate");

      console.info("[GFN map] Randare controale", {
        totalPrimite: mapRenderControls.length,
        afisate: displayed,
        coordonateInvalide: invalid,
        clusterizare: clusterMode !== "points",
        modCluster: clusterMode,
        clustere: clusters,
        zoom
      });

      keepMarkersOnTop();
    }

    function renderRecentLegacyDisabled(arr) {
      const recent = [...arr].sort((a,b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 6);
      if (!recent.length) return setHtml("recentControls", `<div class="empty">Nu exista controale pentru filtrele selectate.</div>`);
      setHtml("recentControls", recent.map(c => {
        const color = colorByResult(c.result);
        const active = String(c.id) === String(selectedControlId) ? " active" : "";
        return `<div class="recent-row${active}" data-control-id="${escapeAttr(c.id)}" title="Click pentru fisa si pozitionare pe harta"><div class="status-dot" style="color:${color}">OK</div><div><div class="recent-title">${escapeHtml(c.control_type || "Control")}</div><div class="recent-meta">${escapeHtml(c.garda || "-")} - ${escapeHtml(formatDate(c.created_at))}</div><div class="recent-meta">Rezultat: <span class="result" style="color:${color}">${escapeHtml(resultLabel(c.result))}</span></div></div><div>&gt;</div></div>`;
      }).join(""));
    }

    window.openControlDetail = openControlDetail;
    window.clearControlDetail = clearControlDetail;
    window.openControlFullModal = openControlFullModal;
    window.openPetitionFullModal = openPetitionFullModal;
    window.closeControlFullModal = closeControlFullModal;
    window.goToMapWithControls = goToMapWithControls;
    window.openInstitutionReportMap = openInstitutionReportMap;
    window.exportFilteredControlsExcel = exportFilteredControlsExcel;
    window.focusControl = focusControl;
    window.toggleCollapse = toggleCollapse;
    window.toggleExtraCharts = toggleExtraCharts;
    window.showMoreInspectors = showMoreInspectors;
    window.showMoreInspectorControls = showMoreInspectorControls;
    window.showMoreEntityLatestControls = showMoreEntityLatestControls;
    window.showMorePetitions = showMorePetitions;
    window.resetReportWorkflowFilters = resetReportWorkflowFilters;
    window.setInspectorSection = setInspectorSection;

    const originalSetModePatched = setMode;
    setMode = function(internal) {
      originalSetModePatched(internal);
      if (internal) setTimeout(renderLoggedAccount, 0);
    };

    const originalLoginPatched = login;
    login = async function() {
      await originalLoginPatched();
      if (isInternalMode) setTimeout(renderLoggedAccount, 50);
    };

    const originalAfterDataLoadedPatched = afterDataLoaded;
    afterDataLoaded = async function(message) {
      await originalAfterDataLoadedPatched(message);
      if (isInternalMode) renderLoggedAccount();
    };



    /* === Navigation and privacy hardening === */
    const originalSetViewForAccess = setView;
    setView = function(view) {
      if (!isInternalMode && ["inspectori", "entities", "reports-workflow"].includes(view)) view = "map";
      originalSetViewForAccess(view);
    };
    window.activateMainTab = function(view) {
      setView(view);
    };

    const originalRenderPetitionersViewForPrivacy = renderPetitionersView;
    renderPetitionersView = function() {
      originalRenderPetitionersViewForPrivacy();
      if (!isInternalMode && q("petitionerSummary")) {
        setText("petitionerSummary", "Datele despre petitionari sunt disponibile doar in modul intern.");
      }
    };
    function startDashboard() {
      if (document.body.dataset.dashboardStarted === "1") return;
      document.body.dataset.dashboardStarted = "1";
      syncViewChrome();
      setMode(false);
      renderNav();
      loadPublicControls();
    }

    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", startDashboard);
    } else {
      startDashboard();
    }
    document.addEventListener("click", event => {
      const inspectorFilterChip = event.target.closest ? event.target.closest(".inspector-active-filter-chip[data-inspector-filter-id]") : null;
      if (inspectorFilterChip) {
        event.preventDefault();
        clearInspectorAdvancedFilter(inspectorFilterChip.dataset.inspectorFilterId);
        return;
      }
      const inspectorSelector = q("inspectorSelectorShell");
      if (inspectorSelector && !inspectorSelector.classList.contains("collapsed") &&
          !inspectorSelector.contains(event.target) &&
          !event.target.closest(".inspector-add-btn")) {
        closeInspectorSelector();
      }
      const activeFilterChip = event.target.closest ? event.target.closest(".active-filter-chip[data-filter-id]") : null;
      if (activeFilterChip) {
        event.preventDefault();
        clearGlobalFilter(activeFilterChip.dataset.filterId);
        return;
      }
      const recentControl = event.target.closest ? event.target.closest(".recent-row[data-control-id]") : null;
      if (recentControl) {
        event.preventDefault();
        focusControl(recentControl.dataset.controlId);
        return;
      }
      const linkedFilterClear = event.target.closest ? event.target.closest("#linkedMapFilterPill") : null;
      if (linkedFilterClear) {
        event.preventDefault();
        applyFilters();
        return;
      }
      const petitionDetail = event.target.closest ? event.target.closest(".petition-detail-btn[data-control-id]") : null;
      if (petitionDetail) {
        event.preventDefault();
        openPetitionFullModal(petitionDetail.dataset.controlId);
        return;
      }
      const quickControlSheet = event.target.closest ? event.target.closest(".quick-control-sheet-btn[data-control-id]") : null;
      if (quickControlSheet) {
        event.preventDefault();
        openControlFullModal(quickControlSheet.dataset.controlId);
        return;
      }
      const quickEntity = event.target.closest ? event.target.closest(".quick-entity-btn[data-control-id]") : null;
      if (quickEntity) {
        event.preventDefault();
        openEntityFromControl(quickEntity.dataset.controlId);
        return;
      }
      const quickPetition = event.target.closest ? event.target.closest(".quick-petition-btn[data-control-id]") : null;
      if (quickPetition) {
        event.preventDefault();
        openPetitionFromControl(quickPetition.dataset.controlId);
        return;
      }
      const quickReportWorkflow = event.target.closest ? event.target.closest(".quick-report-workflow-btn[data-control-id]") : null;
      if (quickReportWorkflow) {
        event.preventDefault();
        openControlReportWorkflow(quickReportWorkflow.dataset.controlId);
        return;
      }
      const entityControlRow = event.target.closest ? event.target.closest(".entity-control-row[data-control-id]") : null;
      if (entityControlRow && !event.target.closest("button, a")) {
        event.preventDefault();
        openControlFullModal(entityControlRow.dataset.controlId);
        return;
      }
      const entityHistoryControl = event.target.closest ? event.target.closest(".entity-history-control[data-control-id]") : null;
      if (entityHistoryControl && !event.target.closest("button, a")) {
        event.preventDefault();
        openControlFullModal(entityHistoryControl.dataset.controlId);
        return;
      }
      const entityYearTab = event.target.closest ? event.target.closest(".entity-year-tab[data-year]") : null;
      if (entityYearTab) {
        event.preventDefault();
        selectedEntityHistoryYear = entityYearTab.dataset.year || "";
        renderEntitiesView();
        return;
      }
      const entityRankRow = event.target.closest ? event.target.closest(".entity-rank-row[data-entity]") : null;
      if (entityRankRow) {
        event.preventDefault();
        if (q("entitySearch")) q("entitySearch").value = toAsciiText(entityRankRow.dataset.entity || "");
        selectedEntityHistoryYear = "";
        renderEntitiesView();
        return;
      }
      const petitionMapButton = event.target.closest ? event.target.closest(".petition-map-btn[data-control-id]") : null;
      if (petitionMapButton) {
        event.preventDefault();
        closeControlFullModal();
        setView("map");
        setTimeout(() => focusControlOnMap(petitionMapButton.dataset.controlId), 80);
        return;
      }
      const inspectorMapButton = event.target.closest ? event.target.closest(".inspector-map-btn[data-inspector]") : null;
      if (inspectorMapButton) {
        event.preventDefault();
        openInspectorControls(inspectorMapButton.dataset.inspector);
        return;
      }
      const inspectorSortButton = event.target.closest ? event.target.closest(".inspector-sort-btn[data-sort]") : null;
      if (inspectorSortButton) {
        event.preventDefault();
        setInspectorSortMode(inspectorSortButton.dataset.sort || "activity");
        return;
      }
      const inspectorRankingButton = event.target.closest ? event.target.closest(".inspector-ranking-btn[data-ranking]") : null;
      if (inspectorRankingButton) {
        event.preventDefault();
        setInspectorRankingMode(inspectorRankingButton.dataset.ranking || "controls");
        return;
      }
      const inspectorControlMap = event.target.closest ? event.target.closest(".inspector-control-map-btn[data-control-id]") : null;
      if (inspectorControlMap) {
        event.preventDefault();
        focusInspectorControlOnMap(inspectorControlMap.dataset.controlId);
        return;
      }
      const inspectorControlRow = event.target.closest ? event.target.closest(".inspector-control-row[data-control-id]") : null;
      if (inspectorControlRow && !event.target.closest("button, a")) {
        event.preventDefault();
        openControlFullModal(inspectorControlRow.dataset.controlId);
        return;
      }
      const guardMapButton = event.target.closest ? event.target.closest(".guard-map-btn[data-guard]") : null;
      if (guardMapButton) {
        event.preventDefault();
        openGuardControls(guardMapButton.dataset.guard);
        return;
      }
      const entityMapButton = event.target.closest ? event.target.closest(".entity-map-btn[data-entity]") : null;
      if (entityMapButton) {
        event.preventDefault();
        openEntityControls(entityMapButton.dataset.entity);
        return;
      }
      const entityPetitionsButton = event.target.closest ? event.target.closest(".entity-petitions-btn[data-entity]") : null;
      if (entityPetitionsButton) {
        event.preventDefault();
        openEntityPetitions(entityPetitionsButton.dataset.entity);
        return;
      }
      const entityReportsButton = event.target.closest ? event.target.closest(".entity-reports-btn[data-entity]") : null;
      if (entityReportsButton) {
        event.preventDefault();
        openEntityReports(entityReportsButton.dataset.entity);
        return;
      }
      const entityResetButton = event.target.closest ? event.target.closest(".entity-reset-btn") : null;
      if (entityResetButton) {
        event.preventDefault();
        if (q("entitySearch")) q("entitySearch").value = "";
        entityTimelineLimit = 20;
        entityTimelineKey = "";
        selectedEntityHistoryYear = "";
        renderEntitiesView();
        return;
      }
      const entityMoreButton = event.target.closest ? event.target.closest(".entity-more-btn") : null;
      if (entityMoreButton) {
        event.preventDefault();
        entityTimelineLimit += 20;
        renderEntitiesView();
        return;
      }
      const reportMapExplore = event.target.closest ? event.target.closest(".report-map-explore-btn") : null;
      if (reportMapExplore) {
        event.preventDefault();
        openInstitutionReportMap();
        return;
      }
      const reportUploadOpen = event.target.closest ? event.target.closest(".report-upload-open-btn[data-control-id]") : null;
      if (reportUploadOpen) {
        event.preventDefault();
        openReportUploadModal(reportUploadOpen.dataset.controlId);
        return;
      }
      const reportOpenPdf = event.target.closest ? event.target.closest(".report-open-pdf-btn[data-control-id], .control-report-open-pdf[data-control-id]") : null;
      if (reportOpenPdf) {
        event.preventDefault();
        openControlReportPdf(reportOpenPdf.dataset.controlId);
        return;
      }
      const reportOpenSheet = event.target.closest ? event.target.closest(".report-open-sheet-btn[data-control-id]") : null;
      if (reportOpenSheet) {
        event.preventDefault();
        openControlFullModal(reportOpenSheet.dataset.controlId);
        return;
      }
      const reportMapButton = event.target.closest ? event.target.closest(".report-map-btn[data-control-id]") : null;
      if (reportMapButton) {
        event.preventDefault();
        setView("map");
        setTimeout(() => focusControl(reportMapButton.dataset.controlId), 80);
        return;
      }
      const reportRow = event.target.closest ? event.target.closest(".report-row[data-control-id]") : null;
      if (reportRow && !event.target.closest("button, a, input, select, textarea")) {
        event.preventDefault();
        openControlDetail(reportRow.dataset.controlId);
        return;
      }
      const reportUploadClose = event.target.closest ? event.target.closest(".report-upload-close, .report-upload-backdrop") : null;
      if (reportUploadClose) {
        event.preventDefault();
        closeReportUploadModal();
        return;
      }
      const petitionRow = event.target.closest ? event.target.closest(".petition-history-row[data-control-id]") : null;
      if (petitionRow) {
        event.preventDefault();
        openPetitionFullModal(petitionRow.dataset.controlId);
        return;
      }
      const fullOpenButton = event.target.closest ? event.target.closest(".control-full-open-btn[data-control-id]") : null;
      if (fullOpenButton) {
        event.preventDefault();
        openControlFullModal(fullOpenButton.dataset.controlId);
        return;
      }
      const fullCloseButton = event.target.closest ? event.target.closest(".control-full-close, .control-full-back") : null;
      if (fullCloseButton) {
        event.preventDefault();
        closeControlFullModal();
        return;
      }
      const fullCenterButton = event.target.closest ? event.target.closest(".control-full-center[data-control-id]") : null;
      if (fullCenterButton) {
        event.preventDefault();
        const controlId = fullCenterButton.dataset.controlId;
        closeControlFullModal();
        setView("map");
        setTimeout(() => focusControlOnMap(controlId), 80);
        return;
      }
      const fullBackdrop = event.target.closest ? event.target.closest(".control-full-backdrop") : null;
      if ((event.target && event.target.id === "controlFullModal") || fullBackdrop) {
        event.preventDefault();
        closeControlFullModal();
        return;
      }
      const popupDetail = event.target.closest ? event.target.closest(".popup-detail-btn[data-control-id]") : null;
      if (popupDetail) {
        event.preventDefault();
        openControlFullModal(popupDetail.dataset.controlId);
        return;
      }
      const exportButton = event.target.closest ? event.target.closest(".export-excel-btn") : null;
      if (exportButton) {
        event.preventDefault();
        exportFilteredControlsExcel();
        return;
      }
      const controlDetailClose = event.target.closest ? event.target.closest(".control-detail-close") : null;
      if (controlDetailClose) {
        event.preventDefault();
        clearControlDetail();
        return;
      }
      const mapControlPopupClose = event.target.closest ? event.target.closest(".map-control-popup-close") : null;
      if (mapControlPopupClose) {
        event.preventDefault();
        selectedPopupControlId = null;
        if (map) map.closePopup();
        renderMapControlPopup(null);
        return;
      }
      const mapControlPopup = event.target.closest ? event.target.closest("#mapControlPopup") : null;
      if (mapControlPopup) {
        event.stopPropagation();
      }
      const searchBox = event.target.closest ? event.target.closest(".entity-search-box") : null;
      if (!searchBox && q("entitySuggestList")) q("entitySuggestList").classList.remove("open");
      const inspectorBox = event.target.closest ? event.target.closest(".inspector-search-box") : null;
      if (!inspectorBox && q("inspectorSuggestList")) q("inspectorSuggestList").classList.remove("open");
    });
    document.addEventListener("submit", event => {
      const reportUploadForm = event.target && event.target.id === "reportUploadForm" ? event.target : null;
      if (reportUploadForm) {
        event.preventDefault();
        submitReportUpload(reportUploadForm);
      }
    });
    window.addEventListener("resize", () => setTimeout(() => {
      if (map) map.invalidateSize();
      if (reportStatsMap && currentView === "inspectori" && inspectorSection === "reports") reportStatsMap.invalidateSize();
      updateMapControlPopupPosition();
    }, 150));
    window.addEventListener("keydown", event => {
      const mainNavTab = event.target && event.target.closest ? event.target.closest(".nav-btn[role='tab'][data-view]") : null;
      if (mainNavTab && ["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) {
        event.preventDefault();
        const nav = getAvailableNavItems();
        const currentIndex = Math.max(0, nav.findIndex(item => item.id === mainNavTab.dataset.view));
        let nextIndex = currentIndex;
        if (event.key === "ArrowLeft") nextIndex = (currentIndex - 1 + nav.length) % nav.length;
        if (event.key === "ArrowRight") nextIndex = (currentIndex + 1) % nav.length;
        if (event.key === "Home") nextIndex = 0;
        if (event.key === "End") nextIndex = nav.length - 1;
        const nextView = nav[nextIndex] ? nav[nextIndex].id : mainNavTab.dataset.view;
        setView(nextView);
        setTimeout(() => {
          const nextTab = document.querySelector(`.nav-btn[data-view="${nextView}"]`);
          if (nextTab) nextTab.focus();
        }, 0);
        return;
      }
      const reportRow = event.target && event.target.closest ? event.target.closest(".report-row[data-control-id]") : null;
      if (reportRow && !event.target.closest("button, a, input, select, textarea") && (event.key === "Enter" || event.key === " ")) {
        event.preventDefault();
        openControlDetail(reportRow.dataset.controlId);
        return;
      }
      const petitionRow = event.target && event.target.closest ? event.target.closest(".petition-history-row[data-control-id]") : null;
      if (petitionRow && (event.key === "Enter" || event.key === " ")) {
        event.preventDefault();
        openPetitionFullModal(petitionRow.dataset.controlId);
        return;
      }
      if (event.key === "Escape" && q("controlFullModal") && !q("controlFullModal").classList.contains("hidden")) {
        closeControlFullModal();
      }
      if (event.key === "Escape" && q("reportUploadModal") && !q("reportUploadModal").classList.contains("hidden")) {
        closeReportUploadModal();
      }
    });
