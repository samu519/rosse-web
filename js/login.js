const next = safeNext(new URLSearchParams(location.search).get('next'));
function mode(register) {
  $('loginForm').hidden=register; $('registerForm').hidden=!register;
  $('loginTab').setAttribute('aria-pressed',String(!register));
  $('registerTab').setAttribute('aria-pressed',String(register)); setStatus();
}
$('loginTab').onclick=()=>mode(false); $('registerTab').onclick=()=>mode(true);
for(const id of ['loginForm','registerForm']) {
  const form=$(id);
  form.onsubmit=e=>{e.preventDefault(); action(form.querySelector('button[type=submit],button.primary'),async()=>{
    const data=Object.fromEntries(new FormData(form));
    if(id==='registerForm') { if(data.password!==data.confirmacion)throw Error('Las contraseñas no coinciden.'); delete data.confirmacion; await Rossé.register(data); }
    else await Rossé.login(data.correo,data.password);
    form.reset(); location.replace(next);
  });};
}
(async()=>{try{await Rossé.session();location.replace(next);}catch(e){$('content').hidden=false;setStatus(isUnauth(e)?'':e.message);}})();
