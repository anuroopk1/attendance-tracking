/* ============================================================
   ADMIN REPORTS — Attendance report with export
   ============================================================ */

function renderAdminReports(container, params) {
  const user = Auth.requireAuth();
  if (!user || user.role !== 'admin') { Router.go('login'); return; }

  const batches = MockDB.batches;
  let selBatch  = params?.batchId || batches[0]?.id || '';
  let selDate   = Utils.today();

  function _build() {
    const batch    = MockDB.getBatch(selBatch);
    if (!batch) return '<div class="empty-state"><div class="empty-icon">📊</div><div class="empty-title">Select a Batch</div></div>';

    const students = MockDB.getBatchStudents(selBatch);
    const rows = students.map(s => {
      const rec = MockDB.attendance[`${selBatch}_${selDate}_${s.id}`];
      return { s, status: rec?.status || 'unmarked', time: rec?.markedAt || null };
    });

    const cnt = { present:0, absent:0, late:0, leave:0, unmarked:0 };
    rows.forEach(r => { cnt[r.status] = (cnt[r.status]||0) + 1; });
    const marked  = rows.filter(r => r.status !== 'unmarked').length;
    const rate    = marked ? Math.round((cnt.present + cnt.late) / marked * 100) : 0;
    const rateCol = rate >= 75 ? 'var(--status-present)' : rate > 0 ? 'var(--status-late)' : 'var(--gray-500)';

    const statusLabel = { present:'Present', absent:'Absent', late:'Late', leave:'Leave', unmarked:'—' };
    const statusColor = {
      present:'var(--status-present)', absent:'var(--status-absent)',
      late:'var(--status-late)', leave:'var(--status-leave)', unmarked:'var(--gray-400)',
    };

    return `
      <!-- Summary bar -->
      <div style="display:flex;align-items:center;justify-content:space-between;padding:12px 14px;background:var(--md-surface);border:var(--border);border-radius:var(--radius-lg);margin-bottom:12px">
        <div style="display:flex;gap:14px;font-size:13px;flex-wrap:wrap">
          <span style="color:var(--status-present);font-weight:600">${cnt.present} Present</span>
          <span style="color:var(--status-absent);font-weight:600">${cnt.absent} Absent</span>
          <span style="color:var(--status-late);font-weight:600">${cnt.late} Late</span>
          <span style="color:var(--status-leave);font-weight:600">${cnt.leave} Leave</span>
          ${cnt.unmarked ? `<span style="color:var(--gray-400);font-weight:600">${cnt.unmarked} Unmarked</span>` : ''}
        </div>
        <div style="text-align:right;flex-shrink:0;margin-left:12px">
          <div style="font-size:20px;font-weight:700;color:${rateCol}">${marked > 0 ? rate + '%' : '—'}</div>
          <div style="font-size:11px;color:var(--gray-400)">rate</div>
        </div>
      </div>

      <!-- Table -->
      <div style="background:var(--md-surface);border:var(--border);border-radius:var(--radius-lg);overflow:hidden;overflow-x:auto">
        <table class="data-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Name</th>
              <th>Roll No</th>
              <th>Status</th>
              <th>Time</th>
            </tr>
          </thead>
          <tbody>
            ${rows.map((r, i) => `
              <tr>
                <td style="color:var(--gray-400)">${i+1}</td>
                <td>
                  <div style="display:flex;align-items:center;gap:8px">
                    <div style="width:28px;height:28px;border-radius:50%;background:var(--gray-100);display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:700;color:var(--gray-600);flex-shrink:0">
                      ${Utils.getInitials(r.s.name)}
                    </div>
                    <span style="font-weight:500">${r.s.name}</span>
                  </div>
                </td>
                <td style="color:var(--gray-500)">${r.s.rollNo}</td>
                <td>
                  <span style="font-size:12px;font-weight:700;color:${statusColor[r.status]}">${statusLabel[r.status]}</span>
                </td>
                <td style="color:var(--gray-400);font-size:12px">${r.time ? Utils.formatTime(r.time) : '—'}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  }

  function _render() {
    container.innerHTML = `
      <div class="page-wrap">
        <div class="top-bar">
          <div style="flex:1">
            <div style="font-size:15px;font-weight:700;color:var(--gray-900)">Reports</div>
          </div>
          <div style="display:flex;gap:6px">
            <button class="btn btn-outlined btn-sm" id="export-btn" style="padding:5px 8px">Export Excel</button>
            <button class="btn btn-filled btn-sm" id="pdf-btn" style="padding:5px 8px">Download PDF</button>
          </div>
        </div>

        <!-- Filters -->
        <div style="padding:12px 16px 0;display:flex;gap:10px;flex-shrink:0">
          <div class="input-wrapper" style="flex:1">
            <label class="input-label">Batch</label>
            <select id="fb" class="input-field select-field">
              ${batches.map(b => `<option value="${b.id}" ${b.id===selBatch?'selected':''}>${b.name}</option>`).join('')}
            </select>
          </div>
          <div class="input-wrapper" style="flex:1">
            <label class="input-label">Date</label>
            <input id="fd" class="input-field" type="date" value="${selDate}" max="${Utils.today()}">
          </div>
        </div>

        <div class="scroll-area" style="flex:1;padding:12px 16px 24px" id="report-body">
          ${_build()}
        </div>

        ${_adminNav('admin-reports')}
      </div>
    `;

    _setupAdminNav(container);
    container.querySelector('#fb').addEventListener('change', e => { selBatch = e.target.value; container.querySelector('#report-body').innerHTML = _build(); });
    container.querySelector('#fd').addEventListener('change', e => { selDate  = e.target.value; container.querySelector('#report-body').innerHTML = _build(); });

    container.querySelector('#export-btn').addEventListener('click', async () => {
      const batch    = MockDB.getBatch(selBatch);
      const students = MockDB.getBatchStudents(selBatch);
      const data = students.map(s => {
        const rec = MockDB.attendance[`${selBatch}_${selDate}_${s.id}`];
        return { 'Roll No': s.rollNo, 'Name': s.name, 'Batch': batch?.name||'', 'Date': selDate, 'Status': rec?.status||'unmarked', 'Time': rec ? Utils.formatTime(rec.markedAt) : '' };
      });
      await Utils.exportToExcel(data, `attendance_${batch?.name||'batch'}_${selDate}.xlsx`);
      Utils.toast('Exported successfully.');
    });

    container.querySelector('#pdf-btn').addEventListener('click', async () => {
      const batch    = MockDB.getBatch(selBatch);
      if (!batch) return;
      
      const btn = container.querySelector('#pdf-btn');
      btn.disabled = true;
      btn.textContent = 'Generating…';
      
      try {
        const students = MockDB.getBatchStudents(selBatch);
        const headers = ['#', 'Name', 'Roll No', 'Status', 'Time Marked'];
        const rows = students.map((s, i) => {
          const rec = MockDB.attendance[`${selBatch}_${selDate}_${s.id}`];
          const statusStr = rec ? rec.status.toUpperCase() : 'UNMARKED';
          const timeStr = rec ? Utils.formatTime(rec.markedAt) : '—';
          return [i + 1, s.name, s.rollNo, statusStr, timeStr];
        });

        const formattedDate = new Date(selDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
        const title = `Attendance Report: ${batch.name} (${batch.subject}) - ${formattedDate}`;
        
        await Utils.exportToPdf(title, headers, rows, `attendance_${batch.name.replace(/\s+/g, '_')}_${selDate}.pdf`);
        Utils.toast('PDF downloaded successfully.');
      } catch (err) {
        Utils.toast('Failed to download PDF: ' + err.message);
      } finally {
        btn.disabled = false;
        btn.textContent = 'Download PDF';
      }
    });
  }

  _render();
}

window.renderAdminReports = renderAdminReports;
