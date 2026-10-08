import { describe, expect, test } from "bun:test";
import {
  createTicketDocument,
  renderTicketMarkup,
  renderTicketPrintDocument,
  ticketDate,
  type TicketSource,
} from "@a-one-tours/shared/ticket";
import {
  buildBookingEmail,
  emailButton,
  emailLayout,
} from "./email-templates.js";
const source: TicketSource = {
  pnr: "DGTEST123",
  status: "CONFIRMED",
  createdAt: "2026-10-08T05:00:00Z",
  currency: "INR",
  baseFare: "1200",
  discountAmount: "100",
  taxAmount: "55",
  totalAmount: "1155",
  agency: {
    name: "Sample Travels",
    phone: "+91 00000 00000",
    email: "support@example.test",
    address: "Travel Street",
  },
  passengers: [
    {
      firstName: "Sample",
      lastName: "Passenger",
      seatName: "A1",
      age: 28,
      gender: "Female",
    },
  ],
  trip: {
    tripCode: "TRIP100",
    travelDate: "2026-10-10T00:00:00Z",
    departureTime: "2026-10-10T14:30:00Z",
    arrivalTime: "2026-10-11T02:00:00Z",
    route: { source: "Ahmedabad", destination: "Mumbai" },
    bus: {
      busNumber: "BUS100",
      registrationNumber: "GJ-TEST",
      busType: "AC_SLEEPER",
    },
  },
  boardingStop: {
    name: "Central boarding",
    address: "Platform 2",
    estimatedMinutesFromOrigin: 15,
  },
  dropOffStop: { name: "Destination terminal" },
  payments: [{ amount: "500" }],
  refunds: [],
};
describe("professional ticket emails and print layouts", () => {
  test("complete journey and accurate recorded money in email and text", () => {
    const ticket = createTicketDocument(source);
    const email = buildBookingEmail(ticket);
    for (const value of [
      "DGTEST123",
      "Sample Passenger",
      "A1",
      "Central boarding",
      "Platform 2",
      "Destination terminal",
      "GJ-TEST",
      "INR 1,155.00",
      "INR 55.00",
      "INR 500.00",
      "support@example.test",
    ]) {
      expect(email.html).toContain(value);
      expect(email.text).toContain(value);
    }
    expect(email.html).toContain("INR 655.00");
    expect(email.subject).toContain("Bus ticket confirmed");
    expect(ticket.boarding.time).toBe("2026-10-10T14:45:00.000Z");
  });
  test("all dynamic ticket fields are escaped; unsupported logo and branding are rejected", () => {
    const ticket = createTicketDocument({
      ...source,
      pnr: "<script>alert(1)</script>",
      agency: {
        name: "<img src=x onerror=alert(1)>",
        logoUrl: "javascript:alert(1)",
        brandColor: "red;position:fixed",
      },
      passengers: [
        {
          firstName: "<svg onload=alert(1)>",
          lastName: "& test",
          seatName: '" onclick=alert(1)',
        },
      ],
    });
    const html = buildBookingEmail(ticket).html;
    expect(html).not.toContain("<script>");
    expect(html).not.toContain("<svg");
    expect(html).toContain("&lt;script&gt;");
    expect(html).toContain("&amp; test");
    expect(ticket.agency.logoUrl).toBeNull();
    expect(ticket.agency.brandColor).toBe("#c62828");
    expect(emailButton("Unsafe", "javascript:alert(1)")).toBe("");
    expect(emailLayout("<script>", "<p>Trusted content</p>")).toContain(
      "&lt;script&gt;",
    );
  });
  test("cancelled tickets show invalid travel status, fee and recorded refunds", () => {
    const email = buildBookingEmail(
      createTicketDocument({
        ...source,
        status: "CANCELLED",
        cancellationFee: "100",
        refunds: [{ amount: "400" }],
      }),
    );
    expect(email.subject).toContain("Booking cancelled");
    expect(email.html).toContain("not valid for travel");
    expect(email.html).toContain("INR 400.00");
    expect(email.html).not.toContain("Balance to collect");
  });
  test("print sizes and distinct compact and ink-friendly thermal layouts", () => {
    const ticket = createTicketDocument(source);
    expect(renderTicketPrintDocument(ticket, "standard")).toContain(
      "size:210mm 297mm",
    );
    expect(renderTicketPrintDocument(ticket, "ticket")).toContain(
      "size:210mm 148mm",
    );
    expect(renderTicketPrintDocument(ticket, "thermal")).toContain(
      "size:80mm 297mm",
    );
    expect(renderTicketMarkup(ticket, "ticket")).toContain("width:60%");
    expect(renderTicketMarkup(ticket, "thermal")).not.toContain(
      "background:#102a36",
    );
  });
  test("dates use service timezone and missing payment data is not reported as zero", () => {
    expect(ticketDate("2026-10-10T14:30:00Z", "en-IN", true)).toContain("8:00");
    const html = renderTicketMarkup(
      createTicketDocument({ ...source, payments: undefined }),
    );
    expect(html).not.toContain("Payments recorded");
    expect(html).not.toContain("Balance to collect");
  });
});
