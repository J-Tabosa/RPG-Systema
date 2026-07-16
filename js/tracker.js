// ── THEME ─────────────────────────────────────────────────────────────────────
let dark = localStorage.getItem('rpg_theme') !== 'light';
function applyTheme(){ document.body.classList.toggle('light',!dark); document.getElementById('themeBtn').textContent = dark?'☀':'🌙'; }
function toggleTheme(){ dark=!dark; localStorage.setItem('rpg_theme',dark?'dark':'light'); applyTheme(); }
applyTheme();

// ── STORAGE ───────────────────────────────────────────────────────────────────
function loadAllFichas(){ try{return JSON.parse(localStorage.getItem('rpg_fichas_v1'))||[];}catch(e){return[];} }

// ── STATE ─────────────────────────────────────────────────────────────────────
const CONDITIONS=['Atordoado','Assustado','Envenenado','Paralisado','Caído','Cego','Surdo','Encantado','Agarrado','Invisível'];
let combatants=[],currentTurn=0,round=1,selType_='player',editId=null,editType_='player',logs=[],diceHistory=[];
function uid(){return Date.now().toString(36)+Math.random().toString(36).slice(2);}
function hpColor(p){return p>.5?'#3a8c1e':p>.25?'#d4a843':'#c0392b';}

let lastModalState = { screen: 'menu', folderName: null };

function getCombatantColor(c) {
  if (c.type === 'player') {
    return c.customBg || '#4a9c2e'; 
  } else if (c.type === 'monster') {
    return '#c05050'; // Vermelho para inimigos/monstros
  } else {
    return '#2a5080'; // Azul para NPCs
  }
}

// ── LOG ───────────────────────────────────────────────────────────────────────
function addLog(t){
  const now=new Date(),time=now.getHours().toString().padStart(2,'0')+':'+now.getMinutes().toString().padStart(2,'0');
  logs.unshift({time,t}); if(logs.length>40)logs.pop(); renderLog();
}
function renderLog(){
  const el=document.getElementById('logEntries'),sec=document.getElementById('logSection');
  if(!logs.length){sec.style.display='none';return;}
  sec.style.display='block';
  el.innerHTML=logs.map(l=>`<div class="log-entry"><span class="log-time">${l.time}</span><span class="log-text">${l.t}</span></div>`).join('');
}

// ── TYPE BUTTONS ──────────────────────────────────────────────────────────────
function selType(t){
  selType_=t;
  ['player','monster','neutral'].forEach(x=>{
    const el=document.getElementById('tp_'+x);
    if(el) el.className='type-btn'+(x===t?' sel '+x:' '+x);
  });
}
function selEditType(t){
  editType_=t;
  ['player','monster','neutral'].forEach(x=>{
    const el=document.getElementById('etp_'+x);
    if(el) el.className='type-btn'+(x===t?' sel '+x:' '+x);
  });
}

// ── ADD COMBATANT (MANUAL) ────────────────────────────────────────────────────
function addCombatant(){
  const name=document.getElementById('newName').value.trim();
  const hpMax=parseInt(document.getElementById('newHpMax').value)||20;
  const init=parseInt(document.getElementById('newInit').value)||0;
  const ac=parseInt(document.getElementById('newAC').value)||10;
  const qty=Math.max(1,Math.min(30,parseInt(document.getElementById('newQty').value)||1));
  if(!name){document.getElementById('newName').focus();return;}
  if(qty===1){
    combatants.push({id:uid(),name,type:selType_,hpMax,hpCur:hpMax,init,ac,conditions:[],dead:false,fichaId:null,groupId:null,customBg:null});
    addLog(`<em>${name}</em> entrou no combate (HP ${hpMax}, Init ${init}, CA ${ac})`);
  } else {
    const gid=uid();
    for(let i=1;i<=qty;i++){
      combatants.push({id:uid(),name:`${name} ${i}`,type:selType_,hpMax,hpCur:hpMax,init,ac,conditions:[],dead:false,fichaId:null,groupId:gid,customBg:null});
    }
    addLog(`Grupo <em>${name}</em> ×${qty} adicionado`);
  }
  ['newName','newHpMax','newInit','newAC'].forEach(id=>document.getElementById(id).value='');
  document.getElementById('newQty').value='1';
  render();
}

