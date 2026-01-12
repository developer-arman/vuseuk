/********************************************************************
 *  Copyright 2025 Adobe
 *  All Rights Reserved.
 *
 * NOTICE:  Adobe permits you to use, modify, and distribute this
 * file in accordance with the terms of the Adobe license agreement
 * accompanying it.
 *******************************************************************/
export interface AlgoliaConfig {
    applicationId: string;
    apiKey: string;
    indexName: string;
}
export interface AlgoliaSearchResult {
    objectID: string;
    name?: string;
    sku?: string;
    price?: number;
    image?: string;
    url?: string;
    [key: string]: any;
}
export interface AlgoliaSearchResponse {
    results: AlgoliaSearchResult[];
    nbHits: number;
    hitsPerPage: number;
    page: number;
}
/**
 * Initialize Algolia client with configuration
 */
export declare const initializeAlgolia: (algoliaConfig: AlgoliaConfig) => void;
/**
 * Search for products in Algolia index
 */
export declare const searchProducts: (query: string, options?: {
    hitsPerPage?: number;
    page?: number;
}) => Promise<AlgoliaSearchResponse>;
/**
 * Get the current Algolia configuration
 */
export declare const getAlgoliaConfig: () => AlgoliaConfig | null;
//# sourceMappingURL=algoliaApi.d.ts.map