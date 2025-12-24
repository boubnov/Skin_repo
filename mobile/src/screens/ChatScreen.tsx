import React, { useState, useRef } from 'react';
import { View, Text, TextInput, StyleSheet, FlatList, KeyboardAvoidingView, Platform, TouchableOpacity, ActivityIndicator, Image, Alert, ActionSheetIOS } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import ChatBubble from '../components/ChatBubble';
import { useChat } from '../hooks/useChat';
import { COLORS, SPACING, RADIUS, SHADOWS } from '../theme';

// Professional quick prompts
const QUICK_PROMPTS = [
    "What products do you recommend for oily skin?",
    "How should I treat acne scars?",
    "Best SPF for sensitive skin?",
    "Evening routine for anti-aging",
];

export default function ChatScreen({ navigation }: any) {
    const { messages, isLoading, sendMessage, setMessages } = useChat();
    const [inputText, setInputText] = useState('');
    const [selectedImage, setSelectedImage] = useState<string | null>(null);
    const flatListRef = useRef<FlatList>(null);

    const handleSend = () => {
        if (!inputText.trim() && !selectedImage) return;
        sendMessage(inputText, selectedImage || undefined);
        setInputText('');
        setSelectedImage(null);
    };

    const handlePromptPress = (prompt: string) => {
        sendMessage(prompt);
    };

    const pickImage = async (useCamera: boolean) => {
        try {
            // Request permissions
            if (useCamera) {
                const { status } = await ImagePicker.requestCameraPermissionsAsync();
                if (status !== 'granted') {
                    Alert.alert('Permission needed', 'Please allow camera access to take photos.');
                    return;
                }
            } else {
                const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
                if (status !== 'granted') {
                    Alert.alert('Permission needed', 'Please allow photo library access to select images.');
                    return;
                }
            }

            const result = useCamera
                ? await ImagePicker.launchCameraAsync({
                    mediaTypes: ['images'],
                    allowsEditing: true,
                    aspect: [4, 3],
                    quality: 0.7,
                    base64: true,
                })
                : await ImagePicker.launchImageLibraryAsync({
                    mediaTypes: ['images'],
                    allowsEditing: true,
                    aspect: [4, 3],
                    quality: 0.7,
                    base64: true,
                });

            if (!result.canceled && result.assets[0]) {
                const asset = result.assets[0];
                // Store base64 with data URI prefix for display and sending
                const base64Image = `data:image/jpeg;base64,${asset.base64}`;
                setSelectedImage(base64Image);
            }
        } catch (error) {
            console.error('Image picker error:', error);
            Alert.alert('Error', 'Failed to pick image. Please try again.');
        }
    };

    const showImageOptions = () => {
        if (Platform.OS === 'ios') {
            ActionSheetIOS.showActionSheetWithOptions(
                {
                    options: ['Cancel', 'Take Photo', 'Choose from Library'],
                    cancelButtonIndex: 0,
                },
                (buttonIndex) => {
                    if (buttonIndex === 1) pickImage(true);
                    else if (buttonIndex === 2) pickImage(false);
                }
            );
        } else {
            // For Android/Web, show simple alert with options
            Alert.alert(
                'Add Photo',
                'Choose an option',
                [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Take Photo', onPress: () => pickImage(true) },
                    { text: 'Choose from Library', onPress: () => pickImage(false) },
                ]
            );
        }
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

            {/* Selected image preview */}
            {selectedImage && (
                <View style={styles.imagePreviewContainer}>
                    <Image source={{ uri: selectedImage }} style={styles.imagePreview} />
                    <TouchableOpacity
                        style={styles.removeImageButton}
                        onPress={() => setSelectedImage(null)}
                    >
                        <Text style={styles.removeImageText}>✕</Text>
                    </TouchableOpacity>
                </View>
            )}

            {/* Input area */}
            <View style={styles.inputArea}>
                <View style={styles.inputWrapper}>
                    {/* Image picker button */}
                    <TouchableOpacity
                        style={styles.imageButton}
                        onPress={showImageOptions}
                        disabled={isLoading}
                    >
                        <Text style={styles.imageButtonText}>📷</Text>
                    </TouchableOpacity>

                    <TextInput
                        style={styles.input}
                        value={inputText}
                        onChangeText={setInputText}
                        placeholder={selectedImage ? "Describe your concern..." : "Ask about skincare..."}
                        placeholderTextColor={COLORS.textLight}
                        editable={!isLoading}
                        onSubmitEditing={handleSend}
                        multiline
                    />
                    <TouchableOpacity
                        style={[styles.sendButton, ((!inputText.trim() && !selectedImage) || isLoading) && styles.sendButtonDisabled]}
                        onPress={handleSend}
                        disabled={(!inputText.trim() && !selectedImage) || isLoading}
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

    // Image preview
    imagePreviewContainer: {
        marginHorizontal: SPACING.m,
        marginBottom: SPACING.s,
        position: 'relative',
        alignSelf: 'flex-start',
    },
    imagePreview: {
        width: 100,
        height: 100,
        borderRadius: RADIUS.m,
        backgroundColor: COLORS.border,
    },
    removeImageButton: {
        position: 'absolute',
        top: -8,
        right: -8,
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: COLORS.error,
        justifyContent: 'center',
        alignItems: 'center',
        ...SHADOWS.small,
    },
    removeImageText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: 'bold',
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
    imageButton: {
        width: 44,
        height: 44,
        borderRadius: RADIUS.m,
        backgroundColor: COLORS.secondaryButton,
        justifyContent: 'center',
        alignItems: 'center',
    },
    imageButtonText: {
        fontSize: 20,
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
