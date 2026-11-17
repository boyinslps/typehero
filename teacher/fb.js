/* 教師頁的 Firebase。
   設定「照抄」index.html 而不是抽成共用檔：學生端的 index.html 是單檔，多一個要先載入的檔案，
   就多一個開學第一堂課會載不到的風險。代價是兩邊要一起改；tools/browser-test/t1.test.js 有比對兩邊相同。
   具名 app 'admin'：跟學生機的匿名登入分開存，老師登入不會影響到學生機（SPEC §1.4）。 */
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import { getAuth, onAuthStateChanged, setPersistence, signInWithEmailAndPassword, signOut,
         browserLocalPersistence, browserSessionPersistence } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";
import { getFirestore, collection, doc, getDoc, getDocs, setDoc, updateDoc, deleteDoc, query, where, orderBy, limit,
         writeBatch, serverTimestamp, getCountFromServer, documentId, arrayUnion, arrayRemove, deleteField, increment }
  from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

export const firebaseConfig = {
  apiKey: "AIzaSyDGmJcE6A_gLVcMbmuCQTZ4Ny5eGKQ6bsw",
  authDomain: "school-4c9bf.firebaseapp.com",
  projectId: "school-4c9bf",
  storageBucket: "school-4c9bf.firebasestorage.app",
  messagingSenderId: "726465099395",
  appId: "1:726465099395:web:2143179e6fd8a919050db6"
};

export const app = initializeApp(firebaseConfig, 'admin');
export const auth = getAuth(app);
export const db = getFirestore(app);

export { onAuthStateChanged, setPersistence, signInWithEmailAndPassword, signOut, browserLocalPersistence, browserSessionPersistence,
         collection, doc, getDoc, getDocs, setDoc, updateDoc, deleteDoc, query, where, orderBy, limit,
         writeBatch, serverTimestamp, getCountFromServer, documentId, arrayUnion, arrayRemove, deleteField, increment };

/* 一批最多 500 個寫入；留一點空間。回傳要寫的 op 分成幾批 */
export const BATCH_MAX = 400;
export async function commitAll(ops) {
  for (let i = 0; i < ops.length; i += BATCH_MAX) {
    const b = writeBatch(db);
    ops.slice(i, i + BATCH_MAX).forEach(f => f(b));
    await b.commit();
  }
}
