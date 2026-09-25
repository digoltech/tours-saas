import { redirect } from 'next/navigation';
export default async function LegacyTripDetail({ params }: { params: Promise<{ id: string }> }){ const { id } = await params; redirect('/dashboard/trips/' + id); }
