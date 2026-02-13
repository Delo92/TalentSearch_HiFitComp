import { Link } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useEffect, useState } from "react";

export default function SiteNavbar() {
  const { user } = useAuth();
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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-20">
        <Link href="/" className="flex items-center gap-3" data-testid="link-home">
          <img src="/images/template/logo.png" alt="StarVote" className="h-6" />
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
        </div>

        <div className="hidden md:block">
          {user ? (
            <Link
              href="/dashboard"
              className="text-white font-bold text-base cursor-pointer transition-colors duration-500 hover:text-white/70"
              data-testid="link-nav-dashboard"
            >
              Dashboard
            </Link>
          ) : (
            <a
              href="/api/login"
              className="text-white font-bold text-base cursor-pointer transition-colors duration-500 hover:text-white/70"
              data-testid="link-nav-login"
            >
              Login / Register
            </a>
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
          {user ? (
            <Link
              href="/dashboard"
              className="block py-2 text-white font-bold text-sm"
              onClick={() => setMenuOpen(false)}
              data-testid="link-mobile-dashboard"
            >
              Dashboard
            </Link>
          ) : (
            <a href="/api/login" className="block py-2 text-white font-bold text-sm" data-testid="link-mobile-login">
              Login / Register
            </a>
          )}
        </div>
      )}
    </nav>
  );
}
