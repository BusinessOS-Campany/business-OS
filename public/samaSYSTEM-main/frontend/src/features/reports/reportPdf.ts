import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

export async function downloadReportPdf(url: string, filename: string) {
  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.top = '0';
  iframe.style.left = '-10000px';
  iframe.style.width = '1000px';
  iframe.style.border = '0';
  document.body.appendChild(iframe);
  try {
    const res = await fetch(url);
    const html = await res.text();

    const idoc = iframe.contentDocument!;
    idoc.open();
    idoc.write(html);
    idoc.close();

    await new Promise<void>(resolve => {
      const check = () => {
        if (idoc.readyState === 'complete') resolve();
        else setTimeout(check, 100);
      };
      check();
      setTimeout(resolve, 5000);
    });
    await idoc.fonts?.ready;
    await new Promise(r => setTimeout(r, 300));

    const style = idoc.createElement('style');
    style.textContent = `.container{box-shadow:none;border-radius:0}`;
    idoc.head.appendChild(style);

    const el = idoc.body.firstElementChild as HTMLElement;
    const canvas = await html2canvas(el, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });

    const pdf = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
    const pw = pdf.internal.pageSize.getWidth();
    const ph = pdf.internal.pageSize.getHeight();
    const pageRatio = ph / pw;
    const canvasRatio = canvas.height / canvas.width;
    const chunkH = Math.round(canvas.width * pageRatio);

    if (canvasRatio <= pageRatio) {
      const h = pw * canvasRatio;
      pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, pw, h);
    } else {
      let y = 0;
      let page = 0;
      while (y < canvas.height) {
        const h = Math.min(chunkH, canvas.height - y);
        const slice = document.createElement('canvas');
        slice.width = canvas.width;
        slice.height = h;
        const ctx = slice.getContext('2d')!;
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, h);
        ctx.drawImage(canvas, 0, y, canvas.width, h, 0, 0, canvas.width, h);
        if (page > 0) pdf.addPage();
        pdf.addImage(slice.toDataURL('image/png'), 'PNG', 0, 0, pw, pw * (h / canvas.width));
        y += h;
        page++;
      }
    }

    pdf.save(filename);
  } catch { /* ignore */ }
  iframe.remove();
}
