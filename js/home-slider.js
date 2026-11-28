(()=>{
 const root=document.querySelector('.home-slider');if(!root)return;
 const link=root.querySelector('.home-cover'),img=link?.querySelector('img'),caption=link?.querySelector(':scope > span');
 if(!img||!caption)return;
 const controls=root.querySelector('.slider-controls'),dots=root.querySelector('.slider-dots'),toggle=root.querySelector('.slider-toggle');
 const sizes='(max-width: 680px) 94vw, (max-width: 1200px) 50vw, 600px';
 const motion=matchMedia('(prefers-reduced-motion: reduce)');
 let config,index=0,wanted=0,timer,paused=false,hover=false,focus=false,stamp=0,loaded=document.readyState==='complete',preloaded;
 function schedule(){clearTimeout(timer);if(loaded&&config?.autoplay&&!paused&&!hover&&!focus&&!document.hidden&&!motion.matches&&config.products.length>1)timer=setTimeout(()=>show(index+1),config.seconds*1000)}
 function updateToggle(){toggle.textContent=paused?'▶':'Ⅱ';toggle.setAttribute('aria-label',paused?'Reanudar carrusel':'Pausar carrusel');toggle.hidden=!config.autoplay||motion.matches}
 function source(target,p){target.sizes=sizes;if(p.srcset)target.srcset=p.srcset;else target.removeAttribute('srcset');target.src=p.image;}
 function prefetch(){if(!loaded||!config||config.products.length<2||navigator.connection?.saveData||/2g/.test(navigator.connection?.effectiveType||''))return;const p=config.products[(index+1)%config.products.length];preloaded=new Image();preloaded.fetchPriority='low';source(preloaded,p)}
 function paint(p,n,animate){index=wanted=n;link.href=p.url;img.alt=p.name;if(img.getAttribute('src')!==p.image||img.getAttribute('srcset')!==(p.srcset||null))source(img,p);caption.replaceChildren(document.createTextNode(p.name+' '));const arrow=document.createElement('span');arrow.setAttribute('aria-hidden','true');arrow.textContent='↗';caption.append(arrow);if(animate&&!motion.matches&&img.animate)img.animate([{opacity:.65},{opacity:1}],{duration:240});[...dots.children].forEach((d,i)=>d.setAttribute('aria-current',String(i===n)));prefetch();schedule()}
 async function show(n){if(!config)return;clearTimeout(timer);const list=config.products;wanted=(n+list.length)%list.length;const next=wanted,token=++stamp,p=list[next];if(next===index){schedule();return}const pending=new Image();pending.fetchPriority='low';source(pending,p);try{await pending.decode()}catch{if(token===stamp){wanted=index;schedule()}return}if(token!==stamp)return;paint(p,next,true)}
 function init(d){if(!Array.isArray(d.products)||!d.products.length)return;config=d;controls.hidden=d.products.length<2;dots.replaceChildren();d.products.forEach((p,i)=>{const b=document.createElement('button');b.type='button';b.setAttribute('aria-label','Mostrar '+p.name);b.onclick=()=>show(i);dots.append(b)});updateToggle();paint(d.products[0],0,false)}
 root.querySelector('.slider-prev').onclick=()=>show(wanted-1);root.querySelector('.slider-next').onclick=()=>show(wanted+1);toggle.onclick=()=>{paused=!paused;updateToggle();schedule()};
 root.addEventListener('mouseenter',()=>{hover=true;schedule()});root.addEventListener('mouseleave',()=>{hover=false;schedule()});root.addEventListener('focusin',()=>{focus=true;schedule()});root.addEventListener('focusout',e=>{if(!root.contains(e.relatedTarget)){focus=false;schedule()}});document.addEventListener('visibilitychange',schedule);motion.addEventListener('change',()=>{if(config)updateToggle();schedule()});
 let start,suppressUntil=0;link.addEventListener('touchstart',e=>{start=[e.touches[0].clientX,e.touches[0].clientY]},{passive:true});link.addEventListener('touchcancel',()=>{start=null});link.addEventListener('touchend',e=>{if(!start||!config)return;const dx=e.changedTouches[0].clientX-start[0],dy=e.changedTouches[0].clientY-start[1];start=null;if(Math.abs(dx)>50&&Math.abs(dx)>Math.abs(dy)){suppressUntil=Date.now()+400;show(wanted+(dx<0?1:-1))}},{passive:true});link.addEventListener('click',e=>{if(Date.now()<suppressUntil)e.preventDefault()});
 function onLoad(){loaded=true;img.fetchPriority='auto';prefetch();schedule();if(!root.hasAttribute('data-slider-server'))fetch('/api/home-slider',{cache:'no-store'}).then(r=>{if(!r.ok)throw Error('Slider unavailable');return r.json()}).then(init).catch(()=>{})}
 try{init(JSON.parse(root.querySelector('.slider-defaults').textContent))}catch{}
 if(loaded)onLoad();else window.addEventListener('load',onLoad,{once:true});
})();
