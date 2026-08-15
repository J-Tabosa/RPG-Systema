// ── CONSTANTS ─────────────────────────────────────────────────────────────────
const SK = "rpg_fichas_v1";
const SK_CUSTOM = "rpg_gerador_custom_v1";
const SK_PRESETS = "rpg_conteudo_presets_v1";

const ACCENT_PRESETS = [
  { name: "Dourado", gold: "#c8a86b", gold2: "#e8c98a", accent: "#d4a843" },
  { name: "Esmeralda", gold: "#4a9c6e", gold2: "#6abf90", accent: "#3a8c5e" },
  { name: "Rubi", gold: "#c84a4a", gold2: "#e87070", accent: "#b03030" },
  { name: "Safira", gold: "#4a6bc8", gold2: "#7090e8", accent: "#3a5ab0" },
  { name: "Ametista", gold: "#9a4ac8", gold2: "#bc70e8", accent: "#8030a0" },
  { name: "Prata", gold: "#9aacbe", gold2: "#c0d0e0", accent: "#8090a0" },
];

const BG_DARK_PRESETS = [
  { name: "Padrão", bg: "#0f0d0a", surface: "#1c1710", card: "#241e14", card2: "#2a2318", border: "#3d3320" },
  { name: "Ardósia", bg: "#0a0c10", surface: "#141820", card: "#1c2230", card2: "#222840", border: "#2a3448" },
  { name: "Floresta", bg: "#080e0a", surface: "#101a12", card: "#182418", card2: "#1e2c1e", border: "#2a3e2a" },
  { name: "Vinho", bg: "#0e0809", surface: "#1c1014", card: "#281618", card2: "#30181e", border: "#442028" },
  { name: "Névoa", bg: "#0c0c0e", surface: "#161618", card: "#202024", card2: "#28282e", border: "#383840" },
];

const BG_LIGHT_PRESETS = [
  { name: "Pergaminho", bg: "#f0ece0", surface: "#e4deca", card: "#f7f3e8", card2: "#ede8d8", border: "#c0a868" },
  { name: "Gelo", bg: "#e8eef4", surface: "#d8e2ec", card: "#f0f4f8", card2: "#e4eaf0", border: "#a0b8cc" },
  { name: "Menta", bg: "#e8f0ec", surface: "#d8e8dc", card: "#f0f6f2", card2: "#e4eee8", border: "#a0c4a8" },
  { name: "Rosa", bg: "#f4e8ec", surface: "#ecd8dc", card: "#faf0f2", card2: "#f0e4e8", border: "#c8a0a8" },
];

const DEFAULT_SECTION_ORDER = [
  "atributos",
  "combate",
  "pericias",
  "mana",
  "magias",
  "poderes",
  "equipamento",
  "aparencia",
  "personalidade"
];

// ── INDEXEDDB FOR IMAGES ──────────────────────────────────────────────────────
const DB_NAME = "rpg_images_db";
const DB_VERSION = 1;
const STORE_NAME = "char_avatars";

function openImagesDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
    };
    request.onsuccess = (e) => resolve(e.target.result);
    request.onerror = (e) => reject(e.target.error);
  });
}

async function saveImageToDB(id, base64Data) {
  try {
    const db = await openImagesDB();
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    store.put({ id, image: base64Data });
    return new Promise((resolve) => (tx.oncomplete = () => resolve()));
  } catch (err) {
    console.error("Erro ao salvar imagem no IndexedDB", err);
  }
}

async function loadImageFromDB(id) {
  try {
    const db = await openImagesDB();
    const tx = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);
    const request = store.get(id);
    return new Promise((resolve) => {
      request.onsuccess = () => resolve(request.result ? request.result.image : null);
      request.onerror = () => resolve(null);
    });
  } catch (err) {
    console.error("Erro ao carregar imagem do IndexedDB", err);
    return null;
  }
}

async function deleteImageFromDB(id) {
  try {
    const db = await openImagesDB();
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    store.delete(id);
    return new Promise((resolve) => (tx.oncomplete = () => resolve()));
  } catch (err) {
    console.error("Erro ao deletar imagem do IndexedDB", err);
  }
}

// ── STORAGE ───────────────────────────────────────────────────────────────────
function load() {
  try { return JSON.parse(localStorage.getItem(SK)) || []; } catch (e) { return []; }
}
function save(arr) {
  localStorage.setItem(SK, JSON.stringify(arr));
}
function loadCustom() {
  try {
    return JSON.parse(localStorage.getItem(SK_CUSTOM)) || { racas: [], classes: [], profissoes: [], personalidades: [], estilos: [] };
  } catch (e) {
    return { racas: [], classes: [], profissoes: [], personalidades: [], estilos: [] };
  }
}

// ── STATE ─────────────────────────────────────────────────────────────────────
let fichas = load();
let activeId = fichas.length ? fichas[0].id : null;
let editingAttr = null, editingHabil = null, editingSpell = null, editingEquip = null, deletingSpellIndex = null;
let themeMenuOpen = false;
let baseDB = null;
let DB = null;
let presetModalTargetFichaId = null;

let openSpellFolders = { 0: true, 1: true, 2: true, 3: true, 4: true, 5: true, 6: true, 7: true, 8: true, 9: true };

// ── THEME (global claro/escuro) ───────────────────────────────────────────────
let dark = localStorage.getItem("rpg_theme") !== "light";
function applyGlobalTheme() {
  document.body.classList.toggle("light", !dark);
  document.getElementById("optDark").classList.toggle("active", dark);
  document.getElementById("optLight").classList.toggle("active", !dark);
}
function setTheme(t) {
  dark = t === "dark";
  localStorage.setItem("rpg_theme", t);
  applyGlobalTheme();
  applyFichaColors();
}
applyGlobalTheme();

// ── THEME MENU ────────────────────────────────────────────────────────────────
function toggleThemeMenu() {
  themeMenuOpen = !themeMenuOpen;
  document.getElementById("themeDropdown").classList.toggle("open", themeMenuOpen);
}
document.addEventListener("click", (e) => {
  if (themeMenuOpen && !document.getElementById("themeMenuWrap").contains(e.target)) {
    themeMenuOpen = false;
    document.getElementById("themeDropdown").classList.remove("open");
  }
});

// ── DATA INTEGRATION & FILTERS ────────────────────────────────────────────────
async function carregarDB() {
  try {
    const res = await fetch("../data/personagens.json");
    baseDB = await res.json();
  } catch (e) {
    baseDB = { racas: [], classes: [], profissoes: [], personalidades: [], estilos: [] };
  }
  DB = JSON.parse(JSON.stringify(baseDB));
  const custom = loadCustom();
  Object.keys(custom).forEach((cat) => {
    if (DB[cat]) DB[cat] = DB[cat].concat(custom[cat]);
  });

  const urlParams = new URLSearchParams(window.location.search);
  const targetId = urlParams.get("id");

  if (targetId && fichas.some((f) => f.id === targetId)) {
    activeId = targetId;
    const fTarget = fichas.find((f) => f.id === targetId);
    if (fTarget) {
      activeFolder = fTarget.folder || folderFromType(fTarget.type);
    }
  }

  renderSidebar();
  renderEditor();
  applyFichaColors();
}

function getFilteredCat(cat, presetId) {
  if (!DB || !DB[cat]) return [];
  if (!presetId || presetId === "default") return DB[cat];

  let presets = [];
  try { presets = JSON.parse(localStorage.getItem(SK_PRESETS)) || []; } catch (e) {}

  const currentPreset = presets.find((p) => p.id === presetId);
  if (currentPreset && currentPreset.blocked && currentPreset.blocked[cat]) {
    return DB[cat].filter((item) => !currentPreset.blocked[cat].includes(item.id));
  }
  return DB[cat];
}

// ── PRESET POPUP FUNCTIONS ────────────────────────────────────────────────────
function openPresetModalForNew() {
  presetModalTargetFichaId = null;
  document.getElementById("mPresetTitle").textContent = "Configurar Nova Campanha";
  populatePresetSelect("default");
  document.getElementById("mPreset").style.display = "flex";
}

function openPresetModalForEdit(fichaId) {
  presetModalTargetFichaId = fichaId;
  document.getElementById("mPresetTitle").textContent = "Mudar Preset da Ficha";
  const targetFicha = fichas.find((f) => f.id === fichaId);
  populatePresetSelect(targetFicha ? targetFicha.presetId : "default");
  document.getElementById("mPreset").style.display = "flex";
}

