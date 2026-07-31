// ── THEME ─────────────────────────────────────────────────────────────────────
let dark = localStorage.getItem('rpg_theme') !== 'light';
function applyTheme(){ 
  const body = document.body;
  const themeBtn = document.getElementById('themeBtn');
  if(body) body.classList.toggle('light', !dark); 
  if(themeBtn) themeBtn.textContent = dark ? '☀' : '🌙'; 
}
function toggleTheme(){ dark = !dark; localStorage.setItem('rpg_theme', dark ? 'dark' : 'light'); applyTheme(); }
applyTheme();

// ── MOBILE MENU ───────────────────────────────────────────────────────────────
function toggleMobMenu(){ document.getElementById('mobNav').classList.toggle('open'); }
function closeMobMenu(){ document.getElementById('mobNav').classList.remove('open'); }

// ── INDEXEDDB FOR IMAGES ──────────────────────────────────────────────────────
const DB_NAME = 'rpg_images_db';
const DB_VERSION = 1;
const STORE_NAME = 'char_avatars';

function openImagesDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
    request.onsuccess = (e) => resolve(e.target.result);
    request.onerror = (e) => reject(e.target.error);
  });
}

async function saveImageToDB(id, base64Data) {
  try {
    const db = await openImagesDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.put({ id, image: base64Data });
    return new Promise((resolve) => tx.oncomplete = () => resolve());
  } catch (err) {
    console.error("Erro ao salvar imagem no IndexedDB", err);
  }
}

async function loadImageFromDB(id) {
  try {
    const db = await openImagesDB();
    const tx = db.transaction(STORE_NAME, 'readonly');
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
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.delete(id);
    return new Promise((resolve) => tx.oncomplete = () => resolve());
  } catch (err) {
    console.error("Erro ao deletar imagem do IndexedDB", err);
  }
}

// ── STORAGE & STATE ───────────────────────────────────────────────────────────
const SK_FICHAS = 'rpg_fichas_v1';
const SK_PASTAS = 'rpg_monstros_pastas';

let monstros = [];
let pastas = [];
let pastaAtiva = 'base'; 
let ordenacaoAtiva = 'nome'; 
let monsterSelecionadoId = null;
let acoesTemporarias = []; 
let atributosTemporarios = []; 
let autoSaveInterval = null;
let mudouSemSalvar = false;
let editandoMonstroId = null;

// Inicializa pastas e monstros do Local Storage
// ── INICIALIZAÇÃO ─────────────────────────────────────────────────────────────
async function inicializar(){
  carregarPastas();
  await carregarMonstros();

  // ── CAPTURA O ID PASSADO NA URL SE EXISTIR ──────────────────────────────────
  const urlParams = new URLSearchParams(window.location.search);
  const targetId = urlParams.get('id');

  if (targetId) {
    const monstroAlvo = monstros.find(m => m.id === targetId);
    if (monstroAlvo) {
      monsterSelecionadoId = targetId;
      // Garante que a pasta ativa seja a pasta do monstro selecionado
      pastaAtiva = monstroAlvo.folder || 'base';
    }
  }

  renderizarPastas();
  await renderizarListaMonstros();
  configurarFechamentoPopup();

  // Se um monstro válido veio via URL, renderiza o visualizador dele imediatamente
  if (monsterSelecionadoId) {
    visualizarMonstro(monsterSelecionadoId);
  }

  const folderInput = document.getElementById('newFolderName');
  if (folderInput) {
    folderInput.addEventListener('keydown', function(e) {
      if (e.key === 'Enter') {
        e.preventDefault();
        confirmarCriarPasta();
      }
    });
  }
}

function carregarPastas(){
  try {
    const pastasSalvas = localStorage.getItem(SK_PASTAS);
    if(pastasSalvas) {
      pastas = JSON.parse(pastasSalvas);
    } else {
      pastas = [{ id: 'base', nome: 'Base' }];
      localStorage.setItem(SK_PASTAS, JSON.stringify(pastas));
    }
  } catch(e) {
    pastas = [{ id: 'base', nome: 'Base' }];
  }
  if(!pastas.some(p => p.id === pastaAtiva)) {
    pastaAtiva = pastas[0].id;
  }
}

// ── MODAL DE PASTAS ──────────────────────────────────────────────────────────
function criarNovaPasta(){
  const input = document.getElementById('newFolderName');
  if (input) input.value = '';
  document.getElementById('mPasta').style.display = 'flex';
  setTimeout(() => { if (input) input.focus(); }, 100);
}

function fecharModalPasta(){
  document.getElementById('mPasta').style.display = 'none';
}

function confirmarCriarPasta(){
  const input = document.getElementById('newFolderName');
  const nome = input ? input.value.trim() : '';
  
  if(!nome) {
    toast("O nome da pasta não pode ser vazio!");
    return;
  }
  
  const id = nome.toLowerCase().replace(/\s+/g, '_').normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  if(pastas.some(p => p.id === id)){
    toast("Já existe uma pasta com esse nome!");
    return;
  }
  
  pastas.push({ id, nome });
  localStorage.setItem(SK_PASTAS, JSON.stringify(pastas));
  
  pastaAtiva = id; 
  fecharModalPasta();
  renderizarPastas();
  renderizarListaMonstros();
  toast(`Pasta "${nome}" criada e ativada!`);
}

