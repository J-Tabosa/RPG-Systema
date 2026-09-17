(() => {
  const ITEM_KEY = 'rpg_catalog_items_custom_v1';
  const SPELL_KEY = 'rpg_catalog_spells_custom_v1';
  const scriptUrl = document.currentScript?.src || window.location.href;
  const itemUrl = new URL('../data/itens.json', scriptUrl).href;
  const spellUrl = new URL('../data/magias.json', scriptUrl).href;

  const clone = value => JSON.parse(JSON.stringify(value));
  const uid = prefix => `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

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
    base.forEach(entry => map.set(entry.id, { ...clone(entry), custom: false }));
    custom.forEach(entry => map.set(entry.id, { ...clone(entry), custom: true }));
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

  function removeCustom(key, id) {
    const list = readLocal(key);
    const next = list.filter(item => item.id !== id);
    if (next.length === list.length) return false;
    writeLocal(key, next);
    return true;
  }

  function saveItem(entry) {
    return saveCustom(ITEM_KEY, 'item', entry);
  }

  function saveSpell(entry) {
    return saveCustom(SPELL_KEY, 'magia', entry);
  }

  function removeItem(id) {
    return removeCustom(ITEM_KEY, id);
  }

  function removeSpell(id) {
    return removeCustom(SPELL_KEY, id);
  }

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
    saveItem,
    saveSpell,
    removeItem,
    removeSpell,
    formatRange,
    formatArea,
    formatCasting,
    formatDuration,
    formatComponents,
    keys: { ITEM_KEY, SPELL_KEY }
  };
})();