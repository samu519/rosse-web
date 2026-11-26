import products from "./catalog.json";
import panel from "./panel.html";
const admin = "admin.rossetienda.online";
const store = "https://rossetienda.online";
const originals = new Map(products.map(p => [p.id,p]));
const asset = /^\/media\/[a-f0-9-]{36}\.webp$/;
const esc = value => String(value).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const money = n => "$"+n.toLocaleString("es-CO");
const reply = (body,status=200) => Response.json(body,{status,headers:{"Cache-Control":"no-store"}});
async function edits(env){
 const {results}=await env.DB.prepare("SELECT content FROM product_edits").all();
 return new Map(results.map(row=>{const p=JSON.parse(row.content);return [p.id,p]}));
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
 if(req.method==="GET" && path==="/") return new Response(panel,{headers:{"Content-Type":"text/html;charset=utf-8","Cache-Control":"no-store","X-Frame-Options":"DENY","Referrer-Policy":"no-referrer","X-Robots-Tag":"noindex"}});
 if(req.method==="GET" && path==="/products"){const changes=await edits(env);return reply(products.map(p=>changes.get(p.id)||p));}
 if(req.headers.get("Origin")!==new URL(req.url).origin)return reply("Origen inválido",403);
 if(req.method==="POST" && path==="/photos"){
  if(req.headers.get("Content-Type")!=="image/webp" || !(Number(req.headers.get("Content-Length"))>0 && Number(req.headers.get("Content-Length"))<=5000000))return reply("Imagen demasiado grande o formato inválido",413);
  const bytes=await req.arrayBuffer(), v=new Uint8Array(bytes), decoder=new TextDecoder();
  if(bytes.byteLength>5000000 || decoder.decode(v.slice(0,4))!=="RIFF" || decoder.decode(v.slice(8,12))!=="WEBP")return reply("Imagen inválida",400);
  const key=crypto.randomUUID()+".webp"; await env.PHOTOS.put(key,bytes);return reply("/media/"+key,201);
 }
 const id=path.split("/")[2], base=originals.get(id);
 if(req.method!=="PUT" || path!=="/products/"+id || !base)return reply("Ruta desconocida",404);
 const d=await req.json().catch(()=>null);
 if(!d || !Number.isSafeInteger(d.revision)||d.revision<0 || !(d.price===null || Number.isSafeInteger(d.price)&&d.price>0&&d.price<=999999999) || !Array.isArray(d.photos)||!d.photos.length||d.photos.length>60 || new Set(d.photos).size!==d.photos.length || !Array.isArray(d.gallery)||!d.gallery.every(x=>d.photos.includes(x)))return reply("Revisa los datos del producto",400);
 for(const src of d.photos){if(base.photos.includes(src))continue;if(typeof src!=="string"||!asset.test(src)||!await env.PHOTOS.head(src.slice(7)))return reply("Foto desconocida",400);}
 const next={...base,price:d.price,photos:d.photos,gallery:[...new Set(d.gallery)],revision:d.revision+1};
 const sql=d.revision===0?"INSERT OR IGNORE INTO product_edits(id,content,revision) VALUES(?,?,1)":"UPDATE product_edits SET content=?,revision=revision+1 WHERE id=? AND revision=?";
 const args=d.revision===0?[id,JSON.stringify(next)]:[JSON.stringify(next),id,d.revision];
 const result=await env.DB.prepare(sql).bind(...args).run();
 return result.meta.changes?reply(next):reply("El producto cambió en otra sesión. Vuelve a abrirlo.",409);
}
function render(origin,path,changes){
 const rw=new HTMLRewriter();
 const id=path.split("/").pop().replace(/\.html$/,""), current=changes.get(id);
 for(const p of changes.values()){
  const card='a.card[href="'+p.id+'.html"]';
  rw.on('a.home-cover[href="'+p.id+'.html"] img',{element:e=>e.setAttribute("src",p.photos[0])});
  rw.on(card+" img",{element:e=>e.setAttribute("src",p.photos[0])});
  rw.on(card+" .card-price",{element:e=>e.remove()});
  if(p.price!==null)rw.on(card,{element:e=>e.append('<p class="card-price">'+money(p.price)+'</p>',{html:true})});
 }
 rw.on('script[src="catalog-search.js"]',{element:e=>e.before('<script>document.querySelectorAll(".listing").forEach(e=>{const p=e.querySelector(".card-price");e.dataset.price=p?p.textContent.replace(/[^0-9]/g,""):""})</script>',{html:true})});
 if(current){
  const p=current, all=[...p.photos,...(p.sheet?[p.sheet]:[])];
  const thumbs=all.map((s,i)=>'<button type="button" aria-label="'+(s===p.sheet?'Ficha del catálogo':'Foto '+(i+1))+'" aria-pressed="'+(i===0)+'" '+(s===p.sheet?'data-catalog':'')+'><img src="'+esc(s)+'" alt=""></button>').join("");
  rw.on('.product .thumbs',{element:e=>e.remove()});
  rw.on('.product .portrait',{element(e){e.setAttribute("src",p.photos[0]);e.after('<div class="thumbs">'+thumbs+'</div>',{html:true})}});
  rw.on('.product-price',{element:e=>e.remove()});
  if(p.price!==null)rw.on('.product h1',{element:e=>e.after('<p class="product-price">'+money(p.price)+' <span>COP</span></p>',{html:true})});
 }
 if(/^\/galeria(?:\.html)?\/?$/.test(path)){
  for(const p of changes.values()){
   rw.on('.photo-grid a[href="'+p.id+'.html"]',{element:e=>e.remove()});
   rw.on('.photo-grid',{element:e=>e.prepend(p.gallery.map(src=>'<a href="'+p.id+'.html" data-category="'+esc(p.category)+'"><img src="'+esc(src)+'" alt="'+esc(p.name)+'" loading="lazy"></a>').join(""),{html:true})});
  }
 }
 const response=rw.transform(origin);response.headers.set("Cache-Control","no-cache");response.headers.delete("ETag");return response;
}
export default {async fetch(req,env){
 const u=new URL(req.url);
 if(u.hostname===admin)return administration(req,env,u.pathname);
 if(u.hostname!==new URL(store).hostname)return reply("Dominio desconocido",404);
 if(asset.test(u.pathname)){
  const obj=await env.PHOTOS.get(u.pathname.slice(7));return obj?new Response(obj.body,{headers:{"Content-Type":"image/webp","Cache-Control":"public,max-age=31536000,immutable","X-Content-Type-Options":"nosniff"}}):reply("Foto desconocida",404);
 }
 const origin=await fetch(req);
 if(!origin.ok || req.method!=="GET" || !origin.headers.get("Content-Type")?.includes("text/html"))return origin;
 try{const changes=await edits(env);return changes.size?render(origin,u.pathname,changes):origin;}catch(error){console.error("Catalog read failed",error.message);return origin;}
}};