function renderizarPastas(){
  const container = document.getElementById('foldersList');
  if(!container) return;

  container.innerHTML = pastas.map(p => {
    const activeClass = p.id === pastaAtiva ? 'active' : '';
    return `
      <div class="folder-item ${activeClass}" onclick="selecionarPasta('${p.id}')">
        <i class="ti ti-folder"></i>
        <span>${p.nome}</span>
      </div>
    `;
  }).join('');
}

function selecionarPasta(id){
  pastaAtiva = id;
  renderizarPastas();
  renderizarListaMonstros();
}

async function carregarMonstros(){
  try {
    let todasFichas = JSON.parse(localStorage.getItem(SK_FICHAS)) || [];
    
    if (todasFichas.length === 0) {
      try {
        const response = await fetch('../data/inimigos.json');
        if (response.ok) {
          const dados = await response.json();
          if (dados && dados.monstros) {
            dados.monstros.forEach(m => {
              m.type = 'monster';
              m.folder = m.folder || 'base';
              todasFichas.push(m);
            });
            localStorage.setItem(SK_FICHAS, JSON.stringify(todasFichas));
          }
        }
      } catch (err) {
        console.warn("Não foi possível carregar ../data/inimigos.json automaticamente.");
      }
    }
    
    monstros = todasFichas.filter(f => f.type === 'monster' || f.folder === 'monster');
    monstros.forEach(m => {
      m.type = 'monster';
      if(!m.folder) m.folder = 'base';
    });
  } catch(e) {
    monstros = [];
  }
}

function salvarListaCompletaNoStorage(novaFicha, silencioso = false){
  try {
    const todasFichas = JSON.parse(localStorage.getItem(SK_FICHAS)) || [];
    const idx = todasFichas.findIndex(f => f.id === novaFicha.id);
    if(idx > -1) {
      todasFichas[idx] = novaFicha;
    } else {
      todasFichas.push(novaFicha);
    }
    localStorage.setItem(SK_FICHAS, JSON.stringify(todasFichas));
    carregarMonstros().then(() => {
      renderizarListaMonstros();
    });
    if (!silencioso) toast("Monstro salvo!");
  } catch(e) {
    toast("Erro ao salvar monstro.");
  }
}

async function excluirMonstro(id){
  if(!confirm("Tem certeza que deseja apagar este monstro do bestiário?")) return;
  try {
    let todasFichas = JSON.parse(localStorage.getItem(SK_FICHAS)) || [];
    todasFichas = todasFichas.filter(f => f.id !== id);
    localStorage.setItem(SK_FICHAS, JSON.stringify(todasFichas));
    
    await deleteImageFromDB(id);
    await deleteImageFromDB(id + '_full');

    toast("Monstro removido.");
    monsterSelecionadoId = null;
    await inicializar();
    document.getElementById('bestiaryMain').innerHTML = `
      <div class="empty-state">
        <div class="big">💀</div>
        <h3>Nenhum Monstro Selecionado</h3>
        <p>Selecione uma criatura na lista lateral para ler sua ficha.</p>
      </div>`;
  } catch(e){
    toast("Erro ao excluir.");
  }
}

function uid(){ return 'm_' + Date.now().toString(36) + Math.random().toString(36).slice(2); }
function toast(msg){ 
  const t = document.createElement('div'); 
  t.className = 'toast'; 
  t.textContent = msg; 
  document.body.appendChild(t); 
  setTimeout(() => t.remove(), 2400); 
}

function mod(v){ return Math.floor((v - 10) / 2); }
function fmod(v){ const m = mod(v); return (m >= 0 ? '+' : '') + m; }

function avaliarND(nivel) {
  if (!nivel) return 0;
  const str = String(nivel).trim();
  if (str.includes('/')) {
    const partes = str.split('/');
    const num = parseFloat(partes[0]);
    const den = parseFloat(partes[1]);
    if (den !== 0) return num / den;
  }
  const valor = parseFloat(str);
  return isNaN(valor) ? 0 : valor;
}

// ── SISTEMA DE POPUP DO FILTRO ────────────────────────────────────────────────
function toggleFilterPopup(event) {
  event.stopPropagation();
  const popup = document.getElementById('filterPopup');
  popup.classList.toggle('show');
}

function selecionarOrdenacao(criterio) {
  ordenacaoAtiva = criterio;
  document.getElementById('filterPopup').classList.remove('show');
  renderizarListaMonstros();
  toast(`Ordenado por: ${criterio === 'nome' ? 'Nome' : criterio === 'nivel' ? 'Nível' : 'Tipo'}`);
}

function configurarFechamentoPopup() {
  document.addEventListener('click', function(event) {
    const popup = document.getElementById('filterPopup');
    const btn = document.getElementById('filterPopupBtn');
    if (popup && !popup.contains(event.target) && event.target !== btn && !btn.contains(event.target)) {
      popup.classList.remove('show');
    }
  });
}

