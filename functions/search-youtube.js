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

        // --- NEW DEBUG LOG ---
        // This will print the exact URL to your Cloudflare function logs
        console.log("Attempting to fetch YouTube API URL:", apiUrl);
        // --- END DEBUG LOG ---

        const response = await fetch(apiUrl);

        if (!response.ok) {
            // Log the error response from Google
            const errorText = await response.text();
            console.error("YouTube API Error:", errorText);
            throw new Error(`YouTube API Error: ${errorText}`);
        }

        const data = await response.json();
        
        // Log the response data
        console.log("YouTube API Response:", JSON.stringify(data, null, 2));

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
        console.error("[Search Function Error]:", errorMessage);
        return jsonError(`[Search Function Error]: ${errorMessage}`, 500);
    }
}

