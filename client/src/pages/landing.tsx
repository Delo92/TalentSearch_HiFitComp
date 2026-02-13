import { Button } from "@/components/ui/button";
import { Trophy, Star, Users, Vote, Flame, ArrowRight, ChevronDown, Music, Dumbbell, Camera } from "lucide-react";
import { Link } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useEffect, useRef, useState } from "react";
import { motion, useScroll, useTransform } from "framer-motion";

function useInView(threshold = 0.15) {
  const ref = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([entry]) => { if (entry.isIntersecting) setIsVisible(true); }, { threshold });
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return { ref, isVisible };
}

export default function Landing() {
  const { user } = useAuth();
  const [scrolled, setScrolled] = useState(false);
  const heroRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ["start start", "end start"] });
  const heroY = useTransform(scrollYProgress, [0, 1], [0, 150]);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.6], [1, 0]);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 50);
    window.addEventListener("scroll", handler, { passive: true });
    return () => window.removeEventListener("scroll", handler);
  }, []);

  const feat1 = useInView();
  const feat2 = useInView();
  const feat3 = useInView();
  const steps = useInView();
  const cats = useInView();

  return (
    <div className="min-h-screen bg-black text-white overflow-x-hidden">
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${scrolled ? "bg-black/90 backdrop-blur-xl border-b border-white/5" : "bg-transparent"}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-4 h-16 lg:h-20">
          <Link href="/" className="flex items-center gap-2" data-testid="link-home">
            <div className="w-8 h-8 rounded-md bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center">
              <Trophy className="h-4 w-4 text-white" />
            </div>
            <span className="font-serif text-xl font-bold tracking-tight">StarVote</span>
          </Link>
          <div className="hidden md:flex items-center gap-8">
            <a href="#categories" className="text-sm text-white/60 hover:text-white transition-colors" data-testid="link-categories">Categories</a>
            <a href="#how-it-works" className="text-sm text-white/60 hover:text-white transition-colors" data-testid="link-how-it-works">How It Works</a>
            <Link href="/competitions" className="text-sm text-white/60 hover:text-white transition-colors" data-testid="link-competitions">Competitions</Link>
          </div>
          <div className="flex items-center gap-3">
            {user ? (
              <Link href="/dashboard">
                <Button data-testid="button-dashboard" className="bg-gradient-to-r from-orange-500 to-amber-500 border-0 text-white">Dashboard</Button>
              </Link>
            ) : (
              <>
                <a href="/api/login">
                  <Button variant="ghost" className="text-white/70" data-testid="button-login">Log In</Button>
                </a>
                <a href="/api/login">
                  <Button data-testid="button-get-started" className="bg-gradient-to-r from-orange-500 to-amber-500 border-0 text-white">Get Started</Button>
                </a>
              </>
            )}
          </div>
        </div>
      </nav>

      <section ref={heroRef} className="relative min-h-screen flex items-center justify-center overflow-hidden">
        <motion.div style={{ y: heroY }} className="absolute inset-0">
          <img src="/images/template/bg-1.jpg" alt="" className="w-full h-full object-cover scale-110" />
          <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-black/60 to-black" />
          <div className="absolute inset-0 bg-gradient-to-r from-orange-900/30 via-transparent to-orange-900/20" />
        </motion.div>

        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-orange-500/10 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: "1s" }} />
        </div>

        <motion.div style={{ opacity: heroOpacity }} className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center pt-20">
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.2 }}>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 backdrop-blur-sm mb-8">
              <Flame className="h-4 w-4 text-orange-400" />
              <span className="text-sm text-white/80 tracking-wide uppercase">The Ultimate Talent Platform</span>
            </div>
          </motion.div>

          <motion.h1 initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1, delay: 0.4 }}
            className="font-serif text-5xl sm:text-6xl lg:text-8xl font-bold leading-tight tracking-tight">
            Where Stars Are
            <span className="block bg-gradient-to-r from-orange-400 via-amber-400 to-orange-500 bg-clip-text text-transparent"> Born</span>
          </motion.h1>

          <motion.p initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.7 }}
            className="mt-6 text-lg md:text-xl text-white/50 max-w-2xl mx-auto leading-relaxed">
            Compete in music, modeling, bodybuilding, dance, and more. Showcase your talent, earn public votes, and rise to the top.
          </motion.p>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 1 }}
            className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <a href="/api/login">
              <Button size="lg" className="bg-gradient-to-r from-orange-500 to-amber-500 border-0 text-white text-lg px-8" data-testid="button-hero-join">
                Join as Talent
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </a>
            <Link href="/competitions">
              <Button size="lg" variant="outline" className="border-white/20 text-white bg-white/5 backdrop-blur-sm text-lg px-8" data-testid="button-hero-browse">
                Browse Competitions
              </Button>
            </Link>
          </motion.div>

          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 1, delay: 1.3 }}
            className="mt-12 flex flex-wrap items-center justify-center gap-8 text-sm text-white/40">
            <span className="flex items-center gap-2">
              <Star className="h-4 w-4 text-orange-400/60" /> Free to apply
            </span>
            <span className="flex items-center gap-2">
              <Users className="h-4 w-4 text-orange-400/60" /> Public voting
            </span>
            <span className="flex items-center gap-2">
              <Vote className="h-4 w-4 text-orange-400/60" /> Real-time results
            </span>
          </motion.div>
        </motion.div>

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 2 }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10">
          <a href="#categories">
            <ChevronDown className="h-6 w-6 text-white/30 animate-bounce" />
          </a>
        </motion.div>
      </section>

      <section id="categories" className="relative py-24 md:py-32 bg-black">
        <div className="absolute inset-0 bg-gradient-to-b from-black via-zinc-950 to-black" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div ref={cats.ref} className={`text-center mb-16 transition-all duration-1000 ${cats.isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"}`}>
            <span className="text-sm text-orange-400 tracking-widest uppercase font-medium">Explore</span>
            <h2 className="font-serif text-4xl md:text-5xl font-bold mt-3 tracking-tight">Competition Categories</h2>
            <p className="mt-4 text-white/40 max-w-2xl mx-auto text-lg">Every type of talent has a stage. Find your spotlight.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { icon: Music, label: "Music", desc: "Singers, rappers, DJs & producers", img: "/images/template/a1.jpg", delay: 0 },
              { icon: Camera, label: "Modeling", desc: "Fashion, fitness & swimwear models", img: "/images/template/a2.jpg", delay: 0.1 },
              { icon: Dumbbell, label: "Bodybuilding", desc: "Physique, classic & open divisions", img: "/images/template/b1.jpg", delay: 0.2 },
              { icon: Star, label: "Dance", desc: "Hip-hop, contemporary & freestyle", img: "/images/template/a4.jpg", delay: 0.3 },
            ].map((cat) => (
              <Link href="/competitions" key={cat.label}>
                <div className="group relative h-80 rounded-md overflow-hidden cursor-pointer" data-testid={`card-category-${cat.label.toLowerCase()}`}>
                  <img src={cat.img} alt={cat.label} className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
                  <div className="absolute inset-0 bg-orange-500/0 group-hover:bg-orange-500/10 transition-colors duration-500" />
                  <div className="absolute bottom-0 left-0 right-0 p-6">
                    <cat.icon className="h-6 w-6 text-orange-400 mb-3" />
                    <h3 className="text-xl font-bold mb-1">{cat.label}</h3>
                    <p className="text-sm text-white/50">{cat.desc}</p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="relative py-24 md:py-32 overflow-hidden">
        <div className="absolute inset-0">
          <img src="/images/template/breadcumb3.jpg" alt="" className="w-full h-full object-cover" style={{ objectPosition: "center 30%" }} />
          <div className="absolute inset-0 bg-black/80" />
          <div className="absolute inset-0 bg-gradient-to-r from-orange-900/20 to-transparent" />
        </div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div ref={feat1.ref} className={`transition-all duration-700 ${feat1.isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"}`}>
              <div className="p-8 rounded-md bg-white/5 backdrop-blur-sm border border-white/5 h-full">
                <div className="w-14 h-14 rounded-md bg-gradient-to-br from-orange-500/20 to-amber-500/20 flex items-center justify-center mb-6">
                  <Trophy className="h-7 w-7 text-orange-400" />
                </div>
                <h3 className="text-xl font-bold mb-3">Any Competition</h3>
                <p className="text-white/40 leading-relaxed">Music, modeling, bodybuilding, dance, art -- create or join competitions in any talent category imaginable.</p>
              </div>
            </div>
            <div ref={feat2.ref} className={`transition-all duration-700 delay-100 ${feat2.isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"}`}>
              <div className="p-8 rounded-md bg-white/5 backdrop-blur-sm border border-white/5 h-full">
                <div className="w-14 h-14 rounded-md bg-gradient-to-br from-orange-500/20 to-amber-500/20 flex items-center justify-center mb-6">
                  <Vote className="h-7 w-7 text-orange-400" />
                </div>
                <h3 className="text-xl font-bold mb-3">Public Voting</h3>
                <p className="text-white/40 leading-relaxed">Fair, transparent voting. The public decides who wins with configurable vote limits and pricing per competition.</p>
              </div>
            </div>
            <div ref={feat3.ref} className={`transition-all duration-700 delay-200 ${feat3.isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"}`}>
              <div className="p-8 rounded-md bg-white/5 backdrop-blur-sm border border-white/5 h-full">
                <div className="w-14 h-14 rounded-md bg-gradient-to-br from-orange-500/20 to-amber-500/20 flex items-center justify-center mb-6">
                  <Star className="h-7 w-7 text-orange-400" />
                </div>
                <h3 className="text-xl font-bold mb-3">Rich Profiles</h3>
                <p className="text-white/40 leading-relaxed">Upload photos, videos, share your bio and social links. Build a stunning profile that shows the world your talent.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="how-it-works" className="relative py-24 md:py-32 bg-black">
        <div className="absolute inset-0 bg-gradient-to-b from-black via-zinc-950/50 to-black" />
        <div ref={steps.ref} className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className={`text-center mb-16 transition-all duration-1000 ${steps.isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"}`}>
            <span className="text-sm text-orange-400 tracking-widest uppercase font-medium">Get Started</span>
            <h2 className="font-serif text-4xl md:text-5xl font-bold mt-3 tracking-tight">How It Works</h2>
            <p className="mt-4 text-white/40 max-w-2xl mx-auto text-lg">Three simple steps to compete and win.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { step: "01", title: "Create Your Profile", desc: "Sign up, set up your talent profile with photos, videos, and bio. Make it stand out." },
              { step: "02", title: "Apply to Compete", desc: "Browse active competitions and apply to the ones that match your talent and goals." },
              { step: "03", title: "Win Public Votes", desc: "Once approved, share your profile. The contestant with the most votes wins the crown." },
            ].map((s, i) => (
              <div key={s.step} className={`text-center transition-all duration-700 ${steps.isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"}`}
                style={{ transitionDelay: `${i * 150}ms` }}>
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-orange-500 to-amber-500 text-white font-bold text-xl mb-6">
                  {s.step}
                </div>
                <h3 className="text-xl font-bold mb-3">{s.title}</h3>
                <p className="text-white/40 leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="relative py-24 md:py-32 overflow-hidden">
        <div className="absolute inset-0">
          <img src="/images/template/breadcumb.jpg" alt="" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-r from-black via-black/80 to-black/60" />
        </div>
        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="font-serif text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight leading-tight">
            Ready to
            <span className="bg-gradient-to-r from-orange-400 to-amber-400 bg-clip-text text-transparent"> Shine?</span>
          </h2>
          <p className="mt-5 text-lg text-white/40 max-w-xl mx-auto">Join talented individuals competing for recognition across the globe. Your spotlight is waiting.</p>
          <div className="mt-10">
            <a href="/api/login">
              <Button size="lg" className="bg-gradient-to-r from-orange-500 to-amber-500 border-0 text-white text-lg px-10" data-testid="button-cta-join">
                Get Started Now
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </a>
          </div>
        </div>
      </section>

      <footer className="border-t border-white/5 bg-black py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-center justify-between gap-6">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-md bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center">
                <Trophy className="h-3.5 w-3.5 text-white" />
              </div>
              <span className="font-serif font-bold text-lg">StarVote</span>
            </div>
            <div className="flex flex-wrap items-center gap-6 text-sm text-white/30">
              <Link href="/competitions" className="hover:text-white/60 transition-colors">Competitions</Link>
              <a href="/api/login" className="hover:text-white/60 transition-colors">Join Now</a>
            </div>
            <p className="text-sm text-white/20">&copy; {new Date().getFullYear()} StarVote. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
