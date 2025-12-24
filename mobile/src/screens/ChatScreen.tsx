import React, { useState, useRef } from 'react';
import { View, Text, TextInput, StyleSheet, FlatList, KeyboardAvoidingView, Platform, TouchableOpacity, ActivityIndicator } from 'react-native';
import ChatBubble from '../components/ChatBubble';
import { useChat } from '../hooks/useChat';
import { COLORS, SPACING, RADIUS, SHADOWS, TYPOGRAPHY } from '../theme';

// Professional quick prompts
const QUICK_PROMPTS = [
    "What products do you recommend for oily skin?",
    "How should I treat acne scars?",
    "Best SPF for sensitive skin?",
    "Evening routine for anti-aging",
];

export default function ChatScreen({ navigation }: any) {
    const { messages, isLoading, apiKey, sendMessage, setMessages } = useChat();
    const [inputText, setInputText] = useState('');
    const flatListRef = useRef<FlatList>(null);

    const handleSend = () => {
        if (!inputText.trim()) return;
        sendMessage(inputText);
        setInputText('');
    };

    const handlePromptPress = (prompt: string) => {
        sendMessage(prompt);
    };

    // Show welcome state when no messages
    const showWelcome = messages.length <= 1 && !isLoading;

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === "ios" ? "padding" : undefined}
            keyboardVerticalOffset={90}
            enabled={Platform.OS !== "web"}
        >
            {/* Messages or Welcome */}
            {showWelcome ? (
                <View style={styles.welcomeContainer}>
                    <View style={styles.welcomeContent}>
                        <Text style={styles.welcomeTitle}>AI Skin Consultant</Text>
                        <Text style={styles.welcomeSubtitle}>
                            Get personalized skincare advice, product recommendations, and answers to your skin concerns.
                        </Text>

                        {/* Medical Disclaimer */}
                        <View style={styles.disclaimerBox}>
                            <Text style={styles.disclaimerText}>
                                ⚠️ This is not medical advice. For serious skin conditions, consult a dermatologist.
                            </Text>
                        </View>

                        <Text style={styles.promptsLabel}>Try asking about:</Text>
                        <View style={styles.promptsGrid}>
                            {QUICK_PROMPTS.map((prompt, index) => (
                                <TouchableOpacity
                                    key={index}
                                    style={styles.promptCard}
                                    onPress={() => handlePromptPress(prompt)}
                                    activeOpacity={0.7}
                                >
                                    <Text style={styles.promptText}>{prompt}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>
                </View>
            ) : (
                <FlatList
                    ref={flatListRef}
                    data={messages}
                    keyExtractor={item => item.id}
                    contentContainerStyle={styles.messagesContainer}
                    onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
                    renderItem={({ item }) => <ChatBubble item={item} />}
                />
            )}

            {/* Typing indicator */}
            {isLoading && (
                <View style={styles.typingContainer}>
                    <View style={styles.typingBubble}>
                        <ActivityIndicator size="small" color={COLORS.primary} />
                        <Text style={styles.typingText}>Thinking...</Text>
                    </View>
                </View>
            )}

            {/* Input area */}
            <View style={styles.inputArea}>
                <View style={styles.inputWrapper}>
                    <TextInput
                        style={styles.input}
                        value={inputText}
                        onChangeText={setInputText}
                        placeholder="Ask about skincare..."
                        placeholderTextColor={COLORS.textLight}
                        editable={!isLoading}
                        onSubmitEditing={handleSend}
                        multiline
                    />
                    <TouchableOpacity
                        style={[styles.sendButton, (!inputText.trim() || isLoading) && styles.sendButtonDisabled]}
                        onPress={handleSend}
                        disabled={!inputText.trim() || isLoading}
                    >
                        <Text style={styles.sendButtonText}>Send</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },

    // Welcome state
    welcomeContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: SPACING.xl,
    },
    welcomeContent: {
        maxWidth: 500,
        alignItems: 'center',
    },
    welcomeTitle: {
        fontSize: 24,
        fontWeight: '600',
        color: COLORS.text,
        marginBottom: SPACING.s,
        textAlign: 'center',
    },
    welcomeSubtitle: {
        fontSize: 15,
        color: COLORS.textLight,
        textAlign: 'center',
        lineHeight: 22,
        marginBottom: SPACING.m,
    },
    disclaimerBox: {
        backgroundColor: COLORS.warningBG,
        borderRadius: RADIUS.m,
        padding: SPACING.m,
        marginBottom: SPACING.xl,
        borderLeftWidth: 3,
        borderLeftColor: COLORS.warning,
    },
    disclaimerText: {
        fontSize: 13,
        color: COLORS.text,
        textAlign: 'center',
        lineHeight: 18,
    },
    promptsLabel: {
        fontSize: 13,
        fontWeight: '500',
        color: COLORS.textLight,
        marginBottom: SPACING.m,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    promptsGrid: {
        width: '100%',
    },
    promptCard: {
        backgroundColor: COLORS.card,
        borderRadius: RADIUS.m,
        padding: SPACING.m,
        marginBottom: SPACING.s,
        borderWidth: 1,
        borderColor: COLORS.border,
        ...SHADOWS.small,
    },
    promptText: {
        fontSize: 14,
        color: COLORS.text,
    },

    // Messages
    messagesContainer: {
        padding: SPACING.m,
        paddingBottom: SPACING.xl,
    },

    // Typing indicator
    typingContainer: {
        paddingHorizontal: SPACING.m,
        paddingBottom: SPACING.s,
    },
    typingBubble: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.card,
        paddingVertical: SPACING.s,
        paddingHorizontal: SPACING.m,
        borderRadius: RADIUS.m,
        alignSelf: 'flex-start',
        ...SHADOWS.small,
    },
    typingText: {
        marginLeft: SPACING.s,
        fontSize: 13,
        color: COLORS.textLight,
    },

    // Input area
    inputArea: {
        padding: SPACING.m,
        paddingBottom: Platform.OS === 'ios' ? SPACING.xl : SPACING.m,
        backgroundColor: COLORS.card,
        borderTopWidth: 1,
        borderTopColor: COLORS.border,
    },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        gap: SPACING.s,
    },
    input: {
        flex: 1,
        borderWidth: 1,
        borderColor: COLORS.border,
        borderRadius: RADIUS.l,
        paddingHorizontal: SPACING.m,
        paddingVertical: 12,
        fontSize: 15,
        backgroundColor: COLORS.background,
        maxHeight: 120,
        color: COLORS.text,
    },
    sendButton: {
        backgroundColor: COLORS.primary,
        paddingHorizontal: SPACING.l,
        paddingVertical: 12,
        borderRadius: RADIUS.l,
    },
    sendButtonDisabled: {
        backgroundColor: COLORS.border,
    },
    sendButtonText: {
        color: '#FFFFFF',
        fontWeight: '600',
        fontSize: 15,
    },
});
