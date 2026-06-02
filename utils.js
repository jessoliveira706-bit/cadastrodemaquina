function escapeHtml(s) {
  if (!s) return '';
  return String(s).replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;',
    '"': '&quot;', "'": '&#39;'
  }[c]));
}

function loadData(key) {
  try { return JSON.parse(localStorage.getItem(key) || '[]') } catch (e) { return [] }
}

function saveData(key, list) {
  localStorage.setItem(key, JSON.stringify(list));
}

function setUserAvatar() {
  const el = document.getElementById('userAvatar');
  if (el) el.textContent = localStorage.getItem('user_initials') || 'U';
}

function highlightActiveLink() {
  const page = window.location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.sidebar nav a').forEach(a => {
    a.classList.toggle('active', a.getAttribute('href') === page);
  });
}

function setupSair() {
  const btn = document.getElementById('btnSair');
  if (!btn) return;
  btn.addEventListener('click', () => {
    if (confirm('Deseja realmente sair?')) {
      localStorage.removeItem('user_initials');
      localStorage.removeItem('selected_unit');
      window.location.href = 'index.html';
    }
  });
}

document.addEventListener('DOMContentLoaded', () => {
  setUserAvatar();
  highlightActiveLink();
  setupSair();
});
