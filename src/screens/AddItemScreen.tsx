import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import ItemFields, { type ItemFieldValues } from "../components/ItemFields";
import { Button, Card, ProBadge, Spinner } from "../components/ui";
import { analyzeItemImage } from "../lib/ai";
import { compressImage, readFileAsDataUrl, removeBackground } from "../lib/image";
import { useApp } from "../lib/store";
import { validateImageFile, sanitizeXSS } from "../lib/security";

type Step = "capture" | "camera" | "processing" | "review";

const DEFAULT_VALUES: ItemFieldValues = {
  name: "",
  category: "tops",
  slot: "top",
  color: "White",
  colorHex: "#FFFFFF",
  isNeutral: true,
  style: "casual",
  season: "all",
  tags: [],
};

export default function AddItemScreen() {
  const navigate = useNavigate();
  const { addItem, freeLimitReached, isPro } = useApp();

  const [step, setStep] = useState<Step>("capture");
  const [stage, setStage] = useState("");
  const [rawImage, setRawImage] = useState<string>("");
  const [cleanImage, setCleanImage] = useState<string>("");
  const [values, setValues] = useState<ItemFieldValues>(DEFAULT_VALUES);
  const [source, setSource] = useState<"on-device" | "llm" | "vision">("on-device");
  const [saving, setSaving] = useState(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  useEffect(() => () => stopCamera(), [stopCamera]);

  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
        audio: false,
      });
      streamRef.current = stream;
      setStep("camera");
      requestAnimationFrame(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => undefined);
        }
      });
    } catch {
      // Camera unavailable / denied — fall back to the file picker.
      fileRef.current?.click();
    }
  }, []);

  const runPipeline = useCallback(
    async (inputDataUrl: string, hintName?: string) => {
      stopCamera();
      setStep("processing");
      try {
        setStage("Compressing photo…");
        const compressed = await compressImage(inputDataUrl, 1080, 0.82);
        setRawImage(compressed);

        setStage("Removing background…");
        const clean = await removeBackground(compressed);
        setCleanImage(clean);

        setStage("Analysing item with AI…");
        const analysis = await analyzeItemImage(clean || compressed, { hintName });
        setSource(analysis.source);
        setValues({
          name: analysis.name === "New item" ? "" : analysis.name,
          category: analysis.category,
          slot: analysis.slot,
          color: analysis.color,
          colorHex: analysis.colorHex,
          isNeutral: analysis.isNeutral,
          style: analysis.style,
          season: analysis.season,
          tags: analysis.tags,
        });
        setStep("review");
      } catch {
        setStage("");
        setStep("capture");
      }
    },
    [stopCamera]
  );

  const onCapture = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth || 720;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext("2d")!;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    void runPipeline(canvas.toDataURL("image/jpeg", 0.9));
  }, [runPipeline]);

  const onFile = useCallback(
    async (file: File | undefined) => {
      if (!file) return;
      const validation = validateImageFile(file);
      if (!validation.valid) {
        alert(validation.error || "Invalid image file.");
        return;
      }
      const dataUrl = await readFileAsDataUrl(file);
      void runPipeline(dataUrl);
    },
    [runPipeline]
  );

  const save = useCallback(() => {
    if (!cleanImage && !rawImage) return;
    setSaving(true);
    const created = addItem({
      imageUrl: cleanImage || rawImage,
      name: sanitizeXSS(values.name.trim()) || "Untitled item",
      category: values.category,
      slot: values.slot,
      color: values.color,
      colorHex: values.colorHex,
      isNeutral: values.isNeutral,
      style: values.style,
      season: values.season,
      tags: values.tags.map(sanitizeXSS),
    });
    setSaving(false);
    if (created) navigate("/closet");
    else navigate("/upgrade");
  }, [addItem, cleanImage, navigate, rawImage, values]);

  const reset = useCallback(() => {
    setStep("capture");
    setRawImage("");
    setCleanImage("");
    setValues(DEFAULT_VALUES);
    setStage("");
  }, []);

  /* ------------------------------ limit guard ----------------------------- */
  if (freeLimitReached && !isPro) {
    return (
      <div className="mx-auto max-w-[480px] px-4 pb-28 pt-6">
        <Card className="text-center">
          <div className="mb-2 text-4xl">📦</div>
          <p className="font-bold text-navy-900">Your Free closet is full</p>
          <p className="mt-1 text-sm text-navy-500">
            The Free plan holds 30 items. Upgrade to Pro for an unlimited closet.
          </p>
          <div className="mt-4 flex justify-center">
            <ProBadge />
          </div>
          <Button variant="gold" fullWidth className="mt-4" onClick={() => navigate("/upgrade")}>
            See Pro plans
          </Button>
          <Button variant="ghost" fullWidth className="mt-2" onClick={() => navigate("/closet")}>
            Back to closet
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-[100dvh] max-w-[480px] flex-col bg-[#f8f9fb] text-[#102642]">
      <header className="sticky top-0 z-20 flex items-center gap-3 bg-[#f8f9fb] px-[22px] pb-2 pt-6">
        <button
          onClick={() => navigate(-1)}
          className="flex h-9 w-9 items-center justify-center rounded-full text-[#445c78] transition-colors hover:bg-[#edf1f6]"
          aria-label="Back"
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5">
            <path fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M15 5l-7 7 7 7" />
          </svg>
        </button>
        <div className="flex-1 text-center text-[10px] font-semibold tracking-[1px] text-[#7e8fa5]">ADD TO CLOSET &nbsp;·&nbsp; {step === "review" ? "2 / 2" : "1 / 2"}</div>
        <span className="w-5" />
      </header>

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => onFile(e.target.files?.[0])}
      />

      <div className="flex-1 px-[22px] py-3">
        {step === "capture" && (
          <div className="space-y-4">
            <h1 className="pt-3 text-[27px] font-extrabold tracking-[-.8px] text-[#102642]">Let’s add a piece.</h1>
            <p className="-mt-3 text-xs text-[#76879c]">A clear photo helps ፍሬ (Firie) understand it.</p>
            <button onClick={startCamera} className="flex h-[294px] w-full flex-col items-center justify-center rounded-[22px] border border-[#e3e9f0] bg-[#e7edf4] text-center transition-transform active:scale-[.99]">
              <span className="grid h-16 w-16 place-items-center rounded-full bg-[#d8e2ed] text-3xl text-[#526f94]">⌖</span>
              <span className="mt-4 text-sm font-semibold text-[#304a69]">Take a photo of your item</span>
              <span className="mt-1 max-w-[15rem] text-xs text-[#7c8da2]">Lay it flat or hold it up. We’ll remove the background and add details.</span>
            </button>
            <Button fullWidth onClick={startCamera}>Open camera</Button>
            <Button variant="secondary" fullWidth onClick={() => fileRef.current?.click()}>Choose from photos</Button>
            <div className="flex flex-wrap justify-center gap-2 pt-2">
              {["Background removed", "Auto-tagged", "Compressed before upload"].map((t) => (
                <span key={t} className="rounded-full bg-navy-50 px-3 py-1 text-[10px] font-semibold text-navy-500">
                  {t}
                </span>
              ))}
            </div>
          </div>
        )}

        {step === "camera" && (
          <div className="space-y-4">
            <div className="relative overflow-hidden rounded-3xl bg-black">
              <video ref={videoRef} playsInline muted className="aspect-square w-full object-cover" />
              <div className="pointer-events-none absolute inset-6 rounded-2xl border-2 border-white/60" />
            </div>
            <div className="flex gap-2">
              <Button variant="secondary" className="flex-1" onClick={() => { stopCamera(); setStep("capture"); }}>
                Cancel
              </Button>
              <Button className="flex-1" onClick={onCapture}>
                Capture
              </Button>
            </div>
          </div>
        )}

        {step === "processing" && (
          <div className="flex flex-col items-center justify-center gap-4 py-16">
            <div className="h-40 w-40 overflow-hidden rounded-3xl bg-white shadow-sm">
              {rawImage ? (
                <img src={cleanImage || rawImage} alt="Processing" className="h-full w-full object-contain" />
              ) : (
                <div className="flex h-full w-full items-center justify-center">
                  <Spinner className="text-navy-400" />
                </div>
              )}
            </div>
            <p className="flex items-center gap-2 text-sm font-semibold text-navy-700">
              <Spinner className="text-navy-500" /> {stage || "Working…"}
            </p>
          </div>
        )}

        {step === "review" && (
          <div className="space-y-4">
            <h1 className="pt-1 text-[27px] font-extrabold tracking-[-.8px] text-[#102642]">Let’s add a piece.</h1>
            <p className="-mt-3 text-xs text-[#76879c]">A clear photo helps ፍሬ (Firie) understand it.</p>
            <figure className="relative flex h-[294px] items-center justify-center overflow-hidden rounded-[22px] bg-[#e7edf4]">
              <img src={cleanImage || rawImage} alt="Background removed item" className="h-full w-full object-contain p-5" />
              <figcaption className="absolute bottom-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full border border-[#e7ebf0] bg-white px-3 py-2 text-[10px] font-semibold text-[#52627a]">✦ &nbsp;Background removed</figcaption>
              <button onClick={reset} className="absolute right-3 top-3 rounded-full bg-white px-3 py-2 text-[10px] text-[#475f7d]">↻ &nbsp;Retake</button>
            </figure>

            <div className="flex items-center gap-2 rounded-xl bg-navy-50 px-3 py-2">
              <span className="text-sm">🤖</span>
              <p className="text-[11px] text-navy-600">
                Tags generated{" "}
                <span className="font-semibold">
                  {source === "vision" ? "by vision AI" : source === "llm" ? "by AI" : "on-device"}
                </span>{" "}
                — edit anything below.
              </p>
            </div>

            <ItemFields values={values} onChange={(patch) => setValues((v) => ({ ...v, ...patch }))} />

            <p className="text-[11px] text-navy-400">
              Category is set to{" "}
              <span className="font-semibold text-navy-600">
                {values.category === "traditional" ? "Traditional" : values.category}
              </span>{" "}
              — change it above if needed.
            </p>

            <div className="flex gap-2 pb-4">
              <Button variant="secondary" className="flex-1" onClick={reset}>
                Retake
              </Button>
              <Button className="flex-1" onClick={save} disabled={saving}>
                {saving ? <Spinner /> : "Save to closet"}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
