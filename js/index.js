// ── THEME (Controle do Tema Claro/Escuro) ───────────────────────────────────
let dark = localStorage.getItem('rpg_theme') !== 'light';

function applyTheme() {
  document.body.classList.toggle('light', !dark);
  const themeBtn = document.getElementById('themeBtn');
  if (themeBtn) {
    themeBtn.textContent = dark ? '☀' : '🌙';
  }
}

function toggleTheme() {
  dark = !dark;
  localStorage.setItem('rpg_theme', dark ? 'dark' : 'light');
  applyTheme();
}

applyTheme();

// ── MOBILE MENU ──────────────────────────────────────────────────────────────
function toggleMobMenu() {
  document.getElementById('mobNav').classList.toggle('open');
}

function closeMobMenu() {
  document.getElementById('mobNav').classList.remove('open');
}

document.addEventListener('click', e => {
  const nav = document.getElementById('mobNav');
  if (nav && nav.classList.contains('open') && !nav.contains(e.target) && !e.target.closest('.mob-menu-btn')) {
    closeMobMenu();
  }
});

// ── GLOSSÁRIOS ───────────────────────────────────────────────────────────────
function adicionarAtalhosGlossarios() {
  const desktopNav = document.querySelector('.nav-links');
  if (desktopNav && !desktopNav.querySelector('[data-items-glossary-link]')) {
    desktopNav.insertAdjacentHTML('beforeend', `
      <a href="./pages/itens.html" class="nav-link" data-items-glossary-link style="text-decoration:none">
        <i class="ti ti-backpack"></i> Itens
      </a>
      <a href="./pages/magias.html" class="nav-link" data-spells-glossary-link style="text-decoration:none">
        <i class="ti ti-sparkles"></i> Magias
      </a>
    `);
  }

  const mobileNav = document.getElementById('mobNav');
  if (mobileNav && !mobileNav.querySelector('[data-items-glossary-link]')) {
    mobileNav.insertAdjacentHTML('beforeend', `
      <a href="./pages/itens.html" class="nav-link" data-items-glossary-link onclick="closeMobMenu()" style="text-decoration:none">
        <i class="ti ti-backpack"></i> Glossário de Itens
      </a>
      <a href="./pages/magias.html" class="nav-link" data-spells-glossary-link onclick="closeMobMenu()" style="text-decoration:none">
        <i class="ti ti-sparkles"></i> Glossário de Magias
      </a>
    `);
  }

  const playerGrid = document.querySelector('#modalPlayerContent .modal-links-grid');
  if (playerGrid && !playerGrid.querySelector('[data-player-glossaries-card]')) {
    playerGrid.insertAdjacentHTML('beforeend', `
      <a href="./pages/itens.html" class="modal-link-card" data-player-glossaries-card>
        <i class="ti ti-backpack"></i>
        <div>
          <h4>Glossário de Itens</h4>
          <p>Consulte armas, armaduras, equipamentos, objetos utilizáveis e itens mágicos que podem ser importados para suas fichas.</p>
        </div>
      </a>
      <a href="./pages/magias.html" class="modal-link-card" data-player-glossaries-card>
        <i class="ti ti-sparkles"></i>
        <div>
          <h4>Glossário de Magias</h4>
          <p>Consulte e crie magias com alcance, componentes, resolução e área de efeito estruturada, prontas para importar para a ficha.</p>
        </div>
      </a>
    `);
  }

  const masterGrid = document.querySelector('.modal-links-grid.mestre');
  if (masterGrid && !masterGrid.querySelector('[data-master-glossaries-card]')) {
    masterGrid.insertAdjacentHTML('beforeend', `
      <a href="./pages/itens.html" class="modal-link-card" data-master-glossaries-card>
        <i class="ti ti-backpack"></i>
        <div>
          <h4>Glossário de Itens</h4>
          <p>Gerencie o acervo de armas, armaduras, equipamentos, consumíveis, itens mágicos e registros personalizados da campanha.</p>
        </div>
      </a>
      <a href="./pages/magias.html" class="modal-link-card" data-master-glossaries-card>
        <i class="ti ti-sparkles"></i>
        <div>
          <h4>Glossário de Magias</h4>
          <p>Monte magias com dados mecânicos e geométricos separados, preparados para fichas e para uma futura projeção em mapa tático.</p>
        </div>
      </a>
    `);
  }

  const moduleCount = document.querySelector('.about-stats .stat-box .stat-num');
  if (moduleCount) moduleCount.textContent = '8';
}

// ── CHANGELOG TOGGLE ─────────────────────────────────────────────────────────
function toggleLog(header) {
  const item = header.parentElement;
  item.classList.toggle('open');
}

// ── CHANGELOG FILTER ─────────────────────────────────────────────────────────
function filterLogs(type, btn) {
  document.querySelectorAll('.update-filter-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  document.querySelectorAll('.changelog-item').forEach(item => {
    item.style.display = (type === 'all' || item.dataset.type === type) ? '' : 'none';
  });
}

// ── SCROLL REVEAL ────────────────────────────────────────────────────────────
const observer = new IntersectionObserver(entries => {
  entries.forEach(e => {
    if (e.isIntersecting) {
      e.target.classList.add('visible');
      observer.unobserve(e.target);
    }
  });
}, {
  threshold: 0.08
});

document.addEventListener('DOMContentLoaded', () => {
  adicionarAtalhosGlossarios();
  document.querySelectorAll('.reveal').forEach(el => observer.observe(el));
});

// ── MODAL CONTROL (Jogador / Mestre) ────────────────────────────────────────
function openRoleModal(role) {
  const modal = document.getElementById('roleModal');
  const playerContent = document.getElementById('modalPlayerContent');
  const masterContent = document.getElementById('modalMasterContent');

  if (role === 'jogador') {
    playerContent.style.display = 'block';
    masterContent.style.display = 'none';
  } else if (role === 'mestre') {
    playerContent.style.display = 'none';
    masterContent.style.display = 'block';
  }

  modal.classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeRoleModal() {
  const modal = document.getElementById('roleModal');
  modal.classList.remove('open');
  document.body.style.overflow = '';
}

function closeRoleModalOnBackdrop(event) {
  if (event.target.id === 'roleModal') {
    closeRoleModal();
  }
}
