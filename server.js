// server.js
const express = require('express');
const { MongoClient, ObjectId } = require('mongodb');
const session = require('cookie-session');
const formidable = require('express-formidable');

const app = express();

// ===================== DATABASE (connect once) =====================
const url = 'mongodb+srv://lamnathan645321_db_user:Student@cluster0.rmmzq5s.mongodb.net/restaurantdb';
const client = new MongoClient(url);
let db;
let usersCollection;

async function startServer() {
  await client.connect();
  db = client.db('restaurantdb');
  usersCollection = db.collection('users');
  console.log('MongoDB connected');
}
startServer();

// ===================== MIDDLEWARE (THE ONLY ORDER THAT WORKS) =====================

// 1. JSON API routes only — bypass everything
app.use('/api', express.json());

// 2. All other routes (HTML forms, file uploads) — use formidable
app.use((req, res, next) => {
  if (req.originalUrl.startsWith('/api')) {
    return next(); // skip formidable for API routes
  }
  formidable()(req, res, next);
});

// 3. Session
app.use(session({
  name: 'session',
  secret: 'secretkey',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false, maxAge: 24 * 60 * 60 * 1000 }
}));

app.set('view engine', 'ejs');

// ===================== AUTH MIDDLEWARE =====================
const requireLogin = (req, res, next) => {
  if (req.session.user) return next();
  res.redirect('/login');
};

// ===================== ROUTES =====================

// === REGISTER ===
app.get('/register', (req, res) => res.render('register', { error: null }));

app.post('/register', async (req, res) => {
  const { username, password, password2 } = req.fields || {};

  if (!username || !password || !password2)
    return res.render('register', { error: 'All fields required' });
  if (password !== password2)
    return res.render('register', { error: 'Passwords do not match' });
  if (password.length < 4)
    return res.render('register', { error: 'Password too short' });

  try {
    const exists = await usersCollection.findOne({ username });
    if (exists) return res.render('register', { error: 'Username taken' });

    await usersCollection.insertOne({
      username,
      password,
      role: 'customer',
      createdAt: new Date()
    });

    req.session.user = { username, role: 'customer' };
    res.redirect('/clist');
  } catch (err) {
    console.error(err);
    res.render('register', { error: 'Server error' });
  }
});

// === LOGIN ===
app.get('/login', (req, res) => res.render('login', { error: null }));

app.post('/login', async (req, res) => {
  const { username, password } = req.fields || {};
  const user = await usersCollection.findOne({ username, password });

  if (user) {
    req.session.user = { username: user.username, role: user.role || 'customer' };
    res.redirect(user.role === 'admin' || user.role === 'staff' ? '/list' : '/clist');
  } else {
    res.render('login', { error: 'Invalid credentials' });
  }
});

app.get('/logout', (req, res) => {
  req.session = null;
  res.redirect('/login');
});

// === HOME ===
app.get('/', (req, res) => {
  if (!req.session.user) return res.render('login', { error: null });
  res.redirect(req.session.user.role === 'admin' || req.session.user.role === 'staff' ? '/list' : '/clist');
});

// === ADMIN & CUSTOMER LISTS ===
app.get('/list', requireLogin, async (req, res) => {
  if (!['admin', 'staff'].includes(req.session.user.role)) return res.redirect('/clist');
  const bookings = await db.collection('bookings').find().sort({ date: 1, time: 1 }).toArray();
  res.render('list', { bookings, user: req.session.user.username, search: {} });
});

app.get('/clist', requireLogin, async (req, res) => {
  const bookings = await db.collection('bookings')
    .find({ name: req.session.user.username })
    .sort({ date: 1, time: 1 })
    .toArray();
  res.render('clist', { bookings, user: req.session.user.username });
});

// === CREATE BOOKING ===
app.get('/create', requireLogin, (req, res) => res.render('create', { user: req.session.user.username }));

app.post('/create', requireLogin, async (req, res) => {
  const doc = {
    name: req.fields.name || req.session.user.username,
    phone: req.fields.phone,
    date: req.fields.date,
    time: req.fields.time,
    pax: req.fields.pax,
    createdAt: new Date()
  };
  await db.collection('bookings').insertOne(doc);
  res.redirect(req.session.user.role === 'admin' ? '/list' : '/clist');
});

