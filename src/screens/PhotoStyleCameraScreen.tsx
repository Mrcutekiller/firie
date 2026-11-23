import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import CameraGalleryModal, { type GalleryPhoto } from "../components/CameraGalleryModal";
import PoseFigure from "../components/PoseFigure";
import { ProBadge, cn } from "../components/ui";
import {
  PHOTO_FILTERS,
  buildContextTag,
  buildOutfitContext,
  filterById,
  parseBackgroundText,
  recognizeBackground,
  recognizeFromGps,
  recommendPoses,
  selectorPoses,
  type BackgroundInfo,
  type FilterId,
  type PhotoFilter,
} from "../lib/photoStyle";
import {
  POSES,
  type PhotoFormat,
} from "../lib/poses";
import { getPlace } from "../lib/places";
import { useApp } from "../lib/store";
import type { ClosetItem } from "../lib/types";

interface LocationState {
  placeId?: string;
  itemIds?: string[];
  outfitId?: string;
}

// Background photography assets for preview realism matching reference design
const REALISTIC_BG_PATIO = "https://images.unsplash.com/photo-1554118811-1e0d58224f24?auto=format&fit=crop&w=1200&q=80";

export default function PhotoStyleCameraScreen() {
  const navigate = useNavigate();
  const location = useLocation();
  const state = (location.state as LocationState) || {};

  const {
    closet,
    isPro,
    profile,
    currentOutfit,
    photoRecsLeftToday,
    photoRecsLeftThisWeek,
    photoRecsLeft,
    notePhotoRecommendation,
    recentPoseIds,
    markPoseUsed,
  } = useApp();

  /* ------------------------------- Outfit setup ------------------------------ */
  const outfitItems = useMemo<ClosetItem[]>(() => {
    if (state.itemIds && state.itemIds.length > 0) {
      return state.itemIds
        .map((id) => closet.find((item) => item.id === id))
        .filter((item): item is ClosetItem => Boolean(item));
    }
    if (currentOutfit) {
      return currentOutfit.itemIds
        .map((id) => closet.find((item) => item.id === id))
        .filter((item): item is ClosetItem => Boolean(item));
    }
    return closet.slice(0, 4);
  }, [state.itemIds, currentOutfit, closet]);

  /* ----------------------------- Background setup ---------------------------- */
  const initialPlace = useMemo(() => {
    return state.placeId ? getPlace(state.placeId) : undefined;
  }, [state.placeId]);

  const [background, setBackground] = useState<BackgroundInfo>(() => {
    if (initialPlace) {
      const isCafe = initialPlace.categories.includes("coffee-date");
      const isRooftop = initialPlace.categories.includes("rooftop") || initialPlace.seating.includes("rooftop");
      const isOutdoor = initialPlace.categories.includes("outdoor-date") || initialPlace.seating.includes("outdoor");
      return {
        placeType: isCafe ? "cafe" : isRooftop ? "rooftop" : isOutdoor ? "garden" : "restaurant",
        objects: isCafe ? ["table", "chair"] : [],
        structures: isRooftop ? ["railing", "open-space"] : ["table", "chair"],
        lighting: "soft",
        space: isRooftop || isOutdoor ? "open" : "moderate",
        colors: [],
        source: "place",
        confidence: 0.9,
        label: `${initialPlace.name} · ${initialPlace.neighborhood}`,
        detail: initialPlace.address,
      };
    }
    return {
      placeType: "cafe",
      objects: ["table", "chair"],
      structures: ["table", "chair"],
      lighting: "soft",
      space: "moderate",
      colors: [],
      source: "text",
      confidence: 0.85,
      label: "Cafe",
    };
  });

  /* ------------------------------- Camera state ------------------------------ */
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [cameraFacing, setCameraFacing] = useState<"environment" | "user">("environment");
  const [cameraActive, setCameraActive] = useState(false);
  const [, setCameraError] = useState<string | null>(null);
  const [flashMode, setFlashMode] = useState<"off" | "on" | "auto">("off");
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [rawCapturedPhoto, setRawCapturedPhoto] = useState<string | null>(null);
  const [lastSavedThumbnail, setLastSavedThumbnail] = useState<string | null>(null);

  /* ------------------------------- Pose & Filter ----------------------------- */
  const [activeFilterId, setActiveFilterId] = useState<FilterId>("natural");
  const [selectedFormat, setSelectedFormat] = useState<PhotoFormat>("story");
  /** Gender comes from the sign-up profile — no per-screen toggle. */
  const gender = profile.gender === "women" ? "women" : "men";
  const poseOpacity = 0.92;

  /* -------------------------- Tilt & Angle Alignment ------------------------- */
  const [deviceTilt, setDeviceTilt] = useState<number | null>(null);
  const [simulatedAngleMatch, setSimulatedAngleMatch] = useState(false);

  useEffect(() => {
    const handleOrientation = (e: DeviceOrientationEvent) => {
      if (e.beta !== null && typeof e.beta === "number") {
        setDeviceTilt(Math.round(e.beta));
      }
    };
    if (typeof window !== "undefined" && window.DeviceOrientationEvent) {
      window.addEventListener("deviceorientation", handleOrientation);
    }
    return () => {
      if (typeof window !== "undefined" && window.DeviceOrientationEvent) {
        window.removeEventListener("deviceorientation", handleOrientation);
      }
    };
  }, []);

  // Modals & Drawers
  const [showDetailedPreview, setShowDetailedPreview] = useState(false);
  const [showBgModal, setShowBgModal] = useState(false);
  const [showGalleryModal, setShowGalleryModal] = useState(false);
  const [captureToast, setCaptureToast] = useState<string | null>(null);
  const [bgInputText, setBgInputText] = useState("");
  const [bgDetecting, setBgDetecting] = useState(false);
  const [compareRaw, setCompareRaw] = useState(false);
  const [shareFeedback, setShareFeedback] = useState<string | null>(null);

  /* -------------------------- In-App FITLY Gallery -------------------------- */
  const [galleryPhotos, setGalleryPhotos] = useState<GalleryPhoto[]>(() => {
    try {
      const saved = localStorage.getItem("fitly_camera_gallery");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (err) {
      console.error("Failed to load gallery", err);
    }
    return [];
  });

  const handleDeleteGalleryPhoto = (id: string) => {
    setGalleryPhotos((prev) => {
      const updated = prev.filter((p) => p.id !== id);
      try {
        localStorage.setItem("fitly_camera_gallery", JSON.stringify(updated));
      } catch (err) {
        console.error(err);
      }
      return updated;
    });
  };

  const handleImportGalleryPhoto = (dataUrl: string) => {
    const newPhoto: GalleryPhoto = {
      id: `imported-${Date.now()}`,
      dataUrl,
      createdAt: Date.now(),
      poseName: "Imported Look",
      filterName: "Original",
      contextTag: background.label,
    };
    setGalleryPhotos((prev) => {
      const updated = [newPhoto, ...prev];
      try {
        localStorage.setItem("fitly_camera_gallery", JSON.stringify(updated.slice(0, 30)));
      } catch (err) {
        console.error(err);
      }
      return updated;
    });
    setLastSavedThumbnail(dataUrl);
    setCaptureToast("✓ Photo imported to ፍሬ Gallery!");
    setTimeout(() => setCaptureToast(null), 3000);
  };

  /* ----------------------------- Recommendations ---------------------------- */
  const outfitContext = useMemo(() => {
    return buildOutfitContext(outfitItems, background.label);
  }, [outfitItems, background.label]);

  const recResult = useMemo(() => {
    return recommendPoses({
      background,
      outfit: outfitContext,
      format: selectedFormat,
      plan: isPro ? "pro" : "free",
      recentPoseIds,
      freeRemaining: photoRecsLeft ?? 3,
    });
  }, [background, outfitContext, selectedFormat, isPro, recentPoseIds, photoRecsLeft]);

  // Selected Pose
  const availablePoses = useMemo(() => {
    const list = recResult.recommendations.map((r) => r.pose);
    if (list.length === 0) return selectorPoses();
    const defaults = selectorPoses();
    const combined = [...list];
    for (const p of defaults) {
      if (!combined.some((item) => item.id === p.id)) {
        combined.push(p);
      }
    }
    return combined;
  }, [recResult.recommendations]);

  const [activePoseId, setActivePoseId] = useState<string>(() => {
    return availablePoses[0]?.id || "low-angle-shoes";
  });

  const activePose = useMemo(() => {
    return POSES.find((p) => p.id === activePoseId) || availablePoses[0] || POSES[0];
  }, [activePoseId, availablePoses]);

  const isAngleMatched = useMemo(() => {
    if (simulatedAngleMatch) return true;
    if (deviceTilt === null) return false;
    const target = activePose.camera.angle;
    if (target === "low") {
      return deviceTilt >= 55 && deviceTilt <= 82;
    } else if (target === "eye-level") {
      return deviceTilt >= 83 && deviceTilt <= 98;
    } else if (target === "high") {
      return deviceTilt >= 99 && deviceTilt <= 135;
    } else if (target === "top-down") {
      return deviceTilt <= 30 || deviceTilt >= 150;
    }
    return false;
  }, [simulatedAngleMatch, deviceTilt, activePose.camera.angle]);

  const activeIndex = useMemo(() => {
    const idx = availablePoses.findIndex((p) => p.id === activePose.id);
    return idx >= 0 ? idx : 0;
  }, [availablePoses, activePose.id]);

  const activeFilter = useMemo(() => {
    return filterById(activeFilterId);
  }, [activeFilterId]);

  /* ----------------------------- Stream lifecycle ---------------------------- */
  const stopStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  }, []);

  const startCamera = useCallback(async () => {
    stopStream();
    setCameraError(null);
    try {
      if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
        throw new Error("Camera API not supported in this browser.");
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: cameraFacing,
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setCameraActive(true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Camera access denied or unavailable.";
      setCameraError(msg);
      setCameraActive(false);
    }
  }, [cameraFacing, stopStream]);

  useEffect(() => {
    startCamera();
    return () => {
      stopStream();
    };
  }, [startCamera, stopStream]);

  /* ----------------------------- Camera Controls ----------------------------- */
  const flipCamera = () => {
    setCameraFacing((prev) => (prev === "environment" ? "user" : "environment"));
  };

  const cycleFlash = () => {
    setFlashMode((prev) => (prev === "off" ? "on" : prev === "on" ? "auto" : "off"));
  };

  const handlePrevPose = () => {
    const total = availablePoses.length;
    const nextIdx = (activeIndex - 1 + total) % total;
    setActivePoseId(availablePoses[nextIdx].id);
  };

  const handleNextPose = () => {
    const total = availablePoses.length;
    const nextIdx = (activeIndex + 1) % total;
    setActivePoseId(availablePoses[nextIdx].id);
  };

  /* ---------------------------- Capture & Filters ---------------------------- */
  const handleCapture = () => {
    // Trigger flash animation
    const flashEl = document.getElementById("camera-flash-overlay");
    if (flashEl) {
      flashEl.style.opacity = "1";
      setTimeout(() => {
        flashEl.style.opacity = "0";
      }, 140);
    }

    const video = videoRef.current;
    const canvas = document.createElement("canvas");
    canvas.width = (video && video.videoWidth) ? video.videoWidth : 1080;
    canvas.height = (video && video.videoHeight) ? video.videoHeight : 1920;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    if (cameraActive && video) {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    } else {
      // Draw realistic background fallback
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.src = REALISTIC_BG_PATIO;
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    }

    const rawData = canvas.toDataURL("image/jpeg", 0.95);
    setRawCapturedPhoto(rawData);

    // Apply active filter onto canvas
    let finalPhotoData = rawData;
    const filteredCanvas = document.createElement("canvas");
    filteredCanvas.width = canvas.width;
    filteredCanvas.height = canvas.height;
    const fctx = filteredCanvas.getContext("2d");
    if (fctx) {
      fctx.filter = activeFilter.css;
      fctx.drawImage(canvas, 0, 0);
      finalPhotoData = filteredCanvas.toDataURL("image/jpeg", 0.95);
    }

    setCapturedPhoto(finalPhotoData);
    setLastSavedThumbnail(finalPhotoData);

    // Save directly to FITLY in-app gallery
    const newPhoto: GalleryPhoto = {
      id: `photo-${Date.now()}`,
      dataUrl: finalPhotoData,
      createdAt: Date.now(),
      poseName: activePose.name,
      filterName: activeFilter.label,
      contextTag: background.label,
    };

    setGalleryPhotos((prev) => {
      const updated = [newPhoto, ...prev];
      try {
        localStorage.setItem("fitly_camera_gallery", JSON.stringify(updated.slice(0, 30)));
      } catch (err) {
        console.error("Storage error", err);
      }
      return updated;
    });

    setCaptureToast("📸 Photo saved to ፍሬ Gallery! Tap gallery to save to device");
    setTimeout(() => setCaptureToast(null), 3500);

    // Record pose usage & note free quota
    markPoseUsed(activePose.id);
    if (!isPro) {
      notePhotoRecommendation();
    }
  };

  const reapplyFilterToCaptured = (filter: PhotoFilter) => {
    if (!rawCapturedPhoto) return;
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.filter = filter.css;
        ctx.drawImage(img, 0, 0);
        setCapturedPhoto(canvas.toDataURL("image/jpeg", 0.95));
      }
    };
    img.src = rawCapturedPhoto;
  };

  /* ------------------------- Background Recognition -------------------------- */
  const handleBgTextSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!bgInputText.trim()) return;
    const parsed = parseBackgroundText(bgInputText);
    setBackground(parsed);
    setShowBgModal(false);
    setBgInputText("");
  };

  const handleBgGps = async () => {
    setBgDetecting(true);
    const res = await recognizeFromGps();
    setBgDetecting(false);
    if (!res.error) {
      setBackground(res.info);
      setShowBgModal(false);
    } else {
      alert(res.error);
    }
  };

  const handleBgPhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBgDetecting(true);
    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = reader.result as string;
      const recognized = await recognizeBackground(dataUrl);
      setBackground(recognized);
      setBgDetecting(false);
      setShowBgModal(false);
    };
    reader.readAsDataURL(file);
  };

  /* ------------------------------ Save & Share ------------------------------- */
  const handleDownload = () => {
    if (!capturedPhoto) return;
    const a = document.createElement("a");
    a.href = capturedPhoto;
    a.download = `Firie_${activePose.id}_${Date.now()}.jpg`;
    a.click();
    setShareFeedback("Saved to device gallery!");
    setTimeout(() => setShareFeedback(null), 2500);
  };

  const handleShare = async () => {
    if (!capturedPhoto) return;
    try {
      const nav = typeof window !== "undefined" ? window.navigator : undefined;
      const res = await fetch(capturedPhoto);
      const blob = await res.blob();
      const file = new File([blob], `Firie_look.jpg`, { type: "image/jpeg" });

      if (nav && "share" in nav && typeof nav.share === "function") {
        await nav.share({
          title: "My ፍሬ Look",
          text: `Wearing my look with ፍሬ (Firie) Photo Style Camera (${activePose.name})!`,
          files: [file],
        });
        setShareFeedback("Shared successfully!");
      } else if (nav && nav.clipboard) {
        await nav.clipboard.writeText(window.location.href);
        setShareFeedback("Link copied to clipboard!");
      }
    } catch {
      setShareFeedback("Sharing not available on this device.");
    }
    setTimeout(() => setShareFeedback(null), 2500);
  };

  /* ------------------------------- Context Tag ------------------------------- */
  const contextTag = useMemo(() => {
    return buildContextTag(background.label, outfitItems);
  }, [background.label, outfitItems]);

  // Visual pose chips matching the reference design: Cool Look, Side Pose, Street Vibe, Chill Stance
  const poseCards = useMemo(() => {
    const defaultLabels = ["Cool Look", "Side Pose", "Street Vibe", "Chill Stance"];
    return availablePoses.slice(0, 4).map((p, idx) => ({
      ...p,
      displayTitle: defaultLabels[idx] || p.chip || p.name,
    }));
  }, [availablePoses]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[#080d1a] text-white select-none overflow-hidden font-sans">
      {/* Flash effect overlay */}
      <div
        id="camera-flash-overlay"
        className="pointer-events-none fixed inset-0 z-[70] bg-white opacity-0 transition-opacity duration-150"
      />

      {/* ────────────────────────────────────────────────────────────────────────── */}
      {/* SCREEN A: POST-CAPTURE REVIEW SCREEN                                     */}
      {/* ────────────────────────────────────────────────────────────────────────── */}
      {capturedPhoto ? (
        <div className="flex h-full w-full flex-col justify-between bg-[#080d1a] p-4 animate-fade">
          {/* Top Bar */}
          <div className="flex items-center justify-between pt-2">
            <button
              onClick={() => {
                setCapturedPhoto(null);
                setRawCapturedPhoto(null);
              }}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur-md active:scale-95"
            >
              ✕
            </button>
            <div className="text-center">
              <p className="text-xs font-black uppercase tracking-wider text-white">Review Photo</p>
              <p className="text-[10px] text-white/60">{activePose.name}</p>
            </div>
            <div className="w-10" />
          </div>

          {/* Center Captured Preview */}
          <div className="relative mx-auto flex flex-1 items-center justify-center overflow-hidden py-3">
            <div
              className={cn(
                "relative overflow-hidden rounded-2xl shadow-2xl transition-all",
                selectedFormat === "story" && "aspect-[9/16] h-full max-h-[70vh]",
                selectedFormat === "portrait" && "aspect-[4/5] h-full max-h-[70vh]",
                selectedFormat === "square" && "aspect-square h-full max-h-[70vh]"
              )}
            >
              <img
                src={compareRaw ? rawCapturedPhoto || capturedPhoto : capturedPhoto}
                alt="Captured look"
                className="h-full w-full object-cover"
              />

              {/* Hold to Compare Badge */}
              <button
                onMouseDown={() => setCompareRaw(true)}
                onMouseUp={() => setCompareRaw(false)}
                onTouchStart={() => setCompareRaw(true)}
                onTouchEnd={() => setCompareRaw(false)}
                className="absolute bottom-3 left-3 rounded-full bg-black/60 px-3 py-1 text-[10px] font-bold text-white/90 backdrop-blur-md active:bg-black/90"
              >
                {compareRaw ? "Showing Original" : "Hold to Compare"}
              </button>

              {/* Aspect Ratio Badge */}
              <div className="flex gap-1 absolute right-3 top-3">
                {(["story", "portrait", "square"] as PhotoFormat[]).map((fmt) => (
                  <button
                    key={fmt}
                    onClick={() => setSelectedFormat(fmt)}
                    className={cn(
                      "rounded-full px-2 py-0.5 text-[9px] font-bold backdrop-blur-md transition-colors",
                      selectedFormat === fmt ? "bg-white text-[#0b1f4b]" : "bg-black/60 text-white/80"
                    )}
                  >
                    {fmt === "story" ? "9:16" : fmt === "portrait" ? "4:5" : "1:1"}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Feedback notification */}
          {shareFeedback && (
            <div className="mx-auto mb-2 rounded-full bg-emerald-500/90 px-4 py-1.5 text-xs font-bold text-white shadow-lg animate-pop">
              {shareFeedback}
            </div>
          )}

          {/* Filter Bar */}
          <div className="flex shrink-0 items-center justify-center gap-2 py-2">
            {PHOTO_FILTERS.map((f) => (
              <button
                key={f.id}
                onClick={() => {
                  if (f.pro && !isPro) {
                    navigate("/upgrade");
                    return;
                  }
                  setActiveFilterId(f.id);
                  reapplyFilterToCaptured(f);
                }}
                className={cn(
                  "flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-bold transition-all",
                  activeFilterId === f.id
                    ? "bg-white text-[#0b1f4b] shadow-md scale-105"
                    : "bg-white/10 text-white/80 hover:bg-white/20"
                )}
              >
                <span>{f.label}</span>
                {f.pro && <ProBadge />}
              </button>
            ))}
          </div>

          {/* Actions Bottom Bar */}
          <div className="flex items-center gap-2 pt-2">
            <button
              onClick={() => {
                setCapturedPhoto(null);
                setRawCapturedPhoto(null);
              }}
              className="rounded-2xl border border-white/20 bg-white/10 px-4 py-3.5 text-xs font-bold text-white transition-transform active:scale-95"
            >
              ↺ Retake
            </button>
            <button
              onClick={() => {
                setCapturedPhoto(null);
                setRawCapturedPhoto(null);
                setShowGalleryModal(true);
              }}
              className="flex-1 rounded-2xl border border-white/20 bg-[#122347] py-3.5 text-xs font-bold text-white shadow-md transition-transform active:scale-95 hover:bg-[#182f5e]"
            >
              🖼️ In-App Gallery
            </button>
            <button
              onClick={handleDownload}
              className="flex-1 rounded-2xl bg-white py-3.5 text-xs font-black text-[#0b1f4b] shadow-lg transition-transform active:scale-95 hover:bg-white/90"
            >
              💾 Save to Device
            </button>
            <button
              onClick={handleShare}
              className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#0b1f4b] text-white border border-white/20 shadow-lg transition-transform active:scale-95"
              title="Share photo"
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
        /* ────────────────────────────────────────────────────────────────────────── */
        /* SCREEN B: LIVE CAMERA VIEW (Matching Reference Design Image Exactly)       */
        /* ────────────────────────────────────────────────────────────────────────── */
        <div className="relative flex h-full w-full flex-col justify-between overflow-hidden">
          {/* iOS Status Bar Emulation */}
          <div className="relative z-30 flex items-center justify-between px-6 pt-3 text-[13px] font-semibold tracking-tight text-white/90">
            <span>9:41</span>
            <div className="flex items-center gap-1.5">
              <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="currentColor">
                <path d="M12 3c-4.97 0-9 4.03-9 9 0 2.12.74 4.07 1.97 5.61L4.35 19.4a1 1 0 0 0 1.25 1.25l1.79-.62C9.07 21.26 10.49 22 12 22c4.97 0 9-4.03 9-9s-4.03-9-9-9z" />
              </svg>
              <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="currentColor">
                <path d="M12 4C7.31 4 3.07 5.9 0 8.98L12 21 24 8.98A16.88 16.88 0 0 0 12 4z" />
              </svg>
              <div className="flex h-2.5 w-5 items-center rounded-[3px] border border-white/80 p-0.5">
                <div className="h-full w-full rounded-[1px] bg-white" />
              </div>
            </div>
          </div>

          {/* ── 1. Top Navigation Bar (Close, FITLY Wordmark, Flash) ── */}
          <header className="relative z-30 flex items-center justify-between px-5 pt-1 pb-1">
            {/* Close button */}
            <button
              onClick={() => navigate(-1)}
              aria-label="Close camera"
              className="flex h-10 w-10 items-center justify-center rounded-full bg-[#0c1936]/80 text-white backdrop-blur-md border border-white/10 shadow-md transition-transform active:scale-90"
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>

            {/* Firie Wordmark — Centered, spaced typography */}
            <div className="flex items-center gap-1.5">
              <span className="text-[16px] font-black tracking-wider text-white drop-shadow-md">
                ፍሬ <span className="text-[#FF7F02] text-xs font-bold tracking-normal">Firie</span>
              </span>
            </div>

            {/* Flash toggle */}
            <button
              onClick={cycleFlash}
              className={cn(
                "flex h-10 w-10 items-center justify-center rounded-full bg-[#0c1936]/80 text-sm font-bold backdrop-blur-md border border-white/10 shadow-md transition-colors active:scale-90",
                flashMode !== "off" ? "text-amber-300" : "text-white"
              )}
              title={`Flash: ${flashMode}`}
            >
              ⚡{flashMode === "auto" ? "A" : ""}
            </button>
          </header>

          {/* ── 2. Context Tag & Free Plan Photo Style Quota ── */}
          <div className="relative z-30 flex flex-col items-center gap-1 px-4 mt-0.5">
            <button
              onClick={() => setShowBgModal(true)}
              className="flex items-center gap-1.5 rounded-full bg-[#0d1d3b]/90 px-4 py-1.5 text-xs font-medium text-white/95 backdrop-blur-md border border-white/15 shadow-lg transition-transform active:scale-95"
            >
              <span className="text-white text-xs">📍</span>
              <span className="truncate max-w-[240px]">{contextTag}</span>
              <span className="text-[11px] text-white/70 ml-0.5">⌄</span>
            </button>

            {!isPro && (
              <div className="flex items-center gap-2 rounded-full bg-black/40 px-3 py-0.5 backdrop-blur-xs text-[9.5px] font-medium text-white/80 border border-white/10">
                <span>Free Photo Style:</span>
                <span className={cn("font-bold", (photoRecsLeftToday ?? 1) > 0 ? "text-amber-300" : "text-rose-400")}>
                  {photoRecsLeftToday ?? 1}/1 today
                </span>
                <span className="opacity-40">•</span>
                <span>{photoRecsLeftThisWeek ?? 4}/4 this week</span>
                <button
                  onClick={() => navigate("/upgrade")}
                  className="font-bold text-amber-400 hover:underline active:scale-95 ml-0.5"
                >
                  Pro ✨
                </button>
              </div>
            )}
          </div>

          {/* ── 3. Central Viewfinder with Realistic Background & AR Guidance Overlay ── */}
          <div className="relative flex flex-1 items-center justify-center overflow-hidden my-1">
            {/* Background Feed (Live Camera stream OR high-res realistic outdoor cafe backdrop) */}
            {cameraActive ? (
              <video
                ref={videoRef}
                playsInline
                autoPlay
                muted
                style={{ filter: activeFilter.css }}
                className={cn(
                  "absolute inset-0 h-full w-full object-cover transition-all",
                  cameraFacing === "user" && "scale-x-[-1]"
                )}
              />
            ) : (
              <div className="absolute inset-0 h-full w-full bg-gradient-to-b from-zinc-900 via-black to-zinc-900 flex flex-col items-center justify-center text-center p-6 select-none">
                <div className="h-16 w-16 rounded-full bg-white/10 flex items-center justify-center border border-white/20 mb-3 shadow-inner">
                  <span className="text-2xl animate-pulse">📸</span>
                </div>
                <p className="text-xs font-bold text-white/90">Starting Camera Viewfinder…</p>
                <p className="text-[10px] text-zinc-400 mt-1 max-w-[220px]">
                  Align your pose with the silhouette guide overlay
                </p>
              </div>
            )}

            {/* Central Vertical Alignment Dashed Guide Line */}
            <div className="pointer-events-none absolute inset-y-8 left-1/2 w-0 border-l border-dashed border-white/40" />

            {/* Central Transparent Anatomical Realistic Pose Silhouette */}
            <div
              className="pointer-events-none absolute inset-0 flex items-center justify-center"
              style={{ opacity: poseOpacity }}
            >
              <div className="h-[90%] w-[90%] max-w-sm drop-shadow-[0_4px_16px_rgba(0,0,0,0.6)]">
                <PoseFigure
                  pose={activePose}
                  gender={gender}
                  showGuides={false}
                  showLabels={false}
                  showGround={true}
                  isMatched={isAngleMatched}
                  className="h-full w-full"
                />
              </div>
            </div>
          </div>

          {/* ── 3.3 Floating In-App Capture Saved Toast (Tapping Opens Gallery) ── */}
          {captureToast && (
            <div className="relative z-40 mx-4 mb-2 flex justify-center animate-pop">
              <button
                type="button"
                onClick={() => {
                  setCaptureToast(null);
                  setShowGalleryModal(true);
                }}
                className="flex items-center gap-2 rounded-2xl bg-emerald-500/95 px-4 py-2 text-xs font-bold text-white shadow-xl backdrop-blur-md active:scale-95"
              >
                <span>{captureToast}</span>
                <span className="rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-black">Open Gallery ›</span>
              </button>
            </div>
          )}

          {/* ── 3.5 Angle Alignment Live Sensor Indicator ── */}
          <div className="relative z-30 flex justify-center px-4 mb-2">
            <button
              type="button"
              onClick={() => setSimulatedAngleMatch((prev) => !prev)}
              title="Click to toggle angle match test"
              className={cn(
                "flex items-center gap-2 rounded-full px-3.5 py-1 text-[11px] font-semibold backdrop-blur-md transition-all duration-300 shadow-md",
                isAngleMatched
                  ? "bg-emerald-500/90 text-white ring-2 ring-emerald-300/80 shadow-[0_0_16px_rgba(52,211,153,0.7)] animate-pulse"
                  : "bg-black/55 text-white/80 border border-white/20 hover:bg-black/70"
              )}
            >
              <span
                className={cn(
                  "h-2 w-2 rounded-full transition-colors",
                  isAngleMatched ? "bg-white animate-ping" : "bg-amber-400"
                )}
              />
              <span>
                {isAngleMatched
                  ? `✓ PERFECT ANGLE · ${activePose.camera.angle.toUpperCase()} (${deviceTilt !== null ? `${deviceTilt}°` : "MATCHED"})`
                  : `📐 Angle Target: ${activePose.camera.height} (${activePose.camera.angle}) · Tap to test`}
              </span>
            </button>
          </div>

          {/* ── 4. Instruction Banner (Matching Reference Image with < > Controls) ── */}
          <div className="relative z-30 px-4 mb-2">
            <div className="flex items-center justify-between rounded-2xl bg-[#0c1c3d]/95 px-4 py-2.5 backdrop-blur-md border border-white/15 shadow-xl">
              <button
                onClick={() => setShowDetailedPreview(true)}
                title="Show pose & camera guidelines"
                className="flex items-center gap-3 text-left active:scale-[0.99] flex-1 min-w-0"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#182d5a] text-amber-300">
                  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M9 18h6M10 22h4" />
                    <path d="M12 2a7 7 0 0 0-7 7c0 2.5 1.5 4.5 3 6h8c1.5-1.5 3-3.5 3-6a7 7 0 0 0-7-7z" />
                  </svg>
                </div>
                <div className="min-w-0">
                  <h3 className="text-[13px] font-bold text-white leading-tight truncate">
                    Low angle · show the shoes
                  </h3>
                  <p className="text-[11px] text-white/70 leading-snug line-clamp-1 mt-0.5">
                    Hold the phone at knee height and step back two steps.
                  </p>
                </div>
              </button>

              <div className="flex items-center gap-1.5 pl-2 shrink-0">
                <button
                  onClick={handlePrevPose}
                  className="flex h-7 w-7 items-center justify-center rounded-full bg-white/10 text-white/80 hover:text-white active:scale-90"
                  aria-label="Previous pose"
                >
                  ‹
                </button>
                <button
                  onClick={handleNextPose}
                  className="flex h-7 w-7 items-center justify-center rounded-full bg-white/10 text-white/80 hover:text-white active:scale-90"
                  aria-label="Next pose"
                >
                  ›
                </button>
              </div>
            </div>
          </div>

          {/* ── 5. Filter Chips Bar (Normal, Snap Glow, iPhone Cine, Sony Vivid, Clean, Golden Hour) ── */}
          <div className="relative z-30 flex items-center px-4 mb-2 gap-1.5 overflow-x-auto no-scrollbar">
            {PHOTO_FILTERS.map((f) => {
              const isSelected = activeFilterId === f.id;
              return (
                <button
                  key={f.id}
                  onClick={() => {
                    if (f.pro && !isPro) {
                      navigate("/upgrade");
                      return;
                    }
                    setActiveFilterId(f.id);
                  }}
                  className={cn(
                    "shrink-0 px-3.5 py-1.5 text-center text-xs font-bold rounded-xl transition-all shadow-md whitespace-nowrap",
                    isSelected
                      ? "bg-white text-[#0b1f4b] shadow-lg scale-102 font-black ring-2 ring-white/60"
                      : "bg-[#0e2044]/90 text-white/85 border border-white/10 hover:bg-[#152e5f]"
                  )}
                >
                  <span>{f.label}</span>
                  {f.pro && !isPro && <span className="ml-1 text-[9px] text-amber-300">★</span>}
                </button>
              );
            })}
          </div>

          {/* ── 6. Pose Selector Carousel (Thumbnails with White Highlight Border) ── */}
          <div className="relative z-30 px-4 mb-2">
            <div className="flex items-center justify-between gap-2 overflow-x-auto no-scrollbar">
              {poseCards.map((p) => {
                const isSelected = p.id === activePoseId;
                return (
                  <button
                    key={p.id}
                    onClick={() => setActivePoseId(p.id)}
                    className={cn(
                      "relative h-[96px] flex-1 min-w-[76px] rounded-2xl overflow-hidden transition-all duration-150 active:scale-95 shadow-md",
                      isSelected
                        ? "border-2 border-[#FF7F02] ring-2 ring-orange-500/50 shadow-orange-500/25 scale-[1.03]"
                        : "border border-white/15 opacity-75 hover:opacity-100"
                    )}
                  >
                    {/* Thumbnail Studio Backdrop */}
                    <div className="absolute inset-0 bg-gradient-to-b from-zinc-800 to-zinc-950" />

                    {/* Mini Pose Vector in Center */}
                    <div className="absolute inset-0 flex items-center justify-center p-1">
                      <div className="h-14 w-10">
                        <PoseFigure pose={p} gender={gender} showGuides showLabels={false} showGround={false} className="h-full w-full" />
                      </div>
                    </div>

                    {/* Bottom Label Badge */}
                    <div className={cn(
                      "absolute inset-x-0 bottom-0 py-1 text-center transition-colors",
                      isSelected
                        ? "bg-[#FF7F02] text-white"
                        : "bg-black/75 text-zinc-300"
                    )}>
                      <span className="text-[10px] font-bold drop-shadow-sm whitespace-nowrap block truncate px-1">
                        {p.displayTitle}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* ── 7. Bottom Shutter Controls & Gallery ── */}
          <footer className="relative z-30 flex items-center justify-between px-8 pb-3 pt-1">
            {/* Gallery Thumbnail Button — Opens In-App Gallery */}
            <button
              type="button"
              onClick={() => setShowGalleryModal(true)}
              aria-label="Open photo gallery"
              className="relative flex h-13 w-13 cursor-pointer items-center justify-center rounded-2xl bg-zinc-900/90 text-white border border-white/20 shadow-lg active:scale-90 transition-transform overflow-hidden group"
              title="Open Photo Gallery"
            >
              {lastSavedThumbnail ? (
                <img
                  src={lastSavedThumbnail}
                  alt="Gallery thumbnail"
                  className="h-full w-full object-cover transition-transform group-hover:scale-105"
                />
              ) : (
                <svg viewBox="0 0 24 24" className="h-6 w-6 text-white/90" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <rect x="3" y="3" width="18" height="18" rx="3" />
                  <circle cx="8.5" cy="8.5" r="1.5" fill="currentColor" />
                  <polyline points="21 15 16 10 5 21" />
                </svg>
              )}
              {galleryPhotos.length > 0 && (
                <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-[#FF7F02] ring-1 ring-black" />
              )}
            </button>

            {/* Shutter Button — Large Outer Ring with Inner Solid Circle & Emerald Glow when Matched */}
            <button
              onClick={handleCapture}
              aria-label="Capture photo"
              className={cn(
                "group relative flex h-20 w-20 items-center justify-center rounded-full border-[5px] bg-transparent p-1 transition-all duration-300 active:scale-90",
                isAngleMatched
                  ? "border-emerald-400 shadow-[0_0_30px_rgba(52,211,153,0.9)] ring-4 ring-emerald-300/60 scale-105"
                  : "border-white shadow-[0_0_20px_rgba(255,255,255,0.25)]"
              )}
            >
              <div
                className={cn(
                  "h-16 w-16 rounded-full transition-all group-active:scale-90 shadow-md",
                  isAngleMatched ? "bg-emerald-400" : "bg-white"
                )}
              />
            </button>

            {/* Flip Camera Button */}
            <button
              onClick={flipCamera}
              aria-label="Flip camera"
              className="flex h-13 w-13 items-center justify-center rounded-full bg-[#0f2142]/90 text-white border border-white/20 shadow-lg active:scale-90 transition-transform"
            >
              <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2" />
              </svg>
            </button>
          </footer>

          {/* iOS Bottom Home Bar Indicator */}
          <div className="relative z-30 pb-2">
            <div className="h-1 w-32 rounded-full bg-white/70 mx-auto" />
          </div>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────────────────────── */}
      {/* MODAL 1: DETAILED POSE PREVIEW MODAL                                      */}
      {/* ────────────────────────────────────────────────────────────────────────── */}
      {showDetailedPreview && (
        <div
          className="fixed inset-0 z-[80] flex items-end justify-center bg-black/70 backdrop-blur-md p-4 animate-fade"
          onClick={() => setShowDetailedPreview(false)}
        >
          <div
            className="flex max-h-[88vh] w-full max-w-md flex-col overflow-y-auto rounded-3xl bg-white p-6 text-navy-950 shadow-2xl animate-pop"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-navy-100">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-black text-navy-900">{activePose.name}</h2>
                  {!activePose.free && <ProBadge />}
                </div>
                <p className="text-xs text-navy-500">{activePose.tagline}</p>
              </div>
              <button
                onClick={() => setShowDetailedPreview(false)}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-navy-50 text-navy-500 font-bold hover:bg-navy-100"
              >
                ✕
              </button>
            </div>

            {/* Transparent vector diagram with camera guides */}
            <div className="my-4 flex h-64 w-full items-center justify-center rounded-2xl bg-navy-950 p-3 shadow-inner">
              <div className="h-full w-full max-w-[220px]">
                <PoseFigure pose={activePose} gender={gender} showGuides showLabels isMatched={isAngleMatched} className="h-full w-full" />
              </div>
            </div>

            {/* Body positioning checklist breakdown */}
            <div className="space-y-3">
              <p className="text-xs font-black uppercase tracking-wider text-navy-500">
                Body &amp; Camera Positioning
              </p>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="rounded-xl bg-navy-50 p-2.5">
                  <p className="font-bold text-navy-800">👤 Head</p>
                  <p className="mt-0.5 text-navy-600 text-[11px]">{activePose.body.head}</p>
                </div>
                <div className="rounded-xl bg-navy-50 p-2.5">
                  <p className="font-bold text-navy-800">💪 Shoulders</p>
                  <p className="mt-0.5 text-navy-600 text-[11px]">{activePose.body.shoulders}</p>
                </div>
                <div className="rounded-xl bg-navy-50 p-2.5">
                  <p className="font-bold text-navy-800">✋ Arms &amp; Hands</p>
                  <p className="mt-0.5 text-navy-600 text-[11px]">{activePose.body.arms}</p>
                </div>
                <div className="rounded-xl bg-navy-50 p-2.5">
                  <p className="font-bold text-navy-800">🚶 Torso &amp; Core</p>
                  <p className="mt-0.5 text-navy-600 text-[11px]">{activePose.body.torso}</p>
                </div>
                <div className="rounded-xl bg-navy-50 p-2.5">
                  <p className="font-bold text-navy-800">👖 Legs</p>
                  <p className="mt-0.5 text-navy-600 text-[11px]">{activePose.body.leftLeg} {activePose.body.rightLeg}</p>
                </div>
                <div className="rounded-xl bg-navy-50 p-2.5">
                  <p className="font-bold text-navy-800">👟 Shoes</p>
                  <p className="mt-0.5 text-navy-600 text-[11px]">{activePose.body.shoes}</p>
                </div>
              </div>

              {/* Camera specifics */}
              <div className="rounded-2xl border border-navy-100 bg-[#f8fafc] p-3 space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span className="font-semibold text-navy-700">📐 Camera Height &amp; Angle:</span>
                  <span className="font-bold text-navy-900">{activePose.camera.height} ({activePose.camera.angle})</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-semibold text-navy-700">📏 Distance from Person:</span>
                  <span className="font-bold text-navy-900">{activePose.camera.distance}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-semibold text-navy-700">💡 Lighting Direction:</span>
                  <span className="font-bold text-navy-900">{activePose.lighting}</span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="mt-5 flex gap-2">
              <button
                onClick={() => {
                  const currIdx = availablePoses.findIndex((p) => p.id === activePose.id);
                  const nextP = availablePoses[(currIdx + 1) % availablePoses.length];
                  if (nextP) setActivePoseId(nextP.id);
                }}
                className="flex-1 rounded-2xl border border-navy-200 bg-white py-3.5 text-xs font-bold text-navy-800 hover:bg-navy-50"
              >
                See Another Pose
              </button>
              <button
                onClick={() => setShowDetailedPreview(false)}
                className="flex-1 rounded-2xl bg-[#0b1f4b] py-3.5 text-xs font-black text-white shadow-md active:scale-95"
              >
                Start Camera
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────────────────────── */}
      {/* MODAL 2: BACKGROUND RECOGNITION SHEET                                      */}
      {/* ────────────────────────────────────────────────────────────────────────── */}
      {showBgModal && (
        <div
          className="fixed inset-0 z-[80] flex items-end justify-center bg-black/70 backdrop-blur-md p-4 animate-fade"
          onClick={() => setShowBgModal(false)}
        >
          <div
            className="w-full max-w-md rounded-3xl bg-white p-6 text-navy-950 shadow-2xl animate-pop"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-navy-100">
              <div>
                <h2 className="text-base font-black text-navy-900">Surroundings Recognition</h2>
                <p className="text-xs text-navy-500">AI adapts poses to your physical setting</p>
              </div>
              <button
                onClick={() => setShowBgModal(false)}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-navy-50 text-navy-500 font-bold hover:bg-navy-100"
              >
                ✕
              </button>
            </div>

            {/* Current Detected Info */}
            <div className="my-3 rounded-2xl bg-navy-50 p-3 text-xs">
              <p className="font-bold text-navy-800">Current Setting:</p>
              <p className="text-navy-600 mt-0.5">
                {background.label} ({background.placeType}, {background.lighting} light, {background.space} space)
              </p>
            </div>

            {/* Input Method 1: Text */}
            <form onSubmit={handleBgTextSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-navy-700 mb-1">
                  Describe where you are:
                </label>
                <input
                  type="text"
                  value={bgInputText}
                  onChange={(e) => setBgInputText(e.target.value)}
                  placeholder="e.g. I'm at a cafe, beside a brick wall, on stairs..."
                  className="w-full rounded-2xl border border-navy-200 bg-white px-3.5 py-2.5 text-xs text-navy-900 outline-none focus:border-navy-500"
                />
              </div>
              <button
                type="submit"
                className="w-full rounded-2xl bg-[#0b1f4b] py-2.5 text-xs font-bold text-white shadow-sm active:scale-95"
              >
                Apply Text Location
              </button>
            </form>

            <div className="relative my-4 text-center">
              <span className="bg-white px-2 text-[11px] font-bold text-navy-400">OR DETECT AUTOMATICALLY</span>
            </div>

            {/* Input Methods 2 & 3: Photo or GPS */}
            <div className="grid grid-cols-2 gap-2">
              <label className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border border-navy-200 bg-navy-50/50 p-3 text-center transition-colors hover:bg-navy-100">
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleBgPhotoUpload}
                />
                <span className="text-2xl mb-1">📸</span>
                <span className="text-xs font-bold text-navy-800">Surroundings Photo</span>
                <span className="text-[10px] text-navy-400">Analyze with AI Vision</span>
              </label>

              <button
                onClick={handleBgGps}
                disabled={bgDetecting}
                className="flex flex-col items-center justify-center rounded-2xl border border-navy-200 bg-navy-50/50 p-3 text-center transition-colors hover:bg-navy-100"
              >
                <span className="text-2xl mb-1">📍</span>
                <span className="text-xs font-bold text-navy-800">
                  {bgDetecting ? "Reading GPS…" : "Use Current GPS"}
                </span>
                <span className="text-[10px] text-navy-400">Auto-classify area</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── FITLY IN-APP PHOTO GALLERY MODAL ── */}
      <CameraGalleryModal
        isOpen={showGalleryModal}
        onClose={() => setShowGalleryModal(false)}
        photos={galleryPhotos}
        onDeletePhoto={handleDeleteGalleryPhoto}
        onImportPhoto={handleImportGalleryPhoto}
      />
    </div>
  );
}
