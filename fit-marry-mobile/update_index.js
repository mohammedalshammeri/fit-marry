const fs = require('fs');
const path = require('path');

const targetPath = path.join(__dirname, 'app', '(tabs)', 'index.tsx');

const content = `import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, Image, TouchableOpacity, ActivityIndicator, Alert, Modal, ScrollView, TextInput } from 'react-native';
import api from '../../src/services/api';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { useScreenProtection } from '../../src/hooks/useScreenProtection';
import type { DiscoveryItem } from '../../src/types';

const COUNTRIES = ["Saudi Arabia", "UAE", "Kuwait", "Egypt", "Jordan", "Bahrain", "Qatar", "Oman", "Morocco", "Tunisia"];
const REVEAL_DURATION_MS = 5000;

const resolveAvatarUrl = (avatar?: string) => {
  if (!avatar) return null;
  if (avatar.startsWith('http')) return avatar;

  const baseUrl = api.defaults.baseURL || 'http://10.0.2.2:4000';
  return \`\${baseUrl}\${avatar}\`;
};

export default function DiscoveryScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<DiscoveryItem[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [revealedUsers, setRevealedUsers] = useState<Record<string, boolean>>({});
  
  // Modals
  const [travelModeVisible, setTravelModeVisible] = useState(false);
  const [filterModalVisible, setFilterModalVisible] = useState(false);

  // States
  const [filterCountry, setFilterCountry] = useState<string | null>(null);
  const [ageMin, setAgeMin] = useState<string>('');
  const [ageMax, setAgeMax] = useState<string>('');
  const [city, setCity] = useState<string>('');
  const [marriageType, setMarriageType] = useState<string>('ALL');

  // Active filters applied to API
  const [activeFilters, setActiveFilters] = useState({
    country: null as string | null,
    ageMin: '',
    ageMax: '',
    city: '',
    marriageType: 'ALL'
  });

  useScreenProtection(Object.values(revealedUsers).some(Boolean));

  useEffect(() => {
    return () => {
      setRevealedUsers({});
    };
  }, []);

  const fetchDiscovery = async () => {
    if (!refreshing) setLoading(true); 
    
    try {
      const params: any = {};
      if (activeFilters.country) params.country = activeFilters.country;
      if (activeFilters.ageMin) params.ageMin = parseInt(activeFilters.ageMin);
      if (activeFilters.ageMax) params.ageMax = parseInt(activeFilters.ageMax);
      if (activeFilters.city) params.city = activeFilters.city;
      if (activeFilters.marriageType !== 'ALL') params.marriageType = activeFilters.marriageType;

      const response = await api.get('/discovery', { params });
      
      if (response.data && Array.isArray(response.data.items)) {
        setUsers(response.data.items);
      } else {
        setUsers([]);
      }
    } catch (error: any) {
      console.log('Discovery Error:', error.response?.status, error.response?.data);
      if (error.response?.status === 403) {
         const msg = error.response?.data?.message || 'هذه الميزة تتطلب اشتراك بريميوم.';
         Alert.alert('تنبيه', msg, [
            { text: 'إلغاء', style: 'cancel' },
            { text: 'ترقية الحساب', onPress: () => router.push('/premium') }
         ]);
         
         if (activeFilters.country) {
            setFilterCountry(null);
            setActiveFilters(prev => ({ ...prev, country: null }));
         }
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDiscovery();
  }, [activeFilters]);

  const applyFilters = () => {
    setActiveFilters({ country: filterCountry, ageMin, ageMax, city, marriageType });
    setFilterModalVisible(false);
  };

  const applyTravel = (c: string | null) => {
    setFilterCountry(c);
    setActiveFilters(prev => ({ ...prev, country: c }));
    setTravelModeVisible(false);
  };

  const resetFilters = () => {
    setFilterCountry(null);
    setAgeMin('');
    setAgeMax('');
    setCity('');
    setMarriageType('ALL');
    setActiveFilters({ country: null, ageMin: '', ageMax: '', city: '', marriageType: 'ALL' });
    setFilterModalVisible(false);
  };

  const handleBoost = async () => {
    try {
      await api.post('/profiles/boost');
      Alert.alert('🚀 نجاح', 'تم تفعيل الترويج! سيظهر حسابك في أعلى نتائج البحث.');
      fetchDiscovery();
    } catch (error: any) {
      const msg = error.response?.data?.message || 'فشل تفعيل الترويج.';
      if (error.response?.status === 403) {
         Alert.alert('ترقية مطلوبة', msg, [
            { text: 'إلغاء', style: 'cancel' },
            { text: 'ترقية', onPress: () => router.push('/premium') }
         ]);
      } else {
         Alert.alert('خطأ', msg);
      }
    }
  };

  const handleLike = async (userId: string) => {
    try {
      await api.post('/likes', { toUserId: userId });
      Alert.alert('نجاح', 'تم إرسال الإعجاب!');
      setUsers(prev => prev.filter(u => u.userId !== userId));
    } catch (error: any) {
      const msg = error.response?.data?.message || 'فشل في إرسال الإعجاب';
      Alert.alert('خطأ', msg);
    }
  };

  const handleReveal = (userId: string) => {
    setRevealedUsers((prev) => ({ ...prev, [userId]: true }));
    setTimeout(() => {
      setRevealedUsers((prev) => ({ ...prev, [userId]: false }));
    }, REVEAL_DURATION_MS);
  };

  const renderItem = ({ item }: { item: DiscoveryItem }) => {
    const nickname = item.nickname || item.profile?.nickname || 'مستخدم';
    const avatar = resolveAvatarUrl(item.avatarUrl || item.profile?.avatarUrl);
    const itemCountry = item.residenceCountry || item.profile?.residenceCountry || 'غير محدد';
    const itemCity = item.profile?.residenceCity || '';
    const age = item.profile?.age ? \`\${item.profile.age} سنة\` : '';
    const isRevealed = !!revealedUsers[item.userId];
    const isMisyar = item.marriageType === 'MISYAR';

    return (
      <View style={styles.card}>
        <View style={styles.imageContainer}>
             {avatar ? (
                <Image source={{ uri: avatar }} style={styles.avatar} resizeMode="cover" />
             ) : (
                <View style={[styles.avatar, styles.placeholderAvatar]}>
                    <Text style={styles.placeholderText}>{nickname[0]}</Text>
                </View>
             )}

             {avatar && !isRevealed && (
              <BlurView intensity={75} tint="light" style={StyleSheet.absoluteFillObject} />
             )}

             <View style={styles.imageOverlay}>
              <View style={styles.overlayBadge}>
                <Text style={styles.overlayBadgeText}>{isMisyar ? 'خصوصية عالية' : 'صورة محمية'}</Text>
              </View>

              {avatar && (
                <TouchableOpacity style={styles.revealButton} onPress={() => handleReveal(item.userId)}>
                  <Ionicons name={isRevealed ? 'eye-off' : 'eye'} size={18} color="#fff" />
                  <Text style={styles.revealButtonText}>{isRevealed ? 'سيعاد التمويه خلال 5 ثوانٍ' : 'كشف الصورة 5 ثوانٍ'}</Text>
                </TouchableOpacity>
              )}
             </View>
        </View>
        
        <View style={styles.infoContainer}>
            <Text style={styles.name}>{nickname}</Text>
            <Text style={styles.details}>{itemCountry} {itemCity ? \`(\${itemCity})\` : ''} {age ? \`• \${age}\` : ''}</Text>
            <Text style={styles.marriageType}>{item.marriageType === 'MISYAR' ? 'مسيار' : 'زواج دائم'}</Text>
            <Text style={styles.summaryText} numberOfLines={2}>
              {item.profile?.aboutMe || 'اضغط على عرض الملف لمشاهدة مزيد من التفاصيل عن هذا المستخدم.'}
            </Text>
        </View>

        <View style={styles.actions}>
            <TouchableOpacity style={[styles.btn, styles.profileBtn]} onPress={() => router.push(\`/user/\${item.userId}\`)}>
                <Text style={[styles.btnText, styles.profileBtnText]}>عرض الملف</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.btn, styles.passBtn]} onPress={() => {
                setUsers(prev => prev.filter(u => u.userId !== item.userId));
            }}>
                <Text style={styles.btnText}>تخطي</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={[styles.btn, styles.likeBtn]} onPress={() => handleLike(item.userId)}>
                <Text style={styles.btnText}>إعجاب</Text>
            </TouchableOpacity>
        </View>
      </View>
    );
  };

  const hasActiveFilters = activeFilters.ageMin || activeFilters.ageMax || activeFilters.city || activeFilters.marriageType !== 'ALL';

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>استكشاف</Text>
        <View style={styles.headerControls}>
          <TouchableOpacity onPress={handleBoost} style={styles.headerBtn}>
              <Ionicons name="rocket" size={24} color="#FF9800" />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setTravelModeVisible(true)} style={styles.headerBtn}>
              <Ionicons name={activeFilters.country ? "airplane" : "globe-outline"} size={26} color={activeFilters.country ? "#E91E63" : "#333"} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setFilterModalVisible(true)} style={styles.headerBtn}>
              <Ionicons name="filter" size={26} color={hasActiveFilters ? "#E91E63" : "#333"} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Active Filters Banner */}
      {(hasActiveFilters || activeFilters.country) && (
        <View style={styles.filterBanner}>
            <Text style={styles.filterText}>توجد فلاتر نشطة</Text>
            <TouchableOpacity onPress={resetFilters}>
                <Text style={styles.resetText}>إلغاء الكل</Text>
            </TouchableOpacity>
        </View>
      )}

      {loading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color="#E91E63" />
          </View>
      ) : (
        <FlatList
            data={users}
            keyExtractor={(item) => item.userId}
            renderItem={renderItem}
            contentContainerStyle={styles.list}
            refreshing={refreshing}
            onRefresh={() => {
                setRefreshing(true);
                fetchDiscovery();
            }}
            ListEmptyComponent={
                <View style={styles.center}>
                    <Text style={styles.emptyText}>لا يوجد مستخدمين لعرضهم حالياً.</Text>
                </View>
            }
        />
      )}

      {/* Travel Mode Modal */}
      <Modal visible={travelModeVisible} transparent animationType="slide" onRequestClose={() => setTravelModeVisible(false)}>
        <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
                <View style={styles.modalHeader}>
                    <Text style={styles.modalTitle}>وضع السفر ✈️</Text>
                    <TouchableOpacity onPress={() => setTravelModeVisible(false)}>
                        <Ionicons name="close" size={24} color="#333" />
                    </TouchableOpacity>
                </View>
                <Text style={styles.modalSubtitle}>ابحث عن شريك في دولة أخرى (ميزة للمشتركين)</Text>
                
                <ScrollView style={styles.countryList}>
                    <TouchableOpacity style={[styles.countryOption, !filterCountry && styles.selectedOption]} onPress={() => applyTravel(null)}>
                        <Text style={[styles.countryText, !filterCountry && styles.selectedOptionText]}>الكل (إلغاء)</Text>
                        {!filterCountry && <Ionicons name="checkmark" size={20} color="white" />}
                    </TouchableOpacity>
                    {COUNTRIES.map(c => (
                        <TouchableOpacity 
                            key={c} 
                            style={[styles.countryOption, filterCountry === c && styles.selectedOption]} 
                            onPress={() => applyTravel(c)}
                        >
                            <Text style={[styles.countryText, filterCountry === c && styles.selectedOptionText]}>{c}</Text>
                            {filterCountry === c && <Ionicons name="checkmark" size={20} color="white" />}
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            </View>
        </View>
      </Modal>

      {/* Advanced Filters Modal */}
      <Modal visible={filterModalVisible} transparent animationType="fade" onRequestClose={() => setFilterModalVisible(false)}>
        <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
                <View style={styles.modalHeader}>
                    <Text style={styles.modalTitle}>تصفية النتائج 🔍</Text>
                    <TouchableOpacity onPress={() => setFilterModalVisible(false)}>
                        <Ionicons name="close" size={24} color="#333" />
                    </TouchableOpacity>
                </View>
                
                <ScrollView style={{ marginTop: 10 }}>
                    <Text style={styles.label}>العمر (من - إلى)</Text>
                    <View style={styles.row}>
                        <TextInput 
                            style={[styles.input, { flex: 1, marginRight: 10 }]} 
                            placeholder="من" 
                            keyboardType="numeric" 
                            value={ageMin} 
                            onChangeText={setAgeMin} 
                        />
                        <TextInput 
                            style={[styles.input, { flex: 1 }]} 
                            placeholder="إلى" 
                            keyboardType="numeric" 
                            value={ageMax} 
                            onChangeText={setAgeMax} 
                        />
                    </View>

                    <Text style={styles.label}>المدينة</Text>
                    <TextInput 
                        style={styles.input} 
                        placeholder="أدخل اسم المدينة" 
                        value={city} 
                        onChangeText={setCity} 
                    />

                    <Text style={styles.label}>نوع الزواج</Text>
                    <View style={styles.marriageTypeGroup}>
                        {['ALL', 'PERMANENT', 'MISYAR'].map((type) => (
                            <TouchableOpacity 
                                key={type} 
                                style={[styles.typeBtn, marriageType === type && styles.typeBtnActive]} 
                                onPress={() => setMarriageType(type)}
                            >
                                <Text style={[styles.typeBtnText, marriageType === type && styles.typeBtnTextActive]}>
                                    {type === 'ALL' ? 'الكل' : type === 'PERMANENT' ? 'دائم' : 'مسيار'}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    <TouchableOpacity style={styles.applyBtn} onPress={applyFilters}>
                        <Text style={styles.applyBtnText}>تطبيق الفلاتر</Text>
                    </TouchableOpacity>
                </ScrollView>
            </View>
        </View>
      </Modal>

    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  header: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', padding: 15, backgroundColor: 'white', elevation: 2 },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: '#333' },
  headerControls: { flexDirection: 'row-reverse', alignItems: 'center', gap: 15 },
  headerBtn: { padding: 5 },
  filterBanner: { backgroundColor: '#FFEDF2', padding: 10, flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center' },
  filterText: { color: '#E91E63', fontWeight: 'bold' },
  resetText: { color: '#666', textDecorationLine: 'underline' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  list: { padding: 15 },
  card: { backgroundColor: 'white', borderRadius: 15, overflow: 'hidden', marginBottom: 20, elevation: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4 },
  imageContainer: { height: 300, backgroundColor: '#d9d3cf', position: 'relative' },
  imageOverlay: { ...StyleSheet.absoluteFillObject, padding: 16, justifyContent: 'space-between', alignItems: 'flex-end' },
  overlayBadge: { backgroundColor: 'rgba(19, 49, 62, 0.88)', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8 },
  overlayBadgeText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  revealButton: { flexDirection: 'row-reverse', alignItems: 'center', gap: 8, backgroundColor: 'rgba(216, 75, 107, 0.92)', borderRadius: 999, paddingHorizontal: 14, paddingVertical: 10 },
  revealButtonText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  avatar: { width: '100%', height: '100%' },
  placeholderAvatar: { justifyContent: 'center', alignItems: 'center', backgroundColor: '#ddd' },
  placeholderText: { fontSize: 50, color: '#888' },
  infoContainer: { padding: 15 },
  name: { fontSize: 20, fontWeight: 'bold', textAlign: 'right' },
  details: { fontSize: 14, color: '#666', marginTop: 5, textAlign: 'right' },
  marriageType: { marginTop: 5, fontSize: 12, color: '#E91E63', fontWeight: 'bold', textAlign: 'right', textTransform: 'uppercase' },
  summaryText: { marginTop: 10, fontSize: 13, lineHeight: 20, color: '#6f5f5f', textAlign: 'right' },
  actions: { flexDirection: 'row-reverse', borderTopWidth: 1, borderTopColor: '#f0f0f0' },
  btn: { flex: 1, padding: 15, alignItems: 'center', justifyContent: 'center' },
  likeBtn: { backgroundColor: '#fff', borderLeftWidth: 1, borderLeftColor: '#f0f0f0' },
  passBtn: { backgroundColor: '#fff' },
  profileBtn: { backgroundColor: '#fff7ef' },
  profileBtnText: { color: '#17313e' },
  btnText: { fontWeight: 'bold', fontSize: 16 },
  emptyText: { fontSize: 16, color: '#666', textAlign: 'center', marginTop: 50 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: 'white', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: '80%' },
  modalHeader: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#333' },
  modalSubtitle: { fontSize: 14, color: '#666', marginBottom: 20, textAlign: 'right' },
  countryList: { marginBottom: 20 },
  countryOption: { padding: 15, borderRadius: 10, marginBottom: 10, backgroundColor: '#f9f9f9', flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center' },
  selectedOption: { backgroundColor: '#E91E63' },
  countryText: { fontSize: 16, color: '#333' },
  selectedOptionText: { color: 'white', fontWeight: 'bold' },
  // Filters Styles
  label: { fontSize: 16, fontWeight: 'bold', color: '#333', marginTop: 15, marginBottom: 8, textAlign: 'right' },
  row: { flexDirection: 'row-reverse' },
  input: { backgroundColor: '#f5f5f5', borderWidth: 1, borderColor: '#eee', borderRadius: 8, padding: 12, fontSize: 16, textAlign: 'right' },
  marriageTypeGroup: { flexDirection: 'row-reverse', gap: 10, marginTop: 5 },
  typeBtn: { flex: 1, padding: 12, borderRadius: 8, backgroundColor: '#f5f5f5', alignItems: 'center', borderWidth: 1, borderColor: '#eee' },
  typeBtnActive: { backgroundColor: '#E91E63', borderColor: '#E91E63' },
  typeBtnText: { fontSize: 14, color: '#666', fontWeight: 'bold' },
  typeBtnTextActive: { color: 'white' },
  applyBtn: { backgroundColor: '#E91E63', padding: 15, borderRadius: 10, alignItems: 'center', marginTop: 30, marginBottom: 20 },
  applyBtnText: { color: 'white', fontSize: 16, fontWeight: 'bold' }
});
`;

fs.writeFileSync(targetPath, content, 'utf8');
console.log('Successfully updated index.tsx');