// ── LISTAGEM FILTRADA E ORDENADA ───────────────────────────────────────────────
async function renderizarListaMonstros(filtrados = monstros){
  const container = document.getElementById('monsterList');
  if(!container) return;

  let monstrosParaExibir = filtrados.filter(m => (m.folder || 'base') === pastaAtiva);
  document.getElementById('countMonstros').textContent = monstrosParaExibir.length;

  if(monstrosParaExibir.length === 0){
    container.innerHTML = `<div style="text-align:center;color:var(--muted);font-style:italic;padding:15px;font-size:13px">Nenhuma criatura nesta pasta.</div>`;
    return;
  }

  monstrosParaExibir.sort((a, b) => {
    if (ordenacaoAtiva === 'nivel') {
      const ndA = avaliarND(a.level);
      const ndB = avaliarND(b.level);
      if (ndA !== ndB) return ndA - ndB;
    } else if (ordenacaoAtiva === 'tipo') {
      const tipoA = (a.race || '').trim().toLowerCase();
      const tipoB = (b.race || '').trim().toLowerCase();
      if (tipoA !== tipoB) return tipoA.localeCompare(tipoB, 'pt');
    }
    const nomeA = (a.name || '').trim().toLowerCase();
    const nomeB = (b.name || '').trim().toLowerCase();
    return nomeA.localeCompare(nomeB, 'pt');
  });

  const itemsHtml = await Promise.all(monstrosParaExibir.map(async m => {
    const nd = m.level ? `ND ${m.level}` : 'ND -';
    const activeClass = m.id === monsterSelecionadoId ? 'active' : '';
    const avatarImg = await loadImageFromDB(m.id);
    const avContent = avatarImg 
      ? `<img src="${avatarImg}" style="width:32px;height:32px;border-radius:50%;object-fit:cover;margin-right:8px;">`
      : `<div style="width:32px;height:32px;border-radius:50%;background:var(--border);color:var(--gold);display:flex;align-items:center;justify-content:center;font-weight:bold;margin-right:8px;font-size:12px;">${(m.name[0]||'M').toUpperCase()}</div>`;

    return `
      <div class="monster-card-item ${activeClass}" onclick="visualizarMonstro('${m.id}')" style="display:flex;align-items:center;">
        ${avContent}
        <div class="m-item-info" style="flex:1;">
          <span class="m-item-name">${m.name}</span>
          <span class="m-item-meta">${m.race || 'Monstro'} · ${nd}</span>
        </div>
        <div class="m-item-actions" onclick="event.stopPropagation()">
          <button class="btn xs link" onclick="editarMonstro('${m.id}')" style="color:var(--gold)"><i class="ti ti-edit"></i></button>
          <button class="btn xs link" onclick="excluirMonstro('${m.id}')" style="color:var(--red2)"><i class="ti ti-trash"></i></button>
        </div>
      </div>
    `;
  }));

  container.innerHTML = itemsHtml.join('');
}

function filtrarMonstros(){
  const query = document.getElementById('monsterSearch').value.toLowerCase().trim();
  if(!query) {
    renderizarListaMonstros(monstros);
    return;
  }
  const filtrados = monstros.filter(m => m.name.toLowerCase().includes(query) || (m.race && m.race.toLowerCase().includes(query)));
  renderizarListaMonstros(filtrados);
}

