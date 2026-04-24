const pool = require('../db');

async function checkDB() {
  try {
    // 1. List all tables
    const tables = await pool.query(`SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name`);
    console.log('\n=== ALL TABLES IN DATABASE ===');
    tables.rows.forEach(t => console.log('  ✅ ' + t.table_name));
    console.log('Total: ' + tables.rows.length + ' tables\n');

    // 2. Check labs table
    const labs = await pool.query('SELECT * FROM labs');
    console.log('=== LABS (' + labs.rows.length + ') ===');
    labs.rows.forEach(l => console.log('  ' + l.id + ': ' + l.name));

    // 3. Check devices table
    const devices = await pool.query('SELECT * FROM devices');
    console.log('\n=== DEVICES (' + devices.rows.length + ') ===');
    devices.rows.forEach(d => console.log('  ' + d.id + ': ' + d.name + ' (lab_id=' + d.lab_id + ', status=' + d.status + ')'));

    // 4. Check notifications table
    const notifs = await pool.query('SELECT * FROM notifications LIMIT 5');
    console.log('\n=== NOTIFICATIONS (' + notifs.rows.length + ') ===');
    notifs.rows.forEach(n => console.log('  ' + n.id + ': ' + n.title + ' (read=' + n.is_read + ')'));

    // 5. Check maintenance_requests columns
    const cols = await pool.query(`SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'maintenance_requests' ORDER BY ordinal_position`);
    console.log('\n=== maintenance_requests COLUMNS ===');
    cols.rows.forEach(c => console.log('  ' + c.column_name + ' (' + c.data_type + ')'));

    // 6. Check roles
    const roles = await pool.query('SELECT * FROM roles ORDER BY id');
    console.log('\n=== ROLES ===');
    roles.rows.forEach(r => console.log('  ' + r.id + ': ' + r.name + ' - ' + (r.description || '')));

    // 7. Check users
    const users = await pool.query('SELECT u.id, u.full_name, u.email, r.name as role FROM users u LEFT JOIN roles r ON r.id = u.role_id ORDER BY u.id');
    console.log('\n=== USERS ===');
    users.rows.forEach(u => console.log('  ' + u.id + ': ' + u.full_name + ' <' + u.email + '> [' + (u.role || 'no role') + ']'));

    console.log('\n✅ DATABASE CHECK COMPLETE - Everything looks good!');
  } catch(err) {
    console.error('❌ ERROR:', err.message);
  } finally {
    process.exit(0);
  }
}

checkDB();
