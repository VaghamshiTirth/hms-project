import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import LiveDateTimeCard from "../components/LiveDateTimeCard";
import Sidebar from "../components/Sidebar";
import API from "../services/api";

function getApiErrorMessage(err, fallback) {
    const data = err.response?.data;

    if (!data) {
        return fallback;
    }

    if (typeof data.error === "string") {
        return data.error;
    }

    const firstFieldError = Object.values(data).find((value) => Array.isArray(value) && value.length);
    if (firstFieldError) {
        return firstFieldError[0];
    }

    return fallback;
}

function stageButtonClasses(isActive) {
    return `rounded-2xl border px-4 py-4 text-left transition ${
        isActive ? "border-slate-600 bg-[#182131] text-white" : "border-slate-800 bg-[#111827] text-slate-300 hover:border-slate-700 hover:bg-[#162033]"
    }`;
}

function intakeSectionButtonClasses(isActive) {
    return `rounded-2xl border px-4 py-4 text-left transition ${
        isActive ? "border-cyan-400/40 bg-cyan-400/10 text-white" : "border-slate-800 bg-[#111827] text-slate-300 hover:border-slate-700 hover:bg-[#162033]"
    }`;
}

function familyAccessButtonClasses(isActive) {
    return `rounded-xl border px-3 py-2 text-sm font-semibold transition ${
        isActive ? "border-cyan-300 bg-cyan-300/10 text-cyan-100" : "border-slate-700 bg-slate-800 text-slate-200 hover:border-slate-500"
    }`;
}

