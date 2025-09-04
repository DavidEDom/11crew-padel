// setAdmin.js
const admin = require("firebase-admin");

// Inicializa con tu clave de servicio
const serviceAccount = require("./serviceAccountKey.json");
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

// UID del usuario que quieres hacer admin
const uid = "vZ8tqgqEnzVSZ3bU1TbYehRffPb2"; // lo obtienes del usuario Google

admin.auth().setCustomUserClaims(uid, { admin: true })
  .then(() => {
    console.log("Usuario ahora es admin ✅");
    process.exit(0);
  })
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
