# Rossé · administración del catálogo

Este Worker sirve el panel en admin.rossetienda.online y aplica las ediciones al HTML público de rossetienda.online. Mantén el alojamiento actual como origen del dominio principal. Las fotos nuevas se guardan en R2 y las ediciones en D1. El catálogo inicial incluye 39 productos. La tienda sigue sirviendo su HTML original hasta que haya cambios publicados.

## Activación en la cuenta de Rossé

Desde esta carpeta, ejecuta npm ci y npx wrangler login. Autoriza la cuenta que administra rossetienda.online. Crea la base con npx wrangler d1 create rosse-catalog y copia su identificador en database_id dentro de wrangler.jsonc. Crea el almacenamiento con npx wrangler r2 bucket create rosse-catalog-photos. Aplica el esquema con npx wrangler d1 execute rosse-catalog --remote --file schema.sql. Revisa en el panel de Cloudflare que ninguna ruta Worker existente coincida con rossetienda.online/* antes de activar esta ruta.

Despliega con npm run deploy. El acceso administrativo permanece cerrado mientras falten los secretos. Configura ADMIN_EMAIL y ADMIN_PASSWORD con npx wrangler secret put ADMIN_EMAIL y npx wrangler secret put ADMIN_PASSWORD. Introduce el correo de la dueña y una contraseña aleatoria larga de caracteres ASCII en los avisos privados de Wrangler. El navegador solicita estas credenciales al abrir el panel mediante HTTPS.

## Uso

Abre el producto, selecciona fotos, ajusta precio y orden, elige las fotos que aparecerán en Galería y revisa Vista previa antes de publicar. Los precios son valores enteros en COP. Un precio vacío permite consultas sin precio anunciado. Las fichas fotográficas del catálogo y el PDF conservan el texto impreso en las imágenes.

## Verificación

node verify.mjs ejecuta pruebas de integración con un entorno local de Cloudflare. Requiere que la carpeta esté dentro del repositorio de la tienda. npm run deploy -- --dry-run comprueba el empaquetado.
