// Helper to return a JSON error
function jsonError(message, status = 500) {
    return new Response(JSON.stringify({ error: message }), {
        status: status,
        headers: { 'Content-Type': 'application/json' },
    });
}

// Cloudflare's native ESM handler
export default {
    async fetch(request, env, context) {
        // We only handle POST requests
        if (request.method !== 'POST') {
            return jsonError('Method Not Allowed', 405);
        }
        
        // Top-level try...catch
        try {
            const { query } = await request.json();
            const { YOUTUBE_API_KEY } = env;

            if (!query) {
                return jsonError('Query is required', 400);
            }
            if (!YOUTUBE_API_KEY) {
                return jsonError('YouTube API key is not set', 500);
            }

            const apiUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(query)}&type=video&key=${YOUTUBE_API_KEY}&maxResults=10`;

            const response = await fetch(apiUrl);

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`YouTube API Error: ${errorText}`);
            }

            const data = await response.json();
            
            return new Response(JSON.stringify(data), {
                status: 200,
                headers: { 'Content-Type': 'application/json' },
            });

        } catch (error) {
            let errorMessage = "An unknown error occurred";
            if (error instanceof Error) {
                errorMessage = error.message;
            } else if (typeof error === 'string') {
                errorMessage = error;
            } else {
                try {
                    errorMessage = JSON.stringify(error);
                } catch (e) {
                    errorMessage = "An un-stringifiable error object was caught.";
                }
            }
            return jsonError(`[Search Function Error]: ${errorMessage}`, 500);
        }
    }
}

