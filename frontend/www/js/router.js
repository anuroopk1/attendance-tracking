/* ============================================================
   ROUTER — Hash-based SPA routing with transitions
   ============================================================ */

const Router = (() => {
  const routes = {};
  let currentPage = null;
  let currentId   = null;

  function register(id, renderFn) {
    routes[id] = renderFn;
  }

  function go(id, params = {}) {
    // Encode params into hash
    const query = Object.keys(params).length
      ? '?' + new URLSearchParams(params).toString()
      : '';
    window.location.hash = `#${id}${query}`;
  }

  function back() {
    window.history.back();
  }

  function parseHash() {
    const hash = window.location.hash.slice(1) || 'login';
    const [path, qs] = hash.split('?');
    const params = qs ? Object.fromEntries(new URLSearchParams(qs)) : {};
    return { id: path, params };
  }

  async function navigate(isBack = false) {
    const { id, params } = parseHash();
    if (!routes[id]) { go('login'); return; }

    const container = document.getElementById('page-container');
    const oldPage   = container.querySelector('.page.page-active');

    // Create new page div
    const newPage = document.createElement('div');
    newPage.className = `page ${isBack ? 'page-enter-back' : 'page-enter'}`;
    newPage.id = `page-${id}`;
    container.appendChild(newPage);

    // Render into new page
    await routes[id](newPage, params);

    // Force reflow
    newPage.getBoundingClientRect();

    // Animate in
    requestAnimationFrame(() => {
      if (oldPage) {
        oldPage.classList.replace('page-active', isBack ? 'page-exit-back' : 'page-exit');
        oldPage.addEventListener('transitionend', () => oldPage.remove(), { once: true });
        setTimeout(() => { if (oldPage.parentNode) oldPage.remove(); }, 600);
      }
      newPage.classList.replace(
        isBack ? 'page-enter-back' : 'page-enter',
        'page-active'
      );
    });

    currentId = id;
  }

  let isBack = false;
  window.addEventListener('popstate', () => {
    isBack = true;
    navigate(true).then(() => { isBack = false; });
  });
  window.addEventListener('hashchange', () => {
    if (!isBack) navigate(false);
  });

  function init() {
    navigate(false);
  }

  function reload() {
    navigate(false);
  }

  return { register, go, back, init, reload, get current() { return currentId; } };
})();

window.Router = Router;
