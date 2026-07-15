// ── THEME ─────────────────────────────────────────────────────────────────────
let dark = localStorage.getItem('rpg_theme') !== 'light';
function applyTheme(){ 
  const body = document.body;
  const themeBtn = document.getElementById('themeBtn');
  if(body) body.classList.toggle('light', !dark); 
  if(themeBtn) themeBtn.textContent = dark ? '☀' : '🌙'; 
}
function toggleTheme(){ dark = !dark; localStorage.setItem('rpg_theme', dark ? 'dark' : 'light'); applyTheme(); }
applyTheme();

// ── MOBILE MENU ───────────────────────────────────────────────────────────────
function toggleMobMenu(){ document.getElementById('mobNav').classList.toggle('open'); }
function closeMobMenu(){ document.getElementById('mobNav').classList.remove('open'); }
document.addEventListener('click', e => {
  const nav = document.getElementById('mobNav');
  if(nav && nav.classList.contains('open') && !nav.contains(e.target) && !e.target.closest('#mobMenuBtn')) closeMobMenu();
});

// ── STORAGE ───────────────────────────────────────────────────────────────────
const SK_FICHAS  = 'rpg_fichas_v1';
const SK_CUSTOM  = 'rpg_gerador_custom_v1';
const SK_PRESETS = 'rpg_conteudo_presets_v1';
const SK_ACTIVE_PRESET = 'rpg_active_preset_id_v1';

function loadFichas(){ try{ return JSON.parse(localStorage.getItem(SK_FICHAS)) || []; } catch(e){ return []; } }
function saveFichas(arr){ localStorage.setItem(SK_FICHAS, JSON.stringify(arr)); }
function loadCustom(){ try{ return JSON.parse(localStorage.getItem(SK_CUSTOM)) || {racas:[],classes:[],profissoes:[],personalidades:[],estilos:[]}; } catch(e){ return {racas:[],classes:[],profissoes:[],personalidades:[],estilos:[]}; } }
function uid(){ return Date.now().toString(36) + Math.random().toString(36).slice(2); }
function toast(msg){ const t = document.createElement('div'); t.className = 'toast'; t.textContent = msg; document.body.appendChild(t); setTimeout(() => t.remove(), 2400); }
function closeM(id){ const el = document.getElementById(id); if(el) el.style.display = 'none'; }

// ── DB STATE & PRESETS FILTER ─────────────────────────────────────────────────
let baseDB = null;
let DB = null;

async function carregarDB(){
  try {
    const res = await fetch('../data/personagens.json');
    baseDB = await res.json();
  } catch(e) {
    baseDB = { racas:[], classes:[], profissoes:[], personalidades:[], estilos:[],
               nomes:{masculinos:[],femininos:[],sobrenomes:[]}, fisicos:[], maneirismos:[] };
    console.warn('personagens.json não encontrado, rodando no modo local vazio.', e);
  }
  reconstruirDB();
}

function reconstruirDB(){
  DB = JSON.parse(JSON.stringify(baseDB));
  
  const custom = loadCustom();
  Object.keys(custom).forEach(cat => { 
    if(DB[cat]) {
      DB[cat] = DB[cat].concat(custom[cat]); 
    } 
  });
  
  popularPresetsSelector();
  popularSelects();
}

function getFilteredCat(cat){
  if(!DB || !DB[cat]) return [];
  
  const activeId = localStorage.getItem(SK_ACTIVE_PRESET) || 'default';
  let presets = [];
  try { presets = JSON.parse(localStorage.getItem(SK_PRESETS)) || []; } catch(e){}
  
  const currentPreset = presets.find(p => p.id === activeId);
  if(currentPreset && currentPreset.blocked && currentPreset.blocked[cat]) {
    return DB[cat].filter(item => !currentPreset.blocked[cat].includes(item.id));
  }
  return DB[cat];
}

function popularPresetsSelector(){
  const selector = document.getElementById('presetSelector');
  if(!selector) return;
  
  while(selector.options.length > 1) selector.remove(1);
  
  let presets = [];
  try { presets = JSON.parse(localStorage.getItem(SK_PRESETS)) || []; } catch(e){}
  
  presets.forEach(p => {
    const opt = document.createElement('option');
    opt.value = p.id;
    opt.textContent = p.nome;
    selector.appendChild(opt);
  });
  
  const activeId = localStorage.getItem(SK_ACTIVE_PRESET) || 'default';
  selector.value = activeId;
}

