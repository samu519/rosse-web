const dialog = document.querySelector('.photo-viewer');
const tiles = [...document.querySelectorAll('.photo-grid a')];
const photo = dialog.querySelector('.photo-full');
const title = dialog.querySelector('#photo-title');
const category = dialog.querySelector('.photo-category');
const product = dialog.querySelector('.photo-product');
const count = dialog.querySelector('.photo-count');
let index = 0;

function showPhoto(position) {
  index = (position + tiles.length) % tiles.length;
  const tile = tiles[index];
  const thumbnail = tile.querySelector('img');
  photo.src = thumbnail.src;
  photo.alt = thumbnail.alt;
  title.textContent = thumbnail.alt;
  category.textContent = tile.dataset.category;
  product.href = tile.href;
  count.textContent = `${index + 1} / ${tiles.length}`;
}

if (typeof dialog.showModal === 'function') {
  tiles.forEach((tile, position) => {
    tile.setAttribute('aria-haspopup', 'dialog');
    tile.addEventListener('click', event => {
      if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
      event.preventDefault();
      showPhoto(position);
      dialog.showModal();
    });
  });

  dialog.querySelectorAll('[data-step]').forEach(button => {
    button.addEventListener('click', () => showPhoto(index + Number(button.dataset.step)));
  });

  dialog.addEventListener('keydown', event => {
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      event.preventDefault();
      showPhoto(index + (event.key === 'ArrowLeft' ? -1 : 1));
    }
  });

  dialog.addEventListener('click', event => {
    if (event.target === dialog) dialog.close();
  });
}
