/* ============================================================
   ADMIN BATCHES — CRUD batch management & Trainer Assignment
   ============================================================ */

function renderAdminBatches(container) {
  const user = Auth.requireAuth();
  if (!user || user.role !== 'admin') { Router.go('login'); return; }

  const batches  = MockDB.batches;
  const trainers = MockDB.getTrainers();

  container.innerHTML = `
    <div class="page-wrap">
      <div class="top-bar">
        <div style="flex:1">
          <div style="font-size:15px;font-weight:700;color:var(--gray-900)">Batches & Trainers</div>
          <div style="font-size:12px;color:var(--gray-500)">${batches.length} batch${batches.length !== 1 ? 'es' : ''} · ${trainers.length} trainer${trainers.length !== 1 ? 's' : ''}</div>
        </div>
        <div style="display:flex;gap:8px">
          <button class="btn btn-outlined btn-sm" id="add-trainer-btn">+ Add Trainer</button>
          <button class="btn btn-filled btn-sm" id="add-btn">+ New Batch</button>
        </div>
      </div>

      <!-- Search -->
      <div style="padding:12px 16px 0;flex-shrink:0">
        <div class="search-bar">
          <span class="search-icon">⊕</span>
          <input id="q" type="text" placeholder="Search batches or trainers…" autocomplete="off">
        </div>
      </div>

      <div class="scroll-area" style="flex:1;padding:12px 16px 24px">
        <div id="list" style="display:flex;flex-direction:column;gap:10px">
          ${batches.map(b => _batchCard(b, trainers)).join('')}
        </div>
        ${batches.length === 0 ? '<div class="empty-state"><div class="empty-icon">📚</div><div class="empty-title">No Batches</div><div class="empty-text">Create your first batch to get started.</div></div>' : ''}
      </div>

      ${_adminNav('admin-batches')}
    </div>
  `;

  _setupAdminNav(container);
  container.querySelector('#add-btn').addEventListener('click', () => _batchForm(container, null, trainers));
  container.querySelector('#add-trainer-btn').addEventListener('click', () => _trainerForm(container, () => renderAdminBatches(container)));

  // Search
  container.querySelector('#q').addEventListener('input', Utils.debounce(e => {
    const q = e.target.value.toLowerCase();
    container.querySelectorAll('.b-card').forEach(c => {
      c.style.display = (c.dataset.q || '').includes(q) ? '' : 'none';
    });
  }, 200));

  // Quick Assign Trainer listener
  container.querySelectorAll('.quick-assign-trainer').forEach(sel => {
    sel.addEventListener('change', () => {
      const bid = sel.dataset.bid;
      const tid = sel.value;
      const b = MockDB.getBatch(bid);
      if (b) {
        b.trainerIds = tid ? [tid] : [];
        Utils.toast(tid ? 'Trainer assigned successfully.' : 'Trainer unassigned.');
        renderAdminBatches(container);
      }
    });
  });

  // Edit / delete
  container.addEventListener('click', e => {
    if (e.target.closest('.edit-b')) {
      const b = MockDB.getBatch(e.target.closest('.edit-b').dataset.id);
      _batchForm(container, b, trainers);
    }
    if (e.target.closest('.del-b')) {
      _confirmDelete(container, e.target.closest('.del-b').dataset.id, 'batch');
    }
  });
}

function _batchCard(b, trainers) {
  const currentTrainer = trainers.find(t => b.trainerIds?.includes(t.uid));
  const trainerNameStr = currentTrainer ? currentTrainer.name : '';
  
  return `
    <div class="b-card" data-q="${(b.name + ' ' + b.subject + ' ' + trainerNameStr).toLowerCase()}"
      style="background:var(--md-surface);border:var(--border);border-radius:var(--radius-lg);padding:14px 16px;box-shadow:var(--shadow-sm)">
      <div style="display:flex;align-items:flex-start;gap:12px">
        <div style="flex:1;min-width:0">
          <div style="font-size:15px;font-weight:700;color:var(--gray-900)">${b.name}</div>
          <div style="font-size:13px;color:var(--gray-500);margin-top:2px">${b.subject}</div>
          <div style="display:flex;gap:14px;margin-top:8px;font-size:12px;color:var(--gray-500)">
            <span>${b.schedule || 'No time'}</span>
            <span>·</span>
            <span>${b.room || 'Room TBD'}</span>
            <span>·</span>
            <span>${b.studentIds?.length || 0} students</span>
          </div>

          <!-- Inline Quick Assign Trainer Dropdown -->
          <div style="margin-top:10px;display:flex;align-items:center;gap:8px">
            <span style="font-size:12px;font-weight:600;color:var(--gray-700)">Assigned Trainer:</span>
            <select class="quick-assign-trainer" data-bid="${b.id}"
              style="padding:3px 8px;font-size:12px;font-weight:600;border:1px solid var(--gray-300);border-radius:var(--radius-sm);background:var(--md-surface);color:var(--primary);outline:none;cursor:pointer">
              <option value="">— Unassigned —</option>
              ${trainers.map(t => `<option value="${t.uid}" ${b.trainerIds?.includes(t.uid)?'selected':''}>${t.name}</option>`).join('')}
            </select>
          </div>
        </div>

        <div style="display:flex;gap:6px;flex-shrink:0">
          <button class="icon-btn edit-b" data-id="${b.id}" title="Edit Batch">✏</button>
          <button class="icon-btn del-b"  data-id="${b.id}" title="Delete Batch" style="color:var(--md-error)">✕</button>
        </div>
      </div>
    </div>
  `;
}

