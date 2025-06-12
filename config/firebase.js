const admin = require('firebase-admin');

const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);

// ✅ Prevent re-initialization
if (!admin.apps.length) {
  console.log('Firebase NOT initialized yet. Initializing now...');
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
} else {
  console.log('Firebase already initialized.');
}

module.exports = admin;