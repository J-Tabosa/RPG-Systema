// ── CONSTANTS & STORAGE KEYS ──────────────────────────────────────────────────
const SK_CAMPO_CAMPANHAS = "rpg_campanhas_v1";
const SK_FICHAS = "rpg_fichas_v1";

const ACCENT_PRESETS = [
  { name: "Dourado", gold: "#c8a86b", gold2: "#e8c98a", accent: "#d4a843" },
  { name: "Esmeralda", gold: "#4a9c6e", gold2: "#6abf90", accent: "#3a8c5e" },
  { name: "Rubi", gold: "#c84a4a", gold2: "#e87070", accent: "#b03030" },
  { name: "Safira", gold: "#4a6bc8", gold2: "#7090e8", accent: "#3a5ab0" },
  { name: "Ametista", gold: "#9a4ac8", gold2: "#bc70e8", accent: "#8030a0" },
  { name: "Prata", gold: "#9aacbe", gold2: "#c0d0e0", accent: "#8090a0" },
];

const BG_DARK_PRESETS = [
  {
    name: "Padrão",
    bg: "#0f0d0a",
    surface: "#1c1710",
    card: "#241e14",
    card2: "#2a2318",
    border: "#3d3320",
  },
  {
    name: "Ardósia",
    bg: "#0a0c10",
    surface: "#141820",
    card: "#1c2230",
    card2: "#222840",
    border: "#2a3448",
  },
  {
    name: "Floresta",
    bg: "#080e0a",
    surface: "#101a12",
    card: "#182418",
    card2: "#1e2c1e",
    border: "#2a3e2a",
  },
  {
    name: "Vinho",
    bg: "#0e0809",
    surface: "#1c1014",
    card: "#281618",
    card2: "#30181e",
    border: "#442028",
  },
  {
    name: "Névoa",
    bg: "#0c0c0e",
    surface: "#161618",
    card: "#202024",
    card2: "#28282e",
    border: "#383840",
  },
];

const BG_LIGHT_PRESETS = [
  {
    name: "Pergaminho",
    bg: "#f0ece0",
    surface: "#e4deca",
    card: "#f7f3e8",
    card2: "#ede8d8",
    border: "#c0a868",
  },
  {
    name: "Gelo",
    bg: "#e8eef4",
    surface: "#d8e2ec",
    card: "#f0f4f8",
    card2: "#e4eaf0",
    border: "#a0b8cc",
  },
  {
    name: "Menta",
    bg: "#e8f0ec",
    surface: "#d8e8dc",
    card: "#f0f6f2",
    card2: "#e4eee8",
    border: "#a0c4a8",
  },
  {
    name: "Rosa",
    bg: "#f4e8ec",
    surface: "#ecd8dc",
    card: "#faf0f2",
    card2: "#f0e4e8",
    border: "#c8a0a8",
  },
];

// ── INDEXEDDB FOR CAMPAIGN IMAGES ──────────────────────────────────────────────
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
      request.onsuccess = () =>
        resolve(request.result ? request.result.image : null);
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

// ── CONTROLE E DROPDOWN DE TEMA IGUAL À FICHA ────────────────────────────────
let dark = localStorage.getItem("rpg_theme") !== "light";
let themeMenuOpen = false;

function applyGlobalTheme() {
  document.body.classList.toggle("light", !dark);
  const optDark = document.getElementById("optDark");
  const optLight = document.getElementById("optLight");
  if (optDark) optDark.classList.toggle("active", dark);
  if (optLight) optLight.classList.toggle("active", !dark);
}

function setTheme(t) {
  dark = t === "dark";
  localStorage.setItem("rpg_theme", t);
  applyGlobalTheme();
  applyCampanhaColors();
}

function toggleThemeMenu() {
  themeMenuOpen = !themeMenuOpen;
  const dropdown = document.getElementById("themeDropdown");
  if (dropdown) dropdown.classList.toggle("open", themeMenuOpen);
}

document.addEventListener("click", (e) => {
  const wrap = document.getElementById("themeMenuWrap");
  if (themeMenuOpen && wrap && !wrap.contains(e.target)) {
    themeMenuOpen = false;
    const dropdown = document.getElementById("themeDropdown");
    if (dropdown) dropdown.classList.remove("open");
  }
});

// ── COLOR INJECTION DA CAMPANHA ───────────────────────────────────────────────
function getCampanhaAtiva() {
  return campanhas.find((c) => c.id === campanhaAtivaId);
}

