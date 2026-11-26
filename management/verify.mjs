import {Miniflare} from 'miniflare';
import {build} from 'esbuild';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const {outputFiles}=await build({entryPoints:['src/worker.js'],bundle:true,format:'esm',loader:{'.html':'text'},write:false});
const password=crypto.randomUUID(), host='https://admin.rossetienda.online';
const headers={Authorization:'Basic '+btoa('test@example.invalid:'+password),Origin:host};
const runtime=new Miniflare({modules:true,script:outputFiles[0].text,compatibilityDate:'2025-09-01',bindings:{ADMIN_EMAIL:'test@example.invalid',ADMIN_PASSWORD:password},d1Databases:['DB'],r2Buckets:['PHOTOS'],ratelimits:{LOGIN_LIMIT:{simple:{limit:10,period:60}}},outboundService:async req=>new Response(await readFile('../ds01.html'),{headers:{'Content-Type':'text/html'}})});
try{
 const db=await runtime.getD1Database('DB');await db.prepare(await readFile('schema.sql','utf8')).run();
 assert.equal((await runtime.dispatchFetch(host+'/')).status,401);
 const list=await (await runtime.dispatchFetch(host+'/products',{headers})).json();assert.equal(list.length,39);
 const p=list.find(x=>x.id==='ds01');p.price=123456;
 const webp=await readFile('../img/ds01.webp');
 const upload=await runtime.dispatchFetch(host+'/photos',{method:'POST',headers:{...headers,'Content-Type':'image/webp','Content-Length':String(webp.length)},body:webp});
 assert.equal(upload.status,201);
 const path=await upload.json();p.photos.unshift(path);p.gallery.push(path);
 assert.deepEqual(Buffer.from(await (await runtime.dispatchFetch('https://rossetienda.online'+path)).arrayBuffer()),webp);
 const put=()=>runtime.dispatchFetch(host+'/products/ds01',{method:'PUT',headers,body:JSON.stringify(p)});
 assert.equal((await put()).status,200);assert.equal((await put()).status,409);
 const live=await (await runtime.dispatchFetch('https://rossetienda.online/ds01.html')).text();assert.ok(live.includes('$123.456'));assert.ok(live.includes('data-catalog'));assert.ok(live.includes(path));
 console.log('Passed authentication, import, publication, stale edit and product rendering checks.');
}finally{await runtime.dispose()}
