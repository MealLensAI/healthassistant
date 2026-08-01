const LandingFooter = () => {
  const footerLinks = {
    Product: [
      { name: "Features", href: "#features" },
      { name: "How it works", href: "#how-it-works" },
      { name: "Pricing", href: "#pricing" },
      { name: "Who it's for", href: "#who" },
    ],
    Legal: [
      { name: "Privacy", href: "#" },
      { name: "Terms", href: "#" },
    ],
  };

  return (
    <footer className="bg-primary text-primary-foreground py-16">
      <div className="container mx-auto px-4 lg:px-8">
        <div className="grid lg:grid-cols-4 gap-12 mb-12">
          <div className="lg:col-span-2">
            <p className="font-display text-2xl tracking-tight mb-4">
              MealLensAI
            </p>
            <p className="text-primary-foreground/75 max-w-sm mb-5 leading-relaxed">
              Manage your health through food with ease. Hospitals don&apos;t
              solve adherence. We do.
            </p>
            <p className="text-sm text-primary-foreground/70 mb-1">
              meallensai@gmail.com
            </p>
            <p className="text-sm text-primary-foreground/70">
              WhatsApp or call:{" "}
              <a
                href="tel:+254748703778"
                className="text-white hover:underline"
              >
                +254748703778
              </a>
            </p>
          </div>

          {Object.entries(footerLinks).map(([category, links]) => (
            <div key={category}>
              <h4 className="font-semibold mb-4 text-sm text-white">
                {category}
              </h4>
              <ul className="space-y-3">
                {links.map((link) => (
                  <li key={link.name}>
                    <a
                      href={link.href}
                      className="text-primary-foreground/70 hover:text-white transition-colors text-sm"
                    >
                      {link.name}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="pt-8 border-t border-white/15">
          <p className="text-sm text-primary-foreground/60">
            © {new Date().getFullYear()} MealLensAI. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default LandingFooter;
