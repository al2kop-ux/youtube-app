# YouTube Script Outline Generator App

This is a web app built to generate YouTube script outlines using AI, based on a video topic and optional competitor YouTube video transcripts.

## Project Goal

The app allows a user to:

1.  Enter a video topic.
    
2.  Select a "persona" for the video host.
    
3.  Search YouTube for inspiration videos.
    
4.  Automatically fetch transcripts from up to 3 YouTube URLs.
    
5.  Generate a complete, formatted script outline using the Google Gemini API.
    

## Live Demo

The app is deployed on Cloudflare Pages: [https://3ea1b160.youtube-app-4nx.pages.dev/](https://3ea1b160.youtube-app-4nx.pages.dev/ "null") (Note: The app is in a partially broken state).

## Tech Stack

-   **Hosting:** Cloudflare Pages (connected to this GitHub repo).
    
-   **Frontend:** Vanilla JavaScript, HTML, CSS (in `index.html`).
    
-   **Backend:** Cloudflare Functions (in the `functions/` directory).
    
-   **Dependencies:** `youtube-transcript` (for fetching transcripts).
    
-   **APIs:**
    
    -   Google Gemini API (for script generation).
        
    -   Google YouTube Data API v3 (for video search).
        

## File Structure

-   `index.html`: The complete frontend application logic and UI.
    
-   `package.json`: Manages dependencies (just `youtube-transcript`) and sets the Node.js version for Cloudflare.
    
-   `functions/`: This directory holds all the serverless backend functions.
    
    -   `functions/search-youtube.js`: **(WORKING)** Handles the YouTube search.
        
    -   `functions/generate.js`: **(BROKEN)** Fetches transcripts and calls the Gemini API.
        
    -   `functions/fetch-transcript.js`: **(BROKEN)** Fetches a single transcript for the "Show Transcript" modal.
        

## Environment Variables

The project is configured to use two environment variables, which are set in the Cloudflare Pages dashboard (`Settings` > `Environment variables` > `Production`):

-   `GEMINI_API_KEY`: The API key for the Google Gemini API.
    
-   `YOUTUBE_API_KEY`: The API key for the Google YouTube Data API v3.
    

## CURRENT STATUS & THE BUG

This is the handoff point for the expert.

### What Works:

-   The frontend UI loads correctly.
    
-   The YouTube Search function (`functions/search-youtube.js`) is **100% working**. It successfully calls the YouTube Data API and returns results.
    

### The Problem:

The two functions that use the `youtube-transcript` library (`generate.js` and `fetch-transcript.js`) are failing at runtime.

-   **Error Message:** `Error: [Transcript Function Error]: YoutubeTranscript.fetch is not a function`
    
-   **Context:** This error appears when clicking "Show Transcript" or "Generate Outline."
    
-   **What We've Tried:** The project is currently set up as a CommonJS project (no `"type": "module"` in `package.json`) and is using `require` to import the library. This seems to be the correct setup for Cloudflare Pages Functions, but the import is failing at runtime. It's likely an issue with how the `youtube-transcript` (an ESM-only package) is being imported in a CommonJS environment.
    

### The Task:

The core task is to **debug and fix the `require('youtube-transcript')` import** inside `functions/generate.js` and `functions/fetch-transcript.js` so that `YoutubeTranscript.fetch(url)` can be called successfully within the Cloudflare Pages environment.
