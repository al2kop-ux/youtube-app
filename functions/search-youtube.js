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
            // NEW: Send Google's error message directly to the user
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
        
        // NEW: Check if the response is successful but has no items.
        // If so, send the raw response back as an error so we can inspect it.
        if (!data.items || data.items.length === 0) {
            // If we get no items, it might be a quota issue or just no results.
            // Let's send the raw response back as an error message for debugging.
            const rawResponseText = JSON.stringify(data, null, 2);
            return jsonError(`No items found. Full API Response: ${rawResponseText}`, 404);
        }
        
        // Success! Send the data back.
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