function populatePresetSelect(selectedId) {
  let listaPresets = [];
  try { listaPresets = JSON.parse(localStorage.getItem(SK_PRESETS)) || []; } catch (e) {}

  const html =
    `<option value="default">Padrão (Todo Conteúdo)</option>` +
    listaPresets
      .map((p) => `<option value="${p.id}" ${selectedId === p.id ? "selected" : ""}>${p.name || p.nome || "Preset Sem Nome"}</option>`)
      .join("");

  document.getElementById("presetModalSelector").innerHTML = html;
}

function confirmPresetModal() {
  const chosenPresetId = document.getElementById("presetModalSelector").value;
  closeM("mPreset");

  if (presetModalTargetFichaId === null) {
    newFicha(chosenPresetId);
  } else {
    activeId = presetModalTargetFichaId;
    upd((f) => {
      f.presetId = chosenPresetId;
      const validRacas = getFilteredCat("racas", chosenPresetId).map((x) => x.nome);
      const validClasses = getFilteredCat("classes", chosenPresetId).map((x) => x.nome);
      const validProfs = getFilteredCat("profissoes", chosenPresetId).map((x) => x.nome);

      if (f.race && !validRacas.includes(f.race)) f.race = "";
      if (f.class && !validClasses.includes(f.class)) f.class = "";
      if (f.background && !validProfs.includes(f.background)) f.background = "";
    });
    renderSidebar();
    renderEditor();
    toast("Preset de Campanha alterado e filtros reaplicados!");
  }
}

// ── PER-FICHA COLOR INJECTION ──────────────────────────────────────────────────
function getFichaColors(f) { return f.colors || {}; }

function applyFichaColors() {
  const f = getFicha();
  const sec = document.getElementById("accentSection");
  if (sec) sec.style.display = f ? "block" : "none";
  if (!f) { injectStyle(""); return; }

  const c = getFichaColors(f);
  let gold, gold2, accent;
  if (c.customAccent) {
    gold = c.customAccent;
    gold2 = lighten(c.customAccent, 30);
    accent = c.customAccent;
  } else if (c.accentIdx !== undefined) {
    const p = ACCENT_PRESETS[c.accentIdx];
    gold = p.gold; gold2 = p.gold2; accent = p.accent;
  } else {
    gold = "#c8a86b"; gold2 = "#e8c98a"; accent = "#d4a843";
  }

  let bg, surface, card, card2, border;
  const presets = dark ? BG_DARK_PRESETS : BG_LIGHT_PRESETS;
  if (c.customBg) {
    const base = c.customBg;
    if (dark) {
      bg = base; surface = blendHex(base, "#ffffff", 0.06); card = blendHex(base, "#ffffff", 0.12); card2 = blendHex(base, "#ffffff", 0.18); border = blendHex(base, "#ffffff", 0.25);
    } else {
      bg = base; surface = blendHex(base, "#000000", 0.06); card = blendHex(base, "#ffffff", 0.5); card2 = blendHex(base, "#000000", 0.04); border = blendHex(base, "#000000", 0.2);
    }
  } else if (c.bgIdx !== undefined) {
    const p = presets[c.bgIdx];
    bg = p.bg; surface = p.surface; card = p.card; card2 = p.card2; border = p.border;
  } else {
    bg = null;
  }

  let customFieldStyle = "";
  if (c.customFieldFontColor) {
    customFieldStyle = `
      .form-field label, .attr-abr, .combat-label, .skill-name, .slot-lbl, .color-row-label { color: ${c.customFieldFontColor} !important; }
      .attr-val-input, .combat-val-input, .attr-mod-display, .skill-bonus, .meta-grid select, .meta-grid input { color: ${c.customFieldFontColor} !important; }
      .char-name-header { color: ${c.customFieldFontColor} !important; }
    `;
  } else {
    customFieldStyle = `.char-name-header { color: ${gold} !important; }`;
  }

  const bgVars = bg ? `--bg:${bg};--surface:${surface};--card:${card};--card2:${card2};--border:${border};` : "";
  injectStyle(`:root{--gold:${gold};--gold2:${gold2};--accent:${accent};${bgVars}} ${customFieldStyle}`);

  if (document.getElementById("customAccent")) document.getElementById("customAccent").value = gold.slice(0, 7);
  if (document.getElementById("customBg")) {
    document.getElementById("customBg").value = c.customBg ? c.customBg.slice(0, 7) : (bg || "#0f0d0a").slice(0, 7);
  }
  if (document.getElementById("customFieldFontColor")) {
    document.getElementById("customFieldFontColor").value = c.customFieldFontColor || (dark ? "#ffffff" : "#111111");
  }

  if (document.getElementById("fichaNameLabel")) document.getElementById("fichaNameLabel").textContent = f.name;
  renderAccentPresets(c.accentIdx);
  renderBgPresets(c.bgIdx);
}

function injectStyle(css) {
  let el = document.getElementById("fichaStyle");
  if (!el) {
    el = document.createElement("style");
    el.id = "fichaStyle";
    document.head.appendChild(el);
  }
  el.textContent = css;
}

function lighten(hex, amt) {
  let r = parseInt(hex.slice(1, 3), 16), g = parseInt(hex.slice(3, 5), 16), b = parseInt(hex.slice(5, 7), 16);
  return "#" + [Math.min(255, r + amt), Math.min(255, g + amt), Math.min(255, b + amt)].map((x) => x.toString(16).padStart(2, "0")).join("");
}
function blendHex(hex, with2, t) {
  const a = hex.slice(1), b = with2.slice(1);
  const r = Math.round(parseInt(a.slice(0, 2), 16) * (1 - t) + parseInt(b.slice(0, 2), 16) * t);
  const g = Math.round(parseInt(a.slice(2, 4), 16) * (1 - t) + parseInt(b.slice(2, 4), 16) * t);
  const bv = Math.round(parseInt(a.slice(4, 6), 16) * (1 - t) + parseInt(b.slice(4, 6), 16) * t);
  return "#" + [r, g, bv].map((x) => Math.max(0, Math.min(255, x)).toString(16).padStart(2, "0")).join("");
}

function renderAccentPresets(activeIdx) {
  const el = document.getElementById("accentPresets");
  if (!el) return;
  el.innerHTML = ACCENT_PRESETS.map((p, i) => `<div class="color-preset${activeIdx === i ? " active" : ""}" style="background:${p.gold}" onclick="setAccentPreset(${i})" title="${p.name}"></div>`).join("");
}
function renderBgPresets(activeIdx) {
  const el = document.getElementById("bgPresets");
  if (!el) return;
  const presets = dark ? BG_DARK_PRESETS : BG_LIGHT_PRESETS;
  el.innerHTML = presets.map((p, i) => `<div class="color-preset${activeIdx === i ? " active" : ""}" style="background:${p.bg};border:2px solid ${p.border}" onclick="setBgPreset(${i})" title="${p.name}"></div>`).join("");
}

function setAccentPreset(i) {
  upd((f) => { if (!f.colors) f.colors = {}; f.colors.accentIdx = i; delete f.colors.customAccent; });
  applyFichaColors();
}
function setCustomAccent(val) {
  upd((f) => { if (!f.colors) f.colors = {}; f.colors.customAccent = val; delete f.colors.accentIdx; });
  applyFichaColors();
}
function setBgPreset(i) {
  upd((f) => { if (!f.colors) f.colors = {}; f.colors.bgIdx = i; delete f.colors.customBg; });
  applyFichaColors();
}
function setCustomBg(val) {
  upd((f) => { if (!f.colors) f.colors = {}; f.colors.customBg = val; delete f.colors.bgIdx; });
  applyFichaColors();
}
function setCustomFieldFontColor(val) {
  upd((f) => { if (!f.colors) f.colors = {}; f.colors.customFieldFontColor = val; });
  applyFichaColors();
}
function resetColors() {
  upd((f) => { f.colors = {}; });
  applyFichaColors();
  toast("Cores restauradas ao padrão.");
}

// ── HELPERS ───────────────────────────────────────────────────────────────────
function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2); }
function mod(v) { return Math.floor((v - 10) / 2); }
function fmod(v) { const m = mod(v); return (m >= 0 ? "+" : "") + m; }
function getAttrVal(f, id) { const a = f.attrs.find((x) => x.id === id); return a ? a.val : 10; }
function skillBonus(f, s) {
  const base = mod(getAttrVal(f, s.attr)), pb = f.profBonus || 2;
  if (s.prof === 0) return base;
  if (s.prof === 1) return base + Math.floor(pb / 2);
  return base + pb;
}
function getFicha() { return fichas.find((f) => f.id === activeId); }
function upd(fn) {
  const f = getFicha();
  if (!f) return;
  fn(f);
  save(fichas);
}
function toast(msg) {
  const t = document.createElement("div");
  t.className = "toast";
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 2200);
}
function closeM(id) { document.getElementById(id).style.display = "none"; }

