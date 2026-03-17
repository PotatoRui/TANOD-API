const express = require('express');
const router = express.Router();
const pool = require('../db');
const multer = require('multer');
const path = require('path');

/**
 * ===============================
 * Multer setup for evidences
 * ===============================
 */
const evidenceStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/evidences'); // Make sure this folder exists
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  },
});

const uploadEvidence = multer({ storage: evidenceStorage });

/**
 * ==========================================
 * POST /user/incidents/:id/evidence
 * Body: { description, uploaded_by }
 * Upload evidence and mark incident completed
 * ==========================================
 */
router.post('/:id/evidence', uploadEvidence.single('image'), async (req, res) => {
  const { id } = req.params; // incident_id
  const { description, uploaded_by } = req.body;

  if (!req.file) {
    return res.status(400).json({ error: 'Evidence image is required' });
  }

  if (!uploaded_by) {
    return res.status(400).json({ error: 'uploaded_by (user id) is required' });
  }

  const imagePath = `/uploads/evidences/${req.file.filename}`;
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Check incident exists and not completed
    const incidentCheck = await client.query(
      `SELECT status FROM incident_reports WHERE id = $1`,
      [id]
    );

    if (incidentCheck.rowCount === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Incident not found' });
    }

    if (incidentCheck.rows[0].status === 'completed') {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Incident already completed' });
    }

    // Insert evidence
    await client.query(
      `INSERT INTO incident_evidences
        (incident_id, image_path, description, uploaded_by)
       VALUES ($1, $2, $3, $4)`,
      [id, imagePath, description || '', uploaded_by]
    );

    // Update incident status to completed
    await client.query(
      `UPDATE incident_reports
       SET status = 'completed'
       WHERE id = $1`,
      [id]
    );

    await client.query('COMMIT');

    res.json({
      message: 'Evidence uploaded and incident marked as completed',
      image_path: imagePath,
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error uploading evidence:', error);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    client.release();
  }
});

module.exports = router;
