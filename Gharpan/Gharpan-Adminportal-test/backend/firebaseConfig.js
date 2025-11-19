const admin = require("firebase-admin");
require("dotenv").config();

// --------------------------------------
// 1️⃣  Prefer Base64 (best for Render)
// --------------------------------------
let serviceAccount;

if (process.env.FIREBASE_SERVICE_ACCOUNT_BASE64) {
  console.log("📌 Loading Firebase credentials from BASE64");

  try {
    const decoded = Buffer.from(
      process.env.FIREBASE_SERVICE_ACCOUNT_BASE64,
      "base64"
    ).toString("utf8");

    serviceAccount = JSON.parse(decoded);
  } catch (err) {
    console.error("❌ ERROR decoding BASE64 Firebase JSON:", err);
    process.exit(1);
  }

// --------------------------------------
// 2️⃣  Fallback to PRIVATE KEY variables
// --------------------------------------
} else if (process.env.FIREBASE_PRIVATE_KEY) {
  console.log("📌 Loading Firebase credentials from environment variables");

  const formattedPrivateKey = process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n");

  serviceAccount = {
    project_id: process.env.FIREBASE_PROJECT_ID,
    private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
    private_key: formattedPrivateKey,
    client_email: process.env.FIREBASE_CLIENT_EMAIL,
    client_id: process.env.FIREBASE_CLIENT_ID,
    auth_uri: process.env.FIREBASE_AUTH_URI,
    token_uri: process.env.FIREBASE_TOKEN_URI,
    auth_provider_x509_cert_url: process.env.FIREBASE_AUTH_PROVIDER_X509_CERT_URL,
    client_x509_cert_url: process.env.FIREBASE_CLIENT_X509_CERT_URL,
    universe_domain: "googleapis.com"
  };

// --------------------------------------
// 3️⃣  Local development fallback
// --------------------------------------
} else {
  console.log("📌 Loading Firebase credentials from local file");
  serviceAccount = require("./firebaseaccountjson.json");
}

// --------------------------------------
// 4️⃣ Validate and initialize Firebase
// --------------------------------------
if (!serviceAccount.private_key || !serviceAccount.client_email) {
  console.error("❌ Firebase credentials are incomplete!");
  process.exit(1);
}

try {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    storageBucket: process.env.FIREBASE_BUCKET
  });
  console.log("✅ Firebase Admin initialized");
} catch (err) {
  console.error("❌ Firebase initialization FAILED:", err.message);
  process.exit(1);
}

module.exports = {
  admin,
  db: admin.firestore(),
  storage: admin.storage(),
  bucket: admin.storage().bucket()
};
