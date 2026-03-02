import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const env = (import.meta as any).env ?? {};

const firebaseConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY || "AIzaSyBwnynX4I8IlUeIwBwuD3Es13qKZzXnPKM",
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN || "third-signal.firebaseapp.com",
  projectId: env.VITE_FIREBASE_PROJECT_ID || "third-signal",
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET || "third-signal.firebasestorage.app",
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID || "414737114778",
  appId: env.VITE_FIREBASE_APP_ID || "1:414737114778:web:f153265c99fc032d23e123",
  measurementId: env.VITE_FIREBASE_MEASUREMENT_ID || "G-48VFJ7B95W"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// Keep database selection environment-driven so Atlas and Concierge can run side-by-side.
const databaseId = (env.VITE_FIREBASE_DATABASE_ID as string | undefined) || "career-concierge";
const db = getFirestore(app, databaseId);

export { app, auth, db };
