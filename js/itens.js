let ITENS = [];
let CATEGORIAS = [];
let itemEditandoId = null;
let modoMestre = localStorage.getItem('rpg_items_master_mode') === 'true';
let dark = localStorage.getItem('rpg_theme') !== 'light';

const CATEGORY_LABELS = {
  arma: 'Arma', armadura: 'Armadura', equipamento: 'Equipamento',
  utilizavel: 'Utilizável', magico: 'Item mágico'
};

const CATEGORY_ICONS = {
  arma: 'ti-sword', armadura: 'ti-shield', equipamento: 'ti-tool',
  utilizavel: 'ti-flask', magico: 'ti-wand'
};

const RARITY_LABELS = {
  comum: 'Comum', incomum: 'Incomum', raro: 'Raro',
  'muito-raro': 'Muito raro', lendario: 'Lendário', artefato: 'Artefato'
};

const RARITY_COLORS = {
  comum: '#a9a29a', incomum: '#55a56f', raro: '#5f8ed8',
  'muito-raro': '#a979db', lendario: '#d68b3f', artefato: '#d65b57'
};

function applyTheme() {
  document.body.classList.toggle('light', !dark);
  const btn = document.getElementById('themeBtn');
  if (btn) btn.textContent = dark ? '☀' : '🌙';
}
function toggleTheme() {
  dark = !dark;
  localStorage.setItem('rpg_theme', dark ? 'dark' : 'light');
  applyTheme();
}
function toggleMobMenu() { document.getElementById('mobNav')?.classList.toggle('open'); }
function closeMobMenu() { document.getElementById('mobNav')?.classList.remove('open'); }

document.addEventListener('click', event => {
  const nav = document.getElementById('mobNav');
  if (nav?.classList.contains('open') && !nav.contains(event.target) && !event.target.closest('.mob-menu-btn')) closeMobMenu();
});

function normalizarTexto(valor = '') {
  return String(valor).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
}
function escaparHTML(valor = '') {
  return String(valor).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#039;');
}
function prettyKey(key = '') {
  return key.replace(/([A-Z])/g, ' $1').replaceAll('-', ' ').replace(/^./, c => c.toUpperCase());
}
function valorLegivel(value) {
  if (value === null || value === undefined || value === '') return '—';
  if (typeof value === 'boolean') return value ? 'Sim' : 'Não';
  if (Array.isArray(value)) return value.join(', ');
  return String(value);
}
function corItem(item) {
  if (item.raridade && RARITY_COLORS[item.raridade]) return RARITY_COLORS[item.raridade];
  const category = { arma: '#cf7a58', armadura: '#6f8fb3', equipamento: '#b6a16d', utilizavel: '#63a78f', magico: '#9d76cf' };
  return category[item.categoria] || 'var(--gold)';
}

function resumoMecanica(item) {
  const m = item.mecanica || {};
  if (item.categoria === 'arma') return [m.dano && `${m.dano} ${m.tipoDano || ''}`.trim(), m.alcance].filter(Boolean).join(' · ');
  if (item.categoria === 'armadura') {
    const dex = m.bonusDestreza ? (m.limiteDestreza == null ? ' + DES' : ` + DES (máx. ${m.limiteDestreza})`) : '';
    return m.caBase ? `CA ${m.caBase}${dex}` : '';
  }
  if (item.categoria === 'utilizavel') return [m.usos != null && `${m.usos} uso(s)`, m.dano && `${m.dano} ${m.tipoDano || ''}`.trim(), m.duracao].filter(Boolean).join(' · ');
  if (item.categoria === 'magico') return [item.raridade && RARITY_LABELS[item.raridade], item.sintonizacao ? 'Requer sintonização' : 'Sem sintonização'].filter(Boolean).join(' · ');
  return m.capacidade || m.efeito || '';
}

function alternarModoMestre(ativo) {
  modoMestre = Boolean(ativo);
  localStorage.setItem('rpg_items_master_mode', String(modoMestre));
  document.body.classList.toggle('master-mode', modoMestre);
  const modal = document.getElementById('itemModal');
  if (modal?.dataset.itemId && modal.style.display !== 'none') abrirDetalhes(modal.dataset.itemId, true);
}

