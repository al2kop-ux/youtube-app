import { YoutubeTranscript } from 'youtube-transcript';

// Helper function to fetch a single transcript
async function fetchTranscript(url) {
    if (!url) return null;
    try {
        const transcriptItems = await YoutubeTranscript.fetch(url);
        if (!transcriptItems || transcriptItems.length === 0) {
            return `[No transcript found for ${url}]`;
        }
        return transcriptItems.map(item => item.text).join(' ');
    } catch (error) {
        console.warn(`Could not fetch transcript for ${url}: ${error.message}`);
        return `[Transcript fetch failed for ${url}: ${error.message}]`;
    }
}

// Helper function to build the Trust Intro part of the prompt
function getTrustIntro(persona, topic) {
    switch (persona) {
        case 'korona':
            return `
<h2>Trust Introduction - (15-30 seconds)</h2>
<p>So hey, I’m Michael… the CMO at KORONA POS. We help thousands of retailers all across the US run smoother, more profitable retail stores — from mom and pop coffee shops to multi-location retail chains. I’ve been in the retail tech game for years, and in this video, I'm about to show you exactly how to solve the problem of "${topic}".</p>
<p><em>*Add some b-roll footage of successful retail stores during this section.*</em></p>
`;
        case 'verticulate':
            return `
<h2>Trust Introduction - (15-30 seconds)</h2>
<p>So hey, I’m Mihkel. I’m the founder at Verticulate. We’ve helped tens of clients globally - from startups all the way to enterprises - eliminate waste in their processes by implementing better systems and workflow automations with AI, saving thousands of hours in the process. In this video, I'm going to show you how to solve the problem of "${topic}".</p>
<p><em>*Add some b-roll footage of AI or process automation during this section.*</em></p>
`;
        default:
            return `
<h2>Trust Introduction - (15-30 seconds)</h2>
<p>[You are a trusted expert in this field. Insert 1-2 sentences here to build authority and trust with the audience. Explain WHY you are qualified to talk about this topic.]</p>
<p><em>*Add some b-roll footage of [relevant b-roll] during the [relevant phrase] section.*</em></p>
`;
    }
}

// Main Cloudflare Function handler (for POST requests)
export async function onRequestPost(context) {
    try {
        const { topic, persona, urls } = await context.request.json();

        if (!topic) {
            return new Response(JSON.stringify({ error: 'Video topic is required.' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        // 1. Fetch all transcripts in parallel
        const transcriptPromises = (urls || []).map(fetchTranscript);
        const transcripts = await Promise.all(transcriptPromises);
        const sourceMaterial = transcripts.filter(t => t).join('\n\n---\n\n');

        // 2. Build the dynamic Trust Intro
        const trustIntroPrompt = getTrustIntro(persona, topic);
        
        // 3. Construct the System Prompt
        const systemPrompt = `
You are a professional YouTube scriptwriter. Your task is to generate a detailed YouTube script outline based on the user's topic and provided source material. You MUST format your response in clean, semantic HTML.
- Use <h2> for main sections (Hook, Trust Introduction, Body, etc.).
- Use <h3> for sub-sections (e.g., Section 1, Part 1, Step 2a).
- Use <p> for paragraphs.
- Use <ul> and <li> for bullet points.
- Use <strong> for emphasis on things like 'DO:', 'DON’T:', and 'Visuals:'.
- Use <em> or <i> for italicized notes like *Add b-roll...*.
(The rest of your detailed prompt is here...)
<div>
    <h2>Hook - (First 15-30 seconds)</h2>
    <p><strong>Example Hook:</strong> [Generate a compelling 15-30 second hook here based on the topic and source material.]</p>
    <ul>
        <li><strong>DO:</strong> [Specific, compelling action for the hook]</li>
        <li><strong>DON’T:</strong> [Specific common mistake to avoid for this topic]</li>
    </ul>
    ${trustIntroPrompt}
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

        // 4. Construct the User Query
        const userQuery = `
Video Topic: ${topic}
Source Material / Transcripts:
${sourceMaterial.trim() ? sourceMaterial : "No source material provided. Please generate the outline based on the topic alone."}
    `;

        // 5. Call the Gemini API
        const apiKey = context.env.GEMINI_API_KEY; // Get key from Cloudflare
        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`;

        if (!apiKey) {
            return new Response(JSON.stringify({ error: 'Gemini API key is not set.' }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        const payload = {
            contents: [{ parts: [{ text: userQuery }] }],
            systemInstruction: {
                parts: [{ text: systemPrompt }]
            },
        };

        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(`Gemini API Error: ${errorData.error.message || response.statusText}`);
        }

        const data = await response.json();

        // 6. Send the AI's response back to the app
        return new Response(JSON.stringify(data), {
            headers: { 'Content-Type': 'application/json' },
        });

    } catch (error) {
        return new Response(JSON.stringify({ error: `[Generate Function Error]: ${error.message}` }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }
}
