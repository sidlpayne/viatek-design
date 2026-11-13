/*
 * @viatek/design · sidebar.js
 * Sidebar collapse behavior. Source of truth: SPEC.md section 6.1a.
 *
 *   import { initSidebar } from '@viatek/design/sidebar.js';
 *   const sidebar = initSidebar('insight');
 *
 * Markup contract (see preview/index.html for a full example):
 *   <html data-sidebar="expanded|collapsed">          set by the no-flash snippet
 *   <aside id="vt-sidebar" class="vt-sidebar" data-vt-sidebar> ... </aside>
 *   <button data-vt-sidebar-toggle aria-controls="vt-sidebar"> ... </button>
 *   Nav links:        .vt-nav-item  with .vt-nav-text label and optional .vt-nav-badge
 *                     or a plain .vt-nav-count for counts that are information only (v1.2.0)
 *   Sub-item parent:  button.vt-nav-item[aria-controls=<id of .vt-subnav>]
 *   Split parent (v1.2.0), when the parent is also a page:
 *     <div class="vt-nav-split"><a class="vt-nav-item" href> ... </a>
 *       <button class="vt-nav-expander" aria-controls=<id of .vt-subnav> aria-expanded> chevron </button></div>
 *   Section toggle:   button.vt-nav-label[aria-controls=<id of .vt-nav-group>]
 *
 * State attributes this script writes on <html>:
 *   data-sidebar         "expanded" | "collapsed"     (desktop, 900px and wider)
 *   data-sidebar-drawer  "open"                        (under 900px, drawer showing)
 *   data-sidebar-anim    "expanding"                   (labels stay hidden until width settles)
 *
 * Emits a 'viatek:sidebar' window event with { state, drawer } after every change.
 */

export const EVENT = 'viatek:sidebar';
const MOBILE_Q = '(max-width: 899px)';
const WIDE_Q = '(min-width: 1280px)';
const REDUCED_Q = '(prefers-reduced-motion: reduce)';
const TOOLTIP_DELAY = 300;

const storageKey = (appId) => `viatek.sidebar.${appId}`;

function isEditable(el) {
  if (!el || el === document.body) return false;
  if (el.isContentEditable) return true;
  const tag = el.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || !!el.closest('[contenteditable=""],[contenteditable="true"]');
}

function readSaved(appId) {
  try {
    const v = window.localStorage.getItem(storageKey(appId));
    return v === 'collapsed' || v === 'expanded' ? v : null;
  } catch (e) { return null; }
}

function writeSaved(appId, state) {
  try { window.localStorage.setItem(storageKey(appId), state); } catch (e) { /* private mode */ }
}

function labelOf(item) {
  const text = item.querySelector('.vt-nav-text');
  return (item.getAttribute('data-vt-label') || (text && text.textContent) || item.getAttribute('aria-label') || '').trim();
}

function countOf(item) {
  const badge = item.querySelector('.vt-nav-badge, .vt-nav-count');
  return badge ? badge.textContent.trim() : '';
}

function tooltipOf(item) {
  if (item.hasAttribute('data-vt-tooltip')) return item.getAttribute('data-vt-tooltip');
  const count = countOf(item);
  const label = labelOf(item);
  return count ? `${label} · ${count}` : label;
}

/**
 * initSidebar(appId, options)
 *   options.sidebar  element or selector (default '[data-vt-sidebar]')
 *   options.toggle   element or selector (default '[data-vt-sidebar-toggle]')
 *   options.shortcut set false to disable the '[' shortcut
 * Returns { collapse, expand, toggle, openDrawer, closeDrawer, state, destroy }.
 */
