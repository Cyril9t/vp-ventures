import { GasSaleForm } from "@/components/gas/GasSaleForm";
export default async function CorrectGasSalePage({ params }: { params: Promise<{ id: string }> }) { const { id } = await params; return <GasSaleForm saleId={id} />; }
