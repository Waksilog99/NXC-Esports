const Database = require('better-sqlite3');
const crypto = require('crypto');
const db = new Database('local.db');

const hashPassword = (p) => crypto.createHash('sha256').update(p).digest('hex');

const member = db.prepare("SELECT id, username, email, role, fullname, password FROM users WHERE username = 'member'").get();

// Try common seed passwords
const candidates = ['admin', 'password123', 'member', 'nxc123', '123456', 'password', 'nexus'];
let found = null;
for (const p of candidates) {
    if (hashPassword(p) === member.password) {
        found = p;
        break;
    }
}

console.log('Username:', member.username);
console.log('Email:   ', member.email);
console.log('Role:    ', member.role);
console.log('Password:', found ? found : '(hashed - not a common password) ' + member.password);
db.close();
