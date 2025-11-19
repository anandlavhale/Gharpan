const admin = require("firebase-admin");
require("dotenv").config();
const path = require("path");

let serviceAccount;

// Try to load from environment variables first (Render/Production)
if (process.env.FIREBASE_PRIVATE_KEY) {
  console.log("📌 Loading Firebase credentials from environment variables");
  
  const formattedPrivateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");
  
  if (!formattedPrivateKey) {
    console.error("❌ Firebase ERROR: PRIVATE KEY missing or malformed");
    process.exit(1);
  }

  serviceAccount = {
    project_id: process.env.FIREBASE_PROJECT_ID,
    client_email: process.env.FIREBASE_CLIENT_EMAIL,
    private_key: formattedPrivateKey,
    client_id: process.env.FIREBASE_CLIENT_ID,
    private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
    auth_uri: process.env.FIREBASE_AUTH_URI,
    token_uri: process.env.FIREBASE_TOKEN_URI,
    auth_provider_x509_cert_url: process.env.FIREBASE_AUTH_PROVIDER_X509_CERT_URL,
    client_x509_cert_url: process.env.FIREBASE_CLIENT_X509_CERT_URL,
    universe_domain: "googleapis.com"
  };
} else {
  // Fallback to file (Local Development)
  console.log("📌 Loading Firebase credentials from file");
  
  try {
    serviceAccount = require("./firebaseaccountjson.json");
  } catch (err) {
    console.error("❌ Firebase ERROR: Could not load service account file or environment variables");
    console.error("   Make sure either:");
    console.error("   1. firebaseaccountjson.json exists in the backend folder, OR");
    console.error("   2. Environment variables are set (FIREBASE_PRIVATE_KEY, etc.)");
    process.exit(1);
  }
}

// Validate required fields
if (!serviceAccount.project_id || !serviceAccount.private_key || !serviceAccount.client_email) {
  console.error("❌ Firebase ERROR: Missing required credentials (project_id, private_key, or client_email)");
  process.exit(1);
}

try {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    storageBucket: process.env.FIREBASE_BUCKET || "gharpan-doc.appspot.com"
  });

  console.log("✅ Firebase Admin initialized successfully");
} catch (err) {
  console.error("❌ Firebase initialization FAILED:", err.message);
  process.exit(1);
}

const db = admin.firestore();
const storage = admin.storage();

module.exports = {
  admin,
  db,
  storage,
  bucket: storage.bucket()
};