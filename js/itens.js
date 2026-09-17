// ── DADOS DO GLOSSÁRIO ───────────────────────────────────────────────────────
// Para cadastrar novos itens, adicione novos objetos neste array seguindo o
// mesmo formato do item abaixo. Os filtros e os cards são gerados automaticamente.
const ITENS_MAGICOS = [
  {
    id: 'sino-do-ultimo-cortejo',
    nome: 'Sino do Último Cortejo',
    tipo: 'Item maravilhoso',
    raridade: 'artefato',
    raridadeLabel: 'Artefato',
    afinacao: 'Não requer sintonização',
    estado: 'Dormente',
    icone: 'ti-bell',
    resumo: 'Um pequeno sino de bolso de bronze escurecido, sem badalo, marcado pelo tempo e aparentemente incapaz de produzir qualquer som.',
    descricao: 'À primeira vista, trata-se apenas de um sino funerário antigo e inutilizável. O metal é escuro, frio ao toque e não há badalo em seu interior. Quando agitado, nada acontece.',
    origemPublica: 'A procedência do objeto é desconhecida. Não há assinatura de ferreiro, brasão, runa ou marca aparente que identifique quem o criou.',
    quote: 'Uma badalada para sua chegada. Uma badalada para sua morte.',
    tags: ['Funeral', 'Morte', 'Relíquia', 'Campanha'],
    mestre: {
      aviso: 'O sino parece não mágico enquanto permanece dormente.',
      identificacao: 'Detectar Magia e Identificar não revelam seu verdadeiro propósito enquanto o item estiver dormente.',
      proposito: 'O sino foi criado para anunciar e permitir o funeral de alguém que enganou a própria morte. Na campanha, ele funciona como a chave narrativa destinada a tornar Ivan BlackThorn mortal.',
      manifestacao: 'Quando Ivan se manifesta em sua forma verdadeira, o sino toca sozinho. Apesar de caber em uma mão, a badalada ecoa como o sino colossal de uma torre ou catedral.',
      origem: 'Séculos atrás, o objeto teria sido forjado por um sineiro funerário e ocultista ligado a uma antiga ordem responsável por enterrar aqueles que tentavam escapar da morte.',
      introducao: 'O item pode chegar ao grupo pelas mãos de uma pessoa extremamente suspeita, encontrada no meio da rua, sem contexto confiável e sem explicar por completo o que está entregando.'
    }
  }
];

const RARITY_COLORS = {
  'comum': '#a9a29a',
  'incomum': '#55a56f',
  'raro': '#5f8ed8',
  'muito-raro': '#a979db',
  'lendario': '#d68b3f',
  'artefato': '#d65b57'
};

let modoMestre = localStorage.getItem('rpg_items_master_mode') === 'true';
let dark = localStorage.getItem('rpg_theme') !== 'light';

// ── TEMA ─────────────────────────────────────────────────────────────────────
function applyTheme() {
  document.body.classList.toggle('light', !dark);
  const themeBtn = document.getElementById('themeBtn');
  if (themeBtn) themeBtn.textContent = dark ? '☀' : '🌙';
}

function toggleTheme() {
  dark = !dark;
  localStorage.setItem('rpg_theme', dark ? 'dark' : 'light');
  applyTheme();
}

// ── MENU MOBILE ───────────────────────────────────────────────────────────────
function toggleMobMenu() {
  const nav = document.getElementById('mobNav');
  if (nav) nav.classList.toggle('open');
}

function closeMobMenu() {
  const nav = document.getElementById('mobNav');
  if (nav) nav.classList.remove('open');
}

document.addEventListener('click', event => {
  const nav = document.getElementById('mobNav');
  if (nav && nav.classList.contains('open') && !nav.contains(event.target) && !event.target.closest('.mob-menu-btn')) {
    closeMobMenu();
  }
});

