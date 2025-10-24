const { YoutubeTranscript } = require('youtube-transcript');

exports.handler = async (event) => {
    // 1. Get the URL from the request
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: JSON.stringify({ error: 'Method Not Allowed' }) };
    }

    let url;
    try {
        const body = JSON.parse(event.body);
        url = body.url;
        if (!url) {
            throw new Error('No URL provided');
        }
    } catch (e) {
        return { statusCode: 400, body: JSON.stringify({ error: 'Invalid request: No URL provided' }) };
    }

    // 2. Fetch the transcript
    try {
        const transcriptItems = await YoutubeTranscript.fetchTranscript(url);
        
        if (!transcriptItems || transcriptItems.length === 0) {
            return { statusCode: 404, body: JSON.stringify({ error: 'No transcript found for this video. It might be disabled.' }) };
        }
        
        // 3. Combine the text
        const transcriptText = transcriptItems.map(item => item.text).join(' ');

        // 4. Send it back
        return {
            statusCode: 200,
            body: JSON.stringify({ transcript: transcriptText })
        };

    } catch (error) {
        console.error(error);
        // Handle common error from the library
        if (error.message.includes('subtitles disabled')) {
             return { statusCode: 404, body: JSON.stringify({ error: 'Transcripts are disabled for this video.' }) };
        }
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Failed to fetch transcript. ' + error.message })
        };
    }
};
