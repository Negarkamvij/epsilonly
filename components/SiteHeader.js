import Link from "next/link";
import AccountNav from "./AccountNav";

export default function SiteHeader() {
  return (
    <header className="site-header">
      <Link href="/" className="brand" aria-label="CalcQuest home">
        <span className="brand-mark" aria-hidden="true">∿</span>
        <span>CalcQuest<span className="brand-period">.</span></span>
      </Link>
      <nav aria-label="Main navigation">
        <Link href="/#explore" className="nav-link">Explore calculus</Link>
        <AccountNav />
        <Link href="/exam" className="button button-small">Let’s practice <span aria-hidden="true">↗</span></Link>
      </nav>
    </header>
  );
}
