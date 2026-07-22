const express = require('express');
const router = express.Router();
const multer = require('multer');
const { Student, Batch, Attendance } = require('../models');
const { authenticateToken } = require('./auth');

const upload = multer({ storage: multer.memoryStorage() });

// Helper to check admin role
function requireAdmin(req, res, next) {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
}

// GET /api/students - List students, optional filter by batchId
router.get('/', authenticateToken, async (req, res) => {
  const { batchId } = req.query;
  const { role, email } = req.user;

  try {
    if (role === 'student') {
      const student = await Student.findOne({ email }).populate('batchId', 'name');
      if (!student) return res.status(404).json({ error: 'Student not found' });
      return res.json([{
        id: student._id,
        rollNo: student.rollNo,
        name: student.name,
        email: student.email,
        phone: student.phone,
        photo: student.photo,
        batchId: student.batchId ? student.batchId._id : null,
        batchName: student.batchId ? student.batchId.name : '',
        joinedAt: student.joinedAt
      }]);
    }

    let filter = {};
    if (batchId) {
      filter.batchId = batchId;
    }

    const students = await Student.find(filter).populate('batchId', 'name');
    const formatted = students.map(s => ({
      id: s._id,
      rollNo: s.rollNo,
      name: s.name,
      email: s.email,
      phone: s.phone,
      photo: s.photo,
      batchId: s.batchId ? s.batchId._id : null,
      batchName: s.batchId ? s.batchId.name : '',
      joinedAt: s.joinedAt
    }));

    res.json(formatted);
  } catch (err) {
    console.error('Fetch students error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/students/:id - Get student by ID
router.get('/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;

  try {
    const student = await Student.findById(id).populate('batchId', 'name');
    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    if (req.user.role === 'student' && req.user.email !== student.email) {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json({
      id: student._id,
      rollNo: student.rollNo,
      name: student.name,
      email: student.email,
      phone: student.phone,
      photo: student.photo,
      batchId: student.batchId ? student.batchId._id : null,
      batchName: student.batchId ? student.batchId.name : '',
      joinedAt: student.joinedAt
    });
  } catch (err) {
    console.error('Fetch student error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/students - Enroll student (Admin only)
router.post('/', authenticateToken, requireAdmin, async (req, res) => {
  const { id, rollNo, name, email, phone, photo, batchId, joinedAt } = req.body;

  if (!name || !email) {
    return res.status(400).json({ error: 'name and email are required' });
  }

  const studentId = id || `s_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;

  try {
    let finalRollNo = rollNo;
    if (!finalRollNo) {
      if (!batchId) {
        return res.status(400).json({ error: 'rollNo is required if batchId is not provided' });
      }
      const count = await Student.countDocuments({ batchId });
      const prefix = batchId.toUpperCase();
      const serial = String(count + 1).padStart(3, '0');
      finalRollNo = `${prefix}-${serial}`;
    }

    // Check if rollNo or email already registered
    const exists = await Student.findOne({ $or: [{ rollNo: finalRollNo }, { email: email.toLowerCase() }] });
    if (exists) {
      return res.status(400).json({ error: 'Student with this roll number or email already exists' });
    }

    await Student.create({
      _id: studentId,
      rollNo: finalRollNo,
      name,
      email: email.toLowerCase(),
      phone: phone || '',
      photo: photo || '',
      batchId: batchId || null,
      joinedAt: joinedAt || new Date().toISOString().split('T')[0]
    });

    res.status(201).json({ success: true, studentId });
  } catch (err) {
    console.error('Create student error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/students/:id - Update student (Admin or Owner)
router.put('/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { name, email, phone, photo, batchId } = req.body;

  try {
    const student = await Student.findById(id);
    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    // Role check: Only admin or the student themselves can update details
    if (req.user.role !== 'admin' && req.user.email !== student.email) {
      return res.status(403).json({ error: 'Unauthorized to edit this profile' });
    }

    const updates = {};
    if (req.user.role === 'admin') {
      if (name) updates.name = name;
      if (email) updates.email = email.toLowerCase();
      if (phone !== undefined) updates.phone = phone;
      if (photo !== undefined) updates.photo = photo;
      if (batchId !== undefined) updates.batchId = batchId || null;
    } else {
      // Student can only update their phone and photo
      if (phone !== undefined) updates.phone = phone;
      if (photo !== undefined) updates.photo = photo;
    }

    await Student.findByIdAndUpdate(id, { $set: updates });
    res.json({ success: true });
  } catch (err) {
    console.error('Update student error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/students/:id - Delete student (Admin only)
router.delete('/:id', authenticateToken, requireAdmin, async (req, res) => {
  const { id } = req.params;

  try {
    const student = await Student.findById(id);
    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    // Delete Student
    await Student.deleteOne({ _id: id });
    
    // Clear associated student attendance logs
    await Attendance.deleteMany({ studentId: id });

    res.json({ success: true });
  } catch (err) {
    console.error('Delete student error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/students/import - Bulk import from CSV (Admin only)
router.post('/import', authenticateToken, requireAdmin, upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  const csvText = req.file.buffer.toString('utf-8');
  const lines = csvText.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  
  if (lines.length <= 1) {
    return res.status(400).json({ error: 'CSV file is empty or missing data lines' });
  }

  // Parse header line: Expects "Name,Roll No,Email,Batch"
  const headers = lines[0].split(',').map(h => h.trim().replace(/^["']|["']$/g, ''));
  const nameIdx = headers.findIndex(h => h.toLowerCase() === 'name');
  const rollIdx = headers.findIndex(h => h.toLowerCase() === 'roll no');
  const emailIdx = headers.findIndex(h => h.toLowerCase() === 'email');
  const batchIdx = headers.findIndex(h => h.toLowerCase() === 'batch');

  if (nameIdx === -1 || rollIdx === -1 || emailIdx === -1) {
    return res.status(400).json({ error: 'CSV must contain columns: Name, Roll No, Email' });
  }

  let imported = 0;
  let errors = [];

  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(',').map(c => c.trim().replace(/^["']|["']$/g, ''));
    if (cols.length < Math.max(nameIdx, rollIdx, emailIdx) + 1) continue;

    const name = cols[nameIdx];
    const rollNo = cols[rollIdx];
    const email = cols[emailIdx];
    const batchName = batchIdx !== -1 ? cols[batchIdx] : '';

    if (!name || !rollNo || !email) {
      errors.push(`Line ${i + 1}: Missing student information`);
      continue;
    }

    try {
      // 1. Resolve batch ID from batch name
      let batchId = null;
      if (batchName) {
        let batch = await Batch.findOne({ name: new RegExp('^' + batchName + '$', 'i') });
        if (!batch) {
          // Dynamically create the batch
          batchId = 'b_' + batchName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
          const bCheck = await Batch.findById(batchId);
          if (!bCheck) {
            await Batch.create({
              _id: batchId,
              name: batchName,
              subject: 'Imported Course',
              schedule: '10:00 AM',
              room: 'Room TBD',
              color: '#6750A4',
              trainers: []
            });
          } else {
            batchId = bCheck._id;
          }
        } else {
          batchId = batch._id;
        }
      }

      // 2. Insert or update student profile
      const existing = await Student.findOne({ $or: [{ rollNo }, { email: email.toLowerCase() }] });
      if (existing) {
        await Student.findByIdAndUpdate(existing._id, {
          $set: {
            name,
            email: email.toLowerCase(),
            batchId
          }
        });
      } else {
        const studentId = `s_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
        await Student.create({
          _id: studentId,
          rollNo,
          name,
          email: email.toLowerCase(),
          phone: '',
          photo: '',
          batchId,
          joinedAt: new Date().toISOString().split('T')[0]
        });
      }
      imported++;
    } catch (err) {
      console.error(`Import line ${i + 1} error:`, err);
      errors.push(`Line ${i + 1}: ${err.message}`);
    }
  }

  res.json({
    success: true,
    message: `Successfully processed CSV file.`,
    importedCount: imported,
    errors: errors.length > 0 ? errors : undefined
  });
});

module.exports = router;
