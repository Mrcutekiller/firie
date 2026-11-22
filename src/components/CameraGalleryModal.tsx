import { useState } from "react";

export interface GalleryPhoto {
  id: string;
  dataUrl: string;
  createdAt: number;
  poseName: string;
  filterName: string;
  contextTag?: string;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  photos: GalleryPhoto[];
  onDeletePhoto: (id: string) => void;
  onImportPhoto: (dataUrl: string) => void;
}

export default function CameraGalleryModal({
  isOpen,
  onClose,
  photos,
  onDeletePhoto,
  onImportPhoto,
}: Props) {
  const [selectedPhotoId, setSelectedPhotoId] = useState<string | null>(null);
  const [downloadFeedback, setDownloadFeedback] = useState<string | null>(null);

  if (!isOpen) return null;

  const activePhoto = photos.find((p) => p.id === selectedPhotoId) || null;

  const handleDownload = (photo: GalleryPhoto) => {
    try {
      const a = document.createElement("a");
      a.href = photo.dataUrl;
      const cleanName = photo.poseName.toLowerCase().replace(/[^a-z0-9]+/g, "-");
      a.download = `FITLY_${cleanName}_${photo.id}.jpg`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      setDownloadFeedback("✓ Saved to your device!");
      setTimeout(() => setDownloadFeedback(null), 2500);
    } catch {
      setDownloadFeedback("Download failed, please try again.");
      setTimeout(() => setDownloadFeedback(null), 2500);
    }
  };

  const handleShare = async (photo: GalleryPhoto) => {
    try {
      const nav = typeof window !== "undefined" ? window.navigator : undefined;
      const res = await fetch(photo.dataUrl);
      const blob = await res.blob();
      const file = new File([blob], `FITLY_${photo.id}.jpg`, { type: "image/jpeg" });

      if (nav && "share" in nav && typeof nav.share === "function") {
        await nav.share({
          title: "My FITLY Look",
          text: `Styled with FITLY Camera (${photo.poseName} · ${photo.filterName} filter)`,
          files: [file],
        });
        setDownloadFeedback("Shared successfully!");
      } else if (nav && nav.clipboard) {
        await nav.clipboard.writeText(window.location.href);
        setDownloadFeedback("Link copied to clipboard!");
      }
    } catch {
      setDownloadFeedback("Sharing not available on this device.");
    }
    setTimeout(() => setDownloadFeedback(null), 2500);
  };

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/85 backdrop-blur-md p-3 select-none animate-fade"
      onClick={onClose}
    >
      <div
        className="relative flex h-[92vh] w-full max-w-[440px] flex-col overflow-hidden rounded-3xl bg-[#080D1A] text-white shadow-2xl border border-white/10"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Feedback Toast */}
        {downloadFeedback && (
          <div className="absolute top-16 left-1/2 z-50 -translate-x-1/2 rounded-full bg-emerald-500 px-4 py-1.5 text-xs font-bold text-white shadow-xl animate-pop whitespace-nowrap">
            {downloadFeedback}
          </div>
        )}

        {/* ── VIEW 1: DETAIL PHOTO VIEWER ── */}
        {activePhoto ? (
          <div className="flex h-full w-full flex-col justify-between p-4 animate-fade">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <button
                onClick={() => setSelectedPhotoId(null)}
                className="flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-xs font-bold text-white hover:bg-white/20 active:scale-95"
              >
                <span>‹</span>
                <span>Gallery</span>
              </button>

              <div className="text-center">
                <p className="text-xs font-black uppercase tracking-wider text-white">
                  {activePhoto.poseName}
                </p>
                <p className="text-[10px] text-white/60">
                  {new Date(activePhoto.createdAt).toLocaleDateString(undefined, {
                    month: "short",
                    day: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                </p>
              </div>

              <button
                onClick={() => {
                  onDeletePhoto(activePhoto.id);
                  setSelectedPhotoId(null);
                }}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-red-500/20 text-red-400 hover:bg-red-500/30 text-xs font-bold active:scale-95"
                title="Delete photo"
              >
                🗑️
              </button>
            </div>

            {/* Photo Center */}
            <div className="relative mx-auto flex flex-1 items-center justify-center overflow-hidden py-3">
              <div className="relative max-h-[64vh] w-full overflow-hidden rounded-2xl shadow-2xl">
                <img
                  src={activePhoto.dataUrl}
                  alt={activePhoto.poseName}
                  className="h-full w-full object-contain"
                />

                {/* Filter & Pose Chip */}
                <div className="absolute bottom-3 left-3 flex items-center gap-1.5 rounded-full bg-black/60 px-3 py-1 text-[10px] font-bold text-white backdrop-blur-md">
                  <span>✨ {activePhoto.filterName}</span>
                  {activePhoto.contextTag && <span>· {activePhoto.contextTag}</span>}
                </div>
              </div>
            </div>

            {/* Actions Bar */}
            <div className="flex items-center gap-2.5 pt-2 border-t border-white/10">
              <button
                onClick={() => handleDownload(activePhoto)}
                className="flex-1 flex items-center justify-center gap-2 rounded-2xl bg-white py-3.5 text-xs font-black text-[#0B1F4B] shadow-xl hover:bg-white/95 active:scale-95 transition-transform"
              >
                <span>💾</span>
                <span>Save to Device</span>
              </button>

              <button
                onClick={() => handleShare(activePhoto)}
                className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#122347] text-white border border-white/20 shadow-lg active:scale-95"
                title="Share"
              >
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <circle cx="18" cy="5" r="3" />
                  <circle cx="6" cy="12" r="3" />
                  <circle cx="18" cy="19" r="3" />
                  <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
                  <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
                </svg>
              </button>
            </div>
          </div>
        ) : (
          /* ── VIEW 2: GALLERY GRID VIEW ── */
          <div className="flex h-full w-full flex-col p-4">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-lg">🖼️</span>
                  <h2 className="text-sm font-black tracking-tight uppercase text-white">FITLY Gallery</h2>
                </div>
                <p className="text-[10px] text-white/60">
                  {photos.length} photo{photos.length === 1 ? "" : "s"} saved in app · Tap to save to device
                </p>
              </div>

              <div className="flex items-center gap-2">
                <label className="flex h-8 cursor-pointer items-center justify-center rounded-full bg-white/10 px-3 text-[10.5px] font-bold text-white hover:bg-white/20 active:scale-95">
                  <span>＋ Import</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      const reader = new FileReader();
                      reader.onload = () => {
                        onImportPhoto(reader.result as string);
                      };
                      reader.readAsDataURL(file);
                    }}
                  />
                </label>

                <button
                  onClick={onClose}
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-xs font-bold text-white/70 hover:bg-white/20"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Photo Grid */}
            <div className="flex-1 overflow-y-auto no-scrollbar py-3">
              {photos.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center text-center p-6 text-white/70">
                  <span className="text-4xl">📸</span>
                  <h3 className="mt-3 text-sm font-bold text-white">No Photos Yet</h3>
                  <p className="mt-1 text-xs text-white/50 max-w-xs">
                    Snap photos with the FITLY camera pose guides. All shots save here first, where you can select and save them to your device!
                  </p>
                  <button
                    onClick={onClose}
                    className="mt-4 rounded-full bg-white px-5 py-2 text-xs font-black text-[#0B1F4B] shadow-lg active:scale-95"
                  >
                    Open Camera
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-2">
                  {photos.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => setSelectedPhotoId(p.id)}
                      className="group relative aspect-[3/4] w-full overflow-hidden rounded-2xl border border-white/15 bg-[#122347] transition-all hover:scale-102 hover:border-white active:scale-95"
                    >
                      <img
                        src={p.dataUrl}
                        alt={p.poseName}
                        className="h-full w-full object-cover transition-transform group-hover:scale-105"
                      />
                      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-1.5 text-left">
                        <p className="truncate text-[9.5px] font-bold text-white drop-shadow-sm">
                          {p.poseName}
                        </p>
                        <p className="text-[8px] text-white/70">
                          {new Date(p.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Footer tip */}
            <div className="border-t border-white/10 pt-2 text-center text-[10px] text-white/50">
              💡 Tap any photo above, then tap <strong>"Save to Device"</strong> to download.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