// ── LEITOR DE FICHA (VISUALIZADOR EM DUAS COLUNAS) ───────────────────────────
async function visualizarMonstro(id){
  desativarAutoSalvamento();
  monsterSelecionadoId = id;
  renderizarListaMonstros();
  const m = monstros.find(x => x.id === id);
  if(!m) return;

  const avatarImg = await loadImageFromDB(m.id);
  const fullBodyImg = await loadImageFromDB(m.id + '_full');

  const container = document.getElementById('bestiaryMain');

  const habs = m.habilidades || [];
  const traits = habs.filter(h => h.level === 'trait');
  const actions = habs.filter(h => h.level === 'action');
  const reactions = habs.filter(h => h.level === 'reaction');
  const legendaries = habs.filter(h => h.level === 'legendary');

  const getCombatVal = (lbl) => m.combat.find(c => c.label === lbl || c.id === lbl)?.val || 0;
  const ca = getCombatVal('ca');
  const hp = getCombatVal('hpmax');
  const vel = getCombatVal('vel') || '9m';

  container.innerHTML = `
    <div class="monster-sheet-read">
      <div class="sheet-actions-header no-print" style="justify-content: space-between;">
        <div style="display: flex; gap: 8px;">
          <button class="btn" onclick="editarMonstro('${m.id}')"><i class="ti ti-edit"></i> Editar Monstro</button>
          <button class="btn primary" onclick="window.print()"><i class="ti ti-printer"></i> Imprimir Ficha</button>
        </div>
        <div>
          <button class="btn outline sm" onclick="exportarFichaJSON('${m.id}')" title="Baixar cópia do monstro"><i class="ti ti-download"></i> Exportar Monstro</button>
        </div>
      </div>

      <!-- CONTAINER DAS DUAS COLUNAS -->
      <div class="monster-read-content">
        
        <!-- COLUNA DA ESQUERDA (Título, Status, Atributos e Ações) -->
        <div class="monster-read-details">
          
          <div style="display:flex; align-items:center; gap:16px; margin-bottom:12px;">
            ${avatarImg ? `<img src="${avatarImg}" style="width:64px;height:64px;border-radius:50%;object-fit:cover;border:2px solid var(--gold);">` : ''}
            <div>
              <h2 class="dnd-red-title" style="margin:0;">${m.name}</h2>
              <div class="dnd-meta-line">${m.tamanho || 'Médio'} · ${m.race || 'Monstro'} · ${m.alignment || 'Neutro'} — ND ${m.level}</div>
            </div>
          </div>
          
          <hr class="dnd-divider">

          <div class="dnd-stat-block">
            <div><strong>Classe de Armadura:</strong> ${ca}</div>
            <div><strong>Pontos de Vida:</strong> ${hp}</div>
            <div><strong>Deslocamento:</strong> ${vel}</div>
          </div>

          <hr class="dnd-divider">

          <table class="dnd-attr-table">
            <thead>
              <tr>
                ${(m.attrs || []).map(a => `<th>${a.abr}</th>`).join('')}
              </tr>
            </thead>
            <tbody>
              <tr>
                ${(m.attrs || []).map(a => `<td>${a.val} (${fmod(a.val)})</td>`).join('')}
              </tr>
            </tbody>
          </table>

          <hr class="dnd-divider">

          <!-- TEXTO DAS AÇÕES (Ficarão do lado esquerdo da arte, como nas linhas amarelas) -->
          ${m.backstory ? `<div class="dnd-desc-item" style="font-style:italic;margin-top:10px">${m.backstory}</div>` : ''}

          ${traits.length > 0 ? `
            <div class="dnd-section">
              ${traits.map(t => `<div class="dnd-desc-item"><strong>${t.name}.</strong> ${t.desc}</div>`).join('')}
            </div>
          ` : ''}

          ${actions.length > 0 ? `
            <div class="dnd-section">
              <div class="dnd-section-title">Ações</div>
              ${actions.map(t => `<div class="dnd-desc-item"><strong>${t.name}.</strong> ${t.desc}</div>`).join('')}
            </div>
          ` : ''}

          ${reactions.length > 0 ? `
            <div class="dnd-section">
              <div class="dnd-section-title">Reações</div>
              ${reactions.map(t => `<div class="dnd-desc-item"><strong>${t.name}.</strong> ${t.desc}</div>`).join('')}
            </div>
          ` : ''}

          ${legendaries.length > 0 ? `
            <div class="dnd-section">
              <div class="dnd-section-title">Ações Lendárias</div>
              ${legendaries.map(t => `<div class="dnd-desc-item"><strong>${t.name}.</strong> ${t.desc}</div>`).join('')}
            </div>
          ` : ''}

          ${m.notes ? `
            <div class="dnd-section">
              <div class="dnd-section-title">Comportamento &amp; Ecologia</div>
              <div class="dnd-desc-item" style="white-space: pre-line;">${m.notes}</div>
            </div>
          ` : ''}

          ${m.traits ? `
            <div class="dnd-section">
              <div class="dnd-section-title">Drops &amp; Saque (Tesouros)</div>
              <div class="dnd-desc-item" style="white-space: pre-line;"><i class="ti ti-gift" style="color:var(--gold)"></i> ${m.traits}</div>
            </div>
          ` : ''}
        </div>

        <!-- COLUNA DA DIREITA (O Box Vermelho com a Arte) -->
        ${fullBodyImg ? `
          <div class="monster-read-art">
            <img src="${fullBodyImg}" alt="${m.name}">
          </div>
        ` : ''}

      </div>
    </div>
  `;
}

// ── IMPORTAR E EXPORTAR MONSTRO ──────────────────────────────────────────────
async function exportarFichaJSON(id){
  const m = monstros.find(x => x.id === id);
  if(!m) return;

  const exportData = JSON.parse(JSON.stringify(m));
  const avatarImg = await loadImageFromDB(m.id);
  const fullBodyImg = await loadImageFromDB(m.id + '_full');

  if (avatarImg) exportData.characterImg = avatarImg;
  if (fullBodyImg) exportData.fullBodyImg = fullBodyImg;

  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(exportData, null, 2));
  const downloadAnchor = document.createElement('a');
  downloadAnchor.setAttribute("href", dataStr);
  downloadAnchor.setAttribute("download", `${m.name.toLowerCase().replace(/\s+/g, '_')}_ficha.json`);
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();
}

function importarMonstroJSON(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = async function(e) {
    try {
      const dados = JSON.parse(e.target.result);
      
      if (dados && dados.monstros && Array.isArray(dados.monstros)) {
        let importadosContador = 0;
        const todasFichas = JSON.parse(localStorage.getItem(SK_FICHAS)) || [];
        
        for (const m of dados.monstros) {
          const novoId = m.id || uid();
          
          if (m.characterImg) {
            await saveImageToDB(novoId, m.characterImg);
            delete m.characterImg;
          }
          if (m.fullBodyImg) {
            await saveImageToDB(novoId + '_full', m.fullBodyImg);
            delete m.fullBodyImg;
          }

          const novoMonstro = {
            ...m,
            id: novoId,
            type: 'monster',
            folder: pastaAtiva
          };

          const idx = todasFichas.findIndex(f => f.id === novoMonstro.id);
          if (idx > -1) {
            todasFichas[idx] = novoMonstro;
          } else {
            todasFichas.push(novoMonstro);
          }
          importadosContador++;
        }

        localStorage.setItem(SK_FICHAS, JSON.stringify(todasFichas));
        
        await carregarMonstros();
        renderizarPastas();
        renderizarListaMonstros();

        toast(`${importadosContador} monstros importados na pasta ativa!`);
      } 
      else if (dados && typeof dados === 'object') {
        const novoId = dados.id || uid();

        if (dados.characterImg) {
          await saveImageToDB(novoId, dados.characterImg);
          delete dados.characterImg;
        }
        if (dados.fullBodyImg) {
          await saveImageToDB(novoId + '_full', dados.fullBodyImg);
          delete dados.fullBodyImg;
        }

        dados.id = novoId;
        dados.type = 'monster';
        dados.folder = pastaAtiva;
        
        salvarListaCompletaNoStorage(dados);
        toast(`Ficha de "${dados.name}" importada com sucesso!`);
        visualizarMonstro(dados.id);
      } else {
        toast("Erro: Arquivo JSON de monstro inválido.");
      }
    } catch (err) {
      console.error(err);
      toast("Erro ao processar o arquivo JSON.");
    }
  };
  reader.readAsText(file);
  event.target.value = '';
}

