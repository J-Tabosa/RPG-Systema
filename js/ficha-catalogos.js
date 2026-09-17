(() => {
  'use strict';

  const state = {
    tipo: null,
    busca: '',
    filtro: 'todos',
    itens: [],
    magias: []
  };

  function escaparHTML(valor = '') {
    return String(valor)
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }

  function normalizar(valor = '') {
    return String(valor)
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();
  }

  function clone(valor) {
    if (window.RPGCatalogo?.clone) return window.RPGCatalogo.clone(valor);
    return JSON.parse(JSON.stringify(valor));
  }

  function avisar(mensagem) {
    if (typeof toast === 'function') toast(mensagem);
  }

  function garantirCatalogo() {
    if (!window.RPGCatalogo) {
      avisar('Não foi possível carregar o catálogo do sistema.');
      return false;
    }
    return true;
  }

  function getFichaSegura() {
    try {
      return typeof getFicha === 'function' ? getFicha() : null;
    } catch (_) {
      return null;
    }
  }

  function persistirFichas() {
    try {
      if (typeof save === 'function' && typeof fichas !== 'undefined') save(fichas);
    } catch (_) {}
  }

  function injetarEstilos() {
    if (document.getElementById('fichaCatalogosStyle')) return;
    const style = document.createElement('style');
    style.id = 'fichaCatalogosStyle';
    style.textContent = `
      .catalog-import-btn{white-space:nowrap}
      .catalog-origin-chip{display:inline-flex;align-items:center;gap:4px;margin-left:5px;padding:2px 6px;border:1px solid var(--gold);border-radius:999px;color:var(--gold);font-family:'Cinzel',serif;font-size:7px;letter-spacing:.5px;text-transform:uppercase;vertical-align:middle}
      .catalog-picker-modal{max-width:900px;width:min(900px,94vw);padding:0;overflow:hidden}
      .catalog-picker-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;padding:18px 20px;border-bottom:1px solid var(--border);background:var(--surface)}
      .catalog-picker-head h3{margin:2px 0 0;color:var(--gold2)}
      .catalog-picker-sub{font-size:12px;color:var(--muted);margin-top:4px}
      .catalog-picker-toolbar{display:grid;grid-template-columns:minmax(0,1fr) 190px;gap:8px;padding:12px 16px;border-bottom:1px solid var(--border)}
      .catalog-picker-toolbar input,.catalog-picker-toolbar select{width:100%;height:36px;background:var(--card);border:1px solid var(--border);border-radius:5px;color:var(--text);padding:6px 9px;font-family:'Crimson Text',serif}
      .catalog-picker-list{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:9px;padding:14px 16px;max-height:62vh;overflow:auto}
      .catalog-pick-card{display:flex;flex-direction:column;gap:7px;background:var(--card);border:1px solid var(--border);border-radius:7px;padding:12px;min-width:0}
      .catalog-pick-card.imported{opacity:.62}
      .catalog-pick-title{display:flex;align-items:flex-start;justify-content:space-between;gap:8px}
      .catalog-pick-title strong{color:var(--text);font-family:'Cinzel',serif;font-size:11px}
      .catalog-pick-meta{color:var(--muted);font-size:11px;line-height:1.4}
      .catalog-pick-desc{color:var(--text);font-size:12px;line-height:1.4;flex:1}
      .catalog-pick-actions{display:flex;align-items:center;justify-content:space-between;gap:8px;padding-top:7px;border-top:1px solid var(--border)}
      .catalog-pick-source{font-size:9px;color:var(--muted);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
      .catalog-picker-empty{grid-column:1/-1;text-align:center;color:var(--muted);padding:38px 12px}
      .catalog-ficha-nav{display:inline-flex}
      @media(max-width:760px){.catalog-picker-list{grid-template-columns:1fr}.catalog-picker-toolbar{grid-template-columns:1fr}.catalog-picker-modal{width:96vw}.catalog-origin-chip{display:none}}
    `;
    document.head.appendChild(style);
  }

  function criarModal() {
    if (document.getElementById('mCatalogImport')) return;
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.id = 'mCatalogImport';
    overlay.style.display = 'none';
    overlay.innerHTML = `
      <div class="modal catalog-picker-modal" role="dialog" aria-modal="true" aria-labelledby="catalogPickerTitle">
        <div class="catalog-picker-head">
          <div>
            <div style="font-family:'Cinzel',serif;font-size:8px;letter-spacing:1px;color:var(--gold);text-transform:uppercase">Biblioteca do Sistema</div>
            <h3 id="catalogPickerTitle">Importar do Glossário</h3>
            <div class="catalog-picker-sub" id="catalogPickerSub"></div>
          </div>
          <button class="btn xs text" onclick="fecharImportadorCatalogo()" aria-label="Fechar"><i class="ti ti-x"></i></button>
        </div>
        <div class="catalog-picker-toolbar">
          <input id="catalogPickerSearch" type="search" placeholder="Buscar..." autocomplete="off">
          <select id="catalogPickerFilter"></select>
        </div>
        <div class="catalog-picker-list" id="catalogPickerList"></div>
      </div>`;
    overlay.addEventListener('click', e => {
      if (e.target === overlay) fecharImportadorCatalogo();
    });
    document.body.appendChild(overlay);

    document.getElementById('catalogPickerSearch').addEventListener('input', e => {
      state.busca = e.target.value;
      renderizarCatalogo();
    });
    document.getElementById('catalogPickerFilter').addEventListener('change', e => {
      state.filtro = e.target.value;
      renderizarCatalogo();
    });
  }

  async function carregarCatalogos() {
    if (!garantirCatalogo()) return;
    try {
      const [itens, magias] = await Promise.all([
        RPGCatalogo.getItens(),
        RPGCatalogo.getMagias()
      ]);
      state.itens = itens;
      state.magias = magias;
    } catch (erro) {
      console.error('Erro ao carregar glossários na ficha:', erro);
      avisar('Erro ao carregar os glossários.');
    }
  }

  function preencherFiltro() {
    const select = document.getElementById('catalogPickerFilter');
    if (!select) return;
    if (state.tipo === 'item') {
      const categorias = [...new Set(state.itens.map(x => x.categoria).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'pt-BR'));
      select.innerHTML = '<option value="todos">Todas as categorias</option>' + categorias.map(cat => `<option value="${escaparHTML(cat)}">${escaparHTML(labelCategoriaItem(cat))}</option>`).join('');
    } else {
      const niveis = [...new Set(state.magias.map(x => Number(x.nivel) || 0))].sort((a, b) => a - b);
      select.innerHTML = '<option value="todos">Todos os níveis</option>' + niveis.map(n => `<option value="${n}">${n === 0 ? 'Truques' : `Nível ${n}`}</option>`).join('');
    }
    select.value = state.filtro;
  }

  function labelCategoriaItem(cat) {
    return ({
      arma: 'Armas', armadura: 'Armaduras', equipamento: 'Equipamentos',
      utilizavel: 'Objetos utilizáveis', magico: 'Itens mágicos'
    })[cat] || cat;
  }

  async function abrirImportadorCatalogo(tipo) {
    const ficha = getFichaSegura();
    if (!ficha) {
      avisar('Selecione ou crie uma ficha antes de importar.');
      return;
    }
    state.tipo = tipo;
    state.busca = '';
    state.filtro = 'todos';
    await carregarCatalogos();
    criarModal();

    const isItem = tipo === 'item';
    document.getElementById('catalogPickerTitle').textContent = isItem ? 'Importar Item do Glossário' : 'Importar Magia do Glossário';
    document.getElementById('catalogPickerSub').textContent = isItem
      ? 'Selecione uma arma, armadura, equipamento, objeto utilizável ou item mágico para copiar para esta ficha.'
      : 'Selecione uma magia. A ficha recebe uma cópia compatível e preserva os dados estruturados para futuras ferramentas de combate.';
    const search = document.getElementById('catalogPickerSearch');
    search.value = '';
    search.placeholder = isItem ? 'Buscar item, categoria, propriedade...' : 'Buscar magia, escola, classe, efeito...';
    preencherFiltro();
    renderizarCatalogo();
    document.getElementById('mCatalogImport').style.display = 'flex';
    document.body.style.overflow = 'hidden';
    setTimeout(() => search.focus(), 0);
  }

  function fecharImportadorCatalogo() {
    const modal = document.getElementById('mCatalogImport');
    if (modal) modal.style.display = 'none';
    document.body.style.overflow = '';
  }

  function itemJaImportado(item) {
    const ficha = getFichaSegura();
    return Boolean(ficha?.equipment?.some(eq => eq.catalogId === item.id));
  }

  function magiaJaImportada(magia) {
    const ficha = getFichaSegura();
    return Boolean(ficha?.spells?.some(sp => sp.catalogId === magia.id));
  }

  function renderizarCatalogo() {
    const listEl = document.getElementById('catalogPickerList');
    if (!listEl) return;
    const busca = normalizar(state.busca);
    const isItem = state.tipo === 'item';
    const fonte = isItem ? state.itens : state.magias;

    const lista = fonte.filter(entry => {
      if (isItem && state.filtro !== 'todos' && entry.categoria !== state.filtro) return false;
      if (!isItem && state.filtro !== 'todos' && String(Number(entry.nivel) || 0) !== state.filtro) return false;
      if (!busca) return true;
      const texto = isItem
        ? [entry.nome, entry.categoria, entry.subcategoria, entry.descricao, entry.origem, ...(entry.tags || []), JSON.stringify(entry.mecanica || {})].join(' ')
        : [entry.nome, entry.escola, entry.descricao, entry.origem, ...(entry.classes || []), ...(entry.tags || []), JSON.stringify(entry.resolucao || {})].join(' ');
      return normalizar(texto).includes(busca);
    });

    if (!lista.length) {
      listEl.innerHTML = '<div class="catalog-picker-empty"><i class="ti ti-search-off" style="font-size:28px;display:block;margin-bottom:7px"></i>Nenhum registro encontrado.</div>';
      return;
    }

    listEl.innerHTML = lista.map(entry => {
      const imported = isItem ? itemJaImportado(entry) : magiaJaImportada(entry);
      const meta = isItem
        ? `${labelCategoriaItem(entry.categoria)}${entry.subcategoria ? ` · ${entry.subcategoria}` : ''}${entry.pesoKg ? ` · ${entry.pesoKg} kg` : ''}`
        : `${Number(entry.nivel) === 0 ? 'Truque' : `Nível ${entry.nivel}`} · ${entry.escola || 'Sem escola'} · ${RPGCatalogo.formatRange(entry.alcance)}`;
      const extra = isItem
        ? resumirMecanicaItem(entry)
        : `${RPGCatalogo.formatCasting(entry.conjuracao)} · ${RPGCatalogo.formatArea(entry.area)}`;
      return `
        <article class="catalog-pick-card ${imported ? 'imported' : ''}">
          <div class="catalog-pick-title">
            <strong>${escaparHTML(entry.nome)}</strong>
            ${entry.custom ? '<span class="catalog-origin-chip">Personalizado</span>' : ''}
          </div>
          <div class="catalog-pick-meta">${escaparHTML(meta)}</div>
          ${extra ? `<div class="catalog-pick-meta">${escaparHTML(extra)}</div>` : ''}
          <div class="catalog-pick-desc">${escaparHTML(entry.descricao || 'Sem descrição.')}</div>
          <div class="catalog-pick-actions">
            <span class="catalog-pick-source">${escaparHTML(entry.origem || 'Glossário')}</span>
            <button class="btn xs ${imported && !isItem ? '' : 'primary'}" ${imported && !isItem ? 'disabled' : ''} onclick="importarRegistroCatalogo('${isItem ? 'item' : 'magia'}','${escaparHTML(entry.id)}')">
              <i class="ti ${imported && !isItem ? 'ti-check' : 'ti-download'}"></i> ${imported ? (isItem ? 'Adicionar +1' : 'Já importada') : 'Importar'}
            </button>
          </div>
        </article>`;
    }).join('');
  }

  function resumirMecanicaItem(item) {
    const m = item.mecanica || {};
    const partes = [];
    if (m.dano) partes.push(`Dano ${m.dano}${m.tipoDano ? ` ${m.tipoDano}` : ''}`);
    if (m.caBase) partes.push(`CA ${m.caBase}${m.bonusDestreza ? ' + DES' : ''}`);
    if (m.usos) partes.push(`${m.usos} uso(s)`);
    if (m.cargas) partes.push(`${m.cargas} cargas`);
    if (m.efeito) partes.push(m.efeito);
    return partes.join(' · ');
  }

  function descricaoItemParaFicha(item) {
    const partes = [item.descricao || ''];
    const mecanica = resumirMecanicaItem(item);
    if (mecanica) partes.push(mecanica);
    if (item.custo && item.custo !== '—') partes.push(`Custo: ${item.custo}`);
    if (item.raridade) partes.push(`Raridade: ${item.raridade}`);
    if (item.sintonizacao) partes.push('Requer sintonização');
    return partes.filter(Boolean).join(' | ');
  }

  function categoriaFicha(item) {
    if (item.categoria === 'utilizavel') return 'consumivel';
    if (['arma', 'armadura', 'equipamento', 'magico'].includes(item.categoria)) return 'equipamento';
    return 'item';
  }

  async function importarRegistroCatalogo(tipo, id) {
    if (!garantirCatalogo()) return;
    const ficha = getFichaSegura();
    if (!ficha) return;

    if (tipo === 'item') {
      const item = state.itens.find(x => x.id === id);
      if (!item) return;
      const existente = ficha.equipment?.find(eq => eq.catalogId === id);
      if (existente) {
        upd(f => {
          const eq = f.equipment.find(x => x.catalogId === id);
          if (eq) eq.qty = (parseInt(eq.qty) || 1) + 1;
        });
        avisar(`${item.nome}: quantidade aumentada.`);
      } else {
        const novo = {
          name: item.nome,
          cat: categoriaFicha(item),
          weight: Number(item.pesoKg) || 0,
          qty: 1,
          desc: descricaoItemParaFicha(item),
          catalogId: item.id,
          catalogCategory: item.categoria,
          catalogData: clone(item)
        };
        upd(f => {
          if (!f.equipment) f.equipment = [];
          f.equipment.push(novo);
        });
        avisar(`${item.nome} importado para a ficha!`);
      }
    } else {
      const magia = state.magias.find(x => x.id === id);
      if (!magia || magiaJaImportada(magia)) return;
      const nova = {
        name: magia.nome,
        level: Number(magia.nivel) || 0,
        school: magia.escola || '',
        cast: RPGCatalogo.formatCasting(magia.conjuracao),
        range: RPGCatalogo.formatRange(magia.alcance),
        aoe: RPGCatalogo.formatArea(magia.area),
        duration: RPGCatalogo.formatDuration(magia.duracao),
        desc: magia.descricao || '',
        catalogId: magia.id,
        structured: clone(magia),
        geometry: clone(magia.area || { forma: 'nenhuma' }),
        rangeData: clone(magia.alcance || {})
      };
      upd(f => {
        if (!f.spells) f.spells = [];
        f.spells.push(nova);
        f.spells.sort((a, b) => (Number(a.level) || 0) - (Number(b.level) || 0));
      });
      avisar(`${magia.nome} importada para a ficha!`);
    }

    await chamarRenderEditor();
    renderizarCatalogo();
  }

  async function chamarRenderEditor() {
    if (typeof renderEditor === 'function') await renderEditor();
  }

  function injetarBotoes() {
    const ficha = getFichaSegura();
    if (!ficha) return;
    const editor = document.getElementById('editor');
    if (!editor) return;

    editor.querySelectorAll('.sec').forEach(sec => {
      const titulo = sec.querySelector('.sec-title h2');
      const head = sec.querySelector('.sec-head');
      if (!titulo || !head) return;
      const actions = head.children.length > 1 ? head.children[head.children.length - 1] : null;

      if (titulo.textContent.trim() === 'Magias Conhecidas' && actions) {
        if (!actions.querySelector('[data-import-spell]')) {
          const btn = document.createElement('button');
          btn.className = 'btn xs catalog-import-btn print-hidden';
          btn.dataset.importSpell = '1';
          btn.innerHTML = '<i class="ti ti-books"></i> Importar do Glossário';
          btn.onclick = () => abrirImportadorCatalogo('magia');
          actions.insertBefore(btn, actions.lastElementChild || null);
        }
      }

      if (titulo.textContent.trim() === 'Equipamentos & Itens' && actions) {
        if (!actions.querySelector('[data-import-item]')) {
          const btn = document.createElement('button');
          btn.className = 'btn xs catalog-import-btn print-hidden';
          btn.dataset.importItem = '1';
          btn.innerHTML = '<i class="ti ti-books"></i> Importar do Glossário';
          btn.onclick = () => abrirImportadorCatalogo('item');
          actions.insertBefore(btn, actions.lastElementChild || null);
        }
      }
    });

    (ficha.equipment || []).forEach((eq, index) => {
      if (!eq.catalogId) return;
      const row = document.getElementById(`eqitem_${index}`);
      const nameRow = row?.querySelector('.equip-name-row');
      if (nameRow && !nameRow.querySelector('.catalog-origin-chip')) {
        nameRow.insertAdjacentHTML('beforeend', `<span class="catalog-origin-chip"><i class="ti ti-books"></i> ${escaparHTML(labelCategoriaItem(eq.catalogCategory || 'item'))}</span>`);
      }
    });

    (ficha.spells || []).forEach((sp, index) => {
      if (!sp.catalogId) return;
      const row = document.getElementById(`spitem_${index}`);
      const name = row?.querySelector('.spell-item-name');
      if (name && !name.querySelector('.catalog-origin-chip')) {
        name.insertAdjacentHTML('beforeend', '<span class="catalog-origin-chip"><i class="ti ti-books"></i> Glossário</span>');
      }
    });
  }

  function injetarNavegacao() {
    const headerActions = document.querySelector('.header-actions');
    const themeWrap = document.getElementById('themeMenuWrap');
    if (headerActions && themeWrap && !headerActions.querySelector('[data-catalog-nav]')) {
      const wrap = document.createElement('span');
      wrap.dataset.catalogNav = '1';
      wrap.style.display = 'contents';
      wrap.innerHTML = `
        <a href="./itens.html" class="nav-link catalog-ficha-nav"><i class="ti ti-backpack"></i> Itens</a>
        <a href="./magias.html" class="nav-link catalog-ficha-nav"><i class="ti ti-sparkles"></i> Magias</a>`;
      headerActions.insertBefore(wrap, themeWrap);
    }

    const mobile = document.getElementById('mobNav');
    if (mobile && !mobile.querySelector('[data-catalog-nav-mobile]')) {
      mobile.insertAdjacentHTML('beforeend', `
        <a href="./itens.html" class="nav-link" data-catalog-nav-mobile onclick="closeMobMenu()"><i class="ti ti-backpack"></i> Glossário de Itens</a>
        <a href="./magias.html" class="nav-link" data-catalog-nav-mobile onclick="closeMobMenu()"><i class="ti ti-sparkles"></i> Glossário de Magias</a>`);
    }
  }

  function envolverRenderEditor() {
    if (typeof renderEditor !== 'function' || renderEditor.__catalogWrapped) return;
    const original = renderEditor;
    const wrapped = async function(...args) {
      const result = await original.apply(this, args);
      injetarBotoes();
      return result;
    };
    wrapped.__catalogWrapped = true;
    renderEditor = wrapped;
  }

  function envolverEdicaoMagia() {
    if (typeof confirmSpell !== 'function' || confirmSpell.__catalogWrapped) return;
    const original = confirmSpell;
    const wrapped = function(...args) {
      const fichaAntes = getFichaSegura();
      const indice = typeof editingSpell !== 'undefined' ? editingSpell : null;
      const anterior = indice !== null && fichaAntes?.spells?.[indice] ? clone(fichaAntes.spells[indice]) : null;
      const nomeNovo = document.getElementById('spName')?.value.trim() || '';
      const nivelNovo = Number(document.getElementById('spLevel')?.value || 0);
      const escolaNova = document.getElementById('spSchool')?.value.trim() || '';
      const result = original.apply(this, args);

      if (anterior?.catalogId) {
        const fichaDepois = getFichaSegura();
        const candidato = fichaDepois?.spells?.find(sp =>
          !sp.catalogId && sp.name === nomeNovo && Number(sp.level || 0) === nivelNovo && (sp.school || '') === escolaNova
        );
        if (candidato) {
          candidato.catalogId = anterior.catalogId;
          candidato.structured = clone(anterior.structured || anterior.catalogData || {});
          candidato.geometry = clone(anterior.geometry || anterior.structured?.area || { forma: 'nenhuma' });
          candidato.rangeData = clone(anterior.rangeData || anterior.structured?.alcance || {});
          persistirFichas();
          chamarRenderEditor();
        }
      }
      return result;
    };
    wrapped.__catalogWrapped = true;
    confirmSpell = wrapped;
  }

  function envolverEdicaoEquipamento() {
    if (typeof confirmEquip !== 'function' || confirmEquip.__catalogWrapped) return;
    const original = confirmEquip;
    const wrapped = function(...args) {
      const fichaAntes = getFichaSegura();
      const indice = typeof editingEquip !== 'undefined' ? editingEquip : null;
      const anterior = indice !== null && fichaAntes?.equipment?.[indice] ? clone(fichaAntes.equipment[indice]) : null;
      const nomeNovo = document.getElementById('eqName')?.value.trim() || '';
      const result = original.apply(this, args);

      if (anterior?.catalogId) {
        const fichaDepois = getFichaSegura();
        const candidato = fichaDepois?.equipment?.find(eq => !eq.catalogId && eq.name === nomeNovo);
        if (candidato) {
          candidato.catalogId = anterior.catalogId;
          candidato.catalogCategory = anterior.catalogCategory;
          candidato.catalogData = clone(anterior.catalogData || {});
          persistirFichas();
          chamarRenderEditor();
        }
      }
      return result;
    };
    wrapped.__catalogWrapped = true;
    confirmEquip = wrapped;
  }

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && document.getElementById('mCatalogImport')?.style.display !== 'none') {
      fecharImportadorCatalogo();
    }
  });

  window.abrirImportadorCatalogo = abrirImportadorCatalogo;
  window.fecharImportadorCatalogo = fecharImportadorCatalogo;
  window.importarRegistroCatalogo = importarRegistroCatalogo;

  function init() {
    injetarEstilos();
    criarModal();
    injetarNavegacao();
    envolverRenderEditor();
    envolverEdicaoMagia();
    envolverEdicaoEquipamento();
    carregarCatalogos();
    setTimeout(injetarBotoes, 0);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
