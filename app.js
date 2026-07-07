/* ============================================================
   Monet Lencería · Lógica del sitio
   - Control del menú lateral
   - Catálogo de "Ropa Interior" (subfiltros + ruteo por #hash)
   - Carga de productos desde Supabase
   Requiere que el cliente de Supabase (CDN) se cargue ANTES que este archivo.
   ============================================================ */

/* ---------- Menú lateral ---------- */
const menuOpen = document.getElementById('menu-open');
const menuClose = document.getElementById('menu-close');
const sidebar = document.getElementById('sidebar-menu');
const overlay = document.getElementById('sidebar-overlay');

const toggleMenu = (isOpen) => {
  if (isOpen) {
    sidebar.classList.remove('translate-x-full');
    overlay.classList.remove('opacity-0', 'pointer-events-none');
    document.body.style.overflow = 'hidden';
    sidebar.removeAttribute('inert');
    sidebar.setAttribute('aria-hidden', 'false');
    menuOpen.setAttribute('aria-expanded', 'true');
  } else {
    sidebar.classList.add('translate-x-full');
    overlay.classList.add('opacity-0', 'pointer-events-none');
    document.body.style.overflow = '';
    sidebar.setAttribute('inert', '');
    sidebar.setAttribute('aria-hidden', 'true');
    menuOpen.setAttribute('aria-expanded', 'false');
  }
};

menuOpen.addEventListener('click', () => toggleMenu(true));
menuClose.addEventListener('click', () => toggleMenu(false));
overlay.addEventListener('click', () => toggleMenu(false));

// Cerrar el menú con la tecla Escape
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && !sidebar.classList.contains('translate-x-full')) {
    toggleMenu(false);
  }
});

// Cerrar el menú al elegir una sección
sidebar.querySelectorAll('nav a').forEach((link) => {
  link.addEventListener('click', () => toggleMenu(false));
});

// Año actual en el footer
document.getElementById('current-year').textContent = new Date().getFullYear();

/* ---------- Conexión a Supabase ---------- */
const SUPABASE_URL = 'https://vkzlwwnymsxrkrbdbnbg.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZremx3d255bXN4cmtyYmRibmJnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI4NDM5NDMsImV4cCI6MjA5ODQxOTk0M30.mcpFENj_NZGx8e6Z0XTky0SRMU7Lk7fUMDASa5FlLlY';
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Productos: se llenan desde Supabase al cargar la página.
let products = [];

async function loadProducts() {
  try {
    const { data, error } = await supabaseClient
      .from('productos')
      .select('id,nombre,precio,categoria,subcategoria,img,colores')
      .eq('activo', true)
      .order('creado', { ascending: true });
    if (error) throw error;
    if (data && data.length) {
      products = data.map((r) => ({
        id: r.id,
        nombre: r.nombre,
        precio: r.precio,
        categoria: r.categoria,
        sub: r.subcategoria,
        img: r.img,
        colores: Array.isArray(r.colores) ? r.colores : [],
      }));
    }
  } catch (e) {
    console.warn('No se pudieron cargar los productos desde Supabase:', e.message || e);
  }
}

/* ---------- Catálogo ----------
   SECCIONES define cada vista del catálogo:
   - titulo:     encabezado que se muestra.
   - filtrarPor: qué productos pertenecen a la sección (null = todos).
   - agruparPor: campo del producto con el que se arman los subfiltros.
   Para sumar una sección nueva (ej. una página solo de Bodys), se agrega
   una entrada acá y un link con href="#<clave>". Nada más.                 */
const SECCIONES = {
  'coleccion': {
    titulo: 'La Colección',
    filtrarPor: null,
    agruparPor: 'categoria',
    // Categorías que se muestran siempre como filtro (estén o no con productos):
    subfiltros: ['ropa-interior', 'bodys', 'pijamas', 'pantuflas', 'ropa-deportiva']
  },
  'ropa-interior': {
    titulo: 'Ropa Interior',
    filtrarPor: { campo: 'categoria', valor: 'ropa-interior' },
    agruparPor: 'sub',
    subfiltros: ['corpinos', 'bombachas', 'medias']
  }
};

