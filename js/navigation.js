(() => {
  const header = document.querySelector('.site-header');
  const button = header.querySelector('.menu-toggle');
  const nav = header.querySelector('nav');
  const contactLink = nav.querySelector('a[href="/contacto"]');
  if (contactLink) {
    for (const button of header.querySelectorAll('.mobile-contact, .pill')) {
      button.href = contactLink.href;
      button.textContent = contactLink.textContent;
      if (contactLink.hasAttribute('aria-current')) button.setAttribute('aria-current', 'page');
    }
    contactLink.remove();
  }
  const galleryLink = nav.querySelector('a[href="/galeria"]');
  if (galleryLink && !nav.querySelector('a[href="/blog/"]')) {
    const magazineLink = document.createElement('a');
    magazineLink.href = '/blog/';
    magazineLink.textContent = 'Revista';
    galleryLink.before(magazineLink);
  }
  const momentsLink = document.createElement('a');
  momentsLink.href = '/login/mi-cuenta';
  momentsLink.textContent = 'Mi Rossé';
  nav.append(momentsLink);
  const compactNavigation = matchMedia('(width < 1024px)');
  const productsLink = nav.querySelector('a[href="/productos/"]');
  const productsMenu = document.createElement('details');
  productsMenu.className = 'products-menu';
  const productsSummary = document.createElement('summary');
  productsSummary.textContent = 'Productos';
  const categoryLinks = document.createElement('div');
  categoryLinks.className = 'products-menu-links';

  const categories = [
    ['productos', 'Todos los productos'],
    ['desayunos', 'Desayunos sorpresa'],
    ['anchetas', 'Anchetas'],
    ['flores', 'Flores'],
    ['rosas-eternas', 'Rosas eternas'],
    ['ramos-de-maquillaje', 'Ramos de maquillaje']
  ];
  const currentPage = location.pathname.split('/').filter(Boolean).pop()?.replace(/\.html$/, '');
  for (const [page, label] of categories) {
    const link = document.createElement('a');
    link.href = page === 'productos' ? '/productos/' : '/productos/' + page;
    link.textContent = label;
    if (page === currentPage) link.setAttribute('aria-current', 'page');
    categoryLinks.append(link);
  }
  productsMenu.append(productsSummary, categoryLinks);
  if (productsLink.hasAttribute('aria-current') || categoryLinks.querySelector('[aria-current]')) {
    productsMenu.classList.add('products-menu-active');
  }
  productsLink.replaceWith(productsMenu);

  function setOpen(open) {
    button.setAttribute('aria-expanded', String(open));
    button.setAttribute('aria-label', open ? 'Cerrar menú' : 'Abrir menú');
    nav.inert = compactNavigation.matches && !open;
    if (!open) productsMenu.open = false;
  }
  header.classList.add('menu-ready');
  setOpen(false);
  button.addEventListener('click', () => setOpen(button.getAttribute('aria-expanded') !== 'true'));
  document.addEventListener('click', event => {
    if (!productsMenu.contains(event.target)) productsMenu.open = false;
    if (!header.contains(event.target) || event.target.closest('nav a')) setOpen(false);
  });
  document.addEventListener('keydown', event => {
    if (event.key !== 'Escape') return;
    if (productsMenu.open) {
      productsMenu.open = false;
      productsSummary.focus();
    } else if (button.getAttribute('aria-expanded') === 'true') {
      setOpen(false);
      button.focus();
    }
  });
  header.addEventListener('focusout', event => {
    if (!header.contains(event.relatedTarget)) setOpen(false);
  });
  compactNavigation.addEventListener('change', () => setOpen(false));
  window.addEventListener('pageshow', () => setOpen(false));
})();

const mobileHome = document.querySelector('.home-opening') && matchMedia('(max-width:680px)').matches;
if (document.readyState !== 'complete' && !mobileHome) {
  const veil = document.createElement('dialog');
  veil.className = 'page-loader';
  veil.setAttribute('aria-label', 'Cargando página');
  veil.addEventListener('cancel', event => event.preventDefault());
  document.body.append(veil);
  veil.showModal();
  function finishLoading() {
    veil.close();
    veil.remove();
  }
  window.addEventListener('load', finishLoading, {once: true});
  window.addEventListener('pagereveal', event => {
    if (event.viewTransition && veil.open) finishLoading();
  }, {once: true});
  window.addEventListener('pagehide', finishLoading, {once: true});
}

const footerMap = document.querySelector('iframe[data-map-src]');
if (footerMap) {
  const loadMap = () => { footerMap.src = footerMap.dataset.mapSrc; };
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      observer.disconnect();
      loadMap();
    }, { rootMargin: '160px' });
    observer.observe(footerMap);
  } else {
    loadMap();
  }
}

const productGrid = document.querySelector('.shop-category .catalog > .grid:not(.floral-sheets)');
if (productGrid) {
  const cards = Array.from(productGrid.children);
  for (let index = cards.length - 1; index > 0; index--) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [cards[index], cards[randomIndex]] = [cards[randomIndex], cards[index]];
  }
  productGrid.append(...cards);
}

