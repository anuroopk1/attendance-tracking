const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// 1. User Schema
const UserSchema = new Schema({
  _id: { type: String, required: true }, // custom string IDs like 'admin1', 'trainer1'
  role: { type: String, enum: ['admin', 'trainer', 'student'], required: true },
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  password: { type: String, required: true },
  photo: { type: String }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual to map _id to id
UserSchema.virtual('id').get(function() {
  return this._id;
});

// 2. Batch Schema
const BatchSchema = new Schema({
  _id: { type: String, required: true }, // custom string IDs like 'b1', 'b2'
  name: { type: String, required: true },
  subject: { type: String, required: true },
  schedule: { type: String },
  room: { type: String },
  color: { type: String, default: '#6750A4' },
  trainers: [{ type: String, ref: 'User' }] // Refs to User._id
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

BatchSchema.virtual('id').get(function() {
  return this._id;
});

// 3. Student Schema
const StudentSchema = new Schema({
  _id: { type: String, required: true }, // custom string IDs like 'b1s001'
  rollNo: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  email: { type: String, required: true, lowercase: true },
  phone: { type: String },
  photo: { type: String },
  batchId: { type: String, ref: 'Batch' }, // Ref to Batch._id
  joinedAt: { type: String }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

StudentSchema.virtual('id').get(function() {
  return this._id;
});

// 4. Attendance Schema
const AttendanceSchema = new Schema({
  _id: { type: String, required: true }, // compound key: 'batchId_date_studentId'
  batchId: { type: String, ref: 'Batch', required: true },
  studentId: { type: String, ref: 'Student', required: true },
  date: { type: String, required: true }, // YYYY-MM-DD
  status: { type: String, enum: ['present', 'absent', 'late', 'leave'], required: true },
  markedBy: { type: String, ref: 'User', required: true },
  markedAt: { type: String, required: true } // ISO string
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

AttendanceSchema.virtual('id').get(function() {
  return this._id;
});

const User = mongoose.model('User', UserSchema);
const Batch = mongoose.model('Batch', BatchSchema);
const Student = mongoose.model('Student', StudentSchema);
const Attendance = mongoose.model('Attendance', AttendanceSchema);

module.exports = {
  User,
  Batch,
  Student,
  Attendance
};
