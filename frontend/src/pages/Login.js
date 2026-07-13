import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import API, {
    API_BASE_URL,
    clearSession,
    getApiBaseUrl,
    getHomeRoute,
    resetApiBaseUrl,
    setApiBaseUrl,
} from "../services/api";

const searchCatalog = [
    {
        title: "Cardiology Department",
        category: "Speciality",
        description: "Heart consultation, ECG review and regular cardiac follow-up.",
        action: "Explore care",
    },
    {
        title: "Dr. Meera Shah",
        category: "Doctor",
        description: "Senior physician for diabetes, fever and preventive health care.",
        action: "Find doctor",
    },
    {
        title: "Emergency & Trauma",
        category: "Service",
        description: "24x7 critical care, ambulance support and urgent admission help.",
        action: "Get support",
    },
    {
        title: "Neurology Clinic",
        category: "Speciality",
        description: "Brain, spine and nerve consultation with recovery planning.",
        action: "View speciality",
    },
    {
        title: "Health Check Packages",
        category: "Package",
        description: "Routine full-body tests for families, adults and senior citizens.",
        action: "See packages",
    },
    {
        title: "Patient Registration",
        category: "Information",
        description: "Create a patient account and manage appointments from home.",
        action: "Start signup",
    },
];

const highlights = [
    {
        title: "Book Appointment",
        text: "Choose the right specialist and schedule a visit in minutes.",
    },
    {
        title: "Find Hospitals",
        text: "See departments, facilities and doctor availability in one place.",
    },
    {
        title: "Health Services",
        text: "Browse diagnostics, checkups, pharmacy and recovery support.",
    },
];

function SearchIcon({ className = "h-5 w-5" }) {
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className} aria-hidden="true">
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.5-3.5" />
        </svg>
    );
}

function ArrowIcon() {
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4" aria-hidden="true">
            <path d="M5 12h14" />
            <path d="m13 5 7 7-7 7" />
        </svg>
    );
}

function CloseIcon() {
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-7 w-7" aria-hidden="true">
            <path d="M6 6 18 18" />
            <path d="M18 6 6 18" />
        </svg>
    );
}

