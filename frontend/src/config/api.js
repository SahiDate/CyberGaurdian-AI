// Central API Base URL
// In development with Vite proxy or in production unified container, empty string '' sends relative requests to the same origin.
// If an external backend URL is specified via VITE_API_URL, it uses that instead.
export const API_BASE = (import.meta.env.VITE_API_URL || '').replace(/\/+$/, '');
export default API_BASE;
