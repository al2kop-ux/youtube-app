import YoutubeTranscript from 'youtube-transcript';

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
            const { url } = await request.json();
            if (!url) {
                return jsonError('URL is required', 400);
            }

            const transcriptItems = await YoutubeTranscript.fetch(url);

            if (!transcriptItems || transcriptItems.length === 0) {
                throw new Error('No transcript found or transcript is empty.');
            }

            const transcript = transcriptItems.map(item => item.text).join(' ');

            return new Response(JSON.stringify({ transcript: transcript }), {
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
            return jsonError(`[Transcript Function Error]: ${errorMessage}`, 500);
        }
    }
}

