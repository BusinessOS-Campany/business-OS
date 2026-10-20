let _apiBase = "http://192.168.219.1:3000/api";
let _authToken = null;
const API_PORT = 3000;

function getApiBase() {
  if (typeof document !== "undefined") {
    return `http://localhost:${API_PORT}/api`;
  }
  return _apiBase;
}

export function setApiBase(url) {
  _apiBase = url;
}

export function setAuthToken(token) {
  _authToken = token;
}

export async function api(path, options = {}) {
  const headers = { "Content-Type": "application/json", ...options.headers };
  if (_authToken) headers.Authorization = `Bearer ${_authToken}`;
  const res = await fetch(`${getApiBase()}${path}`, { ...options, headers });
  if (res.status === 204) return null;
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return data;
}

export function formatPrice(priceYer, currency = "yer") {
  if (currency === "usd") return (priceYer / 535).toFixed(2);
  if (currency === "sar") return (priceYer / 535 * 3.75).toFixed(2);
  return priceYer.toFixed(2);
}

export const currencyLabel = { yer: "ريال", usd: "$", sar: "رس" };
