/* ============================================================
   AUTH — Login, session management, role detection
   ============================================================ */

const Auth = (() => {
  const SESSION_KEY = 'att_session';

  function saveSession(user) {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify({
      uid: user.uid, role: user.role, name: user.name,
      email: user.email, photo: user.photo,
      batchId: user.batchId, rollNo: user.rollNo,
      assignedBatches: user.assignedBatches || [],
      loginAt: Date.now(),
    }));
  }

  function getSession() {
    try {
      const s = sessionStorage.getItem(SESSION_KEY);
      return s ? JSON.parse(s) : null;
    } catch { return null; }
  }

  function clearSession() {
    sessionStorage.removeItem(SESSION_KEY);
  }

  async function login(email, password) {
    // Authenticate with Express API
    const data = await window.AppAPI.fetch('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });

    // Save JWT token in localStorage
    window.AppAPI.saveToken(data.token);

    // Save user details in sessionStorage matching original schema
    const user = {
      uid: data.user.id,
      role: data.user.role,
      name: data.user.name,
      email: data.user.email,
      photo: data.user.photo || null,
      batchId: data.user.batchId || null,
      rollNo: data.user.rollNo || null,
      assignedBatches: data.user.assignedBatches || [],
      loginAt: Date.now()
    };
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(user));

    // Sync IndexedDB cache with current MongoDB state
    if (window.Store) {
      await window.Store.fetchAndCacheData().catch(err => {
        console.warn('Initial IndexedDB caching failed:', err);
      });
    }

    return user;
  }

  function logout() {
    clearSession();
    window.AppAPI.saveToken(null);
    window.Router.go('login');
  }

  function requireAuth() {
    const session = getSession();
    if (!session) {
      window.Router.go('login');
      return null;
    }
    return session;
  }

  return { login, logout, getSession, requireAuth, saveSession, clearSession };
})();

window.Auth = Auth;
