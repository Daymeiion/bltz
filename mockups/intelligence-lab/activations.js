'use strict';
(() => {
  const STORAGE_KEY = 'bltz-lab-sample-activation-v1';
  const CAREER_ID = 'c5dae871-a277-4256-9a0c-17a40940ad3f';
  const BRAND_CATALOG = ['BLTZ', 'Nike', 'USC Alumni'];
  const MAX_MEDIA = 8;
  const METRICS = Object.freeze({reach:48200, impressions:68400, engagements:3950, clicks:1280, starts:32200, completions:21300});
  const PLATFORMS = [
    {name:'Instagram', impressions:38400, engagements:2360, clicks:730},
    {name:'YouTube', impressions:22000, engagements:1210, clicks:410},
    {name:'LinkedIn', impressions:8000, engagements:380, clicks:140}
  ];
  const TIMELINE = [12600,14800,10400,8600,7200,6100,5300,3400];
  const BASE_MEDIA = [
    {id:'sample-image', kind:'image', name:'Career rewind · sample artwork', url:'assets/activation-sample-poster.svg', sample:true},
    {id:'sample-video', kind:'video', name:'Career rewind · sample motion study', url:'assets/activation-sample-reel.mp4', sample:true}
  ];
  const BASE = {title:'Washington ’06 · Career rewind', description:'A sample career rewind connecting Keith Rivers’ Washington performance to the 20-year anniversary. Illustrative creative and results demonstrate how an activation could be reviewed.', release:'2026-10-07', status:'Scheduled', brands:['BLTZ','Nike'], media:BASE_MEDIA};
  const clone = value => ({...value, brands:[...value.brands], media:value.media.map(item => ({...item}))});
  const e = value => window.LAB_UI.e(value);
  const icon = name => window.LAB_UI.icon(name);
  const number = value => new Intl.NumberFormat('en-US').format(value);
  const rate = (part, total) => total > 0 ? (part / total * 100).toFixed(2) + '%' : 'Not available';
  const validDate = value => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(new Date(value + 'T00:00:00Z').getTime()) && new Date(value + 'T00:00:00Z').toISOString().slice(0,10) === value;
  const cleanText = (value, length) => typeof value === 'string' && value.trim() && value.trim().length <= length ? value.trim() : null;
  const ownedURLs = new Set();
  let saved = clone(BASE), draft = null, currentState = null, dialog = null, railHost = null, live = null, opener = null;
  let mediaSerial = 0;
  try {
    const value = JSON.parse(sessionStorage.getItem(STORAGE_KEY) || 'null');
    if (value?.careerId === CAREER_ID && value?.moment === 'usc') {
      saved.title = cleanText(value.title,100) || BASE.title;
      saved.description = cleanText(value.description,500) || BASE.description;
      saved.release = validDate(value.release) ? value.release : BASE.release;
      saved.status = ['Draft','Scheduled','Released'].includes(value.status) ? value.status : BASE.status;
      if (Array.isArray(value.brands)) saved.brands = [...new Set(value.brands.map(item=>cleanText(item,50)).filter(Boolean))].slice(0,8);
      if (Array.isArray(value.mediaIds)) saved.media = BASE_MEDIA.filter(item=>value.mediaIds.includes(item.id)).map(item=>({...item}));
    }
  } catch { /* The preview remains usable when browser storage is unavailable. */ }

  function eligible(state) {
    return Boolean(state?.hasIntelligence && state.athlete?.id === CAREER_ID && (state.view === 'athlete' || state.momentKey === 'usc'));
  }
  function renderRail(state) {
    currentState = state;
    const available = eligible(state);
    const card = `<ul class="rail-list" aria-label="Sample activations"><li><details class="rail-card" id="activation-career-rewind"><summary class="rail-card-summary"><span class="rail-summary-copy"><span class="rail-overline">Sample activation · Illustrative metrics</span><strong class="rail-card-title">${e(saved.title)}</strong><span class="rail-summary-meta">${e(saved.status)} · ${e(window.LAB_UI.date(saved.release))}</span></span><span class="rail-chevron">${icon('chevron')}</span></summary><div class="rail-card-content"><p class="activation-card-context">From the alumni retrospective opportunity</p><div class="activation-card-brands" aria-label="Sample brand associations">${saved.brands.length ? saved.brands.map(brand=>`<span>${e(brand)}</span>`).join('') : '<span>No brands attached</span>'}</div><p class="activation-card-release">Release <time datetime="${e(saved.release)}">${e(window.LAB_UI.date(saved.release))}</time></p><dl class="activation-card-metrics"><div><dt>Unique reach</dt><dd>${number(METRICS.reach)}</dd></div><div><dt>Impressions</dt><dd>${number(METRICS.impressions)}</dd></div><div><dt>Engagement</dt><dd>${rate(METRICS.engagements,METRICS.impressions)}</dd></div></dl><p class="activation-card-note">Illustrative metrics · Oct 7–14, 2026. Sample brand associations; no partnership or clearance is established.</p><button class="quiet-action" type="button" data-see-activation>See activation ${icon('arrow')}</button></div></details></li></ul>`;
    return `<section class="rail-container activation-rail" aria-labelledby="activations-heading"><header class="rail-header"><div class="rail-title"><span class="rail-icon">${icon('grid')}</span><h2 id="activations-heading">Activations</h2></div><span class="rail-count">${available ? 1 : 0}</span></header>${available ? card : `<div class="rail-empty"><strong>No activation sample</strong>${state?.hasIntelligence ? 'The anniversary sample belongs to the Washington Moment.' : 'Select Keith Rivers to inspect the sample activation.'}</div>`}</section>`;
  }
  function brandMarkup() {
    return draft.brands.length ? draft.brands.map((brand,index)=>`<li><span>${e(brand)}</span><button type="button" class="activation-remove" data-remove-brand="${index}" aria-label="Remove sample brand ${e(brand)}">${icon('close')}</button></li>`).join('') : '<li class="activation-empty">No brands attached. Choose a brand or add a name below.</li>';
  }
  function mediaMarkup() {
    return draft.media.length ? draft.media.map(item=>`<li class="activation-media-card"><div class="activation-media-preview">${item.kind === 'video' ? `<video controls playsinline tabindex="0" preload="metadata" poster="assets/activation-sample-poster.svg" aria-label="${e(item.name)}"><source src="${e(item.url)}" type="${e(item.type || 'video/mp4')}">Your browser cannot play this sample video.</video>` : `<img src="${e(item.url)}" alt="${e(item.name)}" loading="lazy">`}</div><div class="activation-media-caption"><div><strong>${e(item.name)}</strong><span>${item.sample ? 'Sample creative · Original BLTZ concept artwork' : 'Local attachment · Not verified or uploaded'}</span></div><button type="button" class="activation-remove" data-remove-media="${e(item.id)}" aria-label="Remove ${e(item.name)}">${icon('close')}</button></div></li>`).join('') : '<li class="activation-empty">No creative attached. Add an image or video to this sample.</li>';
  }
  function metricsMarkup() {
    const metrics = [
      {label:'Unique reach',value:number(METRICS.reach),note:'People reached · illustrative deduplicated total'},
      {label:'Impressions',value:number(METRICS.impressions),note:'Content displays across all sample channels'},
      {label:'Engagements',value:number(METRICS.engagements),note:`${rate(METRICS.engagements,METRICS.impressions)} of impressions`},
      {label:'Link clicks',value:number(METRICS.clicks),note:`${rate(METRICS.clicks,METRICS.impressions)} click-through rate`}
    ];
    return `<section class="activation-section" aria-labelledby="activation-performance-heading"><div class="activation-section-heading"><div><h3 id="activation-performance-heading">Reach & performance</h3><p>Illustrative metrics · Fixed measurement window Oct 7–14, 2026</p></div><span class="activation-sample-tag">Sample results</span></div><dl class="activation-metrics">${metrics.map(item=>`<div><dt>${item.label}</dt><dd>${item.value}<span>${item.note}</span></dd></div>`).join('')}</dl><div class="activation-analytics-grid"><section class="activation-chart" aria-labelledby="activation-chart-heading"><div class="activation-chart-heading"><h4 id="activation-chart-heading">Impressions by day</h4><span>${number(METRICS.impressions)} total</span></div><div class="activation-bars" role="img" aria-label="Illustrative impressions by day: ${TIMELINE.map((value,index)=>`October ${index+7}, ${number(value)}`).join('; ')}">${TIMELINE.map((value,index)=>`<div class="activation-bar-day"><span class="activation-bar-value">${(value / 1000).toFixed(1)}k</span><svg viewBox="0 0 40 100" preserveAspectRatio="none" aria-hidden="true"><rect x="7" y="${100 - value / 14800 * 100}" width="26" height="${value / 14800 * 100}" rx="3"/></svg><span class="activation-bar-label">Oct ${index+7}</span></div>`).join('')}</div><p>Content displays, not distinct people. All eight days are sample data.</p></section><section class="activation-video-metrics" aria-labelledby="activation-video-heading"><h4 id="activation-video-heading">Video & engagement detail</h4><dl><div><dt>Video starts</dt><dd>${number(METRICS.starts)}</dd></div><div><dt>Video completions</dt><dd>${number(METRICS.completions)}</dd></div><div><dt>Completion rate</dt><dd>${rate(METRICS.completions,METRICS.starts)}</dd></div><div><dt>Likes / comments</dt><dd>2,640 / 210</dd></div><div><dt>Shares / saves</dt><dd>530 / 570</dd></div></dl><p>Completion rate = completions ÷ starts. Engagements = likes + comments + shares + saves.</p></section></div><div class="activation-platform-wrap" role="region" aria-label="Channel statistics, scroll horizontally" tabindex="0"><table class="activation-platform-table"><caption>Illustrative channel breakdown</caption><thead><tr><th scope="col">Channel</th><th scope="col">Impressions</th><th scope="col">Engagements</th><th scope="col">Link clicks</th><th scope="col">Engagement rate</th></tr></thead><tbody>${PLATFORMS.map(item=>`<tr><th scope="row">${item.name}</th><td>${number(item.impressions)}</td><td>${number(item.engagements)}</td><td>${number(item.clicks)}</td><td>${rate(item.engagements,item.impressions)}</td></tr>`).join('')}</tbody></table></div><p class="activation-metric-method">Engagement rate = engagements ÷ impressions. Click-through rate = link clicks ÷ impressions. Unique reach is a separate illustrative deduplicated total; it is not a sum of impressions. Editing this sample does not recalculate its fixed illustrative results.</p></section>`;
  }
  function renderDialog() {
    dialog.innerHTML = `<form class="activation-form" id="activation-form"><header class="activation-dialog-heading"><div><span class="activation-eyebrow">Sample activation · Illustrative metrics</span><h2 id="activation-dialog-title">Career rewind</h2><p id="activation-dialog-description">Edit this local concept and inspect sample creative, brands and results.</p></div><button class="activation-close" type="button" data-close-activation aria-label="Close activation and discard unsaved changes">${icon('close')}</button></header><div class="activation-dialog-content"><div class="activation-context"><span>Keith Rivers · USC · Washington ’06</span><p>Moment → Anniversary signal → Alumni retrospective → Sample activation</p><p>Sample brands and creative demonstrate the concept. They do not establish a sponsorship, approved campaign, media rights or real performance.</p></div><section class="activation-section" aria-labelledby="activation-overview-heading"><div class="activation-section-heading"><h3 id="activation-overview-heading">Activation overview</h3><span class="activation-sample-tag">Local sample</span></div><div class="activation-fields"><label class="activation-wide">Activation title<input name="title" type="text" maxlength="100" required value="${e(draft.title)}"></label><label>Release date<input name="release" type="date" required value="${e(draft.release)}"></label><label>Sample status<select name="status">${['Draft','Scheduled','Released'].map(value=>`<option${draft.status === value ? ' selected' : ''}>${value}</option>`).join('')}</select></label><label class="activation-wide">Description<textarea name="description" maxlength="500" rows="3" required>${e(draft.description)}</textarea></label></div></section><section class="activation-section" aria-labelledby="activation-brands-heading"><div class="activation-section-heading"><div><h3 id="activation-brands-heading">Attached brands</h3><p>Sample associations only · No partnership is established</p></div></div><ul class="activation-brand-list" aria-label="Attached sample brands" data-activation-brand-list>${brandMarkup()}</ul><div class="activation-brand-controls"><label>Choose a sample brand<select id="activation-brand-catalog"><option value="">Select brand</option>${BRAND_CATALOG.map(brand=>`<option value="${e(brand)}">${e(brand)}</option>`).join('')}</select></label><button class="activation-secondary" type="button" data-attach-catalog>Attach brand</button><label>Or add a brand name<input id="activation-custom-brand" type="text" maxlength="50" placeholder="Brand name"></label><button class="activation-secondary" type="button" data-attach-custom>Add name</button></div><p class="activation-inline-status" data-activation-brand-status role="status" aria-live="polite"></p></section><section class="activation-section" aria-labelledby="activation-media-heading"><div class="activation-section-heading"><div><h3 id="activation-media-heading">Attached creative</h3><p>Sample image and playable video · No archival Moment media implied</p></div><span class="activation-sample-tag" data-activation-media-count>${draft.media.length} assets</span></div><ul class="activation-media-grid" aria-label="Attached sample creative" data-activation-media-list>${mediaMarkup()}</ul><div class="activation-upload"><label for="activation-media-upload">Attach images or videos<input id="activation-media-upload" type="file" accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm" multiple></label><p>JPG, PNG, WebP or GIF up to 15 MB; MP4 or WebM up to 75 MB. Up to 8 assets. Local attachments stay in this open preview and are cleared on reload or navigation; no files are uploaded.</p></div><p class="activation-inline-status" data-activation-media-status role="status" aria-live="polite"></p></section>${metricsMarkup()}</div><footer class="activation-dialog-actions"><p id="activation-save-status" role="status" aria-live="polite">Metadata and brands can be saved in this browser tab. Creative attachments remain temporary.</p><div><button class="activation-secondary" type="button" data-close-activation>Cancel</button><button class="activation-primary" type="submit">Save sample</button></div></footer></form>`;
  }
  function announce(message) { if (live) live.textContent = message; }
  function revokeUnused() {
    const active = new Set([...saved.media,...(draft?.media || [])].filter(item=>item.local).map(item=>item.url));
    ownedURLs.forEach(url=>{if (!active.has(url)) {URL.revokeObjectURL(url);ownedURLs.delete(url);}});
  }
  function closeDialog() { if (dialog?.open) dialog.close(); }
  function openDialog(button) {
    if (!eligible(currentState) || dialog.open) return;
    opener = button;
    draft = clone(saved);
    renderDialog();
    document.documentElement.classList.add('activation-modal-open');
    dialog.showModal();
    const title = dialog.querySelector('#activation-dialog-title');
    title.tabIndex = -1;
    title.focus();
  }
  function updateBrands(message = '') {
    dialog.querySelector('[data-activation-brand-list]').innerHTML = brandMarkup();
    dialog.querySelector('[data-activation-brand-status]').textContent = message;
  }
  function attachBrand(value) {
    const brand = cleanText(value,50);
    if (!brand) return updateBrands('Choose a brand or enter a name, up to 50 characters.');
    if (draft.brands.some(item=>item.toLowerCase() === brand.toLowerCase())) return updateBrands(`${brand} is already attached.`);
    if (draft.brands.length >= 8) return updateBrands('Remove a brand before attaching another. This sample supports 8 brands.');
    draft.brands.push(brand);
    updateBrands(`${brand} attached to this sample.`);
    dialog.querySelector('#activation-brand-catalog').value = '';
    dialog.querySelector('#activation-custom-brand').value = '';
  }
  function updateMedia(message = '') {
    dialog.querySelector('[data-activation-media-list]').innerHTML = mediaMarkup();
    dialog.querySelector('[data-activation-media-count]').textContent = `${draft.media.length} assets`;
    dialog.querySelector('[data-activation-media-status]').textContent = message;
  }
  function attachFiles(input) {
    const files = [...input.files], errors = [];
    let added = 0;
    files.forEach(file=>{
      const isImage = ['image/jpeg','image/png','image/webp','image/gif'].includes(file.type);
      const isVideo = ['video/mp4','video/webm'].includes(file.type);
      if (!isImage && !isVideo) {errors.push(`${file.name}: choose a supported image or video.`);return;}
      if (!file.size || file.size > (isImage ? 15 : 75) * 1024 * 1024) {errors.push(`${file.name}: file is empty or above the ${isImage ? 15 : 75} MB limit.`);return;}
      if (draft.media.length >= MAX_MEDIA) {errors.push('Only 8 creative assets can be attached.');return;}
      const url = URL.createObjectURL(file);
      ownedURLs.add(url);
      draft.media.push({id:`local-${++mediaSerial}`,kind:isImage?'image':'video',name:file.name.slice(0,120),url,type:file.type,local:true,sample:false});
      added++;
    });
    input.value = '';
    updateMedia([added ? `${added} local ${added === 1 ? 'asset' : 'assets'} attached.` : '',...new Set(errors)].filter(Boolean).join(' '));
  }
  function saveForm(form) {
    const title = form.elements.title, description = form.elements.description, release = form.elements.release;
    title.setCustomValidity(cleanText(title.value,100) ? '' : 'Enter an activation title, up to 100 characters.');
    description.setCustomValidity(cleanText(description.value,500) ? '' : 'Enter a description, up to 500 characters.');
    release.setCustomValidity(validDate(release.value) ? '' : 'Choose a valid release date.');
    if (!form.reportValidity()) return;
    draft.title = title.value.trim();
    draft.description = description.value.trim();
    draft.release = release.value;
    draft.status = ['Draft','Scheduled','Released'].includes(form.elements.status.value) ? form.elements.status.value : 'Draft';
    saved = clone(draft);
    let stored = true;
    try {
      sessionStorage.setItem(STORAGE_KEY,JSON.stringify({careerId:CAREER_ID,moment:'usc',title:saved.title,description:saved.description,release:saved.release,status:saved.status,brands:saved.brands,mediaIds:saved.media.filter(item=>item.sample).map(item=>item.id)}));
    } catch {stored = false;}
    const section = railHost.querySelector('.activation-rail');
    const expanded = Boolean(section?.querySelector('details')?.open);
    if (section && eligible(currentState)) {
      section.outerHTML = renderRail(currentState);
      const card = railHost.querySelector('.activation-rail details');
      if (card) card.open = expanded;
      opener = railHost.querySelector('[data-see-activation]');
    }
    closeDialog();
    announce(stored ? 'Sample activation saved in this browser tab. Local media attachments are temporary.' : 'Sample activation saved for this open preview. Browser storage is unavailable.');
  }
  function mount(options) {
    if (dialog || !options?.railHost) return;
    railHost = options.railHost;
    live = options.live;
    dialog = document.createElement('dialog');
    dialog.className = 'activation-dialog';
    dialog.setAttribute('aria-labelledby','activation-dialog-title');
    dialog.setAttribute('aria-describedby','activation-dialog-description');
    document.body.append(dialog);
    railHost.addEventListener('click',event=>{const button=event.target.closest('[data-see-activation]');if(button)openDialog(button);});
    dialog.addEventListener('cancel',event=>{event.preventDefault();closeDialog();});
    dialog.addEventListener('click',event=>{
      if (event.target === dialog) {
        const box = dialog.getBoundingClientRect();
        if (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) closeDialog();
        return;
      }
      if (event.target.closest('[data-close-activation]')) return closeDialog();
      if (event.target.closest('[data-attach-catalog]')) return attachBrand(dialog.querySelector('#activation-brand-catalog').value);
      if (event.target.closest('[data-attach-custom]')) return attachBrand(dialog.querySelector('#activation-custom-brand').value);
      const brand = event.target.closest('[data-remove-brand]');
      if (brand) {
        const removed = draft.brands.splice(Number(brand.dataset.removeBrand),1)[0];
        updateBrands(`${removed} removed from this sample.`);
        dialog.querySelector('#activation-brand-catalog').focus();
      }
      const media = event.target.closest('[data-remove-media]');
      if (media) {
        const removed = draft.media.find(item=>item.id === media.dataset.removeMedia);
        draft.media = draft.media.filter(item=>item.id !== media.dataset.removeMedia);
        updateMedia(`${removed?.name || 'Asset'} removed from this sample.`);
        revokeUnused();
        dialog.querySelector('#activation-media-upload').focus();
      }
    });
    dialog.addEventListener('change',event=>{if(event.target.id==='activation-media-upload')attachFiles(event.target);});
    dialog.addEventListener('keydown',event=>{
      if (!dialog.open || event.key !== 'Tab' || event.altKey || event.ctrlKey || event.metaKey) return;
      const focusable = [...dialog.querySelectorAll('a[href],button,input,select,textarea,video[controls],[tabindex]')].filter(control=>control.tabIndex >= 0 && !control.matches(':disabled') && control.getClientRects().length && window.getComputedStyle(control).visibility !== 'hidden');
      const first = focusable[0], last = focusable[focusable.length - 1];
      const active = document.activeElement;
      if (!first) {
        event.preventDefault();
        dialog.querySelector('#activation-dialog-title').focus();
      } else if (event.shiftKey && (active === first || !focusable.includes(active))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (active === last || !focusable.includes(active))) {
        event.preventDefault();
        first.focus();
      }
    });
    dialog.addEventListener('input',event=>{if(event.target.matches('input[name],textarea[name]'))event.target.setCustomValidity('');});
    dialog.addEventListener('submit',event=>{event.preventDefault();saveForm(event.target);});
    dialog.addEventListener('close',()=>{
      dialog.querySelectorAll('video').forEach(video=>video.pause());
      draft = null;
      revokeUnused();
      document.documentElement.classList.remove('activation-modal-open');
      if (opener?.isConnected) opener.focus();
    });
    window.addEventListener('pagehide',()=>{
      // BFCache can restore this document; do not retain revoked file references.
      closeDialog();
      saved.media = saved.media.filter(item=>!item.local);
      draft = null;
      ownedURLs.forEach(url=>URL.revokeObjectURL(url));
      ownedURLs.clear();
      document.documentElement.classList.remove('activation-modal-open');
    });
  }
  window.LAB_ACTIVATIONS = {renderRail,mount};
})();
