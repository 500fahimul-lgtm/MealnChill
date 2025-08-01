// activateAllMembers.js
const mongoose = require('mongoose');

const uri = 'mongodb://localhost:27017/YOUR_DB_NAME'; // <-- Change this to your MongoDB URI
mongoose.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true });

const userSchema = new mongoose.Schema({}, { strict: false });
const User = mongoose.model('User', userSchema, 'users');

async function activateAll() {
  const result = await User.updateMany(
    { messId: { $ne: null } },
    { $set: { isActive: true } }
  );
  console.log('Activated users:', result.modifiedCount);
  mongoose.disconnect();
}

activateAll(); 