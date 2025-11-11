const mongoose = require('mongoose');
module.exports = mongoose.model('Table', new mongoose.Schema({
  number: { type: String, unique: true },
  seats: { type: Number, min: 2, max: 10 },
  status: { type: String, default: 'available' }
}));
