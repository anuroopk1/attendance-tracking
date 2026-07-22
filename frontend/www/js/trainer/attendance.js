/* ============================================================
   SWIPE ATTENDANCE — Clean, professional card session
   ============================================================ */

let attendanceSession = null;

function renderSwipeAttendance(container, params) {
  const user = Auth.requireAuth();
  if (!user) return;

  const { batchId } = params;
  const batch    = MockDB.getBatch(batchId);
  if (!batch) { Utils.toast('Batch not found.'); Router.back(); return; }

  const students = MockDB.getBatchStudents(batchId);
  if (!students.length) { Utils.toast('No students in this batch.'); Router.back(); return; }

  attendanceSession = {
    batchId, batch,
    students: [...students],
    results:  {},
    undoStack: [],
    currentIdx: 0,
    viewMode: 'current', // 'current' | 'present' | 'absent'
    date: Utils.today(),
    trainerId: user.uid,
  };

  _renderSwipe(container);
}

function _renderSwipe(container) {
  const { batch, students, currentIdx, undoStack } = attendanceSession;
  const total   = students.length;
  const done    = currentIdx;
  const pct     = total ? Math.round(done / total * 100) : 0;
  const canUndo = undoStack.length > 0;
  const viewMode = attendanceSession.viewMode || 'current';

  const presentList = students.filter(st => attendanceSession.results[st.id] === 'present');
  const absentList  = students.filter(st => attendanceSession.results[st.id] === 'absent');

  container.innerHTML = `
    <div class="page-wrap">

      <!-- Top bar -->
      <div class="top-bar">
        <button class="icon-btn" id="back-btn">
          <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M15 18l-6-6 6-6"/></svg>
        </button>
        <div style="flex:1;min-width:0">
          <div style="font-size:14px;font-weight:700;color:var(--gray-900);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${batch.name}</div>
          <div style="font-size:12px;color:var(--gray-500)">${batch.subject}</div>
        </div>
        <button class="icon-btn ${canUndo ? 'primary' : ''}" id="undo-btn" ${canUndo ? '' : 'disabled style="opacity:0.3"'} title="Undo last mark">
          <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M3 10h10a8 8 0 018 8v2M3 10l6 6M3 10l6-6"/></svg>
        </button>
      </div>

      <!-- Progress & Tab Nav -->
      <div style="padding:12px 16px 10px;border-bottom:var(--border);background:var(--md-surface)">
        <div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:6px">
          <span style="font-size:13px;font-weight:600;color:var(--gray-700)">${done} of ${total} marked</span>
          <span style="font-size:12px;color:var(--gray-500)">${pct}% complete</span>
        </div>
        <div class="progress-bar">
          <div class="progress-fill" style="width:${pct}%"></div>
        </div>
        
        <!-- Tabs: Present | Current Student | Absent -->
        <div style="display:grid;grid-template-columns:1fr 1.2fr 1fr;gap:6px;margin-top:10px">
          <button class="tab-nav-btn" data-v="present"
            style="padding:6px 4px;font-size:12px;font-weight:600;border-radius:var(--radius-md);border:1px solid ${viewMode==='present'?'var(--status-present)':'var(--gray-300)'};background:${viewMode==='present'?'var(--status-present-bg)':'var(--md-surface)'};color:${viewMode==='present'?'var(--status-present)':'var(--gray-700)'};cursor:pointer">
            ✓ Present (${presentList.length})
          </button>
          <button class="tab-nav-btn" data-v="current"
            style="padding:6px 4px;font-size:12px;font-weight:600;border-radius:var(--radius-md);border:1px solid ${viewMode==='current'?'var(--primary-600)':'var(--gray-300)'};background:${viewMode==='current'?'var(--primary-50)':'var(--md-surface)'};color:${viewMode==='current'?'var(--primary-700)':'var(--gray-700)'};cursor:pointer">
            👤 Current Card
          </button>
          <button class="tab-nav-btn" data-v="absent"
            style="padding:6px 4px;font-size:12px;font-weight:600;border-radius:var(--radius-md);border:1px solid ${viewMode==='absent'?'var(--status-absent)':'var(--gray-300)'};background:${viewMode==='absent'?'var(--status-absent-bg)':'var(--md-surface)'};color:${viewMode==='absent'?'var(--status-absent)':'var(--gray-700)'};cursor:pointer">
            ✕ Absent (${absentList.length})
          </button>
        </div>
      </div>

      <!-- Main Body Area -->
      ${viewMode === 'current' ? `
        <!-- Card deck -->
        <div id="card-deck" style="flex:1;position:relative;padding:14px 16px;overflow:hidden;background:var(--gray-50)">
          ${_buildDeck()}
        </div>

        <!-- Direction guide + quick buttons -->
        <div style="background:var(--md-surface);border-top:var(--border)">
          <!-- Direction hints -->
          <div class="swipe-hint" style="padding:10px 16px 6px">
            <div class="swipe-hint-item">
              <div class="hint-icon-wrap hint-absent">✕</div>
              <div class="hint-label">← Absent</div>
            </div>
            <div class="swipe-hint-item">
              <div class="hint-icon-wrap hint-present">✓</div>
              <div class="hint-label">Present →</div>
            </div>
          </div>
          <!-- Quick tap buttons -->
          <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:8px;padding:6px 16px calc(10px + env(safe-area-inset-bottom,0px))">
            ${_quickBtn('Absent','absent','#dc2626','#fef2f2','#fecaca')}
            ${_quickBtn('Present','present','#16a34a','#f0fdf4','#bbf7d0')}
          </div>
        </div>
      ` : `
        <!-- List View (Present or Absent) -->
        ${_buildListView(viewMode === 'present' ? presentList : absentList, viewMode)}
      `}
    </div>
  `;

  // Attach swipe engine if in current card view
  if (viewMode === 'current') {
    const topCard = container.querySelector('.swipe-card.is-top');
    if (topCard) SwipeEngine.attach(topCard, { onSwipe: status => _handleSwipe(status, container) });
  }

  // Event Listeners
  container.querySelector('#back-btn').addEventListener('click', () => {
    if (attendanceSession.currentIdx > 0) _showExitDialog(container);
    else Router.back();
  });

  container.querySelector('#undo-btn').addEventListener('click', () => _handleUndo(container));

  container.querySelectorAll('.tab-nav-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      attendanceSession.viewMode = btn.dataset.v;
      Utils.hapticLight();
      _renderSwipe(container);
    });
  });

  if (viewMode === 'current') {
    container.querySelectorAll('.quick-mark').forEach(btn => {
      btn.addEventListener('click', () => { Utils.hapticMedium(); _handleSwipe(btn.dataset.s, container); });
    });
  } else {
    container.querySelectorAll('.toggle-status-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const sid = btn.dataset.sid;
        const target = btn.dataset.target;
        attendanceSession.results[sid] = target;
        Utils.hapticLight();
        Utils.toast(`Marked ${target}`);
        _renderSwipe(container);
      });
    });

    container.querySelectorAll('.jump-card-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.dataset.idx, 10);
        attendanceSession.currentIdx = idx;
        attendanceSession.viewMode = 'current';
        Utils.hapticLight();
        _renderSwipe(container);
      });
    });
  }
}

