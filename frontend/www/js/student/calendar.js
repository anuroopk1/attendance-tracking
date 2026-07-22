/* ============================================================
   STUDENT CALENDAR — Monthly heatmap attendance view
   ============================================================ */

function renderStudentCalendar(container, params) {
  const user = Auth.requireAuth();
  if (!user) return;

  const studentId = user.uid === 'student1' ? 'b1s001' : user.uid;
  const student   = MockDB.getStudent(studentId) || MockDB.getStudent('b1s001');
  if (!student) { Router.go('login'); return; }

  const now    = new Date();
  let year     = parseInt(params.year  || now.getFullYear());
  let month    = parseInt(params.month || now.getMonth()); // 0-indexed

  function buildCalendarMonth() {
    const { days, firstDay } = Utils.getMonthDates(year, month);
    const monthName = new Date(year, month, 1).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });

    // Gather records for this month
    const dayStatus = {};
    for (let d = 1; d <= days; d++) {
      const dateStr = Utils.padDate(year, month, d);
      const rec = MockDB.attendance[`${student.batchId}_${dateStr}_${student.id}`];
      if (rec) dayStatus[d] = rec.status;
      else if (Utils.isWeekend(year, month, d)) dayStatus[d] = 'weekend';
      else if (Utils.isFuture(year, month, d)) dayStatus[d] = 'future';
    }

    // Count for this month
    const monthCounts = { present:0, absent:0, late:0, leave:0 };
    Object.values(dayStatus).forEach(s => { if (monthCounts[s] !== undefined) monthCounts[s]++; });
    const monthTotal   = monthCounts.present + monthCounts.absent + monthCounts.late + monthCounts.leave;
    const monthAttended = monthCounts.present + monthCounts.late;
    const monthPct      = monthTotal ? Math.round((monthAttended / monthTotal) * 100) : 0;

    // Grid cells
    const dayNames = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
    let cells = '';
    // Empty cells before first day
    for (let i = 0; i < firstDay; i++) cells += '<div></div>';
    for (let d = 1; d <= days; d++) {
      const s = dayStatus[d];
      const isToday = Utils.isToday(year, month, d);
      let cls = 'cal-day';
      if (s === 'present') cls += ' present';
      else if (s === 'absent') cls += ' absent';
      else if (s === 'late') cls += ' late';
      else if (s === 'leave') cls += ' leave';
      else if (s === 'weekend') cls += ' holiday';
      else if (s === 'future') cls += ' future';
      if (isToday) cls += ' today';
      cells += `<div class="${cls}" data-day="${d}">${d}</div>`;
    }

    return { monthName, cells, dayNames, monthCounts, monthPct, monthTotal, monthAttended };
  }

  function render() {
    const { monthName, cells, dayNames, monthCounts, monthPct, monthTotal, monthAttended } = buildCalendarMonth();

    container.innerHTML = `
      <div style="display:flex;flex-direction:column;height:100dvh;background:var(--md-background)">
        <div class="top-bar">
          <button class="icon-btn" id="back-btn">←</button>
          <span class="top-bar-title">📅 Attendance Calendar</span>
        </div>

        <div class="scroll-area" style="flex:1">

          <!-- Month navigation -->
          <div style="display:flex;align-items:center;justify-content:space-between;padding:16px 16px 8px">
            <button class="icon-btn" id="prev-month" style="background:var(--md-surface-variant)">◀</button>
            <div style="text-align:center">
              <div style="font:700 20px 'Outfit',sans-serif;color:var(--md-on-surface)">${monthName}</div>
              <div style="font:600 13px 'Inter',sans-serif;color:${monthPct >= 75 ? 'var(--status-present)' : 'var(--status-absent)'}">
                ${monthPct}% — ${monthAttended}/${monthTotal} days attended
              </div>
            </div>
            <button class="icon-btn" id="next-month" style="background:var(--md-surface-variant)">▶</button>
          </div>

          <!-- Month stat pills -->
          <div style="display:flex;gap:8px;padding:0 16px;overflow-x:auto;scrollbar-width:none;padding-bottom:4px">
            <span class="chip chip-present">✅ ${monthCounts.present} Present</span>
            <span class="chip chip-absent">❌ ${monthCounts.absent} Absent</span>
            <span class="chip chip-late">🕐 ${monthCounts.late} Late</span>
            <span class="chip chip-leave">📝 ${monthCounts.leave} Leave</span>
          </div>

          <!-- Calendar grid -->
          <div class="calendar-grid" style="margin-top:12px">
            ${dayNames.map(d => `<div class="cal-day-header">${d[0]}</div>`).join('')}
            ${cells}
          </div>

          <!-- Legend -->
          <div style="padding:12px 16px;display:flex;gap:12px;flex-wrap:wrap">
            ${[
              {label:'Present', cls:'cal-day present', icon:'✅'},
              {label:'Absent',  cls:'cal-day absent',  icon:'❌'},
              {label:'Late',    cls:'cal-day late',    icon:'🕐'},
              {label:'Leave',   cls:'cal-day leave',   icon:'📝'},
              {label:'Holiday', cls:'cal-day holiday', icon:'🏖️'},
            ].map(l => `
              <div style="display:flex;align-items:center;gap:6px">
                <div class="${l.cls}" style="width:24px;height:24px;border-radius:6px;position:relative;font-size:0">&nbsp;</div>
                <span style="font:12px 'Inter',sans-serif;color:var(--md-on-surface-var)">${l.icon} ${l.label}</span>
              </div>
            `).join('')}
          </div>

          <!-- Daily detail panel (hidden) -->
          <div id="day-detail" style="margin:0 16px 16px;display:none;padding:14px 16px;background:var(--card-bg);border-radius:16px;box-shadow:var(--elev-2)"></div>

          <!-- Monthly progress bar -->
          <div style="margin:0 16px 24px;padding:16px;background:var(--card-bg);border-radius:20px;box-shadow:var(--elev-1)">
            <div style="font:700 15px 'Outfit',sans-serif;color:var(--md-on-surface);margin-bottom:12px">Monthly Progress</div>
            ${[
              {label:'Present', val: monthCounts.present,  total: monthTotal, color:'var(--status-present)'},
              {label:'Absent',  val: monthCounts.absent,   total: monthTotal, color:'var(--status-absent)'},
              {label:'Late',    val: monthCounts.late,     total: monthTotal, color:'var(--status-late)'},
              {label:'Leave',   val: monthCounts.leave,    total: monthTotal, color:'var(--status-leave)'},
            ].map(r => {
              const pct = r.total ? Math.round(r.val / r.total * 100) : 0;
              return `
                <div style="margin-bottom:10px">
                  <div style="display:flex;justify-content:space-between;margin-bottom:4px">
                    <span style="font:600 13px 'Inter',sans-serif;color:var(--md-on-surface)">${r.label}</span>
                    <span style="font:700 13px 'Inter',sans-serif;color:${r.color}">${r.val} days (${pct}%)</span>
                  </div>
                  <div class="progress-bar">
                    <div style="height:100%;width:${pct}%;background:${r.color};border-radius:99px;transition:width 1s cubic-bezier(0,0,0,1)"></div>
                  </div>
                </div>
              `;
            }).join('')}
          </div>

        </div>

        ${buildStudentBottomNav('student-calendar')}
      </div>
    `;

    // Events
    container.querySelector('#back-btn')?.addEventListener('click', () => Router.back());
    container.querySelector('#prev-month')?.addEventListener('click', () => {
      month--;
      if (month < 0) { month = 11; year--; }
      Router.go('student-calendar', { year, month });
    });
    container.querySelector('#next-month')?.addEventListener('click', () => {
      month++;
      if (month > 11) { month = 0; year++; }
      Router.go('student-calendar', { year, month });
    });

    // Day tap for detail
    container.querySelectorAll('.cal-day[data-day]').forEach(el => {
      el.addEventListener('click', () => {
        const d  = parseInt(el.dataset.day);
        const dateStr = Utils.padDate(year, month, d);
        const rec = MockDB.attendance[`${student.batchId}_${dateStr}_${student.id}`];
        const panel = container.querySelector('#day-detail');
        if (!panel) return;
        panel.style.display = 'block';
        const icons  = {present:'✅',absent:'❌',late:'🕐',leave:'📝'};
        const colors = {present:'var(--status-present)',absent:'var(--status-absent)',late:'var(--status-late)',leave:'var(--status-leave)'};
        panel.innerHTML = `
          <div style="display:flex;justify-content:space-between;align-items:center">
            <div>
              <div style="font:700 16px 'Outfit',sans-serif;color:var(--md-on-surface)">${Utils.formatDate(dateStr, {weekday:'long', month:'long', day:'numeric'})}</div>
              ${rec ? `
                <div style="font:600 14px 'Inter',sans-serif;color:${colors[rec.status]};margin-top:4px">${icons[rec.status]} ${rec.status.charAt(0).toUpperCase()+rec.status.slice(1)}</div>
                <div style="font:12px 'Inter',sans-serif;color:var(--md-on-surface-var);margin-top:2px">Marked at ${Utils.formatTime(rec.markedAt)}</div>
              ` : `<div style="font:14px 'Inter',sans-serif;color:var(--md-on-surface-var);margin-top:4px">No record for this day</div>`}
            </div>
            <button onclick="this.closest('#day-detail').style.display='none'" style="font-size:20px;background:none;border:none;cursor:pointer;color:var(--md-on-surface-var)">✕</button>
          </div>
        `;
        Utils.hapticLight();
      });
    });

    setupStudentBottomNav(container);
  }

  render();
}

window.renderStudentCalendar = renderStudentCalendar;
