import { NavLink } from "react-router-dom";

type IconName = "outfits" | "closet" | "camera" | "datespots" | "profile";

function Icon({ name }: { name: IconName }) {
  const paths: Record<IconName, React.ReactNode> = {
    outfits: (
      <>
        <path d="M20.38 3.46 16 2a4 4 0 0 1-8 0L3.62 3.46a2 2 0 0 0-1.34 2.23l.58 3.5a2 2 0 0 0 1.97 1.67h1.43v10a2 2 0 0 0 2 2h7.48a2 2 0 0 0 2-2v-10h1.43a2 2 0 0 0 1.97-1.67l.58-3.5a2 2 0 0 0-1.34-2.23Z" />
        <path d="M9 10h6" />
      </>
    ),
    closet: (
      <>
        <path d="M5 5h14v15H5z" />
        <path d="M9 5v15M15 5v15" />
      </>
    ),
    camera: (
      <>
        <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
        <circle cx="12" cy="13" r="4" />
      </>
    ),
    datespots: (
      <>
        <path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 1 1 16 0z" />
        <circle cx="12" cy="10" r="3" />
      </>
    ),
    profile: (
      <>
        <circle cx="12" cy="8" r="3.2" />
        <path d="M5 20c0-3.4 3.1-5.5 7-5.5s7 2.1 7 5.5" />
      </>
    ),
  };
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-[20px] w-[20px]"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {paths[name]}
    </svg>
  );
}

function NavTab({
  to,
  icon,
  label,
  end,
}: {
  to: string;
  icon: IconName;
  label: string;
  end?: boolean;
}) {
  return (
    <NavLink
      title={label}
      to={to}
      end={end}
      className={({ isActive }) =>
        `flex flex-col items-center justify-center gap-[3px] h-[58px] flex-1 transition-all ${
          isActive ? "text-[#FF7F02] font-bold" : "text-[#71717A] hover:text-[#18181B] dark:hover:text-white"
        }`
      }
    >
      {({ isActive }) => (
        <>
          <span
            className={`grid h-[32px] w-[32px] place-items-center rounded-xl transition-all ${
              isActive ? "bg-orange-50 dark:bg-orange-950/50 text-[#FF7F02] shadow-xs" : ""
            }`}
          >
            <Icon name={icon} />
          </span>
          <span className="text-[9.5px] font-semibold tracking-[.2px] leading-none">
            {label}
          </span>
        </>
      )}
    </NavLink>
  );
}

export default function BottomNav() {
  return (
    <nav
      aria-label="Main navigation"
      className="fixed inset-x-0 bottom-3 z-30 flex justify-center px-4 pointer-events-none"
    >
      {/* Floating Pill Nav Bar Container in Clean White & Orange */}
      <div className="relative pointer-events-auto flex h-[66px] w-full max-w-[430px] items-center justify-between rounded-[32px] border border-orange-100 dark:border-zinc-800 bg-white/95 dark:bg-[#18181B]/95 px-2 shadow-[0_12px_36px_rgba(255,127,2,0.18)] backdrop-blur-md">
        {/* Tab 1: Outfits */}
        <NavTab to="/" icon="outfits" label="Outfits" end />

        {/* Tab 2: Closet */}
        <NavTab to="/closet" icon="closet" label="Closet" />

        {/* Tab 3: Raised Emphasized Center Camera Button in Brand Orange */}
        <div className="relative -top-4 flex flex-col items-center justify-center flex-1">
          <NavLink
            to="/camera"
            title="Open Camera Director"
            className={({ isActive }) =>
              `group relative grid h-[58px] w-[58px] place-items-center rounded-full border-[3px] border-white dark:border-[#18181B] shadow-[0_8px_24px_rgba(255,127,2,0.4)] transition-transform active:scale-95 ${
                isActive
                  ? "bg-[#EA580C] text-white"
                  : "bg-[#FF7F02] text-white hover:bg-[#EA580C]"
              }`
            }
          >
            {/* Soft glowing orange ring */}
            <span className="absolute -inset-1 rounded-full bg-orange-500/25 blur-[4px] -z-10" />
            <Icon name="camera" />
          </NavLink>
          <span className="mt-1 text-[8.5px] font-bold tracking-[.3px] text-[#FF7F02] dark:text-orange-400 uppercase">
            Camera
          </span>
        </div>

        {/* Tab 4: Date Spots */}
        <NavTab to="/datespots" icon="datespots" label="Date Spots" />

        {/* Tab 5: Profile */}
        <NavTab to="/profile" icon="profile" label="Profile" />
      </div>
    </nav>
  );
}
