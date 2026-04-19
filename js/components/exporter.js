// ═══════════════════════════════════════
// exporter.js — PDF / PNG / JSON
// ═══════════════════════════════════════

import { showToast } from '../utils/helpers.js';

export async function exportPDF(el, filename = 'recibo') {
  showToast('Gerando PDF…');
  try {
    const { jsPDF } = window.jspdf;
    const canvas = await html2canvas(el, { scale: 3, useCORS: true, backgroundColor: '#fff', logging: false });
    const imgData = canvas.toDataURL('image/png', 1.0);

    const mmPerPx = 0.264583;
    const imgW_mm = (canvas.width  / 3) * mmPerPx;
    const imgH_mm = (canvas.height / 3) * mmPerPx;

    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: [imgW_mm, imgH_mm],
    });

    pdf.addImage(imgData, 'PNG', 0, 0, imgW_mm, imgH_mm, '', 'FAST');
    pdf.save(`${filename}.pdf`);
    showToast('PDF gerado com sucesso!');
  } catch (e) {
    console.error(e);
    showToast('Erro ao gerar PDF', 'error');
  }
}

export async function exportPNG(el, filename = 'recibo') {
  showToast('Gerando imagem…');
  try {
    const canvas = await html2canvas(el, { scale: 3, useCORS: true, backgroundColor: '#fff', logging: false });
    const link   = document.createElement('a');
    link.download = `${filename}.png`;
    link.href     = canvas.toDataURL('image/png', 1.0);
    link.click();
    showToast('Imagem exportada!');
  } catch (e) {
    console.error(e);
    showToast('Erro ao exportar imagem', 'error');
  }
}

export function exportJSON(data, filename = 'recibo') {
  const clean = { ...data };
  delete clean.logoData; // pula base64 pesado opcionalmente
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const link = document.createElement('a');
  link.download = `${filename}.json`;
  link.href = URL.createObjectURL(blob);
  link.click();
  showToast('JSON exportado!');
}
