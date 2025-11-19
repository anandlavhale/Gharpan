const admin = require("firebase-admin");
require("dotenv").config();

/**
 * Fix newline issue in private key from environment variables
 */
const formattedPrivateKey = process.env.FIREBASE_PRIVATE_KEY
  ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n")
  : null;

if (!formattedPrivateKey) {
  console.error("❌ Firebase ERROR: PRIVATE KEY is missing or malformed.");
  process.exit(1);
}

/**
 * Build Firebase service account object from environment variables
 */
const serviceAccount = {
  type: process.env.FIREBASE_TYPE,
  project_id: process.env.FIREBASE_PROJECT_ID,
  private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
  private_key: formattedPrivateKey,
  client_email: process.env.FIREBASE_CLIENT_EMAIL,
  client_id: process.env.FIREBASE_CLIENT_ID,
  auth_uri: process.env.FIREBASE_AUTH_URI,
  token_uri: process.env.FIREBASE_TOKEN_URI,
  auth_provider_x509_cert_url: process.env.FIREBASE_AUTH_PROVIDER_CERT_URL,
  client_x509_cert_url: process.env.FIREBASE_CLIENT_CERT_URL,
  universe_domain: process.env.FIREBASE_UNIVERSE_DOMAIN,
};

/**
 * Debug - Check if key length is valid (should be > 1000 characters)
 */
if (!serviceAccount.private_key || serviceAccount.private_key.length < 500) {
  console.error("❌ Firebase ERROR: Private key seems too short. Something is wrong.");
  console.error("Key preview:", serviceAccount.private_key.slice(0, 100)); // remove after testing
  process.exit(1);
}

/**
 * Initialize Firebase Admin
 */
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
