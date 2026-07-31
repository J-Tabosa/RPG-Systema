// ── THEME ─────────────────────────────────────────────────────────────────────
let dark = localStorage.getItem('rpg_theme') !== 'light';
function applyTheme(){ 
  document.body.classList.toggle('light', !dark); 
  const themeBtn = document.getElementById('themeBtn');
  if (themeBtn) themeBtn.textContent = dark ? '☀' : '🌙'; 
}
function toggleTheme(){ 
  dark = !dark; 
  localStorage.setItem('rpg_theme', dark ? 'dark' : 'light'); 
  applyTheme(); 
}
applyTheme();

// ── MOBILE MENU ───────────────────────────────────────────────────────────────
function toggleMobMenu(){ document.getElementById('mobNav').classList.toggle('open'); }
function closeMobMenu(){ document.getElementById('mobNav').classList.remove('open'); }

// ── KEYS & STORAGE SYSTEM ──────────────────────────────────────────────────────
const SK_CUSTOM = 'rpg_gerador_custom_v1';
const SK_PRESETS = 'rpg_conteudo_presets_v1';
const SK_ACTIVE_PRESET = 'rpg_active_preset_id_v1';

function loadCustom(){ 
  try {
    return JSON.parse(localStorage.getItem(SK_CUSTOM)) || {racas:[], classes:[], profissoes:[], personalidades:[], estilos:[]};
  } catch(e) {
    return {racas:[], classes:[], profissoes:[], personalidades:[], estilos:[]};
  } 
}
function saveCustom(obj){ localStorage.setItem(SK_CUSTOM, JSON.stringify(obj)); }

function loadPresets(){ 
  try {
    return JSON.parse(localStorage.getItem(SK_PRESETS)) || [];
  } catch(e) {
    return [];
  } 
}
function savePresets(arr){ localStorage.setItem(SK_PRESETS, JSON.stringify(arr)); }
function getActivePresetId(){ return localStorage.getItem(SK_ACTIVE_PRESET) || 'default'; }
function setActivePresetId(id){ localStorage.setItem(SK_ACTIVE_PRESET, id); }

function uid(){ return 'c_' + Date.now().toString(36) + Math.random().toString(36).slice(2); }

function toast(msg){ 
  const t = document.createElement('div'); 
  t.className = 'toast'; 
  t.textContent = msg; 
  document.body.appendChild(t); 
  setTimeout(() => t.remove(), 2400); 
}

function fecharM(id){ 
  const modal = document.getElementById(id);
  if (modal) modal.style.display = 'none'; 
}

// ── ESTADO GLOBAL ─────────────────────────────────────────────────────────────
let DB = null; // Banco Global Base (Oficiais + Customizados Globais)
let currentCategory = 'racas';
let activeSubcategory = ''; // Filtro selecionado por pílula
let presets = [];
let activePresetId = 'default';
let editingPresetId = null;
let editingItemId = null; // Guarda ID do item sendo editado no formulário lateral

