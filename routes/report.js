const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const pool = require("../db");
const { spawn } = require("child_process");


// -----------------------------
// Multer setup
// -----------------------------
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/images");
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  },
});

const upload = multer({ storage });


// -----------------------------
// POST /report
// Upload new report
// -----------------------------
router.post("/", upload.single("image"), async (req, res) => {
  try {

    const { latitude, longitude, user_description, user_id } = req.body;

    if (!req.file) {
      return res.status(400).json({ message: "No image uploaded" });
    }

    const imagePath = `/uploads/images/${req.file.filename}`;

    const fullImagePath = path.join(
      __dirname,
      "..",
      "uploads",
      "images",
      req.file.filename
    );

    // Call YOLO python
    const py = spawn("python", ["yolo_detect.py", fullImagePath]);

    let output = "";
    let errorOutput = "";

    py.stdout.on("data", (data) => {
      output += data.toString();
    });

    py.stderr.on("data", (data) => {
      errorOutput += data.toString();
    });

    py.on("close", async () => {

      if (errorOutput) {
        console.error("Python error:", errorOutput);
      }

      let result = {};

      try {
        result = JSON.parse(output.trim());
      } catch (err) {
        console.error("Invalid AI output:", output);
        return res.status(500).json({ message: "AI detection failed" });
      }

      const aiLabel = result.label || "Unknown";

      const aiAccuracy =
        typeof result.ai_accuracy === "number"
          ? result.ai_accuracy
          : 0;

      let threatLevel = "Low Threat";

      if (aiAccuracy >= 70) threatLevel = "High Threat";
      else if (aiAccuracy >= 40) threatLevel = "Medium Threat";

      const finalLabel = `${aiLabel} - ${threatLevel}`;

      const dbResult = await pool.query(
        `
        INSERT INTO incident_reports
        (latitude, longitude, ai_label, ai_accuracy, user_description, image_path, user_id)
        VALUES ($1,$2,$3,$4,$5,$6,$7)
        RETURNING id
        `,
        [
          latitude,
          longitude,
          finalLabel,
          aiAccuracy,
          user_description || "",
          imagePath,
          user_id || null,
        ]
      );

      res.json({
        message: "Report saved",
        id: dbResult.rows[0].id,
        image_path: imagePath,
        ai_label: finalLabel,
        ai_accuracy: aiAccuracy,
      });

    });

  } catch (err) {

    console.error("Server error:", err);
    res.status(500).json({ message: "Server error" });

  }
});


// -----------------------------
// GET /report
// Fetch all reports
// -----------------------------
router.get("/", async (req, res) => {

  try {

    const result = await pool.query(`
      SELECT 
        ir.id,
        ir.latitude,
        ir.longitude,
        ir.ai_label,
        ir.ai_accuracy,
        ir.user_description,
        ir.image_path,
        ir.created_at,
        ir.team,
        t.team_name
      FROM incident_reports ir
      LEFT JOIN teams t
      ON ir.team = t.team_id::text
      ORDER BY ir.created_at DESC
    `);

    res.json(result.rows);

  } catch (err) {

    console.error("Fetch reports error:", err);
    res.status(500).json({ message: "Server error" });

  }

});


// -----------------------------
// POST /report/assign_team
// -----------------------------
router.post("/assign_team", async (req, res) => {

  const { report_id, team, admin_id } = req.body;

  if (!report_id || !team) {
    return res.status(400).json({ message: "Missing fields" });
  }

  try {

    await pool.query(
      `
      UPDATE incident_reports
      SET team = $1
      WHERE id = $2
      `,
      [team.toString(), report_id]
    );

    res.json({
      message: "Team assigned successfully",
    });

  } catch (err) {

    console.error("Assign team error:", err);
    res.status(500).json({ message: "Server error" });

  }

});


// -----------------------------
// GET /report/teams
// -----------------------------
router.get("/teams", async (req, res) => {

  try {

    const result = await pool.query(`
      SELECT team_id, team_name
      FROM teams
      ORDER BY team_id ASC
    `);

    res.json(result.rows);

  } catch (err) {

    console.error("Fetch teams error:", err);
    res.status(500).json({ message: "Server error" });

  }

});

module.exports = router;