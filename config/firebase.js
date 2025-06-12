const admin = require('firebase-admin');
const serviceAccount = require('./yt-tutorial-3fe8e-firebase-adminsdk-fbsvc-f4a519ae42.json');

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