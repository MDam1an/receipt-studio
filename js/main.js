// ═══════════════════════════════════════
// main.js — App Controller
// Receipt Studio
// ═══════════════════════════════════════

import {
  onAuth, login, register, logout,
  getReceipts, upsertReceipt, deleteReceipt,
  getBrands, upsertBrand, deleteBrand,
  nextReceiptNumber,
} from './services/firebase.js';

import { formatCurrency, formatDate, genId, showToast, showLoading, statusLabel, todayISO, initCEP } from './utils/helpers.js';
import { renderReceipt }                      from './components/receipt-renderer.js';
import { exportPDF, exportPNG, exportJSON }   from './components/exporter.js';

// ── State ──────────────────────────────
let editingId  = null;
let logoData   = '';
let _brands    = [];
let _receipts  = [];
let _user      = null;

// ═══════════════════════════════════════
// BOOT
// ═══════════════════════════════════════
document.addEventListener('DOMContentLoaded', () => {
  initAuthUI();
  initNav();
  initForm();
  initLogoUpload();
  initExports();
  initSearch();
  initModal();

  onAuth(async user => {
    _user = user;
    if (user) {
      document.getElementById('screen-auth').classList.add('hidden');
      document.getElementById('screen-app').classList.remove('hidden');
      // Update user chip
      const initial = (user.displayName || user.email || '?')[0].toUpperCase();
      document.getElementById('user-avatar').textContent     = initial;
      document.getElementById('user-email-label').textContent = user.email;
      // Load data then render
      showLoading(true);
      await loadAll();
      showLoading(false);
      setView('dashboard');
    } else {
      document.getElementById('screen-auth').classList.remove('hidden');
      document.getElementById('screen-app').classList.add('hidden');
    }
  });
});

async function loadAll() {
  try {
    [_brands, _receipts] = await Promise.all([getBrands(), getReceipts()]);
  } catch (e) {
    console.error('Erro ao carregar dados do Firestore:', e);
    // Continua com arrays vazios — não trava o app
    _brands = []; _receipts = [];
    showToast('Aviso: não foi possível carregar os dados. Verifique as regras do Firestore.', 'error');
  }
  refreshBrandSelects();
}

// ═══════════════════════════════════════
// AUTH UI
// ═══════════════════════════════════════
function initAuthUI() {
  document.getElementById('go-register').addEventListener('click', () => {
    document.getElementById('auth-form-login').classList.add('hidden');
    document.getElementById('auth-form-register').classList.remove('hidden');
  });

  document.getElementById('go-login').addEventListener('click', () => {
    document.getElementById('auth-form-register').classList.add('hidden');
    document.getElementById('auth-form-login').classList.remove('hidden');
  });

  document.getElementById('btn-login').addEventListener('click', async () => {
    const email  = document.getElementById('login-email').value.trim();
    const pass   = document.getElementById('login-password').value;
    const errEl  = document.getElementById('auth-error');
    const btn    = document.getElementById('btn-login');

    if (!email || !pass) {
      errEl.textContent = 'Preencha e-mail e senha.';
      errEl.classList.remove('hidden');
      return;
    }

    btn.textContent = 'Entrando...';
    btn.disabled = true;
    errEl.classList.add('hidden');

    try {
      await login(email, pass);
    } catch (e) {
      errEl.textContent = authErrorMsg(e.code);
      errEl.classList.remove('hidden');
    } finally {
      btn.textContent = 'Entrar';
      btn.disabled = false;
    }
  });

  document.getElementById('btn-register').addEventListener('click', async () => {
    const name   = document.getElementById('reg-name').value.trim();
    const email  = document.getElementById('reg-email').value.trim();
    const pass   = document.getElementById('reg-password').value;
    const errEl  = document.getElementById('reg-error');
    const btn    = document.getElementById('btn-register');

    if (!email || !pass) {
      errEl.textContent = 'Preencha e-mail e senha.';
      errEl.classList.remove('hidden');
      return;
    }
    if (pass.length < 6) {
      errEl.textContent = 'A senha deve ter pelo menos 6 caracteres.';
      errEl.classList.remove('hidden');
      return;
    }

    btn.textContent = 'Criando conta...';
    btn.disabled = true;
    errEl.classList.add('hidden');

    try {
      await register(email, pass);
    } catch (e) {
      errEl.textContent = authErrorMsg(e.code);
      errEl.classList.remove('hidden');
    } finally {
      btn.textContent = 'Criar conta';
      btn.disabled = false;
    }
  });

  document.getElementById('btn-logout').addEventListener('click', async () => {
    await logout();
    _receipts = []; _brands = [];
  });

  // Enter key on inputs
  ['login-email','login-password'].forEach(id => {
    document.getElementById(id).addEventListener('keydown', e => {
      if (e.key === 'Enter') document.getElementById('btn-login').click();
    });
  });
}