// ── UTILITÁRIOS ───────────────────────────────────────────────────────────────
function normalizarTexto(valor = '') {
  return String(valor)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function escaparHTML(valor = '') {
  return String(valor)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function corRaridade(raridade) {
  return RARITY_COLORS[raridade] || 'var(--gold)';
}

function preencherFiltroTipos() {
  const select = document.getElementById('typeFilter');
  if (!select) return;

  const tipos = [...new Set(ITENS_MAGICOS.map(item => item.tipo))].sort((a, b) => a.localeCompare(b, 'pt-BR'));
  tipos.forEach(tipo => {
    const option = document.createElement('option');
    option.value = normalizarTexto(tipo).replaceAll(' ', '-');
    option.textContent = tipo;
    select.appendChild(option);
  });
}

function atualizarEstatisticas() {
  const total = ITENS_MAGICOS.length;
  const artefatos = ITENS_MAGICOS.filter(item => item.raridade === 'artefato').length;

  document.getElementById('statTotal').textContent = total;
  document.getElementById('statArtefatos').textContent = artefatos;
}

// ── MODO MESTRE ───────────────────────────────────────────────────────────────
function alternarModoMestre(ativo) {
  modoMestre = Boolean(ativo);
  localStorage.setItem('rpg_items_master_mode', String(modoMestre));
  document.body.classList.toggle('master-mode', modoMestre);

  const modal = document.getElementById('itemModal');
  if (modal && modal.style.display !== 'none' && modal.dataset.itemId) {
    abrirDetalhes(modal.dataset.itemId, true);
  }
}

// ── FILTROS ──────────────────────────────────────────────────────────────────
function filtrarItens() {
  const busca = normalizarTexto(document.getElementById('itemSearch')?.value || '');
  const raridade = document.getElementById('rarityFilter')?.value || 'todos';
  const tipo = document.getElementById('typeFilter')?.value || 'todos';

  const filtrados = ITENS_MAGICOS.filter(item => {
    const textoItem = normalizarTexto([
      item.nome,
      item.tipo,
      item.raridadeLabel,
      item.resumo,
      item.descricao,
      item.origemPublica,
      ...(item.tags || [])
    ].join(' '));

    const passaBusca = !busca || textoItem.includes(busca);
    const passaRaridade = raridade === 'todos' || item.raridade === raridade;
    const tipoItem = normalizarTexto(item.tipo).replaceAll(' ', '-');
    const passaTipo = tipo === 'todos' || tipoItem === tipo;

    return passaBusca && passaRaridade && passaTipo;
  });

  renderizarItens(filtrados);
  atualizarResumoFiltros(filtrados.length, busca, raridade, tipo);
}

function limparFiltros() {
  document.getElementById('itemSearch').value = '';
  document.getElementById('rarityFilter').value = 'todos';
  document.getElementById('typeFilter').value = 'todos';
  filtrarItens();
}

function atualizarResumoFiltros(total, busca, raridade, tipo) {
  document.getElementById('resultCount').textContent = total;
  const partes = [];

  if (busca) partes.push(`busca: “${busca}”`);
  if (raridade !== 'todos') partes.push(`raridade: ${raridade.replaceAll('-', ' ')}`);
  if (tipo !== 'todos') partes.push(`tipo: ${tipo.replaceAll('-', ' ')}`);

  document.getElementById('activeFilterText').textContent = partes.length
    ? partes.join(' · ')
    : 'Exibindo todo o acervo';
}

// ── RENDERIZAÇÃO DOS CARDS ──────────────────────────────────────────────────
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
    const cor = corRaridade(item.raridade);
    const tags = (item.tags || []).map(tag => `<span class="item-tag">${escaparHTML(tag)}</span>`).join('');

    return `
      <article class="magic-item-card" style="--rarity-color:${cor}" onclick="abrirDetalhes('${escaparHTML(item.id)}')" tabindex="0" role="button" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();abrirDetalhes('${escaparHTML(item.id)}')}">
        <div class="item-card-head">
          <div class="item-icon-wrap"><i class="ti ${escaparHTML(item.icone)}"></i></div>
          <div class="item-card-title">
            <h3>${escaparHTML(item.nome)}</h3>
            <p>${escaparHTML(item.tipo)} · ${escaparHTML(item.estado)}</p>
          </div>
          <span class="rarity-chip rarity-${escaparHTML(item.raridade)}">${escaparHTML(item.raridadeLabel)}</span>
        </div>

        <div class="item-card-body">
          <p class="item-summary">${escaparHTML(item.resumo)}</p>
          <div class="item-tags">${tags}</div>
          <div class="item-card-footer">
            <span><i class="ti ti-link"></i> ${escaparHTML(item.afinacao)}</span>
            <span class="item-card-link">Ver registro <i class="ti ti-arrow-right"></i></span>
          </div>
        </div>

        <div class="master-preview">
          <strong><i class="ti ti-eye"></i> Nota do Mestre</strong>
          ${escaparHTML(item.mestre?.aviso || 'Este item possui informações ocultas para o mestre.')}
        </div>
      </article>
    `;
  }).join('');
}

