/* Front-end demo navigation only. This is not server-side authentication. */
(() => {
  'use strict';
  const script = document.currentScript;
  const loginURL = new URL('./', script.src);
  const cmsURL = new URL('../', script.src);
  cmsURL.searchParams.set('v', '14.6.0');
  const key = 'rr-cms-demo-session:' + cmsURL.pathname;
  const hasSession = () => {
    try { return sessionStorage.getItem(key) === 'active'; }
    catch { return false; }
  };
  const start = () => {
    try { sessionStorage.setItem(key, 'active'); return hasSession(); }
    catch { return false; }
  };
  const enter = () => {
    const target = new URL(cmsURL);
    const view = new URL(location.href).searchParams.get('view');
    if (view?.startsWith('#')) target.hash = view;
    location.replace(target.href);
  };
  const logout = () => {
    try { sessionStorage.removeItem(key); } catch {}
    location.replace(loginURL.href);
  };
  const enforce = () => {
    if (hasSession()) document.documentElement.removeAttribute('data-demo-session-pending');
    else {
      document.documentElement.setAttribute('data-demo-session-pending', '');
      const target = new URL(loginURL);
      if (location.hash) target.searchParams.set('view', location.hash);
      location.replace(target.href);
    }
  };
  window.RRDemoSession = Object.freeze({ hasSession, start, enter, logout });
  if (script.dataset.page === 'cms') {
    enforce();
    window.addEventListener('pageshow', enforce);
    window.addEventListener('pagehide', () => document.documentElement.setAttribute('data-demo-session-pending', ''));
  }
})();