function authErrorMsg(code) {
  const map = {
    'auth/invalid-email':           'E-mail inválido.',
    'auth/user-not-found':          'Nenhuma conta com este e-mail.',
    'auth/wrong-password':          'Senha incorreta.',
    'auth/email-already-in-use':    'Este e-mail já está cadastrado.',
    'auth/weak-password':           'Senha fraca — use pelo menos 6 caracteres.',
    'auth/invalid-credential':      'E-mail ou senha incorretos.',
    'auth/too-many-requests':       'Muitas tentativas. Aguarde alguns minutos.',
    'auth/network-request-failed':  'Sem conexão. Verifique sua internet.',
    'auth/operation-not-allowed':   'Login por e-mail não está ativo no Firebase. Ative em Autenticação → Provedores.',
    'auth/user-disabled':           'Esta conta foi desativada.',
  };
  return map[code] || `Erro: ${code}`;
}

// ═══════════════════════════════════════
// NAVIGATION
// ═══════════════════════════════════════
function initNav() {
  document.querySelectorAll('[data-view]').forEach(el => {
    el.addEventListener('click', () => setView(el.dataset.view));
  });

  document.getElementById('brand-filter-select').addEventListener('change', async e => {
    showLoading(true);
    _receipts = await getReceipts(e.target.value);
    showLoading(false);
    if (currentView === 'dashboard') renderDashboard();
    if (currentView === 'receipts')  renderReceiptsView();
  });
}

let currentView = 'dashboard';

function setView(view) {
  currentView = view;
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));

  const vEl = document.getElementById(`view-${view}`);
  const nEl = document.querySelector(`.nav-item[data-view="${view}"]`);
  if (vEl) vEl.classList.add('active');
  if (nEl) nEl.classList.add('active');

  const titles = {
    dashboard:     'Dashboard',
    'new-receipt': editingId ? 'Editar Recibo' : 'Novo Recibo',
    receipts:      'Recibos',
    brands:        'Marcas',
  };
  document.getElementById('page-title').textContent = titles[view] || view;
  document.getElementById('page-subtitle').textContent = '';

  if (view === 'dashboard')    renderDashboard();
  if (view === 'receipts')     renderReceiptsView();
  if (view === 'brands')       renderBrandsView();
  if (view === 'new-receipt' && !editingId) resetForm();
}

// ═══════════════════════════════════════
// DASHBOARD
// ═══════════════════════════════════════
function renderDashboard() {
  document.getElementById('stat-total').textContent  = _receipts.length;
  document.getElementById('stat-brands').textContent = _brands.length;

  const revenue = _receipts.reduce((s, r) => s + (r.total || 0), 0);
  document.getElementById('stat-revenue').textContent = formatCurrency(revenue);

  const now = new Date();
  const monthCount = _receipts.filter(r => {
    if (!r.date) return false;
    const d = new Date(r.date + 'T00:00:00');
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }).length;
  document.getElementById('stat-month').textContent = monthCount;

  const container = document.getElementById('recent-list');
  const recent    = _receipts.slice(0, 6);

  if (!recent.length) {
    container.innerHTML = emptyState('Nenhum recibo ainda. Crie o primeiro!');
    return;
  }
  container.innerHTML = tableHeader() + recent.map(receiptRowHTML).join('');
  bindRowActions('#view-dashboard');
}

// ═══════════════════════════════════════
// RECEIPTS VIEW
// ═══════════════════════════════════════
function renderReceiptsView(query = '', status = '') {
  let list = [..._receipts];
  const q = (document.getElementById('search-receipts')?.value || '').toLowerCase();
  const s = document.getElementById('filter-status')?.value || '';
  const b = document.getElementById('filter-brand')?.value || '';

  if (q) list = list.filter(r =>
    (r.clientName || '').toLowerCase().includes(q) ||
    (r.brandName  || '').toLowerCase().includes(q) ||
    (r.number     || '').toLowerCase().includes(q)
  );
  if (s) list = list.filter(r => r.paymentStatus === s);
  if (b) list = list.filter(r => r.brandName === b);

  const el = document.getElementById('all-receipts-list');
  el.innerHTML = list.length
    ? tableHeader() + list.map(receiptRowHTML).join('')
    : emptyState('Nenhum recibo encontrado.');

  bindRowActions('#view-receipts');
}

