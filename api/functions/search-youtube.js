// This is the serverless function for YouTube Search
// It uses the built-in 'fetch', so it has no special dependencies.

exports.handler = async (event) => {
    // 1. Get the search query from the app
    const { query } = JSON.parse(event.body);

    // 2. Get your *YouTube* API key from environment variables
    const apiKey = process.env.YOUTUBE_API_KEY;

    if (!apiKey) {
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'YouTube API key is not set.' })
        };
    }

    // 3. Construct the API URL
    const maxResults = 10;
    const apiUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(query)}&type=video&maxResults=${maxResults}&key=${apiKey}`;

    try {
        // 4. Call the YouTube Data API
        const response = await fetch(apiUrl);
        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error.message || 'Failed to fetch from YouTube API');
        }

        // 5. Format the results for our app
        const videos = data.items.map(item => ({
            videoId: item.id.videoId,
            title: item.snippet.title,
            channel: item.snippet.channelTitle,
            thumbnail: item.snippet.thumbnails.default.url
        }));

        // 6. Send the results back to the app
        return {
            statusCode: 200,
            body: JSON.stringify({ videos: videos })
        };

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
        
        return {
            statusCode: 500,
            body: JSON.stringify({ error: errorMessage })
        };
    }
};

