import { StockBatchDetails } from "@/components/gas/StockBatchDetails";
export default async function StockBatchPage({ params }: { params: Promise<{ id: string }> }) { const { id } = await params; return <StockBatchDetails id={id} />; }
