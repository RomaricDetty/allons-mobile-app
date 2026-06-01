// export const baseUrl = 'https://dev-allon-backend.onrender.com/api';
export const baseUrl = 'https://api.allon-apps.com';

/** Origine du backend sans `/api` — Socket.IO est monté sur la racine HTTP(S). */
export const socketBaseUrl = baseUrl.replace(/\/api\/?$/, '');
