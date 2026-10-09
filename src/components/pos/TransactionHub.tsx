"use client";
import Link from "next/link";
import { ArrowRight, ArrowDownLeft, ArrowUpRight, CreditCard, Database, ReceiptText, Smartphone, Wifi } from "lucide-react";
import { PageHeader } from "@/components/shared/WorkspaceShell";

const services = [
  { label: "Cash withdrawal", desc: "Customer transfers funds and receives physical cash.", value: "CASH_WITHDRAWAL", icon: ArrowDownLeft },
  { label: "Card withdrawal", desc: "Customer withdraws using a card.", value: "CARD_WITHDRAWAL", icon: CreditCard },
  { label: "Cash deposit", desc: "Record a deposit service transaction.", value: "CASH_DEPOSIT", icon: ArrowUpRight },
  { label: "Transfer", desc: "Record a transfer service and its charge.", value: "TRANSFER", icon: ReceiptText },
  { label: "Airtime", desc: "Record an airtime transaction.", value: "AIRTIME", icon: Smartphone },
  { label: "Data", desc: "Record a data bundle transaction.", value: "DATA", icon: Wifi },
];
export function TransactionHub() {
  return <>
    <PageHeader eyebrow="POS / RECORD" title="Record a transaction" description="Choose a POS service, or record money received for a gas sale separately." action={<Link className="button secondary" href="/pos/history">View history <ArrowRight size={15} /></Link>} />
    <div className="surface" style={{ marginBottom: 22 }}><div className="surface-heading"><div><h2 className="surface-title">POS services</h2><p className="surface-subtitle">The application calculates the matching service charge for the amount.</p></div><CreditCard size={19} color="#16a34a" /></div><div className="service-grid">{services.map((service) => { const Icon = service.icon; return <Link key={service.value} className="service-choice" href={`/pos/transactions/new?service=${service.value}`}><div className="service-choice-icon"><Icon size={20} /></div><div className="service-choice-copy"><div className="service-choice-title">{service.label}</div><div className="service-choice-desc">{service.desc}</div></div><ArrowRight className="service-choice-arrow" size={17} /></Link>; })}</div></div>
    <div className="surface gas-payment-choice"><div className="service-choice-icon"><Database size={21} /></div><div className="service-choice-copy"><div className="service-choice-title">Gas payment</div><div className="service-choice-desc">Record money received for gas. No POS service charge is applied. You can link it to an outstanding gas debt repayment.</div></div><Link className="button" href="/pos/transactions/new?service=GAS_PAYMENT">Record gas payment <ArrowRight size={15} /></Link></div>
    <div className="notice neutral" style={{ marginTop: 17 }}>A payment received for gas is not a POS Transfer service. Keep the purpose accurate by choosing the correct transaction type.</div>
  </>;
}
