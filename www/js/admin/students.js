/* ============================================================
   ADMIN STUDENTS — Student management with CSV/Excel import
   ============================================================ */

function renderAdminStudents(container) {
  const user = Auth.requireAuth();
  if (!user || user.role !== 'admin') { Router.go('login'); return; }

  const allStudents = Object.values(MockDB.students);
  const batches     = MockDB.batches;

  let filterBatch = '';

  function _list() {
    return filterBatch
      ? allStudents.filter(s => s.batchId === filterBatch)
      : allStudents;
  }

  function _renderList() {
    const students = _list();
    const listEl   = container.querySelector('#s-list');
    if (!listEl) return;
    listEl.innerHTML = students.length === 0
      ? '<tr><td colspan="6"><div class="empty-state"><div class="empty-icon">👥</div><div class="empty-title">No Students Found</div></div></td></tr>'
      : students.map(s => _studentRow(s)).join('');
  }

  container.innerHTML = `
    <div class="page-wrap">
      <div class="top-bar">
        <div style="flex:1">
          <div style="font-size:15px;font-weight:700;color:var(--gray-900)">Students</div>
          <div style="font-size:12px;color:var(--gray-500)">${allStudents.length} total</div>
        </div>
        <div style="display:flex;gap:8px">
          <button class="btn btn-outlined btn-sm" id="import-btn">Import CSV</button>
          <button class="btn btn-filled btn-sm" id="add-btn">+ Add Student</button>
        </div>
      </div>

      <!-- Search + filter row -->
      <div style="padding:12px 16px 0;display:flex;gap:8px;flex-shrink:0">
        <div class="search-bar" style="flex:1">
          <span class="search-icon">⊕</span>
          <input id="sq" type="text" placeholder="Search by name or roll…" autocomplete="off">
        </div>
        <select id="batch-filter" class="input-field select-field" style="width:auto;min-width:100px;padding-right:28px">
          <option value="">All Batches</option>
          ${batches.map(b => `<option value="${b.id}">${b.name}</option>`).join('')}
        </select>
      </div>

      <!-- Count line -->
      <div style="padding:8px 16px 0;font-size:12px;color:var(--gray-500)" id="count-line">${allStudents.length} students</div>

      <div class="scroll-area" style="flex:1;padding:8px 16px 24px">
        <!-- Table -->
        <div style="background:var(--md-surface);border:var(--border);border-radius:var(--radius-lg);overflow:hidden;overflow-x:auto">
          <table class="data-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Name</th>
                <th>Roll No</th>
                <th>Batch</th>
                <th style="text-align:center">Attendance</th>
                <th></th>
              </tr>
            </thead>
            <tbody id="s-list"></tbody>
          </table>
        </div>
      </div>

      ${_adminNav('admin-students')}
    </div>
  `;

  _renderList();
  _setupAdminNav(container);

  // Search
  container.querySelector('#sq').addEventListener('input', Utils.debounce(e => {
    const q = e.target.value.toLowerCase();
    container.querySelectorAll('.s-row').forEach(row => {
      row.style.display = (row.dataset.q||'').includes(q) ? '' : 'none';
    });
    const vis = container.querySelectorAll('.s-row:not([style*="none"])').length;
    container.querySelector('#count-line').textContent = `${vis} students`;
  }, 200));

  // Batch filter
  container.querySelector('#batch-filter').addEventListener('change', e => {
    filterBatch = e.target.value;
    _renderList();
    const count = _list().length;
    container.querySelector('#count-line').textContent = `${count} students`;
  });

  // Add
  container.querySelector('#add-btn').addEventListener('click', () => _studentForm(container, null, batches, () => {
    Router.go('admin-students');
  }));

  // Import
  container.querySelector('#import-btn').addEventListener('click', () => _importStudentsForm(container, batches, () => {
    Router.go('admin-students');
  }));

  // Edit / delete
  container.addEventListener('click', e => {
    if (e.target.closest('.edit-s')) {
      const id = e.target.closest('.edit-s').dataset.id;
      _studentForm(container, MockDB.students[id], batches, () => {
        Router.go('admin-students');
      });
    }
    if (e.target.closest('.del-s')) {
      _confirmDelete(container, e.target.closest('.del-s').dataset.id, 'student');
    }
  });
}

