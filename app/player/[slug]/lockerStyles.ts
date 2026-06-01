// AUTO-EXTRACTED from mockups/locker-page.html (Marcus Allen canonical locker design).
// This is the verbatim design CSS. Edit the design in one place: here.
// Rendered inside a <style> tag by the locker server component.
export const LOCKER_CSS = String.raw`
  :root {
    --bg-base:       #0B0E1A;
    --bg-elevated:   #14182B;
    --bg-card:       transparent;
    --bg-hover:      #1C2138;
    --fg-primary:    #F5F5F5;
    --fg-muted:      #8A8FA3;
    --fg-disabled:   #4A4F66;
    --accent-gold:   #F5A623;
    --accent-gold-dim: rgba(245,166,35,0.15);
    --accent-blue:   #2952FF;
    --error:         #FF4D4D;
    --success:       #2ECC71;
    --border-subtle: rgba(255,255,255,0.08);
    --border-strong: rgba(255,255,255,0.16);
    --border-gold:   rgba(245,166,35,0.4);

    --font-display: 'Barlow', sans-serif;
    --font-body:    'Barlow', sans-serif;
    --font-mono:    'JetBrains Mono', monospace;

    --r-sm: 2px;
    --r-md: 4px;
    --r-lg: 8px;
    --r-xl: 12px;

    --ease-standard: cubic-bezier(0.2, 0, 0, 1);
    --dur-micro:  200ms;
    --dur-macro:  400ms;

    --container: 1180px;
  }

  *, *::before, *::after { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; }
  html { scroll-behavior: smooth; }
  body {
    background: var(--bg-base);
    color: var(--fg-primary);
    font-family: var(--font-body);
    font-size: 16px;
    line-height: 1.5;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    overflow-x: hidden;
    text-align: center;
  }

  ::selection { background: var(--accent-gold); color: #0B0E1A; }

  a { color: var(--accent-blue); text-decoration: none; }
  a:hover { text-decoration: underline; }

  .container {
    max-width: var(--container);
    margin-left: auto;
    margin-right: auto;
    padding-left: 32px;
    padding-right: 32px;
  }

  button {
    font-family: var(--font-display);
    font-weight: 700;
    letter-spacing: 0.05em;
    cursor: pointer;
    border: 0;
    border-radius: var(--r-md);
    min-height: 48px;
    padding: 14px 24px;
    text-transform: uppercase;
    font-size: 15px;
    transition: background var(--dur-micro) var(--ease-standard), transform var(--dur-micro) var(--ease-standard), box-shadow var(--dur-micro) var(--ease-standard);
  }
  button:focus-visible { outline: 2px solid var(--accent-gold); outline-offset: 3px; }
  .btn-primary {
    background: var(--accent-blue);
    color: #fff;
    box-shadow: 0 6px 20px rgba(41,82,255,0.35);
  }
  .btn-primary:hover { background: #1F40D6; transform: translateY(-1px); box-shadow: 0 10px 28px rgba(41,82,255,0.45); }
  .btn-ghost {
    background: transparent;
    color: var(--accent-gold);
    border: 1px solid var(--border-gold);
  }
  .btn-ghost:hover { background: var(--accent-gold-dim); }

  /* TOPBAR — fixed, glass, with avatar */
  .topbar {
    position: fixed;
    top: 0; left: 0; right: 0;
    z-index: 50;
    padding: 14px 32px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    backdrop-filter: blur(18px) saturate(140%);
    -webkit-backdrop-filter: blur(18px) saturate(140%);
    background: rgba(11,14,26,0.55);
    border-bottom: 1px solid var(--border-subtle);
    transition: background var(--dur-macro) var(--ease-standard);
  }
  .topbar.is-scrolled { background: rgba(11,14,26,0.92); }
  .topbar {
    display: grid;
    grid-template-columns: auto 1fr auto;
    gap: 24px;
    align-items: center;
  }
  .topbar__brand {
    font-family: var(--font-display);
    font-weight: 900;
    color: var(--accent-gold);
    font-size: 22px;
    letter-spacing: 0.06em;
  }
  .topbar__right {
    display: flex;
    align-items: center;
    gap: 12px;
    justify-self: end;
  }
  .topbar__athlete {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  /* SEARCH — centered in topbar on web */
  .topbar__search {
    position: relative;
    width: 100%;
    max-width: 420px;
    margin: 0 auto;
  }
  .search-input-wrap {
    position: relative;
    display: flex;
    align-items: center;
    background: rgba(255,255,255,0.06);
    border: 1px solid var(--border-subtle);
    border-radius: 9999px;
    transition:
      background var(--dur-micro) var(--ease-standard),
      border-color var(--dur-micro) var(--ease-standard);
  }
  .search-input-wrap:hover { background: rgba(255,255,255,0.09); }
  .search-input-wrap:focus-within {
    background: rgba(11,14,26,0.92);
    border-color: var(--border-gold);
    box-shadow: 0 0 0 3px rgba(245,166,35,0.12);
  }
  .search-icon {
    width: 18px; height: 18px;
    margin-left: 14px;
    stroke: var(--fg-muted);
    fill: none;
    stroke-width: 2;
    flex-shrink: 0;
    transition: stroke var(--dur-micro) var(--ease-standard);
  }
  .search-input-wrap:focus-within .search-icon { stroke: var(--accent-gold); }
  .search-input {
    flex: 1;
    background: transparent;
    border: 0;
    outline: 0;
    padding: 10px 14px;
    font-family: var(--font-body);
    font-weight: 500;
    font-size: 14px;
    color: var(--fg-primary);
    min-width: 0;
  }
  .search-input::placeholder {
    color: var(--fg-muted);
    font-family: var(--font-body);
  }
  .search-clear {
    background: transparent;
    border: 0;
    color: var(--fg-muted);
    cursor: pointer;
    padding: 6px 14px 6px 8px;
    font-family: var(--font-mono);
    font-size: 16px;
    line-height: 1;
    display: none;
  }
  .search-input-wrap.has-text .search-clear { display: inline-block; }
  .search-clear:hover { color: var(--accent-gold); }

  /* DROPDOWN of results */
  .search-results {
    position: absolute;
    top: calc(100% + 8px);
    left: 0;
    right: 0;
    background: rgba(11,14,26,0.96);
    backdrop-filter: blur(18px);
    -webkit-backdrop-filter: blur(18px);
    border: 1px solid var(--border-subtle);
    border-radius: var(--r-lg);
    overflow: hidden;
    max-height: 60vh;
    overflow-y: auto;
    box-shadow: 0 24px 60px rgba(0,0,0,0.6);
    display: none;
    z-index: 60;
  }
  .search-results.is-open { display: block; }
  .search-results__head {
    padding: 10px 14px;
    font-family: var(--font-mono);
    font-size: 10px;
    letter-spacing: 0.16em;
    text-transform: uppercase;
    color: var(--fg-muted);
    border-bottom: 1px solid var(--border-subtle);
  }
  .search-result {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 10px 14px;
    text-decoration: none;
    color: inherit;
    cursor: pointer;
    border-bottom: 1px solid rgba(255,255,255,0.04);
    transition: background var(--dur-micro) var(--ease-standard);
  }
  .search-result:last-child { border-bottom: 0; }
  .search-result:hover, .search-result.is-active {
    background: rgba(245,166,35,0.08);
    text-decoration: none;
  }
  .search-result__avatar {
    width: 36px; height: 36px;
    border-radius: 50%;
    background: var(--bg-elevated);
    border: 1.5px solid var(--accent-gold);
    overflow: hidden;
    flex-shrink: 0;
  }
  .search-result__avatar img { width: 100%; height: 100%; object-fit: cover; }
  .search-result__body { display: flex; flex-direction: column; gap: 2px; min-width: 0; flex: 1; }
  .search-result__name {
    font-family: var(--font-body);
    font-weight: 700;
    font-size: 17px;
    line-height: 1.2;
    color: var(--fg-primary);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .search-result__name mark {
    background: rgba(245,166,35,0.25);
    color: var(--accent-gold);
    padding: 0 2px;
    border-radius: 2px;
  }
  .search-result__meta {
    font-family: var(--font-mono);
    font-size: 10px;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: var(--fg-muted);
  }
  .search-result__meta .level {
    color: var(--accent-gold);
    margin-left: 4px;
  }
  .search-results__empty {
    padding: 24px 16px;
    text-align: center;
    font-family: var(--font-mono);
    font-size: 11px;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: var(--fg-muted);
  }

  /* MOBILE: hide the inline search bar, show the icon button + full-screen overlay */
  .topbar__search-btn {
    display: none !important;        /* hidden on web (overrides .btn-icon display) */
    background: transparent !important;
    border: 0 !important;
    color: var(--fg-primary);
  }
  .topbar__search-btn:hover { background: transparent !important; color: var(--accent-gold); }
  .topbar__search-btn svg { width: 22px; height: 22px; }
  @media (max-width: 767px) {
    .topbar { gap: 12px; }
    .topbar__search { display: none; }
    .topbar__search-btn { display: inline-flex !important; }
  }

  /* MOBILE search overlay (slides down from topbar) */
  .search-overlay {
    position: fixed;
    inset: 0;
    z-index: 80;
    background: rgba(11,14,26,0.96);
    backdrop-filter: blur(18px);
    -webkit-backdrop-filter: blur(18px);
    display: none;
    flex-direction: column;
    padding: 14px 16px 0;
  }
  .search-overlay.is-open { display: flex; }
  .search-overlay .search-overlay__top {
    display: flex;
    align-items: center;
    gap: 12px;
  }
  .search-overlay .search-input-wrap { flex: 1; }
  .search-overlay__close {
    background: transparent;
    border: 0;
    color: var(--fg-primary);
    cursor: pointer;
    padding: 8px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 40px; height: 40px;
    flex-shrink: 0;
  }
  .search-overlay__close:hover { color: var(--accent-gold); }
  .search-overlay__close svg {
    width: 22px; height: 22px;
    stroke: currentColor;
    fill: none;
    stroke-width: 2;
  }
  .search-overlay .search-results {
    position: relative;
    inset: auto;
    margin-top: 14px;
    max-height: none;
    background: transparent;
    border: 0;
    box-shadow: none;
    overflow-y: auto;
    flex: 1;
  }

  /* AVATAR — gold-rimmed circle, monogram fallback */
  .avatar {
    width: 36px;
    height: 36px;
    border-radius: 50%;
    background: var(--bg-elevated);
    border: 2px solid var(--accent-gold);
    display: inline-flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
    font-family: var(--font-display);
    font-weight: 900;
    color: var(--accent-gold);
    font-size: 15px;
    letter-spacing: 0;
    flex-shrink: 0;
  }
  .avatar img { width: 100%; height: 100%; object-fit: cover; }
  .avatar--lg {
    width: 180px; height: 180px;
    border-width: 4px;
    font-size: 64px;
    box-shadow: 0 14px 44px rgba(0,0,0,0.6), 0 0 0 8px var(--bg-base);
  }
  @media (max-width: 767px) {
    .avatar--lg { width: 132px; height: 132px; font-size: 46px; box-shadow: 0 10px 32px rgba(0,0,0,0.6), 0 0 0 6px var(--bg-base); }
  }

  /* AVATAR EDIT — hover reveals overlay, click triggers file picker */
  .avatar-edit {
    position: relative;
    display: inline-block;
    cursor: pointer;
    border-radius: 50%;
  }
  .avatar-edit input[type="file"] {
    position: absolute;
    inset: 0;
    opacity: 0;
    cursor: pointer;
    border-radius: 50%;
    z-index: 3;
  }
  .avatar-edit__overlay {
    position: absolute;
    inset: 4px;                    /* sit inside the gold border */
    border-radius: 50%;
    background: rgba(11,14,26,0.72);
    color: var(--accent-gold);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 6px;
    opacity: 0;
    transition: opacity var(--dur-micro) var(--ease-standard);
    pointer-events: none;
    z-index: 2;
    backdrop-filter: blur(2px);
  }
  .avatar-edit:hover .avatar-edit__overlay,
  .avatar-edit:focus-within .avatar-edit__overlay { opacity: 1; }
  .avatar-edit__icon {
    width: 32px; height: 32px;
    display: block;
    stroke: var(--accent-gold);
    fill: none;
    stroke-width: 1.6;
  }
  .avatar-edit__label {
    font-family: var(--font-mono);
    font-size: 10px;
    letter-spacing: 0.16em;
    text-transform: uppercase;
  }
  .avatar-edit:focus-within { outline: 2px solid var(--accent-gold); outline-offset: 4px; }

  /* HERO — fixed 400px banner with video + parallax */
  .hero {
    position: relative;
    height: 400px;
    width: 100%;
    overflow: hidden;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .hero__bg {
    position: absolute;
    inset: -10% 0 -10% 0;       /* extra height for parallax travel */
    z-index: 0;
    will-change: transform;
  }
  .hero__bg video,
  .hero__bg .poster {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
  .hero__bg .poster {
    background-size: cover;
    background-position: center 30%;
    background-image:
      linear-gradient(135deg, rgba(245,166,35,0.10) 0%, transparent 50%),
      url('https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=2400&q=80&auto=format&fit=crop');
  }
  .hero__bg::after {
    content: '';
    position: absolute;
    inset: 0;
    background:
      radial-gradient(ellipse at 50% 30%, rgba(11,14,26,0.40) 0%, rgba(11,14,26,0.85) 70%, var(--bg-base) 100%),
      linear-gradient(180deg, rgba(11,14,26,0.85) 0%, rgba(11,14,26,0.55) 35%, var(--bg-base) 100%);
  }

  /* PROFILE BLOCK — sits below the hero banner, avatar overlaps */
  .profile {
    position: relative;
    margin: -90px auto 0;            /* pull up so avatar overlaps banner */
    text-align: center;
    padding: 0 32px 56px;
    max-width: var(--container);
    z-index: 2;
  }
  .profile__avatar-wrap {
    margin-bottom: 24px;
    display: inline-block;
  }
  .profile__name {
    font-family: var(--font-display);
    font-weight: 900;
    color: var(--accent-gold);
    text-transform: uppercase;
    letter-spacing: -0.005em;
    line-height: 0.92;
    margin: 0 0 14px;
    font-size: clamp(56px, 9vw, 128px);
    text-shadow: 0 6px 40px rgba(0,0,0,0.6);
  }
  .profile__sub {
    font-family: var(--font-mono);
    font-weight: 500;
    color: var(--fg-primary);
    font-size: 14px;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    margin: 0 0 14px;
  }
  .profile__sub .dot { color: var(--accent-gold); margin: 0 10px; }
  .profile__tagline {
    font-family: var(--font-body);
    font-style: italic;
    color: var(--fg-muted);
    margin: 0 auto 32px;
    font-size: 17px;
    max-width: 540px;
    line-height: 1.55;
  }
  .profile__actions {
    display: flex;
    gap: 12px;
    flex-wrap: wrap;
    justify-content: center;
  }

  /* SECTIONS */
  section.zone {
    padding: 120px 0;
    position: relative;
  }
  .section-head {
    text-align: center;
    margin-bottom: 64px;
  }
  .section-head h2 {
    font-family: var(--font-display);
    font-weight: 900;
    text-transform: uppercase;
    letter-spacing: 0.02em;
    color: var(--fg-primary);
    font-size: clamp(40px, 5vw, 64px);
    margin: 0 0 12px;
    line-height: 1;
  }
  .section-head .kicker {
    font-family: var(--font-mono);
    font-size: 12px;
    letter-spacing: 0.16em;
    text-transform: uppercase;
    color: var(--accent-gold);
  }

  /* CARD COMPONENT — base */
  .card {
    background: var(--bg-card);
    border: 1px solid var(--border-subtle);
    border-radius: var(--r-lg);
    padding: 28px 24px;
    transition: transform var(--dur-micro) var(--ease-standard),
                border-color var(--dur-micro) var(--ease-standard),
                box-shadow var(--dur-micro) var(--ease-standard);
  }
  .card:hover {
    transform: translateY(-2px);
    border-color: var(--border-strong);
    box-shadow: 0 16px 40px rgba(0,0,0,0.4);
  }
  .card.is-featured {
    border-color: var(--border-gold);
    background: linear-gradient(160deg, var(--bg-card), rgba(245,166,35,0.06));
  }

  /* CAREER FEATURE SPREAD — 2x2 stat grid left, faded action image right */
  /* CAREER FEATURE SPREAD — section header on top, then overlap layout (60/60) */
  .career-feature__header {
    text-align: center;
    margin-bottom: 0;
  }
  .career-feature__overline {
    font-family: var(--font-mono);
    font-size: 11px;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    color: var(--accent-gold);
    margin: 0 0 12px;
    text-align: center;
  }
  .career-feature__headline {
    font-family: var(--font-display);
    font-weight: 900;
    text-transform: uppercase;
    font-size: clamp(40px, 5vw, 64px);
    line-height: 0.95;
    letter-spacing: -0.01em;
    margin: 0 0 14px;
    color: var(--fg-primary);
    text-shadow: 0 4px 20px rgba(0,0,0,0.5);
    text-align: center;
  }
  .career-feature__pull {
    font-family: var(--font-body);
    font-style: italic;
    color: var(--fg-muted);
    font-size: 17px;
    line-height: 1.5;
    margin: 0 auto;
    max-width: 540px;
    text-align: center;
  }

  /* Body: relative positioning context for the overlap */
  .career-feature {
    position: relative;
    isolation: isolate;
    min-height: 820px;
    display: flex;
    flex-direction: column;
    justify-content: center;
    padding-top: 56px;
  }
  .career-feature__header {
    position: relative;
    z-index: 2;                  /* above the image */
    width: 100%;
  }
  .career-feature__body {
    position: relative;
    z-index: 1;
    display: flex;
    align-items: center;
    flex: 1 1 auto;
  }
  .career-feature__stats {
    position: relative;
    z-index: 2;
    width: 60%;
    flex-shrink: 0;
  }
  /* Image: absolute right, 60% width, full-bleeds to viewport right edge */
  .career-feature__image {
    position: absolute;
    top: 0;
    bottom: 0;
    right: calc(50% - 50vw);                /* full-bleed to viewport right */
    width: calc(60% + (50vw - 50%));        /* 60% of container + viewport margin */
    z-index: 0;
    overflow: hidden;
    background: var(--bg-elevated);
    background-image: url('https://images.unsplash.com/photo-1566577739112-5180d4bf9390?w=2400&q=85&auto=format&fit=crop');
    background-size: cover;
    background-position: center 35%;
  }
  /* Strong left-edge fade — image sits behind stats, blends into the bg */
  .career-feature__image::after {
    content: '';
    position: absolute;
    inset: 0;
    background:
      linear-gradient(90deg,  var(--bg-base) 0%, rgba(11,14,26,0.85) 18%, transparent 55%),
      linear-gradient(270deg, var(--bg-base) 0%, rgba(11,14,26,0.55) 10%, transparent 30%),
      linear-gradient(180deg, var(--bg-base) 0%, rgba(11,14,26,0.85) 18%, transparent 50%),
      linear-gradient(0deg,   var(--bg-base) 0%, rgba(11,14,26,0.85) 18%, transparent 50%);
  }
  /* COLLEGE STAT VISUAL — hero number, the data IS the design */
  .stat-hero {
    text-align: center;
    position: relative;
    padding: 8px 0;
  }
  /* THE NUMBER — Barlow regular (not condensed), oversized */
  .stat-hero__num {
    font-family: var(--font-body);
    font-weight: 700;
    font-size: clamp(120px, 18vw, 220px);
    line-height: 0.82;
    letter-spacing: -0.04em;
    margin: 0 auto;
    padding-bottom: 10px;
    color: var(--accent-gold);
    background: linear-gradient(180deg, var(--accent-gold) 0%, #D88F1A 100%);
    -webkit-background-clip: text;
    background-clip: text;
    -webkit-text-fill-color: transparent;
    /* drop-shadow respects the gradient-filled text shape — paints OUTSIDE the glyphs only */
    filter:
      drop-shadow(0 4px 12px rgba(0,0,0,0.55))
      drop-shadow(0 12px 32px rgba(0,0,0,0.45))
      drop-shadow(0 0 40px rgba(245,166,35,0.35));
  }
  .stat-hero__caption {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 10px;
    margin: 22px auto 40px;
    padding-bottom: 24px;
    border-bottom: 1px solid var(--border-subtle);
    text-align: center;
  }
  .stat-hero__caption-label {
    font-family: var(--font-display);
    font-weight: 900;
    text-transform: uppercase;
    font-size: 26px;
    letter-spacing: 0.03em;
    color: var(--fg-primary);
    margin: 0;
    line-height: 1;
    text-shadow: 0 4px 20px rgba(0,0,0,0.6);
  }
  .stat-hero__caption-meta {
    font-family: var(--font-mono);
    font-size: 12px;
    letter-spacing: 0.16em;
    text-transform: uppercase;
    color: var(--fg-muted);
    margin: 0;
    text-shadow: 0 2px 8px rgba(0,0,0,0.5);
  }

  /* SEASON BREAKDOWN — three lean chips under the hero, centered */
  .stat-hero__seasons {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 16px;
    max-width: 480px;
    margin: 0 auto;
  }
  .season-chip {
    background: transparent;
    border: 0;
    padding: 0 8px;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    text-align: center;
    position: relative;
  }
  .season-chip + .season-chip::before {
    content: '';
    position: absolute;
    left: 0;
    top: 10%;
    bottom: 10%;
    width: 1px;
    background: var(--border-subtle);
  }
  .season-chip.is-peak::after {
    content: '';
    position: absolute;
    left: 50%;
    bottom: -10px;
    transform: translateX(-50%);
    width: 32px;
    height: 2px;
    background: var(--accent-gold);
    box-shadow: 0 0 12px rgba(245,166,35,0.6);
  }
  .season-chip__year {
    font-family: var(--font-mono);
    font-size: 11px;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    color: var(--fg-muted);
    margin: 0;
    display: flex;
    align-items: center;
    gap: 6px;
    text-shadow: 0 2px 6px rgba(0,0,0,0.5);
  }
  .season-chip.is-peak .season-chip__year { color: var(--accent-gold); }
  .season-chip.is-peak .season-chip__year::after {
    content: '★';
    font-size: 10px;
  }
  /* Numbers in Barlow regular (not condensed) */
  .season-chip__num {
    font-family: var(--font-body);
    font-weight: 700;
    font-size: clamp(34px, 3vw, 44px);
    line-height: 0.95;
    letter-spacing: -0.02em;
    color: var(--fg-primary);
    margin: 0;
    text-shadow: 0 4px 16px rgba(0,0,0,0.5);
  }
  .season-chip.is-peak .season-chip__num { color: var(--accent-gold); }
  .season-chip__label {
    font-family: var(--font-mono);
    font-size: 10px;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: var(--fg-disabled);
    margin: 0;
    text-shadow: 0 2px 6px rgba(0,0,0,0.5);
  }

  @media (max-width: 1023px) {
    .stat-hero__num { font-size: clamp(96px, 22vw, 168px); }
  }
  @media (max-width: 767px) {
    .stat-hero__seasons { gap: 10px; max-width: 360px; }
    .season-chip { padding-left: 12px; }
    .stat-hero__caption-label { font-size: 22px; }
  }
  .stat-chart__head {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 12px;
    padding-bottom: 18px;
    margin-bottom: 18px;
    border-bottom: 1px solid var(--border-subtle);
  }
  .stat-chart__title {
    font-family: var(--font-display);
    font-weight: 900;
    text-transform: uppercase;
    font-size: 13px;
    letter-spacing: 0.1em;
    color: var(--fg-primary);
    margin: 0;
  }
  .stat-chart__axis {
    font-family: var(--font-mono);
    font-size: 10px;
    letter-spacing: 0.16em;
    text-transform: uppercase;
    color: var(--fg-muted);
  }

  .stat-chart__rows {
    display: flex;
    flex-direction: column;
    gap: 14px;
  }
  .stat-row {
    display: grid;
    grid-template-columns: 64px 1fr auto;
    align-items: center;
    gap: 14px;
  }
  .stat-row__year {
    font-family: var(--font-display);
    font-weight: 900;
    font-size: 16px;
    letter-spacing: 0.04em;
    color: var(--fg-primary);
    line-height: 1;
  }
  .stat-row__year small {
    display: block;
    font-family: var(--font-mono);
    font-weight: 500;
    font-size: 9px;
    letter-spacing: 0.14em;
    color: var(--fg-muted);
    margin-top: 4px;
    text-transform: uppercase;
  }
  .stat-row__bar {
    position: relative;
    height: 24px;
    background: var(--bg-elevated);
    border-radius: 2px;
    overflow: hidden;
  }
  .stat-row__fill {
    position: absolute;
    inset: 0 auto 0 0;
    width: 0;                 /* set inline via style */
    background: linear-gradient(90deg, rgba(245,166,35,0.35) 0%, var(--fg-muted) 100%);
    border-radius: 2px;
    transition: width 1200ms cubic-bezier(0.2, 0.9, 0.2, 1) 200ms;
  }
  .stat-row.is-peak .stat-row__fill {
    background: linear-gradient(90deg, rgba(245,166,35,0.5) 0%, var(--accent-gold) 100%);
    box-shadow: 0 0 24px -2px rgba(245,166,35,0.5);
  }
  .stat-row.is-peak .stat-row__year { color: var(--accent-gold); }
  .stat-row__num {
    font-family: var(--font-mono);
    font-weight: 700;
    font-size: 16px;
    color: var(--fg-primary);
    line-height: 1;
    min-width: 56px;
    text-align: right;
    letter-spacing: -0.01em;
  }
  .stat-row.is-peak .stat-row__num { color: var(--accent-gold); }
  .stat-row__num .star {
    color: var(--accent-gold);
    margin-right: 4px;
    font-size: 12px;
  }

  /* TOTAL footer — single emphatic number */
  .stat-chart__total {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 16px;
    margin-top: 22px;
    padding-top: 20px;
    border-top: 1px solid var(--border-strong);
  }
  .stat-chart__total-label {
    font-family: var(--font-mono);
    font-size: 11px;
    letter-spacing: 0.16em;
    text-transform: uppercase;
    color: var(--fg-muted);
  }
  .stat-chart__total-num {
    font-family: var(--font-display);
    font-weight: 900;
    font-size: clamp(40px, 4vw, 56px);
    color: var(--accent-gold);
    line-height: 0.9;
    letter-spacing: -0.02em;
    margin: 0;
  }
  .stat-chart__total-sub {
    font-family: var(--font-mono);
    font-size: 10px;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: var(--fg-muted);
    margin-top: 6px;
    display: block;
  }

  /* Trigger bar fills when section enters viewport */
  .stat-chart.in .stat-row__fill[data-pct="20"]  { width: 20%; }
  .stat-chart.in .stat-row__fill[data-pct="55"]  { width: 55%; }
  .stat-chart.in .stat-row__fill[data-pct="83"]  { width: 83%; }
  .stat-chart.in .stat-row__fill[data-pct="100"] { width: 100%; }

  @media (prefers-reduced-motion: reduce) {
    .stat-row__fill { transition: none; width: var(--pct, 0%); }
  }
  /* STAT CARD — trading-card / scoreboard artifact */
  .stat-card {
    position: relative;
    aspect-ratio: 1 / 1;
    background:
      radial-gradient(ellipse at 50% 0%, rgba(245,166,35,0.06) 0%, transparent 50%),
      linear-gradient(180deg, var(--bg-card) 0%, var(--bg-elevated) 100%);
    border: 1px solid var(--border-subtle);
    border-radius: var(--r-lg);
    display: grid;
    grid-template-rows: auto 1fr auto;
    overflow: hidden;
    transition:
      transform var(--dur-micro) var(--ease-standard),
      border-color var(--dur-micro) var(--ease-standard),
      box-shadow var(--dur-micro) var(--ease-standard);
  }
  .stat-card:hover {
    transform: translateY(-2px);
    border-color: var(--border-gold);
    box-shadow: 0 14px 32px rgba(0,0,0,0.4), 0 0 0 1px rgba(245,166,35,0.2);
  }
  /* Subtle scanline / paper texture */
  .stat-card::before {
    content: '';
    position: absolute;
    inset: 0;
    background-image: linear-gradient(rgba(255,255,255,0.015) 1px, transparent 1px);
    background-size: 100% 3px;
    pointer-events: none;
    z-index: 0;
  }
  /* Corner notch — small gold tab top-right */
  .stat-card::after {
    content: '';
    position: absolute;
    top: 0; right: 0;
    width: 24px; height: 4px;
    background: var(--accent-gold);
    z-index: 1;
  }

  /* TOP BAND — year + season tag */
  .stat-card__year {
    position: relative;
    z-index: 1;
    margin: 0;
    padding: 10px 14px 8px;
    font-family: var(--font-mono);
    font-weight: 500;
    font-size: 10px;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: var(--accent-gold);
    border-bottom: 1px solid var(--border-subtle);
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 8px;
  }
  .stat-card__year .yr {
    font-family: var(--font-display);
    font-weight: 900;
    font-size: 14px;
    letter-spacing: 0.04em;
    color: var(--fg-primary);
  }

  /* CENTER — the number */
  .stat-card__num {
    position: relative;
    z-index: 1;
    align-self: center;
    justify-self: center;
    font-family: var(--font-display);
    font-weight: 900;
    font-size: clamp(34px, 3vw, 48px);
    color: var(--fg-primary);
    line-height: 0.9;
    letter-spacing: -0.02em;
    margin: 0;
    text-align: center;
  }

  /* BOTTOM — label with hairline rules + attribution */
  .stat-card__label {
    position: relative;
    z-index: 1;
    margin: 0;
    padding: 8px 14px 12px;
    font-family: var(--font-mono);
    font-weight: 500;
    font-size: 9px;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    color: var(--fg-muted);
    text-align: center;
    border-top: 1px solid var(--border-subtle);
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  .stat-card__label .attr {
    font-size: 8px;
    letter-spacing: 0.2em;
    color: var(--fg-disabled);
  }

  /* FEATURED (Heisman) — gold dominates, number in gold, ★ corner */
  .stat-card.is-featured {
    background:
      radial-gradient(ellipse at 50% 0%, rgba(245,166,35,0.22) 0%, transparent 60%),
      linear-gradient(180deg, var(--bg-card) 0%, var(--bg-elevated) 100%);
    border-color: var(--border-gold);
  }
  .stat-card.is-featured::after {
    width: 100%; height: 4px;
    background: linear-gradient(90deg, transparent 0%, var(--accent-gold) 50%, transparent 100%);
  }
  .stat-card.is-featured .stat-card__num { color: var(--accent-gold); }
  .stat-card.is-featured .stat-card__year .yr { color: var(--accent-gold); }
  .stat-card.is-featured .stat-card__year::after {
    content: '★';
    color: var(--accent-gold);
    font-size: 10px;
    margin-left: auto;
  }

  /* TOTALS — inverted, gold accents stronger */
  .stat-card.is-totals {
    background:
      linear-gradient(180deg, var(--bg-elevated) 0%, #0F1224 100%);
    border-color: var(--border-strong);
  }
  .stat-card.is-totals::after {
    width: 100%;
    background: var(--accent-gold);
    opacity: 0.5;
  }
  .stat-card.is-totals .stat-card__num { color: var(--accent-gold); }
  .stat-card.is-totals .stat-card__year { color: var(--fg-muted); }
  .stat-card.is-totals .stat-card__year .yr { color: var(--accent-gold); font-size: 12px; }

  /* VIDEO CAROUSEL — 16:9 cards in a horizontal scroll-snap row */
  .video-row {
    position: relative;
  }
  .video-row__head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 28px;
    gap: 16px;
  }
  .video-row__viewport {
    position: relative;
    isolation: isolate;
  }
  /* Gradient fades on each end — fade to page bg, signal more content + arrow legibility */
  .video-row__viewport::before,
  .video-row__viewport::after {
    content: '';
    position: absolute;
    top: 0; bottom: 0;
    width: 110px;
    z-index: 5;
    pointer-events: none;
    transition: opacity var(--dur-macro) var(--ease-standard);
  }
  .video-row__viewport::before {
    left: 0;
    background: linear-gradient(90deg, var(--bg-base) 0%, rgba(11,14,26,0.85) 35%, transparent 100%);
  }
  .video-row__viewport::after {
    right: 0;
    background: linear-gradient(270deg, var(--bg-base) 0%, rgba(11,14,26,0.85) 35%, transparent 100%);
  }
  /* Hide the matching gradient when scrolled to that edge (no more content that direction) */
  .video-row__viewport.at-start::before { opacity: 0; }
  .video-row__viewport.at-end::after   { opacity: 0; }
  @media (max-width: 767px) {
    .video-row__viewport::before, .video-row__viewport::after { width: 48px; }
  }
  .video-row__arrow {
    position: absolute;
    top: 50%;
    transform: translateY(-50%);
    z-index: 6;                                         /* above gradient overlays */
    width: 56px; height: 56px;
    background: transparent;
    border: 0;
    color: var(--fg-primary);
    display: inline-flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    padding: 0;
    transition: color var(--dur-micro) var(--ease-standard),
                opacity var(--dur-micro) var(--ease-standard),
                transform var(--dur-micro) var(--ease-standard);
    filter: drop-shadow(0 4px 12px rgba(0,0,0,0.6));
  }
  .video-row__arrow:hover {
    color: var(--accent-gold);
    transform: translateY(-50%) scale(1.15);
  }
  .video-row__arrow:focus-visible {
    outline: 2px solid var(--accent-gold);
    outline-offset: 4px;
    border-radius: 50%;
  }
  .video-row__arrow[disabled] { opacity: 0; pointer-events: none; }
  .video-row__arrow svg { width: 36px; height: 36px; stroke: currentColor; fill: none; stroke-width: 2.5; }
  .video-row__arrow--prev { left: 4px; }
  .video-row__arrow--next { right: 4px; }
  @media (max-width: 767px) {
    .video-row__arrow { display: none; }
  }
  .see-all {
    font-family: var(--font-display);
    font-weight: 700;
    text-transform: uppercase;
    font-size: 13px;
    letter-spacing: 0.08em;
    color: var(--accent-gold);
    background: transparent;
    border: 1px solid var(--border-gold);
    padding: 10px 16px;
    border-radius: var(--r-md);
    cursor: pointer;
    min-height: 44px;
    transition: background var(--dur-micro) var(--ease-standard);
  }
  .see-all:hover { background: var(--accent-gold-dim); }
  .see-all:focus-visible { outline: 2px solid var(--accent-gold); outline-offset: 2px; }

  .reel {
    display: grid;
    grid-auto-flow: column;
    grid-auto-columns: calc((100% - 60px) / 3.5);   /* DESKTOP: 3.5 cards visible */
    gap: 20px;
    overflow-x: auto;
    scroll-snap-type: x mandatory;
    scroll-behavior: smooth;
    padding: 16px 0 24px;                           /* vertical bleed for hover lift */
    margin: -16px 0 -24px;                          /* counteract vertical padding only */
    scrollbar-width: none;
    -ms-overflow-style: none;
  }
  .reel::-webkit-scrollbar { display: none; }

  /* FLOATING SEE ALL — pinned top-right above the carousel */
  .see-all--floating {
    position: absolute;
    top: -8px;
    right: 0;
    z-index: 5;
  }
  .video-row { position: relative; padding-top: 10px; }
  @media (max-width: 767px) {
    .video-row { padding-top: 10px; }
    .see-all--floating { top: 0; }
  }
  .visually-hidden {
    position: absolute !important;
    width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden;
    clip: rect(0,0,0,0); white-space: nowrap; border: 0;
  }

  /* CARD — matches BLTZ design system reference */
  .reel-card {
    position: relative;
    border-radius: var(--r-lg);
    overflow: hidden;
    background: var(--bg-card);
    cursor: pointer;
    border: 1px solid var(--border-subtle);
    scroll-snap-align: start;
    display: flex;
    flex-direction: column;
    transition: transform var(--dur-micro) var(--ease-standard),
                border-color var(--dur-micro) var(--ease-standard),
                box-shadow var(--dur-micro) var(--ease-standard);
  }
  .reel-card {
    will-change: transform;
    transition:
      transform 360ms cubic-bezier(0.2, 0.9, 0.2, 1),
      border-color 240ms var(--ease-standard),
      box-shadow 360ms var(--ease-standard);
  }
  .reel-card:hover, .reel-card:focus-visible {
    transform: translateY(-12px) scale(1.025);
    border-color: var(--accent-gold);
    box-shadow:
      0 36px 80px rgba(0,0,0,0.6),
      0 0 0 1px rgba(245,166,35,0.35),
      0 0 80px -10px rgba(245,166,35,0.35);
  }
  .reel-card:hover .reel-card__thumb {
    transform: scale(1.06);
  }
  .reel-card__thumb {
    transition: transform 700ms cubic-bezier(0.2, 0.9, 0.2, 1);
  }
  .reel-card:hover .reel-card__title { color: var(--accent-gold); }
  .reel-card__title { transition: color 240ms var(--ease-standard); }

  /* Card text scale at desktop — smaller now that cards are tighter */
  @media (min-width: 1024px) {
    .reel-card__meta { padding: 14px 16px 0; }
    .reel-card__title { font-size: 13px; line-height: 1.25; margin-bottom: 5px; }
    .reel-card__sub { font-size: 11px; }
    .badge { padding: 5px 10px; font-size: 11px; }
    .duration { font-size: 11px; padding: 4px 8px; bottom: 10px; right: 10px; }
    .play-icon { width: 36px; height: 36px; margin: -18px 0 0 -18px; }
    .play-icon::after { border-left-width: 9px; border-top-width: 6px; border-bottom-width: 6px; margin-left: 2px; }
  }

  /* SEE STATS badge — pill CTA below the season chips */
  .see-stats {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    margin: 32px auto 0;
    padding: 8px 16px 8px 14px;
    border-radius: 9999px;
    background: rgba(11,14,26,0.72);
    backdrop-filter: blur(6px);
    -webkit-backdrop-filter: blur(6px);
    border: 1px solid var(--border-gold);
    color: var(--accent-gold);
    font-family: var(--font-mono);
    font-weight: 700;
    font-size: 11px;
    letter-spacing: 0.16em;
    text-transform: uppercase;
    line-height: 1;
    text-decoration: none;
    cursor: pointer;
    transition:
      background var(--dur-micro) var(--ease-standard),
      border-color var(--dur-micro) var(--ease-standard),
      transform var(--dur-micro) var(--ease-standard),
      box-shadow var(--dur-micro) var(--ease-standard);
  }
  .see-stats::after {
    content: '→';
    font-size: 13px;
    line-height: 1;
    transition: transform var(--dur-micro) var(--ease-standard);
  }
  .see-stats:hover {
    background: rgba(245,166,35,0.12);
    border-color: var(--accent-gold);
    transform: translateY(-1px);
    box-shadow: 0 8px 20px rgba(0,0,0,0.4), 0 0 24px -6px rgba(245,166,35,0.4);
    text-decoration: none;
  }
  .see-stats:hover::after { transform: translateX(3px); }
  .see-stats:focus-visible {
    outline: 2px solid var(--accent-gold);
    outline-offset: 3px;
  }
  .stat-hero { display: flex; flex-direction: column; align-items: center; }

  /* Pulsing glow on play button when card is hovered */
  @keyframes playPulse {
    0%, 100% { box-shadow: 0 0 0 8px rgba(245,166,35,0.18), 0 0 32px 6px rgba(245,166,35,0.4), 0 8px 24px rgba(0,0,0,0.5); }
    50%      { box-shadow: 0 0 0 14px rgba(245,166,35,0.10), 0 0 48px 14px rgba(245,166,35,0.55), 0 8px 24px rgba(0,0,0,0.5); }
  }
  .reel-card:hover .play-icon { animation: playPulse 1.6s ease-in-out infinite; transform: scale(1.12); }

  /* SEE ALL card — fills the same slot as a reel-card, no thumb, gold lockup */
  .reel-card--see-all {
    position: relative;
    aspect-ratio: 16 / 9;
    background: linear-gradient(160deg, var(--bg-card) 0%, rgba(245,166,35,0.10) 100%);
    border: 1px dashed var(--border-gold);
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    border-radius: var(--r-lg);
    overflow: hidden;
    scroll-snap-align: start;
    will-change: transform;
    transition:
      transform 360ms cubic-bezier(0.2, 0.9, 0.2, 1),
      border-color 240ms var(--ease-standard),
      box-shadow 360ms var(--ease-standard),
      background 360ms var(--ease-standard);
  }
  .reel-card--see-all:hover, .reel-card--see-all:focus-visible {
    transform: translateY(-12px) scale(1.025);
    border-color: var(--accent-gold);
    border-style: solid;
    background: linear-gradient(160deg, var(--bg-card) 0%, rgba(245,166,35,0.18) 100%);
    box-shadow:
      0 36px 80px rgba(0,0,0,0.6),
      0 0 0 1px rgba(245,166,35,0.4),
      0 0 80px -10px rgba(245,166,35,0.5);
    outline: none;
  }
  .reel-card--see-all .lockup {
    text-align: center;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 14px;
  }
  .reel-card--see-all .arrow-disc {
    width: 64px; height: 64px;
    border-radius: 50%;
    background: var(--accent-gold);
    display: inline-flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 0 0 8px rgba(245,166,35,0.18), 0 8px 24px rgba(0,0,0,0.5);
    transition: transform var(--dur-micro) var(--ease-standard);
  }
  .reel-card--see-all:hover .arrow-disc { transform: scale(1.12); }
  .reel-card--see-all .arrow-disc svg {
    width: 26px; height: 26px;
    stroke: #0B0E1A;
    fill: none;
    stroke-width: 2.5;
  }
  .reel-card--see-all .label {
    font-family: var(--font-display);
    font-weight: 900;
    font-size: 22px;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: var(--accent-gold);
    line-height: 1;
  }
  .reel-card--see-all .count {
    font-family: var(--font-mono);
    font-size: 12px;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: var(--fg-muted);
  }
  @media (min-width: 1024px) {
    .reel-card--see-all .label { font-size: 26px; }
    .reel-card--see-all .arrow-disc { width: 76px; height: 76px; }
    .reel-card--see-all .arrow-disc svg { width: 30px; height: 30px; }
  }
  .reel-card__thumb-wrap {
    position: relative;
    aspect-ratio: 16 / 9;
    background: var(--bg-elevated);
    overflow: hidden;
  }
  .reel-card__thumb {
    position: absolute;
    inset: 0;
    background-size: cover;
    background-position: center;
  }
  /* Subtle grid texture overlay (matches reference) */
  .reel-card__thumb::before {
    content: '';
    position: absolute;
    inset: 0;
    background-image:
      linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px),
      linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px);
    background-size: 32px 32px;
    pointer-events: none;
  }
  .reel-card__thumb::after {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(180deg, rgba(11,14,26,0.05) 60%, rgba(11,14,26,0.55) 100%);
  }
  .reel-card__meta {
    padding: 16px 18px 0;
    text-align: left;
    background: var(--bg-card);
  }
  .reel-card__title {
    font-family: var(--font-body);
    font-weight: 700;
    text-transform: none;
    font-size: 14px;
    line-height: 1.25;
    margin: 0 0 6px;
    color: var(--fg-primary);
    letter-spacing: 0;
  }
  .reel-card__sub {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    font-family: var(--font-mono);
    font-size: 11px;
    letter-spacing: 0.08em;
    color: var(--fg-muted);
    text-transform: uppercase;
  }
  .reel-card__sub .dots {
    display: inline-flex; gap: 5px;
  }
  .reel-card__sub .dots i {
    width: 6px; height: 6px; border-radius: 50%;
    background: var(--fg-disabled);
    display: inline-block;
  }
  .reel-card__sub .dots i.gold { background: var(--accent-gold); }
  .reel-card__sub .dots i.blue { background: var(--accent-blue); }

  /* BADGES — pill with color-tinted border + icon, dark glass background.
     Each variant sets --badge-color used by border, text, and icon. */
  .badge {
    position: absolute;
    top: 12px;
    left: 12px;
    z-index: 2;
    padding: 5px 10px 5px 8px;
    border-radius: 9999px;
    font-family: var(--font-mono);
    font-weight: 700;
    font-size: 10px;
    letter-spacing: 0.16em;
    text-transform: uppercase;
    line-height: 1;
    display: inline-flex;
    align-items: center;
    gap: 5px;
    background: rgba(11,14,26,0.72);
    backdrop-filter: blur(6px);
    -webkit-backdrop-filter: blur(6px);
    border: 1px solid var(--badge-color, var(--fg-muted));
    color: var(--badge-color, var(--fg-muted));
  }
  .badge::before {
    font-size: 10px;
    line-height: 1;
    color: var(--badge-color, var(--fg-muted));
  }
  /* Source-coded provenance */
  .badge--cal       { --badge-color: var(--accent-gold); }
  .badge--cal::before      { content: '★'; }
  .badge--nfl       { --badge-color: var(--accent-blue); }
  .badge--nfl::before      { content: '▲'; font-size: 8px; }
  .badge--athlete   { --badge-color: var(--success); }
  .badge--athlete::before  { content: '✓'; font-weight: 900; }
  .badge--personal  { --badge-color: var(--fg-muted); }
  .badge--personal::before { content: none; }   /* no icon, like PENDING */
  /* Status */
  .badge--earned    { --badge-color: var(--accent-gold); padding-left: 10px; }
  .badge--earned::before   { content: '$'; font-weight: 900; font-size: 11px; }
  .badge--rising    { --badge-color: var(--accent-blue); }
  .badge--rising::before   { content: '▲'; font-size: 8px; }
  .badge--verified  { --badge-color: var(--success); }
  .badge--verified::before { content: '✓'; font-weight: 900; }
  .badge--flagged   { --badge-color: var(--error); }
  .badge--flagged::before  { content: '⚑'; font-size: 11px; }

  /* DURATION pill bottom-right of thumb */
  .duration {
    position: absolute;
    bottom: 12px;
    right: 12px;
    z-index: 2;
    padding: 4px 8px;
    border-radius: var(--r-sm);
    background: rgba(11,14,26,0.85);
    color: var(--fg-primary);
    font-family: var(--font-mono);
    font-size: 11px;
    font-weight: 500;
    letter-spacing: 0.04em;
    line-height: 1;
    backdrop-filter: blur(6px);
  }

  /* GOLD PLAY BUTTON with glow */
  .play-icon {
    position: absolute;
    top: 50%;
    left: 50%;
    width: 36px; height: 36px;
    margin: -18px 0 0 -18px;
    border-radius: 50%;
    background: var(--accent-gold);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 2;
    box-shadow:
      0 0 0 8px rgba(245,166,35,0.18),
      0 0 32px 6px rgba(245,166,35,0.35),
      0 8px 24px rgba(0,0,0,0.5);
    transition: transform var(--dur-micro) var(--ease-standard), box-shadow var(--dur-micro) var(--ease-standard);
  }
  .reel-card:hover .play-icon {
    transform: scale(1.08);
    box-shadow:
      0 0 0 10px rgba(245,166,35,0.22),
      0 0 40px 10px rgba(245,166,35,0.5),
      0 8px 24px rgba(0,0,0,0.5);
  }
  .play-icon::after {
    content: '';
    width: 0; height: 0;
    border-left: 9px solid #0B0E1A;
    border-top: 6px solid transparent;
    border-bottom: 6px solid transparent;
    margin-left: 2px;
  }

  /* BELIEVERS */
  .believers__count-block {
    margin-bottom: 20px;
  }
  .believers__count {
    font-family: var(--font-display);
    font-weight: 900;
    color: var(--accent-gold);
    font-size: clamp(96px, 14vw, 184px);
    line-height: 0.85;
    margin: 0 0 8px;
    letter-spacing: -0.02em;
    text-shadow: 0 8px 40px rgba(245,166,35,0.18);
  }
  .believers__count-label {
    font-family: var(--font-mono);
    font-size: 12px;
    letter-spacing: 0.16em;
    text-transform: uppercase;
    color: var(--fg-muted);
  }
  .believers__grid {
    list-style: none;
    margin: 0 auto;
    padding: 30px 0 0;       /* room above row 1 for the floating avatar */
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 50px 16px;          /* 50px row gap so avatars don't crash into row above */
    max-width: 980px;
  }
  .believer-card {
    position: relative;
    background: var(--bg-card);
    border: 1px solid var(--border-subtle);
    border-radius: var(--r-lg);
    padding: 40px 16px 18px;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    transition: transform var(--dur-micro) var(--ease-standard), border-color var(--dur-micro) var(--ease-standard);
  }
  .believer-card:hover { transform: translateY(-2px); border-color: var(--border-gold); }
  /* Floating headshot — overflows the card by 5px on top */
  .believer-card > .avatar {
    position: absolute;
    top: -30px;
    left: 50%;
    transform: translateX(-50%);
    width: 56px;
    height: 56px;
    border-width: 0.5px;
    font-size: 16px;
    box-shadow: 0 8px 20px rgba(0,0,0,0.5), 0 0 0 4px var(--bg-base);
  }
  .believer-card__name {
    font-family: var(--font-display);
    font-weight: 700;
    font-size: 14px;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: var(--fg-primary);
    text-align: center;
    line-height: 1.2;
  }
  .believer-card__jersey {
    font-family: var(--font-mono);
    font-size: 11px;
    letter-spacing: 0.12em;
    color: var(--accent-gold);
  }

  /* CLAIM CTA */
  .claim-cta {
    padding: 40px;
    text-align: center;
    border-top: 1px solid var(--border-subtle);
    background:
      radial-gradient(ellipse at 50% 0%, var(--accent-gold-dim) 0%, transparent 50%);
  }
  .claim-cta h2 {
    font-family: var(--font-display);
    font-weight: 900;
    color: var(--accent-gold);
    text-transform: uppercase;
    font-size: clamp(40px, 7vw, 88px);
    line-height: 1;
    margin: 0 0 16px;
    letter-spacing: -0.005em;
  }
  .claim-cta p {
    font-family: var(--font-body);
    color: var(--fg-muted);
    font-size: 17px;
    margin: 0 auto 32px;
    max-width: 540px;
  }

  /* FOOTER */
  footer.foot {
    border-top: 1px solid var(--border-subtle);
    padding: 48px 32px;
    text-align: center;
  }
  .foot__brand {
    font-family: var(--font-display);
    font-weight: 900;
    color: var(--accent-gold);
    font-size: 28px;
    letter-spacing: 0.06em;
    margin: 0 0 8px;
  }
  .foot__tag {
    font-family: var(--font-mono);
    font-size: 11px;
    color: var(--fg-muted);
    letter-spacing: 0.12em;
    text-transform: uppercase;
  }

  /* VIDEO MODAL — full-screen overlay with sort tabs + 2x2 grid */
  .modal {
    position: fixed;
    inset: 0;
    z-index: 100;
    background: rgba(11,14,26,0.92);
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
    display: none;
    align-items: flex-start;
    justify-content: center;
    padding: 64px 32px;
    overflow-y: auto;
    text-align: left;
  }
  .modal.is-open { display: flex; }
  .modal__inner {
    width: 100%;
    max-width: 1100px;
    margin: 0 auto;
  }
  .modal__head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    margin-bottom: 32px;
  }
  .modal__title {
    font-family: var(--font-display);
    font-weight: 900;
    text-transform: uppercase;
    font-size: 40px;
    color: var(--accent-gold);
    margin: 0;
    line-height: 1;
  }
  .modal__close {
    width: 44px; height: 44px;
    border-radius: 50%;
    border: 1px solid var(--border-strong);
    background: var(--bg-card);
    color: var(--fg-primary);
    cursor: pointer;
    font-family: var(--font-mono);
    font-size: 20px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
  }
  .modal__close:hover { border-color: var(--border-gold); color: var(--accent-gold); }
  .sort-tabs {
    display: flex;
    gap: 4px;
    margin-bottom: 32px;
    background: var(--bg-card);
    padding: 4px;
    border-radius: var(--r-md);
    border: 1px solid var(--border-subtle);
    width: fit-content;
  }
  .sort-tab {
    font-family: var(--font-display);
    font-weight: 700;
    font-size: 13px;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    background: transparent;
    border: 0;
    color: var(--fg-muted);
    padding: 10px 18px;
    border-radius: var(--r-sm);
    cursor: pointer;
    transition: background var(--dur-micro) var(--ease-standard), color var(--dur-micro) var(--ease-standard);
    min-height: 36px;
  }
  .sort-tab:hover { color: var(--fg-primary); }
  .sort-tab.is-active { background: var(--accent-gold); color: #0B0E1A; }
  .modal-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 20px;
  }
  .modal-grid .reel-card { aspect-ratio: 16 / 9; }
  .modal-grid .reel-card[data-tier="hidden"] { display: none; }

  /* VIEW MODE — claim vs live (fan) view. Defaults to claim. */
  body[data-mode="live"] .claim-only { display: none !important; }

  /* CAREER LEVEL — hs | college | pro. Higher levels reveal more sections.
     hs    = high school only (no college, no pro)
     college = college + hs (no pro)
     pro   = everything (default)
  */
  body[data-level="hs"]      .college-only,
  body[data-level="hs"]      .pro-only,
  body[data-level="college"] .pro-only { display: none !important; }

  /* SHARE MODAL — social targets + copy link */
  .share-modal__inner { max-width: 480px; }
  .share-modal__close-row {
    display: flex;
    justify-content: flex-end;
    margin-bottom: 12px;
  }
  .share-modal__title {
    font-family: var(--font-display);
    font-weight: 900;
    text-transform: uppercase;
    font-size: 28px;
    letter-spacing: 0.02em;
    text-align: center;
    color: var(--accent-gold);
    margin: 0 0 24px;
    line-height: 1;
  }
  .share-url-row {
    display: flex;
    align-items: stretch;
    gap: 8px;
    background: var(--bg-elevated);
    border: 1px solid var(--border-subtle);
    border-radius: var(--r-md);
    padding: 6px 6px 6px 14px;
    margin-bottom: 28px;
  }
  .share-url-row__url {
    flex: 1;
    font-family: var(--font-mono);
    font-size: 12px;
    color: var(--accent-gold);
    background: transparent;
    border: 0;
    outline: none;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .share-url-row__copy {
    font-family: var(--font-display);
    font-weight: 700;
    text-transform: uppercase;
    font-size: 12px;
    letter-spacing: 0.08em;
    background: var(--accent-gold);
    color: #0B0E1A;
    border: 0;
    border-radius: var(--r-sm);
    padding: 0 16px;
    cursor: pointer;
    min-height: 36px;
    transition: background var(--dur-micro) var(--ease-standard);
  }
  .share-url-row__copy:hover { background: #D88F1A; }

  .share-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 12px;
  }
  .share-target {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: 16px 8px;
    background: var(--bg-elevated);
    border: 1px solid var(--border-subtle);
    border-radius: var(--r-md);
    text-decoration: none;
    color: var(--fg-primary);
    font-family: var(--font-mono);
    font-weight: 500;
    font-size: 11px;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    cursor: pointer;
    transition:
      background var(--dur-micro) var(--ease-standard),
      border-color var(--dur-micro) var(--ease-standard),
      transform var(--dur-micro) var(--ease-standard);
  }
  .share-target:hover {
    background: var(--bg-hover);
    border-color: var(--border-gold);
    transform: translateY(-2px);
    text-decoration: none;
  }
  .share-target:focus-visible { outline: 2px solid var(--accent-gold); outline-offset: 2px; }
  .share-target svg {
    width: 24px; height: 24px;
    fill: currentColor;
  }
  /* Per-platform brand colors on hover */
  .share-target--x:hover       { color: #ffffff; border-color: #ffffff; }
  .share-target--facebook:hover{ color: #1877F2; border-color: #1877F2; }
  .share-target--linkedin:hover{ color: #0A66C2; border-color: #0A66C2; }
  .share-target--reddit:hover  { color: #FF4500; border-color: #FF4500; }
  .share-target--whatsapp:hover{ color: #25D366; border-color: #25D366; }
  .share-target--email:hover   { color: var(--accent-gold); border-color: var(--accent-gold); }
  .share-target--sms:hover     { color: var(--success); border-color: var(--success); }
  .share-target--native:hover  { color: var(--accent-gold); border-color: var(--accent-gold); }

  @media (max-width: 480px) {
    .share-grid { gap: 8px; }
    .share-target { padding: 14px 6px; font-size: 10px; }
  }

  /* QR CODE — modal canvas + small action button */
  .qr-modal__inner { max-width: 420px; }
  .qr-canvas-wrap {
    background: #fff;
    border-radius: var(--r-lg);
    padding: 24px;
    margin: 0 auto 20px;
    width: fit-content;
    box-shadow: 0 24px 60px rgba(0,0,0,0.5);
  }
  .qr-canvas-wrap canvas, .qr-canvas-wrap img {
    display: block;
    width: 240px !important;
    height: 240px !important;
  }
  .qr-url {
    text-align: center;
    font-family: var(--font-mono);
    font-size: 11px;
    letter-spacing: 0.08em;
    color: var(--accent-gold);
    word-break: break-all;
    margin: 0 0 18px;
  }
  .qr-actions {
    display: flex;
    gap: 10px;
    justify-content: center;
  }
  .qr-actions button {
    font-family: var(--font-display);
    font-weight: 700;
    text-transform: uppercase;
    font-size: 12px;
    letter-spacing: 0.08em;
    padding: 12px 20px;
    border-radius: var(--r-md);
    border: 1px solid var(--border-gold);
    background: transparent;
    color: var(--accent-gold);
    cursor: pointer;
    min-height: 44px;
    transition: background var(--dur-micro) var(--ease-standard);
  }
  .qr-actions button:hover { background: var(--accent-gold-dim); }
  .qr-actions button.solid { background: var(--accent-gold); color: #0B0E1A; border-color: var(--accent-gold); }
  .qr-actions button.solid:hover { background: #D88F1A; }

  /* QR icon button — square ghost variant */
  .btn-icon {
    width: 48px;
    height: 48px;
    padding: 0;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    background: transparent;
    color: var(--accent-gold);
    border: 1px solid var(--border-gold);
    border-radius: var(--r-md);
    cursor: pointer;
    transition: background var(--dur-micro) var(--ease-standard);
  }
  .btn-icon:hover { background: var(--accent-gold-dim); }
  .btn-icon:focus-visible { outline: 2px solid var(--accent-gold); outline-offset: 2px; }
  .btn-icon svg { width: 22px; height: 22px; stroke: currentColor; fill: none; stroke-width: 1.8; }

  /* STATS MODAL — career breakdown by season + totals */
  .stats-modal__lockup {
    display: flex;
    align-items: center;
    gap: 14px;
  }
  .stats-modal__lockup .avatar {
    width: 44px; height: 44px;
    border-width: 2px;
    font-size: 16px;
  }
  .stats-modal__sub {
    font-family: var(--font-mono);
    font-size: 11px;
    letter-spacing: 0.16em;
    text-transform: uppercase;
    color: var(--fg-muted);
    margin: 4px 0 0;
  }
  .stats-section {
    margin-bottom: 40px;
  }
  .stats-section__head {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 16px;
    padding-bottom: 12px;
    margin-bottom: 16px;
    border-bottom: 1px solid var(--border-subtle);
  }
  .stats-section__title {
    font-family: var(--font-display);
    font-weight: 900;
    font-size: 22px;
    text-transform: uppercase;
    color: var(--fg-primary);
    margin: 0;
    letter-spacing: 0.02em;
  }
  .stats-section__meta {
    font-family: var(--font-mono);
    font-size: 11px;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: var(--accent-gold);
  }
  .stats-hero {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 0;
    margin-bottom: 18px;
    border: 1px solid var(--border-subtle);
    border-radius: var(--r-lg);
    overflow: hidden;
  }
  .stats-hero__cell {
    padding: 18px 16px;
    border-right: 1px solid var(--border-subtle);
    text-align: center;
  }
  .stats-hero__cell:last-child { border-right: 0; }
  .stats-hero__num {
    font-family: var(--font-display);
    font-weight: 900;
    color: var(--accent-gold);
    font-size: 32px;
    line-height: 0.95;
    margin: 0 0 6px;
    letter-spacing: -0.01em;
  }
  .stats-hero__label {
    font-family: var(--font-mono);
    font-size: 10px;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: var(--fg-muted);
    margin: 0;
  }
  .stats-table {
    width: 100%;
    border-collapse: collapse;
    font-family: var(--font-mono);
    font-size: 12px;
  }
  .stats-table th {
    text-align: left;
    padding: 10px 10px;
    font-weight: 500;
    font-size: 10px;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: var(--fg-muted);
    border-bottom: 1px solid var(--border-strong);
  }
  .stats-table th.num { text-align: right; }
  .stats-table td {
    padding: 12px 10px;
    border-bottom: 1px solid var(--border-subtle);
    color: var(--fg-primary);
  }
  .stats-table td.num { text-align: right; font-weight: 700; }
  .stats-table tbody tr:hover { background: rgba(255,255,255,0.02); }
  .stats-table tr.is-peak td { color: var(--accent-gold); }
  .stats-table tr.is-totals td {
    border-bottom: 0;
    border-top: 2px solid var(--accent-gold);
    padding-top: 14px;
    color: var(--accent-gold);
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    font-size: 11px;
  }
  .stats-table tr.is-totals td.num { font-size: 13px; }
  .stats-table .year { font-weight: 700; color: var(--fg-primary); }
  .stats-table tr.is-peak .year::after { content: ' ★'; color: var(--accent-gold); }

  @media (max-width: 767px) {
    .stats-hero { grid-template-columns: repeat(2, 1fr); }
    .stats-hero__cell { border-right: 0; border-bottom: 1px solid var(--border-subtle); padding: 14px 12px; }
    .stats-hero__num { font-size: 26px; }
    .stats-table { font-size: 11px; }
    .stats-table th, .stats-table td { padding: 10px 6px; }
    .stats-table .opt { display: none; }
  }

  /* PRESS GRID — 3 columns of floating-image cards */
  .press-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 56px 56px;
    padding: 16px 0;
    text-align: left;
  }
  .press-card {
    position: relative;
    background:
      radial-gradient(ellipse at 50% 0%, rgba(245,166,35,0.18) 0%, transparent 55%),
      var(--bg-card);
    border: 1px solid var(--border-gold);
    border-radius: var(--r-lg);
    padding: 24px 24px 22px calc(40% + 12px);
    min-height: 260px;
    display: flex;
    flex-direction: column;
    gap: 10px;
    color: var(--fg-primary);
    text-decoration: none;
    overflow: visible;
    transition:
      transform 360ms cubic-bezier(0.2, 0.9, 0.2, 1),
      border-color 240ms var(--ease-standard),
      box-shadow 360ms var(--ease-standard);
  }
  .press-card:hover {
    transform: translateY(-4px);
    border-color: var(--accent-gold);
    box-shadow:
      0 24px 60px rgba(0,0,0,0.5),
      0 0 0 1px rgba(245,166,35,0.35),
      0 0 60px -10px rgba(245,166,35,0.4);
    text-decoration: none;
  }
  .press-card__image {
    position: absolute;
    left: -6px;
    top: 24px;
    bottom: 24px;
    width: 40%;
    background: var(--bg-elevated);
    background-size: cover;
    background-position: center;
    border-radius: var(--r-md);
    box-shadow: 0 18px 36px rgba(0,0,0,0.45);
    border: 0;
  }
  .press-card__author {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 4px;
  }
  .press-card__avatar {
    width: 30px; height: 30px;
    border-radius: 50%;
    background: var(--accent-gold);
    display: inline-flex;
    align-items: center;
    justify-content: center;
    font-family: var(--font-display);
    font-weight: 900;
    color: #0B0E1A;
    font-size: 11px;
    flex-shrink: 0;
    border: 2px solid rgba(255,255,255,0.85);
  }
  .press-card__author-name {
    font-family: var(--font-body);
    font-weight: 500;
    font-size: 13px;
    color: var(--fg-primary);
    line-height: 1;
  }
  .press-card__author-name small {
    display: block;
    font-family: var(--font-mono);
    font-size: 9px;
    letter-spacing: 0.16em;
    text-transform: uppercase;
    color: var(--accent-gold);
    margin-top: 4px;
    font-weight: 400;
  }
  .press-card__title {
    font-family: var(--font-display);
    font-weight: 900;
    text-transform: uppercase;
    font-size: 18px;
    line-height: 1.1;
    margin: 4px 0 6px;
    color: var(--fg-primary);
    /* clamp 3 lines */
    display: -webkit-box;
    -webkit-line-clamp: 3;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
  .press-card__meta {
    display: flex;
    align-items: center;
    gap: 12px;
    font-family: var(--font-mono);
    font-size: 10px;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: var(--accent-gold);
    margin-bottom: 8px;
  }
  .press-card__meta .claps {
    display: inline-flex;
    align-items: center;
    gap: 4px;
  }
  .press-card__excerpt {
    font-family: var(--font-body);
    font-size: 13px;
    line-height: 1.5;
    color: var(--fg-muted);
    margin: 0;
    /* clamp 3 lines */
    display: -webkit-box;
    -webkit-line-clamp: 3;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
  .press-card__more {
    font-family: var(--font-display);
    font-weight: 700;
    color: var(--accent-gold);
    text-transform: uppercase;
    font-size: 12px;
    letter-spacing: 0.06em;
    white-space: nowrap;
    margin-left: 4px;
  }
  @media (max-width: 640px) {
    .press-grid { grid-template-columns: 1fr; gap: 24px; }
    .press-section { padding-top: 30px; }
  }

  /* PHOTOS BAND — full-width strip, capped height, scrollable masonry */
  .photos-band {
    position: relative;
    max-height: 600px;
    overflow: hidden;
    isolation: isolate;
    margin: 0;
    padding: 30px 50px 0;
  }
  @media (max-width: 767px) {
    .photos-band { padding: 30px 20px 0; }
  }
  .photos-band::after {
    content: '';
    position: absolute;
    inset: auto 0 0 0;
    height: 80px;
    background: linear-gradient(180deg, transparent, var(--bg-base));
    pointer-events: none;
    z-index: 2;
  }
  .photos-masonry {
    column-count: 4;
    column-gap: 12px;
  }
  .photos-masonry .photo {
    display: block;
    position: relative;
    width: 100%;
    margin: 0 0 12px;
    border-radius: var(--r-lg);
    overflow: hidden;
    break-inside: avoid;
    background: var(--bg-elevated);
    cursor: pointer;
    will-change: transform;
    transition:
      transform 420ms cubic-bezier(0.2, 0.9, 0.2, 1),
      box-shadow 420ms cubic-bezier(0.2, 0.9, 0.2, 1);
  }
  .photos-masonry .photo:hover {
    transform: translateY(-16px) scale(1.02);
    z-index: 5;
    box-shadow:
      0 36px 70px rgba(0,0,0,0.6),
      0 0 0 1px rgba(245,166,35,0.4),
      0 0 60px -10px rgba(245,166,35,0.4);
  }
  .photos-masonry .photo img {
    display: block;
    width: 100%;
    height: auto;
    will-change: transform;
    /* Default transition (used when entering/leaving) */
    transition: transform 700ms cubic-bezier(0.2, 0.9, 0.2, 1);
    transform: scale(1);
  }
  .photos-masonry .photo:hover img {
    transform: scale(1.22);
  }
  /* While tracking the mouse, use a faster, finer transition for live following */
  .photos-masonry .photo.is-tracking img {
    transition: transform 180ms cubic-bezier(0.2, 0.9, 0.2, 1);
  }
  @media (prefers-reduced-motion: reduce) {
    .photos-masonry .photo, .photos-masonry .photo img { transition: none; }
    .photos-masonry .photo:hover { transform: none; }
    .photos-masonry .photo:hover img { transform: none; }
  }
  @media (max-width: 1023px) {
    .photos-masonry { column-count: 3; }
  }
  @media (max-width: 600px) {
    .photos-masonry { column-count: 2; column-gap: 8px; }
    .photos-masonry .photo { margin-bottom: 8px; }
  }

  /* ARTICLES LIST — vertical, thumbnail + meta */
  .articles {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 12px;
  }
  .article {
    display: grid;
    grid-template-columns: 96px 1fr;
    gap: 14px;
    padding: 12px;
    background: var(--bg-card);
    border: 1px solid var(--border-subtle);
    border-radius: var(--r-lg);
    text-decoration: none;
    color: inherit;
    transition: border-color var(--dur-micro) var(--ease-standard), transform var(--dur-micro) var(--ease-standard);
  }
  .article:hover { border-color: var(--border-gold); transform: translateY(-1px); text-decoration: none; }
  .article__thumb {
    width: 96px;
    height: 64px;
    border-radius: var(--r-md);
    background-size: cover;
    background-position: center;
    background-color: var(--bg-elevated);
  }
  .article__meta { display: flex; flex-direction: column; gap: 6px; min-width: 0; }
  .article__title {
    font-family: var(--font-body);
    font-weight: 500;
    font-size: 15px;
    line-height: 1.3;
    color: var(--fg-primary);
    margin: 0;
    /* clamp 2 lines */
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
  .article__sub {
    font-family: var(--font-mono);
    font-size: 11px;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: var(--fg-muted);
  }
  .article__sub .outlet { color: var(--accent-gold); }

  /* NFL CAREER — mobile-first trading card. HOF banner, 3 stats, tight honors. */
  .nfl-card {
    background:
      radial-gradient(ellipse at 50% 0%, rgba(245,166,35,0.18) 0%, transparent 55%),
      var(--bg-card);
    border: 1px solid var(--border-gold);
    border-radius: var(--r-lg);
    overflow: hidden;
    text-align: center;
    position: relative;
  }
  /* HOF banner — top strip, gold, instantly readable */
  .nfl-banner {
    background: var(--accent-gold);
    color: #0B0E1A;
    padding: 12px 16px;
    font-family: var(--font-display);
    font-weight: 900;
    text-transform: uppercase;
    font-size: 14px;
    letter-spacing: 0.16em;
    line-height: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
  }
  .nfl-banner__star {
    font-size: 14px;
    line-height: 1;
  }
  .nfl-card__body {
    padding: 20px;
  }
  .nfl-card__title {
    font-family: var(--font-display);
    font-weight: 900;
    text-transform: uppercase;
    font-size: 30px;
    margin: 0 0 6px;
    line-height: 1;
    color: var(--fg-primary);
  }
  .nfl-card__years {
    font-family: var(--font-mono);
    font-size: 12px;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: var(--accent-gold);
    margin: 0 0 32px;
  }
  /* 3 hero stats — equal columns desktop, stacked rows on mobile */
  .nfl-stats {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 0;
    border-top: 1px solid var(--border-subtle);
    border-bottom: 1px solid var(--border-subtle);
    margin: 0 -24px 28px;
  }
  .nfl-stat {
    padding: 24px 12px;
    border-right: 1px solid var(--border-subtle);
  }
  .nfl-stat:last-child { border-right: 0; }
  .nfl-stat__num {
    font-family: var(--font-display);
    font-weight: 900;
    color: var(--accent-gold);
    font-size: 60px;
    line-height: 0.9;
    letter-spacing: -0.02em;
    margin: 0 0 8px;
  }
  .nfl-stat__label {
    font-family: var(--font-mono);
    font-size: 10px;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: var(--fg-muted);
    margin: 0;
    line-height: 1.3;
  }
  /* Honors — single inline line, comma-separated, no chips */
  .nfl-honors {
    font-family: var(--font-mono);
    font-size: 11px;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: var(--fg-muted);
    line-height: 1.7;
    margin: 0;
    max-width: 480px;
    margin-left: auto;
    margin-right: auto;
  }
  .nfl-honors b {
    color: var(--accent-gold);
    font-weight: 500;
  }

  @media (max-width: 767px) {
    .nfl-card { border-radius: var(--r-lg); }
    .nfl-banner { font-size: 12px; padding: 10px 14px; letter-spacing: 0.14em; }
    .nfl-card__body { padding: 0; }
    .nfl-card__title { font-size: 24px; }
    .nfl-card__years { margin-bottom: 22px; font-size: 11px; }
    .nfl-stats {
      grid-template-columns: 1fr;
      margin: 0 -18px 22px;
    }
    .nfl-stat {
      padding: 18px 14px;
      border-right: 0;
      border-bottom: 1px solid var(--border-subtle);
      text-align: center;
    }
    .nfl-stat:last-child { border-bottom: 0; }
    .nfl-stat__num { font-size: 60px; margin: 0 0 6px; }
    .nfl-stat__label { text-align: center; max-width: none; }
  }

  /* REVEAL ANIMATIONS */
  .reveal { opacity: 0; transform: translateY(12px); }
  .reveal.in {
    opacity: 1; transform: none;
    transition: opacity 700ms var(--ease-standard), transform 700ms var(--ease-standard);
  }
  .reveal.in.delay-1 { transition-delay: 150ms; }
  .reveal.in.delay-2 { transition-delay: 300ms; }
  .reveal.in.delay-3 { transition-delay: 450ms; }
  .reveal.in.delay-4 { transition-delay: 600ms; }

  /* Scroll-reveal for sections */
  .scroll-reveal {
    opacity: 0;
    transform: translateY(24px);
    transition: opacity 800ms var(--ease-standard), transform 800ms var(--ease-standard);
  }
  .scroll-reveal.in { opacity: 1; transform: none; }

  /* LOCKER-OPEN stagger — videos + photos slide+scale in when first revealed */
  .locker-stagger > * {
    opacity: 0;
    transform: translateY(20px) scale(0.96);
    transition:
      opacity 700ms cubic-bezier(0.2, 0.9, 0.2, 1),
      transform 700ms cubic-bezier(0.2, 0.9, 0.2, 1);
  }
  .locker-stagger.in > * { opacity: 1; transform: none; }
  /* per-child cascade — each card 80ms after the previous */
  .locker-stagger.in > *:nth-child(1) { transition-delay:   0ms; }
  .locker-stagger.in > *:nth-child(2) { transition-delay:  80ms; }
  .locker-stagger.in > *:nth-child(3) { transition-delay: 160ms; }
  .locker-stagger.in > *:nth-child(4) { transition-delay: 240ms; }
  .locker-stagger.in > *:nth-child(5) { transition-delay: 320ms; }
  .locker-stagger.in > *:nth-child(6) { transition-delay: 400ms; }
  .locker-stagger.in > *:nth-child(7) { transition-delay: 480ms; }
  .locker-stagger.in > *:nth-child(8) { transition-delay: 560ms; }

  /* Variant: slide in from the LEFT instead of bottom */
  .locker-stagger--left > * {
    transform: translateX(-32px) scale(0.97);
  }
  .locker-stagger--left.in > * { transform: none; }

  /* FEATURE IMAGE — pure opacity fade-in (no slide) */
  .image-fade {
    opacity: 0;
    transition: opacity 1100ms cubic-bezier(0.2, 0.9, 0.2, 1) 200ms;
  }
  .image-fade.in { opacity: 1; }
  @media (prefers-reduced-motion: reduce) {
    .image-fade { opacity: 1; transition: none; }
  }

  @media (prefers-reduced-motion: reduce) {
    .reveal, .scroll-reveal, .locker-stagger > * { opacity: 1; transform: none; transition: none; }
    .hero__bg { transform: none !important; }
    .card, .reel-card, .believer-card { transition: none; animation: none; }
    .card:hover, .reel-card:hover, .believer-card:hover { transform: none; }
    .reel-card:hover .reel-card__thumb { transform: none; }
    .reel-card:hover .play-icon { animation: none; }
    html { scroll-behavior: auto; }
  }

  /* RESPONSIVE */
  @media (max-width: 1023px) {
    section.zone { padding: 96px 0; }
    .career-feature { min-height: 480px; flex-direction: column; }
    .career-feature__stats { width: 100%; order: 2; }
    .career-feature__image {
      position: relative;
      width: auto;
      right: auto;
      min-height: 320px;
      order: 1;
      margin: 0 calc(50% - 50vw) 32px;
      align-self: stretch;
    }
    .career-feature__image::after {
      background:
        linear-gradient(180deg, var(--bg-base) 0%, rgba(11,14,26,0.55) 8%, transparent 28%),
        linear-gradient(0deg,   var(--bg-base) 0%, rgba(11,14,26,0.85) 18%, transparent 55%),
        linear-gradient(90deg,  var(--bg-base) 0%, transparent 12%),
        linear-gradient(270deg, var(--bg-base) 0%, transparent 12%);
    }
    .timeline { grid-template-columns: repeat(2, 1fr); }
    .reel { grid-auto-columns: calc((100% - 36px) / 2.5); gap: 18px; }   /* 2.5 visible at tablet */
    .believers__grid { grid-template-columns: repeat(3, 1fr); gap: 50px 12px; }
    .media-row { grid-template-columns: 1fr; gap: 56px; }
    .nfl-grid { grid-template-columns: repeat(2, 1fr); gap: 28px; }
    .modal-grid { grid-template-columns: 1fr; }
  }

  @media (max-width: 767px) {
    .container, .topbar { padding-left: 20px; padding-right: 20px; }
    .topbar { padding-top: 12px; padding-bottom: 12px; }
    .topbar__athlete-name { display: none; }
    .hero { height: 280px; }
    .profile { margin-top: -70px; padding: 0 20px 40px; }
    .profile__sub { font-size: 12px; }
    .profile__sub .dot { margin: 0 6px; }
    .profile__tagline { font-size: 15px; }
    section.zone { padding: 72px 0; }
    .timeline { grid-template-columns: repeat(2, 1fr); gap: 12px; }
    .career-feature {
      min-height: 0;                     /* shrink to content on mobile */
      padding-top: 24px;
      padding-bottom: 24px;
    }
    .career-feature__header { order: 1; margin-bottom: 0; }
    .career-feature__body {
      display: contents;                 /* let image + stats become direct children for ordering */
    }
    .career-feature__image {
      position: relative;
      inset: auto;
      width: auto;
      right: auto;
      height: 280px;
      order: 2;
      margin: 24px calc(50% - 50vw) 0;     /* full-bleed banner, no bottom margin (stats overlap) */
      align-self: stretch;
    }
    .career-feature__image::after {
      background:
        linear-gradient(180deg, var(--bg-base) 0%, transparent 35%),
        linear-gradient(0deg,   var(--bg-base) 0%, rgba(11,14,26,0.65) 30%, transparent 70%);
    }
    .career-feature__stats {
      width: 100%;
      order: 3;
      margin-top: -140px;                  /* pull up to overlap bottom 50% of 280px image */
      position: relative;
      z-index: 3;
    }
    .career-feature__headline { font-size: 36px; }
    .career-feature__pull { font-size: 14px; }
    .stat-card { padding: 12px 8px; gap: 3px; }
    .stat-card__num { font-size: clamp(24px, 7vw, 32px); }
    .reel { grid-auto-columns: 62%; gap: 12px; padding: 8px 0 16px; margin: -8px 0 -16px; }
    .reel-card:hover { transform: none; box-shadow: 0 12px 28px rgba(0,0,0,0.5); }
    .reel-card:hover .reel-card__thumb { transform: none; }
    .reel-card:hover .play-icon { animation: none; }
    .photos-masonry { column-count: 2; column-gap: 10px; }
    .photos-masonry .photo { margin-bottom: 10px; }
    .article { grid-template-columns: 80px 1fr; }
    .article__thumb { width: 80px; height: 56px; }
    .nfl-card { padding: 28px 22px; }
    .nfl-grid { grid-template-columns: repeat(2, 1fr); gap: 20px; }
    .nfl-stat__num { font-size: 60px; }
    .nfl-card__title { font-size: 22px; }
    .modal { padding: 32px 20px; }
    .modal__title { font-size: 28px; }
    .sort-tabs { width: 100%; overflow-x: auto; }
    .believers__grid { grid-template-columns: repeat(2, 1fr); gap: 50px 12px; }
    .claim-cta { padding: 40px 20px; }
  }

  /* ─────────────────────────────────────────────────────────────────
     COLOR CONSISTENCY OVERRIDES
     Rule: all JetBrains Mono = accent gold. All Barlow = white.
     Exceptions: chips with colored backgrounds keep contrast colors.
     ───────────────────────────────────────────────────────────────── */

  /* MONO → GOLD */
  .topbar__center, .topbar__right,
  .hero__meta-top, .hero__sub, .hero__scroll-hint,
  .profile__sub,
  .kicker, .section-head .kicker,
  .stat-card__year, .stat-card__label, .stat-card__label .attr,
  .reel-card__sub, .duration,
  .reel-card--see-all .count,
  .career-feature__overline, .career-feature__pull,
  .stat-hero__honor, .stat-hero__caption-meta, .stat-hero__caption-label,
  .season-chip__year, .season-chip__label,
  .stat-chart__axis, .stat-chart__title, .stat-chart__total-label, .stat-chart__total-sub,
  .stat-row__year, .stat-row__year small, .stat-row__num,
  .nfl-card__years, .nfl-card__teams, .nfl-stat__label, .nfl-honors,
  .nfl-honors b,
  .media-col__count,
  .article__sub, .article__sub .outlet,
  .press-card__author-name small, .press-card__meta,
  .believer-card__jersey,
  .believers__count-label,
  .colophon span,
  .foot__tag,
  .skip-link {
    color: var(--accent-gold) !important;
  }

  /* Badges set their own color via --badge-color; nothing to override here */
  .duration { color: var(--fg-primary) !important; }    /* dark glass pill, white reads better */
  .nfl-banner { color: #0B0E1A !important; }            /* gold banner, dark text */
  .topbar__right .dot { color: var(--accent-gold) !important; }

  /* BARLOW (display + body) → WHITE */
  .topbar__brand, .topbar__athlete-name,
  .hero__name, .profile__name,
  button, .btn-primary, .btn-ghost, .see-all,
  .section-head h2, .section-head h3,
  .stat-card__num, .stat-card__year .yr,
  .reel-card__title, .reel-card--see-all .label,
  .career-feature__headline,
  .stat-hero__num,
  .season-chip__num,
  .stat-chart__total-num,
  .nfl-card__title, .nfl-stat__num,
  .media-col__title,
  .article__title,
  .press-card__title, .press-card__author-name, .press-card__excerpt,
  .press-card__more,
  .believer-card__name,
  .believers__count,
  .claim-cta h2,
  .foot-cta__big, .foot__brand,
  .colophon__brand,
  .modal__title {
    color: var(--fg-primary) !important;
  }

  /* The hero stat number uses background-clip:text — must also reset fill */
  .stat-hero__num {
    background: none !important;
    -webkit-text-fill-color: var(--fg-primary) !important;
    -webkit-background-clip: border-box !important;
    background-clip: border-box !important;
    /* Drop-shadow becomes less useful once text is solid white — soften it */
    filter:
      drop-shadow(0 4px 14px rgba(0,0,0,0.6))
      drop-shadow(0 12px 28px rgba(0,0,0,0.4)) !important;
  }

  /* Skip-to-content for keyboard */
  .skip-link {
    position: absolute; left: -9999px; top: 8px;
    background: var(--accent-gold); color: #0B0E1A;
    padding: 10px 18px; font-family: var(--font-mono);
    border-radius: var(--r-md); z-index: 100;
    font-size: 12px; letter-spacing: 0.12em; text-transform: uppercase;
  }
  .skip-link:focus { left: 8px; }
`;
