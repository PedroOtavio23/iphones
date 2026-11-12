// Utilitários compartilhados. Todo HTML é montado com createElement/textContent (sem innerHTML) para evitar XSS.
export function h(tag, attrs, ...kids) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v == null || v === false) continue;
    if (k === 'class') e.className = v;
    else if (k === 'style') for (const [a, b] of Object.entries(v)) e.style.setProperty(a, b);
    else if (k.startsWith('on') && typeof v === 'function') e.addEventListener(k.slice(2), v);
    else e.setAttribute(k, v === true ? '' : v);
  }
  for (const c of kids.flat(9)) { if (c == null || c === false) continue; e.append(c.nodeType ? c : document.createTextNode(String(c))); }
  return e;
}
const NS = 'http://www.w3.org/2000/svg';
export function s(tag, attrs, ...kids) {
  const e = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs || {})) e.setAttribute(k, v);
  for (const c of kids.flat(9)) if (c != null) e.append(c.nodeType ? c : document.createTextNode(String(c)));
  return e;
}
export const brl = (c) => (c / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
export const dt = (t) => new Date(t).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
export const clear = (el) => { while (el.firstChild) el.removeChild(el.firstChild); return el; };

let csrf = '';
export const setCsrf = (t) => { csrf = t; };
// Modo vitrine estática (GitHub Pages): não há servidor, então nada é enviado pela rede.
export async function api() { throw new Error('Vitrine de demonstração: esta função precisa do servidor da loja.'); }
export async function initSession() { return null; }
export function track() {}
export function toast(msg) {
  let t = document.getElementById('toast');
  if (!t) { t = h('div', { id: 'toast', class: 'toast', role: 'status' }); document.body.append(t); }
  t.textContent = msg; t.classList.add('on'); clearTimeout(t._h); t._h = setTimeout(() => t.classList.remove('on'), 2400);
}
export function renderLegal(el, body) {
  clear(el); let ul = null;
  for (const raw of String(body).split('\n')) {
    const line = raw.trimEnd();
    if (line.startsWith('- ')) { if (!ul) { ul = h('ul'); el.append(ul); } ul.append(h('li', null, line.slice(2))); continue; }
    ul = null;
    if (line.startsWith('# ')) el.append(h('h2', null, line.slice(2)));
    else if (line.startsWith('## ')) el.append(h('h3', null, line.slice(3)));
    else if (line.trim()) el.append(h('p', null, line));
  }
}
