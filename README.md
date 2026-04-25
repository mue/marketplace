# marketplace

Welcome to the Mue Marketplace repository. Here you can find a list of everything submitted to the marketplace.

If you wish to create your own add-on, please read the [documentation](https://muetab.com/docs/marketplace/create).

## Development

### Building

```bash
bun run build
```

This will process all marketplace items and generate the manifest files in the `dist/` directory.

### Testing

```bash
# Run tests once
bun test

# Run tests in watch mode
bun run test:watch

# Run tests with UI
bun run test:ui

# Run tests with coverage
bun run test:coverage
```