async function carregarItens() {
  try {
    const [itens, categorias] = await Promise.all([
      RPGCatalogo.getItens(),
      RPGCatalogo.getItemCategories()
    ]);
    ITENS = itens;
    CATEGORIAS = categorias;
    preencherCategorias();
    preencherFontes();
    atualizarEstatisticas();
    filtrarItens();
  } catch (error) {
    console.error(error);
    document.getElementById('itemsGrid').innerHTML = `<div class="catalog-error">Não foi possível carregar o catálogo de itens.</div>`;
  }
}

function atualizarEstatisticas() {
  document.getElementById('statTotal').textContent = ITENS.length;
  document.getElementById('statCategorias').textContent = new Set(ITENS.map(i => i.categoria)).size;
  document.getElementById('statCustom').textContent = ITENS.filter(i => i.custom).length;
}

function selecionarCategoria(categoria) {
  document.getElementById('categoryFilter').value = categoria;
  filtrarItens();
}
function preencherCategorias() {
  const extras = [...new Set(ITENS.map(i => i.categoria).filter(Boolean))]
    .filter(id => !CATEGORIAS.some(c => c.id === id))
    .map(id => ({ id, label: CATEGORY_LABELS[id] || id, plural: CATEGORY_LABELS[id] || id, icon: CATEGORY_ICONS[id] || 'ti-box' }));
  const todas = [...CATEGORIAS, ...extras];

  todas.forEach(cat => {
    CATEGORY_LABELS[cat.id] = cat.label || cat.id;
    CATEGORY_ICONS[cat.id] = cat.icon || 'ti-box';
  });

  const filter = document.getElementById('categoryFilter');
  if (filter) {
    const atual = filter.value || 'todos';
    filter.innerHTML = '<option value="todos">Todas</option>' + todas.map(cat =>
      `<option value="${escaparHTML(cat.id)}">${escaparHTML(cat.plural || cat.label || cat.id)}</option>`
    ).join('');
    if ([...filter.options].some(o => o.value === atual)) filter.value = atual;
  }

  const editor = document.getElementById('edCategoria');
  if (editor) {
    const atual = editor.value;
    editor.innerHTML = todas.map(cat =>
      `<option value="${escaparHTML(cat.id)}">${escaparHTML(cat.label || cat.id)}</option>`
    ).join('');
    if ([...editor.options].some(o => o.value === atual)) editor.value = atual;
  }

  const strip = document.querySelector('.catalog-category-strip');
  if (strip) {
    strip.innerHTML = '<button onclick="selecionarCategoria(\'todos\')"><i class="ti ti-layout-grid"></i> Todos</button>' +
      todas.map(cat => `<button onclick="selecionarCategoria('${escaparHTML(cat.id)}')"><i class="ti ${escaparHTML(cat.icon || 'ti-box')}"></i> ${escaparHTML(cat.plural || cat.label || cat.id)}</button>`).join('');
  }
}


function preencherFontes() {
  const select = document.getElementById('sourceFilter');
  if (!select) return;
  const atual = select.value || 'todos';
  const fontes = [...new Set(ITENS.map(item => item.origem).filter(Boolean))]
    .sort((a, b) => a.localeCompare(b, 'pt-BR'));
  select.innerHTML = '<option value="todos">Todas</option>' + fontes.map(fonte =>
    `<option value="${escaparHTML(fonte)}">${escaparHTML(fonte)}</option>`
  ).join('');
  if ([...select.options].some(option => option.value === atual)) select.value = atual;
}


