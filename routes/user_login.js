const express = require("express");
const router = express.Router();
const pool = require("../db");
const jwt = require("jsonwebtoken");

// USER LOGIN ONLY (NON-ADMIN)
router.post("/", async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: "Email and password required" });
  }

  try {
    // 1️⃣ Check if user exists
    const result = await pool.query(
      "SELECT id, name, email, password_hash, role, team_id FROM users WHERE email = $1",
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const user = result.rows[0];

    // 2️⃣ Check password first
    if (user.password_hash !== password) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    // 3️⃣ Then check if user is ADMIN
    if (user.role && user.role.toLowerCase() === "admin") {
      return res.status(403).json({ message: "Admins cannot login here" });
    }

    // 4️⃣ Generate JWT
    const token = jwt.sign(
      { id: user.id, role: user.role },
      process.env.JWT_SECRET || "secretkey",
      { expiresIn: "1d" }
    );

    res.json({
      token,
      role: user.role,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        team_id: user.team_id,
      },
    });

  } catch (err) {
    console.error("User login error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
