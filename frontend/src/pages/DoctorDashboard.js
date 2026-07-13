import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import LiveDateTimeCard from "../components/LiveDateTimeCard";
import Sidebar from "../components/Sidebar";
import API, { clearSession } from "../services/api";

function DoctorDashboard() {
    const [dashboard, setDashboard] = useState(null);
    const [error, setError] = useState("");
    const [message, setMessage] = useState("");
    const [prescriptionForm, setPrescriptionForm] = useState({
        patient: "",
        appointment: "",
        diagnosis: "",
        medicines: "",
        notes: "",
        follow_up_date: "",
    });
    const navigate = useNavigate();

    const handleLogout = () => {
        clearSession();
        navigate("/", { replace: true });
    };

    const loadDashboard = async () => {
        try {
            const dashboardRes = await API.get("doctor-dashboard/");
            setDashboard(dashboardRes.data);
        } catch (err) {
            setError(err.response?.data?.error || "Could not load doctor dashboard.");
        }
    };

    useEffect(() => {
        const role = localStorage.getItem("role");
        const userId = localStorage.getItem("userId");

        if (role !== "doctor" || !userId) {
            navigate("/", { replace: true });
            return;
        }

        loadDashboard();
    }, [navigate]);

    const handleCreatePrescription = async (event) => {
        event.preventDefault();
        setMessage("");
        setError("");

        try {
            const response = await API.post("prescriptions/", prescriptionForm);
            setMessage(response.data.message || "Prescription saved.");
            setPrescriptionForm({
                patient: "",
                appointment: "",
                diagnosis: "",
                medicines: "",
                notes: "",
                follow_up_date: "",
            });
            loadDashboard();
        } catch (err) {
            setError(err.response?.data?.error || "Could not save prescription.");
        }
    };

    const handleVisitUpdate = async (appointment, updates) => {
        setMessage("");
        setError("");

        try {
            const response = await API.put(`appointments/${appointment.id}/`, {
                status: updates.status || appointment.status,
                queue_status: updates.queue_status || appointment.queue_status,
            });
            setMessage(response.data.message || "Appointment updated.");
            loadDashboard();
        } catch (err) {
            setError(err.response?.data?.error || "Could not update visit.");
        }
    };

    if (!dashboard) {
        return (
            <div className="dashboard-light min-h-screen bg-[#f6fbff]">
                <Sidebar />
                <main className="min-h-screen p-5 md:ml-64 md:p-8">
                    <div className="mx-auto max-w-[1600px]">
                        <LiveDateTimeCard stageLabel="Doctor Dashboard - Live Date and Time" />
                        {error && <p className="mt-6 rounded-2xl bg-rose-500/15 px-4 py-3 text-sm text-rose-200">{error}</p>}
                    </div>
                </main>
            </div>
        );
    }

    const appointments = dashboard.appointments;
    const prescriptions = dashboard.prescriptions || [];
    const activeAppointments = appointments.filter((appointment) => appointment.status !== "Completed" && appointment.queue_status !== "completed");
    const assignedPatients = dashboard.patients.filter((patient) => activeAppointments.some((appointment) => appointment.patient === patient.id));
    const completedAppointments = appointments.filter((appointment) => appointment.status === "Completed").length;
    const pendingAppointments = appointments.filter((appointment) => appointment.queue_status === "waiting" && appointment.status !== "Completed" && !appointment.is_no_show).length;
    const doctorEmail = dashboard.doctor.user_email || dashboard.doctor.user_mobile || "No contact available";
    const nextAppointment = activeAppointments.length > 0 ? activeAppointments[0] : null;

    const metricCards = [
        { label: "Pending Appointment", value: pendingAppointments, accent: "from-amber-400/20 via-amber-300/8 to-transparent", badge: "border-amber-300/20 bg-amber-300/10 text-amber-200" },
        { label: "Today's Visits", value: completedAppointments, accent: "from-emerald-400/20 via-emerald-300/8 to-transparent", badge: "border-emerald-400/20 bg-emerald-400/10 text-emerald-200" },
    ];

    return (
        <div className="dashboard-light min-h-screen bg-[#f6fbff]">
            <Sidebar />
            <main className="min-h-screen p-5 md:ml-64 md:p-8">
                <div className="mx-auto max-w-[1400px]">
                    <LiveDateTimeCard stageLabel="Doctor Dashboard - Live Date and Time" />

                {error && <p className="mt-6 rounded-2xl bg-rose-500/15 px-4 py-3 text-sm text-rose-200">{error}</p>}
                {message && <p className="mt-6 rounded-2xl border border-emerald-400/15 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-200">{message}</p>}

                <section className="mt-6 space-y-5">
                    <div className="overflow-hidden rounded-[28px] border border-slate-800 bg-[#111827] shadow-[0_24px_50px_-36px_rgba(15,23,42,0.55)]">
                        <div className="grid gap-6 px-6 py-6 lg:grid-cols-[1.15fr_0.85fr]">
                            <div className="relative rounded-[24px] border border-slate-700 bg-[#0f172a] p-6 text-white">
                                <p className="text-xs uppercase tracking-[0.3em] text-slate-300">Doctor</p>
                                <h2 className="mt-4 text-3xl font-black">{dashboard.doctor.user_name}</h2>
                                <p className="mt-2 text-base text-slate-200">{dashboard.doctor.specialization}</p>
                                <p className="mt-1 text-sm text-slate-400">{doctorEmail}</p>
                            </div>

                            {nextAppointment && (
                                <div className="flex items-center">
                                    <div className="rounded-3xl border border-white/10 bg-white/5 p-5 text-white">
                                        <p className="text-xs uppercase tracking-[0.26em] text-slate-400">Next Visit</p>
                                        <p className="mt-3 text-lg font-bold">
                                            {nextAppointment.patient_name} on {nextAppointment.date}
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="grid gap-5 sm:grid-cols-3">
                        {metricCards.map((card) => (
                            <div key={card.label} className="overflow-hidden rounded-[28px] border border-slate-800 bg-[#111827] shadow-[0_24px_50px_-36px_rgba(15,23,42,0.55)]">
                                <div className={`border-b border-slate-800 bg-gradient-to-br ${card.accent} px-5 py-5`}>
                                    <div className="flex items-center justify-between gap-3">
                                        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">{card.label}</p>
                                        <span className={`rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] ${card.badge}`}>
                                            {card.value}
                                        </span>
                                    </div>
                                </div>
                                <div className="px-5 py-5">
                                    <p className="text-4xl font-black text-white">{card.value}</p>
                                </div>
                            </div>
                        ))}
                    </div>


                </section>
                </div>
            </main>
        </div>
    );
}

export default DoctorDashboard;

