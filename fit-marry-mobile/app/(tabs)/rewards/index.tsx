import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, Clipboard } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useState, useEffect } from 'react';
import api from '../../../src/services/api';
import { useI18n } from '../../../src/i18n';

export default function RewardsScreen() {
  const { t } = useI18n();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchCode();
  }, []);

  const fetchCode = async () => {
    try {
      const res = await api.get('/referrals/code');
      setCode(res.data.code);
    } catch (e) {
      console.log('Error fetching code', e);
    }
  };

  const watchAd = async (type) => {
    setLoading(true);
    try {
      // Mock Ad SDK interaction
      await new Promise(r => setTimeout(r, 1500));
      await api.post('/ads/reward', { rewardType: type });
      Alert.alert(`${t.common.congratulations}!`, t.rewards.rewardSuccess);
    } catch (e) {
      Alert.alert(t.common.error, t.rewards.rewardFailed);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = () => {
    Clipboard.setString(code);
    Alert.alert(t.common.done, t.rewards.codeCopied);
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.header}>{t.rewards.title}</Text>

      <View style={styles.card}>
        <Ionicons name='gift' size={40} color='#d84b6b' />
        <Text style={styles.title}>{t.rewards.inviteTitle}</Text>
        <Text style={styles.desc}>{t.rewards.inviteDesc}</Text>
        <View style={styles.codeContainer}>
          <Text style={styles.code}>{code || '...'}</Text>
          <TouchableOpacity onPress={copyToClipboard}><Ionicons name='copy-outline' size={24} color='#666'/></TouchableOpacity>
        </View>
      </View>

      <View style={styles.card}>
        <Ionicons name='play-circle' size={40} color='#4CAF50' />
        <Text style={styles.title}>{t.rewards.watchAdTitle}</Text>
        <Text style={styles.desc}>{t.rewards.watchAdDesc}</Text>
        <TouchableOpacity style={styles.btn} onPress={() => watchAd('TEMP_VIP')} disabled={loading}>
          <Text style={styles.btnText}>{t.rewards.vip30Min}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.btn, {marginTop: 10, backgroundColor: '#FF9800'}]} onPress={() => watchAd('FREE_LIKES')} disabled={loading}>
          <Text style={styles.btnText}>{t.rewards.get5Likes}</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9f9f9', padding: 20 },
  header: { fontSize: 24, fontWeight: 'bold', marginVertical: 20, textAlign: 'center', color: '#333' },
  card: { backgroundColor: '#fff', padding: 20, borderRadius: 15, alignItems: 'center', marginBottom: 20, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 10, elevation: 5 },
  title: { fontSize: 20, fontWeight: 'bold', marginTop: 10, color: '#333' },
  desc: { textAlign: 'center', color: '#666', marginTop: 10, marginBottom: 15 },
  codeContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#eee', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 10 },
  code: { fontSize: 22, fontWeight: 'bold', letterSpacing: 2, marginRight: 15, color: '#000' },
  btn: { backgroundColor: '#d84b6b', paddingVertical: 12, paddingHorizontal: 20, borderRadius: 25, width: '100%', alignItems: 'center' },
  btnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' }
});
