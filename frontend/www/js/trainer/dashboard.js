/* ============================================================
   TRAINER DASHBOARD — Today's batches, clear list layout
   ============================================================ */

function renderTrainerDashboard(container) {
  const user = Auth.requireAuth();
  if (!user || user.role !== 'trainer') { Router.go('login'); return; }

  const sessions = MockDB.getTodaysSessions(user.uid);
  const doneCnt  = sessions.filter(s => s.isDone).length;
  const today    = new Date().toLocaleDateString('en-IN', { weekday:'long', day:'numeric', month:'long' });

  container.innerHTML = `
    <div class="page-wrap">

      <!-- Top bar -->
      <div class="top-bar">
        <div style="flex:1">
          <div style="font-size:11px;font-weight:600;color:var(--gray-500);letter-spacing:0.05em;text-transform:uppercase">Trainer</div>
          <div style="font-size:15px;font-weight:700;color:var(--gray-900)">${user.name}</div>
        </div>
        <button id="theme-btn" class="icon-btn" title="Toggle theme">☀︎</button>
        <button id="logout-btn" class="icon-btn" title="Sign out">
          <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/></svg>
        </button>
      </div>

      <div class="scroll-area" style="flex:1">

        <!-- Date + progress banner -->
        <div style="padding:16px;border-bottom:var(--border);display:flex;align-items:center;justify-content:space-between">
          <div>
            <div style="font-size:13px;font-weight:600;color:var(--gray-900)">${today}</div>
            <div style="font-size:12px;color:var(--gray-500);margin-top:2px">${doneCnt} of ${sessions.length} batch${sessions.length !== 1 ? 'es' : ''} completed</div>
          </div>
          ${sessions.length > 0 ? `
          <div style="text-align:right">
            <div style="font-size:20px;font-weight:700;color:${doneCnt === sessions.length && sessions.length > 0 ? 'var(--status-present)' : 'var(--primary)'}">${sessions.length > 0 ? Math.round(doneCnt/sessions.length*100) : 0}%</div>
            <div style="font-size:11px;color:var(--gray-500)">done</div>
          </div>` : ''}
        </div>

        <!-- Batch list -->
        ${sessions.length === 0 ? `
          <div class="empty-state">
            <div class="empty-icon">📅</div>
            <div class="empty-title">No Batches Today</div>
            <div class="empty-text">You have no sessions scheduled for today.</div>
          </div>
        ` : `
          <div style="padding:12px 16px 24px;display:flex;flex-direction:column;gap:10px">
            ${sessions.map(s => _buildBatchRow(s)).join('')}
          </div>
        `}

      </div>
    </div>
  `;

  container.querySelector('#logout-btn').addEventListener('click', () => Auth.logout());
  container.querySelector('#theme-btn').addEventListener('click', _toggleTheme);
  container.querySelectorAll('.start-btn').forEach(btn => {
    btn.addEventListener('click', () => Router.go('swipe-attendance', { batchId: btn.dataset.id }));
  });
}

function _buildBatchRow(session) {
  const done  = session.isDone;
  const total = session.studentIds.length;
  return `
    <div style="background:var(--md-surface);border:var(--border);border-radius:var(--radius-lg);padding:16px">
      <!-- Header row -->
      <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:12px;margin-bottom:12px">
        <div style="min-width:0">
          <div style="font-size:15px;font-weight:700;color:var(--gray-900)">${session.name}</div>
          <div style="font-size:13px;color:var(--gray-500);margin-top:2px">${session.subject}</div>
        </div>
        <span style="flex-shrink:0;padding:3px 10px;border-radius:var(--radius-full);font-size:11px;font-weight:600;
          ${done
            ? 'background:var(--status-present-bg);color:var(--status-present);border:1px solid var(--status-present-border)'
            : 'background:var(--gray-100);color:var(--gray-600);border:1px solid var(--gray-200)'
          }">
          ${done ? 'Completed' : 'Pending'}
        </span>
      </div>

      <!-- Meta row -->
      <div style="display:flex;gap:16px;font-size:12px;color:var(--gray-500);margin-bottom:14px">
        <span>${session.schedule || 'No time set'}</span>
        <span>·</span>
        <span>${session.room || 'Room TBD'}</span>
        <span>·</span>
        <span>${total} student${total !== 1 ? 's' : ''}</span>
      </div>

      <!-- Action -->
      <button class="btn ${done ? 'btn-outlined' : 'btn-filled'} btn-block start-btn" data-id="${session.id}">
        ${done ? 'View Summary' : 'Start Attendance'}
      </button>
    </div>
  `;
}

function _toggleTheme() {
  const html = document.documentElement;
  html.setAttribute('data-theme', html.getAttribute('data-theme') === 'dark' ? 'light' : 'dark');
}

window.renderTrainerDashboard = renderTrainerDashboard;
window._toggleTheme           = _toggleTheme;