function initSearch() {
  document.getElementById('search-receipts').addEventListener('input',  () => renderReceiptsView());
  document.getElementById('filter-status').addEventListener('change',   () => renderReceiptsView());
  document.getElementById('filter-brand').addEventListener('change',    () => renderReceiptsView());
}

// ═══════════════════════════════════════
// BRANDS VIEW
// ═══════════════════════════════════════
function renderBrandsView() {
  const grid = document.getElementById('brands-grid');
  if (!_brands.length) {
    grid.innerHTML = emptyState('Nenhuma marca salva. Preencha os dados da marca ao criar um recibo e clique em "Salvar marca".');
    return;
  }
  grid.innerHTML = _brands.map(b => {
    const count = _receipts.filter(r => r.brandName === b.brandName).length;
    const logo  = b.logoData ? `<img src="${b.logoData}" alt="logo"/>` : '◇';
    return `
      <div class="brand-card">
        <div class="brand-card-top">
          <div class="bc-logo">${logo}</div>
          <div class="bc-info">
            <div class="bc-name">${b.brandName}</div>
            <div class="bc-count">${count} recibo${count !== 1 ? 's' : ''}</div>
          </div>
        </div>
        <div class="brand-card-meta">
          ${b.responsible ? `<div>👤 ${b.responsible}</div>` : ''}
          ${b.contact     ? `<div>📞 ${b.contact}</div>`     : ''}
          ${b.email       ? `<div>✉ ${b.email}</div>`        : ''}
          ${b.instagram   ? `<div>◎ ${b.instagram}</div>`    : ''}
        </div>
        <div class="brand-card-actions">
          <button class="btn btn-ghost sm" data-bedit="${b.id}">Editar</button>
          <button class="btn btn-danger sm" data-bdel="${b.id}">Excluir</button>
        </div>
      </div>`;
  }).join('');

  grid.querySelectorAll('[data-bedit]').forEach(btn => {
    btn.addEventListener('click', () => {
      const b = _brands.find(x => x.id === btn.dataset.bedit);
      if (b) { loadBrandIntoForm(b); editingId = null; setView('new-receipt'); }
    });
  });

  grid.querySelectorAll('[data-bdel]').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (!confirm('Excluir esta marca?')) return;
      showLoading(true);
      await deleteBrand(btn.dataset.bdel);
      _brands = await getBrands();
      showLoading(false);
      renderBrandsView();
      refreshBrandSelects();
      showToast('Marca excluída.');
    });
  });
}

// ═══════════════════════════════════════
// TABLE HELPERS
// ═══════════════════════════════════════
function tableHeader() {
  return `<div class="rt-header">
    <span>Número</span><span>Cliente</span><span>Marca</span>
    <span>Total</span><span>Data</span><span>Status</span><span></span>
  </div>`;
}

function receiptRowHTML(r) {
  const bClass = { paid:'badge-paid', pending:'badge-pending', partial:'badge-partial', cancelled:'badge-cancelled' }[r.paymentStatus] || 'badge-pending';
  return `<div class="rt-row" data-id="${r.id}">
    <span class="rt-num">${r.number || '—'}</span>
    <span class="rt-client">${r.clientName || '—'}</span>
    <span class="rt-brand">${r.brandName || '—'}</span>
    <span class="rt-total">${formatCurrency(r.total || 0)}</span>
    <span class="rt-date">${formatDate(r.date)}</span>
    <span class="badge ${bClass}">${statusLabel(r.paymentStatus)}</span>
    <div class="rt-actions">
      <button class="btn btn-ghost sm" data-action="view"   data-id="${r.id}">Ver</button>
      <button class="btn btn-ghost sm" data-action="edit"   data-id="${r.id}">Editar</button>
      <button class="btn btn-danger sm" data-action="delete" data-id="${r.id}">✕</button>
    </div>
  </div>`;
}

function bindRowActions(scope) {
  document.querySelectorAll(`${scope} [data-action]`).forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      const { action, id } = btn.dataset;
      if (action === 'view')   openViewModal(id);
      if (action === 'edit')   openEdit(id);
      if (action === 'delete') confirmDelete(id);
    });
  });
}