function alterarPresetAtivo(novoId) {
  localStorage.setItem(SK_ACTIVE_PRESET, novoId);
  popularSelects();
  toast("Preset alterado! Filtros updated.");
}

// ── POPULAR SELECTS DE FILTRO ─────────────────────────────────────────────────
function popularSelects(){
  const fill = (id, arr) => {
    const el = document.getElementById(id); if(!el) return;
    const antigoVal = el.value;
    while(el.options.length > 1) el.remove(1);
    arr.forEach(item => { const o = document.createElement('option'); o.value = item.id; o.textContent = item.nome; el.appendChild(o); });
    if(antigoVal) el.value = antigoVal;
  };
  fill('fRaca',       getFilteredCat('racas'));
  fill('fClasse',     getFilteredCat('classes'));
  fill('fProf',       getFilteredCat('profissoes'));
  fill('fPers',       getFilteredCat('personalidades'));
  fill('fEstilo',     getFilteredCat('estilos'));
}

// ── UTILS ─────────────────────────────────────────────────────────────────────
function rand(arr){ return arr[Math.floor(Math.random() * arr.length)]; }
function rollAttr(){ let r = Array.from({length:4}, () => Math.floor(Math.random() * 6) + 1); r.sort((a,b) => a - b); return r.slice(1).reduce((a,b) => a + b, 0); }
function mod(v){ return Math.floor((v - 10) / 2); }
function fmod(v){ const m = mod(v); return (m >= 0 ? '+' : '') + m; }
function pickFrom(selectId, arr){
  const v = document.getElementById(selectId).value;
  return v ? arr.find(x => x.id === v) || rand(arr) : rand(arr);
}

// ── CURRENT NPC ───────────────────────────────────────────────────────────────
let currentNPC = null;

function gerar(){
  if(!DB || !DB.racas.length){ toast('Banco de dados ainda carregando...'); return; }
  
  const racasF = getFilteredCat('racas');
  const classesF = getFilteredCat('classes');
  const profsF = getFilteredCat('profissoes');
  const persF = getFilteredCat('personalidades');
  const estilosF = getFilteredCat('estilos');

  if(!racasF.length || !classesF.length || !profsF.length || !persF.length || !estilosF.length) {
    toast('Erro: O preset ativo bloqueia todo o conteúdo de alguma categoria!');
    return;
  }

  const raca   = pickFrom('fRaca',   racasF);
  const classe = pickFrom('fClasse', classesF);
  const prof   = pickFrom('fProf',   profsF);
  const pers   = pickFrom('fPers',   persF);
  const estilo = pickFrom('fEstilo', estilosF);
  const nivel  = parseInt(document.getElementById('fNivel').value) || Math.floor(Math.random() * 10) + 1;
  const align  = document.getElementById('fAlign').value || rand(['Leal e Bom','Neutro e Bom','Caótico e Bom','Leal e Neutro','Neutro','Caótico e Neutro','Leal e Mau','Neutro e Mau','Caótico e Mau']);
  _montarNPC(raca, classe, prof, pers, estilo, nivel, align);
}

function gerarAleatorio(){
  if(!DB || !DB.racas.length){ toast('Banco de dados ainda carregando...'); return; }
  
  ['fRaca','fClasse','fProf','fPers','fEstilo','fNivel','fAlign'].forEach(id => document.getElementById(id).value = '');
  
  const racasF = getFilteredCat('racas');
  const classesF = getFilteredCat('classes');
  const profsF = getFilteredCat('profissoes');
  const persF = getFilteredCat('personalidades');
  const estilosF = getFilteredCat('estilos');

  if(!racasF.length || !classesF.length || !profsF.length || !persF.length || !estilosF.length) {
    toast('Erro: O preset ativo bloqueia todo o conteúdo de alguma categoria!');
    return;
  }

  const raca   = rand(racasF);
  const classe = rand(classesF);
  const prof   = rand(profsF);
  const pers   = rand(persF);
  const estilo = rand(estilosF);
  const nivel  = Math.floor(Math.random() * 10) + 1;
  const align  = rand(['Leal e Bom','Neutro e Bom','Caótico e Bom','Leal e Neutro','Neutro','Caótico e Neutro','Leal e Mau','Neutro e Mau','Caótico e Mau']);
  _montarNPC(raca, classe, prof, pers, estilo, nivel, align);
}

