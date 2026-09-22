/* =========================================================================
   INTERACTION — header state, mobile menu, and the reveal fallback.

   Deliberately tiny and dependency-free. The site is readable and navigable
   with JavaScript disabled; everything here is enhancement.
   ========================================================================= */

const reduceMotion = () =>
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ------------------------------------------------------------- header --- */
/**
 * Flips the header from transparent-over-hero to solid once the hero has
 * scrolled past. Uses a sentinel element + IntersectionObserver rather than a
 * scroll listener, so nothing runs on the main thread while scrolling.
 */
function initHeader() {
  const header = document.querySelector<HTMLElement>('.site-header');
  if (!header || !header.hasAttribute('data-transparent')) return;

  const sentinel = document.createElement('div');
  sentinel.setAttribute('aria-hidden', 'true');
  sentinel.style.cssText =
    'position:absolute;top:0;left:0;width:1px;height:70svh;pointer-events:none;';
  document.body.prepend(sentinel);

  const io = new IntersectionObserver(
    ([entry]) => {
      if (!entry) return;
      header.toggleAttribute('data-stuck', !entry.isIntersecting);
    },
    { rootMargin: '-8% 0px 0px 0px', threshold: 0 },
  );
  io.observe(sentinel);
}

/* --------------------------------------------------------- mobile menu --- */
function initMenu() {
  const toggle = document.querySelector<HTMLButtonElement>('[data-menu-toggle]');
  const panel = document.querySelector<HTMLElement>('[data-menu-panel]');
  if (!toggle || !panel) return;

  let lastFocused: HTMLElement | null = null;

  // The close button lives outside the panel, so it joins the cycle
  // explicitly — otherwise a keyboard user could tab past the only way out.
  const focusables = () =>
    [
      ...Array.from(
        panel.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      ),
      toggle!,
    ].filter((el) => el.offsetParent !== null);

  const label = toggle.querySelector<HTMLElement>('[data-menu-label]');

  function setLabel(open: boolean) {
    if (!label) return;
    const next = toggle!.dataset[open ? 'labelClose' : 'labelOpen'];
    if (next) label.textContent = next;
  }

  /**
   * Everything behind the panel is made `inert` while it is open, so a screen
   * reader cannot wander into the page underneath. The Tab trap alone was not
   * enough — it stops keyboard focus but leaves the rest of the document in
   * the accessibility tree, so virtual-cursor users could still read it.
   *
   * The toggle button itself is deliberately excluded, since it is the
   * control that closes the panel.
   */
  const backdropRegions = () =>
    Array.from(
      document.querySelectorAll<HTMLElement>(
        'main, .site-footer, .site-header__nav, .site-header__brand, .site-header .langswitch, .site-header__actions > .btn',
      ),
    );

  function setBackdropInert(on: boolean) {
    for (const el of backdropRegions()) {
      if (on) el.setAttribute('inert', '');
      else el.removeAttribute('inert');
    }
  }

  function open() {
    lastFocused = document.activeElement as HTMLElement;
    panel.hidden = false;
    toggle!.setAttribute('aria-expanded', 'true');
    setLabel(true);
    setBackdropInert(true);
    document.documentElement.setAttribute('data-menu-open', '');
    document.body.style.overflow = 'hidden';
    focusables()[0]?.focus();
  }

  function close() {
    panel!.hidden = true;
    toggle!.setAttribute('aria-expanded', 'false');
    setLabel(false);
    setBackdropInert(false);
    document.documentElement.removeAttribute('data-menu-open');
    document.body.style.overflow = '';
    lastFocused?.focus();
  }

  toggle.addEventListener('click', () => {
    toggle.getAttribute('aria-expanded') === 'true' ? close() : open();
  });

  // Escape closes; Tab is trapped inside the panel while it is open.
  document.addEventListener('keydown', (e) => {
    if (panel.hidden) return;
    if (e.key === 'Escape') {
      e.preventDefault();
      close();
      return;
    }
    if (e.key !== 'Tab') return;
    const items = focusables();
    if (!items.length) return;
    const first = items[0]!;
    const last = items[items.length - 1]!;
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  });

  // Close when the viewport grows past the mobile breakpoint.
  window.matchMedia('(min-width: 68rem)').addEventListener('change', (e) => {
    if (e.matches && !panel.hidden) close();
  });

  /**
   * The back/forward cache restores a page exactly as it was left. If the
   * visitor left by tapping a link INSIDE the menu — which is the only reason
   * the menu exists — then going back restores the site with the menu open,
   * <main> inert and the page unscrollable, with no event to undo it.
   */
  window.addEventListener('pageshow', (e) => {
    if ((e as PageTransitionEvent).persisted && !panel.hidden) close();
  });
}

