import { Link } from "wouter";
import { useLivery } from "@/hooks/use-livery";

export default function SiteFooter() {
  const { getImage } = useLivery();
  return (
    <footer className="bg-[#111111] py-8" data-testid="site-footer">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <img src={getImage("logo", "/images/template/logo.png")} alt="HiFitComp" className="h-8" />
        </div>
        <nav className="flex flex-wrap items-center gap-6">
          <Link
            href="/"
            className="text-white/60 text-sm uppercase tracking-widest transition-colors duration-300 hover:text-white"
            data-testid="link-footer-home"
          >
            Home
          </Link>
          <Link
            href="/competitions"
            className="text-white/60 text-sm uppercase tracking-widest transition-colors duration-300 hover:text-white"
            data-testid="link-footer-competitions"
          >
            Competitions
          </Link>
          <a
            href="/login"
            className="text-white/60 text-sm uppercase tracking-widest transition-colors duration-300 hover:text-white"
            data-testid="link-footer-join"
          >
            Join Now
          </a>
        </nav>
        <p className="text-xs text-white/30">
          &copy; {new Date().getFullYear()} HiFitComp
        </p>
      </div>
    </footer>
  );
}
