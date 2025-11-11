const express = require('express');
const app = express();
const fs = require('node:fs/promises');
const formidable = require('express-formidable');
const { MongoClient, ObjectId } = require("mongodb");
const session = require('express-session');
const bcrypt = require('bcrypt');

app.use(formidable());
app.set('view engine', 'ejs');
app.use(express.static('public'));
app.use(session({
  secret: process.env.SESSION_SECRET || 'fallback-secret',
  resave: false,
  saveUninitialized: false
}));

// MongoDB Config
const mongourl = '';
const client = new MongoClient(mongourl);
const dbName = 'bookmytable';
const colBookings = 'bookings';
const colUsers = 'users';

// Middleware: Require Login
const requireLogin = (req, res, next) => {
  if (!req.session.userId) return res.redirect('/login');
  next();
};

// === MongoDB Helpers ===
const insertDocument = async (db, col, doc) => {
  const collection = db.collection(col);
  const result = await collection.insertOne(doc);
  console.log("Inserted:", result.insertedId);
  return result;
};

const findDocument = async (db, col, criteria = {}) => {
  const collection = db.collection(col);
  return await collection.find(criteria).toArray();
};

const updateDocument = async (db, col, criteria, updateDoc) => {
  const collection = db.collection(col);
  return await collection.updateOne(criteria, { $set: updateDoc });
};

const deleteDocument = async (db, col, criteria) => {
  const collection = db.collection(col);
  return await collection.deleteOne(criteria);
};

// === Seed Admin ===
app.get('/seed-admin', async (req, res) => {
  await client.connect();
  const db = client.db(dbName);
  const hashed = await bcrypt.hash('admin123', 10);
  await db.collection(colUsers).updateOne(
    { username: 'admin' },
    { $set: { username: 'admin', password: hashed } },
    { upsert: true }
  );
  await client.close();
  res.send('Admin created: admin / admin123');
});

// === Login/Logout ===
app.get('/login', (req, res) => {
  res.render('login', { error: null });
});

app.post('/login', async (req, res) => {
  const { username, password } = req.fields;
  await client.connect();
  const db = client.db(dbName);
  const user = await db.collection(colUsers).findOne({ username });
  await client.close();

  if (user && await bcrypt.compare(password, user.password)) {
    req.session.userId = user._id.toString();
    return res.redirect('/');
  }
  res.render('login', { error: 'Invalid credentials' });
});

app.post('/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/login');
});

// === Home / Dashboard ===
app.get('/', requireLogin, async (req, res) => {
  await client.connect();
  const db = client.db(dbName);
  const criteria = {};
  if (req.query.date) {
    const date = new Date(req.query.date);
    criteria.date = {
      $gte: date,
      $lt: new Date(date.getTime() + 24 * 60 * 60 * 1000)
    };
  }
  if (req.query.status) criteria.status = req.query.status;
  if (req.query.name) criteria.customerName = new RegExp(req.query.name, 'i');

  const bookings = await findDocument(db, colBookings, criteria);
  await client.close();
  res.render('dashboard', { bookings, query: req.query });
});

// === Create ===
app.get('/create', requireLogin, (req, res) => {
  res.render('create');
});

app.post('/create', requireLogin, async (req, res) => {
  await client.connect();
  const db = client.db(dbName);
  let newDoc = {
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
    newDoc.photo = Buffer.from(data).toString('base64');
    newDoc.photoMime = req.files.photo.type;
  }

  await insertDocument(db, colBookings, newDoc);
  await client.close();
  res.redirect('/');
});

// === Edit ===
app.get('/edit', requireLogin, async (req, res) => {
  if (!req.query._id) return res.redirect('/');
  await client.connect();
  const db = client.db(dbName);
  const docs = await findDocument(db, colBookings, { _id: new ObjectId(req.query._id) });
  await client.close();
  if (docs.length === 0) return res.render('info', { message: 'Not found' });
  res.render('edit', { booking: docs[0] });
});

app.post('/update', requireLogin, async (req, res) => {
  await client.connect();
  const db = client.db(dbName);
  const criteria = { _id: new ObjectId(req.fields._id) };
  let updateDoc = {
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

  const result = await updateDocument(db, colBookings, criteria, updateDoc);
  await client.close();
  res.render('info', { message: `Updated ${result.modifiedCount} booking(s)` });
});

// === Delete (via POST + _method) ===
app.post('/delete', requireLogin, async (req, res) => {
  await client.connect();
  const db = client.db(dbName);
  const result = await deleteDocument(db, colBookings, { _id: new ObjectId(req.fields._id) });
  await client.close();
  res.render('info', { message: `Deleted ${result.deletedCount} booking(s)` });
});

// === RESTful APIs (No Auth) ===
app.get('/api/bookings', async (req, res) => {
  await client.connect();
  const db = client.db(dbName);
  const criteria = {};
  if (req.query.date) {
    const date = new Date(req.query.date);
    criteria.date = { $gte: date, $lt: new Date(date.getTime() + 86400000) };
  }
  if (req.query.status) criteria.status = req.query.status;
  const bookings = await findDocument(db, colBookings, criteria);
  await client.close();
  res.json(bookings);
});

app.post('/api/bookings', async (req, res) => {
  await client.connect();
  const db = client.db(dbName);
  const doc = { ...req.fields, date: new Date(req.fields.date), pax: parseInt(req.fields.pax) };
  const result = await insertDocument(db, colBookings, doc);
  const inserted = await findDocument(db, colBookings, { _id: result.insertedId });
  await client.close();
  res.status(201).json(inserted[0]);
});

app.put('/api/bookings/:id', async (req, res) => {
  await client.connect();
  const db = client.db(dbName);
  const result = await updateDocument(db, colBookings, { _id: new ObjectId(req.params.id) }, req.fields);
  const updated = await findDocument(db, colBookings, { _id: new ObjectId(req.params.id) });
  await client.close();
  res.json(updated[0] || { error: 'Not found' });
});

app.delete('/api/bookings/:id', async (req, res) => {
  await client.connect();
  const db = client.db(dbName);
  const result = await deleteDocument(db, colBookings, { _id: new ObjectId(req.params.id) });
  await client.close();
  res.status(result.deletedCount > 0 ? 204 : 404).send();
});

// 404
app.get('*', (req, res) => {
  res.render('info', { message: `${req.path} - Unknown request!` });
});

// Start
const PORT = process.env.PORT || 8099;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
