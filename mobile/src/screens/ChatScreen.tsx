import React, { useState, useRef } from 'react';
import { View, Text, TextInput, Button, StyleSheet, FlatList, Alert, KeyboardAvoidingView, Platform, TouchableOpacity } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import ChatBubble from '../components/ChatBubble';
import { useChat } from '../hooks/useChat';
import { COLORS, SPACING, RADIUS } from '../theme';

export default function ChatScreen({ navigation }: any) {
    const { messages, isLoading, apiKey, sendMessage, setMessages } = useChat();
    const [inputText, setInputText] = useState('');
    const flatListRef = useRef<FlatList>(null);

    const handleSend = () => {
        sendMessage(inputText);
        setInputText('');
    };

    const handleChipPress = (chipText: string) => {
        setInputText(chipText);
        sendMessage(chipText);
    };

    const handleCamera = async () => {
        const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
        if (permissionResult.granted === false) {
            Alert.alert("Permission to access camera is required!");
            return;
        }

        const result = await ImagePicker.launchCameraAsync({
            mediaTypes: ["images"],
            allowsEditing: true,
            aspect: [4, 3],
            quality: 0.5,
        });

        if (!result.canceled) {
            const uri = result.assets[0].uri;
            // Send the photo immediately as a user message
            sendMessage("Check my skin redness.", uri);

            // Mock Analysis Response (simulating the backend processing the image)
            setTimeout(() => {
                const redness = Math.floor(Math.random() * 10) + 1;
                const analysisText = `[Selfie Analysis] 📸\nBased on your photo, I detect a Redness Score of **${redness}/10**.\n\nI recommend using a soothing product like *Cicaplast* or *Aloe Vera*.`;

                // Manually inject AI response since we aren't actually uploading to backend yet
                setMessages((prev: any) => [...prev, {
                    id: Date.now().toString(),
                    role: 'model',
                    content: analysisText
                }]);
            }, 2000);
        }
    };

    if (!apiKey && !isLoading && messages.length === 0) {
        // Simple empty state or loading until checkKey finishes
        return <View style={styles.container} />;
    }

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === "ios" ? "padding" : undefined}
            keyboardVerticalOffset={90}
            enabled={Platform.OS !== "web"}
        >
            <FlatList
                ref={flatListRef}
                data={messages}
                keyExtractor={item => item.id}
                contentContainerStyle={styles.listContent}
                onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
                renderItem={({ item }) => <ChatBubble item={item} />}
            />

            {isLoading && (
                <View style={styles.loadingContainer}>
                    <Text style={styles.loadingBubble}>typing • • •</Text>
                </View>
            )}

            {!isLoading && messages.length === 1 && (
                <View style={{ height: 50, marginBottom: 10 }}>
                    <FlatList
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={{ paddingHorizontal: 15 }}
                        data={[
                            "Best moisturizer for oily skin",
                            "Is Vitamin C safe for acne?",
                            "Routine for dry winter skin",
                            "Where to buy CeraVe?"
                        ]}
                        keyExtractor={item => item}
                        renderItem={({ item }) => (
                            <TouchableOpacity
                                style={styles.chip}
                                onPress={() => handleChipPress(item)}
                            >
                                <Text style={styles.chipText}>{item}</Text>
                            </TouchableOpacity>
                        )}
                    />
                </View>
            )}

            <View style={styles.inputContainer}>
                <TouchableOpacity onPress={handleCamera} style={{ marginRight: 10 }}>
                    <Text style={{ fontSize: 24 }}>📷</Text>
                </TouchableOpacity>
                <TextInput
                    style={styles.input}
                    value={inputText}
                    onChangeText={setInputText}
                    placeholder="Ask about skincare..."
                    editable={!isLoading}
                    onSubmitEditing={handleSend}
                />
                <Button title="Send" onPress={handleSend} disabled={isLoading || !inputText.trim()} />
            </View>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    listContent: {
        padding: SPACING.m,
        paddingBottom: SPACING.xl
    },
    loadingContainer: {
        marginLeft: SPACING.l,
        marginBottom: SPACING.s,
    },
    loadingBubble: {
        color: COLORS.textLight,
        fontSize: 12,
        fontStyle: 'italic',
        backgroundColor: COLORS.secondaryButton,
        paddingVertical: 4,
        paddingHorizontal: 12,
        borderRadius: RADIUS.m,
        overflow: 'hidden'
    },
    inputContainer: {
        flexDirection: 'row',
        padding: SPACING.s,
        backgroundColor: COLORS.card,
        alignItems: 'center',
        borderTopWidth: 1,
        borderTopColor: COLORS.border,
        paddingBottom: Platform.OS === 'ios' ? 20 : 10
    },
    input: {
        flex: 1,
        borderWidth: 1,
        borderColor: COLORS.border,
        borderRadius: RADIUS.l,
        paddingHorizontal: SPACING.m,
        paddingVertical: 10,
        marginRight: SPACING.s,
        fontSize: 16,
        backgroundColor: COLORS.background,
        maxHeight: 100,
    },
    chip: {
        backgroundColor: COLORS.primaryBG, // Soft Mint
        borderRadius: RADIUS.full,
        paddingHorizontal: SPACING.m,
        paddingVertical: 8,
        marginRight: SPACING.s,
        borderWidth: 1,
        borderColor: COLORS.primaryLight
    },
    chipText: {
        color: COLORS.primary,
        fontWeight: '600',
        fontSize: 13
    }
});
