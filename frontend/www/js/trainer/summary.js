/* ============================================================
   ATTENDANCE SUMMARY — Review and confirm
   ============================================================ */

function renderAttendanceSummary(container) {
  const s = attendanceSession;
  const { students, results, batch, date } = s;

  const counts = { present:0, absent:0 };
  students.forEach(st => { const status = results[st.id] || 'absent'; counts[status]++; });
  const total    = students.length;
  const attended = counts.present;
  const pct      = total ? Math.round(attended / total * 100) : 0;
  const pctColor = pct >= 75 ? 'var(--status-present)' : 'var(--status-absent)';

  Utils.hapticSuccess();

  container.innerHTML = `
    <div class="page-wrap">

      <!-- Top bar -->
      <div class="top-bar">
        <div style="flex:1">
          <div style="font-size:15px;font-weight:700;color:var(--gray-900)">Attendance Summary</div>
          <div style="font-size:12px;color:var(--gray-500)">${batch.name} · ${Utils.formatDate(date, {month:'short',day:'numeric',year:'numeric'})}</div>
        </div>
      </div>

      <div class="scroll-area" style="flex:1">

        <!-- Percentage banner -->
        <div style="margin:16px 16px 0;padding:18px 20px;background:var(--md-surface);border:var(--border);border-radius:var(--radius-lg);display:flex;align-items:center;gap:20px">
          <div style="text-align:center;flex-shrink:0">
            <div style="font-size:36px;font-weight:700;color:${pctColor}">${pct}%</div>
            <div style="font-size:12px;color:var(--gray-500);margin-top:2px">Attendance Rate</div>
          </div>
          <div style="flex:1;min-width:0">
            <div class="progress-bar" style="height:8px;margin-bottom:10px">
              <div style="height:100%;width:${pct}%;background:${pctColor};border-radius:9999px"></div>
            </div>
            <div style="font-size:13px;color:var(--gray-600)">${attended} of ${total} students present</div>
            <div style="font-size:12px;color:var(--gray-500);margin-top:3px">${batch.subject}</div>
          </div>
        </div>

        <!-- Count grid -->
        <div style="padding:14px 16px 0;display:grid;grid-template-columns:repeat(2,1fr);gap:10px">
          ${_summaryTile('Present', counts.present, 'var(--status-present)', 'var(--status-present-bg)', 'var(--status-present-border)')}
          ${_summaryTile('Absent',  counts.absent,  'var(--status-absent)',  'var(--status-absent-bg)',  'var(--status-absent-border)')}
        </div>

        <!-- Student list -->
        <div class="section-header" style="margin-top:6px">
          <span class="section-title">Student-wise Status</span>
          <span class="section-action" id="toggle-list">Show all</span>
        </div>

        <div id="student-list" style="display:none;padding:0 16px 4px;flex-direction:column;gap:6px">
          ${students.map(st => {
            const status = results[st.id] || 'absent';
            const statusColors = {
              present: 'var(--status-present)', absent: 'var(--status-absent)'
            };
            const statusBgs = {
              present: 'var(--status-present-bg)', absent: 'var(--status-absent-bg)'
            };
            return `
              <div style="display:flex;align-items:center;gap:10px;padding:10px 12px;background:var(--md-surface);border:var(--border);border-radius:var(--radius-md)">
                <div style="width:34px;height:34px;border-radius:50%;background:var(--gray-100);display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;color:var(--gray-600);flex-shrink:0">
                  ${Utils.getInitials(st.name)}
                </div>
                <div style="flex:1;min-width:0">
                  <div style="font-size:13px;font-weight:600;color:var(--gray-900);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${st.name}</div>
                  <div style="font-size:11px;color:var(--gray-500)">${st.rollNo}</div>
                </div>
                <select class="override-sel" data-sid="${st.id}"
                  style="border:1px solid var(--gray-300);border-radius:var(--radius-sm);padding:4px 8px;font-size:12px;font-weight:600;
                         background:${statusBgs[status]};color:${statusColors[status]};outline:none;cursor:pointer;min-width:80px">
                  ${['present','absent'].map(opt =>
                    `<option value="${opt}" ${status===opt?'selected':''}>${opt.charAt(0).toUpperCase()+opt.slice(1)}</option>`
                  ).join('')}
                </select>
              </div>
            `;
          }).join('')}
        </div>

        <!-- Actions -->
        <div style="padding:20px 16px calc(20px + env(safe-area-inset-bottom,0px));display:flex;flex-direction:column;gap:10px;margin-top:8px">
          <button class="btn btn-filled btn-lg btn-block" id="confirm-btn">Confirm &amp; Save Attendance</button>
          <button class="btn btn-outlined btn-block" id="retake-btn">Retake Session</button>
        </div>

      </div>
    </div>
  `;

  // Toggle student list
  let listVisible = false;
  container.querySelector('#toggle-list').addEventListener('click', function () {
    listVisible = !listVisible;
    const list = container.querySelector('#student-list');
    list.style.display = listVisible ? 'flex' : 'none';
    list.style.flexDirection = 'column';
    this.textContent = listVisible ? 'Hide' : 'Show all';
  });

  // Status overrides
  container.querySelectorAll('.override-sel').forEach(sel => {
    sel.addEventListener('change', () => {
      attendanceSession.results[sel.dataset.sid] = sel.value;
      Utils.hapticLight();
    });
  });

  // Save
  container.querySelector('#confirm-btn').addEventListener('click', async () => {
    const btn = container.querySelector('#confirm-btn');
    btn.disabled = true;
    btn.textContent = 'Saving…';
    const records = s.students.map(st => ({
      studentId: st.id, batchId: s.batchId, date: s.date,
      status: s.results[st.id] || 'absent',
      markedBy: s.trainerId, markedAt: new Date().toISOString(),
    }));
    try {
      await MockDB.saveAttendance(records);
      await Store.saveAttendanceBatch(records);
      Utils.hapticSuccess();
      Utils.toast('Attendance saved successfully.', { duration: 2000 });
      setTimeout(() => Router.go('trainer-dashboard'), 1500);
    } catch (err) {
      Utils.hapticError();
      Utils.toast('Save failed: ' + err.message);
      btn.disabled = false;
      btn.textContent = 'Confirm & Save Attendance';
    }
  });

  // Retake
  container.querySelector('#retake-btn').addEventListener('click', () => {
    renderSwipeAttendance(container, { batchId: s.batchId });
  });
}

function _summaryTile(label, count, color, bg, border) {
  return `
    <div style="background:${bg};border:1px solid ${border};border-radius:var(--radius-lg);padding:12px 10px;text-align:center">
      <div style="font-size:24px;font-weight:700;color:${color}">${count}</div>
      <div style="font-size:11px;font-weight:600;color:${color};margin-top:3px">${label}</div>
    </div>
  `;
}

window.renderAttendanceSummary = renderAttendanceSummary;