// ── DETALHES ─────────────────────────────────────────────────────────────────
function abrirDetalhes(id, manterScroll = false) {
  const item = ITENS_MAGICOS.find(registro => registro.id === id);
  if (!item) return;

  const modal = document.getElementById('itemModal');
  const content = document.getElementById('itemModalContent');
  const cor = corRaridade(item.raridade);
  const tags = (item.tags || []).map(tag => `<span class="item-tag">${escaparHTML(tag)}</span>`).join('');

  content.innerHTML = `
    <div class="item-detail-hero" style="--rarity-color:${cor}">
      <div class="item-detail-icon"><i class="ti ${escaparHTML(item.icone)}"></i></div>
      <div class="item-detail-heading">
        <h2 id="modalItemName">${escaparHTML(item.nome)}</h2>
        <div class="item-detail-subtitle">${escaparHTML(item.tipo)} · ${escaparHTML(item.estado)} · ${escaparHTML(item.afinacao)}</div>
        <div class="item-detail-meta">
          <span class="rarity-chip rarity-${escaparHTML(item.raridade)}">${escaparHTML(item.raridadeLabel)}</span>
          ${tags}
        </div>
      </div>
    </div>

    <div class="item-detail-body">
      <blockquote class="item-quote">“${escaparHTML(item.quote)}”</blockquote>

      <section class="detail-section">
        <h3><i class="ti ti-eye"></i> Aparência</h3>
        <p>${escaparHTML(item.descricao)}</p>
      </section>

      <section class="detail-section">
        <h3><i class="ti ti-history"></i> Registro conhecido</h3>
        <p>${escaparHTML(item.origemPublica)}</p>
      </section>

      <div class="master-locked">
        <i class="ti ti-lock"></i>
        <span>Existem informações ocultas neste registro. Ative o <strong>Modo Mestre</strong> no topo da página para revelá-las.</span>
      </div>

      <section class="detail-section master-secret">
        <h3><i class="ti ti-eye-off"></i> Segredo do Mestre</h3>
        <ul>
          <li><strong>Identificação:</strong> ${escaparHTML(item.mestre?.identificacao || '—')}</li>
          <li><strong>Propósito:</strong> ${escaparHTML(item.mestre?.proposito || '—')}</li>
          <li><strong>Manifestação:</strong> ${escaparHTML(item.mestre?.manifestacao || '—')}</li>
          <li><strong>Origem:</strong> ${escaparHTML(item.mestre?.origem || '—')}</li>
          <li><strong>Introdução sugerida:</strong> ${escaparHTML(item.mestre?.introducao || '—')}</li>
        </ul>
      </section>
    </div>
  `;

  modal.dataset.itemId = item.id;
  modal.style.display = 'flex';

  if (!manterScroll) {
    document.body.style.overflow = 'hidden';
    setTimeout(() => modal.querySelector('.modal-close')?.focus(), 0);
  }
}

function fecharDetalhes() {
  const modal = document.getElementById('itemModal');
  modal.style.display = 'none';
  modal.dataset.itemId = '';
  document.body.style.overflow = '';
}

function fecharModalNoFundo(event) {
  if (event.target.id === 'itemModal') fecharDetalhes();
}

document.addEventListener('keydown', event => {
  if (event.key === 'Escape') {
    const modal = document.getElementById('itemModal');
    if (modal && modal.style.display !== 'none') fecharDetalhes();
  }
});

// ── INICIALIZAÇÃO ────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  applyTheme();
  preencherFiltroTipos();
  atualizarEstatisticas();

  const masterModeInput = document.getElementById('masterMode');
  masterModeInput.checked = modoMestre;
  document.body.classList.toggle('master-mode', modoMestre);

  filtrarItens();
});