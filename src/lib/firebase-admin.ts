import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

if (!process.env.GOOGLE_CREDENTIALS_JSON) {
  throw new Error('GOOGLE_CREDENTIALS_JSON env var is not set');
}

// Test parsing and log project_id
try {
  const creds = JSON.parse(process.env.GOOGLE_CREDENTIALS_JSON!);
  console.log('✅ Service account loaded:', creds.project_id);
} catch (e) {
  console.error('❌ Failed to parse GOOGLE_CREDENTIALS_JSON:', e);
  throw e;
}

let serviceAccount;
try {
  serviceAccount = JSON.parse(process.env.GOOGLE_CREDENTIALS_JSON!);
} catch (e) {
  console.error('Failed to parse GOOGLE_CREDENTIALS_JSON:', e);
  throw e;
}

if (!getApps().length) {
  initializeApp({
    credential: cert(serviceAccount),
  });
}

export const db = getFirestore();