function _buildListView(list, currentType) {
  if (!list.length) {
    return `
      <div style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:40px 20px;color:var(--gray-500);text-align:center">
        <div style="font-size:36px;margin-bottom:8px">${currentType==='present'?'✅':'❌'}</div>
        <div style="font-size:14px;font-weight:600">No students marked ${currentType} yet</div>
        <div style="font-size:12px;margin-top:4px;color:var(--gray-400)">Use the swipe card deck or quick buttons to mark students.</div>
      </div>
    `;
  }

  return `
    <div style="flex:1;overflow-y:auto;padding:12px 16px;display:flex;flex-direction:column;gap:8px;background:var(--gray-50)">
      ${list.map(st => {
        const idx = attendanceSession.students.findIndex(s => s.id === st.id);
        const targetStatus = currentType === 'present' ? 'absent' : 'present';
        const btnClass = currentType === 'present' ? 'btn-outlined' : 'btn-filled';
        
        return `
          <div style="display:flex;align-items:center;gap:12px;padding:12px 14px;background:var(--md-surface);border:var(--border);border-radius:var(--radius-lg);box-shadow:var(--shadow-xs)">
            <div style="width:40px;height:40px;border-radius:50%;background:var(--gray-100);display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:700;color:var(--gray-700);flex-shrink:0">
              ${Utils.getInitials(st.name)}
            </div>
            <div style="flex:1;min-width:0">
              <div style="font-size:14px;font-weight:600;color:var(--gray-900);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${st.name}</div>
              <div style="font-size:12px;color:var(--gray-500)">${st.rollNo}</div>
            </div>
            <div style="display:flex;gap:6px;flex-shrink:0">
              <button class="btn btn-sm ${btnClass} toggle-status-btn" data-sid="${st.id}" data-target="${targetStatus}">
                ${currentType==='present'?'✕ Absent':'✓ Present'}
              </button>
              <button class="btn btn-sm btn-outlined jump-card-btn" data-idx="${idx}" title="Jump to Card">
                Card
              </button>
            </div>
          </div>
        `;
      }).join('')}
    </div>
  `;
}

function _quickBtn(label, status, color, bg, border) {
  return `
    <button class="quick-mark" data-s="${status}"
      style="padding:10px 4px;border-radius:var(--radius-md);
             background:${bg};color:${color};
             border:1.5px solid ${border};
             font-size:13px;font-weight:600;
             display:flex;flex-direction:column;align-items:center;gap:2px;
             cursor:pointer;transition:opacity 0.15s">
      <span style="font-size:16px">${status==='present'?'✓':'✕'}</span>
      ${label}
    </button>`;
}

