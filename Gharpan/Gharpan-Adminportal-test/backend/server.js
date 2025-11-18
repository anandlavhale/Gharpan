const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
require("dotenv").config();

const app = express();

/* --------------------------------------------------------------------------
   CORS CONFIGURATION (Vercel + Localhost)
--------------------------------------------------------------------------- */

app.use(cors({
  origin: [
    "http://localhost:5173",      // local development frontend
    process.env.FRONTEND_URL      // Vercel frontend URL
  ],
  methods: ["GET", "POST", "PUT", "DELETE"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/* --------------------------------------------------------------------------
   STATIC FILES & UPLOAD FOLDERS
--------------------------------------------------------------------------- */

const uploadsBase = path.join(__dirname, "uploads");

// Create main uploads folder
if (!fs.existsSync(uploadsBase)) {
  fs.mkdirSync(uploadsBase, { recursive: true });
}

// Serve /uploads publicly
app.use("/uploads", express.static(uploadsBase));

/* --------------------------------------------------------------------------
   MULTER FILE UPLOAD SETUP (BEFORE/AFTER IMAGES)
--------------------------------------------------------------------------- */

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const folderName = file.fieldname === "beforePhoto" ? "before" : "after";
    const folderPath = path.join(uploadsBase, folderName);

    // Create folder if missing
    if (!fs.existsSync(folderPath)) {
      fs.mkdirSync(folderPath, { recursive: true });
    }

    cb(null, folderPath);
  },

  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, file.fieldname + "-" + uniqueSuffix + path.extname(file.originalname));
  }
});

const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith("image/")) cb(null, true);
  else cb(new Error("Only image files are allowed!"), false);
};

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
  fileFilter: fileFilter
});

// Middleware for both before/after photos
const photoUpload = upload.fields([
  { name: "beforePhoto", maxCount: 1 },
  { name: "afterPhoto", maxCount: 1 }
]);

/* --------------------------------------------------------------------------
   MONGODB CONNECTION 
--------------------------------------------------------------------------- */

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error("❌ ERROR: MONGODB_URI missing in environment variables");
  process.exit(1);
}

mongoose
  .connect(MONGODB_URI)
  .then(() => console.log("✅ MongoDB connected"))
  .catch((err) => {
    console.error("❌ MongoDB connection failed:", err);
    process.exit(1);
  });

/* --------------------------------------------------------------------------
   ROUTES
--------------------------------------------------------------------------- */

const residentRoutes = require("./routes/residents");
const documentRoutes = require("./routes/documents");

app.use("/api/residents", residentRoutes);
app.use("/api/documents", documentRoutes);

// Health check route
app.get("/api/health", (req, res) => {
  res.json({
    status: "OK",
    message: "Resident Registration API is running",
    timestamp: new Date().toISOString()
  });
});

/* --------------------------------------------------------------------------
   ERROR HANDLING
--------------------------------------------------------------------------- */

app.use((error, req, res, next) => {
  console.error("Error:", error.message);

  if (error instanceof multer.MulterError) {
    if (error.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({
        success: false,
        message: "Image too large. Max 5MB allowed."
      });
    }
  }

  res.status(500).json({
    success: false,
    message: error.message || "Internal server error"
  });
});

// Handle 404
app.use("*", (req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found"
  });
});

/* --------------------------------------------------------------------------
   SERVER LISTEN
--------------------------------------------------------------------------- */

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🌐 Health Check: http://localhost:${PORT}/api/health`);
});