// ── FORMULÁRIOS DINÂMICOS DE CONTEÚDO ──────────────────────────────────────────
const FORMS_CONFIG = {
  racas: [
    {key:'nome', label:'Nome da Raça', type:'text', req:true},
    {key:'desc', label:'Resumo / Descrição', type:'textarea', req:true},
    {key:'tracoRacial', label:'Habilidade / Traço Racial', type:'textarea', req:true},
    {key:'velocidade', label:'Velocidade (m)', type:'number', req:true, def:9},
    {key:'visaoNoturna', label:'Possui Visão Noturna?', type:'select', options:[{v:'false',l:'Não'},{v:'true',l:'Sim'}]},
    {key:'subcategoria', label:'Subcategoria / Tipo', type:'text', req:true, def:'geral'}
  ],
  classes: [
    {key:'nome', label:'Nome da Classe', type:'text', req:true},
    {key:'desc', label:'Descrição', type:'textarea', req:true},
    {key:'dadoVida', label:'Dado de Vida (Ex: 8 para d8)', type:'number', req:true, def:8},
    {key:'atribPrincipal', label:'Atributo Principal', type:'text', req:true, def:'FOR'},
    {key:'profArmadura', label:'Proficiência em Armadura', type:'text', req:true},
    {key:'salvaguardas', label:'Salvaguardas', type:'text', req:true},
    {key:'recurso', label:'Recurso Inicial da Classe', type:'textarea', req:true}
  ],
  profissoes: [
    {key:'nome', label:'Nome da Profissão/Antecedente', type:'text', req:true},
    {key:'desc', label:'Histórico / Descrição', type:'textarea', req:true},
    {key:'pericias', label:'Perícias Concedidas (sep. por vírgula)', type:'text', req:true},
    {key:'equipamento', label:'Equipamento de Partida', type:'textarea', req:true},
    {key:'contatos', label:'Contatos e Facções', type:'textarea', req:true}
  ],
  personalidades: [
    {key:'nome', label:'Nome do Arquétipo', type:'text', req:true},
    {key:'tracos', label:'Traços de Personalidade (use "|" para separar)', type:'textarea', req:true},
    {key:'ideais', label:'Ideais (use "|" para separar)', type:'textarea', req:true},
    {key:'vinculos', label:'Vínculos (use "|" para separar)', type:'textarea', req:true},
    {key:'defeitos', label:'Defeitos (use "|" para separar)', type:'textarea', req:true}
  ],
  estilos: [
    {key:'nome', label:'Nome do Estilo', type:'text', req:true},
    {key:'desc', label:'Foco / Descrição tática', type:'textarea', req:true},
    {key:'pontosForts', label:'Pontos Fortes (use "|" para separar)', type:'textarea', req:true},
    {key:'dicas', label:'Dica de interpretação para o jogador', type:'textarea', req:true}
  ]
};

// ── INICIALIZAÇÃO ─────────────────────────────────────────────────────────────
async function inicializar(){
  try {
    const res = await fetch('../data/personagens.json');
    DB = await res.json();
  } catch(e) {
    DB = { racas:[], classes:[], profissoes:[], personalidades:[], estilos:[] };
    console.warn('Banco de dados JSON indisponível. Rodando no modo Local.', e);
  }

  const custom = loadCustom();
  Object.keys(FORMS_CONFIG).forEach(cat => {
    if(!DB[cat]) DB[cat] = [];
    
    // Marcar itens nativos
    DB[cat] = DB[cat].map(item => ({...item, _src:'base'}));
    
    // Adicionar customizados injetando flag no banco global
    if(custom[cat]) {
      custom[cat].forEach(cItem => {
        const idx = DB[cat].findIndex(bItem => bItem.id === cItem.id);
        if(idx > -1) {
          DB[cat][idx] = {...cItem, _src:'custom'};
        } else {
          DB[cat].push({...cItem, _src:'custom'});
        }
      });
    }
  });

  presets = loadPresets();
  activePresetId = getActivePresetId();

  if(presets.length === 0){
    presets.push({
      id: 'default',
      nome: 'Padrão (Todo o Conteúdo)',
      blocked: { racas:[], classes:[], profissoes:[], personalidades:[], estilos:[] },
      overrides: {},
      customItems: {}
    });
    savePresets(presets);
  }

  // Garantir que as estruturas do preset existam
  presets.forEach(p => {
    if(!p.blocked) p.blocked = { racas:[], classes:[], profissoes:[], personalidades:[], estilos:[] };
    if(!p.overrides) p.overrides = {};
    if(!p.customItems) p.customItems = {};

    Object.keys(FORMS_CONFIG).forEach(c => { 
      if(!p.blocked[c]) p.blocked[c] = []; 
      if(!p.overrides[c]) p.overrides[c] = {};
      if(!p.customItems[c]) p.customItems[c] = [];
    });
  });

  if(!presets.find(p => p.id === activePresetId)) {
    activePresetId = presets[0].id;
    setActivePresetId(activePresetId);
  }

  alterarCamposForm('racas');
  renderizarPresets();
  renderizarSubcategoryNav();
  renderizarItens();
}

