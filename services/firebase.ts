import { initializeApp } from "firebase/app";
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
const auth = getAuth(app);

// Keep database selection environment-driven so Atlas and Concierge can run side-by-side.
const databaseId = ((import.meta as any).env?.VITE_FIREBASE_DATABASE_ID as string | undefined) || "career-concierge";
const db = getFirestore(app, databaseId);

export { app, auth, db };
