'use strict';

(() => {
  const ui = window.LAB_UI;
  const e = ui.e;
  let meterAnimationConsumed = false;
  const momentPreviewSentences = Object.freeze({
    usc: 'Keith Rivers recorded 12 tackles, one tackle for loss and two deflections against Washington.',
    nfl: 'Keith Rivers recorded three tackles and one assist in Buffalo’s 23–20 win at Chicago.'
  });

  function empty(state) {
    return `<div class="lab-ath-center"><div class="lab-ath-empty"><h2>Career file not supplied</h2><p>No reviewed intelligence for ${e(state.athlete.name)} is included in this local snapshot. Select another athlete to inspect a reviewed file.</p></div></div>`;
  }

  function thumbnailUrl(value) {
    if (!value) return null;
    try {
      const url = new URL(value, window.location.href);
      const sameOrigin = url.origin === window.location.origin && ['https:', 'http:'].includes(url.protocol);
      const allowedRemote = url.origin === 'https://upload.wikimedia.org';
      return sameOrigin || allowedRemote ? url.href : null;
    } catch {
      return null;
    }
  }

  function momentMedia(moment) {
    if (!moment.media.length) {
      return `<aside class="lab-ath-moment-media" aria-label="Attached media for ${e(moment.title)}"><div class="lab-ath-media-stack lab-ath-media-stack-empty"><div class="lab-ath-media-front">${ui.icon('file')}<p>No attached media</p></div></div></aside>`;
    }
    return `<aside class="lab-ath-moment-media" tabindex="0" aria-label="Attached media for ${e(moment.title)}"><ol class="lab-ath-media-stack lab-ath-media-preview-list">${moment.media.slice(0, 3).map(media => {
      const preview = thumbnailUrl(media.thumbnailUrl);
      return `<li class="lab-ath-media-preview">${preview ? `<img class="lab-ath-preview-image" src="${e(preview)}" alt="" loading="lazy">` : `<div class="lab-ath-preview-unavailable">${ui.icon('file')}</div>`}<p>${e(media.title || 'Attached media')}</p></li>`;
    }).join('')}</ol></aside>`;
  }

  function meterValue(value) {
    return typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 100 ? value : null;
  }

  function meter(value, kind) {
    const score = meterValue(value);
    const confidence = kind === 'confidence';
    const label = confidence ? 'Evidence confidence' : 'Review priority';
    const category = confidence ? null : ui.reviewPriority(score);
    const meaning = score === null ? (confidence ? 'Not supplied' : 'Not scored') : (confidence ? 'Source assessment' : 'Editorial review');
    const accessibleValue = score === null ? meaning.toLowerCase() : (confidence ? `${score} percent` : category);
    const displayValue = score === null ? '—' : (confidence ? `${e(score)}<small>%</small>` : e(category));
    return `<div class="lab-ath-metric"><div class="lab-ath-meter lab-ath-meter-${kind}${score === null ? ' lab-ath-meter-empty' : ''}" role="img" aria-label="${label}: ${e(accessibleValue)}"><svg viewBox="0 0 64 64" aria-hidden="true" focusable="false"><circle class="lab-ath-meter-track" cx="32" cy="32" r="26" fill="none" stroke-width="5"/>${score === null ? '' : `<circle class="lab-ath-meter-arc" cx="32" cy="32" r="26" fill="none" stroke-width="5" pathLength="100" stroke-dasharray="100" stroke-dashoffset="${e(100 - score)}" transform="rotate(-90 32 32)"/>`}</svg><span class="lab-ath-meter-number" aria-hidden="true">${displayValue}</span></div><div class="lab-ath-metric-label"><p>${label}</p><p class="lab-ath-metric-meaning">${meaning}</p></div></div>`;
  }

  function momentFiles(state) {
    return `<div class="lab-ath-moments">${Object.values(state.data.moments).map(moment => {
      const destination = ui.url('moment', state, { momentKey: moment.key });
      return `<article class="lab-ath-moment"><div class="lab-ath-moment-layout"><div class="lab-ath-moment-main"><div class="lab-ath-moment-heading"><div class="lab-ath-moment-title"><p class="lab-ath-context">${e(moment.competition)}</p><h2><a href="${e(destination)}">${e(moment.title)}</a></h2><p class="lab-ath-moment-description">${e(momentPreviewSentences[moment.key] ?? moment.summary)}</p><time datetime="${e(moment.date)}">${e(ui.date(moment.date))}</time></div></div><div class="lab-ath-scores">${meter(moment.confidence, 'confidence')}${meter(moment.signal?.score, 'priority')}</div></div>${momentMedia(moment)}</div><div class="lab-ath-moment-footer"><p>${e(moment.sourceCount)} sources <span aria-hidden="true">·</span> ${e(moment.media.length)} linked media</p><a class="lab-ath-open" href="${e(destination)}">Inspect Moment ${ui.icon('arrow')}</a></div></article>`;
    }).join('')}</div><details class="lab-ath-disclosure"><summary>Career connections</summary><div class="lab-ath-details"><div class="lab-ath-connections"><div><strong>USC</strong><span>Washington game participant · 2006</span></div><div><strong>Buffalo</strong><span>Chicago game participant · 2014</span></div><div><strong>Post-career interviews</strong><span>Athlete context; game connections unknown</span></div></div><p>${e(state.data.limits.career)}</p><p>${e(state.data.limits.achievements)} ${e(state.data.limits.relationships)}</p></div></details>`;
  }

  function mediaFiles(state) {
    return `<div class="lab-ath-media-state">${ui.icon('file')}<p>No linked Moment media. Publisher references below are athlete context; usage clearance is unknown.</p></div><div class="lab-ath-file-list">${state.data.content.map(content => `<article class="lab-ath-file lab-ath-context-media"><div class="lab-ath-file-heading"><div><p class="lab-ath-file-meta">${e(content.publisher)} · ${e(content.kind)}</p><h2><a href="${e(content.url)}" target="_blank" rel="noopener noreferrer">${e(content.title)} ↗</a></h2><p class="lab-ath-file-date">${content.published ? `Published ${e(ui.date(content.published))}` : 'Publication date not established'}</p></div></div><details class="lab-ath-disclosure"><summary aria-label="Review details for ${e(content.title)}">Review details</summary><div class="lab-ath-details"><p>${e(content.summary)}</p><dl class="lab-ath-provenance">${/video|newsletter/i.test(content.kind) ? `<div><dt>Video release</dt><dd>${content.videoRelease ? e(ui.date(content.videoRelease)) : 'Not established'}</dd></div>` : ''}<div><dt>Usage clearance</dt><dd>${e(content.rights)}</dd></div><div><dt>Evidence confidence</dt><dd>${e(content.confidence)}%</dd></div></dl><p class="lab-ath-note">Publication date does not establish recording date or a connection to either game.</p></div></details></article>`).join('')}</div>`;
  }

  function sourceFiles(state) {
    return `<div class="lab-ath-file-list lab-ath-source-list">${Object.values(state.data.sources).map(source => `<article class="lab-ath-file lab-ath-source-file">${ui.sourceLogo(source)}<p class="lab-ath-file-meta">${e(source.name)} · ${e(source.kind)}</p><h2>${source.url ? `<a href="${e(source.url)}" target="_blank" rel="noopener noreferrer">${e(source.title)} ↗</a>` : e(source.title)}</h2><details class="lab-ath-disclosure"><summary aria-label="Read evidence from ${e(source.title)}">Read evidence</summary><div class="lab-ath-details"><p>${e(source.assertion)}</p><dl class="lab-ath-provenance"><div><dt>Published</dt><dd>${source.published ? e(ui.date(source.published)) : 'Not established'}</dd></div><div><dt>Fetched</dt><dd>${e(ui.date(source.fetchedAt))}</dd></div><div><dt>Evidence confidence</dt><dd>${e(source.confidence)}%</dd></div></dl>${source.dateNote ? `<p class="lab-ath-note">${e(source.dateNote)}</p>` : ''}<details class="lab-ath-disclosure lab-ath-audit"><summary>Source record</summary><div class="lab-ath-details">${source.locator ? `<p class="lab-ath-reference">${e(source.locator)}</p>` : ''}${source.evidenceId ? `<p class="lab-ath-reference">${e(source.evidenceId)}</p>` : ''}<p class="lab-ath-note">Saved evidence. Event, publication and fetch dates remain distinct.</p></div></details></div></details></article>`).join('')}</div>`;
  }

  function intelligenceFiles(state) {
    const moments = Object.values(state.data.moments);
    const sourceCount = Object.keys(state.data.sources).length;
    const mediaLinks = moments.reduce((total, moment) => total + moment.media.length, 0);
    const identity = state.athlete.identityVerified;
    const identityState = identity === true ? 'Athlete identity verified' : identity === false ? 'Athlete identity unverified' : 'Verification not supplied';
    const mapping = state.data.athlete.externalIdentity;
    const mappingState = mapping ? `${mapping.provider} · ${mapping.method}` : 'External mapping not supplied';
    const careerState = state.data.athlete.careerRelationships.length ? 'Career relationships supplied for review' : 'Career relationships are not normalized';
    return `<div class="lab-ath-intelligence"><dl class="lab-ath-coverage"><div><dt>Reviewed Moments</dt><dd>${e(moments.length)}</dd></div><div><dt>Source evidence</dt><dd>${e(sourceCount)}</dd></div><div><dt>Moment media links</dt><dd>${e(mediaLinks)}</dd></div></dl><section class="lab-ath-intel-section"><h2>Reviewed career evidence</h2><div class="lab-ath-review-links">${moments.map(moment => `<a href="${e(ui.url('moment', state, {momentKey: moment.key}))}"><strong>${e(moment.title)}</strong><time datetime="${e(moment.date)}">${e(ui.date(moment.date))}</time>${ui.icon('arrow')}</a>`).join('')}</div></section><section class="lab-ath-intel-section"><h2>Completeness</h2><dl class="lab-ath-completeness"><div><dt>Athlete identity</dt><dd>${e(identityState)}</dd></div><div><dt>External identity</dt><dd>${e(mappingState)}<span>Mapping review is separate from athlete verification.</span></dd></div><div><dt>Career history</dt><dd>${e(careerState)}</dd></div></dl></section><details class="lab-ath-disclosure lab-ath-intel-sources"><summary>Source evidence</summary><div class="lab-ath-details">${sourceFiles(state)}</div></details></div>`;
  }

  window.LAB_CENTERS.athlete = {
    render(state) {
      if (!state.hasIntelligence) return empty(state);
      const tabs = [['intelligence', 'Intelligence'], ['moments', 'Moments'], ['media', 'Media']];
      return `<div class="lab-ath-center" data-meter-phase="${meterAnimationConsumed ? 'complete' : 'waiting'}"><div class="lab-ath-folder career-folder"><div class="lab-ath-tabs career-folder-tabs" role="tablist" aria-label="Athlete related data">${tabs.map(([id, title]) => `<button type="button" role="tab" id="lab-ath-tab-${id}" aria-controls="lab-ath-panel-${id}" aria-selected="${id === 'intelligence'}" tabindex="${id === 'intelligence' ? 0 : -1}" data-lab-ath-tab="${id}"><span class="lab-ath-tab-label career-folder-label">${title}</span></button>`).join('')}</div><div class="lab-ath-folder-body career-folder-body"><section class="lab-ath-panel" role="tabpanel" tabindex="0" id="lab-ath-panel-intelligence" aria-labelledby="lab-ath-tab-intelligence" data-lab-ath-panel="intelligence">${intelligenceFiles(state)}</section><section class="lab-ath-panel" role="tabpanel" tabindex="0" id="lab-ath-panel-moments" aria-labelledby="lab-ath-tab-moments" data-lab-ath-panel="moments" hidden>${momentFiles(state)}</section><section class="lab-ath-panel" role="tabpanel" tabindex="0" id="lab-ath-panel-media" aria-labelledby="lab-ath-tab-media" data-lab-ath-panel="media" hidden>${mediaFiles(state)}</section></div></div></div>`;
    },
    mount(host, state) {
      if (!state.hasIntelligence) return;
      const tabs = [...host.querySelectorAll('[data-lab-ath-tab]')];
      const panels = [...host.querySelectorAll('[data-lab-ath-panel]')];
      const removers = [];
      const center = host.querySelector('.lab-ath-center');
      const momentsPanel = panels.find(panel => panel.dataset.labAthPanel === 'moments');
      const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
      let startTimer = null;
      let finishTimer = null;
      function finishMeters() {
        window.clearTimeout(startTimer);
        window.clearTimeout(finishTimer);
        startTimer = null;
        finishTimer = null;
        center.dataset.meterPhase = 'complete';
      }
      if (motion.matches || meterAnimationConsumed) {
        finishMeters();
      }
      function startMeters() {
        if (motion.matches || meterAnimationConsumed) {
          meterAnimationConsumed = true;
          finishMeters();
          return;
        }
        if (startTimer !== null) return;
        center.dataset.meterPhase = 'waiting';
        startTimer = window.setTimeout(() => {
          startTimer = null;
          if (momentsPanel.hidden) return;
          meterAnimationConsumed = true;
          center.dataset.meterPhase = 'animate';
          finishTimer = window.setTimeout(finishMeters, 1200);
        }, 2500);
      }
      const motionChanged = event => {
        if (event.matches) {
          if (!momentsPanel.hidden) meterAnimationConsumed = true;
          finishMeters();
        }
      };
      motion.addEventListener('change', motionChanged);
      removers.push(() => {
        window.clearTimeout(startTimer);
        window.clearTimeout(finishTimer);
        motion.removeEventListener('change', motionChanged);
      });
      function activate(id, focus) {
        if (center.dataset.meterPhase === 'animate' && tabs.some(button => button.getAttribute('aria-selected') === 'true' && button.dataset.labAthTab !== id)) finishMeters();
        if (id !== 'moments' && startTimer !== null) {
          window.clearTimeout(startTimer);
          startTimer = null;
        }
        tabs.forEach(button => {
          const active = button.dataset.labAthTab === id;
          button.setAttribute('aria-selected', String(active));
          button.tabIndex = active ? 0 : -1;
          if (active && focus) button.focus();
        });
        panels.forEach(panel => { panel.hidden = panel.dataset.labAthPanel !== id; });
        if (id === 'moments') startMeters();
      }
      tabs.forEach((button, index) => {
        const click = () => activate(button.dataset.labAthTab, false);
        const keydown = event => {
          let next = index;
          if (event.key === 'ArrowRight') next = (index + 1) % tabs.length;
          else if (event.key === 'ArrowLeft') next = (index - 1 + tabs.length) % tabs.length;
          else if (event.key === 'Home') next = 0;
          else if (event.key === 'End') next = tabs.length - 1;
          else return;
          event.preventDefault();
          activate(tabs[next].dataset.labAthTab, true);
        };
        button.addEventListener('click', click);
        button.addEventListener('keydown', keydown);
        removers.push(() => { button.removeEventListener('click', click); button.removeEventListener('keydown', keydown); });
      });
      return () => removers.forEach(remove => remove());
    }
  };
})();