function filtrarItens() {
  const busca = normalizarTexto(document.getElementById('itemSearch')?.value || '');
  const categoria = document.getElementById('categoryFilter')?.value || 'todos';
  const raridade = document.getElementById('rarityFilter')?.value || 'todos';
  const fonte = document.getElementById('sourceFilter')?.value || 'todos';

  const filtrados = ITENS.filter(item => {
    const texto = normalizarTexto([
      item.nome, item.categoria, item.subcategoria, item.origem, item.descricao,
      ...(item.tags || []), JSON.stringify(item.mecanica || {})
    ].join(' '));
    const okBusca = !busca || texto.includes(busca);
    const okCat = categoria === 'todos' || item.categoria === categoria;
    const itemRarity = item.raridade || 'sem-raridade';
    const okRare = raridade === 'todos' || itemRarity === raridade;
    const okFonte = fonte === 'todos' || item.origem === fonte;
    return okBusca && okCat && okRare && okFonte;
  });

  renderizarItens(filtrados);
  document.getElementById('resultCount').textContent = filtrados.length;
  const filtros = [];
  if (busca) filtros.push(`busca: “${busca}”`);
  if (categoria !== 'todos') filtros.push(CATEGORY_LABELS[categoria]);
  if (raridade !== 'todos') filtros.push(raridade === 'sem-raridade' ? 'sem raridade' : RARITY_LABELS[raridade]);
  if (fonte !== 'todos') filtros.push(fonte);
  document.getElementById('activeFilterText').textContent = filtros.length ? filtros.join(' · ') : 'Exibindo todo o acervo';
}

function limparFiltros() {
  document.getElementById('itemSearch').value = '';
  document.getElementById('categoryFilter').value = 'todos';
  document.getElementById('rarityFilter').value = 'todos';
  const sourceFilter = document.getElementById('sourceFilter');
  if (sourceFilter) sourceFilter.value = 'todos';
  filtrarItens();
}

function renderizarItens(lista) {
  const grid = document.getElementById('itemsGrid');
  const empty = document.getElementById('itemsEmpty');
  if (!lista.length) {
    grid.innerHTML = '';
    empty.style.display = '';
    return;
  }
  empty.style.display = 'none';
  grid.innerHTML = lista.map(item => {
    const cor = corItem(item);
    const tags = (item.tags || []).slice(0, 4).map(tag => `<span class="item-tag">${escaparHTML(tag)}</span>`).join('');
    const rare = item.raridade ? `<span class="rarity-chip rarity-${escaparHTML(item.raridade)}">${escaparHTML(RARITY_LABELS[item.raridade] || item.raridade)}</span>` : '';
    const source = item.custom ? '<span class="catalog-origin custom">Personalizado</span>' : '<span class="catalog-origin">Base</span>';
    return `
      <article class="magic-item-card" style="--rarity-color:${cor}" onclick="abrirDetalhes('${escaparHTML(item.id)}')" tabindex="0" role="button" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();abrirDetalhes('${escaparHTML(item.id)}')}">
        <div class="item-card-head">
          <div class="item-icon-wrap"><i class="ti ${CATEGORY_ICONS[item.categoria] || 'ti-box'}"></i></div>
          <div class="item-card-title">
            <h3>${escaparHTML(item.nome)}</h3>
            <p>${escaparHTML(CATEGORY_LABELS[item.categoria] || item.categoria)} · ${escaparHTML(item.subcategoria || 'Sem subcategoria')}</p>
          </div>
          ${rare}
        </div>
        <div class="item-card-body">
          <p class="item-summary">${escaparHTML(item.descricao || 'Sem descrição.')}</p>
          ${resumoMecanica(item) ? `<div class="catalog-mechanic-line"><i class="ti ti-dice"></i>${escaparHTML(resumoMecanica(item))}</div>` : ''}
          <div class="item-tags">${tags}</div>
          <div class="item-card-footer">
            <span>${source}</span>
            <span class="item-card-link">Ver registro <i class="ti ti-arrow-right"></i></span>
          </div>
        </div>
        ${item.mestre ? `<div class="master-preview"><strong><i class="ti ti-eye"></i> Nota do Mestre</strong>${escaparHTML(item.mestre.aviso || 'Há informações ocultas neste registro.')}</div>` : ''}
      </article>`;
  }).join('');
}

function renderMecanica(mecanica = {}) {
  const entries = Object.entries(mecanica).filter(([, value]) => value !== '' && value !== null && value !== undefined && !(Array.isArray(value) && !value.length));
  if (!entries.length) return '<p>Nenhuma regra mecânica adicional registrada.</p>';
  return `<div class="catalog-kv-grid">${entries.map(([key, value]) => `<div><span>${escaparHTML(prettyKey(key))}</span><strong>${escaparHTML(valorLegivel(value))}</strong></div>`).join('')}</div>`;
}