// ── DEFAULT TEMPLATE ──────────────────────────────────────────────────────────
const DEF_ATTRS = [
  { id: "for", label: "Força", abr: "FOR", val: 10 },
  { id: "des", label: "Destreza", abr: "DES", val: 10 },
  { id: "con", label: "Constituição", abr: "CON", val: 10 },
  { id: "int", label: "Inteligência", abr: "INT", val: 10 },
  { id: "sab", label: "Sabedoria", abr: "SAB", val: 10 },
  { id: "car", label: "Carisma", abr: "CAR", val: 10 },
];
const DEF_SKILLS = [
  { id: "acr", name: "Acrobacia", attr: "des", prof: 0 },
  { id: "arc", name: "Arcanismo", attr: "int", prof: 0 },
  { id: "ate", name: "Atletismo", attr: "for", prof: 0 },
  { id: "eng", name: "Enganação", attr: "car", prof: 0 },
  { id: "frt", name: "Furtividade", attr: "des", prof: 0 },
  { id: "his", name: "História", attr: "int", prof: 0 },
  { id: "intu", name: "Intuição", attr: "sab", prof: 0 },
  { id: "inv", name: "Investigação", attr: "int", prof: 0 },
  { id: "med", name: "Medicina", attr: "sab", prof: 0 },
  { id: "nat", name: "Natureza", attr: "int", prof: 0 },
  { id: "per", name: "Percepção", attr: "sab", prof: 0 },
  { id: "perf", name: "Performance", attr: "car", prof: 0 },
  { id: "pers", name: "Persuasão", attr: "car", prof: 0 },
  { id: "pre", name: "Prestidigitação", attr: "des", prof: 0 },
  { id: "rel", name: "Religião", attr: "int", prof: 0 },
  { id: "sob", name: "Sobrevivência", attr: "sab", prof: 0 },
  { id: "ani", name: "Adestrar Animais", attr: "sab", prof: 0 },
  { id: "inti", name: "Intimidação", attr: "car", prof: 0 },
];
const DEF_COMBAT = [
  { id: "ca", label: "Defesa", val: 10 },
  { id: "init", label: "Iniciativa", val: 0 },
  { id: "vel", label: "Velocidade", val: 9 },
  { id: "hpmax", label: "HP Máx", val: 10 },
  { id: "hpcur", label: "HP Atual", val: 10 },
  { id: "hdice", label: "Dado de Vida", val: 8 },
];
const DEF_SLOTS = Array.from({ length: 9 }, (_, i) => ({ level: i + 1, total: 0, used: 0 }));

function newFichaObj(name = "Novo Personagem", presetId = "default") {
  return {
    id: uid(),
    name,
    class: "",
    subclass: "",
    race: "",
    level: 1,
    background: "",
    alignment: "",
    type: "player",
    presetId: presetId,
    profBonus: 2,
    colors: {},
    sectionOrder: [...DEFAULT_SECTION_ORDER],
    attrs: JSON.parse(JSON.stringify(DEF_ATTRS)),
    skills: JSON.parse(JSON.stringify(DEF_SKILLS)),
    combat: JSON.parse(JSON.stringify(DEF_COMBAT)),
    spellSlots: JSON.parse(JSON.stringify(DEF_SLOTS)),
    spells: [],
    habilidades: [],
    equipment: [],
    traits: "",
    ideals: "",
    bonds: "",
    flaws: "",
    backstory: "",
    appearanceDesc: "",
    notes: "",
  };
}

// ── SIDEBAR ───────────────────────────────────────────────────────────────────
const FOLDERS = [
  { id: "player", label: "Jogadores", icon: "ti-user", color: "#4a9c2e" },
  { id: "npc", label: "NPCs", icon: "ti-masks-theater", color: "#5080b0" },
];
let activeFolder = "player";

function folderFromType(t) { return t === "player" ? "player" : "npc"; }
function countFolder(fid) {
  if (fid === "all") return fichas.length;
  return fichas.filter((f) => (f.folder || folderFromType(f.type)) === fid).length;
}
function setFolder(f) { activeFolder = f; renderSidebar(); }

async function renderSidebar() {
  const el = document.getElementById("fichaList");
  if (!el) return;
  const tabsHtml = `<div style="display:flex;flex-direction:column;gap:3px;margin-bottom:10px">
    ${FOLDERS.map((fo) => `<div onclick="setFolder('${fo.id}')" style="display:flex;align-items:center;gap:7px;padding:6px 8px;border-radius:5px;border:1px solid ${activeFolder === fo.id ? "var(--gold)" : "transparent"};background:${activeFolder === fo.id ? "rgba(200,168,107,0.1)" : "transparent"};cursor:pointer;color:${activeFolder === fo.id ? "var(--gold)" : fo.color};transition:all 0.15s">
      <i class="ti ${fo.icon}" style="font-size:13px"></i>
      <span style="font-family:'Cinzel',serif;font-size:10px;letter-spacing:1px;text-transform:uppercase;flex:1">${fo.label}</span>
      <span style="font-family:'Cinzel',serif;font-size:10px;color:var(--border)">${countFolder(fo.id)}</span>
    </div>`).join("")}
  </div><div class="divider" style="margin:0 0 10px"></div>`;

  const filtered = activeFolder === "all" ? fichas : fichas.filter((f) => (f.folder || folderFromType(f.type)) === activeFolder);
  if (!fichas.length) {
    el.innerHTML = tabsHtml + '<div class="empty-state" style="padding:16px 0"><div class="big">📜</div>Nenhuma ficha.</div>';
    return;
  }
  if (!filtered.length) {
    el.innerHTML = tabsHtml + '<div style="color:var(--muted);font-size:13px;font-style:italic;text-align:center;padding:16px 0">Nenhuma ficha nesta pasta.</div>';
    return;
  }

  const itemsHtml = await Promise.all(
    filtered.map(async (f) => {
      const sel = f.id === activeId;
      const customImg = await loadImageFromDB(f.id);
      const avContent = customImg
        ? `<img src="${customImg}" style="width:100%;height:100%;border-radius:50%;object-fit:cover;">`
        : f.name[0].toUpperCase();

      return `<div class="fi${sel ? " sel" : ""}" onclick="selFicha('${f.id}')">
      <div class="fi-av" style="background:var(--border);border-color:var(--gold);color:var(--gold)">${avContent}</div>
      <div class="fi-info">
        <div class="fi-name">${f.name}</div>
        <div class="fi-sub">${[f.race, f.class, f.level ? "Nv " + f.level : ""].filter(Boolean).join(" · ")}</div>
      </div>
      <div class="fi-actions">
        <button class="btn xs text" title="Alterar Preset de Campanha" onclick="event.stopPropagation();openPresetModalForEdit('${f.id}')"><i class="ti ti-edit"></i></button>
        <button class="btn xs danger fi-del" onclick="event.stopPropagation();delFicha('${f.id}')"><i class="ti ti-trash"></i></button>
      </div>
    </div>`;
    })
  );

  el.innerHTML = tabsHtml + itemsHtml.join("");
}

function selFicha(id) {
  activeId = id;
  renderSidebar();
  renderEditor();
  applyFichaColors();
}
function newFicha(presetId) {
  const f = newFichaObj("Novo Personagem", presetId);
  f.folder = activeFolder === "all" ? "player" : activeFolder;
  f.type = f.folder === "player" ? "player" : "neutral";
  fichas.push(f);
  save(fichas);
  activeId = f.id;
  renderSidebar();
  renderEditor();
  applyFichaColors();
  toast("Nova ficha criada!");
}
async function delFicha(id) {
  const f = fichas.find((x) => x.id === id);
  if (!f || !confirm(`Excluir "${f.name}"?`)) return;
  fichas = fichas.filter((x) => x.id !== id);
  save(fichas);
  await deleteImageFromDB(id);
  await deleteImageFromDB(id + "_full");
  if (activeId === id) activeId = fichas.length ? fichas[0].id : null;
  renderSidebar();
  renderEditor();
  applyFichaColors();
  toast("Ficha excluída.");
}

