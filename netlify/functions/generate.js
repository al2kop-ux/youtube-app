// This is the code for your Serverless Function
// It runs on Netlify's servers, not in the user's browser

exports.handler = async (event) => {
    // 1. Get the user's inputs from the app
    const { topic, sourceMaterial } = JSON.parse(event.body);

    // 2. Get your secret API key
    // (You will set this in Netlify's dashboard in the next step)
    const apiKey = process.env.GEMINI_API_KEY;
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`;

    // 3. Construct the same payload we used in the app
    const systemPrompt = `
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
    <h2>Trust Introduction - (15-30 seconds)</h2>
    <p>[One or two sentences to build authority, with a cue for b-roll.]</p>
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
        ${sourceMaterial.trim() ? sourceMaterial : "No source material provided. Please generate the outline based on the topic alone."}
    `;

    const payload = {
        contents: [{ parts: [{ text: userQuery }] }],
        systemInstruction: {
            parts: [{ text: systemPrompt }]
        },
    };

    // 4. Securely call the Google API from the server
    try {
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            throw new Error(`API Error: ${response.statusText}`);
        }

        const data = await response.json();

        // 5. Send the AI's response back to your app
        return {
            statusCode: 200,
            body: JSON.stringify(data)
        };

    } catch (error) {
        return {
            statusCode: 500,
            body: JSON.stringify({ error: error.message })
        };
    }
};
