import { useEffect, useState } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
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
import HomeWidgetsScreen from "./screens/HomeWidgetsScreen";
import LandingPage from "./screens/LandingPage";
import { useApp } from "./lib/store";

export default function App() {
  const [showSplash, setShowSplash] = useState(
    () => localStorage.getItem("fitly_onboarded") !== "1"
  );
  const [hasOnboarded, setHasOnboarded] = useState(
    () => localStorage.getItem("fitly_onboarded") === "1"
  );
  const { setProfile } = useApp();

  const handleFinishOnboarding = (name: string, city: string, email: string, gender: "men" | "women") => {
    setProfile({ name, city, email, gender });
    localStorage.setItem("fitly_account_email", email);
    localStorage.setItem("fitly_onboarded", "1");
    setHasOnboarded(true);
  };

  // Expose for testing welcome flow directly
  useEffect(() => {
    (window as unknown as { fitlyRestartOnboarding: () => void }).fitlyRestartOnboarding = () => {
      localStorage.removeItem("fitly_onboarded");
      setHasOnboarded(false);
    };
  }, []);

  if (showSplash) {
    return <SplashScreen onDone={() => setShowSplash(false)} />;
  }

  if (!hasOnboarded) {
    return (
      <OnboardingScreen
        onDone={handleFinishOnboarding}
      />
    );
  }

  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<HomeScreen />} />
        <Route path="/closet" element={<ClosetScreen />} />
        <Route path="/history" element={<HistoryScreen />} />
        <Route path="/upgrade" element={<UpgradeScreen />} />
        <Route path="/billing" element={<UpgradeScreen />} />
        <Route path="/profile" element={<ProfileScreen />} />
        <Route path="/insights" element={<InsightsScreen />} />
        <Route path="/widgets" element={<HomeWidgetsScreen />} />
        <Route path="/datespots" element={<DateSpotsScreen />} />
        <Route path="/datespots/:id" element={<PlaceDetailScreen />} />
      </Route>
      <Route path="/welcome" element={<OnboardingScreen onDone={handleFinishOnboarding} />} />
      <Route path="/onboarding" element={<OnboardingScreen onDone={handleFinishOnboarding} />} />
      <Route path="/add" element={<AddItemScreen />} />
      <Route path="/camera" element={<PhotoStyleCameraScreen />} />
      <Route path="/photo-style" element={<PhotoStyleCameraScreen />} />
      <Route path="/packing" element={<PackingScreen />} />
      <Route path="/landing" element={<LandingPage />} />
      <Route path="/about" element={<LandingPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
