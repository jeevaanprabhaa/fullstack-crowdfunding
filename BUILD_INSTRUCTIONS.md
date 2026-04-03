# Build Instructions

## Important: Dependency Installation

Due to a peer dependency conflict between Mantine packages, you MUST use the `--legacy-peer-deps` flag:

```bash
npm install --legacy-peer-deps
```

## Running the Build

After installing dependencies, build the project:

```bash
npm run build
```

## Expected Build Output

The build process will:
1. Run TypeScript compiler (`tsc`)
2. Run Vite build
3. Create a `dist/` folder with production assets

## If Build Fails

### TypeScript Errors
If you see TypeScript errors, they're likely related to:
- Missing type definitions
- Import path issues
- Type mismatches in new services

### Vite Build Errors
Common issues:
- Missing dependencies (run install again)
- Environment variable issues (check .env)
- Import path case sensitivity

## Build Verification Steps

1. Install dependencies:
```bash
rm -rf node_modules package-lock.json
npm install --legacy-peer-deps
```

2. Build the project:
```bash
npm run build
```

3. Preview the production build:
```bash
npm run preview
```

4. Test the production build at `http://localhost:4173`

## Production Deployment

After a successful build:
- Deploy the `dist/` folder to Netlify, Vercel, or any static host
- Set environment variables in your hosting platform
- Ensure all VITE_* variables are configured

## Notes

- The project uses TypeScript strict mode
- All new services follow TypeScript best practices
- Auth context is properly typed
- Supabase types are generated from the database schema
