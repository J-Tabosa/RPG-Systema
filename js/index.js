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
  document.querySelectorAll('.reveal').forEach(el => observer.observe(el));
});