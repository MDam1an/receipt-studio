// ═══════════════════════════════════════
// firebase.js — Firebase Config & Service
// ═══════════════════════════════════════
// ⚠️  CONFIGURE SUAS CREDENCIAIS ABAIXO
// Acesse: console.firebase.google.com
// Crie um projeto → Web → Copie o firebaseConfig
// ═══════════════════════════════════════

import { initializeApp }                   from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js';
import { getAuth, createUserWithEmailAndPassword,
         signInWithEmailAndPassword, signOut,
         onAuthStateChanged }               from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js';
import { getFirestore, collection, doc,
         getDocs, setDoc, deleteDoc,
         query, orderBy, where }            from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';

// ════════════════════════════════════════
// 🔧 SUBSTITUA COM SUAS CREDENCIAIS:
const firebaseConfig = {
  apiKey: "AIzaSyAo8-XpHppKq1ilZyIfsF43TcwHr05JtOU",
  authDomain: "receipt-studio-62b2c.firebaseapp.com",
  projectId: "receipt-studio-62b2c",
  storageBucket: "receipt-studio-62b2c.firebasestorage.app",
  messagingSenderId: "718103489933",
  appId: "1:718103489933:web:24d0b546f8f8280fb7a1c4",
  measurementId: "G-9X4ZDRFT5J"
};
// ════════════════════════════════════════

const app  = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db   = getFirestore(app);

// ── AUTH ──────────────────────────────

export function onAuth(cb) {
  return onAuthStateChanged(auth, cb);
}

export async function login(email, password) {
  return signInWithEmailAndPassword(auth, email, password);
}

export async function register(email, password) {
  return createUserWithEmailAndPassword(auth, email, password);
}

export async function logout() {
  return signOut(auth);
}

export function currentUser() {
  return auth.currentUser;
}

// ── HELPERS ───────────────────────────

function uid() { return auth.currentUser?.uid; }

function receiptsCol()  { return collection(db, 'users', uid(), 'receipts'); }
function brandsCol()    { return collection(db, 'users', uid(), 'brands'); }

// ── RECEIPTS ──────────────────────────

export async function getReceipts(brandFilter = '') {
  let q = query(receiptsCol(), orderBy('createdAt', 'desc'));
  if (brandFilter) {
    q = query(receiptsCol(), where('brandName', '==', brandFilter), orderBy('createdAt', 'desc'));
  }
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function upsertReceipt(receipt) {
  const ref = doc(receiptsCol(), receipt.id);
  await setDoc(ref, { ...receipt, updatedAt: new Date().toISOString() }, { merge: true });
}

export async function deleteReceipt(id) {
  await deleteDoc(doc(receiptsCol(), id));
}

// ── BRANDS ────────────────────────────

export async function getBrands() {
  const snap = await getDocs(brandsCol());
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function upsertBrand(brand) {
  const ref = doc(brandsCol(), brand.id);
  await setDoc(ref, brand, { merge: true });
}

export async function deleteBrand(id) {
  await deleteDoc(doc(brandsCol(), id));
}

// ── COUNTER ───────────────────────────

export async function nextReceiptNumber(brandName) {
  const snap = await getDocs(receiptsCol());
  const prefix = (brandName || 'REC').toUpperCase().replace(/\s/g, '').slice(0, 3);
  const nums = snap.docs
    .map(d => d.data().number || '')
    .filter(n => n.startsWith(prefix + '-'))
    .map(n => parseInt(n.split('-').pop(), 10) || 0);
  const next = (Math.max(0, ...nums) + 1).toString().padStart(4, '0');
  return `${prefix}-${next}`;
}
