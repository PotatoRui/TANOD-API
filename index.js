require("dotenv").config(); // load .env variables
const express = require("express");
const cors = require("cors");
const path = require("path"); // for serving images
const app = express();

// ✅ Middleware
app.use(cors());        
app.use(express.json()); 

//admin dashboard all
const adminDashboardRoutes = require("./routes/admindashboard");
app.use("/api/admin", adminDashboardRoutes);

// ✅ Serve uploaded images as static files
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// ✅ Routes
const authRoutes = require("./routes/auth");
app.use("/auth", authRoutes);

//user
const loginRoutes = require("./routes/user_login");
app.use("/login", loginRoutes);

//location update//live map
const locationRoutes = require("./routes/user_location");
app.use("/user_location", locationRoutes);

//submit report
const reportRoutes = require("./routes/report");
app.use("/report", reportRoutes);

// ✅ Test root route
app.get("/", (req, res) => {
  res.send("API is running");
});

//posts update route
app.use("/posts", require("./routes/posts"));

//user based
const userPostsRouter = require("./routes/posts_users");
app.use("/user-posts", userPostsRouter);

//user crude
const usersRoutes = require("./routes/users");
app.use("/api/users", usersRoutes);

// evidences crud
const incidentEvidenceRoutes = require("./routes/evidence");
app.use("/api/incident-evidences", incidentEvidenceRoutes);
//teams crud
const teamsRoutes = require("./routes/teams");
app.use("/api/teams", teamsRoutes);

//user-assigned incidents / team assigned incidents
const incidentsRoutes = require("./routes/user_incidents");
app.use("/incidents", incidentsRoutes);

//logs
const logsRoutes = require("./routes/logs");
app.use("/api/logs", logsRoutes);

//upload eviences
const userEvidenceRoutes = require("./routes/user_upload_evidences");
app.use("/evidence", userEvidenceRoutes);

//user_logs
const userLogsRoutes = require("./routes/user_logs");
app.use("/user_logs", userLogsRoutes);

// ------------------------------
// ✅ Auto-offline checker
// ------------------------------

// Make sure you have your pool defined somewhere
const pool = require("./db"); // <-- your PostgreSQL pool

// Run every 5 seconds to mark users offline if no location update in 30s
setInterval(async () => {
  try {
    await pool.query(`
      UPDATE user_locations
      SET is_online = FALSE
      WHERE created_at < NOW() - INTERVAL '30 seconds'
        AND is_online = TRUE
    `);
    // console.log("Auto-offline check complete");
  } catch (err) {
    console.error("Error auto-setting offline:", err.message);
  }
}, 5000); // check every 5 seconds

// ✅ Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});