import { Link } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useEffect, useState } from "react";
import { useLivery } from "@/hooks/use-livery";
import { ShoppingCart } from "lucide-react";

export default function SiteNavbar() {
  const { user, isAuthenticated } = useAuth();
  const { getImage } = useLivery();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 50);
    window.addEventListener("scroll", handler, { passive: true });
    return () => window.removeEventListener("scroll", handler);
  }, []);

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${scrolled ? "bg-black/95 backdrop-blur-sm" : "bg-transparent"}`}
      data-testid="site-navbar"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-4 h-20">
        <Link href="/" className="flex items-center gap-3" data-testid="link-home">
          <img src={getImage("logo", "/images/template/logo.png")} alt="HiFitComp" className="h-40" />
        </Link>

        <button
          className="md:hidden text-white"
          onClick={() => setMenuOpen(!menuOpen)}
          data-testid="button-mobile-menu"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            {menuOpen ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            )}
          </svg>
        </button>

        <div className="hidden md:flex items-center gap-8">
          <Link
            href="/"
            className="text-white text-sm font-bold uppercase tracking-wider transition-colors duration-300 hover:text-white/70"
            data-testid="link-nav-home"
          >
            Home
          </Link>
          <Link
            href="/competitions"
            className="text-white text-sm font-bold uppercase tracking-wider transition-colors duration-300 hover:text-white/70"
            data-testid="link-nav-competitions"
          >
            Competitions
          </Link>
          <Link
            href="/join"
            className="text-white text-sm font-bold uppercase tracking-wider transition-colors duration-300 hover:text-white/70"
            data-testid="link-nav-join"
          >
            Join
          </Link>
          <Link
            href="/host"
            className="text-white text-sm font-bold uppercase tracking-wider transition-colors duration-300 hover:text-white/70"
            data-testid="link-nav-host"
          >
            Host
          </Link>
        </div>

        <div className="hidden md:flex items-center gap-6">
          <Link
            href="/my-purchases"
            className="text-white transition-colors duration-500 hover:text-[#FF5A09]"
            data-testid="link-nav-cart"
          >
            <ShoppingCart className="h-5 w-5" />
          </Link>
          {isAuthenticated ? (
            <Link
              href="/dashboard"
              className="text-white font-bold text-base cursor-pointer transition-colors duration-500 hover:text-white/70"
              data-testid="link-nav-dashboard"
            >
              Dashboard
            </Link>
          ) : (
            <Link
              href="/login"
              className="text-white font-bold text-base cursor-pointer transition-colors duration-500 hover:text-white/70"
              data-testid="link-nav-login"
            >
              Login / Register
            </Link>
          )}
        </div>
      </div>

      {menuOpen && (
        <div className="md:hidden bg-black/95 border-t border-white/10 px-4 py-4">
          <Link
            href="/"
            className="block py-2 text-white font-bold uppercase tracking-wider text-sm"
            onClick={() => setMenuOpen(false)}
            data-testid="link-mobile-home"
          >
            Home
          </Link>
          <Link
            href="/competitions"
            className="block py-2 text-white font-bold uppercase tracking-wider text-sm"
            onClick={() => setMenuOpen(false)}
            data-testid="link-mobile-competitions"
          >
            Competitions
          </Link>
          <Link
            href="/join"
            className="block py-2 text-white font-bold uppercase tracking-wider text-sm"
            onClick={() => setMenuOpen(false)}
            data-testid="link-mobile-join"
          >
            Join
          </Link>
          <Link
            href="/host"
            className="block py-2 text-white font-bold uppercase tracking-wider text-sm"
            onClick={() => setMenuOpen(false)}
            data-testid="link-mobile-host"
          >
            Host
          </Link>
          <Link
            href="/my-purchases"
            className="flex items-center gap-2 py-2 text-white font-bold uppercase tracking-wider text-sm"
            onClick={() => setMenuOpen(false)}
            data-testid="link-mobile-cart"
          >
            <ShoppingCart className="h-4 w-4" />
            My Purchases
          </Link>
          {isAuthenticated ? (
            <Link
              href="/dashboard"
              className="block py-2 text-white font-bold text-sm"
              onClick={() => setMenuOpen(false)}
              data-testid="link-mobile-dashboard"
            >
              Dashboard
            </Link>
          ) : (
            <Link
              href="/login"
              className="block py-2 text-white font-bold text-sm"
              onClick={() => setMenuOpen(false)}
              data-testid="link-mobile-login"
            >
              Login / Register
            </Link>
          )}
        </div>
      )}
    </nav>
  );
}
