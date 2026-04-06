import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Capacitor } from "@capacitor/core";
import MobileApiSettings from "../components/MobileApiSettings";

import API, {
    API_BASE_URL,
    clearSession,
    getApiBaseUrl,
    getHomeRoute,
    resetApiBaseUrl,
    setApiBaseUrl,
} from "../services/api";

function Login() {
    const [identifier, setIdentifier] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [apiBaseUrl, setApiBaseUrlInput] = useState(API_BASE_URL);
    const navigate = useNavigate();
    const isNativeApp = Capacitor.isNativePlatform();

    useEffect(() => {
        const role = localStorage.getItem("role");
        const userId = localStorage.getItem("userId");
        setApiBaseUrlInput(getApiBaseUrl());

        if (role && userId) {
            navigate(getHomeRoute(role), { replace: true });
        }
    }, [navigate]);

    const handleSaveApiUrl = () => {
        setApiBaseUrl(apiBaseUrl);
        setApiBaseUrlInput(getApiBaseUrl());
        setError("");
    };

    const handleResetApiUrl = () => {
        resetApiBaseUrl();
        setApiBaseUrlInput(API_BASE_URL);
        setError("");
    };

    const handleLogin = async (event) => {
        event.preventDefault();
        setIsLoading(true);
        setError("");

        if (isNativeApp) {
            setApiBaseUrl(apiBaseUrl);
        }

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
        <div className="flex min-h-screen items-center justify-center bg-[#0b1120] px-4 py-8">
            <div className="grid w-full max-w-5xl overflow-hidden rounded-[28px] border border-slate-800 bg-[#101827] shadow-[0_45px_120px_-55px_rgba(15,23,42,0.95)] md:grid-cols-[1.08fr_0.92fr]">
                <div className="hidden border-r border-slate-800 bg-[#0f172a] p-8 text-white md:block">
                    <p className="text-sm uppercase tracking-[0.35em] text-slate-300">Hospital Management</p>
                    <h1 className="mt-6 max-w-lg text-4xl font-black leading-tight">Hospital Login</h1>

                    <div className="mt-8 grid gap-3">
                        <div className="rounded-2xl border border-slate-800 bg-[#111c2d] px-4 py-3">
                            <p className="text-xs uppercase tracking-[0.28em] text-slate-300">Admin</p>
                        </div>
                        <div className="rounded-2xl border border-slate-800 bg-[#111c2d] px-4 py-3">
                            <p className="text-xs uppercase tracking-[0.28em] text-slate-300">Front Desk</p>
                        </div>
                        <div className="rounded-2xl border border-slate-800 bg-[#111c2d] px-4 py-3">
                            <p className="text-xs uppercase tracking-[0.28em] text-slate-300">Doctor</p>
                        </div>
                        <div className="rounded-2xl border border-slate-800 bg-[#111c2d] px-4 py-3">
                            <p className="text-xs uppercase tracking-[0.28em] text-slate-300">Patient</p>
                        </div>
                    </div>
                </div>

                <form onSubmit={handleLogin} className="bg-[#111827] p-6 text-white sm:p-8">
                    <div className="inline-flex items-center gap-2 rounded-full border border-slate-700 bg-slate-800/80 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-200">
                        <span className="h-2 w-2 rounded-full bg-slate-300" />
                        Login
                    </div>
                    <p className="mt-5 text-sm font-semibold uppercase tracking-[0.3em] text-slate-500">Welcome Back</p>
                    <h2 className="mt-3 text-3xl font-bold text-white">HMS Login</h2>
                    <p className="mt-2 text-sm text-slate-400">Use email or mobile number and password.</p>

                    <div className="mt-6 space-y-3">
                        {isNativeApp && (
                            <MobileApiSettings
                                apiBaseUrl={apiBaseUrl}
                                onApiBaseUrlChange={setApiBaseUrlInput}
                                onSave={handleSaveApiUrl}
                                onReset={handleResetApiUrl}
                            />
                        )}

                        <input
                            className="w-full rounded-xl border border-white/10 bg-[#0f1b31] px-4 py-3 text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-400 focus:bg-[#12213a]"
                            
                            type="text"
                            placeholder="Email or mobile number"
                            value={identifier}
                            onChange={(e) => setIdentifier(e.target.value)}
                            required
                        />

                        <input
                            className="w-full rounded-xl border border-white/10 bg-[#0f1b31] px-4 py-3 text-white outline-none transition placeholder:text-slate-500 focus:border-slate-500 focus:bg-[#152033]"
                            type="password"
                            placeholder="Password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                    </div>

                    {error && (
                        <p className="mt-4 rounded-xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">{error}</p>
                    )}

                    <button
                        type="submit"
                        disabled={isLoading}
                        className="mt-5 w-full rounded-xl bg-slate-100 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-white disabled:cursor-not-allowed disabled:bg-slate-500 disabled:text-slate-200"
                    >
                        {isLoading ? "Signing in..." : "Login"}
                    </button>

                    <div className="mt-4 flex items-center justify-between gap-4 text-sm text-slate-400">
                        <Link to="/patient-signup" className="font-semibold text-slate-300 transition hover:text-white">
                            New patient signup
                        </Link>
                        <Link to="/forgot-password" className="font-semibold text-slate-300 transition hover:text-white">
                            Forgot password
                        </Link>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default Login;
