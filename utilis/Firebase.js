import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth"; // Import Firebase Auth
import { getStorage } from "firebase/storage";
// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBlYi4ZXDUw-6C7AAy4afYP0yt612BW24Q",
  authDomain: "treadtracker-290b8.firebaseapp.com",
  projectId: "treadtracker-290b8",
  storageBucket: "treadtracker-290b8.firebasestorage.app",
  messagingSenderId: "1036884014457",
  appId: "1:1036884014457:web:cb9f86418b8173868baba8"
  
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app); // Initialize Firebase Auth
const storage = getStorage(app);

export { db, auth, storage }; // Export auth along with db
