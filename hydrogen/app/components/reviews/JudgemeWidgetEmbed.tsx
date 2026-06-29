import { useState, useEffect, useRef } from "react";

interface Props {
  externalId: string;
  shopDomain: string;
}

declare global {
  interface Window {
    jdgm: Record<string, any>;
    jdgm_preloader?: () => void;
    jdgmCacheServer?: { reloadAll: () => void };
  }
}

const CDN = "https://cdn.judge.me";

function S({ className }: { className: string }) {
  return <div className={`mls-skel-box ${className}`} />;
}

function ReviewSkeleton() {
  return (
    <div aria-hidden="true">
      {/* Summary panel */}
      <div className="mb-3 flex flex-wrap items-center gap-4 rounded-[0.875rem] border border-border bg-white p-4 sm:p-5">
        {/* Rating number + stars */}
        <div className="flex items-center gap-2.5">
          <S className="h-9 w-10 rounded-lg" />
          <div className="flex flex-col gap-1">
            <div className="flex gap-0.5">
              {[...Array(5)].map((_, i) => <S key={i} className="h-3.5 w-3.5" />)}
            </div>
            <S className="h-2.5 w-24" />
          </div>
        </div>
        {/* Histogram */}
        <div className="flex flex-col gap-1.5 min-w-[140px] flex-1">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-center gap-1.5">
              <S className="h-2.5 w-8 flex-shrink-0" />
              <S className="h-1.5 flex-1 rounded-full" />
              <S className="h-2.5 w-4 flex-shrink-0" />
            </div>
          ))}
        </div>
        {/* Write review button */}
        <S className="h-8 w-28 flex-shrink-0 rounded-full" />
      </div>

      {/* Photo strip */}
      <div className="mb-3 flex gap-1.5 overflow-hidden">
        {[...Array(8)].map((_, i) => <S key={i} className="h-16 w-16 flex-shrink-0 rounded-lg" />)}
      </div>

      {/* Sort + search toolbar */}
      <div className="mb-3 flex gap-2">
        <S className="h-8 w-20 rounded-lg" />
        <S className="h-8 flex-1 rounded-full" />
      </div>

      {/* Review cards — 1 col mobile, 2 col sm+ */}
      <div className="grid gap-3 sm:grid-cols-2">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="rounded-xl border border-border bg-white p-4">
            <div className="mb-3 flex items-center gap-2">
              <S className="h-8 w-8 flex-shrink-0 rounded-full" />
              <div className="flex flex-1 flex-col gap-1.5 min-w-0">
                <S className="h-3 w-24" />
                <S className="h-2.5 w-16" />
              </div>
              <div className="flex gap-0.5">
                {[...Array(5)].map((_, j) => <S key={j} className="h-3 w-3" />)}
              </div>
            </div>
            <S className="mb-2 h-3.5 w-1/2" />
            <div className="flex flex-col gap-1.5">
              <S className="h-2.5 w-full rounded" />
              <S className="h-2.5 w-5/6 rounded" />
              <S className="h-2.5 w-3/4 rounded" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Auto-play slider for multi-image review cards ────────────────────────────
function initReviewSliders(root: HTMLElement) {
  root.querySelectorAll<HTMLElement>('.jdgm-rev__pics:not(.mls-slider-ready)').forEach((picsEl) => {
    const slides = [...picsEl.querySelectorAll<HTMLElement>('.jdgm-rev__pic, .jdgm-rev__pic-link')];
    if (slides.length <= 1) return;
    picsEl.classList.add('mls-slider-ready');

    let cur = 0;
    slides.forEach((s, i) => { s.style.display = i === 0 ? 'block' : 'none'; });

    // dots
    const dotsEl = document.createElement('div');
    dotsEl.className = 'mls-rev-dots';
    slides.forEach((_, i) => {
      const btn = document.createElement('button');
      btn.className = `mls-rev-dot${i === 0 ? ' on' : ''}`;
      btn.setAttribute('aria-label', `Photo ${i + 1}`);
      btn.addEventListener('click', (e) => { e.preventDefault(); go(i); });
      dotsEl.appendChild(btn);
    });
    picsEl.appendChild(dotsEl);

    function go(next: number) {
      slides[cur].style.display = 'none';
      (dotsEl.children[cur] as HTMLElement).classList.remove('on');
      cur = next;
      slides[cur].style.display = 'block';
      (dotsEl.children[cur] as HTMLElement).classList.add('on');
    }

    const timer = setInterval(() => {
      if (!picsEl.isConnected) { clearInterval(timer); return; }
      go((cur + 1) % slides.length);
    }, 3000);
  });
}

