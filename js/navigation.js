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
 a.innerHTML='<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12.04 2a9.88 9.88 0 0 0-8.5 14.9L2 22l5.27-1.38A9.95 9.95 0 1 0 12.04 2Zm0 18.2a8.22 8.22 0 0 1-4.19-1.15l-.3-.18-3.13.82.84-3.05-.2-.32a8.22 8.22 0 1 1 6.98 3.88Zm4.51-6.16c-.25-.12-1.46-.72-1.69-.8-.22-.08-.39-.12-.55.12-.16.25-.64.8-.78.97-.14.16-.29.18-.53.06-.25-.12-1.05-.38-1.99-1.23-.74-.65-1.23-1.46-1.38-1.7-.14-.25-.01-.38.11-.5.11-.11.25-.29.37-.43.12-.14.16-.24.25-.41.08-.16.04-.31-.02-.43-.06-.12-.55-1.34-.76-1.83-.2-.48-.4-.41-.55-.42h-.47c-.16 0-.43.06-.66.31-.22.25-.86.85-.86 2.07 0 1.22.88 2.39 1.01 2.56.12.16 1.74 2.66 4.22 3.73.59.25 1.05.41 1.41.52.59.19 1.13.16 1.55.1.47-.07 1.46-.6 1.66-1.18.21-.58.21-1.08.14-1.18-.06-.1-.22-.16-.47-.29Z"/></svg><span>Hablemos</span>';
 document.body.append(a);
 a.addEventListener('click',()=>{window.dataLayer=window.dataLayer||[];window.dataLayer.push({event:'whatsapp_click',link_url:a.href,page_path:location.pathname,placement:'floating_button'})});
})();

// Rossé theme selector v2
(() => {
  const key='rosse-theme', root=document.documentElement;
  const system=matchMedia('(prefers-color-scheme: dark)');
  const choices=[['light','Claro','<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M19 5l-1.5 1.5m-11 11L5 19"/>'],['dark','Oscuro','<path d="M20.5 14.2A8.8 8.8 0 0 1 9.8 3.5 8.8 8.8 0 1 0 20.5 14.2Z"/>'],['system','Sistema','<rect x="3" y="4" width="18" height="13" rx="2"/><path d="M8 21h8m-4-4v4"/>']];
  const normalize=v=>choices.some(c=>c[0]===v)?v:'system';
  function stored(){try{return normalize(localStorage.getItem(key))}catch{return 'system'}}
  let preference=stored(), timer;
  const nav=document.querySelector('.site-header nav');
  const control=document.createElement('div');control.className='rosse-theme-control';
  const title=document.createElement('span');title.className='rosse-theme-label';title.textContent='Apariencia';
  const group=document.createElement('div');group.className='rosse-theme-segments';group.setAttribute('role','group');group.setAttribute('aria-label','Apariencia de Rossé');
  for(const [value,label,path] of choices){
    const b=document.createElement('button');b.type='button';b.dataset.themeChoice=value;b.title=label;b.setAttribute('aria-label',label);
    b.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+path+'</svg>';
    b.addEventListener('click',()=>{preference=value;try{localStorage.setItem(key,value)}catch{}apply(true)});group.append(b);
  }
  control.append(title,group);if(nav&&!nav.querySelector('.rosse-theme-control'))nav.append(control);
  function apply(animate=false){
    const theme=preference==='system'?(system.matches?'dark':'light'):preference;
    if(animate&&root.dataset.rosseTheme!==theme&&!matchMedia('(prefers-reduced-motion: reduce)').matches){
      clearTimeout(timer);root.classList.add('rosse-theme-changing');
      // Commit the previous computed colors before switching themes.
      void root.offsetWidth;timer=setTimeout(()=>root.classList.remove('rosse-theme-changing'),260);
    }
    root.dataset.rosseTheme=theme;
    for(const b of group.children)b.setAttribute('aria-pressed',String(b.dataset.themeChoice===preference));
  }
  system.addEventListener('change',()=>{if(preference==='system')apply(true)});
  window.addEventListener('storage',e=>{if(e.key===key||e.key===null){preference=stored();apply(true)}});
  window.addEventListener('pageshow',e=>{if(e.persisted){preference=stored();apply()}});
  apply();
})();
