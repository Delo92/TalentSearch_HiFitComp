import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ThemeToggle } from "@/components/theme-toggle";
import { Trophy, Star, Users, Vote, Flame, ArrowRight } from "lucide-react";
import { Link } from "wouter";

export default function Landing() {
  return (
    <div className="min-h-screen bg-background">
      <nav className="fixed top-0 left-0 right-0 z-50 backdrop-blur-xl bg-background/80 border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-4 h-16">
          <div className="flex items-center gap-2">
            <Trophy className="h-6 w-6 text-primary" />
            <span className="font-serif text-xl font-bold tracking-tight">StarVote</span>
          </div>
          <div className="hidden md:flex items-center gap-6">
            <a href="#features" className="text-sm text-muted-foreground hover:text-foreground transition-colors" data-testid="link-features">Features</a>
            <a href="#how-it-works" className="text-sm text-muted-foreground hover:text-foreground transition-colors" data-testid="link-how-it-works">How It Works</a>
            <Link href="/competitions" className="text-sm text-muted-foreground hover:text-foreground transition-colors" data-testid="link-competitions">Competitions</Link>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <a href="/api/login">
              <Button variant="outline" data-testid="button-login">Log In</Button>
            </a>
            <a href="/api/login">
              <Button data-testid="button-get-started">Get Started</Button>
            </a>
          </div>
        </div>
      </nav>

      <section className="relative pt-16 overflow-hidden">
        <div className="absolute inset-0">
          <img
            src="/images/hero-bg.png"
            alt=""
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/60 to-background" />
        </div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 md:py-36 lg:py-44">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-primary/20 border border-primary/30 mb-6">
              <Flame className="h-3.5 w-3.5 text-primary" />
              <span className="text-xs font-medium text-primary-foreground/90">The Ultimate Talent Competition Platform</span>
            </div>
            <h1 className="font-serif text-4xl sm:text-5xl lg:text-6xl font-bold text-white leading-tight tracking-tight">
              Where Talent Meets
              <span className="text-primary"> Recognition</span>
            </h1>
            <p className="mt-5 text-lg text-white/70 max-w-xl leading-relaxed">
              Compete, showcase your talent, and let the public decide. From music artists to models, bodybuilders to dancers — your stage awaits.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <a href="/api/login">
                <Button size="lg" data-testid="button-hero-join">
                  Join as Talent
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </a>
              <Link href="/competitions">
                <Button size="lg" variant="outline" className="bg-white/5 backdrop-blur-sm border-white/20 text-white" data-testid="button-hero-browse">
                  Browse Competitions
                </Button>
              </Link>
            </div>
            <div className="mt-8 flex flex-wrap items-center gap-6 text-sm text-white/50">
              <span className="flex items-center gap-1.5">
                <Star className="h-3.5 w-3.5 text-primary" /> Free to apply
              </span>
              <span className="flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5 text-primary" /> Public voting
              </span>
              <span className="flex items-center gap-1.5">
                <Vote className="h-3.5 w-3.5 text-primary" /> Real-time results
              </span>
            </div>
          </div>
        </div>
      </section>

      <section id="features" className="py-20 md:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <h2 className="font-serif text-3xl md:text-4xl font-bold tracking-tight">Built for Every Type of Competition</h2>
            <p className="mt-3 text-muted-foreground max-w-2xl mx-auto">Whether you're a singer, model, athlete, or any performer — our platform gives you a stage to shine and win.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <FeatureCard
              icon={<Trophy className="h-6 w-6 text-primary" />}
              title="Any Competition Category"
              description="Music, modeling, bodybuilding, dance, art — create or join competitions in any talent category."
            />
            <FeatureCard
              icon={<Vote className="h-6 w-6 text-primary" />}
              title="Public Voting System"
              description="Fair, transparent voting. The public decides who wins with configurable vote limits and pricing."
            />
            <FeatureCard
              icon={<Star className="h-6 w-6 text-primary" />}
              title="Rich Talent Profiles"
              description="Upload photos, videos, share your bio and social links. Show the world what makes you a star."
            />
          </div>
        </div>
      </section>

      <section id="how-it-works" className="py-20 md:py-28 bg-card">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <h2 className="font-serif text-3xl md:text-4xl font-bold tracking-tight">How It Works</h2>
            <p className="mt-3 text-muted-foreground max-w-2xl mx-auto">Three simple steps to compete and win.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <StepCard step="01" title="Create Your Profile" description="Sign up, set up your talent profile with photos, videos, and bio. Show off what makes you unique." />
            <StepCard step="02" title="Apply to Compete" description="Browse active competitions and apply to the ones that match your talent. Admins review and approve." />
            <StepCard step="03" title="Win Votes" description="Once approved, the public votes for their favorites. The contestant with the most votes wins." />
          </div>
        </div>
      </section>

      <section className="py-20 md:py-28">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="font-serif text-3xl md:text-4xl font-bold tracking-tight">Ready to Shine?</h2>
          <p className="mt-3 text-muted-foreground">Join thousands of talented individuals competing for recognition. Your spotlight is waiting.</p>
          <div className="mt-8">
            <a href="/api/login">
              <Button size="lg" data-testid="button-cta-join">
                Get Started Now
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </a>
          </div>
        </div>
      </section>

      <footer className="border-t border-border py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-primary" />
            <span className="font-serif font-bold">StarVote</span>
          </div>
          <p className="text-sm text-muted-foreground">&copy; {new Date().getFullYear()} StarVote. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <Card className="hover-elevate">
      <CardContent className="p-6">
        <div className="mb-4 inline-flex items-center justify-center w-10 h-10 rounded-md bg-primary/10">
          {icon}
        </div>
        <h3 className="font-semibold text-lg mb-2">{title}</h3>
        <p className="text-muted-foreground text-sm leading-relaxed">{description}</p>
      </CardContent>
    </Card>
  );
}

function StepCard({ step, title, description }: { step: string; title: string; description: string }) {
  return (
    <div className="text-center">
      <div className="inline-flex items-center justify-center w-12 h-12 rounded-md bg-primary/10 text-primary font-bold text-lg mb-4">
        {step}
      </div>
      <h3 className="font-semibold text-lg mb-2">{title}</h3>
      <p className="text-muted-foreground text-sm leading-relaxed">{description}</p>
    </div>
  );
}
