import { PosTransactionForm } from "@/components/pos/PosTransactionForm";
export default async function NewPosTransactionPage({ searchParams }: { searchParams: Promise<{ service?: string }> }) { const params = await searchParams; return <PosTransactionForm initialService={params.service} />; }
