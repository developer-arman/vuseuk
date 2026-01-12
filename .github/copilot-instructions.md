# Adobe Commerce on Edge Delivery Services (EDS) Project

## Architecture Overview

This is an **Adobe Experience Manager (AEM) Edge Delivery Services** project integrated with **Adobe Commerce** using the Drop-ins architecture. Content is authored in document-based tools and served via EDS while commerce functionality comes from pre-built Drop-in components.

### Core Layers
- **Content Layer**: Documents from `https://content.da.live/developer-arman/vuseuk/` (see [fstab.yaml](fstab.yaml))
- **Commerce Backend**: Adobe Commerce GraphQL endpoints configured in [config.json](config.json)
  - `commerce-core-endpoint`: Core Commerce GraphQL (customer, cart, orders)
  - `commerce-endpoint`: Catalog Service GraphQL (products, search)
- **Drop-ins**: Pre-built commerce components from `@dropins/*` packages installed in `scripts/__dropins__/`

### Project Folders
This workspace contains two projects:
- **`vuseuk/`**: Main AEM EDS + Commerce storefront (this project)
- **`dropintemplate/`**: Template for creating custom drop-in components (uses Elsie CLI)

## Critical Workflow: Drop-in Dependencies

**IMPORTANT**: Drop-in packages live in `node_modules/` but must be **manually copied** to `scripts/__dropins__/` for EDS to serve them:

```bash
npm install @dropins/storefront-cart@2.0.0  # Updates node_modules
npm run postinstall                          # REQUIRED: Copies to scripts/__dropins__
```

The `postinstall` script (via [build.mjs](build.mjs) and [postinstall.js](postinstall.js)) copies Drop-in assets from `node_modules/` to `scripts/__dropins__/`. This is **NOT automatic** when installing specific packages - you must explicitly run `npm run postinstall` or `npm run install:dropins`.

**Common pitfall**: After `npm install <specific-dropin>`, always run `npm run postinstall` manually. The npm postinstall hook only runs after full `npm install`, not for specific packages.

## Project Structure Patterns

### Blocks (Components)
All blocks follow this structure:
```
blocks/[block-name]/
  [block-name].js   # export default async function decorate(block) {}
  [block-name].css
  README.md         # Block configuration docs
```

**Standard blocks** ([cards/](blocks/cards), [carousel/](blocks/carousel), [hero/](blocks/hero)): Built with vanilla JS, decorated via `decorate(block)` function. Example:
```javascript
// blocks/cards/cards.js
export default function decorate(block) {
  const ul = document.createElement('ul');
  [...block.children].forEach((row) => {
    // Transform block DOM structure
  });
  block.replaceChildren(ul);
}
```

**Commerce blocks** ([commerce-cart/](blocks/commerce-cart), [product-details/](blocks/product-details), [product-list-page/](blocks/product-list-page)): Import Drop-in containers and use Preact rendering:
```javascript
// Import Drop-in components
import { render as provider } from '@dropins/storefront-cart/render.js';
import CartSummaryList from '@dropins/storefront-cart/containers/CartSummaryList.js';

// Import initializer to ensure Drop-in is configured
import '../../scripts/initializers/cart.js';

export default async function decorate(block) {
  // Read configuration from block table in content
  const config = readBlockConfig(block);
  
  // Render Drop-in with Preact provider
  return provider.render(CartSummaryList, {})(block);
}
```

### Scripts Architecture

- **[scripts/aem.js](scripts/aem.js)**: Core EDS utilities (`decorateBlocks`, `loadCSS`, `buildBlock`, `readBlockConfig`, etc.)
- **[scripts/scripts.js](scripts/scripts.js)**: Main entry point defining page lifecycle (`loadEager` → `loadLazy` → `loadDelayed`)
- **[scripts/commerce.js](scripts/commerce.js)**: Commerce-specific utilities, Drop-in initialization, GraphQL endpoint setup, link localization
- **[scripts/initializers/](scripts/initializers/)**: Individual Drop-in configuration files
  - `index.js`: Main initializer orchestrator
  - `auth.js`, `cart.js`, `checkout.js`, `pdp.js`, etc.: Per-dropin setup
  
