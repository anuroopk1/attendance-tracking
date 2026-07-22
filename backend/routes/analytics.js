const express = require('express');
const router = express.Router();
const { Batch, Student, Attendance } = require('../models');
const { authenticateToken } = require('./auth');

// GET /api/analytics/daily-status - Overview metrics (Admin only)
router.get('/daily-status', authenticateToken, async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }

  const today = new Date().toISOString().split('T')[0];

  try {
    const totalBatches = await Batch.countDocuments({});
    const totalStudents = await Student.countDocuments({});
    
    // Fetch today's records to count aggregates
    const todayRecords = await Attendance.find({ date: today });
    const totalMarked = todayRecords.length;
    const totalPresent = todayRecords.filter(r => r.status === 'present' || r.status === 'late').length;
    
    // Count unique batch IDs with marked attendance today
    const uniqueBatches = new Set(todayRecords.map(r => r.batchId));
    const batchesDone = uniqueBatches.size;

    const todayRate = totalMarked > 0 ? Math.round((totalPresent / totalMarked) * 100) : 0;

    res.json({
      totalBatches,
      totalStudents,
      todayRate: totalMarked > 0 ? todayRate : null,
      batchesDone,
      date: today
    });
  } catch (err) {
    console.error('Fetch daily status error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/analytics/student/:id - Student attendance breakdown
router.get('/student/:id', authenticateToken, async (req, res) => {
  const studentId = req.params.id;

  try {
    if (req.user.role === 'student') {
      const self = await Student.findOne({ email: req.user.email });
      if (!self || self._id !== studentId) {
        return res.status(403).json({ error: 'Access denied' });
      }
    }

    const records = await Attendance.find({ studentId });
    const counts = { present: 0, absent: 0, late: 0, leave: 0 };
    
    records.forEach(r => {
      if (counts.hasOwnProperty(r.status)) {
        counts[r.status]++;
      }
    });

    const total = records.length;
    const attended = counts.present + counts.late;
    const percentage = total > 0 ? Math.round((attended / total) * 100) : 0;

    res.json({
      studentId,
      ...counts,
      total,
      percentage
    });
  } catch (err) {
    console.error('Fetch student stats error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/analytics/trend/:batchId - 30-day attendance trend
router.get('/trend/:batchId', authenticateToken, async (req, res) => {
  const { batchId } = req.params;

  try {
    if (req.user.role === 'student') {
      const student = await Student.findOne({ email: req.user.email });
      if (!student || student.batchId !== batchId) {
        return res.status(403).json({ error: 'Access denied' });
      }
    }

    // Run aggregation query grouping by date
    const rows = await Attendance.aggregate([
      { $match: { batchId } },
      {
        $group: {
          _id: '$date',
          total: { $sum: 1 },
          present: {
            $sum: {
              $cond: [{ $in: ['$status', ['present', 'late']] }, 1, 0]
            }
          }
        }
      },
      { $sort: { _id: -1 } },
      { $limit: 30 }
    ]);

    // Format for chronological order
    const trend = rows.map(r => {
      const dateObj = new Date(r._id);
      const label = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      const percentage = r.total > 0 ? Math.round((r.present / r.total) * 100) : 0;
      return {
        date: r._id,
        label,
        percentage
      };
    }).reverse();

    res.json(trend);
  } catch (err) {
    console.error('Fetch trend error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
