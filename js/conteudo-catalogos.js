(() => {
  const state = { tipo:'escola', editingId:null, entries:[] };

  const ICONS = [
    ['ti-wand','Varinha'],['ti-shield','Escudo'],['ti-eye','Olho'],['ti-portal','Portal'],
    ['ti-heart','Coração'],['ti-flame','Chama'],['ti-mask','Máscara'],['ti-skull','Caveira'],
    ['ti-transform','Transformação'],['ti-sword','Espada'],['ti-tool','Ferramenta'],
    ['ti-flask','Frasco'],['ti-backpack','Mochila'],['ti-box','Objeto']
  ];

  function esc(v='') {
    return String(v).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;')
      .replaceAll('"','&quot;').replaceAll("'",'&#039;');
  }

  function toastLocal(msg) {
    if (typeof toast === 'function') return toast(msg);
    const el = document.createElement('div');
    el.className = 'toast';
    el.textContent = msg;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 2200);
  }

  function optionsIcon(selected='') {
    return ICONS.map(([value,label]) =>
      `<option value="${value}" ${value===selected?'selected':''}>${label}</option>`
    ).join('');
  }

  async function carregar() {
    state.entries = state.tipo === 'escola'
      ? await RPGCatalogo.getSpellSchools()
      : await RPGCatalogo.getItemCategories();
    renderLista();
  }

  function labelTipo() {
    return state.tipo === 'escola' ? 'Escolas de Magia' : 'Classificações de Item';
  }

  function renderForm(entry=null) {
    const box = document.getElementById('taxonomyForm');
    if (!box) return;
    state.editingId = entry?.id || null;

    if (state.tipo === 'escola') {
      box.innerHTML = `
        <div class="taxonomy-form-title">${entry ? 'Editar escola' : 'Nova escola'}</div>
        <div class="mini-field"><label>Nome da escola</label><input id="taxLabel" value="${esc(entry?.label || '')}" placeholder="Ex: Hemomancia"></div>
        <div class="taxonomy-form-grid">
          <div class="mini-field"><label>Ícone</label><select id="taxIcon">${optionsIcon(entry?.icon || 'ti-wand')}</select></div>
          <div class="mini-field"><label>Cor</label><input id="taxColor" type="color" value="${esc(entry?.color || '#9d76cf')}"></div>
        </div>
      `;
    } else {
      box.innerHTML = `
        <div class="taxonomy-form-title">${entry ? 'Editar classificação' : 'Nova classificação'}</div>
        <div class="mini-field"><label>Nome</label><input id="taxLabel" value="${esc(entry?.label || '')}" placeholder="Ex: Ferramenta alquímica"></div>
        <div class="mini-field"><label>Nome no plural</label><input id="taxPlural" value="${esc(entry?.plural || '')}" placeholder="Ex: Ferramentas alquímicas"></div>
        <div class="mini-field"><label>Ícone</label><select id="taxIcon">${optionsIcon(entry?.icon || 'ti-box')}</select></div>
      `;
    }

    document.getElementById('taxonomySaveBtn').innerHTML = entry
      ? '<i class="ti ti-device-floppy"></i> Salvar alteração'
      : '<i class="ti ti-plus"></i> Adicionar';
    document.getElementById('taxonomyCancelBtn').style.display = entry ? '' : 'none';
  }

  function renderLista() {
    const list = document.getElementById('taxonomyList');
    const title = document.getElementById('taxonomyPanelTitle');
    if (!list || !title) return;
    title.textContent = labelTipo();

    document.getElementById('taxonomyTabSchool')?.classList.toggle('active', state.tipo === 'escola');
    document.getElementById('taxonomyTabItem')?.classList.toggle('active', state.tipo === 'item');

    list.innerHTML = state.entries.map(entry => {
      const origem = entry.baseOverride ? 'Base editada' : entry.custom ? 'Custom' : 'Base';
      const action = entry.baseOverride
        ? `<button class="taxonomy-icon-btn danger" onclick="restaurarTaxonomia('${esc(entry.id)}')" title="Restaurar padrão"><i class="ti ti-restore"></i></button>`
        : entry.custom
          ? `<button class="taxonomy-icon-btn danger" onclick="removerTaxonomia('${esc(entry.id)}')" title="Excluir"><i class="ti ti-trash"></i></button>`
          : '';
      const color = state.tipo === 'escola' ? `<span class="taxonomy-color" style="background:${esc(entry.color || '#9d76cf')}"></span>` : '';

      return `
        <div class="taxonomy-row">
          <span class="taxonomy-entry-icon">${color}<i class="ti ${esc(entry.icon || 'ti-box')}"></i></span>
          <div class="taxonomy-entry-copy">
            <strong>${esc(entry.label)}</strong>
            <small>${esc(entry.plural && state.tipo === 'item' ? entry.plural + ' · ' + origem : origem)}</small>
          </div>
          <div class="taxonomy-entry-actions">
            <button class="taxonomy-icon-btn" onclick="editarTaxonomia('${esc(entry.id)}')" title="Editar"><i class="ti ti-edit"></i></button>
            ${action}
          </div>
        </div>
      `;
    }).join('') || '<div class="taxonomy-empty">Nenhum registro.</div>';
  }

  async function trocarTipo(tipo) {
    state.tipo = tipo;
    state.editingId = null;
    renderForm();
    await carregar();
  }

  function editar(id) {
    const entry = state.entries.find(e => e.id === id);
    if (!entry) return;
    renderForm(entry);
    document.getElementById('taxonomyForm')?.scrollIntoView({ behavior:'smooth', block:'nearest' });
  }

  async function salvar() {
    const label = document.getElementById('taxLabel')?.value.trim();
    if (!label) {
      toastLocal('Informe um nome.');
      document.getElementById('taxLabel')?.focus();
      return;
    }

    const anterior = state.entries.find(e => e.id === state.editingId);
    if (state.tipo === 'escola') {
      RPGCatalogo.saveSpellSchool({
        id: state.editingId || undefined,
        label,
        icon: document.getElementById('taxIcon').value,
        color: document.getElementById('taxColor').value,
        baseOverride: Boolean(anterior && !anterior.custom) || Boolean(anterior?.baseOverride)
      });
      toastLocal(state.editingId ? 'Escola atualizada!' : 'Escola adicionada!');
    } else {
      RPGCatalogo.saveItemCategory({
        id: state.editingId || undefined,
        label,
        plural: document.getElementById('taxPlural')?.value.trim() || label,
        icon: document.getElementById('taxIcon').value,
        baseOverride: Boolean(anterior && !anterior.custom) || Boolean(anterior?.baseOverride)
      });
      toastLocal(state.editingId ? 'Classificação atualizada!' : 'Classificação adicionada!');
    }

    state.editingId = null;
    renderForm();
    await carregar();
  }

  async function remover(id, restaurar=false) {
    const entry = state.entries.find(e => e.id === id);
    if (!entry?.custom) return;
    const pergunta = restaurar
      ? `Restaurar “${entry.label}” para o padrão do sistema?`
      : `Excluir “${entry.label}”?`;
    if (!confirm(pergunta)) return;

    if (state.tipo === 'escola') RPGCatalogo.removeSpellSchool(id);
    else RPGCatalogo.removeItemCategory(id);

    if (state.editingId === id) {
      state.editingId = null;
      renderForm();
    }
    await carregar();
    toastLocal(restaurar ? 'Padrão restaurado.' : 'Registro removido.');
  }

  function cancelar() {
    state.editingId = null;
    renderForm();
  }

  function montar() {
    const target = document.getElementById('formAddConteudo');
    if (!target || document.getElementById('catalogTaxonomyManager')) return;

    target.insertAdjacentHTML('afterend', `
      <section class="add-form-card catalog-taxonomy-manager" id="catalogTaxonomyManager">
        <div class="sidebar-section-title">
          <span id="taxonomyPanelTitle">Escolas de Magia</span>
          <i class="ti ti-books"></i>
        </div>
        <p class="taxonomy-help">Catálogos globais do sistema. Alterações aqui aparecem nos Glossários e não dependem do preset ativo.</p>

        <div class="taxonomy-tabs">
          <button class="btn xs active" id="taxonomyTabSchool" onclick="trocarTaxonomia('escola')"><i class="ti ti-wand"></i> Escolas</button>
          <button class="btn xs" id="taxonomyTabItem" onclick="trocarTaxonomia('item')"><i class="ti ti-category"></i> Itens</button>
        </div>

        <div class="taxonomy-list" id="taxonomyList"></div>
        <div class="taxonomy-form" id="taxonomyForm"></div>

        <div class="taxonomy-form-actions">
          <button class="btn xs" id="taxonomyCancelBtn" style="display:none" onclick="cancelarTaxonomia()">Cancelar</button>
          <button class="btn xs primary" id="taxonomySaveBtn" onclick="salvarTaxonomia()"><i class="ti ti-plus"></i> Adicionar</button>
        </div>
      </section>
    `);

    renderForm();
    carregar();
  }

  window.trocarTaxonomia = trocarTipo;
  window.editarTaxonomia = editar;
  window.salvarTaxonomia = salvar;
  window.cancelarTaxonomia = cancelar;
  window.removerTaxonomia = id => remover(id, false);
  window.restaurarTaxonomia = id => remover(id, true);

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', montar);
  else montar();
})();