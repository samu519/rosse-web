// Shared navigation and session helpers. API remains authoritative.
const $ = id => document.getElementById(id);
const accountRoutes = new Set(['/login/mi-cuenta','/login/mis-momentos','/login/mi-perfil']);
function safeNext(value) { return accountRoutes.has(value) ? value : '/login/mi-cuenta'; }
function currentRoute() { return safeNext(location.pathname.replace(/\.html$/, '')); }
function goLogin() { location.replace('/login/login?next=' + encodeURIComponent(currentRoute())); }
function setStatus(text='') { $('status').textContent = text; }
function isUnauth(error) { return error.message === 'Inicia sesión'; }
async function protect() {
  try {
    const {usuario} = await Rossé.session();
    $('content').hidden = false; $('logout').hidden = false; setStatus();
    $('logout').onclick = async () => {
      $('logout').disabled = true;
      try { await Rossé.logout(); goLogin(); }
      catch(e) { setStatus(e.message); $('logout').disabled = false; }
    };
    return usuario;
  } catch(e) {
    if(isUnauth(e)) goLogin(); else setStatus(e.message + ' · Recarga para reintentar.');
    return null;
  }
}
async function action(button, fn) {
  if(button.disabled) return;
  button.disabled = true; setStatus();
  try { await fn(); } catch(e) { if(isUnauth(e)) goLogin(); else setStatus(e.message); }
  finally { button.disabled = false; }
}
function el(tag, cls, text) { const n=document.createElement(tag); if(cls)n.className=cls; if(text!==undefined)n.textContent=text; return n; }
// Revalidate protected pages restored from browser history.
window.addEventListener('pageshow', e => { if(e.persisted && $('logout')) { $('content').hidden=true; location.reload(); } });
