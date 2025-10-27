// This file is in the "broken" state you requested for debugging.
// It fails with "YoutubeTranscript.fetch is not a function".

// This import is incorrect, causing the runtime error.
const YoutubeTranscript = require('youtube-transcript');

// Helper to return a JSON error
function jsonError(message, status = 500) {
    return new Response(JSON.stringify({ error: message }), {
        status: status,
        headers: { 'Content-Type': 'application/json' },
    });
}

// Helper to fetch and combine transcripts
// This function will fail.
async function fetchTranscript(url) {
    try {
        const transcriptItems = await YoutubeTranscript.fetch(url);
        return transcriptItems.map(item => item.text).join(' ');
    } catch (error) {
        // Throw a specific error for the main handler
        let errorMessage = "Transcript fetch failed.";
        if (error instanceof Error) {
            errorMessage = error.message;
        }
        throw new Error(`Failed to fetch transcript for ${url}: ${errorMessage}`);
    }
}

// Cloudflare's native POST handler for Pages
export async function onRequestPost(context) {
    // Top-level try...catch
    try {
        const { topic, persona, url1, url2, url3 } = await context.request.json();
        const { GEMINI_API_KEY } = context.env;

        if (!topic) {
            return jsonError('Video Topic is required', 400);
        }
        if (!GEMINI_API_KEY) {
            return jsonError('Gemini API key is not set', 500);
        }

        // --- Fetch Transcripts ---
        let transcriptPromises = [];
        if (url1) transcriptPromises.push(fetchTranscript(url1));
        if (url2) transcriptPromises.push(fetchTranscript(url2));
        if (url3) transcriptPromises.push(fetchTranscript(url3));

        const transcripts = await Promise.allSettled(transcriptPromises);
        let combinedTranscripts = "";
        transcripts.forEach((result, index) => {
            if (result.status === 'fulfilled') {
                combinedTranscripts += `--- Transcript ${index + 1} ---\n${result.value}\n\n`;
            } else {
                // Log transcript error but continue
                console.error(result.reason);
                combinedTranscripts += `--- Transcript ${index + 1} failed to load: ${result.reason.message} ---\n\n`;
            }
        });

        if (transcriptPromises.length > 0 && combinedTranscripts.trim() === "") {
             return jsonError('All transcripts failed to load.', 400);
        }

        // --- Persona-based System Prompt ---
        let trustIntro = `
            <h2>Trust Introduction - (15-30 seconds)</h2>
            <p>[LLM, generate a trust intro here. Build authority and state the value proposition.]</p>
            <p><em>*Add b-roll footage of [relevant b-roll] here.*</em></p>
        `;

        if (persona === 'michael-korona') {
            trustIntro = `
                <h2>Trust Introduction - (15-30 seconds)</h2>
                <p>So hey, I’m Michael… the CMO at KORONA POS. We help thousands of retailers all across the US run smoother, more profitable retail stores — from mom and pop coffee shops to multi-location retail chains. I’ve been in the retail tech game for years, and in this video, I'm about to show you how to solve the problem of [Video Topic].</p>
            `;
        } else if (persona === 'mike-verticulate') {
            trustIntro = `
                <h2>Trust Introduction - (15-30 seconds)</h2>
                <p>So hey, I’m Mihkel. I’m the founder at Verticulate. We’ve helped tens of clients globally - from startups all the way to enterprises - eliminate waste in their processes by implementing better systems and workflow automations with AI, saving thousands of hours in the process... and in this video, I'm going to show you how to solve the problem of [Video Topic].</p>
            `;
        }

        const systemPrompt = `
    You are a professional YouTube scriptwriter. Your task is to generate a detailed YouTube script outline based on the user's topic and provided source material. You MUST format your response in clean, semantic HTML.
    
    - Use <h2> for main sections.
    - Use <h3> for sub-sections.
    - Use <p> for paragraphs.
    - Use <ul> and <li> for bullet points.
    - Use <strong> for emphasis on 'DO:', 'DON’T:', and 'Visuals:'.
    - Use <em> or <i> for italicized notes.
    
    Your response should follow this exact structure:
    
    <div>
        <h2>Hook - (First 15-30 seconds)</h2>
        <p><strong>Example Hook:</strong> [Generate a compelling 15-30 second hook here based *only* on the Video Topic.]</p>
        <ul>
            <li><strong>DO:</strong> [Specific, compelling action for the hook]</li>
            <li><strong>DON’T:</strong> [Specific common mistake to avoid for this topic]</li>
        </ul>
        ${trustIntro}
        <h2>Body (Main Content)</h2>
        <h3>Section 1: [Title of Section 1 based on topic/transcripts] (~ 60-120 seconds approx)</h3>
        <p>[Brief overview of points in this section. Break down complex info from source material into digestible bullet points.]</p>
        <p><strong>Visuals:</strong> [Minimalistic text or b-roll suggestion]</p>
        
        <h3>Section 2: [Title of Section 2 based on topic/transcripts] (~ 3-4 minutes approx)</h3>
        <p>[Short intro to the section.]</p>
        <p><strong>Visuals:</strong> [Minimalistic visual, e.g., text card with steps]</p>
        
        <h3>Section 2a: Step #1 [Title of Step 1] (~ 15-25 seconds approx)</h3>
        <p>[Explanation of this step, based on source material.]</p>
        <p><strong>Visuals:</strong> [Minimalistic visual]</p>
        <p><strong>Notes:</strong> [Any relevant tips]</p>
        
        <h3>[Continue with more steps as needed...]</h3>
        
        <h2>Mid CTA</h2>
        <p>["Enjoying this so far? Hit subscribe for more tips..."]</p>
        
        <h2>End CTA</h2>
        <p>["Add this video to your ending card: [suggest a follow-up video topic]"]</p>
        <p><em>[Action cue, e.g., "Point with fingers..."]</em></p>
    </div>
        `;

        const userQuery = `
            Video Topic: ${topic}
            Source Material / Transcripts:
            ${combinedTranscripts.trim() ? combinedTranscripts : "No source material provided. Please generate the outline based on the topic alone."}
        `;

        const geminiApiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${GEMINI_API_KEY}`;

        const geminiPayload = {
            contents: [{ parts: [{ text: userQuery }] }],
            systemInstruction: {
                parts: [{ text: systemPrompt }]
            },
        };

        const geminiResponse = await fetch(geminiApiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(geminiPayload)
        });

        if (!geminiResponse.ok) {
            const errorText = await geminiResponse.text();
            return jsonError(`Gemini API Error: ${errorText}`, geminiResponse.status);
        }

        return geminiResponse;

    } catch (error) {
        let errorMessage = "An unknown error occurred";
        if (error instanceof Error) {
            errorMessage = error.message;
        }
        return jsonError(`[Generate Function Error]: ${errorMessage}`, 500);
    }
}

