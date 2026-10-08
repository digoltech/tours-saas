export type TicketFormat = "standard" | "ticket" | "thermal";
type Amount = number | string | { toString(): string };
export type TicketSource = {
  pnr: string;
  status: string;
  createdAt?: string | Date;
  currency: string;
  baseFare: Amount;
  discountAmount: Amount;
  taxAmount?: Amount;
  totalAmount: Amount;
  cancellationFee?: Amount;
  agency?: {
    name: string;
    email?: string | null;
    phone?: string | null;
    address?: string | null;
    city?: string | null;
    state?: string | null;
    logoUrl?: string | null;
    brandColor?: string | null;
  };
  passengers: {
    firstName: string;
    lastName: string;
    seatName: string;
    age?: number;
    gender?: string;
    phone?: string | null;
  }[];
  trip: {
    tripCode: string;
    travelDate: string | Date;
    departureTime: string | Date;
    arrivalTime?: string | Date;
    route: { name?: string; source: string; destination: string };
    bus: {
      busNumber: string;
      registrationNumber?: string;
      busType?: string;
      operatorName?: string | null;
    };
  };
  boardingStop?: {
    name: string;
    city?: string | null;
    address?: string | null;
    estimatedMinutesFromOrigin?: number | null;
  } | null;
  dropOffStop?: {
    name: string;
    city?: string | null;
    address?: string | null;
    estimatedMinutesFromOrigin?: number | null;
  } | null;
  payments?: { amount: Amount }[];
  refunds?: { amount: Amount }[];
};
export type TicketDocument = ReturnType<typeof createTicketDocument>;
export const ticketFormats: Record<
  TicketFormat,
  {
    label: string;
    description: string;
    widthMm: number;
    heightMm: number;
    marginMm: number;
  }
> = {
  standard: {
    label: "Standard A4",
    description: "Full-size ticket with complete journey and fare details.",
    widthMm: 210,
    heightMm: 297,
    marginMm: 12,
  },
  ticket: {
    label: "Compact ticket",
    description: "Landscape A5 ticket for a compact boarding pass.",
    widthMm: 210,
    heightMm: 148,
    marginMm: 7,
  },
  thermal: {
    label: "Thermal receipt",
    description: "80 mm receipt with a clean, ink-friendly layout.",
    widthMm: 80,
    heightMm: 297,
    marginMm: 4,
  },
};
export function escapeTicketHtml(value: unknown) {
  return String(value ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ]!,
  );
}
export function safeHttpUrl(value?: string | null) {
  if (!value) return null;
  try {
    const url = new URL(value);
    return ["http:", "https:"].includes(url.protocol) ? url.href : null;
  } catch {
    return null;
  }
}
const amount = (value?: Amount) => {
  const number = Number(value?.toString() ?? 0);
  return Number.isFinite(number) ? number : 0;
};
const dateString = (value?: Date | string) =>
  value ? new Date(value).toISOString() : undefined;
