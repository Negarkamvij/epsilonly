import AccountPage from "../../components/AccountPage";
import { safeNext } from "../../lib/validation";
export default async function Signup({ searchParams }) {
  const params = await searchParams;
  return <AccountPage mode="signup" next={safeNext(params.next)} />;
}
