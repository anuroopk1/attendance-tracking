/* ============================================================
   STUDENT SUBJECTS — Subject-wise attendance breakdown
   ============================================================ */

function renderStudentSubjects(container, params) {
  const user = Auth.requireAuth();
  if (!user) return;

  const studentId = user.uid === 'student1' ? 'b1s001' : user.uid;
  const student   = MockDB.getStudent(studentId) || MockDB.getStudent('b1s001');
  if (!student) { Router.go('login'); return; }

  const batch = MockDB.getBatch(student.batchId);
  const stats = MockDB.getStudentStats(student.id);

  // Simulate subject-wise data (in a real app this would come from separate batch-subject records)
  const subjects = [
    { name: batch?.subject || 'Main Subject', code: 'CS101', total: stats?.total || 40, present: stats?.present || 0, late: stats?.late || 0 },
    { name: 'Mathematics', code: 'MA101', total: 38, present: Math.floor((stats?.present||0) * 0.9), late: 1 },
    { name: 'Physics Lab', code: 'PH102', total: 20, present: Math.floor((stats?.present||0) * 0.85), late: 0 },
    { name: 'Communication Skills', code: 'EN101', total: 30, present: Math.floor((stats?.present||0) * 0.95), late: 2 },
    { name: 'Workshop', code: 'WS101', total: 15, present: Math.floor((stats?.present||0) * 0.8), late: 0 },
  ].map(s => {
    const attended = s.present + s.late;
    return { ...s, attended, percentage: s.total ? Math.round((attended / s.total) * 100) : 0 };
  }).sort((a,b) => a.percentage - b.percentage);

  container.innerHTML = `
    <div style="display:flex;flex-direction:column;height:100dvh;background:var(--md-background)">
      <div class="top-bar">
        <button class="icon-btn" id="back-btn">←</button>
        <span class="top-bar-title">📚 Subject-wise Attendance</span>
      </div>

      <div class="scroll-area" style="flex:1;padding:0 0 16px">

        <!-- Overall ring -->
        <div style="display:flex;flex-direction:column;align-items:center;padding:24px 16px 16px;background:linear-gradient(180deg,var(--md-primary-container),var(--md-background))">
          ${Utils.buildProgressRing(stats?.percentage || 0, {
            size: 130, stroke: 12,
            color: (stats?.percentage||0) >= 75 ? 'var(--status-present)' : 'var(--status-absent)',
            trackColor: 'var(--md-surface-variant)',
            label: (stats?.percentage||0) + '%',
            subLabel: 'Overall',
          })}
          <div style="margin-top:12px;font:700 18px 'Outfit',sans-serif;color:var(--md-on-surface)">Overall Attendance</div>
          <div style="font:13px 'Inter',sans-serif;color:var(--md-on-surface-var);margin-top:4px">${student.name} · ${student.rollNo}</div>
        </div>

        <!-- Subject cards -->
        <div class="section-header">
          <span class="section-title">📖 Subjects</span>
          <span style="font:12px 'Inter',sans-serif;color:var(--md-on-surface-var)">${subjects.length} subjects</span>
        </div>

        <div style="padding:0 16px;display:flex;flex-direction:column;gap:12px">
          ${subjects.map(s => {
            const clr = s.percentage >= 75 ? 'var(--status-present)' : s.percentage >= 60 ? 'var(--status-late)' : 'var(--status-absent)';
            const bg  = s.percentage >= 75 ? 'var(--status-present-bg)' : s.percentage >= 60 ? 'var(--status-late-bg)' : 'var(--status-absent-bg)';
            const icon = s.percentage >= 75 ? '✅' : s.percentage >= 60 ? '⚠️' : '❌';
            return `
              <div class="card" style="padding:16px">
                <div style="display:flex;align-items:flex-start;gap:12px;margin-bottom:12px">
                  <div style="width:44px;height:44px;border-radius:12px;background:${bg};display:flex;align-items:center;justify-content:center;font-size:22px;flex-shrink:0">${icon}</div>
                  <div style="flex:1;min-width:0">
                    <div style="font:700 15px 'Inter',sans-serif;color:var(--md-on-surface)">${s.name}</div>
                    <div style="font:12px 'Inter',sans-serif;color:var(--md-on-surface-var);margin-top:2px">${s.code}</div>
                    <div style="display:flex;gap:8px;margin-top:6px;flex-wrap:wrap">
                      <span style="font:12px 'Inter',sans-serif;color:var(--md-on-surface-var)">📊 ${s.attended}/${s.total} classes</span>
                      ${s.late > 0 ? `<span style="font:12px 'Inter',sans-serif;color:var(--status-late)">🕐 ${s.late} late</span>` : ''}
                    </div>
                  </div>
                  <div style="flex-shrink:0;text-align:right">
                    <div style="font:700 22px/1 'Outfit',sans-serif;color:${clr}">${s.percentage}%</div>
                    <div style="font:11px 'Inter',sans-serif;color:var(--md-on-surface-var);margin-top:2px">attendance</div>
                  </div>
                </div>
                <div class="progress-bar" style="height:8px">
                  <div style="height:100%;width:${s.percentage}%;background:${clr};border-radius:99px;transition:width 1s cubic-bezier(0,0,0,1)"></div>
                </div>
                ${s.percentage < 75 ? `
                  <div style="margin-top:8px;font:12px 'Inter',sans-serif;color:var(--status-absent)">
                    ⚠️ Need ${s.total - s.attended} more classes to reach 75%
                  </div>
                ` : ''}
              </div>
            `;
          }).join('')}
        </div>

      </div>

      ${buildStudentBottomNav('student-subjects')}
    </div>
  `;

  container.querySelector('#back-btn')?.addEventListener('click', () => Router.back());
  setupStudentBottomNav(container);
}