function _buildDeck() {
  const { students, currentIdx } = attendanceSession;
  if (currentIdx >= students.length) {
    return `
      <div style="height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:20px">
        <div style="font-size:40px;margin-bottom:12px">🎉</div>
        <div style="font-size:18px;font-weight:700;color:var(--gray-900)">All students marked!</div>
        <div style="font-size:13px;color:var(--gray-500);margin-top:4px;margin-bottom:20px">Review your lists above or view the final summary.</div>
        <button class="btn btn-filled btn-lg" onclick="renderAttendanceSummary(document.querySelector('#app'))">View Summary</button>
      </div>
    `;
  }
  let html = '';
  for (let i = Math.min(currentIdx + 2, students.length - 1); i >= currentIdx; i--) {
    html += _buildCard(students[i], i === currentIdx, i - currentIdx);
  }
  return html;
}

function _buildCard(student, isTop, stackPos) {
  const cls    = isTop ? 'swipe-card is-top' : `swipe-card stack-${stackPos}`;
  const stats  = MockDB.getStudentStats(student.id);
  const pct    = stats?.percentage || 0;
  const pctCol = pct >= 75 ? 'var(--status-present)' : 'var(--status-absent)';
  const initials = Utils.getInitials(student.name);

  return `
    <div class="${cls}" data-sid="${student.id}"
      style="position:absolute;inset:0;background:var(--md-surface);
             border:var(--border);border-radius:var(--radius-xl);overflow:hidden;
             display:flex;flex-direction:column">

      <!-- Swipe overlays -->
      <div class="swipe-overlay overlay-present"><div class="overlay-label rotate-right"><span class="overlay-icon">✓</span>PRESENT</div></div>
      <div class="swipe-overlay overlay-absent"><div class="overlay-label rotate-left"><span class="overlay-icon">✕</span>ABSENT</div></div>

      <!-- Avatar section -->
      <div style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;
                  padding:24px 20px 16px;background:var(--gray-50);border-bottom:var(--border)">
        <div style="width:88px;height:88px;border-radius:50%;
                    background:var(--gray-200);border:2px solid var(--gray-300);
                    display:flex;align-items:center;justify-content:center;
                    font-size:32px;font-weight:700;color:var(--gray-600);
                    margin-bottom:14px">
          ${initials}
        </div>
        <div style="font-size:22px;font-weight:700;color:var(--gray-900);text-align:center">${student.name}</div>
        <div style="font-size:13px;color:var(--gray-500);margin-top:4px">${student.rollNo}</div>
      </div>

      <!-- Details section -->
      <div style="padding:16px 20px">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
          <span style="font-size:13px;color:var(--gray-500)">Overall Attendance</span>
          <span style="font-size:14px;font-weight:700;color:${pctCol}">${pct}%</span>
        </div>
        <div class="progress-bar" style="margin-bottom:12px">
          <div style="height:100%;width:${pct}%;background:${pctCol};border-radius:9999px"></div>
        </div>
        <div style="display:flex;gap:16px;font-size:12px;color:var(--gray-500)">
          <span>Present: <strong style="color:var(--gray-800)">${stats?.present||0}</strong></span>
          <span>Absent: <strong style="color:var(--gray-800)">${stats?.absent||0}</strong></span>
        </div>
      </div>
    </div>
  `;
}

function _handleSwipe(status, container) {
  const s = attendanceSession;
  const student = s.students[s.currentIdx];
  if (!student) return;

  s.results[student.id] = status;
  s.undoStack.push({ studentId: student.id, idx: s.currentIdx });
  if (s.undoStack.length > 10) s.undoStack.shift();
  s.currentIdx++;

  const labels = { present:'Present', absent:'Absent' };
  Utils.toast(`${student.name} — ${labels[status]}`, { duration: 1000 });

  setTimeout(() => {
    if (s.currentIdx >= s.students.length) renderAttendanceSummary(container);
    else _renderSwipe(container);
  }, 360);
}

function _handleUndo(container) {
  const s = attendanceSession;
  if (!s.undoStack.length) return;
  const last = s.undoStack.pop();
  delete s.results[last.studentId];
  s.currentIdx = last.idx;
  Utils.hapticMedium();
  Utils.toast(`Undo — ${s.students[last.idx]?.name}`);
  _renderSwipe(container);
}

function _showExitDialog(container) {
  const ov = document.createElement('div');
  ov.className = 'modal-overlay center fade-in';
  ov.innerHTML = `
    <div class="dialog">
      <div style="font-size:16px;font-weight:700;color:var(--gray-900);margin-bottom:6px">Leave session?</div>
      <div style="font-size:13px;color:var(--gray-500);margin-bottom:20px">
        ${attendanceSession.currentIdx} of ${attendanceSession.students.length} students marked. Progress will be lost.
      </div>
      <div style="display:flex;gap:10px">
        <button class="btn btn-outlined btn-block" id="stay">Stay</button>
        <button class="btn btn-danger btn-block" id="leave">Leave</button>
      </div>
    </div>
  `;
  document.body.appendChild(ov);
  ov.querySelector('#stay').addEventListener('click',  () => ov.remove());
  ov.querySelector('#leave').addEventListener('click', () => { ov.remove(); Router.back(); });
  ov.addEventListener('click', e => { if (e.target === ov) ov.remove(); });
}

window.renderSwipeAttendance = renderSwipeAttendance;