export function JudgemeWidgetEmbed({ externalId, shopDomain }: Props) {
  const [loaded, setLoaded] = useState(false);
  const widgetRef = useRef<HTMLDivElement>(null);
  const scriptsInjected = useRef(false);
  const deepObserverRef = useRef<MutationObserver | null>(null);

  // Dep array [externalId, shopDomain] — NOT empty — because ProductPageShell
  // has a scroll-linked IntersectionObserver that re-renders the parent on every
  // scroll, and an empty dep array would call reloadAll() 500ms after each scroll.
  useEffect(() => {
    setLoaded(false);

    const fire = () => {
      if (window.jdgmCacheServer) {
        window.jdgmCacheServer.reloadAll();
      } else if (window.jdgm_preloader) {
        window.jdgm_preloader();
      }
    };

    if (scriptsInjected.current) {
      const t = setTimeout(fire, 500);
      return () => clearTimeout(t);
    }

    let cancelled = false;
    let pendingTimer: ReturnType<typeof setTimeout> | undefined;

    fetch(`${CDN}/widget_preloader.js`)
      .then((r) => r.text())
      .then((preloaderText) => {
        if (cancelled) return;
        if (scriptsInjected.current) {
          pendingTimer = setTimeout(fire, 500);
          return;
        }
        const credScript = document.createElement("script");
        credScript.innerText = `
          if (typeof jdgm === 'undefined') {
            var jdgm = {};
            jdgm.SHOP_DOMAIN = '${shopDomain}';
            jdgm.PLATFORM = 'shopify';
            jdgm.PUBLIC_TOKEN = '';
            window.jdgm = jdgm;
          }
        `;
        const preloaderScript = document.createElement("script");
        preloaderScript.innerText = `function jdgm_preloader(){${preloaderText}}`;
        document.head.append(credScript, preloaderScript);
        scriptsInjected.current = true;
        pendingTimer = setTimeout(fire, 500);
      })
      .catch(() => {});

    return () => {
      cancelled = true;
      clearTimeout(pendingTimer);
    };
  }, [externalId, shopDomain]); // eslint-disable-line react-hooks/exhaustive-deps

  // Reveal once CDN injects content; also init sliders on every DOM change
  useEffect(() => {
    const el = widgetRef.current;
    if (!el) return;

    const observer = new MutationObserver(() => {
      if (el.children.length > 0) {
        setLoaded(true);
        observer.disconnect();
        // watch for Load More adding new cards
        const deepObserver = new MutationObserver(() => {
          initReviewSliders(el);
        });
        deepObserver.observe(el, { childList: true, subtree: true });
        deepObserverRef.current = deepObserver;
      }
    });
    observer.observe(el, { childList: true });

    const fallback = setTimeout(() => {
      setLoaded(true);
      observer.disconnect();
      initReviewSliders(el);
    }, 10_000);

    return () => {
      observer.disconnect();
      deepObserverRef.current?.disconnect();
      deepObserverRef.current = null;
      clearTimeout(fallback);
    };
  }, [externalId]);

  // Run sliders once widget is revealed
  useEffect(() => {
    if (loaded && widgetRef.current) {
      // small delay so Judge.me finishes painting
      const t = setTimeout(() => initReviewSliders(widgetRef.current!), 300);
      return () => clearTimeout(t);
    }
  }, [loaded]);

  return (
    <section className="border-t border-border pt-5" aria-busy={!loaded}>
      {!loaded && <ReviewSkeleton />}
      {/* opacity:0 keeps the div in full layout flow so Judge.me's
          IntersectionObserver and dimension calculations work correctly */}
      <div
        ref={widgetRef}
        id="judgeme_product_reviews"
        className="jdgm-widget jdgm-review-widget"
        data-id={externalId}
        style={{
          opacity: loaded ? 1 : 0,
          transition: loaded ? "opacity 0.4s ease" : undefined,
        }}
      />
    </section>
  );
}
