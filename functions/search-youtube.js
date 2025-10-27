// Helper to return a JSON error
function jsonError(message, status = 500) {
    return new Response(JSON.stringify({ error: message }), {
        status: status,
        headers: { 'Content-Type': 'application/json' },
    });
}

// Cloudflare's native POST handler for Pages
// This version was correctly fetching search results.
export async function onRequestPost(context) {
    // Top-level try...catch
    try {
        const { query } = await context.request.json();
        const { YOUTUBE_API_KEY } = context.env;

        if (!query) {
            return jsonError('Query is required', 400);
        }
        if (!YOUTUBE_API_KEY) {
            return jsonError('YouTube API key is not set', 500);
        }

        const apiUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(query)}&type=video&key=${YOUTUBE_API_KEY}&maxResults=10`;

        const response = await fetch(apiUrl);

        if (!response.ok) {
            // Send Google's error message directly to the user
            let googleError = await response.text();
            try {
                // Try to parse it as JSON for a cleaner message
                const errorJson = JSON.parse(googleError);
                googleError = errorJson.error.message || googleError;
            } catch (e) {
                // It's not JSON, just send the text
            }
            // Return the error so the user can see it in the app's error box
            return jsonError(`YouTube API Error: ${googleError}`, response.status);
        }

        const data = await response.json();
        
        // This is the original, simple success logic
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
        // Log the final error
        return jsonError(`[Search Function Error]: ${errorMessage}`, 500);
    }
}

