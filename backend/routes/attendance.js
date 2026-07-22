const express = require('express');
const router = express.Router();
const { Attendance, Student } = require('../models');
const { authenticateToken } = require('./auth');

// GET /api/attendance - Fetch records for batch and date
router.get('/', authenticateToken, async (req, res) => {
  const { batchId, date } = req.query;

  if (!batchId) {
    return res.status(400).json({ error: 'batchId is required' });
  }

  const queryDate = date || new Date().toISOString().split('T')[0];

  try {
    if (req.user.role === 'student') {
      const student = await Student.findOne({ email: req.user.email });
      if (!student || student.batchId !== batchId) {
        return res.status(403).json({ error: 'Access denied to this batch data' });
      }
    }

    const rows = await Attendance.find({ batchId, date: queryDate }).populate('studentId');
    const formatted = rows.map(r => ({
      batchId: r.batchId,
      studentId: r.studentId ? (r.studentId._id || r.studentId) : null,
      studentName: r.studentId && typeof r.studentId === 'object' ? r.studentId.name : '',
      studentRollNo: r.studentId && typeof r.studentId === 'object' ? r.studentId.rollNo : '',
      date: r.date,
      status: r.status,
      markedBy: r.markedBy,
      markedAt: r.markedAt
    }));

    res.json(formatted);
  } catch (err) {
    console.error('Fetch attendance error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/attendance/sync - Sync local client records with database (Upsert with conflict resolution)
router.post('/sync', authenticateToken, async (req, res) => {
  const records = req.body;

  if (!Array.isArray(records)) {
    return res.status(400).json({ error: 'Body must be an array of attendance records' });
  }

  if (req.user.role !== 'admin' && req.user.role !== 'trainer') {
    return res.status(403).json({ error: 'Unauthorized to log attendance' });
  }

  try {
    const recordIds = records.map(r => `${r.batchId}_${r.date}_${r.studentId}`);
    
    // Find all existing records for these IDs in a single query
    const existing = await Attendance.find({ _id: { $in: recordIds } });
    const existingMap = new Map(existing.map(e => [e._id, e.markedAt]));

    const bulkOps = [];

    records.forEach(r => {
      const { batchId, studentId, date, status, markedBy, markedAt } = r;

      if (!batchId || !studentId || !date || !status || !markedBy || !markedAt) {
        return;
      }

      const recordId = `${batchId}_${date}_${studentId}`;
      const oldMarkedAt = existingMap.get(recordId);

      if (oldMarkedAt) {
        // Resolve conflicts by comparing markedAt dates
        if (new Date(markedAt) > new Date(oldMarkedAt)) {
          bulkOps.push({
            updateOne: {
              filter: { _id: recordId },
              update: { $set: { status, markedBy, markedAt } }
            }
          });
        }
      } else {
        // Record does not exist, insert it
        bulkOps.push({
          insertOne: {
            document: {
              _id: recordId,
              batchId,
              studentId,
              date,
              status,
              markedBy,
              markedAt
            }
          }
        });
      }
    });

    if (bulkOps.length > 0) {
      await Attendance.bulkWrite(bulkOps);
    }

    res.json({ success: true, message: 'Sync processed successfully' });
  } catch (err) {
    console.error('Attendance sync error:', err);
    res.status(500).json({ error: 'Internal server error during sync' });
  }
});

module.exports = router;
