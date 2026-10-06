'use strict';
document.addEventListener('DOMContentLoaded', () => {
  const host = document.querySelector('[data-app-shell]');
  if (!host) return;
  const ui = LAB_UI, e = ui.e, data = BLTZ_DATA, roster = ROSTER_DATA;
  const portraits = window.LAB_PORTRAITS || {};
  const displayData = window.LAB_ATHLETE_DISPLAY || {};
  const params = new URLSearchParams(location.search);
  const view = document.body.dataset.view === 'moment' ? 'moment' : 'athlete';
  let selectedId = roster.some(row => row.id === params.get('athlete')) ? params.get('athlete') : data.athlete.id;
  const momentKey = params.get('moment') === 'nfl' ? 'nfl' : 'usc';
  let query = (params.get('q') || '').slice(0,100), searchOpen = false, cleanup;
  const mobile = window.matchMedia('(max-width:720px)');
  const initials = name => name.split(/\s+/).slice(0,2).map(word => word[0]).join('');
  const teamLabel = team => ({USC:'Trojans','Cincinnati Bengals':'Bengals','New York Giants':'Giants','Buffalo Bills':'Bills','Dallas Cowboys':'Cowboys'}[team] || team);
  const photoClass = id => id === '03570d21-b56b-43ec-aa85-f95883c65b6b' ? ' jordan' : '';
  const WATCHLIST_KEY = 'bltz-lab-priority-athletes-v1';
  function athleteIntelligence(row) {
    const moments = row.hasIntelligence && row.id === data.athlete.id ? Object.values(data.moments) : [];
    const signals = moments.filter(moment => moment.signal).map(moment => moment.signal);
    const opportunities = moments.filter(moment => moment.opportunity);
    const scores = signals.map(signal => signal.score).filter(score => ui.reviewPriority(score));
    const score = scores.length ? Math.max(...scores) : null;
    return {signals:signals.length, opportunities:opportunities.length, score, priority:ui.reviewPriority(score)};
  }
  let watchlist = new Set(roster.filter(row => {
    const facts = athleteIntelligence(row);
    return facts.signals || facts.opportunities;
  }).map(row => row.id));
  try {
    const saved = JSON.parse(sessionStorage.getItem(WATCHLIST_KEY) || 'null');
    if (Array.isArray(saved)) watchlist = new Set(saved.filter(id => roster.some(row => row.id === id)));
  } catch { /* A local priority list also works without browser storage. */ }
  let pickerOpen = false;
  function saveWatchlist() {
    try { sessionStorage.setItem(WATCHLIST_KEY,JSON.stringify([...watchlist])); } catch {}
  }
  function state() {
    const row = roster.find(athlete => athlete.id === selectedId);
    return {data, athlete:row.hasIntelligence ? {...data.athlete,...row} : row, hasIntelligence:row.hasIntelligence, view, momentKey, moment:row.hasIntelligence ? data.moments[momentKey] : null, theme:document.documentElement.dataset.theme};
  }
  function disclosure(id, label, icon, content, hover = false, unavailable = false, summary = '') {
    return `<div class="portrait-disclosure" ${hover?'data-reveal-on-hover':''}><button class="portrait-icon-pill${summary?' contact-item':''}${unavailable?' is-unavailable':''}" type="button" data-popover-trigger="${id}" aria-label="${e(label)}" aria-expanded="false" aria-controls="${id}">${summary?`<span class="contact-icon" aria-hidden="true">${ui.icon(icon)}</span>`:ui.icon(icon)}${summary}</button><div class="identity-popover" id="${id}" hidden>${content}</div></div>`;
  }
  function contacts(athlete) {
    const contact = displayData[athlete.id]?.contacts || {email:null,phone:null,social:[]};
    const detail = (kind,label) => contact[kind]?.value
      ? `<strong>${label}</strong><span class="contact-value">${e(contact[kind].value)}</span><button class="contact-copy" type="button" data-copy-contact="${kind}">${ui.icon('copy')} Copy ${label.toLowerCase()}</button>`
      : `<strong>${label}</strong><span>No verified ${label.toLowerCase()} supplied.</span>`;
    const social = (contact.social || []).filter(item=>/^https:\/\//i.test(item.url));
    const locker = displayData[athlete.id]?.previewLocker;
    const summary = value => `<span class="contact-text"><span class="contact-summary">${e(value || 'Not supplied')}</span></span>`;
    const lockerControl = locker?.url ? `<a class="portrait-icon-pill contact-item portrait-locker-link" href="${e(locker.url)}" target="_blank" rel="noopener noreferrer" aria-label="Open ${e(athlete.name)} Preview Locker" title="Open Preview Locker"><span class="contact-icon" aria-hidden="true">${ui.icon('locker')}</span>${summary('Open preview')}</a>` : disclosure('portrait-locker','Preview Locker not supplied','locker','<strong>Preview Locker</strong><span>No reviewed preview link supplied for this athlete.</span>',false,true,summary());
    const socialSummary = social.length === 1 ? social[0].handle || social[0].label : social.length ? `${social.length} profiles` : null;
    return `<div class="athlete-contact-grid" role="group" aria-label="Athlete contact information">${disclosure('portrait-email',contact.email?.value?`Copy email ${contact.email.value}`:'Email not supplied','mail',detail('email','Email'),false,!contact.email?.value,summary(contact.email?.value))}${lockerControl}${disclosure('portrait-phone',contact.phone?.value?`Copy phone ${contact.phone.value}`:'Phone not supplied','phone',detail('phone','Phone'),false,!contact.phone?.value,summary(contact.phone?.value))}${disclosure('portrait-social','Show social profiles','social',`<strong>Social profiles</strong>${social.length?`<ul class="contact-social-list" aria-label="Social accounts">${social.map(item=>`<li><a href="${e(item.url)}" target="_blank" rel="noopener noreferrer"><span>${e(item.label)}${item.handle?` · ${e(item.handle)}`:''}</span>${ui.icon('arrow')}</a></li>`).join('')}</ul>`:'<span>No verified social profiles supplied.</span>'}`,true,!social.length,summary(socialSummary))}</div>`;
  }
  function identityContent(s) {
    return `<dl class="identity-id-list"><div><dt>Athlete Career ID</dt><dd>${e(s.athlete.id)}</dd></div><div><dt>Sportradar ID · NFL</dt><dd>${s.hasIntelligence?e(data.athlete.externalIdentity.id):'Not supplied in this snapshot'}</dd></div></dl><p class="identity-verification">${s.hasIntelligence?'Athlete identity unverified. External NFL match verified by manual review.':'Verification status not supplied. No reviewed intelligence in this snapshot.'}</p>`;
  }
  function portrait(s) {
    const athlete = s.athlete;
    const photo = portraits[athlete.id];
    const photoCredits = photo ? `${disclosure('portrait-photographer',`Photographer: ${photo.author}`,'camera',`<strong>Photographer</strong><span>${e(photo.author)}</span><a href="${e(photo.filePage)}" target="_blank" rel="noopener noreferrer">Photograph on Wikimedia Commons ${ui.icon('arrow')}</a>`,true)}${disclosure('portrait-rights','Portrait ownership and license','shield',`<strong>Ownership & license</strong><span>Rights holder not separately recorded.</span><a href="${e(photo.licenseURL)}" target="_blank" rel="noopener noreferrer">CC BY 3.0 ${ui.icon('arrow')}</a><span>${photo.credit.startsWith('©')?'© ':'By '}${e(photo.author)} · Cropped for this portrait.</span><span>Photograph: ${e(ui.date(photo.sourceImageDate))}</span>`,true)}` : `${disclosure('portrait-photographer','Photographer not supplied','camera','<strong>Photographer</strong><span>No portrait or photographer supplied.</span>',true,true)}${disclosure('portrait-rights','Portrait attribution not supplied','shield','<strong>Attribution & license</strong><span>No portrait attribution or license supplied.</span>',true,true)}`;
    const attribution = `<div class="portrait-attribution" role="group" aria-label="Athlete reference details">${photoCredits}${disclosure('portrait-provenance','Identity and provenance','identity',`<strong>Identity & provenance</strong>${identityContent(s)}`,true)}</div>`;
    return `<figure class="portrait-frame"><div class="athlete-portrait${photoClass(athlete.id)}"><span class="portrait-fallback" ${photo?'aria-hidden="true"':`aria-label="No portrait supplied for ${e(athlete.name)}"`}>${e(initials(athlete.name))}</span>${photo?`<img src="${e(photo.imageUrl)}" alt="${e(photo.alt)}" decoding="async" referrerpolicy="no-referrer">`:''}</div><figcaption class="portrait-credit">${attribution}</figcaption></figure>`;
  }
  function identity(s) {
    const a = s.athlete, context = displayData[a.id];
    const facts = `<p class="athlete-profile-line">${[a.school || "School not supplied", a.sport || "Sport not supplied", a.position || "Position not supplied"].map(e).join(' <span class="identity-dot" aria-hidden="true">·</span> ')}</p>`;
    const career = context?.retirement ? {label:'Retired',status:'Retired',date:context.retirement.reportedOn} : context?.status === 'Active athlete' && context?.careerStart ? {label:context.careerStart.label || 'Active since',status:'Active',date:context.careerStart.date,year:context.careerStart.year} : null;
    let careerDate = '';
    const parsedDate = career?.date ? new Date(career.date + 'T00:00:00Z') : null;
    const hasDate = parsedDate && Number.isFinite(parsedDate.getTime());
    if (hasDate || career?.year) {
      const fullDate = hasDate ? ui.date(career.date) : String(career.year);
      const monthYear = hasDate ? new Intl.DateTimeFormat('en-US',{month:'long',year:'2-digit',timeZone:'UTC'}).format(parsedDate) + "'" : String(career.year);
      careerDate = `<p class="athlete-career-date" title="${e(career.label + ' - ' + fullDate)}" aria-label="${e(career.label + ' - ' + fullDate)}">${e(career.status)} <time datetime="${e(hasDate ? career.date : career.year)}">${e(monthYear)}</time></p>`;
    }
    return `<section class="identity-panel" aria-label="Selected athlete">${portrait(s)}<div class="athlete-info"><div class="athlete-basics"><div class="athlete-name-row"><h1 id="athlete-name" tabindex="-1"><span class="athlete-name-text">${e(a.name)}</span></h1></div>${facts}${careerDate}${contacts(a)}</div></div></section>`;
  }
  function rail(s) {
    const eligible = s.hasIntelligence && (view === 'athlete' || momentKey === 'usc');
    const moment = data.moments.usc, signal = moment.signal, opportunity = moment.opportunity;
    const link = ui.url('moment',s,{momentKey:'usc'});
    const signalLink = view === 'moment' ? '#moment-panel-evidence' : link;
    const opportunityLink = view === 'moment' ? '#moment-panel-media' : link;
    const signalCard = `<ul class="rail-list" aria-label="Detected signals"><li><details class="rail-card" id="signal-anniversary"><summary class="rail-card-summary"><span class="rail-summary-copy"><span class="rail-overline">${e(signal.type)}</span><strong class="rail-card-title">20 years since Washington</strong><time class="rail-summary-meta" datetime="${e(signal.target)}">${e(ui.date(signal.target))}</time></span><span class="rail-chevron">${ui.icon('chevron')}</span></summary><div class="rail-card-content"><p class="rail-timing">6 days from the Oct 1 review</p><div class="rail-signal-stats"><div class="rail-stat">${ui.priorityRing(signal.score)}<span class="rail-metric-caption">Review priority</span></div><div class="rail-stat">${ui.confidenceRing(signal.confidence)}<span class="rail-metric-caption">Evidence confidence</span></div></div><div class="rail-explanation"><p class="rail-section-label">Why it matters</p><p>USC sources establish the October 7, 2006 event and Keith’s performance. The 20-year date creates an anniversary signal.</p><p>${e(signal.reason)} Priority guides editorial review; it is not probability or monetary value.</p></div><a class="quiet-action" href="${e(signalLink)}" ${view==='moment'?'data-open-tab="evidence"':''}>${view==='moment'?'View evidence':'Inspect moment'} ${ui.icon('arrow')}</a></div></details></li></ul>`;
    const opportunityCard = `<ul class="rail-list" aria-label="Detected opportunities"><li><details class="rail-card" id="opportunity-retrospective"><summary class="rail-card-summary"><span class="rail-summary-copy"><span class="rail-overline">USC · From anniversary signal</span><strong class="rail-card-title">${e(opportunity.type)}</strong><span class="rail-summary-meta">Research needed</span></span><span class="rail-chevron">${ui.icon('chevron')}</span></summary><div class="rail-card-content"><div class="rail-explanation"><p>The anniversary suggests a USC alumni story. Confirm media links, clearance and athlete preferences before proposing an activation.</p><p>Moment → Anniversary signal → Retrospective. A human-review suggestion; no campaign, usage permission or earnings is inferred.</p></div><p class="rail-section-label">Needed before activation</p><ul class="opportunity-gaps" aria-label="Needed before activation"><li><span class="gap-mark" aria-hidden="true"></span>Moment media</li><li><span class="gap-mark" aria-hidden="true"></span>Usage clearance</li><li><span class="gap-mark" aria-hidden="true"></span>Athlete preferences</li></ul><a class="quiet-action" href="${e(opportunityLink)}" ${view==='moment'?'data-open-tab="media"':''}>${view==='moment'?'Check media':'Review moment'} ${ui.icon('arrow')}</a></div></details></li></ul>`;
    return `<section class="rail-container" aria-labelledby="signals-heading"><header class="rail-header"><div class="rail-title"><span class="rail-icon">${ui.icon('calendar')}</span><h2 id="signals-heading">Signals</h2></div><span class="rail-count">${eligible?1:0}</span></header>${eligible?signalCard:`<div class="rail-empty"><strong>${s.hasIntelligence?'No signal detected':'Not reviewed yet'}</strong>${s.hasIntelligence?'Participation documented; no milestone established.':'No intelligence supplied in this snapshot.'}</div>`}</section><section class="rail-container" aria-labelledby="opportunities-heading"><header class="rail-header"><div class="rail-title"><span class="rail-icon">${ui.icon('link')}</span><h2 id="opportunities-heading">Opportunities</h2></div><span class="rail-count">${eligible?1:0}</span></header>${eligible?opportunityCard:`<div class="rail-empty"><strong>${s.hasIntelligence?'No opportunity generated':'No opportunity data'}</strong>${s.hasIntelligence?'A sourced event alone does not establish an activation.':'Select a reviewed athlete to inspect opportunities.'}</div>`}</section>${window.LAB_ACTIVATIONS?.renderRail(s) || ''}`;
  }
  host.innerHTML = `<a class="skip-link" href="#main">Skip to athlete</a><div class="lab-frame"><header class="topbar"><a class="brand" href="index.html" aria-label="BLTZ design review"><img src="assets/bltz-white-logo.svg" alt="BLTZ"><span class="brand-name">Intelligence Lab</span></a><form class="athlete-search" role="search" aria-label="Find an athlete, team or moment"><label for="athlete-search" class="sr-only">Search athletes, teams and moments</label><div class="search-field">${ui.icon('search')}<input id="athlete-search" name="q" type="search" placeholder="Search athletes, teams and moments..." title="Search athletes, teams and moments" autocomplete="off" maxlength="100" value="${e(query)}" aria-controls="athlete-search-results" aria-expanded="false"><button class="search-clear" type="button" aria-label="Clear athlete search" ${query?'':'hidden'}>${ui.icon('close')}</button><button class="watchlist-toggle" type="button" aria-label="Open priority athlete list" aria-controls="athlete-directory" aria-expanded="false">${ui.icon('people')}</button></div><div id="athlete-search-results" class="search-results-panel" role="region" aria-label="Athlete search results" hidden><header class="search-results-heading"><strong>Search results</strong><span id="search-result-count"></span><button type="button" class="search-results-close" aria-label="Close search results">${ui.icon('close')}</button></header><div id="search-result-list"></div></div></form><div class="topbar-controls"><button class="theme-button" type="button" id="theme-toggle"></button><a href="index.html" class="review-link" aria-label="Review themes">${ui.icon('grid')}</a></div></header><button class="search-shade" type="button" aria-label="Close athlete search results" aria-hidden="true" tabindex="-1"></button><div class="three-columns"><aside class="directory-column" id="athlete-directory" aria-label="Priority athlete list"><div class="directory-top"><h2>Priority athletes</h2><span class="result-count" id="result-count"></span><button type="button" class="directory-close" aria-label="Close priority athlete list">${ui.icon('close')}</button></div><div class="watchlist-legend" aria-label="Athlete priority legend"><span><i class="priority-dot priority-high" aria-hidden="true"></i>High</span><span><i class="priority-dot priority-mid" aria-hidden="true"></i>Mid</span><span><i class="priority-dot priority-low" aria-hidden="true"></i>Low</span></div><div class="athlete-list" id="athlete-list"></div><p class="directory-note">Local list · Signals, opportunities and athletes awaiting review</p></aside><main class="center-column" id="main" aria-labelledby="athlete-name"><div id="identity-host"></div><div class="center-content" id="center-content"></div></main><aside class="intelligence-column" id="right-rail" aria-label="Signals, opportunities and activations"></aside></div><footer class="workspace-footer"><span>Design preview · Evidence reviewed Oct 1, 2026</span><a href="index.html">Compare light & dark</a></footer><div class="live-status" role="status" aria-live="polite" id="live-status"></div></div>`;
  const input = document.querySelector('#athlete-search'), list = document.querySelector('#athlete-list'), directory = document.querySelector('#athlete-directory'), live = document.querySelector('#live-status');
  const resultsPanel = document.querySelector('#athlete-search-results'), resultsList = document.querySelector('#search-result-list');
  window.LAB_ACTIVATIONS?.mount({railHost:document.querySelector('#right-rail'), live});
  document.querySelector('#right-rail').addEventListener('click', event => {
    const action = event.target.closest('a[data-open-tab]');
    if (!action) return;
    const tab = document.querySelector(`#center-content [data-moment-tab="${action.dataset.openTab}"]`);
    if (tab) tab.click();
  });
  host.addEventListener('error', event => {
    const image = event.target;
    if (!image.matches?.('.source-logo img')) return;
    image.hidden = true;
    image.parentElement.querySelector('.source-logo-missing').hidden = false;
  }, true);
  const identityHost = document.querySelector('#identity-host');
  let nameFitFrame = null, observedNameWidth = null;
  function fitAthleteName() {
    const heading = identityHost.querySelector('#athlete-name');
    const text = heading?.querySelector('.athlete-name-text');
    if (!text || heading.clientWidth <= 0) return;
    heading.style.removeProperty('font-size');
    const preferredSize = Number.parseFloat(window.getComputedStyle(heading).fontSize);
    const naturalWidth = text.getBoundingClientRect().width;
    const availableWidth = Math.max(0, heading.clientWidth - 1);
    if (!Number.isFinite(preferredSize) || preferredSize <= 0 || !Number.isFinite(naturalWidth) || naturalWidth <= 0 || availableWidth <= 0) return;
    if (naturalWidth > availableWidth) {
      const fittedSize = Math.floor(preferredSize * availableWidth / naturalWidth * 100) / 100;
      heading.style.fontSize = fittedSize + 'px';
      // Recheck once for font rounding while keeping the complete name visible.
      const fittedWidth = text.getBoundingClientRect().width;
      if (Number.isFinite(fittedWidth) && fittedWidth > availableWidth) {
        heading.style.fontSize = Math.floor(fittedSize * availableWidth / fittedWidth * 100) / 100 + 'px';
      }
    }
  }
  function scheduleNameFit() {
    if (nameFitFrame !== null) return;
    nameFitFrame = window.requestAnimationFrame(() => {
      nameFitFrame = null;
      fitAthleteName();
    });
  }
  const nameResizeObserver = new ResizeObserver(entries => {
    const width = entries[0]?.contentRect.width;
    if (width === observedNameWidth) return;
    observedNameWidth = width;
    scheduleNameFit();
  });
  window.addEventListener('resize', scheduleNameFit);
  document.fonts.ready.then(scheduleNameFit);
  document.fonts.addEventListener('loadingdone', scheduleNameFit);

  let openDisclosure = null, disclosurePinned = false;
  function closeDisclosure() {
    if (!openDisclosure) return;
    openDisclosure.querySelector('[data-popover-trigger]').setAttribute('aria-expanded','false');
    openDisclosure.querySelector('.identity-popover').hidden = true;
    openDisclosure = null; disclosurePinned = false;
  }
  function revealDisclosure(group, pinned = false) {
    if (openDisclosure !== group) closeDisclosure();
    openDisclosure = group; disclosurePinned = pinned;
    group.querySelector('[data-popover-trigger]').setAttribute('aria-expanded','true');
    group.querySelector('.identity-popover').hidden = false;
  }
  async function copyContact(kind, button) {
    const value = displayData[selectedId]?.contacts?.[kind]?.value;
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      if (button) button.innerHTML = `${ui.icon('check')} Copied`;
      live.textContent = `${kind==='email'?'Email address':'Phone number'} copied.`;
    } catch {
      live.textContent = 'Copy unavailable. Select and copy the displayed contact instead.';
      if (button) button.textContent = 'Copy unavailable';
    }
  }
  identityHost.addEventListener('click', async event => {
    const trigger = event.target.closest('[data-popover-trigger]');
    if (trigger) {
      const group = trigger.closest('.portrait-disclosure');
      if (openDisclosure === group && disclosurePinned) closeDisclosure();
      else {
        revealDisclosure(group,true);
        const kind = trigger.dataset.popoverTrigger.replace('portrait-','');
        if (kind === 'email' || kind === 'phone') await copyContact(kind,group.querySelector('[data-copy-contact]'));
      }
      return;
    }
    const copy = event.target.closest('[data-copy-contact]');
    if (!copy) return;
    await copyContact(copy.dataset.copyContact,copy);
  });
  identityHost.addEventListener('pointerover', event => {
    const group = event.target.closest('[data-reveal-on-hover]');
    if (group && !group.contains(event.relatedTarget) && !disclosurePinned) revealDisclosure(group);
  });
  identityHost.addEventListener('pointerout', event => {
    const group = event.target.closest('[data-reveal-on-hover]');
    if (group && group === openDisclosure && !group.contains(event.relatedTarget) && !disclosurePinned) closeDisclosure();
  });
  identityHost.addEventListener('focusin', event => {
    const group = event.target.closest('[data-reveal-on-hover]');
    if (group && group !== openDisclosure && !disclosurePinned) revealDisclosure(group);
  });
  identityHost.addEventListener('focusout', event => {
    if (openDisclosure && !openDisclosure.contains(event.relatedTarget) && !disclosurePinned) closeDisclosure();
  });
  document.addEventListener('pointerdown', event => { if (openDisclosure && !openDisclosure.contains(event.target)) closeDisclosure(); });
  document.addEventListener('keydown', event => {
    if (event.key !== 'Escape' || !openDisclosure) return;
    const trigger = openDisclosure.querySelector('[data-popover-trigger]');
    closeDisclosure(); trigger.focus(); closeDisclosure();
    event.preventDefault();
  });
  function matches() {
    const normalized = query.trim().toLowerCase();
    return roster.filter(row => {
      const teams = (displayData[row.id]?.teamTenures || []).map(team => team.team + ' ' + teamLabel(team.team));
      const moments = row.hasIntelligence ? Object.values(data.moments).map(moment => [moment.title, moment.team, moment.opponent, moment.competition, moment.season].join(' ')) : [];
      return [row.name, row.school, row.position, ...teams, ...moments].join(' ').toLowerCase().includes(normalized);
    });
  }
  function remember() { const next = new URL(location.href); next.searchParams.set('athlete',selectedId); next.searchParams.set('theme',document.documentElement.dataset.theme); if(query) next.searchParams.set('q',query); else next.searchParams.delete('q'); try { history.replaceState(null,'',next); } catch {} }
  function bindImageFallback(scope) {
    scope.querySelectorAll('img').forEach(img => { img.addEventListener('error',()=> {img.hidden=true; const fallback=img.parentElement.querySelector('.portrait-fallback'); if(fallback){fallback.removeAttribute('aria-hidden');fallback.setAttribute('aria-label','Portrait could not load');}}, {once:true}); });
  }
  function renderList() {
    const rows = roster.filter(row => watchlist.has(row.id)).sort((a,b) => (athleteIntelligence(b).score ?? -1) - (athleteIntelligence(a).score ?? -1) || a.name.localeCompare(b.name));
    document.querySelector('#result-count').textContent = String(rows.length);
    document.querySelector('.search-clear').hidden = !query;
    list.innerHTML = rows.length ? rows.map(row => `<div class="watchlist-entry">${athleteButton(row)}<button class="watchlist-remove" type="button" data-remove-athlete="${e(row.id)}" aria-label="Remove ${e(row.name)} from priority list" title="Remove from priority list">${ui.icon('close')}</button></div>`).join('') : '<div class="no-results"><strong>No priority athletes added</strong>Search an athlete and use + to add them.</div>';
    bindImageFallback(list);
    renderSearchResults();
  }
  function athleteButton(row) {
    const photo = portraits[row.id], facts = athleteIntelligence(row);
    const priority = facts.priority ? `${facts.priority} priority` : 'Awaiting review';
    return `<button class="athlete-row" type="button" data-athlete="${e(row.id)}" aria-pressed="${row.id === selectedId}" aria-label="Select ${e(row.name)}" aria-describedby="priority-${e(row.id)}"><span class="roster-avatar${photoClass(row.id)}" aria-hidden="true">${photo ? `<span class="portrait-fallback" aria-hidden="true">${e(initials(row.name))}</span><img src="${e(photo.imageUrl)}" alt="" loading="lazy" referrerpolicy="no-referrer">` : e(initials(row.name))}</span><span class="row-info"><span class="row-name"><span class="priority-dot priority-${facts.priority ? facts.priority.toLowerCase() : 'unscored'}" aria-hidden="true"></span>${e(row.name)}</span><span class="row-context">${e(row.school)} · ${e(row.position)}</span><span class="row-priority" data-priority-description>${e(priority)}</span></span></button>`;
  }
  function renderSearchResults() {
    const rows = matches();
    document.querySelector('#search-result-count').textContent = `${rows.length} found`;
    resultsList.innerHTML = rows.length ? rows.map(row => `<div class="search-result-entry">${athleteButton(row)}<button class="search-add" type="button" data-add-athlete="${e(row.id)}" ${watchlist.has(row.id) ? 'disabled' : ''} aria-label="${watchlist.has(row.id) ? `${e(row.name)} already in priority list` : `Add ${e(row.name)} to priority list`}" title="${watchlist.has(row.id) ? 'Already added' : 'Add to priority list'}">${ui.icon(watchlist.has(row.id) ? 'check' : 'plus')}</button></div>`).join('') : '<div class="no-results"><strong>No athletes found</strong>Try an athlete, team or reviewed moment.</div>';
    // Each occurrence has its own description ID; list and results can be visible together.
    [list,resultsList].forEach((scope,index) => scope.querySelectorAll('[data-athlete]').forEach(button => {
      const description = button.querySelector('[data-priority-description]');
      description.id = `priority-${index}-${button.dataset.athlete}`;
      button.setAttribute('aria-describedby',description.id);
    }));
    bindImageFallback(resultsList);
  }
  function renderSelected() {
    if(typeof cleanup==='function') cleanup();
    closeDisclosure();
    const s = state();
    nameResizeObserver.disconnect();
    observedNameWidth = null;
    identityHost.innerHTML = identity(s);
    fitAthleteName();
    nameResizeObserver.observe(identityHost.querySelector('#athlete-name'));
    document.querySelector('#right-rail').innerHTML = rail(s);
    const center = document.querySelector('#center-content'), renderer = LAB_CENTERS[view];
    center.classList.remove('content-refresh');
    center.innerHTML = renderer ? renderer.render(s) : '<p class="rail-empty">This design could not load. Reload the preview.</p>';
    cleanup = renderer?.mount ? renderer.mount(center,s) : undefined;
    requestAnimationFrame(()=>center.classList.add('content-refresh'));
    document.title = `${s.athlete.name} · ${view==='athlete'?'Athlete':'Moment'} · BLTZ Intelligence Lab`;
    bindImageFallback(document.querySelector('#identity-host'));
    renderList();
  }
  function showSearch(open) {
    searchOpen = Boolean(open);
    if (searchOpen) pickerOpen = false;
    resultsPanel.hidden = !searchOpen;
    directory.hidden = mobile.matches && !pickerOpen;
    directory.setAttribute('aria-label','Priority athlete list');
    input.setAttribute('aria-expanded',String(searchOpen));
    document.querySelector('.watchlist-toggle').setAttribute('aria-expanded',String(pickerOpen));
    document.querySelector('.search-shade').setAttribute('aria-hidden',String(!(mobile.matches && (searchOpen || pickerOpen))));
  }
  function closeSearchPanels() {
    pickerOpen = false;
    showSearch(false);
  }
  function selectAthlete(id) {
    if (!roster.some(row => row.id === id)) return;
    selectedId = id;
    query = ''; input.value = '';
    remember(); renderSelected(); closeSearchPanels();
    live.textContent=`${state().athlete.name} selected. ${state().hasIntelligence?'Reviewed intelligence shown.':'No reviewed intelligence in this snapshot.'}`;
    document.querySelector('#athlete-name').focus({preventScroll:true});
  }
  list.addEventListener('click', event => {
    const remove = event.target.closest('[data-remove-athlete]');
    if (remove) {
      const row = roster.find(row => row.id === remove.dataset.removeAthlete);
      if (!row) return;
      watchlist.delete(row.id); saveWatchlist(); renderList();
      live.textContent = `${row.name} removed from the local priority list.`;
      const next = list.querySelector('[data-athlete]');
      (next || input).focus({preventScroll:true});
      return;
    }
    const button=event.target.closest('[data-athlete]'); if(button)selectAthlete(button.dataset.athlete);
  });
  resultsList.addEventListener('click',event => {
    const add = event.target.closest('[data-add-athlete]');
    if (add) {
      const row = roster.find(row => row.id === add.dataset.addAthlete);
      if (!row || watchlist.has(row.id)) return;
      watchlist.add(row.id); saveWatchlist(); renderList();
      resultsList.querySelector(`[data-athlete="${row.id}"]`).focus({preventScroll:true});
      live.textContent = `${row.name} added to the local priority list. ${athleteIntelligence(row).priority ? 'Reviewed priority shown.' : 'Awaiting review.'}`;
      return;
    }
    const button = event.target.closest('[data-athlete]'); if (button) selectAthlete(button.dataset.athlete);
  });
  input.addEventListener('input',()=>{query=input.value;renderList();remember();showSearch(true);const count=matches().length;live.textContent=`${count} athlete${count === 1 ? '' : 's'} found.`;});
  input.addEventListener('focus',()=>showSearch(true));
  input.addEventListener('click',()=>showSearch(true));
  input.addEventListener('keydown',event=>{
    if (event.key === 'Escape') {event.preventDefault();closeSearchPanels();}
    if (event.key === 'ArrowDown') {event.preventDefault();showSearch(true);resultsList.querySelector('[data-athlete]')?.focus();}
  });
  document.querySelector('.athlete-search').addEventListener('submit',event=>{event.preventDefault();const first=matches()[0];if(first)selectAthlete(first.id);else live.textContent='No athletes found.';});
  document.querySelector('.search-clear').addEventListener('click',()=>{query='';input.value='';renderList();remember();input.focus();showSearch(true);});
  document.querySelector('.watchlist-toggle').addEventListener('click',()=>{pickerOpen=!pickerOpen;showSearch(false);if(pickerOpen)directory.querySelector('[data-athlete],.directory-close')?.focus();});
  document.querySelector('.directory-close').addEventListener('click',()=>{closeSearchPanels();document.querySelector('.watchlist-toggle').focus();});
  document.querySelector('.search-results-close').addEventListener('click',()=>{input.focus();closeSearchPanels();});
  document.querySelector('.search-shade').addEventListener('click',closeSearchPanels);
  document.addEventListener('keydown',event=>{if(event.key==='Escape'&&(searchOpen||pickerOpen)){event.preventDefault();const picker=pickerOpen;(picker?document.querySelector('.watchlist-toggle'):input).focus();closeSearchPanels();}});
  document.addEventListener('pointerdown',event=>{if((searchOpen||pickerOpen)&&!directory.contains(event.target)&&!document.querySelector('.athlete-search').contains(event.target))closeSearchPanels();});
  document.addEventListener('focusin',event=>{if((searchOpen||pickerOpen)&&!directory.contains(event.target)&&!document.querySelector('.athlete-search').contains(event.target))closeSearchPanels();});
  mobile.addEventListener('change',closeSearchPanels);
  function renderThemeButton() {
    const light=document.documentElement.dataset.theme==='light', button=document.querySelector('#theme-toggle');
    button.innerHTML=`${ui.icon(light?'moon':'sun')}<span>${light?'Dark':'Light'} mode</span>`;
    button.setAttribute('aria-label',`Switch to ${light?'dark':'light'} theme`);
  }
  document.querySelector('#theme-toggle').addEventListener('click',()=>{
    const theme=document.documentElement.dataset.theme==='dark'?'light':'dark';
    document.documentElement.dataset.theme=theme;
    try{localStorage.setItem('bltz-intelligence-design-theme',theme);}catch{}
    document.querySelectorAll('a[href]').forEach(anchor=>{const next=new URL(anchor.href);if(next.origin===location.origin&&next.pathname.endsWith('.html')&&!next.pathname.endsWith('index.html')){next.searchParams.set('theme',theme);anchor.href=next.href;}});
    remember();renderThemeButton();live.textContent=`${theme==='dark'?'Dark':'Light'} theme selected.`;
  });
  document.querySelector('#right-rail').addEventListener('click',event=>{
    const action=event.target.closest('[data-open-tab]');
    if(!action)return;
    const tab=document.querySelector(`[data-moment-tab="${action.dataset.openTab}"]`);
    if(!tab)return;
    event.preventDefault();tab.click();tab.focus({preventScroll:true});
    tab.scrollIntoView({behavior:window.matchMedia('(prefers-reduced-motion:reduce)').matches?'auto':'smooth',block:'center'});
  });
  renderThemeButton(); renderSelected(); showSearch(false);
});
