import { registerRootComponent } from 'expo';
import { Platform } from 'react-native';

console.log('🚀 [INDEX.TS] Entry point loaded!');

import App from './App';

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);

// [DEBUG] Web Fallback Probe
if (Platform.OS === 'web') {
    console.log('🌍 [INDEX.TS] Web Platform detected.');
    // Check if root exists after a slight delay, if not, try to force render
    setTimeout(() => {
        const root = document.getElementById('root');
        console.log('🔍 [INDEX.TS] Checking SDK root:', root);
        if (!root || root.innerHTML.trim() === '') {
            console.warn('⚠️ [INDEX.TS] Root is empty! Attempting emergency render...');
            // Create a visible debug element
            const debugDiv = document.createElement('div');
            debugDiv.style.padding = '20px';
            debugDiv.style.backgroundColor = 'yellow';
            debugDiv.style.color = 'black';
            debugDiv.style.fontSize = '20px';
            debugDiv.innerHTML = '<h1>DEBUG MODE</h1><p>React Native Web failed to mount.</p><p>Check console logs.</p>';
            document.body.prepend(debugDiv);
        }
    }, 2000);
}