// ── BARRA DE SUB-ABAS DE FILTRAGEM DINÂMICA (PÍLULAS) ─────────────────────────
function renderizarSubcategoryNav(){
  const container = document.getElementById('subcatNav');
  const arr = obterItensComOverrides(currentCategory);
  
  // Extrai subcategorias únicas
  const subcategorias = [...new Set(arr.map(item => item.subcategoria).filter(Boolean))];
  
  if(subcategorias.length === 0) {
    container.style.display = 'none';
    activeSubcategory = '';
    return;
  }
  
  container.style.display = 'flex';
  
  let html = `<button class="sub-pill ${activeSubcategory === '' ? 'active' : ''}" onclick="setSubcategoryFilter('')">Todas</button>`;
  subcategorias.forEach(sub => {
    html += `<button class="sub-pill ${activeSubcategory === sub ? 'active' : ''}" onclick="setSubcategoryFilter('${sub}')">${sub}</button>`;
  });
  
  container.innerHTML = html;
}

function setSubcategoryFilter(sub){
  activeSubcategory = sub;
  renderizarSubcategoryNav();
  renderizarItens();
}

// ── RENDERIZAR PRESETS (PAINEL ESQUERDO) ──────────────────────────────────────
function renderizarPresets(){
  const container = document.getElementById('presetList');
  if (!container) return;
  
  container.innerHTML = presets.map(p => {
    const isActive = p.id === activePresetId;
    const isSystemDefault = p.id === 'default';
    
    let totalBloqueados = 0;
    Object.keys(p.blocked).forEach(c => totalBloqueados += p.blocked[c].length);

    return `
      <div class="preset-card ${isActive ? 'selected' : ''}" onclick="selecionarPreset('${p.id}')">
        <div class="preset-header">
          <span class="preset-name" title="${p.nome}">${p.nome}</span>
          ${isActive ? '<span class="preset-badge">Ativo</span>' : ''}
        </div>
        <div style="font-size:10px;color:var(--muted)">
          ${totalBloqueados === 0 ? 'Todo o conteúdo liberado' : `${totalBloqueados} item(ns) restrito(s)`}
        </div>
        <div class="preset-actions" onclick="event.stopPropagation()">
          <button class="preset-btn" onclick="duplicarPreset('${p.id}')" title="Duplicar Preset"><i class="ti ti-copy"></i> Duplicar</button>
          ${!isSystemDefault ? `
            <button class="preset-btn" onclick="abrirModalPreset('${p.id}')" title="Editar nome"><i class="ti ti-edit"></i> Nome</button>
            <button class="preset-btn del" onclick="deletarPreset('${p.id}')" title="Excluir permanentemente"><i class="ti ti-trash"></i> Excluir</button>
          ` : '<span style="font-size:9px;color:var(--border);font-style:italic">Fixo do Sistema</span>'}
        </div>
      </div>
    `;
  }).join('');
}

function selecionarPreset(id){
  activePresetId = id;
  setActivePresetId(id);
  cancelarEdicaoItem();
  renderizarPresets();
  renderizarSubcategoryNav();
  renderizarItens();
  toast('Preset de Campanha alterado!');
}

// ── OPERAÇÕES DE PRESETS ──────────────────────────────────────────────────────
function abrirModalPreset(id = null){
  editingPresetId = id;
  const input = document.getElementById('presetInputName');
  if(id) {
    document.getElementById('modalPresetTitle').innerHTML = '<i class="ti ti-edit"></i> Renomear Configuração';
    input.value = presets.find(p => p.id === id).nome;
  } else {
    document.getElementById('modalPresetTitle').innerHTML = '<i class="ti ti-plus"></i> Nova Configuração';
    input.value = '';
  }
  document.getElementById('mPreset').style.display = 'flex';
  input.focus();
}

