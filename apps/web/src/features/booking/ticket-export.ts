import {
  renderTicketPrintDocument,
  ticketFormats,
  type TicketDocument,
  type TicketFormat,
} from "@a-one-tours/shared/ticket";
const pxPerMm = 96 / 25.4;
async function prepare(
  ticket: TicketDocument,
  format: TicketFormat,
  locale: string,
  translate: (key: string) => string,
) {
  const spec = ticketFormats[format];
  const frame = document.createElement("iframe");
  frame.title = "Ticket print document";
  frame.setAttribute("aria-hidden", "true");
  frame.tabIndex = -1;
  Object.assign(frame.style, {
    position: "fixed",
    left: "-10000px",
    top: "0",
    width: `${(spec.widthMm - spec.marginMm * 2) * pxPerMm}px`,
    height: "1200px",
    border: "0",
  });
  try {
    await new Promise<void>((resolve, reject) => {
      const timeout = window.setTimeout(
        () => reject(new Error("Ticket preview timed out. Please try again.")),
        15000,
      );
      frame.onload = () => {
        clearTimeout(timeout);
        resolve();
      };
      frame.srcdoc = renderTicketPrintDocument(
        ticket,
        format,
        locale,
        translate,
      );
      document.body.appendChild(frame);
    });
    const doc = frame.contentDocument!;
    await doc.fonts.ready;
    await Promise.all(
      Array.from(doc.images).map(
        (img) =>
          new Promise<void>((resolve) => {
            if (img.complete) return resolve();
            const timeout = setTimeout(resolve, 5000);
            const done = () => {
              clearTimeout(timeout);
              resolve();
            };
            img.onload = done;
            img.onerror = done;
          }),
      ),
    );
    const element = doc.querySelector<HTMLElement>("[data-ticket-document]")!;
    const heightMm =
      format === "thermal"
        ? Math.max(
            80,
            Math.ceil(
              element.getBoundingClientRect().height / pxPerMm +
                spec.marginMm * 2 +
                6,
            ),
          )
        : spec.heightMm;
    if (format === "thermal") {
      const style = doc.createElement("style");
      style.textContent = `@page{size:80mm ${heightMm}mm;margin:4mm}`;
      doc.head.appendChild(style);
    }
    return { frame, element, spec, heightMm };
  } catch (error) {
    frame.remove();
    throw error;
  }
}
export async function printTicket(
  ticket: TicketDocument,
  format: TicketFormat,
  locale: string,
  translate: (key: string) => string,
) {
  const { frame } = await prepare(ticket, format, locale, translate);
  const cleanup = () => frame.remove();
  const fallback = window.setTimeout(cleanup, 60000);
  frame.contentWindow!.addEventListener(
    "afterprint",
    () => {
      clearTimeout(fallback);
      cleanup();
    },
    { once: true },
  );
  try {
    frame.contentWindow!.focus();
    frame.contentWindow!.print();
  } catch (error) {
    clearTimeout(fallback);
    cleanup();
    throw error;
  }
}
export async function downloadTicketPdf(
  ticket: TicketDocument,
  format: TicketFormat,
  locale: string,
  translate: (key: string) => string,
) {
  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
    import("html2canvas"),
    import("jspdf"),
  ]);
  const prepared = await prepare(ticket, format, locale, translate);
  const { frame, element, spec, heightMm } = prepared;
  try {
    const rect = element.getBoundingClientRect();
    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      backgroundColor: "#ffffff",
      logging: false,
    });
    const width = spec.widthMm - spec.marginMm * 2;
    const mmPerPixel = width / canvas.width;
    const pageHeight = Math.min(heightMm, 1000);
    const capacity = (pageHeight - spec.marginMm * 2 - 5) / mmPerPixel;
    const boundaries = Array.from(
      element.querySelectorAll<HTMLElement>("[data-ticket-block]"),
    )
      .flatMap((block) => {
        const r = block.getBoundingClientRect();
        return [
          Math.round(((r.top - rect.top) * canvas.height) / rect.height),
          Math.round(((r.bottom - rect.top) * canvas.height) / rect.height),
        ];
      })
      .sort((a, b) => a - b);
    const slices: { start: number; end: number }[] = [];
    let start = 0;
    while (start < canvas.height) {
      const limit = Math.min(canvas.height, Math.floor(start + capacity));
      const candidates = boundaries.filter(
        (y) => y > start + capacity * 0.3 && y <= limit,
      );
      const end =
        limit === canvas.height ? limit : (candidates.at(-1) ?? limit);
      slices.push({ start, end });
      start = end;
    }
    const pdf = new jsPDF({
      compress: true,
      orientation: spec.widthMm > pageHeight ? "landscape" : "portrait",
      unit: "mm",
      format: [spec.widthMm, pageHeight],
    });
    pdf.setProperties({
      title: `Bus ticket ${ticket.pnr}`,
      author: ticket.agency.name,
      subject: `${ticket.journey.source} to ${ticket.journey.destination}`,
    });
    slices.forEach((slice, index) => {
      if (index)
        pdf.addPage(
          [spec.widthMm, pageHeight],
          spec.widthMm > pageHeight ? "landscape" : "portrait",
        );
      const crop = document.createElement("canvas");
      crop.width = canvas.width;
      crop.height = slice.end - slice.start;
      const context = crop.getContext("2d")!;
      context.drawImage(
        canvas,
        0,
        slice.start,
        canvas.width,
        crop.height,
        0,
        0,
        canvas.width,
        crop.height,
      );
      pdf.addImage(
        crop.toDataURL("image/png"),
        "PNG",
        spec.marginMm,
        spec.marginMm,
        width,
        crop.height * mmPerPixel,
        undefined,
        "FAST",
      );
      pdf.setFontSize(7);
      pdf.setTextColor(100);
      pdf.text(
        `${ticket.pnr} | ${index + 1} / ${slices.length}`,
        spec.marginMm,
        pageHeight - spec.marginMm,
      );
    });
    saveBlob(
      pdf.output("blob"),
      `Ticket-${ticket.pnr.replace(/[^a-z0-9_-]/gi, "_")}-${format}.pdf`,
    );
  } finally {
    frame.remove();
  }
}
export function downloadTicketHtml(
  ticket: TicketDocument,
  format: TicketFormat,
  locale: string,
  translate: (key: string) => string,
) {
  saveBlob(
    new Blob([renderTicketPrintDocument(ticket, format, locale, translate)], {
      type: "text/html;charset=utf-8",
    }),
    `Ticket-${ticket.pnr.replace(/[^a-z0-9_-]/gi, "_")}-${format}.html`,
  );
}
function saveBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30_000);
}