// ── EDITOR & RENDERIZAÇÃO DINÂMICA DE SEÇÕES ──────────────────────────────────
async function renderEditor() {
  const editor = document.getElementById("editor");
  if (!editor) return;
  const f = getFicha();
  if (!f) {
    editor.innerHTML = '<div class="empty-state" style="padding:80px 0"><div class="big">⚔</div>Selecione ou crie uma ficha.</div>';
    return;
  }

  // Garante inicialização da ordem de seções personalizada caso seja uma ficha antiga
  if (!f.sectionOrder) f.sectionOrder = [...DEFAULT_SECTION_ORDER];

  const racasPermitidas = getFilteredCat("racas", f.presetId);
  const classesPermitidas = getFilteredCat("classes", f.presetId);
  const profsPermitidas = getFilteredCat("profissoes", f.presetId);

  const characterImg = await loadImageFromDB(f.id);
  const fullBodyImg = await loadImageFromDB(f.id + "_full");

  // 1. CABEÇALHO FIXO DO PERSONAGEM
  const headerHtml = `
    <div class="sec">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
        <span style="font-family:'Cinzel',serif; font-weight:bold; font-size:12px; color:var(--gold);">Ficha de Personagem</span>
        <button class="btn xs print-hidden" onclick="openReorderModal()"><i class="ti ti-arrows-sort"></i> Reordenar Campos da Ficha</button>
      </div>
      <div class="character-header-grid-compact">
        <div class="avatar-compact-area print-hidden">
          <div class="avatar-compact-preview" id="editorAvatarPreview" onclick="document.getElementById('avatarFileInput').click()" title="Alterar Ícone">
            ${characterImg ? `<img src="${characterImg}" style="width:100%;height:100%;object-fit:cover;">` : '<i class="ti ti-user" style="font-size:32px;color:var(--muted)"></i>'}
          </div>
          ${characterImg ? `<button class="btn text danger xs" onclick="removeAvatar()" style="padding:2px; font-size:10px;"><i class="ti ti-trash"></i></button>` : ""}
          <input type="file" id="avatarFileInput" accept="image/*" style="display:none;" onchange="uploadAvatar(event)">
        </div>
        
        <div class="avatar-compact-preview print-only-avatar-compact" style="display:none;">
          ${characterImg ? `<img src="${characterImg}" style="width:80px;height:80px;border-radius:50%;object-fit:cover;">` : ""}
        </div>

        <div style="display:flex; flex-direction:column; gap:12px; flex:1">
          <div style="display:grid;grid-template-columns: 1fr; gap:12px;" class="meta-grid">
            <div class="form-field" style="margin:0">
              <label>Nome do Personagem</label>
              <input type="text" class="char-name-header" value="${f.name}" onchange="setField('name',this.value);renderSidebar()" style="font-family:'Cinzel',serif;font-size:18px; padding: 6px 10px;">
            </div>
          </div>

          <div style="display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:12px;" class="meta-grid">
            <div class="form-field" style="margin:0">
              <label>Classe</label>
              <select onchange="setField('class',this.value)" style="padding: 6px 10px;">
                <option value="">Selecione uma Classe...</option>
                ${classesPermitidas.map((x) => `<option value="${x.nome}" ${f.class === x.nome ? "selected" : ""}>${x.nome}</option>`).join("")}
              </select>
            </div>
            <div class="form-field" style="margin:0">
              <label>Subclasse</label>
              <input type="text" value="${f.subclass || ""}" onchange="setField('subclass',this.value)" placeholder="Ex: Ladino..." style="padding: 6px 10px;">
            </div>
            <div class="form-field" style="margin:0">
              <label>Raça</label>
              <select onchange="setField('race',this.value)" style="padding: 6px 10px;">
                <option value="">Selecione uma Raça...</option>
                ${racasPermitidas.map((x) => `<option value="${x.nome}" ${f.race === x.nome ? "selected" : ""}>${x.nome}</option>`).join("")}
              </select>
            </div>
            <div class="form-field" style="margin:0">
              <label>Profissão</label>
              <select onchange="setField('background',this.value)" style="padding: 6px 10px;">
                <option value="">Selecione uma Profissão...</option>
                ${profsPermitidas.map((x) => `<option value="${x.nome}" ${f.background === x.nome ? "selected" : ""}>${x.nome}</option>`).join("")}
              </select>
            </div>
          </div>

          <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px">
            <div class="form-field" style="margin:0"><label>Nível</label><input type="number" value="${f.level}" min="1" max="20" onchange="setField('level',parseInt(this.value));autoProf()" style="padding: 6px 10px;"></div>
            <div class="form-field" style="margin:0"><label>Bônus</label><input type="number" value="${f.profBonus}" min="2" max="6" onchange="setField('profBonus',parseInt(this.value));renderEditor()" style="padding: 6px 10px;"></div>
            <div class="form-field" style="margin:0"><label>Alinhamento</label><input type="text" value="${f.alignment || ""}" onchange="setField('alignment',this.value)" placeholder="Leal e Bom..." style="padding: 6px 10px;"></div>
            <div class="form-field" style="margin:0"><label>Tipo</label>
              <select onchange="setField('type',this.value);renderSidebar();renderEditor()" style="padding: 6px 10px;">
                <option value="player" ${f.type === "player" ? "selected" : ""}>Jogador</option>
                <option value="neutral" ${f.type === "neutral" ? "selected" : ""}>NPC</option>
              </select>
            </div>
          </div>
        </div>
      </div>
    </div>`;

  // 2. CONSTRUÇÃO DOS BLOCOS DE SEÇÕES REORDENÁVEIS
  const sectionMap = {};

  // Seção: Atributos
  sectionMap["atributos"] = `
    <div class="sec">
      <div class="sec-head"><div class="sec-title"><i class="ti ti-shield sec-icon"></i><h2>Atributos</h2></div></div>
      <div class="attr-grid">
        ${f.attrs.map((a) => `
          <div class="attr-card">
            <button class="rm-btn" onclick="removeAttr('${a.id}')"><i class="ti ti-x"></i></button>
            <div class="attr-abr" onclick="editAttr('${a.id}')">${a.abr}</div>
            <div><input class="attr-val-input" type="number" value="${a.val}" min="1" max="30" onchange="setAttr('${a.id}',this.value)" oninput="document.getElementById('amod_${a.id}').textContent=fmod(parseInt(this.value)||10)"></div>
            <div class="attr-mod-display" id="amod_${a.id}">${fmod(a.val)}</div>
          </div>`).join("")}
        <div class="add-card" onclick="openAddAttr()"><i class="ti ti-plus"></i> Adicionar</div>
      </div>
    </div>`;

  // Seção: Combate
  sectionMap["combate"] = `
    <div class="sec">
      <div class="sec-head"><div class="sec-title"><i class="ti ti-sword sec-icon"></i><h2>Combate</h2></div></div>
      <div class="combat-grid">
        ${f.combat.map((cs) => `
          <div class="combat-card">
            <button class="rm-btn" onclick="removeCombat('${cs.id}')"><i class="ti ti-x"></i></button>
            <div class="combat-label" onclick="renameCombat('${cs.id}')">${cs.label}</div>
            <input class="combat-val-input" type="number" value="${cs.val}" onchange="setCombat('${cs.id}',this.value)">
          </div>`).join("")}
        <div class="add-card" style="min-height:64px" onclick="openAddCombat()"><i class="ti ti-plus"></i></div>
      </div>
    </div>`;

  // Seção: Perícias & Testes de Resistência
  const savesHtml = f.attrs.map((a) => {
    const sv = f.skills.find((s) => s.id === "sv_" + a.id) || { prof: 0 };
    const bv = mod(a.val) + (sv.prof ? f.profBonus : 0);
    return `<div class="skill-row">
      <div class="prof-dot ${sv.prof ? "full" : ""}" onclick="toggleSave('${a.id}')"></div>
      <span class="skill-name">${a.label}</span>
      <span class="skill-bonus" style="color:${bv >= 0 ? "#3a8c1e" : "#c05050"}">${bv >= 0 ? "+" : ""}${bv}</span>
    </div>`;
  }).join("");

  const skillsHtml = f.skills.filter((s) => !s.isSave).map((s) => {
    const bv = skillBonus(f, s), at = f.attrs.find((x) => x.id === s.attr);
    const pc = s.prof === 2 ? "full" : s.prof === 1 ? "half" : "";
    return `<div class="skill-row">
      <div class="prof-dot ${pc}" onclick="cycleProf('${s.id}')"></div>
      <span class="skill-name" onclick="cycleProf('${s.id}')">${s.name}</span>
      <span class="skill-attr-lbl">${at ? at.abr : "—"}</span>
      <span class="skill-bonus" style="color:${bv >= 0 ? "#3a8c1e" : "#c05050"}">${bv >= 0 ? "+" : ""}${bv}</span>
      <button style="background:none;border:none;color:var(--red2);cursor:pointer;font-size:11px;padding:0 2px;opacity:0" onmouseover="this.style.opacity=1" onmouseout="this.style.opacity=0" onclick="removeSkill('${s.id}')"><i class="ti ti-x"></i></button>
    </div>`;
  }).join("");

  sectionMap["pericias"] = `
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:14px">
      <div class="sec" style="margin:0">
        <div class="sec-head"><div class="sec-title"><i class="ti ti-shield-check sec-icon"></i><h2>Testes de Atributo</h2></div></div>
        ${savesHtml}
      </div>
      <div class="sec" style="margin:0">
        <div class="sec-head">
          <div class="sec-title"><i class="ti ti-star sec-icon"></i><h2>Habilidades &amp; Perícias</h2></div>
          <button class="btn xs" onclick="openAddSkill()"><i class="ti ti-plus"></i> Adicionar</button>
        </div>
        <div class="skills-grid">${skillsHtml}</div>
      </div>
    </div>`;

  // Seção: Mana (Pontos/Slots) - Preenchimento da direita para a esquerda
  sectionMap["mana"] = `
    <div class="sec">
      <div class="sec-head"><div class="sec-title"><i class="ti ti-wand sec-icon"></i><h2>Mana / Espaços de Magia</h2></div></div>
      <div style="font-size:11px;color:var(--muted);margin-bottom:10px" class="print-hidden">Clique nos círculos para marcar uso. Defina o total por nível.</div>
      ${f.spellSlots.map((sl, i) => `
        <div class="spell-level-row">
          <span class="slot-lbl">Círculo ${sl.level}</span>
          <input class="slot-num" type="number" value="${sl.total}" min="0" max="9" onchange="setSlotTotal(${i},this.value)">
          <div class="spell-dots">${Array.from({ length: sl.total }, (_, k) => {
            const isUsed = k >= (sl.total - sl.used);
            return `<div class="spell-dot ${isUsed ? "used" : "avail"}" onclick="toggleSlot(${i},${k})"></div>`;
          }).join("")}</div>
        </div>`).join("")}
    </div>`;

  // Seção: Magias Conhecidas
  const spellsByLevel = {};
  for (let lvl = 0; lvl <= 9; lvl++) spellsByLevel[lvl] = [];
  (f.spells || []).forEach((sp, index) => {
    const lvl = sp.level !== undefined ? parseInt(sp.level) : 1;
    spellsByLevel[lvl >= 0 && lvl <= 9 ? lvl : 1].push({ ...sp, originalIndex: index });
  });

  let spellsHtml = "";
  if (!f.spells || f.spells.length === 0) {
    spellsHtml = '<div style="color:var(--muted);font-size:13px;font-style:italic">Nenhuma magia ainda.</div>';
  } else {
    spellsHtml = Array.from({ length: 10 }, (_, lvl) => {
      const spellList = spellsByLevel[lvl];
      if (spellList.length === 0) return "";
      const isOpen = openSpellFolders[lvl] !== false;
      const folderTitle = lvl === 0 ? "Nível 0 (Truques)" : `Nível ${lvl}`;

      const itemsInside = spellList.map((sp) => {
        const i = sp.originalIndex;
        return `
        <div class="spell-item" id="spitem_${i}">
          <div class="spell-item-info">
            <div class="spell-item-name" style="cursor:pointer" onclick="document.getElementById('spitem_${i}').classList.toggle('expanded')">${sp.name}</div>
            <div class="spell-item-meta">${[sp.school, sp.cast, sp.range, sp.aoe, sp.duration].filter(Boolean).join(" · ")}</div>
            ${sp.desc ? `<div class="spell-item-desc">${sp.desc}</div><span class="expand-toggle" onclick="document.getElementById('spitem_${i}').classList.toggle('expanded')">▸ detalhes</span>` : ""}
          </div>
          <div style="display:flex;gap:4px;flex-shrink:0">
            <button class="btn xs print-hidden" onclick="editSpell(${i})"><i class="ti ti-edit"></i></button>
            <button class="btn xs danger print-hidden" onclick="askRemoveSpell(${i})"><i class="ti ti-trash"></i></button>
          </div>
        </div>`;
      }).join("");

      return `
        <div class="spell-folder-group ${isOpen ? "open" : ""}">
          <div class="spell-folder-header" onclick="toggleSpellFolder(${lvl})">
            <div class="spell-folder-title">
              <i class="ti ${isOpen ? "ti-folder-open" : "ti-folder"} spell-folder-icon"></i>
              <span>${folderTitle}</span>
              <span class="spell-count-badge">${spellList.length}</span>
            </div>
            <i class="ti ${isOpen ? "ti-chevron-down" : "ti-chevron-right"} folder-arrow"></i>
          </div>
          <div class="spell-folder-content">${itemsInside}</div>
        </div>`;
    }).join("");
  }

  sectionMap["magias"] = `
    <div class="sec">
      <div class="sec-head">
        <div class="sec-title"><i class="ti ti-sparkles sec-icon"></i><h2>Magias Conhecidas</h2></div>
        <div style="display:flex; gap:6px; align-items:center;">
          <button class="btn xs text print-hidden" onclick="toggleAllSpellFolders(true)" title="Expandir Todas"><i class="ti ti-folder-open"></i></button>
          <button class="btn xs text print-hidden" onclick="toggleAllSpellFolders(false)" title="Recolher Todas"><i class="ti ti-folder"></i></button>
          <button class="btn xs primary" onclick="openAddSpell()"><i class="ti ti-plus"></i> Adicionar Magia</button>
        </div>
      </div>
      ${spellsHtml}
    </div>`;

  // Seção: PODERES (SEPARADOS EM PODERES DE CLASSE, SUBCLASSE, RAÇA E ADICIONAIS)
  const renderPowerCategory = (catType, title, icon) => {
    const powers = (f.habilidades || [])
      .map((h, i) => ({ ...h, originalIndex: i }))
      .filter((h) => (h.category || "classe") === catType);

    const items = powers.map((h) => {
      const i = h.originalIndex;
      const dots = h.uses > 0 ? Array.from({ length: h.uses }, (_, k) => `<div class="use-dot ${k < (h.usesSpent || 0) ? "used" : ""}" onclick="toggleUse(${i},${k})"></div>`).join("") : "";
      return `
      <div class="habil-item" id="hitem_${i}">
        <button class="rm-btn" onclick="removeHabil(${i})"><i class="ti ti-x"></i></button>
        <div class="habil-head" onclick="document.getElementById('hitem_${i}').classList.toggle('expanded')">
          <div class="habil-name">${h.name}</div>
          <div class="habil-badges">
            ${h.level > 1 ? `<span class="habil-badge lvl">Nv ${h.level}</span>` : ""}
            <span class="habil-badge uses">${h.uses > 0 ? `${h.uses - (h.usesSpent || 0)}/${h.uses} usos` : "Ilimitado"}</span>
          </div>
          <button class="btn xs print-hidden" onclick="event.stopPropagation();editHabil(${i})"><i class="ti ti-edit"></i></button>
        </div>
        <div class="habil-desc">${h.desc || "Sem descrição."}</div>
        ${h.uses > 0 ? `<div class="uses-tracker">${dots}<button class="btn xs print-hidden" style="margin-left:6px" onclick="resetUses(${i})" title="Resetar">↺</button></div>` : ""}
      </div>`;
    }).join("");

    return `
      <div class="powers-group-title"><i class="ti ${icon}"></i> ${title} (${powers.length})</div>
      ${items || '<div style="color:var(--muted);font-size:12px;font-style:italic;margin-bottom:8px">Nenhum poder registrado nesta categoria.</div>'}`;
  };

  sectionMap["poderes"] = `
    <div class="sec">
      <div class="sec-head">
        <div class="sec-title"><i class="ti ti-bolt sec-icon"></i><h2>Poderes &amp; Habilidades</h2></div>
        <button class="btn xs primary" onclick="openAddHabil()"><i class="ti ti-plus"></i> Adicionar Poder</button>
      </div>
      ${renderPowerCategory("classe", "Poderes de Classe", "ti-shield")}
      ${renderPowerCategory("subclasse", "Poderes de Subclasse", "ti-git-branch")}
      ${renderPowerCategory("raca", "Poderes de Raça", "ti-dna")}
      ${renderPowerCategory("adicional", "Poderes Adicionais", "ti-star")}
    </div>`;

  // Seção: Equipamentos
  const equipHtml = (f.equipment || []).map((e, i) => `
    <div class="equip-item" id="eqitem_${i}">
      <button class="rm-btn" onclick="removeEquip(${i})"><i class="ti ti-x"></i></button>
      <div class="equip-main">
        <div class="equip-name-row">
          <span class="equip-name">${e.name}</span>
          <span class="equip-tag ${e.cat || "item"}">${e.cat === "consumivel" ? "Consumível" : e.cat === "equipamento" ? "Equipamento" : "Item"}</span>
          ${e.weight > 0 ? `<span style="font-size:11px;color:var(--muted)">${e.weight}kg</span>` : ""}
          ${e.qty > 1 ? `<span style="font-size:11px;color:var(--muted)">×${e.qty}</span>` : ""}
        </div>
        ${e.desc ? `<div class="equip-meta expand-toggle" onclick="document.getElementById('eqitem_${i}').classList.toggle('expanded')">▸ ${e.desc.slice(0, 50)}${e.desc.length > 50 ? "..." : ""}</div><div class="equip-desc">${e.desc}</div>` : ""}
      </div>
      <button class="btn xs print-hidden" onclick="editEquip(${i})"><i class="ti ti-edit"></i></button>
    </div>`).join("");

  sectionMap["equipamento"] = `
    <div class="sec">
      <div class="sec-head">
        <div class="sec-title"><i class="ti ti-backpack sec-icon"></i><h2>Equipamentos &amp; Itens</h2></div>
        <div style="display:flex;align-items:center;gap:8px">
          ${f.equipment.length ? `<span style="font-size:11px;color:var(--muted)">${f.equipment.reduce((a, e) => a + (e.weight || 0) * (e.qty || 1), 0).toFixed(1)}kg</span>` : ""}
          <button class="btn xs primary" onclick="openAddEquip()"><i class="ti ti-plus"></i> Adicionar Item</button>
        </div>
      </div>
      ${equipHtml || '<div style="color:var(--muted);font-size:13px;font-style:italic">Nenhum item ainda.</div>'}
    </div>`;

  // Seção: Aparência
// Seção: Aparência
sectionMap["aparencia"] = `
<div class="sec visual-section">
  <div class="sec-head">
    <div class="sec-title"><i class="ti ti-photo sec-icon"></i><h2>Aparência &amp; Arte Corporal</h2></div>
  </div>
  <div class="appearance-horizontal-layout">
    <div class="full-body-wrapper">
      <div class="full-body-preview" id="editorFullBodyPreview">
        ${fullBodyImg ? `<img src="${fullBodyImg}" class="full-body-img-render">` : '<div class="upload-placeholder"><i class="ti ti-photo" style="font-size:32px;"></i><div>Adicione a Arte de Corpo Inteiro</div></div>'}
      </div>
      <div class="full-body-actions print-hidden" style="display:flex; gap:6px; margin-top:8px; justify-content:center;">
        <button class="btn xs" onclick="document.getElementById('fullBodyFileInput').click()"><i class="ti ti-upload"></i> Subir Arte</button>
        ${fullBodyImg ? `<button class="btn xs danger" onclick="removeFullBody()"><i class="ti ti-trash"></i></button>` : ""}
      </div>
      <input type="file" id="fullBodyFileInput" accept="image/*" style="display:none;" onchange="uploadFullBody(event)">
    </div>
    
    <div class="form-field desc-visual-field">
      <label class="field-label">Descrição Visual Detalhada</label>
      <textarea class="textarea-fixed" onchange="setField('appearanceDesc',this.value)">${f.appearanceDesc || ""}</textarea>
    </div>
  </div>
</div>`;

  // Seção: Personalidade, História e Notas
  sectionMap["personalidade"] = `
    <div class="sec">
      <div class="sec-head"><div class="sec-title"><i class="ti ti-user sec-icon"></i><h2>Personalidade &amp; História</h2></div></div>
      <div class="compact-fields-grid" style="margin-bottom:12px;">
        <div class="form-field"><label class="field-label">Traços</label><textarea class="textarea-fixed compact" onchange="setField('traits',this.value)">${f.traits || ""}</textarea></div>
        <div class="form-field"><label class="field-label">Ideais</label><textarea class="textarea-fixed compact" onchange="setField('ideals',this.value)">${f.ideals || ""}</textarea></div>
        <div class="form-field"><label class="field-label">Vínculos</label><textarea class="textarea-fixed compact" onchange="setField('bonds',this.value)">${f.bonds || ""}</textarea></div>
        <div class="form-field"><label class="field-label">Defeitos</label><textarea class="textarea-fixed compact" onchange="setField('flaws',this.value)">${f.flaws || ""}</textarea></div>
      </div>
      <div class="form-field"><label class="field-label">Backstory (História)</label><textarea class="textarea-fixed history" onchange="setField('backstory',this.value)">${f.backstory || ""}</textarea></div>
      <div class="form-field" style="margin:0;"><label class="field-label">Notas Livres</label><textarea class="textarea-fixed history" onchange="setField('notes',this.value)">${f.notes || ""}</textarea></div>
    </div>`;

  // 3. REMONTA A TELA NA ORDEM DEFINIDA PELO JOGADOR
  const dynamicSectionsHtml = f.sectionOrder
    .map((secKey) => sectionMap[secKey] || "")
    .join("");

  editor.innerHTML = `
    ${headerHtml}
    <div class="editor-dynamic-sections">
      ${dynamicSectionsHtml}
    </div>
    <div style="text-align:right;margin-bottom:14px" class="print-hidden">
      <button class="btn" onclick="window.print()" style="font-size:11px"><i class="ti ti-printer"></i> Salvar como PDF</button>
    </div>`;
}

