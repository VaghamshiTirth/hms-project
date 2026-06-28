import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import Sidebar from "../components/Sidebar";
import API from "../services/api";

const ROLE_OPTIONS = [
    { value: "admin", label: "Admin" },
    { value: "frontdesk", label: "Front Desk" },
    { value: "doctor", label: "Doctor" },
    { value: "patient", label: "Patient" },
    { value: "attendant", label: "Attendant" },
];

function createBlankForm() {
    return {
        name: "",
        role: "doctor",
        email: "",
        mobile_number: "",
        password: "",
        specialization: "",
        patient_age: "",
        patient_history: "",
    };
}

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

function formatRoleLabel(role) {
    const match = ROLE_OPTIONS.find((item) => item.value === role);
    return match ? match.label : role;
}

function roleBadgeClasses(role) {
    if (role === "admin") return "border-cyan-200 bg-cyan-50 text-cyan-800";
    if (role === "frontdesk") return "border-emerald-200 bg-emerald-50 text-emerald-800";
    if (role === "doctor") return "border-violet-200 bg-violet-50 text-violet-800";
    if (role === "patient") return "border-amber-200 bg-amber-50 text-amber-800";
    return "border-slate-200 bg-slate-100 text-slate-700";
}

function AdminIdManager() {
    const [accounts, setAccounts] = useState([]);
    const [query, setQuery] = useState("");
    const [roleFilter, setRoleFilter] = useState("all");
    const [form, setForm] = useState(createBlankForm);
    const [editingId, setEditingId] = useState(null);
    const [message, setMessage] = useState("");
    const [error, setError] = useState("");
    const [credentialInfo, setCredentialInfo] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const currentUserId = Number(localStorage.getItem("userId"));
    const navigate = useNavigate();

    const loadAccounts = useCallback(async () => {
        setIsLoading(true);
        try {
            const params = {};
            if (query.trim()) {
                params.q = query.trim();
            }
            if (roleFilter !== "all") {
                params.role = roleFilter;
            }

            const response = await API.get("admin-user-accounts/", { params });
            setAccounts(response.data);
            setError("");
        } catch (err) {
            setError(getApiErrorMessage(err, "Could not load admin IDs."));
        } finally {
            setIsLoading(false);
        }
    }, [query, roleFilter]);

    useEffect(() => {
        const role = localStorage.getItem("role");

        if (role !== "admin") {
            navigate("/", { replace: true });
            return;
        }

        loadAccounts();
    }, [loadAccounts, navigate]);

    const counts = useMemo(
        () =>
            accounts.reduce(
                (result, account) => {
                    result.total += 1;
                    result[account.role] = (result[account.role] || 0) + 1;
                    return result;
                },
                { total: 0, admin: 0, frontdesk: 0, doctor: 0, patient: 0, attendant: 0 }
            ),
        [accounts]
    );

    const isDoctorRole = form.role === "doctor";
    const isPatientRole = form.role === "patient";
    const needsEmail = ["admin", "frontdesk", "doctor"].includes(form.role);
    const needsMobile = ["patient", "attendant"].includes(form.role);

    const resetForm = () => {
        setForm(createBlankForm());
        setEditingId(null);
    };

    const handleEdit = (account) => {
        setEditingId(account.id);
        setForm({
            name: account.name || "",
            role: account.role || "doctor",
            email: account.email || "",
            mobile_number: account.mobile_number || "",
            password: "",
            specialization: account.specialization || "",
            patient_age: account.patient_age ?? "",
            patient_history: account.patient_history || "",
        });
        setMessage("");
        setError("");
        setCredentialInfo(null);
        window.scrollTo({ top: 0, behavior: "smooth" });
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        setIsSubmitting(true);
        setMessage("");
        setError("");
        setCredentialInfo(null);

        const payload = {
            name: form.name,
            role: form.role,
            email: form.email,
            mobile_number: form.mobile_number,
            password: form.password,
            specialization: form.specialization,
            patient_age: form.patient_age,
            patient_history: form.patient_history,
        };

        try {
            const response = editingId
                ? await API.put(`admin-user-accounts/${editingId}/`, payload)
                : await API.post("admin-user-accounts/", payload);

            setMessage(response.data.message || (editingId ? "ID updated successfully." : "ID created successfully."));
            if (response.data.generated_password) {
                const account = response.data.account;
                setCredentialInfo({
                    name: account?.name || form.name,
                    login_identifier: account?.login_identifier || form.mobile_number || form.email,
                    generated_password: response.data.generated_password,
                });
            }

            resetForm();
            await loadAccounts();
        } catch (err) {
            setError(getApiErrorMessage(err, editingId ? "Could not update ID." : "Could not create ID."));
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleResetPassword = async (account) => {
        const shouldContinue = window.confirm(`Generate a temporary password for ${account.name}?`);
        if (!shouldContinue) {
            return;
        }

        setMessage("");
        setError("");
        setCredentialInfo(null);

        try {
            const response = await API.post(`admin-user-accounts/${account.id}/reset-password/`);
            setMessage(response.data.message || "Temporary password generated.");
            setCredentialInfo({
                name: account.name,
                login_identifier: account.login_identifier,
                generated_password: response.data.generated_password,
            });
        } catch (err) {
            setError(getApiErrorMessage(err, "Could not generate temporary password."));
        }
    };

    const handleDelete = async (account) => {
        const shouldContinue = window.confirm(
            `Delete ID for ${account.name}? Deletion is blocked only when the patient still has a pending appointment or pending bill.`
        );
        if (!shouldContinue) {
            return;
        }

        setMessage("");
        setError("");
        setCredentialInfo(null);

        try {
            const response = await API.delete(`admin-user-accounts/${account.id}/`);
            setMessage(response.data.message || "ID deleted successfully.");

            if (editingId === account.id) {
                resetForm();
            }

            await loadAccounts();
        } catch (err) {
            setError(getApiErrorMessage(err, "Could not delete ID."));
        }
    };

    return (
        <div className="dashboard-light min-h-screen bg-[#f6fbff]">
            <Sidebar />

            <main className="min-h-screen p-6 md:ml-64 md:p-8">
                <div className="mx-auto max-w-[1600px]">
                    <div className="flex flex-col gap-2">
                        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-slate-300">Admin Access Control</p>
                        <h1 className="text-3xl font-bold text-slate-950">ID Management</h1>
                        <p className="text-sm text-slate-600">Create and manage login IDs for hospital staff and members.</p>
                    </div>

                    {message && <p className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{message}</p>}
                    {error && <p className="mt-6 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">{error}</p>}

                    {credentialInfo && (
                        <div className="mt-6 rounded-[28px] border border-cyan-200 bg-cyan-50 p-5 shadow-[0_24px_60px_-40px_rgba(6,182,212,0.2)]">
                            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-cyan-800">Temporary Credentials</p>
                            <div className="mt-4 grid gap-3 md:grid-cols-3">
                                <div className="rounded-2xl border border-cyan-100 bg-white p-4">
                                    <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Name</p>
                                    <p className="mt-2 text-sm font-semibold text-slate-950">{credentialInfo.name}</p>
                                </div>
                                <div className="rounded-2xl border border-cyan-100 bg-white p-4">
                                    <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Login ID</p>
                                    <p className="mt-2 text-sm font-semibold text-slate-950">{credentialInfo.login_identifier || "Use assigned account ID"}</p>
                                </div>
                                <div className="rounded-2xl border border-cyan-100 bg-white p-4">
                                    <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Password</p>
                                    <p className="mt-2 text-sm font-semibold text-cyan-900">{credentialInfo.generated_password}</p>
                                </div>
                            </div>
                        </div>
                    )}

                    <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
                        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-[0_24px_60px_-40px_rgba(15,23,42,0.18)] xl:col-span-1">
                            <p className="text-sm text-slate-500">Total IDs</p>
                            <p className="mt-3 text-3xl font-bold text-cyan-700">{counts.total}</p>
                        </div>
                        {ROLE_OPTIONS.map((role, index) => (
                            <div key={role.value} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-[0_24px_60px_-40px_rgba(15,23,42,0.18)]">
                                <p className="text-sm text-slate-500">{role.label}</p>
                                <p className={`mt-3 text-3xl font-bold ${index % 2 === 0 ? "text-slate-950" : "text-sky-700"}`}>{counts[role.value] || 0}</p>
                            </div>
                        ))}
                    </section>

                    <section className="mt-6 grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
                        <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_24px_60px_-40px_rgba(15,23,42,0.18)]">
                            <div className="flex items-start justify-between gap-4">
                                <div>
                                    <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">Create Or Update</p>
                                    <h2 className="mt-2 text-2xl font-bold text-slate-950">{editingId ? "Update ID" : "Create New ID"}</h2>
                                </div>
                                {editingId && (
                                    <button
                                        type="button"
                                        onClick={resetForm}
                                        className="rounded-xl border border-slate-200 bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
                                    >
                                        Cancel Edit
                                    </button>
                                )}
                            </div>

                            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                                <input
                                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-cyan-300"
                                    placeholder="Full name"
                                    value={form.name}
                                    onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                                    required
                                />

                                <div className="grid gap-4 md:grid-cols-2">
                                    <select
                                        className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-950 outline-none transition focus:border-cyan-300 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500 disabled:opacity-70"
                                        value={form.role}
                                        onChange={(event) =>
                                            setForm((current) => ({
                                                ...current,
                                                role: event.target.value,
                                                specialization: event.target.value === "doctor" ? current.specialization : "",
                                                patient_age: event.target.value === "patient" ? current.patient_age : "",
                                                patient_history: event.target.value === "patient" ? current.patient_history : "",
                                            }))
                                        }
                                        disabled={Boolean(editingId)}
                                    >
                                        {ROLE_OPTIONS.map((role) => (
                                            <option key={role.value} value={role.value}>
                                                {role.label}
                                            </option>
                                        ))}
                                    </select>

                                    <input
                                        className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-cyan-300"
                                        placeholder={needsEmail ? "Email address" : "Optional email"}
                                        type="email"
                                        value={form.email}
                                        onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
                                        required={needsEmail}
                                    />
                                </div>

                                <div className="grid gap-4 md:grid-cols-2">
                                    <input
                                        className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-cyan-300"
                                        placeholder={needsMobile ? "10-digit mobile number" : "Optional mobile number"}
                                        value={form.mobile_number}
                                        onChange={(event) => setForm((current) => ({ ...current, mobile_number: event.target.value }))}
                                        required={needsMobile}
                                    />
                                    <input
                                        className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-cyan-300"
                                        placeholder={
                                            needsEmail
                                                ? editingId
                                                    ? "Leave blank to keep current password"
                                                    : "Set password"
                                                : editingId
                                                  ? "Leave blank to keep current password"
                                                  : "Leave blank to auto-generate password"
                                        }
                                        value={form.password}
                                        onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
                                    />
                                </div>

                                {isDoctorRole && (
                                    <input
                                        className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-cyan-300"
                                        placeholder="Doctor specialization"
                                        value={form.specialization}
                                        onChange={(event) => setForm((current) => ({ ...current, specialization: event.target.value }))}
                                        required
                                    />
                                )}

                                {isPatientRole && (
                                    <div className="grid gap-4">
                                        <input
                                            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-cyan-300"
                                            placeholder="Patient age"
                                            type="number"
                                            min="0"
                                            value={form.patient_age}
                                            onChange={(event) => setForm((current) => ({ ...current, patient_age: event.target.value }))}
                                            required
                                        />
                                        <textarea
                                            className="min-h-32 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-cyan-300"
                                            placeholder="Patient history"
                                            value={form.patient_history}
                                            onChange={(event) => setForm((current) => ({ ...current, patient_history: event.target.value }))}
                                        />
                                    </div>
                                )}

                                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                                    Role cannot be changed after creation because linked hospital records depend on this ID.
                                </div>

                                <div className="flex items-center justify-between gap-4">
                                    <p className="text-sm text-slate-600">Use this screen to create doctor, patient, front-desk, attendant, and admin login IDs.</p>
                                    <button
                                        type="submit"
                                        disabled={isSubmitting}
                                        className="rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-500"
                                    >
                                        {isSubmitting ? "Saving..." : editingId ? "Update ID" : "Create ID"}
                                    </button>
                                </div>
                            </form>
                        </div>

                        <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_24px_60px_-40px_rgba(15,23,42,0.18)]">
                            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                                <div>
                                    <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">Directory</p>
                                    <h2 className="mt-2 text-2xl font-bold text-slate-950">Manage Existing IDs</h2>
                                </div>

                                <div className="grid gap-3 sm:grid-cols-2">
                                    <input
                                        className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-cyan-300"
                                        placeholder="Search name, email, or mobile"
                                        value={query}
                                        onChange={(event) => setQuery(event.target.value)}
                                    />
                                    <select
                                        className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-950 outline-none transition focus:border-cyan-300"
                                        value={roleFilter}
                                        onChange={(event) => setRoleFilter(event.target.value)}
                                    >
                                        <option value="all">All roles</option>
                                        {ROLE_OPTIONS.map((role) => (
                                            <option key={role.value} value={role.value}>
                                                {role.label}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="mt-6 space-y-4">
                                {accounts.map((account) => (
                                    <div key={account.id} className="rounded-[24px] border border-slate-200 bg-slate-50 p-5">
                                        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                                            <div className="min-w-0">
                                                <div className="flex flex-wrap items-center gap-3">
                                                    <p className="text-lg font-semibold text-slate-950">{account.name}</p>
                                                    <span className={`rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] ${roleBadgeClasses(account.role)}`}>
                                                        {formatRoleLabel(account.role)}
                                                    </span>
                                                    <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-slate-600">
                                                        ID #{account.id}
                                                    </span>
                                                </div>

                                                <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                                                    <div className="rounded-2xl border border-slate-200 bg-white p-4">
                                                        <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Login ID</p>
                                                        <p className="mt-2 break-all text-sm text-slate-900">{account.login_identifier || "Not assigned"}</p>
                                                    </div>
                                                    <div className="rounded-2xl border border-slate-200 bg-white p-4">
                                                        <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Email</p>
                                                        <p className="mt-2 break-all text-sm text-slate-900">{account.email || "Not set"}</p>
                                                    </div>
                                                    <div className="rounded-2xl border border-slate-200 bg-white p-4">
                                                        <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Mobile</p>
                                                        <p className="mt-2 text-sm text-slate-900">{account.mobile_number || "Not set"}</p>
                                                    </div>
                                                </div>

                                                {account.role === "doctor" && (
                                                    <p className="mt-4 text-sm font-medium text-cyan-800">Specialization: {account.specialization || "Not assigned"}</p>
                                                )}
                                                {account.role === "patient" && (
                                                    <p className="mt-4 text-sm font-medium text-amber-800">
                                                        Age: {account.patient_age ?? "Not set"}
                                                        {account.patient_history ? ` | History: ${account.patient_history}` : ""}
                                                    </p>
                                                )}
                                                {account.role === "attendant" && (
                                                    <p className="mt-4 text-sm font-medium text-slate-700">Linked patients: {account.linked_patients || 0}</p>
                                                )}
                                                {!account.can_delete && account.delete_blockers?.length > 0 && (
                                                    <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4">
                                                        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-amber-800">Delete Locked</p>
                                                        <p className="mt-2 text-sm text-amber-900">{account.delete_blockers.join(" ")}</p>
                                                    </div>
                                                )}
                                            </div>

                                            <div className="flex shrink-0 flex-wrap gap-2">
                                                <button
                                                    type="button"
                                                    onClick={() => handleEdit(account)}
                                                    className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
                                                >
                                                    Edit
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => handleResetPassword(account)}
                                                    className="rounded-xl border border-cyan-200 bg-cyan-50 px-4 py-2 text-sm font-semibold text-cyan-800 transition hover:border-cyan-300 hover:bg-cyan-100"
                                                >
                                                    Temp Password
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => handleDelete(account)}
                                                    disabled={!account.can_delete || account.id === currentUserId}
                                                    className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-800 transition hover:border-rose-300 hover:bg-rose-100 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400"
                                                >
                                                    Delete
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))}

                                {!accounts.length && !isLoading && (
                                    <div className="rounded-[24px] border border-dashed border-slate-300 bg-slate-50 px-4 py-10 text-sm text-slate-500">
                                        No IDs matched your current filters.
                                    </div>
                                )}

                                {isLoading && (
                                    <div className="rounded-[24px] border border-dashed border-slate-300 bg-slate-50 px-4 py-10 text-sm text-slate-500">
                                        Loading admin IDs...
                                    </div>
                                )}
                            </div>
                        </div>
                    </section>
                </div>
            </main>
        </div>
    );
}

export default AdminIdManager;
