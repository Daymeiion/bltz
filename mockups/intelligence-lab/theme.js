'use strict';
(() => {
  const requested = new URLSearchParams(location.search).get('theme');
  let saved;
  try { saved = localStorage.getItem('bltz-intelligence-design-theme'); } catch {}
  document.documentElement.dataset.theme = requested === 'light' || requested === 'dark' ? requested : saved === 'light' ? 'light' : 'dark';
})();
