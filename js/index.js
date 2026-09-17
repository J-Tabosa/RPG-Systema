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

// Inicializa o tema ao carregar
applyTheme();

// ── MOBILE MENU (Navegação Responsiva) ───────────────────────────────────────
function toggleMobMenu() {
  document.getElementById('mobNav').classList.toggle('open');
}

function closeMobMenu() {
  document.getElementById('mobNav').classList.remove('open');
}

// Fecha o menu móvel ao clicar fora dele
document.addEventListener('click', e => {
  const nav = document.getElementById('mobNav');
  if (nav && nav.classList.contains('open') && !nav.contains(e.target) && !e.target.closest('.mob-menu-btn')) {
    closeMobMenu();
  }
});

// ── GLOSSÁRIO DE ITENS MÁGICOS ──────────────────────────────────────────────
function adicionarAtalhosItensMagicos() {
  const desktopNav = document.querySelector('.nav-links');
  if (desktopNav && !desktopNav.querySelector('[data-magic-items-link]')) {
    desktopNav.insertAdjacentHTML('beforeend', `
      <a href="./pages/itens.html" class="nav-link" data-magic-items-link style="text-decoration:none">
        <i class="ti ti-gem"></i> Itens
      </a>
    `);
  }

  const mobileNav = document.getElementById('mobNav');
  if (mobileNav && !mobileNav.querySelector('[data-magic-items-link]')) {
    mobileNav.insertAdjacentHTML('beforeend', `
      <a href="./pages/itens.html" class="nav-link" data-magic-items-link onclick="closeMobMenu()" style="text-decoration:none">
        <i class="ti ti-gem"></i> Glossário de Itens Mágicos
      </a>
    `);
  }

  const masterGrid = document.querySelector('.modal-links-grid.mestre');
  if (masterGrid && !masterGrid.querySelector('[data-magic-items-card]')) {
    masterGrid.insertAdjacentHTML('beforeend', `
      <a href="./pages/itens.html" class="modal-link-card" data-magic-items-card>
        <i class="ti ti-gem"></i>
        <div>
          <h4>Glossário de Itens Mágicos</h4>
          <p>Consulte relíquias, artefatos e objetos únicos da campanha, com filtros e informações reservadas ao mestre.</p>
        </div>
      </a>
    `);
  }

  const moduleCount = document.querySelector('.about-stats .stat-box .stat-num');
  if (moduleCount && moduleCount.textContent.trim() === '6') {
    moduleCount.textContent = '7';
  }
}

// ── CHANGELOG TOGGLE (Expandir/Recolher Versões) ─────────────────────────────
function toggleLog(header) {
  const item = header.parentElement;
  item.classList.toggle('open');
}

// ── CHANGELOG FILTER (Filtro por Categoria) ──────────────────────────────────
function filterLogs(type, btn) {
  // Remove classe ativa de todos os botões de filtro
  document.querySelectorAll('.update-filter-btn').forEach(b => b.classList.remove('active'));
  // Ativa o botão clicado
  btn.classList.add('active');
  
  // Mostra ou oculta os itens de acordo com o tipo correspondente
  document.querySelectorAll('.changelog-item').forEach(item => {
    item.style.display = (type === 'all' || item.dataset.type === type) ? '' : 'none';
  });
}

// ── SCROLL REVEAL (Exposição ao Rolar a Página) ──────────────────────────────
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

// Vincula o observador aos elementos com a classe "reveal" após o carregamento
document.addEventListener('DOMContentLoaded', () => {
  adicionarAtalhosItensMagicos();
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
  document.body.style.overflow = 'hidden'; // Impede scroll atrás do modal
}

function closeRoleModal() {
  const modal = document.getElementById('roleModal');
  modal.classList.remove('open');
  document.body.style.overflow = ''; // Restaura scroll
}

function closeRoleModalOnBackdrop(event) {
  // Fecha o modal caso clique na área desfocada externa ao container principal
  if (event.target.id === 'roleModal') {
    closeRoleModal();
  }
}