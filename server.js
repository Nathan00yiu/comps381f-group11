const express = require('express');
const { MongoClient, ObjectId } = require('mongodb');
const cookieSession = require('cookie-session');
const formidable = require('express-formidable');
const fs = require('node:fs/promises');

const app = express();
const PORT = process.env.PORT || 8099;

// Middleware
app.use(formidable());
app.use(cookieSession({
  name: 'session',
  keys: [process.env.SESSION_KEY || 'secret-key-123'],
  maxAge: 24 * 60 * 60 * 1000
}));
app.set('view engine', 'ejs');
app.use(express.static('views')); // Serve EJS as static if needed

// MongoDB
const url = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const client = new MongoClient(url);
const dbName = 'bookmytable';
const colBookings = 'bookings';
const colUsers = 'users';

// Connect once
let db;
client.connect().then(() => {
  db = client.db(dbName);
  console.log('MongoDB connected');
});

// === Auth Middleware ===
const requireLogin = (req, res, next) => {
  if (!req.session.userId) return res.redirect('/login');
  next();
};

// === Seed Admin ===
app.get('/seed-admin', async (req, res) => {
  const admin = { username: 'admin', password: 'admin123' };
  await db.collection(colUsers).updateOne(
    { username: 'admin' },
    { $set: admin },
    { upsert: true }
  );
  res.send('Admin created: admin / admin123');
});

// === Login ===
app.get('/login', (req, res) => {
  res.render('login', { error: null });
});

app.post('/login', async (req, res) => {
  const { username, password } = req.fields;
  const user = await db.collection(colUsers).findOne({ username, password });
  if (user) {
    req.session.userId = user._id.toString();
    return res.redirect('/');
  }
  res.render('login', { error: 'Invalid credentials' });
});

app.post('/logout', (req, res) => {
  req.session = null;
  res.redirect('/login');
});

// === CRUD Web Pages ===

// List (Read)
app.get('/', requireLogin, async (req, res) => {
  const criteria = {};
  if (req.query.date) {
    const date = new Date(req.query.date);
    criteria.date = { $gte: date, $lt: new Date(date.getTime() + 86400000) };
  }
  if (req.query.status) criteria.status = req.query.status;
  if (req.query.name) criteria.customerName = new RegExp(req.query.name, 'i');

  const bookings = await db.collection(colBookings).find(criteria).toArray();
  res.render('list', { bookings, query: req.query });
});

// Create
app.get('/create', requireLogin, (req, res) => {
  res.render('create');
});

app.post('/create', requireLogin, async (req, res) => {
  let doc = {
    customerName: req.fields.customerName,
    phone: req.fields.phone,
    date: new Date(req.fields.date),
    time: req.fields.time,
    pax: parseInt(req.fields.pax),
    status: 'confirmed',
    notes: req.fields.notes || ''
  };

  if (req.files.photo && req.files.photo.size > 0) {
    const data = await fs.readFile(req.files.photo.path);
    doc.photo = Buffer.from(data).toString('base64');
    doc.photoMime = req.files.photo.type;
  }

  await db.collection(colBookings).insertOne(doc);
  res.redirect('/');
});

// Details
app.get('/details', requireLogin, async (req, res) => {
  const booking = await db.collection(colBookings).findOne({ _id: new ObjectId(req.query._id) });
  if (!booking) return res.render('info', { message: 'Not found' });
  res.render('details', { booking });
});

// Edit
app.get('/edit', requireLogin, async (req, res) => {
  const booking = await db.collection(colBookings).findOne({ _id: new ObjectId(req.query._id) });
  if (!booking) return res.render('info', { message: 'Not found' });
  res.render('edit', { booking });
});

app.post('/update', requireLogin, async (req, res) => {
  const updateDoc = {
    customerName: req.fields.customerName,
    phone: req.fields.phone,
    date: new Date(req.fields.date),
    time: req.fields.time,
    pax: parseInt(req.fields.pax),
    status: req.fields.status,
    notes: req.fields.notes || ''
  };

  if (req.files.photo && req.files.photo.size > 0) {
    const data = await fs.readFile(req.files.photo.path);
    updateDoc.photo = Buffer.from(data).toString('base64');
    updateDoc.photoMime = req.files.photo.type;
  }

  const result = await db.collection(colBookings).updateOne(
    { _id: new ObjectId(req.fields._id) },
    { $set: updateDoc }
  );
  res.render('info', { message: `Updated ${result.modifiedCount} booking(s)` });
});

app.post('/delete', requireLogin, async (req, res) => {
  const result = await db.collection(colBookings).deleteOne({ _id: new ObjectId(req.fields._id) });
  res.render('info', { message: `Deleted ${result.deletedCount} booking(s)` });
});

// === RESTful APIs (No Auth) ===
app.get('/api/bookings', async (req, res) => {
  const criteria = {};
  if (req.query.date) {
    const date = new Date(req.query.date);
    criteria.date = { $gte: date, $lt: new Date(date.getTime() + 86400000) };
  }
  if (req.query.status) criteria.status = req.query.status;
  const bookings = await db.collection(colBookings).find(criteria).toArray();
  res.json(bookings);
});

app.post('/api/bookings', async (req, res) => {
  const doc = { ...req.fields, date: new Date(req.fields.date), pax: parseInt(req.fields.pax) };
  const result = await db.collection(colBookings).insertOne(doc);
  const inserted = await db.collection(colBookings).findOne({ _id: result.insertedId });
  res.status(201).json(inserted);
});

app.put('/api/bookings/:id', async (req, res) => {
  const result = await db.collection(colBookings).updateOne(
    { _id: new ObjectId(req.params.id) },
    { $set: req.fields }
  );
  const updated = await db.collection(colBookings).findOne({ _id: new ObjectId(req.params.id) });
  res.json(updated || { error: 'Not found' });
});

app.delete('/api/bookings/:id', async (req, res) => {
  const result = await db.collection(colBookings).deleteOne({ _id: new ObjectId(req.params.id) });
  res.status(result.deletedCount > 0 ? 204 : 404).send();
});

// 404
app.get('*', (req, res) => {
  res.render('info', { message: `${req.path} - Unknown request!` });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
