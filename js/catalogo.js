(() => {
  const ITEM_KEY = 'rpg_catalog_items_custom_v1';
  const SPELL_KEY = 'rpg_catalog_spells_custom_v1';
  const SPELL_SCHOOL_KEY = 'rpg_catalog_spell_schools_v1';
  const ITEM_CATEGORY_KEY = 'rpg_catalog_item_categories_v1';

  const scriptUrl = document.currentScript?.src || window.location.href;
  const itemUrl = new URL('../data/itens.json', scriptUrl).href;
  const spellUrl = new URL('../data/magias.json', scriptUrl).href;

  const BASE_SCHOOLS = [
    { id:'abjuracao', label:'Abjuração', icon:'ti-shield', color:'#6f8fb3' },
    { id:'adivinhacao', label:'Adivinhação', icon:'ti-eye', color:'#c6a15b' },
    { id:'conjuracao', label:'Conjuração', icon:'ti-portal', color:'#65a67a' },
    { id:'encantamento', label:'Encantamento', icon:'ti-heart', color:'#c978b9' },
    { id:'evocacao', label:'Evocação', icon:'ti-flame', color:'#d46b55' },
    { id:'ilusao', label:'Ilusão', icon:'ti-mask', color:'#8f78c9' },
    { id:'necromancia', label:'Necromancia', icon:'ti-skull', color:'#758b68' },
    { id:'transmutacao', label:'Transmutação', icon:'ti-transform', color:'#c18b54' }
  ];

  const BASE_ITEM_CATEGORIES = [
    { id:'arma', label:'Arma', plural:'Armas', icon:'ti-sword' },
    { id:'armadura', label:'Armadura', plural:'Armaduras', icon:'ti-shield' },
    { id:'equipamento', label:'Equipamento', plural:'Equipamentos', icon:'ti-tool' },
    { id:'utilizavel', label:'Utilizável', plural:'Utilizáveis', icon:'ti-flask' },
    { id:'magico', label:'Item mágico', plural:'Itens mágicos', icon:'ti-wand' }
  ];

  const clone = value => JSON.parse(JSON.stringify(value));
  const uid = prefix => `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  const slug = value => String(value || '')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

  function readLocal(key) {
    try {
      const parsed = JSON.parse(localStorage.getItem(key));
      return Array.isArray(parsed) ? parsed : [];
    } catch (_) {
      return [];
    }
  }

  function writeLocal(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }

  function unwrapCollection(data, collectionKey = '') {
    if (Array.isArray(data)) return data;
    if (collectionKey && Array.isArray(data?.[collectionKey])) return data[collectionKey];
    if (Array.isArray(data?.spells)) return data.spells;
    if (Array.isArray(data?.magias)) return data.magias;
    if (Array.isArray(data?.items)) return data.items;
    if (Array.isArray(data?.itens)) return data.itens;
    return [];
  }

  async function readBase(url, collectionKey = '') {
    const response = await fetch(url, { cache: 'no-cache' });
    if (!response.ok) throw new Error(`Falha ao carregar catálogo (${response.status}).`);
    const data = await response.json();
    return unwrapCollection(data, collectionKey);
  }

  function mergeCatalog(base, custom) {
    const map = new Map();
    const baseIds = new Set(base.map(entry => entry.id));
    base.forEach(entry => map.set(entry.id, { ...clone(entry), custom: false, baseOverride: false }));
    custom.forEach(entry => map.set(entry.id, {
      ...clone(entry),
      custom: true,
      baseOverride: baseIds.has(entry.id) || Boolean(entry.baseOverride)
    }));
    return [...map.values()];
  }

  function mergeTaxonomy(base, custom) {
    const map = new Map();
    const baseIds = new Set(base.map(entry => entry.id));
    base.forEach(entry => map.set(entry.id, { ...clone(entry), custom:false, baseOverride:false }));
    custom.forEach(entry => map.set(entry.id, {
      ...clone(entry),
      custom:true,
      baseOverride:baseIds.has(entry.id) || Boolean(entry.baseOverride)
    }));
    return [...map.values()];
  }

  async function getItens() {
    const [base, custom] = await Promise.all([readBase(itemUrl, 'items'), Promise.resolve(readLocal(ITEM_KEY))]);
    return mergeCatalog(base, custom);
  }

  async function getMagias() {
    const [base, custom] = await Promise.all([readBase(spellUrl, 'spells'), Promise.resolve(readLocal(SPELL_KEY))]);
    return mergeCatalog(base, custom);
  }

  async function getSpellSchools() {
    return mergeTaxonomy(BASE_SCHOOLS, readLocal(SPELL_SCHOOL_KEY))
      .sort((a,b) => a.label.localeCompare(b.label, 'pt-BR'));
  }

  async function getItemCategories() {
    return mergeTaxonomy(BASE_ITEM_CATEGORIES, readLocal(ITEM_CATEGORY_KEY))
      .sort((a,b) => (a.plural || a.label).localeCompare((b.plural || b.label), 'pt-BR'));
  }

  function saveCustom(key, prefix, entry) {
    const list = readLocal(key);
    const now = new Date().toISOString();
    const normalized = clone(entry);
    normalized.id = normalized.id || uid(prefix);
    normalized.custom = true;
    normalized.atualizadoEm = now;
    if (!normalized.criadoEm) normalized.criadoEm = now;

    const index = list.findIndex(item => item.id === normalized.id);
    if (index >= 0) list[index] = normalized;
    else list.push(normalized);
    writeLocal(key, list);
    return clone(normalized);
  }

  function saveTaxonomy(key, prefix, entry) {
    const normalized = clone(entry);
    normalized.label = String(normalized.label || '').trim();
    if (!normalized.label) throw new Error('Nome obrigatório.');
    normalized.id = normalized.id || slug(normalized.label) || uid(prefix);
    return saveCustom(key, prefix, normalized);
  }

  function removeCustom(key, id) {
    const list = readLocal(key);
    const next = list.filter(item => item.id !== id);
    if (next.length === list.length) return false;
    writeLocal(key, next);
    return true;
  }

  function saveItem(entry) { return saveCustom(ITEM_KEY, 'item', entry); }
  function saveSpell(entry) { return saveCustom(SPELL_KEY, 'magia', entry); }

  function spellSources(entry = {}) {
    if (Array.isArray(entry.fontes) && entry.fontes.length) {
      return [...new Set(entry.fontes.map(v => String(v).trim()).filter(Boolean))];
    }
    if (entry.origem) {
      return String(entry.origem)
        .split('·')
        .map(v => v.trim())
        .filter(Boolean);
    }
    return [];
  }

  function spellIdentity(entry = {}) {
    const nome = slug(entry.nome || '');
    const nivel = Math.max(0, Math.min(9, Number(entry.nivel) || 0));
    const fonte = slug(spellSources(entry)[0] || '');
    return `${nome}|${nivel}|${fonte}`;
  }

  function spellNameLevelIdentity(entry = {}) {
    const nome = slug(entry.nome || '');
    const nivel = Math.max(0, Math.min(9, Number(entry.nivel) || 0));
    return `${nome}|${nivel}`;
  }

  function uniqueIndex(entries, keyFn, valueFn = value => value) {
    const map = new Map();
    const duplicated = new Set();
    entries.forEach((entry, index) => {
      const key = keyFn(entry);
      if (!key) return;
      if (map.has(key)) duplicated.add(key);
      else map.set(key, valueFn(entry, index));
    });
    duplicated.forEach(key => map.delete(key));
    return map;
  }

  function normalizeImportedSpells(payload) {
    const source = Array.isArray(payload)
      ? payload
      : Array.isArray(payload?.spells)
        ? payload.spells
        : Array.isArray(payload?.magias)
          ? payload.magias
          : [];

    return source
      .filter(entry => entry && typeof entry === 'object' && String(entry.nome || '').trim())
      .map(entry => {
        const normalized = clone(entry);
        normalized.nome = String(normalized.nome).trim();
        normalized.nivel = Math.max(0, Math.min(9, Number(normalized.nivel) || 0));
        normalized.classes = Array.isArray(normalized.classes)
          ? [...new Set(normalized.classes.map(v => String(v).trim()).filter(Boolean))]
          : [];
        normalized.fontes = Array.isArray(normalized.fontes)
          ? [...new Set(normalized.fontes.map(v => String(v).trim()).filter(Boolean))]
          : (normalized.origem ? spellSources(normalized) : ['Importado']);
        normalized.origem = normalized.origem || normalized.fontes.join(' · ');
        normalized.tags = Array.isArray(normalized.tags)
          ? [...new Set(normalized.tags.map(v => String(v).trim()).filter(Boolean))]
          : [];

        if (!normalized.id) {
          const baseId = slug(normalized.nome) || uid('magia');
          const fonteId = slug(normalized.fontes[0] || '');
          normalized.id = fonteId
            ? `${baseId}-${fonteId}-n${normalized.nivel}`
            : `${baseId}-n${normalized.nivel}`;
        }
        return normalized;
      });
  }

  async function importSpells(payload) {
    const incoming = normalizeImportedSpells(payload);
    if (!incoming.length) return { imported: 0, updated: 0, total: 0 };

    const [base, list] = await Promise.all([
      readBase(spellUrl, 'spells'),
      Promise.resolve(readLocal(SPELL_KEY))
    ]);

    const baseById = new Map(base.map(entry => [entry.id, entry]));
    const baseByIdentity = uniqueIndex(base, spellIdentity);
    const baseByNameLevel = uniqueIndex(base, spellNameLevelIdentity);
    const localById = new Map(list.map((entry, index) => [entry.id, index]));
    const localByIdentity = uniqueIndex(list, spellIdentity, (_entry, index) => index);
    const localByNameLevel = uniqueIndex(list, spellNameLevelIdentity, (_entry, index) => index);

    const now = new Date().toISOString();
    let imported = 0;
    let updated = 0;

    incoming.forEach(entry => {
      const identity = spellIdentity(entry);
      const nameLevelIdentity = spellNameLevelIdentity(entry);
      const baseMatch =
        baseByIdentity.get(identity) ||
        baseById.get(entry.id) ||
        baseByNameLevel.get(nameLevelIdentity);

      if (baseMatch) entry.id = baseMatch.id;

      const existingIndex = localById.has(entry.id)
        ? localById.get(entry.id)
        : localByIdentity.has(identity)
          ? localByIdentity.get(identity)
          : localByNameLevel.get(nameLevelIdentity);

      const previous = existingIndex === undefined ? null : list[existingIndex];
      const normalized = {
        ...(previous ? clone(previous) : {}),
        ...clone(entry),
        custom: true,
        baseOverride: Boolean(baseMatch || previous?.baseOverride),
        criadoEm: previous?.criadoEm || entry.criadoEm || now,
        atualizadoEm: now
      };

      if (existingIndex === undefined) {
        list.push(normalized);
        const newIndex = list.length - 1;
        localById.set(normalized.id, newIndex);
        localByIdentity.set(spellIdentity(normalized), newIndex);
        localByNameLevel.set(spellNameLevelIdentity(normalized), newIndex);
        imported++;
      } else {
        list[existingIndex] = normalized;
        localById.set(normalized.id, existingIndex);
        localByIdentity.set(spellIdentity(normalized), existingIndex);
        localByNameLevel.set(spellNameLevelIdentity(normalized), existingIndex);
        updated++;
      }
    });

    writeLocal(SPELL_KEY, list);
    return { imported, updated, total: incoming.length };
  }

  function saveSpellSchool(entry) { return saveTaxonomy(SPELL_SCHOOL_KEY, 'escola', entry); }
  function saveItemCategory(entry) { return saveTaxonomy(ITEM_CATEGORY_KEY, 'categoria', entry); }

  function removeItem(id) { return removeCustom(ITEM_KEY, id); }
  function removeSpell(id) { return removeCustom(SPELL_KEY, id); }
  function removeSpellSchool(id) { return removeCustom(SPELL_SCHOOL_KEY, id); }
  function removeItemCategory(id) { return removeCustom(ITEM_CATEGORY_KEY, id); }

  function formatRange(range = {}) {
    if (!range || range.tipo === 'pessoal') return 'Pessoal';
    if (range.tipo === 'toque') return 'Toque';
    if (range.tipo === 'visao') return 'Visão';
    if (range.tipo === 'ilimitado') return 'Ilimitado';
    if (range.tipo === 'especial') return 'Especial';
    return range.distancia ? `${range.distancia} ${range.unidade || 'm'}` : '—';
  }

  function formatArea(area = {}) {
    if (!area || !area.forma || area.forma === 'nenhuma') return 'Sem área';
    const labels = {
      esfera: 'Esfera', cone: 'Cone', cubo: 'Cubo', cilindro: 'Cilindro',
      linha: 'Linha', emanacao: 'Emanação', quadrado: 'Quadrado'
    };
    const parts = [labels[area.forma] || area.forma];
    const unit = area.unidade || 'm';
    if (Number(area.raio) > 0) parts.push(`raio ${area.raio} ${unit}`);
    if (Number(area.comprimento) > 0) parts.push(`${area.comprimento} ${unit}`);
    if (Number(area.largura) > 0) parts.push(`largura ${area.largura} ${unit}`);
    if (Number(area.altura) > 0) parts.push(`altura ${area.altura} ${unit}`);
    return parts.join(' · ');
  }

  function formatCasting(casting = {}) {
    if (!casting) return '—';
    const units = { acao: 'ação', bonus: 'ação bônus', reacao: 'reação', minuto: 'minuto', hora: 'hora' };
    const base = `${casting.valor || 1} ${units[casting.unidade] || casting.unidade || 'ação'}`;
    return casting.gatilho ? `${base} (${casting.gatilho})` : base;
  }

  function formatDuration(duration = {}) {
    if (!duration) return '—';
    let text;
    if (duration.tipo === 'instantanea') text = 'Instantânea';
    else if (duration.tipo === 'ate-dissipada') text = 'Até ser dissipada';
    else if (duration.tipo === 'especial') text = 'Especial';
    else text = `${duration.valor || 1} ${duration.unidade || duration.tipo || ''}`.trim();
    return duration.concentracao ? `Concentração, ${text}` : text;
  }

  function formatComponents(components = {}) {
    const bits = [];
    if (components.verbal) bits.push('V');
    if (components.somatico) bits.push('S');
    if (components.material) bits.push('M');
    return bits.length ? bits.join(', ') : '—';
  }

  window.RPGCatalogo = {
    clone,
    getItens,
    getMagias,
    getSpellSchools,
    getItemCategories,
    saveItem,
    saveSpell,
    importSpells,
    saveSpellSchool,
    saveItemCategory,
    removeItem,
    removeSpell,
    removeSpellSchool,
    removeItemCategory,
    formatRange,
    formatArea,
    formatCasting,
    formatDuration,
    formatComponents,
    keys: { ITEM_KEY, SPELL_KEY, SPELL_SCHOOL_KEY, ITEM_CATEGORY_KEY }
  };
})();