// ---------------------------------------------------------------------------
// Auth client (vanilla) — espelha o padrão do auth-kit/client.
// Sessão guardada em sessionStorage["auth_user"] = { token, sub, nome, ... }.
// O backend (BD_2.2/server) serve estas páginas, então a API é same-origin.
// ---------------------------------------------------------------------------
const AUTH_KEY = 'auth_user';

function getSession() {
  try { return JSON.parse(sessionStorage.getItem(AUTH_KEY) || 'null'); }
  catch (e) { return null; }
}

function getToken() {
  return getSession()?.token || null;
}

function clearSession() {
  sessionStorage.removeItem(AUTH_KEY);
}

function currentPage() {
  return window.location.pathname.split('/').pop() || 'index.html';
}

// fetch com Authorization: Bearer; em 401 limpa a sessão e volta ao login.
async function apiFetch(path, options = {}) {
  const token = getToken();
  const res = await fetch(path, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  if (res.status === 401) {
    clearSession();
    window.location.href = 'login.html';
    throw new Error('Não autenticado');
  }
  return res;
}

// Guarda de rota: páginas protegidas exigem token. Roda imediatamente.
function requireAuth() {
  if (currentPage() === 'login.html') return;
  if (!getToken()) {
    window.location.href = 'login.html';
    return;
  }
  // Valida o token no servidor (pega token expirado mesmo sem outra chamada).
  apiFetch('/api/auth/me').catch(() => {});
}
requireAuth();

// ---------------------------------------------------------------------------
// Helpers existentes / chrome compartilhado
// ---------------------------------------------------------------------------
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

function initialsFrom(nome) {
  if (!nome) return '';
  return nome.trim().split(/\s+/).map(w => w[0]).slice(0, 2).join('').toUpperCase();
}

function setUserAvatar() {
  const el = document.getElementById('userAvatar');
  if (!el) return;
  const session = getSession();
  el.textContent = initialsFrom(session?.nome) || localStorage.getItem('user_initials') || 'U';
}

function highlightActiveLink() {
  const page = currentPage();
  document.querySelectorAll('.sidebar nav a').forEach(a => {
    a.classList.toggle('active', a.getAttribute('href') === page);
  });
}

function setupSair() {
  const btn = document.getElementById('btnSair');
  if (!btn) return;
  btn.addEventListener('click', () => {
    if (confirm('Deseja realmente sair?')) {
      clearSession();
      localStorage.removeItem('user_initials');
      localStorage.removeItem('selected_unit');
      window.location.href = 'login.html';
    }
  });
}

document.addEventListener('DOMContentLoaded', () => {
  setUserAvatar();
  highlightActiveLink();
  setupSair();
});
