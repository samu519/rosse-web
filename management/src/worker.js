import storefrontRoutes from "./storefront-routes.json";
import {sliderPublic,sliderAdmin} from "./slider.js";
import {renderSlider} from "./slider-render.js";
import sliderPanel from "./slider-panel.html";
import {customerRegistry} from "./customers.js";
import celebrations from "./celebraciones.html";
import products from "./catalog.json";
import panel from "./panel.html";
import adminHome from "./admin.html";
import blogPanel from "./blog-panel.html";
import {blogAdministration, blogArticle, blogIndex} from "./blog.js";
const admin = "admin.rossetienda.online";
const store = "https://rossetienda.online";
const categories = {desayunos:"Desayunos",anchetas:"Anchetas",flores:"Flores",cajas:"Cajas",peluches:"Peluches"};
const newId = /^regalo-[a-f0-9-]{36}$/;
const originals = new Map(products.map(p => [p.id,p]));
const asset = /^\/media\/[a-f0-9-]{36}\.webp$/;
const esc = value => String(value).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const money = n => "$"+n.toLocaleString("es-CO");
const reply = (body,status=200) => Response.json(body,{status,headers:{"Cache-Control":"no-store"}});
async function edits(env){
 const {results}=await env.DB.prepare("SELECT content FROM product_edits").all();
 return new Map(results.map(row=>{const p=JSON.parse(row.content);return [p.id,{...originals.get(p.id),...p}]}));
}
async function equal(a,b){
 const digest = s=>crypto.subtle.digest("SHA-256",new TextEncoder().encode(s));
 const [x,y]=await Promise.all([digest(a),digest(b)]);
 return crypto.subtle.timingSafeEqual(x,y);
}
async function administration(req,env,path){
 if(!env.ADMIN_EMAIL || !env.ADMIN_PASSWORD || !env.LOGIN_LIMIT) return reply("Panel pendiente de configuración",503);
 const expected="Basic "+btoa(env.ADMIN_EMAIL+":"+env.ADMIN_PASSWORD);
 if(!await equal(req.headers.get("Authorization")||"",expected)){
  const limit=await env.LOGIN_LIMIT.limit({key:req.headers.get("CF-Connecting-IP")||"local"});
  return limit.success ? new Response("Inicia sesión con tu correo y contraseña",{status:401,headers:{"WWW-Authenticate":'Basic realm="Rossé", charset="UTF-8"',"Cache-Control":"no-store"}}) : reply("Intenta de nuevo en un minuto",429);
 }
 const page = new Map([["/",adminHome],["/catalogo",panel],["/blog",blogPanel],["/celebraciones",celebrations],["/portada",sliderPanel]]).get(path);
 if(req.method==="GET" && page) return new Response(page,{headers:{"Content-Type":"text/html;charset=utf-8","Cache-Control":"no-store","X-Frame-Options":"DENY","Referrer-Policy":"no-referrer","X-Robots-Tag":"noindex"}});
 if(path==="/celebraciones/agenda" && req.method==="GET"){
  if(!env.REGISTRO) return reply("Falta conectar registro-usuarios al panel.",503);
  try {
   const [customers, moments] = await env.REGISTRO.batch([
    env.REGISTRO.prepare("SELECT count(*) AS total FROM usuarios"),
    env.REGISTRO.prepare(`SELECT u.nombre, u.apellido, f.titulo, f.tipo, f.fecha, f.es_anual
      FROM fechas_especiales f JOIN usuarios u ON u.id = f.usuario_id
      ORDER BY f.fecha, f.id`)
   ]);
   return reply({clientes:customers.results[0].total, momentos:moments.results});
  } catch(error) {console.error("Agenda unavailable",error.name);return reply("No se pudo leer la agenda.",503);}
 }
 if(path==="/celebraciones/clientes"){
  try{return await customerRegistry(req,env.DB)}
  catch(error){console.error("Customer registry unavailable",error.name);return reply("Registro temporalmente no disponible",503)}
 }
 if(path==="/blog/posts" || path.startsWith("/blog/posts/")){
  try{return await blogAdministration(req,env,path)}
  catch(error){console.error("Blog administration failed",error.message);return reply("La revista no está disponible en este momento",503)}
 }
 if(path==="/slider/settings"){const changes=await edits(env);return sliderAdmin(req,env,[...new Map([...originals,...changes]).values()],productPath);}
 if(req.method==="GET" && path==="/products"){const changes=await edits(env);return reply([...new Map([...originals,...changes]).values()].filter(p=>!p.deleted));}
 if(req.headers.get("Origin")!==new URL(req.url).origin)return reply("Origen inválido",403);
 if(req.method==="POST" && path==="/photos"){
  if(req.headers.get("Content-Type")!=="image/webp" || !(Number(req.headers.get("Content-Length"))>0 && Number(req.headers.get("Content-Length"))<=5000000))return reply("Imagen demasiado grande o formato inválido",413);
  const bytes=await req.arrayBuffer(), v=new Uint8Array(bytes), decoder=new TextDecoder();
  if(bytes.byteLength>5000000 || decoder.decode(v.slice(0,4))!=="RIFF" || decoder.decode(v.slice(8,12))!=="WEBP")return reply("Imagen inválida",400);
  const key=crypto.randomUUID()+".webp"; await env.PHOTOS.put(key,bytes);return reply("/media/"+key,201);
 }
 const editing = /^(?:PUT|DELETE)$/.test(req.method) && /^\/products\/[a-z0-9-]+$/.test(path);
 const creating = req.method==="POST" && path==="/products";
 if(!editing && !creating)return reply("Ruta desconocida",404);
 const id=creating?"regalo-"+crypto.randomUUID():path.split("/")[2];
 const original=originals.get(id);
 const current=creating?null:(await edits(env)).get(id)||original;
 if(editing && (!current || current.deleted))return reply("Producto desconocido",404);
 const d=await req.json().catch(()=>null);
 const revision=current?.revision??0;
 if(d?.revision!==revision)return reply("El producto cambió en otra sesión. Vuelve a abrirlo.",409);
 const deleting=req.method==="DELETE";
 let next={...current,id,revision:revision+1};
 if(deleting)next.deleted=true;
 else{
  const name=typeof d.name==="string"?d.name.trim():"";
  const category=current?.category??d.category;
  const includes=d.includes??current?.includes??[];
  const offer=d.offer??null;
  const price=d.price;
  const validPrice=price===null || Number.isSafeInteger(price)&&price>0&&price<=999999999;
  if(!name || name.length>120 || !Object.hasOwn(categories,category) || !validPrice ||
     (offer!==null && (!Number.isSafeInteger(offer)||offer<1||offer>=price)) ||
     !Array.isArray(includes)||includes.length>40||!includes.every(x=>typeof x==="string"&&x.trim()&&x.length<=200) ||
     !Array.isArray(d.photos)||!d.photos.length||d.photos.length>60 || new Set(d.photos).size!==d.photos.length ||
     !Array.isArray(d.gallery)||!d.gallery.every(x=>d.photos.includes(x)))return reply("Revisa los datos del producto",400);
  for(const src of d.photos){
   if(original?.photos.includes(src))continue;
   if(typeof src!=="string"||!asset.test(src)||!await env.PHOTOS.head(src.slice(7)))return reply("Foto desconocida",400);
  }
  next={...next,name,category,price,offer,includes:includes.map(x=>x.trim()),photos:d.photos,gallery:[...new Set(d.gallery)]};
 }
 const sql=revision===0?"INSERT OR IGNORE INTO product_edits(id,content,revision) VALUES(?,?,1)":"UPDATE product_edits SET content=?,revision=revision+1 WHERE id=? AND revision=?";
 const args=revision===0?[id,JSON.stringify(next)]:[JSON.stringify(next),id,revision];
 const result=await env.DB.prepare(sql).bind(...args).run();
 return result.meta.changes?reply(next):reply("El producto cambió en otra sesión. Vuelve a abrirlo.",409);
}
const salePrice = p => p.offer ?? p.price;
function priceMarkup(p){
 if(!p.offer)return p.price===null?"":money(p.price);
 const percent=Math.floor((p.price-p.offer)*100/p.price);
 return `<strong data-current-price>${money(p.offer)}</strong> <del>${money(p.price)}</del> <span class="rosse-offer" style="display:inline-block;background:#8a1f4b;color:white;border-radius:999px;padding:.2em .55em;font-size:.8em">${percent>0?"−"+percent+"%":"Oferta"}</span>`;
}
function contents(p,label){
 if(!p.includes?.length)return "";
 return `<details${label==="Qué incluye"?" open":""}><summary>${label}</summary><ul>${p.includes.map(x=>`<li>${esc(x)}</li>`).join("")}</ul></details>`;
}
function photos(p){
 const all=[...p.photos,...(p.sheet?[p.sheet]:[])];
 return '<div class="thumbs">'+all.map((src,i)=>`<button type="button" aria-label="${src===p.sheet?"Ficha del catálogo":"Foto "+(i+1)}" aria-pressed="${i===0}" ${src===p.sheet?"data-catalog":""}><img src="${esc(imagePath(src))}" alt=""></button>`).join("")+'</div>';
}
function whatsapp(p){
 return "https://wa.me/573009798063?text="+encodeURIComponent(`Hola, Rossé. Me interesa ${p.name}${salePrice(p)===null?"":" ("+money(salePrice(p))+" COP)"}. ¿Me confirman disponibilidad y el total con entrega?`);
}
const productPath = id => storefrontRoutes["/" + id] ?? "/" + id;
const idsByProductPath = new Map(products.map(p => [productPath(p.id), p.id]));
const pageId = path => {
 const clean = path.replace(/\/index\.html$/, "/").replace(/\.html$/, "").replace(/\/$/, "");
 return idsByProductPath.get(clean) ?? clean.split("/").filter(Boolean).pop();
};
const imagePath = src => src.startsWith("img/") ? "/" + src : src;
function listing(p){
 return `<article class="listing" data-occasion="" data-price="${salePrice(p)??""}"><a class="card" id="${p.id}" href="${productPath(p.id)}"><img loading="lazy" src="${esc(imagePath(p.photos[0]))}" alt="${esc(p.name)}"><small>${categories[p.category]}</small><h3>${esc(p.name)}</h3>${p.price===null?"":`<p class="card-price">${priceMarkup(p)}</p>`}</a>${contents(p,"Qué incluye")}</article>`;
}
function newDetail(p){
 return `<main class="catalog"><a href="/productos/${p.category}">‹ ${categories[p.category]}</a><section class="product"><div><img class="portrait" src="${esc(imagePath(p.photos[0]))}" alt="${esc(p.name)}">${photos(p)}</div><div><small>${categories[p.category]}</small><h1>${esc(p.name)}</h1>${p.price===null?"":`<p class="product-price">${priceMarkup(p)} <span>COP</span></p>`}<a class="btn order-link" href="${esc(whatsapp(p))}">Consultar por WhatsApp</a><details class="order-form" hidden><summary>Preparar consulta por WhatsApp</summary><form><label for="order-date">Fecha de entrega</label><input id="order-date" name="fecha" type="date"><label for="order-preferences">Preferencias o mensaje para la tarjeta</label><textarea id="order-preferences" name="preferencias" maxlength="500"></textarea><button class="btn" type="submit">Abrir WhatsApp</button></form></details>${contents(p,"Qué incluye")}</div></section><script src="/js/order-form.js" defer></script><script src="/js/gallery.js"></script></main>`;
}
function render(origin,path,changes){
 const rw=new HTMLRewriter();
 const id=pageId(path), current=changes.get(id);
 const listingPage=id==="productos"||Object.hasOwn(categories,id);
 if(listingPage){
  const additions=[...changes.values()].filter(p=>newId.test(p.id)&&!p.deleted&&(id==="productos"||p.category===id));
  rw.on("main .grid",{element:e=>e.prepend(additions.map(listing).join(""),{html:true})});
 }
 let editedListing=false;
 if(listingPage){
  rw.on(".listing",{element:()=>{editedListing=false}});
  rw.on(".listing > details",{element:e=>{if(editedListing)e.remove()}});
 }
 for(const p of changes.values()){
  const link='a[href="'+productPath(p.id)+'"]';
  const card='a.card[href="'+productPath(p.id)+'"]';
  if(p.deleted){rw.on(link,{element:e=>{editedListing=true;e.remove()}});continue;}
  rw.on('a.home-cover[href="'+productPath(p.id)+'"] img',{element:e=>e.setAttribute("src",imagePath(p.photos[0])).setAttribute("alt",p.name)});
  rw.on(card+" img",{element:e=>e.setAttribute("src",imagePath(p.photos[0])).setAttribute("alt",p.name)});
  rw.on(card+" h3",{element:e=>e.setInnerContent(p.name)});
  rw.on(card+" .card-price",{element:e=>e.remove()});
  rw.on(card,{element:e=>{
   if(p.price!==null)e.append('<p class="card-price">'+priceMarkup(p)+'</p>',{html:true});
   if(listingPage){editedListing=true;e.after(contents(p,"Qué incluye"),{html:true});}
  }});
 }
 // The inline script runs ahead of the existing search code and uses the payable price.
 const sync='<script>document.querySelectorAll(".listing").forEach(e=>{if(!e.querySelector(".card")){e.remove();return}const p=e.querySelector("[data-current-price], .card-price");e.dataset.price=(p?.querySelector("[data-current-price]")??p)?.textContent.replace(/[^0-9]/g,"")??""})</script>';
 if(listingPage){
  rw.on('script[src="/js/catalog-search.js"]',{element:e=>e.before(sync,{html:true})});
  rw.on("body",{element:e=>e.append(sync,{html:true})});
 }
 if(current){
  const p=current;
  rw.on("title",{element:e=>e.setInnerContent(p.name+" · Rossé")});
  if(newId.test(p.id)){
   const url = store + productPath(p.id);
   rw.on("link[rel=canonical]", {element:e=>e.setAttribute("href",url)});
   rw.on("meta[property='og:url']", {element:e=>e.setAttribute("content",url)});
   rw.on('script[type="application/ld+json"]', {element:e=>e.remove()});
   rw.on("main",{element:e=>e.replace(newDetail(p),{html:true})});
  }
  else{
   rw.on('.product .thumbs',{element:e=>e.remove()});
   rw.on('.product .portrait',{element(e){e.setAttribute("src",imagePath(p.photos[0])).setAttribute("alt",p.name);e.after(photos(p),{html:true})}});
   rw.on('.product-price',{element:e=>e.remove()});
   rw.on('.product h1',{element:e=>{e.setInnerContent(p.name);if(p.price!==null)e.after('<p class="product-price">'+priceMarkup(p)+' <span>COP</span></p>',{html:true})}});
   rw.on('.product .order-link',{element:e=>e.setAttribute("href",whatsapp(p))});
   rw.on('.product details',{element:e=>{if(!e.hasAttribute("class"))e.remove()}});
   rw.on('.product .order-note',{element:e=>e.after(contents(p,"Qué incluye"),{html:true})});
  }
 }
 if(id==="galeria"){
  for(const p of changes.values()){
   if(p.deleted)continue;
   rw.on('.photo-grid a[href="'+productPath(p.id)+'"]',{element:e=>e.remove()});
   rw.on('.photo-grid',{element:e=>e.prepend(p.gallery.map(src=>`<a href="${productPath(p.id)}" data-category="${categories[p.category]}"><img src="${esc(imagePath(src))}" alt="${esc(p.name)}" loading="lazy"></a>`).join(""),{html:true})});
  }
 }
 const response=rw.transform(origin);response.headers.set("Cache-Control","no-cache");response.headers.delete("ETag");return response;
}
export default {async fetch(req,env){
 const u=new URL(req.url);
 if(u.hostname===admin)return administration(req,env,u.pathname);
 if(u.hostname!==new URL(store).hostname)return reply("Dominio desconocido",404);
 if(u.pathname==="/api/home-slider" && req.method==="GET"){let catalog=products;try{catalog=[...new Map([...originals,...await edits(env)]).values()]}catch(e){console.error("Slider catalogue unavailable",e.message)}return sliderPublic(env,catalog,productPath);}
 const legacyPath = storefrontRoutes[u.pathname.replace(/\.html$/, "").replace(/\/$/, "")];
 if (legacyPath && ["GET", "HEAD"].includes(req.method)) {
  u.pathname = legacyPath;
  return Response.redirect(u.href, 301);
 }
 if(asset.test(u.pathname)){
  const obj=await env.PHOTOS.get(u.pathname.slice(7));return obj?new Response(obj.body,{headers:{"Content-Type":"image/webp","Cache-Control":"public,max-age=31536000,immutable","X-Content-Type-Options":"nosniff"}}):reply("Foto desconocida",404);
 }
 if(u.pathname.startsWith("/revista-")){
  try{
   const article=await blogArticle(req,env,u,esc);
   if(article)return article;
  }catch(error){console.error("Blog read failed",error.message);return reply("La revista no está disponible en este momento",503)}
 }
 if(req.method==="GET" && ["/blog", "/blog/", "/blog/index.html", "/sitemap.xml"].includes(u.pathname)){
  const origin=await fetch(req);
  if(!origin.ok)return origin;
  try{return await blogIndex(origin,u.pathname,env,esc)}
  catch(error){console.error("Blog index failed",error.message);return origin}
 }
 const page=pageId(u.pathname);
 const dynamic=newId.test(page) && /^\/[^/]+$/.test(u.pathname);
 const origin=await fetch(dynamic?new Request(new URL("/productos/desayunos/desayuno-mini",u),req):req);
 if(!origin.ok || req.method!=="GET" || !origin.headers.get("Content-Type")?.includes("text/html"))return origin;
 try{
  const changes=await edits(env), current=changes.get(page);
  if(current?.deleted || (dynamic&&!current))return new Response("Producto no disponible",{status:404,headers:{"Cache-Control":"no-store","Content-Type":"text/plain; charset=utf-8"}});
  // Render the configured hero in the first HTML response, without a client API round trip.
  if(u.pathname==="/" || u.pathname==="/index.html"){
   const catalog=[...new Map([...originals,...changes]).values()];
   const config=await (await sliderPublic(env,catalog,productPath)).json();
   const base=changes.size?render(origin,u.pathname,changes):origin;
   return renderSlider(base,config);
  }
  return changes.size?render(origin,u.pathname,changes):origin;
 }catch(error){
  console.error("Catalog read failed",error.message);
  return dynamic?reply("Catálogo temporalmente no disponible",503):origin;
 }
}};
