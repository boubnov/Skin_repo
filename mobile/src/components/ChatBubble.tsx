import React from 'react';
import { View, Text, StyleSheet, FlatList, Image } from 'react-native';
import Markdown from 'react-native-markdown-display';
import ProductCard from './ProductCard';
import { COLORS, SPACING, RADIUS, SHADOWS } from '../theme';

type Message = {
    id: string;
    role: 'user' | 'model';
    content: string;
    products?: any[];
    image?: string;
};

type Props = {
    item: Message;
};

export default function ChatBubble({ item }: Props) {
    return (
        <View style={{ alignItems: item.role === 'user' ? 'flex-end' : 'flex-start' }}>
            <View style={[
                styles.bubble,
                item.role === 'user' ? styles.userBubble : styles.modelBubble
            ]}>
                {item.image && (
                    <Image
                        source={{ uri: item.image }}
                        style={{ width: 150, height: 150, borderRadius: RADIUS.m, marginBottom: 5 }}
                    />
                )}
                {item.role === 'user' ? (
                    <Text style={styles.userText}>{item.content}</Text>
                ) : (
                    <Markdown style={modelMarkdownStyles}>
                        {item.content}
                    </Markdown>
                )}
            </View>

            {item.products && item.products.length > 0 && (
                <FlatList
                    data={item.products}
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    keyExtractor={(p, index) => index.toString()}
                    renderItem={({ item: product }) => <ProductCard product={product} />}
                    style={{ marginTop: 10, marginBottom: 10, marginLeft: 5 }}
                />
            )}
        </View>
    );
}

const modelMarkdownStyles = {
    body: { color: COLORS.text, fontSize: 16 },
    strong: { fontWeight: 'bold' as 'bold', color: COLORS.text },
    em: { fontStyle: 'italic' as 'italic', color: COLORS.primary },
    bullet_list: { marginVertical: 5 },
    ordered_list: { marginVertical: 5 },
    list_item: { marginVertical: 2 },
};

const styles = StyleSheet.create({
    bubble: {
        maxWidth: '85%',
        padding: SPACING.m,
        borderRadius: RADIUS.l,
        marginBottom: 10,
    },
    userBubble: {
        alignSelf: 'flex-end',
        backgroundColor: COLORS.primary,
        borderBottomRightRadius: RADIUS.s,
    },
    modelBubble: {
        alignSelf: 'flex-start',
        backgroundColor: COLORS.card,
        borderBottomLeftRadius: RADIUS.s,
        ...SHADOWS.small
    },
    userText: {
        fontSize: 16,
        color: '#fff',
    },
});
