const express = require("express");
const router = express.Router();
const pool = require("../db");

// GET ALL LOGS
router.get("/", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT *
      FROM logs
      ORDER BY performed_at DESC
    `);

    res.json(result.rows);
  } catch (err) {
    console.error("Error fetching logs:", err);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
