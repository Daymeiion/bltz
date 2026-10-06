'use strict';

(() => {
  const e = value => LAB_UI.e(value);
  const icon = name => LAB_UI.icon(name);
  const url = (view, state, changes = {}) => LAB_UI.url(view, state, changes);
  const mountedControllers = new WeakMap();

  function recordsFor(state) {
    const keys = state.momentKey === 'usc' ? ['uscBio', 'uscPostgame'] : state.moment.sourceKeys;
    return keys.map(key => ({key, ...state.data.sources[key]}));
  }

  function shortSourceName(source) {
    return source.key === 'uscBio' ? 'Official biography' : source.key === 'uscPostgame' ? 'Postgame report' : source.key === 'nflStats' ? 'Game statistics' : 'Play-by-play';
  }

  function sourceStatement(source) {
    const statements = {
      uscBio: 'USC’s official senior biography documents Rivers’ performance against Washington.',
      uscPostgame: 'USC’s postgame report identifies Rivers as a linebacker participating in this game.',
      nflStats: 'The exact Keith Rivers player row establishes his reported game statistics and the result.',
      nflPbp: 'The defensive play entries identify Rivers’ participation in this game.'
    };
    return statements[source.key];
  }

  function sourceLink(source) {
    return source.url
      ? `<a class="moment-source-link" href="${e(source.url)}" target="_blank" rel="noopener noreferrer" aria-label="Open ${e(shortSourceName(source))} in a new tab">Open source ${icon('arrow')}</a>`
      : '<span class="moment-saved-record">Saved provider record</span>';
  }

  function evidenceDetails(source, state) {
    const performance = source.key === 'uscBio' || source.key === 'nflStats';
    return `<details class="moment-details"><summary>Evidence & dates</summary><div class="moment-detail-body"><p>${e(source.assertion)}</p><p class="moment-detail-boundary">${performance ? 'Scope: reported game performance. No career-best performance, record or commercial value is inferred.' : 'Scope: game participation and event context. No contribution, ownership or media permission is inferred.'}</p><dl class="moment-date-list"><div><dt>Event</dt><dd>${e(LAB_UI.date(state.moment.date))}</dd></div><div><dt>Published</dt><dd>${source.published ? e(LAB_UI.date(source.published)) : 'Date not established'}</dd></div><div><dt>Fetched</dt><dd>${e(source.fetchedAt)}</dd></div><div><dt>Evidence confidence</dt><dd>${e(source.confidence)}%</dd></div></dl>${source.dateNote ? `<p>${e(source.dateNote)}</p>` : ''}<details class="moment-audit"><summary>Record references</summary><div>Moment: ${e(state.moment.id)}${source.evidenceId ? `<br>Evidence: ${e(source.evidenceId)}` : ''}${source.locator ? `<br>Provider record: ${e(source.locator)}` : ''}</div></details></div></details>`;
  }

  function reader(source, state, animate = false) {
    return `<article class="moment-reader ${animate ? 'moment-enter' : ''}"><p class="moment-source-kind">${e(source.name)} · ${e(source.kind)}</p><h3>${e(source.title)}</h3><p class="moment-assertion">${e(sourceStatement(source))}</p><div class="moment-reader-actions">${sourceLink(source)}${evidenceDetails(source, state)}</div></article>`;
  }

  function eventHeader(state) {
    const moment = state.moment;
    return `<header class="moment-event"><div><p class="moment-kicker">${e(moment.competition)}</p><h2>${e(moment.title)}</h2></div><time datetime="${e(moment.date)}">${e(moment.dateLabel)}</time></header><dl class="moment-performance" aria-label="Reported game performance">${moment.stats.map(stat => `<div><dt>${e(stat.label.toLowerCase())}</dt><dd>${e(stat.value)}</dd></div>`).join('')}${state.momentKey === 'nfl' ? `<div><dt>defensive plays</dt><dd>${e(moment.plays)}</dd></div>` : ''}</dl>`;
  }

  function connections(state) {
    const moment = state.moment;
    return `<div class="moment-connections"><div class="moment-path" aria-label="Source-supported athlete and game context"><span>${e(state.athlete.name)}</span><span class="moment-path-arrow" aria-hidden="true">→</span><span>${e(moment.season)} game</span><span class="moment-path-arrow" aria-hidden="true">→</span><span>${e(moment.team)}</span></div><dl class="moment-context"><div><dt>Athlete</dt><dd>Source-confirmed participant</dd></div><div><dt>Opponent</dt><dd>${e(moment.opponent)}</dd></div>${moment.score ? `<div><dt>Result</dt><dd>${e(moment.score)}</dd></div>` : ''}<div><dt>Sources</dt><dd>${state.momentKey === 'usc' ? 'USC Athletics · biography and postgame report' : 'Sportradar NFL · statistics and play-by-play'}</dd></div></dl><details class="moment-details"><summary>Relationship scope</summary><div class="moment-detail-body"><p>Team context comes from the game records. No normalized career roster, teammate or contributor relationship is supplied. Source-confirmed participation is separate from athlete profile verification.</p></div></details></div>`;
  }

  function media() {
    return '<div class="moment-media-state"><span class="moment-media-icon" aria-hidden="true">' + icon('file') + '</span><h3>No verified Moment media</h3><p>A photo or video has not been linked to this event.</p><details class="moment-details"><summary>What is missing</summary><div class="moment-detail-body"><p>Source documents are evidence, not cleared campaign assets. Athlete portraits and post-career references do not establish a media link to this game.</p></div></details></div>';
  }

  function related(state) {
    const other = state.data.moments[state.momentKey === 'usc' ? 'nfl' : 'usc'];
    return `<a class="moment-related" href="${e(url('moment', state, {momentKey: other.key}))}"><span><small>Another career event</small>${e(other.title)}</span>${icon('arrow')}</a>`;
  }

  function empty(state) {
    return `<section class="moment-center"><div class="moment-incomplete"><a class="moment-back" href="${e(url('athlete', state))}">Back to athlete ${icon('arrow')}</a><h2>Moment details</h2><p>Intelligence is not included for this athlete in the review snapshot.</p></div></section>`;
  }

  function render(state) {
    if (!state.hasIntelligence || !state.moment) return empty(state);
    const records = recordsFor(state);
    return `<section class="moment-center" aria-label="Moment evidence inspection"><div class="career-folder"><div class="moment-tabs career-folder-tabs" role="tablist" aria-label="Moment details"><button type="button" id="moment-tab-evidence" role="tab" aria-selected="true" aria-controls="moment-panel-evidence" tabindex="0" data-moment-tab="evidence"><span class="career-folder-label">Evidence</span></button><button type="button" id="moment-tab-connections" role="tab" aria-selected="false" aria-controls="moment-panel-connections" tabindex="-1" data-moment-tab="connections"><span class="career-folder-label">Connections</span></button><button type="button" id="moment-tab-media" role="tab" aria-selected="false" aria-controls="moment-panel-media" tabindex="-1" data-moment-tab="media"><span class="career-folder-label">Media</span></button></div><div class="career-folder-body"><article class="moment-event-card"><a class="moment-back" href="${e(url('athlete', state))}">Back to athlete ${icon('arrow')}</a>${eventHeader(state)}</article><section id="moment-panel-evidence" class="moment-tab-panel moment-enter" role="tabpanel" tabindex="0" aria-labelledby="moment-tab-evidence"><div class="moment-source-picker" aria-label="Reviewed source records">${records.map((source, index) => `<button type="button" aria-pressed="${index === 0}" data-moment-source="${e(source.key)}"><strong>${e(shortSourceName(source))}</strong><span>${e(source.name)}</span></button>`).join('')}</div><div data-moment-reader aria-live="polite">${reader(records[0], state)}</div></section><section id="moment-panel-connections" class="moment-tab-panel moment-enter" role="tabpanel" tabindex="0" aria-labelledby="moment-tab-connections" hidden>${connections(state)}</section><section id="moment-panel-media" class="moment-tab-panel moment-enter" role="tabpanel" tabindex="0" aria-labelledby="moment-tab-media" hidden>${media()}</section>${related(state)}</div></div></section>`;
  }

  function mount(host, state) {
    mountedControllers.get(host)?.abort();
    if (!state.hasIntelligence || !state.moment) return;
    const controller = new AbortController();
    mountedControllers.set(host, controller);
    const records = recordsFor(state);
    function activateTab(key) {
      host.querySelectorAll('[data-moment-tab]').forEach(button => {
        const active = button.dataset.momentTab === key;
        button.setAttribute('aria-selected', String(active));
        button.tabIndex = active ? 0 : -1;
        host.querySelector(`#moment-panel-${button.dataset.momentTab}`).hidden = !active;
      });
    }
    host.addEventListener('click', event => {
      const tab = event.target.closest('[data-moment-tab]');
      if (tab) activateTab(tab.dataset.momentTab);
      const sourceButton = event.target.closest('[data-moment-source]');
      if (!sourceButton) return;
      const selected = records.find(source => source.key === sourceButton.dataset.momentSource);
      if (!selected) return;
      host.querySelectorAll('[data-moment-source]').forEach(button => button.setAttribute('aria-pressed', String(button === sourceButton)));
      host.querySelector('[data-moment-reader]').innerHTML = reader(selected, state, true);
      const animatedReader = host.querySelector('.moment-reader');
      animatedReader.addEventListener('animationend', () => animatedReader.classList.remove('moment-enter'), {once: true, signal: controller.signal});
    }, {signal: controller.signal});
    host.addEventListener('keydown', event => {
      const tab = event.target.closest('[data-moment-tab]');
      if (!tab || !['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
      const tabs = [...host.querySelectorAll('[data-moment-tab]')];
      const index = tabs.indexOf(tab);
      const next = event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1 : (index + (event.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length;
      event.preventDefault();
      activateTab(tabs[next].dataset.momentTab);
      tabs[next].focus();
    }, {signal: controller.signal});
    return () => controller.abort();
  }

  LAB_CENTERS.moment = {render, mount};
})();
