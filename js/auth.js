// Shared navigation and session helpers. API remains authoritative.
const $ = id => document.getElementById(id);
const accountRoutes = new Set(['/mi-cuenta.html','/mis-momentos.html','/mi-perfil.html']);
function safeNext(value) { return accountRoutes.has(value) ? value : '/mi-cuenta.html'; }
function currentRoute() { return safeNext(location.pathname.endsWith('.html') ? location.pathname : location.pathname + '.html'); }
function goLogin() { location.replace('/login.html?next=' + encodeURIComponent(currentRoute())); }
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
