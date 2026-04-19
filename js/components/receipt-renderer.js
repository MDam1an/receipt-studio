// ═══════════════════════════════════════
// receipt-renderer.js — HTML Template
// ═══════════════════════════════════════

import { formatCurrency, formatDate, statusLabel } from '../utils/helpers.js';

const STATUS = {
  paid:      ['paid',      'Pago'],
  pending:   ['pending',   'Aguardando Pagamento'],
  partial:   ['partial',   'Parcial'],
  cancelled: ['cancelled', 'Cancelado'],
};

export function renderReceipt(d = {}) {
  const {
    number = '#0001', date = '', brandName = '', responsible = '',
    contact = '', email = '', instagram = '', logoData = '',
    clientName = '', clientPhone = '', clientEmail = '',
    street = '', neighborhood = '', city = '', cep = '',
    items = [], shipping = 0, discount = 0,
    paymentMethod = 'PIX', paymentStatus = 'paid',
    shippingMethod = '', shippingDeadline = '',
    policy = '', notes = '',
  } = d;

  const subtotal = items.reduce((s, i) => s + (parseFloat(i.qty)||0) * (parseFloat(i.price)||0), 0);
  const total    = subtotal + (parseFloat(shipping)||0) - (parseFloat(discount)||0);
  const [stClass, stLabel] = STATUS[paymentStatus] || STATUS.paid;
  const addr = [street, neighborhood, city, cep].filter(Boolean).join(' · ');

  const logoHtml = logoData
    ? `<img class="rd-logo-img" src="${logoData}" alt="Logo"/>`
    : '';

  const contactLines = [
    contact    && contact,
    email      && email,
    instagram  && instagram,
  ].filter(Boolean).join('<br>');

  const itemRows = items.length
    ? items.map(i => {
        const qty   = parseFloat(i.qty)   || 0;
        const price = parseFloat(i.price) || 0;
        return `<tr>
          <td>${qty}×</td>
          <td>${i.name || '—'}</td>
          <td>${formatCurrency(price)}</td>
          <td>${formatCurrency(qty * price)}</td>
        </tr>`;
      }).join('')
    : `<tr><td colspan="4" style="text-align:center;color:#ccc;padding:12px 0">Nenhum item adicionado</td></tr>`;

  return `
    <div class="rd-header">
      <div class="rd-logo-area">
        ${logoHtml}
        ${brandName ? `<div class="rd-brand-name">${brandName}</div>` : ''}
        ${contactLines ? `<div class="rd-brand-contact">${contactLines}</div>` : ''}
      </div>
      <div class="rd-header-right">
        <div class="rd-doc-type">Comprovante de Compra</div>
        <div class="rd-doc-num">${number}</div>
        <div class="rd-doc-date">${formatDate(date)}</div>
      </div>
    </div>

    <div class="rd-status ${stClass}">
      <span class="rd-status-dot"></span>
      ${stLabel} · ${paymentMethod}
    </div>

    <div class="rd-body">

      <div class="rd-two-col">
        <div>
          <span class="rd-section-label">Cliente</span>
          ${clientName   ? `<div class="rd-kv"><span class="rd-k">Nome</span><span class="rd-v">${clientName}</span></div>` : ''}
          ${clientPhone  ? `<div class="rd-kv"><span class="rd-k">Telefone</span><span class="rd-v">${clientPhone}</span></div>` : ''}
          ${clientEmail  ? `<div class="rd-kv"><span class="rd-k">E-mail</span><span class="rd-v">${clientEmail}</span></div>` : ''}
        </div>
        ${(shippingMethod || shippingDeadline) ? `
        <div>
          <span class="rd-section-label">Entrega</span>
          ${shippingMethod   ? `<div class="rd-kv"><span class="rd-k">Envio</span><span class="rd-v">${shippingMethod}</span></div>` : ''}
          ${shippingDeadline ? `<div class="rd-kv"><span class="rd-k">Prazo</span><span class="rd-v">${shippingDeadline}</span></div>` : ''}
        </div>` : '<div></div>'}
      </div>

      ${addr ? `
      <div>
        <span class="rd-section-label">Endereço de Entrega</span>
        <div class="rd-kv"><span class="rd-k">Endereço</span><span class="rd-v">${addr}</span></div>
      </div>` : ''}

      <div class="rd-divider"></div>

      <div>
        <span class="rd-section-label">Itens do Pedido</span>
        <table class="rd-items">
          <thead>
            <tr>
              <th>Qtd</th>
              <th>Produto</th>
              <th style="text-align:right">Unit.</th>
              <th style="text-align:right">Total</th>
            </tr>
          </thead>
          <tbody>${itemRows}</tbody>
        </table>
      </div>

      <div class="rd-divider"></div>

      <div>
        <span class="rd-section-label">Valores</span>
        <div class="rd-totals">
          <div class="rd-total-row">
            <span class="rd-tl">Subtotal</span>
            <span class="rd-tv">${formatCurrency(subtotal)}</span>
          </div>
          ${parseFloat(shipping) > 0 ? `
          <div class="rd-total-row">
            <span class="rd-tl">Frete</span>
            <span class="rd-tv">${formatCurrency(shipping)}</span>
          </div>` : ''}
          ${parseFloat(discount) > 0 ? `
          <div class="rd-total-row discount">
            <span class="rd-tl">Desconto</span>
            <span class="rd-tv">−${formatCurrency(discount)}</span>
          </div>` : ''}
          <div class="rd-total-grand">
            <span class="rd-grand-label">Total Pago</span>
            <span class="rd-grand-amount">${formatCurrency(total)}</span>
          </div>
        </div>
      </div>

      ${policy ? `
      <div class="rd-divider"></div>
      <div>
        <span class="rd-section-label">Política</span>
        <div class="rd-text-block">${policy}</div>
      </div>` : ''}

      ${notes ? `
      <div>
        <span class="rd-section-label">Observações</span>
        <div class="rd-text-block">${notes}</div>
      </div>` : ''}

    </div>

    <div class="rd-footer">
      <div class="rd-footer-sig">
        <span class="rd-sig-line"></span>
        Responsável
        <div class="rd-sig-name">${responsible || brandName || '—'}</div>
      </div>
      <div class="rd-footer-id">
        Receipt Studio<br>${number}
      </div>
    </div>
  `;
}
