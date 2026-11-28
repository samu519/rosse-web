const escapeHTML = s => String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const sizes = '(max-width: 680px) 94vw, (max-width: 1200px) 50vw, 600px';
export function renderSlider(origin,config){
 const p=config.products[0];
 const body=p?`<a class="home-cover" href="${escapeHTML(p.url)}"><img ${p.srcset?`srcset="${escapeHTML(p.srcset)}" sizes="${sizes}" `:''}src="${escapeHTML(p.image)}" alt="${escapeHTML(p.name)}" width="976" height="1400" fetchpriority="high"><span>${escapeHTML(p.name)} <span aria-hidden="true">↗</span></span></a><div class="slider-controls" hidden><button class="slider-prev" type="button" aria-label="Producto anterior">‹</button><div class="slider-dots"></div><button class="slider-next" type="button" aria-label="Producto siguiente">›</button><button class="slider-toggle" type="button" aria-label="Pausar carrusel">Ⅱ</button></div><script type="application/json" class="slider-defaults">${JSON.stringify(config).replace(/</g,'\\u003c')}</script>`:`<a class="btn" href="/productos/">Ver regalos ↗</a>`;
 const out=new HTMLRewriter().on('.home-slider',{element(e){e.setAttribute('data-slider-server','');e.setInnerContent(body,{html:true})}}).transform(origin);
 const headers=new Headers(out.headers);for(const name of ['Content-Length','Content-Encoding','ETag','Last-Modified'])headers.delete(name);headers.set('Cache-Control','no-cache');
 return new Response(out.body,{status:out.status,statusText:out.statusText,headers});
}
