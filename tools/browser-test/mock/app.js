/* 具名 app：index.html 會用 initializeApp(cfg, 'admin') 開第二個，登入狀態要跟學生那個分開 */
export function initializeApp(cfg, name){ return { name: name || '[DEFAULT]', options: cfg || {} }; }
