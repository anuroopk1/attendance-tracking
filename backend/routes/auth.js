const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { User, Student, Batch } = require('../models');

const JWT_SECRET = process.env.JWT_SECRET || 'attendtrack_secret_key_12345';

// Middleware to authenticate requests
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
}

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  try {
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Sign JWT token
    const token = jwt.sign(
      { id: user._id, role: user.role, name: user.name, email: user.email },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Get assigned batches if trainer, or batchId if student
    let extraData = {};
    if (user.role === 'trainer') {
      const batches = await Batch.find({ trainers: user._id });
      extraData.assignedBatches = batches.map(b => b._id);
    } else if (user.role === 'student') {
      const student = await Student.findOne({ email: user.email });
      if (student) {
        extraData.batchId = student.batchId;
        extraData.rollNo = student.rollNo;
        extraData.id = student._id;
      }
    }

    res.json({
      token,
      user: {
        uid: user._id,
        role: user.role,
        name: user.name,
        email: user.email,
        photo: user.photo,
        ...extraData
      }
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

function requireAdmin(req, res, next) {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    res.status(403).json({ error: 'Access denied: Admin role required' });
  }
}

// POST /api/auth/register - Register a user (Admin only)
router.post('/register', authenticateToken, requireAdmin, async (req, res) => {
  const { role, name, email, password, photo } = req.body;

  if (!role || !name || !email) {
    return res.status(400).json({ error: 'role, name, and email are required' });
  }

  try {
    const exists = await User.findOne({ email: email.toLowerCase() });
    if (exists) {
      return res.status(400).json({ error: 'User with this email already exists' });
    }

    const hashedPwd = await bcrypt.hash(password || 'trainer123', 10);
    const userId = `u_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;

    await User.create({
      _id: userId,
      role,
      name,
      email: email.toLowerCase(),
      password: hashedPwd,
      photo: photo || '',
      assignedBatches: []
    });

    res.status(201).json({ success: true, userId });
  } catch (err) {
    console.error('Register user error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = {
  router,
  authenticateToken,
  requireAdmin
};