function applyCampanhaColors() {
  const c = getCampanhaAtiva();
  if (!c || !c.colors) {
    injectStyle("");
    renderAccentPresets(undefined);
    renderBgPresets(undefined);
    return;
  }

  const col = c.colors;
  let gold, gold2, accent;
  if (col.customAccent) {
    gold = col.customAccent;
    gold2 = lighten(col.customAccent, 30);
    accent = col.customAccent;
  } else if (col.accentIdx !== undefined) {
    const p = ACCENT_PRESETS[col.accentIdx];
    gold = p.gold;
    gold2 = p.gold2;
    accent = p.accent;
  } else {
    gold = "#c8a86b";
    gold2 = "#e8c98a";
    accent = "#d4a843";
  }

  let bg, surface, card, card2, border;
  const presets = dark ? BG_DARK_PRESETS : BG_LIGHT_PRESETS;
  if (col.customBg) {
    const base = col.customBg;
    if (dark) {
      bg = base;
      surface = blendHex(base, "#ffffff", 0.06);
      card = blendHex(base, "#ffffff", 0.12);
      card2 = blendHex(base, "#ffffff", 0.18);
      border = blendHex(base, "#ffffff", 0.25);
    } else {
      bg = base;
      surface = blendHex(base, "#000000", 0.06);
      card = blendHex(base, "#ffffff", 0.5);
      card2 = blendHex(base, "#000000", 0.04);
      border = blendHex(base, "#000000", 0.2);
    }
  } else if (col.bgIdx !== undefined) {
    const p = presets[col.bgIdx];
    bg = p.bg;
    surface = p.surface;
    card = p.card;
    card2 = p.card2;
    border = p.border;
  } else {
    bg = null;
  }

  let customFieldStyle = "";
  if (col.customFieldFontColor) {
    customFieldStyle = `
      .form-field label, .panel-title, .color-row-label { color: ${col.customFieldFontColor} !important; }
      #richTextEditor { color: ${col.customFieldFontColor} !important; }
    `;
  }

  const bgVars = bg
    ? `--bg:${bg};--surface:${surface};--card:${card};--card2:${card2};--border:${border};`
    : "";
  injectStyle(
    `:root{--gold:${gold};--gold2:${gold2};--accent:${accent};${bgVars}} ${customFieldStyle}`
  );

  if (document.getElementById("customAccent"))
    document.getElementById("customAccent").value = gold.slice(0, 7);
  if (document.getElementById("customBg")) {
    if (col.customBg)
      document.getElementById("customBg").value = col.customBg.slice(0, 7);
    else
      document.getElementById("customBg").value = (bg || "#0f0d0a").slice(0, 7);
  }
  if (document.getElementById("customFieldFontColor")) {
    document.getElementById("customFieldFontColor").value =
      col.customFieldFontColor || (dark ? "#ffffff" : "#111111");
  }

  renderAccentPresets(col.accentIdx);
  renderBgPresets(col.bgIdx);
}

function injectStyle(css) {
  let el = document.getElementById("campanhaStyle");
  if (!el) {
    el = document.createElement("style");
    el.id = "campanhaStyle";
    document.head.appendChild(el);
  }
  el.textContent = css;
}

function lighten(hex, amt) {
  let r = parseInt(hex.slice(1, 3), 16),
    g = parseInt(hex.slice(3, 5), 16),
    b = parseInt(hex.slice(5, 7), 16);
  r = Math.min(255, r + amt);
  g = Math.min(255, g + amt);
  b = Math.min(255, b + amt);
  return "#" + [r, g, b].map((x) => x.toString(16).padStart(2, "0")).join("");
}

function blendHex(hex, with2, t) {
  const a = hex.slice(1),
    b = with2.slice(1);
  const r = Math.round(
    parseInt(a.slice(0, 2), 16) * (1 - t) + parseInt(b.slice(0, 2), 16) * t
  );
  const g = Math.round(
    parseInt(a.slice(2, 4), 16) * (1 - t) + parseInt(b.slice(2, 4), 16) * t
  );
  const bv = Math.round(
    parseInt(a.slice(4, 6), 16) * (1 - t) + parseInt(b.slice(4, 6), 16) * t
  );
  return (
    "#" +
    [r, g, bv]
      .map((x) => Math.max(0, Math.min(255, x)).toString(16).padStart(2, "0"))
      .join("")
  );
}

function renderAccentPresets(activeIdx) {
  const el = document.getElementById("accentPresets");
  if (!el) return;
  el.innerHTML = ACCENT_PRESETS.map(
    (p, i) =>
      `<div class="color-preset${
        activeIdx === i ? " active" : ""
      }" style="background:${p.gold}" onclick="setAccentPreset(${i})" title="${
        p.name
      }"></div>`
  ).join("");
}

function renderBgPresets(activeIdx) {
  const el = document.getElementById("bgPresets");
  if (!el) return;
  const presets = dark ? BG_DARK_PRESETS : BG_LIGHT_PRESETS;
  el.innerHTML = presets
    .map(
      (p, i) =>
        `<div class="color-preset${
          activeIdx === i ? " active" : ""
        }" style="background:${p.bg};border:2px solid ${
          p.border
        }" onclick="setBgPreset(${i})" title="${p.name}"></div>`
    )
    .join("");
}

function updCampanha(fn) {
  const c = getCampanhaAtiva();
  if (!c) return;
  if (!c.colors) c.colors = {};
  fn(c);
  saveCampanhas();
  applyCampanhaColors();
}

function setAccentPreset(i) {
  updCampanha((c) => {
    c.colors.accentIdx = i;
    delete c.colors.customAccent;
  });
}
function setCustomAccent(val) {
  updCampanha((c) => {
    c.colors.customAccent = val;
    delete c.colors.accentIdx;
  });
}
function setBgPreset(i) {
  updCampanha((c) => {
    c.colors.bgIdx = i;
    delete c.colors.customBg;
  });
}
function setCustomBg(val) {
  updCampanha((c) => {
    c.colors.customBg = val;
    delete c.colors.bgIdx;
  });
}
function setCustomFieldFontColor(val) {
  updCampanha((c) => {
    c.colors.customFieldFontColor = val;
  });
}
function resetColors() {
  updCampanha((c) => {
    c.colors = {};
  });
  toast("Cores salvas da campanha restauradas!");
}

// ── CONTROLE DO MENU HAMBÚRGUER MOBILE ────────────────────────────────────────
function toggleMobMenu() {
  const mobNav = document.getElementById("mobNav");
  if (mobNav) mobNav.classList.toggle("open");
}

function closeMobMenu() {
  const mobNav = document.getElementById("mobNav");
  if (mobNav) mobNav.classList.remove("open");
}

// ── MODAL DE NAVEGAÇÃO ────────────────────────────────────────────────────────
let targetDestinationUrl = "";