// ── CRIADOR / EDITOR ─────────────────────────────────────────────────────────
function abrirCriadorNovo(){
  editandoMonstroId = null;
  acoesTemporarias = [];
  atributosTemporarios = [
    { label: 'Força', abr: 'FOR', val: 10 },
    { label: 'Destreza', abr: 'DES', val: 10 },
    { label: 'Constituição', abr: 'CON', val: 10 },
    { label: 'Inteligência', abr: 'INT', val: 10 },
    { label: 'Sabedoria', abr: 'SAB', val: 10 },
    { label: 'Carisma', abr: 'CAR', val: 10 }
  ];
  mostrarFormulario();
}

function editarMonstro(id){
  const m = monstros.find(x => x.id === id);
  if(!m) return;
  editandoMonstroId = id;
  
  acoesTemporarias = (m.habilidades || []).map(h => ({
    name: h.name,
    type: h.level,
    desc: h.desc
  }));

  atributosTemporarios = (m.attrs || []).map(a => ({
    label: a.label || a.abr,
    abr: a.abr,
    val: a.val
  }));

  mostrarFormulario(m);
}

async function mostrarFormulario(mon = null){
  const container = document.getElementById('bestiaryMain');
  const getCombatVal = (lbl, def) => mon ? (mon.combat.find(c => c.label === lbl || c.id === lbl)?.val || def) : def;

  const currentId = mon ? mon.id : editandoMonstroId;
  const avatarImg = currentId ? await loadImageFromDB(currentId) : null;
  const fullBodyImg = currentId ? await loadImageFromDB(currentId + '_full') : null;

  container.innerHTML = `
    <form class="monster-creator-form" id="creatorForm" onsubmit="event.preventDefault();">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom:16px;">
        <h2 class="section-title" style="font-size:18px;margin:0;">
          <i class="ti ti-edit"></i> ${mon ? 'Editar Ameaça' : 'Criar Nova Ameaça'}
        </h2>
        <span id="saveBadge" style="font-size: 11px; color: var(--gold); font-style: italic; font-weight: bold;">Rascunho pronto</span>
      </div>

      <!-- ÍCONE DO MONSTRO -->
      <div style="display:flex; align-items:center; gap:16px; margin-bottom:16px; border-bottom:1px solid var(--border); padding-bottom:12px;">
        <div style="width:56px; height:56px; border-radius:50%; border:2px dashed var(--gold); display:flex; align-items:center; justify-content:center; overflow:hidden; cursor:pointer; background:var(--card);" onclick="document.getElementById('mAvatarFileInput').click()" title="Alterar Ícone">
          ${avatarImg ? `<img src="${avatarImg}" style="width:100%;height:100%;object-fit:cover;">` : '<i class="ti ti-skull" style="font-size:24px;color:var(--muted)"></i>'}
        </div>
        <div>
          <label style="font-weight:bold; font-size:12px; display:block; margin-bottom:4px;">Ícone do Monstro (Avatar)</label>
          <button type="button" class="btn xs" onclick="document.getElementById('mAvatarFileInput').click()"><i class="ti ti-upload"></i> Escolher Ícone</button>
          ${avatarImg ? `<button type="button" class="btn xs danger" onclick="removerAvatarMonstro()"><i class="ti ti-trash"></i></button>` : ''}
          <input type="file" id="mAvatarFileInput" accept="image/*" style="display:none" onchange="uploadAvatarMonstro(event)">
        </div>
      </div>

      <!-- PAINEL SUPERIOR COM DUAS COLUNAS: FORMULÁRIO À ESQUERDA, ARTE À DIREITA -->
      <div class="monster-editor-layout">
        <div class="monster-editor-fields">
          <div class="form-grid-4">
            <div class="form-field">
              <label>Nome do Monstro</label>
              <input type="text" id="mFormName" value="${mon ? mon.name : ''}" placeholder="Ex: Dragão Vermelho">
            </div>
            <div class="form-field">
              <label>Tamanho</label>
              <select id="mFormSize">
                <option value="Miúdo" ${mon && mon.tamanho === 'Miúdo' ? 'selected' : ''}>Miúdo</option>
                <option value="Pequeno" ${mon && mon.tamanho === 'Pequeno' ? 'selected' : ''}>Pequeno</option>
                <option value="Médio" ${mon && (!mon.tamanho || mon.tamanho === 'Médio') ? 'selected' : ''}>Médio</option>
                <option value="Grande" ${mon && mon.tamanho === 'Grande' ? 'selected' : ''}>Grande</option>
                <option value="Enorme" ${mon && mon.tamanho === 'Enorme' ? 'selected' : ''}>Enorme</option>
                <option value="Colossal" ${mon && mon.tamanho === 'Colossal' ? 'selected' : ''}>Colossal</option>
              </select>
            </div>
            <div class="form-field">
              <label>Tipo de Criatura</label>
              <input type="text" id="mFormRace" value="${mon ? mon.race : 'Monstro'}" placeholder="Morto-vivo, Construto...">
            </div>
            <div class="form-field">
              <label>Alinhamento</label>
              <input type="text" id="mFormAlignment" value="${mon ? mon.alignment : 'Neutro'}" placeholder="Caótico e Mau...">
            </div>
          </div>

          <div class="form-grid-4">
            <div class="form-field">
              <label>Nível de Desafio (ND)</label>
              <input type="text" id="mFormND" value="${mon ? mon.level : '1'}" placeholder="1/4, 5, 20...">
            </div>
            <div class="form-field">
              <label>CA</label>
              <input type="number" id="mFormCA" value="${getCombatVal('ca', 10)}">
            </div>
            <div class="form-field">
              <label>HP Máximo</label>
              <input type="number" id="mFormHP" value="${getCombatVal('hpmax', 15)}">
            </div>
            <div class="form-field">
              <label>Velocidade</label>
              <input type="text" id="mFormVel" value="${getCombatVal('vel', '9m')}" placeholder="9m, voo 18m">
            </div>
          </div>
        </div>

        <!-- QUADRO DA ARTE À DIREITA DO FORMULÁRIO -->
        <div class="monster-editor-art-box">
          <label style="font-weight:bold; font-size:11px; display:block; margin-bottom:6px; color:var(--gold);">ARTE DA CRIATURA</label>
          <div style="height: 140px; width: 100%; overflow: hidden; display: flex; justify-content: center; align-items: center; margin-bottom: 8px;">
            ${fullBodyImg ? `<img src="${fullBodyImg}" style="max-height: 100%; max-width: 100%; border-radius: 6px; object-fit: contain;">` : '<span style="color:var(--muted); font-size:11px; font-style:italic;">Sem arte definida</span>'}
          </div>
          <div style="display:flex; justify-content:center; gap:6px;">
            <button type="button" class="btn xs" onclick="document.getElementById('mFullBodyFileInput').click()"><i class="ti ti-photo"></i> Carregar</button>
            ${fullBodyImg ? `<button type="button" class="btn xs danger" onclick="removerFullBodyMonstro()"><i class="ti ti-trash"></i></button>` : ''}
          </div>
          <input type="file" id="mFullBodyFileInput" accept="image/*" style="display:none" onchange="uploadFullBodyMonstro(event)">
        </div>
      </div>

      <!-- ATRIBUTOS -->
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px">
        <div class="form-field" style="margin:0"><label>Atributos Customizados</label></div>
        <button type="button" class="btn sm" onclick="adicionarNovoAtributoInput()"><i class="ti ti-plus"></i> Novo Atributo</button>
      </div>
      
      <div class="form-grid-6" id="atributosContainer"></div>

      <div class="form-row">
        <div class="form-field">
          <label>Comportamento, Táticas e Hábitos</label>
          <textarea id="mFormBehavior" rows="3" placeholder="Foge se HP cair abaixo de 50%...">${mon ? mon.notes : ''}</textarea>
        </div>
        <div class="form-field">
          <label>Drops (Itens, Moedas, Materiais)</label>
          <textarea id="mFormDrops" rows="3" placeholder="3x Presas Afiadas (10 PO)...">${mon ? mon.traits : ''}</textarea>
        </div>
      </div>

      <div class="form-field">
        <label>Descrição Física / Lore</label>
        <textarea id="mFormBackstory" rows="2" placeholder="Aparência física da criatura...">${mon ? mon.backstory : ''}</textarea>
      </div>

      <!-- HABILIDADES E AÇÕES -->
      <div style="border-top: 1px solid var(--border); padding-top:16px; margin-top:20px;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px">
          <h4 class="section-title" style="margin:0">Ações e Características</h4>
          <button type="button" class="btn sm" onclick="abrirModalAcao()"><i class="ti ti-plus"></i> Adicionar Ação</button>
        </div>
        <div class="added-actions-preview" id="actionsPreview"></div>
      </div>

      <div style="display:flex; justify-content:flex-end; gap:10px; margin-top:24px; border-top: 1px solid var(--border); padding-top:18px">
        <button type="button" class="btn" onclick="cancelarCriador()">Cancelar / Voltar</button>
        <button type="button" class="btn primary" onclick="salvarCriatura(false)"><i class="ti ti-device-floppy"></i> Salvar e Visualizar</button>
      </div>
    </form>
  `;
  
  sincronizarEExibirAtributosNoForm();
  renderizarVisualizacaoAcoes();
  ativarAutoSalvamento();

  const form = document.getElementById('creatorForm');
  form.addEventListener('keydown', function(e) {
    if (e.key === 'Enter' && e.target.tagName !== 'TEXTAREA') {
      e.preventDefault();
      marcarComoAlterado();
    }
  });

  form.addEventListener('input', marcarComoAlterado);
  form.addEventListener('change', marcarComoAlterado);
}

