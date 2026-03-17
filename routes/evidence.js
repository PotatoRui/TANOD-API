const express = require("express");
const router = express.Router();
const pool = require("../db");

// ===============================
// GET ALL EVIDENCES WITH INCIDENT DATA
// ===============================
router.get("/", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        ie.id AS evidence_id,
        ie.image_path AS evidence_image,
        ie.description AS evidence_description,
        ie.uploaded_at,
        ir.id AS incident_id,
        ir.image_path AS incident_image,
        ir.user_description,
        ir.latitude,
        ir.longitude,
        ir.ai_label,
        ir.status
      FROM incident_evidences ie
      LEFT JOIN incident_reports ir
      ON ie.incident_id = ir.id
      ORDER BY ie.uploaded_at DESC
    `);

    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch evidences" });
  }
});

// ===============================
// CREATE EVIDENCE
// ===============================
router.post("/", async (req, res) => {
  try {
    const { incident_id, image_path, description, uploaded_by } = req.body;

    const result = await pool.query(
      `INSERT INTO incident_evidences
       (incident_id, image_path, description, uploaded_by)
       VALUES ($1,$2,$3,$4)
       RETURNING *`,
      [incident_id, image_path, description, uploaded_by]
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to create evidence" });
  }
});

// ===============================
// DELETE EVIDENCE
// ===============================
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    await pool.query(
      `DELETE FROM incident_evidences WHERE id=$1`,
      [id]
    );

    res.json({ message: "Evidence deleted" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to delete evidence" });
  }
});

module.exports = router;