function salvarPreset(){
  const nome = document.getElementById('presetInputName').value.trim();
  if(!nome) { toast('Diga um nome válido!'); return; }

  if(editingPresetId) {
    const p = presets.find(x => x.id === editingPresetId);
    if(p) p.nome = nome;
  } else {
    const newPreset = {
      id: uid(),
      nome: nome,
      blocked: { racas:[], classes:[], profissoes:[], personalidades:[], estilos:[] },
      overrides: {},
      customItems: {}
    };
    presets.push(newPreset);
    activePresetId = newPreset.id;
    setActivePresetId(activePresetId);
  }
  savePresets(presets);
  fecharM('mPreset');
  renderizarPresets();
  renderizarSubcategoryNav();
  renderizarItens();
  toast('Configuração salva com sucesso!');
}

function duplicarPreset(id){
  const original = presets.find(p => p.id === id);
  if(!original) return;

  const cópia = {
    id: uid(),
    nome: `${original.nome} (Cópia)`,
    blocked: JSON.parse(JSON.stringify(original.blocked)),
    overrides: JSON.parse(JSON.stringify(original.overrides || {})),
    customItems: JSON.parse(JSON.stringify(original.customItems || {}))
  };
  
  presets.push(cópia);
  savePresets(presets);
  renderizarPresets();
  toast('Preset duplicado!');
}

function deletarPreset(id){
  if(id === 'default') return;
  if(!confirm('Tem certeza que deseja excluir esta configuração?')) return;

  presets = presets.filter(p => p.id !== id);
  if(activePresetId === id) {
    activePresetId = 'default';
    setActivePresetId('default');
  }
  savePresets(presets);
  renderizarPresets();
  renderizarSubcategoryNav();
  renderizarItens();
  toast('Preset removido.');
}

// ── RESOLUÇÃO DE ITENS POR PRESET (ISOLAMENTO) ────────────────────────────────
function obterItensComOverrides(cat){
  const currentPreset = presets.find(p => p.id === activePresetId) || presets[0];
  const isDefault = currentPreset.id === 'default';

  // 1. Mapeia os itens base do personagens.json aplicando os overrides do preset
  let listaResolvida = (DB[cat] || []).map(itemBase => {
    if (!isDefault && currentPreset.overrides?.[cat]?.[itemBase.id]) {
      return { ...itemBase, ...currentPreset.overrides[cat][itemBase.id], _src: 'preset_edited' };
    }
    return itemBase;
  });

  // 2. Adiciona os itens novos criados EXCLUSIVAMENTE neste preset
  if (!isDefault && currentPreset.customItems?.[cat]) {
    const criadosNoPreset = currentPreset.customItems[cat].map(i => ({ ...i, _src: 'preset_custom' }));
    listaResolvida = listaResolvida.concat(criadosNoPreset);
  }

  return listaResolvida;
}

// ── RENDERIZAR ITENS & TOGGLES (PAINEL DIREITO) ───────────────────────────────
function switchMainTab(cat){
  currentCategory = cat;
  activeSubcategory = ''; // Zera sub-aba ao mudar aba pai
  document.querySelectorAll('.category-tabs .btn').forEach(b => b.classList.remove('active'));
  document.getElementById('tab_' + cat).classList.add('active');
  document.getElementById('contentSearch').value = '';
  
  // Sincroniza formulário da sidebar esquerda para bater com a categoria ativa
  if(!editingItemId) {
    document.getElementById('addCat').value = cat;
    alterarCamposForm(cat);
  }
  
  renderizarSubcategoryNav();
  renderizarItens();
}

function obterItensVisiveis(){
  const arr = obterItensComOverrides(currentCategory);
  const query = document.getElementById('contentSearch').value.toLowerCase().trim();
  
  return arr.filter(item => {
    const matchBusca = item.nome.toLowerCase().includes(query) || (item.desc && item.desc.toLowerCase().includes(query));
    const matchSubcat = activeSubcategory === '' || item.subcategoria === activeSubcategory;
    return matchBusca && matchSubcat;
  });
}