// ═══════════════════════════════════════
// RECEIPT ACTIONS
// ═══════════════════════════════════════
function openEdit(id) {
  const r = _receipts.find(x => x.id === id);
  if (!r) return;
  editingId = id;
  populateForm(r);
  setView('new-receipt');
}

async function confirmDelete(id) {
  const r = _receipts.find(x => x.id === id);
  if (!r) return;
  if (!confirm(`Excluir recibo ${r.number}?`)) return;
  showLoading(true);
  await deleteReceipt(id);
  _receipts = _receipts.filter(x => x.id !== id);
  showLoading(false);
  showToast('Recibo excluído.');
  renderDashboard();
  renderReceiptsView();
}

function openViewModal(id) {
  const r = _receipts.find(x => x.id === id);
  if (!r) return;

  const previewEl = document.createElement('div');
  previewEl.id    = 'receipt-preview';
  previewEl.style.cssText = 'width:420px;';
  previewEl.innerHTML = renderReceipt(r);

  const wrap = document.createElement('div');
  wrap.style.cssText = 'background:#e5e5e3;border-radius:12px;padding:16px;overflow:auto;max-height:65vh;';
  wrap.appendChild(previewEl);

  const actions = document.createElement('div');
  actions.className = 'modal-actions';
  actions.innerHTML = `
    <button class="btn btn-ghost sm" id="mv-pdf">↓ PDF</button>
    <button class="btn btn-ghost sm" id="mv-png">↓ PNG</button>
    <button class="btn btn-ghost sm" id="mv-json">↓ JSON</button>
    <button class="btn btn-outline sm" id="mv-edit">Editar</button>`;

  const content = document.getElementById('modal-content');
  content.innerHTML = '';
  content.appendChild(wrap);
  content.appendChild(actions);

  document.getElementById('modal').classList.remove('hidden');

  document.getElementById('mv-pdf') .onclick = () => exportPDF (previewEl, r.number);
  document.getElementById('mv-png') .onclick = () => exportPNG (previewEl, r.number);
  document.getElementById('mv-json').onclick = () => exportJSON(r, r.number);
  document.getElementById('mv-edit').onclick = () => { closeModal(); openEdit(id); };
}

// ═══════════════════════════════════════
// MODAL
// ═══════════════════════════════════════
function initModal() {
  document.getElementById('modal-close').addEventListener('click', closeModal);
  document.getElementById('modal').addEventListener('click', e => {
    if (e.target === e.currentTarget) closeModal();
  });
}

function closeModal() {
  document.getElementById('modal').classList.add('hidden');
  document.getElementById('modal-content').innerHTML = '';
}

// ═══════════════════════════════════════
// FORM
// ═══════════════════════════════════════
function initForm() {
  initCEP();

  document.getElementById('btn-add-item')     .addEventListener('click', () => addItemRow());
  document.getElementById('btn-save-receipt') .addEventListener('click', saveReceiptHandler);
  document.getElementById('btn-clear-form')   .addEventListener('click', () => { editingId = null; resetForm(); });
  document.getElementById('btn-save-brand')   .addEventListener('click', saveBrandHandler);

  document.getElementById('form-brand-select').addEventListener('change', e => {
    const b = _brands.find(x => x.id === e.target.value);
    if (b) loadBrandIntoForm(b);
  });

  document.getElementById('f-brand-name').addEventListener('blur', async () => {
    if (!editingId) {
      gf('number').value = await nextReceiptNumber(gf('brand-name').value);
    }
  });

  // Live preview
  document.getElementById('view-new-receipt').addEventListener('input',  refreshPreview);
  document.getElementById('view-new-receipt').addEventListener('change', refreshPreview);
}

function gf(id) { return document.getElementById(`f-${id}`); }

const FIELD_IDS = [
  'brand-name','responsible','contact','email','instagram',
  'date','number','client-name','client-phone','client-email',
  'cep','street','neighborhood','city','shipping','discount',
  'payment-method','payment-status','shipping-method','shipping-deadline',
  'policy','notes',
];

function resetForm() {
  FIELD_IDS.forEach(id => {
    const el = gf(id);
    if (!el) return;
    if (el.tagName === 'SELECT') el.selectedIndex = 0;
    else el.value = id === 'date' ? todayISO() : '';
  });
  logoData = '';
  document.getElementById('logo-preview-wrap').innerHTML = `
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12"/></svg>
    <span>Clique ou arraste a logo aqui</span>`;
  document.getElementById('items-list').innerHTML = '';
  addItemRow();
  gf('number').value = 'Preencha a marca...';
  refreshPreview();
}

