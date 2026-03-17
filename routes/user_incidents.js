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
    cb(null, 'uploads/evidences');
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  },
});

const uploadEvidence = multer({ storage: evidenceStorage });

/**
 * ==========================================
 * GET /incidents/assigned
 * Required: userId
 * Returns BOTH personal + team incidents
 * ==========================================
 */
router.get('/assigned', async (req, res) => {
  const { userId } = req.query;

  if (!userId) {
    return res.status(400).json({ error: 'userId is required' });
  }

  try {
    // 1️⃣ Get user's team_id
    const userResult = await pool.query(
      `SELECT team_id FROM users WHERE id = $1`,
      [userId]
    );

    if (userResult.rowCount === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const teamId = userResult.rows[0].team_id;

    // 2️⃣ Fetch incidents (personal + team)
    const incidentResult = await pool.query(
      `
      SELECT *
      FROM incident_reports
      WHERE user_id = $1
         OR team::text = $2::text
      ORDER BY created_at DESC
      `,
      [userId, teamId]
    );

    res.json(incidentResult.rows);

  } catch (error) {
    console.error('Error fetching assigned incidents:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * ==========================================
 * PATCH /incidents/:id/status
 * Body: { status }
 * ==========================================
 */
router.patch('/:id/status', async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  const allowedStatuses = ['pending', 'viewed', 'completed'];

  if (!status || !allowedStatuses.includes(status)) {
    return res.status(400).json({ error: 'Invalid status value' });
  }

  try {
    const result = await pool.query(
      `
      UPDATE incident_reports
      SET status = $1
      WHERE id = $2
      AND status != 'completed'
      RETURNING *
      `,
      [status, id]
    );

    if (result.rowCount === 0) {
      return res.status(400).json({
        error: 'Incident already completed or not found'
      });
    }

    res.json({
      message: 'Status updated successfully',
      incident: result.rows[0],
    });

  } catch (error) {
    console.error('Error updating status:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * ==========================================
 * POST /incidents/:id/evidence
 * Upload evidence
 * Inserts into incident_evidences
 * Marks incident completed
 * ==========================================
 */
router.post('/:id/evidence', uploadEvidence.single('image'), async (req, res) => {
  const { id } = req.params;
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

    await client.query(
      `
      INSERT INTO incident_evidences
        (incident_id, image_path, description, uploaded_by)
      VALUES ($1, $2, $3, $4)
      `,
      [id, imagePath, description || '', uploaded_by]
    );

    await client.query(
      `
      UPDATE incident_reports
      SET status = 'completed'
      WHERE id = $1
      `,
      [id]
    );

    await client.query('COMMIT');

    res.json({
      message: 'Evidence uploaded and incident marked as completed',
      image_path: imagePath
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