function AddPatient() {
    const [intakeView, setIntakeView] = useState("workflow");
    const [activeStage, setActiveStage] = useState("user");
    const [patientUsers, setPatientUsers] = useState([]);
    const [patients, setPatients] = useState([]);
    const [attendantUsers, setAttendantUsers] = useState([]);
    const [familyLinks, setFamilyLinks] = useState([]);
    const [records, setRecords] = useState([]);
    const [userSearch, setUserSearch] = useState("");
    const [patientSearch, setPatientSearch] = useState("");
    const [editingPatientId, setEditingPatientId] = useState(null);
    const [userForm, setUserForm] = useState({ name: "", mobile_number: "" });
    const [attendantForm, setAttendantForm] = useState({ name: "", mobile_number: "" });
    const [familyForm, setFamilyForm] = useState({ attendant_user: "", patient: "", relation: "" });
    const [familyMemberForm, setFamilyMemberForm] = useState({ attendant_user: "", name: "", age: "", history: "", relation: "other" });
    const [form, setForm] = useState({ user: "", name: "", mobile_number: "", age: "", history: "" });
    const [recordForm, setRecordForm] = useState({ patient: "", title: "", record_file: null });
    const [message, setMessage] = useState("");
    const [userMessage, setUserMessage] = useState("");
    const [recordMessage, setRecordMessage] = useState("");
    const [familyMessage, setFamilyMessage] = useState("");
    const [error, setError] = useState("");
    const [userError, setUserError] = useState("");
    const [recordError, setRecordError] = useState("");
    const [familyError, setFamilyError] = useState("");
    const [credentialInfo, setCredentialInfo] = useState(null);
    const [quickFamilyAccess, setQuickFamilyAccess] = useState({
        isOpen: false,
        patient: null,
        mode: "existing",
        attendant_user: "",
        attendant_name: "",
        mobile_number: "",
        relation: "other",
    });
    const [quickPatientEdit, setQuickPatientEdit] = useState({
        isOpen: false,
        patient: null,
    });
    const [quickPasswordReset, setQuickPasswordReset] = useState({
        isOpen: false,
        patient: null,
        step: 1,
        identifier: "",
        otp: "",
        new_password: "",
        message: "",
        error: "",
        isLoading: false,
    });
    const navigate = useNavigate();

    const loadData = useCallback(async () => {
        try {
            const [usersRes, patientsRes, attendantUsersRes, familyLinksRes, recordsRes] = await Promise.all([
                API.get("patient-users/", { params: userSearch.trim() ? { q: userSearch.trim() } : {} }),
                API.get("patients/", { params: patientSearch.trim() ? { q: patientSearch.trim() } : {} }),
                API.get("attendant-users/"),
                API.get("family-access/"),
                API.get("medical-records/"),
            ]);
            setPatientUsers(usersRes.data);
            setPatients(patientsRes.data);
            setAttendantUsers(attendantUsersRes.data);
            setFamilyLinks(familyLinksRes.data);
            setRecords(recordsRes.data);
        } catch (err) {
            setError(getApiErrorMessage(err, "Could not load patient data."));
        }
    }, [patientSearch, userSearch]);

    useEffect(() => {
        const role = localStorage.getItem("role");
        if (role !== "frontdesk") {
            navigate("/", { replace: true });
            return;
        }

        loadData();
    }, [loadData, navigate]);

    const resetProfileForm = () => {
        setEditingPatientId(null);
        setForm({ user: "", name: "", mobile_number: "", age: "", history: "" });
    };

    const closeQuickPatientEdit = () => {
        setQuickPatientEdit({
            isOpen: false,
            patient: null,
        });
        resetProfileForm();
    };

    const closeQuickPasswordReset = () => {
        setQuickPasswordReset({
            isOpen: false,
            patient: null,
            step: 1,
            identifier: "",
            otp: "",
            new_password: "",
            message: "",
            error: "",
            isLoading: false,
        });
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        setMessage("");
        setError("");

        try {
            if (editingPatientId) {
                const res = await API.put(`patients/${editingPatientId}/`, {
                    name: form.name,
                    mobile_number: form.mobile_number,
                    age: form.age,
                    history: form.history,
                });
                setMessage(res.data.message || "Patient updated.");
            } else {
                const res = await API.post("add-patient/", form);
                setMessage(res.data.message || "Patient added.");
            }

            resetProfileForm();
            if (quickPatientEdit.isOpen) {
                setQuickPatientEdit({
                    isOpen: false,
                    patient: null,
                });
            }
            setActiveStage("profile");
            loadData();
        } catch (err) {
            setError(getApiErrorMessage(err, editingPatientId ? "Could not update patient." : "Could not add patient."));
        }
    };

    const handleCreatePatientUser = async (event) => {
        event.preventDefault();
        setUserMessage("");
        setUserError("");
        setCredentialInfo(null);

        try {
            const res = await API.post("register/", { ...userForm, role: "patient" });
            setUserMessage(res.data.message || "Patient user created.");
            setCredentialInfo({
                name: userForm.name,
                mobile_number: res.data.mobile_number || userForm.mobile_number,
                generated_password: res.data.generated_password,
            });
            setUserForm({ name: "", mobile_number: "" });
            setActiveStage("user");
            loadData();
        } catch (err) {
            setUserError(getApiErrorMessage(err, "Could not create patient user."));
        }
    };

    const handleCreateAttendantUser = async (event) => {
        event.preventDefault();
        setFamilyMessage("");
        setFamilyError("");
        setCredentialInfo(null);

        try {
            const res = await API.post("register/", { ...attendantForm, role: "attendant" });
            setFamilyMessage(res.data.message || "Attendant user created.");
            setCredentialInfo({
                name: attendantForm.name,
                mobile_number: res.data.mobile_number || attendantForm.mobile_number,
                generated_password: res.data.generated_password,
            });
            setAttendantForm({ name: "", mobile_number: "" });
            loadData();
        } catch (err) {
            setFamilyError(getApiErrorMessage(err, "Could not create attendant user."));
        }
    };

    const handleCreateFamilyAccess = async (event) => {
        event.preventDefault();
        setFamilyMessage("");
        setFamilyError("");

        try {
            const res = await API.post("family-access/", familyForm);
            setFamilyMessage(res.data.message || "Family access linked.");
            setFamilyForm({ attendant_user: "", patient: "", relation: "" });
            loadData();
        } catch (err) {
            setFamilyError(getApiErrorMessage(err, "Could not link family access."));
        }
    };

    const openQuickFamilyAccess = (patient) => {
        setFamilyMessage("");
        setFamilyError("");
        setCredentialInfo(null);
        setQuickFamilyAccess({
            isOpen: true,
            patient,
            mode: "existing",
            attendant_user: "",
            attendant_name: "",
            mobile_number: "",
            relation: "other",
        });
    };

    const closeQuickFamilyAccess = () => {
        setQuickFamilyAccess({
            isOpen: false,
            patient: null,
            mode: "existing",
            attendant_user: "",
            attendant_name: "",
            mobile_number: "",
            relation: "other",
        });
    };

    const handleQuickFamilyAccessSubmit = async (event) => {
        event.preventDefault();
        if (!quickFamilyAccess.patient) return;

        setFamilyMessage("");
        setFamilyError("");
        setCredentialInfo(null);

        try {
            let attendantUserId = quickFamilyAccess.attendant_user;

            if (quickFamilyAccess.mode === "new") {
                const registerRes = await API.post("register/", {
                    name: quickFamilyAccess.attendant_name,
                    mobile_number: quickFamilyAccess.mobile_number,
                    role: "attendant",
                });
                const refreshedAttendants = await API.get("attendant-users/");
                setAttendantUsers(refreshedAttendants.data);
                const createdAttendant = refreshedAttendants.data.find(
                    (item) => item.mobile_number === (registerRes.data.mobile_number || quickFamilyAccess.mobile_number)
                );
                attendantUserId = createdAttendant?.id ? String(createdAttendant.id) : "";
                setCredentialInfo({
                    name: quickFamilyAccess.attendant_name,
                    mobile_number: registerRes.data.mobile_number || quickFamilyAccess.mobile_number,
                    generated_password: registerRes.data.generated_password,
                });
                if (!attendantUserId) {
                    throw new Error("Could not identify created attendant account.");
                }
            }

            const linkRes = await API.post("family-access/", {
                attendant_user: attendantUserId,
                patient: quickFamilyAccess.patient.id,
                relation: quickFamilyAccess.relation,
            });
            setFamilyMessage(linkRes.data.message || "Family access linked.");
            setActiveStage("family");
            await loadData();
            closeQuickFamilyAccess();
        } catch (err) {
            setFamilyError(getApiErrorMessage(err, "Could not grant family access."));
        }
    };

    const handleCreateFamilyMember = async (event) => {
        event.preventDefault();
        setFamilyMessage("");
        setFamilyError("");

        try {
            const res = await API.post("attendant-family-members/", familyMemberForm);
            setFamilyMessage(res.data.message || "Family patient added.");
            setFamilyMemberForm({ attendant_user: "", name: "", age: "", history: "", relation: "other" });
            await loadData();
        } catch (err) {
            setFamilyError(getApiErrorMessage(err, "Could not create family patient."));
        }
    };

    const handleDeleteFamilyAccess = async (linkId) => {
        if (!window.confirm("Remove this family access link?")) return;

        setFamilyMessage("");
        setFamilyError("");
        try {
            const res = await API.delete(`family-access/${linkId}/`);
            setFamilyMessage(res.data.message || "Family access removed.");
            loadData();
        } catch (err) {
            setFamilyError(getApiErrorMessage(err, "Could not remove family access."));
        }
    };

    const handleEditPatient = (patient) => {
        setEditingPatientId(patient.id);
        setForm({
            user: String(patient.user),
            name: patient.user_name || "",
            mobile_number: patient.user_mobile || "",
            age: String(patient.age),
            history: patient.history,
        });
        setActiveStage("profile");
        setMessage("");
        setError("");
    };

    const openQuickPatientEdit = (patient) => {
        handleEditPatient(patient);
        setQuickPatientEdit({
            isOpen: true,
            patient,
        });
    };

    const openQuickPasswordReset = (patient) => {
        setQuickPasswordReset({
            isOpen: true,
            patient,
            step: 1,
            identifier: patient.user_mobile || patient.user_email || "",
            otp: "",
            new_password: "",
            message: "",
            error: "",
            isLoading: false,
        });
    };

    const handleQuickPasswordOtpRequest = async (event) => {
        event.preventDefault();
        setQuickPasswordReset((current) => ({ ...current, isLoading: true, message: "", error: "" }));

        try {
            const response = await API.post("forgot-password/", {
                identifier: quickPasswordReset.identifier,
            });
            setQuickPasswordReset((current) => ({
                ...current,
                isLoading: false,
                step: 2,
                message: response.data.otp_code
                    ? `${response.data.message || "OTP sent."} OTP: ${response.data.otp_code}`
                    : (response.data.message || "OTP sent."),
            }));
        } catch (err) {
            setQuickPasswordReset((current) => ({
                ...current,
                isLoading: false,
                error: getApiErrorMessage(err, "Could not send OTP."),
            }));
        }
    };

    const handleQuickPasswordReset = async (event) => {
        event.preventDefault();
        setQuickPasswordReset((current) => ({ ...current, isLoading: true, message: "", error: "" }));

        try {
            const response = await API.post("reset-password/", {
                identifier: quickPasswordReset.identifier,
                code: quickPasswordReset.otp,
                new_password: quickPasswordReset.new_password,
            });
            setQuickPasswordReset((current) => ({
                ...current,
                isLoading: false,
                message: response.data.message || "Password reset successful.",
                otp: "",
                new_password: "",
            }));
            await loadData();
        } catch (err) {
            setQuickPasswordReset((current) => ({
                ...current,
                isLoading: false,
                error: getApiErrorMessage(err, "Could not reset password."),
            }));
        }
    };

    const handleDeletePatient = async (patientId) => {
        if (!window.confirm("Delete this patient profile?")) {
            return;
        }

        setMessage("");
        setError("");

        try {
            const res = await API.delete(`patients/${patientId}/`);
            setMessage(res.data.message || "Patient deleted.");
            if (editingPatientId === patientId) {
                resetProfileForm();
                if (quickPatientEdit.patient?.id === patientId) {
                    setQuickPatientEdit({
                        isOpen: false,
                        patient: null,
                    });
                }
            }
            loadData();
        } catch (err) {
            setError(getApiErrorMessage(err, "Could not delete patient."));
        }
    };

    const handleUploadRecord = async (event) => {
        event.preventDefault();
        setRecordMessage("");
        setRecordError("");

        try {
            const payload = new FormData();
            payload.append("patient", recordForm.patient);
            payload.append("title", recordForm.title);
            if (recordForm.record_file) {
                payload.append("record_file", recordForm.record_file);
            }

            const res = await API.post("medical-records/", payload, {
                headers: { "Content-Type": "multipart/form-data" },
            });

            setRecordMessage(res.data.message || "Medical record uploaded.");
            setRecordForm({ patient: "", title: "", record_file: null });
            setActiveStage("records");
            loadData();
        } catch (err) {
            setRecordError(getApiErrorMessage(err, "Could not upload record."));
        }
    };

    const availableUsers = patientUsers.filter((user) => !user.has_profile);
    const patientOptions = useMemo(() => patients.map((patient) => ({ id: patient.id, label: `${patient.user_name} (${patient.user_mobile || patient.user_email})` })), [patients]);
    const profiledUserIds = useMemo(() => new Set(patients.map((patient) => String(patient.user))), [patients]);
    const profileEligibleUsers = useMemo(
        () => [
            ...availableUsers.map((user) => ({ ...user, source_role: "patient" })),
            ...attendantUsers.filter((user) => !profiledUserIds.has(String(user.id))).map((user) => ({ ...user, has_profile: false, source_role: "attendant" })),
        ],
        [attendantUsers, availableUsers, profiledUserIds]
    );
    const groupedFamilyLinks = useMemo(() => {
        const groups = new Map();
        familyLinks.forEach((link) => {
            const key = link.attendant_user;
            if (!groups.has(key)) {
                groups.set(key, {
                    attendant_user: link.attendant_user,
                    attendant_name: link.attendant_name,
                    attendant_mobile: link.attendant_mobile,
                    entries: [],
                });
            }
            groups.get(key).entries.push(link);
        });
        return Array.from(groups.values());
    }, [familyLinks]);
    const stages = [
        { key: "user", title: "Create Login", detail: "Register patient mobile first." },
        { key: "profile", title: "Complete Profile", detail: "Add clinical details after login." },
        { key: "records", title: "Upload Records", detail: "Attach scans or reports later." },
        { key: "family", title: "Family Access", detail: "Link guardian accounts to patients." },
    ];
    const intakeViews = [
        { key: "workflow", title: "Workflow Stages", detail: "Stage-wise patient intake actions." },
        { key: "directory", title: "Patient Directory", detail: "Search and manage patient profiles." },
        { key: "records", title: "Recent Records", detail: "Review uploaded files and attachments." },
    ];

    return (
        <div className="min-h-screen bg-[#0b1120]">
            <Sidebar />
            <main className="p-5 md:ml-64 md:p-8">
                <div className="mx-auto max-w-7xl">
                    <LiveDateTimeCard stageLabel="Stage 1 - Patient Intake" />

                    <section className="mt-6 rounded-[24px] border border-slate-800 bg-[#0f172a] p-5 shadow-[0_24px_50px_-36px_rgba(15,23,42,0.55)]">
                        <div className="grid gap-3 md:grid-cols-3">
                            {intakeViews.map((view) => (
                                <button key={view.key} type="button" onClick={() => setIntakeView(view.key)} className={intakeSectionButtonClasses(intakeView === view.key)}>
                                    <p className="text-base font-semibold">{view.title}</p>
                                    <p className="mt-1 text-sm text-slate-400">{view.detail}</p>
                                </button>
                            ))}
                        </div>
                    </section>

                    <section className={`${intakeView === "workflow" ? "mt-6 grid gap-6 xl:grid-cols-[0.8fr_1.2fr]" : "hidden"}`}>
                        <div className="space-y-6">
                            <div className={`${intakeView === "workflow" ? "" : "hidden "}rounded-[24px] border border-slate-800 bg-[#111827] p-5 shadow-[0_24px_50px_-36px_rgba(15,23,42,0.55)]`}>
                                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">Workflow Stages</p>
                                <div className="mt-5 space-y-3">
                                    {stages.map((stage, index) => (
                                        <button key={stage.key} type="button" onClick={() => setActiveStage(stage.key)} className={stageButtonClasses(activeStage === stage.key)}>
                                            <div className="flex items-start gap-4">
                                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-sm font-bold text-slate-950">
                                                    0{index + 1}
                                                </div>
                                                <div className="text-left">
                                                    <p className="text-base font-semibold">{stage.title}</p>
                                                    <p className="mt-1 text-sm text-slate-400">{stage.detail}</p>
                                                </div>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className={`${intakeView === "workflow" ? "" : "hidden "}space-y-6`}>
                            {activeStage === "user" && (
                                <form onSubmit={handleCreatePatientUser} className="rounded-[24px] border border-slate-800 bg-[#111827] p-6 shadow-[0_24px_50px_-36px_rgba(15,23,42,0.55)]">
                                    <div className="flex items-center justify-between gap-4">
                                        <div>
                                            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">Stage 1</p>
                                            <h2 className="mt-2 text-2xl font-bold text-white">Create patient login</h2>
                                        </div>
                                        <span className="rounded-full border border-slate-700 bg-slate-800 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-slate-200">
                                            Mobile Access
                                        </span>
                                    </div>

                                    <div className="mt-6 grid gap-4 md:grid-cols-2">
                                        <input
                                            className="w-full rounded-xl border border-white/10 bg-[#091a2b] px-4 py-3 text-white outline-none transition placeholder:text-slate-500 focus:border-slate-500 focus:bg-[#0d2235]"
                                            placeholder="Patient name"
                                            value={userForm.name}
                                            onChange={(e) => setUserForm((current) => ({ ...current, name: e.target.value }))}
                                            required
                                        />
                                        <input
                                            className="w-full rounded-xl border border-white/10 bg-[#091a2b] px-4 py-3 text-white outline-none transition placeholder:text-slate-500 focus:border-slate-500 focus:bg-[#0d2235]"
                                            type="tel"
                                            inputMode="numeric"
                                            placeholder="Mobile number"
                                            value={userForm.mobile_number}
                                            onChange={(e) => setUserForm((current) => ({ ...current, mobile_number: e.target.value }))}
                                            required
                                        />
                                    </div>

                                    {userMessage && <p className="mt-4 rounded-xl border border-emerald-400/15 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-200">{userMessage}</p>}
                                    {userError && <p className="mt-4 rounded-xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">{userError}</p>}
                                    {credentialInfo?.generated_password && (
                                        <div className="mt-4 rounded-2xl border border-cyan-300/20 bg-cyan-300/10 px-4 py-4 text-sm text-cyan-100">
                                            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-100/80">Patient Login Credentials</p>
                                            <p className="mt-3">Name: {credentialInfo.name}</p>
                                            <p className="mt-1">Mobile: {credentialInfo.mobile_number}</p>
                                            <p className="mt-1 font-semibold">Temporary Password: {credentialInfo.generated_password}</p>
                                        </div>
                                    )}

                                    <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
                                        <p className="text-sm text-slate-400">Password is auto-generated, shown here, and sent by message.</p>
                                        <button type="submit" className="rounded-xl bg-slate-100 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-white">
                                            Create Login
                                        </button>
                                    </div>
                                </form>
                            )}

                            {activeStage === "profile" && (
                                <form onSubmit={handleSubmit} className="rounded-[24px] border border-slate-800 bg-[#111827] p-6 shadow-[0_24px_50px_-36px_rgba(15,23,42,0.55)]">
                                    <div className="flex items-center justify-between gap-4">
                                        <div>
                                            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">Stage 2</p>
                                            <h2 className="mt-2 text-2xl font-bold text-white">{editingPatientId ? "Edit patient profile" : "Complete profile"}</h2>
                                        </div>
                                        {editingPatientId && (
                                            <button type="button" onClick={resetProfileForm} className="rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:border-slate-500">
                                                Cancel edit
                                            </button>
                                        )}
                                    </div>

                                    <div className="mt-6 grid gap-4">
                                        <select
                                            className="w-full rounded-xl border border-white/10 bg-[#091a2b] px-4 py-3 text-white outline-none transition focus:border-slate-500 focus:bg-[#0d2235]"
                                            value={form.user}
                                            onChange={(e) => setForm((current) => ({ ...current, user: e.target.value }))}
                                            required
                                            disabled={editingPatientId || !profileEligibleUsers.length}
                                        >
                                            <option value="">
                                                {editingPatientId ? "Current patient selected" : profileEligibleUsers.length ? "Select patient or attendant login" : "No pending patient login"}
                                            </option>
                                            {(editingPatientId ? patients.filter((patient) => patient.id === editingPatientId) : profileEligibleUsers).map((user) => (
                                                <option key={user.id} value={editingPatientId ? user.user : user.id}>
                                                    {editingPatientId ? `${user.user_name} (${user.user_mobile || user.user_email})` : `${user.name} (${user.mobile_number || user.email})${user.source_role === "attendant" ? " - attendant account" : ""}`}
                                                </option>
                                            ))}
                                        </select>

                                        <div className="grid gap-4 md:grid-cols-[180px_1fr]">
                                            <input
                                                className="w-full rounded-xl border border-white/10 bg-[#091a2b] px-4 py-3 text-white outline-none transition placeholder:text-slate-500 focus:border-slate-500 focus:bg-[#0d2235]"
                                                placeholder="Age"
                                                type="number"
                                                min="0"
                                                value={form.age}
                                                onChange={(e) => setForm((current) => ({ ...current, age: e.target.value }))}
                                                required
                                            />
                                            <textarea
                                                className="min-h-32 w-full rounded-xl border border-white/10 bg-[#091a2b] px-4 py-3 text-white outline-none transition placeholder:text-slate-500 focus:border-slate-500 focus:bg-[#0d2235]"
                                                placeholder="Medical history"
                                                value={form.history}
                                                onChange={(e) => setForm((current) => ({ ...current, history: e.target.value }))}
                                            />
                                        </div>
                                    </div>

                                    {message && <p className="mt-4 rounded-xl border border-emerald-400/15 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-200">{message}</p>}
                                    {error && <p className="mt-4 rounded-xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">{error}</p>}

                                    <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
                                        <p className="text-sm text-slate-400">Pending profile slots: {profileEligibleUsers.length}</p>
                                        <button
                                            type="submit"
                                            disabled={!editingPatientId && !profileEligibleUsers.length}
                                            className="rounded-xl bg-slate-100 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-white disabled:cursor-not-allowed disabled:bg-slate-500 disabled:text-slate-200"
                                        >
                                            {editingPatientId ? "Update Profile" : "Save Profile"}
                                        </button>
                                    </div>
                                </form>
                            )}

                            {activeStage === "records" && (
                                <form onSubmit={handleUploadRecord} className="rounded-[24px] border border-slate-800 bg-[#111827] p-6 shadow-[0_24px_50px_-36px_rgba(15,23,42,0.55)]">
                                    <div className="flex items-center justify-between gap-4">
                                        <div>
                                            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">Stage 3</p>
                                            <h2 className="mt-2 text-2xl font-bold text-white">Upload medical record</h2>
                                        </div>
                                        <span className="rounded-full border border-slate-700 bg-slate-800 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-slate-300">
                                            Optional
                                        </span>
                                    </div>

                                    <div className="mt-6 grid gap-4">
                                        <select
                                            className="w-full rounded-xl border border-white/10 bg-[#091a2b] px-4 py-3 text-white outline-none transition focus:border-slate-500 focus:bg-[#0d2235]"
                                            value={recordForm.patient}
                                            onChange={(e) => setRecordForm((current) => ({ ...current, patient: e.target.value }))}
                                            required
                                        >
                                            <option value="">Select patient</option>
                                            {patientOptions.map((item) => (
                                                <option key={item.id} value={item.id}>
                                                    {item.label}
                                                </option>
                                            ))}
                                        </select>

                                        <input
                                            className="w-full rounded-xl border border-white/10 bg-[#091a2b] px-4 py-3 text-white outline-none transition placeholder:text-slate-500 focus:border-slate-500 focus:bg-[#0d2235]"
                                            placeholder="Record title"
                                            value={recordForm.title}
                                            onChange={(e) => setRecordForm((current) => ({ ...current, title: e.target.value }))}
                                            required
                                        />

                                        <input
                                            className="w-full rounded-xl border border-white/10 bg-[#091a2b] px-4 py-3 text-sm text-slate-300 outline-none transition file:mr-4 file:rounded-lg file:border-0 file:bg-slate-100 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-slate-950"
                                            type="file"
                                            onChange={(e) => setRecordForm((current) => ({ ...current, record_file: e.target.files?.[0] || null }))}
                                        />
                                    </div>

                                    {recordMessage && <p className="mt-4 rounded-xl border border-emerald-400/15 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-200">{recordMessage}</p>}
                                    {recordError && <p className="mt-4 rounded-xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">{recordError}</p>}

                                    <div className="mt-6 flex items-center justify-between gap-4">
                                        <p className="text-sm text-slate-400">Reports appear in the patient portal.</p>
                                        <button type="submit" className="rounded-xl bg-slate-100 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-white">
                                            Upload Record
                                        </button>
                                    </div>
                                </form>
                            )}

                            {activeStage === "family" && (
                                <div className="space-y-6">
                                    <form onSubmit={handleCreateAttendantUser} className="rounded-[24px] border border-slate-800 bg-[#111827] p-6 shadow-[0_24px_50px_-36px_rgba(15,23,42,0.55)]">
                                        <div className="flex items-center justify-between gap-4">
                                            <div>
                                                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">Stage 4</p>
                                                <h2 className="mt-2 text-2xl font-bold text-white">Create attendant login</h2>
                                            </div>
                                            <span className="rounded-full border border-slate-700 bg-slate-800 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-slate-200">Family Portal</span>
                                        </div>
                                        <div className="mt-6 grid gap-4 md:grid-cols-2">
                                            <input className="w-full rounded-xl border border-white/10 bg-[#091a2b] px-4 py-3 text-white outline-none transition placeholder:text-slate-500 focus:border-slate-500 focus:bg-[#0d2235]" placeholder="Attendant name" value={attendantForm.name} onChange={(e) => setAttendantForm((current) => ({ ...current, name: e.target.value }))} required />
                                            <input className="w-full rounded-xl border border-white/10 bg-[#091a2b] px-4 py-3 text-white outline-none transition placeholder:text-slate-500 focus:border-slate-500 focus:bg-[#0d2235]" placeholder="Mobile number" value={attendantForm.mobile_number} onChange={(e) => setAttendantForm((current) => ({ ...current, mobile_number: e.target.value }))} required />
                                        </div>
                                        <div className="mt-6 flex items-center justify-between gap-4">
                                            <p className="text-sm text-slate-400">Create one login for family members or attendants.</p>
                                            <button type="submit" className="rounded-xl bg-slate-100 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-white">Create Attendant</button>
                                        </div>
                                    </form>

                                    <form onSubmit={handleCreateFamilyAccess} className="rounded-[24px] border border-slate-800 bg-[#111827] p-6 shadow-[0_24px_50px_-36px_rgba(15,23,42,0.55)]">
                                        <div>
                                            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">Link Access</p>
                                            <h2 className="mt-2 text-2xl font-bold text-white">Connect attendant with patient</h2>
                                        </div>
                                        <div className="mt-6 grid gap-4">
                                            <select className="w-full rounded-xl border border-white/10 bg-[#091a2b] px-4 py-3 text-white outline-none transition focus:border-slate-500 focus:bg-[#0d2235]" value={familyForm.attendant_user} onChange={(e) => setFamilyForm((current) => ({ ...current, attendant_user: e.target.value }))} required>
                                                <option value="">Select attendant</option>
                                                {attendantUsers.map((attendant) => <option key={attendant.id} value={attendant.id}>{attendant.name} ({attendant.mobile_number})</option>)}
                                            </select>
                                            <select className="w-full rounded-xl border border-white/10 bg-[#091a2b] px-4 py-3 text-white outline-none transition focus:border-slate-500 focus:bg-[#0d2235]" value={familyForm.patient} onChange={(e) => setFamilyForm((current) => ({ ...current, patient: e.target.value }))} required>
                                                <option value="">Select patient</option>
                                                {patients.map((patient) => <option key={patient.id} value={patient.id}>{patient.user_name} ({patient.user_mobile || patient.user_email})</option>)}
                                            </select>
                                            <select className="w-full rounded-xl border border-white/10 bg-[#091a2b] px-4 py-3 text-white outline-none transition focus:border-slate-500 focus:bg-[#0d2235]" value={familyForm.relation} onChange={(e) => setFamilyForm((current) => ({ ...current, relation: e.target.value }))}>
                                                <option value="other">Other</option>
                                                <option value="father">Father</option>
                                                <option value="mother">Mother</option>
                                                <option value="son">Son</option>
                                                <option value="daughter">Daughter</option>
                                                <option value="brother">Brother</option>
                                                <option value="sister">Sister</option>
                                            </select>
                                        </div>
                                        {familyMessage && <p className="mt-4 rounded-xl border border-emerald-400/15 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-200">{familyMessage}</p>}
                                        {familyError && <p className="mt-4 rounded-xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">{familyError}</p>}
                                        {credentialInfo?.generated_password && (
                                            <div className="mt-4 rounded-2xl border border-cyan-300/20 bg-cyan-300/10 px-4 py-4 text-sm text-cyan-100">
                                                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-100/80">Attendant Login Credentials</p>
                                                <p className="mt-3">Name: {credentialInfo.name}</p>
                                                <p className="mt-1">Mobile: {credentialInfo.mobile_number}</p>
                                                <p className="mt-1 font-semibold">Temporary Password: {credentialInfo.generated_password}</p>
                                            </div>
                                        )}
                                        <div className="mt-6 flex items-center justify-between gap-4">
                                            <p className="text-sm text-slate-400">One attendant can manage multiple family patients.</p>
                                            <button type="submit" className="rounded-xl bg-slate-100 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-white">Link Family Access</button>
                                        </div>
                                    </form>

                                    <form onSubmit={handleCreateFamilyMember} className="rounded-[24px] border border-slate-800 bg-[#111827] p-6 shadow-[0_24px_50px_-36px_rgba(15,23,42,0.55)]">
                                        <div className="flex items-center justify-between gap-4">
                                            <div>
                                                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">New Family Patient</p>
                                                <h2 className="mt-2 text-2xl font-bold text-white">Add dependent without new mobile</h2>
                                            </div>
                                            <span className="rounded-full border border-cyan-300/15 bg-cyan-300/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-cyan-100">Shared Login</span>
                                        </div>
                                        <div className="mt-6 grid gap-4">
                                            <select className="w-full rounded-xl border border-white/10 bg-[#091a2b] px-4 py-3 text-white outline-none transition focus:border-slate-500 focus:bg-[#0d2235]" value={familyMemberForm.attendant_user} onChange={(e) => setFamilyMemberForm((current) => ({ ...current, attendant_user: e.target.value }))} required>
                                                <option value="">Select attendant account</option>
                                                {attendantUsers.map((attendant) => <option key={attendant.id} value={attendant.id}>{attendant.name} ({attendant.mobile_number})</option>)}
                                            </select>
                                            <div className="grid gap-4 md:grid-cols-2">
                                                <input className="w-full rounded-xl border border-white/10 bg-[#091a2b] px-4 py-3 text-white outline-none transition placeholder:text-slate-500 focus:border-slate-500 focus:bg-[#0d2235]" placeholder="Patient name" value={familyMemberForm.name} onChange={(e) => setFamilyMemberForm((current) => ({ ...current, name: e.target.value }))} required />
                                                <input className="w-full rounded-xl border border-white/10 bg-[#091a2b] px-4 py-3 text-white outline-none transition placeholder:text-slate-500 focus:border-slate-500 focus:bg-[#0d2235]" type="number" min="0" placeholder="Age" value={familyMemberForm.age} onChange={(e) => setFamilyMemberForm((current) => ({ ...current, age: e.target.value }))} required />
                                            </div>
                                            <select className="w-full rounded-xl border border-white/10 bg-[#091a2b] px-4 py-3 text-white outline-none transition focus:border-slate-500 focus:bg-[#0d2235]" value={familyMemberForm.relation} onChange={(e) => setFamilyMemberForm((current) => ({ ...current, relation: e.target.value }))}>
                                                <option value="other">Other</option>
                                                <option value="father">Father</option>
                                                <option value="mother">Mother</option>
                                                <option value="son">Son</option>
                                                <option value="daughter">Daughter</option>
                                                <option value="brother">Brother</option>
                                                <option value="sister">Sister</option>
                                            </select>
                                            <textarea className="min-h-28 w-full rounded-xl border border-white/10 bg-[#091a2b] px-4 py-3 text-white outline-none transition placeholder:text-slate-500 focus:border-slate-500 focus:bg-[#0d2235]" placeholder="Medical history" value={familyMemberForm.history} onChange={(e) => setFamilyMemberForm((current) => ({ ...current, history: e.target.value }))} />
                                        </div>
                                        <div className="mt-6 flex items-center justify-between gap-4">
                                            <p className="text-sm text-slate-400">Reception can create a dependent under the attendant's existing mobile login.</p>
                                            <button type="submit" className="rounded-xl bg-slate-100 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-white">Add Family Patient</button>
                                        </div>
                                    </form>
                                </div>
                            )}
                            
                            <div className={`${activeStage === "family" ? "" : "hidden "}rounded-[24px] border border-slate-800 bg-[#111827] p-5 shadow-[0_24px_50px_-36px_rgba(15,23,42,0.55)]`}>
                                <div className="flex items-center justify-between gap-4">
                                    <div>
                                        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">{activeStage === "family" ? "Family Links" : "Recent Records"}</p>
                                        <h2 className="mt-2 text-2xl font-bold text-white">{activeStage === "family" ? "Linked access" : "Uploads"}</h2>
                                    </div>
                                    <input
                                        className="w-full max-w-xs rounded-xl border border-white/10 bg-[#091a2b] px-4 py-2.5 text-white outline-none transition placeholder:text-slate-500 focus:border-slate-500 focus:bg-[#0d2235]"
                                        placeholder="Search login list"
                                        value={userSearch}
                                        onChange={(e) => setUserSearch(e.target.value)}
                                    />
                                </div>

                                <div className="mt-6 space-y-3">
                                    {activeStage === "family" ? groupedFamilyLinks.slice(0, 6).map((group) => (
                                        <div key={group.attendant_user} className="rounded-2xl border border-slate-800 bg-[#0f172a] p-4">
                                            <div className="flex items-start justify-between gap-3">
                                                <div>
                                                    <p className="text-base font-semibold text-white">{group.attendant_name}</p>
                                                    <p className="mt-1 text-sm text-slate-500">{group.attendant_mobile || "No mobile"}</p>
                                                </div>
                                            </div>
                                            <div className="mt-4 space-y-3">
                                                {group.entries.map((link) => (
                                                    <div key={link.id} className="flex items-start justify-between gap-3 rounded-xl border border-slate-800 bg-[#111827] px-4 py-3">
                                                        <div>
                                                            <p className="text-sm font-semibold text-white">{link.patient_name}</p>
                                                            <p className="mt-1 text-sm text-slate-500">{link.relation || "Family access"}</p>
                                                            <p className="mt-1 text-xs text-slate-600">{link.patient_mobile || "Uses shared family login"}</p>
                                                        </div>
                                                        <div className="flex flex-wrap gap-2">
                                                            <button type="button" onClick={() => {
                                                                const linkedPatient = patients.find((patient) => patient.id === link.patient);
                                                                if (linkedPatient) {
                                                                    handleEditPatient(linkedPatient);
                                                                }
                                                            }} className="rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-sm font-semibold text-slate-200 transition hover:border-slate-500">
                                                                Edit Patient
                                                            </button>
                                                            <button type="button" onClick={() => handleDeleteFamilyAccess(link.id)} className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm font-semibold text-rose-200 transition hover:border-rose-500/60">
                                                                Remove
                                                            </button>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )) : records.slice(0, 6).map((record) => (
                                        <div key={record.id} className="rounded-2xl border border-slate-800 bg-[#0f172a] p-4">
                                            <div className="flex items-start justify-between gap-3">
                                                <div>
                                                    <p className="text-base font-semibold text-white">{record.title}</p>
                                                    <p className="mt-1 text-sm text-slate-400">{record.patient_name}</p>
                                                    <p className="mt-1 text-sm text-slate-500">{record.uploaded_by_name || "Hospital staff"}</p>
                                                </div>
                                                {record.record_file ? (
                                                    <a href={record.record_file} target="_blank" rel="noreferrer" className="rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-sm font-semibold text-slate-200 transition hover:border-slate-500">
                                                        Open
                                                    </a>
                                                ) : (
                                                    <span className="rounded-xl border border-slate-800 bg-[#111827] px-3 py-2 text-sm font-semibold text-slate-500">
                                                        No file attached
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                    {activeStage === "family" ? !groupedFamilyLinks.length && (
                                        <div className="rounded-2xl border border-dashed border-slate-700 bg-[#0f172a] px-4 py-7 text-sm text-slate-400">
                                            No family links yet.
                                        </div>
                                    ) : !records.length && (
                                        <div className="rounded-2xl border border-dashed border-slate-700 bg-[#0f172a] px-4 py-7 text-sm text-slate-400">
                                            No records yet.
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </section>

                    {intakeView === "directory" && (
                        <section className="mt-6 rounded-[24px] border border-slate-800 bg-[#111827] p-5 shadow-[0_24px_50px_-36px_rgba(15,23,42,0.55)]">
                            <div className="flex items-center justify-between gap-4">
                                <div>
                                    <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">Patient Directory</p>
                                    <h2 className="mt-2 text-2xl font-bold text-white">Profiles</h2>
                                </div>
                                <input
                                    className="w-full max-w-xs rounded-xl border border-white/10 bg-[#091a2b] px-4 py-2.5 text-white outline-none transition placeholder:text-slate-500 focus:border-slate-500 focus:bg-[#0d2235]"
                                    placeholder="Search name or mobile"
                                    value={patientSearch}
                                    onChange={(e) => setPatientSearch(e.target.value)}
                                />
                            </div>

                            <div className="mt-6 grid gap-3 xl:grid-cols-2">
                                {patients.map((patient) => (
                                    <div key={patient.id} className="rounded-2xl border border-slate-800 bg-[#0f172a] p-4">
                                        <div className="flex items-start gap-3.5">
                                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-sm font-bold uppercase text-slate-950">
                                                {patient.user_name.slice(0, 2)}
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <div className="flex items-center justify-between gap-3">
                                                    <p className="text-base font-semibold text-white">{patient.user_name}</p>
                                                    <span className="rounded-full border border-slate-700 bg-slate-800 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-slate-200">
                                                        Age {patient.age}
                                                    </span>
                                                </div>
                                                <p className="mt-1 truncate text-sm text-slate-500">{patient.user_mobile || patient.user_email}</p>
                                                <div className="mt-4 flex flex-wrap gap-3">
                                                    <button type="button" onClick={() => openQuickPasswordReset(patient)} className="rounded-xl border border-cyan-400/30 bg-cyan-400/10 px-3 py-2 text-sm font-semibold text-cyan-100 transition hover:border-cyan-400/60">
                                                        Password via OTP
                                                    </button>
                                                    <button type="button" onClick={() => openQuickPatientEdit(patient)} className="rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-sm font-semibold text-slate-200 transition hover:border-slate-500">
                                                        Edit
                                                    </button>
                                                    <button type="button" onClick={() => openQuickFamilyAccess(patient)} className="rounded-xl border border-indigo-400/30 bg-indigo-400/10 px-3 py-2 text-sm font-semibold text-indigo-100 transition hover:border-indigo-400/60">
                                                        Grant Family Access
                                                    </button>
                                                    <button type="button" onClick={() => handleDeletePatient(patient.id)} className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm font-semibold text-rose-200 transition hover:border-rose-500/60">
                                                        Delete
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                                {!patients.length && (
                                    <div className="rounded-2xl border border-dashed border-slate-700 bg-[#0f172a] px-4 py-7 text-sm text-slate-400">
                                        No patient profiles found.
                                    </div>
                                )}
                            </div>
                        </section>
                    )}

                    {intakeView === "records" && (
                        <section className="mt-6 rounded-[24px] border border-slate-800 bg-[#111827] p-5 shadow-[0_24px_50px_-36px_rgba(15,23,42,0.55)]">
                            <div className="flex items-center justify-between gap-4">
                                <div>
                                    <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">Recent Records</p>
                                    <h2 className="mt-2 text-2xl font-bold text-white">Uploads</h2>
                                </div>
                                <button type="button" onClick={() => { setIntakeView("workflow"); setActiveStage("records"); }} className="rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:border-slate-500">
                                    Open Upload Stage
                                </button>
                            </div>

                            <div className="mt-6 space-y-3">
                                {records.map((record) => (
                                    <div key={record.id} className="rounded-2xl border border-slate-800 bg-[#0f172a] p-4">
                                        <div className="flex items-start justify-between gap-3">
                                            <div>
                                                <p className="text-base font-semibold text-white">{record.title}</p>
                                                <p className="mt-1 text-sm text-slate-400">{record.patient_name}</p>
                                                <p className="mt-1 text-sm text-slate-500">{record.uploaded_by_name || "Hospital staff"}</p>
                                            </div>
                                            {record.record_file ? (
                                                <a href={record.record_file} target="_blank" rel="noreferrer" className="rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-sm font-semibold text-slate-200 transition hover:border-slate-500">
                                                    Open
                                                </a>
                                            ) : (
                                                <span className="rounded-xl border border-slate-800 bg-[#111827] px-3 py-2 text-sm font-semibold text-slate-500">
                                                    No file attached
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                ))}
                                {!records.length && (
                                    <div className="rounded-2xl border border-dashed border-slate-700 bg-[#0f172a] px-4 py-7 text-sm text-slate-400">
                                        No records yet.
                                    </div>
                                )}
                            </div>
                        </section>
                    )}
                </div>
            </main>

            {quickFamilyAccess.isOpen && quickFamilyAccess.patient && (
                <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/75 px-4 py-8">
                    <div className="w-full max-w-2xl rounded-[28px] border border-slate-800 bg-[#111827] p-6 shadow-[0_40px_120px_-48px_rgba(15,23,42,0.85)]">
                        <div className="flex items-start justify-between gap-4">
                            <div>
                                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">Quick Action</p>
                                <h2 className="mt-2 text-2xl font-bold text-white">Grant family access</h2>
                                <p className="mt-2 text-sm text-slate-400">
                                    Patient: {quickFamilyAccess.patient.user_name} ({quickFamilyAccess.patient.user_mobile || quickFamilyAccess.patient.user_email})
                                </p>
                            </div>
                            <button type="button" onClick={closeQuickFamilyAccess} className="rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:border-slate-500">
                                Close
                            </button>
                        </div>

                        <div className="mt-6 flex flex-wrap gap-3">
                            <button type="button" onClick={() => setQuickFamilyAccess((current) => ({ ...current, mode: "existing", attendant_user: "", attendant_name: "", mobile_number: "" }))} className={familyAccessButtonClasses(quickFamilyAccess.mode === "existing")}>
                                Use Existing Attendant
                            </button>
                            <button type="button" onClick={() => setQuickFamilyAccess((current) => ({ ...current, mode: "new", attendant_user: "" }))} className={familyAccessButtonClasses(quickFamilyAccess.mode === "new")}>
                                Create New Attendant
                            </button>
                        </div>

                        <form onSubmit={handleQuickFamilyAccessSubmit} className="mt-6 space-y-4">
                            {quickFamilyAccess.mode === "existing" ? (
                                <select className="w-full rounded-xl border border-white/10 bg-[#091a2b] px-4 py-3 text-white outline-none transition focus:border-slate-500 focus:bg-[#0d2235]" value={quickFamilyAccess.attendant_user} onChange={(e) => setQuickFamilyAccess((current) => ({ ...current, attendant_user: e.target.value }))} required>
                                    <option value="">Select attendant account</option>
                                    {attendantUsers.map((attendant) => <option key={attendant.id} value={attendant.id}>{attendant.name} ({attendant.mobile_number})</option>)}
                                </select>
                            ) : (
                                <div className="grid gap-4 md:grid-cols-2">
                                    <input className="w-full rounded-xl border border-white/10 bg-[#091a2b] px-4 py-3 text-white outline-none transition placeholder:text-slate-500 focus:border-slate-500 focus:bg-[#0d2235]" placeholder="Attendant name" value={quickFamilyAccess.attendant_name} onChange={(e) => setQuickFamilyAccess((current) => ({ ...current, attendant_name: e.target.value }))} required />
                                    <input className="w-full rounded-xl border border-white/10 bg-[#091a2b] px-4 py-3 text-white outline-none transition placeholder:text-slate-500 focus:border-slate-500 focus:bg-[#0d2235]" placeholder="Mobile number" value={quickFamilyAccess.mobile_number} onChange={(e) => setQuickFamilyAccess((current) => ({ ...current, mobile_number: e.target.value }))} required />
                                </div>
                            )}

                            <select className="w-full rounded-xl border border-white/10 bg-[#091a2b] px-4 py-3 text-white outline-none transition focus:border-slate-500 focus:bg-[#0d2235]" value={quickFamilyAccess.relation} onChange={(e) => setQuickFamilyAccess((current) => ({ ...current, relation: e.target.value }))}>
                                <option value="other">Other</option>
                                <option value="father">Father</option>
                                <option value="mother">Mother</option>
                                <option value="son">Son</option>
                                <option value="daughter">Daughter</option>
                                <option value="brother">Brother</option>
                                <option value="sister">Sister</option>
                            </select>

                            <div className="flex items-center justify-between gap-4">
                                <p className="text-sm text-slate-400">Search patient, tap once, and grant access from here.</p>
                                <button type="submit" className="rounded-xl bg-slate-100 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-white">
                                    Grant Access
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {quickPatientEdit.isOpen && quickPatientEdit.patient && (
                <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/75 px-4 py-8">
                    <div className="w-full max-w-2xl rounded-[28px] border border-slate-800 bg-[#111827] p-6 shadow-[0_40px_120px_-48px_rgba(15,23,42,0.85)]">
                        <div className="flex items-start justify-between gap-4">
                            <div>
                                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">Quick Action</p>
                                <h2 className="mt-2 text-2xl font-bold text-white">Edit patient profile</h2>
                                <p className="mt-2 text-sm text-slate-400">
                                    Patient: {quickPatientEdit.patient.user_name} ({quickPatientEdit.patient.user_mobile || quickPatientEdit.patient.user_email})
                                </p>
                            </div>
                            <button type="button" onClick={closeQuickPatientEdit} className="rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:border-slate-500">
                                Close
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                            <div className="grid gap-4 md:grid-cols-[180px_1fr]">
                                <input
                                    className="w-full rounded-xl border border-white/10 bg-[#091a2b] px-4 py-3 text-white outline-none transition placeholder:text-slate-500 focus:border-slate-500 focus:bg-[#0d2235] md:col-span-2"
                                    placeholder="Patient name"
                                    value={form.name}
                                    onChange={(e) => setForm((current) => ({ ...current, name: e.target.value }))}
                                    required
                                />
                                <input
                                    className="w-full rounded-xl border border-white/10 bg-[#091a2b] px-4 py-3 text-white outline-none transition placeholder:text-slate-500 focus:border-slate-500 focus:bg-[#0d2235] md:col-span-2"
                                    placeholder="Mobile number"
                                    value={form.mobile_number}
                                    onChange={(e) => setForm((current) => ({ ...current, mobile_number: e.target.value }))}
                                    required
                                />
                                <input
                                    className="w-full rounded-xl border border-white/10 bg-[#091a2b] px-4 py-3 text-white outline-none transition placeholder:text-slate-500 focus:border-slate-500 focus:bg-[#0d2235]"
                                    placeholder="Age"
                                    type="number"
                                    min="0"
                                    value={form.age}
                                    onChange={(e) => setForm((current) => ({ ...current, age: e.target.value }))}
                                    required
                                />
                                <textarea
                                    className="min-h-32 w-full rounded-xl border border-white/10 bg-[#091a2b] px-4 py-3 text-white outline-none transition placeholder:text-slate-500 focus:border-slate-500 focus:bg-[#0d2235]"
                                    placeholder="Medical history"
                                    value={form.history}
                                    onChange={(e) => setForm((current) => ({ ...current, history: e.target.value }))}
                                />
                            </div>

                            {message && <p className="rounded-xl border border-emerald-400/15 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-200">{message}</p>}
                            {error && <p className="rounded-xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">{error}</p>}

                            <div className="flex items-center justify-between gap-4">
                                <p className="text-sm text-slate-400">Update patient name, mobile number, age, and medical history from here.</p>
                                <button type="submit" className="rounded-xl bg-slate-100 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-white">
                                    Update Profile
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {quickPasswordReset.isOpen && quickPasswordReset.patient && (
                <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/75 px-4 py-8">
                    <div className="w-full max-w-2xl rounded-[28px] border border-slate-800 bg-[#111827] p-6 shadow-[0_40px_120px_-48px_rgba(15,23,42,0.85)]">
                        <div className="flex items-start justify-between gap-4">
                            <div>
                                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">Quick Action</p>
                                <h2 className="mt-2 text-2xl font-bold text-white">Password reset via OTP</h2>
                                <p className="mt-2 text-sm text-slate-400">
                                    Patient: {quickPasswordReset.patient.user_name} ({quickPasswordReset.patient.user_mobile || quickPasswordReset.patient.user_email})
                                </p>
                            </div>
                            <button type="button" onClick={closeQuickPasswordReset} className="rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:border-slate-500">
                                Close
                            </button>
                        </div>

                        <div className="mt-6 space-y-3">
                            <div className="rounded-2xl border border-slate-800 bg-[#0f172a] px-4 py-3">
                                <p className="text-xs uppercase tracking-[0.28em] text-slate-300">1. Send OTP to patient mobile</p>
                            </div>
                            <div className="rounded-2xl border border-slate-800 bg-[#0f172a] px-4 py-3">
                                <p className="text-xs uppercase tracking-[0.28em] text-slate-300">2. Enter OTP and set new password</p>
                            </div>
                            <div className="rounded-2xl border border-slate-800 bg-[#0f172a] px-4 py-3">
                                <p className="text-xs uppercase tracking-[0.28em] text-slate-300">Existing password cannot be shown because it is securely stored</p>
                            </div>
                        </div>

                        {quickPasswordReset.step === 1 ? (
                            <form onSubmit={handleQuickPasswordOtpRequest} className="mt-6 space-y-4">
                                <input
                                    className="w-full rounded-xl border border-white/10 bg-[#091a2b] px-4 py-3 text-white outline-none transition placeholder:text-slate-500 focus:border-slate-500 focus:bg-[#0d2235]"
                                    type="text"
                                    placeholder="Mobile number or email"
                                    value={quickPasswordReset.identifier}
                                    onChange={(e) => setQuickPasswordReset((current) => ({ ...current, identifier: e.target.value }))}
                                    required
                                />

                                {quickPasswordReset.error && <p className="rounded-xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">{quickPasswordReset.error}</p>}
                                {quickPasswordReset.message && <p className="rounded-xl border border-emerald-400/15 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-200">{quickPasswordReset.message}</p>}

                                <div className="flex items-center justify-between gap-4">
                                    <p className="text-sm text-slate-400">OTP patient ke registered mobile par jayega. Local mode me yahin show hoga.</p>
                                    <button
                                        type="submit"
                                        disabled={quickPasswordReset.isLoading}
                                        className="rounded-xl bg-slate-100 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-white disabled:cursor-not-allowed disabled:bg-slate-500 disabled:text-slate-200"
                                    >
                                        {quickPasswordReset.isLoading ? "Sending OTP..." : "Send OTP"}
                                    </button>
                                </div>
                            </form>
                        ) : (
                            <form onSubmit={handleQuickPasswordReset} className="mt-6 space-y-4">
                                <input
                                    className="w-full rounded-xl border border-white/10 bg-[#091a2b] px-4 py-3 text-white outline-none transition placeholder:text-slate-500 focus:border-slate-500 focus:bg-[#0d2235]"
                                    type="text"
                                    placeholder="Mobile number or email"
                                    value={quickPasswordReset.identifier}
                                    onChange={(e) => setQuickPasswordReset((current) => ({ ...current, identifier: e.target.value }))}
                                    required
                                />
                                <input
                                    className="w-full rounded-xl border border-white/10 bg-[#091a2b] px-4 py-3 text-white outline-none transition placeholder:text-slate-500 focus:border-slate-500 focus:bg-[#0d2235]"
                                    type="text"
                                    placeholder="OTP"
                                    value={quickPasswordReset.otp}
                                    onChange={(e) => setQuickPasswordReset((current) => ({ ...current, otp: e.target.value }))}
                                    required
                                />
                                <input
                                    className="w-full rounded-xl border border-white/10 bg-[#091a2b] px-4 py-3 text-white outline-none transition placeholder:text-slate-500 focus:border-slate-500 focus:bg-[#0d2235]"
                                    type="text"
                                    placeholder="New password"
                                    value={quickPasswordReset.new_password}
                                    onChange={(e) => setQuickPasswordReset((current) => ({ ...current, new_password: e.target.value }))}
                                    required
                                />

                                {quickPasswordReset.error && <p className="rounded-xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">{quickPasswordReset.error}</p>}
                                {quickPasswordReset.message && <p className="rounded-xl border border-emerald-400/15 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-200">{quickPasswordReset.message}</p>}

                                <div className="flex items-center justify-between gap-4">
                                    <button
                                        type="button"
                                        onClick={() => setQuickPasswordReset((current) => ({ ...current, step: 1, otp: "", new_password: "", error: "", message: "" }))}
                                        className="rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-sm font-semibold text-slate-200 transition hover:border-slate-500"
                                    >
                                        Back
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={quickPasswordReset.isLoading}
                                        className="rounded-xl bg-slate-100 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-white disabled:cursor-not-allowed disabled:bg-slate-500 disabled:text-slate-200"
                                    >
                                        {quickPasswordReset.isLoading ? "Updating..." : "Set New Password"}
                                    </button>
                                </div>
                            </form>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

export default AddPatient;