function abrirDetalhes(id, manterScroll = false) {
  const item = ITENS.find(registro => registro.id === id);
  if (!item) return;
  const modal = document.getElementById('itemModal');
  const content = document.getElementById('itemModalContent');
  const cor = corItem(item);
  const tags = (item.tags || []).map(tag => `<span class="item-tag">${escaparHTML(tag)}</span>`).join('');
  const rare = item.raridade ? `<span class="rarity-chip rarity-${escaparHTML(item.raridade)}">${escaparHTML(RARITY_LABELS[item.raridade] || item.raridade)}</span>` : '';

  content.innerHTML = `
    <div class="item-detail-hero" style="--rarity-color:${cor}">
      <div class="item-detail-icon"><i class="ti ${CATEGORY_ICONS[item.categoria] || 'ti-box'}"></i></div>
      <div class="item-detail-heading">
        <h2 id="modalItemName">${escaparHTML(item.nome)}</h2>
        <div class="item-detail-subtitle">${escaparHTML(CATEGORY_LABELS[item.categoria] || item.categoria)} · ${escaparHTML(item.subcategoria || 'Sem subcategoria')}</div>
        <div class="item-detail-meta">${rare}${tags}<span class="catalog-origin ${item.custom ? 'custom' : ''}">${item.custom ? 'Personalizado' : 'Base do sistema'}</span></div>
      </div>
    </div>
    <div class="item-detail-body">
      ${item.citacao ? `<blockquote class="item-quote">“${escaparHTML(item.citacao)}”</blockquote>` : ''}
      <section class="detail-section"><h3><i class="ti ti-notes"></i> Descrição</h3><p>${escaparHTML(item.descricao || 'Sem descrição.')}</p></section>
      <section class="detail-section"><h3><i class="ti ti-settings"></i> Propriedades</h3>${renderMecanica(item.mecanica)}</section>
      <section class="detail-section"><h3><i class="ti ti-info-circle"></i> Registro</h3>
        <div class="catalog-kv-grid">
          <div><span>Origem</span><strong>${escaparHTML(item.origem || '—')}</strong></div>
          <div><span>Peso</span><strong>${Number(item.pesoKg) ? `${item.pesoKg} kg` : '—'}</strong></div>
          <div><span>Custo</span><strong>${escaparHTML(item.custo || '—')}</strong></div>
          ${item.categoria === 'magico' ? `<div><span>Sintonização</span><strong>${item.sintonizacao ? 'Requerida' : 'Não requerida'}</strong></div>` : ''}
        </div>
      </section>
      ${item.mestre ? `
        <div class="master-locked"><i class="ti ti-lock"></i><span>Há informações reservadas ao mestre. Ative o <strong>Modo Mestre</strong> para revelá-las.</span></div>
        <section class="detail-section master-secret"><h3><i class="ti ti-eye-off"></i> Segredo do Mestre</h3><ul>
          ${Object.entries(item.mestre).filter(([key]) => key !== 'aviso').map(([key, value]) => `<li><strong>${escaparHTML(prettyKey(key))}:</strong> ${escaparHTML(value)}</li>`).join('')}
        </ul></section>` : ''}
      <div class="catalog-detail-actions no-print">
        ${item.custom ? `<button class="btn" onclick="editarItem('${escaparHTML(item.id)}')"><i class="ti ti-edit"></i> Editar</button><button class="btn danger" onclick="excluirItem('${escaparHTML(item.id)}')"><i class="ti ti-trash"></i> Excluir</button>` : '<span class="catalog-readonly"><i class="ti ti-lock"></i> Registro-base protegido contra edição</span>'}
      </div>
    </div>`;

  modal.dataset.itemId = item.id;
  modal.style.display = 'flex';
  if (!manterScroll) document.body.style.overflow = 'hidden';
}

function fecharDetalhes() {
  const modal = document.getElementById('itemModal');
  modal.style.display = 'none';
  modal.dataset.itemId = '';
  document.body.style.overflow = '';
}
function fecharModalNoFundo(event) { if (event.target.id === 'itemModal') fecharDetalhes(); }

