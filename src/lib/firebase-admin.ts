import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import serviceAccount from '../../studybase.json';

// Initialize Firebase Admin if not already initialized
if (!getApps().length) {
  initializeApp({
    credential: cert(serviceAccount as any),
  });
}

// Initialize Firestore
const db = getFirestore();

export { db }; 