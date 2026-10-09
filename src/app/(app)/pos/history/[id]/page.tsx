import { PosTransactionDetails } from "@/components/pos/PosTransactionDetails";
export default async function PosTransactionDetailsPage({ params }: { params: Promise<{ id: string }> }) { const { id } = await params; return <PosTransactionDetails id={id} />; }
