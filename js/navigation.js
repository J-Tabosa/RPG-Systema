(function () {
  const STORAGE_KEY = 'rpg_scope';
  const MASTER_ONLY = new Set(['campanha.html', 'conteudo.html', 'monstros.html', 'tracker.html']);
  const PLAYER_ONLY = new Set(['ficha.html']);
  const pathname = window.location.pathname;
  const inPages = pathname.includes('/pages/');
  const currentFile = inPages ? (pathname.split('/').pop() || '') : 'index.html';

  const MENUS = {
    player: [
      { file: 'index.html', label: 'Início', icon: 'ti-home' },
      { file: 'ficha.html', label: 'Fichas de Personagem', icon: 'ti-scroll' },
      { file: 'gerador.html', label: 'Gerador de Personagens', icon: 'ti-sparkles' },
      { file: 'itens.html', label: 'Glossário de Itens', icon: 'ti-backpack' },
      { file: 'magias.html', label: 'Glossário de Magias', icon: 'ti-wand' }
    ],
    master: [
      { file: 'index.html', label: 'Início', icon: 'ti-home' },
      { file: 'campanha.html', label: 'Gestor de Campanhas', icon: 'ti-map-2' },
      { file: 'gerador.html', label: 'Gerador de NPCs', icon: 'ti-sparkles' },
      { file: 'tracker.html', label: 'Combat Tracker', icon: 'ti-sword' },
      { file: 'conteudo.html', label: 'Gestor de Conteúdo', icon: 'ti-database' },
      { file: 'monstros.html', label: 'Monstropédia', icon: 'ti-skull' },
      { file: 'itens.html', label: 'Glossário de Itens', icon: 'ti-backpack' },
      { file: 'magias.html', label: 'Glossário de Magias', icon: 'ti-wand' }
    ]
  };

  function validScope(scope) {
    return scope === 'player' || scope === 'master';
  }

  function scopeForPage() {
    if (MASTER_ONLY.has(currentFile)) return 'master';
    if (PLAYER_ONLY.has(currentFile)) return 'player';
    const saved = localStorage.getItem(STORAGE_KEY);
    return validScope(saved) ? saved : null;
  }

  let scope = scopeForPage();

  if (MASTER_ONLY.has(currentFile) || PLAYER_ONLY.has(currentFile)) {
    localStorage.setItem(STORAGE_KEY, scope);
  }

  function hrefFor(file) {
    if (file === 'index.html') return inPages ? '../index.html' : 'index.html';
    return inPages ? file : './pages/' + file;
  }

  function closeMenu() {
    document.body.classList.remove('app-menu-open');
    document.getElementById('appDrawer')?.classList.remove('open');
    document.getElementById('appDrawerBackdrop')?.classList.remove('open');
    const button = document.getElementById('appMenuBtn');
    if (button) button.setAttribute('aria-expanded', 'false');
  }

  function openMenu() {
    document.body.classList.add('app-menu-open');
    document.getElementById('appDrawer')?.classList.add('open');
    document.getElementById('appDrawerBackdrop')?.classList.add('open');
    const button = document.getElementById('appMenuBtn');
    if (button) button.setAttribute('aria-expanded', 'true');
  }

  function toggleMenu() {
    if (document.getElementById('appDrawer')?.classList.contains('open')) closeMenu();
    else openMenu();
  }

  function menuMarkup() {
    if (!scope) {
      return `
        <a class="app-drawer-link active" href="${hrefFor('index.html')}">
          <i class="ti ti-home"></i><span>Início</span>
        </a>
        <div class="app-drawer-empty">
          <i class="ti ti-directions"></i>
          <strong>Escolha seu papel</strong>
          <span>Selecione Jogador ou Mestre na página inicial para definir as ferramentas deste menu.</span>
        </div>
      `;
    }

    return MENUS[scope].map(item => {
      const active = item.file === currentFile;
      return `
        <a class="app-drawer-link ${active ? 'active' : ''}" href="${hrefFor(item.file)}">
          <i class="ti ${item.icon}"></i>
          <span>${item.label}</span>
          ${active ? '<i class="ti ti-point-filled app-current-dot" aria-hidden="true"></i>' : ''}
        </a>
      `;
    }).join('');
  }

  function renderDrawer() {
    const old = document.getElementById('appDrawerRoot');
    old?.remove();

    const roleTitle = scope === 'master' ? 'Painel do Mestre' : scope === 'player' ? 'Painel do Jogador' : 'RPG System';
    const roleIcon = scope === 'master' ? 'ti-crown' : scope === 'player' ? 'ti-user-shield' : 'ti-dice-5';

    document.body.insertAdjacentHTML('beforeend', `
      <div id="appDrawerRoot">
        <div class="app-drawer-backdrop" id="appDrawerBackdrop"></div>
        <aside class="app-drawer" id="appDrawer" aria-label="Navegação do sistema">
          <div class="app-drawer-head">
            <div class="app-drawer-role">
              <span class="app-role-icon"><i class="ti ${roleIcon}"></i></span>
              <div>
                <small>Navegação</small>
                <h2>${roleTitle}</h2>
              </div>
            </div>
            <button class="app-menu-close" id="appMenuClose" type="button" aria-label="Fechar menu">
              <i class="ti ti-x"></i>
            </button>
          </div>
          <nav class="app-drawer-links">
            ${menuMarkup()}
          </nav>
          <div class="app-drawer-foot">
            ${scope ? `Exibindo apenas ferramentas de <strong>${scope === 'master' ? 'Mestre' : 'Jogador'}</strong>. Para trocar, volte ao Início.` : 'O menu será definido quando você escolher um papel.'}
          </div>
        </aside>
      </div>
    `);

    document.getElementById('appDrawerBackdrop')?.addEventListener('click', closeMenu);
    document.getElementById('appMenuClose')?.addEventListener('click', closeMenu);
    document.querySelectorAll('.app-drawer-link').forEach(link => link.addEventListener('click', closeMenu));
  }

  function normalizeHeader() {
    const header = document.querySelector('.header');
    if (!header) return;

    header.querySelectorAll('.nav-links').forEach(el => el.remove());
    header.querySelectorAll('.header-actions .nav-link').forEach(el => el.remove());
    header.querySelectorAll('.mob-nav, .mob-menu-btn').forEach(el => el.remove());

    let actions = header.querySelector('.header-actions');
    if (!actions) {
      actions = document.createElement('div');
      actions.className = 'header-actions';
      header.appendChild(actions);
    }

    document.getElementById('appMenuBtn')?.remove();
    const button = document.createElement('button');
    button.id = 'appMenuBtn';
    button.className = 'app-menu-btn';
    button.type = 'button';
    button.setAttribute('aria-label', 'Abrir navegação');
    button.setAttribute('aria-expanded', 'false');
    button.innerHTML = '<i class="ti ti-menu-2"></i><span>Menu</span>';
    button.addEventListener('click', toggleMenu);
    actions.appendChild(button);

    header.classList.add('app-header-contextual');
  }

  function render() {
    scope = scopeForPage();
    normalizeHeader();
    renderDrawer();
  }

  function setScope(nextScope) {
    if (!validScope(nextScope)) return;
    localStorage.setItem(STORAGE_KEY, nextScope);
    scope = nextScope;
    render();
  }

  window.setAppScope = setScope;
  window.getAppScope = () => scope;
  window.RPGNavigation = { render, open: openMenu, close: closeMenu, setScope };

  document.addEventListener('click', event => {
    const playerLink = event.target.closest('#modalPlayerContent .modal-link-card');
    if (playerLink) setScope('player');

    const masterLink = event.target.closest('#modalMasterContent .modal-link-card');
    if (masterLink) setScope('master');

    const roleCard = event.target.closest('.role-card');
    if (roleCard) setScope(roleCard.classList.contains('master') ? 'master' : 'player');
  }, true);

  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') closeMenu();
  });

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', render);
  else render();
})();