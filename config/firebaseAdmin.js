const {
  applicationDefault,
  getApp,
  getApps,
  initializeApp,
} = require("firebase-admin/app");
const { getAuth } = require("firebase-admin/auth");

const firebaseApp = getApps().length
  ? getApp()
  : initializeApp({
      credential: applicationDefault(),
    });

const firebaseAuth = getAuth(firebaseApp);

module.exports = {
  firebaseApp,
  firebaseAuth,
};
