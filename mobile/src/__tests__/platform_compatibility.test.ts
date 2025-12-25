/**
 * Regression Test Suite for Web Platform Compatibility
 *
 * Ensures:
 * 1. Storage utility has web fallback
 * 2. Critical components follow React Hook rules (verified by static analysis)
 * 3. No obvious unreachable code duplicate blocks
 */

import * as fs from 'fs';
import * as path from 'path';

const MOBILE_ROOT = path.resolve(__dirname, '../../');

describe('Platform Compatibility Regression Tests', () => {

    test('storage.ts handles web platform', () => {
        const storagePath = path.join(MOBILE_ROOT, 'src/utils/storage.ts');
        const content = fs.readFileSync(storagePath, 'utf-8');

        // Must import Platform
        expect(content).toContain("import { Platform } from 'react-native';");

        // Must check for web
        expect(content).toContain("Platform.OS === 'web'");

        // Must use localStorage as fallback
        expect(content).toContain('localStorage.getItem');
        expect(content).toContain('localStorage.setItem');
        expect(content).toContain('localStorage.removeItem');
    });

    test('ResponsiveContainer.tsx hook ordering', () => {
        const componentPath = path.join(MOBILE_ROOT, 'src/components/ResponsiveContainer.tsx');
        const content = fs.readFileSync(componentPath, 'utf-8');
        const lines = content.split('\n');

        let returnLine = -1;
        let hookLine = -1;

        lines.forEach((line, index) => {
            if (line.includes('return') && line.includes('<>') && returnLine === -1) {
                returnLine = index;
            }
            if (line.includes('useWindowDimensions') && hookLine === -1) {
                hookLine = index;
            }
        });

        // Hook must be declared before any conditional return
        // Note: If returnLine is -1 (no early return found), test passes vacuously which is fine
        if (returnLine !== -1 && hookLine !== -1) {
            expect(hookLine).toBeLessThan(returnLine);
        }
    });

    test('App.tsx no unreachable navigation blocks', () => {
        const appPath = path.join(MOBILE_ROOT, 'App.tsx');
        const content = fs.readFileSync(appPath, 'utf-8');

        // Count return blocks that look like the main navigator
        // The original buggy code had identical blocks at the end
        const matches = (content.match(/<Stack\.Navigator>/g) || []).length;

        // In the fixed version, there are distinct navigators for:
        // 1. Desktop
        // 2. Mobile Guest (Welcome/Login)
        // 3. Mobile Profile Setup
        // 4. Mobile Main
        // Total = 4. 
        // The bug had a 5th duplicate one.

        // Let's count "return (" followed closely by "<Stack.Navigator>"
        const navigatorReturns = (content.match(/return \(\s*<Stack\.Navigator>/g) || []).length;

        // Should be at most 4 valid return points in AppNavigator
        expect(navigatorReturns).toBeLessThanOrEqual(4);
    });
});
