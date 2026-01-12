import { FunctionComponent } from 'preact';
import { HTMLAttributes } from 'preact/compat';
import { AlgoliaSearchResult } from '../../api/algoliaApi';

export interface AlgoliaSearchProps extends HTMLAttributes<HTMLDivElement> {
    results?: AlgoliaSearchResult[];
    isLoading?: boolean;
    error?: string | null;
    query?: string;
    onResultClick?: (result: AlgoliaSearchResult) => void;
}
export declare const AlgoliaSearch: FunctionComponent<AlgoliaSearchProps>;
//# sourceMappingURL=AlgoliaSearch.d.ts.map