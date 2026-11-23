import { useEffect, useState } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { Capacitor } from "@capacitor/core";
import Layout from "./components/Layout";
import HomeScreen from "./screens/HomeScreen";
import ClosetScreen from "./screens/ClosetScreen";
import AddItemScreen from "./screens/AddItemScreen";
import HistoryScreen from "./screens/HistoryScreen";
import UpgradeScreen from "./screens/UpgradeScreen";
import ProfileScreen from "./screens/ProfileScreen";
import SplashScreen from "./screens/SplashScreen";
import OnboardingScreen from "./screens/OnboardingScreen";
import DateSpotsScreen from "./screens/DateSpotsScreen";
import PlaceDetailScreen from "./screens/PlaceDetailScreen";
import PhotoStyleCameraScreen from "./screens/PhotoStyleCameraScreen";
import InsightsScreen from "./screens/InsightsScreen";
import PackingScreen from "./screens/PackingScreen";
import LandingPage from "./screens/LandingPage";
import ProGateScreen from "./components/ProGateScreen";
import { useApp } from "./lib/store";

export default function App() {
  const isNative = Capacitor.isNativePlatform();
  const [showSplash, setShowSplash] = useState(true);
  const [hasOnboarded, setHasOnboarded] = useState(
    () => localStorage.getItem("fitly_onboarded") === "1"
  );
  const { setProfile, isPro } = useApp();

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
  );
}