function renderizarItens(){
  const grid = document.getElementById('itemsGrid');
  if (!grid) return;
  
  const filtrados = obterItensVisiveis();
  const currentPreset = presets.find(p => p.id === activePresetId) || presets[0];

  if(filtrados.length === 0){
    grid.innerHTML = '<div style="text-align:center;color:var(--muted);font-style:italic;padding:32px 0">Nenhum item localizado nesta categoria.</div>';
    return;
  }

  grid.innerHTML = filtrados.map(item => {
    const isBlocked = currentPreset.blocked[currentCategory].includes(item.id);
    
    // Configura os Badges visuais de origem do item
    let badgeLabel = 'Oficial';
    let badgeClass = 'base';
    
    if (item._src === 'custom') {
      badgeLabel = 'Custom Global';
      badgeClass = 'custom';
    } else if (item._src === 'preset_edited') {
      badgeLabel = 'Editado neste Preset';
      badgeClass = 'custom';
    } else if (item._src === 'preset_custom') {
      badgeLabel = 'Novo neste Preset';
      badgeClass = 'custom';
    }

    return `
      <div class="item-row ${isBlocked ? 'disabled' : ''}" id="row_${item.id}" onclick="toggleAtivacaoItem('${currentCategory}', '${item.id}')">
        <div class="item-info">
          <div class="item-toggle-wrapper" title="Clique para Alternar Ativação">
            <i class="ti ${isBlocked ? 'ti-square' : 'ti-square-check'}" style="font-size:20px"></i>
          </div>
          <div class="item-meta">
            <div class="item-title-line">
              <span class="item-title">${item.nome}</span>
              <span class="src-badge ${badgeClass}">${badgeLabel}</span>
              ${item.subcategoria ? `<span class="src-badge subcat">${item.subcategoria}</span>` : ''}
            </div>
            <div class="item-summary" title="${item.desc || ''}">${item.desc || 'Sem descrição cadastrada.'}</div>
          </div>
        </div>
        <div class="item-right-actions" onclick="event.stopPropagation()">
          <button class="btn xs link" onclick="carregarItemParaEdicao('${currentCategory}', '${item.id}')" style="color:var(--gold);padding:4px" title="Editar informações deste item">
            <i class="ti ti-edit"></i>
          </button>
          <button class="btn xs link" onclick="deletarItemGeral('${currentCategory}', '${item.id}')" style="color:var(--red2);padding:4px" title="Excluir item permanentemente">
            <i class="ti ti-trash"></i>
          </button>
        </div>
      </div>
    `;
  }).join('');
}

function filtrarItens(){
  renderizarItens();
}

// ── ATIVAR / DESATIVAR ITEM INDIVIDUAL NO PRESET ──────────────────────────────
function toggleAtivacaoItem(cat, id){
  const currentPreset = presets.find(p => p.id === activePresetId);
  if(!currentPreset) return;

  const index = currentPreset.blocked[cat].indexOf(id);
  if(index > -1) {
    currentPreset.blocked[cat].splice(index, 1);
  } else {
    currentPreset.blocked[cat].push(id);
  }

  savePresets(presets);
  renderizarPresets();
  renderizarItens();
}

function toggleTodosVisiveis(){
  const currentPreset = presets.find(p => p.id === activePresetId);
  if(!currentPreset) return;

  const visiveis = obterItensVisiveis();
  if(visiveis.length === 0) return;

  const temDesmarcados = visiveis.some(item => currentPreset.blocked[currentCategory].includes(item.id));

  visiveis.forEach(item => {
    const idx = currentPreset.blocked[currentCategory].indexOf(item.id);
    if(temDesmarcados) {
      if(idx > -1) currentPreset.blocked[currentCategory].splice(idx, 1);
    } else {
      if(idx === -1) currentPreset.blocked[currentCategory].push(item.id);
    }
  });

  savePresets(presets);
  renderizarPresets();
  renderizarItens();
  toast(temDesmarcados ? 'Todos os itens visíveis foram ativados!' : 'Todos os itens visíveis foram desativados!');
}

