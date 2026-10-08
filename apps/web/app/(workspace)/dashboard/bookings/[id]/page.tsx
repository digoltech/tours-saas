import { BookingRecordPage } from "../../../../../src/features/booking/BookingRecordPage";
export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ confirmed?: string }>;
}) {
  const { id } = await params;
  const { confirmed } = await searchParams;
  return <BookingRecordPage pnr={id} confirmed={confirmed === "1"} />;
}
