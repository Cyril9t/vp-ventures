import { AccountForm } from "@/components/auth/AccountForm";
export default async function AccountPage({ searchParams }: { searchParams: Promise<{ required?: string }> }) {
  const params = await searchParams;
  return <AccountForm required={params.required === "1"} />;
}
