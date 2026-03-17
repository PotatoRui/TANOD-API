const express = require("express");
const router = express.Router();
const pool = require("../db");
const bcrypt = require("bcrypt");

// ------------------------------------
// CREATE USER
// ------------------------------------
router.post("/", async (req, res) => {
  try {
    const { name, email, password, role, team_id } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const result = await pool.query(
      `INSERT INTO users (name, email, password_hash, role, team_id)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, name, email, role, team_id, created_at`,
      [name, email, hashedPassword, role || "resident", team_id || null]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to create user" });
  }
});

// ------------------------------------
// READ ALL USERS
// ------------------------------------
router.get("/", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        u.id,
        u.name,
        u.email,
        u.role,
        u.team_id,
        t.team_name,
        u.created_at
      FROM users u
      LEFT JOIN teams t ON u.team_id = t.team_id
      ORDER BY u.created_at DESC
    `);

    res.json(result.rows);
  } catch (err) {
    console.error("Fetch users error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// ------------------------------------
// READ SINGLE USER
// ------------------------------------
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `
      SELECT 
        u.id,
        u.name,
        u.email,
        u.role,
        u.team_id,
        t.team_name,
        u.created_at
      FROM users u
      LEFT JOIN teams t ON u.team_id = t.team_id
      WHERE u.id = $1
      `,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch user" });
  }
});

// ------------------------------------
// UPDATE USER
// ------------------------------------
router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, role, password, team_id } = req.body;

    let query = `
      UPDATE users SET
        name = COALESCE($1, name),
        email = COALESCE($2, email),
        role = COALESCE($3, role),
        team_id = COALESCE($4, team_id)
    `;
    let values = [name, email, role, team_id];
    let index = 5;

    if (password) {
      const hashedPassword = await bcrypt.hash(password, 10);
      query += `, password_hash = $${index}`;
      values.push(hashedPassword);
      index++;
    }

    query += ` WHERE id = $${index} RETURNING id, name, email, role, team_id`;
    values.push(id);

    const result = await pool.query(query, values);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to update user" });
  }
});

// ------------------------------------
// DELETE USER
// ------------------------------------
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `DELETE FROM users WHERE id = $1 RETURNING id`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({ message: "User deleted successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to delete user" });
  }
});

// ------------------------------------
// SEARCH USERS
// ------------------------------------
router.get("/search/query", async (req, res) => {
  const { q } = req.query;

  if (!q) return res.status(400).json({ message: "Search query required" });

  try {
    const result = await pool.query(
      `
      SELECT 
        u.id,
        u.name,
        u.email,
        u.role,
        u.team_id,
        t.team_name,
        u.created_at
      FROM users u
      LEFT JOIN teams t ON u.team_id = t.team_id
      WHERE 
        u.name ILIKE $1
        OR u.email ILIKE $1
        OR u.id::text ILIKE $1
      ORDER BY u.created_at DESC
      `,
      [`%${q}%`]
    );

    res.json(result.rows);
  } catch (err) {
    console.error("Search error:", err);
    res.status(500).json({ message: "Search failed" });
  }
});

// ------------------------------------
// GET ALL TEAMS
// ------------------------------------
router.get("/teams/all", async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT team_id, team_name, created_at FROM teams ORDER BY created_at ASC`
    );
    res.json(result.rows);
  } catch (err) {
    console.error("Fetch teams error:", err);
    res.status(500).json({ message: "Failed to fetch teams" });
  }
});

module.exports = router;
