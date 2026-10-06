'use strict';
window.LAB_CENTERS = {};
window.LAB_UI = {
  e(value) { return String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); },
  date(value) { if (!value) return 'Date unknown'; const date = new Date(value.slice(0,10) + 'T12:00:00Z'); return Number.isNaN(date.getTime()) ? 'Date unknown' : new Intl.DateTimeFormat('en-US', {month:'short',day:'numeric',year:'numeric',timeZone:'UTC'}).format(date); },
  reviewPriority(value) {
    if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value > 100) return null;
    return value <= 40 ? 'Low' : value <= 70 ? 'Mid' : 'High';
  },
  priorityRing(value) {
    const category = this.reviewPriority(value);
    return `<div class="priority-ring${category ? '' : ' priority-ring-empty'}" role="img" aria-label="Review priority: ${this.e(category || 'Not scored')}"><svg viewBox="0 0 64 64" aria-hidden="true" focusable="false"><circle class="priority-ring-track" cx="32" cy="32" r="26" fill="none" stroke-width="5"/>${category ? `<circle class="priority-ring-arc" cx="32" cy="32" r="26" fill="none" stroke-width="5" pathLength="100" stroke-dasharray="100" stroke-dashoffset="${this.e(100 - value)}" transform="rotate(-90 32 32)"/>` : ''}</svg><span aria-hidden="true">${this.e(category || '—')}</span></div>`;
  },
  confidenceRing(value) {
    const valid = typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 100;
    const label = valid ? `${value}%` : 'Not supplied';
    return `<div class="priority-ring confidence-ring${valid ? '' : ' priority-ring-empty'}" role="img" aria-label="Evidence confidence: ${this.e(label)}"><svg viewBox="0 0 64 64" aria-hidden="true" focusable="false"><circle class="priority-ring-track" cx="32" cy="32" r="26" fill="none" stroke-width="5"/>${valid ? `<circle class="priority-ring-arc" cx="32" cy="32" r="26" fill="none" stroke-width="5" pathLength="100" stroke-dasharray="100" stroke-dashoffset="${this.e(100 - value)}" transform="rotate(-90 32 32)"/>` : ''}</svg><span aria-hidden="true">${this.e(valid ? label : '—')}</span></div>`;
  },
  sourceLogo(source) {
    const logos = new Map([
      ['USC Athletics', 'assets/usc-athletics-logo.svg'],
      ['Sportradar NFL', 'assets/sportradar-logo.svg']
    ]);
    const asset = logos.get(source.name);
    return `<div class="source-logo">${asset ? `<img src="${this.e(asset)}" alt="${this.e(source.name)} logo" loading="lazy" decoding="async">` : ''}<span class="source-logo-missing"${asset ? ' hidden' : ''}>Logo not provided</span></div>`;
  },
  url(view, state, overrides = {}) {
    const target = view === 'moment' ? 'moment' : 'athlete';
    const params = new URLSearchParams({athlete:overrides.athleteId || state.athlete.id, moment:overrides.momentKey || state.momentKey, theme:overrides.theme || document.documentElement.dataset.theme || state.theme || 'dark'});
    return `${target}.html?${params}`;
  },
  sourceLink(source) { return source.url ? `<a href="${this.e(source.url)}" target="_blank" rel="noopener noreferrer">Open source ${this.icon('arrow')}</a>` : '<span>Saved provider record</span>'; },
  icon(name) {
    const paths = {
      search:'<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 4 4"/>',
      arrow:'<path d="M5 12h14m-5-5 5 5-5 5"/>',
      chevron:'<path d="m9 5 7 7-7 7"/>',
      file:'<path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><path d="M14 3v6h6M8 13h8M8 17h5"/>',
      people:'<circle cx="9" cy="8" r="3"/><path d="M3 21v-3a6 6 0 0 1 12 0v3m2-16a3 3 0 0 1 0 6m2 10v-3a6 6 0 0 0-3-5"/>',
      link:'<path d="m10 13 4-4m-6 2-2 2a4 4 0 0 0 6 6l2-2m-4-10 2-2a4 4 0 0 1 6 6l-2 2"/>',
      check:'<path d="m5 12 4 4L19 6"/>',
      plus:'<path d="M12 5v14M5 12h14"/>',
      close:'<path d="m6 6 12 12M18 6 6 18"/>',
      calendar:'<rect x="3" y="5" width="18" height="16" rx="3"/><path d="M16 3v4M8 3v4M3 11h18"/>',
      grid:'<rect x="3" y="3" width="7" height="7" rx="2"/><rect x="14" y="3" width="7" height="7" rx="2"/><rect x="3" y="14" width="7" height="7" rx="2"/><rect x="14" y="14" width="7" height="7" rx="2"/>',
      sun:'<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M19 5l-1.5 1.5m-11 11L5 19"/>',
      moon:'<path d="M20.5 14A9 9 0 0 1 10 3.5 9 9 0 1 0 20.5 14z"/>',
      camera:'<path d="M8 5 9.5 3h5L16 5h4a1 1 0 0 1 1 1v13H3V6a1 1 0 0 1 1-1z"/><circle cx="12" cy="12" r="4"/>',
      shield:'<path d="m12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6z"/><path d="m8 12 3 3 5-6"/>',
      mail:'<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 6 9 7 9-7"/>',
      phone:'<path d="M7 3H4a1 1 0 0 0-1 1c0 9.4 7.6 17 17 17a1 1 0 0 0 1-1v-3l-5-2-2 3c-3.5-1.4-6.1-4-7.5-7.5L9 8z"/>',
      social:'<circle cx="6" cy="12" r="3"/><circle cx="18" cy="5" r="3"/><circle cx="18" cy="19" r="3"/><path d="m8.5 10.5 7-4M8.5 13.5l7 4"/>',
      copy:'<rect x="8" y="8" width="12" height="13" rx="2"/><path d="M16 8V3H3v13h5"/>',
      locker:'<rect x="5" y="2" width="14" height="20" rx="2"/><path d="M8 6h8M8 9h8M15 13v3"/>',
      identity:'<rect x="2" y="4" width="20" height="16" rx="3"/><circle cx="8" cy="10" r="2"/><path d="M5 16v-1a3 3 0 0 1 6 0v1M14 9h5M14 13h5M14 16h3"/>'
    };
    return `<svg class="ui-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name] || paths.file}</svg>`;
  }
};
