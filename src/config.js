// FarmGuard dynamic global config
const isSecure = window.location.protocol === 'https:';
const apiProtocol = isSecure ? 'https:' : 'http:';
const wsProtocol = isSecure ? 'wss:' : 'ws:';

const envApiUrl = import.meta.env.VITE_API_URL;
export const API_URL = (envApiUrl && envApiUrl !== 'undefined' && envApiUrl !== 'null') ? envApiUrl : 'https://backend-8-yt04.onrender.com';

const envWsUrl = import.meta.env.VITE_WS_URL;
export const WS_URL = (envWsUrl && envWsUrl !== 'undefined' && envWsUrl !== 'null') ? envWsUrl : 'wss://backend-8-yt04.onrender.com';
