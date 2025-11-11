const mongoose = require('mongoose');
module.exports = mongoose.model('Booking', new mongoose.Schema({
  customerName: String,
  phone: String,
  date: Date,
  time: String,
  pax: Number,
  table: { type: mongoose.Schema.Types.ObjectId, ref: 'Table' },
  status: { type: String, default: 'confirmed' },
  notes: String
}, { timestamps: true }));