**Always import the relevant initializer** in your block before using a Drop-in (e.g., `import '../../scripts/initializers/cart.js'`)

### Page Lifecycle
```javascript
// scripts/scripts.js
loadEager()  → initializeCommerce() → decorateMain() → loadCommerceEager()
  ↓            ↓ Initializes config.json, Drop-in endpoints
  ↓          decorateLinks() → Auto-localizes internal links
  ↓          buildAutoBlocks() → Converts fragment links to inline content
  ↓          decorateBlocks() → Loads block CSS/JS
  
loadLazy()   → loadHeader/Footer() → loadCommerceLazy()
  ↓ After main content loads
  ↓ Header/footer blocks decorated asynchronously
  
loadDelayed() → After 3s, import delayed.js
  ↓ Non-critical scripts (analytics, etc.)
```

## Commerce Integration Patterns

### GraphQL Endpoints
Two separate instances configured in [initializeCommerce()](scripts/commerce.js):
- **`CORE_FETCH_GRAPHQL`**: Core Commerce endpoint (`commerce-core-endpoint`)
  - Used for: Cart, checkout, customer, orders, auth
- **`CS_FETCH_GRAPHQL`**: Catalog Service endpoint (`commerce-endpoint`)
  - Used for: Product search, facets, PLP
  - Requires special headers: `Magento-Store-Code`, `Magento-Environment-Id`, `x-api-key`

Configure both in [config.json](config.json) under `public.default`.

### Drop-in Customization

**GraphQL Fragment Skipping**: [build.mjs](build.mjs) uses `@dropins/build-tools` to skip unsupported GraphQL fragments:
```javascript
overrideGQLOperations([{
  npm: '@dropins/storefront-cart',
  skipFragments: ['DOWNLOADABLE_CART_ITEMS_FRAGMENT'], // ACCS doesn't support downloadable items
}]);
```

**When to use**: Your Commerce backend doesn't support certain product types or features. Add to `build.mjs` and re-run `npm run postinstall`.

### Authentication Flow
- User token stored in cookie `auth_dropin_user_token` 
- [scripts/initializers/index.js](scripts/initializers/index.js) listens to `auth/authenticated` event → sets Authorization header on `CORE_FETCH_GRAPHQL`
- Customer group sent via `auth/group-uid` event → sets `Magento-Customer-Group` header on `CS_FETCH_GRAPHQL`
- Cart ID persisted to `sessionStorage.DROPINS_CART_ID`

### Event Bus Pattern
Drop-ins communicate via `@dropins/tools/event-bus`:
```javascript
import { events } from '@dropins/tools/event-bus.js';

// Listen to events (set eager: true for immediate execution)
events.on('auth/authenticated', setAuthHeaders, { eager: true });
events.on('cart/data', persistCartDataInSession, { eager: true });

// Emit events (handled by Drop-ins)
events.emit('cart/refresh');

// Enable logging for debugging
events.enableLogger(true);
```

**Common events**: `auth/authenticated`, `auth/group-uid`, `cart/data`, `cart/refresh`, `aem/lcp`

## Content Routing Conventions

- **Customer pages**: `/customer/*` ([commerce.js](scripts/commerce.js) defines constants like `CUSTOMER_PATH`, `CUSTOMER_ORDERS_PATH`)
- **Guest order tracking**: `/order-status`, `/order-details`
- **Products**: Metadata-driven via bulk metadata (see [tools/pdp-metadata/](tools/pdp-metadata/))
- **Fragments**: Links to `/fragments/*` auto-converted to inline content via [blocks/fragment/](blocks/fragment)

### Link Localization
All internal links are automatically localized via `decorateLinks()` in [commerce.js](scripts/commerce.js) based on `getRootPath()`. 

**To skip localization**: Add `#nolocal` hash to link: `<a href="/page#nolocal">`

## Development Workflow

