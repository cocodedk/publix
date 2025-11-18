import crypto from "crypto";

export class Encryptor {
    private key: crypto.CipherKey;
    constructor(passphrase: string) {
        // Derive a 32‑byte key using SHA‑256 (simple for demo purposes)
        this.key = crypto.createHash("sha256").update(passphrase).digest();
    }
    encrypt(text: string): string {
        const iv = crypto.randomBytes(12);
        const cipher = crypto.createCipheriv("aes-256-gcm", this.key as unknown as crypto.CipherKey, iv);
        const encrypted = Buffer.concat([cipher.update(text, "utf8"), cipher.final()]);
        const tag = cipher.getAuthTag();
        return Buffer.concat([iv, tag, encrypted]).toString("base64");
    }
    decrypt(ciphertext: string): string {
        const data = Buffer.from(ciphertext, "base64");
        const iv = data.slice(0, 12);
        const tag = data.slice(12, 28);
        const encrypted = data.slice(28);
        const decipher = crypto.createDecipheriv("aes-256-gcm", this.key, iv);
        decipher.setAuthTag(tag);
        const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
        return decrypted.toString("utf8");
    }
}
