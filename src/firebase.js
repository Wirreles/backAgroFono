require("dotenv").config();
const { initializeApp, applicationDefault, credential } = require("firebase-admin/app");
const admin = require("firebase-admin")
const { getFirestore } = require("firebase-admin/firestore");
// const { readFileSync } = require('fs'); 
// LOCALHOST
const googleCredentials = require('../barcolombian-fdb31-cd3c85bf61bc.json');  
initializeApp({
  credential: admin.credential.cert(googleCredentials),
});

// ARCHIVO SECRETO RENDER
// const serviceAccount = JSON.parse(readFileSync('/etc/secrets/pencuentro.json', 'utf-8'));  
// Inicializar Firebase Admin SDK
// initializeApp({
//   credential: admin.credential.cert(serviceAccount)
// });
 


const db = getFirestore();

module.exports = {
  db,
};
