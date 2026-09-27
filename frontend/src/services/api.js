import axios from "axios";

const ensureTrailingSlash = (url) => (url.endsWith("/") ? url : `${url}/`);
const API_URL_STORAGE_KEY = "apiBaseUrl";

const browserHost =
    typeof window !== "undefined" && window.location?.hostname
        ? window.location.hostname
        : "127.0.0.1";
const isLocalBrowser = ["localhost", "127.0.0.1"].includes(browserHost);
const envWebApiUrl = process.env.REACT_APP_API_URL;
const webHost = browserHost === "localhost" ? "127.0.0.1" : browserHost;
const webApiUrl = isLocalBrowser
  ? "http://127.0.0.1:8000/api/"
  : "https://hms-backend-2z7m.onrender.com/api/";

const defaultApiBaseUrl = ensureTrailingSlash(webApiUrl);

export const getApiBaseUrl = () => {
    if (typeof window === "undefined") {
        return defaultApiBaseUrl;
    }

    const storedUrl = window.localStorage.getItem(API_URL_STORAGE_KEY);
    return storedUrl ? ensureTrailingSlash(storedUrl) : defaultApiBaseUrl;
};

export const setApiBaseUrl = (url) => {
    if (typeof window === "undefined") {
        return;
    }

    if (!url?.trim()) {
        window.localStorage.removeItem(API_URL_STORAGE_KEY);
        return;
    }

    window.localStorage.setItem(API_URL_STORAGE_KEY, ensureTrailingSlash(url.trim()));
};

export const resetApiBaseUrl = () => {
    if (typeof window === "undefined") {
        return;
    }

    window.localStorage.removeItem(API_URL_STORAGE_KEY);
};

export const API_BASE_URL = defaultApiBaseUrl;

const API = axios.create({
    baseURL: defaultApiBaseUrl,
});

API.interceptors.request.use((req) => {
    const userId = localStorage.getItem("userId");
    const token = localStorage.getItem("token");

    req.baseURL = getApiBaseUrl();

    if (userId) {
        req.headers["X-User-Id"] = userId;
    }
    if (token) {
        req.headers.Authorization = `Token ${token}`;
    }

    return req;
});

export const clearSession = () => {
    localStorage.removeItem("role");
    localStorage.removeItem("userId");
    localStorage.removeItem("userName");
    localStorage.removeItem("patientId");
    localStorage.removeItem("doctorId");
    localStorage.removeItem("token");
};

export const getHomeRoute = (role) => {
    if (role === "admin") return "/dashboard";
    if (role === "frontdesk") return "/frontdesk-dashboard";
    if (role === "doctor") return "/doctor-dashboard";
    if (role === "patient") return "/patient-dashboard";
    return "/";
};

export const buildApiUrl = (path = "") => `${API_BASE_URL}${path}`;

export default API;
