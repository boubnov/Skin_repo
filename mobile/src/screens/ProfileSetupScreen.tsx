import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, StyleSheet, Alert, ActivityIndicator, TouchableOpacity, ScrollView, Platform, KeyboardAvoidingView } from 'react-native';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { COLORS, SPACING, RADIUS, SHADOWS } from '../theme';

const SKIN_TYPES = ['Oily', 'Dry', 'Combination', 'Normal', 'Sensitive'];
const SKIN_CONCERNS = ['Acne', 'Aging', 'Dark Spots', 'Dryness', 'Redness', 'Large Pores', 'Dullness'];

export default function ProfileSetupScreen({ navigation }: any) {
    const { setHasProfile } = useAuth();
    const [username, setUsername] = useState('');
    const [name, setName] = useState('');
    const [age, setAge] = useState('');
    const [skinType, setSkinType] = useState('');
    const [phone, setPhone] = useState('');
    const [instagram, setInstagram] = useState('');
    const [concerns, setConcerns] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);

    // Try to load existing profile on mount
    useEffect(() => {
        loadProfile();
    }, []);

    const loadProfile = async () => {
        setLoading(true);
        try {
            const response = await api.get('/users/profile');
            if (response.data) {
                setUsername(response.data.username || '');
                setName(response.data.name || '');
                setAge(response.data.age?.toString() || '');
                setSkinType(response.data.skin_type || '');
                setPhone(response.data.phone || '');
                setInstagram(response.data.instagram || '');
                setConcerns(response.data.concerns || []);
            }
        } catch (error) {
            // Profile doesn't exist yet, that's fine
        } finally {
            setLoading(false);
        }
    };

    const toggleConcern = (concern: string) => {
        setConcerns(prev =>
            prev.includes(concern)
                ? prev.filter(c => c !== concern)
                : [...prev, concern]
        );
    };

    const handleSave = async () => {
        if (!age || !skinType) {
            Alert.alert('Required Fields', 'Please enter your age and select a skin type.');
            return;
        }

        setSaving(true);
        try {
            await api.put('/users/profile', {
                username: username || null,
                name: name || null,
                age: parseInt(age),
                skin_type: skinType,
                phone: phone || null,
                instagram: instagram || null,
                concerns: concerns.length > 0 ? concerns : null
            });

            // Success! Update auth state to trigger navigation
            if (Platform.OS === 'web') {
                // For web, sometimes alert callback is flaky, so we just set it
                // But feedback is nice. Let's show a toast or just Alert and then wait briefly?
                // Or better, just update state.
                alert('Profile saved!');
                setHasProfile(true);
            } else {
                Alert.alert('Success', 'Profile saved successfully!', [
                    { text: 'OK', onPress: () => setHasProfile(true) }
                ]);
            }

        } catch (error: any) {
            console.error('Profile save error:', error);
            const msg = error.response?.data?.detail || 'Could not save profile. Please try again.';
            Alert.alert('Error', msg);
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={COLORS.primary} />
            </View>
        );
    }

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                <Text style={styles.title}>Complete Your Profile</Text>
                <Text style={styles.subtitle}>
                    Help us personalize your skincare recommendations
                </Text>

                {/* Username & Name */}
                <View style={styles.row}>
                    <View style={[styles.inputGroup, { flex: 1, marginRight: 10 }]}>
                        <Text style={styles.label}>Username <Text style={styles.optional}>(unique)</Text></Text>
                        <TextInput
                            style={styles.input}
                            value={username}
                            onChangeText={setUsername}
                            placeholder="@user"
                            placeholderTextColor={COLORS.textLight}
                            autoCapitalize="none"
                        />
                    </View>
                    <View style={[styles.inputGroup, { flex: 1 }]}>
                        <Text style={styles.label}>Name <Text style={styles.optional}>(optional)</Text></Text>
                        <TextInput
                            style={styles.input}
                            value={name}
                            onChangeText={setName}
                            placeholder="Your name"
                            placeholderTextColor={COLORS.textLight}
                        />
                    </View>
                </View>

                {/* Age - Required */}
                <View style={styles.inputGroup}>
                    <Text style={styles.label}>Age <Text style={styles.required}>*</Text></Text>
                    <TextInput
                        style={styles.input}
                        value={age}
                        onChangeText={setAge}
                        keyboardType="numeric"
                        placeholder="e.g. 25"
                        placeholderTextColor={COLORS.textLight}
                    />
                </View>

                {/* Skin Type - Required */}
                <View style={styles.inputGroup}>
                    <Text style={styles.label}>Skin Type <Text style={styles.required}>*</Text></Text>
                    <View style={styles.chipContainer}>
                        {SKIN_TYPES.map(type => (
                            <TouchableOpacity
                                key={type}
                                style={[
                                    styles.chip,
                                    skinType === type && styles.chipSelected
                                ]}
                                onPress={() => setSkinType(type)}
                            >
                                <Text style={[
                                    styles.chipText,
                                    skinType === type && styles.chipTextSelected
                                ]}>
                                    {type}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                {/* Skin Concerns */}
                <View style={styles.inputGroup}>
                    <Text style={styles.label}>Skin Concerns <Text style={styles.optional}>(select all that apply)</Text></Text>
                    <View style={styles.chipContainer}>
                        {SKIN_CONCERNS.map(concern => (
                            <TouchableOpacity
                                key={concern}
                                style={[
                                    styles.chip,
                                    concerns.includes(concern) && styles.chipSelected
                                ]}
                                onPress={() => toggleConcern(concern)}
                            >
                                <Text style={[
                                    styles.chipText,
                                    concerns.includes(concern) && styles.chipTextSelected
                                ]}>
                                    {concern}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                {/* Phone */}
                <View style={styles.inputGroup}>
                    <Text style={styles.label}>Phone <Text style={styles.optional}>(optional)</Text></Text>
                    <TextInput
                        style={styles.input}
                        value={phone}
                        onChangeText={setPhone}
                        keyboardType="phone-pad"
                        placeholder="+1 (555) 123-4567"
                        placeholderTextColor={COLORS.textLight}
                    />
                </View>

                {/* Instagram */}
                <View style={styles.inputGroup}>
                    <Text style={styles.label}>Instagram <Text style={styles.optional}>(optional)</Text></Text>
                    <TextInput
                        style={styles.input}
                        value={instagram}
                        onChangeText={setInstagram}
                        placeholder="@username"
                        placeholderTextColor={COLORS.textLight}
                        autoCapitalize="none"
                    />
                </View>

                {/* Save Button */}
                <TouchableOpacity
                    style={[styles.saveButton, saving && styles.saveButtonDisabled]}
                    onPress={handleSave}
                    disabled={saving}
                >
                    {saving ? (
                        <ActivityIndicator color="#fff" />
                    ) : (
                        <Text style={styles.saveButtonText}>Save Profile</Text>
                    )}
                </TouchableOpacity>

                <Text style={styles.privacyNote}>
                    Your data is private and only used to personalize your experience.
                </Text>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: COLORS.background,
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        padding: SPACING.xl,
        paddingTop: SPACING.xl * 2,
        maxWidth: 500,
        alignSelf: 'center',
        width: '100%',
    },
    title: {
        fontSize: 28,
        fontWeight: '700',
        color: COLORS.text,
        textAlign: 'center',
        marginBottom: SPACING.s,
    },
    subtitle: {
        fontSize: 15,
        color: COLORS.textLight,
        textAlign: 'center',
        marginBottom: SPACING.xl,
    },
    row: {
        flexDirection: 'row',
        marginBottom: SPACING.l,
    },
    inputGroup: {
        marginBottom: SPACING.l,
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        color: COLORS.text,
        marginBottom: SPACING.s,
    },
    required: {
        color: COLORS.error,
    },
    optional: {
        color: COLORS.textLight,
        fontWeight: '400',
    },
    input: {
        backgroundColor: COLORS.card,
        borderWidth: 1,
        borderColor: COLORS.border,
        borderRadius: RADIUS.m,
        padding: SPACING.m,
        fontSize: 16,
        color: COLORS.text,
    },
    chipContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: SPACING.s,
    },
    chip: {
        paddingVertical: SPACING.s,
        paddingHorizontal: SPACING.m,
        borderRadius: RADIUS.l,
        backgroundColor: COLORS.card,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    chipSelected: {
        backgroundColor: COLORS.primary,
        borderColor: COLORS.primary,
    },
    chipText: {
        fontSize: 14,
        color: COLORS.text,
    },
    chipTextSelected: {
        color: '#fff',
    },
    saveButton: {
        backgroundColor: COLORS.primary,
        padding: SPACING.m,
        borderRadius: RADIUS.m,
        alignItems: 'center',
        marginTop: SPACING.l,
        ...SHADOWS.medium,
    },
    saveButtonDisabled: {
        opacity: 0.6,
    },
    saveButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
    privacyNote: {
        fontSize: 12,
        color: COLORS.textLight,
        textAlign: 'center',
        marginTop: SPACING.l,
        marginBottom: SPACING.xl,
    },
});