function abrirEditorItem(item = null) {
  itemEditandoId = item?.custom ? item.id : null;
  document.getElementById('itemEditorTitle').textContent = item ? 'Editar Item' : 'Novo Item';
  document.getElementById('edNome').value = item?.nome || '';
  document.getElementById('edCategoria').value = item?.categoria || 'equipamento';
  document.getElementById('edSubcategoria').value = item?.subcategoria || '';
  document.getElementById('edPeso').value = item?.pesoKg || 0;
  document.getElementById('edCusto').value = item?.custo || '';
  document.getElementById('edOrigem').value = item?.origem || 'Personalizado';
  document.getElementById('edTags').value = (item?.tags || []).join(', ');
  document.getElementById('edDescricao').value = item?.descricao || '';
  atualizarCamposCategoria(item);
  document.getElementById('itemEditorModal').style.display = 'flex';
  document.body.style.overflow = 'hidden';
}

function editarItem(id) {
  const item = ITENS.find(i => i.id === id);
  if (!item?.custom) return;
  fecharDetalhes();
  abrirEditorItem(item);
}

function fecharEditorItem() {
  document.getElementById('itemEditorModal').style.display = 'none';
  document.body.style.overflow = '';
  itemEditandoId = null;
}
function fecharEditorNoFundo(event) { if (event.target.id === 'itemEditorModal') fecharEditorItem(); }

function atualizarCamposCategoria(item = null) {
  const categoria = document.getElementById('edCategoria').value;
  const m = item?.mecanica || {};
  const box = document.getElementById('itemSpecificFields');

  if (categoria === 'arma') {
    box.innerHTML = `<div class="catalog-section-label">Dados da arma</div><div class="catalog-form-grid">
      <div class="form-field"><label>Dano</label><input id="edDano" value="${escaparHTML(m.dano || '')}" placeholder="1d8"></div>
      <div class="form-field"><label>Tipo de dano</label><input id="edTipoDano" value="${escaparHTML(m.tipoDano || '')}" placeholder="cortante"></div>
      <div class="form-field"><label>Alcance</label><input id="edAlcance" value="${escaparHTML(m.alcance || '')}" placeholder="corpo a corpo / 24 m"></div>
      <div class="form-field"><label>Propriedades</label><input id="edPropriedades" value="${escaparHTML((m.propriedades || []).join(', '))}" placeholder="leve, acuidade"></div>
    </div>`;
  } else if (categoria === 'armadura') {
    box.innerHTML = `<div class="catalog-section-label">Dados da armadura</div><div class="catalog-form-grid">
      <div class="form-field"><label>CA base</label><input id="edCaBase" type="number" value="${m.caBase || 10}"></div>
      <div class="form-field"><label>Limite de DES</label><input id="edLimiteDes" type="number" value="${m.limiteDestreza ?? ''}" placeholder="vazio = sem limite"></div>
      <label class="catalog-check"><input id="edBonusDes" type="checkbox" ${m.bonusDestreza ? 'checked' : ''}> Soma Destreza</label>
      <label class="catalog-check"><input id="edFurtividade" type="checkbox" ${m.desvantagemFurtividade ? 'checked' : ''}> Desvantagem em Furtividade</label>
      <div class="form-field"><label>Força mínima</label><input id="edForcaMin" type="number" value="${m.forcaMinima || ''}" placeholder="opcional"></div>
    </div>`;
  } else if (categoria === 'utilizavel') {
    box.innerHTML = `<div class="catalog-section-label">Uso do objeto</div><div class="catalog-form-grid">
      <div class="form-field"><label>Usos / cargas</label><input id="edUsos" type="number" min="0" value="${m.usos ?? 1}"></div>
      <div class="form-field"><label>Duração</label><input id="edDuracao" value="${escaparHTML(m.duracao || '')}" placeholder="1 hora"></div>
      <div class="form-field span-2"><label>Efeito</label><textarea id="edEfeito" rows="2">${escaparHTML(m.efeito || '')}</textarea></div>
    </div>`;
  } else if (categoria === 'magico') {
    box.innerHTML = `<div class="catalog-section-label">Dados mágicos</div><div class="catalog-form-grid">
      <div class="form-field"><label>Raridade</label><select id="edRaridade"><option value="comum">Comum</option><option value="incomum">Incomum</option><option value="raro">Raro</option><option value="muito-raro">Muito raro</option><option value="lendario">Lendário</option><option value="artefato">Artefato</option></select></div>
      <label class="catalog-check"><input id="edSintonizacao" type="checkbox" ${item?.sintonizacao ? 'checked' : ''}> Requer sintonização</label>
      <div class="form-field span-2"><label>Efeito mecânico</label><textarea id="edEfeito" rows="2">${escaparHTML(m.efeito || '')}</textarea></div>
    </div>`;
    document.getElementById('edRaridade').value = item?.raridade || 'incomum';
  } else {
    box.innerHTML = `<div class="catalog-section-label">Dados do equipamento</div><div class="catalog-form-grid"><div class="form-field span-2"><label>Efeito / capacidade / observações</label><textarea id="edEfeito" rows="2">${escaparHTML(m.efeito || m.capacidade || '')}</textarea></div></div>`;
  }
}

