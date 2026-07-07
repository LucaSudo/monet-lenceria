/* ============================================================
   Monet Lencería · Panel de administración
   - Login con Supabase Auth
   - CRUD de productos
   - Subida de imágenes a Supabase Storage
   ============================================================ */

const SUPABASE_URL = 'https://vkzlwwnymsxrkrbdbnbg.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZremx3d255bXN4cmtyYmRibmJnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI4NDM5NDMsImV4cCI6MjA5ODQxOTk0M30.mcpFENj_NZGx8e6Z0XTky0SRMU7Lk7fUMDASa5FlLlY';
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const BUCKET = 'productos';

/* ---------- Taxonomía (debe coincidir con la tienda) ---------- */
const TAXONOMIA = {
  'ropa-interior': ['corpinos', 'bombachas', 'medias'],
  'bodys': ['general'],
  'pijamas': ['general'],
  'pantuflas': ['general'],
  'ropa-deportiva': ['general']
};
const ETIQUETAS = {
  'ropa-interior': 'Ropa Interior', 'bodys': 'Bodys', 'pijamas': 'Pijamas',
  'pantuflas': 'Pantuflas', 'ropa-deportiva': 'Ropa Deportiva',
  'corpinos': 'Corpiños', 'bombachas': 'Bombachas', 'medias': 'Medias', 'general': 'General'
};
const etiqueta = (k) => ETIQUETAS[k] || k.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
const formatPrice = (n) => '$' + Number(n).toLocaleString('es-AR');

/* ---------- Referencias DOM ---------- */
const loginView   = document.getElementById('login-view');
const panelView   = document.getElementById('panel-view');
const loginForm   = document.getElementById('login-form');
const loginError  = document.getElementById('login-error');
const adminEmail  = document.getElementById('admin-email');
const productList = document.getElementById('product-list');
const listEmpty   = document.getElementById('list-empty');

const formModal   = document.getElementById('form-modal');
const productForm = document.getElementById('product-form');
const formTitle   = document.getElementById('form-title');
const formError   = document.getElementById('form-error');
const fId         = document.getElementById('form-id');
const fNombre     = document.getElementById('form-nombre');
const fPrecio     = document.getElementById('form-precio');
const fCategoria  = document.getElementById('form-categoria');
const fSubcategoria = document.getElementById('form-subcategoria');
const fColorInput = document.getElementById('form-color-input');
const fColors     = document.getElementById('form-colors');
const fImg        = document.getElementById('form-img');
const fImgPreview = document.getElementById('form-img-preview');
const fActivo     = document.getElementById('form-activo');
const formSubmit  = document.getElementById('form-submit');

/* ============================================================
   AUTENTICACIÓN
   ============================================================ */
const showLogin = () => {
  panelView.classList.add('hidden');
  loginView.classList.remove('hidden');
};
const showPanel = (email) => {
  loginView.classList.add('hidden');
  panelView.classList.remove('hidden');
  adminEmail.textContent = email || '';
  loadProducts();
};

loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  loginError.classList.add('hidden');
  document.getElementById('login-submit').disabled = true;
  const email = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value;
  const { error } = await supabaseClient.auth.signInWithPassword({ email, password });
  document.getElementById('login-submit').disabled = false;
  if (error) {
    loginError.textContent = 'No pudimos ingresar: ' + error.message;
    loginError.classList.remove('hidden');
  }
  // Si está OK, onAuthStateChange muestra el panel.
});

document.getElementById('logout-btn').addEventListener('click', () => supabaseClient.auth.signOut());

// Estado inicial + reacción a login/logout
supabaseClient.auth.getSession().then(({ data }) => {
  if (data.session) showPanel(data.session.user.email);
  else showLogin();
});
supabaseClient.auth.onAuthStateChange((_event, session) => {
  if (session) showPanel(session.user.email);
  else showLogin();
});

/* ============================================================
   LISTADO DE PRODUCTOS
   ============================================================ */
