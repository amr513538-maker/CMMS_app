const pool = require('../db');
const bcrypt = require('bcryptjs'); // The project uses bcrypt in index.js

async function addCustomAdmin() {
  try {
    const passwordHash = await bcrypt.hash('admin', 10);
    
    // Check if the user already exists
    const res = await pool.query("SELECT id FROM users WHERE email = 'admin'");
    if (res.rows.length > 0) {
      // Update password
      await pool.query("UPDATE users SET password_hash = $1 WHERE email = 'admin'", [passwordHash]);
      console.log("Updated existing 'admin' user password to 'admin'");
    } else {
      // Create user
      const roleRes = await pool.query("SELECT id FROM roles WHERE name = 'admin' LIMIT 1");
      let roleId = roleRes.rows[0]?.id;
      
      await pool.query(
        "INSERT INTO users (full_name, email, password_hash, role_id, is_active) VALUES ($1, $2, $3, $4, TRUE)",
        ["Admin", "admin", passwordHash, roleId]
      );
      console.log("Successfully created user 'admin' with password 'admin'");
    }
  } catch (err) {
    console.error("Error creating admin user:", err.message);
  } finally {
    process.exit(0);
  }
}

addCustomAdmin();
