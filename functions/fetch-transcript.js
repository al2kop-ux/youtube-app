// Helper to return a JSON error
function jsonError(message, status = 500) {
    return new Response(JSON.stringify({ error: message }), {
        status: status,
        headers: { 'Content-Type': 'application/json' },
    });
}

// Cloudflare's native POST handler for Pages
export async function onRequestPost(context) {
    // Top-level try...catch to ensure a JSON response is always sent
    try {
        // Dynamically import the ESM-only youtube-transcript library
        // Note: We access .default because it's a default export
        const YoutubeTranscript = (await import('youtube-transcript')).default;
        
        const { url } = await context.request.json();
        if (!url) {
            return jsonError('URL is required', 400);
        }

        // Use the simple fetch method
        const transcriptItems = await YoutubeTranscript.fetch(url);

        if (!transcriptItems || transcriptItems.length === 0) {
            throw new Error('No transcript found or transcript is empty.');
        }

        // Join the text
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

