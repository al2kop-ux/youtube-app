const { YoutubeTranscript } = require('youtube-transcript');

// Helper function to fetch a single transcript safely
const fetchTranscript = async (url) => {
    if (!url || !url.trim()) {
        return ""; // Return empty string if URL is empty
    }
    try {
        // === UPDATED 2-STEP LOGIC ===
        // 1. Get a list of all available transcripts (including auto-generated)
        const transcriptsList = await YoutubeTranscript.listTranscripts(url);
        if (!transcriptsList || transcriptsList.length === 0) {
            return `[No transcripts available for ${url}]`;
        }

        // 2. Fetch the first transcript from the list
        const transcriptItems = await transcriptsList[0].fetch();
        // === END OF UPDATE ===

        if (!transcriptItems) return "";
        return transcriptItems.map(item => item.text).join(' ');

    } catch (error) {
        console.warn(`Could not fetch transcript for ${url}: ${error.message}`);
        return `[Transcript for ${url} failed to load: ${error.message}]`; // Return an error message
    }
};

exports.handler = async (event) => {
    // 1. Get the user's inputs
    const { topic, persona, url1, url2, url3 } = JSON.parse(event.body);
    
    // 2. Get your secret API key
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        return { statusCode: 500, body: JSON.stringify({ error: "API key is not configured." }) };
    }
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`;

    // 3. Fetch all transcripts in parallel
    let sourceMaterial = "";
    try {
        const transcripts = await Promise.all([
            fetchTranscript(url1),
            fetchTranscript(url2),
            fetchTranscript(url3)
        ]);
        
        // Combine all fetched transcripts
        sourceMaterial = transcripts.filter(Boolean).join('\n\n---\n\n');
        
        if (!sourceMaterial) {
            sourceMaterial = "No valid transcripts were fetched. Please generate the outline based on the topic alone.";
        }
    } catch (error) {
        return { statusCode: 500, body: JSON.stringify({ error: "Failed to fetch one or more transcripts." }) };
    }

    // 4. Define the base system prompt with a placeholder
    const baseSystemPrompt = `
You are a professional YouTube scriptwriter. Your task is to generate a detailed YouTube script outline based on the user's topic and provided source material. You MUST format your response in clean, semantic HTML.
- Use <h2> for main sections (Hook, Trust Introduction, Body, etc.).
- Use <h3> for sub-sections (e.g., Section 1, Part 1, Step 2a).
- Use <p> for paragraphs.
- Use <ul> and <li> for bullet points.
- Use <strong> for emphasis on things like 'DO:', 'DON’T:', and 'Visuals:'.
- Use <em> or <i> for italicized notes like *Add b-roll...*.
Your response should look like this example:
<div>
    <h2>Hook - (First 15-30 seconds)</h2>
    <p><strong>Example Hook:</strong> [Generate a compelling 15-30 second hook here based on the topic and source material.]</p>
    <ul>
        <li><strong>DO:</strong> [Specific, compelling action for the hook]</li>
        <li><strong>DON’T:</strong> [Specific common mistake to avoid for this topic]</li>
    </ul>
    <!-- === THIS BLOCK IS NOW DYNAMIC === -->
    {TRUST_INTRO_INSTRUCTION_BLOCK}
    <!-- === END DYNAMIC BLOCK === -->
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

    // 5. Create the dynamic 'Trust Intro' instruction
    let trustIntroInstruction = '';
    switch (persona) {
        case 'korona':
            trustIntroInstruction = `
<h2>Trust Introduction - (15-30 seconds)</h2>
<p><strong>You MUST use this exact text and then complete it:</strong> "So hey, I’m Michael… the CMO at KORONA POS. We help thousands of retailers all across the US run smoother, more profitable retail stores — from mom and pop coffee shops to multi-location retail chains. I’ve been in the retail tech game for years, and in this video..."</p>
<p><em>[Your job is to complete this sentence, naturally connecting it to how Michael will solve the problem of the user's Video Topic.]</em></p>
            `;
            break;
        case 'verticulate':
            trustIntroInstruction = `
<h2>Trust Introduction - (15-30 seconds)</h2>
<p><strong>You MUST use this exact text and then complete it:</strong> "So hey, I’m Mihkel. I’m the founder at Verticulate. We’ve helped tens of clients globally - from startups all the way to enterprises - eliminate waste in their processes by implementing better systems and workflow automations with AI, saving thousands of hours in the process..."</p>
<p><em>[Your job is to complete this sentence, naturally connecting it to how Mihkel will solve the problem of the user's Video Topic.]</em></p>
            `;
            break;
        default:
            trustIntroInstruction = `
<h2>Trust Introduction - (15-30 seconds)</h2>
<p>[Generate a standard, authoritative intro based on the Video Topic. If no specific persona is given, create a generic but confident one.]</p>
<p><em>*Add some b-roll footage of [relevant b-roll] during the [relevant phrase] section.*</em></p>
            `;
    }

    // 6. Inject the dynamic instruction into the base prompt
    const finalSystemPrompt = baseSystemPrompt.replace(
        '{TRUST_INTRO_INSTRUCTION_BLOCK}',
        trustIntroInstruction
    );

    // 7. Construct the user query
    const userQuery = `
        Video Topic: ${topic}
        Source Material / Transcripts:
        ${sourceMaterial}
    `;

    // 8. Construct the final payload for the Google API
    const payload = {
        contents: [{ parts: [{ text: userQuery }] }],
        systemInstruction: {
            parts: [{ text: finalSystemPrompt }]
        },
    };

    // 9. Securely call the Google API from the server
    try {
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const errorBody = await response.json();
            console.error("API Error Body:", errorBody);
            throw new Error(`API Error ${response.status}: ${errorBody.error?.message || 'Unknown error'}`);
        }

        const data = await response.json();

        // 10. Send the AI's response back to your app
        return {
            statusCode: 200,
            body: JSON.stringify(data)
        };

    } catch (error) {
        console.error(error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: error.message })
        };
    }
};

