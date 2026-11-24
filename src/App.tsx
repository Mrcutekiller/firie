import { Suspense, lazy, useEffect, useState } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { Capacitor } from "@capacitor/core";
import Layout from "./components/Layout";
import HomeScreen from "./screens/HomeScreen";
import ClosetScreen from "./screens/ClosetScreen";
import ProfileScreen from "./screens/ProfileScreen";
import SplashScreen from "./screens/SplashScreen";
import OnboardingScreen from "./screens/OnboardingScreen";
import ProGateScreen from "./components/ProGateScreen";
import { useApp } from "./lib/store";

const LandingPage = lazy(() => import("./screens/LandingPage"));
const AddItemScreen = lazy(() => import("./screens/AddItemScreen"));
const HistoryScreen = lazy(() => import("./screens/HistoryScreen"));
const UpgradeScreen = lazy(() => import("./screens/UpgradeScreen"));
const DateSpotsScreen = lazy(() => import("./screens/DateSpotsScreen"));
const PlaceDetailScreen = lazy(() => import("./screens/PlaceDetailScreen"));
const PhotoStyleCameraScreen = lazy(() => import("./screens/PhotoStyleCameraScreen"));
const InsightsScreen = lazy(() => import("./screens/InsightsScreen"));
const PackingScreen = lazy(() => import("./screens/PackingScreen"));

export default function App() {
  const isNative = Capacitor.isNativePlatform();
  const [showSplash, setShowSplash] = useState(true);
  const [hasOnboarded, setHasOnboarded] = useState(
    () => localStorage.getItem("fitly_onboarded") === "1"
  );
  const { setProfile, isPro, refreshFromCloudflare } = useApp();

  const handleFinishOnboarding = (
    name: string,
    city: string,
    email: string,
    gender: "men" | "women",
    extra?: {
      height?: string;
      bodyFit?: string;
      ageGroup?: string;
      preferredStyle?: string;
      traditionalWear?: string;
    }
  ) => {
    setProfile({
      name,
      city,
      email,
      gender,
      height: extra?.height,
      bodyFit: extra?.bodyFit,
      ageGroup: extra?.ageGroup,
      preferredStyle: extra?.preferredStyle,
      traditionalWear: extra?.traditionalWear,
    });
    localStorage.setItem("fitly_account_email", email);
    localStorage.setItem("fitly_onboarded", "1");
    setHasOnboarded(true);
    refreshFromCloudflare().catch(console.warn);
  };

  // Expose for testing welcome flow directly and handle logout state transitions
  useEffect(() => {
    const handleStorageChange = () => {
      const onboarded = localStorage.getItem("fitly_onboarded") === "1";
      setHasOnboarded(onboarded);
      if (!onboarded) {
        setShowSplash(false);
      }
    };
    window.addEventListener("storage", handleStorageChange);

    (window as unknown as { fitlyRestartOnboarding: () => void }).fitlyRestartOnboarding = () => {
      localStorage.removeItem("fitly_onboarded");
      setHasOnboarded(false);
      setShowSplash(true);
    };

    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  // On Native Android / iOS app, show opening splash with page 10 video, then onboarding flow
  if (isNative) {
    if (showSplash) {
      return <SplashScreen onDone={() => setShowSplash(false)} />;
    }

    if (!hasOnboarded) {
      return <OnboardingScreen onDone={handleFinishOnboarding} />;
    }
  }

  // On Web: Default route `/` is the official Landing Page so visitors download the app!
  // On Native App: Default route `/` is the HomeScreen inside the Layout shell!
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-white dark:bg-[#0c0a09]">
          <div className="h-8 w-8 animate-spin rounded-full border-3 border-[#FF7F02] border-t-transparent" />
        </div>
      }
    >
      <Routes>
      <Route path="/splash" element={<SplashScreen onDone={() => setShowSplash(false)} />} />
      <Route path="/welcome" element={<OnboardingScreen onDone={handleFinishOnboarding} />} />
      <Route path="/login" element={<OnboardingScreen onDone={handleFinishOnboarding} initialMode="login" />} />
      <Route path="/signup" element={<OnboardingScreen onDone={handleFinishOnboarding} initialMode="signup" />} />
      <Route path="/landing" element={<LandingPage />} />
      <Route path="/about" element={<LandingPage />} />
      {!isNative && <Route path="/" element={<LandingPage />} />}

      {/* App Routes (For Native App & Direct Links) */}
      <Route element={<Layout />}>
        {isNative && <Route path="/" element={<HomeScreen />} />}
        <Route path="/app" element={<HomeScreen />} />
        <Route path="/closet" element={<ClosetScreen />} />
        <Route path="/history" element={<HistoryScreen />} />
        <Route path="/upgrade" element={<UpgradeScreen />} />
        <Route path="/billing" element={<UpgradeScreen />} />
        <Route path="/profile" element={<ProfileScreen />} />
        <Route path="/insights" element={<InsightsScreen />} />
        <Route path="/datespots" element={isPro ? <DateSpotsScreen /> : <ProGateScreen />} />
        <Route path="/datespots/:id" element={isPro ? <PlaceDetailScreen /> : <ProGateScreen />} />
      </Route>
      {/* ── SECURITY: Explicit /admin block (Defense #1) ── */}
      <Route path="/admin" element={<Navigate to="/" replace />} />
      <Route path="/admin/*" element={<Navigate to="/" replace />} />

      <Route path="/welcome" element={<OnboardingScreen onDone={handleFinishOnboarding} />} />
      <Route path="/onboarding" element={<OnboardingScreen onDone={handleFinishOnboarding} />} />
      <Route path="/add" element={<AddItemScreen />} />
      <Route path="/camera" element={<PhotoStyleCameraScreen />} />
      <Route path="/photo-style" element={<PhotoStyleCameraScreen />} />
      <Route path="/packing" element={<PackingScreen />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
    </Suspense>
  );
}
