const express = require('express');
const { MongoClient, ObjectId } = require('mongodb');
const session = require('cookie-session');
const formidable = require('express-formidable');

const app = express();
app.use(formidable());
app.use(session({ secret: 'secretkey', resave: false, saveUninitialized: false }));
app.set('view engine', 'ejs');

const url = 'mongodb+srv://lamnathan645321_db_user:Student@cluster0.rmmzq5s.mongodb.net/restaurantdb?appName=Cluster0';
const client = new MongoClient(url);
const dbName = 'restaurantdb';

// Middleware
const requireLogin = (req, res, next) => {
  if (req.session.user) next();
  else res.redirect('/login');
};

// ==================== REGISTER ====================
app.get('/register', (req, res) => {
  res.render('register', { error: null });
});

app.post('/register', async (req, res) => {
  const { username, password, password2 } = req.fields;

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
    await client.connect();
    const db = client.db(dbName);

    const exists = await db.collection('users').findOne({ username });
    if (exists) {
      return res.render('register', { error: 'Username already taken' });
    }

    await db.collection('users').insertOne({
      username,
      password,
      role: 'customer',
      createdAt: new Date()
    });

    req.session.user = { username, role: 'customer' };
    return res.redirect('/clist');

  } catch (err) {
    console.error(err);
    return res.render('register', { error: 'Server error' });
  }
});

// ==================== LOGIN ====================
app.get('/login', (req, res) => res.render('login', { error: null }));

app.post('/login', async (req, res) => {
  await client.connect();
  const user = await client.db(dbName).collection('users').findOne({
    username: req.fields.username,
    password: req.fields.password
  });

  if (user) {
    req.session.user = {
      username: user.username,
      role: user.role || 'customer'
    };

    if (user.role === 'admin' || user.role === 'staff') {
      return res.redirect('/');  // staff/admin see full list
    } else {
      return res.redirect('/clist'); // customers see only their list
    }
  } else {
    res.render('login', { error: 'Invalid username or password' });
  }
});

app.get('/logout', (req, res) => {
  req.session = null;
  res.redirect('/login');
});

// ==================== ROOT ROUTE – PUBLIC LANDING PAGE ====================
app.get('/', (req, res) => {
  if (req.session.user) {
    // Already logged in → send to correct dashboard
    if (req.session.user.role === 'admin' || req.session.user.role === 'staff') {
      return res.redirect('/list');  // we will create this route in a sec
    } else {
      return res.redirect('/clist');
    }
  }
  // Not logged in → show login page
  res.render('login', { error: null });
});

// ==================== ADMIN FULL LIST (protected) ====================
app.get('/list', requireLogin, async (req, res) => {
  if (req.session.user.role !== 'admin' && req.session.user.role !== 'staff') {
    return res.redirect('/clist');
  }
  await client.connect();
  const bookings = await client.db(dbName).collection('bookings')
    .find()
    .sort({ date: 1, time: 1 })
    .toArray();
  res.render('list', {
    bookings,
    user: req.session.user.username,
    search: {}
  });
});

// ==================== CUSTOMER PAGE (only own bookings) ====================
app.get('/clist', requireLogin, async (req, res) => {
  await client.connect();
  const bookings = await client.db(dbName).collection('bookings')
    .find({ name: req.session.user.username })
    .sort({ date: 1, time: 1 })
    .toArray();

  res.render('clist', {
    bookings,
    user: req.session.user.username
  });
});

// ==================== CREATE BOOKING ====================
app.get('/create', requireLogin, (req, res) => {
  res.render('create', { user: req.session.user.username });
});

app.post('/create', requireLogin, async (req, res) => {
  await client.connect();
  const doc = {
    name: req.fields.name || req.session.user.username,
    phone: req.fields.phone,
    date: req.fields.date,
    time: req.fields.time,
    pax: req.fields.pax
  };
  await client.db(dbName).collection('bookings').insertOne(doc);

  // Customers go back to their list, admin goes to full list
  if (req.session.user.username === 'admin') {
    res.redirect('/');
  } else {
    res.redirect('/clist');
  }
});

// ==================== REST OF YOUR ROUTES (keep exactly as you had ====================
// (details, edit, update, delete, search, API, etc.)
// Just copy-paste them here unchanged

app.get('/details/:id', requireLogin, async (req, res) => {
  await client.connect();
  const booking = await client.db(dbName).collection('bookings')
    .findOne({ _id: new ObjectId(req.params.id) });
  res.render('details', { booking, user: req.session.user.username });
});

app.get('/edit/:id', requireLogin, async (req, res) => {
  await client.connect();
  const booking = await client.db(dbName).collection('bookings')
    .findOne({ _id: new ObjectId(req.params.id) });
  res.render('edit', { booking, user: req.session.user.username });
});

app.post('/update/:id', requireLogin, async (req, res) => {
  await client.connect();
  await client.db(dbName).collection('bookings').updateOne(
    { _id: new ObjectId(req.params.id) },
    { $set: req.fields }
  );
  res.redirect('/');
});

app.get('/delete/:id', requireLogin, async (req, res) => {
  await client.connect();
  await client.db(dbName).collection('bookings').deleteOne({ _id: new ObjectId(req.params.id) });
  res.redirect('/');
});

app.get('/search', requireLogin, async (req, res) => {
  await client.connect();
  const query = {};
  if (req.query.name) query.name = new RegExp(req.query.name, 'i');
  if (req.query.phone) query.phone = new RegExp(req.query.phone, 'i');
  if (req.query.date) query.date = req.query.date;
  if (req.query.pax) query.pax = parseInt(req.query.pax);

  const bookings = await client.db(dbName).collection('bookings')
    .find(query)
    .sort({ date: 1, time: 1 })
    .toArray();

  res.render('list', { bookings, user: req.session.user.username, search: req.query });
});

// API routes (no change)
app.get('/api/bookings', async (req, res) => {
  await client.connect();
  const data = await client.db(dbName).collection('bookings').find().sort({ date: 1, time: 1 }).toArray();
  res.json(data);
});

app.post('/api/bookings', async (req, res) => {
  await client.connect();
  const result = await client.db(dbName).collection('bookings').insertOne(req.fields);
  res.json({ insertedId: result.insertedId });
});

app.put('/api/bookings/:id', async (req, res) => {
  await client.connect();
  await client.db(dbName).collection('bookings').updateOne(
    { _id: new ObjectId(req.params.id) }, { $set: req.fields }
  );
  res.json({ status: 'updated' });
});

app.delete('/api/bookings/:id', async (req, res) => {
  await client.connect();
  await client.db(dbName).collection('bookings').deleteOne({ _id: new ObjectId(req.params.id) });
  res.json({ status: 'deleted' });
});

// ==================== START SERVER ====================
app.listen(process.env.PORT || 8099, () => {
  console.log(`Server running on http://localhost:${process.env.PORT || 8099}`);
});