// ── MODAL DE REORDENAÇÃO DE SEÇÕES ──────────────────────────────────────────
const SECTION_LABELS = {
  atributos: "Atributos",
  combate: "Combate",
  pericias: "Perícias & Testes",
  mana: "Mana / Círculos de Magia",
  magias: "Magias Conhecidas",
  poderes: "Poderes (Classe, Raça e Adicionais)",
  equipamento: "Equipamentos & Itens",
  aparencia: "Aparência & Arte Corporal",
  personalidade: "Personalidade & História"
};

function openReorderModal() {
  const f = getFicha();
  if (!f) return;
  if (!f.sectionOrder) f.sectionOrder = [...DEFAULT_SECTION_ORDER];

  renderReorderList();
  document.getElementById("mReorder").style.display = "flex";
}

function renderReorderList() {
  const f = getFicha();
  const listEl = document.getElementById("reorderList");
  if (!listEl || !f) return;

  listEl.innerHTML = f.sectionOrder.map((key, index) => `
    <div class="section-reorder-item">
      <div class="section-reorder-title">
        <i class="ti ti-grip-vertical" style="color:var(--muted)"></i>
        <span>${SECTION_LABELS[key] || key}</span>
      </div>
      <div class="section-reorder-btns">
        <button class="btn xs" onclick="moveSection(${index}, -1)" ${index === 0 ? "disabled" : ""}><i class="ti ti-chevron-up"></i></button>
        <button class="btn xs" onclick="moveSection(${index}, 1)" ${index === f.sectionOrder.length - 1 ? "disabled" : ""}><i class="ti ti-chevron-down"></i></button>
      </div>
    </div>
  `).join("");
}

