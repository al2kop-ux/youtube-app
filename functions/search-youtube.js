export async function onRequestPost(context) {
    try {
        const { query } = await context.request.json();
        
        // Get API key from Cloudflare environment variables
        const apiKey = context.env.YOUTUBE_API_KEY;

        if (!apiKey) {
            return new Response(JSON.stringify({ error: 'YouTube API key is not set.' }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        const maxResults = 10;
        const apiUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(query)}&type=video&maxResults=${maxResults}&key=${apiKey}`;

        const response = await fetch(apiUrl);
        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error.message || 'Failed to fetch from YouTube API');
        }

        const videos = data.items.map(item => ({
            videoId: item.id.videoId,
            title: item.snippet.title,
            channel: item.snippet.channelTitle,
            thumbnail: item.snippet.thumbnails.default.url
        }));

        return new Response(JSON.stringify({ videos: videos }), {
            headers: { 'Content-Type': 'application/json' },
        });

    } catch (error) {
        return new Response(JSON.stringify({ error: `[Search Function Error]: ${error.message}` }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }
}
