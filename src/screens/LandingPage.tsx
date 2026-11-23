import { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { cn } from "../components/ui";

export default function LandingPage() {
  const navigate = useNavigate();
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("yearly");
  const [showPrivacyModal, setShowPrivacyModal] = useState<boolean>(false);
  const [showTermsModal, setShowTermsModal] = useState<boolean>(false);
  const [activeFaq, setActiveFaq] = useState<number | null>(0);
  const [activeSectionIndex, setActiveSectionIndex] = useState<number>(0);
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);

  const sectionRefs = useRef<(HTMLElement | null)[]>([]);

  const scrollToDownload = (e: React.MouseEvent) => {
    e.preventDefault();
    const el = document.getElementById("download");
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
    }
  };

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
    }
    setMobileMenuOpen(false);
  };

  // Track active section as user scrolls
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const index = Number(entry.target.getAttribute("data-section-index"));
            if (!isNaN(index)) {
              setActiveSectionIndex(index);
            }
          }
        });
      },
      { threshold: 0.35 }
    );

    sectionRefs.current.forEach((ref) => {
      if (ref) observer.observe(ref);
    });

    return () => observer.disconnect();
  }, []);

  const sections = [
    {
      id: "overview",
      badge: "DIGITAL WARDROBE INTELLIGENCE",
      badgeColor: "bg-[#FF7F02] text-white",
      tagline: "STILLNESS COLLECTION · ADDIS ABABA",
      title: "Your Wardrobe, Digitized.",
      subtitle: "Precision daily styling built from the clothes you already own.",
      description:
        "Stop guessing what goes together every morning. ፍሬ (Firie) digitizes your real clothing, scores color harmony across the full palette, and assembles ready-to-wear outfits adapted to your live weather.",
      video: "/videos/page-1.mp4",
      poster: "/images/page_previews/page_1.jpg",
      hasDownloadBtn: true,
      specs: [
        { label: "Vision AI", value: "Sub-Second" },
        { label: "Weather Sync", value: "21°C Addis" },
        { label: "Harmony Score", value: "98% Match" },
      ],
      bullets: [
        "Instant background isolation for all closet pieces",
        "Calibrated to live weather and humidity",
        "Personalized outfit suggestions in under 3 seconds",
      ],
      align: "text-left",
    },
    {
      id: "curation-swiper",
      badge: "AI OUTFIT DISCOVERY",
      badgeColor: "bg-[#FF7F02] text-white",
      tagline: "EFFORTLESS MORNING ROUTINE",
      title: "Swipe Through Today's Looks.",
      subtitle: "Magazine-quality flat-lay outfits assembled from what you own.",
      description:
        "Every morning, ፍሬ (Firie) presents ready-to-wear combinations built exclusively from your closet. Swipe right to wear the look, or swipe left to pass to the next suggestion.",
      video: "/videos/page-2.mp4",
      poster: "/images/page_previews/page_2.jpg",
      hasDownloadBtn: false,
      specs: [
        { label: "Interaction", value: "Fluid Swiper" },
        { label: "Color Theory", value: "12-Hue Wheel" },
        { label: "Calendar", value: "Auto-Logged" },
      ],
      bullets: [
        "Fluid swipe gestures (✕ Pass, ♥ Wear)",
        "Automatic color harmony scoring (96%+ matches)",
        "Monthly visual outfit calendar & rotation tracker (Pro)",
      ],
      align: "video-left",
    },
    {
      id: "silhouette-harmony",
      badge: "SILHOUETTE & PROPORTION ARCHITECTURE",
      badgeColor: "bg-[#FF7F02] text-white",
      tagline: "TAILORED CUTS & DRAPE",
      title: "Balanced Proportions, Every Time.",
      subtitle: "From headwear to footwear, the whole silhouette is considered.",
      description:
        "A great outfit is more than matching colors. ፍሬ (Firie) evaluates drape, fabric weight, and silhouette balance — pairing relaxed oversized pieces with structured bottoms for an effortless contemporary line.",
      video: "/videos/page-3.mp4",
      poster: "/images/page_previews/page_3.jpg",
      hasDownloadBtn: false,
      specs: [
        { label: "Top Cut", value: "Boxy Drop-Shoulder" },
        { label: "Bottom Cut", value: "Wide Fluid Leg" },
        { label: "Balance", value: "97% Proportion" },
      ],
      bullets: [
        "Heavyweight cotton terry & knitwear balancing",
        "Sleeve break & drop-shoulder proportion calibration",
        "Smart footwear pairing based on trouser hem cut",
      ],
      align: "text-left",
    },
    {
      id: "climate-layering",
      badge: "REAL-TIME CLIMATE LAYERING",
      badgeColor: "bg-[#FF7F02] text-white",
      tagline: "LIVE METEOROLOGY SYNC",
      title: "Dressed for the Weather Outside.",
      subtitle: "Thermal comfort from the morning chill to the evening breeze.",
      description:
        "ፍሬ (Firie) reads live weather data for your city. Whether it moves from 16°C in the morning to 24°C by afternoon in Addis Ababa, it selects the outer layers you can wear or stow without a second thought.",
      video: "/videos/page-4.mp4",
      poster: "/images/page_previews/page_4.jpg",
      hasDownloadBtn: false,
      specs: [
        { label: "Live City", value: "Addis Ababa" },
        { label: "Temperature", value: "21°C Mild" },
        { label: "Protection", value: "Wind & Sun" },
      ],
      bullets: [
        "Real-time temperature and precipitation forecast sync",
        "Smart zip-hoodie and light outerwear layering alerts",
        "Never carry a jacket you won't need",
      ],
      align: "video-left",
    },
    {
      id: "venue-spots",
      badge: "CURATED VENUE DRESS CODES",
      badgeColor: "bg-[#FF7F02] text-white",
      tagline: "CITY EXPLORATION & NIGHTLIFE",
      title: "Venues, Dress Codes & Budgets.",
      subtitle: "Know where to go — and what to wear — before you leave.",
      description:
        "Heading out for coffee, a rooftop sunset or a weekend celebration? ፍሬ (Firie) matches your outfit to curated spots in Addis Ababa and beyond, with verified menu prices and a budget calculator in ETB. Included with ፍሬ Pro.",
      video: "/videos/page-5.mp4",
      poster: "/images/page_previews/page_5.jpg",
      hasDownloadBtn: false,
      specs: [
        { label: "Venues", value: "50+ Curated Spots" },
        { label: "Dress Code", value: "Smart Casual" },
        { label: "Ambiance", value: "Lounge & Sunset" },
      ],
      bullets: [
        "Curated rooftop, lounge, café and restaurant database",
        "Dress-code guidance for every venue",
        "Verified menu prices and party budget estimates (Pro)",
      ],
      align: "text-left",
    },
    {
      id: "kinetic-motion",
      badge: "KINETIC DRAPE & MOVEMENT",
      badgeColor: "bg-[#FF7F02] text-white",
      tagline: "ERGONOMICS IN MOTION",
      title: "Clothes That Move With You.",
      subtitle: "Tested in motion, so you look confident from every angle.",
      description:
        "Garments should not only look good on a hanger or lying flat on a bed. ፍሬ (Firie) evaluates movement and drape so your clothes feel as good as they look while you walk.",
      video: "/videos/page-6.mp4",
      poster: "/images/page_previews/page_6.jpg",
      hasDownloadBtn: false,
      specs: [
        { label: "Stride Test", value: "24 FPS Fluid" },
        { label: "Crease Lines", value: "Anti-Pinch" },
        { label: "Flexibility", value: "Full Range" },
      ],
      bullets: [
        "Fluid motion testing and drape integrity",
        "Natural crease behavior and posture harmony",
        "Designed for all-day confidence in motion",
      ],
      align: "video-left",
    },
    {
      id: "ai-studio",
      badge: "INSTANT WARDROBE DIGITIZATION",
      badgeColor: "bg-[#FF7F02] text-white",
      tagline: "DIGITAL CLOSET EDITORIAL",
      title: "Studio-Quality Cutouts, Instantly.",
      subtitle: "Turn ordinary closet photos into clean digital assets.",
      description:
        "Photograph your hoodie, jacket or shoes anywhere — on a hanger, a bed or the carpet. ፍሬ (Firie) isolates the garment in milliseconds with precise edges, and every photo stays on your device.",
      video: "/videos/page-7.mp4",
      poster: "/images/page_previews/page_7.jpg",
      hasDownloadBtn: false,
      specs: [
        { label: "Cutout Speed", value: "< 250 ms" },
        { label: "Edge Accuracy", value: "Sub-Pixel" },
        { label: "Privacy", value: "100% On-Device" },
      ],
      bullets: [
        "Sub-second AI background cutout on device",
        "Automatic color palette & fabric classification",
        "100% private: photos never leave your device",
      ],
      align: "text-left",
    },
    {
      id: "daily-confidence",
      badge: "EFFORTLESS DAILY CONFIDENCE",
      badgeColor: "bg-[#FF7F02] text-white",
      tagline: "READY TO WEAR",
      title: "Your Daily Look, Ready to Wear.",
      subtitle: "No morning decision fatigue. Ready in seconds.",
      description:
        "Reclaim your mornings. ፍሬ (Firie) removes the daily stress of “what should I wear today?” so you start every day looking sharp, put-together, and authentically yourself.",
      video: "/videos/page-8.mp4",
      poster: "/images/page_previews/page_8.jpg",
      hasDownloadBtn: true,
      specs: [
        { label: "Time Saved", value: "15 min / day" },
        { label: "Free Plan", value: "0 ETB" },
        { label: "Platforms", value: "Android & iOS" },
      ],
      bullets: [
        "Direct install for Android (APK) and iPhone (IPA)",
        "Free plan: one fresh look a day, three a week",
        "Pro adds unlimited looks, Date Spots, widgets & history",
      ],
      align: "video-left",
    },
  ];

  const faqs = [
    {
      q: "How does ፍሬ (Firie) choose outfits from my real clothes?",
      a: "Simply take a photo of your garments on a hanger, bed, or floor. ፍሬ (Firie) automatically removes the background in milliseconds, tags each item by tone, category, and fabric, and uses color harmony science to assemble ready-to-wear flat-lay outfits adapted to your real-time local weather.",
    },
    {
      q: "Can I install ፍሬ (Firie) directly on Android and iPhone without an App Store?",
      a: "Yes! For Android, click the Download button to get FITLY.apk and tap to install immediately. For iPhone, you can download the FITLY.ipa package or open this page in Safari and tap 'Add to Home Screen' for an instant standalone app.",
    },
    {
      q: "Are my photos and wardrobe items kept private?",
      a: "100% private. All your wardrobe imagery, outfits, and styling preferences stay on your device and are never sold or shared with third-party advertisers.",
    },
    {
      q: "How does the Photo Style Camera work?",
      a: "It acts like a personal fashion photographer: it evaluates your current outfit and destination, displays interactive skeletal pose overlays on the screen, indicates the ideal camera angle (such as low knee-level for elongating shoes), and applies cinematic color filters.",
    },
    {
      q: "What is the difference between Free and Pro?",
      a: "Free includes one fresh outfit look per day (up to three per week) for a wardrobe of up to 30 pieces, plus one photo style pose guide per day. Pro (600 ETB/month, or 360 ETB/month billed yearly with 40% OFF) unlocks unlimited outfit looks, unlimited wardrobe pieces, the complete Date Spots planner with verified menu prices, home screen widgets, full outfit history and monthly outfit calendars.",
    },
  ];

  return (
    <div className="min-h-screen bg-[#FFFFFF] text-[#18181B] selection:bg-[#FF7F02] selection:text-white font-sans antialiased overflow-x-hidden">
      {/* ── Top Editorial Strip ── */}
      <div className="border-b border-orange-100 bg-[#FFFBF7] px-4 py-2 text-[10px] font-black tracking-widest text-[#71717A]">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <span className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-[#FF7F02] animate-ping" />
            <span className="text-[#FF7F02] font-black">ፍሬ · FIRIE LOOKBOOK</span>
            <span className="text-zinc-400">· 2026 COLLECTION</span>
          </span>
          <span className="hidden sm:inline">DIGITAL WARDROBE INTELLIGENCE IN MOTION</span>
          <span>ADDIS ABABA · GLOBAL</span>
        </div>
      </div>

      {/* ── Main Sticky Navbar (Mobile & Desktop Responsive) ── */}
      <header className="sticky top-0 z-50 border-b border-orange-100 bg-white/95 backdrop-blur-xl transition-all shadow-xs">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          {/* Brand Logo */}
          <Link to="/" className="flex items-center gap-2.5 active:scale-95 transition-transform">
            <div className="grid h-10 w-10 place-items-center rounded-2xl bg-white p-1 shadow-md border border-orange-200">
              <img
                src="/logo/firie-logo.png"
                alt="ፍሬ (Firie) Logo"
                className="h-full w-full object-contain"
              />
            </div>
            <span className="text-xl font-black tracking-tight text-[#18181B]">
              ፍሬ<span className="text-[#FF7F02]">.</span>
              <span className="ml-1 text-xs font-bold text-[#FF7F02] tracking-normal">Firie</span>
            </span>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden lg:flex items-center gap-7 text-xs font-bold text-[#71717A]">
            <a href="#overview" className="hover:text-[#FF7F02] transition-colors">Overview</a>
            <a href="#curation-swiper" className="hover:text-[#FF7F02] transition-colors">AI Swiper</a>
            <a href="#silhouette-harmony" className="hover:text-[#FF7F02] transition-colors">Proportions</a>
            <a href="#climate-layering" className="hover:text-[#FF7F02] transition-colors">Weather</a>
            <a href="#venue-spots" className="hover:text-[#FF7F02] transition-colors">Venues</a>
            <a href="#kinetic-motion" className="hover:text-[#FF7F02] transition-colors">Motion</a>
            <a href="#ai-studio" className="hover:text-[#FF7F02] transition-colors">Studio</a>
            <a href="#pricing" className="hover:text-[#FF7F02] transition-colors">Plans</a>
            <a href="#faq" className="hover:text-[#FF7F02] transition-colors">FAQ</a>
          </nav>

          {/* Action Area: Mobile Hamburger + Single Download Button */}
          <div className="flex items-center gap-2 sm:gap-3">
            <a
              href="#download"
              onClick={scrollToDownload}
              className="rounded-full bg-[#FF7F02] hover:bg-[#E57200] px-5 sm:px-6 py-2.5 text-xs font-black text-white shadow-lg shadow-orange-500/25 active:scale-95 transition-all flex items-center gap-1.5"
            >
              <span>Download</span>
              <span className="text-[11px]">⬇</span>
            </a>

            {/* Mobile Hamburger Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 rounded-xl border border-orange-100 bg-white text-[#18181B] shadow-xs active:scale-95"
              aria-label="Toggle Navigation Menu"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {mobileMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="lg:hidden border-b border-orange-100 bg-white/95 backdrop-blur-xl px-4 py-4 space-y-2 animate-fade">
            <div className="grid grid-cols-2 gap-2 text-xs font-bold text-[#71717A]">
              {sections.map((s) => (
                <button
                  key={s.id}
                  onClick={() => scrollToSection(s.id)}
                  className="rounded-xl border border-orange-100 bg-[#FFFBF7] p-2.5 text-left hover:bg-[#FF7F02] hover:text-white transition-all truncate"
                >
                  {s.badge}
                </button>
              ))}
            </div>
            <div className="flex justify-between pt-3 border-t border-orange-100 text-xs font-bold text-[#18181B]">
              <a href="#pricing" onClick={() => setMobileMenuOpen(false)} className="p-2 hover:text-[#FF7F02]">Plans & Pricing</a>
              <a href="#faq" onClick={() => setMobileMenuOpen(false)} className="p-2 hover:text-[#FF7F02]">FAQ</a>
              <button onClick={() => navigate("/")} className="p-2 text-[#FF7F02]">Launch Web App ›</button>
            </div>
          </div>
        )}
      </header>

      {/* ── Floating Progress Indicator Pill (Desktop Right Side) ── */}
      <div className="hidden xl:flex fixed right-6 top-1/2 -translate-y-1/2 z-40 flex-col items-center gap-2 bg-white/90 backdrop-blur-md p-2 rounded-full border border-orange-100 shadow-xl">
        {sections.map((s, idx) => (
          <button
            key={s.id}
            onClick={() => scrollToSection(s.id)}
            title={s.title}
            className={cn(
              "h-2.5 w-2.5 rounded-full transition-all duration-300",
              activeSectionIndex === idx
                ? "h-8 bg-[#FF7F02] shadow-sm shadow-orange-500/50"
                : "bg-orange-200 hover:bg-orange-300"
            )}
          />
        ))}
      </div>

      {/* ── SECTIONS: FRAMELESS CINEMATIC VIDEO BACKGROUND & EDITORIAL TEXT ── */}
      <main className="divide-y divide-orange-100">
        {sections.map((s, index) => {
          const isTextLeft = s.align === "text-left";
          const isEven = index % 2 === 0;
          return (
            <section
              key={s.id}
              id={s.id}
              data-section-index={index}
              ref={(el) => (sectionRefs.current[index] = el)}
              className={cn(
                "relative min-h-[85vh] md:min-h-screen flex items-center py-12 sm:py-20 md:py-28 overflow-hidden",
                isEven ? "bg-white" : "bg-[#FFFBF7]"
              )}
            >
              <div className="mx-auto max-w-6xl px-4 sm:px-6 w-full relative z-10">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-14 items-center">
                  {/* ── Editorial Text Column ── */}
                  <div
                    className={cn(
                      "lg:col-span-6 space-y-5 sm:space-y-6",
                      isTextLeft ? "order-1" : "order-1 lg:order-2"
                    )}
                  >
                    {/* Minimalist Editorial Category Badge */}
                    <div className="flex flex-wrap items-center gap-2.5">
                      <span className={cn("rounded-full px-4 py-1 text-[10px] font-black tracking-widest uppercase shadow-xs", s.badgeColor)}>
                        {s.badge}
                      </span>
                      <span className="text-[10px] font-extrabold text-[#71717A] tracking-widest uppercase hidden sm:inline">
                        / {s.tagline}
                      </span>
                    </div>

                    {/* Headline */}
                    <h2 className="text-3xl sm:text-5xl lg:text-[54px] font-black tracking-tight text-[#18181B] leading-[1.06] uppercase">
                      {s.title}
                    </h2>

                    {/* Subtitle Accent */}
                    <p className="text-sm sm:text-base md:text-lg font-bold text-[#FF7F02] leading-snug">
                      {s.subtitle}
                    </p>

                    {/* Narrative Description */}
                    <p className="text-sm sm:text-base text-[#52525B] leading-relaxed font-normal">
                      {s.description}
                    </p>

                    {/* Spec Stats Pill Grid */}
                    <div className="grid grid-cols-3 gap-2.5 sm:gap-3.5 pt-1">
                      {s.specs.map((spec, sIdx) => (
                        <div
                          key={sIdx}
                          className="rounded-2xl border border-orange-100 bg-white p-3 text-center shadow-2xs hover:border-orange-300 transition-colors"
                        >
                          <p className="text-[9px] sm:text-[10px] font-black uppercase tracking-wider text-[#A1A1AA]">
                            {spec.label}
                          </p>
                          <p className="text-xs sm:text-sm font-black text-[#18181B] mt-0.5 truncate">
                            {spec.value}
                          </p>
                        </div>
                      ))}
                    </div>

                    {/* Feature Checkpoints */}
                    <ul className="space-y-2.5 pt-1 text-xs sm:text-sm font-semibold text-[#18181B]">
                      {s.bullets.map((b, bIdx) => (
                        <li key={bIdx} className="flex items-center gap-2.5">
                          <span className="h-5 w-5 rounded-full bg-[#FF7F02] text-white text-[10px] font-black grid place-items-center shrink-0 shadow-xs">
                            ✓
                          </span>
                          <span>{b}</span>
                        </li>
                      ))}
                    </ul>

                    {/* Single Download Button if on Overview or Final Section */}
                    {s.hasDownloadBtn && (
                      <div className="pt-3 flex flex-wrap items-center gap-4">
                        <a
                          href="#download"
                          onClick={scrollToDownload}
                          className="w-full sm:w-auto inline-flex items-center justify-center gap-3 rounded-full bg-[#FF7F02] hover:bg-[#E57200] px-8 py-4 text-xs sm:text-sm font-black text-white shadow-xl shadow-orange-500/25 hover:shadow-2xl hover:-translate-y-0.5 active:translate-y-0 transition-all"
                        >
                          <span>Download App</span>
                          <span className="text-base">⬇</span>
                        </a>

                        <span className="text-xs font-bold text-[#71717A] flex items-center gap-1.5">
                          <span className="h-2 w-2 rounded-full bg-[#FF7F02] animate-pulse" />
                          <span>Mobile App exclusively for Android & iOS</span>
                        </span>
                      </div>
                    )}
                  </div>

                  {/* ── Frameless Clean Cinematic Video ── */}
                  <div
                    className={cn(
                      "lg:col-span-6 flex justify-center",
                      isTextLeft ? "order-2" : "order-2 lg:order-1"
                    )}
                  >
                    <div className="relative w-full max-w-[340px] sm:max-w-md lg:max-w-[460px] rounded-3xl sm:rounded-[36px] overflow-hidden shadow-2xl bg-black group ring-1 ring-orange-500/20">
                      <video
                        src={s.video}
                        poster={s.poster}
                        autoPlay
                        loop
                        muted
                        playsInline
                        preload="auto"
                        className="w-full h-[480px] sm:h-[580px] md:h-[640px] object-cover object-center group-hover:scale-102 transition-transform duration-700"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </section>
          );
        })}
      </main>

      {/* ── DIRECT OFFICIAL DOWNLOAD HUB ── */}
      <section id="download" className="py-20 sm:py-28 border-t border-orange-100 bg-[#FFFBF7]">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <div className="text-center max-w-2xl mx-auto">
            <span className="rounded-full bg-[#FF7F02] text-white px-4 py-1 text-[10px] font-black uppercase tracking-widest shadow-xs">
              OFFICIAL APPLICATION BUILDS
            </span>
            <h2 className="mt-3 text-3xl sm:text-5xl font-black text-[#18181B] tracking-tight">
              Get ፍሬ (Firie) on Your Phone
            </h2>
            <p className="mt-2 text-xs sm:text-sm text-[#71717A]">
              Direct downloads for Android and iPhone — no ads, no tracking, no store approval wait.
            </p>
          </div>

          <div className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
            {/* Android Card */}
            <div className="rounded-3xl border border-orange-100 bg-white p-6 sm:p-8 flex flex-col justify-between shadow-lg relative overflow-hidden group hover:border-[#FF7F02] transition-all">
              <div>
                <div className="flex items-center justify-between">
                  <span className="grid h-12 w-12 place-items-center rounded-2xl bg-[#FF7F02] text-2xl text-white shadow-md shadow-orange-500/25">
                    🤖
                  </span>
                  <span className="rounded-full bg-orange-100 border border-orange-300 px-3 py-1 text-[10px] font-black text-orange-900">
                    Direct APK · Fast Install
                  </span>
                </div>
                <h3 className="mt-5 text-2xl font-black text-[#18181B]">Android Direct APK</h3>
                <p className="mt-2 text-xs leading-relaxed text-[#71717A]">
                  Official Android application package with adaptive orange launcher icon, camera pose guidance, and desktop widgets.
                </p>
                <ul className="mt-4 space-y-2 text-xs text-[#18181B] font-medium">
                  <li className="flex items-center gap-2">✓ Compatible with Android 10, 11, 12, 13, 14 & 15</li>
                  <li className="flex items-center gap-2">✓ Local background AI image isolation</li>
                  <li className="flex items-center gap-2">✓ Offline wardrobe storage & real weather</li>
                </ul>
              </div>

              <div className="mt-8 pt-4 border-t border-orange-100">
                <a
                  href="/FITLY.apk"
                  download="FITLY.apk"
                  className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[#FF7F02] hover:bg-[#E57200] text-white font-black text-xs transition-transform active:scale-95 shadow-lg shadow-orange-500/25"
                >
                  <span>⬇️ Download FITLY.apk</span>
                </a>
                <p className="mt-2 text-center text-[10px] text-[#A1A1AA]">
                  File: FITLY.apk · Tap file on Android to install immediately
                </p>
              </div>
            </div>

            {/* iOS Card */}
            <div className="rounded-3xl border border-orange-100 bg-white p-6 sm:p-8 flex flex-col justify-between shadow-lg relative overflow-hidden group hover:border-[#FF7F02] transition-all">
              <div>
                <div className="flex items-center justify-between">
                  <span className="grid h-12 w-12 place-items-center rounded-2xl bg-[#FF7F02] text-2xl text-white shadow-md shadow-orange-500/25">
                    
                  </span>
                  <span className="rounded-full bg-orange-100 border border-orange-300 px-3 py-1 text-[10px] font-black text-orange-900">
                    IPA & 1-Tap Safari
                  </span>
                </div>
                <h3 className="mt-5 text-2xl font-black text-[#18181B]">Apple iOS (iPhone / iPad)</h3>
                <p className="mt-2 text-xs leading-relaxed text-[#71717A]">
                  Install ፍሬ (Firie) on your iPhone in 5 seconds via Safari with zero extra software, or download the compiled IPA package.
                </p>
                <div className="mt-4 rounded-2xl bg-[#FFFBF7] border border-orange-100 p-3.5 text-xs text-[#18181B] space-y-1">
                  <p className="font-black text-[#18181B] flex items-center gap-1.5">
                    <span>💡</span>
                    <span>1-Tap Instant Install on iPhone:</span>
                  </p>
                  <p className="text-[11px] text-[#71717A]">
                    1. Open this website in <b>Safari</b> on your iPhone.
                  </p>
                  <p className="text-[11px] text-[#71717A]">
                    2. Tap the <b>Share ⬆️</b> icon at the bottom.
                  </p>
                  <p className="text-[11px] text-[#71717A]">
                    3. Tap <b>"Add to Home Screen" ➕</b>.
                  </p>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-orange-100 flex flex-col gap-2">
                <a
                  href="/FITLY.ipa"
                  download="FITLY.ipa"
                  className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[#FF7F02] hover:bg-[#E57200] text-white font-black text-xs transition-transform active:scale-95 shadow-lg shadow-orange-500/25"
                >
                  <span>⬇️ Download FITLY.ipa</span>
                </a>
                <p className="text-center text-[10px] text-[#A1A1AA]">
                  For AltStore, Sideloadly, or direct developer install
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Pricing & Plans ── */}
      <section id="pricing" className="py-20 sm:py-28 border-t border-orange-100 bg-white">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <div className="text-center max-w-2xl mx-auto">
            <p className="text-xs font-black uppercase tracking-widest text-[#FF7F02]">HONEST TRANSPARENCY</p>
            <h2 className="mt-2 text-3xl sm:text-4xl font-black text-[#18181B]">Invest in How You Present Yourself</h2>
            <p className="mt-2 text-xs sm:text-sm text-[#71717A]">
              Start free with one fresh look a day, or unlock unlimited outfits, Date Spots and photo tools with Pro.
            </p>

            <div className="mt-6 inline-flex rounded-full bg-[#FFFBF7] p-1 border border-orange-200 shadow-xs">
              <button
                onClick={() => setBillingCycle("monthly")}
                className={cn(
                  "rounded-full px-5 py-2 text-xs font-bold transition-all",
                  billingCycle === "monthly" ? "bg-[#FF7F02] text-white shadow-xs" : "text-[#71717A]"
                )}
              >
                Monthly (600 ETB)
              </button>
              <button
                onClick={() => setBillingCycle("yearly")}
                className={cn(
                  "rounded-full px-5 py-2 text-xs font-bold transition-all flex items-center gap-1.5",
                  billingCycle === "yearly" ? "bg-[#FF7F02] text-white shadow-xs" : "text-[#71717A]"
                )}
              >
                <span>Yearly (360 ETB/mo)</span>
                <span className="rounded-full bg-amber-400 text-black px-1.5 py-0.5 text-[9px] font-black">
                  40% OFF
                </span>
              </button>
            </div>
          </div>

          <div className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            {/* Free Plan */}
            <div className="rounded-3xl border border-orange-100 bg-[#FFFBF7] p-7 sm:p-8 flex flex-col justify-between shadow-sm">
              <div>
                <span className="rounded-full bg-white px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-[#71717A] border border-orange-200">
                  Free Tier
                </span>
                <div className="mt-4 flex items-baseline gap-1">
                  <span className="text-4xl font-black text-[#18181B]">0 ETB</span>
                  <span className="text-xs text-[#71717A]">/ forever</span>
                </div>
                <p className="mt-2 text-xs text-[#71717A]">Everything you need to dress better — every day, at no cost.</p>

                <ul className="mt-6 space-y-2.5 text-xs text-[#18181B]">
                  <li className="flex items-center gap-2">✓ 1 fresh outfit look per day (3 per week)</li>
                  <li className="flex items-center gap-2">✓ Real-time weather-aware styling</li>
                  <li className="flex items-center gap-2">✓ Up to 30 closet pieces with AI background removal</li>
                  <li className="flex items-center gap-2">✓ 1 photo style pose guide per day (3 per week)</li>
                  <li className="flex items-center gap-2">✓ Swipe, save and wear your daily look</li>
                  <li className="flex items-center gap-2 text-[#A1A1AA]">🔒 Date Spots venues, prices & plans (Pro Only)</li>
                  <li className="flex items-center gap-2 text-[#A1A1AA]">🔒 Outfit history & home screen widgets</li>
                </ul>
              </div>

              <a
                href="#download"
                onClick={scrollToDownload}
                className="mt-8 h-12 w-full rounded-2xl border border-orange-200 bg-white text-xs font-black text-[#FF7F02] hover:bg-orange-50 active:scale-95 transition-all flex items-center justify-center gap-2"
              >
                <span>Download Free App</span>
                <span>⬇</span>
              </a>
            </div>

            {/* Pro Plan */}
            <div className="rounded-3xl border-2 border-[#FF7F02] bg-white p-7 sm:p-8 flex flex-col justify-between shadow-xl relative overflow-hidden">
              <div className="absolute right-4 top-4 rounded-full bg-amber-400 text-black px-3 py-0.5 text-[10px] font-black shadow-xs">
                ⭐ 40% OFF ANNUAL
              </div>
              <div>
                <span className="rounded-full bg-orange-100 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-[#FF7F02]">
                  ፍሬ Pro
                </span>
                <div className="mt-4 flex items-baseline gap-1">
                  <span className="text-4xl font-black text-[#18181B]">
                    {billingCycle === "yearly" ? "360 ETB" : "600 ETB"}
                  </span>
                  <span className="text-xs text-[#71717A]">/ month</span>
                </div>
                <p className="mt-2 text-xs text-[#71717A]">
                  {billingCycle === "yearly"
                    ? "Billed annually at 4,320 ETB/year (Save 40% · 2,880 ETB off)"
                    : "Billed monthly at 600 ETB, cancel anytime"}
                </p>

                <ul className="mt-6 space-y-2.5 text-xs text-[#18181B] font-semibold">
                  <li className="flex items-center gap-2">✓ <b>Unlimited</b> outfit looks, every day</li>
                  <li className="flex items-center gap-2">✓ <b>Unlimited</b> closet pieces & AI background removal</li>
                  <li className="flex items-center gap-2">✓ <b>Date Spots:</b> venues, verified prices & date plans</li>
                  <li className="flex items-center gap-2">✓ <b>Unlimited</b> photo poses, tilt angles & camera filters</li>
                  <li className="flex items-center gap-2">✓ Interactive FigCraft Home Widgets with "Quick Style Me"</li>
                  <li className="flex items-center gap-2">✓ Full monthly visual outfit calendar & history</li>
                  <li className="flex items-center gap-2">✓ Packing Capsule Wardrobe trip planner</li>
                  <li className="flex items-center gap-2">✓ Telebirr, CBE & card payments supported</li>
                </ul>
              </div>

              <a
                href="#download"
                onClick={scrollToDownload}
                className="mt-8 h-12 w-full rounded-2xl bg-[#FF7F02] hover:bg-[#E57200] text-xs font-black text-white shadow-lg shadow-orange-500/25 active:scale-95 transition-all flex items-center justify-center gap-2"
              >
                <span>Get Pro on Mobile App 👑</span>
                <span>⬇</span>
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section id="faq" className="py-20 sm:py-28 border-t border-orange-100 bg-[#FFFBF7]">
        <div className="mx-auto max-w-4xl px-4 sm:px-6">
          <div className="text-center max-w-2xl mx-auto">
            <p className="text-xs font-black uppercase tracking-widest text-[#FF7F02]">FREQUENTLY ASKED QUESTIONS</p>
            <h2 className="mt-2 text-3xl font-black text-[#18181B]">Everything You Need to Know</h2>
          </div>

          <div className="mt-10 space-y-3">
            {faqs.map((faq, idx) => (
              <div
                key={idx}
                className="rounded-2xl border border-orange-100 bg-white overflow-hidden shadow-xs transition-all"
              >
                <button
                  onClick={() => setActiveFaq(activeFaq === idx ? null : idx)}
                  className="flex w-full items-center justify-between p-4 sm:p-5 text-left font-bold text-xs sm:text-sm text-[#18181B]"
                >
                  <span>{faq.q}</span>
                  <span className="text-base text-[#FF7F02]">{activeFaq === idx ? "−" : "+"}</span>
                </button>
                {activeFaq === idx && (
                  <div className="px-4 pb-5 sm:px-5 text-xs text-[#71717A] leading-relaxed border-t border-orange-50 pt-3 animate-fade">
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-orange-100 bg-white py-12 text-xs text-[#71717A]">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2.5">
            <div className="grid h-8 w-8 place-items-center rounded-xl bg-white p-1 shadow-sm border border-orange-200">
              <img src="/logo/firie-logo.png" alt="ፍሬ (Firie)" className="h-full w-full object-contain" />
            </div>
            <span className="text-sm font-black text-[#18181B]">ፍሬ (Firie).</span>
            <span>· What to wear today</span>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-6 text-xs text-[#71717A] font-semibold">
            <button onClick={() => setShowPrivacyModal(true)} className="hover:text-[#FF7F02] transition-colors">
              Privacy Policy
            </button>
            <button onClick={() => setShowTermsModal(true)} className="hover:text-[#FF7F02] transition-colors">
              Terms of Service
            </button>
            <a href="/FITLY.apk" download="FITLY.apk" className="hover:text-[#FF7F02] transition-colors">
              Android APK
            </a>
            <a href="/FITLY.ipa" download="FITLY.ipa" className="hover:text-[#FF7F02] transition-colors">
              iOS Package
            </a>
            <button onClick={() => navigate("/")} className="hover:text-[#FF7F02] transition-colors">
              Open App
            </button>
          </div>

          <p className="text-[11px] text-[#A1A1AA]">
            © {new Date().getFullYear()} ፍሬ (Firie) Inc. All rights reserved.
          </p>
        </div>
      </footer>

      {/* ── Privacy Policy Modal ── */}
      {showPrivacyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-fade">
          <div className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-3xl border border-orange-100 bg-white p-6 text-[#18181B] shadow-2xl text-xs space-y-3">
            <div className="flex items-center justify-between border-b border-orange-100 pb-3">
              <h3 className="text-base font-black">ፍሬ (Firie) Privacy Policy</h3>
              <button onClick={() => setShowPrivacyModal(false)} className="text-base font-bold text-[#FF7F02]">✕</button>
            </div>
            <p className="text-[#71717A]"><b>Last updated:</b> November 2026</p>
            <p className="leading-relaxed text-[#52525B]">
              At ፍሬ (Firie), we respect your privacy. This policy outlines how your data is handled when you use our mobile and web application.
            </p>
            <h4 className="font-bold text-[#18181B] pt-2">1. Information We Collect</h4>
            <p className="leading-relaxed text-[#52525B]">
              - Wardrobe Photos: Uploaded clothing imagery processed exclusively for outfit composition and category tagging.
              - Weather & Location: Approximate city location used strictly to retrieve current temperature and rain forecasts to suggest appropriate clothing layers.
            </p>
            <h4 className="font-bold text-[#18181B] pt-2">2. Zero Third-Party Advertising</h4>
            <p className="leading-relaxed text-[#52525B]">
              We do not sell, rent, or trade your personal photos or wardrobe data to any advertisers or third parties.
            </p>
            <h4 className="font-bold text-[#18181B] pt-2">3. Data Deletion</h4>
            <p className="leading-relaxed text-[#52525B]">
              You can delete any item, outfit log, or reset your entire closet directly within the app settings at any time.
            </p>
            <button
              onClick={() => setShowPrivacyModal(false)}
              className="mt-4 w-full rounded-xl bg-[#FF7F02] hover:bg-[#E57200] py-3 text-xs font-black text-white active:scale-95 shadow-md shadow-orange-500/25"
            >
              Close Privacy Policy
            </button>
          </div>
        </div>
      )}

      {/* ── Terms of Service Modal ── */}
      {showTermsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-fade">
          <div className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-3xl border border-orange-100 bg-white p-6 text-[#18181B] shadow-2xl text-xs space-y-3">
            <div className="flex items-center justify-between border-b border-orange-100 pb-3">
              <h3 className="text-base font-black">ፍሬ (Firie) Terms of Service</h3>
              <button onClick={() => setShowTermsModal(false)} className="text-base font-bold text-[#FF7F02]">✕</button>
            </div>
            <p className="text-[#71717A]"><b>Last updated:</b> November 2026</p>
            <p className="leading-relaxed text-[#52525B]">
              By accessing or downloading ፍሬ (Firie), you agree to be bound by these Terms of Service.
            </p>
            <h4 className="font-bold text-[#18181B] pt-2">1. Use of Service</h4>
            <p className="leading-relaxed text-[#52525B]">
              ፍሬ (Firie) provides AI-assisted outfit recommendations and photography pose guidance. You are responsible for ensuring images uploaded belong to you or do not infringe third-party rights.
            </p>
            <h4 className="font-bold text-[#18181B] pt-2">2. Subscriptions & Billing</h4>
            <p className="leading-relaxed text-[#52525B]">
              ፍሬ Pro subscriptions renew automatically unless canceled prior to the end of the billing cycle. You may cancel your subscription at any time under App Settings → Billing.
            </p>
            <h4 className="font-bold text-[#18181B] pt-2">3. Limitation of Liability</h4>
            <p className="leading-relaxed text-[#52525B]">
              ፍሬ services are provided on an "as is" and "as available" basis.
            </p>
            <button
              onClick={() => setShowTermsModal(false)}
              className="mt-4 w-full rounded-xl bg-[#FF7F02] hover:bg-[#E57200] py-3 text-xs font-black text-white active:scale-95 shadow-md shadow-orange-500/25"
            >
              Close Terms of Service
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
