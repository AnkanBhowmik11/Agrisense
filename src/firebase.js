import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signInWithCredential, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged, updateProfile, updatePassword } from 'firebase/auth';
import { getFirestore, doc, setDoc, getDoc, updateDoc, deleteDoc, collection, getDocs } from 'firebase/firestore';

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCPkdfYkP9NcN25gnIys6qsvGxjNt4STww",
  authDomain: "agrisense-33df5.firebaseapp.com",
  projectId: "agrisense-33df5",
  storageBucket: "agrisense-33df5.firebasestorage.app",
  messagingSenderId: "780397312104",
  appId: "1:780397312104:web:6c96e62ed69c6aea4863dd",
  measurementId: "G-YSGDDXSP6R"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();
const db = getFirestore(app);

export { 
  app, 
  auth, 
  db,
  doc,
  setDoc,
  getDoc,
  updateDoc,
  deleteDoc,
  collection,
  getDocs,
  googleProvider,
  GoogleAuthProvider,
  signInWithPopup, 
  signInWithCredential,
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  updateProfile,
  updatePassword
};