// Etiquetas lindas para las claves; si falta una, se genera automáticamente.
const ETIQUETAS = {
  'ropa-interior': 'Ropa Interior',
  'bodys': 'Bodys',
  'pijamas': 'Pijamas',
  'pantuflas': 'Pantuflas',
  'ropa-deportiva': 'Ropa Deportiva',
  'corpinos': 'Corpiños',
  'bombachas': 'Bombachas',
  'medias': 'Medias'
};
const etiqueta = (clave) =>
  ETIQUETAS[clave] || clave.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

const homeView    = document.getElementById('home-view');
const catalogView = document.getElementById('catalog-view');
const catalogTitle = document.getElementById('catalog-title');
const filtersBox  = document.getElementById('catalog-filters');
const gridBox     = document.getElementById('catalog-grid');
const emptyMsg    = document.getElementById('catalog-empty');

// Productos que pertenecen a una sección (antes de aplicar subfiltro).
const productosDeSeccion = (seccion) => {
  if (!seccion.filtrarPor) return products;
  const { campo, valor } = seccion.filtrarPor;
  return products.filter((p) => p[campo] === valor);
};

const formatPrice = (n) => '$' + n.toLocaleString('es-AR');

const dotsHTML = (colores) => colores.map((c) =>
  `<span class="w-4 h-4 rounded-full cursor-pointer border border-transparent hover:border-black" style="background:${c}"></span>`
).join('');

const cardHTML = (p) => `
  <div class="bg-white group" data-purpose="product-card" data-id="${p.id}">
    <div class="relative overflow-hidden aspect-[3/4]">
      <img alt="${p.nombre}" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" src="${p.img}"/>
      <button aria-label="Agregar a favoritos" class="absolute top-4 right-4 bg-white/80 p-2 rounded-full hover:bg-white transition-colors">
        <svg class="w-4 h-4 text-brand-pink" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"></path></svg>
      </button>
    </div>
    <div class="p-4 md:p-6 text-center">
      <h3 class="text-xs uppercase tracking-wider mb-2">${p.nombre}</h3>
      <p class="font-bold text-lg mb-4">${formatPrice(p.precio)}</p>
      <button class="js-ver-opciones w-full bg-brand-pink/40 hover:bg-brand-pink text-brand-text hover:text-white py-2 text-[10px] uppercase font-bold tracking-widest transition-colors mb-4">VER OPCIONES</button>
      <div class="flex justify-center space-x-2">${dotsHTML(p.colores)}</div>
    </div>
  </div>`;

// Subfiltros de una sección: 'Todo' + los definidos (siempre visibles) +
// cualquier valor extra que aparezca en los datos pero no esté en la lista.
const subfiltrosDe = (claveSeccion) => {
  const seccion = SECCIONES[claveSeccion];
  const definidos = seccion.subfiltros || [];
  const enDatos = [...new Set(productosDeSeccion(seccion).map((p) => p[seccion.agruparPor]))];
  const extra = enDatos.filter((v) => v && !definidos.includes(v));
  return ['todo', ...definidos, ...extra];
};

const renderFilters = (claveSeccion, active) => {
  filtersBox.innerHTML = subfiltrosDe(claveSeccion).map((key) => {
    const isActive = key === active;
    const cls = isActive
      ? 'bg-brand-pink text-white border border-brand-pink'
      : 'bg-white text-brand-text border border-brand-pink hover:bg-brand-pinkLight';
    const label = key === 'todo' ? 'Todo' : etiqueta(key);
    return `<a href="#${claveSeccion}/${key}" class="px-5 py-2 rounded-full text-[10px] md:text-xs uppercase font-bold tracking-widest transition-colors ${cls}">${label}</a>`;
  }).join('');
};

// Pinta una lista de productos en la grilla (lo usan el catálogo y la búsqueda).
const renderItems = (items) => {
  gridBox.innerHTML = items.map(cardHTML).join('');
  emptyMsg.classList.toggle('hidden', items.length > 0);
};

