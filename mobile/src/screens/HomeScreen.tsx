import React from 'react';
import { View, Text, Button, StyleSheet } from 'react-native';
import { useAuth } from '../context/AuthContext';

export default function HomeScreen({ navigation }: any) {
    const { logout } = useAuth();

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Welcome back!</Text>
            <Text style={styles.subtitle}>You are logged in.</Text>
            <View style={styles.spacer} />

            <Button title="💬 Chat with AI Assistant" onPress={() => navigation.navigate('Chat')} />
            <View style={styles.spacer} />

            <Button title="⚙️ Settings (API Key)" onPress={() => navigation.navigate('Settings')} />
            <View style={styles.spacer} />

            <Button title="Logout" onPress={logout} color="red" />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#fff',
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
    },
    subtitle: {
        fontSize: 16,
        color: '#666',
        marginTop: 8,
    },
    spacer: {
        height: 40,
    }
});
