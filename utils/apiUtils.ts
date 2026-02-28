import { Capacitor } from '@capacitor/core';

/**
 * Dynamically determines the API Base URL.
 * - If running on mobile (Capacitor), it uses the host machine's IP as a fallback for localhost.
 * - If running on web, it uses the environment variable or window.location.origin.
 */
export const GET_API_BASE_URL = () => {
    const envUrl = import.meta.env.VITE_API_BASE_URL;

    // If not on mobile, just return the environment variable or origin
    if (!Capacitor.isNativePlatform()) {
        return envUrl || window.location.origin;
    }

    // On Mobile:
    // 192.168.100.4 is the host machine's IP
    // 10.0.2.2 is the special alias for the host machine in Android Emulators
    const hostIp = '192.168.100.4';

    // If the URL is localhost, or if it's missing, point to the host IP
    if (!envUrl || envUrl.includes('localhost') || envUrl.includes('127.0.0.1')) {
        return `http://${hostIp}:3001`;
    }

    return envUrl;
};
