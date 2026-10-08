import { BookingRecordPage } from "../../../../../../src/features/booking/BookingRecordPage";
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <BookingRecordPage pnr={id} mode="edit" />;
}
