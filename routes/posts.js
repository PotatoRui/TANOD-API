const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const pool = require("../db"); // your PostgreSQL pool

// -----------------------------
// Multer setup for image uploads
// -----------------------------
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/posts");
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  },
});

const upload = multer({ storage });

// -----------------------------
// CREATE POST
// -----------------------------
router.post("/", upload.single("image"), async (req, res) => {
  try {
    const { description } = req.body;

    if (!req.file || !description) {
      return res.status(400).json({ message: "Missing image or description" });
    }

    const imageLocation = `/uploads/posts/${req.file.filename}`;

    const result = await pool.query(
      `INSERT INTO posts (description, image_location)
       VALUES ($1, $2)
       RETURNING *`,
      [description, imageLocation]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("Error creating post:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// -----------------------------
// READ ALL POSTS
// -----------------------------
router.get("/", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM posts ORDER BY created_at DESC"
    );
    res.json(result.rows);
  } catch (err) {
    console.error("Error fetching posts:", err);
    res.status(500).json({ message: "Server error" });
  }
});



// -----------------------------
// UPDATE POST DESCRIPTION
// -----------------------------
router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { description } = req.body;

    if (!description) {
      return res.status(400).json({ message: "Missing description" });
    }

    const result = await pool.query(
      `UPDATE posts
       SET description = $1
       WHERE id = $2
       RETURNING *`,
      [description, id]
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error("Error updating post:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// -----------------------------
// SOFT DELETE POST
// -----------------------------
router.put("/:id/hide", async (req, res) => {
  try {
    const { id } = req.params;

    await pool.query(
      `UPDATE posts
       SET is_active = FALSE
       WHERE id = $1`,
      [id]
    );

    res.json({ message: "Post soft-deleted" });
  } catch (err) {
    console.error("Error soft deleting post:", err);
    res.status(500).json({ message: "Server error" });
  }
});

router.put("/:id/unhide", async (req, res) => {
  try {
    const { id } = req.params;

    await pool.query(
      `UPDATE posts
       SET is_active = TRUE
       WHERE id = $1`,
      [id]
    );

    res.json({ message: "Post soft-deleted" });
  } catch (err) {
    console.error("Error soft deleting post:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// -----------------------------
// OPTIONAL: HARD DELETE POST
// -----------------------------
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    await pool.query(
      `DELETE FROM posts
       WHERE id = $1`,
      [id]
    );

    res.json({ message: "Post permanently deleted" });
  } catch (err) {
    console.error("Error deleting post:", err);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
