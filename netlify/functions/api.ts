import serverless from 'serverless-http';
import app from '../../server/index.js';

// serverless-http wraps the Express app. Netlify calls this function
// with the event path stripped of the function prefix. We need to
// reattach /api to the path so Express routes match correctly.
const handler = serverless(app, {
    request(req: any) {
        // Netlify strips /.netlify/functions/api from the path.
        // The original request was /api/..., so we restore the /api prefix.
        if (!req.url.startsWith('/api')) {
            req.url = '/api' + (req.url || '/');
        }
    }
});

export { handler };
