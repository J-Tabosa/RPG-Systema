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

  async function readBase(url) {
    const response = await fetch(url, { cache: 'no-cache' });
    if (!response.ok) throw new Error(`Falha ao carregar catálogo (${response.status}).`);
    const data = await response.json();
    return Array.isArray(data) ? data : [];
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
    const [base, custom] = await Promise.all([readBase(itemUrl), Promise.resolve(readLocal(ITEM_KEY))]);
    return mergeCatalog(base, custom);
  }

  async function getMagias() {
    const [base, custom] = await Promise.all([readBase(spellUrl), Promise.resolve(readLocal(SPELL_KEY))]);
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