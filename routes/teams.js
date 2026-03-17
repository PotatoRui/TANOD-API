const express = require("express");
const router = express.Router();
const pool = require("../db");

// ---------------------------
// CREATE TEAM
// ---------------------------
router.post("/", async (req, res) => {
  try {
    const { team_name, currentUserId } = req.body;
    if (!team_name) return res.status(400).json({ message: "Team name required" });

    const result = await pool.query(
      `INSERT INTO teams (team_name) VALUES ($1) RETURNING team_id, team_name, created_at`,
      [team_name]
    );

    await pool.query(
      `INSERT INTO logs(table_name, action, record_id, changed_data, performed_by)
       VALUES ('teams', 'CREATE', $1, $2, $3)`,
      [result.rows[0].team_id.toString(), JSON.stringify(result.rows[0]), currentUserId]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    if (err.code === "23505") return res.status(400).json({ message: "Team name exists" });
    res.status(500).json({ message: "Failed to create team" });
  }
});

// ---------------------------
// READ ALL TEAMS
// ---------------------------
router.get("/", async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT team_id, team_name, created_at FROM teams ORDER BY created_at DESC`
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch teams" });
  }
});

// ---------------------------
// UPDATE TEAM
// ---------------------------
router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { team_name, currentUserId } = req.body;

    const result = await pool.query(
      `UPDATE teams SET team_name = COALESCE($1, team_name)
       WHERE team_id = $2 RETURNING team_id, team_name`,
      [team_name, id]
    );

    if (result.rows.length === 0) return res.status(404).json({ message: "Team not found" });

    await pool.query(
      `INSERT INTO logs(table_name, action, record_id, changed_data, performed_by)
       VALUES ('teams', 'UPDATE', $1, $2, $3)`,
      [id, JSON.stringify(result.rows[0]), currentUserId]
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    if (err.code === "23505") return res.status(400).json({ message: "Team name exists" });
    res.status(500).json({ message: "Failed to update team" });
  }
});

// ---------------------------
// DELETE TEAM
// ---------------------------
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { currentUserId } = req.body;

    const result = await pool.query(
      `DELETE FROM teams WHERE team_id = $1 RETURNING team_id, team_name`,
      [id]
    );

    if (result.rows.length === 0) return res.status(404).json({ message: "Team not found" });

    await pool.query(
      `INSERT INTO logs(table_name, action, record_id, changed_data, performed_by)
       VALUES ('teams', 'DELETE', $1, $2, $3)`,
      [id, JSON.stringify(result.rows[0]), currentUserId]
    );

    res.json({ message: "Team deleted successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to delete team" });
  }
});

module.exports = router;