// Read the rendered catalog so admin edits and discounts also update search metadata.
(() => {
  const isProduct = document.body.classList.contains('shop-product');
  const isCategory = document.body.classList.contains('shop-category');
  if (!isProduct && !isCategory) return;

  const store = 'https://rossetienda.online';
  const catalog = document.querySelector('main.catalog');
  const product = catalog?.querySelector('.product');
  const name = (isProduct ? product : catalog)?.querySelector('h1')?.textContent.trim();
  if (!name) return;

  const page = location.pathname.split('/').filter(Boolean).pop()?.replace(/\.html$/, '');
  if (!page) return;

  const url = store + location.pathname.replace(/\/index\.html$/, '/').replace(/\.html$/, '');
  const trail = [['Inicio', store + '/']];
  if (page !== 'productos') trail.push(['Productos', store + '/productos/']);

  const parent = catalog.querySelector(':scope > a');
  if ((isProduct || page === 'catalogo-floral') && parent) {
    const label = parent.textContent.trim().replace(/^‹\s*/, '');
    const section = parent.getAttribute('href')?.match(/^\/productos\/([a-z-]+)$/)?.[1];
    if (label && section) trail.push([label, store + '/productos/' + section]);
  }
  trail.push([name, url]);

  const graph = [{
    '@type': 'BreadcrumbList',
    itemListElement: trail.map(([label, item], index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: label,
      item
    }))
  }];

  if (product) {
    const images = [...product.querySelectorAll('.portrait, .thumbs button:not([data-catalog]) img')]
      .map(image => image.getAttribute('src'))
      .filter(Boolean)
      .map(src => new URL(src, store + '/').href);
    const entry = {
      '@type': 'Product',
      '@id': url + '#product',
      name,
      url,
      image: [...new Set(images)]
    };
    const priceElement = product.querySelector('.product-price');
    const displayedPrice = priceElement?.querySelector('[data-current-price]') ?? priceElement;
    const prices = Array.from((displayedPrice?.textContent ?? '').matchAll(/\$\s*(\d+(?:\.\d{3})*)/g),
      ([, amount]) => Number(amount.replaceAll('.', '')));
    const offerFields = { priceCurrency: 'COP', url, seller: { '@id': store + '/#business' } };
    if (prices.length === 1) {
      entry.offers = { '@type': 'Offer', price: prices[0], ...offerFields };
    } else if (prices.length > 1) {
      entry.offers = {
        '@type': 'AggregateOffer',
        lowPrice: Math.min(...prices),
        highPrice: Math.max(...prices),
        offerCount: prices.length,
        ...offerFields
      };
    }
    graph.push(entry);
  }

  const metadata = document.createElement('script');
  metadata.type = 'application/ld+json';
  metadata.textContent = JSON.stringify({ '@context': 'https://schema.org', '@graph': graph });
  document.head.append(metadata);
})();

// Rossé floating WhatsApp
(()=>{
 if(document.querySelector('.rosse-whatsapp-float'))return;
 const a=document.createElement('a');a.className='rosse-whatsapp-float';
 a.href=document.querySelector('.order-link')?.href || 'https://wa.me/573009798063?text=Hola%2C%20Ross%C3%A9.%20Quisiera%20consultar%20sobre%20un%20regalo.';
 a.setAttribute('aria-label','Consultar por WhatsApp');a.title='Consultar por WhatsApp';
 a.innerHTML='<svg viewBox="0 0 24 24" width="27" height="27" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M20.5 11.5a8.5 8.5 0 0 1-12.7 7.4L3 20l1.1-4.7A8.5 8.5 0 1 1 20.5 11.5Z"/><path d="M8 7.5c-.9.5-.7 2.1.3 3.8 1.2 2 3.3 3.8 5.5 4.1 1.1.2 2-.4 2.2-1.4l-2.6-1.5-1 1c-1.3-.6-2.5-1.7-3-3l.8-.9-1.3-2.3Z"/></svg>';
 document.body.append(a);
 a.addEventListener('click',()=>{window.dataLayer=window.dataLayer||[];window.dataLayer.push({event:'whatsapp_click',link_url:a.href,page_path:location.pathname,placement:'floating_button'})});
})();

// Rossé theme selector v1
(() => {
  const key = 'rosse-theme';
  const system = matchMedia('(prefers-color-scheme: dark)');
  const root = document.documentElement;
  const allowed = ['system','light','dark'];
  const normalize = value => allowed.includes(value) ? value : 'system';
  function stored() { try { return normalize(localStorage.getItem(key)); } catch { return 'system'; } }
  let preference = stored();
  const nav = document.querySelector('.site-header nav');
  const label = document.createElement('label');
  label.className = 'rosse-theme-control';
  const select = document.createElement('select');
  select.setAttribute('aria-label','Apariencia de Rossé');
  for (const [value,text] of [['system','Sistema'],['light','Claro'],['dark','Oscuro']]) {
    const option = document.createElement('option'); option.value = value; option.textContent = text; select.append(option);
  }
  const title = document.createElement('span'); title.textContent = 'Apariencia'; title.className = 'rosse-theme-label';
  label.append(title,select);
  if (nav && !nav.querySelector('.rosse-theme-control')) nav.append(label);
  function apply() {
    const theme = preference === 'system' ? (system.matches ? 'dark' : 'light') : preference;
    root.dataset.rosseTheme = theme;
    select.value = preference;
  }
  select.addEventListener('change',() => {
    preference = normalize(select.value);
    try { localStorage.setItem(key,preference); } catch {}
    apply();
  });
  system.addEventListener('change',() => { if (preference === 'system') apply(); });
  window.addEventListener('storage',event => { if(event.key === key || event.key === null){ preference = stored(); apply(); } });
  window.addEventListener('pageshow',event => { if(event.persisted){ preference = stored(); apply(); } });
  apply();
})();
