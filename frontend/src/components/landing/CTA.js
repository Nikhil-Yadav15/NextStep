import { Button } from "@/components/ui/button";
// import { Link } from "react-router-dom";
import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";

const CTA = () => {
  return (
    <section className="py-24 relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 bg-gradient-to-b from-background via-primary/3 to-background" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary/5 rounded-full blur-3xl" />

      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-4xl mx-auto text-center space-y-8 glass-card p-12 rounded-2xl">
          {/* Icon */}
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/20 animate-glow">
            <Sparkles className="h-8 w-8 text-primary" />
          </div>

          {/* Heading */}
          <h2 className="text-4xl md:text-5xl font-bold leading-tight">
            Ready to <span className="text-primary">Transform</span> Your Career?
          </h2>

          {/* Description */}
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Join thousands of professionals who are accelerating their career growth with AI-powered guidance. Start your journey today.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <Link href="/auth">
              <Button variant="hero" size="lg" className="group">
                Get Started for Free
                <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
            <a href="#features">
              <Button variant="outline" size="lg">
                Learn More
              </Button>
            </a>
          </div>

          {/* Trust Badge */}
          <p className="text-sm text-muted-foreground pt-4">
            No credit card required • Free trial available • Cancel anytime
          </p>
        </div>
      </div>
    </section>
  );
};

export default CTA;