function moveSection(index, direction) {
  const f = getFicha();
  if (!f) return;

  const newIndex = index + direction;
  if (newIndex < 0 || newIndex >= f.sectionOrder.length) return;

  const temp = f.sectionOrder[index];
  f.sectionOrder[index] = f.sectionOrder[newIndex];
  f.sectionOrder[newIndex] = temp;

  save(fichas);
  renderReorderList();
  renderEditor();
}

function resetSectionOrder() {
  upd((f) => {
    f.sectionOrder = [...DEFAULT_SECTION_ORDER];
  });
  renderReorderList();
  renderEditor();
  toast("Ordem dos campos restaurada ao padrão!");
}

// ── CONTROLADORES DAS PASTAS DE MAGIA ─────────────────────────────────────────
function toggleSpellFolder(level) {
  openSpellFolders[level] = !openSpellFolders[level];
  renderEditor();
}

function toggleAllSpellFolders(openState) {
  for (let i = 0; i <= 9; i++) openSpellFolders[i] = openState;
  renderEditor();
}

// ── AVATAR COMPACT & FULL BODY ───────────────────────────────────────────────
function uploadAvatar(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = async function (e) {
    const f = getFicha();
    if (f) {
      await saveImageToDB(f.id, e.target.result);
      renderSidebar(); renderEditor(); toast("Ícone do personagem atualizado!");
    }
  };
  reader.readAsDataURL(file);
}

