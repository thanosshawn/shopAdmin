import { initializeApp } from "firebase/app";
import { getAuth, setPersistence, browserLocalPersistence } from "firebase/auth";
import { initializeFirestore } from "firebase/firestore"; 

const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.REACT_APP_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// Initialize Firestore with experimentalForceLongPolling to fix WebChannel connection issues
// This helps prevent 400 Bad Request errors when writing to Firestore
const db = initializeFirestore(app, {
  experimentalForceLongPolling: true,
  useFetchStreams: false
}); 

setPersistence(auth, browserLocalPersistence)
  .then(() => {
    // Persistence successfully set
  })
  .catch((error) => {
    console.error("Error setting persistence:", error);
  });

export { auth, db }; 