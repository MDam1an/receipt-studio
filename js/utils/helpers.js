// ═══════════════════════════════════════
// helpers.js — Utilities
// ═══════════════════════════════════════

export function formatCurrency(v) {
  return (parseFloat(v) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function formatDate(s) {
  if (!s) return '—';
  const [y, m, d] = s.split('-');
  return `${d}/${m}/${y}`;
}

export function todayISO() {
  return new Date().toISOString().split('T')[0];
}

export function genId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

export function statusLabel(s) {
  return { paid: 'Pago', pending: 'Pendente', partial: 'Parcial', cancelled: 'Cancelado' }[s] || s;
}

export function showToast(msg, type = 'success') {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.className = `toast ${type}`;
  el.classList.remove('hidden');
  clearTimeout(el._t);
  el._t = setTimeout(() => el.classList.add('hidden'), 3200);
}

export function showLoading(v) {
  document.getElementById('loading-overlay')?.classList.toggle('hidden', !v);
}

export function initCEP() {
  const inp = document.getElementById('f-cep');
  if (!inp) return;

  inp.addEventListener('input', () => {
    let v = inp.value.replace(/\D/g, '').slice(0, 8);
    if (v.length > 5) v = v.slice(0, 5) + '-' + v.slice(5);
    inp.value = v;
  });

  inp.addEventListener('blur', async () => {
    const raw = inp.value.replace(/\D/g, '');
    if (raw.length !== 8) return;
    try {
      const r = await fetch(`https://viacep.com.br/ws/${raw}/json/`);
      const d = await r.json();
      if (d.erro) return;
      const s  = document.getElementById('f-street');
      const nb = document.getElementById('f-neighborhood');
      const ct = document.getElementById('f-city');
      if (s  && !s.value)  s.value  = d.logradouro || '';
      if (nb && !nb.value) nb.value = d.bairro     || '';
      if (ct && !ct.value) ct.value = `${d.localidade} - ${d.uf}`;
    } catch {}
  });
}
