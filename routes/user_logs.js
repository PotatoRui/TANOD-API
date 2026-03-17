const express = require("express");
const router = express.Router();
const pool = require("../db"); // make sure this points to your PostgreSQL pool

// GET /user_logs/:userId
router.get("/:userId", async (req, res) => {
  const { userId } = req.params;

  try {
    const result = await pool.query(
      `
      SELECT
        ie.id AS evidence_id,
        ie.image_path,
        ie.description,
        ie.uploaded_at,
        ir.id AS incident_id,
        ir.ai_label
      FROM public.incident_evidences ie
      LEFT JOIN public.incident_reports ir
        ON ie.incident_id = ir.id
      WHERE ie.uploaded_by::text = $1
      ORDER BY ie.uploaded_at DESC
      `,
      [userId]
    );

    res.json(result.rows);
  } catch (err) {
    console.error("Error fetching user logs:", err);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;