function _studentRow(s) {
  const batch = MockDB.getBatch(s.batchId);
  const stats = MockDB.getStudentStats(s.id);
  const pct   = stats?.percentage || 0;
  const pctCol = pct >= 75 ? 'var(--status-present)' : pct >= 60 ? 'var(--status-late)' : 'var(--status-absent)';
  return `
    <tr class="s-row" data-q="${(s.name + ' ' + s.rollNo).toLowerCase()}">
      <td>
        <div style="width:32px;height:32px;border-radius:50%;background:var(--gray-100);display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;color:var(--gray-600)">
          ${Utils.getInitials(s.name)}
        </div>
      </td>
      <td style="font-weight:600">${s.name}</td>
      <td style="color:var(--gray-500)">${s.rollNo}</td>
      <td style="color:var(--gray-500)">${batch?.name || '—'}</td>
      <td style="text-align:center;font-weight:700;color:${pctCol}">${pct}%</td>
      <td style="text-align:right">
        <div style="display:flex;gap:4px;justify-content:flex-end">
          <button class="icon-btn edit-s" data-id="${s.id}" title="Edit" style="font-size:13px">✏</button>
          <button class="icon-btn del-s"  data-id="${s.id}" title="Delete" style="font-size:13px;color:var(--md-error)">✕</button>
        </div>
      </td>
    </tr>
  `;
}

