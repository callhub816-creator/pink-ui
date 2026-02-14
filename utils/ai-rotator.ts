interface KeyState {
    value: string;
    index: number;
}

class KeyRotator {
    private keys: string[] = [];
    private currentKeyIndex: number = 0;

    constructor() {
        // @ts-ignore
        const rawKeys = import.meta.env.VITE_GEMINI_API_KEY || "";
        this.keys = rawKeys.split(",").map((k: string) => k.trim()).filter((k: string) => k);

        if (this.keys.length > 0) {
            console.log(`[KeyRotator:Gemini] Initialized with ${this.keys.length} keys.`);
        } else {
            console.warn(`[KeyRotator:Gemini] No keys found in VITE_GEMINI_API_KEY. Voice calls will fail.`);
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
        if (this.keys.length <= 1) return;
        this.currentKeyIndex = (this.currentKeyIndex + 1) % this.keys.length;
        console.log(`[KeyRotator:Gemini] Rotated to key index ${this.currentKeyIndex}. Reason: ${reason}`);
    }

    public getAvailableKeysCount(): number {
        return this.keys.length;
    }
}

export const geminiRotator = new KeyRotator();
