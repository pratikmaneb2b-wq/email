/**
 * auth.js  –  Frontend authentication helpers
 *
 * The JWT is stored in sessionStorage (cleared when the tab closes).
 * Never stored in localStorage to reduce exposure time.
 *
 * Usage:
 *   import { getToken, requireLogin, logout, apiFetch } from './auth.js';
 */

// Empty string = relative URLs. Works on Vercel (same domain) and
// local dev when running `npm run dev` from the project root.
const API_BASE = window.APP_CONFIG?.apiBase ?? '';

export function getToken() {
  return sessionStorage.getItem('admin_token');
}

export function requireLogin() {
  if (!getToken()) {
    window.location.href = '/index.html';
  }
}

export function logout() {
  sessionStorage.removeItem('admin_token');
  window.location.href = '/index.html';
}

/**
 * Wrapper around fetch that:
 *  - Adds the Authorization header automatically
 *  - Redirects to login if 401
 *  - Returns parsed JSON or throws on error
 */
export async function apiFetch(path, options = {}) {
  const token = getToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  };

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });

  if (res.status === 401) {
    logout();
    return;
  }

  const json = await res.json().catch(() => null);

  if (!res.ok) {
    throw new Error(json?.error || `HTTP ${res.status}`);
  }
  return json;
}

/**
 * Login form handler – called from index.html
 */
export async function handleLogin(e) {
  e.preventDefault();
  const form   = e.target;
  const btn    = form.querySelector('button[type="submit"]');
  const errEl  = document.getElementById('login-error');

  errEl.textContent = '';
  errEl.style.display = 'none';
  btn.disabled = true;
  btn.textContent = 'Signing in…';

  try {
    const res = await fetch(`${API_BASE}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: form.username.value.trim(),
        password: form.password.value
      })
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Login failed');

    sessionStorage.setItem('admin_token', json.token);
    window.location.href = '/dashboard.html';
  } catch (err) {
    errEl.textContent = err.message;
    errEl.style.display = 'block';   // ← was missing; error div stayed hidden
  } finally {
    btn.disabled = false;
    btn.textContent = 'Sign In';
  }
}