async function removeAvatar() {
  const f = getFicha();
  if (f && confirm("Remover o ícone deste personagem?")) {
    await deleteImageFromDB(f.id);
    renderSidebar(); renderEditor(); toast("Ícone removido.");
  }
}

function uploadFullBody(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = async function (e) {
    const f = getFicha();
    if (f) {
      await saveImageToDB(f.id + "_full", e.target.result);
      renderSidebar(); renderEditor(); toast("Arte corporal atualizada!");
    }
  };
  reader.readAsDataURL(file);
}

async function removeFullBody() {
  const f = getFicha();
  if (f && confirm("Remover a arte de corpo inteiro deste personagem?")) {
    await deleteImageFromDB(f.id + "_full");
    renderSidebar(); renderEditor(); toast("Arte corporal removida.");
  }
}

// ── SETTERS E MÉTODOS DE ATRIBUTOS, PERÍCIAS E COMBATE ────────────────────────
function setField(k, v) { upd((f) => { f[k] = v; }); }
function setAttr(id, v) { upd((f) => { const a = f.attrs.find((x) => x.id === id); if (a) a.val = parseInt(v) || 10; }); }
function removeAttr(id) {
  const f = getFicha(); if (!f) return;
  const a = f.attrs.find((x) => x.id === id);
  if (!a || !confirm(`Remover "${a.label}"?`)) return;
  upd((f) => { f.attrs = f.attrs.filter((x) => x.id !== id); });
  renderEditor();
}
function editAttr(id) {
  const f = getFicha(); if (!f) return;
  const a = f.attrs.find((x) => x.id === id); if (!a) return;
  editingAttr = id;
  document.getElementById("mAttrTitle").textContent = "Editar Atributo";
  document.getElementById("aName").value = a.label;
  document.getElementById("aAbr").value = a.abr;
  document.getElementById("aVal").value = a.val;
  document.getElementById("mAttr").style.display = "flex";
  setTimeout(() => document.getElementById("aName").focus(), 50);
}
function openAddAttr() {
  editingAttr = null;
  document.getElementById("mAttrTitle").textContent = "Adicionar Atributo";
  ["aName", "aAbr"].forEach((id) => (document.getElementById(id).value = ""));
  document.getElementById("aVal").value = 10;
  document.getElementById("mAttr").style.display = "flex";
  setTimeout(() => document.getElementById("aName").focus(), 50);
}
function confirmAttr() {
  const name = document.getElementById("aName").value.trim();
  const abr = document.getElementById("aAbr").value.trim().toUpperCase() || name.slice(0, 3).toUpperCase();
  const val = parseInt(document.getElementById("aVal").value) || 10;
  if (!name) return;
  if (editingAttr) {
    upd((f) => {
      const a = f.attrs.find((x) => x.id === editingAttr);
      if (a) { a.label = name; a.abr = abr; a.val = val; }
    });
  } else {
    upd((f) => { f.attrs.push({ id: uid(), label: name, abr, val }); });
  }
  closeM("mAttr"); renderEditor(); toast(editingAttr ? "Atualizado!" : "Adicionado!"); editingAttr = null;
}
function toggleSave(attrId) {
  upd((f) => {
    const id = "sv_" + attrId, sv = f.skills.find((s) => s.id === id);
    if (sv) sv.prof = sv.prof ? 0 : 1;
    else f.skills.push({ id, name: "SV:" + attrId, attr: attrId, prof: 1, isSave: true });
  });
  renderEditor();
}
function cycleProf(id) {
  upd((f) => {
    const s = f.skills.find((x) => x.id === id);
    if (s) s.prof = (s.prof + 1) % 3;
  });
  renderEditor();
}
function removeSkill(id) {
  upd((f) => { f.skills = f.skills.filter((x) => x.id !== id); });
  renderEditor();
}
function openAddSkill() {
  const f = getFicha(); if (!f) return;
  document.getElementById("skAttr").innerHTML = f.attrs.map((a) => `<option value="${a.id}">${a.abr} — ${a.label}</option>`).join("");
  document.getElementById("skName").value = "";
  document.getElementById("mSkill").style.display = "flex";
  setTimeout(() => document.getElementById("skName").focus(), 50);
}
function confirmSkill() {
  const name = document.getElementById("skName").value.trim(), attr = document.getElementById("skAttr").value;
  if (!name) return;
  upd((f) => { f.skills.push({ id: uid(), name, attr, prof: 0 }); });
  closeM("mSkill"); renderEditor(); toast("Habilidade adicionada!");
}
function setCombat(id, v) {
  upd((f) => {
    const s = f.combat.find((x) => x.id === id);
    if (s) s.val = parseInt(v) || 0;
  });
}
function removeCombat(id) {
  const f = getFicha(); if (!f) return;
  const s = f.combat.find((x) => x.id === id);
  if (!s || !confirm(`Remover "${s.label}"?`)) return;
  upd((f) => { f.combat = f.combat.filter((x) => x.id !== id); });
  renderEditor();
}
function renameCombat(id) {
  const f = getFicha(); if (!f) return;
  const s = f.combat.find((x) => x.id === id); if (!s) return;
  const n = prompt("Novo nome:", s.label);
  if (n && n.trim()) {
    upd((f) => { const cs = f.combat.find((x) => x.id === id); if (cs) cs.label = n.trim(); });
    renderEditor();
  }
}
function openAddCombat() {
  document.getElementById("cbName").value = "";
  document.getElementById("cbVal").value = 0;
  document.getElementById("mCombat").style.display = "flex";
  setTimeout(() => document.getElementById("cbName").focus(), 50);
}
function confirmCombat() {
  const label = document.getElementById("cbName").value.trim(), val = parseInt(document.getElementById("cbVal").value) || 0;
  if (!label) return;
  upd((f) => { f.combat.push({ id: uid(), label, val }); });
  closeM("mCombat"); renderEditor(); toast("Campo adicionado!");
}
function setSlotTotal(idx, v) {
  upd((f) => {
    const sl = f.spellSlots[idx];
    sl.total = Math.max(0, Math.min(9, parseInt(v) || 0));
    if (sl.used > sl.total) sl.used = sl.total;
  });
  renderEditor();
}
function toggleSlot(si, di) {
  upd((f) => {
    const sl = f.spellSlots[si];
    const clickedFromRightIndex = sl.total - di;
    if (sl.used === clickedFromRightIndex) {
      sl.used = clickedFromRightIndex - 1;
    } else {
      sl.used = clickedFromRightIndex;
    }
  });
  renderEditor();
}

// ── MAGIAS ──────────────────────────────────────────────────────────────────
function openAddSpell() {
  editingSpell = null;
  document.getElementById("mSpellTitle").textContent = "Adicionar Magia";
  ["spName", "spSchool", "spCast", "spRange", "spAoE", "spDuration", "spDesc"].forEach((id) => (document.getElementById(id).value = ""));
  document.getElementById("spLevel").value = 0;
  document.getElementById("mSpell").style.display = "flex";
  setTimeout(() => document.getElementById("spName").focus(), 50);
}

function editSpell(i) {
  const f = getFicha(); if (!f) return;
  const sp = f.spells[i]; if (!sp) return;
  editingSpell = i;
  document.getElementById("mSpellTitle").textContent = "Editar Magia";
  document.getElementById("spName").value = sp.name;
  document.getElementById("spLevel").value = sp.level !== undefined ? sp.level : 0;
  document.getElementById("spSchool").value = sp.school || "";
  document.getElementById("spCast").value = sp.cast || "";
  document.getElementById("spRange").value = sp.range || "";
  document.getElementById("spAoE").value = sp.aoe || "";
  document.getElementById("spDuration").value = sp.duration || "";
  document.getElementById("spDesc").value = sp.desc || "";
  document.getElementById("mSpell").style.display = "flex";
}

function confirmSpell() {
  const name = document.getElementById("spName").value.trim();
  if (!name) return;
  const spLevel = parseInt(document.getElementById("spLevel").value);
  const sp = {
    name,
    level: isNaN(spLevel) ? 0 : Math.max(0, Math.min(9, spLevel)),
    school: document.getElementById("spSchool").value.trim(),
    cast: document.getElementById("spCast").value.trim(),
    range: document.getElementById("spRange").value.trim(),
    aoe: document.getElementById("spAoE").value.trim(),
    duration: document.getElementById("spDuration").value.trim(),
    desc: document.getElementById("spDesc").value.trim(),
  };
  upd((f) => {
    if (!f.spells) f.spells = [];
    if (editingSpell !== null) f.spells[editingSpell] = sp;
    else f.spells.push(sp);
    f.spells.sort((a, b) => a.level - b.level);
  });
  closeM("mSpell"); renderEditor(); toast(editingSpell !== null ? "Magia atualizada!" : "Magia adicionada!"); editingSpell = null;
}

