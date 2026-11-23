const buttons = document.querySelectorAll('.thumbs button');
const portrait = document.querySelector('.portrait');
const productName = portrait?.alt;
buttons.forEach(button => button.addEventListener('click', () => {
  portrait.src = button.querySelector('img').src;
  const catalog = button.hasAttribute('data-catalog');
  portrait.alt = catalog ? `Ficha del catálogo de ${productName}` : productName;
  portrait.classList.toggle('catalog-photo', catalog);
  buttons.forEach(item => item.setAttribute('aria-pressed', String(item === button)));
  if (!matchMedia('(prefers-reduced-motion: reduce)').matches) {
    portrait.animate([{opacity: 0.65}, {opacity: 1}], {duration: 220});
  }
}));
