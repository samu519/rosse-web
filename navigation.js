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

if (document.readyState !== 'complete') {
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

const productGrid = document.querySelector('.shop-category .catalog > .grid:not(.floral-sheets)');
if (productGrid) {
  const cards = Array.from(productGrid.children);
  for (let index = cards.length - 1; index > 0; index--) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [cards[index], cards[randomIndex]] = [cards[randomIndex], cards[index]];
  }
  productGrid.append(...cards);
}