async function loadProducts() {
  const { data, error } = await supabaseClient
    .from('productos')
    .select('*')
    .order('creado', { ascending: false });
  if (error) {
    productList.innerHTML = `<p class="p-6 text-sm text-red-500">Error al cargar: ${error.message}</p>`;
    return;
  }
  renderList(data || []);
}

const dotsHTML = (colores) => (colores || []).map((c) =>
  `<span class="inline-block w-3 h-3 rounded-full border border-gray-200" style="background:${c}"></span>`
).join('');

const rowHTML = (p) => `
  <div class="flex items-center gap-4 p-4" data-id="${p.id}">
    <img src="${p.img || ''}" alt="" class="w-14 h-16 object-cover rounded bg-brand-pinkLight shrink-0"/>
    <div class="flex-1 min-w-0">
      <div class="flex items-center gap-2">
        <h4 class="text-sm font-semibold truncate">${p.nombre}</h4>
        ${p.activo ? '' : '<span class="text-[9px] uppercase tracking-widest bg-gray-100 text-gray-400 px-2 py-0.5 rounded">Oculto</span>'}
      </div>
      <p class="text-xs text-gray-400">${etiqueta(p.categoria)} · ${etiqueta(p.subcategoria)}</p>
      <div class="flex items-center gap-2 mt-1">${dotsHTML(p.colores)}</div>
    </div>
    <div class="text-sm font-bold whitespace-nowrap">${formatPrice(p.precio)}</div>
    <div class="flex items-center gap-1 shrink-0">
      <button class="js-toggle p-2 text-gray-400 hover:text-brand-pink" title="${p.activo ? 'Ocultar' : 'Mostrar'}" aria-label="Activar/Desactivar">
        ${p.activo
          ? '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" stroke-width="1.5"/><path d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" stroke-width="1.5"/></svg>'
          : '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>'}
      </button>
      <button class="js-edit p-2 text-gray-400 hover:text-brand-pink" aria-label="Editar">
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"/></svg>
      </button>
      <button class="js-delete p-2 text-gray-400 hover:text-red-500" aria-label="Borrar">
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"/></svg>
      </button>
    </div>
  </div>`;

function renderList(items) {
  productList.innerHTML = items.map(rowHTML).join('');
  listEmpty.classList.toggle('hidden', items.length > 0);
  productList.classList.toggle('hidden', items.length === 0);
}

// Acciones de cada fila (delegación)
productList.addEventListener('click', async (e) => {
  const row = e.target.closest('[data-id]');
  if (!row) return;
  const id = row.dataset.id;
  if (e.target.closest('.js-edit')) {
    const { data } = await supabaseClient.from('productos').select('*').eq('id', id).single();
    if (data) openForm(data);
  } else if (e.target.closest('.js-toggle')) {
    const { data } = await supabaseClient.from('productos').select('activo').eq('id', id).single();
    await supabaseClient.from('productos').update({ activo: !data.activo }).eq('id', id);
    loadProducts();
  } else if (e.target.closest('.js-delete')) {
    if (confirm('¿Borrar este producto definitivamente?')) {
      await supabaseClient.from('productos').delete().eq('id', id);
      loadProducts();
    }
  }
});

/* ============================================================
   FORMULARIO (crear / editar)
   ============================================================ */
let formColores = [];

// Poblar el desplegable de categorías una sola vez
fCategoria.innerHTML = Object.keys(TAXONOMIA)
  .map((k) => `<option value="${k}">${etiqueta(k)}</option>`).join('');

const fillSubcategorias = (categoria, seleccion) => {
  const subs = TAXONOMIA[categoria] || ['general'];
  fSubcategoria.innerHTML = subs.map((s) => `<option value="${s}">${etiqueta(s)}</option>`).join('');
  if (seleccion && subs.includes(seleccion)) fSubcategoria.value = seleccion;
};
fCategoria.addEventListener('change', () => fillSubcategorias(fCategoria.value));