// === CRUD OPERATIONS ===
app.get('/details/:id', requireLogin, async (req, res) => {
  const booking = await db.collection('bookings').findOne({ _id: new ObjectId(req.params.id) });
  res.render('details', { booking, user: req.session.user.username });
});

app.get('/edit/:id', requireLogin, async (req, res) => {
  const booking = await db.collection('bookings').findOne({ _id: new ObjectId(req.params.id) });
  res.render('edit', { booking, user: req.session.user.username });
});

app.post('/update/:id', requireLogin, async (req, res) => {
  await db.collection('bookings').updateOne(
    { _id: new ObjectId(req.params.id) },
    { $set: req.fields }
  );
  res.redirect('/list');
});

app.get('/delete/:id', requireLogin, async (req, res) => {
  await db.collection('bookings').deleteOne({ _id: new ObjectId(req.params.id) });
  res.redirect('/list');
});

app.get('/search', requireLogin, async (req, res) => {
  const query = {};
  if (req.query.name) query.name = new RegExp(req.query.name, 'i');
  if (req.query.phone) query.phone = new RegExp(req.query.phone, 'i');
  if (req.query.date) query.date = req.query.date;
  if (req.query.pax) query.pax = parseInt(req.query.pax);

  const bookings = await db.collection('bookings').find(query).sort({ date: 1, time: 1 }).toArray();
  res.render('list', { bookings, user: req.session.user.username, search: req.query });
});

// === BOOKING API ===
app.get('/api/bookings', async (req, res) => {
  const data = await db.collection('bookings').find().sort({ date: 1, time: 1 }).toArray();
  res.json(data);
});

app.post('/api/bookings', async (req, res) => {
  try {
    const doc = {
      name: req.body.name,
      phone: req.body.phone,
      date: req.body.date,
      time: req.body.time,
      pax: parseInt(req.body.pax) || 1,
      createdAt: new Date()
    };
    const result = await db.collection('bookings').insertOne(doc);
    res.status(201).json({ success: true, insertedId: result.insertedId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// === USER API — NOW WORKS PERFECTLY! ===
app.post('/api/users', async (req, res) => {
  try {
    console.log('API: Creating user →', req.body);
    const result = await usersCollection.insertOne({
      ...req.body,
      createdAt: new Date()
    });
    res.status(201).json({ success: true, insertedId: result.insertedId });
  } catch (err) {
    console.error('API Error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/users', async (req, res) => {
  try {
    const users = await usersCollection.find({}).toArray();

    // Clean & safe output: hide password + only show needed fields
    const cleanUsers = users.map(user => ({
      username: user.username,
      role: user.role,
      createdAt: user.createdAt || "N/A"
    }));


app.get('/api/users/username/:username', async (req, res) => {
  try {
    const user = await usersCollection.findOne({ username: req.params.username });
    if (!user) return res.status(404).json({ error: 'User not found' });
    const { password, ...safe } = user;
    res.json(safe);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// UPDATE (PATCH) by username
app.patch('/api/users/username/:username', async (req, res) => {
  try {
    const result = await usersCollection.updateOne(
      { username: req.params.username },
      { $set: req.body }
    );
    if (result.matchedCount === 0) return res.status(404).json({ error: 'User not found' });
    res.json({ success: true, modified: result.modifiedCount });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// FULL REPLACE (PUT) by username
app.put('/api/users/username/:username', async (req, res) => {
  try {
    const { password, role } = req.body;
    if (!password) return res.status(400).json({ error: 'password required' });
    const result = await usersCollection.replaceOne(
      { username: req.params.username },
      { username: req.params.username, password, role: role || 'customer', createdAt: new Date() }
    );
    if (result.matchedCount === 0) return res.status(404).json({ error: 'User not found' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE by username
app.delete('/api/users/username/:username', async (req, res) => {
  try {
    const result = await usersCollection.deleteOne({ username: req.params.username });
    if (result.deletedCount === 0) return res.status(404).json({ error: 'User not found' });
    res.json({ success: true, deleted: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ===================== START SERVER =====================
const PORT = process.env.PORT || 8099;
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
  console.log(`Test: curl -X POST http://localhost:${PORT}/api/users -H "Content-Type: application/json" -d '{"username":"Amy","password":"123456","role":"customer"}'`);
});


