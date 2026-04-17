import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, onAuthStateChanged, User, signOut } from 'firebase/auth';
import { 
  getFirestore, 
  doc, 
  setDoc, 
  collection, 
  onSnapshot, 
  Timestamp,
  getDocFromServer
} from 'firebase/firestore';

// Import the Firebase configuration
import firebaseConfig from '../firebase-applet-config.json';

// Initialize Firebase SDK
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

export const signInWithGoogle = () => signInWithPopup(auth, googleProvider);
export const logOut = () => signOut(auth);

export { OperationType, handleFirestoreError } from './utils/firestoreErrorHandler';
export type { FirestoreErrorInfo } from './utils/firestoreErrorHandler';

/**
 * Tests the connection to Firestore.
 */
export async function testConnection() {
  try {
    // Attempt a secure read to verify connectivity and project config
    await getDocFromServer(doc(db, 'system', 'ping'));
  } catch (error: any) {
    if (error?.message?.includes('the client is offline')) {
      console.warn("Firestore connectivity check failed: client is offline or configuration is incorrect.");
    }
  }
}

// Initial connection test
testConnection();