// ── UPLOAD/REMOÇÃO DE IMAGENS DO MONSTRO ──────────────────────────────────────
function uploadAvatarMonstro(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = async function(e) {
    if (!editandoMonstroId) editandoMonstroId = uid();
    await saveImageToDB(editandoMonstroId, e.target.result);
    marcarComoAlterado();
    const mon = monstros.find(x => x.id === editandoMonstroId);
    mostrarFormulario(mon);
    toast("Ícone carregado!");
  };
  reader.readAsDataURL(file);
}

async function removerAvatarMonstro() {
  if (editandoMonstroId && confirm("Remover o ícone desta criatura?")) {
    await deleteImageFromDB(editandoMonstroId);
    marcarComoAlterado();
    const mon = monstros.find(x => x.id === editandoMonstroId);
    mostrarFormulario(mon);
    toast("Ícone removido.");
  }
}

function uploadFullBodyMonstro(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = async function(e) {
    if (!editandoMonstroId) editandoMonstroId = uid();
    await saveImageToDB(editandoMonstroId + '_full', e.target.result);
    marcarComoAlterado();
    const mon = monstros.find(x => x.id === editandoMonstroId);
    mostrarFormulario(mon);
    toast("Arte corporal carregada!");
  };
  reader.readAsDataURL(file);
}

