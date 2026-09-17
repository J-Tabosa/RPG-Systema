(function () {
  const VIEW_KEY = 'rpg_items_view';
  let modoVisualizacao = localStorage.getItem(VIEW_KEY) || 'lista';
  const renderCardsOriginal = renderizarItens;

  function valorDefesaDano(item) {
    const m = item.mecanica || {};
    if (item.categoria === 'armadura') {
      if (!m.caBase) return '—';
      const dex = m.bonusDestreza ? (m.limiteDestreza == null ? ' + DES' : ' + DES (máx. ' + m.limiteDestreza + ')') : '';
      return 'CA ' + m.caBase + dex;
    }
    if (item.categoria === 'arma') {
      return [m.dano, m.tipoDano].filter(Boolean).join(' ') || '—';
    }
    return resumoMecanica(item) || '—';
  }

  function renderItemLista(item) {
    const cor = corItem(item);
    const tags = (item.tags || []).slice(0, 3)
      .map(tag => '<span class="item-tag">' + escaparHTML(tag) + '</span>').join('');
    const rare = item.raridade ? '<span class="rarity-chip rarity-' + escaparHTML(item.raridade) + '">' + escaparHTML(RARITY_LABELS[item.raridade] || item.raridade) + '</span>' : '';
    const origem = item.custom ? 'Personalizado' : (item.origem || 'Base do sistema');
    const peso = Number(item.pesoKg) ? item.pesoKg + ' kg' : '—';

    return `
      <article class="item-list-row" style="--rarity-color:${cor}" onclick="abrirDetalhes('${escaparHTML(item.id)}')" tabindex="0" role="button"
        onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();abrirDetalhes('${escaparHTML(item.id)}')}">
        <div class="item-list-icon"><i class="ti ${CATEGORY_ICONS[item.categoria] || 'ti-box'}"></i></div>
        <div class="item-list-main">
          <div class="item-list-name-line">
            <h3>${escaparHTML(item.nome)}</h3>
            ${rare}
          </div>
          <p>${escaparHTML(item.descricao || 'Sem descrição.')}</p>
          <div class="item-list-tags">${tags}</div>
        </div>
        <div class="item-list-col">
          <small>Tipo</small>
          <strong>${escaparHTML(CATEGORY_LABELS[item.categoria] || item.categoria)}</strong>
          <span>${escaparHTML(item.subcategoria || '—')}</span>
        </div>
        <div class="item-list-col">
          <small>Defesa / Dano</small>
          <strong>${escaparHTML(valorDefesaDano(item))}</strong>
        </div>
        <div class="item-list-col">
          <small>Peso</small>
          <strong>${escaparHTML(peso)}</strong>
        </div>
        <div class="item-list-col item-list-origin">
          <small>Origem</small>
          <strong>${escaparHTML(origem)}</strong>
        </div>
        <div class="item-list-arrow"><i class="ti ti-chevron-right"></i></div>
      </article>
    `;
  }

  function atualizarBotoesVisualizacao() {
    document.getElementById('viewListBtn')?.classList.toggle('active', modoVisualizacao === 'lista');
    document.getElementById('viewCardBtn')?.classList.toggle('active', modoVisualizacao === 'cards');
  }

  window.trocarVisualizacao = function (modo) {
    if (modo !== 'lista' && modo !== 'cards') return;
    modoVisualizacao = modo;
    localStorage.setItem(VIEW_KEY, modo);
    atualizarBotoesVisualizacao();
    filtrarItens();
  };

  renderizarItens = function (lista) {
    const grid = document.getElementById('itemsGrid');
    const empty = document.getElementById('itemsEmpty');
    if (!grid || !empty) return;

    if (modoVisualizacao === 'cards') {
      grid.className = 'items-grid';
      renderCardsOriginal(lista);
      return;
    }

    if (!lista.length) {
      grid.className = 'items-list';
      grid.innerHTML = '';
      empty.style.display = '';
      return;
    }

    empty.style.display = 'none';
    grid.className = 'items-list';
    grid.innerHTML = lista.map(renderItemLista).join('');
  };

  function inserirControleVisualizacao() {
    const toolbar = document.querySelector('.items-toolbar');
    if (!toolbar || document.getElementById('viewListBtn')) return;

    const wrapper = document.createElement('div');
    wrapper.className = 'view-toggle';
    wrapper.setAttribute('aria-label', 'Modo de visualização');
    wrapper.innerHTML = `
      <button type="button" class="btn sm" id="viewListBtn" onclick="trocarVisualizacao('lista')" title="Visualização em lista">
        <i class="ti ti-list-details"></i><span>Lista</span>
      </button>
      <button type="button" class="btn sm" id="viewCardBtn" onclick="trocarVisualizacao('cards')" title="Visualização em cards">
        <i class="ti ti-layout-grid"></i><span>Cards</span>
      </button>
    `;

    const masterToggle = toolbar.querySelector('.master-toggle');
    toolbar.insertBefore(wrapper, masterToggle || null);
    atualizarBotoesVisualizacao();
  }

  document.addEventListener('DOMContentLoaded', inserirControleVisualizacao);
})();