### Local Development
```bash
npm install          # Install dependencies
npm run postinstall  # Copy Drop-ins to scripts/__dropins__
npm start            # Start AEM CLI dev server (aem up)
```

Access site at `http://localhost:3000`

### Updating Drop-ins
```bash
# Update a specific Drop-in
npm install @dropins/storefront-cart@latest
npm run postinstall  # CRITICAL: Must run manually

# Or use combined command
npm run install:dropins  # Runs build.mjs + postinstall.js
```

### Linting
```bash
npm run lint         # Check JS + CSS
npm run lint:fix     # Auto-fix issues
```

## Testing

### Cypress E2E Tests
Tests in [cypress/](cypress/) directory:
```bash
cd cypress && npm install

# Interactive mode
npm run cypress:open       # Tests against PaaS environment
npm run cypress:saas:open  # Tests against SaaS environment

# Headless mode
npm run cypress:run        # Run all PaaS tests
npm run cypress:saas:run   # Run all SaaS tests
```

**Environment configs**: 
- Base: `cypress.base.config.js`
- PaaS-specific: `cypress.paas.config.js`
- SaaS-specific: `cypress.saas.config.js`

**Skip tests by environment**: Use `{ tags: '@skipSaas' }` or `{ tags: '@skipPaas' }` in test definitions.

## Creating Custom Drop-ins

Use the `dropintemplate/` project (separate folder in this workspace):

```bash
cd ../dropintemplate
npm install

# Generate config
npx elsie generate config --name MyDropin

# Generate components/containers/API functions
npx elsie generate component --name MyComponent
npx elsie generate container --name MyContainer
npx elsie generate api --name myApiFunction

# Development (Storybook + sandbox)
npm run dev
```

See [dropintemplate/README.md](../dropintemplate/README.md) for full details.

## Key Conventions

1. **Block naming**: Kebab-case folder/file names matching block name (e.g., `product-list-page/product-list-page.js`)
2. **Import initializers**: Always import relevant initializer before using a Drop-in in blocks
3. **Block configuration**: Use `readBlockConfig(block)` to read key-value pairs from block tables in content
4. **CSS naming**: Use BEM-style naming in block CSS (`.block-name__element--modifier`)
5. **Fragment links**: Any link to `/fragments/*` will be automatically inlined during page load
6. **PlaceholderAPI**: Use `fetchPlaceholders()` from [commerce.js](scripts/commerce.js) for i18n labels

## Common Pitfalls

- **Forgetting `npm run postinstall`** after installing specific Drop-in packages
- **Not importing initializers** in commerce blocks (causes Drop-ins to be unconfigured)
- **Mixing GraphQL endpoints**: Cart/checkout use `CORE_FETCH_GRAPHQL`, search/PLP use `CS_FETCH_GRAPHQL`
- **Mutating block DOM before decorating**: Standard blocks receive raw block DOM and should transform it
- **Not checking for existing cookie/token** before calling auth APIs
npm run cypress:open    # PaaS environment (default)
npm run cypress:saas:open  # SaaS environment
```

Tests use environment-specific configs ([cypress.paas.config.js](cypress/cypress.paas.config.js), [cypress.saas.config.js](cypress/cypress.saas.config.js)) extending [cypress.base.config.js](cypress/cypress.base.config.js). Tag tests with `{ tags: '@skipSaas' }` or `{ tags: '@skipPaas' }` for environment-specific skips.

## Local Development

```bash
npm install          # Installs deps and runs postinstall automatically
npm start            # Runs AEM CLI dev server (aem up) on http://localhost:3000
npm run lint         # ESLint + Stylelint
npm run lint:fix     # Auto-fix linting issues
```

## Key Files Reference

- [config.json](config.json): GraphQL endpoints, store codes, API keys, analytics config
- [fstab.yaml](fstab.yaml): Content source mountpoint
- [head.html](head.html): Metadata template for all pages
- [default-site.json](default-site.json): Sitemap configuration
- [404.html](404.html), [418.html](418.html): Error page templates
