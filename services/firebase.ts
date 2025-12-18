import { initializeApp } from "firebase/app";
// @ts-ignore
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { initializeFirestore } from "firebase/firestore";

// Configuration from user request
const firebaseConfig = {
  apiKey: "AIzaSyDKDitgrkTrP_R1YmDsR4UQdEwH3GcLJ8k",
  authDomain: "sealswimming1.firebaseapp.com",
  projectId: "sealswimming1",
  storageBucket: "sealswimming1.firebasestorage.app",
  messagingSenderId: "57991513256",
  appId: "1:57991513256:web:a8145bfb3f1fb9b0842e9d",
  measurementId: "G-HMTE1T0FH4"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

// Initialize Firestore with experimentalForceLongPolling to resolve "Backend didn't respond within 10 seconds"
export const db = initializeFirestore(app, {
  experimentalForceLongPolling: true,
});

export const googleProvider = new GoogleAuthProvider();