function _montarNPC(raca, classe, prof, pers, estilo, nivel, align){
  const genero = Math.random() > .5 ? 'm' : 'f';
  const nomes  = DB.nomes || {masculinos:['Arik'], femininos:['Lyra'], sobrenomes:['Ferro']};
  const nome   = `${rand(genero === 'm' ? nomes.masculinos : nomes.femininos)} ${rand(nomes.sobrenomes)}`;
  const fisico = rand(DB.fisicos || ['Aparência marcante']);
  const maneirismo = rand(DB.maneirismos || ['Hábito peculiar']);

  const attrs = {FOR:rollAttr(), DES:rollAttr(), CON:rollAttr(), INT:rollAttr(), SAB:rollAttr(), CAR:rollAttr()};
  const pb = nivel <= 4 ? 2 : nivel <= 8 ? 3 : nivel <= 12 ? 4 : nivel <= 16 ? 5 : 6;
  const hp = Math.max(1, (classe.dadoVida + mod(attrs.CON)) * nivel);
  const ca = 10 + mod(attrs.DES);
  const init = mod(attrs.DES);

  currentNPC = {nome, raca, classe, prof, pers, estilo, nivel, align, fisico, maneirismo, attrs, pb, hp, ca, init};
  renderNPC(currentNPC);
}