function _batchForm(container, batch, trainers) {
  const isEdit = !!batch;
  const ov = document.createElement('div');
  ov.className = 'modal-overlay fade-in';
  ov.innerHTML = `
    <div class="bottom-sheet slide-up">
      <div class="bottom-sheet-handle"></div>
      <div style="font-size:17px;font-weight:700;color:var(--gray-900);margin-bottom:20px">${isEdit ? 'Edit Batch' : 'New Batch'}</div>
      <div style="display:flex;flex-direction:column;gap:14px">
        <div class="input-wrapper">
          <label class="input-label">Batch Name *</label>
          <input id="f-name" class="input-field" type="text" value="${batch?.name||''}" placeholder="e.g. CS-A Morning">
        </div>
        <div class="input-wrapper">
          <label class="input-label">Subject *</label>
          <input id="f-sub" class="input-field" type="text" value="${batch?.subject||''}" placeholder="e.g. Data Structures">
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
          <div class="input-wrapper">
            <label class="input-label">Schedule</label>
            <input id="f-sched" class="input-field" type="text" value="${batch?.schedule||''}" placeholder="09:00 AM">
          </div>
          <div class="input-wrapper">
            <label class="input-label">Room</label>
            <input id="f-room" class="input-field" type="text" value="${batch?.room||''}" placeholder="Lab 301">
          </div>
        </div>

        <div class="input-wrapper">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px">
            <label class="input-label" style="margin-bottom:0">Assign Trainer</label>
            <button class="btn btn-sm btn-outlined" id="f-new-trainer-btn" style="padding:2px 8px;font-size:11px">+ Add New Trainer</button>
          </div>
          <select id="f-trainer" class="input-field select-field">
            <option value="">— None —</option>
            ${trainers.map(t => `<option value="${t.uid}" ${batch?.trainerIds?.includes(t.uid)?'selected':''}>${t.name}</option>`).join('')}
          </select>
        </div>

        <div style="display:flex;gap:10px;margin-top:4px">
          <button class="btn btn-outlined btn-block" id="f-cancel">Cancel</button>
          <button class="btn btn-filled btn-block" id="f-save">${isEdit ? 'Update' : 'Create'}</button>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(ov);

  ov.querySelector('#f-cancel').addEventListener('click', () => ov.remove());
  ov.addEventListener('click', e => { if (e.target === ov) ov.remove(); });

  ov.querySelector('#f-new-trainer-btn').addEventListener('click', e => {
    e.preventDefault();
    _trainerForm(container, newTrainer => {
      const sel = ov.querySelector('#f-trainer');
      if (sel) {
        const opt = document.createElement('option');
        opt.value = newTrainer.uid;
        opt.textContent = newTrainer.name;
        opt.selected = true;
        sel.appendChild(opt);
      }
    });
  });

  ov.querySelector('#f-save').addEventListener('click', () => {
    const name    = ov.querySelector('#f-name').value.trim();
    const subject = ov.querySelector('#f-sub').value.trim();
    const sched   = ov.querySelector('#f-sched').value.trim();
    const room    = ov.querySelector('#f-room').value.trim();
    const trainer = ov.querySelector('#f-trainer').value;
    if (!name || !subject) { Utils.toast('Batch name and subject are required.'); return; }

    const payload = {
      name,
      subject,
      schedule: sched,
      room,
      trainers: trainer ? [trainer] : [],
      color: batch?.color || '#1e40af'
    };

    const requestPromise = isEdit
      ? window.AppAPI.fetch(`/api/batches/${batch.id}`, { method: 'PUT', body: JSON.stringify(payload) })
      : window.AppAPI.fetch('/api/batches', { method: 'POST', body: JSON.stringify(payload) });

    requestPromise
      .then(async () => {
        // Refresh local cache & memory DB
        await window.Store.fetchAndCacheData();
        await window.MockDB.loadFromIndexedDB();

        ov.remove();
        Utils.toast(isEdit ? 'Batch updated.' : 'Batch created.');
        renderAdminBatches(container);
      })
      .catch(err => {
        Utils.toast(err.message || 'Failed to save batch.');
      });
  });
}

function _trainerForm(container, onComplete) {
  const ov = document.createElement('div');
  ov.className = 'modal-overlay center fade-in';
  ov.innerHTML = `
    <div class="dialog slide-up" style="max-width:380px;width:100%">
      <div style="font-size:16px;font-weight:700;color:var(--gray-900);margin-bottom:14px">Add New Trainer</div>
      <div style="display:flex;flex-direction:column;gap:12px">
        <div class="input-wrapper">
          <label class="input-label">Trainer Name *</label>
          <input id="t-name" class="input-field" type="text" placeholder="e.g. Dr. Rajesh Sharma">
        </div>
        <div class="input-wrapper">
          <label class="input-label">Email Address *</label>
          <input id="t-email" class="input-field" type="email" placeholder="e.g. rajesh@institute.edu">
        </div>
        <div class="input-wrapper">
          <label class="input-label">Department / Subject</label>
          <input id="t-dept" class="input-field" type="text" placeholder="e.g. Computer Science">
        </div>
        <div style="display:flex;gap:10px;margin-top:6px">
          <button class="btn btn-outlined btn-block" id="t-cancel">Cancel</button>
          <button class="btn btn-filled btn-block" id="t-save">Save Trainer</button>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(ov);

  ov.querySelector('#t-cancel').addEventListener('click', () => ov.remove());
  ov.addEventListener('click', e => { if (e.target === ov) ov.remove(); });

  ov.querySelector('#t-save').addEventListener('click', () => {
    const name  = ov.querySelector('#t-name').value.trim();
    const email = ov.querySelector('#t-email').value.trim();
    if (!name || !email) { Utils.toast('Name and Email are required.'); return; }

    const initials = name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
    const photo = makeAvatarSvg(initials, Math.floor(Math.random() * 10));

    const payload = {
      role: 'trainer',
      name,
      email,
      password: 'trainer123',
      photo
    };

    window.AppAPI.fetch('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload)
    })
      .then(async (data) => {
        // Refresh local cache & memory DB
        await window.Store.fetchAndCacheData();
        await window.MockDB.loadFromIndexedDB();

        Utils.toast(`Added Trainer ${name}`);
        ov.remove();
        if (onComplete) onComplete({ uid: data.userId, name, email, role: 'trainer', photo });
      })
      .catch(err => {
        Utils.toast(err.message || 'Failed to add trainer.');
      });
  });
}

