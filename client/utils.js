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
  // Nota: sistema agora permite acesso público a todas as páginas.
  // Se houver um token, validamos silenciosamente; caso contrário
  // não redirecionamos para `login.html` para permitir acesso anônimo.
  if (currentPage() === 'login.html') return;
  const token = getToken();
  if (token) {
    // Valida o token no servidor, mas falhas não forçam redirect.
    apiFetch('/api/auth/me').catch(() => {});
  }
}
requireAuth();

// -----------------------------
// Authorization helpers
// -----------------------------
function getAuthUser() {
  return getSession() || {};
}

function getUserGroups() {
  const u = getAuthUser();
  // backend may use 'groups' or 'grupos' or not provide at all
  return Array.isArray(u.groups) ? u.groups : (Array.isArray(u.grupos) ? u.grupos : []);
}

function isPrivilegedUser() {
  const groups = getUserGroups().map(g => String(g).toLowerCase());
  // accept common spellings
  if (groups.includes('informatica') || groups.includes('informática') || groups.includes('helpdesk') || groups.includes('helpdeski')) return true;
  const u = getAuthUser();
  // fallback to server profile/role if groups are not available
  if (u.profile === 'fiscal' || u.role === 'admin' || u.profile === 'admin_fiscalizacao') return true;
  return false;
}

function enforceUiPermissions() {
  try {
    const privileged = isPrivilegedUser();
    document.querySelectorAll('.sidebar nav a').forEach(a => {
      const href = a.getAttribute('href');
      if (!privileged) {
        // non-privileged users keep only machines and history (fila.html renamed to history view)
        const allowed = ['machines.html', 'fila.html', 'index.html', 'login.html'];
        if (!href || !allowed.includes(href)) a.style.display = 'none';
      } else {
        a.style.display = '';
      }
    });
  } catch (e) { /* noop on pages without sidebar */ }
}

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
    clearSession();
    localStorage.removeItem('user_initials');
    localStorage.removeItem('selected_unit');
    window.location.href = 'login.html';
  });
}

document.addEventListener('DOMContentLoaded', () => {
  setUserAvatar();
  highlightActiveLink();
  setupSair();
  enforceUiPermissions();
  if (typeof lucide !== 'undefined') lucide.createIcons();
});
