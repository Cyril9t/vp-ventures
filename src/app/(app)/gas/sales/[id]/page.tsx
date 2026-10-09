import { GasSaleDetails } from "@/components/gas/GasSaleDetails";
export default async function GasSaleDetailsPage({ params }: { params: Promise<{ id: string }> }) { const { id } = await params; return <GasSaleDetails id={id} />; }