function confirmarNavegacao(nomeItem, urlDestino) {
  targetDestinationUrl = urlDestino;
  const textElem = document.getElementById("mNavConfirmText");
  if (textElem)
    textElem.innerHTML = `Deseja sair e abrir a página de <strong>${nomeItem}</strong>?`;

  const btnElem = document.getElementById("mNavConfirmBtn");
  if (btnElem) {
    btnElem.onclick = function () {
      window.location.href = targetDestinationUrl;
    };
  }

  const modal = document.getElementById("mNavConfirm");
  if (modal) modal.style.display = "flex";
}

// ── STATE & HELPERS ───────────────────────────────────────────────────────────
let campanhas = loadCampanhas();
let campanhaAtivaId = null;
let sessaoAtivaId = null;

function uid() {
  return (
    "camp_" + Date.now().toString(36) + Math.random().toString(36).slice(2)
  );
}
function loadCampanhas() {
  try {
    return JSON.parse(localStorage.getItem(SK_CAMPO_CAMPANHAS)) || [];
  } catch (e) {
    return [];
  }
}
function saveCampanhas() {
  localStorage.setItem(SK_CAMPO_CAMPANHAS, JSON.stringify(campanhas));
}
function getFichasGerais() {
  try {
    return JSON.parse(localStorage.getItem(SK_FICHAS)) || [];
  } catch (e) {
    return [];
  }
}
function toast(msg) {
  const t = document.createElement("div");
  t.className = "toast";
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 2200);
}

