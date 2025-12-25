/**
 * Diagnostic Test Suite for Web Platform Loading Issues
 * 
 * This test file analyzes the codebase for known issues that cause
 * the website to hang/never load on web platforms.
 * 
 * Run with: npm test -- --testPathPattern="diagnosic_web_issues"
 */

import * as fs from 'fs';
import * as path from 'path';

describe('Web Platform Compatibility Diagnostics', () => {
    const srcDir = path.join(__dirname, '..');

    describe('Issue #1: expo-secure-store Web Compatibility', () => {
        it('storage.ts should use platform-specific storage (localStorage for web)', () => {
            const storagePath = path.join(srcDir, 'utils', 'storage.ts');
            const content = fs.readFileSync(storagePath, 'utf-8');

            // Check if it's using expo-secure-store directly
            const usesSecureStoreDirectly = content.includes('expo-secure-store');
            const hasPlatformCheck = content.includes('Platform.OS') || content.includes("Platform.select");
            const hasLocalStorageFallback = content.includes('localStorage');

            console.log('\n--- Storage Analysis ---');
            console.log('Uses expo-secure-store directly:', usesSecureStoreDirectly);
            console.log('Has platform check:', hasPlatformCheck);
            console.log('Has localStorage fallback:', hasLocalStorageFallback);

            if (usesSecureStoreDirectly && !hasPlatformCheck) {
                console.error('\n❌ CRITICAL ISSUE DETECTED:');
                console.error('storage.ts uses expo-secure-store without platform detection.');
                console.error('expo-secure-store does NOT support web and will hang/fail silently.');
                console.error('\nRECOMMENDED FIX:');
                console.error(`
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

export const storage = {
    getItem: async (key: string): Promise<string | null> => {
        if (Platform.OS === 'web') {
            return localStorage.getItem(key);
        }
        return SecureStore.getItemAsync(key);
    },
    setItem: async (key: string, value: string): Promise<void> => {
        if (Platform.OS === 'web') {
            localStorage.setItem(key, value);
            return;
        }
        return SecureStore.setItemAsync(key, value);
    },
    deleteItem: async (key: string): Promise<void> => {
        if (Platform.OS === 'web') {
            localStorage.removeItem(key);
            return;
        }
        return SecureStore.deleteItemAsync(key);
    },
};
`);
            }

            // This test documents the issue - we expect it to fail until fixed
            expect(hasLocalStorageFallback || hasPlatformCheck).toBe(true);
        });
    });

    describe('Issue #2: React Hook Rules Violation', () => {
        it('ResponsiveContainer.tsx should not call hooks after conditional returns', () => {
            const containerPath = path.join(srcDir, 'components', 'ResponsiveContainer.tsx');
            const content = fs.readFileSync(containerPath, 'utf-8');
            const lines = content.split('\n');

            let foundEarlyReturn = false;
            let hookAfterReturn = false;
            let issueLineNumber = -1;

            for (let i = 0; i < lines.length; i++) {
                const line = lines[i];
                // Look for early return in the component
                if (line.includes('return') && line.includes('<>')) {
                    foundEarlyReturn = true;
                }
                // After early return, check for hook calls
                if (foundEarlyReturn && line.includes('useWindowDimensions')) {
                    hookAfterReturn = true;
                    issueLineNumber = i + 1;
                    break;
                }
            }

            console.log('\n--- ResponsiveContainer Hook Analysis ---');
            console.log('Found early conditional return:', foundEarlyReturn);
            console.log('Hook called after conditional return:', hookAfterReturn);
            if (hookAfterReturn) {
                console.error(`\n❌ REACT HOOK RULES VIOLATION at line ${issueLineNumber}:`);
                console.error('useWindowDimensions is called AFTER a conditional return.');
                console.error('This violates React\'s Rules of Hooks and causes unpredictable behavior.');
                console.error('\nRECOMMENDED FIX:');
                console.error('Move useWindowDimensions BEFORE any conditional returns:');
                console.error(`
export const ResponsiveContainer = ({ children }: { children: React.ReactNode }) => {
    const { width } = useWindowDimensions();  // MOVE TO TOP - before any returns
    
    if (Platform.OS !== 'web') {
        return <>{children}</>;
    }
    // ... rest of component
};
`);
            }

            expect(hookAfterReturn).toBe(false);
        });
    });

    describe('Issue #3: Unreachable Code in App.tsx', () => {
        it('App.tsx should not have unreachable code after return statements', () => {
            const appPath = path.join(__dirname, '..', '..', 'App.tsx');
            const content = fs.readFileSync(appPath, 'utf-8');
            const lines = content.split('\n');

            // Look for duplicate return patterns
            const stackNavigatorReturns = [];
            for (let i = 0; i < lines.length; i++) {
                if (lines[i].includes('return (') &&
                    i + 1 < lines.length &&
                    lines[i + 1].includes('Stack.Navigator')) {
                    stackNavigatorReturns.push(i + 1);
                }
            }

            console.log('\n--- App.tsx Code Analysis ---');
            console.log('Stack.Navigator return statements found at lines:', stackNavigatorReturns);

            // Check for duplicate consecutive Stack.Navigator returns (unreachable code)
            let hasUnreachableCode = false;
            if (stackNavigatorReturns.length > 4) {  // More than expected
                console.error('\n⚠️ WARNING: Possible unreachable code detected');
                console.error('There appear to be duplicate Stack.Navigator returns.');
                hasUnreachableCode = true;
            }

            // Look for specific pattern: return followed by another return without proper branching
            for (let i = 0; i < lines.length - 5; i++) {
                if (lines[i].trim() === 'return (' &&
                    lines[i + 4] && lines[i + 4].includes('</Stack.Navigator>') &&
                    lines[i + 6] && lines[i + 6].includes('return (')) {
                    console.error(`\n❌ UNREACHABLE CODE at line ${i + 7}:`);
                    console.error('Code after a return statement is never executed.');
                    hasUnreachableCode = true;
                }
            }

            expect(hasUnreachableCode).toBe(false);
        });
    });

    describe('Summary: All Web Loading Issues', () => {
        it('should summarize all detected issues', () => {
            console.log('\n' + '='.repeat(60));
            console.log('WEB LOADING ISSUE DIAGNOSTIC SUMMARY');
            console.log('='.repeat(60));

            const issues = [];

            // Check storage.ts
            const storagePath = path.join(srcDir, 'utils', 'storage.ts');
            const storageContent = fs.readFileSync(storagePath, 'utf-8');
            if (storageContent.includes('expo-secure-store') && !storageContent.includes('Platform')) {
                issues.push({
                    severity: 'CRITICAL',
                    file: 'src/utils/storage.ts',
                    issue: 'expo-secure-store used without web fallback',
                    impact: 'App hangs indefinitely on web - auth never completes loading'
                });
            }

            // Check ResponsiveContainer.tsx
            const containerPath = path.join(srcDir, 'components', 'ResponsiveContainer.tsx');
            const containerContent = fs.readFileSync(containerPath, 'utf-8');
            const containerLines = containerContent.split('\n');
            let returnLineNum = -1;
            let hookLineNum = -1;
            for (let i = 0; i < containerLines.length; i++) {
                if (containerLines[i].includes("Platform.OS !== 'web'") && returnLineNum === -1) {
                    returnLineNum = i;
                }
                if (containerLines[i].includes('useWindowDimensions') && hookLineNum === -1) {
                    hookLineNum = i;
                }
            }
            if (hookLineNum > returnLineNum && returnLineNum !== -1) {
                issues.push({
                    severity: 'HIGH',
                    file: 'src/components/ResponsiveContainer.tsx',
                    issue: 'React hook called after conditional return',
                    impact: 'Violates Rules of Hooks - unpredictable behavior/crashes'
                });
            }

            // Check App.tsx for unreachable code
            const appPath = path.join(srcDir, '..', 'App.tsx');
            const appContent = fs.readFileSync(appPath, 'utf-8');
            if ((appContent.match(/\/\/ 4\. MOBILE:/g) || []).length > 1 ||
                (appContent.match(/return \(\n\s*<Stack\.Navigator/g) || []).length > 4) {
                issues.push({
                    severity: 'MEDIUM',
                    file: 'App.tsx',
                    issue: 'Unreachable duplicate code after return',
                    impact: 'Dead code - no runtime impact but confusing'
                });
            }

            // Print summary
            if (issues.length === 0) {
                console.log('\n✅ No issues detected!');
            } else {
                console.log(`\n❌ Found ${issues.length} issue(s):\n`);
                issues.forEach((issue, idx) => {
                    console.log(`[${idx + 1}] ${issue.severity}: ${issue.file}`);
                    console.log(`    Issue: ${issue.issue}`);
                    console.log(`    Impact: ${issue.impact}\n`);
                });
            }

            console.log('='.repeat(60));

            // Fail the test if there are critical issues
            const criticalIssues = issues.filter(i => i.severity === 'CRITICAL');
            expect(criticalIssues.length).toBe(0);
        });
    });
});
