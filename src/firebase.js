import { initializeApp } from "firebase/app";
import { getAuth, setPersistence, browserLocalPersistence } from "firebase/auth";
import { initializeFirestore } from "firebase/firestore"; 

// Firebase configuration with fallback values to prevent undefined errors
const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY || "AIzaSyBu4Ihw8kgCm6NYeg2CQoy3wBdnAwTv7WM",
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN || "kamikoto-shop.firebaseapp.com",
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID || "kamikoto-shop",
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET || "kamikoto-shop.firebasestorage.app",
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID || "90397336474",
  appId: process.env.REACT_APP_FIREBASE_APP_ID || "1:90397336474:web:61a089a41455b01b2fd023",
};

// Log configuration status for debugging
console.log('Firebase Configuration Status:', {
  apiKey: firebaseConfig.apiKey ? 'Configured' : 'Missing',
  authDomain: firebaseConfig.authDomain ? 'Configured' : 'Missing',
  projectId: firebaseConfig.projectId ? 'Configured' : 'Missing',
  storageBucket: firebaseConfig.storageBucket ? 'Configured' : 'Missing',
  messagingSenderId: firebaseConfig.messagingSenderId ? 'Configured' : 'Missing',
  appId: firebaseConfig.appId ? 'Configured' : 'Missing',
});

// Initialize Firebase app with error handling
let app, auth, db;

try {
  app = initializeApp(firebaseConfig);
  console.log('Firebase app initialized successfully');
  
  auth = getAuth(app);
  console.log('Firebase auth initialized successfully');

  // Initialize Firestore with experimentalForceLongPolling to fix WebChannel connection issues
  // This helps prevent 400 Bad Request errors when writing to Firestore
  db = initializeFirestore(app, {
    experimentalForceLongPolling: true,
    useFetchStreams: false
  }); 
  console.log('Firestore initialized successfully');

  // Set auth persistence with error handling
  setPersistence(auth, browserLocalPersistence)
    .then(() => {
      console.log('Firebase auth persistence set successfully');
    })
    .catch((error) => {
      console.error("Error setting Firebase auth persistence:", error);
    });

} catch (error) {
  console.error("Error initializing Firebase:", error);
  // Create mock objects to prevent undefined errors
  auth = {
    currentUser: null,
    onAuthStateChanged: () => () => {},
    signInWithEmailAndPassword: () => Promise.reject(new Error('Firebase not initialized')),
    signOut: () => Promise.reject(new Error('Firebase not initialized'))
  };
  
  db = {
    collection: () => ({
      doc: () => ({
        get: () => Promise.reject(new Error('Firebase not initialized')),
        set: () => Promise.reject(new Error('Firebase not initialized')),
        update: () => Promise.reject(new Error('Firebase not initialized'))
      })
    })
  };
}

export { auth, db }; 