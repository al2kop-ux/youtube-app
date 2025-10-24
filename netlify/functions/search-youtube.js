// This function securely calls the YouTube Data API
exports.handler = async (event) => {
    // 1. Get the search query from the app
    const { query } = JSON.parse(event.body);
    if (!query) {
        return { statusCode: 400, body: JSON.stringify({ error: 'No search query provided' }) };
    }

    // 2. Get your *new* YouTube API key from Netlify's settings
    const apiKey = process.env.YOUTUBE_API_KEY;
    if (!apiKey) {
        return { statusCode: 500, body: JSON.stringify({ error: 'YouTube API key is not configured' }) };
    }

    // 3. Call the YouTube Search API
    const maxResults = 5;
    const apiUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(query)}&type=video&maxResults=${maxResults}&key=${apiKey}`;

    try {
        const response = await fetch(apiUrl);
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(`YouTube API Error: ${errorData.error.message}`);
        }

        const data = await response.json();

        // 4. Format the results to be simple and clean
        const videos = data.items.map(item => ({
            videoId: item.id.videoId,
            title: item.snippet.title,
            channel: item.snippet.channelTitle,
            thumbnail: item.snippet.thumbnails.default.url,
            url: `https://www.youtube.com/watch?v=${item.id.videoId}`
        }));

        // 5. Send the list of videos back to the app
        return {
            statusCode: 200,
            body: JSON.stringify({ videos })
        };

    } catch (error) {
        console.error(error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: error.message })
        };
    }
};