async function removerFullBodyMonstro() {
  if (editandoMonstroId && confirm("Remover a arte desta criatura?")) {
    await deleteImageFromDB(editandoMonstroId + '_full');
    marcarComoAlterado();
    const mon = monstros.find(x => x.id === editandoMonstroId);
    mostrarFormulario(mon);
    toast("Arte removida.");
  }
}

// ── REALTIME AUTOSAVE ────────────────────────────────────────────────
function marcarComoAlterado(){
  mudouSemSalvar = true;
  const badge = document.getElementById('saveBadge');
  if(badge) {
    badge.style.color = 'var(--gold)';
    badge.innerHTML = `<span style="color:var(--gold)"><i class="ti ti-loader animate-spin"></i> Alterações pendentes...</span>`;
  }
}

function ativarAutoSalvamento(){
  desativarAutoSalvamento();
  autoSaveInterval = setInterval(() => {
    if (mudouSemSalvar) {
      salvarCriaturaSilenciosamente();
    }
  }, 2500); 
}

function desativarAutoSalvamento(){
  if(autoSaveInterval) {
    clearInterval(autoSaveInterval);
    autoSaveInterval = null;
  }
}

function salvarCriaturaSilenciosamente(){
  const nomeInput = document.getElementById('mFormName');
  const nome = nomeInput ? nomeInput.value.trim() : '';
  if(!nome) return; 

  comporESalvarObjetoMonstro(true);
  mudouSemSalvar = false;
  const badge = document.getElementById('saveBadge');
  if(badge) {
    badge.style.color = 'var(--gold)';
    badge.innerHTML = `<span><i class="ti ti-check"></i> Rascunho salvo no Local Storage</span>`;
  }
}

function cancelarCriador(){
  if(mudouSemSalvar){
    if(!confirm("Você possui rascunhos não publicados. Deseja mesmo sair e descartar?")) return;
  }
  desativarAutoSalvamento();
  mudouSemSalvar = false;
  document.getElementById('bestiaryMain').innerHTML = `
    <div class="empty-state">
      <div class="big">💀</div>
      <h3>Nenhum Monstro Selecionado</h3>
      <p>Selecione uma criatura na lista lateral para ler sua ficha ou crie uma nova ameaça.</p>
    </div>`;
  editandoMonstroId = null;
}

// ── MANIPULAÇÃO DINÂMICA DE ATRIBUTOS NO EDITOR ──────────────────────────────
function sincronizarEExibirAtributosNoForm(){
  const container = document.getElementById('atributosContainer');
  if(!container) return;

  container.innerHTML = atributosTemporarios.map((attr, index) => `
    <div class="attr-input-box">
      <button type="button" class="remove-attr-btn" onclick="removerAtributoInput(${index})" title="Remover Atributo"><i class="ti ti-trash"></i></button>
      <input type="text" class="attr-lbl-input" id="albl_${index}" value="${attr.abr}" oninput="atualizarLabelAtributo(${index}, this.value)" placeholder="SIGLA">
      <input type="number" class="attr-val-input" id="aval_${index}" value="${attr.val}" oninput="atualizarValorAtributo(${index}, this.value)">
    </div>
  `).join('');
}

function adicionarNovoAtributoInput(){
  atributosTemporarios.push({ label: 'Atributo', abr: 'NOVO', val: 10 });
  sincronizarEExibirAtributosNoForm();
  marcarComoAlterado();
}

function removerAtributoInput(index){
  atributosTemporarios.splice(index, 1);
  sincronizarEExibirAtributosNoForm();
  marcarComoAlterado();
}

function atualizarLabelAtributo(index, value){
  atributosTemporarios[index].abr = value.toUpperCase().slice(0, 5); 
  atributosTemporarios[index].label = value;
}

