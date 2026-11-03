// @ts-check
/**
 * Kleiner DOM-Helfer: h('button.btn.primary', {onclick}, 'Text')
 * @param {string} sel
 * @param {Record<string, any>|null} [attrs]
 * @param {...(Node|string|null|false|undefined)} children
 * @returns {HTMLElement}
 */
export function h(sel, attrs, ...children) {
  const [tag, ...classes] = sel.split('.');
  const el = document.createElement(tag || 'div');
  if (classes.length) el.className = classes.join(' ');
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v === undefined || v === null || v === false) continue;
    if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
    else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
    else if (k in el && typeof v !== 'string') /** @type {any} */ (el)[k] = v;
    else el.setAttribute(k, v === true ? '' : String(v));
  }
  for (const c of children) if (c !== null && c !== undefined && c !== false) el.append(c);
  return el;
}

export const $ = (/** @type {string} */ s) => /** @type {HTMLElement} */ (document.querySelector(s));
