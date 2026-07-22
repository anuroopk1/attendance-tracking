/* ============================================================
   SWIPE ENGINE — Physics-based drag, four-direction detection
   ============================================================ */

const SwipeEngine = (() => {

  // Config
  const THRESHOLD_X    = 100;   // px to trigger left/right
  const THRESHOLD_Y    = 90;    // px to trigger up/down
  const VELOCITY_MIN   = 0.3;   // px/ms minimum swipe velocity
  const MAX_ROTATION   = 18;    // degrees
  const BACK_CARDS     = 2;     // cards behind top

  let card        = null;
  let overlays    = {};
  let onSwipeCb   = null;
  let onNoneCb    = null;

  // Drag state
  let startX = 0, startY = 0;
  let lastX  = 0, lastY  = 0;
  let startT = 0;
  let isDragging = false;

  // ── Attach to a card element ──────────────────────────────
  function attach(cardEl, { onSwipe, onNone } = {}) {
    card      = cardEl;
    onSwipeCb = onSwipe;
    onNoneCb  = onNone;

    overlays  = {
      present: cardEl.querySelector('.overlay-present'),
      absent:  cardEl.querySelector('.overlay-absent')
    };

    // Pointer events (unified touch + mouse)
    cardEl.addEventListener('pointerdown',  onPointerDown, { passive: false });
    cardEl.addEventListener('pointermove',  onPointerMove, { passive: false });
    cardEl.addEventListener('pointerup',    onPointerUp,   { passive: false });
    cardEl.addEventListener('pointercancel',onPointerUp,   { passive: false });
  }

  function detach() {
    if (!card) return;
    card.removeEventListener('pointerdown',  onPointerDown);
    card.removeEventListener('pointermove',  onPointerMove);
    card.removeEventListener('pointerup',    onPointerUp);
    card.removeEventListener('pointercancel',onPointerUp);
    card = null;
  }

  // ── Pointer handlers ──────────────────────────────────────
  function onPointerDown(e) {
    if (e.button !== undefined && e.button !== 0) return;
    card.setPointerCapture(e.pointerId);
    isDragging = true;
    startX = lastX = e.clientX;
    startY = lastY = e.clientY;
    startT = e.timeStamp;
    card.style.transition = 'none';
    e.preventDefault();
  }

  function onPointerMove(e) {
    if (!isDragging) return;
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;
    lastX = e.clientX;
    lastY = e.clientY;

    applyDrag(dx, dy);
    updateOverlays(dx, dy);
    e.preventDefault();
  }

  function onPointerUp(e) {
    if (!isDragging) return;
    isDragging = false;

    const dx = e.clientX - startX;
    const dy = e.clientY - startY;
    const dt = e.timeStamp - startT;
    const vx = Math.abs(dx) / dt;
    const vy = Math.abs(dy) / dt;

    const dir = getDirection(dx, dy, vx, vy);

    hideAllOverlays();

    if (dir) {
      flyOff(dir);
    } else {
      springBack();
      onNoneCb?.();
    }
  }

  // ── Direction logic ───────────────────────────────────────
  function getDirection(dx, dy, vx, vy) {
    const absDx = Math.abs(dx);
    const absDy = Math.abs(dy);

    // Prefer axis with larger displacement
    if (absDx > absDy) {
      // Horizontal
      if (absDx > THRESHOLD_X || vx > VELOCITY_MIN) {
        return dx > 0 ? 'right' : 'left';
      }
    }
    return null;
  }

  // ── Visual drag transform ─────────────────────────────────
  function applyDrag(dx, dy) {
    const rot = Utils.clamp((dx / window.innerWidth) * MAX_ROTATION, -MAX_ROTATION, MAX_ROTATION);
    card.style.transform = `translate(${dx}px, ${dy}px) rotate(${rot}deg)`;
  }

  // ── Overlay fading ────────────────────────────────────────
  function updateOverlays(dx, dy) {
    const absDx = Math.abs(dx);
    const absDy = Math.abs(dy);

    hideAllOverlays();

    let dir = null;
    let intensity = 0;

    if (absDx > absDy && absDx > 20) {
      dir = dx > 0 ? 'present' : 'absent';
      intensity = Utils.clamp(absDx / THRESHOLD_X, 0, 1);
    }

    if (dir && overlays[dir]) {
      overlays[dir].style.opacity = intensity;
      // Haptic at threshold
      if (intensity >= 0.95) Utils.hapticLight();
    }
  }

  function hideAllOverlays() {
    Object.values(overlays).forEach(el => { if (el) el.style.opacity = '0'; });
  }

  // ── Spring back ───────────────────────────────────────────
  function springBack() {
    card.style.transition = 'transform 0.45s cubic-bezier(0.34,1.56,0.64,1)';
    card.style.transform  = 'translate(0,0) rotate(0deg)';
    hideAllOverlays();
  }

  // ── Fly off ───────────────────────────────────────────────
  function flyOff(dir) {
    const dirMap = { right: 'present', left: 'absent' };
    const status = dirMap[dir];

    // Show full overlay
    if (overlays[status]) overlays[status].style.opacity = '1';

    // Apply fly animation
    const flyMap = { right: 'fly-right', left: 'fly-left', up: 'fly-up', down: 'fly-down' };
    card.style.transition = 'none';
    card.classList.add(flyMap[dir]);

    // Haptic + callback
    Utils.hapticMedium();
    setTimeout(() => {
      onSwipeCb?.(status, dir);
    }, 150);
  }

  // ── Stack update utility ──────────────────────────────────
  function updateStack(cards) {
    cards.forEach((c, i) => {
      c.classList.remove('is-top', 'stack-1', 'stack-2');
      if (i === 0) c.classList.add('is-top');
      else if (i === 1) c.classList.add('stack-1');
      else if (i === 2) c.classList.add('stack-2');
    });
  }

  return { attach, detach, updateStack };
})();

window.SwipeEngine = SwipeEngine;
