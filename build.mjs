import { overrideGQLOperations } from '@dropins/build-tools/gql-extend.js';

overrideGQLOperations([
  // ACCS does not have Downloadable Items
  {
    npm: '@dropins/storefront-cart',
    skipFragments: ['DOWNLOADABLE_CART_ITEMS_FRAGMENT'],
    operations: [],
  },
  {
    npm: '@dropins/storefront-order',
    skipFragments: ['DOWNLOADABLE_ORDER_ITEMS_FRAGMENT'],
    operations: [],
  },
  {
    npm: '@dropins/storefront-product-discovery',
    operations: [
      // Here we are adding the options to the ProductView fragment
      // that we can use in the PLP to render the options in the product actions
      `
        fragment ProductView on ProductSearchItem {
          productView {
            ... on ComplexProductView {
              options {
                id
                title
                values {
                  id
                  title
                }
              }
            }
          }
        }
      `,
    ],
  },
  // {
  //   npm: '@dropins/storefront-checkout',
  //   operations: [],
  // },
  // {
  //   npm: '@dropins/storefront-pdp',
  //   operations: [
  //     `
  //     fragment PRODUCT_FRAGMENT on ProductView {
  //       lowStock
  //     }
  //     `,
  //   ],
  // },
]);
