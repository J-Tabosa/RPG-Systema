let MAGIAS = [];
let ESCOLAS = [];
let magiaEditandoId = null;
let magiaEditandoBase = false;
let dark = localStorage.getItem('rpg_theme') !== 'light';

const SCHOOL_COLORS = {
  'Abjuração': '#6f8fb3', 'Adivinhação': '#c6a15b', 'Conjuração': '#65a67a', 'Encantamento': '#c978b9',
  'Evocação': '#d46b55', 'Ilusão': '#8f78c9', 'Necromancia': '#758b68', 'Transmutação': '#c18b54', 'Universal': '#9b9b9b'
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
function nivelLabel(nivel) { return Number(nivel) === 0 ? 'Truque' : `${nivel}º nível`; }
function areaLabel(forma) {
  return { nenhuma: 'Sem área', esfera: 'Esfera', cone: 'Cone', cubo: 'Cubo', cilindro: 'Cilindro', linha: 'Linha', emanacao: 'Emanação', quadrado: 'Quadrado' }[forma] || forma || 'Sem área';
}
function schoolColor(escola) {
  return ESCOLAS.find(e => e.label === escola)?.color || SCHOOL_COLORS[escola] || '#9d76cf';
}
function schoolIcon(escola) {
  return ESCOLAS.find(e => e.label === escola)?.icon || 'ti-wand';
}

async function carregarMagias() {
  try {
    const [magias, escolas] = await Promise.all([
      RPGCatalogo.getMagias(),
      RPGCatalogo.getSpellSchools()
    ]);
    MAGIAS = magias;
    ESCOLAS = escolas;
    preencherEscolas();
    atualizarEstatisticas();
    filtrarMagias();
  } catch (error) {
    console.error(error);
    document.getElementById('spellsGrid').innerHTML = '<div class="catalog-error">Não foi possível carregar o catálogo de magias.</div>';
  }
}

function preencherEscolas() {
  const select = document.getElementById('schoolFilter');
  const editor = document.getElementById('spEdEscola');
  const classSelect = document.getElementById('classFilter');
  const sourceSelect = document.getElementById('sourceFilter');
  const atual = select?.value || 'todos';
  const classeAtual = classSelect?.value || 'todas';
  const fonteAtual = sourceSelect?.value || 'todas';

  const labels = [...new Set([
    ...ESCOLAS.map(e => e.label),
    ...MAGIAS.map(m => m.escola).filter(Boolean)
  ])].sort((a, b) => a.localeCompare(b, 'pt-BR'));
  const classes = [...new Set(MAGIAS.flatMap(m => m.classes || []).filter(Boolean))]
    .sort((a, b) => a.localeCompare(b, 'pt-BR'));
  const fontes = [...new Set(MAGIAS.flatMap(m => m.fontes || (m.origem ? [m.origem] : [])).filter(Boolean))]
    .sort((a, b) => a.localeCompare(b, 'pt-BR'));

  if (select) {
    select.innerHTML = '<option value="todos">Todas</option>' + labels.map(e => `<option value="${escaparHTML(e)}">${escaparHTML(e)}</option>`).join('');
    if ([...select.options].some(o => o.value === atual)) select.value = atual;
  }
  if (classSelect) {
    classSelect.innerHTML = '<option value="todas">Todas</option>' + classes.map(e => `<option value="${escaparHTML(e)}">${escaparHTML(e)}</option>`).join('');
    if ([...classSelect.options].some(o => o.value === classeAtual)) classSelect.value = classeAtual;
  }
  if (sourceSelect) {
    sourceSelect.innerHTML = '<option value="todas">Todas</option>' + fontes.map(e => `<option value="${escaparHTML(e)}">${escaparHTML(e)}</option>`).join('');
    if ([...sourceSelect.options].some(o => o.value === fonteAtual)) sourceSelect.value = fonteAtual;
  }
  if (editor) {
    const atualEditor = editor.value;
    editor.innerHTML = labels.map(e => `<option value="${escaparHTML(e)}">${escaparHTML(e)}</option>`).join('');
    if ([...editor.options].some(o => o.value === atualEditor)) editor.value = atualEditor;
  }
}

function atualizarEstatisticas() {
  document.getElementById('statTotal').textContent = MAGIAS.length;
  document.getElementById('statAreas').textContent = MAGIAS.filter(m => m.area?.forma && m.area.forma !== 'nenhuma').length;
  document.getElementById('statCustom').textContent = MAGIAS.filter(m => m.custom).length;
}

function filtrarMagias() {
  const busca = normalizarTexto(document.getElementById('spellSearch')?.value || '');
  const nivel = document.getElementById('levelFilter')?.value || 'todos';
  const escola = document.getElementById('schoolFilter')?.value || 'todos';
  const classe = document.getElementById('classFilter')?.value || 'todas';
  const fonte = document.getElementById('sourceFilter')?.value || 'todas';
  const ordem = document.getElementById('sortFilter')?.value || 'nivel';
  const area = document.getElementById('areaFilter')?.value || 'todos';

  const filtradas = MAGIAS.filter(magia => {
    const fontes = magia.fontes || (magia.origem ? [magia.origem] : []);
    const nome = normalizarTexto(magia.nome || '');
    return (!busca || nome.includes(busca)) &&
      (nivel === 'todos' || Number(magia.nivel) === Number(nivel)) &&
      (escola === 'todos' || magia.escola === escola) &&
      (classe === 'todas' || (magia.classes || []).includes(classe)) &&
      (fonte === 'todas' || fontes.includes(fonte)) &&
      (area === 'todos' || (magia.area?.forma || 'nenhuma') === area);
  });

  filtradas.sort((a, b) => {
    if (ordem === 'nome') return String(a.nome || '').localeCompare(String(b.nome || ''), 'pt-BR');
    if (ordem === 'escola') {
      return String(a.escola || '').localeCompare(String(b.escola || ''), 'pt-BR') ||
        String(a.nome || '').localeCompare(String(b.nome || ''), 'pt-BR');
    }
    return (Number(a.nivel) || 0) - (Number(b.nivel) || 0) ||
      String(a.nome || '').localeCompare(String(b.nome || ''), 'pt-BR');
  });

  renderizarMagias(filtradas);
  document.getElementById('resultCount').textContent = filtradas.length;
  const filtros = [];
  if (busca) filtros.push(`busca: “${busca}”`);
  if (nivel !== 'todos') filtros.push(Number(nivel) === 0 ? 'truques' : `nível ${nivel}`);
  if (escola !== 'todos') filtros.push(escola);
  if (classe !== 'todas') filtros.push(classe);
  if (fonte !== 'todas') filtros.push(`fonte: ${fonte}`);
  if (area !== 'todos') filtros.push(areaLabel(area));
  const ordemLabel = { nivel: 'nível', escola: 'escola', nome: 'A–Z' }[ordem] || ordem;
  document.getElementById('activeFilterText').textContent =
    (filtros.length ? filtros.join(' · ') : 'Exibindo todo o grimório') + ` · ordem: ${ordemLabel}`;
}

function limparFiltros() {
  document.getElementById('spellSearch').value = '';
  document.getElementById('levelFilter').value = 'todos';
  document.getElementById('schoolFilter').value = 'todos';
  document.getElementById('classFilter').value = 'todas';
  document.getElementById('sourceFilter').value = 'todas';
  document.getElementById('sortFilter').value = 'nivel';
  document.getElementById('areaFilter').value = 'todos';
  filtrarMagias();
}

function abrirImportadorMagias() {
  document.getElementById('spellImportInput')?.click();
}

async function importarMagiasJSON(event) {
  const input = event?.target;
  const arquivo = input?.files?.[0];
  if (!arquivo) return;

  try {
    const payload = JSON.parse(await arquivo.text());
    const resultado = await RPGCatalogo.importSpells(payload);
    if (!resultado.total) {
      alert('O JSON não contém magias válidas. Use um array, spells[] ou magias[].');
      return;
    }
    await carregarMagias();
    alert(`Importação concluída: ${resultado.imported} nova(s) e ${resultado.updated} atualizada(s).`);
  } catch (error) {
    console.error('Erro ao importar magias:', error);
    alert('Não foi possível importar o JSON de magias. Verifique a estrutura do arquivo.');
  } finally {
    if (input) input.value = '';
  }
}

function renderizarMagias(lista) {
  const grid = document.getElementById('spellsGrid');
  const empty = document.getElementById('spellsEmpty');
  if (!lista.length) {
    grid.innerHTML = '';
    empty.style.display = '';
    return;
  }
  empty.style.display = 'none';
  grid.innerHTML = lista.map(magia => {
    const cor = schoolColor(magia.escola);
    const area = RPGCatalogo.formatArea(magia.area);
    const concentration = magia.duracao?.concentracao ? '<span class="catalog-pill accent"><i class="ti ti-focus-2"></i> Concentração</span>' : '';
    const ritual = magia.ritual ? '<span class="catalog-pill"><i class="ti ti-book"></i> Ritual</span>' : '';
    const sourceLabel = (magia.fontes || []).join(' · ') || magia.origem || 'Base';
    const source = magia.baseOverride
      ? '<span class="catalog-origin custom">Base editada</span>'
      : magia.custom
        ? '<span class="catalog-origin custom">Personalizada</span>'
        : `<span class="catalog-origin">${escaparHTML(sourceLabel)}</span>`;
    return `
      <article class="spell-card" style="--spell-color:${cor}" onclick="abrirDetalhes('${escaparHTML(magia.id)}')" tabindex="0" role="button" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();abrirDetalhes('${escaparHTML(magia.id)}')}">
        <div class="spell-card-head">
          <div class="spell-level-icon">${Number(magia.nivel)}</div>
          <div class="spell-card-title"><h3>${escaparHTML(magia.nome)}</h3><p>${escaparHTML(nivelLabel(magia.nivel))} · ${escaparHTML(magia.escola || 'Sem escola')}</p></div>
          ${source}
        </div>
        <div class="spell-card-body">
          <p class="spell-card-description">${escaparHTML(magia.descricao || 'Sem descrição.')}</p>
          <div class="spell-meta-grid">
            <div><span>Conjuração</span><strong>${escaparHTML(RPGCatalogo.formatCasting(magia.conjuracao))}</strong></div>
            <div><span>Alcance</span><strong>${escaparHTML(RPGCatalogo.formatRange(magia.alcance))}</strong></div>
            <div><span>Duração</span><strong>${escaparHTML(RPGCatalogo.formatDuration(magia.duracao))}</strong></div>
            <div><span>Área</span><strong>${escaparHTML(area)}</strong></div>
          </div>
          <div class="item-tags">${concentration}${ritual}${(magia.tags || []).slice(0, 3).map(tag => `<span class="item-tag">${escaparHTML(tag)}</span>`).join('')}</div>
          <div class="spell-card-footer">
            <span class="spell-area-badge ${magia.area?.forma === 'nenhuma' ? 'spell-no-area' : ''}"><i class="ti ti-ruler-measure"></i>${escaparHTML(area)}</span>
            <span class="item-card-link">Ver magia <i class="ti ti-arrow-right"></i></span>
          </div>
        </div>
      </article>`;
  }).join('');
}

function componentChips(components = {}) {
  const chips = [];
  if (components.verbal) chips.push('<span class="component-chip">V</span>');
  if (components.somatico) chips.push('<span class="component-chip">S</span>');
  if (components.material) chips.push('<span class="component-chip">M</span>');
  return chips.join('') || '<span class="catalog-pill">Sem componentes</span>';
}

function abrirDetalhes(id) {
  const magia = MAGIAS.find(m => m.id === id);
  if (!magia) return;
  const modal = document.getElementById('spellModal');
  const content = document.getElementById('spellModalContent');
  const cor = schoolColor(magia.escola);
  const area = RPGCatalogo.formatArea(magia.area);
  const res = magia.resolucao || {};
  const fonteLabel = (magia.fontes || []).join(' · ') || magia.origem || 'Base';
  const regrasCompletas = magia.descricaoCompleta || magia.descricao || 'Sem descrição.';

  content.innerHTML = `
    <div class="item-detail-hero spell-detail-hero" style="--rarity-color:${cor}">
      <div class="item-detail-icon"><i class="ti ${schoolIcon(magia.escola)}"></i></div>
      <div class="item-detail-heading">
        <h2 id="modalSpellName">${escaparHTML(magia.nome)}</h2>
        <div class="item-detail-subtitle">${escaparHTML(nivelLabel(magia.nivel))} · ${escaparHTML(magia.escola || 'Sem escola')} · ${magia.ritual ? 'Ritual' : 'Não ritual'}</div>
        <div class="item-detail-meta"><span class="catalog-origin ${magia.custom ? 'custom' : ''}">${magia.baseOverride ? 'Base editada' : (magia.custom ? 'Personalizada' : escaparHTML(fonteLabel))}</span>${(magia.tags || []).map(tag => `<span class="item-tag">${escaparHTML(tag)}</span>`).join('')}</div>
      </div>
    </div>
    <div class="item-detail-body">
      <div class="spell-detail-columns">
        <section class="detail-section"><h3><i class="ti ti-clock"></i> Conjuração</h3><div class="catalog-kv-grid">
          <div><span>Tempo</span><strong>${escaparHTML(RPGCatalogo.formatCasting(magia.conjuracao))}</strong></div>
          <div><span>Alcance</span><strong>${escaparHTML(RPGCatalogo.formatRange(magia.alcance))}</strong></div>
          <div><span>Alvo</span><strong>${escaparHTML(magia.alvo || '—')}</strong></div>
          <div><span>Duração</span><strong>${escaparHTML(RPGCatalogo.formatDuration(magia.duracao))}</strong></div>
          <div><span>Área</span><strong>${escaparHTML(area)}</strong></div>
        </div></section>
        <section class="detail-section"><h3><i class="ti ti-components"></i> Componentes</h3><div class="spell-components">${componentChips(magia.componentes)}</div>
          ${magia.componentes?.material ? `<p style="margin-top:8px">${escaparHTML(magia.componentes.materialTexto || 'Material não especificado.')}${magia.componentes.custo ? ` · ${escaparHTML(magia.componentes.custo)}` : ''}${magia.componentes.consumido ? ' · consumido' : ''}</p>` : ''}
        </section>
      </div>
      <section class="detail-section"><h3><i class="ti ti-bolt"></i> Resolução</h3><div class="catalog-kv-grid">
        <div><span>Tipo</span><strong>${escaparHTML(res.tipo || '—')}</strong></div>
        <div><span>Salvaguarda</span><strong>${escaparHTML(res.atributo || '—')}</strong></div>
        <div><span>Dano</span><strong>${escaparHTML([res.dano, res.tipoDano].filter(Boolean).join(' ') || '—')}</strong></div>
        <div><span>Cura</span><strong>${escaparHTML(res.cura || '—')}</strong></div>
      </div>${res.efeito ? `<p style="margin-top:8px">${escaparHTML(res.efeito)}</p>` : ''}</section>
      <section class="detail-section spell-rules-section"><h3><i class="ti ti-notes"></i> Regras da magia</h3><p class="spell-rules-text">${escaparHTML(regrasCompletas)}</p></section>
      ${magia.escalonamento ? `<section class="detail-section"><h3><i class="ti ti-trending-up"></i> Em níveis superiores</h3><p>${escaparHTML(magia.escalonamento)}</p></section>` : ''}
      <section class="detail-section"><h3><i class="ti ti-info-circle"></i> Origem e classes</h3><p><strong>${escaparHTML((magia.fontes || []).join(' · ') || magia.origem || '—')}</strong><br>${escaparHTML((magia.classes || []).join(', ') || 'Classes não especificadas')}</p></section>
      <div class="catalog-detail-actions no-print">
        <button class="btn" onclick="editarMagia('${escaparHTML(magia.id)}')"><i class="ti ti-edit"></i> Editar</button>
        ${magia.baseOverride
          ? `<button class="btn danger" onclick="excluirMagia('${escaparHTML(magia.id)}')"><i class="ti ti-restore"></i> Restaurar original</button>`
          : (magia.custom ? `<button class="btn danger" onclick="excluirMagia('${escaparHTML(magia.id)}')"><i class="ti ti-trash"></i> Excluir</button>` : '')
        }
      </div>
    </div>`;

  modal.dataset.spellId = magia.id;
  modal.style.display = 'flex';
  document.body.style.overflow = 'hidden';
}

function fecharDetalhes() {
  document.getElementById('spellModal').style.display = 'none';
  document.body.style.overflow = '';
}
function fecharDetalhesNoFundo(event) { if (event.target.id === 'spellModal') fecharDetalhes(); }

function setValue(id, value) { const el = document.getElementById(id); if (el) el.value = value ?? ''; }
function setChecked(id, value) { const el = document.getElementById(id); if (el) el.checked = Boolean(value); }

function abrirEditorMagia(magia = null) {
  magiaEditandoId = magia?.id || null;
  magiaEditandoBase = Boolean(magia && !magia.custom);
  document.getElementById('spellEditorTitle').textContent = magia ? 'Editar Magia' : 'Nova Magia';
  setValue('spEdNome', magia?.nome || '');
  setValue('spEdNivel', magia?.nivel ?? 0);
  preencherEscolas();
  setValue('spEdEscola', magia?.escola || ESCOLAS[0]?.label || 'Evocação');
  setValue('spEdClasses', (magia?.classes || []).join(', '));
  setValue('spEdOrigem', magia?.origem || 'Personalizado');
  setValue('spEdTags', (magia?.tags || []).join(', '));
  setChecked('spEdRitual', magia?.ritual);

  setValue('spEdCastValor', magia?.conjuracao?.valor ?? 1);
  setValue('spEdCastUnidade', magia?.conjuracao?.unidade || 'acao');
  setValue('spEdGatilho', magia?.conjuracao?.gatilho || '');
  setValue('spEdRangeTipo', magia?.alcance?.tipo || 'distancia');
  setValue('spEdRangeDist', magia?.alcance?.distancia ?? 0);
  setValue('spEdRangeUnit', magia?.alcance?.unidade || 'm');
  setValue('spEdAlvo', magia?.alvo || '');

  setValue('spEdDurTipo', magia?.duracao?.tipo || 'instantanea');
  setValue('spEdDurValor', magia?.duracao?.valor ?? 0);
  setValue('spEdDurUnit', magia?.duracao?.unidade || 'rodada');
  setChecked('spEdConcentracao', magia?.duracao?.concentracao);

  setChecked('spEdV', magia?.componentes?.verbal ?? true);
  setChecked('spEdS', magia?.componentes?.somatico ?? true);
  setChecked('spEdM', magia?.componentes?.material);
  setChecked('spEdConsumido', magia?.componentes?.consumido);
  setValue('spEdMaterial', magia?.componentes?.materialTexto || '');
  setValue('spEdMaterialCusto', magia?.componentes?.custo || '');

  setValue('spEdResolucao', magia?.resolucao?.tipo || 'efeito');
  setValue('spEdAtributo', magia?.resolucao?.atributo || '');
  setValue('spEdAtaque', magia?.resolucao?.ataque || '');
  setValue('spEdDano', magia?.resolucao?.dano || '');
  setValue('spEdTipoDano', magia?.resolucao?.tipoDano || '');
  setValue('spEdCura', magia?.resolucao?.cura || '');
  setValue('spEdEfeito', magia?.resolucao?.efeito || '');

  setValue('spEdAreaForma', magia?.area?.forma || 'nenhuma');
  setValue('spEdAreaOrigem', magia?.area?.origem || 'ponto');
  setValue('spEdRaio', magia?.area?.raio ?? 0);
  setValue('spEdComprimento', magia?.area?.comprimento ?? 0);
  setValue('spEdLargura', magia?.area?.largura ?? 0);
  setValue('spEdAltura', magia?.area?.altura ?? 0);
  setValue('spEdAreaUnit', magia?.area?.unidade || 'm');

  setValue('spEdDescricao', magia?.descricao || '');
  setValue('spEdDescricaoCompleta', magia?.descricaoCompleta || magia?.descricao || '');
  setValue('spEdEscala', magia?.escalonamento || '');
  atualizarEstadoAlcance();
  atualizarEstadoMaterial();
  atualizarCamposGeometria();
  document.getElementById('spellEditorModal').style.display = 'flex';
  document.body.style.overflow = 'hidden';
}

function editarMagia(id) {
  const magia = MAGIAS.find(m => m.id === id);
  if (!magia) return;
  fecharDetalhes();
  abrirEditorMagia(magia);
}

function fecharEditorMagia() {
  document.getElementById('spellEditorModal').style.display = 'none';
  document.body.style.overflow = '';
  magiaEditandoId = null;
  magiaEditandoBase = false;
}
function fecharEditorNoFundo(event) { if (event.target.id === 'spellEditorModal') fecharEditorMagia(); }

function atualizarEstadoAlcance() {
  const tipo = document.getElementById('spEdRangeTipo').value;
  const disabled = tipo !== 'distancia';
  document.getElementById('spEdRangeDist').disabled = disabled;
  document.getElementById('spEdRangeUnit').disabled = disabled;
}

function atualizarEstadoMaterial() {
  const material = document.getElementById('spEdM').checked;
  document.getElementById('spEdMaterial').disabled = !material;
  document.getElementById('spEdMaterialCusto').disabled = !material;
  document.getElementById('spEdConsumido').disabled = !material;
}

function atualizarCamposGeometria() {
  const forma = document.getElementById('spEdAreaForma').value;
  const ids = ['spEdRaio', 'spEdComprimento', 'spEdLargura', 'spEdAltura', 'spEdAreaUnit', 'spEdAreaOrigem'];
  ids.forEach(id => document.getElementById(id).disabled = forma === 'nenhuma');
  atualizarPreviewGeometria();
}

function areaDoEditor() {
  return {
    forma: document.getElementById('spEdAreaForma').value,
    origem: document.getElementById('spEdAreaOrigem').value,
    raio: Number(document.getElementById('spEdRaio').value) || 0,
    comprimento: Number(document.getElementById('spEdComprimento').value) || 0,
    largura: Number(document.getElementById('spEdLargura').value) || 0,
    altura: Number(document.getElementById('spEdAltura').value) || 0,
    unidade: document.getElementById('spEdAreaUnit').value
  };
}

function atualizarPreviewGeometria() {
  const preview = document.getElementById('geometryPreview');
  if (!preview) return;
  const area = areaDoEditor();
  if (area.forma === 'nenhuma') {
    preview.innerHTML = '<strong>Sem área de efeito configurada.</strong> A magia pode atuar em alvo único, múltiplos alvos ou ter um efeito sem área.';
    return;
  }
  preview.innerHTML = `<strong>${escaparHTML(areaLabel(area.forma))}:</strong> ${escaparHTML(RPGCatalogo.formatArea(area))} · origem: ${escaparHTML(area.origem)}.`;
}

function lerMagiaEditor() {
  const material = document.getElementById('spEdM').checked;
  return {
    id: MAGIAS.find(m => m.id === magiaEditandoId)?.id,
    nome: document.getElementById('spEdNome').value.trim(),
    nivel: Number(document.getElementById('spEdNivel').value) || 0,
    escola: document.getElementById('spEdEscola').value,
    origem: document.getElementById('spEdOrigem').value.trim() || 'Personalizado',
    classes: document.getElementById('spEdClasses').value.split(',').map(v => v.trim()).filter(Boolean),
    ritual: document.getElementById('spEdRitual').checked,
    conjuracao: {
      valor: Number(document.getElementById('spEdCastValor').value) || 1,
      unidade: document.getElementById('spEdCastUnidade').value,
      gatilho: document.getElementById('spEdGatilho').value.trim()
    },
    alcance: {
      tipo: document.getElementById('spEdRangeTipo').value,
      distancia: Number(document.getElementById('spEdRangeDist').value) || 0,
      unidade: document.getElementById('spEdRangeUnit').value
    },
    alvo: document.getElementById('spEdAlvo').value.trim(),
    duracao: {
      tipo: document.getElementById('spEdDurTipo').value,
      valor: Number(document.getElementById('spEdDurValor').value) || 0,
      unidade: document.getElementById('spEdDurUnit').value.trim(),
      concentracao: document.getElementById('spEdConcentracao').checked
    },
    componentes: {
      verbal: document.getElementById('spEdV').checked,
      somatico: document.getElementById('spEdS').checked,
      material,
      materialTexto: material ? document.getElementById('spEdMaterial').value.trim() : '',
      custo: material ? document.getElementById('spEdMaterialCusto').value.trim() : '',
      consumido: material && document.getElementById('spEdConsumido').checked
    },
    resolucao: {
      tipo: document.getElementById('spEdResolucao').value,
      atributo: document.getElementById('spEdAtributo').value,
      ataque: document.getElementById('spEdAtaque').value,
      dano: document.getElementById('spEdDano').value.trim(),
      tipoDano: document.getElementById('spEdTipoDano').value.trim(),
      cura: document.getElementById('spEdCura').value.trim(),
      efeito: document.getElementById('spEdEfeito').value.trim()
    },
    area: areaDoEditor(),
    escalonamento: document.getElementById('spEdEscala').value.trim(),
    descricao: document.getElementById('spEdDescricao').value.trim(),
    descricaoCompleta: document.getElementById('spEdDescricaoCompleta').value.trim(),
    tags: document.getElementById('spEdTags').value.split(',').map(v => v.trim()).filter(Boolean)
  };
}

async function salvarMagiaEditor() {
  const magia = lerMagiaEditor();
  if (!magia.nome) { document.getElementById('spEdNome').focus(); return; }
  const anterior = MAGIAS.find(m => m.id === magiaEditandoId);
  magia.baseOverride = magiaEditandoBase || Boolean(anterior?.baseOverride);
  RPGCatalogo.saveSpell(magia);
  fecharEditorMagia();
  await carregarMagias();
}

async function excluirMagia(id) {
  const magia = MAGIAS.find(m => m.id === id);
  if (!magia?.custom) return;
  const restaurar = Boolean(magia.baseOverride);
  const mensagem = restaurar
    ? `Restaurar “${magia.nome}” para a versão original do sistema?`
    : `Excluir “${magia.nome}” do glossário?`;
  if (!confirm(mensagem)) return;
  RPGCatalogo.removeSpell(id);
  fecharDetalhes();
  await carregarMagias();
}

document.addEventListener('input', event => {
  if (event.target.closest('#spellEditorModal') && ['spEdRaio','spEdComprimento','spEdLargura','spEdAltura','spEdAreaOrigem','spEdAreaUnit'].includes(event.target.id)) atualizarPreviewGeometria();
});

document.addEventListener('keydown', event => {
  if (event.key === 'Escape') {
    if (document.getElementById('spellEditorModal')?.style.display !== 'none') fecharEditorMagia();
    else if (document.getElementById('spellModal')?.style.display !== 'none') fecharDetalhes();
  }
});

document.addEventListener('DOMContentLoaded', () => {
  applyTheme();
  carregarMagias();
});