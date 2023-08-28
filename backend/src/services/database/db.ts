import sqlite3 from 'sqlite3';
const db = new sqlite3.Database('./src/services/database/mydatabase.db');

function initializeDatabase() {
  // Run table creation code
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY,
      username TEXT,
      email TEXT
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS posts (
      id INTEGER PRIMARY KEY,
      user_id INTEGER,
      content TEXT,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS followers (
      follower_id INTEGER,
      followee_id INTEGER,
      PRIMARY KEY (follower_id, followee_id),
      FOREIGN KEY (follower_id) REFERENCES users(id),
      FOREIGN KEY (followee_id) REFERENCES users(id)
    )
  `);
}

export { db, initializeDatabase };