// ── RENDER ────────────────────────────────────────────────────────────────────
function renderNPC(n){
  const {nome, raca, classe, prof, pers, estilo, nivel, align, fisico, maneirismo, attrs, pb, hp, ca, init} = n;

  const attrHtml = ['FOR','DES','CON','INT','SAB','CAR'].map(k => `
    <div class="attr-mini">
      <div class="attr-mini-lbl">${k}</div>
      <div class="attr-mini-val">${attrs[k]}</div>
      <div class="attr-mini-mod">${fmod(attrs[k])}</div>
    </div>`).join('');

  const persTracos = Array.isArray(pers.tracos) ? pers.tracos : [pers.tracos];
  const persIdeais = Array.isArray(pers.ideais) ? pers.ideais : [pers.ideais];
  const persVinculos = Array.isArray(pers.vinculos) ? pers.vinculos : [pers.vinculos];
  const persDefeitos = Array.isArray(pers.defeitos) ? pers.defeitos : [pers.defeitos];
  const estiloForts = Array.isArray(estilo.pontosForts) ? estilo.pontosForts : [estilo.pontosForts];

  document.getElementById('genMain').innerHTML = `
    <div class="npc-sheet" id="npcSheet">
      <div class="actions-bar no-print">
        <button class="btn primary" onclick="abrirSalvar()"><i class="ti ti-device-floppy"></i> Salvar Ficha</button>
        <button class="btn"         onclick="window.print()"><i class="ti ti-printer"></i> Salvar PDF</button>
        <button class="btn"         onclick="gerar()"><i class="ti ti-refresh"></i> Regerar</button>
        <button class="btn"         onclick="gerarAleatorio()"><i class="ti ti-dice-5"></i> Novo Aleatório</button>
      </div>

      <div class="npc-header">
        <div class="npc-avatar">${nome[0]}</div>
        <div class="npc-identity">
          <div class="npc-name">${nome}</div>
          <div class="npc-sub">${align} · Nível ${nivel} · ${fisico}</div>
          <div class="npc-tags">
            <span class="npc-tag raca"><i class="ti ti-dna"></i> ${raca.nome}</span>
            <span class="npc-tag classe"><i class="ti ti-sword"></i> ${classe.nome}</span>
            <span class="npc-tag prof"><i class="ti ti-briefcase"></i> ${prof.nome}</span>
            <span class="npc-tag nivel">Nv ${nivel} · PB +${pb}</span>
          </div>
        </div>
      </div>

      <div class="npc-sec-full">
        <h3><i class="ti ti-shield"></i>Atributos</h3>
        <div class="attr-row">${attrHtml}</div>
      </div>

      <div class="npc-sec-full">
        <h3><i class="ti ti-sword"></i>Estatísticas de Combate</h3>
        <div class="combat-row">
          <div class="cs-box"><div class="cs-val">${hp}</div><div class="cs-lbl">HP</div></div>
          <div class="cs-box"><div class="cs-val">${ca}</div><div class="cs-lbl">CA</div></div>
          <div class="cs-box"><div class="cs-val">${init >= 0 ? '+' : ''}${init}</div><div class="cs-lbl">Iniciativa</div></div>
          <div class="cs-box"><div class="cs-val">${raca.velocidade}m</div><div class="cs-lbl">Velocidade</div></div>
          <div class="cs-box"><div class="cs-val">d${classe.dadoVida}</div><div class="cs-lbl">Dado de Vida</div></div>
          <div class="cs-box"><div class="cs-val">+${pb}</div><div class="cs-lbl">Prof. Bônus</div></div>
        </div>
      </div>

      <div class="npc-grid">
        <div class="npc-sec">
          <h3><i class="ti ti-dna"></i>Raça — ${raca.nome}</h3>
          <ul class="trait-list">
            <li>${raca.desc}</li>
            <li><strong>Traço Racial:</strong> ${raca.tracoRacial}</li>
            <li><strong>Visão Noturna:</strong> ${raca.visaoNoturna ? 'Sim (18m)' : 'Não'}</li>
          </ul>
        </div>
        <div class="npc-sec">
          <h3><i class="ti ti-sword"></i>Classe — ${classe.nome}</h3>
          <ul class="trait-list">
            <li>${classe.desc}</li>
            <li><strong>Recurso:</strong> ${classe.recurso}</li>
            <li><strong>Salvaguardas:</strong> ${classe.salvaguardas}</li>
            <li><strong>Armaduras:</strong> ${classe.profArmadura}</li>
          </ul>
        </div>
        <div class="npc-sec">
          <h3><i class="ti ti-briefcase"></i>Profissão — ${prof.nome}</h3>
          <ul class="trait-list">
            <li>${prof.desc}</li>
            <li><strong>Perícias:</strong> ${Array.isArray(prof.pericias) ? prof.pericias.join(', ') : prof.pericias}</li>
            <li><strong>Equipamento:</strong> ${prof.equipamento}</li>
            <li><strong>Contatos:</strong> ${prof.contatos}</li>
          </ul>
        </div>
        <div class="npc-sec">
          <h3><i class="ti ti-target"></i>Estilo — ${estilo.nome}</h3>
          <ul class="trait-list">
            <li>${estilo.desc}</li>
            <li><strong>Pontos Fortes:</strong> ${estiloForts.join(', ')}</li>
            <li><strong>Dica:</strong> ${estilo.dicas}</li>
          </ul>
        </div>
      </div>

      <div class="npc-sec-full">
        <h3><i class="ti ti-brain"></i>Personalidade — ${pers.nome}</h3>
        <div class="npc-grid" style="margin-bottom:0">
          <div>
            <div style="font-family:'Cinzel',serif;font-size:8px;letter-spacing:1px;color:var(--muted);text-transform:uppercase;margin-bottom:5px">Traços</div>
            <ul class="trait-list">${persTracos.map(t => `<li>${t}</li>`).join('')}</ul>
            <div style="font-family:'Cinzel',serif;font-size:8px;letter-spacing:1px;color:var(--muted);text-transform:uppercase;margin:7px 0 5px">Ideais</div>
            <ul class="trait-list">${persIdeais.map(t => `<li>${t}</li>`).join('')}</ul>
          </div>
          <div>
            <div style="font-family:'Cinzel',serif;font-size:8px;letter-spacing:1px;color:var(--muted);text-transform:uppercase;margin-bottom:5px">Vínculos</div>
            <ul class="trait-list">${persVinculos.map(t => `<li>${t}</li>`).join('')}</ul>
            <div style="font-family:'Cinzel',serif;font-size:8px;letter-spacing:1px;color:var(--muted);text-transform:uppercase;margin:7px 0 5px">Defeitos</div>
            <ul class="trait-list">${persDefeitos.map(t => `<li>${t}</li>`).join('')}</ul>
          </div>
        </div>
      </div>

      <div class="npc-sec-full">
        <h3><i class="ti ti-eye"></i>Aparência &amp; Comportamento</h3>
        <ul class="trait-list">
          <li><strong>Aparência física:</strong> ${fisico}</li>
          <li><strong>Maneirismo marcante:</strong> ${maneirismo}</li>
        </ul>
      </div>
    </div>`;
}