const renderFormColors = () => {
  fColors.innerHTML = formColores.map((c, i) =>
    `<span class="inline-flex items-center gap-1 border border-gray-200 rounded-full pl-1 pr-2 py-1">
       <span class="w-4 h-4 rounded-full" style="background:${c}"></span>
       <button type="button" data-i="${i}" class="js-color-del text-gray-400 hover:text-red-500 text-xs leading-none">✕</button>
     </span>`
  ).join('');
};
document.getElementById('form-color-add').addEventListener('click', () => {
  const c = fColorInput.value;
  if (!formColores.includes(c)) { formColores.push(c); renderFormColors(); }
});
fColors.addEventListener('click', (e) => {
  const btn = e.target.closest('.js-color-del');
  if (!btn) return;
  formColores.splice(Number(btn.dataset.i), 1);
  renderFormColors();
});

// Vista previa al elegir archivo
fImg.addEventListener('change', () => {
  const file = fImg.files[0];
  if (file) {
    fImgPreview.src = URL.createObjectURL(file);
    fImgPreview.classList.remove('hidden');
  }
});

let editingImg = null; // URL de la imagen actual al editar

function openForm(product) {
  formError.classList.add('hidden');
  productForm.reset();
  if (product) {
    formTitle.textContent = 'Editar producto';
    fId.value = product.id;
    fNombre.value = product.nombre;
    fPrecio.value = product.precio;
    fCategoria.value = product.categoria;
    fillSubcategorias(product.categoria, product.subcategoria);
    formColores = Array.isArray(product.colores) ? [...product.colores] : [];
    fActivo.checked = product.activo;
    editingImg = product.img || null;
    if (editingImg) { fImgPreview.src = editingImg; fImgPreview.classList.remove('hidden'); }
    else fImgPreview.classList.add('hidden');
  } else {
    formTitle.textContent = 'Nuevo producto';
    fId.value = '';
    fCategoria.value = Object.keys(TAXONOMIA)[0];
    fillSubcategorias(fCategoria.value);
    formColores = [];
    fActivo.checked = true;
    editingImg = null;
    fImgPreview.classList.add('hidden');
  }
  renderFormColors();
  formModal.classList.remove('hidden');
  document.body.style.overflow = 'hidden';
}

function closeForm() {
  formModal.classList.add('hidden');
  document.body.style.overflow = '';
}

document.getElementById('new-product-btn').addEventListener('click', () => openForm(null));
document.getElementById('form-close').addEventListener('click', closeForm);
document.getElementById('form-cancel').addEventListener('click', closeForm);
formModal.addEventListener('click', (e) => { if (e.target === formModal) closeForm(); });

// Subir imagen al bucket y devolver su URL pública
async function uploadImage(file) {
  const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
  const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
  const { error } = await supabaseClient.storage.from(BUCKET).upload(path, file, { cacheControl: '3600', upsert: false });
  if (error) throw error;
  const { data } = supabaseClient.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

productForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  formError.classList.add('hidden');
  formSubmit.disabled = true;
  formSubmit.textContent = 'Guardando…';
  try {
    let img = editingImg;
    if (fImg.files[0]) img = await uploadImage(fImg.files[0]);

    const payload = {
      nombre: fNombre.value.trim(),
      precio: parseInt(fPrecio.value, 10),
      categoria: fCategoria.value,
      subcategoria: fSubcategoria.value,
      colores: formColores,
      activo: fActivo.checked,
      img,
    };

    let error;
    if (fId.value) {
      ({ error } = await supabaseClient.from('productos').update(payload).eq('id', fId.value));
    } else {
      ({ error } = await supabaseClient.from('productos').insert(payload));
    }
    if (error) throw error;

    closeForm();
    loadProducts();
  } catch (err) {
    formError.textContent = 'No se pudo guardar: ' + (err.message || err);
    formError.classList.remove('hidden');
  } finally {
    formSubmit.disabled = false;
    formSubmit.textContent = 'Guardar';
  }
});

// Escape cierra el formulario
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && !formModal.classList.contains('hidden')) closeForm();
});