function Login() {
    const [identifier, setIdentifier] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [apiBaseUrl, setApiBaseUrlInput] = useState(API_BASE_URL);
    const [searchTerm, setSearchTerm] = useState("");
    const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
    const discoverRef = useRef(null);
    const searchResultsRef = useRef(null);
    const servicesRef = useRef(null);
    const supportRef = useRef(null);
    const navigate = useNavigate();

    const scrollToRef = (targetRef) => {
        targetRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    };

    useEffect(() => {
        const role = localStorage.getItem("role");
        const userId = localStorage.getItem("userId");
        setApiBaseUrlInput(getApiBaseUrl());

        if (role && userId) {
            navigate(getHomeRoute(role), { replace: true });
        }
    }, [navigate]);

    useEffect(() => {
        if (!isLoginModalOpen) return undefined;

        const handleEscape = (event) => {
            if (event.key === "Escape") {
                setIsLoginModalOpen(false);
            }
        };

        document.body.style.overflow = "hidden";
        window.addEventListener("keydown", handleEscape);

        return () => {
            document.body.style.overflow = "";
            window.removeEventListener("keydown", handleEscape);
        };
    }, [isLoginModalOpen]);

    const filteredResults = searchCatalog.filter((item) => {
        if (!searchTerm.trim()) return true;
        const query = searchTerm.toLowerCase();
        return [item.title, item.category, item.description].some((value) => value.toLowerCase().includes(query));
    });

    const openLoginModal = () => {
        setError("");
        setIsLoginModalOpen(true);
    };

    const closeLoginModal = () => {
        setError("");
        setIsLoginModalOpen(false);
    };

    const handleSearchAction = (item) => {
        if (item.title === "Patient Registration") {
            navigate("/patient-signup");
            return;
        }

        openLoginModal();
    };

    const handleLogin = async (event) => {
        event.preventDefault();
        setIsLoading(true);
        setError("");

        try {
            const res = await API.post("login/", {
                identifier,
                password,
            });

            clearSession();
            localStorage.setItem("role", res.data.role);
            localStorage.setItem("userId", String(res.data.user_id));
            localStorage.setItem("userName", res.data.name || "");
            localStorage.setItem("token", res.data.token || "");

            if (res.data.doctor_id) {
                localStorage.setItem("doctorId", String(res.data.doctor_id));
            }

            if (res.data.patient_id) {
                localStorage.setItem("patientId", String(res.data.patient_id));
            }

            setIsLoginModalOpen(false);
            navigate(getHomeRoute(res.data.role), { replace: true });
        } catch (err) {
            if (err.response?.data?.error) {
                setError(err.response.data.error);
            } else {
                setError("Cannot reach the backend server. Please make sure Django is running on port 8000.");
            }
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#f6fbff] text-slate-900">
            <div className="relative overflow-hidden bg-[linear-gradient(135deg,#eff8ff_0%,#ffffff_42%,#eefaf5_100%)]">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(14,165,233,0.16),transparent_34%),radial-gradient(circle_at_right,rgba(16,185,129,0.14),transparent_28%)]" />

                <header className="relative border-b border-slate-200/80 bg-white/80 backdrop-blur">
                    <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
                        <div>
                            <p className="text-xs font-semibold uppercase tracking-[0.36em] text-emerald-600">Hospital Care</p>
                            <h1 className="mt-1 text-2xl font-black tracking-tight text-slate-900">HMS Portal</h1>
                        </div>

                        <nav className="hidden items-center gap-8 text-sm font-medium text-slate-600 lg:flex">
                            <button type="button" onClick={() => scrollToRef(discoverRef)} className="transition hover:text-slate-950">Find a Doctor</button>
                            <button type="button" onClick={() => scrollToRef(servicesRef)} className="transition hover:text-slate-950">Services</button>
                            <button type="button" onClick={() => scrollToRef(supportRef)} className="transition hover:text-slate-950">Contact</button>
                        </nav>

                        <div className="flex items-center gap-3">
                            <button
                                type="button"
                                onClick={openLoginModal}
                                className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:text-slate-950"
                            >
                                Login
                            </button>
                            <Link
                                to="/patient-signup"
                                className="rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
                            >
                                Sign Up
                            </Link>
                        </div>
                    </div>
                </header>

                <section className="relative mx-auto max-w-7xl px-4 pb-16 pt-10 sm:px-6 lg:px-8 lg:pb-20 lg:pt-16">
                    <div className="max-w-4xl">
                        <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-white/80 px-4 py-2 text-xs font-semibold uppercase tracking-[0.28em] text-emerald-700 shadow-sm">
                            <span className="h-2 w-2 rounded-full bg-emerald-500" />
                            Trusted hospital support
                        </div>
                        <h2 className="mt-6 max-w-3xl text-4xl font-black leading-tight text-slate-950 sm:text-5xl lg:text-6xl">
                            Find doctors, services and secure patient access from one place.
                        </h2>
                        <p className="mt-5 max-w-2xl text-base leading-8 text-slate-600 sm:text-lg">
                            This homepage lets visitors explore information, search for doctors, and then open login or signup from the top-right when they are ready.
                        </p>

                        <div ref={discoverRef} className="mt-8 rounded-[28px] border border-slate-200 bg-white p-4 shadow-[0_28px_70px_-40px_rgba(15,23,42,0.35)] sm:p-5">
                            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                                <div className="flex flex-1 items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                                    <SearchIcon className="h-5 w-5 text-slate-400" />
                                    <input
                                        type="text"
                                        value={searchTerm}
                                        onChange={(event) => setSearchTerm(event.target.value)}
                                        placeholder="Search doctors, specialities, hospitals or services"
                                        className="w-full bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400 sm:text-base"
                                    />
                                </div>
                                <button
                                    type="button"
                                    onClick={() => scrollToRef(searchResultsRef)}
                                    className="rounded-2xl bg-emerald-500 px-6 py-4 text-sm font-semibold text-white transition hover:bg-emerald-600"
                                >
                                    Search Now
                                </button>
                            </div>
                            <div className="mt-4 flex flex-wrap gap-2 text-xs font-medium text-slate-500">
                                <span className="rounded-full bg-emerald-50 px-3 py-1 text-emerald-700">Doctors</span>
                                <span className="rounded-full bg-sky-50 px-3 py-1 text-sky-700">Specialities</span>
                                <span className="rounded-full bg-amber-50 px-3 py-1 text-amber-700">Hospitals</span>
                                <span className="rounded-full bg-rose-50 px-3 py-1 text-rose-700">Health packages</span>
                            </div>
                        </div>

                        <div className="mt-8 grid gap-4 sm:grid-cols-3">
                            {highlights.map((item) => (
                                <div key={item.title} className="rounded-[26px] border border-white/70 bg-white/80 p-5 shadow-[0_24px_50px_-42px_rgba(15,23,42,0.55)] backdrop-blur">
                                    <p className="text-lg font-bold text-slate-900">{item.title}</p>
                                    <p className="mt-2 text-sm leading-6 text-slate-600">{item.text}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>
            </div>

            <section ref={searchResultsRef} className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-slate-500">Search Results</p>
                        <h3 className="mt-2 text-3xl font-black tracking-tight text-slate-950">Doctor and hospital information appears here</h3>
                    </div>
                    <p className="max-w-xl text-sm leading-7 text-slate-600">
                        This is a sample discovery area. It can be connected to backend APIs in the next step to show real doctor and hospital data.
                    </p>
                </div>

                <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                    {filteredResults.map((item) => (
                        <article key={item.title} className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_25px_60px_-50px_rgba(15,23,42,0.55)] transition hover:-translate-y-1 hover:shadow-[0_35px_70px_-45px_rgba(15,23,42,0.35)]">
                            <div className="flex items-center justify-between gap-3">
                                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-600">
                                    {item.category}
                                </span>
                                <SearchIcon className="h-4 w-4 text-emerald-500" />
                            </div>
                            <h4 className="mt-5 text-2xl font-bold text-slate-950">{item.title}</h4>
                            <p className="mt-3 text-sm leading-7 text-slate-600">{item.description}</p>
                            <button
                                type="button"
                                onClick={() => handleSearchAction(item)}
                                className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-emerald-700 transition hover:text-emerald-800"
                            >
                                {item.action}
                                <ArrowIcon />
                            </button>
                        </article>
                    ))}
                </div>

                {!filteredResults.length && (
                    <div className="mt-8 rounded-[28px] border border-dashed border-slate-300 bg-white px-6 py-10 text-center">
                        <p className="text-lg font-semibold text-slate-900">No matching result found.</p>
                        <p className="mt-2 text-sm text-slate-500">Try searching by doctor name, speciality, service, or hospital keyword.</p>
                    </div>
                )}
            </section>

            <section ref={servicesRef} className="mx-auto max-w-7xl px-4 pb-14 sm:px-6 lg:px-8">
                <div className="grid gap-5 lg:grid-cols-3">
                    <div className="rounded-[30px] border border-amber-200 bg-[linear-gradient(145deg,#fff9e9_0%,#ffffff_100%)] p-6">
                        <p className="text-sm font-semibold uppercase tracking-[0.28em] text-amber-600">Appointments</p>
                        <h3 className="mt-3 text-2xl font-bold text-slate-950">Book specialist visits quickly</h3>
                        <p className="mt-3 text-sm leading-7 text-slate-600">Patients can explore specialists first and then open account access when needed.</p>
                    </div>
                    <div className="rounded-[30px] border border-sky-200 bg-[linear-gradient(145deg,#edf8ff_0%,#ffffff_100%)] p-6">
                        <p className="text-sm font-semibold uppercase tracking-[0.28em] text-sky-600">Departments</p>
                        <h3 className="mt-3 text-2xl font-bold text-slate-950">Hospitals and speciality overview</h3>
                        <p className="mt-3 text-sm leading-7 text-slate-600">Public visitors can review OPD, diagnostics, speciality, and hospital details in one place.</p>
                    </div>
                    <div ref={supportRef} className="rounded-[30px] border border-emerald-200 bg-[linear-gradient(145deg,#edfff6_0%,#ffffff_100%)] p-6">
                        <p className="text-sm font-semibold uppercase tracking-[0.28em] text-emerald-600">Patient Help</p>
                        <h3 className="mt-3 text-2xl font-bold text-slate-950">Support, signup and password recovery</h3>
                        <p className="mt-3 text-sm leading-7 text-slate-600">Top-right navigation keeps account-related actions clear and easy to find.</p>
                    </div>
                </div>
            </section>

            {isLoginModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 px-4 py-6 backdrop-blur-sm sm:px-6" onClick={closeLoginModal}>
                    <div
                        className="relative w-full max-w-2xl rounded-[30px] border border-slate-200/80 bg-white p-6 shadow-[0_45px_120px_-45px_rgba(15,23,42,0.55)] sm:p-8"
                        onClick={(event) => event.stopPropagation()}
                    >
                        <button
                            type="button"
                            onClick={closeLoginModal}
                            className="absolute right-5 top-5 text-slate-500 transition hover:text-slate-950"
                            aria-label="Close login dialog"
                        >
                            <CloseIcon />
                        </button>

                        <div className="max-w-lg">
                            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.28em] text-emerald-700">
                                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                                Login
                            </div>
                            <p className="mt-5 text-sm font-semibold uppercase tracking-[0.3em] text-slate-400">Welcome Back</p>
                            <h3 className="mt-3 text-3xl font-bold text-slate-950 sm:text-4xl">Hospital Account Access</h3>
                            <p className="mt-2 text-sm leading-7 text-slate-600">Use your email or mobile number and password to sign in securely.</p>
                        </div>

                        <form onSubmit={handleLogin} className="mt-8" autoComplete="off">
                            <div className="space-y-3">

                                <input
                                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-400 focus:bg-white"
                                    type="text"
                                    name="login_identifier"
                                    autoComplete="off"
                                    placeholder="Email or mobile number"
                                    value={identifier}
                                    onChange={(e) => setIdentifier(e.target.value)}
                                    required
                                />

                                <input
                                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-400 focus:bg-white"
                                    type="password"
                                    name="login_secret"
                                    autoComplete="new-password"
                                    placeholder="Password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                />
                            </div>

                            {error && (
                                <p className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p>
                            )}

                            <button
                                type="submit"
                                disabled={isLoading}
                                className="mt-5 w-full rounded-2xl bg-emerald-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-600 disabled:cursor-not-allowed disabled:bg-slate-400"
                            >
                                {isLoading ? "Signing in..." : "Login"}
                            </button>

                            <div className="mt-5 flex items-center justify-between gap-4 text-sm">
                                <Link to="/patient-signup" className="font-semibold text-slate-700 transition hover:text-slate-950">
                                    New patient signup
                                </Link>
                                <Link to="/forgot-password" className="font-semibold text-slate-700 transition hover:text-slate-950">
                                    Forgot password
                                </Link>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

export default Login;