function askRemoveSpell(i) {
  const f = getFicha(); if (!f || !f.spells[i]) return;
  deletingSpellIndex = i;
  document.getElementById("confirmSpellName").textContent = f.spells[i].name;
  document.getElementById("mConfirmDeleteSpell").style.display = "flex";
}

function confirmDeleteSpell() {
  if (deletingSpellIndex !== null) {
    upd((f) => { f.spells.splice(deletingSpellIndex, 1); });
    toast("Magia apagada com sucesso!");
    deletingSpellIndex = null;
    closeM("mConfirmDeleteSpell"); renderEditor();
  }
}

// ── PODERES & EQUIPAMENTOS ───────────────────────────────────────────────────
function openAddHabil() {
  editingHabil = null;
  document.getElementById("mHabilTitle").textContent = "Adicionar Poder";
  ["hName", "hDesc"].forEach((id) => (document.getElementById(id).value = ""));
  document.getElementById("hUses").value = 1;
  document.getElementById("hLevel").value = 1;
  document.getElementById("hCategory").value = "classe";
  document.getElementById("mHabil").style.display = "flex";
  setTimeout(() => document.getElementById("hName").focus(), 50);
}
function editHabil(i) {
  const f = getFicha(); if (!f) return;
  const h = f.habilidades[i]; if (!h) return;
  editingHabil = i;
  document.getElementById("mHabilTitle").textContent = "Editar Poder";
  document.getElementById("hName").value = h.name;
  document.getElementById("hUses").value = h.uses;
  document.getElementById("hLevel").value = h.level;
  document.getElementById("hCategory").value = h.category || "classe";
  document.getElementById("hDesc").value = h.desc || "";
  document.getElementById("mHabil").style.display = "flex";
}
function confirmHabil() {
  const name = document.getElementById("hName").value.trim();
  if (!name) return;
  const h = {
    name,
    uses: parseInt(document.getElementById("hUses").value) || 0,
    level: parseInt(document.getElementById("hLevel").value) || 1,
    category: document.getElementById("hCategory").value,
    desc: document.getElementById("hDesc").value.trim(),
    usesSpent: 0,
  };
  upd((f) => {
    if (!f.habilidades) f.habilidades = [];
    if (editingHabil !== null) {
      h.usesSpent = f.habilidades[editingHabil].usesSpent || 0;
      f.habilidades[editingHabil] = h;
    } else f.habilidades.push(h);
  });
  closeM("mHabil"); renderEditor(); toast(editingHabil !== null ? "Atualizado!" : "Poder adicionado!"); editingHabil = null;
}
function removeHabil(i) {
  upd((f) => { f.habilidades.splice(i, 1); });
  renderEditor();
}
function toggleUse(hi, ui) {
  upd((f) => {
    const h = f.habilidades[hi];
    if (h) h.usesSpent = ui < h.usesSpent ? ui : ui + 1;
  });
  renderEditor();
}
function resetUses(i) {
  upd((f) => { if (f.habilidades[i]) f.habilidades[i].usesSpent = 0; });
  renderEditor();
}
function openAddEquip() {
  editingEquip = null;
  document.getElementById("mEquipTitle").textContent = "Adicionar Item";
  ["eqName", "eqDesc"].forEach((id) => (document.getElementById(id).value = ""));
  document.getElementById("eqCat").value = "item";
  document.getElementById("eqWeight").value = 0;
  document.getElementById("eqQty").value = 1;
  document.getElementById("mEquip").style.display = "flex";
  setTimeout(() => document.getElementById("eqName").focus(), 50);
}
function editEquip(i) {
  const f = getFicha(); if (!f) return;
  const e = f.equipment[i]; if (!e) return;
  editingEquip = i;
  document.getElementById("mEquipTitle").textContent = "Editar Item";
  document.getElementById("eqName").value = e.name;
  document.getElementById("eqCat").value = e.cat || "item";
  document.getElementById("eqWeight").value = e.weight || 0;
  document.getElementById("eqQty").value = e.qty || 1;
  document.getElementById("eqDesc").value = e.desc || "";
  document.getElementById("mEquip").style.display = "flex";
}
function confirmEquip() {
  const name = document.getElementById("eqName").value.trim();
  if (!name) return;
  const e = {
    name,
    cat: document.getElementById("eqCat").value,
    weight: parseFloat(document.getElementById("eqWeight").value) || 0,
    qty: parseInt(document.getElementById("eqQty").value) || 1,
    desc: document.getElementById("eqDesc").value.trim(),
  };
  upd((f) => {
    if (!f.equipment) f.equipment = [];
    if (editingEquip !== null) f.equipment[editingEquip] = e;
    else f.equipment.push(e);
  });
  closeM("mEquip"); renderEditor(); toast(editingEquip !== null ? "Atualizado!" : "Item adicionado!"); editingEquip = null;
}
function removeEquip(i) {
  upd((f) => { f.equipment.splice(i, 1); });
  renderEditor();
}
function autoProf() {
  const f = getFicha(); if (!f) return;
  const lv = f.level || 1, pb = lv <= 4 ? 2 : lv <= 8 ? 3 : lv <= 12 ? 4 : lv <= 16 ? 5 : 6;
  upd((f) => { f.profBonus = pb; });
  renderEditor();
}

// ── EXPORTAR E IMPORTAR ──────────────────────────────────────────────────────
async function exportarFichaAtiva() {
  const f = getFicha();
  if (!f) { alert("Selecione uma ficha ativa para poder exportar."); return; }

  const exportData = JSON.parse(JSON.stringify(f));
  const characterImg = await loadImageFromDB(f.id);
  const fullBodyImg = await loadImageFromDB(f.id + "_full");

  if (characterImg) exportData.characterImg = characterImg;
  if (fullBodyImg) exportData.fullBodyImg = fullBodyImg;

  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(exportData, null, 2));
  const downloadAnchor = document.createElement("a");
  downloadAnchor.setAttribute("href", dataStr);
  downloadAnchor.setAttribute("download", f.name.toLowerCase().replace(/[^a-z0-9]/gi, "_") + "_ficha.json");
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();
  toast("Ficha exportada com sucesso!");
}

function acionarImportador() { document.getElementById("importFileInput").click(); }

function importarFicha(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = async function (e) {
    try {
      const fichaImportada = JSON.parse(e.target.result);
      if (!fichaImportada.id || !fichaImportada.name || !fichaImportada.attrs) {
        alert("Erro: O arquivo selecionado não é uma ficha válida."); return;
      }
      const novoId = uid();
      if (fichaImportada.characterImg) { await saveImageToDB(novoId, fichaImportada.characterImg); delete fichaImportada.characterImg; }
      if (fichaImportada.fullBodyImg) { await saveImageToDB(novoId + "_full", fichaImportada.fullBodyImg); delete fichaImportada.fullBodyImg; }

      fichaImportada.id = novoId;
      fichas.push(fichaImportada);
      save(fichas);
      activeId = fichaImportada.id;
      renderSidebar(); renderEditor(); applyFichaColors();
      toast(`Ficha de "${fichaImportada.name}" importada!`);
    } catch (err) {
      alert("Erro ao ler o arquivo JSON.");
    }
    event.target.value = "";
  };
  reader.readAsText(file);
}

// ── MODAL CLOSE ───────────────────────────────────────────────────────────────
["mPreset", "mAttr", "mHabil", "mSpell", "mEquip", "mSkill", "mCombat", "mConfirmDeleteSpell", "mReorder"].forEach((id) => {
  if (document.getElementById(id)) {
    document.getElementById(id).addEventListener("click", function (e) { if (e.target === this) closeM(id); });
  }
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") ["mPreset", "mAttr", "mHabil", "mSpell", "mEquip", "mSkill", "mCombat", "mConfirmDeleteSpell", "mReorder"].forEach(closeM);
  if ((e.ctrlKey || e.metaKey) && e.key === "n") { e.preventDefault(); openPresetModalForNew(); }
});

// ── MOBILE MENU ───────────────────────────────────────────────────────────────
function toggleMobMenu() { document.getElementById("mobNav").classList.toggle("open"); }
function closeMobMenu() { document.getElementById("mobNav").classList.remove("open"); }
document.addEventListener("click", (e) => {
  const nav = document.getElementById("mobNav");
  if (nav && nav.classList.contains("open") && !nav.contains(e.target) && !e.target.closest("#mobMenuBtn")) closeMobMenu();
});

// ── INIT ──────────────────────────────────────────────────────────────────────
carregarDB();