function _confirmDelete(container, id, type) {
  const ov = document.createElement('div');
  ov.className = 'modal-overlay center fade-in';
  ov.innerHTML = `
    <div class="dialog">
      <div style="font-size:16px;font-weight:700;color:var(--gray-900);margin-bottom:6px">Delete ${type}?</div>
      <div style="font-size:13px;color:var(--gray-500);margin-bottom:20px">This action cannot be undone.</div>
      <div style="display:flex;gap:10px">
        <button class="btn btn-outlined btn-block" id="cd-no">Cancel</button>
        <button class="btn btn-danger btn-block" id="cd-yes">Delete</button>
      </div>
    </div>
  `;
  document.body.appendChild(ov);
  ov.querySelector('#cd-no').addEventListener('click', () => ov.remove());
  ov.querySelector('#cd-yes').addEventListener('click', () => {
    const deletePromise = type === 'batch'
      ? window.AppAPI.fetch(`/api/batches/${id}`, { method: 'DELETE' })
      : window.AppAPI.fetch(`/api/students/${id}`, { method: 'DELETE' });

    deletePromise
      .then(async () => {
        // Refresh local cache & memory DB
        await window.Store.fetchAndCacheData();
        await window.MockDB.loadFromIndexedDB();

        ov.remove();
        Utils.toast(`${type.charAt(0).toUpperCase()+type.slice(1)} deleted.`);
        type === 'batch' ? renderAdminBatches(container) : renderAdminStudents(container);
      })
      .catch(err => {
        Utils.toast(err.message || `Failed to delete ${type}.`);
      });
  });
  ov.addEventListener('click', e => { if (e.target === ov) ov.remove(); });
}

window.renderAdminBatches = renderAdminBatches;
window._confirmDelete     = _confirmDelete;
