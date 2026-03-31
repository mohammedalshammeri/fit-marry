import { View, Text, StyleSheet, TouchableOpacity, Alert, Share, ActivityIndicator } from 'react-native';
import React, { useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import api from '../../src/services/api';
import { Ionicons } from '@expo/vector-icons';
import { useI18n } from '../../src/i18n';

export default function ReferralsScreen() {
    const router = useRouter();
    const { t } = useI18n();
    const [loading, setLoading] = useState(true);
    const [referralData, setReferralData] = useState<any>(null);

    useEffect(() => {
        fetchReferralStatus();
    }, []);

    const fetchReferralStatus = async () => {
        try {
            const res = await api.get('/referrals/status');
            setReferralData(res.data);
        } catch (e: any) {
            Alert.alert(t.common.error, t.referrals.fetchFailed);
        } finally {
            setLoading(false);
        }
    };

    const handleShare = async () => {
        try {
            if (!referralData?.code) return;
            await Share.share({
                message: `${t.referrals.shareApp} ${referralData.code}`,
            });
        } catch (e: any) {
            console.log('Share error:', e.message);
        }
    };

    if (loading) {
        return (
            <View style={[styles.container, { justifyContent: 'center' }]}>
                <ActivityIndicator size="large" color="#d84b6b" />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={24} color="#333" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>{t.referrals.title}</Text>
                <View style={{ width: 40 }} />
            </View>

            <View style={styles.card}>
                <View style={styles.iconContainer}>
                    <Ionicons name="gift" size={50} color="#d84b6b" />
                </View>
                <Text style={styles.title}>{t.referrals.inviteFriends}</Text>
                <Text style={styles.desc}>
                    {t.referrals.inviteDescription}
                </Text>

                <View style={styles.codeBox}>
                    <Text style={styles.codeText}>{referralData?.code || '------'}</Text>
                    <TouchableOpacity onPress={handleShare} style={styles.copyBtn}>
                        <Ionicons name="share-social-outline" size={20} color="#fff" />
                        <Text style={styles.copyBtnText}>{t.referrals.share}</Text>
                    </TouchableOpacity>
                </View>
            </View>

            <View style={styles.statsContainer}>
                <View style={styles.statBox}>
                    <Text style={styles.statValue}>{referralData?.totalInvites || 0}</Text>
                    <Text style={styles.statLabel}>{t.referrals.inviteCount}</Text>
                </View>
                <View style={styles.statBox}>
                    <Text style={styles.statValue}>{referralData?.verifiedInvites || 0}</Text>
                    <Text style={styles.statLabel}>{t.referrals.verifiedFriends}</Text>
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f5f5',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingTop: 60,
        paddingBottom: 20,
        backgroundColor: '#fff',
    },
    backBtn: {
        padding: 5,
        width: 40,
    },
    headerTitle: {
        flex: 1,
        textAlign: 'center',
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
    },
    card: {
        backgroundColor: '#fff',
        margin: 20,
        padding: 20,
        borderRadius: 15,
        alignItems: 'center',
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 5,
    },
    iconContainer: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: '#fdeff2',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 15,
    },
    title: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 10,
    },
    desc: {
        fontSize: 14,
        color: '#666',
        textAlign: 'center',
        marginBottom: 20,
        lineHeight: 22,
    },
    codeBox: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f5f5f5',
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#ddd',
        paddingLeft: 20,
        overflow: 'hidden',
    },
    codeText: {
        fontSize: 18,
        fontWeight: 'bold',
        letterSpacing: 2,
        color: '#333',
        flex: 1,
    },
    copyBtn: {
        backgroundColor: '#d84b6b',
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 20,
    },
    copyBtnText: {
        color: '#fff',
        fontWeight: 'bold',
        marginLeft: 5,
    },
    statsContainer: {
        flexDirection: 'row',
        marginHorizontal: 20,
        justifyContent: 'space-between',
    },
    statBox: {
        flex: 1,
        backgroundColor: '#fff',
        marginHorizontal: 5,
        padding: 15,
        borderRadius: 10,
        alignItems: 'center',
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 3,
    },
    statValue: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#333',
    },
    statLabel: {
        fontSize: 12,
        color: '#888',
        marginTop: 5,
    }
});