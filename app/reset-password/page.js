import AccountPage from "../../components/AccountPage";
import { getIdentity } from "../../lib/supabase/server";
import { redirect } from "next/navigation";
export const dynamic = "force-dynamic";
export default async function ResetPassword() {
  const { user } = await getIdentity();
  if (!user) redirect("/forgot-password");
  return <AccountPage mode="reset" />;
}
