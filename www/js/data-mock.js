/* ============================================================
   MOCK DATA — Realistic seed data for demo mode
   ============================================================ */

// ── Photo placeholder generator ────────────────────────────────
const AVATAR_COLORS = [
  ['#6750A4','#fff'],['#625B71','#fff'],['#7D5260','#fff'],
  ['#0D47A1','#fff'],['#1B5E20','#fff'],['#E65100','#fff'],
  ['#880E4F','#fff'],['#1A237E','#fff'],['#004D40','#fff'],
  ['#37474F','#fff'],
];

function makeAvatarSvg(initials, idx = 0) {
  const [bg, fg] = AVATAR_COLORS[idx % AVATAR_COLORS.length];
  return `data:image/svg+xml,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128">
      <rect width="128" height="128" rx="64" fill="${bg}"/>
      <text x="64" y="64" dominant-baseline="central" text-anchor="middle"
        font-family="Inter,sans-serif" font-size="44" font-weight="700" fill="${fg}">${initials}</text>
    </svg>`
  )}`;
}

function initials(name) {
  return name.split(' ').slice(0,2).map(w => w[0]).join('').toUpperCase();
}

// ── Users ─────────────────────────────────────────────────────
const MOCK_USERS = [
  { uid: 'admin1',   role: 'admin',   name: 'Dr. Priya Sharma',    email: 'admin@demo.com',   password: 'admin123',   photo: makeAvatarSvg('PS', 7) },
  { uid: 'trainer1', role: 'trainer', name: 'Prof. Rajesh Kumar',  email: 'trainer@demo.com', password: 'trainer123', photo: makeAvatarSvg('RK', 0), assignedBatches: ['b1','b2'] },
  { uid: 'trainer2', role: 'trainer', name: 'Prof. Anita Desai',   email: 'trainer2@demo.com',password: 'trainer123', photo: makeAvatarSvg('AD', 9), assignedBatches: ['b3'] },
  { uid: 'student1', role: 'student', name: 'Arjun Mehta',         email: 'student@demo.com', password: 'student123', photo: makeAvatarSvg('AM', 1), batchId: 'b1', rollNo: 'CS21001' },
];

// ── Batches ────────────────────────────────────────────────────
const MOCK_BATCHES = [
  { id: 'b1', name: 'CS-A Morning',   subject: 'Data Structures',    trainerIds: ['trainer1'], schedule: '09:00 AM',  studentIds: genIds('b1s', 22), color: '#6750A4', room: 'Lab 301' },
  { id: 'b2', name: 'CS-B Afternoon', subject: 'Algorithms',         trainerIds: ['trainer1'], schedule: '02:00 PM',  studentIds: genIds('b2s', 18), color: '#0D47A1', room: 'Room 204' },
  { id: 'b3', name: 'IT-A Morning',   subject: 'Database Systems',   trainerIds: ['trainer2'], schedule: '10:30 AM',  studentIds: genIds('b3s', 30), color: '#1B5E20', room: 'Lab 201' },
  { id: 'b4', name: 'EC-A Evening',   subject: 'Digital Electronics', trainerIds: [],          schedule: '04:00 PM',  studentIds: genIds('b4s', 25), color: '#880E4F', room: 'Room 105' },
];

function genIds(prefix, count) {
  return Array.from({ length: count }, (_, i) => `${prefix}${String(i+1).padStart(3,'0')}`);
}

// ── Student names pool ─────────────────────────────────────────
const FIRST_NAMES = ['Aarav','Aditi','Aditya','Akash','Amrita','Ananya','Anjali','Arjun','Arnav','Aryan','Deepak','Divya','Farhan','Gayathri','Harshit','Ishaan','Jiya','Karan','Kavita','Krishnan','Lakshmi','Manav','Megha','Mihir','Neha','Nikhil','Nisha','Om','Priya','Rahul','Rajesh','Riya','Rohit','Sakshi','Sanjay','Sneha','Suresh','Tanvi','Tushar','Uday','Vaishnavi','Varun','Vidya','Vijay','Vivek','Yash','Zara'];
const LAST_NAMES  = ['Agarwal','Bhat','Chandra','Das','Desai','Dubey','Ghosh','Gupta','Iyer','Jain','Joshi','Kapoor','Kaur','Khan','Kumar','Malhotra','Mehta','Mishra','Nair','Patel','Pillai','Rao','Reddy','Shah','Sharma','Singh','Sinha','Srivastava','Tiwari','Varma','Verma'];

function randomName(seed) {
  const s = Math.abs(hashCode(seed));
  return `${FIRST_NAMES[s % FIRST_NAMES.length]} ${LAST_NAMES[(s >> 4) % LAST_NAMES.length]}`;
}
function hashCode(str) {
  let h = 0;
  for (const c of String(str)) h = Math.imul(31, h) + c.charCodeAt(0) | 0;
  return h;
}

// ── Generate all students ──────────────────────────────────────
function buildStudents() {
  const students = {};
  MOCK_BATCHES.forEach((batch, bi) => {
    batch.studentIds.forEach((sid, i) => {
      const name = randomName(sid);
      const rollPrefix = batch.id.split('').filter(c => c >= 'A' && c <= 'Z').join('').slice(0,3);
      students[sid] = {
        id:      sid,
        name,
        rollNo:  `${rollPrefix}21${String(i+1).padStart(3,'0')}`,
        batchId: batch.id,
        email:   `${name.toLowerCase().replace(' ','.')}@student.edu`,
        phone:   `+91 9${String(7000000000 + hashCode(sid) % 100000000).slice(0,9)}`,
        photo:   makeAvatarSvg(initials(name), (bi * 7 + i) % AVATAR_COLORS.length),
        joinedAt: '2021-07-15',
        totalSessions: 45 + (hashCode(sid) % 20),
      };
    });
  });
  // Add demo user as student
  students['b1s001'] = {
    ...students['b1s001'],
    id: 'b1s001',
    name: 'Arjun Mehta',
    rollNo: 'CS21001',
    photo: makeAvatarSvg('AM', 1),
  };
  return students;
}

// ── Generate attendance records ────────────────────────────────
const STATUS_OPTIONS = ['present','present','present','present','absent','late','leave'];

function buildAttendance() {
  const records = {}; // key: `${batchId}_${date}_${studentId}`
  const today   = new Date();
  
  MOCK_BATCHES.forEach(batch => {
    // Generate last 60 days
    for (let d = 60; d >= 1; d--) {
      const date = new Date(today);
      date.setDate(date.getDate() - d);
      const day = date.getDay(); // 0=Sun, 6=Sat
      if (day === 0 || day === 6) continue; // Skip weekends

      const dateStr = date.toISOString().split('T')[0];
      
      batch.studentIds.forEach(sid => {
        const seed = hashCode(`${sid}_${dateStr}`);
        const status = STATUS_OPTIONS[Math.abs(seed) % STATUS_OPTIONS.length];
        records[`${batch.id}_${dateStr}_${sid}`] = {
          studentId: sid,
          batchId:   batch.id,
          date:      dateStr,
          status,
          markedBy:  batch.trainerIds[0] || 'trainer1',
          markedAt:  date.toISOString(),
        };
      });
    }
  });
  return records;
}

// ── Today's sessions ───────────────────────────────────────────
function getTodaysSessions(trainerId) {
  const today = new Date().toISOString().split('T')[0];
  return MOCK_BATCHES
    .filter(b => b.trainerIds.includes(trainerId))
    .map(b => {
      const done = Object.keys(MOCK_ATTENDANCE)
        .filter(k => k.startsWith(`${b.id}_${today}_`)).length > 0;
      return { ...b, today, isDone: done };
    });
}

// ── Attendance summary ─────────────────────────────────────────
function getAttendanceSummary(batchId, dateStr) {
  const batch = MOCK_BATCHES.find(b => b.id === batchId);
  if (!batch) return null;
  const counts = { present: 0, absent: 0, late: 0, leave: 0 };
  batch.studentIds.forEach(sid => {
    const rec = MOCK_ATTENDANCE[`${batchId}_${dateStr}_${sid}`];
    if (rec) counts[rec.status] = (counts[rec.status] || 0) + 1;
  });
  return { batchId, date: dateStr, ...counts, total: batch.studentIds.length };
}

// ── Student attendance stats ────────────────────────────────────
function getStudentStats(studentId) {
  const student = MOCK_STUDENTS[studentId];
  if (!student) return null;
  const entries = Object.values(MOCK_ATTENDANCE)
    .filter(r => r.studentId === studentId);
  const counts = { present: 0, absent: 0, late: 0, leave: 0 };
  entries.forEach(e => counts[e.status] = (counts[e.status] || 0) + 1);
  const total = entries.length;
  const attended = counts.present + counts.late;
  return { ...counts, total, percentage: total ? Math.round((attended / total) * 100) : 0, studentId };
}

// ── Analytics data ──────────────────────────────────────────────
function getDailyTrend(batchId, days = 30) {
  const today = new Date();
  const data  = [];
  for (let d = days; d >= 0; d--) {
    const date = new Date(today);
    date.setDate(date.getDate() - d);
    const day = date.getDay();
    if (day === 0 || day === 6) continue;
    const dateStr = date.toISOString().split('T')[0];
    const batch   = MOCK_BATCHES.find(b => b.id === batchId);
    if (!batch) continue;
    let present = 0;
    batch.studentIds.forEach(sid => {
      const rec = MOCK_ATTENDANCE[`${batchId}_${dateStr}_${sid}`];
      if (rec && (rec.status === 'present' || rec.status === 'late')) present++;
    });
    const pct = batch.studentIds.length ? Math.round((present / batch.studentIds.length) * 100) : 0;
    data.push({ date: dateStr, label: date.toLocaleDateString('en',{month:'short',day:'numeric'}), percentage: pct });
  }
  return data;
}

// ── Initialize ─────────────────────────────────────────────────
const MOCK_STUDENTS    = buildStudents();
const MOCK_ATTENDANCE  = buildAttendance();

window.MockDB = {
  users:       MOCK_USERS,
  batches:     MOCK_BATCHES,
  students:    MOCK_STUDENTS,
  attendance:  MOCK_ATTENDANCE,
  getTodaysSessions,
  getAttendanceSummary,
  getStudentStats,
  getDailyTrend,
  getBatch:     id => MOCK_BATCHES.find(b => b.id === id),
  getStudent:   id => MOCK_STUDENTS[id],
  getBatchStudents: batchId => {
    const batch = MOCK_BATCHES.find(b => b.id === batchId);
    return batch ? batch.studentIds.map(id => MOCK_STUDENTS[id]).filter(Boolean) : [];
  },
  getTrainers: () => MOCK_USERS.filter(u => u.role === 'trainer'),
  saveAttendance: (records) => {
    records.forEach(r => {
      MOCK_ATTENDANCE[`${r.batchId}_${r.date}_${r.studentId}`] = r;
    });
    return Promise.resolve({ success: true });
  },
  loadFromIndexedDB: async () => {
    if (!window.Store) return;
    try {
      const dbBatches = await window.Store.getAll('batches');
      const dbStudents = await window.Store.getAll('students');
      const dbAttendance = await window.Store.getAll('attendance');

      if (dbBatches && dbBatches.length > 0) {
        MOCK_BATCHES.length = 0;
        dbBatches.forEach(b => MOCK_BATCHES.push(b));
      }
      
      if (dbStudents && dbStudents.length > 0) {
        for (const k in MOCK_STUDENTS) delete MOCK_STUDENTS[k];
        dbStudents.forEach(s => {
          MOCK_STUDENTS[s.id] = s;
        });
      }

      if (dbAttendance && dbAttendance.length > 0) {
        for (const k in MOCK_ATTENDANCE) delete MOCK_ATTENDANCE[k];
        dbAttendance.forEach(a => {
          MOCK_ATTENDANCE[a.id] = a;
        });
      }
      console.info(`[MockDB] Loaded cached records from IndexedDB: ${MOCK_BATCHES.length} batches, ${Object.keys(MOCK_STUDENTS).length} students.`);
    } catch (e) {
      console.warn('[MockDB] IndexedDB load failed, using local seed fallback:', e);
    }
  }
};
