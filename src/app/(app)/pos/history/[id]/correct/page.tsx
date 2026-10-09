import { PosTransactionForm } from "@/components/pos/PosTransactionForm";
export default async function CorrectPosTransactionPage({ params }: { params: Promise<{ id: string }> }) { const { id } = await params; return <PosTransactionForm transactionId={id} />; }
