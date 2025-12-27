import React from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity, Alert, Linking } from 'react-native';
import { COLORS, SHADOWS, SPACING, RADIUS } from '../theme';

type Product = {
    name: string;
    brand: string;
    description: string;
    metadata?: any;
    is_verified?: boolean;
};

type Props = {
    product: Product;
};

export default function ProductCard({ product }: Props) {
    return (
        <View style={styles.card}>
            <View style={styles.imagePlaceholder}>
                <Text style={styles.emoji}>🧴</Text>
                {product.is_verified && (
                    <View style={styles.verifiedBadge}>
                        <Image
                            source={{ uri: '/Users/mbvk/Documents/skin_app/company_images/company_logo.png' }}
                            style={styles.verifiedIcon}
                            resizeMode="contain"
                        />
                    </View>
                )}
            </View>
            <View style={styles.content}>
                <Text style={styles.brand}>{product.brand}</Text>
                <View style={styles.nameRow}>
                    <Text style={styles.name} numberOfLines={2}>{product.name}</Text>
                </View>

                <View style={styles.metaRow}>
                    {product.metadata?.price && (
                        <View style={styles.priceBadge}>
                            <Text style={styles.priceText}>{product.metadata.price}</Text>
                        </View>
                    )}
                    {product.metadata?.rating && (
                        <View style={styles.ratingContainer}>
                            <Text>⭐️</Text>
                            <Text style={styles.ratingText}>{Number(product.metadata.rating).toFixed(1)}</Text>
                        </View>
                    )}
                </View>

                {product.metadata?.affiliate_url && (
                    <TouchableOpacity
                        style={[styles.button, styles.buyButton]}
                        onPress={() => Linking.openURL(product.metadata.affiliate_url)}
                    >
                        <Text style={styles.buyButtonText}>Buy Now</Text>
                    </TouchableOpacity>
                )}

                <TouchableOpacity
                    style={[styles.button, styles.detailsButton]}
                    onPress={() => Alert.alert(product.name, product.description)}
                >
                    <Text style={styles.detailsButtonText}>Details</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    card: {
        backgroundColor: COLORS.card,
        borderRadius: RADIUS.l,
        width: 180,
        marginRight: SPACING.s,
        ...SHADOWS.medium,
        padding: SPACING.m,
        marginBottom: SPACING.s,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    imagePlaceholder: {
        width: '100%',
        height: 100,
        backgroundColor: COLORS.background,
        borderRadius: RADIUS.m,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: SPACING.s,
    },
    emoji: { fontSize: 48 },
    content: { flex: 1 },
    brand: {
        fontSize: 11,
        color: COLORS.textLight,
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        marginBottom: 2
    },
    nameRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: SPACING.s,
    },
    name: {
        fontSize: 15,
        fontWeight: '700',
        color: COLORS.text,
        height: 42,
        flex: 1,
    },
    verifiedBadge: {
        position: 'absolute',
        top: 8,
        right: 8,
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        width: 24,
        height: 24,
        justifyContent: 'center',
        alignItems: 'center',
        ...SHADOWS.small,
        borderWidth: 1,
        borderColor: COLORS.primaryBG,
    },
    verifiedIcon: {
        width: 14,
        height: 14,
    },
    metaRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: SPACING.s,
    },
    priceBadge: {
        backgroundColor: COLORS.successBG,
        paddingHorizontal: SPACING.s,
        paddingVertical: 4,
        borderRadius: RADIUS.s,
    },
    priceText: {
        color: COLORS.success,
        fontWeight: 'bold',
        fontSize: 12,
    },
    ratingContainer: { flexDirection: 'row', alignItems: 'center' },
    ratingText: {
        fontSize: 12,
        color: COLORS.warning,
        fontWeight: 'bold',
        marginLeft: 2
    },
    button: {
        paddingVertical: 10,
        borderRadius: RADIUS.xl, // Highly rounded
        alignItems: 'center',
        marginBottom: 6,
    },
    buyButton: {
        backgroundColor: COLORS.primary,
        // @ts-ignore - linear-gradient is supported in web styles
        backgroundImage: `linear-gradient(135deg, ${COLORS.primary} 0%, ${COLORS.primaryAccent} 100%)`,
        ...SHADOWS.small,
    },
    buyButtonText: {
        color: '#fff',
        fontSize: 13,
        fontWeight: '700',
    },
    detailsButton: {
        backgroundColor: COLORS.secondaryButton,
        paddingVertical: 8,
    },
    detailsButtonText: {
        color: COLORS.secondaryText,
        fontSize: 12,
        fontWeight: '600',
    }
});
