// ==================== FIREBASE CONFIGURATION (SEGURO) ====================

// Import Firebase SDK
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { 
  getAuth, 
  signInWithPopup, 
  GoogleAuthProvider
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

// Buscar configuração do backend (SEGURO!)
let firebaseApp = null;
let auth = null;
let googleProvider = null;

async function initializeFirebase() {
  try {
    // Determinar URL da API
    const isLocal = window.location.hostname === "localhost" || 
                    window.location.hostname === "127.0.0.1";
    
    const apiUrl = isLocal
      ? "http://localhost:8000"
      : "https://job-finder-tracker-production.up.railway.app";
    
    // Buscar config do backend
    const response = await fetch(`${apiUrl}/api/firebase-config`);
    
    if (!response.ok) {
      throw new Error('Erro ao buscar configuração do Firebase');
    }
    
    const firebaseConfig = await response.json();
    
    console.log('🔥 Firebase config carregada do backend!');
    
    // Inicializar Firebase
    firebaseApp = initializeApp(firebaseConfig);
    auth = getAuth(firebaseApp);
    googleProvider = new GoogleAuthProvider();
    
    return true;
  } catch (error) {
    console.error('❌ Erro ao inicializar Firebase:', error);
    return false;
  }
}

// Inicializar automaticamente
const firebaseReady = initializeFirebase();

// Export para uso em outros arquivos
export { auth, googleProvider, signInWithPopup, firebaseReady };