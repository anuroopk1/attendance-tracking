require('dotenv').config();
const bcrypt = require('bcryptjs');
const { connectDB, mongoose } = require('./db');
const { User, Batch, Student, Attendance } = require('./models');

const FIRST_NAMES = ['Aarav','Aditi','Aditya','Akash','Amrita','Ananya','Anjali','Arjun','Arnav','Aryan','Deepak','Divya','Farhan','Gayathri','Harshit','Ishaan','Jiya','Karan','Kavita','Krishnan','Lakshmi','Manav','Megha','Mihir','Neha','Nikhil','Nisha','Om','Priya','Rahul','Rajesh','Riya','Rohit','Sakshi','Sanjay','Sneha','Suresh','Tanvi','Tushar','Uday','Vaishnavi','Varun','Vidya','Vijay','Vivek','Yash','Zara'];
const LAST_NAMES  = ['Agarwal','Bhat','Chandra','Das','Desai','Dubey','Ghosh','Gupta','Iyer','Jain','Joshi','Kapoor','Kaur','Khan','Kumar','Malhotra','Mehta','Mishra','Nair','Patel','Pillai','Rao','Reddy','Shah','Sharma','Singh','Sinha','Srivastava','Tiwari','Varma','Verma'];

function hashCode(str) {
  let h = 0;
  for (const c of String(str)) h = Math.imul(31, h) + c.charCodeAt(0) | 0;
  return h;
}

function randomName(seed) {
  const s = Math.abs(hashCode(seed));
  return `${FIRST_NAMES[s % FIRST_NAMES.length]} ${LAST_NAMES[(s >> 4) % LAST_NAMES.length]}`;
}

function initials(name) {
  return name.split(' ').slice(0,2).map(w => w[0]).join('').toUpperCase();
}