// ── FORMULÁRIOS DINÂMICOS DE ADIÇÃO / EDIÇÃO ──────────────────────────────────
function alterarCamposForm(cat){
  const container = document.getElementById('dynamicFormFields');
  if (!container) return;
  const fields = FORMS_CONFIG[cat];

  container.innerHTML = fields.map(f => {
    if(f.type === 'textarea') {
      return `<div class="mini-field" style="margin-top:5px"><label>${f.label}</label><textarea id="fld_${f.key}" placeholder="Digite o conteúdo..."></textarea></div>`;
    }
    if(f.type === 'select') {
      return `
        <div class="mini-field" style="margin-top:5px">
          <label>${f.label}</label>
          <select id="fld_${f.key}">
            ${f.options.map(o => `<option value="${o.v}">${o.l}</option>`).join('')}
          </select>
        </div>`;
    }
    return `<div class="mini-field" style="margin-top:5px"><label>${f.label}</label><input type="${f.type}" id="fld_${f.key}" value="${f.def !== undefined ? f.def : ''}"></div>`;
  }).join('');
}

// Coloca as informações de um item existente para edição no card lateral
function carregarItemParaEdicao(cat, id){
  const arr = obterItensComOverrides(cat);
  const item = arr.find(i => i.id === id);
  if(!item) return;

  editingItemId = id;
  
  // Força select da sidebar a mostrar a categoria do item
  document.getElementById('addCat').value = cat;
  document.getElementById('addCat').disabled = true;
  alterarCamposForm(cat);

  document.getElementById('formTitle').textContent = "Editar Item";
  document.getElementById('btnSalvarItem').innerHTML = '<i class="ti ti-check"></i> Salvar Alterações';
  document.getElementById('btnCancelarEdicao').style.display = 'block';

  // Popula os campos do formulário lateral
  const config = FORMS_CONFIG[cat];
  config.forEach(f => {
    const el = document.getElementById('fld_' + f.key);
    if(!el) return;

    let val = item[f.key];
    if(Array.isArray(val)) {
      if(['tracos','ideais','vinculos','defeitos','pontosForts'].includes(f.key)){
        val = val.join(' | ');
      } else if(f.key === 'pericias') {
        val = val.join(', ');
      }
    }
    
    if(f.type === 'select') {
      el.value = String(val);
    } else {
      el.value = (val !== undefined) ? val : '';
    }
  });

  const formElement = document.getElementById('formAddConteudo');
  if (formElement) formElement.scrollIntoView({ behavior: 'smooth' });
}

function cancelarEdicaoItem(){
  editingItemId = null;
  document.getElementById('addCat').disabled = false;
  document.getElementById('formTitle').textContent = "Novo Conteúdo";
  document.getElementById('btnSalvarItem').innerHTML = '<i class="ti ti-check"></i> Adicionar Item';
  document.getElementById('btnCancelarEdicao').style.display = 'none';
  
  const cat = document.getElementById('addCat').value;
  alterarCamposForm(cat);
}