function lerMecanicaEditor(categoria) {
  if (categoria === 'arma') return {
    dano: document.getElementById('edDano').value.trim(),
    tipoDano: document.getElementById('edTipoDano').value.trim(),
    alcance: document.getElementById('edAlcance').value.trim(),
    propriedades: document.getElementById('edPropriedades').value.split(',').map(v => v.trim()).filter(Boolean)
  };
  if (categoria === 'armadura') return {
    caBase: Number(document.getElementById('edCaBase').value) || 10,
    bonusDestreza: document.getElementById('edBonusDes').checked,
    limiteDestreza: document.getElementById('edLimiteDes').value === '' ? null : Number(document.getElementById('edLimiteDes').value),
    forcaMinima: document.getElementById('edForcaMin').value === '' ? null : Number(document.getElementById('edForcaMin').value),
    desvantagemFurtividade: document.getElementById('edFurtividade').checked
  };
  if (categoria === 'utilizavel') return {
    usos: Number(document.getElementById('edUsos').value) || 0,
    duracao: document.getElementById('edDuracao').value.trim(),
    efeito: document.getElementById('edEfeito').value.trim()
  };
  return { efeito: document.getElementById('edEfeito')?.value.trim() || '' };
}

async function salvarItemEditor() {
  const nome = document.getElementById('edNome').value.trim();
  if (!nome) { document.getElementById('edNome').focus(); return; }
  const categoria = document.getElementById('edCategoria').value;
  const antigo = ITENS.find(i => i.id === itemEditandoId);
  const item = {
    id: antigo?.id,
    nome,
    categoria,
    subcategoria: document.getElementById('edSubcategoria').value.trim(),
    origem: document.getElementById('edOrigem').value.trim() || 'Personalizado',
    pesoKg: Number(document.getElementById('edPeso').value) || 0,
    custo: document.getElementById('edCusto').value.trim(),
    descricao: document.getElementById('edDescricao').value.trim(),
    tags: document.getElementById('edTags').value.split(',').map(v => v.trim()).filter(Boolean),
    mecanica: lerMecanicaEditor(categoria)
  };
  if (categoria === 'magico') {
    item.raridade = document.getElementById('edRaridade').value;
    item.sintonizacao = document.getElementById('edSintonizacao').checked;
  }
  RPGCatalogo.saveItem(item);
  fecharEditorItem();
  await carregarItens();
}

async function excluirItem(id) {
  const item = ITENS.find(i => i.id === id);
  if (!item?.custom) return;
  if (!confirm(`Excluir “${item.nome}” do glossário?`)) return;
  RPGCatalogo.removeItem(id);
  fecharDetalhes();
  await carregarItens();
}

document.addEventListener('keydown', event => {
  if (event.key === 'Escape') {
    if (document.getElementById('itemEditorModal')?.style.display !== 'none') fecharEditorItem();
    else if (document.getElementById('itemModal')?.style.display !== 'none') fecharDetalhes();
  }
});

document.addEventListener('DOMContentLoaded', () => {
  applyTheme();
  document.getElementById('masterMode').checked = modoMestre;
  document.body.classList.toggle('master-mode', modoMestre);
  carregarItens();
});