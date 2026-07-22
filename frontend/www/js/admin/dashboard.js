/* ============================================================
   ADMIN DASHBOARD — Overview with key metrics
   ============================================================ */

function renderAdminDashboard(container) {
  const user = Auth.requireAuth();
  if (!user || user.role !== 'admin') { Router.go('login'); return; }

  const batches  = MockDB.batches;
  const students = Object.values(MockDB.students);
  const trainers = MockDB.getTrainers();
  const today    = Utils.today();

  // Today's overall rate
  let totalMarked = 0, totalPresent = 0;
  batches.forEach(b => {
    b.studentIds.forEach(sid => {
      const rec = MockDB.attendance[`${b.id}_${today}_${sid}`];
      if (rec) { totalMarked++; if (rec.status === 'present' || rec.status === 'late') totalPresent++; }
    });
  });
  const todayRate = totalMarked ? Math.round(totalPresent / totalMarked * 100) : 0;
  const batchesDone = batches.filter(b => {
    const s = MockDB.getAttendanceSummary(b.id, today);
    return s && (s.present + s.absent + s.late + s.leave) > 0;
  }).length;

  container.innerHTML = `
    <div class="page-wrap">

      <!-- Top bar -->
      <div class="top-bar">
        <div style="flex:1">
          <div style="font-size:11px;font-weight:600;color:var(--gray-500);letter-spacing:0.05em;text-transform:uppercase">Admin</div>
          <div style="font-size:15px;font-weight:700;color:var(--gray-900)">${user.name}</div>
        </div>
        <button id="theme-btn" class="icon-btn" title="Toggle theme">☀︎</button>
        <button id="logout-btn" class="icon-btn" title="Sign out">
          <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/></svg>
        </button>
      </div>

      <div class="scroll-area" style="flex:1">

        <!-- Date line -->
        <div style="padding:14px 16px 0">
          <div style="font-size:13px;color:var(--gray-500)">${new Date().toLocaleDateString('en-IN',{weekday:'long',day:'numeric',month:'long',year:'numeric'})}</div>
        </div>

        <!-- Key stats -->
        <div class="stat-grid">
          <div class="stat-card">
            <div class="stat-label">Total Batches</div>
            <div class="stat-value">${batches.length}</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">Total Students</div>
            <div class="stat-value">${students.length}</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">Today's Attendance Rate</div>
            <div class="stat-value" style="color:${todayRate >= 75 ? 'var(--status-present)' : todayRate > 0 ? 'var(--status-late)' : 'var(--gray-900)'}">${totalMarked > 0 ? todayRate + '%' : '—'}</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">Batches Marked Today</div>
            <div class="stat-value">${batchesDone} <span style="font-size:16px;color:var(--gray-400)">/ ${batches.length}</span></div>
          </div>
        </div>

        <!-- Today's batch status -->
        <div class="section-header" style="margin-top:4px">
          <span class="section-title">Today's Batch Status</span>
          <span class="section-action" id="go-reports">View Reports →</span>
        </div>

        <div style="padding:0 16px 8px;display:flex;flex-direction:column">
          <div style="background:var(--md-surface);border:var(--border);border-radius:var(--radius-lg);overflow:hidden">
            <table class="data-table" style="font-size:13px">
              <thead>
                <tr>
                  <th>Batch</th>
                  <th>Subject</th>
                  <th style="text-align:center">Students</th>
                  <th style="text-align:center">Status</th>
                </tr>
              </thead>
              <tbody>
                ${batches.map(b => {
                  const summary = MockDB.getAttendanceSummary(b.id, today);
                  const done    = summary && (summary.present + summary.absent + summary.late + summary.leave) > 0;
                  const rate    = done && b.studentIds.length
                    ? Math.round((summary.present + summary.late) / b.studentIds.length * 100) : 0;
                  return `
                    <tr style="cursor:pointer" class="batch-row" data-batch="${b.id}">
                      <td style="font-weight:600">${b.name}</td>
                      <td style="color:var(--gray-500)">${b.subject}</td>
                      <td style="text-align:center;color:var(--gray-600)">${b.studentIds.length}</td>
                      <td style="text-align:center">
                        ${done
                          ? `<span style="font-size:12px;font-weight:700;color:${rate>=75?'var(--status-present)':'var(--status-late)'}">${rate}%</span>`
                          : `<span style="font-size:11px;font-weight:600;color:var(--gray-400)">Pending</span>`
                        }
                      </td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          </div>
        </div>

        <!-- Trainers -->
        <div class="section-header">
          <span class="section-title">Trainers</span>
        </div>
        <div style="padding:0 16px 24px;display:flex;flex-direction:column;gap:6px">
          ${trainers.map(t => `
            <div style="background:var(--md-surface);border:var(--border);border-radius:var(--radius-md);padding:12px 14px;display:flex;align-items:center;gap:12px">
              <div style="width:38px;height:38px;border-radius:50%;background:var(--gray-100);display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:700;color:var(--gray-600);flex-shrink:0">
                ${Utils.getInitials(t.name)}
              </div>
              <div style="flex:1;min-width:0">
                <div style="font-size:14px;font-weight:600;color:var(--gray-900)">${t.name}</div>
                <div style="font-size:12px;color:var(--gray-500)">${t.email}</div>
              </div>
              <span style="font-size:11px;font-weight:600;padding:2px 8px;border-radius:9999px;background:var(--primary-light);color:var(--primary);border:1px solid var(--primary-border)">Trainer</span>
            </div>
          `).join('')}
        </div>

      </div>

      ${_adminNav('dashboard')}
    </div>
  `;

  container.querySelector('#logout-btn').addEventListener('click', () => Auth.logout());
  container.querySelector('#theme-btn').addEventListener('click', _toggleTheme);
  container.querySelector('#go-reports').addEventListener('click', () => Router.go('admin-reports'));
  container.querySelectorAll('.batch-row').forEach(row => {
    row.addEventListener('click', () => Router.go('admin-reports', { batchId: row.dataset.batch }));
  });
  _setupAdminNav(container);
}

/* ── Shared Admin Nav ─────────────────────────────────────── */
function _adminNav(active) {
  const items = [
    { id:'dashboard',      label:'Home',     icon:'🏠', route:'admin-dashboard'  },
    { id:'admin-batches',  label:'Batches',  icon:'📚', route:'admin-batches'    },
    { id:'admin-students', label:'Students', icon:'👥', route:'admin-students'   },
    { id:'admin-reports',  label:'Reports',  icon:'📊', route:'admin-reports'    },
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

function _setupAdminNav(container) {
  container.querySelectorAll('.nav-item[data-route]').forEach(btn => {
    btn.addEventListener('click', () => Router.go(btn.dataset.route));
  });
}

window.renderAdminDashboard = renderAdminDashboard;
window._adminNav            = _adminNav;
window._setupAdminNav       = _setupAdminNav;
