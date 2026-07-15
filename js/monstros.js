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

// Inicializa pastas e monstros do Local Storage
async function inicializar(){
  carregarPastas();
  await carregarMonstros();
  renderizarPastas();
  renderizarListaMonstros();
  configurarFechamentoPopup();

  // Listener para criar pasta ao pressionar Enter dentro do input do modal
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
  // Garante que a pasta ativa existe, senão reseta para a primeira disponível
  if(!pastas.some(p => p.id === pastaAtiva)) {
    pastaAtiva = pastas[0].id;
  }
}

// ── MODAL DE PASTAS ESTILIZADO ────────────────────────────────────────────────
function criarNovaPasta(){
  const input = document.getElementById('newFolderName');
  if (input) input.value = ''; // Limpa entrada de rascunhos anteriores
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
    // Garante compatibilidade de tipo e pasta em todos os monstros
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
    if (!silencioso) toast("Monstro salvo no Local Storage!");
  } catch(e) {
    toast("Erro ao salvar monstro.");
  }
}

function excluirMonstro(id){
  if(!confirm("Tem certeza que deseja apagar este monstro do bestiário?")) return;
  try {
    let todasFichas = JSON.parse(localStorage.getItem(SK_FICHAS)) || [];
    todasFichas = todasFichas.filter(f => f.id !== id);
    localStorage.setItem(SK_FICHAS, JSON.stringify(todasFichas));
    
    toast("Monstro removido.");
    monsterSelecionadoId = null;
    inicializar();
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

// Auxiliar para converter nível de desafio em valor numérico para ordenação
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
function renderizarListaMonstros(filtrados = monstros){
  const container = document.getElementById('monsterList');
  if(!container) return;

  // Filtra monstros para pertencerem à pasta ativa
  let monstrosParaExibir = filtrados.filter(m => (m.folder || 'base') === pastaAtiva);
  document.getElementById('countMonstros').textContent = monstrosParaExibir.length;

  if(monstrosParaExibir.length === 0){
    container.innerHTML = `<div style="text-align:center;color:var(--muted);font-style:italic;padding:15px;font-size:13px">Nenhuma criatura nesta pasta.</div>`;
    return;
  }

  // Realiza a ordenação
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

  container.innerHTML = monstrosParaExibir.map(m => {
    const nd = m.level ? `ND ${m.level}` : 'ND -';
    const activeClass = m.id === monsterSelecionadoId ? 'active' : '';
    return `
      <div class="monster-card-item ${activeClass}" onclick="visualizarMonstro('${m.id}')">
        <div class="m-item-info">
          <span class="m-item-name">${m.name}</span>
          <span class="m-item-meta">${m.race || 'Monstro'} · ${nd}</span>
        </div>
        <div class="m-item-actions" onclick="event.stopPropagation()">
          <button class="btn xs link" onclick="editarMonstro('${m.id}')" style="color:var(--gold)"><i class="ti ti-edit"></i></button>
          <button class="btn xs link" onclick="excluirMonstro('${m.id}')" style="color:var(--red2)"><i class="ti ti-trash"></i></button>
        </div>
      </div>
    `;
  }).join('');
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

// ── LEITOR DE FICHA (VISUALIZADOR) ────────────────────────────────────────────
function visualizarMonstro(id){
  desativarAutoSalvamento();
  monsterSelecionadoId = id;
  renderizarListaMonstros();
  const m = monstros.find(x => x.id === id);
  if(!m) return;

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

      <h2 class="dnd-red-title">${m.name}</h2>
      <div class="dnd-meta-line">${m.tamanho || 'Médio'} · ${m.race || 'Monstro'} · ${m.alignment || 'Neutro'} — ND ${m.level}</div>
      
      <hr class="dnd-divider">
      
      <div class="dnd-stat-block">
        <div><strong>Classe de Armadura (CA):</strong> ${ca}</div>
        <div><strong>Pontos de Vida (HP):</strong> ${hp}</div>
        <div><strong>Velocidade:</strong> ${vel}</div>
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
  `;
}

// ── IMPORTAR E EXPORTAR MONSTRO ──────────────────────────────────────────────
function exportarFichaJSON(id){
  const m = monstros.find(x => x.id === id);
  if(!m) return;
  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(m, null, 2));
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
  reader.onload = function(e) {
    try {
      const dados = JSON.parse(e.target.result);
      
      if (dados && dados.monstros && Array.isArray(dados.monstros)) {
        let importadosContador = 0;
        const todasFichas = JSON.parse(localStorage.getItem(SK_FICHAS)) || [];
        
        dados.monstros.forEach(m => {
          const novoMonstro = {
            ...m,
            id: m.id || uid(),
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
        });

        localStorage.setItem(SK_FICHAS, JSON.stringify(todasFichas));
        
        carregarMonstros().then(() => {
          renderizarPastas();
          renderizarListaMonstros();
        });

        toast(`${importadosContador} monstros importados na pasta ativa!`);
      } 
      else if (dados && typeof dados === 'object') {
        dados.id = dados.id || uid();
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
let editandoMonstroId = null;

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

function mostrarFormulario(mon = null){
  const container = document.getElementById('bestiaryMain');
  const getCombatVal = (lbl, def) => mon ? (mon.combat.find(c => c.label === lbl || c.id === lbl)?.val || def) : def;

  container.innerHTML = `
    <form class="monster-creator-form" id="creatorForm" onsubmit="event.preventDefault();">
      <div style="display: flex; justify-content: space-between; align-items: center;">
        <h2 class="section-title" style="font-size:18px;margin-bottom:20px">
          <i class="ti ti-edit"></i> ${mon ? 'Editar Ameaça' : 'Criar Nova Ameaça'}
        </h2>
        <span id="saveBadge" style="font-size: 11px; color: var(--gold); font-style: italic; font-weight: bold;">Rascunho pronto</span>
      </div>

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
          <input type="text" id="mFormRace" value="${mon ? mon.race : 'Monstro'}" placeholder="Ex: Morto-vivo, Construto...">
        </div>
        <div class="form-field">
          <label>Alinhamento / Tendência</label>
          <input type="text" id="mFormAlignment" value="${mon ? mon.alignment : 'Neutro'}" placeholder="Ex: Caótico e Mau">
        </div>
      </div>

      <div class="form-grid-3">
        <div class="form-field">
          <label>Nível de Desafio (ND)</label>
          <input type="text" id="mFormND" value="${mon ? mon.level : '1'}" placeholder="1/4, 5, 20...">
        </div>
        <div class="form-field">
          <label>Classe de Armadura (CA)</label>
          <input type="number" id="mFormCA" value="${getCombatVal('ca', 10)}">
        </div>
        <div class="form-field">
          <label>Pontos de Vida (HP)</label>
          <input type="number" id="mFormHP" value="${getCombatVal('hpmax', 15)}">
        </div>
      </div>

      <div class="form-grid-3">
        <div class="form-field">
          <label>Deslocamento (Velocidade)</label>
          <input type="text" id="mFormVel" value="${getCombatVal('vel', '9m')}" placeholder="Ex: 9m, voo 18m">
        </div>
      </div>

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

// Funções para adicionar, remover e atualizar atributos dinâmicos
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