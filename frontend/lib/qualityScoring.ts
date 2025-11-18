// Data Quality Scoring System

export interface QualityScoreFactors {
    hasPassword: boolean;
    hasValidEmail: boolean;
    hasValidDomain: boolean;
    hasValidTLD: boolean;
    lineLength: number;
    source: "intelx" | "manual" | "import";
    verified: boolean;
    age: number; // days since creation
}

export function calculateQualityScore(factors: QualityScoreFactors): number {
    let score = 0;
    const maxScore = 100;

    // Password presence (20 points)
    if (factors.hasPassword) {
        score += 20;
    }

    // Email validity (15 points)
    if (factors.hasValidEmail) {
        score += 15;
    }

    // Domain validity (15 points)
    if (factors.hasValidDomain) {
        score += 15;
    }

    // TLD validity (10 points)
    if (factors.hasValidTLD) {
        score += 10;
    }

    // Line completeness (10 points)
    // Longer lines (more data) get higher scores, up to 10 points
    if (factors.lineLength > 0) {
        const lineScore = Math.min(10, (factors.lineLength / 100) * 10);
        score += lineScore;
    }

    // Source reliability (15 points)
    switch (factors.source) {
        case "intelx":
            score += 15; // IntelX is most reliable
            break;
        case "manual":
            score += 10; // Manual entry is reliable
            break;
        case "import":
            score += 5; // Imported data may vary
            break;
    }

    // Verification status (10 points)
    if (factors.verified) {
        score += 10;
    }

    // Age factor (5 points)
    // Newer data gets slightly higher score (data freshness)
    if (factors.age < 30) {
        score += 5;
    } else if (factors.age < 90) {
        score += 3;
    } else if (factors.age < 180) {
        score += 1;
    }
    // Older than 180 days gets 0 points for age

    return Math.min(maxScore, Math.round(score));
}

export function validateEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

export function validateDomain(domain: string): boolean {
    const domainRegex = /^[a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?)*$/;
    return domainRegex.test(domain);
}

export function validateTLD(tld: string): boolean {
    const tldRegex = /^[a-zA-Z]{2,10}$/;
    return tldRegex.test(tld);
}

export function calculateAgeInDays(createdAt: string | Date): number {
    const created = typeof createdAt === "string" ? new Date(createdAt) : createdAt;
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - created.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}
