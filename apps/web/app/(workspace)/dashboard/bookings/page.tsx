import { TicketLookup } from "../../../../src/features/booking/TicketLookup";
import { BookingHistory } from "../../../../src/features/booking/BookingHistory";
import { PageHeader } from "../../../../src/ui/PageHeader";
import { redirect } from "next/navigation";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ pnr?: string }>;
}) {
  const { pnr } = await searchParams;
  if (pnr) redirect(`/dashboard/bookings/${encodeURIComponent(pnr)}`);
  return (
    <>
      <PageHeader
        title="Bookings"
        description="Browse passenger bookings and open a ticket to manage its details."
      />
      <TicketLookup />
      <BookingHistory />
    </>
  );
}
