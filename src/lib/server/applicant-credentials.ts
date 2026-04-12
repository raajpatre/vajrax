import "server-only";

import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

function getEncryptionKey() {
    const secret = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const salt = process.env.NEXT_PUBLIC_SUPABASE_URL;

    if (!secret || !salt) {
        throw new Error("Missing server secrets for applicant credential encryption");
    }

    return createHash("sha256").update(`${secret}:${salt}`).digest();
}

export function encryptApplicantPassword(password: string) {
    const key = getEncryptionKey();
    const iv = randomBytes(12);
    const cipher = createCipheriv("aes-256-gcm", key, iv);
    const encrypted = Buffer.concat([cipher.update(password, "utf8"), cipher.final()]);
    const tag = cipher.getAuthTag();

    return [iv, tag, encrypted].map((chunk) => chunk.toString("base64url")).join(".");
}

export function decryptApplicantPassword(payload: string) {
    const key = getEncryptionKey();
    const [ivPart, tagPart, encryptedPart] = payload.split(".");

    if (!ivPart || !tagPart || !encryptedPart) {
        throw new Error("Invalid applicant credential payload");
    }

    const decipher = createDecipheriv(
        "aes-256-gcm",
        key,
        Buffer.from(ivPart, "base64url")
    );
    decipher.setAuthTag(Buffer.from(tagPart, "base64url"));

    const decrypted = Buffer.concat([
        decipher.update(Buffer.from(encryptedPart, "base64url")),
        decipher.final(),
    ]);

    return decrypted.toString("utf8");
}
