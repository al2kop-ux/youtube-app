const { YoutubeTranscript } = require('youtube-transcript');

exports.handler = async (event) => {
    const { url } = JSON.parse(event.body);
    if (!url) {
        return { statusCode: 400, body: JSON.stringify({ error: 'No URL provided' }) };
    }

    try {
        // === FIX ===
        // Reverted to the correct and standard .fetch() method.
        // This method handles finding available transcripts (including auto-generated).
        const transcriptItems = await YoutubeTranscript.fetch(url);
        // === END OF FIX ===
        
        if (!transcriptItems || transcriptItems.length === 0) {
            throw new Error("This video doesn't have any transcripts available.");
        }
        
        const transcriptText = transcriptItems.map(item => item.text).join(' ');
        
        return {
            statusCode: 200,
            body: JSON.stringify({ transcript: transcriptText })
        };

    } catch (error) {
        console.error("Raw error object:", error); // Log the full error on the server
        
        let detailedErrorMessage;

        if (error instanceof Error) {
            // It's a standard error object
            detailedErrorMessage = error.message;
        } else if (typeof error === 'string') {
            // The library threw a plain string
            detailedErrorMessage = error;
        } else {
            // It's something else, maybe an object?
            try {
                detailedErrorMessage = JSON.stringify(error);
            } catch (e) {
                detailedErrorMessage = "An un-stringifiable error occurred.";
            }
        }

        // Now, try to make it user-friendly, but default to the detailed message
        let userMessage = detailedErrorMessage;
        if (detailedErrorMessage.includes("transcripts are disabled")) {
            userMessage = "Transcripts are disabled for this video.";
        } else if (detailedErrorMessage.includes("No transcripts available")) {
            userMessage = "This video doesn't have any transcripts available.";
        } else if (detailedErrorMessage.includes("private")) {
            userMessage = "This video is private or unavailable.";
        } else if (detailedErrorMessage.includes("404")) {
            userMessage = "This video could not be found (404 Error).";
        }
        
        console.error("Sending back error:", userMessage);
        
        return {
            statusCode: 500,
            body: JSON.stringify({ error: userMessage }) // Send the detailed, raw message
        };
    }
};