export function initSidebar(appId, options = {}) {
  if (typeof window === 'undefined') return null;
  if (!appId || !/^[a-z0-9][a-z0-9-]*$/.test(appId)) {
    throw new Error(`[viatek] initSidebar: app id must be lowercase letters, digits and dashes, got "${appId}"`);
  }

  const root = document.documentElement;
  const pick = (v, d) => (typeof v === 'string' ? document.querySelector(v) : v) || document.querySelector(d);
  const sidebar = pick(options.sidebar, '[data-vt-sidebar]');
  const toggles = options.toggle
    ? [pick(options.toggle, '[data-vt-sidebar-toggle]')].filter(Boolean)
    : Array.from(document.querySelectorAll('[data-vt-sidebar-toggle]'));
  if (!sidebar) {
    console.warn('[viatek] initSidebar: no [data-vt-sidebar] element found');
    return null;
  }
  if (!sidebar.id) sidebar.id = 'vt-sidebar';

  const mobileMq = window.matchMedia(MOBILE_Q);
  const wideMq = window.matchMedia(WIDE_Q);
  const reducedMq = window.matchMedia(REDUCED_Q);
  const cleanups = [];
  const on = (target, type, fn, opts) => {
    target.addEventListener(type, fn, opts);
    cleanups.push(() => target.removeEventListener(type, fn, opts));
  };

  // Backdrop for the off-canvas drawer.
  let backdrop = document.querySelector('.vt-sidebar-backdrop');
  if (!backdrop) {
    backdrop = document.createElement('div');
    backdrop.className = 'vt-sidebar-backdrop';
    backdrop.setAttribute('aria-hidden', 'true');
    sidebar.insertAdjacentElement('afterend', backdrop);
  }

  // One shared tooltip element.
  let tip = document.getElementById('vt-tooltip');
  if (!tip) {
    tip = document.createElement('div');
    tip.id = 'vt-tooltip';
    tip.className = 'vt-tooltip';
    tip.setAttribute('role', 'tooltip');
    tip.hidden = true;
    document.body.appendChild(tip);
  }

  // Nav items keep an accessible name when the label is hidden.
  sidebar.querySelectorAll('.vt-nav-item').forEach((item) => {
    if (!item.hasAttribute('aria-label')) {
      const count = countOf(item);
      const label = labelOf(item);
      item.setAttribute('aria-label', count ? `${label}, ${count}` : label);
    }
  });
  // Split items: the chevron button needs its own name.
  sidebar.querySelectorAll('.vt-nav-split').forEach((row) => {
    const link = row.querySelector('.vt-nav-item');
    const btn = row.querySelector('.vt-nav-expander');
    if (link && btn && !btn.hasAttribute('aria-label')) btn.setAttribute('aria-label', `${labelOf(link)} views`);
  });

  const isMobile = () => mobileMq.matches;
  const state = () => (root.getAttribute('data-sidebar') === 'collapsed' ? 'collapsed' : 'expanded');
  const drawerOpen = () => root.getAttribute('data-sidebar-drawer') === 'open';
  const collapsedDesktop = () => !isMobile() && state() === 'collapsed';

  function syncToggles() {
    const mobile = isMobile();
    const expanded = mobile ? drawerOpen() : state() === 'expanded';
    const label = mobile
      ? (expanded ? 'Close sidebar' : 'Open sidebar')
      : (expanded ? 'Collapse sidebar' : 'Expand sidebar');
    toggles.forEach((t) => {
      t.setAttribute('aria-controls', sidebar.id);
      t.setAttribute('aria-expanded', String(expanded));
      t.setAttribute('aria-label', label);
      t.setAttribute('data-vt-tooltip', options.shortcut === false || mobile ? label : `${label} ( [ )`);
      t.removeAttribute('title');
    });
  }

  function emit() {
    syncToggles();
    window.dispatchEvent(new CustomEvent(EVENT, { detail: { state: state(), drawer: drawerOpen() } }));
  }

  let animTimer = null;
  function setState(next, { persist = true } = {}) {
    if (next !== 'collapsed' && next !== 'expanded') return;
    closeFlyout();
    hideTip();
    if (persist) writeSaved(appId, next);
    if (state() === next) { emit(); return; }
    clearTimeout(animTimer);
    if (next === 'expanded' && !reducedMq.matches && !isMobile()) {
      // Keep labels hidden until the width transition ends so text never wraps mid-animation.
      root.setAttribute('data-sidebar-anim', 'expanding');
      const done = () => { root.removeAttribute('data-sidebar-anim'); };
      const onEnd = (e) => {
        if (e.target === sidebar && e.propertyName === 'width') {
          sidebar.removeEventListener('transitionend', onEnd);
          clearTimeout(animTimer);
          done();
        }
      };
      sidebar.addEventListener('transitionend', onEnd);
      animTimer = setTimeout(() => { sidebar.removeEventListener('transitionend', onEnd); done(); }, 400);
    } else {
      root.removeAttribute('data-sidebar-anim');
    }
    // Collapsing: labels hide at once (via [data-sidebar="collapsed"] CSS), then width animates.
    root.setAttribute('data-sidebar', next);
    emit();
  }

  let lastFocus = null;
  function openDrawer() {
    lastFocus = document.activeElement;
    root.setAttribute('data-sidebar-drawer', 'open');
    emit();
    const first = sidebar.querySelector('[aria-current="page"], .vt-nav-item');
    if (first) first.focus({ preventScroll: true });
  }
  function closeDrawer({ restoreFocus = true } = {}) {
    if (!drawerOpen()) return;
    root.removeAttribute('data-sidebar-drawer');
    emit();
    if (restoreFocus && lastFocus && typeof lastFocus.focus === 'function') lastFocus.focus({ preventScroll: true });
  }

  function toggle() {
    if (isMobile()) { drawerOpen() ? closeDrawer() : openDrawer(); return; }
    setState(state() === 'collapsed' ? 'expanded' : 'collapsed');
  }

  /* ---------- Tooltips (collapsed nav items to the right; toggle below) ---------- */
  let tipTimer = null;
  let tipFor = null;
  function showTip(el, text, placement) {
    clearTimeout(tipTimer);
    tipTimer = setTimeout(() => {
      tip.textContent = text;
      tip.hidden = false;
      tip.setAttribute('data-placement', placement);
      const r = el.getBoundingClientRect();
      const t = tip.getBoundingClientRect();
      let x, y;
      if (placement === 'right') { x = r.right + 10; y = r.top + r.height / 2 - t.height / 2; }
      else { x = r.left; y = r.bottom + 8; }
      x = Math.max(8, Math.min(x, window.innerWidth - t.width - 8));
      tip.style.left = `${Math.round(x)}px`;
      tip.style.top = `${Math.round(y)}px`;
      tipFor = el;
      el.setAttribute('aria-describedby', tip.id);
    }, TOOLTIP_DELAY);
  }
  function hideTip() {
    clearTimeout(tipTimer);
    tip.hidden = true;
    if (tipFor) { tipFor.removeAttribute('aria-describedby'); tipFor = null; }
  }
  function tipTarget(e) {
    const t = e.target instanceof Element ? e.target : null;
    if (!t) return null;
    const toggleEl = t.closest('[data-vt-sidebar-toggle]');
    if (toggleEl) return { el: toggleEl, text: toggleEl.getAttribute('data-vt-tooltip'), placement: 'bottom' };
    const item = t.closest('.vt-nav-item');
    if (item && sidebar.contains(item) && collapsedDesktop()) return { el: item, text: tooltipOf(item), placement: 'right' };
    return null;
  }
  const enter = (e) => { const t = tipTarget(e); if (t && t.text && !flyout) showTip(t.el, t.text, t.placement); };
  const leave = (e) => { const t = tipTarget(e); if (t) hideTip(); };
  on(document, 'pointerover', enter);
  on(document, 'pointerout', leave);
  on(document, 'focusin', enter);
  on(document, 'focusout', leave);

  /* ---------- Sub-items: inline when expanded, flyout when collapsed ---------- */
  let flyout = null;
  let flyoutOwner = null;
  function closeFlyout({ restoreFocus = false } = {}) {
    if (!flyout) return;
    flyout.remove();
    flyout = null;
    if (flyoutOwner) {
      if (flyoutOwner.matches('.vt-nav-split > .vt-nav-item')) flyoutOwner.removeAttribute('aria-expanded');
      else flyoutOwner.setAttribute('aria-expanded', flyoutOwner.getAttribute('data-vt-inline-expanded') || 'false');
      if (restoreFocus) flyoutOwner.focus();
    }
    flyoutOwner = null;
  }
  function openFlyout(owner, sub, parentLink) {
    closeFlyout();
    hideTip();
    flyout = document.createElement('div');
    flyout.className = 'vt-flyout';
    flyout.setAttribute('role', 'group');
    const title = document.createElement('div');
    title.className = 'vt-flyout-label';
    title.textContent = labelOf(owner);
    title.id = `${sub.id}-flyout-label`;
    flyout.setAttribute('aria-labelledby', title.id);
    flyout.appendChild(title);
    // Split items list their own page first, so the flyout still reaches it in one click.
    const links = Array.from(sub.querySelectorAll('a, button'));
    if (parentLink) links.unshift(parentLink);
    links.forEach((link) => {
      const clone = link.cloneNode(true);
      clone.classList.remove('vt-nav-sub', 'vt-nav-item');
      clone.classList.add('vt-flyout-item');
      if (link === parentLink) clone.classList.add('vt-flyout-item--parent');
      clone.removeAttribute('aria-label');
      clone.removeAttribute('id');
      clone.addEventListener('click', () => {
        // Forward to the real link so app routers and aria-current stay in one place.
        if (clone.tagName === 'BUTTON') link.click();
        closeFlyout();
      });
      flyout.appendChild(clone);
    });
    document.body.appendChild(flyout);
    const r = owner.getBoundingClientRect();
    flyout.style.left = `${Math.round(r.right + 8)}px`;
    flyout.style.top = `${Math.round(Math.min(r.top, window.innerHeight - flyout.offsetHeight - 8))}px`;
    flyoutOwner = owner;
    owner.setAttribute('aria-expanded', 'true');
    const first = flyout.querySelector('.vt-flyout-item');
    if (first) first.focus();
  }

  on(sidebar, 'click', (e) => {
    const t = e.target instanceof Element ? e.target : null;
    if (!t) return;

    // Collapsible section label.
    const sectionBtn = t.closest('button.vt-nav-label[aria-controls]');
    if (sectionBtn) {
      const group = document.getElementById(sectionBtn.getAttribute('aria-controls'));
      const open = sectionBtn.getAttribute('aria-expanded') !== 'false';
      sectionBtn.setAttribute('aria-expanded', String(!open));
      if (group) group.hidden = open;
      return;
    }

    // Split item chevron: opens the sub-items inline. The label link next to it navigates as usual.
    const expander = t.closest('.vt-nav-expander[aria-controls]');
    if (expander) {
      const sub = document.getElementById(expander.getAttribute('aria-controls'));
      if (!sub) return;
      e.preventDefault();
      const open = expander.getAttribute('aria-expanded') === 'true';
      expander.setAttribute('aria-expanded', String(!open));
      sub.hidden = open;
      return;
    }

    // Split item link while collapsed: the chevron is hidden, so the icon opens a flyout
    // that lists the page itself first, then its sub-items.
    const splitLink = t.closest('.vt-nav-split > .vt-nav-item');
    if (splitLink && collapsedDesktop()) {
      const btn = splitLink.parentElement.querySelector('.vt-nav-expander[aria-controls]');
      const sub = btn && document.getElementById(btn.getAttribute('aria-controls'));
      if (sub) {
        e.preventDefault();
        flyoutOwner === splitLink ? closeFlyout() : openFlyout(splitLink, sub, splitLink);
        return;
      }
    }

    // Parent item with sub-items.
    const parent = t.closest('.vt-nav-item[aria-controls]');
    if (parent) {
      const sub = document.getElementById(parent.getAttribute('aria-controls'));
      if (!sub) return;
      e.preventDefault();
      if (collapsedDesktop()) {
        flyoutOwner === parent ? closeFlyout() : openFlyout(parent, sub);
      } else {
        const open = parent.getAttribute('aria-expanded') === 'true';
        parent.setAttribute('aria-expanded', String(!open));
        parent.setAttribute('data-vt-inline-expanded', String(!open));
        sub.hidden = open;
      }
      return;
    }

    // Navigating closes the drawer.
    if (t.closest('a[href]') && isMobile()) closeDrawer({ restoreFocus: false });
  });

  on(document, 'click', (e) => {
    if (flyout && !flyout.contains(e.target) && !(flyoutOwner && flyoutOwner.contains(e.target))) closeFlyout();
    if (flyout && e.target instanceof Element && e.target.closest('.vt-flyout a[href]')) closeFlyout();
  });

  toggles.forEach((t) => on(t, 'click', (e) => { e.preventDefault(); hideTip(); toggle(); }));
  on(backdrop, 'click', () => closeDrawer());

  on(document, 'keydown', (e) => {
    if (e.key === 'Escape') {
      if (flyout) { closeFlyout({ restoreFocus: true }); return; }
      if (drawerOpen()) { closeDrawer(); return; }
      hideTip();
      return;
    }
    if (e.key === '[' && options.shortcut !== false && !e.ctrlKey && !e.metaKey && !e.altKey && !isEditable(document.activeElement)) {
      e.preventDefault();
      toggle();
    }
  });

  // Screen-size changes.
  const onMobileChange = () => { closeFlyout(); hideTip(); if (!isMobile()) closeDrawer({ restoreFocus: false }); emit(); };
  const onWideChange = () => { if (!readSaved(appId)) setState(wideMq.matches ? 'expanded' : 'collapsed', { persist: false }); };
  mobileMq.addEventListener('change', onMobileChange);
  wideMq.addEventListener('change', onWideChange);
  cleanups.push(() => mobileMq.removeEventListener('change', onMobileChange));
  cleanups.push(() => wideMq.removeEventListener('change', onWideChange));
  on(window, 'scroll', () => { hideTip(); closeFlyout(); }, { passive: true, capture: true });

  // Initial state: the no-flash snippet normally set this already.
  if (!root.hasAttribute('data-sidebar')) {
    root.setAttribute('data-sidebar', readSaved(appId) || (wideMq.matches ? 'expanded' : 'collapsed'));
  }
  emit();

  return {
    collapse: () => setState('collapsed'),
    expand: () => setState('expanded'),
    toggle,
    openDrawer,
    closeDrawer,
    state,
    destroy: () => { cleanups.forEach((fn) => fn()); closeFlyout(); hideTip(); },
  };
}

export default initSidebar;
