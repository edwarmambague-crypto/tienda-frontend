import { productsApi, ApiError } from './api.js';

// ---------- Elementos del DOM ----------
const $ = (id) => document.getElementById(id);
const list = $('productList');
const statusMsg = $('status');
const dialog = $('productDialog');
const form = $('productForm');
const formErrors = $('formErrors');
const toast = $('toast');

const money = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  maximumFractionDigits: 0,
});

// Evita que texto escrito por el usuario se interprete como HTML
const escapeHtml = (text = '') =>
  String(text).replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));

// ---------- Utilidades de interfaz ----------
let toastTimer;
function showToast(message, isError = false) {
  toast.textContent = message;
  toast.className = `toast${isError ? ' error' : ''}`;
  toast.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => (toast.hidden = true), 3500);
}

function showStatus(message, isError = false) {
  statusMsg.textContent = message;
  statusMsg.className = `status${isError ? ' error' : ''}`;
  statusMsg.hidden = !message;
}

// ---------- Pintar productos ----------
function productCard(p) {
  const image = p.imageUrl
    ? `<img src="${escapeHtml(p.imageUrl)}" alt="${escapeHtml(p.name)}"
            onerror="this.parentElement.textContent='📦'">`
    : '📦';

  return `
    <article class="card">
      <div class="card-img">${image}</div>
      <div class="card-body">
        <span class="id-tag">ID: ${p.id}</span>
        <h3>${escapeHtml(p.name)}</h3>
        <span class="badge">${escapeHtml(p.category)}</span>
        <p class="card-desc">${escapeHtml(p.description || 'Sin descripción')}</p>
        <span class="price">${money.format(p.price)}</span>
        <span class="stock ${p.stock <= 5 ? 'low' : ''}">
          ${p.stock === 0 ? 'Agotado' : `Stock: ${p.stock}`}
        </span>
      </div>
      <div class="card-actions">
        <button class="btn btn-secondary" data-action="edit" data-id="${p.id}">Editar</button>
        <button class="btn btn-danger" data-action="delete" data-id="${p.id}">Eliminar</button>
      </div>
    </article>`;
}

function renderProducts(products) {
  list.innerHTML = products.map(productCard).join('');
  showStatus(products.length ? '' : 'No hay productos todavía. ¡Crea el primero!');
}

// ---------- Cargar datos ----------
async function loadProducts() {
  showStatus('Cargando productos...');
  try {
    renderProducts(await productsApi.getAll());
  } catch (err) {
    list.innerHTML = '';
    showStatus(err.message, true);
  }
}

// ---------- Buscar por id ----------
$('searchForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const id = $('searchId').value;
  try {
    const product = await productsApi.getById(id);
    renderProducts([product]);
  } catch (err) {
    list.innerHTML = '';
    showStatus(err.message, true);
  }
});

$('btnShowAll').addEventListener('click', () => {
  $('searchId').value = '';
  loadProducts();
});

// ---------- Abrir el formulario ----------
function openForm(product = null) {
  form.reset();
  formErrors.hidden = true;
  $('productId').value = product?.id ?? '';
  $('dialogTitle').textContent = product ? `Editar producto #${product.id}` : 'Nuevo producto';

  if (product) {
    $('name').value = product.name;
    $('description').value = product.description ?? '';
    $('price').value = product.price;
    $('stock').value = product.stock;
    $('category').value = product.category;
    $('imageUrl').value = product.imageUrl ?? '';
  }
  dialog.showModal();
}

$('btnNew').addEventListener('click', () => openForm());
$('btnCancel').addEventListener('click', () => dialog.close());

// ---------- Guardar (crear o modificar) ----------
form.addEventListener('submit', async (e) => {
  e.preventDefault();

  const id = $('productId').value;
  const isEdit = Boolean(id);

  const numberOrUndefined = (value) => (value.trim() === '' ? undefined : Number(value));

  const payload = {
    name: $('name').value.trim(),
    description: $('description').value.trim(),
    price: numberOrUndefined($('price').value),
    stock: numberOrUndefined($('stock').value),
    category: $('category').value.trim(),
    imageUrl: $('imageUrl').value.trim(),
  };

  // En creación, no enviamos los campos opcionales vacíos
  if (!isEdit) {
    if (!payload.description) delete payload.description;
    if (!payload.imageUrl) delete payload.imageUrl;
  }

  try {
    if (isEdit) {
      await productsApi.update(id, payload);
      showToast('Producto actualizado ✅');
    } else {
      await productsApi.create(payload);
      showToast('Producto creado ✅');
    }
    dialog.close();
    loadProducts();
  } catch (err) {
    // Muestra los errores de validación que manda el backend
    const messages = err.details?.length ? err.details : [err.message];
    formErrors.innerHTML = messages.map((m) => `<li>${escapeHtml(m)}</li>`).join('');
    formErrors.hidden = false;
  }
});

// ---------- Botones Editar / Eliminar de cada tarjeta ----------
list.addEventListener('click', async (e) => {
  const button = e.target.closest('button[data-action]');
  if (!button) return;

  const { action, id } = button.dataset;

  try {
    if (action === 'edit') {
      const product = await productsApi.getById(id); // usa "consultar por id"
      openForm(product);
    }

    if (action === 'delete') {
      if (!confirm(`¿Eliminar el producto #${id}? Esta acción no se puede deshacer.`)) return;
      await productsApi.remove(id);
      showToast('Producto eliminado 🗑️');
      loadProducts();
    }
  } catch (err) {
    showToast(err.message, true);
  }
});

// ---------- Inicio ----------
loadProducts();