// ── IMPORT MODAL (POP-UP DINÂMICO COM MEMÓRIA) ───────────────────────────────
function openImportModal(){
  document.getElementById('importModal').style.display='flex';
  
  if (lastModalState.screen === 'players') {
    showPlayersImport();
  } else if (lastModalState.screen === 'folders') {
    showMonstersFolders();
  } else if (lastModalState.screen === 'folder-detail' && lastModalState.folderName) {
    showMonstersInFolder(lastModalState.folderName);
  } else {
    renderImportSelection();
  }
}

function renderImportSelection(){
  lastModalState = { screen: 'menu', folderName: null };
  document.getElementById('btnBackImport').style.display = 'none';
  document.getElementById('importModalDesc').textContent = 'Escolha o tipo de combatente para importar:';
  
  const container = document.getElementById('importModalContent');
  container.innerHTML = `
    <div style="display:flex; gap:12px; margin-top:10px;">
      <button class="btn primary" style="flex:1; padding: 16px; font-size: 14px; border-color:#4a9c2e" onclick="showPlayersImport()">
        <i class="ti ti-user" style="font-size:18px; display:block; margin-bottom:4px"></i> Jogador
      </button>
      <button class="btn primary" style="flex:1; padding: 16px; font-size: 14px; border-color:#c05050" onclick="showMonstersFolders()">
        <i class="ti ti-ghost" style="font-size:18px; display:block; margin-bottom:4px"></i> Monstro
      </button>
    </div>
  `;
}

// Exibir Fichas de Jogadores
function showPlayersImport(){
  lastModalState = { screen: 'players', folderName: null };
  document.getElementById('btnBackImport').style.display = 'inline-block';
  document.getElementById('importModalDesc').textContent = 'Selecione um Jogador para importar:';
  
  const todas = loadAllFichas();
  const fichas = todas.filter(f => f.type === 'player' || !f.type);
  const container = document.getElementById('importModalContent');
  
  if(!fichas.length){
    container.innerHTML = '<div class="empty-state" style="padding:16px 0"><div class="big">📜</div>Nenhuma ficha de jogador encontrada.<br><a href="ficha.html" style="color:var(--gold)">Criar fichas →</a></div>';
    return;
  }
  
  container.innerHTML = fichas.map(f => {
    const hpMax = (f.combat?.find(x=>x.id==='hpmax')||{val:20}).val;
    const ca = (f.combat?.find(x=>x.id==='ca')||{val:10}).val;
    const init = (f.combat?.find(x=>x.id==='init')||{val:0}).val;
    const color = (f.colors && f.colors.customFieldFontColor) || f.bg || '#4a9c2e';
    const instances = combatants.filter(x => x.fichaId === f.id).length;
    const badgeText = instances > 0 ? ` <span style="font-size:11px;color:var(--gold);font-weight:bold;margin-left:4px">(${instances}x)</span>` : '';
    
    // Agora o card inteiro não tem mais a classe "already" (não fica cinza)
    // Clicar no botão "+" ou no card dispara a adição
    return `<div class="fii" style="border: 1px solid ${color}44; background: var(--bg-panel); display: flex; justify-content: space-between; align-items: center;" onclick="importFicha('${f.id}', 'player')">
      <div style="display:flex; align-items:center; gap:10px; flex:1">
        <div class="fii-av" style="background:${color}22;border-color:${color};color:${color}">${f.name[0].toUpperCase()}</div>
        <div class="fii-info">
          <div class="fii-name" style="color:${color}">${f.name}${badgeText}</div>
          <div class="fii-sub">${[f.race,f.class,f.level?'Nv '+f.level:''].filter(Boolean).join(' · ')}</div>
        </div>
      </div>
      <div style="display:flex; align-items:center; gap:12px">
        <div class="fii-stats" style="text-align:right"><div style="color:var(--gold);font-family:Cinzel,serif">Init ${init}</div><div style="font-size:11px;opacity:0.8">HP ${hpMax} · CA ${ca}</div></div>
        <button class="btn sm" style="border-color:${color}; color:${color}; padding:4px 8px; font-weight:bold" onclick="event.stopPropagation(); importFicha('${f.id}', 'player')"><i class="ti ti-plus"></i></button>
      </div>
    </div>`;
  }).join('');
}

