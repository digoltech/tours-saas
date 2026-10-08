import {
  escapeTicketHtml as escapeHtml,
  safeHttpUrl,
  renderTicketMarkup,
  renderTicketText,
  type TicketDocument,
} from "@a-one-tours/shared/ticket";
export { escapeHtml };
export function emailButton(label: string, url: string) {
  const href = safeHttpUrl(url);
  if (!href) return "";
  return `<table role="presentation" style="margin:24px 0;border-collapse:collapse"><tr><td style="background:#c62828;border-radius:8px"><a href="${escapeHtml(href)}" style="display:inline-block;padding:14px 22px;color:#fff;text-decoration:none;font-size:14px;font-weight:700">${escapeHtml(label)}</a></td></tr></table><p style="font-size:11px;color:#647780;line-height:1.6">If the button does not work, open this link:<br><a href="${escapeHtml(href)}" style="color:#c62828;word-break:break-all">${escapeHtml(href)}</a></p>`;
}
export function emailLayout(
  title: string,
  content: string,
  options: { preheader?: string; eyebrow?: string; footer?: string } = {},
) {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(title)}</title><style>body{margin:0;padding:0}table{border-collapse:collapse}p{font-size:14px;line-height:1.75;margin:0 0 14px}a{color:#c62828}@media(max-width:600px){.email-body{padding:24px 18px!important}.email-shell{width:100%!important}}</style></head><body style="background:#f3f6f7;font-family:Arial,sans-serif;color:#102a36"><div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent">${escapeHtml(options.preheader ?? title)}</div><table role="presentation" width="100%" style="background:#f3f6f7"><tr><td style="padding:32px 12px"><table role="presentation" class="email-shell" width="600" align="center" style="width:100%;max-width:600px;background:#fff;border:1px solid #dce5e8;border-radius:14px;overflow:hidden"><tr><td style="background:#102a36;border-top:4px solid #c62828;padding:24px 30px"><div style="font-size:23px;font-weight:700;color:#fff">Digol <span style="color:#ffada5">TravelOS</span></div><div style="font-size:10px;letter-spacing:2px;color:#b8ccd4;margin-top:6px">BY DIGOL TOURS</div></td></tr><tr><td class="email-body" style="padding:32px"><p style="font-size:10px;letter-spacing:1.8px;font-weight:700;color:#c62828;margin:0 0 12px">${escapeHtml(options.eyebrow ?? "YOUR TRAVEL OPERATIONS")}</p><h1 style="font-size:26px;line-height:1.3;letter-spacing:-.5px;font-weight:700;margin:0 0 18px;color:#102a36">${escapeHtml(title)}</h1>${content}</td></tr><tr><td style="padding:20px 30px;background:#f7f9fa;border-top:1px solid #e4ebed"><p style="font-size:11px;color:#647780;margin:0;line-height:1.7">${options.footer ?? "This is a service email from Digol TravelOS. For assistance, contact your agency administrator."}</p></td></tr></table><p style="font-size:10px;color:#82959d;text-align:center;margin:18px 0 0">Digol TravelOS · Clearer travel operations, from booking to boarding.</p></td></tr></table></body></html>`;
}
export function buildBookingEmail(ticket: TicketDocument) {
  const cancelled = ticket.status === "CANCELLED";
  const title = cancelled
    ? "Your booking has been cancelled"
    : "Your journey is confirmed";
  return {
    subject: `${ticket.agency.name} · ${cancelled ? "Booking cancelled" : "Bus ticket confirmed"} · ${ticket.pnr}`,
    text: renderTicketText(ticket),
    html: emailLayout(
      title,
      `<p>${cancelled ? "Your updated booking details are below. This ticket is no longer valid for travel. Please contact the agency for help with refunds." : "Thank you for booking. Your bus e-ticket contains your journey, seat assignments, boarding locations and fare details. Keep it with you when travelling."}</p>${renderTicketMarkup(ticket)}`,
      {
        eyebrow: cancelled ? "BOOKING UPDATE" : "READY FOR BOARDING",
        preheader: `${ticket.pnr} · ${ticket.journey.source} to ${ticket.journey.destination} · ${ticket.passengers.length} passenger(s)`,
        footer: `Issued by ${escapeHtml(ticket.agency.name)}. ${cancelled ? "Refunds are processed according to the agency's cancellation policy." : "Please check your boarding point and departure time before travelling. All times are shown in Indian Standard Time (IST)."}`,
      },
    ),
  };
}
