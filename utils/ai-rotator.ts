

/**
 * Smart Key Rotator for AI API Keys
 * Implementation: Single-account multi-key rotation (Reliability Focus)
 * 
 * RULES:
 * 1. All keys must be from the SAME account.
 * 2. Rotate ONLY on failure (HTTP error, timeout, quota).
 * 3. Log provider, key index, and reason.
 */

interface KeyState {
    value: string;
    index: number;
}

class KeyRotator {
    private keys: string[] = [];
    private currentKeyIndex: number = 0;
    private providerName: string;

    constructor(envKeyName: string, providerName: string) {
        this.providerName = providerName;
        // @ts-ignore - import.meta.env is Vite specific
        const rawKeys = import.meta.env[envKeyName] || '';
        this.keys = rawKeys.split(',').map((k: string) => k.trim()).filter(Boolean);

        if (this.keys.length === 0) {
            console.warn(`[KeyRotator:${providerName}] No keys found for ${envKeyName}`);
        } else {
            console.log(`[KeyRotator:${providerName}] Initialized with ${this.keys.length} keys.`);
        }
    }

    /**
     * Get the current active key.
     * Does NOT rotate automatically.
     */
    public getKey(): KeyState | null {
        if (this.keys.length === 0) return null;
        return {
            value: this.keys[this.currentKeyIndex],
            index: this.currentKeyIndex
        };
    }

    /**
     * Rotate to the next key ONLY on failure.
     */
    public rotate(reason: string): void {
        if (this.keys.length <= 1) {
            console.warn(`[KeyRotator:${this.providerName}] Failure: ${reason}. (No alternative keys to rotate)`);
            return;
        }

        const oldIndex = this.currentKeyIndex;
        this.currentKeyIndex = (this.currentKeyIndex + 1) % this.keys.length;

        console.warn(`[KeyRotator:${this.providerName}] ROTATED: Index ${oldIndex} -> ${this.currentKeyIndex}. Reason: ${reason}`);
    }

    public getAvailableKeysCount(): number {
        return this.keys.length;
    }

    public getCurrentIndex(): number {
        return this.currentKeyIndex;
    }
}

// Global instances for specific providers
export const sambaRotator = new KeyRotator('VITE_SAMBANOVA_API_KEY', 'SambaNova');
export const groqRotator = new KeyRotator('VITE_GROQ_API_KEY', 'Groq');
export const geminiRotator = new KeyRotator('VITE_GEMINI_API_KEY', 'Gemini');

