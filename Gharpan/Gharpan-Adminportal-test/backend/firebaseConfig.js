const admin = require("firebase-admin");
require("dotenv").config();

const formattedPrivateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");

if (!formattedPrivateKey) {
  console.error("❌ PRIVATE KEY missing or malformed");
  process.exit(1);
}

try {
  admin.initializeApp({
    credential: admin.credential.cert({
      project_id: process.env.FIREBASE_PROJECT_ID,
      client_email: process.env.FIREBASE_CLIENT_EMAIL,
      private_key: formattedPrivateKey,
    }),
    storageBucket: process.env.FIREBASE_BUCKET,
  });

  console.log("🔥 Firebase Admin initialized successfully");
} catch (err) {
  console.error("❌ Firebase initialization FAILED:", err);
  process.exit(1);
}

module.exports = {
  bucket: admin.storage().bucket(),
};
