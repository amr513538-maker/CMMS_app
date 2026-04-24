const jwt = require('jsonwebtoken');
require('dotenv').config();

const payload = { sub: '3', role: 'IT Support', name: 'mazen amr ', email: 'mazenamr@gmail.com' };
const token = jwt.sign(payload, process.env.JWT_SECRET);
const decoded = jwt.verify(token, process.env.JWT_SECRET);
console.log('Decoded Role:', decoded.role);
console.log('Role matches IT Support:', decoded.role === 'IT Support');
process.exit(0);
