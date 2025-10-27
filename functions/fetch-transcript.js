// This file is in the "broken" state you requested for debugging.
// It fails with "YoutubeTranscript.fetch is not a function".

// This import is incorrect, causing the runtime error.
const YoutubeTranscript = require('youtube-transcript');

// Helper to return a JSON error
function jsonError(message, status = 500) {
    return new Response(JSON.stringify({ error: message }), {
        status: status,
        headers: { 'Content-Type': 'application/json' },
    });
}

// Cloudflare's native POST handler for Pages
export async function onRequestPost(context) {
    // Top-level try...catch
    try {
        const { url } = await context.request.json();

        if (!url) {
            return jsonError('URL is required', 400);
        }

        // This line will fail at runtime
        const transcriptItems = await YoutubeTranscript.fetch(url);
        
        const transcriptText = transcriptItems.map(item => item.text).join(' ');

        return new Response(JSON.stringify({ transcript: transcriptText }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
        });

    } catch (error) {
        let errorMessage = "An unknown error occurred";
        if (error instanceof Error) {
            errorMessage = error.message;
        }
        return jsonError(`[Transcript Function Error]: ${errorMessage}`, 500);
    }
}

