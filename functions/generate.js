const { YoutubeTranscript } = require('youtube-transcript');

// Helper to return a JSON error
function jsonError(message, status = 500) {
    return new Response(JSON.stringify({ error: message }), {
        status: status,
        headers: { 'Content-Type': 'application/json' },
    });
}

// Helper to fetch and format a single transcript
async function fetchTranscript(url) {
    try {
        const transcriptItems = await YoutubeTranscript.fetch(url);
        return transcriptItems.map(item => item.text).join(' ');
    } catch (error) {
        console.error(`Failed to fetch transcript for ${url}: ${error.message}`);
        return `[Transcript for ${url} failed to load: ${error.message}]`;
    }
}

// Cloudflare's native POST handler
export async function onRequestPost(context) {
    // Top-level try...catch to ensure a JSON response is always sent
    try {
        // Safely parse the request body
        let body;
        try {
            body = await context.request.json();
        } catch (e) {
            return jsonError('Invalid JSON body', 400);
        }

        const { topic, persona, urls } = body;
        
        // Get environment variables from Cloudflare
        const { GEMINI_API_KEY } = context.env;

        if (!topic) return jsonError('Video Topic is required', 400);
        if (!GEMINI_API_KEY) return jsonError('GEMINI_API_KEY is not set', 500);

        // --- Build Persona Intro ---
        let personaIntro = "You are a professional YouTube scriptwriter.";
        if (persona === 'korona') {
            personaIntro = `
                You are Michael, the CMO at KORONA POS. You help retailers run smoother, more profitable stores.
                Your Trust Introduction MUST be:
                "Hey, I’m Michael — I’m the CMO at KORONA POS. We help thousands of retailers all across the US run smoother, more profitable retail stores — from mom and pop coffee shops to multi-location retail chains. I’ve been in the retail tech game for years, and in this video, I'm about to show you how to ${topic}."
                Do not add any other text to the Trust Introduction.
            `;
        } else if (persona === 'verticulate') {
            personaIntro = `
                You are Mihkel, the founder at Verticulate. You help clients eliminate waste in their processes with AI and automation.
                Your Trust Introduction MUST be:
                "So hey, I’m Mihkel. I’m the founder at Verticulate. We’ve helped tens of clients globally - from startups all the way to enterprises - eliminate waste in their processes by implementing better systems and workflow automations with AI, saving thousands of hours in the process. In this video, I'm about to show you how to ${topic}."
                Do not add any other text to the Trust Introduction.
            `;
        }

        // --- Fetch Transcripts ---
        let sourceMaterial = 'No source material provided.';
        if (urls && urls.length > 0) {
            const validUrls = urls.filter(url => url && url.trim() !== '');
            if (validUrls.length > 0) {
                const transcripts = await Promise.all(
                    validUrls.map(url => fetchTranscript(url))
                );
                sourceMaterial = transcripts.join('\n\n---\n\n');
            }
        }

        // --- Build the Prompt for Gemini ---
        const systemPrompt = `
            ${personaIntro}
            
            Your task is to generate a detailed YouTube script outline based on the user's topic and provided source material. You MUST format your response in clean, semantic HTML.
            
            - Use <h2> for main sections (Hook, Trust Introduction, Body, etc.).
            - Use <h3> for sub-sections (e.g., Section 1, Part 1, Step 2a).
            - Use <p> for paragraphs.
            - Use <ul> and <li> for bullet points.
            - Use <strong> for emphasis on things like 'DO:', 'DON’T:', and 'Visuals:'.
            - Use <em> or <i> for italicized notes like *Add b-roll...*.
            
            Your response MUST follow this exact structure:
            
            <div>
                <h2>Hook - (First 15-30 seconds)</h2>
                <p><strong>Example Hook:</strong> [Generate a compelling 15-30 second hook here based on the topic and source material.]</p>
                <ul>
                    <li><strong>DO:</strong> [Specific, compelling action for the hook]</li>
                    <li><strong>DON’T:</strong> [Specific common mistake to avoid for this topic]</li>
                </ul>
                <h2>Trust Introduction - (15-30 seconds)</h2>
                <p>[This section will be FILLED by the persona intro. If persona is 'default', write a generic trust intro here.]</p>
                <p><em>*Add some b-roll footage of [relevant b-roll] during the [relevant phrase] section.*</em></p>
                <h2>Body (Main Content)</h2>
                <h3>Section 1: [Title of Section 1] (~ 60-120 seconds approx)</h3>
                <p>[Brief overview of points in this section. Break down complex info from source material into digestible bullet points.]</p>
                <p><strong>Visuals:</strong> [Minimalistic text or b-roll suggestion]</p>
                <h3>Section 2: [Title of Section 2] (~ 3-4 minutes approx)</h3>
                <p>[Short intro to the section.]</p>
                <p><strong>Visuals:</strong> [Minimalistic visual, e.g., text card with steps]</p>
                <h3>Section 2a: Step #1 [Title of Step 1] (~ 15-25 seconds approx)</h3>
                <p>[Explanation of this step, based on source material.]</p>
                <p><strong>Visuals:</strong> [Minimalistic visual]</p>
                <p><strong>Notes:</strong> [Any relevant tips, like in the original template]</p>
                <h3>[Continue with more steps as needed...]</h3>
                <h2>Notes (For the Team to Add)</h2>
                <ul>
                    <li>Idea #1</li>
                    <li>Idea #2</li>
                    <li>Idea #3</li>
                </ul>
                <h2>Additional Notes</h2>
                <ul>
                    <li><strong>Visual Engagement:</strong> [Simple visual advice]</li>
                    <li><strong>Timing:</strong> [Advice on timing]</li>
                    <li><strong>Hooks & Retention:</strong> [Advice on internal hooks]</li>
                </ul>
                <h2>Mid CTA</h2>
                <p>[A relevant CTA, e.g., "Enjoying this so far? Hit subscribe..."]</p>
                <h2>End CTA</h2>
                <p>[A relevant End CTA, e.g., "Add this video to your ending card: [suggest a follow-up video topic]"]</p>
                <p><em>[Action cue, e.g., "Point with fingers..."]</em></p>
            </div>
            
            You must use the provided Video Topic and Source Material to fill in all the bracketed [] content. Be thorough and creative.
        `;

        const userQuery = `
            Video Topic: ${topic}
            Source Material / Transcripts:
            ${sourceMaterial}
        `;

        // --- Call Gemini API ---
        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${GEMINI_API_KEY}`;
        const payload = {
            contents: [{ parts: [{ text: userQuery }] }],
            systemInstruction: { parts: [{ text: systemPrompt }] },
        };

        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Gemini API Error: ${errorText}`);
        }

        const data = await response.json();
        
        // --- Return the response ---
        // Pass the successful Gemini response directly back to the client
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
        return jsonError(`[Generate Function Error]: ${errorMessage}`, 500);
    }
}

