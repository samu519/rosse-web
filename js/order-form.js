const orderLink = document.querySelector('.order-link');
const orderDetails = document.querySelector('.order-form');
const orderForm = orderDetails.querySelector('form');

orderForm.addEventListener('submit', event => {
  event.preventDefault();
  const url = new URL(orderLink.href);
  const greeting = url.searchParams.get('text').split('\n\n')[0];
  const fields = new FormData(orderForm);
  const date = fields.get('fecha').split('-').reverse().join('/');
  const preferences = fields.get('preferencias').trim();
  const message = [greeting];
  if (date) message.push('Fecha de entrega: ' + date);
  if (preferences) message.push('Preferencias o mensaje para la tarjeta: ' + preferences);
  url.searchParams.set('text', message.join('\n'));
  window.rosseTrackWhatsApp?.("product_form");
  window.location.assign(url.href);
});

orderDetails.hidden = false;
orderLink.hidden = true;
