const { YoutubeTranscript } = require('youtube-transcript');

exports.handler = async (event) => {
    // Top-level try...catch to ensure a JSON response is always sent
    try {
        const { url } = JSON.parse(event.body);
        if (!url) {
            return {
                statusCode: 400,
                body: JSON.stringify({ error: 'Missing URL parameter' })
            };
        }

        // Use the simple fetch method
        const transcriptItems = await YoutubeTranscript.fetch(url);

        if (!transcriptItems || transcriptItems.length === 0) {
            throw new Error('No transcript found or transcript is empty.');
        }

        // Join the text
        const transcript = transcriptItems.map(item => item.text).join(' ');

        return {
            statusCode: 200,
            body: JSON.stringify({ transcript: transcript })
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
            body: JSON.stringify({ error: `[Transcript Function Error]: ${errorMessage}` })
        };
    }
};
