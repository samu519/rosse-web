const contactForm = document.querySelector('.contact-form');

contactForm.addEventListener('submit', event => {
  event.preventDefault();
  const fields = new FormData(contactForm);
  const name = fields.get('nombre').trim();
  const message = fields.get('mensaje').trim();
  for (const [field, value] of [['nombre', name], ['mensaje', message]]) {
    if (!value) {
      const input = contactForm.elements[field];
      input.value = '';
      input.reportValidity();
      return;
    }
  }
  const date = fields.get('fecha').split('-').reverse().join('/');
  const lines = [`Hola, Rossé. Soy ${name}.`, message];
  if (date) lines.push(`Fecha de entrega: ${date}`);
  const whatsapp = new URL('https://wa.me/573009798063');
  whatsapp.searchParams.set('text', lines.join('\n'));
  window.location.assign(whatsapp.href);
});
contactForm.hidden = false;
