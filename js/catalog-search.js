const searchField = document.querySelector('#buscar');
const occasionField = document.querySelector('#ocasion');
const budgetField = document.querySelector('#presupuesto');
const budgetNote = document.querySelector('#budget-note');
const searchStatus = document.querySelector('#search-status');

function normalize(text) {
  return text.toLowerCase().normalize('NFD').replace(/\p{M}/gu, '');
}

const listings = [...document.querySelectorAll('.listing')].map(element => ({
  element,
  text: normalize(element.textContent),
  occasions: element.dataset.occasion.split(' '),
  price: element.dataset.price ? Number(element.dataset.price) : Infinity
}));

function filterCatalog() {
  const terms = normalize(searchField.value).trim().split(/\s+/).filter(Boolean);
  const occasion = occasionField.value;
  const budget = Number(budgetField.value);
  let count = 0;

  for (const {element, text, occasions, price} of listings) {
    const matches = terms.every(term => text.includes(term))
      && (!occasion || occasions.includes(occasion))
      && (!budget || price <= budget);
    element.hidden = !matches;
    if (matches) count++;
  }

  budgetNote.hidden = !budget;
  searchStatus.hidden = !(terms.length || occasion || budget);
  searchStatus.textContent = count
    ? `${count} ${count === 1 ? 'regalo encontrado' : 'regalos encontrados'}`
    : 'No encontramos regalos con estos filtros.';
}

const query = new URLSearchParams(location.search);
searchField.value = query.get('q') ?? '';
for (const field of [occasionField, budgetField]) {
  const value = query.get(field.name);
  if ([...field.options].some(option => option.value === value)) field.value = value;
  field.addEventListener('change', filterCatalog);
}
searchField.addEventListener('input', filterCatalog);
filterCatalog();
if (location.hash === '#buscar') searchField.focus();
