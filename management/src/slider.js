const defaults = ['ds11','ds04','fl01','af01','ds09','floral-03','cj01','pl01'];
const query = 'SELECT * FROM "rosse-slider-products" WHERE id=1';
async function settings(db) {
 const row = await db.prepare(query).first();
 if (!row) throw Error('Falta inicializar el carrusel');
 return {ids:JSON.parse(row.product_ids),seconds:row.interval_seconds,autoplay:!!row.autoplay,revision:row.revision};
}
const json = (body,status=200) => Response.json(body,{status,headers:{'Cache-Control':'no-store'}});
function available(catalog,productPath) {
 return catalog.filter(p=>!p.deleted && p.photos?.length).map(p=>({id:p.id,name:p.name,category:p.category,image:p.photos[0].startsWith('img/')?'/'+p.photos[0]:p.photos[0],url:productPath(p.id)}));
}
function selected(config,items) {
 const byId=new Map(items.map(p=>[p.id,p]));
 return [...new Set([...config.ids,...defaults,...items.map(p=>p.id)])].filter(id=>byId.has(id)).slice(0,8).map(id=>byId.get(id));
}
export async function sliderPublic(env,catalog,productPath) {
 const items=available(catalog,productPath);
 let config;
 try {config=await settings(env.DB)} catch(e){console.error('Slider settings unavailable',e.message);config={ids:defaults,seconds:5,autoplay:true};}
 return json({products:selected(config,items),seconds:config.seconds,autoplay:config.autoplay});
}
export async function sliderAdmin(req,env,catalog,productPath) {
 const items=available(catalog,productPath);
 try {
  const config=await settings(env.DB);
  if(req.method==='GET')return json({...config,ids:selected(config,items).map(p=>p.id),catalog:items});
  if(req.method!=='PUT')return json('Método no permitido',405);
  if(req.headers.get('Origin')!==new URL(req.url).origin)return json('Origen inválido',403);
  const d=await req.json().catch(()=>null);
  const valid=new Set(items.map(p=>p.id));
  if(!d || !Array.isArray(d.ids) || d.ids.length!==Math.min(8,items.length) || new Set(d.ids).size!==d.ids.length || !d.ids.every(id=>valid.has(id)) || !Number.isInteger(d.seconds) || d.seconds<3 || d.seconds>15 || typeof d.autoplay!=='boolean' || !Number.isInteger(d.revision))return json('Selecciona productos distintos y disponibles.',400);
  const r=await env.DB.prepare('UPDATE "rosse-slider-products" SET product_ids=?, interval_seconds=?, autoplay=?, revision=revision+1 WHERE id=1 AND revision=?').bind(JSON.stringify(d.ids),d.seconds,Number(d.autoplay),d.revision).run();
  if(!r.meta.changes)return json('Otra sesión modificó la portada. Recarga la página.',409);
  return json({...d,revision:d.revision+1});
 }catch(e){console.error('Slider administration failed',e.message);return json('No se pudo acceder al carrusel. Revisa la tabla D1.',503);}
}
