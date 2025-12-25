import fs from 'fs';
import path from 'path';

// [OUTSIDE THE BOX]
// Instead of testing code behavior (which might be mocked),
// we scan the actual source code for forbidden patterns on web files.

describe('Diagnostic: Web Compatibility Scan', () => {
    const srcDir = path.resolve(__dirname, '../');

    function scanDirectory(dir: string) {
        const files = fs.readdirSync(dir);
        let violations: string[] = [];

        files.forEach(file => {
            const fullPath = path.join(dir, file);
            const stat = fs.statSync(fullPath);

            if (stat.isDirectory()) {
                if (file !== '__tests__' && file !== 'node_modules') {
                    violations = [...violations, ...scanDirectory(fullPath)];
                }
            } else if (file.endsWith('.ts') || file.endsWith('.tsx')) {
                // Skip native-only files
                if (file.includes('.native.')) return;

                const content = fs.readFileSync(fullPath, 'utf8');

                // RULE 1: No top-level import of 'expo-secure-store' in non-native files
                if (content.match(/import\s+.*\s+from\s+['"]expo-secure-store['"]/)) {
                    // Exception: If it's a test file that mocks it, it's fine
                    if (!file.includes('.test.')) {
                        violations.push(`[CRITICAL] Forbidden import 'expo-secure-store' found in WEB/SHARED file: ${file}`);
                    }
                }
            }
        });
        return violations;
    }

    test('Project should not have toxic web imports', () => {
        const violations = scanDirectory(srcDir);
        if (violations.length > 0) {
            console.error("\n" + violations.join('\n'));
        }
        expect(violations.length).toBe(0);
    });
});
