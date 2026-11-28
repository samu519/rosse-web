import articleTemplate from "../../blog/que-regalar-en-navidad.html";

const blogCategories = new Set(["Celebraciones", "Amor", "Familia", "Flores", "Guías de regalo", "Historias Rossé"]);
const covers = {
  taller: ["detras-de-rosse.webp", "Preparación de un detalle en el taller de Rossé"],
  desayuno: ["ds11.webp", "Desayuno sorpresa Fresh con flores y globos"],
  flores: ["floral-03-foto.webp", "Ramo de rosas rosadas de Rossé"],
  ancheta: ["af01.webp", "Ancheta de dulces de Rossé"]
};
const store = "https://rossetienda.online";
const articlePath = slug => "/revista-" + slug;
const slugPattern = "[a-z0-9]+(?:-[a-z0-9]+)*";
const adminRoute = new RegExp("^/blog/posts(?:/(" + slugPattern + "))?$");
const publicRoute = new RegExp("^/revista-(" + slugPattern + ")(\\.html)?$");
const reply = (data, status = 200) => Response.json(data, {status, headers: {"Cache-Control": "no-store"}});
const text = value => typeof value === "string" ? value.trim() : "";

export async function blogAdministration(req, env, path) {
  const route = path.match(adminRoute);
  if (!route) return reply("Ruta desconocida", 404);
  const slug = route[1];
  if (req.method === "GET" && !slug) {
    const {results} = await env.DB.prepare("SELECT * FROM blog_posts ORDER BY updated_at DESC").all();
    return reply(results);
  }
  if (req.headers.get("Origin") !== new URL(req.url).origin) return reply("Origen inválido", 403);
  const creating = req.method === "POST" && !slug;
  if (!creating && !(req.method === "PUT" && slug)) return reply("Ruta desconocida", 404);

  const data = await req.json().catch(() => null);
  const title = text(data?.title);
  const category = text(data?.category);
  const summary = text(data?.summary);
  const body = text(data?.body);
  const cover = text(data?.cover);
  if (!title || title.length > 120 || !blogCategories.has(category) ||
      !summary || summary.length > 300 || !body || body.length > 20000 ||
      !Object.hasOwn(covers, cover) || typeof data?.publish !== "boolean" ||
      !Number.isSafeInteger(data?.revision)) return reply("Revisa los datos del artículo", 400);

  const current = creating ? null : await env.DB.prepare("SELECT * FROM blog_posts WHERE slug = ?").bind(slug).first();
  if (!creating && !current) return reply("Artículo desconocido", 404);
  if (data.revision !== (current?.revision ?? 0)) return reply("El artículo cambió en otra sesión. Vuelve a abrirlo.", 409);
  const now = new Date().toISOString();
  const publishedAt = data.publish ? current?.published_at ?? now : null;
  const revision = data.revision + 1;
  const fields = [revision, title, category, summary, body, cover, now, publishedAt];
  const entrySlug = slug ?? (
    title.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase()
      .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 65).replace(/-$/, "") || "articulo"
  ) + "-" + crypto.randomUUID().slice(0, 8);
  const result = creating
    ? await env.DB.prepare("INSERT OR IGNORE INTO blog_posts (slug, revision, title, category, summary, body, cover, updated_at, published_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)").bind(entrySlug, ...fields).run()
    : await env.DB.prepare("UPDATE blog_posts SET revision = ?, title = ?, category = ?, summary = ?, body = ?, cover = ?, updated_at = ?, published_at = ? WHERE slug = ? AND revision = ?").bind(...fields, slug, data.revision).run();
  if (!result.meta.changes) return reply("El artículo cambió en otra sesión. Vuelve a abrirlo.", 409);
  return reply({slug: entrySlug, revision, title, category, summary, body, cover, updated_at: now, published_at: publishedAt}, creating ? 201 : 200);
}

function articleBody(body, esc) {
  return body.replace(/\r\n?/g, "\n").split(/\n\s*\n/).filter(Boolean).map(block =>
    block.split(/\n(?=## )/).map(part => {
      if (!part.startsWith("## ")) return "<p>" + esc(part).replace(/\n/g, "<br>") + "</p>";
      const [heading, ...remaining] = part.slice(3).split("\n");
      return "<h2>" + esc(heading) + "</h2>" +
        (remaining.length ? "<p>" + remaining.map(esc).join("<br>") + "</p>" : "");
    }).join("")
  ).join("");
}

