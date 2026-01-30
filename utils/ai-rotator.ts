
/**
 * Simplified Key Rotator for Gemini API
 * Reliability Focus: Strict rotation on failure
 */

interface KeyState {
    value: string;
    index: number;
}

class KeyRotator {
    private keys: string[] = [];
    private currentKeyIndex: number = 0;
    private providerName: string = "Gemini";

    constructor() {
        // Collect Gemini keys from environment variables
        // Support comma-separated list in VITE_GEMINI_API_KEY
        // Or individual keys like VITE_GEMINI_API_KEY_1, _2 if needed (Optional)

        const mainKey = import.meta.env.VITE_GEMINI_API_KEY || '';
        const list = mainKey.split(',').map((k: string) => k.trim()).filter(Boolean);

        // Also check for individual numbered keys as requested
        const individualKeys: string[] = [];
        for (let i = 1; i <= 5; i++) {
            const k = import.meta.env[`VITE_GEMINI_API_KEY_${i}`];
            if (k) individualKeys.push(k.trim());
        }

        this.keys = [...new Set([...list, ...individualKeys])];

        if (this.keys.length === 0) {
            console.warn(`[KeyRotator:Gemini] Gemini API key missing. AI features will be disabled.`);
        } else {
            console.log(`[KeyRotator:Gemini] Active with ${this.keys.length} keys.`);
        }
    }

    public getKey(): KeyState | null {
        if (this.keys.length === 0) return null;
        return {
            value: this.keys[this.currentKeyIndex],
            index: this.currentKeyIndex
        };
    }

    public rotate(reason: string): void {
        if (this.keys.length <= 1) {
            console.log(`[KeyRotator:Gemini] Stay on current key. Reason: ${reason}`);
            return;
        }

        const oldIndex = this.currentKeyIndex;
        this.currentKeyIndex = (this.currentKeyIndex + 1) % this.keys.length;
        console.log(`[KeyRotator:Gemini] ROTATED: ${oldIndex} -> ${this.currentKeyIndex}. Reason: ${reason}`);
    }

    public getAvailableKeysCount(): number {
        return this.keys.length;
    }
}

// Global instance for Gemini only
export const geminiRotator = new KeyRotator();