function populateForm(r) {
  const map = {
    'brand-name': r.brandName, responsible: r.responsible, contact: r.contact,
    email: r.email, instagram: r.instagram, date: r.date, number: r.number,
    'client-name': r.clientName, 'client-phone': r.clientPhone, 'client-email': r.clientEmail,
    cep: r.cep, street: r.street, neighborhood: r.neighborhood, city: r.city,
    shipping: r.shipping, discount: r.discount,
    'payment-method': r.paymentMethod, 'payment-status': r.paymentStatus,
    'shipping-method': r.shippingMethod, 'shipping-deadline': r.shippingDeadline,
    policy: r.policy, notes: r.notes,
  };
  Object.entries(map).forEach(([id, val]) => {
    const el = gf(id);
    if (el && val !== undefined && val !== null) el.value = val;
  });

  logoData = r.logoData || '';
  if (logoData) {
    document.getElementById('logo-preview-wrap').innerHTML = `<img src="${logoData}" alt="Logo"/>`;
  }

  document.getElementById('items-list').innerHTML = '';
  (r.items?.length ? r.items : [{}]).forEach(it => addItemRow(it));
  refreshPreview();
}

function loadBrandIntoForm(b) {
  const map = { 'brand-name': b.brandName, responsible: b.responsible, contact: b.contact, email: b.email, instagram: b.instagram };
  Object.entries(map).forEach(([id, val]) => { if (gf(id) && val) gf(id).value = val; });
  if (b.logoData) {
    logoData = b.logoData;
    document.getElementById('logo-preview-wrap').innerHTML = `<img src="${b.logoData}" alt="Logo"/>`;
  }
  refreshPreview();
}

function collectForm() {
  const items = [];
  document.querySelectorAll('.item-row').forEach(row => {
    const [qtyEl, nameEl, priceEl] = row.querySelectorAll('input');
    const name  = nameEl?.value  || '';
    const qty   = qtyEl?.value   || '0';
    const price = priceEl?.value || '0';
    if (name || parseFloat(qty) > 0) items.push({ qty, name, price });
  });

  const shipping = parseFloat(gf('shipping').value) || 0;
  const discount = parseFloat(gf('discount').value) || 0;
  const subtotal = items.reduce((s, i) => s + (parseFloat(i.qty)||0) * (parseFloat(i.price)||0), 0);
  const total    = subtotal + shipping - discount;

  return {
    id:               editingId || genId(),
    number:           gf('number').value,
    date:             gf('date').value,
    brandName:        gf('brand-name').value,
    responsible:      gf('responsible').value,
    contact:          gf('contact').value,
    email:            gf('email').value,
    instagram:        gf('instagram').value,
    logoData,
    clientName:       gf('client-name').value,
    clientPhone:      gf('client-phone').value,
    clientEmail:      gf('client-email').value,
    cep:              gf('cep').value,
    street:           gf('street').value,
    neighborhood:     gf('neighborhood').value,
    city:             gf('city').value,
    items,
    shipping, discount, subtotal, total,
    paymentMethod:    gf('payment-method').value,
    paymentStatus:    gf('payment-status').value,
    shippingMethod:   gf('shipping-method').value,
    shippingDeadline: gf('shipping-deadline').value,
    policy:           gf('policy').value,
    notes:            gf('notes').value,
    createdAt:        new Date().toISOString(),
  };
}

async function saveReceiptHandler() {
  const data = collectForm();
  if (!data.clientName && !data.brandName) {
    showToast('Preencha pelo menos a marca e o nome do cliente.', 'error');
    return;
  }
  showLoading(true);
  await upsertReceipt(data);
  editingId = data.id;

  // Update local cache
  const idx = _receipts.findIndex(r => r.id === data.id);
  if (idx >= 0) _receipts[idx] = data; else _receipts.unshift(data);

  showLoading(false);
  showToast(`Recibo ${data.number} salvo!`);
  refreshBrandSelects();
}

async function saveBrandHandler() {
  const name = gf('brand-name').value.trim();
  if (!name) { showToast('Informe o nome da marca.', 'error'); return; }

  const existing = _brands.find(b => b.brandName.toLowerCase() === name.toLowerCase());
  const brand = {
    id:          existing?.id || genId(),
    brandName:   name,
    responsible: gf('responsible').value,
    contact:     gf('contact').value,
    email:       gf('email').value,
    instagram:   gf('instagram').value,
    logoData,
  };
  showLoading(true);
  await upsertBrand(brand);
  _brands = await getBrands();
  showLoading(false);
  refreshBrandSelects();
  showToast(`Marca "${name}" salva!`);
}

