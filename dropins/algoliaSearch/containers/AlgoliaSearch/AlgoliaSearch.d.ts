import { HTMLAttributes } from 'preact/compat';
import { Container } from '@dropins/tools/types/elsie/src/lib';
import { searchProducts, AlgoliaSearchResult } from '../../api/algoliaApi';

export interface AlgoliaSearchProps extends HTMLAttributes<HTMLDivElement> {
    query?: string;
    onResultSelect?: (result: AlgoliaSearchResult) => void;
    hitsPerPage?: number;
    searchFn?: typeof searchProducts;
}
export declare const AlgoliaSearch: Container<AlgoliaSearchProps>;
//# sourceMappingURL=AlgoliaSearch.d.ts.map