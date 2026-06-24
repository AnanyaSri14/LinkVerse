import axios from "axios";

export const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:9090";
export const ACCESS_TOKEN_KEY = "token";
export const REFRESH_TOKEN_KEY = "refreshToken";

export const getUploadUrl = (fileName = "default.jpg") => {
  return `${BASE_URL}/uploads/${fileName || "default.jpg"}`;
};

export const applyAvatarFallback = (event) => {
  if (event.currentTarget.dataset.fallbackApplied === "true") {
    return;
  }

  event.currentTarget.dataset.fallbackApplied = "true";
  event.currentTarget.src = getUploadUrl("default.jpg");
};

export const hideBrokenMedia = (event) => {
  event.currentTarget.style.display = "none";
};

export const getAccessToken = () => {
  if (typeof window === "undefined") {
    return "";
  }

  return localStorage.getItem(ACCESS_TOKEN_KEY) || "";
};

export const getRefreshToken = () => {
  if (typeof window === "undefined") {
    return "";
  }

  return localStorage.getItem(REFRESH_TOKEN_KEY) || "";
};

export const setStoredAuth = ({ accessToken, refreshToken }) => {
  if (typeof window === "undefined") {
    return;
  }

  if (accessToken) {
    localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
  }

  if (refreshToken) {
    localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
  }
};

export const clearStoredAuth = () => {
  if (typeof window === "undefined") {
    return;
  }

  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
};

export const clientServer = axios.create({
  baseURL: BASE_URL
});

const refreshClient = axios.create({
  baseURL: BASE_URL
});

let refreshPromise = null;

clientServer.interceptors.request.use((config) => {
  const token = getAccessToken();

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

clientServer.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (
      error.response?.status === 401 &&
      !originalRequest?._retry &&
      getRefreshToken()
    ) {
      originalRequest._retry = true;

      try {
        refreshPromise =
          refreshPromise ||
          refreshClient
            .post("/auth/refresh-token", {
              refreshToken: getRefreshToken()
            })
            .then((response) => {
              setStoredAuth(response.data.data);
              return response.data.data.accessToken;
            })
            .finally(() => {
              refreshPromise = null;
            });

        const newAccessToken = await refreshPromise;
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;

        return clientServer(originalRequest);
      } catch (refreshError) {
        clearStoredAuth();

        if (
          typeof window !== "undefined" &&
          window.location.pathname !== "/login"
        ) {
          window.location.href = "/login";
        }

        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);
