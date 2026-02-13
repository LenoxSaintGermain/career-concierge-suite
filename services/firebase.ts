import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyBwnynX4I8IlUeIwBwuD3Es13qKZzXnPKM",
  authDomain: "third-signal.firebaseapp.com",
  projectId: "third-signal",
  storageBucket: "third-signal.firebasestorage.app",
  messagingSenderId: "414737114778",
  appId: "1:414737114778:web:f153265c99fc032d23e123",
  measurementId: "G-48VFJ7B95W"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const auth = getAuth(app);

// Initialize Firestore with the named database 'signal-atlas'
const db = getFirestore(app, "signal-atlas");

export { app, analytics, auth, db };
