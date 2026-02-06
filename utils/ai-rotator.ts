/**
 * ai-rotator.ts
 * Frontend Bypass: Gemini logic is now handled by Cloudflare Pages Functions (/chat).
 * This file remains for backward compatibility with component hooks but no longer requires local keys.
 */

interface KeyState {
    value: string;
    index: number;
}

class KeyRotator {
    private keys: string[] = ["BACKEND_MANAGED"];
    private currentKeyIndex: number = 0;

    constructor() {
        // Frontend key collection is deprecated. 
        // Gemini API keys must be set as Cloudflare Pages environment secrets (GEMINI_API_KEY).
        console.log(`[KeyRotator:Gemini] System stabilized. Using backend-managed auth.`);
    }

    public getKey(): KeyState | null {
        // Return a dummy key so frontend validation passes, but actual calls go to /chat
        return {
            value: "BACKEND_MANAGED",
            index: 0
        };
    }

    public rotate(reason: string): void {
        console.log(`[KeyRotator:Gemini] Backend rotation signal received: ${reason}`);
    }

    public getAvailableKeysCount(): number {
        return 1;
    }
}

export const geminiRotator = new KeyRotator();