function makeAvatarSvg(initials, idx = 0) {
  const AVATAR_COLORS = [
    ['#6750A4','#fff'],['#625B71','#fff'],['#7D5260','#fff'],
    ['#0D47A1','#fff'],['#1B5E20','#fff'],['#E65100','#fff'],
    ['#880E4F','#fff'],['#1A237E','#fff'],['#004D40','#fff'],
    ['#37474F','#fff'],
  ];
  const [bg, fg] = AVATAR_COLORS[idx % AVATAR_COLORS.length];
  return `data:image/svg+xml,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128">
      <rect width="128" height="128" rx="64" fill="${bg}"/>
      <text x="64" y="64" dominant-baseline="central" text-anchor="middle"
        font-family="Inter,sans-serif" font-size="44" font-weight="700" fill="${fg}">${initials}</text>
    </svg>`
  )}`;
}

function genIds(prefix, count) {
  return Array.from({ length: count }, (_, i) => `${prefix}${String(i+1).padStart(3,'0')}`);
}

async function runSeed() {
  console.log('Connecting to MongoDB...');
  await connectDB();

  console.log('Clearing existing collections...');
  await User.deleteMany({});
  await Batch.deleteMany({});
  await Student.deleteMany({});
  await Attendance.deleteMany({});

  // 2. Hash default passwords
  const adminPwd = await bcrypt.hash('admin123', 10);
  const trainerPwd = await bcrypt.hash('trainer123', 10);
  const studentPwd = await bcrypt.hash('student123', 10);

  // 3. Seed Users
  const users = [
    { _id: 'admin1',   role: 'admin',   name: 'Dr. Priya Sharma',    email: 'admin@demo.com',   password: adminPwd,   photo: makeAvatarSvg('PS', 7) },
    { _id: 'trainer1', role: 'trainer', name: 'Prof. Rajesh Kumar',  email: 'trainer@demo.com', password: trainerPwd, photo: makeAvatarSvg('RK', 0) },
    { _id: 'trainer2', role: 'trainer', name: 'Prof. Anita Desai',   email: 'trainer2@demo.com',password: trainerPwd, photo: makeAvatarSvg('AD', 9) },
    { _id: 'student1', role: 'student', name: 'Arjun Mehta',         email: 'student@demo.com', password: studentPwd, photo: makeAvatarSvg('AM', 1) },
  ];

  await User.insertMany(users);
  console.log(`Seeded ${users.length} users.`);

  // 4. Seed Batches
  const batches = [
    { _id: 'b1', name: 'CS-A Morning',   subject: 'Data Structures',    schedule: '09:00 AM', room: 'Lab 301', color: '#6750A4', trainers: ['trainer1'] },
    { _id: 'b2', name: 'CS-B Afternoon', subject: 'Algorithms',         schedule: '02:00 PM', room: 'Room 204', color: '#0D47A1', trainers: ['trainer1'] },
    { _id: 'b3', name: 'IT-A Morning',   subject: 'Database Systems',   schedule: '10:30 AM', room: 'Lab 201', color: '#1B5E20', trainers: ['trainer2'] },
    { _id: 'b4', name: 'EC-A Evening',   subject: 'Digital Electronics', schedule: '04:00 PM', room: 'Room 105', color: '#880E4F', trainers: [] },
  ];

  await Batch.insertMany(batches);
  console.log(`Seeded ${batches.length} batches.`);

  // 5. Seed Students
  const batchStudentsInfo = [
    { batchId: 'b1', count: 22, prefix: 'b1s' },
    { batchId: 'b2', count: 18, prefix: 'b2s' },
    { batchId: 'b3', count: 30, prefix: 'b3s' },
    { batchId: 'b4', count: 25, prefix: 'b4s' }
  ];

  const studentsList = [];

  for (const info of batchStudentsInfo) {
    const ids = genIds(info.prefix, info.count);
    for (let i = 0; i < ids.length; i++) {
      const sid = ids[i];
      let name = randomName(sid);
      let rollNo = `${info.batchId.toUpperCase()}21${String(i+1).padStart(3,'0')}`;
      
      if (sid === 'b1s001') {
        name = 'Arjun Mehta';
        rollNo = 'CS21001';
      }

      const s = {
        _id: sid,
        rollNo,
        name,
        email: `${name.toLowerCase().replace(/\s+/g, '.')}@student.edu`,
        phone: `+91 9${String(7000000000 + hashCode(sid) % 100000000).slice(0,9)}`,
        photo: makeAvatarSvg(initials(name), i % 10),
        batchId: info.batchId,
        joinedAt: '2021-07-15'
      };
      studentsList.push(s);
    }
  }

  await Student.insertMany(studentsList);
  console.log(`Seeded ${studentsList.length} students.`);

  // 6. Seed Historical Attendance (last 60 days, skipping weekends)
  const STATUS_OPTIONS = ['present','present','present','present','absent','late','leave'];
  const today = new Date();
  const attendanceList = [];

  for (const batch of batches) {
    const studentIds = genIds(batch._id === 'b1' ? 'b1s' : batch._id === 'b2' ? 'b2s' : batch._id === 'b3' ? 'b3s' : 'b4s', 
                              batch._id === 'b1' ? 22 : batch._id === 'b2' ? 18 : batch._id === 'b3' ? 30 : 25);
    
    for (let d = 60; d >= 1; d--) {
      const date = new Date(today);
      date.setDate(date.getDate() - d);
      const day = date.getDay(); // 0=Sun, 6=Sat
      if (day === 0 || day === 6) continue; // Skip weekends

      const dateStr = date.toISOString().split('T')[0];
      const trainerId = batch.trainers[0] || 'trainer1';

      for (const sid of studentIds) {
        const seed = hashCode(`${sid}_${dateStr}`);
        const status = STATUS_OPTIONS[Math.abs(seed) % STATUS_OPTIONS.length];
        const recordId = `${batch._id}_${dateStr}_${sid}`;
        const markedAt = date.toISOString();

        attendanceList.push({
          _id: recordId,
          batchId: batch._id,
          studentId: sid,
          date: dateStr,
          status,
          markedBy: trainerId,
          markedAt
        });
      }
    }
  }

  await Attendance.insertMany(attendanceList);
  console.log(`Seeded ${attendanceList.length} attendance records.`);

  console.log('Database seeding successfully finished.');
  await mongoose.disconnect();
}

runSeed().catch(async (err) => {
  console.error('Database seeding failed:', err);
  await mongoose.disconnect();
  process.exit(1);
});