function atualizarValorAtributo(index, value){
  atributosTemporarios[index].val = parseInt(value) || 0;
}

// ── MODAL DE ADICIONAR AÇÕES NO EDITOR ───────────────────────────────────────
function abrirModalAcao(){
  document.getElementById('actionName').value = '';
  document.getElementById('actionDesc').value = '';
  document.getElementById('actionType').value = 'trait';
  document.getElementById('mAction').style.display = 'flex';
}

function fecharModalAcao(){
  document.getElementById('mAction').style.display = 'none';
}

function salvarAcaoCustomizada(){
  const nome = document.getElementById('actionName').value.trim();
  const desc = document.getElementById('actionDesc').value.trim();
  const tipo = document.getElementById('actionType').value;

  if(!nome || !desc) {
    toast("Preencha o nome e a descrição!");
    return;
  }

  acoesTemporarias.push({ name: nome, type: tipo, desc: desc });
  fecharModalAcao();
  renderizarVisualizacaoAcoes();
  marcarComoAlterado();
}

function removerAcaoTemp(index){
  acoesTemporarias.splice(index, 1);
  renderizarVisualizacaoAcoes();
  marcarComoAlterado();
}

// ── COMPILADOR DE FICHA DE MONSTRO ───────────────────────────────────────────
function comporESalvarObjetoMonstro(silencioso = false) {
  const nome = document.getElementById('mFormName').value.trim();
  const tamanho = document.getElementById('mFormSize').value;
  const race = document.getElementById('mFormRace').value.trim() || 'Monstro';
  const alignment = document.getElementById('mFormAlignment').value.trim() || 'Neutro';
  const level = document.getElementById('mFormND').value.trim() || '1';
  
  const backstory = document.getElementById('mFormBackstory').value.trim();
  const behavior = document.getElementById('mFormBehavior').value.trim();
  const drops = document.getElementById('mFormDrops').value.trim();

  const ca = parseInt(document.getElementById('mFormCA').value) || 10;
  const hp = parseInt(document.getElementById('mFormHP').value) || 10;
  const vel = document.getElementById('mFormVel').value.trim() || '9m';

  const desAttr = atributosTemporarios.find(a => a.abr === 'DES' || a.abr === 'AGI' || a.abr === 'DESLOC');
  const initMod = desAttr ? mod(desAttr.val) : 0;

  if (!editandoMonstroId) {
    editandoMonstroId = uid();
  }

  const novaFichaMonstro = {
    id: editandoMonstroId,
    name: nome,
    tamanho: tamanho,       
    race: race,             
    alignment: alignment,   
    class: 'Monstro',
    level: level, 
    background: 'Ameaça',
    type: 'monster',
    folder: pastaAtiva, 
    profBonus: 2,
    xp: 0,
    colors: {},
    attrs: atributosTemporarios.map((a, idx) => ({
      id: a.abr.toLowerCase() + '_' + idx,
      label: a.label,
      abr: a.abr,
      val: a.val
    })),
    skills: [],
    combat: [
      { id: 'ca', label: 'CA', val: ca },
      { id: 'init', label: 'Iniciativa', val: initMod },
      { id: 'vel', label: 'Velocidade', val: vel },
      { id: 'hpmax', label: 'HP Máx', val: hp },
      { id: 'hpcur', label: 'HP Atual', val: hp }
    ],
    habilidades: acoesTemporarias.map(a => ({
      id: uid(),
      name: a.name,
      level: a.type, 
      desc: a.desc,
      uses: 0,
      usesSpent: 0
    })),
    equipment: [],
    traits: drops,      
    notes: behavior,    
    backstory: backstory,
  };

  salvarListaCompletaNoStorage(novaFichaMonstro, silencioso);
  return novaFichaMonstro.id;
}

function renderizarVisualizacaoAcoes(){
  const container = document.getElementById('actionsPreview');
  if(!container) return;

  if(acoesTemporarias.length === 0){
    container.innerHTML = `<div style="text-align:center;color:var(--muted);font-style:italic;font-size:12px;padding:10px">Nenhuma habilidade criada ainda.</div>`;
    return;
  }

  const badgeMap = { trait: 'Passiva', action: 'Ação', reaction: 'Reação', legendary: 'Lendária' };

  container.innerHTML = acoesTemporarias.map((a, i) => `
    <div class="action-preview-item">
      <div>
        <strong>[${badgeMap[a.type]}] ${a.name}:</strong> 
        <span style="color:var(--muted)">${a.desc}</span>
      </div>
      <button type="button" class="btn xs link" onclick="removerAcaoTemp(${i})" style="color:var(--red2)"><i class="ti ti-trash"></i></button>
    </div>
  `).join('');
}

function salvarCriatura(silencioso = false){
  const nome = document.getElementById('mFormName').value.trim();
  if(!nome){
    toast("O campo Nome é obrigatório!");
    document.getElementById('mFormName').focus();
    return;
  }

  desativarAutoSalvamento();
  const idSalvo = comporESalvarObjetoMonstro(silencioso);
  mudouSemSalvar = false;
  
  if (!silencioso) {
    toast("Monstro atualizado!");
    visualizarMonstro(idSalvo);
  }
}

inicializar();