// Exibir Pastas de Monstros
function showMonstersFolders(){
  lastModalState = { screen: 'folders', folderName: null };
  document.getElementById('btnBackImport').style.display = 'inline-block';
  document.getElementById('importModalDesc').textContent = 'Selecione uma pasta de monstros:';
  
  const todas = loadAllFichas();
  const monstros = todas.filter(m => m.type === 'monster');
  const container = document.getElementById('importModalContent');
  
  if(!monstros.length){
    container.innerHTML = '<div class="empty-state" style="padding:16px 0"><div class="big">☠</div>Nenhum monstro cadastrado como ficha.</div>';
    return;
  }

  let folders = [...new Set(monstros.map(m => m.folder || m.pasta || 'Geral'))];
  if(folders.length === 0) folders = ['Geral'];

  container.innerHTML = `<div style="display:grid; grid-template-columns: 1fr 1fr; gap:8px;">` + folders.map(folder => {
    const qtd = monstros.filter(m => (m.folder || m.pasta || 'Geral') === folder).length;
    return `<button class="btn" style="padding:12px; font-family:'Cinzel', serif; text-align:left; display:flex; align-items:center; justify-content:space-between; gap:8px" onclick="showMonstersInFolder('${folder}')">
      <span><i class="ti ti-folder" style="color:var(--gold); margin-right:4px"></i> ${folder}</span>
      <span style="font-size:11px; opacity:0.6">(${qtd})</span>
    </button>`;
  }).join('') + `</div>`;
}

// Exibir Monstros de uma Pasta Específica
function showMonstersInFolder(folderName){
  lastModalState = { screen: 'folder-detail', folderName: folderName };
  document.getElementById('btnBackImport').style.display = 'inline-block';
  document.getElementById('importModalDesc').textContent = `Monstros na pasta: ${folderName}`;
  
  const todas = loadAllFichas();
  const monstros = todas
    .filter(m => m.type === 'monster' && (m.folder || m.pasta || 'Geral') === folderName)
    .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR', { sensitivity: 'base' }));
  
  const container = document.getElementById('importModalContent');
  
  if(!monstros.length){
    container.innerHTML = `<button class="btn sm" style="margin-bottom:10px" onclick="showMonstersFolders()">← Voltar para Pastas</button>
                           <div class="empty-state" style="padding:16px 0">Nenhum monstro nesta pasta.</div>`;
    return;
  }
  
  container.innerHTML = `<button class="btn sm" style="margin-bottom:10px" onclick="showMonstersFolders()">← Voltar para Pastas</button>` + monstros.map(f => {
    const hpMax = (f.combat?.find(x=>x.id==='hpmax')||{val:20}).val;
    const ca = (f.combat?.find(x=>x.id==='ca')||{val:10}).val;
    const init = (f.combat?.find(x=>x.id==='init')||{val:0}).val;
    const color = '#c05050'; 
    const instances = combatants.filter(x => x.fichaId === f.id).length;
    const badgeText = instances > 0 ? ` <span style="font-size:11px;color:var(--gold);font-weight:bold;margin-left:4px">(${instances}x)</span>` : '';
    
    // Adicionado botão de "+" vermelho à direita para os monstros. 
    // O card não fica mais apagado/cinza!
    return `<div class="fii" style="border: 1px solid ${color}44; background: var(--bg-panel); display: flex; justify-content: space-between; align-items: center;" onclick="importFicha('${f.id}', 'monster')">
      <div style="display:flex; align-items:center; gap:10px; flex:1">
        <div class="fii-av" style="background:${color}22;border-color:${color};color:${color}">${f.name[0].toUpperCase()}</div>
        <div class="fii-info">
          <div class="fii-name" style="color:${color}">${f.name}${badgeText}</div>
          <div class="fii-sub">${f.race || 'Monstro'}</div>
        </div>
      </div>
      <div style="display:flex; align-items:center; gap:12px">
        <div class="fii-stats" style="text-align:right"><div style="color:var(--gold);font-family:Cinzel,serif">Init ${init}</div><div style="font-size:11px;opacity:0.8">HP ${hpMax} · CA ${ca}</div></div>
        <button class="btn sm" style="border-color:${color}; color:${color}; padding:4px 8px; font-weight:bold" onclick="event.stopPropagation(); importFicha('${f.id}', 'monster')"><i class="ti ti-plus"></i></button>
      </div>
    </div>`;
  }).join('');
}

