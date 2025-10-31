# Build Error Fixes

## Common TypeScript Import Errors

### Error: "Cannot find name 'ComponentName'"

**Solution:**
1. Verify the component file exists at the correct path
2. Check if the import uses correct syntax:
   - Default export: `import ComponentName from './ComponentName'`
   - Named export: `import { ComponentName } from './ComponentName'`
3. For conditional rendering issues, use dynamic imports:
   ```tsx
   import dynamic from 'next/dynamic';
   const ComponentName = dynamic(() => import('./ComponentName'), { ssr: false });
   ```

### Prevention

1. **Type checking before build:**
   - Run `npm run type-check` before committing
   - This is automatically run before build via `prebuild` script

2. **IDE Configuration:**
   - Ensure your IDE (VS Code) has TypeScript language support enabled
   - Install TypeScript extension for better error detection

3. **Import Best Practices:**
   - Always use explicit file extensions in imports (avoid implicit .ts/.tsx)
   - Use absolute imports with `@/` alias for consistency
   - Group imports: external → internal → relative

## Build Commands

- `npm run type-check` - Check TypeScript errors without building
- `npm run build` - Build with type checking (runs prebuild automatically)
- `npm run lint` - Run ESLint

## Vercel Deployment

If builds fail on Vercel:

1. Check Node.js version matches `package.json` engines requirement (>=18.17.0)
2. Ensure all imports are valid and components exist
3. Check build logs for specific TypeScript errors
4. Clear Vercel build cache if needed