// ═══════════════════════════════════════
// ITEMS
// ═══════════════════════════════════════
function addItemRow(data = {}) {
  const list = document.getElementById('items-list');

  if (!list.querySelector('.items-head')) {
    const h = document.createElement('div');
    h.className = 'items-head';
    h.innerHTML = '<span>Qtd</span><span>Produto</span><span>Preço unit.</span><span></span>';
    list.prepend(h);
  }

  const row = document.createElement('div');
  row.className = 'item-row';
  row.innerHTML = `
    <input type="number" min="1" value="${data.qty || 1}" placeholder="1"/>
    <input type="text" value="${data.name || ''}" placeholder="Produto"/>
    <input type="number" min="0" step="0.01" value="${data.price || ''}" placeholder="0,00"/>
    <button class="item-del" title="Remover">✕</button>`;
  list.appendChild(row);

  row.querySelector('.item-del').addEventListener('click', () => {
    row.remove();
    if (!list.querySelectorAll('.item-row').length) list.querySelector('.items-head')?.remove();
    refreshPreview();
  });

  row.querySelectorAll('input').forEach(i => i.addEventListener('input', refreshPreview));
}

// ═══════════════════════════════════════
// LOGO UPLOAD
// ═══════════════════════════════════════
function initLogoUpload() {
  const drop  = document.getElementById('logo-drop');
  const input = document.getElementById('f-logo');

  drop.addEventListener('click',     () => input.click());
  drop.addEventListener('dragover',  e  => { e.preventDefault(); drop.style.borderColor = 'var(--border-strong)'; });
  drop.addEventListener('dragleave', () => { drop.style.borderColor = ''; });
  drop.addEventListener('drop',      e  => { e.preventDefault(); drop.style.borderColor = ''; if (e.dataTransfer.files[0]) loadLogo(e.dataTransfer.files[0]); });
  input.addEventListener('change',   () => { if (input.files[0]) loadLogo(input.files[0]); });
}

function loadLogo(file) {
  if (!file.type.startsWith('image/')) { showToast('Use PNG, JPG ou SVG.', 'error'); return; }
  const reader = new FileReader();
  reader.onload = e => {
    logoData = e.target.result;
    document.getElementById('logo-preview-wrap').innerHTML = `<img src="${logoData}" alt="Logo"/>`;
    refreshPreview();
  };
  reader.readAsDataURL(file);
}

// ═══════════════════════════════════════
// PREVIEW
// ═══════════════════════════════════════
function refreshPreview() {
  const el = document.getElementById('receipt-preview');
  if (el) el.innerHTML = renderReceipt(collectForm());
}

// ═══════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════
function initExports() {
  document.getElementById('btn-export-pdf') .addEventListener('click', () => {
    const el = document.getElementById('receipt-preview');
    exportPDF(el, collectForm().number || 'recibo');
  });
  document.getElementById('btn-export-png') .addEventListener('click', () => {
    const el = document.getElementById('receipt-preview');
    exportPNG(el, collectForm().number || 'recibo');
  });
  document.getElementById('btn-export-json').addEventListener('click', () => {
    exportJSON(collectForm(), collectForm().number || 'recibo');
  });
}

// ═══════════════════════════════════════
// BRAND SELECTS
// ═══════════════════════════════════════
function refreshBrandSelects() {
  const formSel = document.getElementById('form-brand-select');
  formSel.innerHTML = '<option value="">Carregar marca salva...</option>' +
    _brands.map(b => `<option value="${b.id}">${b.brandName}</option>`).join('');

  const allNames = [...new Set(_receipts.map(r => r.brandName).filter(Boolean))];

  const topSel = document.getElementById('brand-filter-select');
  topSel.innerHTML = '<option value="">Todas as marcas</option>' +
    allNames.map(n => `<option value="${n}">${n}</option>`).join('');

  const viewSel = document.getElementById('filter-brand');
  if (viewSel) {
    viewSel.innerHTML = '<option value="">Todas as marcas</option>' +
      allNames.map(n => `<option value="${n}">${n}</option>`).join('');
  }
}

// ═══════════════════════════════════════
// UTILS
// ═══════════════════════════════════════
function emptyState(msg) {
  return `<div class="empty-state">
    <div class="empty-icon">◈</div>
    <p>${msg}</p>
  </div>`;
}