// Função de importação unificada (sempre mantém o modal aberto ao adicionar)
function importFicha(id, type){
  const todas = loadAllFichas();
  const f = todas.find(x=>x.id===id); if(!f) return;
  const hpMax=(f.combat?.find(x=>x.id==='hpmax')||{val:20}).val;
  const ca=(f.combat?.find(x=>x.id==='ca')||{val:10}).val;
  const init=(f.combat?.find(x=>x.id==='init')||{val:0}).val;
  
  const corFicha = (f.colors && f.colors.customFieldFontColor) || f.bg || null;

  let finalName = f.name;
  const existingCopies = combatants.filter(x => x.fichaId === f.id);
  
  if (existingCopies.length > 0) {
    const firstCopy = existingCopies.find(x => x.name === f.name);
    if (firstCopy) {
      firstCopy.name = `${f.name} 1`;
    }
    
    let nextNum = 1;
    const rx = new RegExp(`^${f.name.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&')}\\s+(\\d+)$`);
    
    existingCopies.forEach(c => {
      const match = c.name.match(rx);
      if (match) {
        const num = parseInt(match[1]);
        if (num >= nextNum) {
          nextNum = num + 1;
        }
      }
    });
    
    finalName = `${f.name} ${nextNum}`;
  }

  combatants.push({
    id:uid(),
    name:finalName,
    type:type,
    hpMax,
    hpCur:hpMax,
    init,
    ac:ca,
    conditions:[],
    dead:false,
    fichaId:f.id,
    fichaClass:f.class || '',
    fichaLevel:f.level || null,
    groupId:null,
    customBg:corFicha
  });
  
  addLog(`📜 <em>${finalName}</em> importado (HP ${hpMax}, Init ${init}, CA ${ca})`);
  
  // Atualiza apenas os números de contador do modal em tempo de execução sem fechar ou resetar a tela
  if (lastModalState.screen === 'players') {
    showPlayersImport();
  } else if (lastModalState.screen === 'folder-detail' && lastModalState.folderName) {
    showMonstersInFolder(lastModalState.folderName);
  }
  
  render();
}

// ── REMOVE ────────────────────────────────────────────────────────────────────
function removeCombatant(id){
  const c=combatants.find(x=>x.id===id);
  if(!c||!confirm(`Remover ${c.name}?`)) return;
  const idx=combatants.findIndex(x=>x.id===id);
  if(idx<currentTurn&&combatants.length>1) currentTurn=Math.max(0,currentTurn-1);
  combatants.splice(idx,1);
  if(currentTurn>=combatants.length) currentTurn=0;
  addLog(`<em>${c.name}</em> removido`); render();
}

