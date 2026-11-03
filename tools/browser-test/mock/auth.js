export function getAuth(){ return {}; }
export async function signInAnonymously(){ return { user:{uid:'u1'} }; }
export function onAuthStateChanged(a, cb){ setTimeout(()=>cb({uid:'u1'}),10); return ()=>{}; }
