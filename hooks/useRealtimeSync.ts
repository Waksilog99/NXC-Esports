import { useEffect } from 'react';
import { GET_API_BASE_URL } from '../utils/apiUtils';

const API_BASE_URL = GET_API_BASE_URL();

/**
 * Hook to synchronize client data with the database in real-time.
 * It connects to the /api/realtime SSE endpoint and dispatches a
 * custom event 'nxc-db-refresh' whenever a change is detected.
 */
export const useRealtimeSync = () => {
    useEffect(() => {
        console.log('[Realtime] Initializing sync listener...');

        let eventSource: EventSource | null = null;
        let retryCount = 0;
        const maxRetries = 5;

        const connect = () => {
            if (eventSource) {
                eventSource.close();
            }

            // Create EventSource connection
            // Note: SSE works over HTTP, so we use the same API base URL
            const url = `${API_BASE_URL}/api/realtime`;
            eventSource = new EventSource(url);

            eventSource.onopen = () => {
                console.log('[Realtime] Signal established.');
                retryCount = 0;
            };

            eventSource.onmessage = (event) => {
                if (event.data === 'refresh') {
                    console.log('[Realtime] DB change detected. Dispatching global refresh signal...');
                    window.dispatchEvent(new CustomEvent('nxc-db-refresh'));
                }
            };

            eventSource.onerror = (err) => {
                console.error('[Realtime] Signal lost:', err);
                eventSource?.close();

                if (retryCount < maxRetries) {
                    retryCount++;
                    const delay = Math.min(1000 * Math.pow(2, retryCount), 30000);
                    console.log(`[Realtime] Retrying in ${delay}ms...`);
                    setTimeout(connect, delay);
                } else {
                    console.warn('[Realtime] Max retries reached. Real-time updates disabled.');
                }
            };
        };

        connect();

        return () => {
            console.log('[Realtime] Terminating sync listener.');
            eventSource?.close();
        };
    }, []);
};
