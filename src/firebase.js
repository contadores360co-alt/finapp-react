// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBeR5WVWrNAomeM4aIH9pixge9A-OVKMh4",
  authDomain: "mis-finanzas-91f04.firebaseapp.com",
  projectId: "mis-finanzas-91f04",
  storageBucket: "mis-finanzas-91f04.appspot.com",
  messagingSenderId: "338242555535",
  appId: "1:338242555535:web:d48180e9536d22779d6afa",
  measurementId: "G-8677VWN3XE"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Authentication and get a reference to the service
export const auth = getAuth(app);

// Initialize Cloud Firestore and get a reference to the service
export const db = getFirestore(app);
