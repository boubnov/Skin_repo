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
    image?: string; // New field for user photos
};

export const useChat = () => {
    const [messages, setMessages] = useState<Message[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [apiKey, setApiKey] = useState<string | null>(null);
    const [userLocation, setUserLocation] = useState<string | null>(null);

    useEffect(() => {
        checkKey();
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

    const checkKey = async () => {
        const key = await getStorageItem('user_google_api_key');
        if (key) {
            setApiKey(key);
            setMessages([{
                id: 'welcome',
                role: 'model',
                content: "Hello! I am your Skincare Assistant. Ask me anything about products or ingredients."
            }]);
        }
    };

    const sendMessage = async (text: string, image?: string) => {
        if ((!text.trim() && !image) || !apiKey) return;

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

            // Initial AI Message
            setMessages(prev => [...prev, {
                id: aiMsgId,
                role: 'model',
                content: '',
                products: []
            }]);

            const response = await fetch(`${BASE_URL}/chat/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${await getStorageItem('userToken')}`,
                    'X-Goog-Api-Key': apiKey
                },
                body: JSON.stringify({
                    message: userMsg.content,
                    history: history,
                    user_location: userLocation
                })
            });

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
            Alert.alert("Error", "Failed to connect to the assistant.");
        } finally {
            setIsLoading(false);
        }
    };

    return {
        messages,
        isLoading,
        apiKey,
        sendMessage,
        setMessages // Exposed for camera mock or other interactions
    };
};
