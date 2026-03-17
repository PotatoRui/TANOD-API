const express = require("express");
const router = express.Router();
const pool = require("../db");


// ==========================================
// GET ADMIN DASHBOARD DATA
// ==========================================
router.get("/dashboard", async (req, res) => {
  try {

    // INCIDENT ANALYTICS
    const today = await pool.query(`
      SELECT COUNT(*) 
      FROM incident_reports
      WHERE created_at::date = CURRENT_DATE
    `);

    const week = await pool.query(`
      SELECT COUNT(*)
      FROM incident_reports
      WHERE created_at >= date_trunc('week', NOW())
    `);

    const month = await pool.query(`
      SELECT COUNT(*)
      FROM incident_reports
      WHERE created_at >= date_trunc('month', NOW())
    `);

    const year = await pool.query(`
      SELECT COUNT(*)
      FROM incident_reports
      WHERE created_at >= date_trunc('year', NOW())
    `);


    // ONLINE USERS
    const usersOnline = await pool.query(`
      SELECT COUNT(*)
      FROM user_locations
      WHERE is_online = true
    `);


    // INCIDENTS FOR MAP
    const incidents = await pool.query(`
      SELECT 
      id,
      latitude,
      longitude,
      ai_label,
      status,
      created_at
      FROM incident_reports
      ORDER BY created_at DESC
    `);


    // USERS WITH LOCATIONS
    const users = await pool.query(`
      SELECT
      u.id,
      u.name,
      u.role,
      ul.latitude,
      ul.longitude,
      ul.is_online,
      ul.updated_at
      FROM users u
      JOIN user_locations ul
      ON u.id = ul.user_id
    `);


    res.json({
      analytics: {
        today: today.rows[0].count,
        week: week.rows[0].count,
        month: month.rows[0].count,
        year: year.rows[0].count,
        users_online: usersOnline.rows[0].count
      },
      incidents: incidents.rows,
      users: users.rows
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "dashboard error" });
  }
});



// ==========================================
// ASSIGN RESPONDER TO INCIDENT
// ==========================================
router.post("/assign", async (req, res) => {

  const { incident_id, user_id } = req.body;

  try {

    await pool.query(`
      UPDATE incident_reports
      SET 
      team = $1,
      status = 'assigned'
      WHERE id = $2
    `, [user_id, incident_id]);

    res.json({
      message: "Responder assigned successfully"
    });

  } catch (err) {

    console.error(err);

    res.status(500).json({
      error: "assignment failed"
    });

  }

});



module.exports = router;