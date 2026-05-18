/**
 * Clones a `<template>` by id. Optional callback receives the cloned fragment.
 * @param {string} templateId
 * @param {(root: DocumentFragment) => void} [fill]
 * @returns {DocumentFragment|null}
 */
export function cloneTemplate(templateId, fill) {
  const tpl = document.getElementById(templateId);
  if (!tpl) return null;
  const fragment = tpl.content.cloneNode(true);
  if (fill) fill(fragment);
  return fragment;
}
