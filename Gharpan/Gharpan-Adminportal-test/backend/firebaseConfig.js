const admin = require("firebase-admin");
const path = require("path");
const fs = require("fs");

// Resolve the JSON file path properly (works on local + Render)
const serviceAccountPath = path.join(__dirname, "firebaseaccount.json");

// Safety check: verify JSON file exists
if (!fs.existsSync(serviceAccountPath)) {
  console.error("❌ ERROR: firebaseaccount.json not found at:", serviceAccountPath);
  process.exit(1);
}

const serviceAccount = require(serviceAccountPath);

// Only bucket comes from env
if (!process.env.FIREBASE_BUCKET) {
  console.error("❌ ERROR: FIREBASE_BUCKET is missing in environment variables");
  process.exit(1);
}

try {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    storageBucket: process.env.FIREBASE_BUCKET,
  });

  console.log("🔥 Firebase Admin initialized successfully");
} catch (err) {
  console.error("❌ Firebase initialization FAILED:", err);
  process.exit(1);
}

const bucket = admin.storage().bucket();

module.exports = { bucket };