/* ------------------------------------------------------ language memory --- */
/**
 * Remember which language this visitor is reading.
 *
 * The gate at "/" reads `wcc-lang` to decide where to send someone. Without
 * this, that preference was never written and a returning Chinese reader would
 * be re-negotiated from Accept-Language every time — which gets it wrong for
 * anyone whose browser is in English but who reads the site in Chinese.
 *
 * Wrapped in try/catch because localStorage throws in some privacy modes.
 */
function rememberLocale() {
  try {
    const seg = location.pathname.split('/').filter(Boolean)[0];
    if (seg === 'en' || seg === 'zh') localStorage.setItem('wcc-lang', seg);
  } catch {
    /* private browsing — the gate falls back to Accept-Language, which is fine */
  }
}

/* -------------------------------------------------------------- reveal --- */
/**
 * Fallback for browsers without CSS scroll-driven animations. The class
 * `js-reveal` is only added (in BaseLayout’s inline script) when native
 * support is absent AND motion is allowed, so this observer is a no-op in
 * modern Chrome/Safari and never runs for reduced-motion visitors.
 */
function initReveal() {
  if (!document.documentElement.classList.contains('js-reveal')) return;
  if (reduceMotion()) return;

  /**
   * .js-reveal holds every [data-reveal] block at opacity: 0 until this
   * observer lights it. If the observer cannot be built, that class is the
   * difference between a page and a blank screen — so drop it and let
   * everything render unanimated instead.
   */
  if (typeof IntersectionObserver === 'undefined') {
    document.documentElement.classList.remove('js-reveal');
    return;
  }

  const targets = document.querySelectorAll<HTMLElement>(
    '[data-reveal], [data-reveal-group] > *',
  );
  if (!targets.length) return;

  const io = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        const el = entry.target as HTMLElement;
        // Stagger members of a group so they light up in sequence.
        const parent = el.parentElement;
        if (parent?.hasAttribute('data-reveal-group')) {
          const idx = Array.prototype.indexOf.call(parent.children, el);
          el.style.setProperty('--reveal-delay', `${Math.min(idx, 6) * 70}ms`);
        }
        el.setAttribute('data-lit', '');
        io.unobserve(el);
      }
    },
    { rootMargin: '0px 0px -12% 0px', threshold: 0.08 },
  );

  targets.forEach((el) => io.observe(el));
}

/* ---------------------------------------------------------------- init --- */
function init() {
  /**
   * Each step is isolated. These ran in a bare sequence before, so an
   * exception in initMenu() — on any browser with a gap this script does not
   * anticipate — meant initReveal() never ran, and every [data-reveal] block
   * stayed at opacity: 0. A menu bug rendered the whole page blank.
   */
  const step = (name: string, fn: () => void) => {
    try {
      fn();
    } catch (err) {
      console.warn(`[wcc] ${name} failed to initialise`, err);
    }
  };

  step('locale memory', rememberLocale);
  step('header', initHeader);
  step('menu', initMenu);

  let revealReady = false;
  step('reveal', () => {
    initReveal();
    revealReady = true;
  });

  // Last resort. .js-reveal is what holds content at opacity: 0 while it waits
  // to be lit, so if reveal did not finish wiring up, that class has to go.
  if (!revealReady) document.documentElement.classList.remove('js-reveal');
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init, { once: true });
} else {
  init();
}
