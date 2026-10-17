const { Client } = require('pg');
const client = new Client({
  connectionString: 'postgres://align_user:development_password@localhost:5432/align_qms'
});
client.connect();
client.query('SELECT email FROM users WHERE role = \'STAFF\' ORDER BY created_at DESC LIMIT 5', (err, res) => {
  if (err) throw err;
  console.log(res.rows);
  client.end();
});