function salvarNovoConteudo(){
  const cat = document.getElementById('addCat').value;
  const config = FORMS_CONFIG[cat];
  const currentPreset = presets.find(p => p.id === activePresetId) || presets[0];
  const isDefault = currentPreset.id === 'default';
  
  // Se está editando mantém ID original, se não, gera novo UID
  const item = { id: editingItemId ? editingItemId : uid() };

  for(const f of config){
    const el = document.getElementById('fld_' + f.key);
    if(!el) continue;
    let val = el.value.trim();

    if(f.req && !val) {
      toast(`O campo "${f.label}" é obrigatório.`);
      el.focus();
      return;
    }

    if(['tracos','ideais','vinculos','defeitos','pontosForts'].includes(f.key)){
      val = val ? val.split('|').map(s=>s.trim()).filter(Boolean) : [];
    }
    if(f.key === 'pericias') {
      val = val ? val.split(',').map(s=>s.trim()).filter(Boolean) : [];
    }
    if(f.key === 'visaoNoturna') val = (val === 'true');
    if(f.type === 'number') val = parseInt(val) || 0;

    item[f.key] = val;
  }

  if (isDefault) {
    // -------------------------------------------------------------
    // SALVA NO BANCO GLOBAL (Preset Padrão)
    // -------------------------------------------------------------
    const custom = loadCustom();
    if(editingItemId) {
      const idx = custom[cat].findIndex(i => i.id === editingItemId);
      if(idx > -1) custom[cat][idx] = item;
      else custom[cat].push(item);
    } else {
      custom[cat].push(item);
    }
    saveCustom(custom);

    item._src = 'custom';
    const dbIdx = DB[cat].findIndex(i => i.id === item.id);
    if(dbIdx > -1) {
      DB[cat][dbIdx] = item;
    } else {
      DB[cat].push(item);
    }
    toast(editingItemId ? 'Item global atualizado!' : 'Item customizado global adicionado!');

  } else {
    // -------------------------------------------------------------
    // SALVA APENAS NO PRESET ATIVO (Não afeta o Padrão nem os outros)
    // -------------------------------------------------------------
    if (!currentPreset.overrides) currentPreset.overrides = {};
    if (!currentPreset.overrides[cat]) currentPreset.overrides[cat] = {};
    if (!currentPreset.customItems) currentPreset.customItems = {};
    if (!currentPreset.customItems[cat]) currentPreset.customItems[cat] = [];

    if (editingItemId) {
      const existeNoGlobal = DB[cat].some(i => i.id === editingItemId);
      if (existeNoGlobal) {
        // Se é um item do JSON base, guarda a alteração como Override
        currentPreset.overrides[cat][editingItemId] = item;
      } else {
        // Se é um item exclusivo deste preset, atualiza a lista
        const customIdx = currentPreset.customItems[cat].findIndex(i => i.id === editingItemId);
        if (customIdx > -1) {
          currentPreset.customItems[cat][customIdx] = item;
        }
      }
    } else {
      // Item totalmente novo exclusivo do preset
      currentPreset.customItems[cat].push(item);
    }

    savePresets(presets);
    toast(`Alteração salva exclusivamente no preset "${currentPreset.nome}"!`);
  }

  cancelarEdicaoItem();
  renderizarSubcategoryNav();
  renderizarItens();
  renderizarPresets();
}

// Exclusão flexível: remove do Preset ativo ou remove Globalmente caso esteja no Preset Padrão
function deletarItemGeral(cat, id){
  const currentPreset = presets.find(p => p.id === activePresetId) || presets[0];
  const isDefault = currentPreset.id === 'default';

  if (!isDefault) {
    if(!confirm('Deseja remover esta customização do preset ativo?')) return;

    // Remove overrides ou itens exclusivos do preset
    if (currentPreset.overrides?.[cat]?.[id]) {
      delete currentPreset.overrides[cat][id];
    }
    if (currentPreset.customItems?.[cat]) {
      currentPreset.customItems[cat] = currentPreset.customItems[cat].filter(i => i.id !== id);
    }

    savePresets(presets);
    toast('Customização do preset removida (restaurado para o padrão).');

  } else {
    if(!confirm('Deseja deletar permanentemente este item do sistema global?')) return;

    // 1. Apagar do storage local
    const custom = loadCustom();
    custom[cat] = custom[cat].filter(i => i.id !== id);
    saveCustom(custom);

    // 2. Apagar da memória ativa
    DB[cat] = DB[cat].filter(i => i.id !== id);

    // 3. Limpar de travas ou bloqueios salvos em presets
    presets.forEach(p => {
      if(p.blocked && p.blocked[cat]) {
        p.blocked[cat] = p.blocked[cat].filter(bid => bid !== id);
      }
    });
    savePresets(presets);
    toast('Item removido com sucesso do banco global.');
  }

  if(editingItemId === id) cancelarEdicaoItem();

  renderizarSubcategoryNav();
  renderizarItens();
  renderizarPresets();
}

// ── FECHAR MODAL NO OVERLAY E TECLAS DE ATALHO ───────────────────────────────
const presetModal = document.getElementById('mPreset');
if (presetModal) {
  presetModal.addEventListener('click', function(e){ 
    if(e.target === this) fecharM('mPreset'); 
  });
}

document.addEventListener('keydown', e => { 
  if(e.key === 'Escape') fecharM('mPreset'); 
});

// Inicialização automática ao carregar o ficheiro
inicializar();