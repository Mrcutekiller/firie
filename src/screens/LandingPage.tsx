import { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { cn } from "../components/ui";

/**
 * Bandwidth-aware video player:
 * - Shows poster immediately with zero black flash
 * - Only loads & plays when visible and near the viewport (prevents 16 simultaneous downloads)
 * - Pauses offscreen videos to keep slow connections fast
 */
function LazyVideo({
  src,
  poster,
  priority = false,
  className,
}: {
  src: string;
  poster: string;
  priority?: boolean;
  className?: string;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [shouldLoad, setShouldLoad] = useState(priority);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        // Ignore hidden responsive containers (display: none)
        const isVisibleLayout = el.offsetParent !== null;
        if (entry.isIntersecting && isVisibleLayout) {
          setShouldLoad(true);
          if (videoRef.current && videoRef.current.paused) {
            videoRef.current.play().catch(() => {});
          }
        } else if (videoRef.current && !videoRef.current.paused) {
          videoRef.current.pause();
        }
      },
      { rootMargin: "250px 0px", threshold: 0.05 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={containerRef} className="relative h-full w-full bg-zinc-900 overflow-hidden">
      <img
        src={poster}
        alt=""
        loading={priority ? "eager" : "lazy"}
        className={cn(
          "absolute inset-0 h-full w-full object-cover object-center transition-opacity duration-500",
          isReady ? "opacity-0 pointer-events-none" : "opacity-100"
        )}
      />
      {shouldLoad && (
        <video
          ref={videoRef}
          src={src}
          poster={poster}
          autoPlay
          loop
          muted
          playsInline
          preload={priority ? "auto" : "metadata"}
          onCanPlay={() => setIsReady(true)}
          onPlaying={() => setIsReady(true)}
          className={cn(
            "relative h-full w-full object-cover object-center transition-opacity duration-500",
            isReady ? "opacity-100" : "opacity-0",
            className
          )}
        />
      )}
    </div>
  );
}

const NAV_MENU_ITEMS = [
  { id: "overview", label: "Overview", chapter: "01", icon: "✨", desc: "Digital closet & color matching" },
  { id: "curation-swiper", label: "Outfit Swiper", chapter: "02", icon: "⚡", desc: "Swipe daily looks from your closet" },
  { id: "climate-layering", label: "Weather Sync", chapter: "03", icon: "⛅", desc: "Addis Ababa temperature alerts" },
  { id: "venue-spots", label: "Date Spots", chapter: "04", icon: "📍", desc: "Venues, dress codes & ETB budgets" },
  { id: "ai-studio", label: "Cutout Studio", chapter: "05", icon: "📸", desc: "Auto background removal" },
  { id: "daily-look", label: "Daily Looks", chapter: "06", icon: "🧥", desc: "Zero morning decision fatigue" },
  { id: "tailored-lifestyle", label: "Your Fit", chapter: "07", icon: "📏", desc: "Tailored to height & style" },
  { id: "mobile-experience", label: "Mobile App", chapter: "08", icon: "📱", desc: "Android APK & iPhone IPA" },
];

export default function LandingPage() {
  const navigate = useNavigate();
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("yearly");
  const [showPrivacyModal, setShowPrivacyModal] = useState<boolean>(false);
  const [showTermsModal, setShowTermsModal] = useState<boolean>(false);
  const [activeFaq, setActiveFaq] = useState<number | null>(0);
  const [activeSectionIndex, setActiveSectionIndex] = useState<number>(0);
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);
  const [downloadStarted, setDownloadStarted] = useState<boolean>(false);

  const sectionRefs = useRef<(HTMLElement | null)[]>([]);

  // Content-addressed download URL. The `v` value is the first 8 hex chars of
  // the APK's SHA256 (636839c1...), so the URL changes whenever the binary
  // changes. That is what makes the `immutable` cache header safe: a stale or
  // corrupted cached response can never outlive the file it represents.
  const APK_VERSION = "636839c1";
  // Same-origin /Firie.apk?v=... on Vercel (via Edge rewrite) and Cloudflare
  // Workers (via R2), falling back to the Workers CDN on localhost.
  const apkDownloadUrl =
    typeof window !== "undefined" &&
    (window.location.hostname.includes("vercel.app") || window.location.hostname.includes("workers.dev"))
      ? `/Firie.apk?v=${APK_VERSION}`
      : `https://firie.birukf37.workers.dev/Firie.apk?v=${APK_VERSION}`;

  // Same content-addressed scheme for the iOS build: first 8 hex chars of the
  // IPA's SHA256 (831a801d...). Served from R2 via the same Edge rewrite.
  const IPA_VERSION = "831a801d";
  const ipaDownloadUrl =
    typeof window !== "undefined" &&
    (window.location.hostname.includes("vercel.app") || window.location.hostname.includes("workers.dev"))
      ? `/FITLY.ipa?v=${IPA_VERSION}`
      : `https://firie.birukf37.workers.dev/FITLY.ipa?v=${IPA_VERSION}`;

  const triggerDirectDownload = () => {
    setDownloadStarted(true);
  };

  const scrollToDownload = (e?: React.MouseEvent) => {
    if (e) e.preventDefault();
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
      badge: "DIGITAL CLOSET",
      badgeColor: "bg-[#FF7F02] text-white",
      tagline: "BUILT FOR ADDIS ABABA",
      title: "Your Wardrobe, Digitized.",
      subtitle: "Daily outfits styled from the clothes you already own.",
      description:
        "Stop guessing what to wear every morning. Photograph your clothes once — Firie removes the background, matches colors, and builds ready-to-wear outfits for today's weather.",
      video: "/videos/page-1.mp4",
      poster: "/images/page_previews/page_1.jpg",
      hasDownloadBtn: true,
      bullets: [
        "Snap a photo anywhere — auto background removal isolates each piece",
        "Daily outfits assembled from your real closet",
        "Matched to live Addis Ababa weather and your occasion",
      ],
      align: "text-left",
    },
    {
      id: "curation-swiper",
      badge: "OUTFIT SWIPER",
      badgeColor: "bg-[#FF7F02] text-white",
      tagline: "SWIPE TO DRESS",
      title: "Swipe Through Today's Looks.",
      subtitle: "Clean flat-lay combinations from your own pieces.",
      description:
        "Every morning, Firie pairs tops, bottoms, and shoes from your closet. Swipe right to wear a look, or swipe left to see another option.",
      video: "/videos/page-2.mp4",
      poster: "/images/page_previews/page_2.jpg",
      hasDownloadBtn: false,
      bullets: [
        "Quick swipe gestures (✕ Pass, ♥ Wear)",
        "Color harmony matching across your wardrobe",
        "Saved wear history and outfit calendar",
      ],
      align: "video-left",
    },
    {
      id: "climate-layering",
      badge: "LIVE WEATHER SYNC",
      badgeColor: "bg-[#FF7F02] text-white",
      tagline: "MORNING TO EVENING",
      title: "Dressed for Today's Weather.",
      subtitle: "Smart layering from cool mornings to warm afternoons.",
      description:
        "Firie checks live weather for your city. When Addis Ababa shifts from 16°C at 8 AM to 24°C by midday, it picks layers you can comfortably wear or take off.",
      video: "/videos/page-4.mp4",
      poster: "/images/page_previews/page_4.jpg",
      hasDownloadBtn: false,
      bullets: [
        "Real-time local temperature and rain forecast",
        "Smart jacket and hoodie layering suggestions",
        "Avoid overdressing or getting caught in the cold",
      ],
      align: "video-left",
    },
    {
      id: "venue-spots",
      badge: "DATE SPOTS",
      badgeColor: "bg-[#FF7F02] text-white",
      tagline: "VENUES & BUDGETS",
      title: "Know Where to Go & What to Wear.",
      subtitle: "Curated Addis Ababa spots with dress codes and ETB budgets.",
      description:
        "Planning coffee, a rooftop sunset, or dinner? Browse curated venues across Addis Ababa with dress-code tips, menu prices, and a built-in ETB budget planner.",
      video: "/videos/page-5.mp4",
      poster: "/images/page_previews/page_5.jpg",
      hasDownloadBtn: false,
      bullets: [
        "Curated cafés, rooftops, lounges, and restaurants in Addis",
        "Outfit suggestions matched to each venue's vibe",
        "Menu price guides and budget estimates in ETB (Pro)",
      ],
      align: "text-left",
    },
    {
      id: "ai-studio",
      badge: "CUTOUT STUDIO",
      badgeColor: "bg-[#FF7F02] text-white",
      tagline: "CLEAN CLOSET PHOTOS",
      title: "Clean Cutouts in Seconds.",
      subtitle: "Turn any hanger or bed photo into a crisp wardrobe card.",
      description:
        "Take a photo of your shirt, trousers, or sneakers anywhere. Firie removes the background automatically and tags category, slot, and color.",
      video: "/videos/page-7.mp4",
      poster: "/images/page_previews/page_7.jpg",
      hasDownloadBtn: false,
      bullets: [
        "On-device background removal with zero waiting",
        "Auto-tagged by category (Tops, Bottoms, Shoes, Traditional)",
        "Cloudflare R2 backup when signed in to your account",
      ],
      align: "text-left",
    },
    {
      id: "daily-look",
      badge: "DAILY ROUTINE",
      badgeColor: "bg-[#FF7F02] text-white",
      tagline: "READY IN SECONDS",
      title: "Zero Morning Decision Fatigue.",
      subtitle: "Open the app, pick your look, and step out.",
      description:
        "Spend less time staring at your closet and more time on your day. Firie remembers what you wore recently so your outfits stay fresh.",
      video: "/videos/page-8.mp4",
      poster: "/images/page_previews/page_8.jpg",
      hasDownloadBtn: false,
      bullets: [
        "Direct Android APK & iPhone IPA downloads",
        "Free plan: 1 fresh look/day, 3/week (up to 30 items)",
        "Pro plan: unlimited looks, Date Spots & full history (600 ETB/mo)",
      ],
      align: "video-left",
    },
    {
      id: "tailored-lifestyle",
      badge: "YOUR PROFILE",
      badgeColor: "bg-[#FF7F02] text-white",
      tagline: "PERSONALIZED TO YOU",
      title: "Styled for Your Build & Taste.",
      subtitle: "Outfits adapted to your height, age, and preferred style.",
      description:
        "Whether you lean toward streetwear, smart casual, or traditional Habesha wear, Firie tailors every recommendation to your profile.",
      video: "/videos/page-9.mp4",
      poster: "/images/page_previews/page_1.jpg",
      hasDownloadBtn: false,
      bullets: [
        "Personalized to your height, fit preference, and style",
        "Optional Habesha traditional wear rotation",
        "Photo Style Camera with pose guides and filters",
      ],
      align: "text-left",
    },
    {
      id: "mobile-experience",
      badge: "MOBILE EXPERIENCE",
      badgeColor: "bg-[#FF7F02] text-white",
      tagline: "ANDROID & MOBILE WEB",
      title: "Your Entire Closet in Your Pocket.",
      subtitle: "Fast, lightweight, and synced across your devices.",
      description:
        "Upload your wardrobe, check today's weather-matched outfit, and use the Photo Style Camera anywhere — synced securely with Cloudflare D1 and R2.",
      video: "/videos/page-10.mp4",
      poster: "/images/page_previews/page_2.jpg",
      hasDownloadBtn: true,
      bullets: [
        "Direct Android APK install — no Play Store required",
        "Cloudflare D1 & R2 account sync across devices",
        "Instant iPhone install — direct IPA download or Safari Add to Home Screen",
      ],
      align: "video-left",
    },
  ];

  const faqs = [
    {
      q: "How does Firie choose outfits from my real clothes?",
      a: "Simply take a photo of your garments on a hanger, bed, or floor. Firie automatically removes the background in milliseconds, tags each item by tone, category, and fabric, and uses color harmony science to assemble ready-to-wear flat-lay outfits adapted to your real-time local weather.",
    },
    {
      q: "Can I install Firie directly on Android and iPhone without an App Store?",
      a: "Yes! For Android, click the Download button to get the official Firie.apk and tap to install immediately. For iPhone, download the official FITLY.ipa, or open this page in Safari and tap 'Add to Home Screen' for a free instant web app.",
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
      a: "Free includes one fresh outfit look per day (up to three per week) for a wardrobe of up to 30 pieces, plus one photo style pose guide per day. Pro (600 ETB/month, or 360 ETB/month billed yearly with 40% OFF) unlocks unlimited outfit looks, unlimited wardrobe pieces, the complete Date Spots planner with verified menu prices, full outfit history and monthly outfit calendars.",
    },
  ];

  return (
    <div className="min-h-screen bg-[#FFFFFF] text-[#18181B] selection:bg-[#FF7F02] selection:text-white font-sans antialiased overflow-x-hidden">
      {/* ── Top Editorial Strip (Hidden on small mobile to eliminate vertical space, clean on desktop) ── */}
      <div className="hidden sm:block border-b border-orange-100 bg-[#FFFBF7] px-4 py-1.5 text-[10px] font-black tracking-widest text-[#71717A]">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <span className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-[#FF7F02] animate-ping" />
            <span className="text-[#FF7F02] font-black">FIRIE LOOKBOOK</span>
            <span className="text-zinc-400">· 2026 COLLECTION</span>
          </span>
          <span className="hidden md:inline">DIGITAL WARDROBE INTELLIGENCE IN MOTION</span>
          <span>ADDIS ABABA · GLOBAL</span>
        </div>
      </div>

      {/* ── Main Sticky Navbar (Tight and sleek with zero excess padding) ── */}
      <header className="sticky top-0 z-50 border-b border-orange-100 bg-white/95 backdrop-blur-xl transition-all shadow-xs">
        <div className="mx-auto flex h-14 sm:h-16 max-w-6xl items-center justify-between px-3.5 sm:px-6">
          {/* Brand Logo */}
          <Link to="/" className="flex items-center gap-2 active:scale-95 transition-transform">
            <div className="grid h-9 w-9 sm:h-10 sm:w-10 place-items-center rounded-xl sm:rounded-2xl bg-white p-1 shadow-sm border border-orange-200">
              <img
                src="/logo/firie-logo.png"
                alt="Firie Logo"
                className="h-full w-full object-contain"
              />
            </div>
            <span className="text-lg sm:text-xl font-black tracking-tight text-[#18181B]">
              Firie<span className="text-[#FF7F02]">.</span>
            </span>
          </Link>

          {/* Desktop Navigation Links with Active Section Indicator */}
          <nav className="hidden lg:flex items-center gap-6 text-xs font-bold text-[#71717A]">
            {[
              { href: "#overview", label: "Overview", idx: 0 },
              { href: "#curation-swiper", label: "Swiper", idx: 1 },
              { href: "#climate-layering", label: "Weather", idx: 2 },
              { href: "#venue-spots", label: "Date Spots", idx: 3 },
              { href: "#ai-studio", label: "Studio", idx: 4 },
              { href: "#tailored-lifestyle", label: "Your Fit", idx: 6 },
              { href: "#pricing", label: "Plans", idx: -1 },
              { href: "#faq", label: "FAQ", idx: -1 },
            ].map((item) => (
              <a
                key={item.href}
                href={item.href}
                className={cn(
                  "relative py-1 transition-colors hover:text-[#FF7F02]",
                  activeSectionIndex === item.idx ? "text-[#FF7F02] font-black" : ""
                )}
              >
                {item.label}
                {activeSectionIndex === item.idx && (
                  <span className="absolute inset-x-0 -bottom-0.5 h-0.5 rounded-full bg-[#FF7F02]" />
                )}
              </a>
            ))}
          </nav>

          {/* Action Area: Web App + Download + Mobile Hamburger */}
          <div className="flex items-center gap-2 sm:gap-2.5">
            <button
              onClick={() => navigate("/app")}
              className="hidden sm:inline-flex items-center rounded-full border border-orange-200 bg-orange-50/70 hover:bg-orange-100 px-3.5 py-2 text-[11px] font-bold text-[#18181B] transition-colors cursor-pointer"
            >
              Open Web App
            </button>
            <a
              href="#download"
              onClick={scrollToDownload}
              className="rounded-full bg-[#FF7F02] hover:bg-[#E57200] px-4 sm:px-5 py-2 sm:py-2.5 text-[11px] sm:text-xs font-black text-white shadow-md shadow-orange-500/25 active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <span>Download</span>
              <span className="text-[10px]">⬇</span>
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
          <div className="lg:hidden fixed inset-x-0 top-14 sm:top-16 bottom-0 z-50 bg-white/98 backdrop-blur-2xl px-4 py-5 overflow-y-auto animate-fade shadow-2xl flex flex-col justify-between border-t border-orange-100">
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-orange-100/80">
                <span className="text-[10px] font-black uppercase tracking-widest text-[#FF7F02]">
                  Lookbook Chapters
                </span>
                <span className="text-[10px] font-bold text-zinc-400">{NAV_MENU_ITEMS.length} Curated Sections</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {NAV_MENU_ITEMS.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => {
                      scrollToSection(item.id);
                      setMobileMenuOpen(false);
                    }}
                    className="flex items-center justify-between rounded-2xl border border-orange-100/80 bg-[#FFFBF7] p-3 text-left hover:border-orange-300 hover:bg-orange-50/50 transition-all active:scale-98 group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="text-base shrink-0 p-1.5 rounded-xl bg-white border border-orange-100 shadow-2xs">
                        {item.icon}
                      </span>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[9px] font-mono font-black text-[#FF7F02]">{item.chapter}</span>
                          <span className="text-xs font-black text-[#18181B] truncate">{item.label}</span>
                        </div>
                        <p className="text-[10px] text-zinc-400 truncate mt-0.5">{item.desc}</p>
                      </div>
                    </div>
                    <span className="text-zinc-300 group-hover:text-[#FF7F02] text-xs font-bold pl-2">›</span>
                  </button>
                ))}
              </div>

              <div className="pt-2 border-t border-orange-100 grid grid-cols-2 gap-2 text-xs font-black">
                <a
                  href="#pricing"
                  onClick={() => setMobileMenuOpen(false)}
                  className="rounded-2xl border border-orange-200 bg-orange-50/70 p-3 text-center text-[#FF7F02] hover:bg-orange-100 active:scale-98 transition-all"
                >
                  Plans &amp; Pricing (600 ETB)
                </a>
                <a
                  href="#faq"
                  onClick={() => setMobileMenuOpen(false)}
                  className="rounded-2xl border border-zinc-200 bg-white p-3 text-center text-[#18181B] hover:bg-zinc-50 active:scale-98 transition-all"
                >
                  FAQ &amp; Guide
                </a>
              </div>
            </div>

            <div className="pt-5 pb-3 space-y-2 border-t border-orange-100 mt-5">
              <a
                href="#download"
                onClick={(e) => {
                  setMobileMenuOpen(false);
                  scrollToDownload(e);
                }}
                className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[#FF7F02] text-white text-xs font-black shadow-lg shadow-orange-500/25 active:scale-98 transition-all cursor-pointer"
              >
                <span>Download Firie App</span>
                <span>⬇</span>
              </a>
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  navigate("/");
                }}
                className="w-full text-center text-[11px] font-bold text-[#71717A] py-1 hover:text-[#FF7F02]"
              >
                Launch Web Studio in browser ›
              </button>
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

      {/* ── SECTIONS: TIGHT EDITORIAL PADDING TO CLOSE GAP WITH NAVBAR ── */}
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
                "relative flex items-center pt-3 pb-8 sm:pt-6 sm:pb-12 md:pt-10 md:pb-16 overflow-hidden",
                isEven ? "bg-white" : "bg-[#FFFBF7]"
              )}
            >
              <div className="mx-auto max-w-6xl px-3.5 sm:px-6 w-full relative z-10">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-8 lg:gap-14 items-center">
                  {/* ── Editorial Text Column ── */}
                  <div
                    className={cn(
                      "lg:col-span-6 space-y-3 sm:space-y-4 md:space-y-5",
                      isTextLeft ? "order-1" : "order-1 lg:order-2"
                    )}
                  >
                    {/* Minimalist Editorial Category Badge */}
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={cn("rounded-full px-3 sm:px-4 py-0.5 sm:py-1 text-[9px] sm:text-[10px] font-black tracking-widest uppercase shadow-xs", s.badgeColor)}>
                        {s.badge}
                      </span>
                      <span className="text-[9px] sm:text-[10px] font-extrabold text-[#71717A] tracking-widest uppercase">
                        / {s.tagline}
                      </span>
                    </div>

                    {/* Headline */}
                    <h2 className="text-2xl sm:text-4xl lg:text-[46px] font-black tracking-tight text-[#18181B] leading-[1.08] uppercase">
                      {s.title}
                    </h2>

                    {/* Subtitle Accent */}
                    <p className="text-xs sm:text-base md:text-lg font-bold text-[#FF7F02] leading-snug">
                      {s.subtitle}
                    </p>

                    {/* ── MOBILE VIDEO CARD (Visible right under headline on mobile phones) ── */}
                    <div className="lg:hidden w-full my-2.5">
                      <div className="relative w-full h-[250px] sm:h-[340px] rounded-2xl overflow-hidden shadow-xl bg-zinc-900 ring-1 ring-orange-500/20">
                        <LazyVideo
                          src={s.video}
                          poster={s.poster}
                          priority={index === 0}
                        />
                      </div>
                    </div>

                    {/* Narrative Description */}
                    <p className="text-xs sm:text-sm text-[#52525B] leading-relaxed font-normal">
                      {s.description}
                    </p>

                    {/* Feature Checkpoints */}
                    <ul className="space-y-1.5 sm:space-y-2.5 pt-0.5 text-xs sm:text-sm font-semibold text-[#18181B]">
                      {s.bullets.map((b, bIdx) => (
                        <li key={bIdx} className="flex items-center gap-2">
                          <span className="h-4.5 w-4.5 sm:h-5 sm:w-5 rounded-full bg-[#FF7F02] text-white text-[9px] sm:text-[10px] font-black grid place-items-center shrink-0 shadow-xs">
                            ✓
                          </span>
                          <span className="text-xs sm:text-sm">{b}</span>
                        </li>
                      ))}
                    </ul>

                    {/* Single Download Button if on Overview or Final Section */}
                    {s.hasDownloadBtn && (
                      <div className="pt-2 sm:pt-3 flex flex-wrap items-center gap-3 sm:gap-4">
                        <a
                          href="#download"
                          onClick={scrollToDownload}
                          className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 rounded-full bg-[#FF7F02] hover:bg-[#E57200] px-6 sm:px-8 py-3.5 sm:py-4 text-xs sm:text-sm font-black text-white shadow-xl shadow-orange-500/25 hover:shadow-2xl hover:-translate-y-0.5 active:translate-y-0 transition-all cursor-pointer"
                        >
                          <span>Download Firie App</span>
                          <span className="text-sm sm:text-base">⬇</span>
                        </a>

                        <a
                          href="#download"
                          onClick={scrollToDownload}
                          className="text-[11px] sm:text-xs font-bold text-[#71717A] hover:text-[#FF7F02] flex items-center gap-1.5"
                        >
                          <span className="h-2 w-2 rounded-full bg-[#FF7F02] animate-pulse" />
                          <span>iOS & options ›</span>
                        </a>
                      </div>
                    )}
                  </div>

                  {/* ── DESKTOP VIDEO COLUMN (Hidden on mobile since mobile shows it directly inline) ── */}
                  <div
                    className={cn(
                      "hidden lg:flex lg:col-span-6 justify-center",
                      isTextLeft ? "order-2" : "order-2 lg:order-1"
                    )}
                  >
                    <div className="relative w-full max-w-[440px] h-[540px] xl:h-[600px] rounded-[36px] overflow-hidden shadow-2xl bg-zinc-900 group ring-1 ring-orange-500/20">
                      <LazyVideo
                        src={s.video}
                        poster={s.poster}
                        priority={index === 0}
                        className="group-hover:scale-102 transition-transform duration-700"
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
      <section id="download" className="py-14 sm:py-24 border-t border-orange-100 bg-[#FFFBF7]">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <div className="text-center max-w-2xl mx-auto">
            <span className="rounded-full bg-[#FF7F02] text-white px-3.5 py-1 text-[10px] font-black uppercase tracking-widest shadow-xs">
              OFFICIAL APPLICATION BUILDS
            </span>
            <h2 className="mt-3 text-2xl sm:text-4xl font-black text-[#18181B] tracking-tight">
              Get Firie on Your Phone
            </h2>
            <p className="mt-1.5 text-xs sm:text-sm text-[#71717A]">
              Direct downloads for Android and iPhone — no ads, no tracking, no store approval wait.
            </p>
          </div>

          <div className="mt-8 sm:mt-12 grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-8">
            {/* Android Card */}
            <div className="rounded-3xl border border-orange-100 bg-white p-5 sm:p-8 flex flex-col justify-between shadow-lg relative overflow-hidden group hover:border-[#FF7F02] transition-all">
              <div>
                <div className="flex items-center justify-between">
                  <span className="grid h-11 w-11 sm:h-12 sm:w-12 place-items-center rounded-2xl bg-[#FF7F02] text-xl sm:text-2xl text-white shadow-md shadow-orange-500/25">
                    🤖
                  </span>
                  <span className="rounded-full bg-orange-100 border border-orange-300 px-3 py-1 text-[10px] font-black text-orange-900">
                    Direct APK · Fast Install
                  </span>
                </div>
                <h3 className="mt-4 sm:mt-5 text-xl sm:text-2xl font-black text-[#18181B]">Android Direct APK</h3>
                <p className="mt-1.5 text-xs leading-relaxed text-[#71717A]">
                  Official Android application package with adaptive orange launcher icon, camera pose guidance, and instant wardrobe sync.
                </p>
                <ul className="mt-3 sm:mt-4 space-y-1.5 text-xs text-[#18181B] font-medium">
                  <li className="flex items-center gap-2">✓ Compatible with Android 10, 11, 12, 13, 14 & 15</li>
                  <li className="flex items-center gap-2">✓ Local background AI image isolation</li>
                  <li className="flex items-center gap-2">✓ Offline wardrobe storage & real weather</li>
                </ul>
              </div>

              <div className="mt-6 sm:mt-8 pt-4 border-t border-orange-100">
                <a
                  href={apkDownloadUrl}
                  download="Firie.apk"
                  onClick={triggerDirectDownload}
                  className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[#FF7F02] hover:bg-[#E57200] text-white font-black text-xs transition-transform active:scale-95 shadow-lg shadow-orange-500/25 cursor-pointer"
                >
                  <span>⬇️ Download Firie App (APK)</span>
                </a>
                <p className="mt-2 text-center text-[10px] text-[#A1A1AA]">
                  File: Firie.apk (Android 14) ·{" "}
                  <span title="636839C1FC13D0C6359A74267ED7B97A2871BE93C07827B072A570A6BBA2A795" className="font-mono text-zinc-500">
                    SHA256: 636839C1…A795
                  </span>
                </p>
              </div>
            </div>

            {/* iPhone / PWA Card */}
            <div className="rounded-3xl border border-orange-100 bg-white p-5 sm:p-8 flex flex-col justify-between shadow-lg relative overflow-hidden group hover:border-[#FF7F02] transition-all">
              <div>
                <div className="flex items-center justify-between">
                  <span className="grid h-11 w-11 sm:h-12 sm:w-12 place-items-center rounded-2xl bg-[#FF7F02] text-xl sm:text-2xl text-white shadow-md shadow-orange-500/25">
                    
                  </span>
                  <span className="rounded-full bg-orange-100 border border-orange-300 px-3 py-1 text-[10px] font-black text-orange-900">
                    Direct IPA · Free
                  </span>
                </div>
                <h3 className="mt-4 sm:mt-5 text-xl sm:text-2xl font-black text-[#18181B]">iPhone / iOS (Free IPA)</h3>
                <p className="mt-1.5 text-xs leading-relaxed text-[#71717A]">
                  Download the official iOS build straight from our edge — no App Store, no approval wait. Or skip the file and keep using Firie in Safari.
                </p>
                <div className="mt-3.5 rounded-2xl bg-[#FFFBF7] border border-orange-100 p-3 sm:p-3.5 text-xs text-[#18181B] space-y-1">
                  <p className="font-black text-[#18181B] flex items-center gap-1.5">
                    <span>💡</span>
                    <span>Add to Home Screen on iPhone:</span>
                  </p>
                  <p className="text-[11px] text-[#71717A]">
                    1. Open <b>fitly-lovat.vercel.app</b> in <b>Safari</b>.
                  </p>
                  <p className="text-[11px] text-[#71717A]">
                    2. Tap the <b>Share ⬆️</b> icon at the bottom.
                  </p>
                  <p className="text-[11px] text-[#71717A]">
                    3. Tap <b>"Add to Home Screen" ➕</b> — done!
                  </p>
                </div>
              </div>

              <div className="mt-5 sm:mt-6 pt-4 border-t border-orange-100 flex flex-col gap-2">
                <a
                  href={ipaDownloadUrl}
                  download="FITLY.ipa"
                  className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[#FF7F02] hover:bg-[#E57200] text-white font-black text-xs transition-transform active:scale-95 shadow-lg shadow-orange-500/25"
                >
                  <span>⬇️ Download Firie App (IPA)</span>
                </a>
                <p className="text-center text-[10px] text-[#A1A1AA]">
                  File: FITLY.ipa ·{" "}
                  <span title="831A801DE228A635BA6FCB4D06233142DCB1FEE397FE8187CD720A46B4E93ECD" className="font-mono text-zinc-500">
                    SHA256: 831A801D…93ECD
                  </span>
                </p>
                <a
                  href="https://fitly-lovat.vercel.app"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl border-2 border-[#FF7F02] text-[#FF7F02] hover:bg-orange-50 font-black text-xs transition-transform active:scale-95"
                >
                  <span>🌐 Or Open Firie in Safari</span>
                </a>
                <p className="text-center text-[10px] text-[#A1A1AA]">
                  Then tap Share → Add to Home Screen for a full app experience
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Pricing & Plans ── */}
      <section id="pricing" className="py-14 sm:py-24 border-t border-orange-100 bg-white">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <div className="text-center max-w-2xl mx-auto">
            <p className="text-xs font-black uppercase tracking-widest text-[#FF7F02]">HONEST TRANSPARENCY</p>
            <h2 className="mt-2 text-2xl sm:text-4xl font-black text-[#18181B]">Invest in How You Present Yourself</h2>
            <p className="mt-1.5 text-xs sm:text-sm text-[#71717A]">
              Start free with one fresh look a day, or unlock unlimited outfits, Date Spots and photo tools with Pro.
            </p>

            <div className="mt-5 inline-flex rounded-full bg-[#FFFBF7] p-1 border border-orange-200 shadow-xs">
              <button
                onClick={() => setBillingCycle("monthly")}
                className={cn(
                  "rounded-full px-4 sm:px-5 py-1.5 sm:py-2 text-xs font-bold transition-all",
                  billingCycle === "monthly" ? "bg-[#FF7F02] text-white shadow-xs" : "text-[#71717A]"
                )}
              >
                Monthly (600 ETB)
              </button>
              <button
                onClick={() => setBillingCycle("yearly")}
                className={cn(
                  "rounded-full px-4 sm:px-5 py-1.5 sm:py-2 text-xs font-bold transition-all flex items-center gap-1.5",
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

          <div className="mt-8 sm:mt-12 grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6 max-w-4xl mx-auto">
            {/* Free Plan */}
            <div className="rounded-3xl border border-orange-100 bg-[#FFFBF7] p-6 sm:p-8 flex flex-col justify-between shadow-sm">
              <div>
                <span className="rounded-full bg-white px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-[#71717A] border border-orange-200">
                  Free Tier
                </span>
                <div className="mt-4 flex items-baseline gap-1">
                  <span className="text-3xl sm:text-4xl font-black text-[#18181B]">0 ETB</span>
                  <span className="text-xs text-[#71717A]">/ forever</span>
                </div>
                <p className="mt-1.5 text-xs text-[#71717A]">Everything you need to dress better — every day, at no cost.</p>

                <ul className="mt-5 space-y-2 text-xs text-[#18181B]">
                  <li className="flex items-center gap-2">✓ 1 fresh outfit look per day (3 per week)</li>
                  <li className="flex items-center gap-2">✓ Real-time weather-aware styling</li>
                  <li className="flex items-center gap-2">✓ Up to 30 closet pieces with AI background removal</li>
                  <li className="flex items-center gap-2">✓ 1 photo style pose guide per day (3 per week)</li>
                  <li className="flex items-center gap-2">✓ Swipe, save and wear your daily look</li>
                  <li className="flex items-center gap-2 text-[#A1A1AA]">🔒 Date Spots venues, prices & plans (Pro Only)</li>
                  <li className="flex items-center gap-2 text-[#A1A1AA]">🔒 Full outfit history & monthly calendar</li>
                </ul>
              </div>

              <a
                href="#download"
                onClick={scrollToDownload}
                className="mt-6 sm:mt-8 h-12 w-full rounded-2xl border border-orange-200 bg-white text-xs font-black text-[#FF7F02] hover:bg-orange-50 active:scale-95 transition-all flex items-center justify-center gap-2"
              >
                <span>Download Free App</span>
                <span>⬇</span>
              </a>
            </div>

            {/* Pro Plan */}
            <div className="rounded-3xl border-2 border-[#FF7F02] bg-white p-6 sm:p-8 flex flex-col justify-between shadow-xl relative overflow-hidden">
              <div className="absolute right-4 top-4 rounded-full bg-amber-400 text-black px-3 py-0.5 text-[10px] font-black shadow-xs">
                ⭐ 40% OFF ANNUAL
              </div>
              <div>
                <span className="rounded-full bg-orange-100 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-[#FF7F02]">
                  Firie Pro
                </span>
                <div className="mt-4 flex items-baseline gap-1">
                  <span className="text-3xl sm:text-4xl font-black text-[#18181B]">
                    {billingCycle === "yearly" ? "360 ETB" : "600 ETB"}
                  </span>
                  <span className="text-xs text-[#71717A]">/ month</span>
                </div>
                <p className="mt-1.5 text-xs text-[#71717A]">
                  {billingCycle === "yearly"
                    ? "Billed annually at 4,320 ETB/year (Save 40% · 2,880 ETB off)"
                    : "Billed monthly at 600 ETB, cancel anytime"}
                </p>

                <ul className="mt-5 space-y-2 text-xs text-[#18181B] font-semibold">
                  <li className="flex items-center gap-2">✓ <b>Unlimited</b> outfit looks, every day</li>
                  <li className="flex items-center gap-2">✓ <b>Unlimited</b> closet pieces & AI background removal</li>
                  <li className="flex items-center gap-2">✓ <b>Date Spots:</b> venues, verified prices & date plans</li>
                  <li className="flex items-center gap-2">✓ <b>Unlimited</b> photo poses, tilt angles & camera filters</li>
                  <li className="flex items-center gap-2">✓ Priority support at firieapp@gmail.com</li>
                  <li className="flex items-center gap-2">✓ Full monthly visual outfit calendar & history</li>
                  <li className="flex items-center gap-2">✓ Packing Capsule Wardrobe trip planner</li>
                  <li className="flex items-center gap-2">✓ Telebirr, CBE & card payments supported</li>
                </ul>
              </div>

              <a
                href="#download"
                onClick={scrollToDownload}
                className="mt-6 sm:mt-8 h-12 w-full rounded-2xl bg-[#FF7F02] hover:bg-[#E57200] text-xs font-black text-white shadow-lg shadow-orange-500/25 active:scale-95 transition-all flex items-center justify-center gap-2"
              >
                <span>Get Pro on Mobile App 👑</span>
                <span>⬇</span>
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section id="faq" className="py-14 sm:py-24 border-t border-orange-100 bg-[#FFFBF7]">
        <div className="mx-auto max-w-4xl px-4 sm:px-6">
          <div className="text-center max-w-2xl mx-auto">
            <p className="text-xs font-black uppercase tracking-widest text-[#FF7F02]">FREQUENTLY ASKED QUESTIONS</p>
            <h2 className="mt-2 text-2xl sm:text-3xl font-black text-[#18181B]">Everything You Need to Know</h2>
          </div>

          <div className="mt-8 space-y-2.5">
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
                  <div className="px-4 pb-4 sm:px-5 sm:pb-5 text-xs text-[#71717A] leading-relaxed border-t border-orange-50 pt-2.5 animate-fade">
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-orange-100 bg-white py-10 text-xs text-[#71717A]">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 flex flex-col md:flex-row items-center justify-between gap-5">
          <div className="flex items-center gap-2">
            <div className="grid h-7 w-7 sm:h-8 sm:w-8 place-items-center rounded-xl bg-white p-1 shadow-sm border border-orange-200">
              <img src="/logo/firie-logo.png" alt="Firie" className="h-full w-full object-contain" />
            </div>
            <span className="text-sm font-black text-[#18181B]">Firie.</span>
            <span className="text-[11px]">· What to wear today</span>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6 text-xs text-[#71717A] font-semibold">
            <a href="mailto:firieapp@gmail.com" className="hover:text-[#FF7F02] transition-colors">
              Support (firieapp@gmail.com)
            </a>
            <button onClick={() => setShowPrivacyModal(true)} className="hover:text-[#FF7F02] transition-colors">
              Privacy Policy
            </button>
            <button onClick={() => setShowTermsModal(true)} className="hover:text-[#FF7F02] transition-colors">
              Terms of Service
            </button>
            <a href={apkDownloadUrl} download="Firie.apk" onClick={triggerDirectDownload} className="hover:text-[#FF7F02] transition-colors">
              Android APK
            </a>
            <button onClick={() => navigate("/")} className="hover:text-[#FF7F02] transition-colors">
              Open App
            </button>
          </div>

          <p className="text-[11px] text-[#A1A1AA]">
            © {new Date().getFullYear()} Firie Inc. All rights reserved.
          </p>
        </div>
      </footer>

      {/* ── Privacy Policy Modal ── */}
      {showPrivacyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-fade">
          <div className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-3xl border border-orange-100 bg-white p-6 text-[#18181B] shadow-2xl text-xs space-y-3">
            <div className="flex items-center justify-between border-b border-orange-100 pb-3">
              <h3 className="text-base font-black">Firie Privacy Policy</h3>
              <button onClick={() => setShowPrivacyModal(false)} className="text-base font-bold text-[#FF7F02]">✕</button>
            </div>
            <p className="text-[#71717A]"><b>Last updated:</b> November 2026</p>
            <p className="leading-relaxed text-[#52525B]">
              At Firie, we respect your privacy. This policy outlines how your data is handled when you use our mobile and web application.
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
              <h3 className="text-base font-black">Firie Terms of Service</h3>
              <button onClick={() => setShowTermsModal(false)} className="text-base font-bold text-[#FF7F02]">✕</button>
            </div>
            <p className="text-[#71717A]"><b>Last updated:</b> November 2026</p>
            <p className="leading-relaxed text-[#52525B]">
              By accessing or downloading Firie, you agree to be bound by these Terms of Service.
            </p>
            <h4 className="font-bold text-[#18181B] pt-2">1. Use of Service</h4>
            <p className="leading-relaxed text-[#52525B]">
              Firie provides AI-assisted outfit recommendations and photography pose guidance. You are responsible for ensuring images uploaded belong to you or do not infringe third-party rights.
            </p>
            <h4 className="font-bold text-[#18181B] pt-2">2. Subscriptions & Billing</h4>
            <p className="leading-relaxed text-[#52525B]">
              Firie Pro subscriptions renew automatically unless canceled prior to the end of the billing cycle. You may cancel your subscription at any time under App Settings → Billing.
            </p>
            <h4 className="font-bold text-[#18181B] pt-2">3. Limitation of Liability</h4>
            <p className="leading-relaxed text-[#52525B]">
              Firie services are provided on an "as is" and "as available" basis.
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
      {/* ── Active Download Feedback & Instructions Banner ── */}
      {downloadStarted && (
        <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-50 w-[94%] max-w-lg rounded-2xl bg-[#18181B] text-white p-4 sm:p-5 shadow-2xl border border-orange-500/50 animate-fade">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="text-2xl animate-bounce">🚀</span>
              <div>
                <p className="text-xs sm:text-sm font-black text-white">
                  Firie.apk Download Started!
                </p>
                <p className="text-[11px] text-zinc-300 mt-0.5">
                  Tap the downloaded <b className="text-white">Firie.apk</b> notification → allow <b className="text-white">"Install unknown apps"</b> if prompted.
                </p>
              </div>
            </div>
            <button
              onClick={() => setDownloadStarted(false)}
              className="text-zinc-400 hover:text-white p-1 text-sm font-bold"
            >
              ✕
            </button>
          </div>
          <div className="mt-3 pt-2.5 border-t border-zinc-800 flex items-center justify-between text-[11px]">
            <span className="text-zinc-400">Didn't start?</span>
            <a
              href={`https://firie.birukf37.workers.dev/Firie.apk?v=${APK_VERSION}`}
              download="Firie.apk"
              className="font-bold text-[#FF7F02] hover:underline flex items-center gap-1"
            >
              <span>Click for Direct Edge Download</span>
              <span>›</span>
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