function _studentForm(container, student, batches, onSave) {
  const isEdit = !!student;
  const ov = document.createElement('div');
  ov.className = 'modal-overlay fade-in';
  ov.innerHTML = `
    <div class="bottom-sheet slide-up">
      <div class="bottom-sheet-handle"></div>
      <div style="font-size:17px;font-weight:700;color:var(--gray-900);margin-bottom:20px">${isEdit ? 'Edit Student' : 'Add Student'}</div>
      <div style="display:flex;flex-direction:column;gap:14px">
        <div class="input-wrapper">
          <label class="input-label">Full Name *</label>
          <input id="s-name" class="input-field" type="text" value="${student?.name||''}" placeholder="Student full name">
        </div>
        <div class="input-wrapper">
          <label class="input-label">Batch *</label>
          <select id="s-batch" class="input-field select-field">
            <option value="">— Select Batch —</option>
            ${batches.map(b => `<option value="${b.id}" ${student?.batchId===b.id?'selected':''}>${b.name} — ${b.subject}</option>`).join('')}
          </select>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
          <div class="input-wrapper">
            <label class="input-label">Roll Number *</label>
            <input id="s-roll" class="input-field" type="text" value="${student?.rollNo||''}" placeholder="e.g. B1-001">
          </div>
          <div class="input-wrapper">
            <label class="input-label">Email</label>
            <input id="s-email" class="input-field" type="email" value="${student?.email||''}" placeholder="email@example.com">
          </div>
        </div>
        <div style="display:flex;gap:10px;margin-top:4px">
          <button class="btn btn-outlined btn-block" id="sf-cancel">Cancel</button>
          <button class="btn btn-filled btn-block" id="sf-save">${isEdit ? 'Update' : 'Add Student'}</button>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(ov);

  const batchSelect = ov.querySelector('#s-batch');
  const rollInput   = ov.querySelector('#s-roll');
  const originalBatch = student?.batchId;
  const originalRoll  = student?.rollNo;

  batchSelect.addEventListener('change', () => {
    const selectedBatchId = batchSelect.value;
    if (isEdit && selectedBatchId === originalBatch) {
      rollInput.value = originalRoll || '';
      return;
    }
    if (!selectedBatchId) {
      if (!isEdit) rollInput.value = '';
      return;
    }
    const batchStudents = MockDB.getBatchStudents(selectedBatchId);
    const count = batchStudents ? batchStudents.filter(s => s.id !== student?.id).length : 0;
    const prefix = selectedBatchId.toUpperCase();
    const serial = String(count + 1).padStart(3, '0');
    rollInput.value = `${prefix}-${serial}`;
  });

  ov.querySelector('#sf-cancel').addEventListener('click', () => ov.remove());
  ov.addEventListener('click', e => { if (e.target === ov) ov.remove(); });

  ov.querySelector('#sf-save').addEventListener('click', () => {
    const name    = ov.querySelector('#s-name').value.trim();
    const rollNo  = ov.querySelector('#s-roll').value.trim();
    const email   = ov.querySelector('#s-email').value.trim();
    const batchId = ov.querySelector('#s-batch').value;
    if (!name || !rollNo || !batchId) { Utils.toast('Name, roll number, and batch are required.'); return; }

    const payload = { name, rollNo, email, batchId };
    const requestPromise = isEdit
      ? window.AppAPI.fetch(`/api/students/${student.id}`, { method: 'PUT', body: JSON.stringify(payload) })
      : window.AppAPI.fetch('/api/students', { method: 'POST', body: JSON.stringify(payload) });

    requestPromise
      .then(async () => {
        // Refresh local cache & memory DB
        await window.Store.fetchAndCacheData();
        await window.MockDB.loadFromIndexedDB();

        ov.remove();
        Utils.toast(isEdit ? 'Student updated.' : 'Student added.');
        onSave?.();
      })
      .catch(err => {
        Utils.toast(err.message || 'Failed to save student.');
      });
  });
}

function _importStudentsForm(container, batches, onSave) {
  const ov = document.createElement('div');
  ov.className = 'modal-overlay fade-in';
  ov.innerHTML = `
    <div class="bottom-sheet slide-up">
      <div class="bottom-sheet-handle"></div>
      <div style="font-size:17px;font-weight:700;color:var(--gray-900);margin-bottom:8px">Import Students</div>
      <p style="font-size:13px;color:var(--gray-500);margin-bottom:16px">Upload a CSV or Excel file containing columns: <strong>Name</strong>, <strong>Roll No</strong>, <strong>Email</strong>, and optionally <strong>Batch</strong>.</p>
      
      <div style="display:flex;flex-direction:column;gap:14px">
        <div class="input-wrapper">
          <label class="input-label">Select File (.csv, .xlsx, .xls) *</label>
          <input id="import-file" type="file" accept=".csv, .xlsx, .xls" class="input-field" style="padding:8px">
        </div>
        
        <div class="input-wrapper">
          <label class="input-label">Default Batch (if missing in file)</label>
          <select id="import-default-batch" class="input-field select-field">
            <option value="">— Select Batch —</option>
            ${batches.map(b => `<option value="${b.id}">${b.name} — ${b.subject}</option>`).join('')}
          </select>
        </div>

        <div style="display:flex;gap:10px;margin-top:8px">
          <button class="btn btn-outlined btn-block" id="import-cancel">Cancel</button>
          <button class="btn btn-filled btn-block" id="import-submit">Upload &amp; Import</button>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(ov);

  ov.querySelector('#import-cancel').addEventListener('click', () => ov.remove());
  ov.addEventListener('click', e => { if (e.target === ov) ov.remove(); });

  ov.querySelector('#import-submit').addEventListener('click', async () => {
    const fileInput = ov.querySelector('#import-file');
    const defaultBatchId = ov.querySelector('#import-default-batch').value;
    const file = fileInput.files[0];

    const submitBtn = ov.querySelector('#import-submit');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Importing…';

    async function processJson(json) {
      if (!json || json.length === 0) {
        throw new Error('The file/dataset is empty.');
      }

      let successCount = 0;
      json.forEach(row => {
        let name = "";
        let rollNo = "";
        let email = "";
        let batchName = "";

        Object.entries(row).forEach(([k, v]) => {
          const key = k.toLowerCase().replace(/[^a-z0-9]/g, "");
          if (key === "name" || key === "studentname" || key === "fullname") {
            name = String(v).trim();
          } else if (key === "rollno" || key === "rollnumber" || key === "roll") {
            rollNo = String(v).trim();
          } else if (key === "email" || key === "emailaddress") {
            email = String(v).trim();
          } else if (key === "batch" || key === "batchname" || key === "batchid") {
            batchName = String(v).trim();
          }
        });

        if (!name || !rollNo) return;

        let batchId = defaultBatchId;
        if (batchName) {
          const existingBatch = batches.find(b => 
            b.id.toLowerCase() === batchName.toLowerCase() || 
            b.name.toLowerCase() === batchName.toLowerCase()
          );
          if (existingBatch) {
            batchId = existingBatch.id;
          } else {
            const newBatchId = 'b_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4);
            const newBatch = {
              id: newBatchId,
              name: batchName,
              subject: 'General',
              schedule: '10:00 AM',
              room: 'TBD',
              trainerIds: [],
              studentIds: [],
              color: '#1e40af'
            };
            batches.push(newBatch);
            batchId = newBatchId;
          }
        }

        if (!batchId && batches.length > 0) {
          batchId = batches[0].id;
        }

        if (!batchId) return;

        const id = 'stu_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4);
        MockDB.students[id] = { id, name, rollNo, email, batchId, photo: null };
        const batch = MockDB.getBatch(batchId);
        if (batch && !batch.studentIds.includes(id)) {
          batch.studentIds.push(id);
        }
        successCount++;
      });

      ov.remove();
      Utils.toast(`Successfully imported ${successCount} students!`);
      onSave?.();
    }

    try {
      if (!file) {
        // Fallback mock dataset
        Utils.toast('No file chosen. Loading template sample student details...', { duration: 1500 });
        const mockJson = [
          { "Name": "Aarav Sharma", "Roll No": "B1-025", "Email": "aarav.sharma@example.com", "Batch": "CS-A Morning" },
          { "Name": "Ishita Verma", "Roll No": "B1-026", "Email": "ishita.verma@example.com", "Batch": "CS-A Morning" },
          { "Name": "Kabir Malhotra", "Roll No": "B2-030", "Email": "kabir.malhotra@example.com", "Batch": "EC-B Afternoon" },
          { "Name": "Diya Sen", "Roll No": "B2-031", "Email": "diya.sen@example.com", "Batch": "EC-B Afternoon" },
          { "Name": "Rohan Das", "Roll No": "B3-040", "Email": "rohan.das@example.com", "Batch": "Dynamic New Batch" }
        ];
        setTimeout(() => {
          processJson(mockJson).catch(err => {
            Utils.toast('Import failed: ' + err.message);
            submitBtn.disabled = false;
            submitBtn.textContent = 'Upload & Import';
          });
        }, 1200);
      } else {
        if (!window.XLSX) {
          await Utils.loadScript('https://cdn.sheetjs.com/xlsx-0.20.0/package/dist/xlsx.full.min.js');
        }

        const reader = new FileReader();
        reader.onload = function(e) {
          try {
            const data = new Uint8Array(e.target.result);
            const workbook = window.XLSX.read(data, { type: 'array' });
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            const json = window.XLSX.utils.sheet_to_json(worksheet, { defval: "" });
            processJson(json).catch(err => {
              Utils.toast('Import failed: ' + err.message);
              submitBtn.disabled = false;
              submitBtn.textContent = 'Upload & Import';
            });
          } catch (err) {
            Utils.toast(`Error parsing file: ${err.message}`);
            submitBtn.disabled = false;
            submitBtn.textContent = 'Upload & Import';
          }
        };
        reader.readAsArrayBuffer(file);
      }
    } catch (err) {
      Utils.toast(`Failed to run importer.`);
      submitBtn.disabled = false;
      submitBtn.textContent = 'Upload & Import';
    }
  });
}

window.renderAdminStudents = renderAdminStudents;
