import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import API, { buildApiUrl, clearSession } from "../services/api";

function getStatusTone(status) {
    if (status === "Completed" || status === "Paid") return "border border-emerald-400/15 bg-emerald-400/10 text-emerald-200";
    if (status === "Confirmed") return "border border-indigo-300/15 bg-indigo-300/10 text-indigo-100";
    if (status === "Cancelled") return "border border-rose-400/15 bg-rose-400/10 text-rose-200";
    return "border border-amber-300/15 bg-amber-300/10 text-amber-200";
}

function portalSectionButtonClasses(isActive) {
    return `rounded-2xl border px-4 py-4 text-left transition ${
        isActive ? "border-cyan-400/40 bg-cyan-400/10 text-white" : "border-slate-800 bg-[#111827] text-slate-300 hover:border-slate-700 hover:bg-[#162033]"
    }`;
}

function PatientDashboard() {
    const [dashboard, setDashboard] = useState(null);
    const [doctors, setDoctors] = useState([]);
    const [availableSlots, setAvailableSlots] = useState([]);
    const [slotsMeta, setSlotsMeta] = useState({ booked_slots: [] });
    const [editingAppointmentId, setEditingAppointmentId] = useState(null);
    const [error, setError] = useState("");
    const [message, setMessage] = useState("");
    const [credentialInfo, setCredentialInfo] = useState(null);
    const [profileForm, setProfileForm] = useState({ age: "", history: "" });
    const [bookingForm, setBookingForm] = useState({ doctor: "", date: "", time_slot: "", reason: "", pre_checkin_notes: "" });
    const [familyForm, setFamilyForm] = useState({ attendant_name: "", mobile_number: "", relation: "other" });
    const [isBooking, setIsBooking] = useState(false);
    const [isLoadingSlots, setIsLoadingSlots] = useState(false);
    const [activePortalSection, setActivePortalSection] = useState("appointments");
    const navigate = useNavigate();
    const today = new Date().toISOString().slice(0, 10);

    const handleLogout = () => {
        clearSession();
        navigate("/", { replace: true });
    };

    const resetBookingForm = () => {
        setBookingForm({ doctor: "", date: "", time_slot: "", reason: "", pre_checkin_notes: "" });
        setEditingAppointmentId(null);
        setAvailableSlots([]);
        setSlotsMeta({ booked_slots: [] });
    };

    const loadDashboard = async () => {
        try {
            const [dashboardRes, doctorsRes] = await Promise.all([API.get("patient-dashboard/"), API.get("doctors/")]);
            setDashboard(dashboardRes.data);
            setDoctors(doctorsRes.data);
            setProfileForm({
                age: String(dashboardRes.data.patient.age || ""),
                history: dashboardRes.data.patient.history || "",
            });
        } catch (err) {
            setError(err.response?.data?.error || "Could not load patient dashboard.");
        }
    };

    const handleGrantFamilyAccess = async (event) => {
        event.preventDefault();
        setMessage("");
        setError("");
        setCredentialInfo(null);
        try {
            const response = await API.post("family-access/", familyForm);
            setMessage(response.data.message || "Family access granted.");
            if (response.data.generated_password) {
                setCredentialInfo({
                    name: response.data.attendant_name || familyForm.attendant_name,
                    mobile_number: response.data.mobile_number || familyForm.mobile_number,
                    generated_password: response.data.generated_password,
                });
            }
            setFamilyForm({ attendant_name: "", mobile_number: "", relation: "other" });
            loadDashboard();
        } catch (err) {
            setError(err.response?.data?.error || "Could not grant family access.");
        }
    };

    const loadAvailableSlots = async (doctorId, dateValue, preferredTime = "") => {
        if (!doctorId || !dateValue) {
            setAvailableSlots([]);
            setSlotsMeta({ booked_slots: [] });
            return;
        }

        setIsLoadingSlots(true);
        try {
            const response = await API.get(`doctors/${doctorId}/available-slots/`, { params: { date: dateValue } });
            const available = response.data.available_slots || [];
            setAvailableSlots(preferredTime && !available.includes(preferredTime) ? [preferredTime, ...available] : available);
            setSlotsMeta(response.data);
        } catch (err) {
            setAvailableSlots([]);
            setSlotsMeta({ booked_slots: [] });
            setError(err.response?.data?.error || "Could not load available slots.");
        } finally {
            setIsLoadingSlots(false);
        }
    };

    useEffect(() => {
        const role = localStorage.getItem("role");
        const userId = localStorage.getItem("userId");
        if (role !== "patient" || !userId) {
            navigate("/", { replace: true });
            return;
        }
        loadDashboard();
    }, [navigate]);

    useEffect(() => {
        if (!bookingForm.doctor || !bookingForm.date) {
            setAvailableSlots([]);
            setSlotsMeta({ booked_slots: [] });
            return;
        }
        loadAvailableSlots(bookingForm.doctor, bookingForm.date, bookingForm.time_slot);
    }, [bookingForm.date, bookingForm.doctor, bookingForm.time_slot]);

    const handleProfileUpdate = async (event) => {
        event.preventDefault();
        if (!dashboard) return;
        setMessage("");
        setError("");
        try {
            const response = await API.put(`patients/${dashboard.patient.id}/`, profileForm);
            setMessage(response.data.message || "Profile updated.");
            loadDashboard();
        } catch (err) {
            setError(err.response?.data?.error || "Could not update profile.");
        }
    };

    const handleBookAppointment = async (event) => {
        event.preventDefault();
        setMessage("");
        setError("");
        setIsBooking(true);
        try {
            const response = editingAppointmentId
                ? await API.put(`appointments/${editingAppointmentId}/`, bookingForm)
                : await API.post("appointments/", bookingForm);
            setMessage(response.data.message || "Appointment saved.");
            resetBookingForm();
            loadDashboard();
        } catch (err) {
            setError(err.response?.data?.error || "Could not save appointment.");
        } finally {
            setIsBooking(false);
        }
    };

    const startReschedule = (appointment) => {
        setMessage("");
        setError("");
        setEditingAppointmentId(appointment.id);
        setBookingForm({
            doctor: String(appointment.doctor),
            date: appointment.date,
            time_slot: appointment.time_slot || "",
            reason: appointment.reason || "",
            pre_checkin_notes: appointment.pre_checkin_notes || "",
        });
        loadAvailableSlots(String(appointment.doctor), appointment.date, appointment.time_slot || "");
    };

    const startRepeatVisit = (appointment) => {
        setMessage("");
        setError("");
        setEditingAppointmentId(null);
        setBookingForm({
            doctor: String(appointment.doctor),
            date: "",
            time_slot: "",
            reason: appointment.reason || "",
            pre_checkin_notes: appointment.pre_checkin_notes || "",
        });
        setAvailableSlots([]);
        setSlotsMeta({ booked_slots: [] });
        window.scrollTo({ top: 0, behavior: "smooth" });
    };

    const handleCancelAppointment = async (appointmentId) => {
        if (!window.confirm("Cancel this appointment?")) return;
        setMessage("");
        setError("");
        try {
            const response = await API.delete(`appointments/${appointmentId}/`);
            setMessage(response.data.message || "Appointment cancelled.");
            if (editingAppointmentId === appointmentId) resetBookingForm();
            loadDashboard();
        } catch (err) {
            setError(err.response?.data?.error || "Could not cancel appointment.");
        }
    };

    const openInvoice = (billId) => {
        const userId = localStorage.getItem("userId");
        window.open(buildApiUrl(`billing/${billId}/invoice/?user_id=${userId}`), "_blank", "noopener,noreferrer");
    };

    if (!dashboard) return <div className="min-h-screen bg-[#0b1120] px-4 py-10">{error && <p className="mx-auto max-w-6xl rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">{error}</p>}</div>;

    const totalBillingAmount = dashboard.billing.reduce((sum, bill) => sum + Number(bill.amount || 0), 0);
    const upcomingAppointment = [...dashboard.appointments]
        .filter((appointment) => appointment.date >= today)
        .sort((left, right) => `${left.date} ${left.time_slot || "00:00"}`.localeCompare(`${right.date} ${right.time_slot || "00:00"}`))[0];
    const prescriptions = dashboard.prescriptions || [];
    const medicalRecords = dashboard.medical_records || [];
    const familyLinks = dashboard.family_links || [];
    const cards = [
        { label: "Age", value: dashboard.patient.age },
        { label: "Appointments", value: dashboard.appointments.length },
        { label: "Bills", value: dashboard.billing.length },
        { label: "Doctors", value: doctors.length },
        { label: "Records", value: medicalRecords.length },
    ];
    const portalSections = [
        { key: "appointments", title: "Appointments", detail: "Visits and self-booking." },
        { key: "family", title: "Family Access", detail: "Share with guardian." },
        { key: "profile", title: "Profile", detail: "Update and review your details." },
        { key: "billing", title: "Billing", detail: "Bills and invoice access." },
        { key: "prescriptions", title: "Prescriptions", detail: "Doctor instructions." },
        { key: "records", title: "Records", detail: "Medical files and reports." },
    ];

    return (
        <div className="min-h-screen bg-[#0b1120] px-4 py-10">
            <div className="mx-auto max-w-6xl">
                <section className="overflow-hidden rounded-[34px] border border-slate-800 bg-[#111827] shadow-[0_36px_80px_-45px_rgba(15,23,42,0.55)]">
                    <div className="grid gap-8 px-7 py-7 lg:grid-cols-[1.12fr_0.88fr] lg:px-8">
                        <div>
                            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                                <div>
                                    <p className="text-xs font-semibold uppercase tracking-[0.34em] text-slate-300">Patient Portal</p>
                                    <h1 className="mt-3 text-4xl font-black text-white">Personal Care Dashboard</h1>
                                </div>
                                <button onClick={handleLogout} className="rounded-2xl border border-white/15 bg-white/5 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/10">
                                    Logout
                                </button>
                            </div>
                            <div className="mt-7 rounded-[30px] border border-slate-700 bg-[#0f172a] p-6 text-white">
                                <p className="text-xs uppercase tracking-[0.3em] text-slate-300">Profile</p>
                                <h2 className="mt-4 text-3xl font-black">{dashboard.patient.user_name}</h2>
                                <p className="mt-2 text-sm text-slate-400">{dashboard.patient.user_mobile || dashboard.patient.user_email}</p>
                                {!!dashboard.patient.history && (
                                    <p className="mt-5 rounded-2xl border border-slate-700 bg-slate-800/60 px-4 py-3 text-sm leading-6 text-slate-300">
                                        {dashboard.patient.history}
                                    </p>
                                )}
                            </div>
                        </div>

                        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
                            <div className="rounded-3xl border border-slate-800 bg-[#0f172a] p-5 text-white">
                                <p className="text-xs uppercase tracking-[0.26em] text-slate-400">Upcoming Appointment</p>
                                <p className="mt-3 text-lg font-bold text-white">
                                    {upcomingAppointment ? `${upcomingAppointment.doctor_name} on ${upcomingAppointment.date} at ${upcomingAppointment.time_slot || "No slot"}` : "No appointment booked yet"}
                                </p>
                            </div>
                            <div className="rounded-3xl border border-slate-800 bg-[#0f172a] p-5 text-white">
                                <p className="text-xs uppercase tracking-[0.26em] text-slate-400">Billing Total</p>
                                <p className="mt-3 text-3xl font-bold">Rs. {totalBillingAmount}</p>
                            </div>
                        </div>
                    </div>
                </section>

                {error && <p className="mt-6 rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">{error}</p>}
                {message && <p className="mt-6 rounded-2xl border border-emerald-400/15 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-200">{message}</p>}

                <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
                    {cards.map((card) => (
                        <div key={card.label} className="rounded-[30px] border border-slate-800 bg-[#111827] p-5 shadow-[0_24px_50px_-36px_rgba(15,23,42,0.55)]">
                            <p className="text-sm font-medium text-slate-400">{card.label}</p>
                            <p className="mt-3 text-3xl font-black text-white">{card.value}</p>
                        </div>
                    ))}
                </section>

                <section className="mt-6 rounded-[24px] border border-slate-800 bg-[#0f172a] p-5 shadow-[0_24px_50px_-36px_rgba(15,23,42,0.55)]">
                    <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
                        {portalSections.map((section) => (
                            <button
                                key={section.key}
                                type="button"
                                onClick={() => setActivePortalSection(section.key)}
                                className={portalSectionButtonClasses(activePortalSection === section.key)}
                            >
                                <p className="text-base font-semibold">{section.title}</p>
                                <p className="mt-1 text-sm text-slate-400">{section.detail}</p>
                            </button>
                        ))}
                    </div>
                </section>

                {activePortalSection === "appointments" && (
                <section className="mt-6 grid gap-6 lg:grid-cols-[1fr_1fr]">
                    <div className="rounded-[30px] border border-slate-800 bg-[#111827] p-6 shadow-[0_24px_50px_-36px_rgba(15,23,42,0.55)]">
                        <div className="flex items-center justify-between gap-4">
                            <div>
                                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">Appointments</p>
                                <h3 className="mt-2 text-2xl font-bold text-white">My visits</h3>
                            </div>
                            <span className="rounded-full border border-indigo-300/15 bg-indigo-300/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-indigo-100">
                                {dashboard.appointments.length} visits
                            </span>
                        </div>

                        <div className="mt-6 space-y-3">
                            {dashboard.appointments.map((appointment) => {
                                const canManage = appointment.date >= today && appointment.status !== "Completed";
                                return (
                                    <div key={appointment.id} className="rounded-3xl border border-slate-800 bg-[#0f172a] p-4 transition hover:border-slate-700 hover:bg-[#162033]">
                                        <div className="flex items-start justify-between gap-3">
                                            <div>
                                                <p className="text-base font-semibold text-white">{appointment.doctor_name}</p>
                                                <p className="mt-1 text-sm text-slate-400">{appointment.doctor_specialization}</p>
                                                <p className="mt-3 text-sm text-slate-500">{appointment.date} | {appointment.time_slot || "No slot"}</p>
                                                <p className="mt-2 text-xs uppercase tracking-[0.22em] text-slate-500">
                                                    {appointment.visit_stage || appointment.queue_status?.replaceAll("_", " ")}
                                                    {appointment.queue_position ? ` | Queue #${appointment.queue_position}` : ""}
                                                    {appointment.estimated_wait_minutes !== null && appointment.estimated_wait_minutes !== undefined ? ` | ETA ${appointment.estimated_wait_minutes} min` : ""}
                                                </p>
                                            </div>
                                            <span className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] ${getStatusTone(appointment.status)}`}>{appointment.status}</span>
                                        </div>
                                        {canManage && (
                                            <div className="mt-4 flex flex-wrap gap-3">
                                                <button type="button" onClick={() => startReschedule(appointment)} className="rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-sm font-semibold text-slate-200 transition hover:border-slate-500">
                                                    Reschedule
                                                </button>
                                                <button type="button" onClick={() => handleCancelAppointment(appointment.id)} className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm font-semibold text-rose-200 transition hover:border-rose-500/60">
                                                    Cancel
                                                </button>
                                            </div>
                                        )}
                                        {appointment.can_repeat_booking && (
                                            <div className="mt-4 flex flex-wrap gap-3">
                                                <button type="button" onClick={() => startRepeatVisit(appointment)} className="rounded-xl border border-cyan-400/30 bg-cyan-400/10 px-3 py-2 text-sm font-semibold text-cyan-100 transition hover:border-cyan-400/60">
                                                    Book Follow-up
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                            {!dashboard.appointments.length && <div className="rounded-3xl border border-dashed border-slate-700 bg-[#0f172a] px-4 py-8 text-sm text-slate-400">No appointments yet.</div>}
                        </div>
                    </div>
                    <form onSubmit={handleBookAppointment} className="rounded-[30px] border border-slate-800 bg-[#111827] p-6 shadow-[0_24px_50px_-36px_rgba(15,23,42,0.55)]">
                        <div className="flex items-center justify-between gap-4">
                            <div>
                                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">Self Booking</p>
                                <h3 className="mt-2 text-2xl font-bold text-white">{editingAppointmentId ? "Reschedule appointment" : "Book appointment"}</h3>
                            </div>
                            <span className="rounded-full border border-cyan-300/15 bg-cyan-300/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-cyan-100">Home access</span>
                        </div>
                        <div className="mt-6 grid gap-4">
                            <select className="w-full rounded-xl border border-white/10 bg-[#0f172a] px-4 py-3 text-white outline-none transition focus:border-slate-500" value={bookingForm.doctor} onChange={(e) => setBookingForm((current) => ({ ...current, doctor: e.target.value, time_slot: "" }))} required>
                                <option value="">Select doctor</option>
                                {doctors.map((doctor) => <option key={doctor.id} value={doctor.id}>{doctor.user_name} ({doctor.specialization})</option>)}
                            </select>
                            <input className="w-full rounded-xl border border-white/10 bg-[#0f172a] px-4 py-3 text-white outline-none transition focus:border-slate-500" type="date" min={today} value={bookingForm.date} onChange={(e) => setBookingForm((current) => ({ ...current, date: e.target.value, time_slot: "" }))} required />
                            <input className="w-full rounded-xl border border-white/10 bg-[#0f172a] px-4 py-3 text-white outline-none transition placeholder:text-slate-500 focus:border-slate-500" placeholder="Reason for visit" value={bookingForm.reason} onChange={(e) => setBookingForm((current) => ({ ...current, reason: e.target.value }))} />
                            <textarea className="min-h-24 w-full rounded-xl border border-white/10 bg-[#0f172a] px-4 py-3 text-white outline-none transition placeholder:text-slate-500 focus:border-slate-500" placeholder="Pre-check-in notes, symptoms, reports summary" value={bookingForm.pre_checkin_notes} onChange={(e) => setBookingForm((current) => ({ ...current, pre_checkin_notes: e.target.value }))} />
                            <div className="rounded-3xl border border-slate-800 bg-[#0f172a] p-4">
                                <div className="flex items-center justify-between gap-3">
                                    <div>
                                        <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Available slots</p>
                                        <p className="mt-2 text-sm text-slate-400">Choose doctor and date to see free time slots.</p>
                                    </div>
                                    {isLoadingSlots && <span className="text-xs uppercase tracking-[0.22em] text-slate-500">Loading</span>}
                                </div>
                                <div className="mt-4 flex flex-wrap gap-3">
                                    {availableSlots.map((slot) => (
                                        <button key={slot} type="button" onClick={() => setBookingForm((current) => ({ ...current, time_slot: slot }))} className={`rounded-xl border px-3 py-2 text-sm font-semibold transition ${bookingForm.time_slot === slot ? "border-cyan-300 bg-cyan-300/10 text-cyan-100" : "border-slate-700 bg-slate-800 text-slate-200 hover:border-slate-500"}`}>
                                            {slot}
                                        </button>
                                    ))}
                                    {!availableSlots.length && <p className="text-sm text-slate-500">No free slots to show yet.</p>}
                                </div>
                                {!!slotsMeta.booked_slots?.length && <p className="mt-4 text-xs uppercase tracking-[0.18em] text-slate-500">Booked: {slotsMeta.booked_slots.join(", ")}</p>}
                            </div>
                        </div>
                        <div className="mt-6 flex items-center justify-between gap-4">
                            <p className="text-sm text-slate-400">{editingAppointmentId ? "Rescheduling resets queue back to waiting." : "Booking stays under your own patient profile."}</p>
                            <div className="flex items-center gap-3">
                                {editingAppointmentId && <button type="button" onClick={resetBookingForm} className="rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-sm font-semibold text-slate-200 transition hover:border-slate-500">Cancel edit</button>}
                                <button type="submit" disabled={isBooking || !bookingForm.time_slot} className="rounded-xl bg-slate-100 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-white disabled:cursor-not-allowed disabled:bg-slate-500 disabled:text-slate-200">
                                    {isBooking ? "Saving..." : editingAppointmentId ? "Update Appointment" : "Book Now"}
                                </button>
                            </div>
                        </div>
                    </form>
                </section>
                )}

                {activePortalSection === "family" && (
                <section className="mt-6 grid gap-6 lg:grid-cols-[1fr_1fr]">
                    <form onSubmit={handleGrantFamilyAccess} className="rounded-[30px] border border-slate-800 bg-[#111827] p-6 shadow-[0_24px_50px_-36px_rgba(15,23,42,0.55)]">
                        <div className="flex items-center justify-between gap-4">
                            <div>
                                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">Family Access</p>
                                <h3 className="mt-2 text-2xl font-bold text-white">Share with guardian</h3>
                            </div>
                            <span className="rounded-full border border-cyan-300/15 bg-cyan-300/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-cyan-100">Post signup</span>
                        </div>
                        <div className="mt-6 grid gap-4">
                            <input className="w-full rounded-xl border border-white/10 bg-[#0f172a] px-4 py-3 text-white outline-none transition placeholder:text-slate-500 focus:border-slate-500" placeholder="Family member name" value={familyForm.attendant_name} onChange={(e) => setFamilyForm((current) => ({ ...current, attendant_name: e.target.value }))} />
                            <input className="w-full rounded-xl border border-white/10 bg-[#0f172a] px-4 py-3 text-white outline-none transition placeholder:text-slate-500 focus:border-slate-500" placeholder="Family mobile number" value={familyForm.mobile_number} onChange={(e) => setFamilyForm((current) => ({ ...current, mobile_number: e.target.value }))} required />
                            <select className="w-full rounded-xl border border-white/10 bg-[#0f172a] px-4 py-3 text-white outline-none transition focus:border-slate-500" value={familyForm.relation} onChange={(e) => setFamilyForm((current) => ({ ...current, relation: e.target.value }))}>
                                <option value="other">Other</option>
                                <option value="father">Father</option>
                                <option value="mother">Mother</option>
                                <option value="son">Son</option>
                                <option value="daughter">Daughter</option>
                                <option value="brother">Brother</option>
                                <option value="sister">Sister</option>
                            </select>
                        </div>
                        {credentialInfo?.generated_password && (
                            <div className="mt-4 rounded-2xl border border-cyan-300/20 bg-cyan-300/10 px-4 py-4 text-sm text-cyan-100">
                                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-100/80">New Family Login</p>
                                <p className="mt-3">Name: {credentialInfo.name}</p>
                                <p className="mt-1">Mobile: {credentialInfo.mobile_number}</p>
                                <p className="mt-1 font-semibold">Temporary Password: {credentialInfo.generated_password}</p>
                            </div>
                        )}
                        <div className="mt-6 flex items-center justify-between gap-4">
                            <p className="text-sm text-slate-400">Patient registration ke baad bhi family/guardian access add kar sakte ho.</p>
                            <button type="submit" className="rounded-xl bg-slate-100 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-white">Grant Access</button>
                        </div>
                    </form>
                    <div className="rounded-[30px] border border-slate-800 bg-[#111827] p-6 shadow-[0_24px_50px_-36px_rgba(15,23,42,0.55)]">
                        <div className="flex items-center justify-between gap-4">
                            <div>
                                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">Shared Access</p>
                                <h3 className="mt-2 text-2xl font-bold text-white">Linked family members</h3>
                            </div>
                            <span className="rounded-full border border-slate-700 bg-slate-800 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-slate-200">{familyLinks.length} linked</span>
                        </div>
                        <div className="mt-6 space-y-3">
                            {familyLinks.map((link) => (
                                <div key={link.id} className="rounded-3xl border border-slate-800 bg-[#0f172a] p-4">
                                    <p className="text-base font-semibold text-white">{link.attendant_name}</p>
                                    <p className="mt-1 text-sm text-slate-400">{link.attendant_mobile || "No mobile"}</p>
                                    <p className="mt-2 text-sm text-slate-500">Relation: {link.relation || "Family access"}</p>
                                </div>
                            ))}
                            {!familyLinks.length && <div className="rounded-3xl border border-dashed border-slate-700 bg-[#0f172a] px-4 py-8 text-sm text-slate-400">No family access linked yet.</div>}
                        </div>
                    </div>
                </section>
                )}

                {activePortalSection === "profile" && (
                <section className="mt-6 grid gap-6 lg:grid-cols-[1fr_1fr]">
                    <form onSubmit={handleProfileUpdate} className="rounded-[30px] border border-slate-800 bg-[#111827] p-6 shadow-[0_24px_50px_-36px_rgba(15,23,42,0.55)]">
                        <div className="flex items-center justify-between gap-4">
                            <div>
                                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">Profile</p>
                                <h3 className="mt-2 text-2xl font-bold text-white">Update profile</h3>
                            </div>
                            <span className="rounded-full border border-slate-700 bg-slate-800 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-slate-200">Self service</span>
                        </div>
                        <div className="mt-6 grid gap-4">
                            <input className="w-full rounded-xl border border-white/10 bg-[#0f172a] px-4 py-3 text-white outline-none transition placeholder:text-slate-500 focus:border-slate-500" type="number" min="0" placeholder="Age" value={profileForm.age} onChange={(e) => setProfileForm((current) => ({ ...current, age: e.target.value }))} required />
                            <textarea className="min-h-32 w-full rounded-xl border border-white/10 bg-[#0f172a] px-4 py-3 text-white outline-none transition placeholder:text-slate-500 focus:border-slate-500" placeholder="Medical history" value={profileForm.history} onChange={(e) => setProfileForm((current) => ({ ...current, history: e.target.value }))} required />
                        </div>
                        <div className="mt-6 flex items-center justify-between gap-4">
                            <p className="text-sm text-slate-400">Basic profile updates only.</p>
                            <button type="submit" className="rounded-xl bg-slate-100 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-white">Save Changes</button>
                        </div>
                    </form>
                    <div className="rounded-[30px] border border-slate-800 bg-[#111827] p-6 shadow-[0_24px_50px_-36px_rgba(15,23,42,0.55)]">
                        <div className="flex items-center justify-between gap-4">
                            <div>
                                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">Account Access</p>
                                <h3 className="mt-2 text-2xl font-bold text-white">My details</h3>
                            </div>
                            <span className="rounded-full border border-slate-700 bg-slate-800 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-slate-200">Private</span>
                        </div>
                        <div className="mt-6 space-y-3">
                            <div className="rounded-3xl border border-slate-800 bg-[#0f172a] p-4"><p className="text-xs uppercase tracking-[0.22em] text-slate-500">Full name</p><p className="mt-2 text-base font-semibold text-white">{dashboard.patient.user_name}</p></div>
                            <div className="rounded-3xl border border-slate-800 bg-[#0f172a] p-4"><p className="text-xs uppercase tracking-[0.22em] text-slate-500">Mobile number</p><p className="mt-2 text-base font-semibold text-white">{dashboard.patient.user_mobile || "Not available"}</p></div>
                            <div className="rounded-3xl border border-slate-800 bg-[#0f172a] p-4"><p className="text-xs uppercase tracking-[0.22em] text-slate-500">Email</p><p className="mt-2 text-base font-semibold text-white">{dashboard.patient.user_email || "Not available"}</p></div>
                            {!!dashboard.patient.history && <div className="rounded-3xl border border-slate-800 bg-[#0f172a] p-4"><p className="text-xs uppercase tracking-[0.22em] text-slate-500">Medical history</p><p className="mt-2 text-sm leading-6 text-slate-300">{dashboard.patient.history}</p></div>}
                        </div>
                    </div>
                </section>
                )}

                {activePortalSection === "billing" && (
                <section className="mt-6 rounded-[30px] border border-slate-800 bg-[#111827] p-6 shadow-[0_24px_50px_-36px_rgba(15,23,42,0.55)]">
                    <div className="flex items-center justify-between gap-4">
                        <div>
                            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">Billing</p>
                            <h3 className="mt-2 text-2xl font-bold text-white">Billing history</h3>
                        </div>
                        <span className="rounded-full border border-emerald-400/15 bg-emerald-400/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-emerald-200">Rs. {totalBillingAmount}</span>
                    </div>
                    <div className="mt-6 space-y-3">
                        {dashboard.billing.map((bill) => (
                            <div key={bill.id} className="rounded-3xl border border-slate-800 bg-[#0f172a] p-4 transition hover:border-slate-700 hover:bg-[#162033]">
                                <div className="flex items-start justify-between gap-3">
                                    <div>
                                        <p className="text-base font-semibold text-white">Rs. {bill.amount}</p>
                                        <p className="mt-1 text-sm text-slate-400">{bill.invoice_number || "No invoice number"}</p>
                                        <p className="mt-1 text-sm text-slate-500">{bill.notes || "No notes"}</p>
                                    </div>
                                    <span className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] ${getStatusTone(bill.status)}`}>{bill.status}</span>
                                </div>
                                <button type="button" onClick={() => openInvoice(bill.id)} className="mt-4 rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-sm font-semibold text-slate-200 transition hover:border-slate-500">Open Invoice</button>
                            </div>
                        ))}
                        {!dashboard.billing.length && <div className="rounded-3xl border border-dashed border-slate-700 bg-[#0f172a] px-4 py-8 text-sm text-slate-400">No bills yet.</div>}
                    </div>
                </section>
                )}

                {activePortalSection === "prescriptions" && (
                <section className="mt-6 rounded-[30px] border border-slate-800 bg-[#111827] p-6 shadow-[0_24px_50px_-36px_rgba(15,23,42,0.55)]">
                    <div className="flex items-center justify-between gap-4">
                        <div>
                            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">Prescriptions</p>
                            <h3 className="mt-2 text-2xl font-bold text-white">My prescriptions</h3>
                        </div>
                        <span className="rounded-full border border-slate-700 bg-slate-800 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-slate-200">{prescriptions.length} items</span>
                    </div>
                    <div className="mt-6 space-y-3">
                        {prescriptions.map((item) => (
                            <div key={item.id} className="rounded-3xl border border-slate-800 bg-[#0f172a] p-4">
                                <p className="text-base font-semibold text-white">{item.doctor_name}</p>
                                <p className="mt-1 text-sm text-slate-400">{item.diagnosis}</p>
                                <p className="mt-2 text-sm text-slate-500">{item.medicines}</p>
                                <p className="mt-2 text-sm text-slate-500">{item.notes || "No notes"}</p>
                                <p className="mt-2 text-sm text-slate-400">Follow-up: {item.follow_up_date || "Not set"}</p>
                            </div>
                        ))}
                        {!prescriptions.length && <div className="rounded-3xl border border-dashed border-slate-700 bg-[#0f172a] px-4 py-8 text-sm text-slate-400">No prescriptions yet.</div>}
                    </div>
                </section>
                )}

                {activePortalSection === "records" && (
                <section className="mt-6 rounded-[30px] border border-slate-800 bg-[#111827] p-6 shadow-[0_24px_50px_-36px_rgba(15,23,42,0.55)]">
                    <div className="flex items-center justify-between gap-4">
                        <div>
                            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">Records</p>
                            <h3 className="mt-2 text-2xl font-bold text-white">Medical records</h3>
                        </div>
                        <span className="rounded-full border border-slate-700 bg-slate-800 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-slate-200">{medicalRecords.length} files</span>
                    </div>
                    <div className="mt-6 space-y-3">
                        {medicalRecords.map((item) => (
                            <div key={item.id} className="rounded-3xl border border-slate-800 bg-[#0f172a] p-4">
                                <p className="text-base font-semibold text-white">{item.title}</p>
                                <p className="mt-1 text-sm text-slate-400">{item.uploaded_by_name || "Hospital staff"}</p>
                                <a href={item.record_file} target="_blank" rel="noreferrer" className="mt-2 inline-block text-sm text-slate-300 underline">Open file</a>
                            </div>
                        ))}
                        {!medicalRecords.length && <div className="rounded-3xl border border-dashed border-slate-700 bg-[#0f172a] px-4 py-8 text-sm text-slate-400">No records yet.</div>}
                    </div>
                </section>
                )}
            </div>
        </div>
    );
}

export default PatientDashboard;