// ── EXPORTAR E IMPORTAR CAMPANHA JSON ─────────────────────────────────────────
async function exportarCampanhaJSON(id) {
  const c = campanhas.find((x) => x.id === id);
  if (!c) return;

  const coverImg = await loadImageFromDB(c.id);
  const dataExport = {
    ...c,
    coverImgBase64: coverImg || null,
  };

  const jsonStr = JSON.stringify(dataExport, null, 2);
  const blob = new Blob([jsonStr], { type: "application/json" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = `${c.nome.replace(/[^a-zA-Z0-9_-]/g, "_")}_Campanha.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  toast("Campanha exportada como JSON!");
}

function importarCampanhaJSON(e) {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = async (evt) => {
    try {
      const data = JSON.parse(evt.target.result);
      if (!data.nome) {
        toast("JSON inválido: Nome da campanha não encontrado.");
        return;
      }

      data.id = uid(); // Gera novo ID para evitar conflitos
      const imgData = data.coverImgBase64;
      delete data.coverImgBase64;

      if (imgData) {
        await saveImageToDB(data.id, imgData);
      }

      campanhas.push(data);
      saveCampanhas();
      toast("Campanha importada com sucesso!");
      renderHubCampanhas();
    } catch (err) {
      console.error(err);
      toast("Erro ao ler o arquivo JSON.");
    }
  };
  reader.readAsText(file);
}

// ── INICIALIZAÇÃO ─────────────────────────────────────────────────────────────
async function initCampanhas() {
  applyGlobalTheme();
  renderHubCampanhas();
}

// ── TELA 1: HUB DE CAMPANHAS ──────────────────────────────────────────────────
async function renderHubCampanhas() {
  campanhaAtivaId = null;
  sessaoAtivaId = null;
  applyCampanhaColors();

  const container = document.getElementById("campanhaMainApp");
  if (!container) return;

  const importExportActions = `
    <div style="display:flex; gap:8px; align-items:center;">
      <label class="btn sm" style="cursor:pointer; margin:0;" title="Importar arquivo JSON de Campanha">
        <i class="ti ti-upload"></i> Importar JSON
        <input type="file" accept=".json" style="display:none;" onchange="importarCampanhaJSON(event)">
      </label>
      <button class="btn primary" onclick="abrirModalNovaCampanha()"><i class="ti ti-plus"></i> Nova Campanha</button>
    </div>
  `;

  if (campanhas.length === 0) {
    container.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px;">
        <h2 style="font-family:'Cinzel', serif; margin:0;"><i class="ti ti-map-pins"></i> Minhas Campanhas</h2>
        ${importExportActions}
      </div>
      <div class="empty-state" style="padding: 80px 0; text-align: center;">
        <div class="big" style="font-size: 48px;">🗺️</div>
        <h3>Nenhuma Campanha Encontrada</h3>
        <p style="color:var(--muted); margin-bottom: 16px;">Crie sua primeira história ou importe uma existente.</p>
        <button class="btn primary" onclick="abrirModalNovaCampanha()"><i class="ti ti-plus"></i> Nova Campanha</button>
      </div>`;
    return;
  }

  const cardsHtml = await Promise.all(
    campanhas.map(async (c) => {
      const coverImg = await loadImageFromDB(c.id);
      return `
      <div class="campanha-card" style="border:1px solid var(--border); border-radius:8px; overflow:hidden; background:var(--card); cursor:pointer; transition: transform 0.2s;" onclick="abrirCampanha('${
        c.id
      }')">
        <div style="height:140px; background:var(--surface); display:flex; align-items:center; justify-content:center; overflow:hidden;">
          ${
            coverImg
              ? `<img src="${coverImg}" style="width:100%; height:100%; object-fit:cover;">`
              : `<i class="ti ti-map" style="font-size:48px; color:var(--muted);"></i>`
          }
        </div>
        <div style="padding:16px;">
          <h3 style="margin:0 0 8px 0; color:var(--gold); font-family:'Cinzel', serif;">${
            c.nome
          }</h3>
          <p style="font-size:13px; color:var(--muted); height:38px; overflow:hidden; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; line-height:1.4;">${
            c.descricao || "Sem descrição."
          }</p>
          <div style="display:flex; justify-content:space-between; align-items:center; margin-top:12px; border-top:1px solid var(--border); padding-top:8px;">
            <span style="font-size:12px; color:var(--muted);">${
              (c.participantes || []).length
            } Participante(s)</span>
            <div onclick="event.stopPropagation();" style="display:flex; gap:2px;">
              <button class="btn xs link" onclick="exportarCampanhaJSON('${
                c.id
              }')" title="Fazer Download da Campanha"><i class="ti ti-download"></i></button>
              <button class="btn xs link" onclick="editarCampanhaModal('${
                c.id
              }')" title="Editar"><i class="ti ti-edit"></i></button>
              <button class="btn xs link danger" onclick="excluirCampanha('${
                c.id
              }')" title="Excluir"><i class="ti ti-trash"></i></button>
            </div>
          </div>
        </div>
      </div>`;
    })
  );

  container.innerHTML = `
    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px; flex-wrap:wrap; gap:10px;">
      <h2 style="font-family:'Cinzel', serif; margin:0;"><i class="ti ti-map-pins"></i> Minhas Campanhas</h2>
      ${importExportActions}
    </div>
    <div style="display:grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap:16px;">
      ${cardsHtml.join("")}
    </div>`;
}

// ── MODAL DE CRIAÇÃO / EDIÇÃO ─────────────────────────────────────────────────
let tempCampanhaImgBase64 = null;

function abrirModalNovaCampanha() {
  tempCampanhaImgBase64 = null;
  document.getElementById("mCampTitle").textContent = "Nova Campanha";
  document.getElementById("cEditId").value = "";
  document.getElementById("cNome").value = "";
  document.getElementById("cDesc").value = "";
  renderSeletorParticipantes([]);
  document.getElementById("mCampanha").style.display = "flex";
}

async function editarCampanhaModal(id) {
  const c = campanhas.find((x) => x.id === id);
  if (!c) return;

  tempCampanhaImgBase64 = await loadImageFromDB(c.id);
  document.getElementById("mCampTitle").textContent = "Editar Campanha";
  document.getElementById("cEditId").value = c.id;
  document.getElementById("cNome").value = c.nome;
  document.getElementById("cDesc").value = c.descricao || "";

  renderSeletorParticipantes(c.participantes || []);
  document.getElementById("mCampanha").style.display = "flex";
}

function renderSeletorParticipantes(selecionadosIds = []) {
  const container = document.getElementById("cParticipantesContainer");
  const todasFichas = getFichasGerais().filter(
    (f) => f.type === "player" || !f.type
  );

  if (todasFichas.length === 0) {
    container.innerHTML = `<div style="font-size:13px; color:var(--muted); font-style:italic;">Nenhuma ficha de jogador cadastrada no sistema.</div>`;
    return;
  }

  container.innerHTML = todasFichas
    .map((f) => {
      const checked = selecionadosIds.includes(f.id) ? "checked" : "";
      const isSelectedClass = checked ? "selected" : "";
      const nomeFicha = f.name || f.nome || "Jogador Sem Nome";
      return `
      <div class="selection-item ${isSelectedClass}">
        <div class="part-left">
          <input type="checkbox" class="chk-part" value="${
            f.id
          }" ${checked} onchange="this.closest('.selection-item').classList.toggle('selected', this.checked)">
          <span class="item-title">
            <i class="ti ti-user"></i> ${nomeFicha} 
            <small style="color:var(--muted); font-weight:normal;">(${
              f.race || "Sem Raça"
            } · ${f.class || "Sem Classe"})</small>
          </span>
        </div>
        <button class="btn xs" type="button" onclick="confirmarNavegacao('${nomeFicha}', '../pages/ficha.html?id=${
        f.id
      }')">
          <i class="ti ti-external-link"></i>
        </button>
      </div>`;
    })
    .join("");
}

function processarUploadFotoCampanha(e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (evt) => {
    tempCampanhaImgBase64 = evt.target.result;
    toast("Imagem anexada!");
  };
  reader.readAsDataURL(file);
}

async function salvarCampanha() {
  const id = document.getElementById("cEditId").value;
  const nome = document.getElementById("cNome").value.trim();
  const desc = document.getElementById("cDesc").value.trim();

  if (!nome) {
    toast("O nome da campanha é obrigatório!");
    return;
  }

  const checkboxes = document.querySelectorAll(".chk-part:checked");
  const participantes = Array.from(checkboxes).map((cb) => cb.value);

  let campId = id;
  if (id) {
    const c = campanhas.find((x) => x.id === id);
    if (c) {
      c.nome = nome;
      c.descricao = desc;
      c.participantes = participantes;
    }
  } else {
    campId = uid();
    campanhas.push({
      id: campId,
      nome,
      descricao: desc,
      participantes,
      colors: {},
      sessoes: [],
    });
  }

  if (tempCampanhaImgBase64) {
    await saveImageToDB(campId, tempCampanhaImgBase64);
  }

  saveCampanhas();
  fecharModal("mCampanha");
  toast(id ? "Campanha atualizada!" : "Campanha criada!");

  if (campanhaAtivaId === campId) {
    abrirCampanha(campId);
  } else {
    renderHubCampanhas();
  }
}

async function excluirCampanha(id) {
  if (
    !confirm(
      "Deseja realmente excluir esta campanha? Esta ação não pode ser desfeita."
    )
  )
    return;
  campanhas = campanhas.filter((x) => x.id !== id);
  saveCampanhas();
  await deleteImageFromDB(id);
  toast("Campanha excluída.");
  renderHubCampanhas();
}

// ── TELA 2: PÁGINA INTERNA DA CAMPANHA (3 COLUNAS) ───────────────────────────
async function abrirCampanha(id) {
  campanhaAtivaId = id;
  const c = campanhas.find((x) => x.id === id);
  if (!c) return renderHubCampanhas();

  applyCampanhaColors();

  if (!c.sessoes) c.sessoes = [];
  if (c.sessoes.length === 0) {
    c.sessoes.push({
      id: uid(),
      titulo: "Sessão 1",
      subtitulo: "O Início",
      texto: "",
      monstrosVinculados: [],
    });
    saveCampanhas();
  }

  if (!sessaoAtivaId || !c.sessoes.some((s) => s.id === sessaoAtivaId)) {
    sessaoAtivaId = c.sessoes[0].id;
  }

  const sAtiva = c.sessoes.find((x) => x.id === sessaoAtivaId);

  const container = document.getElementById("campanhaMainApp");
  container.innerHTML = `
    <!-- HEADER DA CAMPANHA -->
    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px; flex-wrap:wrap; gap:8px;">
      <button class="btn sm" onclick="renderHubCampanhas()"><i class="ti ti-arrow-left"></i> Voltar para Campanhas</button>
      <h2 style="font-family:'Cinzel', serif; margin:0; color:var(--gold); font-size: 22px;">${
        c.nome
      }</h2>
      <div style="display:flex; gap:6px;">
        <button class="btn xs" onclick="exportarCampanhaJSON('${
          c.id
        }')"><i class="ti ti-download"></i> EXPORTAR</button>
        <button class="btn xs" onclick="editarCampanhaModal('${
          c.id
        }')"><i class="ti ti-settings"></i> Configurações</button>
      </div>
    </div>

    <!-- CAMPO COMPACTO DE VISUALIZAÇÃO E EDIÇÃO DA DESCRIÇÃO DA CAMPANHA -->
    <div style="background:var(--surface); border:1px solid var(--border); border-radius:6px; padding:10px 14px; margin-bottom:16px;">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
        <strong style="font-size:12px; text-transform:uppercase; color:var(--gold); font-family:'Cinzel',serif;"><i class="ti ti-book-2"></i> Descrição & Resumo da Campanha</strong>
        <small style="font-size:11px; color:var(--muted);">Clique para editar</small>
      </div>
      <textarea id="cDescWorkspace" onchange="atualizarDescricaoCampanha(this.value)" placeholder="Digite aqui a premissa, notas gerais ou história base da campanha..." style="width:100%; min-height:48px; background:transparent; border:none; color:var(--text); font-size:14px; line-height:1.4; resize:vertical; outline:none;">${
        c.descricao || ""
      }</textarea>
    </div>

    <div class="campanha-workspace">
      <!-- PAINEL ESQUERDO: SESSÕES E JOGADORES -->
      <div class="campanha-sidebar-left">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
          <strong style="font-size:12px; text-transform:uppercase; color:var(--gold); font-family:'Cinzel',serif;">Sessões / Pastas</strong>
          <button class="btn xs" onclick="adicionarSessao()"><i class="ti ti-plus"></i> Nova</button>
        </div>
        <div id="listaSessoesContainer" style="display:flex; flex-direction:column; gap:6px; margin-bottom:20px;">
          ${renderListaSessoesHTML(c)}
        </div>

        <strong style="font-size:12px; text-transform:uppercase; color:var(--gold); font-family:'Cinzel',serif; display:block; margin-bottom:10px;">Jogadores da Campanha</strong>
        <div id="listaJogadoresCampanha" style="display:flex; flex-direction:column; gap:8px;">
          ${await renderJogadoresCampanhaHTML(c)}
        </div>
      </div>

      <!-- PAINEL CENTRAL: EDITOR DE HISTÓRIA -->
      <div id="editorSessaoContainer" class="campanha-editor-main">
        ${renderWorkspaceSessao(c)}
      </div>

      <!-- PAINEL DIREITO: AMEAÇAS DA SESSÃO -->
      <div class="campanha-sidebar-right">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
          <h4 style="font-family:'Cinzel',serif; margin:0; color:var(--gold); font-size:13px;"><i class="ti ti-skull"></i> Ameaças na Sessão</h4>
          <button class="btn xs primary" onclick="abrirModalImportarMonstro()"><i class="ti ti-plus"></i> Add</button>
        </div>
        <div id="monstrosSessaoContainer" style="display:flex; flex-direction:column; gap:8px;">
          ${renderMonstrosSessaoHTML(sAtiva)}
        </div>
      </div>
    </div>`;
}

function atualizarDescricaoCampanha(val) {
  const c = getCampanhaAtiva();
  if (c) {
    c.descricao = val;
    saveCampanhas();
    toast("Descrição da campanha atualizada.");
  }
}

function renderListaSessoesHTML(c) {
  return c.sessoes
    .map((s) => {
      const ativa = s.id === sessaoAtivaId;
      return `
      <div onclick="selecionarSessao('${
        s.id
      }')" style="padding:8px 10px; border-radius:4px; background:${
        ativa ? "rgba(200,168,107,0.18)" : "transparent"
      }; border:1px solid ${
        ativa ? "var(--gold)" : "transparent"
      }; cursor:pointer; display:flex; justify-content:space-between; align-items:center;">
        <span style="font-size:14px; font-weight:${
          ativa ? "bold" : "normal"
        }; color:${
        ativa ? "var(--gold)" : "inherit"
      }; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${
        s.titulo || "Sem Título"
      }</span>
        ${
          c.sessoes.length > 1
            ? `<i class="ti ti-x" style="font-size:14px; color:var(--red2);" onclick="event.stopPropagation(); excluirSessao('${s.id}')"></i>`
            : ""
        }
      </div>`;
    })
    .join("");
}

async function renderJogadoresCampanhaHTML(c) {
  const todasFichas = getFichasGerais();
  const vinculadas = todasFichas.filter((f) =>
    (c.participantes || []).includes(f.id)
  );

  if (vinculadas.length === 0)
    return `<div style="font-size:13px; color:var(--muted); font-style:italic;">Nenhum participante.</div>`;

  const html = await Promise.all(
    vinculadas.map(async (f) => {
      const avatar = await loadImageFromDB(f.id);
      const nomeFicha = f.name || f.nome || "Jogador Sem Nome";
      return `
      <div class="selection-item" style="padding: 6px 8px;" onclick="confirmarNavegacao('${nomeFicha}', '../pages/ficha.html?id=${
        f.id
      }')">
        <div style="display:flex; align-items:center; gap:8px; overflow:hidden;">
          ${
            avatar
              ? `<img src="${avatar}" style="width:28px; height:28px; border-radius:50%; object-fit:cover;">`
              : `<i class="ti ti-user" style="font-size:16px;"></i>`
          }
          <div style="overflow:hidden;">
            <div style="font-size:13px; font-weight:bold; white-space:nowrap; text-overflow:ellipsis; overflow:hidden;">${nomeFicha}</div>
            <div style="font-size:11px; color:var(--muted);">${
              f.class || "Classe"
            } · Nv ${f.level || 1}</div>
          </div>
        </div>
        <i class="ti ti-external-link" style="font-size: 14px; color: var(--muted);"></i>
      </div>`;
    })
  );

  return html.join("");
}

function renderWorkspaceSessao(c) {
  const s = c.sessoes.find((x) => x.id === sessaoAtivaId);
  if (!s) return "Selecione uma sessão.";

  return `
    <div style="display:flex; flex-direction:column; gap:12px; height:100%;">
      <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px;">
        <div class="form-field" style="margin:0;">
          <label style="font-size:13px;">Título da Sessão</label>
          <input type="text" id="sTituloInput" value="${
            s.titulo || ""
          }" onchange="atualizarDadosSessao()" placeholder="Ex: Ato I: As Ruínas" style="font-size:14px; padding:8px;">
        </div>
        <div class="form-field" style="margin:0;">
          <label style="font-size:13px;">Subtítulo</label>
          <input type="text" id="sSubtituloInput" value="${
            s.subtitulo || ""
          }" onchange="atualizarDadosSessao()" placeholder="Ex: Onde as sombras espreitam..." style="font-size:14px; padding:8px;">
        </div>
      </div>

      <!-- BARRA DE FERRAMENTAS DO EDITOR ENRIQUECIDO -->
      <div style="display:flex; align-items:center; gap:8px; background:var(--surface); padding:6px 10px; border-radius:4px; border:1px solid var(--border);">
        <label style="font-size:12px; color:var(--muted); margin:0;">Cor do Texto Selecionado:</label>
        <input type="color" id="editorColorPicker" value="#c8a86b" onchange="aplicarCorTexto(this.value)" style="border:none; background:transparent; width:28px; height:28px; cursor:pointer;">
        <button class="btn xs" onclick="execCmd('bold')"><b>B</b></button>
        <button class="btn xs" onclick="execCmd('italic')"><i>I</i></button>
        <button class="btn xs" onclick="execCmd('underline')"><u>U</u></button>
      </div>

      <!-- ÁREA DE TEXTO ENRIQUECIDO EXPANDIDA -->
      <div id="richTextEditor" contenteditable="true" oninput="atualizarDadosSessao()" style="flex:1; min-height:420px; overflow-y:auto; border:1px solid var(--border); padding:16px; border-radius:4px; background:var(--bg); color:inherit; outline:none; font-size:16px; line-height:1.6;">
        ${s.texto || ""}
      </div>
    </div>`;
}

// ── MANIPULAÇÃO DE SESSÕES E TEXTO ──────────────────────────────────────────
function selecionarSessao(id) {
  sessaoAtivaId = id;
  const c = campanhas.find((x) => x.id === campanhaAtivaId);
  if (c) abrirCampanha(c.id);
}

function adicionarSessao() {
  const c = campanhas.find((x) => x.id === campanhaAtivaId);
  if (!c) return;

  const nova = {
    id: uid(),
    titulo: `Sessão ${c.sessoes.length + 1}`,
    subtitulo: "",
    texto: "",
    monstrosVinculados: [],
  };

  c.sessoes.push(nova);
  sessaoAtivaId = nova.id;
  saveCampanhas();
  abrirCampanha(c.id);
  toast("Nova sessão adicionada!");
}

function excluirSessao(id) {
  const c = campanhas.find((x) => x.id === campanhaAtivaId);
  if (!c || c.sessoes.length <= 1) return;

  if (confirm("Excluir esta sessão?")) {
    c.sessoes = c.sessoes.filter((x) => x.id !== id);
    sessaoAtivaId = c.sessoes[0].id;
    saveCampanhas();
    abrirCampanha(c.id);
    toast("Sessão removida.");
  }
}

function execCmd(command, value = null) {
  document.execCommand(command, false, value);
  atualizarDadosSessao();
}

function aplicarCorTexto(color) {
  execCmd("foreColor", color);
}

function atualizarDadosSessao() {
  const c = campanhas.find((x) => x.id === campanhaAtivaId);
  if (!c) return;
  const s = c.sessoes.find((x) => x.id === sessaoAtivaId);
  if (!s) return;

  s.titulo = document.getElementById("sTituloInput").value;
  s.subtitulo = document.getElementById("sSubtituloInput").value;
  s.texto = document.getElementById("richTextEditor").innerHTML;

  saveCampanhas();

  const lista = document.getElementById("listaSessoesContainer");
  if (lista) lista.innerHTML = renderListaSessoesHTML(c);
}

// ── VINCULAÇÃO E IMPORTAÇÃO DE MONSTROS ───────────────────────────────────────
function renderMonstrosSessaoHTML(s) {
  if (!s)
    return `<div style="font-size:13px; color:var(--muted); font-style:italic;">Selecione uma sessão.</div>`;
  const todasFichas = getFichasGerais();
  const vinculados = todasFichas.filter((f) =>
    (s.monstrosVinculados || []).includes(f.id)
  );

  if (vinculados.length === 0) {
    return `<div style="font-size:12px; color:var(--muted); font-style:italic;">Nenhuma ameaça importada nesta sessão.</div>`;
  }

  return vinculados
    .map((m) => {
      const nome = m.name || m.nome || "Sem Nome";
      const isMonstro = m.type === "monster";
      const isNpc = m.type === "neutral" || m.type === "npc";
      const cor = isMonstro ? "var(--red2)" : isNpc ? "#2a5080" : "#4a9c2e";
      const pagina = isMonstro ? "monstros" : "ficha";
      const subtitulo = isMonstro
        ? `${m.race || "Criatura"} · ND ${m.level || "-"}`
        : `${m.race || "Sem Raça"} · ${m.class || "Sem Classe"}`;
      return `
      <div class="selection-item" style="padding: 6px 8px;">
        <div style="cursor:pointer; flex:1; min-width:0;" onclick="confirmarNavegacao('${nome}', '../pages/${pagina}.html?id=${m.id}')">
          <strong style="font-size:13px; display:block; color:${cor}; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${nome}</strong>
          <small style="color:var(--muted); font-size:11px;">${subtitulo}</small>
        </div>
        <button class="btn xs link danger" onclick="desvincularMonstro('${m.id}')" title="Remover da sessão"><i class="ti ti-x"></i></button>
      </div>`;
    })
    .join("");
}

let lastImportModalStateCamp = { screen: "menu", folderName: null };

function abrirModalImportarMonstro() {
  document.getElementById("mImportMonstro").style.display = "flex";

  if (lastImportModalStateCamp.screen === "jogadores") {
    showJogadoresImportCamp();
  } else if (lastImportModalStateCamp.screen === "npcs") {
    showNpcsImportCamp();
  } else if (lastImportModalStateCamp.screen === "folders") {
    showMonstrosFoldersCamp();
  } else if (
    lastImportModalStateCamp.screen === "folder-detail" &&
    lastImportModalStateCamp.folderName
  ) {
    showMonstrosInFolderCamp(lastImportModalStateCamp.folderName);
  } else {
    renderImportSelecaoCamp();
  }
}

function renderImportSelecaoCamp() {
  lastImportModalStateCamp = { screen: "menu", folderName: null };
  const container = document.getElementById("mListaMonstrosImport");
  container.innerHTML = `
    <div style="font-size:13px; color:var(--muted); margin-bottom:10px;">Escolha o tipo de ameaça/personagem para importar:</div>
    <div style="display:flex; gap:12px;">
      <button class="btn primary" style="flex:1; padding:16px; font-size:14px; border-color:#4a9c2e" onclick="showJogadoresImportCamp()">
        <i class="ti ti-user" style="font-size:18px; display:block; margin-bottom:4px"></i> Jogador
      </button>
      <button class="btn primary" style="flex:1; padding:16px; font-size:14px; border-color:#2a5080" onclick="showNpcsImportCamp()">
        <i class="ti ti-users" style="font-size:18px; display:block; margin-bottom:4px"></i> NPC
      </button>
      <button class="btn primary" style="flex:1; padding:16px; font-size:14px; border-color:#c05050" onclick="showMonstrosFoldersCamp()">
        <i class="ti ti-ghost" style="font-size:18px; display:block; margin-bottom:4px"></i> Monstro
      </button>
    </div>`;
}

function btnVoltarImportCamp(texto, onclick) {
  return `<button class="btn sm" style="margin-bottom:10px;" onclick="${onclick}"><i class="ti ti-arrow-left"></i> ${texto}</button>`;
}

function showJogadoresImportCamp() {
  lastImportModalStateCamp = { screen: "jogadores", folderName: null };
  const todasFichas = getFichasGerais();
  const fichas = todasFichas.filter((f) => f.type === "player" || !f.type);
  const container = document.getElementById("mListaMonstrosImport");
  container.innerHTML =
    btnVoltarImportCamp("Voltar", "renderImportSelecaoCamp()") +
    `<div style="font-size:13px; color:var(--muted); margin-bottom:8px;">Selecione um Jogador para importar:</div>` +
    renderListaImportacaoCamp(fichas, "#4a9c2e", "Jogador");
}

function showNpcsImportCamp() {
  lastImportModalStateCamp = { screen: "npcs", folderName: null };
  const todasFichas = getFichasGerais();
  const fichas = todasFichas.filter(
    (f) => f.type === "neutral" || f.type === "npc"
  );
  const container = document.getElementById("mListaMonstrosImport");
  container.innerHTML =
    btnVoltarImportCamp("Voltar", "renderImportSelecaoCamp()") +
    `<div style="font-size:13px; color:var(--muted); margin-bottom:8px;">Selecione um NPC para importar:</div>` +
    renderListaImportacaoCamp(fichas, "#2a5080", "NPC");
}

function showMonstrosFoldersCamp() {
  lastImportModalStateCamp = { screen: "folders", folderName: null };
  const todasFichas = getFichasGerais();
  const monstros = todasFichas.filter((m) => m.type === "monster");
  const container = document.getElementById("mListaMonstrosImport");

  if (monstros.length === 0) {
    container.innerHTML =
      btnVoltarImportCamp("Voltar", "renderImportSelecaoCamp()") +
      `<div style="font-size:13px; color:var(--muted); font-style:italic;">Nenhum monstro cadastrado no Bestiário.</div>`;
    return;
  }

  let pastas = [
    ...new Set(monstros.map((m) => m.folder || m.pasta || "Geral")),
  ];
  if (pastas.length === 0) pastas = ["Geral"];

  container.innerHTML =
    btnVoltarImportCamp("Voltar", "renderImportSelecaoCamp()") +
    `<div style="font-size:13px; color:var(--muted); margin-bottom:8px;">Selecione uma pasta de monstros:</div>` +
    `<div style="display:grid; grid-template-columns: 1fr 1fr; gap:8px;">` +
    pastas
      .map((pasta) => {
        const qtd = monstros.filter(
          (m) => (m.folder || m.pasta || "Geral") === pasta
        ).length;
        return `<button class="btn" style="padding:12px; font-family:'Cinzel', serif; text-align:left; display:flex; align-items:center; justify-content:space-between; gap:8px; font-size:13px;" onclick="showMonstrosInFolderCamp('${pasta}')">
        <span><i class="ti ti-folder" style="color:var(--gold); margin-right:4px"></i> ${pasta}</span>
        <span style="font-size:12px; opacity:0.6">(${qtd})</span>
      </button>`;
      })
      .join("") +
    `</div>`;
}

function showMonstrosInFolderCamp(folderName) {
  lastImportModalStateCamp = {
    screen: "folder-detail",
    folderName: folderName,
  };
  const todasFichas = getFichasGerais();
  const monstros = todasFichas
    .filter(
      (m) =>
        m.type === "monster" && (m.folder || m.pasta || "Geral") === folderName
    )
    .sort((a, b) =>
      (a.name || a.nome || "").localeCompare(b.name || b.nome || "", "pt-BR", {
        sensitivity: "base",
      })
    );

  const container = document.getElementById("mListaMonstrosImport");
  container.innerHTML =
    btnVoltarImportCamp("Voltar para Pastas", "showMonstrosFoldersCamp()") +
    `<div style="font-size:13px; color:var(--muted); margin-bottom:8px;">Monstros na pasta: <strong>${folderName}</strong></div>` +
    renderListaImportacaoCamp(monstros, "#c05050", "Monstro");
}

function renderListaImportacaoCamp(fichas, corPadrao, rotulo) {
  if (fichas.length === 0) {
    return `<div style="font-size:13px; color:var(--muted); font-style:italic;">Nenum${
      rotulo === "NPC" ? "" : "a"
    } ${rotulo.toLowerCase()} encontrad${
      rotulo === "NPC" ? "o" : "a"
    } no sistema.</div>`;
  }

  return fichas
    .map((m) => {
      const nome = m.name || m.nome || rotulo;
      const cor =
        (m.colors && m.colors.customFieldFontColor) || m.bg || corPadrao;
      return `
      <div class="selection-item">
        <span class="item-title" style="color:${cor}; font-size:13px;">
          <i class="ti ${
            rotulo === "Monstro" ? "ti-skull" : "ti-user"
          }"></i> ${nome} 
          <small style="color:var(--muted); font-weight:normal; font-size:11px;">(${
            m.race || rotulo
          }${m.level ? " - ND " + m.level : ""})</small>
        </span>
        <div style="display:flex; gap:4px;">
          <button class="btn xs" type="button" onclick="confirmarNavegacao('${nome}', '../pages/${
        rotulo === "Monstro" ? "monstros" : "ficha"
      }.html?id=${m.id}')">
            <i class="ti ti-external-link"></i> Ver
          </button>
          <button class="btn xs primary" type="button" onclick="vincularMonstro('${
            m.id
          }')">
            <i class="ti ti-plus"></i> Importar
          </button>
        </div>
      </div>`;
    })
    .join("");
}

function vincularMonstro(monstroId) {
  const c = campanhas.find((x) => x.id === campanhaAtivaId);
  if (!c) return;
  const s = c.sessoes.find((x) => x.id === sessaoAtivaId);
  if (!s) return;

  if (!s.monstrosVinculados) s.monstrosVinculados = [];
  if (!s.monstrosVinculados.includes(monstroId)) {
    s.monstrosVinculados.push(monstroId);
    saveCampanhas();
    toast("Importado para a sessão!");

    document.getElementById("monstrosSessaoContainer").innerHTML =
      renderMonstrosSessaoHTML(s);
  } else {
    toast("Já vinculado a esta sessão.");
  }
}

function desvincularMonstro(monstroId) {
  const c = campanhas.find((x) => x.id === campanhaAtivaId);
  if (!c) return;
  const s = c.sessoes.find((x) => x.id === sessaoAtivaId);
  if (!s) return;

  s.monstrosVinculados = (s.monstrosVinculados || []).filter(
    (id) => id !== monstroId
  );
  saveCampanhas();
  document.getElementById("monstrosSessaoContainer").innerHTML =
    renderMonstrosSessaoHTML(s);
  toast("Monstro removido da sessão.");
}

function fecharModal(id) {
  const modal = document.getElementById(id);
  if (modal) modal.style.display = "none";
}

// ── INITIALIZATION ────────────────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", () => {
  initCampanhas();
});