export function createTicketDocument(source: TicketSource) {
  const offsetTime = (offset?: number | null) =>
    offset == null
      ? undefined
      : new Date(
          new Date(source.trip.departureTime).getTime() + offset * 60_000,
        ).toISOString();
  return {
    pnr: source.pnr,
    status: source.status,
    issuedAt: dateString(source.createdAt),
    currency: source.currency,
    agency: {
      name:
        source.agency?.name ?? source.trip.bus.operatorName ?? "Digol Tours",
      email: source.agency?.email,
      phone: source.agency?.phone,
      address: [
        source.agency?.address,
        source.agency?.city,
        source.agency?.state,
      ]
        .filter(Boolean)
        .join(", "),
      logoUrl: safeHttpUrl(source.agency?.logoUrl),
      brandColor: /^#[0-9a-f]{6}$/i.test(source.agency?.brandColor ?? "")
        ? source.agency!.brandColor!
        : "#c62828",
    },
    journey: {
      ...source.trip.route,
      ...source.trip.bus,
      tripCode: source.trip.tripCode,
      travelDate: dateString(source.trip.travelDate)!,
      departureTime: dateString(source.trip.departureTime)!,
      arrivalTime: dateString(source.trip.arrivalTime),
    },
    boarding: {
      name: source.boardingStop?.name ?? source.trip.route.source,
      city: source.boardingStop?.city,
      address: source.boardingStop?.address,
      time: offsetTime(source.boardingStop?.estimatedMinutesFromOrigin),
    },
    dropOff: {
      name: source.dropOffStop?.name ?? source.trip.route.destination,
      city: source.dropOffStop?.city,
      address: source.dropOffStop?.address,
      time: offsetTime(source.dropOffStop?.estimatedMinutesFromOrigin),
    },
    passengers: source.passengers.map((p) => ({
      name: `${p.firstName} ${p.lastName}`.trim(),
      seat: p.seatName,
      age: p.age,
      gender: p.gender,
      phone: p.phone,
    })),
    fare: {
      base: amount(source.baseFare),
      discount: amount(source.discountAmount),
      tax: amount(source.taxAmount),
      total: amount(source.totalAmount),
      paid: source.payments
        ? source.payments.reduce((sum, p) => sum + amount(p.amount), 0)
        : undefined,
      refunded: source.refunds
        ? source.refunds.reduce((sum, p) => sum + amount(p.amount), 0)
        : undefined,
      cancellationFee: amount(source.cancellationFee),
    },
  };
}
export function ticketMoney(
  ticket: TicketDocument,
  value: number,
  locale = "en-IN",
) {
  return `${ticket.currency} ${(value === 0 ? 0 : value).toLocaleString(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
export function ticketDate(
  value: string | undefined,
  locale = "en-IN",
  time = false,
) {
  if (!value) return "—";
  return new Date(value).toLocaleString(
    locale,
    time
      ? {
          day: "numeric",
          month: "short",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
          timeZone: "Asia/Kolkata",
        }
      : { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" },
  );
}
export function renderTicketText(ticket: TicketDocument) {
  const j = ticket.journey;
  const money = (v: number) => ticketMoney(ticket, v);
  return [
    `${ticket.agency.name} — ${ticket.status === "CANCELLED" ? "Booking cancelled" : "Bus e-ticket"}`,
    `PNR: ${ticket.pnr} · Status: ${ticket.status}`,
    `${j.source} → ${j.destination}`,
    `Travel date: ${ticketDate(j.travelDate)}`,
    `Departure: ${ticketDate(j.departureTime, "en-IN", true)} IST`,
    `Arrival: ${ticketDate(j.arrivalTime, "en-IN", true)} IST`,
    `Bus: ${j.busNumber}${j.registrationNumber ? ` (${j.registrationNumber})` : ""} · ${j.busType?.replaceAll("_", " ") ?? ""}`,
    `Trip: ${j.tripCode}`,
    `Boarding: ${ticket.boarding.name}${ticket.boarding.address ? `, ${ticket.boarding.address}` : ""}`,
    `Drop-off: ${ticket.dropOff.name}${ticket.dropOff.address ? `, ${ticket.dropOff.address}` : ""}`,
    ...ticket.passengers.map(
      (p) =>
        `${p.name} · Seat ${p.seat}${p.age != null ? ` · Age ${p.age}` : ""}`,
    ),
    `Base fare: ${money(ticket.fare.base)} · Discount: ${money(ticket.fare.discount)} · Tax: ${money(ticket.fare.tax)}`,
    `Booking total: ${money(ticket.fare.total)}`,
    ...(ticket.fare.paid == null
      ? []
      : [`Payments recorded: ${money(ticket.fare.paid)}`]),
    ...(ticket.status === "CANCELLED"
      ? [
          `Cancellation fee: ${money(ticket.fare.cancellationFee)}`,
          `Refunds recorded: ${money(ticket.fare.refunded ?? 0)}`,
          "This cancelled ticket is not valid for travel. Contact the agency for refund assistance.",
        ]
      : [
          "Present this PNR and a valid ID at boarding. Please arrive 20 minutes before your boarding time.",
        ]),
    `Agency support: ${[ticket.agency.phone, ticket.agency.email].filter(Boolean).join(" · ") || "Contact your booking agency"}`,
  ].join("\n");
}
export function renderTicketMarkup(
  ticket: TicketDocument,
  format: TicketFormat = "standard",
  locale = "en-IN",
  translate: (key: string) => string = (key) => key,
  dense = false,
) {
  const e = escapeTicketHtml;
  const t = (key: string) => e(translate(key));
  const thermal = format === "thermal";
  const compact = format === "ticket";
  dense = dense || compact;
  const red = ticket.agency.brandColor;
  const padding = thermal ? 12 : compact ? 18 : dense ? 10 : 24;
  const money = (n: number) => e(ticketMoney(ticket, n, locale));
  const j = ticket.journey;
  const label = (key: string) =>
    `<div style="font-size:10px;letter-spacing:1px;text-transform:uppercase;color:#647780;margin-bottom:6px">${t(key)}</div>`;
  const field = (key: string, value: string) =>
    `<td style="padding:${dense ? 8 : 12}px ${padding}px;vertical-align:top;width:50%">${label(key)}<div style="font-size:13px;font-weight:600;line-height:1.6;overflow-wrap:anywhere">${e(value)}</div></td>`;
  const stop = (key: string, point: TicketDocument["boarding"]) =>
    `<div>${label(key)}<strong style="font-size:14px">${e(point.name)}</strong>${point.city ? `<div style="color:#647780;font-size:12px;margin-top:4px">${e(point.city)}</div>` : ""}${point.address ? `<div style="color:#647780;font-size:12px;margin-top:4px">${e(point.address)}</div>` : ""}${point.time ? `<div style="font-size:12px;margin-top:6px">${e(ticketDate(point.time, locale, true))} IST</div>` : ""}</div>`;
  const passengers = ticket.passengers
    .map(
      (p) =>
        `<tr data-ticket-block style="break-inside:avoid"><td style="padding:${dense ? 8 : 12}px ${thermal ? 12 : 18}px;border-bottom:1px solid #e4ebed;font-size:13px"><strong>${e(p.name)}</strong><div style="font-size:11px;color:#647780;margin-top:4px">${[p.age == null ? "" : `${p.age} ${translate("years")}`, p.gender, thermal ? "" : p.phone].filter(Boolean).map(e).join(" · ")}</div></td><td style="padding:${dense ? 8 : 12}px ${thermal ? 12 : 18}px;border-bottom:1px solid #e4ebed;text-align:right"><strong style="font-size:15px;color:${thermal ? "#102a36" : red}">${e(p.seat)}</strong></td></tr>`,
    )
    .join("");
  const fare = (key: string, value: number, bold = false) =>
    `<tr data-ticket-block><td style="padding:${dense ? 3 : 5}px 0;font-size:12px;${bold ? "font-weight:700" : "color:#647780"}">${t(key)}</td><td style="padding:${dense ? 3 : 5}px 0;text-align:right;font-size:${bold ? 16 : 12}px;${bold ? `font-weight:700;color:${thermal ? "#102a36" : red}` : ""}">${money(value)}</td></tr>`;
  if (compact)
    return `<div data-ticket-document style="font-family:Arial,sans-serif;color:#102a36;background:white;border:1px solid #dce5e8;border-radius:12px;overflow:hidden;line-height:1.4">
    <table role="presentation" style="width:100%;border-collapse:collapse;table-layout:fixed"><tbody><tr data-ticket-block><td colspan="2" style="padding:10px 14px;background:#102a36;color:white;border-top:4px solid ${red}"><strong style="font-size:17px">${e(ticket.agency.name)}</strong><span style="float:right;font-size:10px;letter-spacing:1px">${t("BUS E-TICKET")} · ${t(ticket.status)}</span></td></tr>
    <tr data-ticket-block><td colspan="2" style="padding:10px 14px;border-bottom:1px dashed #b7c9cf"><strong style="font-size:21px">${e(j.source)} <span style="color:${red}">→</span> ${e(j.destination)}</strong><div style="font-size:11px;color:#647780;margin-top:4px">${e(ticketDate(j.travelDate, locale))} · ${e(j.tripCode)}</div></td></tr>
    <tr><td style="width:60%;vertical-align:top;padding:12px;border-right:1px dashed #b7c9cf"><table role="presentation" style="width:100%;table-layout:fixed"><tr data-ticket-block><td style="width:50%;vertical-align:top;padding-right:10px">${label("Departure")}<strong style="font-size:11px">${e(ticketDate(j.departureTime, locale, true))} IST</strong></td><td style="vertical-align:top">${label("Arrival")}<span style="font-size:11px">${e(ticketDate(j.arrivalTime, locale, true))} IST</span></td></tr><tr data-ticket-block><td style="vertical-align:top;padding:12px 10px 0 0">${stop("Boarding point", ticket.boarding)}</td><td style="vertical-align:top;padding-top:12px">${stop("Drop-off point", ticket.dropOff)}</td></tr></table><div data-ticket-block style="margin-top:12px;font-size:10px">${label("Bus / vehicle")}${e([j.busNumber, j.registrationNumber, j.busType?.replaceAll("_", " "), j.operatorName].filter(Boolean).join(" · "))}</div></td>
    <td style="width:40%;vertical-align:top;padding:10px;background:#f7f9fa"><div data-ticket-block>${label("Booking reference / PNR")}<strong style="font-size:16px;overflow-wrap:anywhere">${e(ticket.pnr)}</strong></div><table style="width:100%;border-collapse:collapse;margin-top:12px"><thead><tr data-ticket-block><th scope="col" style="font-size:10px;text-align:left">${t("PASSENGER")}</th><th scope="col" style="font-size:10px;text-align:right">${t("SEAT")}</th></tr></thead><tbody>${ticket.passengers.map((p) => `<tr data-ticket-block><td style="padding:6px 0;font-size:11px;border-bottom:1px solid #e4ebed">${e(p.name)}</td><td style="text-align:right;padding:6px 0;font-size:13px;font-weight:700;color:${red}">${e(p.seat)}</td></tr>`).join("")}</tbody></table><table role="presentation" style="width:100%;border-collapse:collapse;margin-top:12px">${fare("Base fare", ticket.fare.base)}${fare("Discount", -ticket.fare.discount)}${fare("Tax / GST", ticket.fare.tax)}${fare("Booking total", ticket.fare.total, true)}${ticket.fare.paid == null ? "" : fare("Payments recorded", ticket.fare.paid)}${ticket.status === "CANCELLED" ? fare("Cancellation fee", ticket.fare.cancellationFee) + fare("Refunds recorded", ticket.fare.refunded ?? 0) : ""}</table></td></tr>
    <tr data-ticket-block><td colspan="2" style="padding:10px 14px;border-top:1px dashed #b7c9cf;font-size:10px;color:#647780">${t(ticket.status === "CANCELLED" ? "This cancelled ticket is not valid for travel." : "Present this PNR and a valid ID at boarding.")} ${ticket.status === "CANCELLED" ? t("Contact the agency for refund assistance.") : t("Please arrive 20 minutes before your boarding time.")}<div style="margin-top:6px">${t("Agency support")}: ${e([ticket.agency.phone, ticket.agency.email].filter(Boolean).join(" · ") || translate("Contact your booking agency"))}</div>${ticket.issuedAt ? `<div style="margin-top:4px">${t("Issued")}: ${e(ticketDate(ticket.issuedAt, locale, true))} IST</div>` : ""}</td></tr></tbody></table></div>`;
  return `<div data-ticket-document style="font-family:Arial,'Noto Sans',sans-serif;line-height:1.5;color:#102a36;background:white;border:1px solid #dce5e8;border-radius:${thermal ? 0 : 14}px;overflow:hidden;width:100%;box-sizing:border-box">
    <table role="presentation" style="width:100%;border-collapse:collapse;table-layout:fixed"><tbody>
      <tr data-ticket-block><td colspan="2" style="padding:${padding}px;background:${thermal ? "white" : "#102a36"};color:${thermal ? "#102a36" : "white"};border-top:4px solid ${thermal ? "#102a36" : red}">
        <table role="presentation" style="width:100%;border-collapse:collapse"><tr><td><div style="font-size:${thermal ? 16 : dense ? 18 : 20}px;font-weight:700">${e(ticket.agency.name)}</div><div style="font-size:10px;letter-spacing:1.4px;margin-top:4px;color:${thermal ? "#647780" : "#c4d4da"}">${t("BUS E-TICKET")} · DIGOL TRAVELOS</div></td>${ticket.agency.logoUrl && !thermal ? `<td style="width:80px;text-align:right"><img crossorigin="anonymous" src="${e(ticket.agency.logoUrl)}" alt="${e(ticket.agency.name)}" style="max-width:72px;max-height:48px;object-fit:contain" /></td>` : ""}</tr></table>
      </td></tr>
      <tr data-ticket-block><td colspan="2" style="padding:${padding}px;border-bottom:1px dashed #b7c9cf"><table role="presentation" style="width:100%;border-collapse:collapse"><tr><td>${label("Booking reference / PNR")}<strong style="font-size:${thermal ? 16 : dense ? 20 : 24}px;letter-spacing:1px;overflow-wrap:anywhere">${e(ticket.pnr)}</strong></td><td style="text-align:right;width:${thermal ? 90 : 116}px"><span style="display:inline-block;padding:7px 10px;border-radius:6px;background:${thermal ? "white" : "#fbeaea"};color:${thermal ? "#102a36" : red};font-size:10px;font-weight:700;border:1px solid ${thermal ? "#102a36" : "#f2cbcb"}">${t(ticket.status)}</span></td></tr></table></td></tr>
      <tr data-ticket-block><td colspan="2" style="padding:${padding}px;background:${thermal ? "white" : "#f6f9fa"}">${label("Your journey")}<div style="font-size:${thermal ? 18 : dense ? 22 : 25}px;font-weight:700;line-height:1.3;overflow-wrap:anywhere">${e(j.source)} <span style="color:${thermal ? "#647780" : red}">→</span> ${e(j.destination)}</div><div style="font-size:12px;color:#647780;margin-top:8px">${e(ticketDate(j.travelDate, locale))} · ${e(j.tripCode)}</div></td></tr>
      <tr data-ticket-block>${field("Departure", `${ticketDate(j.departureTime, locale, true)} IST`)}${field("Arrival", `${ticketDate(j.arrivalTime, locale, true)} IST`)}</tr>
      <tr data-ticket-block>${field("Bus / vehicle", [j.busNumber, j.registrationNumber].filter(Boolean).join(" · "))}${field("Service", [j.busType?.replaceAll("_", " "), j.operatorName].filter(Boolean).join(" · ") || "—")}</tr>
      <tr data-ticket-block><td colspan="2" style="padding:${padding}px;border-top:1px solid #e4ebed;border-bottom:1px solid #e4ebed">${thermal ? `${stop("Boarding point", ticket.boarding)}<div style="height:16px"></div>${stop("Drop-off point", ticket.dropOff)}` : `<table role="presentation" style="width:100%;border-collapse:collapse;table-layout:fixed"><tr><td style="width:50%;vertical-align:top;padding-right:14px">${stop("Boarding point", ticket.boarding)}</td><td style="vertical-align:top">${stop("Drop-off point", ticket.dropOff)}</td></tr></table>`}</td></tr>
      <tr><td colspan="2" style="padding:${padding}px ${padding}px 0">${label("Passenger manifest")}<table style="width:100%;border-collapse:collapse"><thead><tr data-ticket-block><th scope="col" style="text-align:left;padding:10px ${thermal ? 12 : 18}px;background:#f6f9fa;font-size:10px;color:#647780">${t("PASSENGER")}</th><th scope="col" style="text-align:right;padding:10px ${thermal ? 12 : 18}px;background:#f6f9fa;font-size:10px;color:#647780">${t("SEAT")}</th></tr></thead><tbody>${passengers}</tbody></table></td></tr>
      <tr><td colspan="2" style="padding:${padding}px"><table role="presentation" style="width:100%;border-collapse:collapse">${fare("Base fare", ticket.fare.base)}${fare("Discount", -ticket.fare.discount)}${fare("Tax / GST", ticket.fare.tax)}${fare("Booking total", ticket.fare.total, true)}${ticket.fare.paid == null ? "" : fare("Payments recorded", ticket.fare.paid)}${ticket.status !== "CANCELLED" && ticket.fare.paid != null ? fare("Balance to collect", Math.max(0, ticket.fare.total - ticket.fare.paid)) : ""}${ticket.status === "CANCELLED" ? fare("Cancellation fee", ticket.fare.cancellationFee) + fare("Refunds recorded", ticket.fare.refunded ?? 0) : ""}</table></td></tr>
      <tr data-ticket-block><td colspan="2" style="padding:${padding}px;border-top:1px dashed #b7c9cf;font-size:11px;color:#647780">${ticket.status === "CANCELLED" ? `<strong style="color:${red}">${t("This cancelled ticket is not valid for travel.")}</strong><br>${t("Contact the agency for refund assistance.")}` : `${t("Present this PNR and a valid ID at boarding.")}<br>${t("Please arrive 20 minutes before your boarding time.")}`}<div style="margin-top:12px;color:#102a36;font-weight:600">${t("Agency support")}: ${e([ticket.agency.phone, ticket.agency.email].filter(Boolean).join(" · ") || translate("Contact your booking agency"))}</div>${ticket.agency.address ? `<div style="margin-top:4px">${e(ticket.agency.address)}</div>` : ""}${ticket.issuedAt ? `<div style="margin-top:8px">${t("Issued")}: ${e(ticketDate(ticket.issuedAt, locale, true))} IST</div>` : ""}</td></tr>
    </tbody></table></div>`;
}
export function renderTicketPrintDocument(
  ticket: TicketDocument,
  format: TicketFormat,
  locale = "en-IN",
  translate?: (key: string) => string,
) {
  const spec = ticketFormats[format];
  const page =
    format === "thermal"
      ? "80mm 297mm"
      : `${spec.widthMm}mm ${spec.heightMm}mm`;
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeTicketHtml(`Ticket-${ticket.pnr}-${format}`)}</title><style>html,body{margin:0;padding:0;background:white}body{width:${spec.widthMm - spec.marginMm * 2}mm;margin:0 auto}*{box-sizing:border-box}table{max-width:100%}thead{display:table-header-group}tr[data-ticket-block]{break-inside:avoid;page-break-inside:avoid}@page{size:${page};margin:${spec.marginMm}mm}@media print{body{width:100%;margin:0}*{-webkit-print-color-adjust:exact;print-color-adjust:exact}}</style></head><body>${renderTicketMarkup(ticket, format, locale, translate, format === "standard")}</body></html>`;
}
