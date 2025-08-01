// printAllMembers.js
const mongoose = require('mongoose');

const uri = 'mongodb://localhost:27017/YOUR_DB_NAME'; // <-- Change this to your MongoDB URI
mongoose.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true });

const userSchema = new mongoose.Schema({}, { strict: false });
const User = mongoose.model('User', userSchema, 'users');

async function printAll() {
    const users = await User.find({}, { name: 1, email: 1, messId: 1, isActive: 1 });
    users.forEach(u => {
        console.log({
            name: u.name,
            email: u.email,
            messId: u.messId ? u.messId.toString() : null,
            isActive: u.isActive
        });
    });
    mongoose.disconnect();
}

printAll(); 