function renderArticle(post, esc) {
  const url = store + articlePath(post.slug);
  const [image, alt] = covers[post.cover];
  const json = JSON.stringify({"@context": "https://schema.org", "@graph": [
    {"@type": "BlogPosting", headline: post.title, description: post.summary, image: store + "/img/" + image,
      datePublished: post.published_at, dateModified: post.updated_at, inLanguage: "es-CO", url,
      author: {"@type": "Organization", name: "Rossé", url: store + "/"},
      publisher: {"@id": store + "/#business"}, mainEntityOfPage: {"@id": url}},
    {"@type": "BreadcrumbList", itemListElement: [
      ["Inicio", store + "/"], ["El arte de regalar", store + "/blog/"], [post.title, url]
    ].map(([name, item], i) => ({"@type": "ListItem", position: i + 1, name, item}))}
  ]}).replace(/</g, "\\u003c");
  const response = new Response(articleTemplate, {headers: {"Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-cache"}});
  return new HTMLRewriter()
    .on("title", {element: e => e.setInnerContent(post.title + " | Rossé")})
    .on('link[rel="canonical"]', {element: e => e.setAttribute("href", url)})
    .on('meta[name="description"], meta[property="og:description"]', {element: e => e.setAttribute("content", post.summary)})
    .on('meta[property="og:title"]', {element: e => e.setAttribute("content", post.title)})
    .on('meta[property="og:url"]', {element: e => e.setAttribute("content", url)})
    .on('meta[property="og:image"]', {element: e => e.setAttribute("content", store + "/img/" + image)})
    .on('script[type="application/ld+json"]', {element: e => e.setInnerContent(json, {html: true})})
    .on("main", {element: e => e.setInnerContent(
      '<nav class="editorial-trail" aria-label="Ubicación"><a href="/">Inicio</a><span aria-hidden="true">/</span><a href="/blog/">El arte de regalar</a></nav>' +
      '<article class="editorial-article"><p class="editorial-label">' + esc(post.category) + ' · Por Rossé</p><h1>' + esc(post.title) +
      '</h1><p class="editorial-standfirst">' + esc(post.summary) + '</p><figure><img src="/img/' + image + '" alt="' + esc(alt) +
      '" fetchpriority="high"></figure><div class="editorial-prose">' + articleBody(post.body, esc) +
      '<p><a href="/productos/">Explorar el catálogo de Rossé</a></p></div></article>', {html: true}
    )}).transform(response);
}

export async function blogArticle(req, env, url, esc) {
  const route = url.pathname.match(publicRoute);
  if (!route || !["GET", "HEAD"].includes(req.method)) return null;
  const post = await env.DB.prepare("SELECT * FROM blog_posts WHERE slug = ? AND published_at IS NOT NULL").bind(route[1]).first();
  if (!post) return new Response("Artículo no disponible", {status: 404, headers: {"Cache-Control": "no-store"}});
  if (route[2]) return Response.redirect(store + articlePath(post.slug), 301);
  const response = renderArticle(post, esc);
  return req.method === "HEAD" ? new Response(null, {headers: response.headers}) : response;
}

export async function blogIndex(origin, path, env, esc) {
  const {results} = await env.DB.prepare("SELECT slug, title, category, summary, cover, published_at FROM blog_posts WHERE published_at IS NOT NULL ORDER BY published_at DESC").all();
  if (!results.length) return origin;
  const headers = new Headers(origin.headers);
  for (const name of ["Content-Length", "Content-Encoding", "ETag", "Last-Modified"]) headers.delete(name);
  headers.set("Cache-Control", "no-cache");

  if (path === "/sitemap.xml") {
    const entries = results.map(post => "  <url><loc>" + store + articlePath(post.slug) + "</loc></url>").join("\n");
    const xml = (await origin.text()).replace("</urlset>", entries + "\n</urlset>");
    return new Response(xml, {status: origin.status, headers});
  }

  const cards = results.map(post => {
    const [image, alt] = covers[post.cover];
    return '<article class="editorial-card"><a href="' + articlePath(post.slug) + '"><img src="/img/' + image + '" alt="' + esc(alt) +
      '" loading="lazy"><span class="editorial-label">' + esc(post.category) + '</span><h3>' +
      esc(post.title) + '</h3></a><p>' + esc(post.summary) + '</p><time class="magazine-v6-date" datetime="' + esc(post.published_at) + '">' + esc(post.published_at.slice(0,10)) + '</time></article>';
  }).join("");
  const section = '<section class="editorial-picks" aria-labelledby="nuevos-articulos"><h2 id="nuevos-articulos">Nuevos artículos</h2><div class="editorial-cards">' +
    cards + '</div></section>';
  return new HTMLRewriter()
    .on(".editorial-feature", {element: e => e.after(section, {html: true})})
    .transform(new Response(origin.body, {status: origin.status, headers}));
}
