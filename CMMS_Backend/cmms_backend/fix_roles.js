const pool = require('./db');

async function updateRoles() {
    try {
        const r1 = await pool.query("UPDATE roles SET name = 'user' WHERE name = 'requester' OR name = 'user'");
        console.log('Updated user:', r1.rowCount);
        const r2 = await pool.query("UPDATE roles SET name = 'IT Support' WHERE name = 'it support' OR name = 'IT Support'");
        console.log('Updated IT Support:', r2.rowCount);
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

updateRoles();
