import AccountPage from "../../components/AccountPage";
import { safeNext } from "../../lib/validation";
export default async function Login({ searchParams }) {
  const params = await searchParams;
  return <AccountPage mode="login" next={safeNext(params.next)} confirmationFailed={params.confirmation === "failed"} />;
}
