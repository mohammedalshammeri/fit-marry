import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, ScrollView, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import api from '../../src/services/api';
import { useI18n } from '../../src/i18n';

export default function EditProfileScreen() {
  const router = useRouter();
  const { t, lang } = useI18n();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  const [formData, setFormData] = useState({
    nickname: '',
    aboutMe: '',
    partnerPrefs: '',
    guardianName: '',
    guardianRelation: '',
    guardianContact: '',
    age: '',
    height: '',
    weight: '',
    residenceCountry: '',
    nationalityPrimary: '',
    maritalStatus: '',
    jobStatus: '',
  });

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const res = await api.get('/profiles/me');
      const p = res.data;
      setFormData({
        nickname: p.nickname || '',
        aboutMe: p.aboutMe || '',
        partnerPrefs: p.partnerPrefs || '',
        guardianName: p.guardianName || '',
        guardianRelation: p.guardianRelation || '',
        guardianContact: p.guardianContact || '',
        age: p.age ? p.age.toString() : '',
        height: p.height ? p.height.toString() : '',
        weight: p.weight ? p.weight.toString() : '',
        residenceCountry: p.residenceCountry || '',
        nationalityPrimary: p.nationalityPrimary || '',
        maritalStatus: p.maritalStatus || '',
        jobStatus: p.jobStatus || '',
      });
    } catch (error) {
      console.log('Error fetching profile', error);
      Alert.alert(t.common.error, t.profile.loadFailed);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload: any = {
        ...formData,
        age: formData.age ? parseInt(formData.age) : undefined,
        height: formData.height ? parseInt(formData.height) : undefined,
        weight: formData.weight ? parseInt(formData.weight) : undefined,
      };

      // Remove empty strings to avoid errors if backend expects null/undefined for optionals
      Object.keys(payload).forEach(key => {
        if (payload[key as keyof typeof payload] === '') {
            delete payload[key as keyof typeof payload];
        }
      });

      await api.put('/profiles/me', payload);
      Alert.alert(t.common.success, t.profile.profileUpdated, [
        { text: t.common.approve, onPress: () => router.back() }
      ]);
      router.back(); // Or wait for "OK"
    } catch (error: any) {
      const msg = error.response?.data?.message || t.profile.profileUpdateFailed;
      Alert.alert(t.common.error, Array.isArray(msg) ? msg.join('\n') : msg);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#E91E63" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backBtn}>{t.common.cancel}</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t.profile.editProfile}</Text>
        <TouchableOpacity onPress={handleSave} disabled={saving}>
          {saving ? <ActivityIndicator color="#E91E63" /> : <Text style={styles.saveBtn}>{t.common.save}</Text>}
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        
        <Text style={styles.sectionTitle}>{t.profile.basicInfo}</Text>
        
        <View style={styles.inputGroup}>
            <Text style={styles.label}>{t.profile.nickname}</Text>
            <TextInput 
                style={styles.input} 
                value={formData.nickname}
                onChangeText={t2 => setFormData({...formData, nickname: t2})}
                placeholder={t.profile.nicknameHint}
            />
        </View>

        <View style={styles.row}>
            <View style={[styles.inputGroup, { flex: 1, marginRight: 10 }]}>
                <Text style={styles.label}>{t.profile.age}</Text>
                <TextInput 
                    style={styles.input} 
                    value={formData.age}
                    onChangeText={t2 => setFormData({...formData, age: t2})}
                    keyboardType="numeric"
                    placeholder="25"
                />
            </View>
            <View style={[styles.inputGroup, { flex: 1, marginRight: 10 }]}>
                <Text style={styles.label}>{t.profile.heightCm}</Text>
                <TextInput 
                    style={styles.input} 
                    value={formData.height}
                    onChangeText={t2 => setFormData({...formData, height: t2})}
                    keyboardType="numeric"
                    placeholder="170"
                />
            </View>
            <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.label}>{t.profile.weightKg}</Text>
                <TextInput 
                    style={styles.input} 
                    value={formData.weight}
                    onChangeText={t2 => setFormData({...formData, weight: t2})}
                    keyboardType="numeric"
                    placeholder="70"
                />
            </View>
        </View>

        <View style={styles.inputGroup}>
            <Text style={styles.label}>{t.profile.residenceCountry}</Text>
            <TextInput 
                style={styles.input} 
                value={formData.residenceCountry}
                onChangeText={t2 => setFormData({...formData, residenceCountry: t2})}
                placeholder={t.profile.countryPlaceholder}
            />
        </View>

         <View style={styles.inputGroup}>
            <Text style={styles.label}>{t.profile.nationality}</Text>
            <TextInput 
                style={styles.input} 
                value={formData.nationalityPrimary}
                onChangeText={t2 => setFormData({...formData, nationalityPrimary: t2})}
                placeholder={t.profile.nationalityPlaceholder}
            />
        </View>

        <View style={styles.inputGroup}>
            <Text style={styles.label}>{t.profile.maritalStatus}</Text>
            <TextInput 
                style={styles.input} 
                value={formData.maritalStatus}
                onChangeText={t2 => setFormData({...formData, maritalStatus: t2})}
                placeholder={t.profile.maritalPlaceholder}
            />
        </View>

        <Text style={styles.sectionTitle}>{t.profile.aboutMeSection}</Text>

        <View style={styles.inputGroup}>
            <Text style={styles.label}>{t.profile.aboutMeLabel}</Text>
            <TextInput 
                style={[styles.input, styles.textArea]} 
                value={formData.aboutMe}
                onChangeText={t2 => setFormData({...formData, aboutMe: t2})}
                multiline
                numberOfLines={4}
                placeholder={t.profile.aboutMePlaceholder}
                textAlignVertical="top"
            />
        </View>

        <View style={styles.inputGroup}>
            <Text style={styles.label}>{t.profile.partnerPrefs}</Text>
            <TextInput 
                style={[styles.input, styles.textArea]} 
                value={formData.partnerPrefs}
                onChangeText={t2 => setFormData({...formData, partnerPrefs: t2})}
                multiline
                numberOfLines={4}
                placeholder={t.profile.partnerPrefsPlaceholder}
                textAlignVertical="top"
            />
        </View>

            <Text style={styles.sectionTitle}>{t.profile.guardianSection}</Text>
            <Text style={styles.helperText}>{t.profile.guardianHint}</Text>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>{t.profile.guardianName}</Text>
              <TextInput
                style={styles.input}
                value={formData.guardianName}
                onChangeText={t2 => setFormData({...formData, guardianName: t2})}
                placeholder={t.profile.guardianNamePlaceholder}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>{t.profile.guardianRelation}</Text>
              <TextInput
                style={styles.input}
                value={formData.guardianRelation}
                onChangeText={t2 => setFormData({...formData, guardianRelation: t2})}
                placeholder={t.profile.guardianRelationPlaceholder}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>{t.profile.guardianContact}</Text>
              <TextInput
                style={styles.input}
                value={formData.guardianContact}
                onChangeText={t2 => setFormData({...formData, guardianContact: t2})}
                placeholder={t.profile.guardianContactPlaceholder}
                keyboardType="phone-pad"
              />
            </View>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 50,
    paddingBottom: 15,
    paddingHorizontal: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  saveBtn: {
    color: '#E91E63',
    fontWeight: 'bold',
    fontSize: 16,
  },
  backBtn: {
    color: '#666',
    fontSize: 16,
  },
  content: {
    padding: 20,
    paddingBottom: 50,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 10,
    marginBottom: 15,
    textAlign: 'right',
  },
  inputGroup: {
    marginBottom: 15,
  },
  label: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
    textAlign: 'right',
  },
  helperText: {
    fontSize: 12,
    color: '#9ca3af',
    marginTop: -4,
    marginBottom: 12,
    textAlign: 'right',
    lineHeight: 18,
  },
  input: {
    backgroundColor: '#f9f9f9',
    borderWidth: 1,
    borderColor: '#eee',
    borderRadius: 10,
    padding: 12,
    fontSize: 16,
    textAlign: 'right',
  },
  textArea: {
    height: 100,
  },
  row: {
    flexDirection: 'row-reverse',
  }
});
