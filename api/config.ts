export const baseUrl = 'https://dev-allon-backend.onrender.com/api';

/** Origine du backend sans `/api` — Socket.IO est monté sur la racine HTTP(S). */
export const socketBaseUrl = baseUrl.replace(/\/api\/?$/, '');