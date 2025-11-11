require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');
const bcrypt = require('bcrypt');
const methodOverride = require('method-override');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/bookmytable')
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.log(err));

// Models
const User = require('./models/User');
const Table = require('./models/Table');
const Booking = require('./models/Booking');

// Middleware
app.set('view engine', 'ejs');
app.use(express.static('public'));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(methodOverride('_method'));
app.use(session({
  secret: process.env.SESSION_SECRET || 'secret',
  resave: false,
  saveUninitialized: false
}));

// Auth Middleware
const requireLogin = (req, res, next) => {
  if (!req.session.userId) {
    return res.redirect('/login');
  }
  next();
};

// Seed Admin (Run once)
app.get('/seed-admin', async (req, res) => {
  const hashed = await bcrypt.hash('admin123', 10);
  await User.findOneAndUpdate(
    { username: 'admin' },
    { username: 'admin', password: hashed, role: 'admin' },
    { upsert: true }
  );
  res.send('Admin created: admin / admin123');
});

// === ROUTES ===

// Login Page
app.get('/login', (req, res) => {
  res.render('login');
});

app.post('/login', async (req, res) => {
  const { username, password } = req.body;
  const user = await User.findOne({ username });
  if (user && await bcrypt.compare(password, user.password)) {
    req.session.userId = user._id;
    req.session.role = user.role;
    return res.redirect('/');
  }
  res.render('login', { error: 'Invalid credentials' });
});

// Logout
app.post('/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/login');
});

// Dashboard - CRUD List
app.get('/', requireLogin, async (req, res) => {
  const { customerName, date, status } = req.query;
  let query = {};
  if (customerName) query.customerName = new RegExp(customerName, 'i');
  if (date) query.date = { $gte: new Date(date), $lt: new Date(date + 'T23:59:59') };
  if (status) query.status = status;

  const bookings = await Booking.find(query).populate('table').sort({ date: 1 });
  const tables = await Table.find();
  res.render('dashboard', { bookings, tables, query });
});

// Create Booking (Web)
app.get('/bookings/create', requireLogin, async (req, res) => {
  const tables = await Table.find();
  res.render('bookings/create', { tables });
});

app.post('/bookings', requireLogin, async (req, res) => {
  await Booking.create(req.body);
  res.redirect('/');
});

// Edit Booking
app.get('/bookings/edit/:id', requireLogin, async (req, res) => {
  const booking = await Booking.findById(req.params.id);
  const tables = await Table.find();
  res.render('bookings/edit', { booking, tables });
});

app.put('/bookings/:id', requireLogin, async (req, res) => {
  await Booking.findByIdAndUpdate(req.params.id, req.body);
  res.redirect('/');
});

// Delete Booking
app.delete('/bookings/:id', requireLogin, async (req, res) => {
  await Booking.findByIdAndDelete(req.params.id);
  res.redirect('/');
});

// === RESTful APIs (No Auth) ===

app.get('/api/bookings', async (req, res) => {
  const { date, status, customerName } = req.query;
  let query = {};
  if (date) query.date = { $gte: new Date(date), $lt: new Date(date + 'T23:59:59') };
  if (status) query.status = status;
  if (customerName) query.customerName = new RegExp(customerName, 'i');
  const bookings = await Booking.find(query).populate('table');
  res.json(bookings);
});

app.get('/api/bookings/:id', async (req, res) => {
  const booking = await Booking.findById(req.params.id).populate('table');
  res.json(booking);
});

app.post('/api/bookings', async (req, res) => {
  const booking = await Booking.create(req.body);
  res.status(201).json(booking);
});

app.put('/api/bookings/:id', async (req, res) => {
  const booking = await Booking.findByIdAndUpdate(req.params.id, req.body, { new: true });
  res.json(booking);
});

app.delete('/api/bookings/:id', async (req, res) => {
  await Booking.findByIdAndDelete(req.params.id);
  res.status(204).send();
});

// Bonus: Stats API
app.get('/api/stats', async (req, res) => {
  const today = new Date().toISOString().split('T')[0];
  const count = await Booking.countDocuments({
    date: { $gte: new Date(today), $lt: new Date(today + 'T23:59:59') }
  });
  res.json({ todayBookings: count });
});

// Start Server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
