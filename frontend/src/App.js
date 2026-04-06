import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import FrontDeskDashboard from "./pages/FrontDeskDashboard";
import AdmissionDesk from "./pages/AdmissionDesk";
import AddPatient from "./pages/AddPatient";
import Appointment from "./pages/Appointment";
import Billing from "./pages/Billing";
import DoctorDashboard from "./pages/DoctorDashboard";
import PatientDashboard from "./pages/PatientDashboard";
import ForgotPassword from "./pages/ForgotPassword";
import ActivityLogs from "./pages/ActivityLogs";
import PatientSignup from "./pages/PatientSignup";
import AttendantDashboard from "./pages/AttendantDashboard";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/patient-signup" element={<PatientSignup />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/activity-logs" element={<ActivityLogs />} />
        <Route path="/frontdesk-dashboard" element={<FrontDeskDashboard />} />
        <Route path="/admission-desk" element={<AdmissionDesk />} />
        <Route path="/patients" element={<AddPatient />} />
        <Route path="/appointment" element={<Appointment />} />
        <Route path="/appointments" element={<Appointment />} />
        <Route path="/billing" element={<Billing />} />
        <Route path="/doctor-dashboard" element={<DoctorDashboard />} />
        <Route path="/patient-dashboard" element={<PatientDashboard />} />
        <Route path="/attendant-dashboard" element={<AttendantDashboard />} />
        <Route path="*" element={<Navigate replace to="/" />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
