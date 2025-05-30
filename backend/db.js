const mysql = require('mysql2/promise');

const db = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'admission_system'
});

// Test connection when file is run directly
if (require.main === module) {
  db.getConnection()
    .then(conn => {
      console.log("✅ MySQL connected successfully!");
      conn.release();
      process.exit(); // Exit after test
    })
    .catch(err => {
      console.error("❌ MySQL connection failed:", err.message);
      process.exit(1); // Exit with failure code
    });
}

module.exports = db;
