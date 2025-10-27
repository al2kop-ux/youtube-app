import { YoutubeTranscript } from 'youtube-transcript';

// Helper to return a JSON error
function jsonError(message, status = 500) {
    return new Response(JSON.stringify({ error: message }), {
        status: status,
        headers: { 'Content-Type': 'application/json' }
    });
}

// Cloudflare's generic 'onRequest' handler
export async function onRequest(context) {
    // 1. Check for POST method
    if (context.request.method !== 'POST') {
        return new Response('Method Not Allowed', { status: 405 });
    }

    // 2. Safely parse the request body
    let body;
    try {
        body = await context.request.json();
    } catch (e) {
        return jsonError('Invalid JSON body', 400);
    }

    const { url } = body;
    if (!url) {
        return jsonError('URL is required', 400);
    }

    // 3. Fetch the transcript
    try {
        const transcriptItems = await YoutubeTranscript.fetch(url);
        const transcript = transcriptItems.map(item => item.text).join(' ');
        
        // 4. Return the successful response
        return new Response(JSON.stringify({ transcript: transcript }), {
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (error) {
        let errorMessage = "Could not fetch transcript.";
        if (error.message) {
            errorMessage = error.message;
        }
        // Check for common youtube-transcript errors
        if (errorMessage.includes("disabled")) {
            errorMessage = "Transcripts are disabled for this video.";
        }
        if (errorMessage.includes("no transcript")) {
             errorMessage = "No transcript found for this video.";
        }
        return jsonError(errorMessage, 500);
    }
}

