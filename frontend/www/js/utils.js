/* ============================================================
   UTILS — Date helpers, haptic, toast, formatting, export
   ============================================================ */

const Utils = (() => {

  // ── Date ───────────────────────────────────────────────────
  function today() {
    return new Date().toISOString().split('T')[0];
  }

  function formatDate(dateStr, opts = { month: 'long', day: 'numeric', year: 'numeric' }) {
    return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-IN', opts);
  }

  function formatTime(isoStr) {
    return new Date(isoStr).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  }

  function daysInMonth(year, month) {
    return new Date(year, month + 1, 0).getDate();
  }

  function firstDayOfMonth(year, month) {
    return new Date(year, month, 1).getDay();
  }

  function getMonthDates(year, month) {
    const days  = daysInMonth(year, month);
    const first = firstDayOfMonth(year, month);
    return { days, firstDay: first };
  }

  function isWeekend(year, month, day) {
    const d = new Date(year, month, day).getDay();
    return d === 0 || d === 6;
  }

  function isFuture(year, month, day) {
    const d = new Date(year, month, day);
    return d > new Date();
  }

  function isToday(year, month, day) {
    const t = new Date();
    return t.getFullYear() === year && t.getMonth() === month && t.getDate() === day;
  }

  function padDate(year, month, day) {
    return `${year}-${String(month+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
  }

  // ── Haptic ────────────────────────────────────────────────
  function haptic(pattern = [10]) {
    if (navigator.vibrate) navigator.vibrate(pattern);
  }
  function hapticLight()  { haptic([8]); }
  function hapticMedium() { haptic([20]); }
  function hapticHeavy()  { haptic([40]); }
  function hapticSuccess(){ haptic([10, 50, 10]); }
  function hapticError()  { haptic([30, 20, 30]); }

  // ── Toast ─────────────────────────────────────────────────
  let toastTimer = null;
  function toast(message, { action, onAction, duration = 3000, icon = '' } = {}) {
    const container = document.getElementById('toast-container');
    if (!container) return;

    // Remove existing
    const old = container.querySelector('.toast');
    if (old) {
      old.classList.add('toast-exit');
      setTimeout(() => old.remove(), 250);
    }
    if (toastTimer) clearTimeout(toastTimer);

    const el = document.createElement('div');
    el.className = 'toast fade-in';
    el.innerHTML = `
      ${icon ? `<span>${icon}</span>` : ''}
      <span style="flex:1">${message}</span>
      ${action ? `<span class="toast-action" id="toast-act">${action}</span>` : ''}
    `;
    container.appendChild(el);

    if (action && onAction) {
      el.querySelector('#toast-act')?.addEventListener('click', () => {
        onAction();
        el.classList.add('toast-exit');
        setTimeout(() => el.remove(), 250);
      });
    }

    toastTimer = setTimeout(() => {
      el.classList.add('toast-exit');
      setTimeout(() => el.remove(), 250);
    }, duration);
  }

  // ── Ripple ────────────────────────────────────────────────
  function addRipple(element) {
    element.addEventListener('pointerdown', (e) => {
      const rect  = element.getBoundingClientRect();
      const size  = Math.max(rect.width, rect.height) * 2;
      const x     = e.clientX - rect.left - size / 2;
      const y     = e.clientY - rect.top  - size / 2;
      const ripple = document.createElement('span');
      ripple.className = 'ripple-effect';
      ripple.style.cssText = `width:${size}px;height:${size}px;left:${x}px;top:${y}px`;
      element.appendChild(ripple);
      setTimeout(() => ripple.remove(), 700);
    });
  }

  // ── Number animation ──────────────────────────────────────
  function animateNumber(el, from, to, duration = 800, suffix = '') {
    const start = performance.now();
    function step(ts) {
      const progress = Math.min((ts - start) / duration, 1);
      const ease = 1 - Math.pow(1 - progress, 3); // ease-out cubic
      el.textContent = Math.round(from + (to - from) * ease) + suffix;
      if (progress < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  // ── SVG Progress Ring ─────────────────────────────────────
  function buildProgressRing(pct, { size = 120, stroke = 10, color = '#6750A4', trackColor = '#E7E0EC', label = '', subLabel = '' } = {}) {
    const r      = (size - stroke) / 2;
    const circ   = 2 * Math.PI * r;
    const offset = circ * (1 - pct / 100);
    return `
      <div class="progress-ring-wrap" style="width:${size}px;height:${size}px">
        <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
          <circle cx="${size/2}" cy="${size/2}" r="${r}"
            fill="none" stroke="${trackColor}" stroke-width="${stroke}"/>
          <circle cx="${size/2}" cy="${size/2}" r="${r}"
            fill="none" stroke="${color}" stroke-width="${stroke}"
            stroke-linecap="round"
            stroke-dasharray="${circ}"
            stroke-dashoffset="${offset}"
            class="ring-progress"
            style="transform:rotate(-90deg);transform-origin:50% 50%;transition:stroke-dashoffset 1.2s cubic-bezier(0,0,0,1)"/>
        </svg>
        <div class="progress-ring-label">
          <span style="font:700 ${size/4.5}px/1 'Outfit',sans-serif;color:var(--md-on-surface)">${label}</span>
          ${subLabel ? `<span style="font:12px 'Inter',sans-serif;color:var(--md-on-surface-var);margin-top:2px">${subLabel}</span>` : ''}
        </div>
      </div>`;
  }

  // ── Status helpers ────────────────────────────────────────
  const STATUS_ICONS   = { present: '✅', absent: '❌', late: '🕐', leave: '📝' };
  const STATUS_LABELS  = { present: 'Present', absent: 'Absent', late: 'Late', leave: 'Leave' };
  const STATUS_COLORS  = {
    present: 'var(--status-present)', absent: 'var(--status-absent)',
    late: 'var(--status-late)',       leave: 'var(--status-leave)'
  };

  function statusChip(status) {
    return `<span class="chip chip-${status}">${STATUS_ICONS[status] || ''} ${STATUS_LABELS[status] || status}</span>`;
  }

  // ── Avatar initials ───────────────────────────────────────
  function getInitials(name = '') {
    return name.split(' ').slice(0,2).map(w => w[0]).join('').toUpperCase();
  }

  // ── Format percentage ─────────────────────────────────────
  function pctClass(pct) {
    if (pct >= 75) return 'present';
    if (pct >= 60) return 'late';
    return 'absent';
  }

  // ── Debounce ──────────────────────────────────────────────
  function debounce(fn, ms = 300) {
    let timer;
    return (...args) => { clearTimeout(timer); timer = setTimeout(() => fn(...args), ms); };
  }

  // ── Clamp ────────────────────────────────────────────────
  function clamp(val, min, max) { return Math.min(Math.max(val, min), max); }

  // ── Excel export (uses SheetJS from CDN) ──────────────────
  async function exportToExcel(data, filename = 'attendance.xlsx') {
    if (!window.XLSX) {
      await loadScript('https://cdn.sheetjs.com/xlsx-0.20.0/package/dist/xlsx.full.min.js');
    }
    const ws = window.XLSX.utils.json_to_sheet(data);
    const wb = window.XLSX.utils.book_new();
    window.XLSX.utils.book_append_sheet(wb, ws, 'Attendance');
    window.XLSX.writeFile(wb, filename);
  }

  async function exportToPdf(title, headers, rows, filename = 'attendance.pdf') {
    if (!window.jspdf) {
      await loadScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js');
      await loadScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.5.31/jspdf.plugin.autotable.min.js');
    }
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    doc.setFont("helvetica");
    doc.setFontSize(16);
    doc.text(title, 14, 20);
    doc.setFontSize(9);
    doc.setTextColor(100);
    doc.text(`Generated on ${new Date().toLocaleDateString('en-IN')}`, 14, 26);
    
    doc.autoTable({
      head: [headers],
      body: rows,
      startY: 32,
      theme: 'striped',
      headStyles: { fillColor: [30, 64, 175] }, // Matches brand primary --primary: #1e40af
      styles: { fontSize: 9, cellPadding: 3 },
    });
    doc.save(filename);
  }

  function loadScript(src) {
    return new Promise((res, rej) => {
      const s  = document.createElement('script');
      s.src    = src;
      s.onload = res;
      s.onerror = rej;
      document.head.appendChild(s);
    });
  }

  // ── Generate avatar from initials ─────────────────────────
  function avatarEl(name, photo, size = 'md') {
    const ini  = getInitials(name);
    if (photo && !photo.startsWith('undefined')) {
      return `<img class="avatar avatar-${size}" src="${photo}" alt="${name}" onerror="this.outerHTML=this.outerHTML.replace('img','span').replace(/src=[^ >]*/,'').replace(/onerror=[^ >]*/,'')">`;
    }
    return `<span class="avatar avatar-${size}">${ini}</span>`;
  }

  return {
    today, formatDate, formatTime, daysInMonth, firstDayOfMonth,
    getMonthDates, isWeekend, isFuture, isToday, padDate,
    haptic, hapticLight, hapticMedium, hapticHeavy, hapticSuccess, hapticError,
    toast, addRipple, animateNumber, buildProgressRing,
    STATUS_ICONS, STATUS_LABELS, STATUS_COLORS,
    statusChip, getInitials, pctClass, debounce, clamp,
    exportToExcel, exportToPdf, loadScript, avatarEl,
  };
})();

window.Utils = Utils;
