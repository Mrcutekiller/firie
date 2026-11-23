import { useNavigate } from "react-router-dom";

const PERKS = [
  {
    icon: "📍",
    title: "Curated venues in your city",
    desc: "Rooftops, cafes, lounges and restaurants with real, verified details.",
  },
  {
    icon: "💰",
    title: "Honest prices & budget calculator",
    desc: "Verified menu prices in ETB and an estimated total for your whole party.",
  },
  {
    icon: "👗",
    title: "An outfit matched to every spot",
    desc: "See what to wear from your own closet before you leave home.",
  },
  {
    icon: "🗓️",
    title: "Unlimited date plans & saves",
    desc: "Save venues, dishes and full plans — no caps on the Pro plan.",
  },
];

/**
 * Full-screen upgrade wall for Pro-only areas (Date Spots).
 * Rendered inside <Layout>, so it only fills the content area.
 */
export default function ProGateScreen({
  title = "Date Spots is a Pro feature",
  description = "Discover venues, check verified menu prices, plan your dates and match an outfit to every spot — all included with ፍሬ (Firie) Pro.",
}: {
  title?: string;
  description?: string;
}) {
  const navigate = useNavigate();

  return (
    <div className="mx-auto flex w-full max-w-[430px] flex-col items-center pb-6 pt-4 text-center animate-fade">
      <div className="relative">
        <div className="grid h-20 w-20 place-items-center rounded-3xl bg-gradient-to-tr from-[#FF7F02] to-[#FFA24C] text-4xl shadow-xl shadow-orange-500/25">
          👑
        </div>
        <span className="absolute -right-2 -top-2 rounded-full bg-amber-400 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-black shadow-sm">
          Pro
        </span>
      </div>

      <h1 className="mt-5 text-xl font-black tracking-tight text-[#18181B] dark:text-white">
        {title}
      </h1>
      <p className="mt-2 max-w-[320px] text-xs leading-relaxed text-[#71717A] dark:text-[#A1A1AA]">
        {description}
      </p>

      <ul className="mt-6 w-full space-y-2.5 text-left">
        {PERKS.map((perk) => (
          <li
            key={perk.title}
            className="flex gap-3 rounded-2xl border border-orange-100 bg-white p-3.5 shadow-xs dark:border-zinc-800 dark:bg-zinc-900"
          >
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-orange-50 text-base dark:bg-zinc-800">
              {perk.icon}
            </span>
            <span className="min-w-0">
              <span className="block text-xs font-extrabold text-[#18181B] dark:text-white">
                {perk.title}
              </span>
              <span className="mt-0.5 block text-[10.5px] leading-relaxed text-[#71717A] dark:text-[#A1A1AA]">
                {perk.desc}
              </span>
            </span>
          </li>
        ))}
      </ul>

      <div className="mt-6 w-full rounded-2xl border border-orange-200 bg-orange-50/60 p-3.5 dark:border-zinc-800 dark:bg-zinc-900/60">
        <p className="text-[10px] font-black uppercase tracking-wider text-[#FF7F02]">
          ፍሬ (Firie) Pro
        </p>
        <p className="mt-1 text-sm font-black text-[#18181B] dark:text-white">
          600 ETB <span className="text-xs font-bold text-[#71717A]">/ month</span>
          <span className="ml-2 rounded-full bg-[#FF7F02] px-2 py-0.5 text-[9px] font-black text-white align-middle">
            40% OFF yearly
          </span>
        </p>
      </div>

      <button
        onClick={() => navigate("/upgrade")}
        className="mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[#FF7F02] hover:bg-[#E57200] text-xs font-black text-white shadow-xl shadow-orange-500/25 transition-transform active:scale-98"
      >
        <span>Upgrade to ፍሬ Pro</span>
        <span>→</span>
      </button>

      <button
        onClick={() => navigate("/")}
        className="mt-2.5 h-10 w-full rounded-2xl border border-orange-100 bg-white text-xs font-bold text-[#71717A] transition-transform active:scale-98 dark:border-zinc-800 dark:bg-zinc-900 dark:text-[#A1A1AA]"
      >
        Back to Outfits
      </button>
    </div>
  );
}
