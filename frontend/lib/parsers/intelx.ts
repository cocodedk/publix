export interface ParsedCredential {
    email: string;
    password: string | null;
    line: string;
    domain: string;
    tld: string;
}

export function parseIntelXResult(selector: any): ParsedCredential | null {
    try {
        const value = selector.selectorvalue || "";
        const type = selector.selectortype || "";

        // Try pipe/tab delimited formats first (before generic email check to avoid corruption)
        if (value.includes("|") || value.includes("\t")) {
            const delimiter = value.includes("|") ? "|" : "\t";
            const parts = value.split(delimiter);
            const email = parts.find((p: string) => p.includes("@"))?.trim();

            if (email) {
                const [, domainPart] = email.split("@");
                if (domainPart) {
                    const domainParts = domainPart.split(".");
                    const tld = domainParts[domainParts.length - 1] || "com";
                    const domain = domainParts.slice(0, -1).join(".") || domainPart;
                    const emailIdx = parts.findIndex((p: string) => p.includes("@"));
                    const password = parts.find((_: string, i: number) => i !== emailIdx)?.trim() || null;

                    return { email, password, line: value, domain, tld };
                }
            }
        }

        // Try to parse email:password format (only when no pipe/tab delimiters present)
        if (type === "email" || value.includes("@")) {
            const parts = value.split(":");
            const email = parts[0]?.trim();
            const password = parts[1]?.trim() || null;

            if (email && email.includes("@")) {
                const [, domainPart] = email.split("@");
                if (domainPart) {
                    const domainParts = domainPart.split(".");
                    const tld = domainParts[domainParts.length - 1] || "com";
                    const domain = domainParts.slice(0, -1).join(".") || domainPart;

                    return { email, password, line: value, domain, tld };
                }
            }
        }

        return null;
    } catch (error) {
        console.error("Error parsing IntelX result:", error);
        return null;
    }
}
