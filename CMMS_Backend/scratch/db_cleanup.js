const { Pool } = require('pg');
const pool = new Pool({ connectionString: 'postgres://postgres:12345@localhost:5432/cmms_db' });

async function cleanup() {
  try {
    console.log("--- Starting Database Role Cleanup ---");

    // 1. Ensure Roles table is consistent
    // We already renamed requester -> user and technician -> IT Support
    // Let's make sure we don't have duplicates or weird names
    const rolesRes = await pool.query("SELECT * FROM roles");
    console.log("Current roles:", rolesRes.rows);

    // 2. Identify role IDs
    const getRoleId = (name) => {
      const r = rolesRes.rows.find(row => row.name.toLowerCase() === name.toLowerCase());
      return r ? r.id : null;
    };

    const adminId = getRoleId('admin');
    const userId = getRoleId('user');
    const itSupportId = getRoleId('IT Support');

    console.log(`IDs - Admin: ${adminId}, User: ${userId}, IT Support: ${itSupportId}`);

    // 3. Update any users with null roles to 'user'
    const nullFix = await pool.query("UPDATE users SET role_id = $1 WHERE role_id IS NULL", [userId]);
    console.log(`Fixed ${nullFix.rowCount} users with NULL roles.`);

    // 4. Verification Check
    const finalCheck = await pool.query(`
      SELECT u.email, r.name as role_name 
      FROM users u 
      LEFT JOIN roles r ON r.id = u.role_id
    `);
    console.log("Final User Role State:");
    console.table(finalCheck.rows);

    process.exit(0);
  } catch (err) {
    console.error("Cleanup failed:", err);
    process.exit(1);
  }
}

cleanup();
