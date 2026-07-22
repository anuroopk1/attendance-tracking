/* ============================================================
   STUDENT DASHBOARD — Plain, clean layout
   ============================================================ */

function renderStudentDashboard(container, params) {
  const user = Auth.requireAuth();
  if (!user) return;

  const studentId = user.uid === 'student1' ? 'b1s001' : user.uid;
  const student   = MockDB.getStudent(studentId) || MockDB.getStudent('b1s001');
  if (!student) { Router.go('login'); return; }

  const batch = MockDB.getBatch(student.batchId);
  const stats = MockDB.getStudentStats(student.id);
  const pct   = stats?.percentage || 0;
  const pctColor = pct >= 75 ? 'var(--status-present)' : pct >= 60 ? 'var(--status-late)' : 'var(--status-absent)';

  // Streak
  const today = new Date();
  let streak = 0;
  for (let d = 1; d <= 60; d++) {
    const dt = new Date(today); dt.setDate(dt.getDate() - d);
    if (dt.getDay() === 0 || dt.getDay() === 6) continue;
    const dateStr = dt.toISOString().split('T')[0];
    const rec = MockDB.attendance[`${student.batchId}_${dateStr}_${student.id}`];
    if (rec && (rec.status === 'present' || rec.status === 'late')) streak++;
    else break;
  }

  // Recent 5 weekdays
  const recentDays = [];
  for (let d = 7; d >= 1 && recentDays.length < 5; d--) {
    const dt = new Date(today); dt.setDate(dt.getDate() - d);
    if (dt.getDay() === 0 || dt.getDay() === 6) continue;
    const dateStr = dt.toISOString().split('T')[0];
    const rec = MockDB.attendance[`${student.batchId}_${dateStr}_${student.id}`];
    recentDays.push({ date: dt, status: rec?.status || null });
  }

  container.innerHTML = `
    <div style="display:flex;flex-direction:column;height:100dvh;background:var(--md-background)">

      <!-- Top bar -->
      <div class="top-bar">
        <div style="flex:1">
          <div style="font-size:11px;font-weight:600;color:var(--md-on-surface-var);text-transform:uppercase;letter-spacing:0.4px">Student</div>
          <div style="font-size:16px;font-weight:700;color:var(--md-on-surface)">${student.name}</div>
        </div>
        <button class="icon-btn" id="theme-btn">🌙</button>
        <button class="icon-btn" id="logout-btn">🚪</button>
      </div>

      <div class="scroll-area" style="flex:1">

        <!-- Attendance overview card -->
        <div style="margin:14px 16px 0;padding:18px;background:var(--md-surface);border:1px solid var(--md-outline-variant);border-radius:16px">
          <div style="display:flex;align-items:center;gap:16px">
            ${Utils.buildProgressRing(pct, {
              size: 100, stroke: 10,
              color: pctColor,
              trackColor: 'var(--md-surface-variant)',
              label: pct + '%',
              subLabel: 'attended',
            })}
            <div style="flex:1">
              <div style="font-size:16px;font-weight:700;color:var(--md-on-surface)">Overall Attendance</div>
              <div style="font-size:12px;color:var(--md-on-surface-var);margin-top:3px">${student.rollNo} · ${batch?.name || ''}</div>
              <div style="margin-top:10px;display:flex;gap:8px;flex-wrap:wrap">
                <span style="font-size:12px;font-weight:600;color:${pctColor}">${pct >= 75 ? '✅ On track' : '⚠️ Below 75%'}</span>
                ${streak > 0 ? `<span style="font-size:12px;color:var(--md-on-surface-var)">🔥 ${streak}d streak</span>` : ''}
              </div>
            </div>
          </div>
          ${pct < 75 ? `
          <div style="margin-top:12px;padding:8px 12px;background:var(--status-absent-bg);border-radius:8px;font-size:12px;color:var(--status-absent)">
            ⚠️ Need ${75 - pct}% more to meet the 75% minimum requirement for exams
          </div>` : ''}
        </div>

        <!-- Stats row -->
        <div class="stat-grid">
          ${['present','absent','late','leave'].map(s => {
            const icons  = {present:'✅',absent:'❌',late:'🕐',leave:'📝'};
            const colors = {present:'var(--status-present)',absent:'var(--status-absent)',late:'var(--status-late)',leave:'var(--status-leave)'};
            const bgs    = {present:'var(--status-present-bg)',absent:'var(--status-absent-bg)',late:'var(--status-late-bg)',leave:'var(--status-leave-bg)'};
            return `
              <div style="background:${bgs[s]};border-radius:12px;padding:10px 6px;text-align:center">
                <div style="font-size:18px">${icons[s]}</div>
                <div style="font-size:20px;font-weight:700;color:${colors[s]};margin-top:3px">${stats?.[s] || 0}</div>
                <div style="font-size:10px;color:${colors[s]};margin-top:1px;text-transform:capitalize">${s}</div>
              </div>
            `;
          }).join('')}
        </div>

        <!-- Recent days -->
        <div class="section-header" style="margin-top:4px">
          <span class="section-title">Recent Days</span>
          <span class="section-action" id="view-calendar">Calendar →</span>
        </div>
        <div style="padding:0 16px;display:flex;gap:8px">
          ${recentDays.map(d => {
            const day = d.date.toLocaleDateString('en', {weekday:'short'});
            const dt  = d.date.getDate();
            const s   = d.status;
            const bgs   = {present:'var(--status-present-bg)',absent:'var(--status-absent-bg)',late:'var(--status-late-bg)',leave:'var(--status-leave-bg)'};
            const colors= {present:'var(--status-present)',absent:'var(--status-absent)',late:'var(--status-late)',leave:'var(--status-leave)'};
            const icons = {present:'✅',absent:'❌',late:'🕐',leave:'📝'};
            return `
              <div style="display:flex;flex-direction:column;align-items:center;gap:4px;flex:1">
                <div style="font-size:10px;font-weight:600;color:var(--md-on-surface-var);text-transform:uppercase">${day}</div>
                <div style="width:34px;height:34px;border-radius:8px;background:${s ? bgs[s] : 'var(--md-surface-variant)'};display:flex;align-items:center;justify-content:center;font-size:${s ? 14 : 12}px;border:1px solid ${s ? 'transparent' : 'var(--md-outline-variant)'}">
                  ${s ? icons[s] : dt}
                </div>
              </div>
            `;
          }).join('')}
        </div>

        <!-- Navigation -->
        <div class="section-header" style="margin-top:8px">
          <span class="section-title">More</span>
        </div>
        <div style="padding:0 16px 24px;display:flex;flex-direction:column;gap:6px">
          ${[
            { icon:'📅', label:'Monthly Calendar',    sub:'Full heatmap view',          route:'student-calendar' },
            { icon:'📚', label:'By Subject',           sub:'Subject-wise breakdown',     route:'student-subjects' },
            { icon:'📋', label:'Attendance History',   sub:'Full log with filters',      route:'student-history' },
          ].map(item => `
            <div class="card interactive" data-route="${item.route}" style="padding:12px 14px">
              <div style="display:flex;align-items:center;gap:12px">
                <span style="font-size:24px">${item.icon}</span>
                <div style="flex:1">
                  <div style="font-size:14px;font-weight:600;color:var(--md-on-surface)">${item.label}</div>
                  <div style="font-size:12px;color:var(--md-on-surface-var);margin-top:1px">${item.sub}</div>
                </div>
                <span style="color:var(--md-on-surface-var);font-size:16px">›</span>
              </div>
            </div>
          `).join('')}
        </div>

      </div>

      ${buildStudentBottomNav('student-dashboard')}
    </div>
  `;

  container.querySelector('#logout-btn')?.addEventListener('click', () => Auth.logout());
  container.querySelector('#theme-btn')?.addEventListener('click', toggleTheme);
  container.querySelector('#view-calendar')?.addEventListener('click', () => Router.go('student-calendar'));

  container.querySelectorAll('[data-route]').forEach(el => {
    el.addEventListener('click', () => Router.go(el.dataset.route));
  });

  setupStudentBottomNav(container);
}

function buildStudentBottomNav(active) {
  const items = [
    { id: 'student-dashboard', icon: '🏠', label: 'Home',     route: 'student-dashboard' },
    { id: 'student-calendar',  icon: '📅', label: 'Calendar', route: 'student-calendar'  },
    { id: 'student-subjects',  icon: '📚', label: 'Subjects', route: 'student-subjects'  },
    { id: 'student-history',   icon: '📋', label: 'History',  route: 'student-history'   },
  ];
  return `
    <nav class="bottom-nav">
      ${items.map(it => `
        <button class="nav-item ${it.id === active ? 'active' : ''}" data-route="${it.route}">
          <div class="nav-indicator"></div>
          <span class="nav-icon">${it.icon}</span>
          <span class="nav-label">${it.label}</span>
        </button>
      `).join('')}
    </nav>
  `;
}

function setupStudentBottomNav(container) {
  container.querySelectorAll('.nav-item[data-route]').forEach(btn => {
    btn.addEventListener('click', () => Router.go(btn.dataset.route));
  });
}

window.renderStudentDashboard = renderStudentDashboard;
window.buildStudentBottomNav  = buildStudentBottomNav;
window.setupStudentBottomNav  = setupStudentBottomNav;
