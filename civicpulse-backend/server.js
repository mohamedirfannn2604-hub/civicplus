/**
 * CivicPulse Backend — Node.js + Express + SQLite
 * Run: npm install && node server.js
 * Base URL: http://localhost:5000/api
 */

const express      = require('express');
const cors         = require('cors');
const bcrypt       = require('bcryptjs');
const jwt          = require('jsonwebtoken');
const multer       = require('multer');
const path         = require('path');
const fs           = require('fs');
const Database     = require('better-sqlite3');

const app  = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'civicpulse_secret_key_2026';

// ── Middleware ─────────────────────────────────────────────────────
app.use(cors({ origin: '*', credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static('uploads'));

// ── Upload directory ───────────────────────────────────────────────
if (!fs.existsSync('uploads')) fs.mkdirSync('uploads');

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename:    (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname))
});
const upload = multer({ storage, limits: { fileSize: 20 * 1024 * 1024 } });

// ── SQLite Database ────────────────────────────────────────────────
const db = new Database('civicpulse.db');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    name        TEXT    NOT NULL,
    email       TEXT    UNIQUE NOT NULL,
    phone       TEXT,
    password    TEXT    NOT NULL,
    blood_group TEXT,
    role        TEXT    DEFAULT 'citizen',
    created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS issues (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id     INTEGER,
    category    TEXT    NOT NULL,
    name        TEXT    NOT NULL,
    phone       TEXT    NOT NULL,
    location    TEXT    NOT NULL,
    description TEXT    NOT NULL,
    photo_url   TEXT,
    status      TEXT    DEFAULT 'pending',
    ticket_no   TEXT    UNIQUE,
    created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS blood_donors (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id      INTEGER,
    name         TEXT NOT NULL,
    blood_group  TEXT NOT NULL,
    phone        TEXT NOT NULL,
    city         TEXT NOT NULL,
    address      TEXT,
    last_donated TEXT,
    available    INTEGER DEFAULT 1,
    created_at   DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS volunteers (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id      INTEGER,
    name         TEXT NOT NULL,
    age          INTEGER,
    email        TEXT NOT NULL,
    phone        TEXT NOT NULL,
    area         TEXT NOT NULL,
    availability TEXT NOT NULL,
    hours_logged INTEGER DEFAULT 0,
    status       TEXT DEFAULT 'active',
    created_at   DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS hospitals (
    id       INTEGER PRIMARY KEY AUTOINCREMENT,
    name     TEXT NOT NULL,
    type     TEXT NOT NULL,
    address  TEXT NOT NULL,
    phone    TEXT,
    lat      REAL,
    lng      REAL,
    beds     INTEGER,
    open_24h INTEGER DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS schemes (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    title       TEXT NOT NULL,
    category    TEXT NOT NULL,
    description TEXT NOT NULL,
    apply_link  TEXT,
    deadline    TEXT,
    active      INTEGER DEFAULT 1,
    created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS notifications (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id    INTEGER,
    title      TEXT NOT NULL,
    message    TEXT NOT NULL,
    type       TEXT DEFAULT 'info',
    read       INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS contacts (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    name       TEXT NOT NULL,
    email      TEXT NOT NULL,
    subject    TEXT NOT NULL,
    message    TEXT NOT NULL,
    replied    INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

// Seed hospitals if empty
const hospitalCount = db.prepare('SELECT COUNT(*) as c FROM hospitals').get().c;
if (hospitalCount === 0) {
  const insertHospital = db.prepare(
    'INSERT INTO hospitals (name, type, address, phone, lat, lng, beds, open_24h) VALUES (?,?,?,?,?,?,?,?)'
  );
  [
    ['Government General Hospital','Government','Gandhi Road, Cuddalore','04142-220100',11.7447,79.7689,200,1],
    ['PHC — Anna Nagar','Primary Health Centre','Anna Nagar, Cuddalore','04142-221200',11.7480,79.7720,30,0],
    ['District Blood Bank','Blood Bank','Hospital Road, Cuddalore','04142-220500',11.7430,79.7650,0,0],
    ['CMCHIS Specialty Hospital','Specialty','Nellikuppam Road, Cuddalore','04142-230100',11.7390,79.7600,120,1],
    ['Child Welfare Centre','Paediatric','Cuddalore Port Road','04142-222300',11.7510,79.7700,50,0],
    ['Mental Health Resource Centre','Mental Health','Cuddalore Town','04142-225000',11.7460,79.7710,40,0],
  ].forEach(h => insertHospital.run(...h));
}

// Seed schemes if empty
const schemeCount = db.prepare('SELECT COUNT(*) as c FROM schemes').get().c;
if (schemeCount === 0) {
  const insertScheme = db.prepare(
    'INSERT INTO schemes (title, category, description, apply_link, deadline) VALUES (?,?,?,?,?)'
  );
  [
    ['PM Awas Yojana (Urban)','Housing','Affordable housing subsidy up to ₹2.5 lakh for low-income families.','https://pmaymis.gov.in','2026-06-30'],
    ['Ayushman Bharat — PMJAY','Health','Free healthcare up to ₹5 lakh/year for 10 crore+ families.','https://pmjay.gov.in',null],
    ['PM Scholarship Scheme','Education','₹2,500–₹3,000/month for children of ex-servicemen.','https://ksb.gov.in','2026-05-31'],
    ['Beti Bachao Beti Padhao','Women','Empowerment of girl child through education and nutrition.','https://wcd.nic.in',null],
    ['PM-KISAN Samman Nidhi','Agriculture','₹6,000/year direct income support to farmer families.','https://pmkisan.gov.in',null],
    ['Swachh Bharat Mission','Sanitation','Clean India initiative — universal sanitation coverage.','https://swachhbharat.mygov.in',null],
  ].forEach(s => insertScheme.run(...s));
}

// ── Auth Middleware ────────────────────────────────────────────────
function authMiddleware(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token provided' });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
}

// ── Helper ─────────────────────────────────────────────────────────
function generateTicket() {
  return 'CP' + Date.now().toString().slice(-6) + Math.floor(Math.random() * 100);
}

// ════════════════════════════════════════════════════════════════════
//  AUTH ROUTES
// ════════════════════════════════════════════════════════════════════

// Register
app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, phone, password, blood_group } = req.body;
    if (!name || !email || !password)
      return res.status(400).json({ error: 'Name, email and password required' });

    const exists = db.prepare('SELECT id FROM users WHERE email=?').get(email);
    if (exists) return res.status(409).json({ error: 'Email already registered' });

    const hash = await bcrypt.hash(password, 10);
    const stmt = db.prepare(
      'INSERT INTO users (name,email,phone,password,blood_group) VALUES (?,?,?,?,?)'
    );
    const result = stmt.run(name, email, phone || null, hash, blood_group || null);
    const token  = jwt.sign({ id: result.lastInsertRowid, email, name, role: 'citizen' }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ message: 'Registered successfully', token, user: { id: result.lastInsertRowid, name, email } });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = db.prepare('SELECT * FROM users WHERE email=?').get(email);
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });
    const ok = await bcrypt.compare(password, user.password);
    if (!ok) return res.status(401).json({ error: 'Invalid credentials' });
    const token = jwt.sign({ id: user.id, email: user.email, name: user.name, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ message: 'Login successful', token, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Get profile
app.get('/api/auth/profile', authMiddleware, (req, res) => {
  const user = db.prepare('SELECT id,name,email,phone,blood_group,role,created_at FROM users WHERE id=?').get(req.user.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json(user);
});

// ════════════════════════════════════════════════════════════════════
//  ISSUES ROUTES
// ════════════════════════════════════════════════════════════════════

// Report issue
app.post('/api/issues', upload.single('photo'), (req, res) => {
  try {
    const { category, name, phone, location, description, user_id } = req.body;
    if (!category || !name || !phone || !location || !description)
      return res.status(400).json({ error: 'All fields required' });

    const photo_url = req.file ? `/uploads/${req.file.filename}` : null;
    const ticket_no = generateTicket();
    const stmt = db.prepare(
      'INSERT INTO issues (user_id,category,name,phone,location,description,photo_url,ticket_no) VALUES (?,?,?,?,?,?,?,?)'
    );
    const result = stmt.run(user_id || null, category, name, phone, location, description, photo_url, ticket_no);
    res.json({ message: 'Issue reported successfully', ticket_no, id: result.lastInsertRowid });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Get all issues (admin) or user's issues
app.get('/api/issues', authMiddleware, (req, res) => {
  const { status, category, limit = 50 } = req.query;
  let query = 'SELECT * FROM issues';
  const params = [];
  const conditions = [];
  if (req.user.role !== 'admin') {
    conditions.push('user_id=?'); params.push(req.user.id);
  }
  if (status) { conditions.push('status=?'); params.push(status); }
  if (category) { conditions.push('category=?'); params.push(category); }
  if (conditions.length) query += ' WHERE ' + conditions.join(' AND ');
  query += ' ORDER BY created_at DESC LIMIT ?';
  params.push(parseInt(limit));
  res.json(db.prepare(query).all(...params));
});

// Get single issue by ticket
app.get('/api/issues/track/:ticket', (req, res) => {
  const issue = db.prepare('SELECT * FROM issues WHERE ticket_no=?').get(req.params.ticket);
  if (!issue) return res.status(404).json({ error: 'Ticket not found' });
  res.json(issue);
});

// Update issue status (admin)
app.patch('/api/issues/:id/status', authMiddleware, (req, res) => {
  const { status } = req.body;
  const allowed = ['pending','in_progress','resolved','rejected'];
  if (!allowed.includes(status)) return res.status(400).json({ error: 'Invalid status' });
  db.prepare("UPDATE issues SET status=?, updated_at=CURRENT_TIMESTAMP WHERE id=?").run(status, req.params.id);
  res.json({ message: 'Status updated' });
});

// ════════════════════════════════════════════════════════════════════
//  BLOOD DONORS ROUTES
// ════════════════════════════════════════════════════════════════════

app.get('/api/donors', (req, res) => {
  const { blood_group, city, available } = req.query;
  let q = 'SELECT * FROM blood_donors';
  const params = [], conds = [];
  if (blood_group) { conds.push('blood_group=?'); params.push(blood_group); }
  if (city)        { conds.push('city LIKE ?');    params.push(`%${city}%`); }
  if (available !== undefined) { conds.push('available=?'); params.push(parseInt(available)); }
  if (conds.length) q += ' WHERE ' + conds.join(' AND ');
  q += ' ORDER BY created_at DESC';
  res.json(db.prepare(q).all(...params));
});

app.post('/api/donors', (req, res) => {
  try {
    const { name, blood_group, phone, city, address, user_id } = req.body;
    if (!name || !blood_group || !phone || !city)
      return res.status(400).json({ error: 'Name, blood group, phone and city required' });
    const stmt = db.prepare(
      'INSERT INTO blood_donors (user_id,name,blood_group,phone,city,address) VALUES (?,?,?,?,?,?)'
    );
    const r = stmt.run(user_id || null, name, blood_group, phone, city, address || null);
    res.json({ message: 'Registered as blood donor', id: r.lastInsertRowid });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ════════════════════════════════════════════════════════════════════
//  VOLUNTEERS ROUTES
// ════════════════════════════════════════════════════════════════════

app.get('/api/volunteers', authMiddleware, (req, res) => {
  const { area, availability } = req.query;
  let q = 'SELECT id,name,age,email,phone,area,availability,hours_logged,status,created_at FROM volunteers';
  const params = [], conds = [];
  if (area)         { conds.push('area LIKE ?');         params.push(`%${area}%`); }
  if (availability) { conds.push('availability LIKE ?'); params.push(`%${availability}%`); }
  if (conds.length) q += ' WHERE ' + conds.join(' AND ');
  res.json(db.prepare(q).all(...params));
});

app.post('/api/volunteers', (req, res) => {
  try {
    const { name, age, email, phone, area, availability, user_id } = req.body;
    if (!name || !email || !phone || !area || !availability)
      return res.status(400).json({ error: 'All fields required' });
    const stmt = db.prepare(
      'INSERT INTO volunteers (user_id,name,age,email,phone,area,availability) VALUES (?,?,?,?,?,?,?)'
    );
    const r = stmt.run(user_id || null, name, age || null, email, phone, area, availability);
    res.json({ message: 'Volunteer registered successfully', id: r.lastInsertRowid });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ════════════════════════════════════════════════════════════════════
//  HOSPITALS ROUTES
// ════════════════════════════════════════════════════════════════════

app.get('/api/hospitals', (req, res) => {
  const { type, open_24h } = req.query;
  let q = 'SELECT * FROM hospitals';
  const params = [], conds = [];
  if (type)    { conds.push('type=?');     params.push(type); }
  if (open_24h !== undefined) { conds.push('open_24h=?'); params.push(parseInt(open_24h)); }
  if (conds.length) q += ' WHERE ' + conds.join(' AND ');
  res.json(db.prepare(q).all(...params));
});

// ════════════════════════════════════════════════════════════════════
//  SCHEMES ROUTES
// ════════════════════════════════════════════════════════════════════

app.get('/api/schemes', (req, res) => {
  const { category } = req.query;
  let q = 'SELECT * FROM schemes WHERE active=1';
  const params = [];
  if (category) { q += ' AND category=?'; params.push(category); }
  res.json(db.prepare(q).all(...params));
});

// ════════════════════════════════════════════════════════════════════
//  NOTIFICATIONS ROUTES
// ════════════════════════════════════════════════════════════════════

app.get('/api/notifications', authMiddleware, (req, res) => {
  const notes = db.prepare(
    'SELECT * FROM notifications WHERE user_id=? ORDER BY created_at DESC LIMIT 20'
  ).all(req.user.id);
  res.json(notes);
});

app.patch('/api/notifications/:id/read', authMiddleware, (req, res) => {
  db.prepare('UPDATE notifications SET read=1 WHERE id=? AND user_id=?').run(req.params.id, req.user.id);
  res.json({ message: 'Marked as read' });
});

// ════════════════════════════════════════════════════════════════════
//  CONTACT ROUTES
// ════════════════════════════════════════════════════════════════════

app.post('/api/contact', (req, res) => {
  try {
    const { name, email, subject, message } = req.body;
    if (!name || !email || !subject || !message)
      return res.status(400).json({ error: 'All fields required' });
    db.prepare('INSERT INTO contacts (name,email,subject,message) VALUES (?,?,?,?)').run(name, email, subject, message);
    res.json({ message: 'Message received! We will respond within 24 hours.' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ════════════════════════════════════════════════════════════════════
//  DASHBOARD STATS
// ════════════════════════════════════════════════════════════════════

app.get('/api/dashboard', authMiddleware, (req, res) => {
  const uid = req.user.id;
  const myIssues      = db.prepare('SELECT COUNT(*) as c FROM issues WHERE user_id=?').get(uid).c;
  const resolved      = db.prepare("SELECT COUNT(*) as c FROM issues WHERE user_id=? AND status='resolved'").get(uid).c;
  const volunteerRec  = db.prepare('SELECT * FROM volunteers WHERE user_id=? LIMIT 1').get(uid);
  const donorRec      = db.prepare('SELECT * FROM blood_donors WHERE user_id=? LIMIT 1').get(uid);
  const notifications = db.prepare('SELECT COUNT(*) as c FROM notifications WHERE user_id=? AND read=0').get(uid).c;
  const recentIssues  = db.prepare('SELECT * FROM issues WHERE user_id=? ORDER BY created_at DESC LIMIT 5').all(uid);

  res.json({
    stats: {
      issues_reported: myIssues,
      issues_resolved: resolved,
      volunteer_hours: volunteerRec?.hours_logged || 0,
      blood_group:     donorRec?.blood_group || null,
      unread_notifications: notifications
    },
    recent_issues: recentIssues,
    volunteer: volunteerRec,
    donor: donorRec
  });
});

// ════════════════════════════════════════════════════════════════════
//  COMMUNITY STATS (public)
// ════════════════════════════════════════════════════════════════════

app.get('/api/stats', (req, res) => {
  res.json({
    issues_reported:  db.prepare('SELECT COUNT(*) as c FROM issues').get().c,
    issues_resolved:  db.prepare("SELECT COUNT(*) as c FROM issues WHERE status='resolved'").get().c,
    blood_donors:     db.prepare('SELECT COUNT(*) as c FROM blood_donors WHERE available=1').get().c,
    volunteers:       db.prepare("SELECT COUNT(*) as c FROM volunteers WHERE status='active'").get().c,
    hospitals:        db.prepare('SELECT COUNT(*) as c FROM hospitals').get().c,
    users:            db.prepare('SELECT COUNT(*) as c FROM users').get().c,
  });
});

// ── Health check ───────────────────────────────────────────────────
app.get('/api/health', (req, res) => res.json({ status: 'ok', version: '1.0.0', timestamp: new Date().toISOString() }));

// ── Start server ───────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n🚀 CivicPulse Backend running on http://localhost:${PORT}`);
  console.log(`📋 API Base: http://localhost:${PORT}/api`);
  console.log(`💾 Database: civicpulse.db\n`);
});
