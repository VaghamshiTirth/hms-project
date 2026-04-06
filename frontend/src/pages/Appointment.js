import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import LiveDateTimeCard from "../components/LiveDateTimeCard";
import Sidebar from "../components/Sidebar";
import API from "../services/api";

function getStatusTone(status) {
    if (status === "Completed") return "border border-emerald-400/15 bg-emerald-400/10 text-emerald-200";
    if (status === "Confirmed") return "border border-cyan-400/15 bg-cyan-400/10 text-cyan-200";
    return "border border-amber-300/15 bg-amber-300/10 text-amber-200";
}

function panelButtonClasses(isActive) {
    return `rounded-2xl border px-4 py-4 text-left transition ${
        isActive ? "border-slate-600 bg-[#182131] text-white" : "border-slate-800 bg-[#111827] text-slate-300 hover:border-slate-700 hover:bg-[#162033]"
    }`;
}

function Appointment() {
    const [activePanel, setActivePanel] = useState("book");
    const [patients, setPatients] = useState([]);
    const [doctors, setDoctors] = useState([]);
    const [appointments, setAppointments] = useState([]);
    const [availableSlots, setAvailableSlots] = useState([]);
    const [slotsMeta, setSlotsMeta] = useState({ booked_slots: [] });
    const [editingAppointmentId, setEditingAppointmentId] = useState(null);
    const [filters, setFilters] = useState({
        patient_user_id: "",
        doctor_user_id: "",
        status: "",
        queue_status: "",
        date: "",
    });
    const [form, setForm] = useState({
        patient: "",
        doctor: "",
        date: "",
        time_slot: "",
        status: "Pending",
        queue_status: "waiting",
        reason: "",
        pre_checkin_notes: "",
        is_no_show: false,
    });
    const [message, setMessage] = useState("");
    const [error, setError] = useState("");
    const [isLoadingSlots, setIsLoadingSlots] = useState(false);
    const navigate = useNavigate();

    const loadData = useCallback(async () => {
        try {
            const params = Object.fromEntries(Object.entries(filters).filter(([, value]) => value));
            const [patientsRes, doctorsRes, appointmentsRes] = await Promise.all([
                API.get("patients/"),
                API.get("doctors/"),
                API.get("appointments/", { params }),
            ]);
            setPatients(patientsRes.data);
            setDoctors(doctorsRes.data);
            setAppointments(appointmentsRes.data);
        } catch (err) {
            setError(err.response?.data?.error || "Could not load appointment data.");
        }
    }, [filters]);

    useEffect(() => {
        const role = localStorage.getItem("role");
        if (role !== "frontdesk") {
            navigate("/", { replace: true });
            return;
        }

        loadData();
    }, [loadData, navigate]);

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
        if (!form.doctor || !form.date) {
            setAvailableSlots([]);
            setSlotsMeta({ booked_slots: [] });
            return;
        }

        loadAvailableSlots(form.doctor, form.date, form.time_slot);
    }, [form.date, form.doctor, form.time_slot]);

    const resetForm = () => {
        setEditingAppointmentId(null);
        setForm({
            patient: "",
            doctor: "",
            date: "",
            time_slot: "",
            status: "Pending",
            queue_status: "waiting",
            reason: "",
            pre_checkin_notes: "",
            is_no_show: false,
        });
        setAvailableSlots([]);
        setSlotsMeta({ booked_slots: [] });
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        setMessage("");
        setError("");

        try {
            if (editingAppointmentId) {
                const res = await API.put(`appointments/${editingAppointmentId}/`, form);
                setMessage(res.data.message || "Appointment updated.");
            } else {
                const res = await API.post("appointments/", form);
                setMessage(res.data.message || "Appointment booked.");
            }

            resetForm();
            setActivePanel("manage");
            loadData();
        } catch (err) {
            setError(err.response?.data?.error || (editingAppointmentId ? "Could not update appointment." : "Could not book appointment."));
        }
    };

    const handleEdit = (appointment) => {
        setEditingAppointmentId(appointment.id);
        setForm({
            patient: String(appointment.patient),
            doctor: String(appointment.doctor),
            date: appointment.date,
            time_slot: appointment.time_slot || "",
            status: appointment.status,
            queue_status: appointment.queue_status || "waiting",
            reason: appointment.reason || "",
            pre_checkin_notes: appointment.pre_checkin_notes || "",
            is_no_show: appointment.is_no_show || false,
        });
        setActivePanel("book");
        setMessage("");
        setError("");
        loadAvailableSlots(String(appointment.doctor), appointment.date, appointment.time_slot || "");
    };

    const handleDelete = async (appointmentId) => {
        if (!window.confirm("Delete this appointment?")) return;

        setMessage("");
        setError("");

        try {
            const res = await API.delete(`appointments/${appointmentId}/`);
            setMessage(res.data.message || "Appointment deleted.");
            if (editingAppointmentId === appointmentId) resetForm();
            loadData();
        } catch (err) {
            setError(err.response?.data?.error || "Could not delete appointment.");
        }
    };

    const handleQuickQueueUpdate = async (appointment, queueStatus, statusOverride, isNoShow = false) => {
        setMessage("");
        setError("");

        try {
            const res = await API.put(`appointments/${appointment.id}/`, {
                status: statusOverride || appointment.status,
                queue_status: queueStatus,
                is_no_show: isNoShow,
            });
            setMessage(res.data.message || "Queue updated.");
            loadData();
        } catch (err) {
            setError(err.response?.data?.error || "Could not update queue.");
        }
    };

    const patientOptions = useMemo(
        () => patients.map((patient) => ({ value: String(patient.id), label: `${patient.user_name} (${patient.user_mobile || patient.user_email})`, userId: String(patient.user) })),
        [patients]
    );
    const doctorOptions = useMemo(
        () => doctors.map((doctor) => ({ value: String(doctor.id), label: `${doctor.user_name} (${doctor.specialization})`, userId: String(doctor.user) })),
        [doctors]
    );
    return (
        <div className="min-h-screen bg-[#0b1120]">
            <Sidebar />

            <main className="p-5 md:ml-64 md:p-8">
                <div className="mx-auto max-w-7xl">
                    <LiveDateTimeCard stageLabel="Stage 2 - Scheduling" />

                    <section className="mt-6 grid gap-6 xl:grid-cols-[0.78fr_1.22fr]">
                        <div className="space-y-6">
                            <div className="rounded-[24px] border border-slate-800 bg-[#111827] p-5 shadow-[0_24px_50px_-36px_rgba(15,23,42,0.55)]">
                                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">Modes</p>
                                <div className="mt-5 space-y-3">
                                    <button type="button" onClick={() => setActivePanel("book")} className={panelButtonClasses(activePanel === "book")}>
                                        <p className="text-base font-semibold">Book Slot</p>
                                        <p className="mt-1 text-sm text-slate-400">Create or edit one appointment at a time.</p>
                                    </button>
                                    <button type="button" onClick={() => setActivePanel("queue")} className={panelButtonClasses(activePanel === "queue")}>
                                        <p className="text-base font-semibold">Queue Desk</p>
                                        <p className="mt-1 text-sm text-slate-400">Check in and move patients through the queue.</p>
                                    </button>
                                    <button type="button" onClick={() => setActivePanel("manage")} className={panelButtonClasses(activePanel === "manage")}>
                                        <p className="text-base font-semibold">Manage Schedule</p>
                                        <p className="mt-1 text-sm text-slate-400">Filter, edit, and remove bookings.</p>
                                    </button>
                                </div>
                            </div>

                            <div className="rounded-[24px] border border-slate-800 bg-[#111827] p-5 shadow-[0_24px_50px_-36px_rgba(15,23,42,0.55)]">
                                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">Live Queue</p>
                                <div className="mt-5 space-y-3">
                                    {appointments.slice(0, 5).map((appointment) => (
                                        <div key={appointment.id} className="rounded-2xl border border-slate-800 bg-[#0f172a] p-4">
                                            <div className="flex items-center justify-between gap-3">
                                                <div>
                                                    <p className="font-semibold text-white">{appointment.patient_name}</p>
                                                    <p className="text-sm text-slate-400">
                                                        {appointment.date} | {appointment.time_slot || "No slot"}
                                                        {appointment.queue_position ? ` | Queue #${appointment.queue_position}` : ""}
                                                    </p>
                                                    <p className="mt-1 text-xs uppercase tracking-[0.2em] text-slate-500">
                                                        {appointment.visit_stage || appointment.queue_status?.replaceAll("_", " ")}
                                                        {appointment.estimated_wait_minutes !== null && appointment.estimated_wait_minutes !== undefined ? ` | ETA ${appointment.estimated_wait_minutes} min` : ""}
                                                    </p>
                                                </div>
                                                <span className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] ${getStatusTone(appointment.status)}`}>
                                                    {appointment.status}
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="space-y-6">
                            {activePanel === "book" && (
                                <form onSubmit={handleSubmit} className="rounded-[24px] border border-slate-800 bg-[#111827] p-6 shadow-[0_24px_50px_-36px_rgba(15,23,42,0.55)]">
                                    <div className="flex items-center justify-between gap-4">
                                        <div>
                                            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">Booking Form</p>
                                            <h2 className="mt-2 text-2xl font-bold text-white">{editingAppointmentId ? "Edit appointment" : "Create appointment"}</h2>
                                        </div>
                                        {editingAppointmentId && <button type="button" onClick={resetForm} className="rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:border-slate-500">Cancel edit</button>}
                                    </div>

                                    <div className="mt-6 grid gap-4">
                                        <select className="w-full rounded-xl border border-white/10 bg-[#091a2b] px-4 py-3 text-white outline-none transition focus:border-slate-500 focus:bg-[#0d2235]" value={form.patient} onChange={(e) => setForm((current) => ({ ...current, patient: e.target.value }))} required>
                                            <option value="">Select patient</option>
                                            {patientOptions.map((patient) => <option key={patient.value} value={patient.value}>{patient.label}</option>)}
                                        </select>
                                        <select className="w-full rounded-xl border border-white/10 bg-[#091a2b] px-4 py-3 text-white outline-none transition focus:border-slate-500 focus:bg-[#0d2235]" value={form.doctor} onChange={(e) => setForm((current) => ({ ...current, doctor: e.target.value }))} required>
                                            <option value="">Select doctor</option>
                                            {doctorOptions.map((doctor) => <option key={doctor.value} value={doctor.value}>{doctor.label}</option>)}
                                        </select>
                                        <input className="w-full rounded-xl border border-white/10 bg-[#091a2b] px-4 py-3 text-white outline-none transition focus:border-slate-500 focus:bg-[#0d2235]" type="date" value={form.date} onChange={(e) => setForm((current) => ({ ...current, date: e.target.value, time_slot: "" }))} required />
                                        <select className="w-full rounded-xl border border-white/10 bg-[#091a2b] px-4 py-3 text-white outline-none transition focus:border-slate-500 focus:bg-[#0d2235]" value={form.time_slot} onChange={(e) => setForm((current) => ({ ...current, time_slot: e.target.value }))} required>
                                            <option value="">{availableSlots.length ? "Select available slot" : "Choose doctor and date first"}</option>
                                            {availableSlots.map((slot) => <option key={slot} value={slot}>{slot}</option>)}
                                        </select>
                                        <div className="rounded-2xl border border-slate-800 bg-[#0f172a] p-4">
                                            <div className="flex items-center justify-between gap-3">
                                                <div>
                                                    <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Doctor slots</p>
                                                    <p className="mt-2 text-sm text-slate-400">Tap a slot instead of typing time manually.</p>
                                                </div>
                                                {isLoadingSlots && <span className="text-xs uppercase tracking-[0.22em] text-slate-500">Loading</span>}
                                            </div>
                                            <div className="mt-4 flex flex-wrap gap-3">
                                                {availableSlots.map((slot) => (
                                                    <button
                                                        key={slot}
                                                        type="button"
                                                        onClick={() => setForm((current) => ({ ...current, time_slot: slot }))}
                                                        className={`rounded-xl border px-3 py-2 text-sm font-semibold transition ${form.time_slot === slot ? "border-cyan-300 bg-cyan-300/10 text-cyan-100" : "border-slate-700 bg-slate-800 text-slate-200 hover:border-slate-500"}`}
                                                    >
                                                        {slot}
                                                    </button>
                                                ))}
                                                {!availableSlots.length && <p className="text-sm text-slate-500">No free slots to show yet.</p>}
                                            </div>
                                            {!!slotsMeta.booked_slots?.length && <p className="mt-4 text-xs uppercase tracking-[0.18em] text-slate-500">Booked: {slotsMeta.booked_slots.join(", ")}</p>}
                                        </div>
                                        <div className="grid gap-4 md:grid-cols-2">
                                            <select className="w-full rounded-xl border border-white/10 bg-[#091a2b] px-4 py-3 text-white outline-none transition focus:border-slate-500 focus:bg-[#0d2235]" value={form.status} onChange={(e) => setForm((current) => ({ ...current, status: e.target.value }))}>
                                                <option value="Pending">Pending</option>
                                                <option value="Confirmed">Confirmed</option>
                                                <option value="Completed">Completed</option>
                                            </select>
                                            <select className="w-full rounded-xl border border-white/10 bg-[#091a2b] px-4 py-3 text-white outline-none transition focus:border-slate-500 focus:bg-[#0d2235]" value={form.queue_status} onChange={(e) => setForm((current) => ({ ...current, queue_status: e.target.value }))}>
                                                <option value="waiting">Waiting</option>
                                                <option value="checked_in">Checked In</option>
                                                <option value="in_consultation">In Consultation</option>
                                                <option value="completed">Completed</option>
                                            </select>
                                        </div>
                                        <input className="w-full rounded-xl border border-white/10 bg-[#091a2b] px-4 py-3 text-white outline-none transition placeholder:text-slate-500 focus:border-slate-500 focus:bg-[#0d2235]" placeholder="Visit reason" value={form.reason} onChange={(e) => setForm((current) => ({ ...current, reason: e.target.value }))} />
                                        <textarea className="min-h-24 w-full rounded-xl border border-white/10 bg-[#091a2b] px-4 py-3 text-white outline-none transition placeholder:text-slate-500 focus:border-slate-500 focus:bg-[#0d2235]" placeholder="Pre-check-in notes" value={form.pre_checkin_notes} onChange={(e) => setForm((current) => ({ ...current, pre_checkin_notes: e.target.value }))} />
                                    </div>

                                    {message && <p className="mt-4 rounded-xl border border-emerald-400/15 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-200">{message}</p>}
                                    {error && <p className="mt-4 rounded-xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">{error}</p>}

                                    <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
                                        <p className="text-sm text-slate-400">Booking sends an alert to the patient mobile.</p>
                                        <button type="submit" className="rounded-xl bg-slate-100 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-white">{editingAppointmentId ? "Update Appointment" : "Book Appointment"}</button>
                                    </div>
                                </form>
                            )}

                            {activePanel === "queue" && (
                                <div className="rounded-[24px] border border-slate-800 bg-[#111827] p-6 shadow-[0_24px_50px_-36px_rgba(15,23,42,0.55)]">
                                    <div>
                                        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">Queue Desk</p>
                                        <h2 className="mt-2 text-2xl font-bold text-white">Move patients by stage</h2>
                                    </div>

                                    <div className="mt-6 space-y-3">
                                        {appointments.map((appointment) => (
                                            <div key={appointment.id} className="rounded-2xl border border-slate-800 bg-[#0f172a] p-4">
                                                <div className="flex items-start justify-between gap-3">
                                                    <div>
                                                        <p className="text-base font-semibold text-white">{appointment.patient_name}</p>
                                                        <p className="mt-1 text-sm text-slate-400">{appointment.doctor_name} | {appointment.date} | {appointment.time_slot || "No slot"}</p>
                                                        <p className="mt-2 text-xs uppercase tracking-[0.22em] text-slate-500">
                                                            {appointment.visit_stage || appointment.queue_status?.replaceAll("_", " ")}
                                                            {appointment.queue_position ? ` | Queue #${appointment.queue_position}` : ""}
                                                            {appointment.estimated_wait_minutes !== null && appointment.estimated_wait_minutes !== undefined ? ` | ETA ${appointment.estimated_wait_minutes} min` : ""}
                                                        </p>
                                                    </div>
                                                    <span className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] ${getStatusTone(appointment.status)}`}>{appointment.status}</span>
                                                </div>
                                                <div className="mt-4 flex flex-wrap gap-3">
                                                    <button type="button" onClick={() => handleQuickQueueUpdate(appointment, "checked_in", "Confirmed", false)} className="rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-sm font-semibold text-slate-200 transition hover:border-slate-500">Check In</button>
                                                    <button type="button" onClick={() => handleQuickQueueUpdate(appointment, "in_consultation", "Confirmed", false)} className="rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-sm font-semibold text-slate-200 transition hover:border-slate-500">Send to Doctor</button>
                                                    <button type="button" onClick={() => handleQuickQueueUpdate(appointment, "completed", "Completed", false)} className="rounded-xl border border-emerald-400/20 bg-emerald-400/10 px-3 py-2 text-sm font-semibold text-emerald-200 transition hover:border-emerald-400/40">Complete</button>
                                                    <button type="button" onClick={() => handleQuickQueueUpdate(appointment, "waiting", "Pending", true)} className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm font-semibold text-rose-200 transition hover:border-rose-500/60">Mark No-Show</button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {activePanel === "manage" && (
                                <div className="rounded-[24px] border border-slate-800 bg-[#111827] p-6 shadow-[0_24px_50px_-36px_rgba(15,23,42,0.55)]">
                                    <div className="flex items-center justify-between gap-4">
                                        <div>
                                            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">Manage Schedule</p>
                                            <h2 className="mt-2 text-2xl font-bold text-white">Filter and maintain bookings</h2>
                                        </div>
                                        <button type="button" onClick={() => setFilters({ patient_user_id: "", doctor_user_id: "", status: "", queue_status: "", date: "" })} className="rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:border-slate-500">
                                            Reset
                                        </button>
                                    </div>

                                    <div className="mt-6 grid gap-4">
                                        <select className="w-full rounded-xl border border-white/10 bg-[#091a2b] px-4 py-3 text-white outline-none transition focus:border-slate-500 focus:bg-[#0d2235]" value={filters.patient_user_id} onChange={(e) => setFilters((current) => ({ ...current, patient_user_id: e.target.value }))}>
                                            <option value="">All patients</option>
                                            {patientOptions.map((patient) => <option key={patient.value} value={patient.userId}>{patient.label}</option>)}
                                        </select>
                                        <select className="w-full rounded-xl border border-white/10 bg-[#091a2b] px-4 py-3 text-white outline-none transition focus:border-slate-500 focus:bg-[#0d2235]" value={filters.doctor_user_id} onChange={(e) => setFilters((current) => ({ ...current, doctor_user_id: e.target.value }))}>
                                            <option value="">All doctors</option>
                                            {doctorOptions.map((doctor) => <option key={doctor.value} value={doctor.userId}>{doctor.label}</option>)}
                                        </select>
                                        <div className="grid gap-4 md:grid-cols-3">
                                            <select className="w-full rounded-xl border border-white/10 bg-[#091a2b] px-4 py-3 text-white outline-none transition focus:border-slate-500 focus:bg-[#0d2235]" value={filters.status} onChange={(e) => setFilters((current) => ({ ...current, status: e.target.value }))}>
                                                <option value="">All status</option>
                                                <option value="Pending">Pending</option>
                                                <option value="Confirmed">Confirmed</option>
                                                <option value="Completed">Completed</option>
                                            </select>
                                            <select className="w-full rounded-xl border border-white/10 bg-[#091a2b] px-4 py-3 text-white outline-none transition focus:border-slate-500 focus:bg-[#0d2235]" value={filters.queue_status} onChange={(e) => setFilters((current) => ({ ...current, queue_status: e.target.value }))}>
                                                <option value="">All queue</option>
                                                <option value="waiting">Waiting</option>
                                                <option value="checked_in">Checked In</option>
                                                <option value="in_consultation">In Consultation</option>
                                                <option value="completed">Completed</option>
                                            </select>
                                            <input className="w-full rounded-xl border border-white/10 bg-[#091a2b] px-4 py-3 text-white outline-none transition focus:border-slate-500 focus:bg-[#0d2235]" type="date" value={filters.date} onChange={(e) => setFilters((current) => ({ ...current, date: e.target.value }))} />
                                        </div>
                                    </div>

                                    <div className="mt-6 space-y-3">
                                        {appointments.map((appointment) => (
                                            <div key={appointment.id} className="rounded-2xl border border-slate-800 bg-[#0f172a] p-4">
                                                <div className="flex items-start justify-between gap-3">
                                                    <div>
                                                        <p className="text-base font-semibold text-white">{appointment.patient_name}</p>
                                                        <p className="mt-1 text-sm text-slate-400">{appointment.doctor_name} | {appointment.date} | {appointment.time_slot || "No slot"}</p>
                                                    </div>
                                                    <span className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] ${getStatusTone(appointment.status)}`}>{appointment.status}</span>
                                                </div>
                                                <div className="mt-4 flex flex-wrap gap-3">
                                                    <button type="button" onClick={() => handleEdit(appointment)} className="rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-sm font-semibold text-slate-200 transition hover:border-slate-500">Edit</button>
                                                    <button type="button" onClick={() => handleDelete(appointment.id)} className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm font-semibold text-rose-200 transition hover:border-rose-500/60">Delete</button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </section>
                </div>
            </main>
        </div>
    );
}

export default Appointment;
