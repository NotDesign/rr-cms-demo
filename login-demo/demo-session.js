/* Front-end demo navigation only. This is not server-side authentication. */
(() => {
  'use strict';
  const version = '14.6.14';
  const script = document.currentScript;
  const localFile = new URL(location.href).protocol === 'file:';
  const scriptURL = localFile ? 'https://notdesign.github.io/rr-cms-demo/login-demo/demo-session.js' : script.src;
  const loginURL = new URL('./', scriptURL);
  const cmsURL = new URL('../', scriptURL);
  loginURL.searchParams.set('v', version);
  cmsURL.searchParams.set('v', version);
  const key = 'rr-cms-demo-session:' + cmsURL.pathname;
  const hasSession = () => {
    if (localFile) return false;
    try { return sessionStorage.getItem(key) === 'active'; }
    catch { return false; }
  };
  const start = () => {
    if (localFile) return false;
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
  window.RRDemoSession = Object.freeze({ version, hasSession, start, enter, logout });
  // Local file URLs cannot run the CMS module/fetch flow reliably. Use the published site.
  if (localFile) {
    const view = script.dataset.page === 'cms' ? location.hash : new URL(location.href).searchParams.get('view');
    if (view?.startsWith('#')) loginURL.searchParams.set('view', view);
    location.replace(loginURL.href);
    return;
  }
  if (script.dataset.page === 'cms') {
    enforce();
    window.addEventListener('pageshow', enforce);
    window.addEventListener('pagehide', () => document.documentElement.setAttribute('data-demo-session-pending', ''));
  }
})();
