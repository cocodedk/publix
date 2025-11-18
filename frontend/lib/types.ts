// Shared TypeScript types for API requests and responses

export interface ContentLine {
    email: string;
    password: string | null;
    line: string;
    mainDataId: string;
    email_hash?: string;
}

export interface ContentLineNode {
    email: string; // encrypted
    password: string | null; // encrypted
    line: string; // encrypted
    email_hash: string;
    mainDataId: string;
}

export interface Domain {
    name: string;
}

export interface TLD {
    name: string;
}

export interface SearchResult {
    email: string;
    password: string | null;
    line: string;
    mainDataId: string;
}

export interface SearchResponse {
    results: SearchResult[];
    total?: number;
    page?: number;
    perPage?: number;
}

export interface CreateContentRequest {
    email: string;
    password?: string | null;
    line: string;
    domain: string;
    tld: string;
    mainDataId?: string;
}

export interface UpdateContentRequest {
    email?: string;
    password?: string | null;
    line?: string;
    mainDataId?: string;
}

export interface ContentResponse {
    id: string;
    email: string;
    password: string | null;
    line: string;
    mainDataId: string;
    domain?: string;
    tld?: string;
}

export interface ListContentResponse {
    items: ContentResponse[];
    total: number;
    page: number;
    perPage: number;
}

export interface ImportItem {
    email: string;
    password?: string | null;
    line: string;
    domain: string;
    tld: string;
    mainDataId?: string;
}

export interface ImportRequest {
    items: ImportItem[];
}

export interface ImportResponse {
    success: number;
    failed: number;
    errors?: string[];
}

export interface ApiError {
    error: string;
    message?: string;
    details?: any;
}
