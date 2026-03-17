const express = require("express");
const router = express.Router();
const pool = require("../db"); // your PostgreSQL pool

// -----------------------------
// GET ALL ACTIVE POSTS (USER VIEW ONLY)
// -----------------------------
router.get("/", async (req, res) => {
  try {
    // Only fetch posts that are active
    const result = await pool.query(
      `SELECT *
       FROM posts
       WHERE is_active = TRUE
       ORDER BY created_at DESC`
    );

    res.json(result.rows);
  } catch (err) {
    console.error("Error fetching posts:", err);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
