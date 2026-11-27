// Rossé auth v2 — uses existing HTML, CSS, auth.js and rosse-api.js.
const next = safeNext(new URLSearchParams(location.search).get('next'));
const login=$('loginForm'), registration=$('registerForm'), tabs=$('loginTab').parentElement;
let challenge=null, kind='login', config=null, widget=null, busy=false;
const host=login.parentElement;
function newForm(id,html){const f=document.createElement('form');f.id=id;f.hidden=true;f.innerHTML=html;host.append(f);return f;}
const recovery=newForm('recoveryForm',`<p class="kicker">TU SEGURIDAD</p><h2>Volvamos a conectar.</h2><p>Si tu correo está registrado, recibirás un código para recuperar tu contraseña.</p><label>Correo electrónico<input name="correo" type="email" autocomplete="email" required></label><button class="primary wide" type="submit">Enviar código</button><button class="link" type="button" data-back>Volver a ingresar</button>`);
const verification=newForm('verificationForm',`<p class="kicker">UN ÚLTIMO PASO</p><h2 id="codeTitle">Revisa tu correo.</h2><p id="codeDescription"></p><label>Código de seis dígitos<input name="codigo" type="text" inputmode="numeric" autocomplete="one-time-code" pattern="[0-9]{6}" maxlength="6" placeholder="000000" required style="font-size:1.6rem;letter-spacing:.45em;text-align:center"></label><div id="newPasswords" hidden><label>Nueva contraseña<input name="password" type="password" autocomplete="new-password" minlength="15"></label><label>Confirma tu contraseña<input name="confirmacion" type="password" autocomplete="new-password" minlength="15"></label></div><button class="primary wide" type="submit" id="verifyButton">Verificar mi cuenta</button><p class="muted">El código vence en 10 minutos. Si no llega, revisa el correo no deseado.</p><button class="link" type="button" id="restartCode">Solicitar otro código</button><button class="link" type="button" data-back>Volver a ingresar</button>`);
const oldNotice=login.querySelector('.muted');if(oldNotice){oldNotice.replaceChildren();const b=document.createElement('button');b.type='button';b.className='link';b.textContent='¿Olvidaste tu contraseña?';b.onclick=()=>show('recover');oldNotice.append(b);}
const regNote=registration.querySelector('.muted');
const captchaBox=document.createElement('div');captchaBox.style.margin='12px 0';captchaBox.hidden=true;tabs.after(captchaBox);
function show(mode, message='') {
  kind=mode;
  login.hidden=mode!=='login';registration.hidden=mode!=='register';recovery.hidden=mode!=='recover';verification.hidden=!['verify','reset'].includes(mode);
  tabs.hidden=['verify','reset','recover'].includes(mode);
  $('loginTab').setAttribute('aria-pressed',String(mode==='login'));$('registerTab').setAttribute('aria-pressed',String(mode==='register'));
  captchaBox.hidden=!config?.publico||!['login','register','recover'].includes(mode);
  if(widget!==null && !captchaBox.hidden)window.turnstile.reset(widget);
  setStatus(message);
}
function begin(result,mode,correo){
  challenge={reto:result.reto,source:mode,correo};verification.reset();
  const reset=mode==='recover';$('newPasswords').hidden=!reset;
  for(const n of verification.querySelectorAll('#newPasswords input')){n.required=reset;n.disabled=!reset;}
  $('codeTitle').textContent=reset?'Crea una nueva contraseña.':'Revisa tu correo.';
  $('codeDescription').textContent=reset?'Si existe una cuenta con ese correo, recibirás un código. Escríbelo y elige una nueva contraseña.':`Enviamos un código a ${correo}. Confirma tu correo para continuar.`;
  $('verifyButton').textContent=reset?'Guardar nueva contraseña':'Verificar mi cuenta';
  show(reset?'reset':'verify');verification.elements.codigo.focus();
}
function restart(){const prev=challenge;challenge=null;verification.reset();if(prev){const f=prev.source==='register'?registration:prev.source==='recover'?recovery:login;f.elements.correo.value=prev.correo;show(prev.source,'Completa el formulario para solicitar un nuevo código.');}else show('login');}
$('restartCode').onclick=()=>{if(!busy)restart();};for(const b of host.querySelectorAll('[data-back]'))b.onclick=()=>{if(!busy){challenge=null;verification.reset();show('login');}};
$('loginTab').onclick=()=>{if(!busy)show('login');};$('registerTab').onclick=()=>{if(!busy)show('register');};
function antiBot(){if(!config?.publico)return undefined;const token=widget===null?'':window.turnstile.getResponse(widget);if(!token)throw Error('Completa la comprobación de seguridad.');return token;}
async function run(form,fn){if(busy)return;busy=true;const buttons=Array.from(host.querySelectorAll('button'));buttons.forEach(b=>b.disabled=true);setStatus();try{await fn();}catch(e){setStatus(e.message||'No se pudo conectar. Intenta nuevamente.');if(widget!==null&&!captchaBox.hidden)window.turnstile.reset(widget);}finally{busy=false;buttons.forEach(b=>b.disabled=false);}}
for(const [form,mode,path] of [[login,'login','/auth/login'],[registration,'register','/auth/registro'],[recovery,'recover','/auth/recuperar']]){
  form.onsubmit=e=>{e.preventDefault();run(form,async()=>{const d=Object.fromEntries(new FormData(form));if(mode==='register'&&d.password!==d.confirmacion)throw Error('Las contraseñas no coinciden.');delete d.confirmacion;d.turnstile=antiBot();const result=await rosseRequest(path,'POST',d);if(result.verificacion_requerida&&result.reto){const correo=d.correo;form.reset();begin(result,mode,correo);}else if(result.usuario){form.reset();location.replace(next);}else throw Error('Respuesta inesperada del servidor.');});};
}
verification.onsubmit=e=>{e.preventDefault();run(verification,async()=>{if(!challenge)throw Error('Solicita un nuevo código.');const d=Object.fromEntries(new FormData(verification));const reset=kind==='reset';if(reset&&d.password!==d.confirmacion)throw Error('Las contraseñas no coinciden.');const result=await rosseRequest(reset?'/auth/restablecer':'/auth/verificar','POST',{reto:challenge.reto,codigo:d.codigo,...(reset?{password:d.password}:{})});challenge=null;verification.reset();if(reset){login.elements.correo.value='';show('login','Contraseña actualizada. Inicia sesión con tu nueva contraseña.');}else if(result.usuario)location.replace(next);else throw Error('Respuesta inesperada del servidor.');});};

