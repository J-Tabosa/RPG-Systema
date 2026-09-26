(function () {
  const VIEW_KEY = 'rpg_spells_view';
  let modoVisualizacao = localStorage.getItem(VIEW_KEY) || 'lista';
  const renderCardsOriginal = renderizarMagias;

  function sourceLabel(magia) {
    if (magia.baseOverride) return 'Base editada';
    if (magia.custom) return 'Personalizada';
    return 'Base';
  }

  function renderMagiaLista(magia) {
    const cor = schoolColor(magia.escola);
    const area = RPGCatalogo.formatArea(magia.area);
    const tags = (magia.tags || []).slice(0, 3)
      .map(tag => '<span class="item-tag">' + escaparHTML(tag) + '</span>').join('');
    const extras = [
      magia.duracao?.concentracao ? '<span class="catalog-pill accent"><i class="ti ti-focus-2"></i> Concentração</span>' : '',
      magia.ritual ? '<span class="catalog-pill"><i class="ti ti-book"></i> Ritual</span>' : ''
    ].filter(Boolean).join('');

    return `
      <article class="spell-list-row" style="--spell-color:${cor}" onclick="abrirDetalhes('${escaparHTML(magia.id)}')" tabindex="0" role="button"
        onkeydown="if(event.target===this&&(event.key==='Enter'||event.key===' ')){event.preventDefault();abrirDetalhes('${escaparHTML(magia.id)}')}">
        <div class="spell-list-visual" aria-hidden="true">
          <i class="ti ${schoolIcon(magia.escola)}"></i>
          <span>${Number(magia.nivel)}</span>
        </div>

        <div class="spell-list-main">
          <div class="spell-list-title">
            <h3>${escaparHTML(magia.nome)}</h3>
            <span class="spell-school-chip">${escaparHTML(magia.escola || 'Sem escola')}</span>
          </div>
          <p>${escaparHTML(magia.descricao || 'Sem descrição.')}</p>
          <div class="spell-list-tags">${extras}${tags}</div>
        </div>

        <div class="spell-list-col">
          <small>Nível</small>
          <strong>${escaparHTML(nivelLabel(magia.nivel))}</strong>
          <span>${escaparHTML(RPGCatalogo.formatComponents(magia.componentes))}</span>
        </div>

        <div class="spell-list-col">
          <small>Conjuração / alcance</small>
          <strong>${escaparHTML(RPGCatalogo.formatCasting(magia.conjuracao))}</strong>
          <span>${escaparHTML(RPGCatalogo.formatRange(magia.alcance))}</span>
        </div>

        <div class="spell-list-col">
          <small>Área</small>
          <strong>${escaparHTML(area)}</strong>
          <span>${escaparHTML(RPGCatalogo.formatDuration(magia.duracao))}</span>
        </div>

        <div class="spell-list-col spell-list-source">
          <small>Origem</small>
          <strong>${escaparHTML(sourceLabel(magia))}</strong>
          <span>${escaparHTML(magia.origem || '—')}</span>
        </div>

        <button class="spell-list-add" type="button" onclick="event.stopPropagation();abrirSeletorFicha('${escaparHTML(magia.id)}')" onkeydown="event.stopPropagation()" title="Adicionar ${escaparHTML(magia.nome)} a uma ficha" aria-label="Adicionar ${escaparHTML(magia.nome)} a uma ficha"><i class="ti ti-bookmark-plus"></i></button>
      </article>
    `;
  }

  function atualizarBotoesVisualizacao() {
    document.getElementById('spellViewListBtn')?.classList.toggle('active', modoVisualizacao === 'lista');
    document.getElementById('spellViewCardBtn')?.classList.toggle('active', modoVisualizacao === 'cards');
  }

  window.trocarVisualizacaoMagias = function (modo) {
    if (modo !== 'lista' && modo !== 'cards') return;
    modoVisualizacao = modo;
    localStorage.setItem(VIEW_KEY, modo);
    atualizarBotoesVisualizacao();
    filtrarMagias();
  };

  renderizarMagias = function (lista) {
    const grid = document.getElementById('spellsGrid');
    const empty = document.getElementById('spellsEmpty');
    if (!grid || !empty) return;

    if (modoVisualizacao === 'cards') {
      grid.className = 'spells-grid';
      renderCardsOriginal(lista);
      return;
    }

    grid.className = 'spells-list';
    if (!lista.length) {
      grid.innerHTML = '';
      empty.style.display = '';
      return;
    }

    empty.style.display = 'none';
    grid.innerHTML = lista.map(renderMagiaLista).join('');
  };

  function inserirControle() {
    const toolbar = document.querySelector('.items-toolbar');
    if (!toolbar || document.getElementById('spellViewListBtn')) return;

    const wrapper = document.createElement('div');
    wrapper.className = 'view-toggle spell-view-toggle';
    wrapper.setAttribute('aria-label', 'Modo de visualização das magias');
    wrapper.innerHTML = `
      <button type="button" class="btn sm" id="spellViewListBtn" onclick="trocarVisualizacaoMagias('lista')" title="Visualização em lista">
        <i class="ti ti-list-details"></i><span>Lista</span>
      </button>
      <button type="button" class="btn sm" id="spellViewCardBtn" onclick="trocarVisualizacaoMagias('cards')" title="Visualização em cards">
        <i class="ti ti-layout-grid"></i><span>Cards</span>
      </button>
    `;

    const limpar = [...toolbar.querySelectorAll('button')].find(btn => btn.textContent.includes('Limpar'));
    toolbar.insertBefore(wrapper, limpar || null);
    atualizarBotoesVisualizacao();
  }

  document.addEventListener('DOMContentLoaded', inserirControle);
})();
