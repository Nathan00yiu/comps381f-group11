// server.js
const express = require('express');
const { MongoClient, ObjectId } = require('mongodb');
const session = require('cookie-session');
const formidable = require('express-formidable');

const app = express();

// ===================== MIDDLEWARE =====================
// Order matters!
app.use(formidable());                                      // handles form-data + file uploads → req.fields
app.use(express.json());                                     // handles raw JSON (for /api/users POST)
app.use(express.urlencoded({ extended: true }));             // handles traditional forms

app.use(session({
  name: 'session',
  secret: 'secretkey',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false, maxAge: 24 * 60 * 60 * 1000 }     // 1 day
}));

app.set('view engine', 'ejs');

// ===================== DATABASE CONNECTION (once!) =====================
const url = 'mongodb+srv://lamnathan645321_db_user:Student@cluster0.rmmzq5s.mongodb.net/restaurantdb?appName=Cluster0';
const client = new MongoClient(url);
const dbName = 'restaurantdb';

let db;
let usersCollection;   // for /api/users

async function connectToDB() {
  try {
    await client.connect();
    db = client.db(dbName);
    usersCollection = db.collection('users');
    console.log('MongoDB connected successfully');
  } catch (err) {
    console.error('Failed to connect to MongoDB:', err);
    process.exit(1);
  }
}
connectToDB();

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

  if (!username || !password || !password2) {
    return res.render('register', { error: 'All fields are required' });
  }
  if (password !== password2) {
    return res.render('register', { error: 'Passwords do not match' });
  }
  if (password.length < 4) {
    return res.render('register', { error: 'Password too short (min 4 chars)' });
  }

  try {
    const exists = await usersCollection.findOne({ username });
    if (exists) return res.render('register', { error: 'Username already taken' });

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
    if (user.role === 'admin' || user.role === 'staff') {
      return res.redirect('/list');
    } else {
      return res.redirect('/clist');
    }
  } else {
    res.render('login', { error: 'Invalid username or password' });
  }
});

app.get('/logout', (req, res) => {
  req.session = null;
  res.redirect('/login');
});

// === HOME ===
app.get('/', (req, res) => {
  if (req.session.user) {
    return req.session.user.role === 'admin' || req.session.user.role === 'staff'
      ? res.redirect('/list')
      : res.redirect('/clist');
  }
  res.render('login', { error: null });
});

// === ADMIN LIST ===
app.get('/list', requireLogin, async (req, res) => {
  if (!['admin', 'staff'].includes(req.session.user.role)) return res.redirect('/clist');

  const bookings = await db.collection('bookings')
    .find()
    .sort({ date: 1, time: 1 })
    .toArray();

  res.render('list', { bookings, user: req.session.user.username, search: {} });
});

// === CUSTOMER LIST ===
app.get('/clist', requireLogin, async (req, res) => {
  const bookings = await db.collection('bookings')
    .find({ name: req.session.user.username })
    .sort({ date: 1, time: 1 })
    .toArray();

  res.render('clist', { bookings, user: req.session.user.username });
});

// === CREATE BOOKING ===
app.get('/create', requireLogin, (req, res) => {
  res.render('create', { user: req.session.user.username });
});

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

// === DETAILS / EDIT / UPDATE / DELETE / SEARCH ===
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

// === BOOKING API (existing) ===
app.get('/api/bookings', async (req, res) => {
  const data = await db.collection('bookings').find().sort({ date: 1, time: 1 }).toArray();
  res.json(data);
});

app.post('/api/bookings', async (req, res) => {
  const result = await db.collection('bookings').insertOne(req.fields);
  res.json({ insertedId: result.insertedId });
});

// === USER API – THIS IS THE ONE YOU WANTED! ===
app.post('/api/users', async (req, res) => {
  try {
    console.log('Creating user via API:', req.body);
    const result = await usersCollection.insertOne({
      ...req.body,
      createdAt: new Date()
    });
    res.status(201).json({ success: true, insertedId: result.insertedId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// (Optional) GET all users – for testing
app.get('/api/users', async (req, res) => {
  const all = await usersCollection.find({}).toArray();
  res.json(all);
});

// ===================== START SERVER =====================
const PORT = process.env.PORT || 8099;
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
  console.log(`Test user creation:`);
  console.log(`curl -X POST http://localhost:${PORT}/api/users -H "Content-Type: application/json" -d '{"username":"Amy","password":"123456","role":"customer"}'`);
});
