import { initializeApp } from 'https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js';
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js';
import { getFirestore, collection, addDoc, serverTimestamp, doc, getDoc, query, where, getDocs, updateDoc } from 'https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js';

const db = getFirestore(app);
document.addEventListener("DOMContentLoaded", () => {
  const firebaseConfig = {
    apiKey: "AIzaSyAcwEb6uhdOjneQ_xjxJsvr7sX-z-SQ3wU",
    authDomain: "padel-score-95999.firebaseapp.com",
    projectId: "padel-score-95999",
    storageBucket: "padel-score-95999.firebasestorage.app",
    messagingSenderId: "1051967038944",
    appId: "1:1051967038944:web:5b29f5014e5954b8217785",
    measurementId: "G-B9C6T62P9H"
  };

  const app = initializeApp(firebaseConfig);
  const auth = getAuth(app);
  const provider = new GoogleAuthProvider();

  const loginScreen = document.getElementById("loginScreen");
  const mainContent = document.getElementById("mainContent");
  const loginBtn = document.getElementById("googleLoginBtn");
  const logoutBtn = document.getElementById("logoutBtn");
  const adminSection = document.getElementById("adminSection");

  loginBtn?.addEventListener("click", async () => {
    try {
      await signInWithPopup(auth, provider);
    } catch(err) {
      alert("Error: "+err.message);
    }
  });

  logoutBtn?.addEventListener("click", async () => {
    await signOut(auth);
  });

  onAuthStateChanged(auth, async user => {
    if(user){
      loginScreen.style.display="none";
      mainContent.style.display="grid";
      const tokenResult = await user.getIdTokenResult();
      if(tokenResult.claims?.admin){
        adminSection.style.display="block";
      } else {
        adminSection.style.display="none";
      }
    } else {
      loginScreen.style.display="flex";
      mainContent.style.display="none";
    }
  });

// Aquí añade tu JS original de contador, toggle de tema, reloj, etc.

 
        
});