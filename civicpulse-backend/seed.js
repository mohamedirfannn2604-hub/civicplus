/**
 * CivicPulse — Database Seeder
 * Run: node seed.js
 * Seeds demo users, issues, donors, and volunteers
 */

const Database = require('better-sqlite3');
const bcrypt   = require('bcryptjs');

const db = new Database('civicpulse.db');
console.log('🌱 Seeding CivicPulse database...\n');

// ── Admin User ────────────────────────────────────────────────────
const adminPwd = bcrypt.hashSync('Admin@123', 10);
try {
  db.prepare(
    'INSERT OR IGNORE INTO users (name,email,phone,password,blood_group,role) VALUES (?,?,?,?,?,?)'
  ).run('Admin User','admin@civicpulse.in','9940000001',adminPwd,'O+','admin');
  console.log('✅ Admin user: admin@civicpulse.in / Admin@123');
} catch(e) { console.log('Admin already exists'); }

// ── Demo Citizens ─────────────────────────────────────────────────
const citizens = [
  ['Arjun Kumar',    'arjun@example.com',    '9940000101', 'A+'],
  ['Priya Devi',     'priya@example.com',    '9940000102', 'B+'],
  ['Rajan Mohan',    'rajan@example.com',    '9940000103', 'O+'],
  ['Kavitha Singh',  'kavitha@example.com',  '9940000104', 'AB+'],
  ['Dinesh Raj',     'dinesh@example.com',   '9940000105', 'O-'],
  ['Sunita Patel',   'sunita@example.com',   '9940000106', 'A-'],
  ['Meena Raj',      'meena@example.com',    '9940000107', 'B-'],
  ['Venkat Naidu',   'venkat@example.com',   '9940000108', 'AB-'],
];
const pwd = bcrypt.hashSync('Test@123', 10);
citizens.forEach(([name, email, phone, bg]) => {
  try {
    db.prepare(
      'INSERT OR IGNORE INTO users (name,email,phone,password,blood_group) VALUES (?,?,?,?,?)'
    ).run(name, email, phone, pwd, bg);
  } catch(e) {}
});
console.log(`✅ ${citizens.length} demo citizens (password: Test@123)`);

// ── Blood Donors ──────────────────────────────────────────────────
const donors = [
  ['Suresh Kumar',    'O+',  '9940001001', 'Cuddalore', '2 months ago'],
  ['Priya Devi',      'A+',  '9940001002', 'Cuddalore', '1 month ago'],
  ['Rajan M.',        'B+',  '9940001003', 'Cuddalore', '3 months ago'],
  ['Kavitha S.',      'AB+', '9940001004', 'Cuddalore', '5 months ago'],
  ['Dinesh R.',       'O-',  '9940001005', 'Cuddalore', '6 months ago'],
  ['Anitha P.',       'A-',  '9940001006', 'Cuddalore', '1 month ago'],
  ['Murali T.',       'B-',  '9940001007', 'Cuddalore', '4 months ago'],
  ['Selvi K.',        'AB-', '9940001008', 'Cuddalore', '2 months ago'],
  ['Venkat N.',       'O+',  '9940001009', 'Cuddalore', '3 months ago'],
  ['Sangeetha B.',    'A+',  '9940001010', 'Cuddalore', '2 months ago'],
  ['Ramesh G.',       'B+',  '9940001011', 'Cuddalore', '7 months ago'],
  ['Nithya C.',       'O+',  '9940001012', 'Cuddalore', '1 month ago'],
];
donors.forEach(([name, bg, phone, city, last]) => {
  try {
    db.prepare(
      'INSERT OR IGNORE INTO blood_donors (name,blood_group,phone,city,last_donated,available) VALUES (?,?,?,?,?,1)'
    ).run(name, bg, phone, city, last);
  } catch(e) {}
});
console.log(`✅ ${donors.length} blood donors seeded`);

// ── Volunteers ────────────────────────────────────────────────────
const volunteers = [
  ['Sunita Patel',  28, 'sunita@example.com',  '9940002001', 'Food Distribution', 'Weekends only',  45],
  ['Karthik Raja',  32, 'karthik@example.com', '9940002002', 'Medical Aid',        'Weekday evenings',30],
  ['Ananya Menon',  25, 'ananya@example.com',  '9940002003', 'Education Support',  'Weekends only',  22],
  ['Bharath S.',    35, 'bharath@example.com', '9940002004', 'Disaster Relief',    'Emergency only', 15],
  ['Latha Devi',    42, 'latha@example.com',   '9940002005', 'Elder Care',         'Full-time',      80],
];
volunteers.forEach(([name, age, email, phone, area, avail, hours]) => {
  try {
    db.prepare(
      'INSERT OR IGNORE INTO volunteers (name,age,email,phone,area,availability,hours_logged) VALUES (?,?,?,?,?,?,?)'
    ).run(name, age, email, phone, area, avail, hours);
  } catch(e) {}
});
console.log(`✅ ${volunteers.length} volunteers seeded`);

// ── Sample Issues ─────────────────────────────────────────────────
const issues = [
  ['garbage',    'Rajan Kumar',  '9940003001', 'MG Road, Cuddalore',          'Garbage pile not cleared for 3 days',    'resolved'],
  ['road',       'Priya M.',     '9940003002', 'Anna Nagar, Cuddalore',       'Deep pothole causing accidents',          'in_progress'],
  ['streetlight','Kavitha R.',   '9940003003', 'Gandhi Road, Block C',        'Streetlight non-functional for 2 weeks',  'pending'],
  ['water',      'Arjun Raj',    '9940003004', 'Netaji Street, Cuddalore',    'Water pipe leaking near school gate',     'resolved'],
  ['sewer',      'Meena S.',     '9940003005', 'Market Street, Cuddalore',    'Sewer overflow causing health hazard',    'in_progress'],
  ['road',       'Dinesh T.',    '9940003006', 'Port Road, Cuddalore',        'Road broken after rain, no repair done',  'pending'],
];
let issueIdx = 1;
issues.forEach(([cat, name, phone, loc, desc, status]) => {
  try {
    const ticket = 'CP' + String(issueIdx++).padStart(4,'0');
    db.prepare(
      'INSERT OR IGNORE INTO issues (category,name,phone,location,description,status,ticket_no) VALUES (?,?,?,?,?,?,?)'
    ).run(cat, name, phone, loc, desc, status, ticket);
  } catch(e) {}
});
console.log(`✅ ${issues.length} sample issues seeded`);

// ── Sample Notifications ──────────────────────────────────────────
try {
  const adminId = db.prepare("SELECT id FROM users WHERE email='admin@civicpulse.in'").get()?.id;
  if (adminId) {
    const notes = [
      [adminId, 'New Issue Reported',      'Pothole reported on Anna Nagar Road.',     'warning'],
      [adminId, 'Volunteer Registration',  'Sunita Patel registered as volunteer.',    'success'],
      [adminId, 'Blood Donor Added',       'New O+ donor registered in Cuddalore.',    'info'],
      [adminId, 'Issue Resolved',          'Garbage issue CP0001 marked as resolved.', 'success'],
    ];
    notes.forEach(([uid, title, message, type]) => {
      db.prepare('INSERT INTO notifications (user_id,title,message,type) VALUES (?,?,?,?)').run(uid, title, message, type);
    });
    console.log(`✅ ${notes.length} notifications seeded`);
  }
} catch(e) {}

console.log('\n✨ Database seeded successfully!');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('Admin:  admin@civicpulse.in / Admin@123');
console.log('User:   arjun@example.com  / Test@123');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
db.close();
