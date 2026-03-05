import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const env = (import.meta as any).env ?? {};

const firebaseConfig = {
  // Default to the canonical Career Concierge production project.
  // Env vars still override these values for local/staging variants.
  apiKey: env.VITE_FIREBASE_API_KEY || "AIzaSyBy0X4uTY9fa1FDqzzc-AMCTownXAo_ljA",
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN || "ssai-f6191.firebaseapp.com",
  projectId: env.VITE_FIREBASE_PROJECT_ID || "ssai-f6191",
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET || "ssai-f6191.firebasestorage.app",
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID || "480846059254",
  appId: env.VITE_FIREBASE_APP_ID || "1:480846059254:web:6e62fc367e14d79acdbed7",
  measurementId: env.VITE_FIREBASE_MEASUREMENT_ID || "G-966CRT4YNB"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// Keep database selection environment-driven so Atlas and Concierge can run side-by-side.
const databaseId = (env.VITE_FIREBASE_DATABASE_ID as string | undefined) || "career-concierge";
const db = getFirestore(app, databaseId);

export { app, auth, db };
