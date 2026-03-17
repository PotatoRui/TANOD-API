const express = require("express");
const router = express.Router();
const pool = require("../db");

/**
 * POST /user_location
 * Insert location if user not in table
 * Update location if already exists
 */
router.post("/", async (req, res) => {

  const { user_id, latitude, longitude } = req.body;

  if (!user_id || !latitude || !longitude) {
    return res.status(400).json({
      error: "user_id, latitude, longitude are required"
    });
  }

  try {

    const result = await pool.query(
      `
      INSERT INTO user_locations (user_id, latitude, longitude, is_online, created_at)
      VALUES ($1, $2, $3, TRUE, NOW())

      ON CONFLICT (user_id)
      DO UPDATE SET
        latitude = EXCLUDED.latitude,
        longitude = EXCLUDED.longitude,
        is_online = TRUE,
        created_at = NOW()

      RETURNING *;
      `,
      [user_id, latitude, longitude]
    );

    console.log("Location updated:", result.rows[0]);

    res.json({
      message: "Location saved",
      location: result.rows[0]
    });

  } catch (error) {
    console.error("Location error:", error);
    res.status(500).json({ error: "Internal server error" });
  }

});

module.exports = router;