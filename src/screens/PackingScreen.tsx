import { useNavigate } from "react-router-dom";
import TripCapsuleModal from "../components/TripCapsuleModal";

export default function PackingScreen() {
  const navigate = useNavigate();
  return <TripCapsuleModal isOpen onClose={() => navigate(-1)} />;
}
