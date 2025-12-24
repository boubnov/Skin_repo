import { useState, useEffect, useRef } from 'react';
import { Alert, Platform } from 'react-native';
import { storage } from '../utils/storage';
import * as Location from 'expo-location';
import { BASE_URL } from '../services/api';

export type Message = {
    id: string;
    role: 'user' | 'model';
    content: string;
    products?: any[];
    image?: string;
};

export const useChat = () => {
    const [messages, setMessages] = useState<Message[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [apiKey, setApiKey] = useState<string | null>(null);
    const [userLocation, setUserLocation] = useState<string | null>(null);
    const [isReady, setIsReady] = useState(false);

    useEffect(() => {
        initializeChat();
        requestLocation();
    }, []);

    const requestLocation = async () => {
        try {
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') console.log('Permission to access location was denied');
            const location = await Location.getCurrentPositionAsync({});
            setUserLocation(`${location.coords.latitude},${location.coords.longitude}`);
        } catch (e) { console.log("Location Error:", e); }
    };

    const getStorageItem = async (key: string) => {
        return storage.getItem(key);
    };

    const initializeChat = async () => {
        // Check for optional user API key (for backwards compatibility)
        const key = await getStorageItem('user_google_api_key');
        if (key) {
            setApiKey(key);
        }

        // Always set welcome message and mark as ready
        setMessages([{
            id: 'welcome',
            role: 'model',
            content: "Hello! I'm your AI Skin Consultant. Ask me anything about skincare products, routines, or ingredients."
        }]);
        setIsReady(true);
    };

    const sendMessage = async (text: string, image?: string) => {
        if (!text.trim() && !image) return;

        const userMsg: Message = {
            id: Date.now().toString(),
            role: 'user',
            content: text.trim(),
            image: image
        };

        setMessages(prev => [...prev, userMsg]);
        setIsLoading(true);

        try {
            const history = messages.map(m => ({ role: m.role, content: m.content }));
            const aiMsgId = (Date.now() + 1).toString();

            // Initial AI Message placeholder
            setMessages(prev => [...prev, {
                id: aiMsgId,
                role: 'model',
                content: '',
                products: []
            }]);

            // Build headers - API key is optional now (server may use env vars)
            const headers: Record<string, string> = {
                'Content-Type': 'application/json',
            };

            const userToken = await getStorageItem('userToken');
            if (userToken) {
                headers['Authorization'] = `Bearer ${userToken}`;
            }

            // Only add X-Goog-Api-Key if user has set one (for BYOK)
            if (apiKey) {
                headers['X-Goog-Api-Key'] = apiKey;
            }

            const response = await fetch(`${BASE_URL}/chat/`, {
                method: 'POST',
                headers: headers,
                body: JSON.stringify({
                    message: userMsg.content,
                    history: history,
                    user_location: userLocation
                })
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Server error: ${response.status} - ${errorText}`);
            }

            if (!response.body) throw new Error("No response body");

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let aiText = '';
            let aiProducts: any[] = [];

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value, { stream: true });
                const lines = chunk.split('\n');

                for (const line of lines) {
                    const trimmedLine = line.trim();
                    if (!trimmedLine) continue;

                    try {
                        const data = JSON.parse(trimmedLine);
                        if (data.type === 'text') {
                            aiText += data.content;
                            setMessages(prev => prev.map(m =>
                                m.id === aiMsgId ? { ...m, content: aiText } : m
                            ));
                        } else if (data.type === 'products') {
                            const newProducts = data.content || [];
                            aiProducts = [...aiProducts, ...newProducts];
                            setMessages(prev => prev.map(m =>
                                m.id === aiMsgId ? { ...m, products: aiProducts } : m
                            ));
                        }
                    } catch (e) { }
                }
            }
        } catch (error: any) {
            console.error("Chat Error:", error);
            // Update the AI message with error
            setMessages(prev => prev.map(m =>
                m.role === 'model' && m.content === ''
                    ? { ...m, content: "Sorry, I couldn't connect to the server. Please try again." }
                    : m
            ));
        } finally {
            setIsLoading(false);
        }
    };

    return {
        messages,
        isLoading,
        apiKey,
        isReady,
        sendMessage,
        setMessages
    };
};
