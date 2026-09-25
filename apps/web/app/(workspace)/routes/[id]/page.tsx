import { redirect } from 'next/navigation';
export default async function LegacyRouteDetail({ params }: { params: Promise<{ id: string }> }){ const { id } = await params; redirect('/dashboard/routes/' + id); }
