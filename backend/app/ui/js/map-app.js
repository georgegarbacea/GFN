    const q = id => document.getElementById(id);
    const safeValue = (id, fallback = "") => q(id) ? q(id).value : fallback;
    const setText = (id, value) => { if (q(id)) q(id).textContent = value; };
    const setHtml = (id, value) => { if (q(id)) q(id).innerHTML = value; };

    let token = null;
    let isInternalMode = false;
    let allControls = [];
    let filteredControls = [];
    let currentView = "map";
    let map = null;
    let markersLayer = null;
    let controlRenderer = null;
    let mapRenderControls = [];
    let markerRenderTimer = null;
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
    let inspectorCompareNames = [];
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
      { id: "map", icon: "MAP", label: "Vizualizare controale", title: "Vizualizare controale", subtitle: "Harta operationala cu puncte de control, filtre si rezultate publice.", pill: "Harta operationala" },
      { id: "garzi", icon: "GF", label: "Activitate garzi", title: "Activitate garzi", subtitle: "Harta statistica pe limitele GFN si indicatori agregati pe garzi.", pill: "Harta statistica" },
      { id: "petitions", icon: "SES", label: "Petitionari / sesizari", title: "Petitionari / sesizari", subtitle: "Verificare publica dupa numarul sesizarii, fara date personale.", pill: "Sesizari" },
      { id: "report", icon: "RPT", label: "Raport institutional", title: "Raport institutional", subtitle: "Sinteza publica agregata pe filtrele active.", pill: "Raport public" }
    ];
    const NAV_INTERNAL = [
      { id: "map", icon: "MAP", label: "Vizualizare controale", title: "Vizualizare controale", subtitle: "Harta operationala cu toate controalele disponibile.", pill: "Harta operationala" },
      { id: "garzi", icon: "GF", label: "Activitate garzi", title: "Activitate garzi", subtitle: "Harta statistica pe limitele GFN, medii si performanta pe tipuri de control.", pill: "Analiza garzi" },
      { id: "inspectori", icon: "INSP", label: "Activitate inspectori", title: "Activitate inspectori", subtitle: "Comparatie inspector vs media nationala sau media garzii.", pill: "Analiza inspectori" },
      { id: "petitions", icon: "SES", label: "Petitionari / sesizari", title: "Petitionari / sesizari", subtitle: "Cautare sesizari si analiza interna a petitionarilor recurenti.", pill: "Sesizari" },
      { id: "entities", icon: "ENT", label: "Entitati controlate", title: "Entitati controlate", subtitle: "Istoric, rezultate, amenzi si prejudicii pe entitate controlata.", pill: "Entitati" },
      { id: "report", icon: "RPT", label: "Raport institutional", title: "Raport institutional", subtitle: "Raport complet pe filtrele active, cu export PDF.", pill: "Raport intern" }
    ];

    const CONTROL_DOMAINS = [
      { value: "silvic", label: "Domeniul silvic", categories: ["Control de fond", "Control partial", "Instalatii / depozite materiale lemnoase", "Exploatarea masei lemnoase", "Control anual regenerari", "Lucrari regenerare / impadurire", "Verificarea actelor de punere in valoare", "Controlul circulatiei materialelor lemnoase"] },
      { value: "cinegetic", label: "Domeniul cinegetic", categories: ["Control de fond", "Criterii de licentiere", "Respectarea prevederilor legale la vanatoare", "Populare / repopulare", "Prevenire / combatere braconaj", "Studii de evaluare in teren", "Procese-verbale de pagube"] }
    ];

    const chartColors = {
      green: "#16d977", darkGreen: "#16a34a", teal: "#00f5d4", blue: "#18b7ff", orange: "#ffb020", red: "#ff4141", purple: "#a073ff", yellow: "#facc15", gray: "#94a3b8", grid: "rgba(148,213,190,.16)", text: "#d7eee6"
    };
    const palette = [chartColors.green, chartColors.teal, chartColors.blue, chartColors.orange, chartColors.purple, "#39ff88", "#22c55e", "#84cc16", chartColors.gray];
    Chart.defaults.color = chartColors.text;
    Chart.defaults.borderColor = chartColors.grid;
    Chart.defaults.font.family = "Inter, Arial, system-ui, sans-serif";

    const valueLabelPlugin = {
      id: "valueLabelPlugin",
      afterDatasetsDraw(chart) {
        if (chart.config.type === "doughnut") return;
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
          ctx.fillText(label, props.x, props.y - 8);
        });
        ctx.restore();
      }
    };
    Chart.register(valueLabelPlugin);

    function setMessage(text, ok = false) {
      const msg = q("msg");
      if (!msg) return;
      msg.textContent = text || "";
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
    function getFineAmount(c) { return normalizeNumber(firstValue(c, ["cuantum_amenda_ron", "cuantum_amenda", "amenda_ron", "valoare_amenda", "valoare_amenda_ron", "amenda"])); }
    function getDamageAmount(c) { return normalizeNumber(firstValue(c, ["valoare_prejudiciu_ron", "prejudiciu_ron", "valoare_prejudiciu", "prejudiciu"])); }
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
      const start = getPetitionRegisteredDate(c);
      const end = getControlDateValue(c);
      if (!start || !end || isNaN(start.getTime()) || isNaN(end.getTime())) return null;
      const days = Math.round((end.setHours(0,0,0,0) - start.setHours(0,0,0,0)) / 86400000);
      return days >= 0 ? days : null;
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
    function isProblemResult(r) { return ["neconform", "sanctiune", "sesizare_penala"].includes(r); }
    function resultLabel(r) { return ({ conform: "Conform", neconform: "Neconform", avertisment: "Avertisment", sanctiune: "Sanctiune", sesizare_penala: "Sesizare penala" })[r] || r || "-"; }
    function colorByResult(r) { return ({ conform: chartColors.green, neconform: chartColors.red, avertisment: chartColors.orange, sanctiune: chartColors.blue, sesizare_penala: chartColors.purple })[r] || chartColors.gray; }
    function formatDate(v) { if (!v) return "-"; try { return new Date(v).toLocaleString("ro-RO"); } catch { return v; } }
    function formatDay(v) { if (!v) return "-"; try { return new Date(v).toLocaleDateString("ro-RO"); } catch { return v; } }
    function toIsoDate(d) { return d.toISOString().slice(0, 10); }
    function formatMoney(v) { return normalizeNumber(v).toLocaleString("ro-RO", { maximumFractionDigits: 2 }) + " RON"; }
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
    function sumBy(arr, getter) { return arr.reduce((s, x) => s + normalizeNumber(getter(x)), 0); }
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

    function getAvailableNavItems() {
      return isInternalMode ? NAV_INTERNAL : NAV_PUBLIC;
    }

    function renderNav() {
      const nav = getAvailableNavItems();
      setHtml("navButtons", nav.map(item => `<button class="nav-btn ${item.id === currentView ? "active" : ""}" onclick="setView('${item.id}')"><span class="nav-icon">${item.icon}</span><span class="nav-label">${item.label}</span></button>`).join(""));
    }

    function syncViewChrome() {
      document.body.classList.toggle("map-view-active", currentView === "map");
    }
    function setView(view) {
      currentView = view;
      syncViewChrome();
      renderNav();
      document.querySelectorAll(".view").forEach(el => el.classList.remove("active"));
      const section = q("view-" + view);
      if (section) section.classList.add("active");
      const nav = [...NAV_PUBLIC, ...NAV_INTERNAL].find(x => x.id === view) || getAvailableNavItems()[0] || NAV_PUBLIC[0];
      setText("viewTitle", nav.title);
      setText("viewSubtitle", nav.subtitle);
      setText("viewPill", nav.pill);
      renderCurrentView();
      if (view === "map") setTimeout(() => { if (map) map.invalidateSize(); }, 160);
      if (view === "garzi") setTimeout(() => { renderGuardStatsMap(); if (guardStatsMap) guardStatsMap.invalidateSize(); }, 180);
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
        if (["inspectori", "entities"].includes(currentView)) currentView = "map";
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
        setText("loggedUser", email);
        setMode(true);
        setMessage("Autentificare reusita. Se incarca datele interne...", true);
        await loadControls();
        setView("map");
      } catch (err) { setMessage(err.message, false); }
    }

    async function logout() {
      token = null;
      setMode(false);
      q("password").value = "";
      setText("lastUpdate", "-");
      setMessage("Te-ai delogat. Se incarca datele publice.", true);
      await loadPublicControls();
      setView("map");
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
      if (q("guardPeriodPreset") && !q("guardDateFrom").value && !q("guardDateTo").value) applyGuardPeriodPreset(q("guardPeriodPreset").value || "last90");
      applyFilters();
      setText("lastUpdate", new Date().toLocaleString("ro-RO"));
      setMessage(message, true);
    }

    function populateFilters() {
      populateGardaFilter(); populateCategoryFilter(); populateInspectorSearch(); populateInspectorScopeGuards(); populateEntitySearch(); populatePetitionerSearch(); populateInstitutionTargets();
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
      if (!showAll && !query) {
        box.classList.remove("open");
        box.innerHTML = "";
        return;
      }

      const counts = {};
      getInspectorBaseControls().forEach(c => (c.echipa || []).forEach(m => {
        if (!m.nume) return;
        counts[m.nume] = (counts[m.nume] || 0) + 1;
      }));

      const rows = Object.entries(counts)
        .filter(([name]) => showAll || normalizeText(name).includes(query))
        .sort((a, b) => b[1] - a[1] || String(a[0]).localeCompare(String(b[0]), "ro"))
        .slice(0, 8);

      if (!rows.length) {
        box.classList.remove("open");
        box.innerHTML = "";
        return;
      }

      box.innerHTML = rows.map(([name, count]) => `<button type="button" onclick="selectInspectorSuggestion('${escapeAttr(name)}')">
        <span>${escapeHtml(name)}</span>
        <strong>${count}</strong>
      </button>`).join("");
      box.classList.add("open");
    }

    function selectInspectorSuggestion(name) {
      const input = q("inspectorSearch");
      if (input) input.value = name || "";
      const box = q("inspectorSuggestList");
      if (box) box.classList.remove("open");
      renderInspectorsView();
    }

    function addInspectorComparison() {
      const exact = findInspectorByInput(safeValue("inspectorSearch", ""));
      if (!exact) {
        setMessage("Alege un inspector din lista, apoi apasa Adauga inspector pentru comparatie.", false);
        renderInspectorSuggestions(true);
        return;
      }
      if (inspectorCompareNames.includes(exact)) {
        renderInspectorsView();
        return;
      }
      if (inspectorCompareNames.length >= 5) {
        setMessage("Lista de comparatie permite maximum 5 inspectori.", false);
        return;
      }
      inspectorCompareNames.push(exact);
      setMessage("Inspector adaugat pentru comparatie: " + exact, true);
      renderInspectorsView();
    }

    function removeInspectorComparison(name) {
      inspectorCompareNames = inspectorCompareNames.filter(item => item !== name);
      renderInspectorsView();
    }

    function clearInspectorComparison() {
      inspectorCompareNames = [];
      renderInspectorsView();
    }

    function getInspectorComparisonNames(selected = "") {
      const names = [...inspectorCompareNames];
      if (selected && !names.includes(selected)) names.unshift(selected);
      return names.filter(name => name).slice(0, 5);
    }

    function renderInspectorCompareChips(names) {
      const box = q("inspectorCompareList");
      if (!box) return;
      if (!names.length) {
        box.innerHTML = `
          <div class="inspector-compare-header">
            <span>Lista comparatie inspectori</span>
            <strong>0 / 5</strong>
          </div>
          <span class="inspector-compare-empty">Adauga pana la 5 inspectori pentru comparatie in timp.</span>
        `;
        return;
      }
      box.innerHTML = `
        <div class="inspector-compare-header">
          <span>Inspectori in comparatie</span>
          <strong>${names.length} / 5</strong>
        </div>
        <div class="inspector-chip-list">
          ${names.map(name => `<button type="button" class="inspector-chip" onclick="removeInspectorComparison('${escapeAttr(name)}')">
            <span>${escapeHtml(name)}</span><b>x</b>
          </button>`).join("")}
          <button type="button" class="inspector-chip clear" onclick="clearInspectorComparison()">Sterge lista</button>
        </div>
      `;
    }

    window.selectInspectorSuggestion = selectInspectorSuggestion;
    window.renderInspectorSuggestions = renderInspectorSuggestions;
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
      return getModulePeriodControls("entity").filter(c => getEntityName(c));
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
      if (input) input.value = name || "";
      const box = q("entitySuggestList");
      if (box) box.classList.remove("open");
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
      } else if (value === "year") {
        const start = new Date(today.getFullYear(), 0, 1);
        from.value = formatDateInput(start);
        to.value = formatDateInput(today);
      }

      renderGarziView();
    }

    function resetGuardFilters() {
      if (q("guardPeriodPreset")) q("guardPeriodPreset").value = "last90";
      if (q("guardTypeFilter")) q("guardTypeFilter").value = "toate";
      if (q("guardCategoryFilter")) q("guardCategoryFilter").value = "toate";
      if (q("guardResultFilter")) q("guardResultFilter").value = "toate";
      applyGuardPeriodPreset("last90");
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
      setGlobalPeriodPresetDates("all");
      applyFilters();
    }

    function applyFilters() {
      filteredControls = filterControls();
      renderKpis(); renderCurrentView();
      if (currentView !== "map") setText("visibleCount", filteredControls.length + " controale afisate");
    }

    function renderCurrentView() {
      syncViewChrome();
      if (!["petitions", "entities"].includes(currentView)) renderKpis();
      if (currentView === "dashboard") renderDashboardView();
      if (currentView === "map") renderMapView();
      if (currentView === "garzi") renderGarziView();
      if (currentView === "inspectori") renderInspectorsView();
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

    function makeChart(id, type, labels, data, options = {}) {
      const el = q(id); if (!el) return null;
      if (charts[id]) charts[id].destroy();
      const colors = options.colors || labels.map((_, i) => palette[i % palette.length]);
      charts[id] = new Chart(el.getContext("2d"), {
        type,
        data: { labels, datasets: [{ label: options.label || "Nr.", data, backgroundColor: type === "line" ? "rgba(22,217,119,.18)" : colors, borderColor: type === "line" ? chartColors.green : colors, borderWidth: type === "doughnut" ? 2 : 1, tension: .42, fill: type === "line", pointRadius: type === "line" ? 4 : 0, pointBackgroundColor: chartColors.green }] },
        options: {
          responsive: true, maintainAspectRatio: false, animation: { duration: 950, easing: "easeOutQuart" }, indexAxis: options.horizontal ? "y" : "x", cutout: type === "doughnut" ? "62%" : undefined,
          plugins: { legend: { display: type === "doughnut", position: "right", labels: { color: chartColors.text, boxWidth: 11, font: { size: 11, weight: "700" } } }, tooltip: { backgroundColor:"rgba(5,16,14,.95)", titleColor:"#fff", bodyColor:"#d7eee6", borderColor:"rgba(22,217,119,.35)", borderWidth:1 } },
          scales: type === "doughnut" ? {} : { x: { ticks: { color: chartColors.text, font: { size: 11, weight: "700" } }, grid: { display: !options.horizontal, color: chartColors.grid } }, y: { beginAtZero: true, ticks: { precision: 0, color: chartColors.text, font: { size: 11, weight: "700" } }, grid: { color: chartColors.grid } } }
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
            finePerControl: 0,
            damage: 0,
            damagePerControl: 0,
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
      damage: { label: "Prejudiciu estimat", short: "prejudiciu", format: v => formatMoney(v), palette: "blue" }
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

    function guardColor(value, max, metricKey) {
      if (!max || !value) return "#081a18";
      const r = Math.max(0, Math.min(1, Number(value) / Number(max || 1)));
      const ramps = {
        green: ["#06412f", "#10b981", "#5bffb0"],
        red: ["#461616", "#ef4444", "#ff8a8a"],
        purple: ["#281453", "#8b5cf6", "#d8b4fe"],
        orange: ["#4b2c08", "#f59e0b", "#fde68a"],
        blue: ["#08304a", "#0ea5e9", "#7dd3fc"]
      };
      const metric = GUARD_METRICS[metricKey] || GUARD_METRICS.monthly;
      const ramp = ramps[metric.palette] || ramps.green;
      if (r < .45) return mixHex(ramp[0], ramp[1], r / .45);
      return mixHex(ramp[1], ramp[2], (r - .45) / .55);
    }


    function gradientColorsByValues(values, metricKey) {
      const max = Math.max(0, ...values.map(v => Number(v || 0)));
      return values.map(v => guardColor(Number(v || 0), max || 1, metricKey));
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
      const geoValues = (guardStatsGeoJson.features || []).map(feature => {
        const item = getGuardStatForFeature(feature, stats, statsLookup);
        return item ? Number(item[metricKey] || 0) : 0;
      });
      const values = Object.values(stats).map(s => Number(s[metricKey] || 0));
      const max = Math.max(0, ...values, ...geoValues);
      const avg = values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0;

      setText("guardMapMax", metric.format(max));
      setText("guardMapAvg", metric.format(avg));
      setText("guardMapMonths", months.toFixed(1) + " luni");
      setText("guardMetricLabel", metric.short);

      if (guardStatsLayer) guardStatsMap.removeLayer(guardStatsLayer);

      guardStatsLayer = L.geoJSON(guardStatsGeoJson, {
        pane: "guardStatsPane",
        style: feature => {
          const item = getGuardStatForFeature(feature, stats, statsLookup);
          const value = item ? Number(item[metricKey] || 0) : 0;
          const fill = guardColor(value, max, metricKey);
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
          const item = getGuardStatForFeature(feature, stats, statsLookup) || { total: 0, monthly: 0, density: 0, problems: 0, problemRate: 0, sanctions: 0, sanctionRate: 0, petitionShare: 0, fines: 0, finePerControl: 0, damage: 0, damagePerControl: 0, forestAreaHa: 0 };
          const html = `<div class="guard-stat-tooltip">
            <div class="guard-stat-tooltip-title">${escapeHtml(name)}</div>
            <div class="guard-stat-tooltip-row"><span>${escapeHtml(metric.label)}</span><span>${escapeHtml(metric.format(item[metricKey] || 0))}</span></div>
            <div class="guard-stat-tooltip-row"><span>Total controale</span><span>${item.total || 0}</span></div>
            <div class="guard-stat-tooltip-row"><span>Controale/luna</span><span>${Number(item.monthly || 0).toFixed(1)}</span></div>
            <div class="guard-stat-tooltip-row"><span>Suprafata padure</span><span>${Number(item.forestAreaHa || 0).toLocaleString("ro-RO")} ha</span></div>
            <div class="guard-stat-tooltip-row"><span>Controale/10.000 ha</span><span>${Number(item.density || 0).toFixed(2)}</span></div>
            <div class="guard-stat-tooltip-row"><span>Probleme</span><span>${item.problems || 0}</span></div>
            <div class="guard-stat-tooltip-row"><span>Rata probleme</span><span>${formatPercent(item.problemRate || 0)}</span></div>
            <div class="guard-stat-tooltip-row"><span>Rata masuri</span><span>${formatPercent(item.sanctionRate || 0)}</span></div>
            <div class="guard-stat-tooltip-row"><span>Pondere sesizari</span><span>${formatPercent(item.petitionShare || 0)}</span></div>
            <div class="guard-stat-tooltip-row"><span>Amenzi</span><span>${escapeHtml(formatMoney(item.fines || 0))}</span></div>
            <div class="guard-stat-tooltip-row"><span>Amenzi/control</span><span>${escapeHtml(formatMoney(item.finePerControl || 0))}</span></div>
            <div class="guard-stat-tooltip-row"><span>Prejudiciu</span><span>${escapeHtml(formatMoney(item.damage || 0))}</span></div>
            <div class="guard-stat-tooltip-row"><span>Prejudiciu/control</span><span>${escapeHtml(formatMoney(item.damagePerControl || 0))}</span></div>
          </div>`;

          layer.bindTooltip(html, { sticky: true, direction: "auto", opacity: .96, className: "leaflet-popup-content-wrapper" });
          layer.on("mouseover", () => layer.setStyle({ weight: 2.2, color: "#ffffff", fillOpacity: .88 }));
          layer.on("mouseout", () => guardStatsLayer.resetStyle(layer));
        }
      }).addTo(guardStatsMap);

      try { guardStatsMap.fitBounds(guardStatsLayer.getBounds(), { padding: [18, 18] }); } catch {}

      const legend = q("guardMapLegend");
      if (legend) {
        const gradient = metric.palette === "red"
          ? "linear-gradient(90deg,#2a1717,#6e2525,#c23a3a,#ff4141)"
          : metric.palette === "purple"
            ? "linear-gradient(90deg,#201934,#403071,#704bd8,#a073ff)"
            : metric.palette === "orange"
              ? "linear-gradient(90deg,#2e2110,#755118,#c98117,#ffb020)"
              : metric.palette === "blue"
                ? "linear-gradient(90deg,#102636,#145175,#177bb1,#18b7ff)"
                : "linear-gradient(90deg,#0c332f,#0f5a43,#14935b,#16d977)";
        legend.innerHTML = `<div class="guard-stat-legend-title">${escapeHtml(metric.label)}</div><div class="guard-stat-gradient" style="background:${gradient}"></div><div class="guard-stat-legend-range"><span>0</span><span>${escapeHtml(metric.format(max))}</span></div>`;
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

      setHtml("guardRankingList", rows.map((item, i) => `<div class="guard-rank-row">
        <div class="guard-rank-index">#${i + 1}</div>
        <div class="guard-rank-name" title="${escapeHtml(item.garda)}">${escapeHtml(item.garda)}</div>
        <div class="guard-rank-value">${escapeHtml(metric.format(item[metricKey] || 0))}</div>
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
      const totalArea = rows.reduce((sum, item) => sum + Number(item.forestAreaHa || 0), 0);
      const totalControls = rows.reduce((sum, item) => sum + Number(item.total || 0), 0);

      const body = rows.map(item => {
        const status = guardDensityStatus(item, avgDensity);
        const densityPct = maxDensity ? Math.max(3, Math.min(100, (Number(item.density || 0) / maxDensity) * 100)) : 0;
        return `<div class="guard-score-row">
          <div class="guard-score-main">
            <strong>${escapeHtml(item.garda)}</strong>
            <span>${Number(item.forestAreaHa || 0).toLocaleString("ro-RO")} ha padure</span>
          </div>
          <div class="guard-score-density">
            <span>${Number(item.density || 0).toFixed(2)}</span>
            <div class="guard-score-bar"><i style="width:${densityPct}%"></i></div>
          </div>
          <div>${formatPercent(item.problemRate)}</div>
          <div>${formatPercent(item.sanctionRate)}</div>
          <div>${formatPercent(item.petitionShare)}</div>
          <div>${escapeHtml(formatMoney(item.finePerControl || 0))}</div>
          <div>${escapeHtml(formatMoney(item.damagePerControl || 0))}</div>
          <div><span class="guard-status ${status.cls}">${escapeHtml(status.label)}</span></div>
        </div>`;
      }).join("");

      setHtml("guardKpiScorecard", `
        <div class="guard-score-summary">
          <div><span>Total controale</span><strong>${totalControls}</strong></div>
          <div><span>Suprafata totala</span><strong>${totalArea.toLocaleString("ro-RO")} ha</strong></div>
          <div><span>Media nationala</span><strong>${avgDensity.toFixed(2)} / 10.000 ha</strong></div>
          <div><span>Perioada analizata</span><strong>${Number(months || 0).toFixed(1)} luni</strong></div>
        </div>
        <div class="guard-score-head">
          <span>Garda</span>
          <span>Controale / 10.000 ha</span>
          <span>Probleme</span>
          <span>Masuri</span>
          <span>Sesizari</span>
          <span>Amenzi / control</span>
          <span>Prejudiciu / control</span>
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
      const ranked = Object.values(stats).sort((a,b) => Number(b[metricKey] || 0) - Number(a[metricKey] || 0)).slice(0, 10);
      const chartMax = Math.max(0, ...Object.values(stats).map(x => Number(x[metricKey] || 0)));
      const moneyMetrics = ["fines", "damage", "finePerControl", "damagePerControl"];
      const chartValues = ranked.map(x => moneyMetrics.includes(metricKey) ? Math.round(Number(x[metricKey] || 0)) : Number(Number(x[metricKey] || 0).toFixed(2)));
      makeChart("chartGarziBars", "bar", ranked.map(x => gardaShortLabel(x.garda)), chartValues, { label: metric.short, colors: ranked.map(x => guardColor(Number(x[metricKey] || 0), chartMax || 1, metricKey)) });
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
        label: "RON",
        colors: gradientColorsByValues(moneyValues, "fines")
      });
    }

    function getInspectorBaseControls() {
      let arr = getModulePeriodControls("inspector", allControls);
      const type = safeValue("inspectorTypeScope", "toate");
      const category = safeValue("inspectorCategoryScope", "toate");
      const result = safeValue("inspectorResultScope", "toate");
      if (type !== "toate") arr = arr.filter(c => c.control_type === type);
      if (category !== "toate") arr = arr.filter(c => categoryMatchesControl(c, category));
      if (result !== "toate") arr = arr.filter(c => c.result === result);
      return arr;
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
            byType: {},
            byMonth: {},
            byResult: {}
          };
        }
        stats[name].total += 1;
        if (isProblemResult(c.result)) stats[name].problems += 1;
        if (["sanctiune", "sesizare_penala"].includes(c.result)) stats[name].sanctions += 1;
        if (isPetition(c)) stats[name].petitions += 1;
        stats[name].fines += getFineAmount(c);
        stats[name].damage += getDamageAmount(c);
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

      const body = rows.map(item => {
        const status = inspectorActivityStatus(item, avgMonthly);
        const monthlyPct = maxMonthly ? Math.max(3, Math.min(100, (Number(item.monthly || 0) / maxMonthly) * 100)) : 0;
        return `<div class="guard-score-row">
          <div class="guard-score-main">
            <strong>${escapeHtml(item.name)}</strong>
            <span>${item.total || 0} controale la care a participat</span>
          </div>
          <div class="guard-score-density">
            <span>${Number(item.monthly || 0).toFixed(1)}</span>
            <div class="guard-score-bar"><i style="width:${monthlyPct}%"></i></div>
          </div>
          <div>${formatPercent(item.problemRate)}</div>
          <div>${formatPercent(item.sanctionRate)}</div>
          <div>${formatPercent(item.petitionShare)}</div>
          <div>${escapeHtml(formatMoney(item.finePerControl || 0))}</div>
          <div>${escapeHtml(formatMoney(item.damagePerControl || 0))}</div>
          <div><span class="guard-status ${status.cls}">${escapeHtml(status.label)}</span></div>
        </div>`;
      }).join("");

      setHtml("inspectorKpiScorecard", `
        <div class="guard-score-summary">
          <div><span>${selectedRows.length ? "Inspectori comparati" : (selectedRow ? "Controale inspector" : "Participari control")}</span><strong>${selectedRows.length ? selectedRows.length : totalParticipations}</strong></div>
          <div><span>${selectedRows.length ? "Controale cumulate" : (selectedRow ? "Inspector analizat" : "Inspectori activi")}</span><strong>${selectedRows.length ? selectedRows.reduce((sum, item) => sum + Number(item.total || 0), 0) : (selectedRow ? "1" : allRows.length)}</strong></div>
          <div><span>Media grupului</span><strong>${avgMonthly.toFixed(1)} / luna</strong></div>
          <div><span>Selectie</span><strong>${escapeHtml(selectedText)}</strong></div>
        </div>
        <div class="guard-score-head">
          <span>Inspector</span>
          <span>Controale / luna</span>
          <span>Probleme</span>
          <span>Masuri</span>
          <span>Sesizari</span>
          <span>Amenzi / control</span>
          <span>Prejudiciu / control</span>
          <span>Status</span>
        </div>
        <div class="guard-score-body">${body}</div>
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
        </div>
        <div class="inspector-profile-card"><span>Total controale</span><strong>${total}</strong><small>participari in perioada</small></div>
        <div class="inspector-profile-card"><span>Controale / luna</span><strong>${Number(selectedStats.monthly || 0).toFixed(1)}</strong><small>media inspectorului</small></div>
        <div class="inspector-profile-card"><span>Rata conformare</span><strong>${formatPercent(conformRate)}</strong><small>${conform} controale conforme</small></div>
        <div class="inspector-profile-card"><span>Controale cu probleme</span><strong>${formatPercent(selectedStats.problemRate)}</strong><small>${selectedStats.problems || 0} cazuri</small></div>
        <div class="inspector-profile-card"><span>Masuri ferme</span><strong>${formatPercent(selectedStats.sanctionRate)}</strong><small>${selectedStats.sanctions || 0} sanctiuni/sesizari</small></div>
        <div class="inspector-profile-card"><span>Sesizari</span><strong>${formatPercent(selectedStats.petitionShare)}</strong><small>${selectedStats.petitions || 0} controale din sesizari</small></div>
        <div class="inspector-profile-card"><span>Amenzi / control</span><strong>${escapeHtml(formatMoney(selectedStats.finePerControl || 0))}</strong><small>total ${escapeHtml(formatMoney(selectedStats.fines || 0))}</small></div>
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
          plugins: {
            legend: { display: true, position: "top", labels: { color: chartColors.text, boxWidth: 11, font: { size: 11, weight: "800" } } },
            tooltip: { backgroundColor:"rgba(5,16,14,.95)", titleColor:"#fff", bodyColor:"#d7eee6", borderColor:"rgba(22,217,119,.35)", borderWidth:1 }
          },
          scales: {
            x: { ticks: { color: chartColors.text, font: { size: 11, weight: "800" } }, grid: { display: false } },
            y: { beginAtZero: true, ticks: { precision: 0, color: chartColors.text, font: { size: 11, weight: "800" } }, grid: { color: chartColors.grid } }
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
            legend: { display: true, position: "top", labels: { color: chartColors.text, boxWidth: 11, font: { size: 11, weight: "800" } } },
            tooltip: { backgroundColor:"rgba(5,16,14,.95)", titleColor:"#fff", bodyColor:"#d7eee6", borderColor:"rgba(22,217,119,.35)", borderWidth:1 }
          },
          scales: {
            x: { ticks: { color: chartColors.text, font: { size: 11, weight: "800" } }, grid: { color: chartColors.grid } },
            y: { beginAtZero: true, ticks: { precision: 0, color: chartColors.text, font: { size: 11, weight: "800" } }, grid: { color: chartColors.grid } }
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
            legend: { display: true, position: "top", labels: { color: chartColors.text, boxWidth: 11, font: { size: 11, weight: "800" } } },
            tooltip: { backgroundColor:"rgba(5,16,14,.95)", titleColor:"#fff", bodyColor:"#d7eee6", borderColor:"rgba(22,217,119,.35)", borderWidth:1 }
          },
          scales: {
            x: { ticks: { color: chartColors.text, font: { size: 11, weight: "800" } }, grid: { color: chartColors.grid } },
            y: { beginAtZero: true, ticks: { precision: 0, color: chartColors.text, font: { size: 11, weight: "800" } }, grid: { color: chartColors.grid } }
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
          plugins: {
            legend: { display: true, position: "top", labels: { color: chartColors.text, boxWidth: 11, font: { size: 11, weight: "800" } } },
            tooltip: { backgroundColor:"rgba(5,16,14,.95)", titleColor:"#fff", bodyColor:"#d7eee6", borderColor:"rgba(22,217,119,.35)", borderWidth:1 }
          },
          scales: {
            x: { ticks: { color: chartColors.text, font: { size: 10, weight: "800" } }, grid: { display: horizontal, color: chartColors.grid } },
            y: { beginAtZero: true, ticks: { precision: 0, color: chartColors.text, font: { size: 10, weight: "800" } }, grid: { color: chartColors.grid } }
          }
        }
      });
      return charts[id];
    }

    function renderInspectorsView() {
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
            color: "#ffb020"
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
            color: "#ffb020",
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
            color: "#ffb020"
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
      const fallback = prefix === "report" ? "last90" : "last30";
      if (q(ids.preset)) q(ids.preset).value = fallback;
      applyModulePeriodPreset(prefix, fallback);
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
            <div><span>Data inregistrare</span><b>${escapeHtml(registeredDate ? formatDay(registeredDate) : "-")}</b></div>
            <div><span>Data control</span><b>${escapeHtml(controlDate ? formatDay(controlDate) : "-")}</b></div>
            <div><span>Timp raspuns</span><b>${escapeHtml(formatDays(responseDays))}</b></div>
            <div><span>Rezultat control</span><b style="color:${colorByResult(found.result)}">${escapeHtml(resultLabel(found.result))}</b></div>
            <div><span>Garda</span><b>${escapeHtml(found.garda || "-")}</b></div>
            <div><span>Localitate</span><b>${escapeHtml(found.localitate || "-")}</b></div>
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
        </article>
      `);
    }
    function renderPetitionersView() {
      renderPetitionKpis();
      let arr = getModulePeriodControls("petition").filter(isPetition);
      setText("petitionVisibleCount", arr.length + " sesizari afisate");
      const petitioner = safeValue("petitionerSearch", "").trim();
      if (isInternalMode && petitioner) arr = arr.filter(c => getPetitionerName(c) === petitioner);
      const responseStats = computePetitionResponseStats(arr);
      const confirmed = arr.filter(c => getPetitionConfirmation(c).className === "confirmed").length;
      const partial = arr.filter(c => getPetitionConfirmation(c).className === "partial").length;
      if (isInternalMode && petitioner) setText("petitionerSummary", `${petitioner}: ${arr.length} sesizari in ${getModulePeriodLabel("petition")}. Timp mediu raspuns: ${formatDays(responseStats.avg)}.`);
      else setText("petitionerSummary", `Total sesizari in ${getModulePeriodLabel("petition")}: ${arr.length}. Timp mediu raspuns: ${formatDays(responseStats.avg)}.`);
      if (q("petitionResponseStats")) {
        setHtml("petitionResponseStats", isInternalMode ? `
          <div><span>Timp mediu raspuns</span><strong>${escapeHtml(formatDays(responseStats.avg))}</strong><small>${responseStats.count} sesizari cu data citibila</small></div>
          <div><span>Mediana raspuns</span><strong>${escapeHtml(formatDays(responseStats.median))}</strong><small>indicator robust</small></div>
          <div><span>Maxim raspuns</span><strong>${escapeHtml(formatDays(responseStats.max))}</strong><small>caz cel mai intarziat</small></div>
          <div><span>Confirmate</span><strong>${confirmed + partial}</strong><small>${confirmed} integral / ${partial} partial</small></div>
        ` : "");
      }
      const byYear = countBy(arr, yearKey); const years = Object.keys(byYear).sort(); makeChart("chartPetitionsYears", "bar", years, years.map(y => byYear[y]));
      const byG = countBy(arr, c => c.garda); const g = topEntries(byG, 9); makeChart("chartPetitionsGarzi", "bar", g.map(x => gardaShortLabel(x[0])), g.map(x => x[1]));
      const byR = countBy(arr, c => resultLabel(c.result)); makeChart("chartPetitionsResults", "doughnut", Object.keys(byR), Object.values(byR));
      if (isInternalMode && q("chartPetitionsResponse")) {
        const labels = Object.keys(responseStats.buckets);
        makeChart("chartPetitionsResponse", "bar", labels, labels.map(label => responseStats.buckets[label]), {
          label: "Sesizari",
          colors: [chartColors.green, chartColors.blue, chartColors.orange, chartColors.red]
        });
      }
      renderPetitionTable(arr);
    }
    function renderPetitionTable(arr) {
      const rows = [...arr].sort((a,b) => new Date(b.created_at)-new Date(a.created_at)).slice(0, 30).map(c => {
        const confirmation = getPetitionConfirmation(c);
        const registered = getPetitionRegisteredDate(c);
        const controlDate = getControlDateValue(c);
        return `<tr>
          <td>${escapeHtml(getPetitionNumber(c) || "-")}</td>
          ${isInternalMode ? `<td>${escapeHtml(getPetitionerName(c) || "-")}</td>` : ""}
          <td>${escapeHtml(registered ? formatDay(registered) : "-")}</td>
          <td>${escapeHtml(controlDate ? formatDay(controlDate) : "-")}</td>
          <td>${escapeHtml(formatDays(getPetitionResponseDays(c)))}</td>
          <td>${escapeHtml(c.garda || "-")}</td>
          <td style="color:${colorByResult(c.result)};font-weight:950;">${escapeHtml(resultLabel(c.result))}</td>
          <td><span class="petition-confirmation mini ${confirmation.className}">${escapeHtml(confirmation.label)}</span></td>
        </tr>`;
      }).join("");
      const colspan = isInternalMode ? 8 : 7;
      setHtml("petitionHistory", `<table><thead><tr><th>Nr. sesizare</th>${isInternalMode ? "<th>Petitionar</th>" : ""}<th>Inregistrare</th><th>Control</th><th>Timp</th><th>Garda</th><th>Rezultat</th><th>Confirmare</th></tr></thead><tbody>${rows || `<tr><td colspan="${colspan}">Nu exista sesizari in filtrele active.</td></tr>`}</tbody></table>`);
    }

    function renderEntitiesView() {
      if (!isInternalMode) return;
      const selected = safeValue("entitySearch", "").trim();
      const all = getEntityBaseControls();
      const selectedNorm = normalizeText(selected);
      const entityNames = [...new Set(all.map(getEntityName).filter(Boolean))];
      const exactEntity = selectedNorm
        ? entityNames.find(name => normalizeText(name) === selectedNorm)
        : "";
      let arr = all;
      if (exactEntity) {
        arr = all.filter(c => normalizeText(getEntityName(c)) === normalizeText(exactEntity));
      } else if (selectedNorm) {
        arr = all.filter(c => normalizeText(getEntityName(c)).includes(selectedNorm));
      }
      const hasEntitySelection = Boolean(exactEntity);
      renderEntityKpis(arr);
      const latest = [...arr].sort((a,b) => new Date(b.created_at)-new Date(a.created_at))[0];
      const uniqueEntities = uniqueCount(arr, getEntityName);
      const problemControls = arr.filter(c => isProblemResult(c.result)).length;
      setText("entityTotalKpi", uniqueEntities);
      setText("entityControlsKpi", arr.length);
      setText("entityLatestKpi", latest ? formatDay(latest.created_at) : "-");
      setText("entitySummary", hasEntitySelection
        ? `Analiza entitate: ${exactEntity}. ${arr.length} controale, ${problemControls} cu probleme in ${getModulePeriodLabel("entity")}.`
        : selected
          ? `Cautare: ${selected}. ${arr.length} controale gasite pe ${uniqueEntities} entitati in ${getModulePeriodLabel("entity")}. Selecteaza o entitate din lista pentru raport dedicat.`
          : `Sinteza pentru ${uniqueCount(all, getEntityName)} entitati si ${all.length} controale in ${getModulePeriodLabel("entity")}.`);

      if (hasEntitySelection) {
        const byCategory = topEntries(countBy(arr, c => getControlCategory(c) || c.control_type || "Necunoscut"), 10);
        const categoryValues = byCategory.map(x => x[1]);
        setText("entityChartMainTitle", "Categorii control");
        setText("entityChartMainSub", "entitate selectata");
        makeChart("chartEntitiesTop", "bar", byCategory.map(x => x[0]), categoryValues, {
          horizontal: true,
          label: "Controale",
          colors: gradientColorsByValues(categoryValues, "total")
        });
      } else {
        const top = topEntries(countBy(all, getEntityName), 10);
        const topValues = top.map(x => x[1]);
        setText("entityChartMainTitle", "Top entitati");
        setText("entityChartMainSub", "controale");
        makeChart("chartEntitiesTop", "bar", top.map(x => x[0]), topValues, {
          horizontal: true,
          label: "Controale",
          colors: gradientColorsByValues(topValues, "total")
        });
      }

      setText("entityChartMonthlySub", hasEntitySelection ? "entitate selectata" : "controale filtrate");
      setText("entityChartGuardSub", hasEntitySelection ? "entitate selectata" : "entitati filtrate");
      setText("entityChartResultSub", hasEntitySelection ? "entitate selectata" : "filtru curent");

      const byM = countBy(arr, monthKey);
      const months = Object.keys(byM).sort();
      makeChart("chartEntitiesMonthly", "line", months.map(monthLabel), months.map(m => byM[m]), { label: "Controale" });

      const byG = topEntries(countBy(arr, c => guardDisplayName(c.garda)), 9);
      const guardValues = byG.map(x => x[1]);
      makeChart("chartEntitiesGuards", "bar", byG.map(x => gardaShortLabel(x[0])), guardValues, {
        label: "Controale",
        colors: gradientColorsByValues(guardValues, "total")
      });

      const byR = countBy(arr, c => resultLabel(c.result)); makeChart("chartEntitiesResults", "doughnut", Object.keys(byR), Object.values(byR));
      renderEntityTable(arr);
    }
    function renderEntityTable(arr) {
      const rows = [...arr].sort((a,b) => new Date(b.created_at)-new Date(a.created_at)).slice(0, 36).map(c => {
        const color = colorByResult(c.result);
        const category = getControlCategory(c) || c.control_type || "-";
        const domain = getControlDomainRaw(c) || "-";
        const findings = getViolationText(c) || c.constatari || "Fara constatari suplimentare.";
        const measures = getMeasuresText(c) || "Fara masuri suplimentare.";
        const legalBasis = getLegalBasis(c);
        const legalText = legalBasis
          ? legalBasis
          : (["sanctiune", "sesizare_penala", "neconform"].includes(c.result)
            ? "Baza legala nu este completata in fisa controlului."
            : "Nu au fost consemnate sanctiuni sau infractiuni.");
        const petition = getPetitionNumber(c);
        const controlDate = firstValue(c, ["data_control", "created_at"]);
        const controlTime = getControlTimeLabel(c);
        const partners = Array.isArray(c.parteneri) && c.parteneri.length ? c.parteneri.join(", ") : "-";
        const representative = [c.reprezentant_nume, c.reprezentant_calitate].filter(Boolean).join(" - ") || "-";
        return `<article class="entity-control-card">
          <div class="entity-control-head">
            <div class="entity-date-badge">
              <strong>${escapeHtml(formatDay(controlDate))}</strong>
              <span>${escapeHtml(controlTime || "ora -")}</span>
            </div>
            <div class="entity-control-title">
              <strong>Raport control #${escapeHtml(c.id || "-")}</strong>
              <span>${escapeHtml(getEntityName(c) || "-")}</span>
            </div>
            <span class="entity-result-chip" style="--entity-result-color:${color};">${escapeHtml(resultLabel(c.result))}</span>
          </div>
          <div class="entity-control-grid">
            <div><span>Garda</span><b>${escapeHtml(c.garda || "-")}</b></div>
            <div><span>Localitate</span><b>${escapeHtml(c.localitate || "-")}</b></div>
            <div><span>Reper</span><b>${escapeHtml(c.reper || "-")}</b></div>
            <div><span>Tip control</span><b>${escapeHtml(getControlModeLabel(c))}</b></div>
            <div><span>Domeniu</span><b>${escapeHtml(domain)}</b></div>
            <div><span>Categorie</span><b>${escapeHtml(category)}</b></div>
            <div><span>Tip entitate</span><b>${escapeHtml(c.tip_entitate || "-")}</b></div>
            <div><span>CUI</span><b>${escapeHtml(c.cui || "-")}</b></div>
            <div><span>Reprezentant</span><b>${escapeHtml(representative)}</b></div>
            <div><span>Amenda</span><b>${escapeHtml(formatMoney(getFineAmount(c)))}</b></div>
            <div><span>Prejudiciu</span><b>${escapeHtml(formatMoney(getDamageAmount(c)))}</b></div>
            <div><span>Sesizare</span><b>${escapeHtml(petition || "-")}</b></div>
            <div class="entity-wide"><span>Inspectori participanti</span><b>${escapeHtml(getInspectorNames(c))}</b></div>
            <div><span>Parteneri control</span><b>${escapeHtml(partners)}</b></div>
          </div>
          <div class="entity-report-block">
            <h4>Constatari esentiale</h4>
            <p>${escapeHtml(findings)}</p>
          </div>
          <div class="entity-report-block entity-legal-block">
            <h4>Baza legala masura</h4>
            <p>${escapeHtml(legalText)}</p>
          </div>
          <div class="entity-report-block">
            <h4>Masuri dispuse</h4>
            <p>${escapeHtml(measures)}</p>
          </div>
        </article>`;
      }).join("");
      setHtml("entityHistory", rows || `<div class="empty">Nu exista controale pentru entitatea sau perioada selectata.</div>`);
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
          <td>${escapeHtml(formatMoney(item.finePerControl || 0))}</td>
          <td>${escapeHtml(formatMoney(item.damagePerControl || 0))}</td>
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

          <div class="report-kpi-grid">
            ${reportKpiCard("Total controale", String(stats.total), "controale in perioada raportata")}
            ${reportKpiCard("Controale / 10.000 ha", stats.density.toFixed(2), "normalizat dupa suprafata", reportStatusChip(stats.density, "density"))}
            ${reportKpiCard("Rata conformare", formatPercent(stats.conformRate), `${stats.conform} controale conforme`)}
            ${reportKpiCard("Rata probleme", formatPercent(stats.problemRate), `${stats.problems} controale cu probleme`, reportStatusChip(stats.problemRate, "problem"))}
            ${reportKpiCard("Masuri ferme", formatPercent(stats.sanctionRate), `${stats.sanctions} sanctiuni/sesizari penale`)}
            ${reportKpiCard("Sesizari", formatPercent(stats.petitionShare), `${stats.petitions} controale generate de sesizari`)}
            ${reportKpiCard("Amenzi / control", formatMoney(stats.finePerControl), `total ${formatMoney(stats.fines)}`)}
            ${reportKpiCard("Prejudiciu / control", formatMoney(stats.damagePerControl), `total ${formatMoney(stats.damage)}`)}
          </div>

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

      const byR = countBy(arr, c => resultLabel(c.result)); makeChart("chartReportResults", "doughnut", Object.keys(byR), Object.values(byR));
      const byT = countBy(arr, c => c.control_type); makeChart("chartReportTypes", "doughnut", Object.keys(byT), Object.values(byT));
      const byC = countBy(arr, c => getControlCategory(c)); const topC = topEntries(byC, 8); makeChart("chartReportCategories", "bar", topC.map(x => x[0]), topC.map(x => x[1]), { horizontal: true });
    }

    function normalizeResultLabelBack(label) {
      const n = normalizeText(label);
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
      return String(value ?? "").replace(/[&<>'"]/g, ch => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", "'":"&#39;", '"':"&quot;" }[ch]));
    }
    function escapeAttr(value) {
      return escapeHtml(value).replace(/`/g, "&#96;");
    }



    /* === PATCH JS: category fix, stable user chip, recent click-to-control === */
    const markerByControlId = new Map();
    const markersByControlId = markerByControlId;
    const invalidCoordinateWarningIds = new Set();

    function parseCoord(value) {
      if (value === null || value === undefined || value === "") return null;
      if (typeof value === "string") value = value.trim().replace(",", ".");
      const n = Number(value);
      return Number.isFinite(n) ? n : null;
    }

    function isInsideRomania(lat, lon) {
      return lat >= 43.0 && lat <= 49.0 && lon >= 20.0 && lon <= 30.5;
    }

    function warnInvalidControlCoordinates(control, lat, lon) {
      const id = control && control.id !== undefined && control.id !== null ? String(control.id) : "necunoscut";
      if (invalidCoordinateWarningIds.has(id)) return;
      invalidCoordinateWarningIds.add(id);
      console.warn("Coordonate control in afara Romaniei:", { id: control && control.id, lat, lon, control });
    }

    function normalizeControlCoordinates(control) {
      const lat = parseCoord(control && control.lat);
      const lon = parseCoord(control && control.lon);
      if (lat === null || lon === null) {
        warnInvalidControlCoordinates(control, lat, lon);
        return null;
      }
      if (isInsideRomania(lat, lon)) return { lat, lon };
      if (isInsideRomania(lon, lat)) return { lat: lon, lon: lat };
      warnInvalidControlCoordinates(control, lat, lon);
      return null;
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
      const marker = markerByControlId.get(String(control.id));
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
      selectedPopupControlId = String(controlId);
      renderControlDetail(control);
      if (options.focusMap !== false && map) {
        const marker = markerByControlId.get(String(controlId));
        if (marker) map.flyTo(marker.getLatLng(), Math.max(map.getZoom(), 10), { duration: 0.55 });
      }
    }

    function clearControlDetail() {
      selectedPopupControlId = null;
      if (map) map.closePopup();
      renderControlDetail(null);
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
        ["amenda", "Amenda RON"],
        ["prejudiciu", "Prejudiciu RON"],
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
      openControlDetail(controlId, { focusMap: false });
      setTimeout(() => {
        const marker = markerByControlId.get(String(controlId));
        if (marker) {
          const ll = marker.getLatLng();
          map.flyTo(ll, Math.max(map.getZoom(), 10), { duration: 0.6 });
          setTimeout(() => openMarkerPopup(marker, controlId), 650);
        } else {
          console.warn("Marker inexistent pentru controlul selectat:", { id: controlId, control });
        }
      }, 120);
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
        const marker = markerByControlId.get(String(selectedPopupControlId));
        try {
          if (marker) openMarkerPopup(marker, selectedPopupControlId);
          updateMapControlPopupPosition();
        } catch {}
      }, delay);
    }

    function controlClusterIcon(count, level = "local") {
      const sizeClass = count < 30 ? "small" : count < 120 ? "medium" : "large";
      const diameter = Math.max(34, Math.min(78, Math.round(31 + Math.sqrt(count) * 2.25)));
      const fontSize = Math.max(12, Math.min(21, Math.round(diameter * 0.34)));
      return L.divIcon({
        html: `<div style="--cluster-size:${diameter}px;--cluster-font:${fontSize}px;"><span>${count}</span></div>`,
        className: `marker-cluster marker-cluster-${sizeClass} marker-cluster-${level}`,
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
      openControlDetail(controlId, { focusMap: false });
      const activeMarker = marker || markerByControlId.get(String(controlId));
      if (activeMarker) openMarkerPopup(activeMarker, controlId);
    }

    function getControlDisplayLatLng(control) {
      return normalizeControlCoordinates(control);
    }

    function addControlPoint(c) {
      const point = getControlDisplayLatLng(c);
      if (!point) return;
      const color = colorByResult(c.result);
      const marker = L.marker([point.lat, point.lon], { icon: controlMarkerIcon(color), pane: "controlsPane", keyboard: false, riseOnHover: true, zIndexOffset: 1000 });
      markerByControlId.set(String(c.id), marker);
      bindControlPopup(marker, c, color);
      marker.on("click", () => selectMapControl(c.id, marker));
      marker.on("add", () => markControlElement(marker, c.id));
      marker.addTo(markersLayer);
      markControlElement(marker, c.id);
      return marker;
    }

    function getControlClusters(arr) {
      const buckets = new Map();
      arr.forEach(c => {
        const displayPoint = getControlDisplayLatLng(c);
        if (!displayPoint) return;
        const lat = displayPoint.lat, lon = displayPoint.lon;
        const point = map.latLngToLayerPoint([lat, lon]);
        const guardKey = canonicalGuardName(c.garda) || "necunoscut";
        const key = `${guardKey}:${Math.floor(point.x / MAP_CLUSTER_CELL_SIZE)}:${Math.floor(point.y / MAP_CLUSTER_CELL_SIZE)}`;
        if (!buckets.has(key)) buckets.set(key, { controls: [], latSum: 0, lonSum: 0, level: "local" });
        const bucket = buckets.get(key);
        bucket.controls.push(c);
        bucket.latSum += lat;
        bucket.lonSum += lon;
      });
      return [...buckets.values()];
    }

    function getGuardFeatureCenters() {
      if (guardCenterCache) return guardCenterCache;
      guardCenterCache = {};
      const features = guardStatsGeoJson && Array.isArray(guardStatsGeoJson.features) ? guardStatsGeoJson.features : [];
      features.forEach(feature => {
        const key = canonicalGuardName(getGuardNameFromFeature(feature));
        if (!key) return;
        try {
          const layer = L.geoJSON(feature);
          const center = layer.getBounds().getCenter();
          if (center && !isNaN(center.lat) && !isNaN(center.lng)) guardCenterCache[key] = center;
        } catch {}
      });
      return guardCenterCache;
    }

    function getGuardClusters(arr) {
      const centers = getGuardFeatureCenters();
      const buckets = new Map();
      arr.forEach(c => {
        const displayPoint = getControlDisplayLatLng(c);
        if (!displayPoint) return;
        const lat = displayPoint.lat, lon = displayPoint.lon;
        const key = canonicalGuardName(c.garda) || "necunoscut";
        if (!buckets.has(key)) buckets.set(key, { controls: [], latSum: 0, lonSum: 0, level: "guard", label: guardDisplayName(c.garda) });
        const bucket = buckets.get(key);
        bucket.controls.push(c);
        bucket.latSum += lat;
        bucket.lonSum += lon;
      });
      return [...buckets.entries()].map(([key, bucket]) => {
        const center = centers[key];
        const count = bucket.controls.length || 1;
        return {
          ...bucket,
          lat: center ? center.lat : bucket.latSum / count,
          lon: center ? center.lng : bucket.lonSum / count
        };
      });
    }

    function addControlCluster(bucket) {
      if (bucket.controls.length === 1) return addControlPoint(bucket.controls[0]);
      const count = bucket.controls.length;
      const lat = bucket.lat !== undefined ? bucket.lat : bucket.latSum / count;
      const lon = bucket.lon !== undefined ? bucket.lon : bucket.lonSum / count;
      const marker = L.marker([lat, lon], { icon: controlClusterIcon(count, bucket.level || "local"), keyboard: false });
      const label = bucket.label ? `${bucket.label}: ${count} controale` : `${count} controale`;
      marker.bindTooltip(label, { direction: "top", opacity: .96 });
      marker.on("click", () => {
        if (!map) return;
        const isGuardCluster = bucket.level === "guard";
        mapClusterMode = isGuardCluster ? "local" : "points";
        mapPointMode = !isGuardCluster;
        const nextZoom = bucket.level === "guard"
          ? Math.max(map.getZoom() + 2, MAP_GUARD_CLUSTER_ZOOM_THRESHOLD + 1)
          : Math.min(Math.max(map.getZoom() + 2, MAP_CLUSTER_ZOOM_THRESHOLD), 13);
        map.flyTo([lat, lon], nextZoom, { duration: 0.45 });
        clearTimeout(markerRenderTimer);
        markerRenderTimer = setTimeout(() => renderMarkers(mapRenderControls), 560);
      });
      marker.addTo(markersLayer);
    }

    function renderMarkers(arr) {
      mapRenderControls = arr;
      isRenderingMarkers = true;
      markerByControlId.clear();
      markersLayer.clearLayers();
      let displayed = 0;
      arr.forEach(c => { if (addControlPoint(c)) displayed += 1; });
      setText("visibleCount", displayed + " controale afisate");
      keepMarkersOnTop();
      isRenderingMarkers = false;
      reopenSelectedControlPopup(40);
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
    window.exportFilteredControlsExcel = exportFilteredControlsExcel;
    window.focusControl = focusControl;

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
      if (!isInternalMode && ["inspectori", "entities"].includes(view)) view = "map";
      originalSetViewForAccess(view);
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
      const recentControl = event.target.closest ? event.target.closest(".recent-row[data-control-id]") : null;
      if (recentControl) {
        event.preventDefault();
        focusControl(recentControl.dataset.controlId);
        return;
      }
      const popupDetail = event.target.closest ? event.target.closest(".popup-detail-btn[data-control-id]") : null;
      if (popupDetail) {
        event.preventDefault();
        openControlDetail(popupDetail.dataset.controlId, { focusMap: false });
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
    window.addEventListener("resize", () => setTimeout(() => {
      if (map) map.invalidateSize();
      updateMapControlPopupPosition();
    }, 150));