// ── DAMAGE/HEAL ───────────────────────────────────────────────────────────────
function applyDmg(id,amt,heal){
  const c=combatants.find(x=>x.id===id); if(!c) return;
  if(heal){
    const prev=c.hpCur; c.hpCur=Math.min(c.hpMax,c.hpCur+amt); c.dead=false;
    addLog(`<em>${c.name}</em> curado por ${c.hpCur-prev} HP (${c.hpCur}/${c.hpMax})`);
  } else {
    c.hpCur=Math.max(0,c.hpCur-amt);
    if(c.hpCur===0&&!c.dead){c.dead=true;addLog(`☠ <em>${c.name}</em> caiu!`);}
    else if(!c.dead) addLog(`<em>${c.name}</em> recebeu ${amt} de dano (${c.hpCur}/${c.hpMax})`);
  }
  render();
}
function getDmg(id){const el=document.getElementById('dmg_'+id);return el?parseInt(el.value)||0:0;}

// ── CONDITIONS ────────────────────────────────────────────────────────────────
function toggleCond(id,cond){
  const c=combatants.find(x=>x.id===id); if(!c) return;
  const i=c.conditions.indexOf(cond);
  if(i>-1){c.conditions.splice(i,1);addLog(`<em>${c.name}</em>: "${cond}" removido`);}
  else{c.conditions.push(cond);addLog(`<em>${c.name}</em>: "${cond}" aplicado`);}
  render();
}

// ── EDIT ──────────────────────────────────────────────────────────────────────
function openEdit(id){
  const c=combatants.find(x=>x.id===id); if(!c) return;
  editId=id; editType_=c.type;
  document.getElementById('editTitle').textContent='Editar — '+c.name;
  document.getElementById('editName').value=c.name;
  document.getElementById('editHpCur').value=c.hpCur;
  document.getElementById('editHpMax').value=c.hpMax;
  document.getElementById('editInit').value=c.init;
  document.getElementById('editAC').value=c.ac;
  selEditType(c.type);
  document.getElementById('editModal').style.display='flex';
}
function saveEdit(){
  const c=combatants.find(x=>x.id===editId); if(!c) return;
  c.name=document.getElementById('editName').value.trim()||c.name;
  c.type=editType_;
  c.hpMax=parseInt(document.getElementById('editHpMax').value)||c.hpMax;
  c.hpCur=Math.min(parseInt(document.getElementById('editHpCur').value)||0,c.hpMax);
  c.init=parseInt(document.getElementById('editInit').value)||c.init;
  c.ac=parseInt(document.getElementById('editAC').value)||c.ac;
  c.dead=c.hpCur===0;
  addLog(`<em>${c.name}</em> editado`);
  closeModal('editModal'); render();
}

// ── TURNS ─────────────────────────────────────────────────────────────────────
function nextTurn(){
  if(!combatants.length) return;
  if(!combatants.filter(x=>!x.dead).length) return;
  let att=0;
  do{currentTurn=(currentTurn+1)%combatants.length; if(currentTurn===0)round++; att++;}
  while(combatants[currentTurn].dead&&att<combatants.length*2);
  addLog(`Turno: <em>${combatants[currentTurn].name}</em> (Rodada ${round})`); render();
}
function prevTurn(){
  if(!combatants.length) return;
  currentTurn=(currentTurn-1+combatants.length)%combatants.length;
  if(currentTurn===combatants.length-1&&round>1) round--;
  render();
}
function setTurn(id){const i=combatants.findIndex(x=>x.id===id);if(i>-1){currentTurn=i;render();}}
function sortByInitiative(){combatants.sort((a,b)=>b.init-a.init);currentTurn=0;addLog('Iniciativa reorganizada');render();}
function resetCombat(){if(!confirm('Resetar o combate?'))return;combatants=[];currentTurn=0;round=1;logs=[];render();renderLog();}