const renderGrid = (claveSeccion, sub) => {
  const seccion = SECCIONES[claveSeccion];
  const base = productosDeSeccion(seccion);
  const items = sub === 'todo' ? base : base.filter((p) => p[seccion.agruparPor] === sub);
  renderItems(items);
};

const showHome = () => {
  catalogView.classList.add('hidden');
  homeView.classList.remove('hidden');
};

const showCatalog = (claveSeccion, sub) => {
  const valid = subfiltrosDe(claveSeccion).includes(sub) ? sub : 'todo';
  catalogTitle.textContent = SECCIONES[claveSeccion].titulo;
  emptyMsg.textContent = 'Todavía no hay productos para mostrar.';
  homeView.classList.add('hidden');
  catalogView.classList.remove('hidden');
  renderFilters(claveSeccion, valid);
  renderGrid(claveSeccion, valid);
};

// Ruteo por hash: #coleccion  |  #ropa-interior/corpinos
const handleRoute = () => {
  const hash = window.location.hash.replace(/^#/, '');
  const [seccion, sub] = hash.split('/');
  if (SECCIONES[seccion]) {
    showCatalog(seccion, sub || 'todo');
    window.scrollTo({ top: 0 });
  } else {
    showHome();
  }
};

document.getElementById('catalog-back').addEventListener('click', () => {
  history.pushState('', document.title, window.location.pathname + window.location.search);
  showHome();
});

/* ============================================================
   Detalle de producto, carrito (localStorage) y búsqueda
   ============================================================ */

/* ---------- Abrir "VER OPCIONES" desde cualquier tarjeta (catálogo u home) ---------- */
document.addEventListener('click', (e) => {
  if (!e.target.closest('.js-ver-opciones')) return;
  const card = e.target.closest('[data-purpose="product-card"]');
  if (!card) return;
  const prod = products.find((p) => String(p.id) === card.dataset.id);
  if (prod) openProductModal(prod);
});

/* ---------- Modal de detalle ---------- */
const productModal    = document.getElementById('product-modal');
const modalImg        = document.getElementById('modal-img');
const modalName       = document.getElementById('modal-name');
const modalPrice      = document.getElementById('modal-price');
const modalColors     = document.getElementById('modal-colors');
const modalColorsWrap = document.getElementById('modal-colors-wrap');
const modalQty        = document.getElementById('modal-qty');

let modalProduct = null;
let modalColor = null;
let modalCantidad = 1;

const renderModalColors = () => {
  if (!modalProduct.colores.length) {
    modalColorsWrap.classList.add('hidden');
    modalColors.innerHTML = '';
    return;
  }
  modalColorsWrap.classList.remove('hidden');
  modalColors.innerHTML = modalProduct.colores.map((c) => {
    const sel = c === modalColor;
    return `<button data-color="${c}" class="w-7 h-7 rounded-full border-2 transition-transform ${sel ? 'border-brand-text scale-110' : 'border-gray-200 hover:scale-110'}" style="background:${c}" aria-label="Color"></button>`;
  }).join('');
};

const openProductModal = (prod) => {
  modalProduct = prod;
  modalColor = prod.colores[0] || null;
  modalCantidad = 1;
  modalImg.src = prod.img || '';
  modalImg.alt = prod.nombre;
  modalName.textContent = prod.nombre;
  modalPrice.textContent = formatPrice(prod.precio);
  modalQty.textContent = modalCantidad;
  renderModalColors();
  productModal.classList.remove('hidden');
  document.body.style.overflow = 'hidden';
};

const closeProductModal = () => {
  productModal.classList.add('hidden');
  document.body.style.overflow = '';
};

modalColors.addEventListener('click', (e) => {
  const btn = e.target.closest('[data-color]');
  if (!btn) return;
  modalColor = btn.dataset.color;
  renderModalColors();
});

document.getElementById('modal-qty-minus').addEventListener('click', () => {
  modalCantidad = Math.max(1, modalCantidad - 1);
  modalQty.textContent = modalCantidad;
});
document.getElementById('modal-qty-plus').addEventListener('click', () => {
  modalCantidad += 1;
  modalQty.textContent = modalCantidad;
});

document.getElementById('modal-add').addEventListener('click', () => {
  if (!modalProduct) return;
  addToCart(modalProduct, modalColor, modalCantidad);
  closeProductModal();
  toggleCart(true);
});

document.getElementById('modal-close').addEventListener('click', closeProductModal);
productModal.addEventListener('click', (e) => {
  if (e.target === productModal) closeProductModal();
});

/* ---------- Carrito (persistido en localStorage) ---------- */
const CART_KEY = 'monet_cart';
const cartDrawer     = document.getElementById('cart-drawer');
const cartOverlay    = document.getElementById('cart-overlay');
const cartItemsBox   = document.getElementById('cart-items');
const cartEmpty      = document.getElementById('cart-empty');
const cartSubtotal   = document.getElementById('cart-subtotal');
const cartCountBadge = document.getElementById('cart-count');

const getCart = () => {
  try { return JSON.parse(localStorage.getItem(CART_KEY)) || []; }
  catch { return []; }
};
const saveCart = (cart) => {
  localStorage.setItem(CART_KEY, JSON.stringify(cart));
  updateCartUI();
};

const lineKey = (id, color) => `${id}::${color || ''}`;

const addToCart = (prod, color, cantidad) => {
  const cart = getCart();
  const key = lineKey(prod.id, color);
  const existing = cart.find((l) => lineKey(l.id, l.color) === key);
  if (existing) {
    existing.cantidad += cantidad;
  } else {
    cart.push({ id: prod.id, nombre: prod.nombre, precio: prod.precio, img: prod.img, color, cantidad });
  }
  saveCart(cart);
};

const setQty = (key, cantidad) => {
  const cart = getCart()
    .map((l) => (lineKey(l.id, l.color) === key ? { ...l, cantidad } : l))
    .filter((l) => l.cantidad > 0);
  saveCart(cart);
};

const removeLine = (key) => {
  saveCart(getCart().filter((l) => lineKey(l.id, l.color) !== key));
};

const cartCount = () => getCart().reduce((n, l) => n + l.cantidad, 0);
const cartTotal = () => getCart().reduce((n, l) => n + l.precio * l.cantidad, 0);

const cartLineHTML = (l) => {
  const key = lineKey(l.id, l.color);
  const swatch = l.color
    ? `<span class="inline-block w-3 h-3 rounded-full align-middle mr-1" style="background:${l.color}"></span>Color`
    : '';
  return `
  <div class="flex gap-3 py-4 border-b border-gray-100" data-key="${key}">
    <img src="${l.img || ''}" alt="${l.nombre}" class="w-16 h-20 object-cover rounded bg-brand-pinkLight shrink-0"/>
    <div class="flex-1 flex flex-col min-w-0">
      <div class="flex justify-between items-start gap-2">
        <h4 class="text-xs uppercase tracking-wider">${l.nombre}</h4>
        <button class="js-cart-remove text-gray-300 hover:text-red-400" aria-label="Quitar">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"></path></svg>
        </button>
      </div>
      ${swatch ? `<p class="text-[10px] text-gray-400 mt-1">${swatch}</p>` : ''}
      <div class="flex justify-between items-center mt-auto pt-2">
        <div class="flex items-center border border-gray-200 rounded">
          <button class="js-cart-minus w-7 h-7 text-gray-500 hover:text-black" aria-label="Restar">−</button>
          <span class="w-7 text-center text-xs">${l.cantidad}</span>
          <button class="js-cart-plus w-7 h-7 text-gray-500 hover:text-black" aria-label="Sumar">+</button>
        </div>
        <span class="text-sm font-bold">${formatPrice(l.precio * l.cantidad)}</span>
      </div>
    </div>
  </div>`;
};

const renderCart = () => {
  const cart = getCart();
  cartItemsBox.innerHTML = cart.map(cartLineHTML).join('');
  cartEmpty.classList.toggle('hidden', cart.length > 0);
  cartSubtotal.textContent = formatPrice(cartTotal());
};

const updateCartUI = () => {
  const n = cartCount();
  cartCountBadge.textContent = n;
  cartCountBadge.classList.toggle('hidden', n === 0);
  renderCart();
};

const toggleCart = (isOpen) => {
  if (isOpen) {
    cartDrawer.classList.remove('translate-x-full');
    cartOverlay.classList.remove('opacity-0', 'pointer-events-none');
    document.body.style.overflow = 'hidden';
    cartDrawer.removeAttribute('inert');
    cartDrawer.setAttribute('aria-hidden', 'false');
  } else {
    cartDrawer.classList.add('translate-x-full');
    cartOverlay.classList.add('opacity-0', 'pointer-events-none');
    document.body.style.overflow = '';
    cartDrawer.setAttribute('inert', '');
    cartDrawer.setAttribute('aria-hidden', 'true');
  }
};

document.getElementById('cart-open').addEventListener('click', () => toggleCart(true));
document.getElementById('cart-close').addEventListener('click', () => toggleCart(false));
cartOverlay.addEventListener('click', () => toggleCart(false));

cartItemsBox.addEventListener('click', (e) => {
  const row = e.target.closest('[data-key]');
  if (!row) return;
  const key = row.dataset.key;
  const line = getCart().find((l) => lineKey(l.id, l.color) === key);
  if (!line) return;
  if (e.target.closest('.js-cart-remove')) removeLine(key);
  else if (e.target.closest('.js-cart-plus')) setQty(key, line.cantidad + 1);
  else if (e.target.closest('.js-cart-minus')) setQty(key, line.cantidad - 1);
});

/* ---------- Búsqueda en vivo ---------- */
const searchBar = document.getElementById('search-bar');
const searchInput = document.getElementById('search-input');

const showSearchResults = (term) => {
  const q = term.trim().toLowerCase();
  const items = q ? products.filter((p) => p.nombre.toLowerCase().includes(q)) : [];
  catalogTitle.textContent = q ? `Resultados: "${term.trim()}"` : 'Buscar';
  emptyMsg.textContent = q ? 'No encontramos productos con ese nombre.' : 'Escribí algo para buscar.';
  filtersBox.innerHTML = '';
  homeView.classList.add('hidden');
  catalogView.classList.remove('hidden');
  renderItems(items);
};

const openSearch = () => {
  searchBar.classList.remove('hidden');
  searchInput.focus();
};
const closeSearch = () => {
  searchBar.classList.add('hidden');
  searchInput.value = '';
  emptyMsg.textContent = 'Todavía no hay productos para mostrar.';
  handleRoute(); // vuelve a la vista que corresponde al hash actual
};

document.getElementById('search-open').addEventListener('click', openSearch);
document.getElementById('search-close').addEventListener('click', closeSearch);
searchInput.addEventListener('input', () => showSearchResults(searchInput.value));

/* ---------- Escape cierra modal / carrito / búsqueda ---------- */
document.addEventListener('keydown', (e) => {
  if (e.key !== 'Escape') return;
  if (!productModal.classList.contains('hidden')) closeProductModal();
  else if (!cartDrawer.classList.contains('translate-x-full')) toggleCart(false);
  else if (!searchBar.classList.contains('hidden')) closeSearch();
});

/* ---------- "Los Más Elegidos" del home (los 3 más recientes) ---------- */
const homeProducts = document.getElementById('home-products');
const bestSellers = document.getElementById('best-sellers');

const renderHome = () => {
  const destacados = products.slice(-3).reverse(); // los últimos cargados, primero el más nuevo
  homeProducts.innerHTML = destacados.map(cardHTML).join('');
  bestSellers.classList.toggle('hidden', destacados.length === 0);
};

/* ---------- Arranque ---------- */
window.addEventListener('hashchange', handleRoute);
updateCartUI();
loadProducts().finally(() => {
  handleRoute();
  renderHome();
});
