"use client";

import { useEffect } from "react";

/**
 * Interactivity for the locker page. The markup is server-rendered as a static
 * HTML string by page.tsx; this island wires up the behaviours from the original
 * mockup (carousel, modals, search, QR, share, scroll reveal, parallax) against
 * that DOM after mount. It renders nothing itself.
 *
 * The one production change vs. the mockup: search hits the real
 * /api/search/players endpoint instead of an in-memory mock list.
 */
export default function LockerClient({
  slug,
  shareText,
}: {
  slug: string;
  shareText: string;
}) {
  useEffect(() => {
    const cleanups: Array<() => void> = [];
    const on = (
      el: EventTarget | null,
      ev: string,
      fn: EventListenerOrEventListenerObject,
      opts?: AddEventListenerOptions,
    ) => {
      if (!el) return;
      el.addEventListener(ev, fn, opts);
      cleanups.push(() => el.removeEventListener(ev, fn, opts));
    };
    const $ = (id: string) => document.getElementById(id);

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // ---- Reveal profile immediately ----
    requestAnimationFrame(() => {
      document.querySelectorAll(".profile .reveal").forEach((el) => el.classList.add("in"));
    });

    // ---- Avatar live preview ----
    const avatarInput = $("avatar-upload") as HTMLInputElement | null;
    const avatarImg = $("avatar-img") as HTMLImageElement | null;
    on(avatarInput, "change", (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file || !avatarImg) return;
      avatarImg.src = URL.createObjectURL(file);
    });

    // ---- Parallax + topbar scroll state ----
    const heroBg = $("heroBg");
    const hero = document.querySelector(".hero") as HTMLElement | null;
    const topbar = $("topbar");
    // College feature image — scroll-linked "focus pull": the inner photo layer
    // zooms slightly + desaturates/dims when off-center, then snaps into vivid,
    // full-color clarity (with a parallax drift) as it reaches the viewport
    // center, reversing on scroll-up. The fixed frame keeps the edge fades.
    const featureFrame = document.querySelector(".career-feature__image") as HTMLElement | null;
    const featureInner = document.querySelector(
      ".career-feature__image-inner",
    ) as HTMLElement | null;
    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        const y = window.scrollY;
        if (heroBg && hero && !reduce && y < hero.offsetHeight) {
          heroBg.style.transform = `translate3d(0, ${y * 0.35}px, 0) scale(${1 + y * 0.0002})`;
        }
        if (featureFrame && featureInner && !reduce) {
          const rect = featureFrame.getBoundingClientRect();
          const vh = window.innerHeight;
          if (rect.bottom > -200 && rect.top < vh + 200) {
            // 0 as it enters from the bottom → 1 as it exits past the top.
            const progress = Math.max(0, Math.min(1, (vh - rect.top) / (vh + rect.height)));
            // 1 when the frame is centered in the viewport, 0 at the edges.
            const centerProx = Math.max(0, 1 - Math.abs(progress - 0.5) * 2);
            const scale = 1.0 + (1 - centerProx) * 0.08; // 1.0 centered → 1.08 at edges
            // Drift is proportional to the element's own height (±2.5%) so it
            // always stays within the inner layer's -5% overflow headroom — even
            // on a short mobile banner where a fixed px drift would expose an edge.
            const ty = (progress - 0.5) * rect.height * -0.05;
            const sat = (0.7 + centerProx * 0.55).toFixed(3); // 0.70 → 1.25
            const bri = (0.84 + centerProx * 0.2).toFixed(3); // 0.84 → 1.04
            const con = (0.96 + centerProx * 0.14).toFixed(3); // 0.96 → 1.10
            featureInner.style.transform = `translate3d(0, ${ty.toFixed(1)}px, 0) scale(${scale.toFixed(3)})`;
            featureInner.style.filter = `saturate(${sat}) brightness(${bri}) contrast(${con})`;
          }
        }
        if (topbar) topbar.classList.toggle("is-scrolled", y > 24);
        ticking = false;
      });
    };
    on(window, "scroll", onScroll, { passive: true });
    onScroll();

    // ---- Scroll-reveal / stagger / image fade observers ----
    const observers: IntersectionObserver[] = [];
    const reveal = (sel: string, opts: IntersectionObserverInit) => {
      const io = new IntersectionObserver((entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            e.target.classList.add("in");
            io.unobserve(e.target);
          }
        }
      }, opts);
      document.querySelectorAll(sel).forEach((el) => io.observe(el));
      observers.push(io);
    };
    reveal(".scroll-reveal", { rootMargin: "0px 0px -10% 0px", threshold: 0.05 });
    reveal(".locker-stagger", { rootMargin: "0px 0px -8% 0px", threshold: 0.1 });
    reveal(".image-fade", { rootMargin: "0px 0px -8% 0px", threshold: 0.15 });
    cleanups.push(() => observers.forEach((io) => io.disconnect()));

    // ---- Photo mouse-tracking pan ----
    if (!reduce) {
      document.querySelectorAll<HTMLElement>(".photos-masonry .photo").forEach((photo) => {
        const img = photo.querySelector("img") as HTMLImageElement | null;
        if (!img) return;
        let raf = 0;
        let lx = 0,
          ly = 0;
        on(photo, "mouseenter", () => photo.classList.add("is-tracking"));
        on(photo, "mousemove", (e) => {
          const me = e as MouseEvent;
          const rect = photo.getBoundingClientRect();
          lx = (0.5 - (me.clientX - rect.left) / rect.width) * 16;
          ly = (0.5 - (me.clientY - rect.top) / rect.height) * 16;
          if (!raf) {
            raf = requestAnimationFrame(() => {
              img.style.transform = `scale(1.22) translate(${lx}%, ${ly}%)`;
              raf = 0;
            });
          }
        });
        on(photo, "mouseleave", () => {
          photo.classList.remove("is-tracking");
          if (raf) {
            cancelAnimationFrame(raf);
            raf = 0;
          }
          img.style.transform = "";
        });
      });
    }

    // ---- Video carousel arrows ----
    const reel = $("reel");
    const reelPrev = $("reel-prev");
    const reelNext = $("reel-next");
    const reelStep = () => {
      const card = reel?.querySelector(".reel-card") as HTMLElement | null;
      if (!reel || !card) return 0;
      const styles = getComputedStyle(reel);
      const gap = parseFloat(styles.columnGap || styles.gap || "20");
      return card.offsetWidth + gap;
    };
    const updateReelArrows = () => {
      if (!reel) return;
      const max = reel.scrollWidth - reel.clientWidth - 1;
      const atStart = reel.scrollLeft <= 0;
      const atEnd = reel.scrollLeft >= max;
      reelPrev?.toggleAttribute("disabled", atStart);
      reelNext?.toggleAttribute("disabled", atEnd);
      const viewport = reel.parentElement;
      viewport?.classList.toggle("at-start", atStart);
      viewport?.classList.toggle("at-end", atEnd);
    };
    on(reelPrev, "click", () => reel?.scrollBy({ left: -reelStep() * 2, behavior: "smooth" }));
    on(reelNext, "click", () => reel?.scrollBy({ left: reelStep() * 2, behavior: "smooth" }));
    on(reel, "scroll", updateReelArrows, { passive: true });
    updateReelArrows();

    // ---- Generic modal helpers ----
    const openModal = (modal: HTMLElement | null, focusEl?: HTMLElement | null) => {
      if (!modal) return;
      modal.hidden = false;
      modal.classList.add("is-open");
      document.body.style.overflow = "hidden";
      setTimeout(() => focusEl?.focus(), 0);
    };
    const closeModal = (modal: HTMLElement | null, restore?: HTMLElement | null) => {
      if (!modal) return;
      modal.classList.remove("is-open");
      modal.hidden = true;
      document.body.style.overflow = "";
      restore?.focus();
    };

    // ---- Videos modal ----
    const videosModal = $("videos-modal");
    const modalGrid = $("modal-grid");
    const seeAllBtn = $("see-all-btn");
    const modalClose = $("modal-close");
    const sortTabs = Array.from(document.querySelectorAll<HTMLElement>(".sort-tab"));
    const applySort = (tier: string) => {
      sortTabs.forEach((t) => {
        const active = t.dataset.tier === tier;
        t.classList.toggle("is-active", active);
        t.setAttribute("aria-selected", active ? "true" : "false");
      });
      modalGrid?.querySelectorAll<HTMLElement>(".reel-card").forEach((card) => {
        const match = tier === "all" || card.dataset.tier === tier;
        card.style.display = match ? "" : "none";
      });
    };
    on(seeAllBtn, "click", () => {
      if (modalGrid && reel) {
        modalGrid.innerHTML = "";
        reel.querySelectorAll(".reel-card").forEach((card) => {
          modalGrid.appendChild(card.cloneNode(true));
        });
      }
      openModal(videosModal, modalClose as HTMLElement);
      applySort("all");
    });
    on(modalClose, "click", () => closeModal(videosModal, seeAllBtn as HTMLElement));
    on(videosModal, "click", (e) => {
      if (e.target === videosModal) closeModal(videosModal, seeAllBtn as HTMLElement);
    });
    sortTabs.forEach((tab) => on(tab, "click", () => applySort(tab.dataset.tier || "all")));

    // ---- Stats modal (any .see-stats trigger) ----
    const statsModal = $("stats-modal");
    const statsClose = $("stats-modal-close");
    let lastStatsTrigger: HTMLElement | null = null;
    document.querySelectorAll<HTMLElement>(".see-stats").forEach((btn) => {
      // The college-feature award chip reuses .see-stats purely for styling and
      // is not a button — only wire elements that open the modal.
      if (btn.tagName !== "BUTTON") return;
      on(btn, "click", () => {
        lastStatsTrigger = btn;
        openModal(statsModal, statsClose as HTMLElement);
      });
    });
    on(statsClose, "click", () => closeModal(statsModal, lastStatsTrigger));
    on(statsModal, "click", (e) => {
      if (e.target === statsModal) closeModal(statsModal, lastStatsTrigger);
    });

    // ---- Share modal ----
    const shareModal = $("share-modal");
    const shareBtn = $("share-btn");
    const shareClose = $("share-modal-close");
    const shareUrlInput = $("share-url-input") as HTMLInputElement | null;
    const shareCopyBtn = $("share-copy-btn");
    const shareNative = $("share-native");
    const shareUrl = () => window.location.href.split("?")[0];
    on(shareBtn, "click", () => {
      const url = shareUrl();
      const u = encodeURIComponent(url);
      const t = encodeURIComponent(document.title);
      const x = encodeURIComponent(shareText);
      const set = (id: string, href: string) => {
        const el = $(id) as HTMLAnchorElement | null;
        if (el) el.href = href;
      };
      set("share-x", `https://twitter.com/intent/tweet?url=${u}&text=${x}`);
      set("share-facebook", `https://www.facebook.com/sharer/sharer.php?u=${u}`);
      set("share-linkedin", `https://www.linkedin.com/sharing/share-offsite/?url=${u}`);
      set("share-reddit", `https://reddit.com/submit?url=${u}&title=${t}`);
      set("share-whatsapp", `https://wa.me/?text=${x}%20${u}`);
      set("share-email", `mailto:?subject=${t}&body=${x}%0A%0A${u}`);
      set("share-sms", `sms:?body=${x}%20${u}`);
      if (shareUrlInput) shareUrlInput.value = url;
      if (shareNative && (navigator as any).share) shareNative.hidden = false;
      openModal(shareModal, shareClose as HTMLElement);
    });
    on(shareClose, "click", () => closeModal(shareModal, shareBtn as HTMLElement));
    on(shareModal, "click", (e) => {
      if (e.target === shareModal) closeModal(shareModal, shareBtn as HTMLElement);
    });
    on(shareCopyBtn, "click", async () => {
      try {
        await navigator.clipboard.writeText(shareUrlInput?.value || shareUrl());
        if (shareCopyBtn) shareCopyBtn.textContent = "Copied ✓";
        setTimeout(() => {
          if (shareCopyBtn) shareCopyBtn.textContent = "Copy";
        }, 1500);
      } catch {
        shareUrlInput?.select();
      }
    });
    on(shareNative, "click", async () => {
      try {
        await (navigator as any).share({ url: shareUrl(), title: document.title, text: shareText });
      } catch {
        /* cancelled / unsupported */
      }
    });

    // ---- QR modal (lazy-load qrcodejs) ----
    const qrModal = $("qr-modal");
    const qrBtn = $("qr-btn");
    const qrClose = $("qr-modal-close");
    const qrCanvas = $("qr-canvas");
    const qrUrlEl = $("qr-url");
    const qrCopy = $("qr-copy");
    const qrDownload = $("qr-download");
    let qrLoaded = false;
    const loadQr = () =>
      qrLoaded
        ? Promise.resolve()
        : new Promise<void>((resolve, reject) => {
            const s = document.createElement("script");
            s.src = "https://cdn.jsdelivr.net/gh/davidshimjs/qrcodejs/qrcode.min.js";
            s.onload = () => {
              qrLoaded = true;
              resolve();
            };
            s.onerror = reject;
            document.head.appendChild(s);
          });
    on(qrBtn, "click", async () => {
      openModal(qrModal, qrClose as HTMLElement);
      const url = shareUrl();
      if (qrUrlEl) qrUrlEl.textContent = url;
      try {
        await loadQr();
        if (qrCanvas) {
          qrCanvas.innerHTML = "";
          new (window as any).QRCode(qrCanvas, {
            text: url,
            width: 240,
            height: 240,
            colorDark: "#0B0E1A",
            colorLight: "#FFFFFF",
            correctLevel: (window as any).QRCode.CorrectLevel.H,
          });
        }
      } catch {
        if (qrCanvas)
          qrCanvas.innerHTML =
            '<p style="color:#0B0E1A;font-family:monospace;font-size:11px;">QR library failed to load.</p>';
      }
    });
    on(qrClose, "click", () => closeModal(qrModal, qrBtn as HTMLElement));
    on(qrModal, "click", (e) => {
      if (e.target === qrModal) closeModal(qrModal, qrBtn as HTMLElement);
    });
    on(qrCopy, "click", async () => {
      try {
        await navigator.clipboard.writeText(qrUrlEl?.textContent || "");
        if (qrCopy) qrCopy.textContent = "Copied ✓";
        setTimeout(() => {
          if (qrCopy) qrCopy.textContent = "Copy Link";
        }, 1500);
      } catch {
        /* noop */
      }
    });
    on(qrDownload, "click", () => {
      const node =
        (qrCanvas?.querySelector("img") as HTMLImageElement | null) ||
        (qrCanvas?.querySelector("canvas") as HTMLCanvasElement | null);
      if (!node) return;
      const dataUrl =
        node.tagName === "IMG"
          ? (node as HTMLImageElement).src
          : (node as HTMLCanvasElement).toDataURL("image/png");
      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = "bltz-locker-qr.png";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    });

    // ---- Video playback: YouTube embed overlay + outbound /watch links ----
    const videoModal = $("video-modal");
    const videoEmbed = $("video-embed");
    const videoClose = $("video-modal-close");
    const openVideo = (ytId: string) => {
      if (!videoModal || !videoEmbed) return;
      videoEmbed.innerHTML = `<iframe src="https://www.youtube.com/embed/${ytId}?autoplay=1&rel=0&modestbranding=1" title="Highlight video" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>`;
      openModal(videoModal, videoClose as HTMLElement);
    };
    const closeVideo = () => {
      if (videoEmbed) videoEmbed.innerHTML = ""; // unmount iframe → stop playback
      closeModal(videoModal);
    };
    // Delegated so cloned cards in the "See All" modal work too.
    on(document, "click", (e) => {
      const card = (e.target as HTMLElement).closest?.(".reel-card") as HTMLElement | null;
      if (!card) return;
      const yt = card.getAttribute("data-youtube");
      const href = card.getAttribute("data-href");
      if (yt) {
        e.preventDefault();
        openVideo(yt);
      } else if (href) {
        window.location.href = href;
      }
    });
    on(videoClose, "click", closeVideo);
    on(videoModal, "click", (e) => {
      if (e.target === videoModal) closeVideo();
    });

    // ---- Photo lightbox ----
    const lightbox = $("lightbox");
    const lightboxImg = $("lightbox-img") as HTMLImageElement | null;
    const lbClose = $("lightbox-close");
    const lbPrev = $("lightbox-prev");
    const lbNext = $("lightbox-next");
    const photoEls = Array.from(
      document.querySelectorAll<HTMLElement>(".photos-masonry .photo"),
    );
    const photoUrls = photoEls.map((el) => el.getAttribute("data-full") || "");
    let lbIndex = 0;
    const showPhoto = (i: number) => {
      if (!photoUrls.length || !lightboxImg) return;
      lbIndex = (i + photoUrls.length) % photoUrls.length;
      lightboxImg.src = photoUrls[lbIndex];
    };
    const openLightbox = (i: number) => {
      showPhoto(i);
      openModal(lightbox, lbClose as HTMLElement);
    };
    const closeLightbox = () => closeModal(lightbox);
    photoEls.forEach((el, i) => {
      on(el, "click", () => openLightbox(i));
      on(el, "keydown", (e) => {
        const k = (e as KeyboardEvent).key;
        if (k === "Enter" || k === " ") {
          e.preventDefault();
          openLightbox(i);
        }
      });
    });
    on(lbClose, "click", closeLightbox);
    on(lbPrev, "click", (e) => {
      e.stopPropagation();
      showPhoto(lbIndex - 1);
    });
    on(lbNext, "click", (e) => {
      e.stopPropagation();
      showPhoto(lbIndex + 1);
    });
    on(lightbox, "click", (e) => {
      if (e.target === lightbox) closeLightbox();
    });

    // ---- Esc closes whichever modal is open; arrows page the lightbox ----
    on(document, "keydown", (e) => {
      const k = (e as KeyboardEvent).key;
      if (lightbox?.classList.contains("is-open")) {
        if (k === "ArrowLeft") showPhoto(lbIndex - 1);
        else if (k === "ArrowRight") showPhoto(lbIndex + 1);
      }
      if (k !== "Escape") return;
      if (videoModal?.classList.contains("is-open")) closeVideo();
      if (lightbox?.classList.contains("is-open")) closeLightbox();
      [videosModal, shareModal, qrModal, statsModal].forEach((m) => {
        if (m?.classList.contains("is-open")) closeModal(m);
      });
    });

    // ---- Player search against the real API ----
    const LEVEL_LABEL: Record<string, string> = { hs: "HS", college: "College", pro: "Pro" };
    const escapeHtml = (s: string) =>
      s.replace(/[&<>"']/g, (c) =>
        ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] as string,
      );
    const highlight = (nameStr: string, q: string) => {
      if (!q) return escapeHtml(nameStr);
      const i = nameStr.toLowerCase().indexOf(q.toLowerCase());
      if (i < 0) return escapeHtml(nameStr);
      return (
        escapeHtml(nameStr.slice(0, i)) +
        "<mark>" +
        escapeHtml(nameStr.slice(i, i + q.length)) +
        "</mark>" +
        escapeHtml(nameStr.slice(i + q.length))
      );
    };
    type Hit = { name: string; school: string; slug: string; img: string };
    const cache = new Map<string, Hit[]>();
    const fetchPlayers = async (q: string, signal: AbortSignal): Promise<Hit[]> => {
      const key = q.trim().toLowerCase();
      if (!key) return [];
      if (cache.has(key)) return cache.get(key)!;
      const r = await fetch(`/api/search/players?q=${encodeURIComponent(key)}&limit=8`, { signal });
      if (!r.ok) throw new Error(r.statusText);
      const json = await r.json();
      const hits: Hit[] = (json.players || []).map((p: any) => ({
        name: p.full_name || "Unknown",
        school: p.school || "",
        slug: p.slug,
        img: p.image_url || "/images/Headshot.png",
      }));
      cache.set(key, hits);
      return hits;
    };
    const renderResults = (container: HTMLElement, q: string, results: Hit[]) => {
      if (!q.trim()) {
        container.innerHTML = `<div class="search-results__head">Type to search players</div>`;
        return;
      }
      if (results.length === 0) {
        container.innerHTML = `<div class="search-results__empty">No players found for "${escapeHtml(
          q,
        )}"</div>`;
        return;
      }
      let html = `<div class="search-results__head">${results.length} result${
        results.length === 1 ? "" : "s"
      }</div>`;
      for (const p of results) {
        html += `<a class="search-result" href="/player/${escapeHtml(p.slug)}" role="option">
          <span class="search-result__avatar"><img src="${escapeHtml(p.img)}" alt=""></span>
          <span class="search-result__body">
            <span class="search-result__name">${highlight(p.name, q)}</span>
            <span class="search-result__meta">${escapeHtml(p.school)}</span>
          </span>
        </a>`;
      }
      container.innerHTML = html;
    };
    const wireSearch = (
      inputEl: HTMLInputElement | null,
      wrapEl: HTMLElement | null,
      resultsEl: HTMLElement | null,
      opts: { alwaysOpen?: boolean } = {},
    ) => {
      if (!inputEl || !resultsEl) return;
      let timer: ReturnType<typeof setTimeout> | null = null;
      let controller: AbortController | null = null;
      let activeIdx = -1;
      const run = (q: string) => {
        if (timer) clearTimeout(timer);
        timer = setTimeout(async () => {
          if (q !== inputEl.value) return;
          if (!q.trim()) {
            renderResults(resultsEl, q, []);
            wrapEl?.classList.remove("has-text");
            return;
          }
          controller?.abort();
          controller = new AbortController();
          try {
            const results = await fetchPlayers(q, controller.signal);
            if (q !== inputEl.value) return;
            renderResults(resultsEl, q, results);
            activeIdx = -1;
            wrapEl?.classList.toggle("has-text", !!q);
            if (!opts.alwaysOpen)
              resultsEl.classList.toggle("is-open", document.activeElement === inputEl);
          } catch (err: any) {
            if (err?.name !== "AbortError") {
              resultsEl.innerHTML = `<div class="search-results__empty">Search unavailable</div>`;
            }
          }
        }, 180);
      };
      on(inputEl, "input", () => run(inputEl.value));
      on(inputEl, "focus", () => {
        resultsEl.classList.add("is-open");
        run(inputEl.value);
      });
      if (!opts.alwaysOpen) {
        on(document, "click", (e) => {
          const target = e.target as Node;
          if (!resultsEl.contains(target) && target !== inputEl && !wrapEl?.contains(target)) {
            resultsEl.classList.remove("is-open");
          }
        });
      }
      on(inputEl, "keydown", (e) => {
        const ke = e as KeyboardEvent;
        const items = resultsEl.querySelectorAll<HTMLElement>(".search-result");
        if (ke.key === "ArrowDown") {
          ke.preventDefault();
          activeIdx = (activeIdx + 1) % items.length;
        } else if (ke.key === "ArrowUp") {
          ke.preventDefault();
          activeIdx = (activeIdx - 1 + items.length) % items.length;
        } else if (ke.key === "Enter") {
          if (activeIdx >= 0 && items[activeIdx]) {
            ke.preventDefault();
            items[activeIdx].click();
          }
          return;
        } else if (ke.key === "Escape") {
          inputEl.blur();
          resultsEl.classList.remove("is-open");
          return;
        } else return;
        items.forEach((el, i) => el.classList.toggle("is-active", i === activeIdx));
        items[activeIdx]?.scrollIntoView({ block: "nearest" });
      });
    };
    wireSearch(
      $("search-input") as HTMLInputElement,
      $("search-wrap"),
      $("search-results"),
    );
    on($("search-clear"), "click", () => {
      const input = $("search-input") as HTMLInputElement | null;
      if (!input) return;
      input.value = "";
      input.dispatchEvent(new Event("input"));
      input.focus();
    });

    // Mobile overlay search
    const overlay = $("search-overlay");
    wireSearch(
      $("search-overlay-input") as HTMLInputElement,
      $("search-overlay-wrap"),
      $("search-overlay-results"),
      { alwaysOpen: true },
    );
    on($("search-overlay-open"), "click", () => {
      if (!overlay) return;
      overlay.hidden = false;
      overlay.classList.add("is-open");
      document.body.style.overflow = "hidden";
      setTimeout(() => ($("search-overlay-input") as HTMLInputElement)?.focus(), 0);
    });
    const closeOverlay = () => {
      if (!overlay) return;
      overlay.classList.remove("is-open");
      overlay.hidden = true;
      document.body.style.overflow = "";
    };
    on($("search-overlay-close"), "click", closeOverlay);
    on(document, "keydown", (e) => {
      if ((e as KeyboardEvent).key === "Escape" && overlay?.classList.contains("is-open"))
        closeOverlay();
    });

    return () => {
      cleanups.forEach((fn) => fn());
      document.body.style.overflow = "";
    };
    // slug intentionally in deps so a client-side navigation between lockers re-wires.
  }, [slug, shareText]);

  return null;
}
