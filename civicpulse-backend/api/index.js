/**
 * CivicPulse Backend — Express + Prisma + PostgreSQL
 * Vercel-compatible (no native modules)
 * 
 * Local dev:  node api/index.js
 * Production: Vercel serverless (via vercel.json)
 */

const express   = require('express');
const cors      = require('cors');
const bcrypt    = require('bcryptjs');
const jwt       = require('jsonwebtoken');
const multer    = require('multer');
const { PrismaClient } = require('@prisma/client');

const app    = express();
const prisma = new PrismaClient();
const PORT   = process.env.PORT || 5000;
const SECRET = process.env.JWT_SECRET || 'civicpulse_secret_2026';

// ── Middleware ─────────────────────────────────────────────────────
app.use(cors({ origin: '*' }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ── File upload (memory storage — no disk on Vercel) ──────────────
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB on serverless
});

// ── Auth middleware ────────────────────────────────────────────────
function auth(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token' });
  try { req.user = jwt.verify(token, SECRET); next(); }
  catch { res.status(401).json({ error: 'Invalid token' }); }
}

function adminOnly(req, res, next) {
  if (req.user?.role !== 'admin')
    return res.status(403).json({ error: 'Admin access required' });
  next();
}

function ticket() {
  return 'CP' + Date.now().toString().slice(-6) + Math.floor(Math.random() * 100);
}

// ════════════════════════════════════════════════════════════════════
//  HEALTH
// ════════════════════════════════════════════════════════════════════
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', version: '2.0.0', timestamp: new Date().toISOString() });
});

// ════════════════════════════════════════════════════════════════════
//  AUTH
// ════════════════════════════════════════════════════════════════════

app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, phone, password, blood_group } = req.body;
    if (!name || !email || !password)
      return res.status(400).json({ error: 'Name, email and password required' });
    const exists = await prisma.user.findUnique({ where: { email } });
    if (exists) return res.status(409).json({ error: 'Email already registered' });
    const hash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: { name, email, phone, password: hash, blood_group }
    });
    const token = jwt.sign({ id: user.id, email, name, role: 'citizen' }, SECRET, { expiresIn: '7d' });
    res.json({ message: 'Registered successfully', token, user: { id: user.id, name, email } });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });
    const ok = await bcrypt.compare(password, user.password);
    if (!ok) return res.status(401).json({ error: 'Invalid credentials' });
    const token = jwt.sign({ id: user.id, email: user.email, name: user.name, role: user.role }, SECRET, { expiresIn: '7d' });
    res.json({ message: 'Login successful', token, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/auth/profile', auth, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { id:true, name:true, email:true, phone:true, blood_group:true, role:true, created_at:true }
    });
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ════════════════════════════════════════════════════════════════════
//  ISSUES
// ════════════════════════════════════════════════════════════════════