// ── DICE ──────────────────────────────────────────────────────────────────────
function roll(sides){return Math.floor(Math.random()*sides)+1;}
function quickRoll(sides){
  const r=roll(sides);
  pushDice([r],sides,r,0,1);
}
function customRoll(){
  const qty=Math.max(1,Math.min(20,parseInt(document.getElementById('dQty').value)||1));
  const sides=parseInt(document.getElementById('dSide').value)||20;
  const mod=parseInt(document.getElementById('dMod').value)||0;
  const rolls=Array.from({length:qty},()=>roll(sides));
  const total=rolls.reduce((a,b)=>a+b,0)+mod;
  pushDice(rolls,sides,total,mod,qty);
}
function rollInitAll(){
  if(!combatants.length) return;
  combatants.forEach(c=>{c.init=roll(20);});
  sortByInitiative();
  addLog('🎲 Iniciativa d20 rolada para todos');
  document.getElementById('diceArea').innerHTML='<span style="font-size:12px;color:var(--muted)">🎲 Iniciativa rolada para todos!</span>';
}
function pushDice(rolls,sides,total,mod,qty){
  const isNat20=sides===20&&qty===1&&rolls[0]===20;
  const isNat1=sides===20&&qty===1&&rolls[0]===1;
  const cls=isNat20?'nat20':isNat1?'nat1':'normal';
  const label=isNat20?' 🌟':isNat1?' 💀':'';
  const display=qty>1||mod!==0?total:rolls[0];
  const note=qty>1?`[${rolls.join('+')}]${mod!==0?(mod>0?'+':'')+mod+' =':'='} ${total}`:mod!==0?(mod>0?'+':'')+mod+` = ${total}`:'';
  diceHistory.unshift({chip:`<div class="roll-chip ${cls}">${display}${label}</div>`,note:`<span class="roll-note">d${sides}${qty>1?'×'+qty:''} ${note}</span>`});
  if(diceHistory.length>4) diceHistory.pop();
  document.getElementById('diceArea').innerHTML=diceHistory.map(h=>`<div style="display:flex;align-items:center;gap:6px">${h.chip}${h.note}</div>`).join('');
  addLog(`🎲 d${sides}${qty>1?'×'+qty:''}: ${rolls.join('+')}${mod!==0?(mod>0?'+':'')+mod:''} = <em>${total}</em>${isNat20?' 🌟 NAT 20!':isNat1?' 💀 NAT 1!':''}`);
}

// ── MODAL UTILS ───────────────────────────────────────────────────────────────
function closeModal(id){document.getElementById(id).style.display='none';}
['editModal','importModal'].forEach(id=>{
  document.getElementById(id).addEventListener('click',function(e){if(e.target===this)closeModal(id);});
});
document.addEventListener('keydown',e=>{
  if(e.key==='Escape'){closeModal('editModal');closeModal('importModal');}
  if(e.key==='n'&&document.activeElement.tagName!=='INPUT'&&document.activeElement.tagName!=='SELECT') nextTurn();
});

// ── MOBILE MENU ───────────────────────────────────────────────────────────────
function toggleMobMenu(){ document.getElementById('mobNav').classList.toggle('open'); }
function closeMobMenu(){ document.getElementById('mobNav').classList.remove('open'); }
document.addEventListener('click',e=>{
  const nav=document.getElementById('mobNav');
  if(nav&&nav.classList.contains('open')&&!nav.contains(e.target)&&!e.target.closest('#mobMenuBtn')) closeMobMenu();
});

// ── RENDER ────────────────────────────────────────────────────────────────────
function render(){renderTrack();renderCards();renderBar();}

function renderTrack(){
  const el=document.getElementById('initiativeTrack');
  if(!combatants.length){el.innerHTML='<div class="no-combatants">Adicione combatentes para começar</div>';return;}
  el.innerHTML=[...combatants].sort((a,b)=>b.init-a.init).map(c=>{
    const active=combatants[currentTurn]&&combatants[currentTurn].id===c.id;
    const pct=c.hpMax>0?c.hpCur/c.hpMax:0;
    const itemColor = getCombatantColor(c);
    return`<div class="init-token ${c.type}${active?' active':''}${c.dead?' dead':''}" onclick="setTurn('${c.id}')">
      <div class="tok-name" style="color:${itemColor}">${c.name}</div>
      <div class="tok-init">${c.init}</div>
      <div class="tok-hp" style="color:${hpColor(pct)}">${c.hpCur}/${c.hpMax}</div>
    </div>`;
  }).join('');
}

