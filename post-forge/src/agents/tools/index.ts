/**
 * Barrel for the four AgentKit tools (T03). T04 binds these to agents:
 *   Research   → web_search, fetch_url
 *   Verify     → web_search
 *   Illustrator→ generate_poster
 *   Publisher  → save_post
 */

export { webSearchTool, type WebSearchResult } from "./web_search";
export { fetchUrlTool, type FetchUrlResult } from "./fetch_url";
export { generatePosterTool } from "./generate_poster";
export { savePostTool } from "./save_post";
