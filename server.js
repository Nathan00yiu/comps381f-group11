const express = require('express');
const { MongoClient, ObjectId } = require('mongodb');
const session = require('cookie-session');
const formidable = require('express-formidable');
const app = express();

app.use(formidable());
app.use(session({ secret: 'secretkey', resave: false, saveUninitialized: false }));
app.set('view engine', 'ejs');

const url = 'mongodb+srv://lamnathan645321_db_user:Student@cluster0.rmmzq5s.mongodb.net/?appName=Cluster0';
const client = new MongoClient(url);
const dbName = 'restaurantdb';

// Middleware: Auth
const requireLogin = (req, res, next) => {
  if (req.session.user) next();
  else res.redirect('/login');
};

// === LOGIN ===
app.get('/login', (req, res) => res.render('login', { user: null })); // ← safe for header

app.post('/login', async (req, res) => {
  await client.connect();
  const user = await client.db(dbName).collection('users').findOne({
    username: req.fields.username,
    password: req.fields.password
  });
  if (user) {
    req.session.user = user.username;
    res.redirect('/');
  } else res.render('login', { error: 'Invalid login', user: null });
});

app.get('/logout', (req, res) => { req.session = null; res.redirect('/login'); });

// === HOME (List Bookings) ===
app.get('/', requireLogin, async (req, res) => {
  await client.connect();
  const bookings = await client.db(dbName).collection('bookings')
    .find()
    .sort({ date: 1, time: 1 })
    .toArray();
  res.render('list', { 
    bookings, 
    user: req.session.user,
    search: {}  // ← ADD THIS LINE
  });
});

// === CREATE ===
app.get('/create', requireLogin, (req, res) => res.render('create', { user: req.session.user }));

app.post('/create', requireLogin, async (req, res) => {
  await client.connect();
  const doc = {
    name: req.fields.name,
    phone: req.fields.phone,
    date: req.fields.date,
    time: req.fields.time,
    pax: req.fields.pax
  };
  await client.db(dbName).collection('bookings').insertOne(doc);
  res.render('info', { message: '...', user: req.session.user });
});

// === READ (Details) ===
app.get('/details/:id', requireLogin, async (req, res) => {
  await client.connect();
  const booking = await client.db(dbName).collection('bookings')
    .findOne({ _id: new ObjectId(req.params.id) });
  res.render('details', { booking, user: req.session.user }); 
});

// === UPDATE ===
app.get('/edit/:id', requireLogin, async (req, res) => {
  await client.connect();
  const booking = await client.db(dbName).collection('bookings')
    .findOne({ _id: new ObjectId(req.params.id) });
  res.render('edit', { booking, user: req.session.user });
});

app.post('/update/:id', requireLogin, async (req, res) => {
  await client.connect();
  await client.db(dbName).collection('bookings').updateOne(
    { _id: new ObjectId(req.params.id) },
    { $set: req.fields }
  );
  res.render('info', { message: '...', user: req.session.user });
});

// === DELETE ===
app.get('/delete/:id', requireLogin, async (req, res) => {
  await client.connect();
  await client.db(dbName).collection('bookings').deleteOne({ _id: new ObjectId(req.params.id) });
  res.redirect('/');
});

// === SEARCH BOOKINGS ===
app.get('/search', requireLogin, async (req, res) => {
  await client.connect();
  const query = {};

  // Build dynamic query from URL params
  if (req.query.name) query.name = new RegExp(req.query.name, 'i'); // case-insensitive
  if (req.query.phone) query.phone = new RegExp(req.query.phone, 'i');
  if (req.query.date) query.date = req.query.date;
  if (req.query.pax) query.pax = parseInt(req.query.pax);

  const bookings = await client.db(dbName).collection('bookings')
    .find(query)
    .sort({ date: 1, time: 1 })
    .toArray();

  res.render('list', { 
    bookings, 
    user: req.session.user,
    search: req.query  // keep search values in form
  });
});



// === RESTful API (No Auth) ===
app.get('/api/bookings', async (req, res) => {
  await client.connect();
  const data = await client.db(dbName).collection('bookings')
    .find()
    .sort({ date: 1, time: 1 })
    .toArray();
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

app.listen(process.env.PORT || 8099, () => {
  console.log(`Server running on port ${process.env.PORT || 8099}`);
});
