const express = require('express');
const router = express.Router();
const { Batch, Student, Attendance } = require('../models');
const { authenticateToken } = require('./auth');

// Helper to check admin role
function requireAdmin(req, res, next) {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
}

// GET /api/batches - List all batches
router.get('/', authenticateToken, async (req, res) => {
  const { role, id, email } = req.user;

  try {
    let batches = [];

    if (role === 'admin') {
      batches = await Batch.find({});
    } else if (role === 'trainer') {
      batches = await Batch.find({ trainers: id });
    } else if (role === 'student') {
      const student = await Student.findOne({ email });
      if (student && student.batchId) {
        batches = await Batch.find({ _id: student.batchId });
      }
    } else {
      return res.status(403).json({ error: 'Unauthorized role' });
    }

    // Append student count to each batch response
    const formatted = await Promise.all(batches.map(async b => {
      const studentCount = await Student.countDocuments({ batchId: b._id });
      return {
        id: b._id,
        name: b.name,
        subject: b.subject,
        schedule: b.schedule,
        room: b.room,
        color: b.color,
        trainerIds: b.trainers,
        studentCount
      };
    }));

    res.json(formatted);
  } catch (err) {
    console.error('Fetch batches error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/batches - Create batch (Admin only)
router.post('/', authenticateToken, requireAdmin, async (req, res) => {
  const { id, name, subject, schedule, room, color, trainerIds } = req.body;

  if (!id || !name || !subject) {
    return res.status(400).json({ error: 'id, name, and subject are required' });
  }

  try {
    const exists = await Batch.findById(id);
    if (exists) {
      return res.status(400).json({ error: 'Batch with this ID already exists' });
    }

    await Batch.create({
      _id: id,
      name,
      subject,
      schedule: schedule || '',
      room: room || '',
      color: color || '#6750A4',
      trainers: trainerIds || []
    });

    res.status(201).json({ success: true, batchId: id });
  } catch (err) {
    console.error('Create batch error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/batches/:id - Update batch (Admin only)
router.put('/:id', authenticateToken, requireAdmin, async (req, res) => {
  const batchId = req.params.id;
  const { name, subject, schedule, room, color, trainerIds } = req.body;

  if (!name || !subject) {
    return res.status(400).json({ error: 'name and subject are required' });
  }

  try {
    const batch = await Batch.findById(batchId);
    if (!batch) {
      return res.status(404).json({ error: 'Batch not found' });
    }

    await Batch.findByIdAndUpdate(batchId, {
      $set: {
        name,
        subject,
        schedule: schedule || '',
        room: room || '',
        color: color || '#6750A4',
        trainers: trainerIds || []
      }
    });

    res.json({ success: true });
  } catch (err) {
    console.error('Update batch error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/batches/:id - Delete batch (Admin only)
router.delete('/:id', authenticateToken, requireAdmin, async (req, res) => {
  const batchId = req.params.id;

  try {
    const batch = await Batch.findById(batchId);
    if (!batch) {
      return res.status(404).json({ error: 'Batch not found' });
    }

    // Remove batch
    await Batch.deleteOne({ _id: batchId });

    // Cascade operations:
    // 1. Clear batchId from assigned students
    await Student.updateMany({ batchId }, { $set: { batchId: null } });
    
    // 2. Delete all attendance records associated with this batch
    await Attendance.deleteMany({ batchId });

    res.json({ success: true });
  } catch (err) {
    console.error('Delete batch error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
