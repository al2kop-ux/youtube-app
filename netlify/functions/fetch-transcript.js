const { YoutubeTranscript } = require('youtube-transcript');

exports.handler = async (event) => {
    const { url } = JSON.parse(event.body);
    if (!url) {
        return { statusCode: 400, body: JSON.stringify({ error: 'No URL provided' }) };
    }

    try {
        // === UPDATED 2-STEP LOGIC ===
        // 1. Get a list of all available transcripts (including auto-generated)
        const transcriptsList = await YoutubeTranscript.listTranscripts(url);
        if (!transcriptsList || transcriptsList.length === 0) {
            throw new Error("This video doesn't have any transcripts available.");
        }

        // 2. Fetch the first transcript from the list
        const transcriptItems = await transcriptsList[0].fetch();
        // === END OF UPDATE ===
        
        const transcriptText = transcriptItems.map(item => item.text).join(' ');
        
        return {
            statusCode: 200,
            body: JSON.stringify({ transcript: transcriptText })
        };

    } catch (error) {
        console.error(error); // Log the full error on the server
        
        // Send the specific error message from the library back to the user
        let errorMessage = error.message || "An unknown error occurred while fetching the transcript.";

        // Make the error messages more user-friendly
        if (error.message.includes("transcripts are disabled")) {
            errorMessage = "Transcripts are disabled for this video.";
        } else if (error.message.includes("No transcripts available")) {
             errorMessage = "This video doesn't have any transcripts available.";
        } else if (error.message.includes("private")) {
            errorMessage = "This video is private or unavailable.";
        } else if (error.message.includes("404")) {
            errorMessage = "This video could not be found (404 Error)."
        }
        
        return {
            statusCode: 500,
            body: JSON.stringify({ error: errorMessage })
        };
    }
};

