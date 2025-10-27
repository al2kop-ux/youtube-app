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

    const { query } = body;
    const { YOUTUBE_API_KEY } = context.env;

    if (!query) return jsonError('Search query is required', 400);
    if (!YOUTUBE_API_KEY) return jsonError('YouTube API key is not set', 500);

    // 3. Call the YouTube API
    const maxResults = 10;
    const apiUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(query)}&type=video&maxResults=${maxResults}&key=${YOUTUBE_API_KEY}`;

    try {
        const response = await fetch(apiUrl);
        if (!response.ok) {
            const errorText = await response.text();
            return jsonError(`YouTube API Error: ${errorText}`, response.status);
        }

        const data = await response.json();
        
        // 4. Format the response
        const videos = data.items.map(item => ({
            videoId: item.id.videoId,
            title: item.snippet.title,
            thumbnail: item.snippet.thumbnails.default.url,
            channel: item.snippet.channelTitle
        }));
        
        // 5. Return the successful response
        return new Response(JSON.stringify({ videos: videos }), {
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error) {
        return jsonError(error.message, 500);
    }
}

