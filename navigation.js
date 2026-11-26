(() => {
  const header = document.querySelector('.site-header');
  const button = header.querySelector('.menu-toggle');
  const nav = header.querySelector('nav');
  const mobile = matchMedia('(max-width:680px)');
  const productsLink = nav.querySelector('a[href="productos.html"]');
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
    ['flores', 'Flores']
  ];
  const currentPage = location.pathname.split('/').pop().replace(/\.html$/, '');
  for (const [page, label] of categories) {
    const link = document.createElement('a');
    link.href = page + '.html';
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
    nav.inert = mobile.matches && !open;
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
  mobile.addEventListener('change', () => setOpen(false));
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

  const url = store + '/' + page;
  const trail = [['Inicio', store + '/']];
  if (page !== 'productos') trail.push(['Productos', store + '/productos']);

  const parent = catalog.querySelector(':scope > a');
  if ((isProduct || page === 'catalogo-floral') && parent) {
    const label = parent.textContent.trim().replace(/^‹\s*/, '');
    const section = parent.getAttribute('href')?.match(/^([a-z-]+)\.html$/)?.[1];
    if (label && section) trail.push([label, store + '/' + section]);
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