app.post('/api/issues', upload.single('photo'), async (req, res) => {
  try {
    const { category, name, phone, location, description, user_id } = req.body;
    if (!category || !name || !phone || !location || !description)
      return res.status(400).json({ error: 'All fields required' });
    const issue = await prisma.issue.create({
      data: {
        category, name, phone, location, description,
        ticket_no: ticket(),
        user_id: user_id ? parseInt(user_id) : null,
        photo_url: req.file ? `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64').slice(0,100)}...` : null
      }
    });
    res.json({ message: 'Issue reported', ticket_no: issue.ticket_no, id: issue.id });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/issues', auth, async (req, res) => {
  try {
    const { status, category, limit = '50' } = req.query;
    const where = {};
    if (req.user.role !== 'admin') where.user_id = req.user.id;
    if (status) where.status = status;
    if (category) where.category = category;
    const issues = await prisma.issue.findMany({
      where, orderBy: { created_at: 'desc' }, take: parseInt(limit)
    });
    res.json(issues);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/issues/track/:ticket', async (req, res) => {
  try {
    const issue = await prisma.issue.findUnique({ where: { ticket_no: req.params.ticket } });
    if (!issue) return res.status(404).json({ error: 'Ticket not found' });
    res.json(issue);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.patch('/api/issues/:id/status', auth, async (req, res) => {
  try {
    const { status } = req.body;
    const allowed = ['pending','in_progress','resolved','rejected'];
    if (!allowed.includes(status)) return res.status(400).json({ error: 'Invalid status' });
    await prisma.issue.update({ where: { id: parseInt(req.params.id) }, data: { status } });
    res.json({ message: 'Status updated' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ════════════════════════════════════════════════════════════════════
//  BLOOD DONORS
// ════════════════════════════════════════════════════════════════════

app.get('/api/donors', async (req, res) => {
  try {
    const { blood_group, city, available } = req.query;
    const where = {};
    if (blood_group) where.blood_group = blood_group;
    if (city) where.city = { contains: city };
    if (available !== undefined) where.available = available === 'true' || available === '1';
    const donors = await prisma.bloodDonor.findMany({ where, orderBy: { created_at: 'desc' } });
    res.json(donors);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/donors', async (req, res) => {
  try {
    const { name, blood_group, phone, city, address, user_id } = req.body;
    if (!name || !blood_group || !phone || !city)
      return res.status(400).json({ error: 'Name, blood group, phone and city required' });
    const donor = await prisma.bloodDonor.create({
      data: { name, blood_group, phone, city, address, user_id: user_id ? parseInt(user_id) : null }
    });
    res.json({ message: 'Registered as blood donor', id: donor.id });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ════════════════════════════════════════════════════════════════════
//  VOLUNTEERS
// ════════════════════════════════════════════════════════════════════

app.get('/api/volunteers', auth, async (req, res) => {
  try {
    const { area, availability } = req.query;
    const where = {};
    if (area) where.area = { contains: area };
    if (availability) where.availability = { contains: availability };
    const volunteers = await prisma.volunteer.findMany({
      where,
      select: { id:true, name:true, age:true, email:true, phone:true, area:true, availability:true, hours_logged:true, status:true, created_at:true }
    });
    res.json(volunteers);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/volunteers', async (req, res) => {
  try {
    const { name, age, email, phone, area, availability, user_id } = req.body;
    if (!name || !email || !phone || !area || !availability)
      return res.status(400).json({ error: 'All fields required' });
    const vol = await prisma.volunteer.create({
      data: { name, age: age ? parseInt(age) : null, email, phone, area, availability, user_id: user_id ? parseInt(user_id) : null }
    });
    res.json({ message: 'Volunteer registered', id: vol.id });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ════════════════════════════════════════════════════════════════════
//  HOSPITALS
// ════════════════════════════════════════════════════════════════════

app.get('/api/hospitals', async (req, res) => {
  try {
    const { type, open_24h } = req.query;
    const where = {};
    if (type) where.type = type;
    if (open_24h !== undefined) where.open_24h = open_24h === 'true' || open_24h === '1';
    const hospitals = await prisma.hospital.findMany({ where });
    res.json(hospitals);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/hospitals', auth, adminOnly, async (req, res) => {
  try {
    const { name, type, address, phone, beds, open_24h, lat, lng } = req.body;
    if (!name || !type || !address) return res.status(400).json({ error: 'Name, type and address required' });
    const h = await prisma.hospital.create({
      data: { name, type, address, phone, beds: beds ? parseInt(beds) : null, open_24h: open_24h === '1' || open_24h === true, lat: lat ? parseFloat(lat) : null, lng: lng ? parseFloat(lng) : null }
    });
    res.json({ message: 'Hospital added', id: h.id });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ════════════════════════════════════════════════════════════════════
//  SCHEMES
// ════════════════════════════════════════════════════════════════════

app.get('/api/schemes', async (req, res) => {
  try {
    const { category } = req.query;
    const where = { active: true };
    if (category) where.category = category;
    const schemes = await prisma.scheme.findMany({ where, orderBy: { created_at: 'desc' } });
    res.json(schemes);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/schemes', auth, adminOnly, async (req, res) => {
  try {
    const { title, category, description, apply_link, deadline } = req.body;
    if (!title || !category || !description) return res.status(400).json({ error: 'Title, category and description required' });
    const s = await prisma.scheme.create({ data: { title, category, description, apply_link, deadline } });
    res.json({ message: 'Scheme added', id: s.id });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ════════════════════════════════════════════════════════════════════
//  NOTIFICATIONS
// ════════════════════════════════════════════════════════════════════

app.get('/api/notifications', auth, async (req, res) => {
  try {
    const notes = await prisma.notification.findMany({
      where: { user_id: req.user.id }, orderBy: { created_at: 'desc' }, take: 20
    });
    res.json(notes);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.patch('/api/notifications/:id/read', auth, async (req, res) => {
  try {
    await prisma.notification.updateMany({
      where: { id: parseInt(req.params.id), user_id: req.user.id },
      data: { read: true }
    });
    res.json({ message: 'Marked as read' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ════════════════════════════════════════════════════════════════════
//  CONTACT
// ════════════════════════════════════════════════════════════════════

app.post('/api/contact', async (req, res) => {
  try {
    const { name, email, subject, message } = req.body;
    if (!name || !email || !subject || !message)
      return res.status(400).json({ error: 'All fields required' });
    await prisma.contact.create({ data: { name, email, subject, message } });
    res.json({ message: 'Message received! We will respond within 24 hours.' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/contacts', auth, adminOnly, async (req, res) => {
  try {
    const contacts = await prisma.contact.findMany({ orderBy: { created_at: 'desc' } });
    res.json(contacts);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ════════════════════════════════════════════════════════════════════
//  USERS (admin only)
// ════════════════════════════════════════════════════════════════════

app.get('/api/users', auth, adminOnly, async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      select: { id:true, name:true, email:true, phone:true, blood_group:true, role:true, created_at:true },
      orderBy: { created_at: 'desc' }
    });
    res.json(users);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ════════════════════════════════════════════════════════════════════
//  DASHBOARD & STATS
// ════════════════════════════════════════════════════════════════════

app.get('/api/dashboard', auth, async (req, res) => {
  try {
    const uid = req.user.id;
    const [myIssues, resolved, volunteerRec, donorRec, unread, recentIssues] = await Promise.all([
      prisma.issue.count({ where: { user_id: uid } }),
      prisma.issue.count({ where: { user_id: uid, status: 'resolved' } }),
      prisma.volunteer.findFirst({ where: { user_id: uid } }),
      prisma.bloodDonor.findFirst({ where: { user_id: uid } }),
      prisma.notification.count({ where: { user_id: uid, read: false } }),
      prisma.issue.findMany({ where: { user_id: uid }, orderBy: { created_at: 'desc' }, take: 5 })
    ]);
    res.json({
      stats: {
        issues_reported: myIssues,
        issues_resolved: resolved,
        volunteer_hours: volunteerRec?.hours_logged || 0,
        blood_group: donorRec?.blood_group || null,
        unread_notifications: unread
      },
      recent_issues: recentIssues,
      volunteer: volunteerRec,
      donor: donorRec
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/stats', async (req, res) => {
  try {
    const [issues, resolved, donors, volunteers, hospitals, users] = await Promise.all([
      prisma.issue.count(),
      prisma.issue.count({ where: { status: 'resolved' } }),
      prisma.bloodDonor.count({ where: { available: true } }),
      prisma.volunteer.count({ where: { status: 'active' } }),
      prisma.hospital.count(),
      prisma.user.count()
    ]);
    res.json({ issues_reported: issues, issues_resolved: resolved, blood_donors: donors, volunteers, hospitals, users });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ════════════════════════════════════════════════════════════════════
//  START
// ════════════════════════════════════════════════════════════════════

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`\n🚀 CivicPulse API running on http://localhost:${PORT}`);
    console.log(`📋 API Base: http://localhost:${PORT}/api\n`);
  });
}

module.exports = app;
