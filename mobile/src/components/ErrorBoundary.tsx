import React from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';

interface Props {
    children: React.ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
    errorInfo: React.ErrorInfo | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = { hasError: false, error: null, errorInfo: null };
    }

    static getDerivedStateFromError(error: Error) {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
        console.error("ErrorBoundary caught an error:", error, errorInfo);
        this.setState({ errorInfo });
    }

    resetError = () => {
        this.setState({ hasError: false, error: null, errorInfo: null });
    }

    render() {
        if (this.state.hasError) {
            return (
                <View style={styles.container}>
                    <ScrollView contentContainerStyle={styles.content}>
                        <Text style={styles.title}>Something went wrong!</Text>
                        <Text style={styles.subtitle}>
                            This is a custom Error Boundary. If you see this, we caught the crash.
                        </Text>

                        <View style={styles.card}>
                            <Text style={styles.errorTitle}>Error:</Text>
                            <Text style={styles.errorText}>{this.state.error?.toString()}</Text>
                        </View>

                        {this.state.errorInfo && (
                            <View style={styles.card}>
                                <Text style={styles.errorTitle}>Stack Trace:</Text>
                                <Text style={styles.stackText}>
                                    {this.state.errorInfo.componentStack}
                                </Text>
                            </View>
                        )}

                        <TouchableOpacity style={styles.button} onPress={this.resetError}>
                            <Text style={styles.buttonText}>Try Again</Text>
                        </TouchableOpacity>
                    </ScrollView>
                </View>
            );
        }

        return this.props.children;
    }
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FFEBEE', // Light Red background
        padding: 20,
        justifyContent: 'center',
    },
    content: {
        flexGrow: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#D32F2F',
        marginBottom: 10,
    },
    subtitle: {
        fontSize: 16,
        color: '#555',
        textAlign: 'center',
        marginBottom: 20,
    },
    card: {
        backgroundColor: 'white',
        padding: 15,
        borderRadius: 8,
        width: '100%',
        marginBottom: 15,
        borderWidth: 1,
        borderColor: '#EF9A9A',
    },
    errorTitle: {
        fontWeight: 'bold',
        marginBottom: 5,
        color: '#D32F2F',
    },
    errorText: {
        color: '#C62828',
        fontFamily: 'monospace',
    },
    stackText: {
        color: '#333',
        fontSize: 10,
        fontFamily: 'monospace',
    },
    button: {
        backgroundColor: '#D32F2F',
        paddingVertical: 12,
        paddingHorizontal: 24,
        borderRadius: 8,
    },
    buttonText: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 16,
    },
});