// ── SALVAR ────────────────────────────────────────────────────────────────────
let saveFolder = 'npc';
function selFolder(f){
  saveFolder = f;
  ['player','npc','monster'].forEach(x => {
    const el = document.getElementById('fopt_' + x);
    if(el) el.classList.toggle('sel', x === f);
  });
}
function abrirSalvar(){
  if(!currentNPC){ toast('Gere um personagem primeiro!'); return; }
  document.getElementById('saveName').value = currentNPC.nome;
  selFolder('npc');
  document.getElementById('mSave').style.display = 'flex';
  setTimeout(() => document.getElementById('saveName').focus(), 50);
}
function confirmarSalvar(){
  if(!currentNPC) return;
  const n = currentNPC;
  const nome = document.getElementById('saveName').value.trim() || n.nome;
  const fichas = loadFichas();
  const ficha = {
    id: uid(), name: nome,
    class: n.classe.nome, race: n.raca.nome, level: n.nivel,
    background: n.prof.nome, alignment: n.align,
    type: saveFolder === 'player' ? 'player' : saveFolder === 'monster' ? 'monster' : 'neutral',
    folder: saveFolder, profBonus: n.pb, xp: 0, colors: {},
    attrs: [
      {id:'for', label:'Força', abr:'FOR', val:n.attrs.FOR},
      {id:'des', label:'Destreza', abr:'DES', val:n.attrs.DES},
      {id:'con', label:'Constituição', abr:'CON', val:n.attrs.CON},
      {id:'int', label:'Inteligência', abr:'INT', val:n.attrs.INT},
      {id:'sab', label:'Sabedoria', abr:'SAB', val:n.attrs.SAB},
      {id:'car', label:'Carisma', abr:'CAR', val:n.attrs.CAR},
    ],
    skills: [
      {id:'acr', name:'Acrobacia', attr:'des', prof:0}, {id:'arc', name:'Arcanismo', attr:'int', prof:0},
      {id:'ate', name:'Atletismo', attr:'for', prof:0}, {id:'eng', name:'Enganação', attr:'car', prof:0},
      {id:'frt', name:'Furtividade', attr:'des', prof:0}, {id:'his', name:'História', attr:'int', prof:0},
      {id:'intu', name:'Intuição', attr:'sab', prof:0}, {id:'inv', name:'Investigação', attr:'int', prof:0},
      {id:'med', name:'Medicina', attr:'sab', prof:0}, {id:'nat', name:'Natureza', attr:'int', prof:0},
      {id:'per', name:'Percepção', attr:'sab', prof:0}, {id:'perf', name:'Performance', attr:'car', prof:0},
      {id:'pers', name:'Persuasão', attr:'car', prof:0}, {id:'pre', name:'Prestidigitação', attr:'des', prof:0},
      {id:'rel', name:'Religião', attr:'int', prof:0}, {id:'sob', name:'Sobrevivência', attr:'sab', prof:0},
    ],
    combat: [
      {id:'ca', label:'CA', val:n.ca}, {id:'init', label:'Iniciativa', val:n.init},
      {id:'vel', label:'Velocidade', val:n.raca.velocidade},
      {id:'hpmax', label:'HP Máx', val:n.hp}, {id:'hpcur', label:'HP Atual', val:n.hp},
      {id:'hdice', label:'Dado de Vida', val:n.classe.dadoVida},
    ],
    spellSlots: Array.from({length:9}, (_, i) => ({level:i + 1, total:0, used:0})),
    spells: [],
    habilidades: [
      {id:uid(), name:n.raca.tracoRacial.split(':')[0].trim(), uses:0, level:1, desc:n.raca.tracoRacial, usesSpent:0},
      {id:uid(), name:n.classe.recurso.split('—')[0].trim(), uses:0, level:1, desc:n.classe.recurso, usesSpent:0},
    ],
    equipment: [{name:n.prof.equipmento || n.prof.equipamento, cat:'item', weight:1, qty:1, desc:'Equipamento de antecedente.'}],
    traits: Array.isArray(n.pers.tracos) ? n.pers.tracos.join(' ') : n.pers.tracos,
    ideais: Array.isArray(n.pers.ideais) ? n.pers.ideais.join(' ') : n.pers.ideais,
    bonds: Array.isArray(n.pers.vinculos) ? n.pers.vinculos.join(' ') : n.pers.vinculos,
    flaws: Array.isArray(n.pers.defeitos) ? n.pers.defeitos.join(' ') : n.pers.defeitos,
    backstory: `${n.fisico}. ${n.maneirismo}.`,
    notes: `Estilo de jogo: ${n.estilo.nome}. ${n.estilo.dicas}`
  };
  fichas.push(ficha);
  saveFichas(fichas);
  closeM('mSave');
  toast(`"${nome}" salvo em ${saveFolder === 'player' ? 'Jogadores' : saveFolder === 'npc' ? 'NPCs' : 'Monstros'}!`);
}

// ── MODAL CLOSE ───────────────────────────────────────────────────────────────
const mSaveEl = document.getElementById('mSave');
if(mSaveEl) mSaveEl.addEventListener('click', function(e){ if(e.target === this) closeM('mSave'); });
document.addEventListener('keydown', e => { if(e.key === 'Escape') closeM('mSave'); });

// ── INIT ──────────────────────────────────────────────────────────────────────
carregarDB();