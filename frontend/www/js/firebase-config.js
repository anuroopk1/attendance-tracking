/* ============================================================
   FIREBASE CONFIG — Demo Mode (no backend required)
   Replace with your Firebase config to connect to real backend
   ============================================================ */

// Set to false to use real Firebase
const DEMO_MODE = true;

// ── Firebase Config (replace with your project config) ────────
const firebaseConfig = {
  apiKey:            "YOUR_API_KEY",
  authDomain:        "YOUR_PROJECT.firebaseapp.com",
  projectId:         "YOUR_PROJECT_ID",
  storageBucket:     "YOUR_PROJECT.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId:             "YOUR_APP_ID"
};

// ── Firebase stub for demo mode ───────────────────────────────
let db = null;
let auth = null;
let isFirebaseReady = false;

async function initFirebase() {
  if (DEMO_MODE) {
    console.info('[Firebase] Running in DEMO mode — no backend required');
    isFirebaseReady = false;
    return;
  }
  try {
    const { initializeApp }       = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js');
    const { getFirestore }        = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
    const { getAuth }             = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js');
    const app = initializeApp(firebaseConfig);
    db   = getFirestore(app);
    auth = getAuth(app);
    isFirebaseReady = true;
    console.info('[Firebase] Initialized successfully');
  } catch (err) {
    console.error('[Firebase] Init failed, falling back to demo mode:', err);
    isFirebaseReady = false;
  }
}

window.AppFirebase = { initFirebase, get db() { return db; }, get auth() { return auth; }, get ready() { return isFirebaseReady; }, DEMO_MODE };