/* ============================================================
   STUDENT HISTORY — Paginated attendance log
   ============================================================ */

function renderStudentHistory(container, params) {
  const user = Auth.requireAuth();
  if (!user) return;

  const studentId = user.uid === 'student1' ? 'b1s001' : user.uid;
  const student   = MockDB.getStudent(studentId) || MockDB.getStudent('b1s001');
  if (!student) { Router.go('login'); return; }

  // Get all attendance records for student, sorted by date desc
  const allRecords = Object.values(MockDB.attendance)
    .filter(r => r.studentId === student.id)
    .sort((a,b) => b.date.localeCompare(a.date));

  const PAGE_SIZE = 20;
  let page = 0;
  let filter = '';

  function getFiltered() {
    return filter ? allRecords.filter(r => r.status === filter) : allRecords;
  }

  function renderPage() {
    const filtered  = getFiltered();
    const pageData  = filtered.slice(0, (page + 1) * PAGE_SIZE);
    const hasMore   = filtered.length > pageData.length;

    const listEl = container.querySelector('#history-list');
    const moreEl = container.querySelector('#load-more');
    if (!listEl) return;

    // Group by month
    const grouped = {};
    pageData.forEach(r => {
      const key = r.date.slice(0,7); // YYYY-MM
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(r);
    });

    listEl.innerHTML = Object.entries(grouped).map(([month, records]) => {
      const dt = new Date(month + '-01');
      const label = dt.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
      return `
        <div style="margin-bottom:16px">
          <div style="font:700 14px 'Outfit',sans-serif;color:var(--md-on-surface-var);padding:4px 0 8px;text-transform:uppercase;letter-spacing:0.5px">${label}</div>
          <div style="display:flex;flex-direction:column;gap:6px">
            ${records.map(r => {
              const icons  = {present:'✅',absent:'❌',late:'🕐',leave:'📝'};
              const colors = {present:'var(--status-present)',absent:'var(--status-absent)',late:'var(--status-late)',leave:'var(--status-leave)'};
              const bgs    = {present:'var(--status-present-bg)',absent:'var(--status-absent-bg)',late:'var(--status-late-bg)',leave:'var(--status-leave-bg)'};
              const dayLabel = new Date(r.date + 'T00:00:00').toLocaleDateString('en-IN', {weekday:'short', month:'short', day:'numeric'});
              return `
                <div style="display:flex;align-items:center;gap:12px;padding:10px 12px;background:var(--card-bg);border-radius:14px;box-shadow:var(--elev-1)">
                  <div style="width:40px;height:40px;border-radius:12px;background:${bgs[r.status]};display:flex;align-items:center;justify-content:center;font-size:20px;flex-shrink:0">${icons[r.status]}</div>
                  <div style="flex:1;min-width:0">
                    <div style="font:600 13px 'Inter',sans-serif;color:var(--md-on-surface)">${dayLabel}</div>
                    <div style="font:12px 'Inter',sans-serif;color:var(--md-on-surface-var);margin-top:2px">
                      ${MockDB.getBatch(r.batchId)?.subject || ''}
                      ${r.markedAt ? '· ' + Utils.formatTime(r.markedAt) : ''}
                    </div>
                  </div>
                  <span class="chip chip-${r.status}" style="font-size:11px;flex-shrink:0">${r.status.charAt(0).toUpperCase()+r.status.slice(1)}</span>
                </div>
              `;
            }).join('')}
          </div>
        </div>
      `;
    }).join('') || '<div class="empty-state"><div class="empty-icon">📋</div><div class="empty-title">No records found</div></div>';

    if (moreEl) moreEl.style.display = hasMore ? 'flex' : 'none';
  }

  container.innerHTML = `
    <div style="display:flex;flex-direction:column;height:100dvh;background:var(--md-background)">
      <div class="top-bar">
        <button class="icon-btn" id="back-btn">←</button>
        <span class="top-bar-title">📋 Attendance History</span>
      </div>

      <!-- Filter chips -->
      <div style="padding:10px 16px 0;display:flex;gap:8px;overflow-x:auto;scrollbar-width:none">
        <button class="chip ${!filter?'selected':'chip-outline'}" data-filter="">All</button>
        <button class="chip ${filter==='present'?'selected':'chip-outline'}" data-filter="present">✅ Present</button>
        <button class="chip ${filter==='absent'?'selected':'chip-outline'}" data-filter="absent">❌ Absent</button>
        <button class="chip ${filter==='late'?'selected':'chip-outline'}" data-filter="late">🕐 Late</button>
        <button class="chip ${filter==='leave'?'selected':'chip-outline'}" data-filter="leave">📝 Leave</button>
      </div>

      <!-- Total count -->
      <div style="padding:8px 16px 0;font:600 13px 'Inter',sans-serif;color:var(--md-on-surface-var)">
        ${allRecords.length} total records
      </div>

      <div class="scroll-area" style="flex:1;padding:10px 16px">
        <div id="history-list"></div>
        <div id="load-more" style="display:none;justify-content:center;padding:12px 0">
          <button class="btn btn-outlined" id="load-more-btn">Load More</button>
        </div>
        <div style="height:16px"></div>
      </div>

      ${buildStudentBottomNav('student-history')}
    </div>
  `;

  renderPage();

  container.querySelector('#back-btn')?.addEventListener('click', () => Router.back());
  container.querySelector('#load-more-btn')?.addEventListener('click', () => { page++; renderPage(); });

  // Filter
  container.querySelectorAll('[data-filter]').forEach(btn => {
    btn.addEventListener('click', () => {
      filter = btn.dataset.filter;
      page   = 0;
      container.querySelectorAll('[data-filter]').forEach(b => {
        b.className = `chip ${b.dataset.filter === filter && filter ? `chip-${filter}` : (b.dataset.filter === filter ? 'selected' : 'chip-outline')}`;
      });
      btn.className = `chip ${filter ? `chip-${filter}` : 'selected'}`;
      renderPage();
    });
  });

  setupStudentBottomNav(container);
}

window.renderStudentSubjects = renderStudentSubjects;
window.renderStudentHistory  = renderStudentHistory;