function renderBar(){
  const has=combatants.length>0;
  document.getElementById('roundBadge').textContent=`Rodada ${round}`;
  const a=combatants[currentTurn];
  document.getElementById('turnInfo').innerHTML=a?`Vez de: <span>${a.name}</span>`:'Nenhum combate ativo';
  document.getElementById('btnNext').disabled=!has;
  document.getElementById('btnPrev').disabled=!has;
}

function renderCards(){
  const el=document.getElementById('combatantList');
  if(!combatants.length){el.innerHTML='<div class="empty-state"><div class="big">⚔</div>Nenhum combatente ainda.<br>Adicione pelo painel à direita.</div>';return;}
  el.innerHTML=combatants.map((c,i)=>{
    const pct=c.hpMax>0?c.hpCur/c.hpMax:0;
    const hc=hpColor(pct);
    const active=i===currentTurn;
    const conds=CONDITIONS.map(cd=>{
      const on=c.conditions.includes(cd);
      return`<span class="cond-tag ${on?'active':'inactive'}" onclick="toggleCond('${c.id}','${cd}')">${cd}</span>`;
    }).join('');
    const badges=[
      c.dead?'<span class="badge-sm dead-banner">Morto</span>':'',
      c.fichaId?`<span class="badge-sm ficha-badge"><i class="ti ti-scroll"></i> ${c.fichaClass||'Ficha'} Nv${c.fichaLevel||'?'}</span>`:'',
      c.groupId?'<span class="badge-sm group-badge"><i class="ti ti-users"></i> Grupo</span>':''
    ].join('');
    
    const itemColor = getCombatantColor(c);

    return`<div class="c-card${active?' active-turn':''}${c.dead?' dead':''}">
      <div class="c-card-top">
        <div class="c-avatar" style="background:${itemColor}22; border-color:${itemColor}; color:${itemColor}">${c.name[0].toUpperCase()}</div>
        <div class="c-info">
          <div class="c-name" style="color:${itemColor}">${c.name}${badges}</div>
          <div class="c-meta">CA ${c.ac} · Init ${c.init} · ${c.type==='player'?'Jogador':c.type==='monster'?'Monstro':'NPC'}</div>
        </div>
        <div class="c-init-badge">${c.init}</div>
        <div class="c-actions">
          <button class="btn sm" onclick="openEdit('${c.id}')"><i class="ti ti-edit"></i></button>
          <button class="btn sm danger" onclick="removeCombatant('${c.id}')"><i class="ti ti-trash"></i></button>
        </div>
      </div>
      <div class="hp-row">
        <span style="font-family:'Cinzel',serif;font-size:10px;color:var(--muted);width:20px;flex-shrink:0">HP</span>
        <div class="hp-bar-bg"><div class="hp-bar-fill" style="width:${Math.max(0,pct*100)}%;background:${hc}"></div></div>
        <div class="hp-nums" style="color:${hc}">${c.hpCur}/${c.hpMax}</div>
      </div>
      <div class="hp-actions">
        <input class="hp-input" type="number" id="dmg_${c.id}" placeholder="Qtd" min="0">
        <button class="btn sm danger" onclick="applyDmg('${c.id}',getDmg('${c.id}'),false)"><i class="ti ti-shield-off"></i> Dano</button>
        <button class="btn sm" style="border-color:#3a8c1e;color:#3a8c1e" onclick="applyDmg('${c.id}',getDmg('${c.id}'),true)"><i class="ti ti-heart"></i> Cura</button>
      </div>
      <div class="conditions">${conds}</div>
    </div>`;
  }).join('');
}

render();