async function loadCaptcha() {
  if (!config.publico) return;

  if (!config.sitekey) {
    throw Error('Registro temporalmente no disponible.');
  }

  await new Promise((resolve, reject) => {
    const s = document.createElement('script');

    const timer = setTimeout(() => {
      reject(Error('La comprobación de seguridad tardó demasiado.'));
    }, 20000);

    window.onRosseTurnstileLoad = () => {
      clearTimeout(timer);
      resolve();
    };

    s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit&onload=onRosseTurnstileLoad';

    s.async = true;

    s.onerror = () => {
      clearTimeout(timer);
      reject(Error('No se pudo cargar la comprobación de seguridad.'));
    };

    document.head.append(s);
  });

  captchaBox.hidden = false;

  widget = window.turnstile.render(captchaBox, {
    sitekey: config.sitekey,
    theme: 'auto'
  });
}

(async()=>{try{await Rossé.session();location.replace(next);return;}catch(e){if(!isUnauth(e)){setStatus(e.message);return;}}try{config=await rosseRequest('/auth/config');if(regNote)regNote.textContent=config.publico?'Usa al menos 15 caracteres para tu contraseña.':'Mínimo 15 caracteres. Registro limitado a beta privada.';await loadCaptcha();$('content').hidden=false;show('login');}catch(e){setStatus(e.message+' · Recarga para reintentar.');}})();
