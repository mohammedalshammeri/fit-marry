import { useState, useRef } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import api from '../../src/services/api';
import { useAuth } from '../../src/context/AuthContext';
import { useI18n } from '../../src/i18n';
import { useRouter } from 'expo-router';
import { getItem } from '../../src/utils/storage';

/* ── static data ─────────────────────────────────────────── */
const CITIES_BY_COUNTRY: Record<string, { value: string; ar: string }[]> = {
  'Saudi Arabia': [
    { value: 'Riyadh', ar: 'الرياض' }, { value: 'Jeddah', ar: 'جدة' }, { value: 'Mecca', ar: 'مكة' },
    { value: 'Medina', ar: 'المدينة' }, { value: 'Dammam', ar: 'الدمام' }, { value: 'Khobar', ar: 'الخبر' },
    { value: 'Dhahran', ar: 'الظهران' }, { value: 'Tabuk', ar: 'تبوك' }, { value: 'Taif', ar: 'الطائف' },
    { value: 'Buraidah', ar: 'بريدة' }, { value: 'Abha', ar: 'أبها' }, { value: 'Hail', ar: 'حائل' },
    { value: 'Jazan', ar: 'جازان' }, { value: 'Najran', ar: 'نجران' }, { value: 'Yanbu', ar: 'ينبع' },
    { value: 'AlAhsa', ar: 'الأحساء' }, { value: 'Jubail', ar: 'الجبيل' }, { value: 'Arar', ar: 'عرعر' },
    { value: 'Sakaka', ar: 'سكاكا' }, { value: 'Baha', ar: 'الباحة' },
  ],
  'UAE': [
    { value: 'Abu Dhabi', ar: 'أبوظبي' }, { value: 'Dubai', ar: 'دبي' }, { value: 'Sharjah', ar: 'الشارقة' },
    { value: 'Ajman', ar: 'عجمان' }, { value: 'RAK', ar: 'رأس الخيمة' }, { value: 'Fujairah', ar: 'الفجيرة' },
    { value: 'Al Ain', ar: 'العين' },
  ],
  'Kuwait': [
    { value: 'Kuwait City', ar: 'مدينة الكويت' }, { value: 'Hawalli', ar: 'حولي' }, { value: 'Salmiya', ar: 'السالمية' },
    { value: 'Jahra', ar: 'الجهراء' }, { value: 'Ahmadi', ar: 'الأحمدي' }, { value: 'Farwaniya', ar: 'الفروانية' },
  ],
  'Bahrain': [
    { value: 'Manama', ar: 'المنامة' }, { value: 'Muharraq', ar: 'المحرق' }, { value: 'Riffa', ar: 'الرفاع' },
    { value: 'Isa Town', ar: 'مدينة عيسى' }, { value: 'Hamad Town', ar: 'مدينة حمد' }, { value: 'Sitra', ar: 'سترة' },
  ],
  'Qatar': [
    { value: 'Doha', ar: 'الدوحة' }, { value: 'Al Wakrah', ar: 'الوكرة' }, { value: 'Al Khor', ar: 'الخور' },
    { value: 'Al Rayyan', ar: 'الريان' }, { value: 'Lusail', ar: 'لوسيل' },
  ],
  'Oman': [
    { value: 'Muscat', ar: 'مسقط' }, { value: 'Salalah', ar: 'صلالة' }, { value: 'Sohar', ar: 'صحار' },
    { value: 'Nizwa', ar: 'نزوى' }, { value: 'Sur', ar: 'صور' }, { value: 'Ibri', ar: 'عبري' },
  ],
  'Yemen': [
    { value: "Sana'a", ar: 'صنعاء' }, { value: 'Aden', ar: 'عدن' }, { value: 'Taiz', ar: 'تعز' },
    { value: 'Hodeidah', ar: 'الحديدة' }, { value: 'Ibb', ar: 'إب' }, { value: 'Mukalla', ar: 'المكلا' },
  ],
  'Egypt': [
    { value: 'Cairo', ar: 'القاهرة' }, { value: 'Alexandria', ar: 'الإسكندرية' }, { value: 'Giza', ar: 'الجيزة' },
    { value: 'Shubra', ar: 'شبرا' }, { value: 'Port Said', ar: 'بورسعيد' }, { value: 'Suez', ar: 'السويس' },
    { value: 'Luxor', ar: 'الأقصر' }, { value: 'Mansoura', ar: 'المنصورة' }, { value: 'Tanta', ar: 'طنطا' },
    { value: 'Aswan', ar: 'أسوان' }, { value: 'Ismailia', ar: 'الإسماعيلية' }, { value: 'Zagazig', ar: 'الزقازيق' },
  ],
  'Jordan': [
    { value: 'Amman', ar: 'عمّان' }, { value: 'Zarqa', ar: 'الزرقاء' }, { value: 'Irbid', ar: 'إربد' },
    { value: 'Aqaba', ar: 'العقبة' }, { value: 'Mafraq', ar: 'المفرق' }, { value: 'Salt', ar: 'السلط' },
  ],
  'Iraq': [
    { value: 'Baghdad', ar: 'بغداد' }, { value: 'Basra', ar: 'البصرة' }, { value: 'Erbil', ar: 'أربيل' },
    { value: 'Mosul', ar: 'الموصل' }, { value: 'Sulaymaniyah', ar: 'السليمانية' }, { value: 'Najaf', ar: 'النجف' },
    { value: 'Karbala', ar: 'كربلاء' }, { value: 'Kirkuk', ar: 'كركوك' }, { value: 'Duhok', ar: 'دهوك' },
  ],
  'Lebanon': [
    { value: 'Beirut', ar: 'بيروت' }, { value: 'Tripoli', ar: 'طرابلس' }, { value: 'Sidon', ar: 'صيدا' },
    { value: 'Tyre', ar: 'صور' }, { value: 'Jounieh', ar: 'جونيه' }, { value: 'Zahle', ar: 'زحلة' },
  ],
  'Syria': [
    { value: 'Damascus', ar: 'دمشق' }, { value: 'Aleppo', ar: 'حلب' }, { value: 'Homs', ar: 'حمص' },
    { value: 'Latakia', ar: 'اللاذقية' }, { value: 'Hama', ar: 'حماة' }, { value: 'Deir ez-Zor', ar: 'دير الزور' },
  ],
  'Palestine': [
    { value: 'Gaza', ar: 'غزة' }, { value: 'Ramallah', ar: 'رام الله' }, { value: 'Nablus', ar: 'نابلس' },
    { value: 'Hebron', ar: 'الخليل' }, { value: 'Bethlehem', ar: 'بيت لحم' }, { value: 'Jenin', ar: 'جنين' },
  ],
  'Libya': [
    { value: 'Tripoli', ar: 'طرابلس' }, { value: 'Benghazi', ar: 'بنغازي' }, { value: 'Misrata', ar: 'مصراتة' },
  ],
  'Tunisia': [
    { value: 'Tunis', ar: 'تونس العاصمة' }, { value: 'Sfax', ar: 'صفاقس' }, { value: 'Sousse', ar: 'سوسة' },
  ],
  'Algeria': [
    { value: 'Algiers', ar: 'الجزائر العاصمة' }, { value: 'Oran', ar: 'وهران' }, { value: 'Constantine', ar: 'قسنطينة' },
    { value: 'Annaba', ar: 'عنابة' }, { value: 'Batna', ar: 'باتنة' },
  ],
  'Morocco': [
    { value: 'Casablanca', ar: 'الدار البيضاء' }, { value: 'Rabat', ar: 'الرباط' }, { value: 'Marrakech', ar: 'مراكش' },
    { value: 'Fes', ar: 'فاس' }, { value: 'Tangier', ar: 'طنجة' }, { value: 'Agadir', ar: 'أغادير' },
  ],
  'Sudan': [
    { value: 'Khartoum', ar: 'الخرطوم' }, { value: 'Omdurman', ar: 'أم درمان' }, { value: 'Port Sudan', ar: 'بورتسودان' },
  ],
  'Somalia': [
    { value: 'Mogadishu', ar: 'مقديشو' }, { value: 'Hargeisa', ar: 'هرجيسا' }, { value: 'Kismayo', ar: 'كيسمايو' },
  ],
  'Turkey': [
    { value: 'Istanbul', ar: 'إسطنبول' }, { value: 'Ankara', ar: 'أنقرة' }, { value: 'Izmir', ar: 'إزمير' },
    { value: 'Bursa', ar: 'بورصة' }, { value: 'Antalya', ar: 'أنطاليا' }, { value: 'Konya', ar: 'قونية' },
    { value: 'Gaziantep', ar: 'غازي عنتاب' },
  ],
  'Iran': [
    { value: 'Tehran', ar: 'طهران' }, { value: 'Isfahan', ar: 'أصفهان' }, { value: 'Mashhad', ar: 'مشهد' },
    { value: 'Tabriz', ar: 'تبريز' }, { value: 'Shiraz', ar: 'شيراز' },
  ],
  'Pakistan': [
    { value: 'Karachi', ar: 'كراتشي' }, { value: 'Lahore', ar: 'لاهور' }, { value: 'Islamabad', ar: 'إسلام آباد' },
    { value: 'Rawalpindi', ar: 'روالبندي' }, { value: 'Faisalabad', ar: 'فيصل آباد' }, { value: 'Multan', ar: 'ملتان' },
    { value: 'Peshawar', ar: 'بيشاور' },
  ],
  'India': [
    { value: 'Mumbai', ar: 'مومباي' }, { value: 'Delhi', ar: 'دلهي' }, { value: 'Bangalore', ar: 'بنغالور' },
    { value: 'Hyderabad', ar: 'حيدر آباد' }, { value: 'Chennai', ar: 'تشيناي' }, { value: 'Kolkata', ar: 'كولكاتا' },
    { value: 'Lucknow', ar: 'لكناو' },
  ],
  'Bangladesh': [
    { value: 'Dhaka', ar: 'دكا' }, { value: 'Chittagong', ar: 'شيتاغونغ' }, { value: 'Sylhet', ar: 'سيلهت' },
  ],
  'Indonesia': [
    { value: 'Jakarta', ar: 'جاكرتا' }, { value: 'Surabaya', ar: 'سورابايا' }, { value: 'Bandung', ar: 'باندونغ' },
    { value: 'Medan', ar: 'ميدان' },
  ],
  'Malaysia': [
    { value: 'Kuala Lumpur', ar: 'كوالالمبور' }, { value: 'Penang', ar: 'بينانغ' }, { value: 'Johor Bahru', ar: 'جوهور باهرو' },
  ],
  'United Kingdom': [
    { value: 'London', ar: 'لندن' }, { value: 'Birmingham', ar: 'برمنغهام' }, { value: 'Manchester', ar: 'مانشستر' },
    { value: 'Leeds', ar: 'ليدز' }, { value: 'Glasgow', ar: 'غلاسكو' }, { value: 'Edinburgh', ar: 'إدنبرة' },
    { value: 'Bradford', ar: 'برادفورد' },
  ],
  'Germany': [
    { value: 'Berlin', ar: 'برلين' }, { value: 'Munich', ar: 'ميونخ' }, { value: 'Hamburg', ar: 'هامبورغ' },
    { value: 'Frankfurt', ar: 'فرانكفورت' }, { value: 'Cologne', ar: 'كولونيا' }, { value: 'Dusseldorf', ar: 'دوسلدورف' },
  ],
  'France': [
    { value: 'Paris', ar: 'باريس' }, { value: 'Marseille', ar: 'مارسيليا' }, { value: 'Lyon', ar: 'ليون' },
    { value: 'Toulouse', ar: 'تولوز' }, { value: 'Strasbourg', ar: 'ستراسبورغ' },
  ],
  'Netherlands': [
    { value: 'Amsterdam', ar: 'أمستردام' }, { value: 'Rotterdam', ar: 'روتردام' }, { value: 'The Hague', ar: 'لاهاي' },
  ],
  'Sweden': [
    { value: 'Stockholm', ar: 'ستوكهولم' }, { value: 'Gothenburg', ar: 'غوتنبرغ' }, { value: 'Malmo', ar: 'مالمو' },
  ],
  'Belgium': [
    { value: 'Brussels', ar: 'بروكسل' }, { value: 'Antwerp', ar: 'أنتويرب' },
  ],
  'Italy': [
    { value: 'Rome', ar: 'روما' }, { value: 'Milan', ar: 'ميلانو' }, { value: 'Naples', ar: 'نابولي' },
  ],
  'Spain': [
    { value: 'Madrid', ar: 'مدريد' }, { value: 'Barcelona', ar: 'برشلونة' }, { value: 'Valencia', ar: 'فالنسيا' },
  ],
  'Norway': [
    { value: 'Oslo', ar: 'أوسلو' }, { value: 'Bergen', ar: 'بيرغن' },
  ],
  'Denmark': [
    { value: 'Copenhagen', ar: 'كوبنهاغن' }, { value: 'Aarhus', ar: 'آرهوس' },
  ],
  'Austria': [
    { value: 'Vienna', ar: 'فيينا' }, { value: 'Graz', ar: 'غراتس' },
  ],
  'Switzerland': [
    { value: 'Zurich', ar: 'زيورخ' }, { value: 'Geneva', ar: 'جنيف' }, { value: 'Bern', ar: 'برن' },
  ],
  'Russia': [
    { value: 'Moscow', ar: 'موسكو' }, { value: 'St Petersburg', ar: 'سان بطرسبرغ' }, { value: 'Kazan', ar: 'قازان' },
  ],
  'United States': [
    { value: 'New York', ar: 'نيويورك' }, { value: 'Los Angeles', ar: 'لوس أنجلوس' }, { value: 'Chicago', ar: 'شيكاغو' },
    { value: 'Houston', ar: 'هيوستن' }, { value: 'Dallas', ar: 'دالاس' }, { value: 'Washington DC', ar: 'واشنطن' },
    { value: 'Detroit', ar: 'ديترويت' }, { value: 'San Francisco', ar: 'سان فرانسيسكو' }, { value: 'Miami', ar: 'ميامي' },
  ],
  'Canada': [
    { value: 'Toronto', ar: 'تورنتو' }, { value: 'Montreal', ar: 'مونتريال' }, { value: 'Vancouver', ar: 'فانكوفر' },
    { value: 'Ottawa', ar: 'أوتاوا' }, { value: 'Calgary', ar: 'كالغاري' }, { value: 'Edmonton', ar: 'إدمنتون' },
  ],
  'Australia': [
    { value: 'Sydney', ar: 'سيدني' }, { value: 'Melbourne', ar: 'ملبورن' }, { value: 'Brisbane', ar: 'بريزبن' },
    { value: 'Perth', ar: 'بيرث' },
  ],
};

const COUNTRIES = [
  // ── الخليج العربي ──
  { value: 'Saudi Arabia', ar: 'السعودية' },
  { value: 'UAE', ar: 'الإمارات' },
  { value: 'Kuwait', ar: 'الكويت' },
  { value: 'Bahrain', ar: 'البحرين' },
  { value: 'Qatar', ar: 'قطر' },
  { value: 'Oman', ar: 'عُمان' },
  { value: 'Yemen', ar: 'اليمن' },
  // ── شمال أفريقيا ──
  { value: 'Egypt', ar: 'مصر' },
  { value: 'Libya', ar: 'ليبيا' },
  { value: 'Tunisia', ar: 'تونس' },
  { value: 'Algeria', ar: 'الجزائر' },
  { value: 'Morocco', ar: 'المغرب' },
  { value: 'Sudan', ar: 'السودان' },
  { value: 'Mauritania', ar: 'موريتانيا' },
  // ── الشام ──
  { value: 'Jordan', ar: 'الأردن' },
  { value: 'Iraq', ar: 'العراق' },
  { value: 'Lebanon', ar: 'لبنان' },
  { value: 'Syria', ar: 'سوريا' },
  { value: 'Palestine', ar: 'فلسطين' },
  // ── أفريقيا ──
  { value: 'Somalia', ar: 'الصومال' },
  { value: 'Djibouti', ar: 'جيبوتي' },
  { value: 'Comoros', ar: 'جزر القمر' },
  { value: 'South Africa', ar: 'جنوب أفريقيا' },
  { value: 'Nigeria', ar: 'نيجيريا' },
  { value: 'Ethiopia', ar: 'إثيوبيا' },
  { value: 'Kenya', ar: 'كينيا' },
  { value: 'Tanzania', ar: 'تنزانيا' },
  { value: 'Senegal', ar: 'السنغال' },
  { value: 'Ghana', ar: 'غانا' },
  { value: 'Cameroon', ar: 'الكاميرون' },
  { value: 'Mali', ar: 'مالي' },
  { value: 'Niger', ar: 'النيجر' },
  { value: 'Chad', ar: 'تشاد' },
  { value: 'Eritrea', ar: 'إريتريا' },
  { value: 'Uganda', ar: 'أوغندا' },
  { value: 'Mozambique', ar: 'موزمبيق' },
  { value: 'Ivory Coast', ar: 'ساحل العاج' },
  // ── آسيا ──
  { value: 'Turkey', ar: 'تركيا' },
  { value: 'Iran', ar: 'إيران' },
  { value: 'Pakistan', ar: 'باكستان' },
  { value: 'Afghanistan', ar: 'أفغانستان' },
  { value: 'India', ar: 'الهند' },
  { value: 'Bangladesh', ar: 'بنغلاديش' },
  { value: 'Indonesia', ar: 'إندونيسيا' },
  { value: 'Malaysia', ar: 'ماليزيا' },
  { value: 'Uzbekistan', ar: 'أوزبكستان' },
  { value: 'Kazakhstan', ar: 'كازاخستان' },
  { value: 'Azerbaijan', ar: 'أذربيجان' },
  { value: 'Turkmenistan', ar: 'تركمانستان' },
  { value: 'Tajikistan', ar: 'طاجيكستان' },
  { value: 'Kyrgyzstan', ar: 'قيرغيزستان' },
  { value: 'Philippines', ar: 'الفلبين' },
  { value: 'Sri Lanka', ar: 'سريلانكا' },
  { value: 'China', ar: 'الصين' },
  { value: 'Japan', ar: 'اليابان' },
  { value: 'South Korea', ar: 'كوريا الجنوبية' },
  { value: 'Thailand', ar: 'تايلاند' },
  { value: 'Vietnam', ar: 'فيتنام' },
  { value: 'Singapore', ar: 'سنغافورة' },
  { value: 'Brunei', ar: 'بروناي' },
  { value: 'Maldives', ar: 'المالديف' },
  { value: 'Nepal', ar: 'نيبال' },
  // ── أوروبا ──
  { value: 'United Kingdom', ar: 'بريطانيا' },
  { value: 'Germany', ar: 'ألمانيا' },
  { value: 'France', ar: 'فرنسا' },
  { value: 'Netherlands', ar: 'هولندا' },
  { value: 'Belgium', ar: 'بلجيكا' },
  { value: 'Sweden', ar: 'السويد' },
  { value: 'Norway', ar: 'النرويج' },
  { value: 'Denmark', ar: 'الدنمارك' },
  { value: 'Finland', ar: 'فنلندا' },
  { value: 'Austria', ar: 'النمسا' },
  { value: 'Switzerland', ar: 'سويسرا' },
  { value: 'Italy', ar: 'إيطاليا' },
  { value: 'Spain', ar: 'إسبانيا' },
  { value: 'Portugal', ar: 'البرتغال' },
  { value: 'Greece', ar: 'اليونان' },
  { value: 'Poland', ar: 'بولندا' },
  { value: 'Romania', ar: 'رومانيا' },
  { value: 'Bosnia', ar: 'البوسنة' },
  { value: 'Albania', ar: 'ألبانيا' },
  { value: 'Kosovo', ar: 'كوسوفو' },
  { value: 'Russia', ar: 'روسيا' },
  { value: 'Ukraine', ar: 'أوكرانيا' },
  // ── أمريكا الشمالية ──
  { value: 'United States', ar: 'أمريكا' },
  { value: 'Canada', ar: 'كندا' },
  { value: 'Mexico', ar: 'المكسيك' },
  // ── أمريكا الجنوبية ──
  { value: 'Brazil', ar: 'البرازيل' },
  { value: 'Argentina', ar: 'الأرجنتين' },
  { value: 'Colombia', ar: 'كولومبيا' },
  { value: 'Venezuela', ar: 'فنزويلا' },
  { value: 'Chile', ar: 'تشيلي' },
  { value: 'Peru', ar: 'بيرو' },
  // ── أوقيانوسيا ──
  { value: 'Australia', ar: 'أستراليا' },
  { value: 'New Zealand', ar: 'نيوزيلندا' },
];

type Gender = 'MALE' | 'FEMALE';

/* ── component ───────────────────────────────────────────── */
export default function CompleteProfileScreen() {
  const { user, login } = useAuth();
  const { t, lang } = useI18n();
  const router = useRouter();
  const scrollRef = useRef<ScrollView>(null);
  const [saving, setSaving] = useState(false);
  const [step, setStep] = useState(0);
  const isRTL = lang === 'ar';
  const p = t.profile;

  /* ── state ───────────────────────────────────────────── */
  // Step 0 – Gender
  const [gender, setGender] = useState<Gender | null>(null);
  // Step 1 – Personal
  const [nickname, setNickname] = useState('');
  const [age, setAge] = useState('');
  const [residenceCountry, setResidenceCountry] = useState('');
  const [region, setRegion] = useState('');
  const [nationalityPrimary, setNationalityPrimary] = useState('');
  const [tribe, setTribe] = useState('');
  // Step 2 – Religion
  const [religion, setReligion] = useState('');
  const [sect, setSect] = useState('');
  const [religiosityLevel, setReligiosityLevel] = useState('');
  const [prayerLevel, setPrayerLevel] = useState('');
  // Step 3 – Appearance
  const [height, setHeight] = useState('');
  const [weight, setWeight] = useState('');
  const [skinColor, setSkinColor] = useState('');
  // Step 4 – Social
  const [maritalStatus, setMaritalStatus] = useState('');
  const [childrenCount, setChildrenCount] = useState('');
  const [wantChildren, setWantChildren] = useState<boolean | null>(null);
  const [educationLevel, setEducationLevel] = useState('');
  const [jobStatus, setJobStatus] = useState('');
  // Step 1 – Languages (multi-select)
  const [languages, setLanguages] = useState<string[]>([]);
  // Step 2 – Halal food
  const [halalFood, setHalalFood] = useState('');
  // Step 3 – Eye/Hair color, hijab/beard
  const [eyeColor, setEyeColor] = useState('');
  const [hairColor, setHairColor] = useState('');
  const [hijabBeard, setHijabBeard] = useState('');
  // Step 4 – Income, custody
  const [income, setIncome] = useState('');
  const [custodyInfo, setCustodyInfo] = useState('');
  // Step 5 – Lifestyle
  const [smoking, setSmoking] = useState('');
  const [alcohol, setAlcohol] = useState('');
  const [womenWorkStudy, setWomenWorkStudy] = useState('');
  const [fitnessLevel, setFitnessLevel] = useState('');
  const [livingArrangement, setLivingArrangement] = useState('');
  const [willingToRelocate, setWillingToRelocate] = useState<boolean | null>(null);
  const [healthStatus, setHealthStatus] = useState('');
  const [healthCondition, setHealthCondition] = useState('');
  // Step 6 – About
  const [aboutMe, setAboutMe] = useState('');
  const [partnerPrefs, setPartnerPrefs] = useState('');
  const [guardianName, setGuardianName] = useState('');
  const [guardianRelation, setGuardianRelation] = useState('');
  const [guardianContact, setGuardianContact] = useState('');
  const [interests, setInterests] = useState<string[]>([]);
  // Step 7 – Marriage & Mahr
  const [marriageTimeline, setMarriageTimeline] = useState('');
  const [mahrMin, setMahrMin] = useState('');
  const [mahrMax, setMahrMax] = useState('');
  const [dowryMin, setDowryMin] = useState('');
  const [dowryMax, setDowryMax] = useState('');
  const [showMeTo, setShowMeTo] = useState('');

  /* ── helpers ─────────────────────────────────────────── */
  const TOTAL_STEPS = 8;
  const progress = ((step + 1) / TOTAL_STEPS) * 100;

  const Chip = ({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) => (
    <Pressable style={[styles.chip, selected && styles.chipActive]} onPress={onPress}>
      <Text style={[styles.chipText, selected && styles.chipTextActive]}>{label}</Text>
    </Pressable>
  );

  const ChipRow = ({ children }: { children: React.ReactNode }) => (
    <View style={styles.chipRow}>{children}</View>
  );

  const scrollTop = () => scrollRef.current?.scrollTo({ y: 0, animated: true });
  const nextStep = () => { setStep(s => s + 1); scrollTop(); };
  const prevStep = () => { setStep(s => s - 1); scrollTop(); };

  /* ── validation per step ─────────────────────────────── */
  const canNext = (): boolean => {
    switch (step) {
      case 0: return !!gender;
      case 1: return !!(nickname.trim() && age.trim() && residenceCountry);
      default: return true; // optional steps
    }
  };

  /* ── save ─────────────────────────────────────────────── */
  const handleSave = async () => {
    setSaving(true);
    try {
      const payload: Record<string, any> = {
        gender,
        nickname: nickname.trim(),
        age: parseInt(age, 10),
        residenceCountry,
      };
      const optional = (k: string, v: any) => { if (v !== '' && v !== null && v !== undefined) payload[k] = v; };
      optional('region', region.trim());
      optional('nationalityPrimary', nationalityPrimary);
      optional('tribe', tribe.trim());
      optional('sect', sect);
      optional('religiosity', religiosityLevel);
      optional('prayerLevel', prayerLevel);
      if (height) optional('height', parseInt(height, 10));
      if (weight) optional('weight', parseInt(weight, 10));
      optional('skinColor', skinColor);
      optional('maritalStatus', maritalStatus);
      if (childrenCount) optional('childrenCount', parseInt(childrenCount, 10));
      if (wantChildren !== null) payload.wantChildren = wantChildren;
      optional('educationLevel', educationLevel);
      optional('jobStatus', jobStatus);
      optional('smoking', smoking);
      optional('alcohol', alcohol);
      optional('fitnessLevel', fitnessLevel);
      optional('livingArrangement', livingArrangement);
      if (willingToRelocate !== null) payload.willingToRelocate = willingToRelocate;
      optional('healthStatus', healthStatus);
      optional('healthCondition', healthCondition.trim());
      optional('aboutMe', aboutMe.trim());
      optional('partnerPrefs', partnerPrefs.trim());
      optional('guardianName', guardianName.trim());
      optional('guardianRelation', guardianRelation.trim());
      optional('guardianContact', guardianContact.trim());
      // New fields
      optional('religion', religion);
      if (languages.length > 0) payload.languages = languages;
      optional('halalFood', halalFood);
      optional('eyeColor', eyeColor);
      optional('hairColor', hairColor);
      optional('hijabBeard', hijabBeard);
      optional('income', income);
      optional('custodyInfo', custodyInfo.trim());
      optional('womenWorkStudy', womenWorkStudy);
      if (interests.length > 0) payload.interests = interests;
      optional('marriageTimeline', marriageTimeline);
      if (mahrMin) optional('mahrMin', parseInt(mahrMin, 10));
      if (mahrMax) optional('mahrMax', parseInt(mahrMax, 10));
      if (dowryMin) optional('dowryMin', parseInt(dowryMin, 10));
      if (dowryMax) optional('dowryMax', parseInt(dowryMax, 10));
      optional('showMeTo', showMeTo);

      await api.put('/profiles/me', payload);

      if (user) {
        const updatedUser = { ...user, profileCompleted: true };
        const token = await getItem('token');
        const refreshToken = await getItem('refreshToken');
        await login(token || '', updatedUser, refreshToken || undefined);
      }
      router.replace('/(tabs)');
    } catch (error: any) {
      const msg = error.response?.data?.message || p.profileUpdateFailed;
      Alert.alert(t.common.error, Array.isArray(msg) ? msg.join('\n') : msg);
    } finally {
      setSaving(false);
    }
  };

  /* ── step renderers ──────────────────────────────────── */
  const renderStep0 = () => (
    <View style={styles.card}>
      <Text style={styles.sectionTitle}>{p.genderLabel} *</Text>
      <View style={styles.genderRow}>
        {(['MALE', 'FEMALE'] as Gender[]).map(g => (
          <Pressable key={g} style={[styles.genderBtn, gender === g && styles.genderBtnActive]} onPress={() => setGender(g)}>
            <Text style={[styles.genderBtnText, gender === g && styles.genderBtnTextActive]}>
              {g === 'MALE' ? p.genderMale : p.genderFemale}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );

  const renderStep1 = () => (
    <View style={styles.card}>
      <Text style={styles.sectionTitle}>{p.personalInfo}</Text>
      <Text style={styles.label}>{p.nickname} *</Text>
      <TextInput style={styles.input} value={nickname} onChangeText={setNickname} placeholder={p.nicknameHint} textAlign={isRTL ? 'right' : 'left'} />

      <Text style={styles.label}>{p.age} *</Text>
      <TextInput style={styles.input} value={age} onChangeText={setAge} placeholder="25" keyboardType="numeric" textAlign={isRTL ? 'right' : 'left'} />

      <Text style={styles.label}>{p.residenceCountry} *</Text>
      <ChipRow>
        {COUNTRIES.map(c => (
          <Chip key={c.value} label={isRTL ? c.ar : c.value} selected={residenceCountry === c.value} onPress={() => setResidenceCountry(residenceCountry === c.value ? '' : c.value)} />
        ))}
      </ChipRow>

      <Text style={[styles.label, { marginTop: 10 }]}>{p.regionLabel}</Text>
      {residenceCountry && CITIES_BY_COUNTRY[residenceCountry] ? (
        <ChipRow>
          {CITIES_BY_COUNTRY[residenceCountry].map(c => (
            <Chip key={c.value} label={isRTL ? c.ar : c.value} selected={region === c.value} onPress={() => setRegion(region === c.value ? '' : c.value)} />
          ))}
        </ChipRow>
      ) : (
        <TextInput style={styles.input} value={region} onChangeText={setRegion} placeholder={p.regionPlaceholder} textAlign={isRTL ? 'right' : 'left'} />
      )}

      <Text style={styles.label}>{p.nationality}</Text>
      <ChipRow>
        {COUNTRIES.map(c => (
          <Chip key={c.value} label={isRTL ? c.ar : c.value} selected={nationalityPrimary === c.value} onPress={() => setNationalityPrimary(nationalityPrimary === c.value ? '' : c.value)} />
        ))}
      </ChipRow>

      <Text style={[styles.label, { marginTop: 10 }]}>{p.tribeLabel}</Text>
      <TextInput style={styles.input} value={tribe} onChangeText={setTribe} placeholder={p.tribePlaceholder} textAlign={isRTL ? 'right' : 'left'} />

      <Text style={[styles.label, { marginTop: 10 }]}>{p.languagesLabel}</Text>
      <ChipRow>
        {[
          { v: 'Arabic', l: p.langArabic },
          { v: 'English', l: p.langEnglish },
          { v: 'French', l: p.langFrench },
          { v: 'Urdu', l: p.langUrdu },
          { v: 'Turkish', l: p.langTurkish },
          { v: 'Farsi', l: p.langFarsi },
          { v: 'Malay', l: p.langMalay },
          { v: 'Spanish', l: p.langSpanish },
          { v: 'German', l: p.langGerman },
          { v: 'Other', l: p.langOther },
        ].map(lg => (
          <Chip key={lg.v} label={lg.l} selected={languages.includes(lg.v)} onPress={() => setLanguages(prev => prev.includes(lg.v) ? prev.filter(x => x !== lg.v) : [...prev, lg.v])} />
        ))}
      </ChipRow>
    </View>
  );

  const renderStep2 = () => {
    const religions = [
      { v: 'Islam', l: p.religionIslam },
      { v: 'Christian', l: p.religionChristian },
      { v: 'Jewish', l: p.religionJewish },
      { v: 'Other', l: p.religionOther },
    ];
    const sects = [
      { v: 'Sunni', l: isRTL ? 'سني' : 'Sunni' },
      { v: 'Shia', l: isRTL ? 'شيعي' : 'Shia' },
      { v: 'Ibadi', l: isRTL ? 'إباضي' : 'Ibadi' },
    ];
    const religiosities = [
      { v: 'VeryReligious', l: p.veryReligious },
      { v: 'Religious', l: p.religious },
      { v: 'Moderate', l: p.moderate },
      { v: 'Liberal', l: p.liberal },
    ];
    const prayers = [
      { v: 'Always', l: p.prayerAlways },
      { v: 'Usually', l: p.prayerUsually },
      { v: 'Sometimes', l: p.prayerSometimes },
      { v: 'Rarely', l: p.prayerRarely },
      { v: 'Never', l: p.prayerNever },
    ];
    return (
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>{p.religionInfo}</Text>
        <Text style={styles.label}>{p.religionLabel}</Text>
        <ChipRow>{religions.map(r => <Chip key={r.v} label={r.l} selected={religion === r.v} onPress={() => setReligion(religion === r.v ? '' : r.v)} />)}</ChipRow>

        <Text style={[styles.label, { marginTop: 10 }]}>{p.sectLabel}</Text>
        <ChipRow>{sects.map(s => <Chip key={s.v} label={s.l} selected={sect === s.v} onPress={() => setSect(sect === s.v ? '' : s.v)} />)}</ChipRow>

        <Text style={[styles.label, { marginTop: 10 }]}>{p.religiosityLevel}</Text>
        <ChipRow>{religiosities.map(r => <Chip key={r.v} label={r.l} selected={religiosityLevel === r.v} onPress={() => setReligiosityLevel(religiosityLevel === r.v ? '' : r.v)} />)}</ChipRow>

        <Text style={[styles.label, { marginTop: 10 }]}>{p.prayerLevel}</Text>
        <ChipRow>{prayers.map(pr => <Chip key={pr.v} label={pr.l} selected={prayerLevel === pr.v} onPress={() => setPrayerLevel(prayerLevel === pr.v ? '' : pr.v)} />)}</ChipRow>

        <Text style={[styles.label, { marginTop: 10 }]}>{p.halalFoodLabel}</Text>
        <ChipRow>
          {[
            { v: 'Always', l: p.halalAlways },
            { v: 'Usually', l: p.halalUsually },
            { v: 'Sometimes', l: p.halalSometimes },
            { v: 'Never', l: p.halalNever },
          ].map(h => <Chip key={h.v} label={h.l} selected={halalFood === h.v} onPress={() => setHalalFood(halalFood === h.v ? '' : h.v)} />)}
        </ChipRow>
      </View>
    );
  };

  const renderStep3 = () => {
    const skins = [
      { v: 'Light', l: p.skinLight },
      { v: 'Wheat', l: p.skinWheat },
      { v: 'Medium', l: p.skinMedium },
      { v: 'Dark', l: p.skinDark },
    ];
    const eyes = [
      { v: 'Black', l: p.eyeBlack },
      { v: 'Brown', l: p.eyeBrown },
      { v: 'Hazel', l: p.eyeHazel },
      { v: 'Green', l: p.eyeGreen },
      { v: 'Blue', l: p.eyeBlue },
    ];
    const hairs = [
      { v: 'Black', l: p.hairBlack },
      { v: 'Brown', l: p.hairBrown },
      { v: 'Blonde', l: p.hairBlonde },
      { v: 'Red', l: p.hairRed },
      { v: 'Gray', l: p.hairGray },
    ];
    const hijabOptions = gender === 'FEMALE'
      ? [
          { v: 'Niqab', l: p.hijabFull },
          { v: 'Hijab', l: p.hijabYes },
          { v: 'Moderate', l: p.hijabModerate },
          { v: 'No', l: p.hijabNo },
        ]
      : [
          { v: 'Full', l: p.beardFull },
          { v: 'Short', l: p.beardShort },
          { v: 'Clean', l: p.beardClean },
        ];
    return (
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>{p.appearanceInfo}</Text>
        <Text style={styles.label}>{p.heightCmLabel}</Text>
        <TextInput style={styles.input} value={height} onChangeText={setHeight} placeholder="170" keyboardType="numeric" textAlign={isRTL ? 'right' : 'left'} />

        <Text style={styles.label}>{p.weightKgLabel}</Text>
        <TextInput style={styles.input} value={weight} onChangeText={setWeight} placeholder="70" keyboardType="numeric" textAlign={isRTL ? 'right' : 'left'} />

        <Text style={styles.label}>{p.skinColorLabel}</Text>
        <ChipRow>{skins.map(s => <Chip key={s.v} label={s.l} selected={skinColor === s.v} onPress={() => setSkinColor(skinColor === s.v ? '' : s.v)} />)}</ChipRow>

        <Text style={[styles.label, { marginTop: 10 }]}>{p.eyeColorLabel}</Text>
        <ChipRow>{eyes.map(e => <Chip key={e.v} label={e.l} selected={eyeColor === e.v} onPress={() => setEyeColor(eyeColor === e.v ? '' : e.v)} />)}</ChipRow>

        <Text style={[styles.label, { marginTop: 10 }]}>{p.hairColorLabel}</Text>
        <ChipRow>{hairs.map(h => <Chip key={h.v} label={h.l} selected={hairColor === h.v} onPress={() => setHairColor(hairColor === h.v ? '' : h.v)} />)}</ChipRow>

        <Text style={[styles.label, { marginTop: 10 }]}>{p.hijabBeardLabel}</Text>
        <ChipRow>{hijabOptions.map(h => <Chip key={h.v} label={h.l} selected={hijabBeard === h.v} onPress={() => setHijabBeard(hijabBeard === h.v ? '' : h.v)} />)}</ChipRow>
      </View>
    );
  };

  const renderStep4 = () => {
    const maritals = [
      { v: 'Single', l: p.maritalSingle },
      { v: 'Divorced', l: p.maritalDivorced },
      { v: 'Widowed', l: p.maritalWidowed },
      { v: 'Married', l: p.maritalMarried },
    ];
    const edus = [
      { v: 'HighSchool', l: p.eduHighSchool },
      { v: 'Diploma', l: p.eduDiploma },
      { v: 'Bachelors', l: p.eduBachelors },
      { v: 'Masters', l: p.eduMasters },
      { v: 'PhD', l: p.eduPhD },
      { v: 'Other', l: p.eduOther },
    ];
    const jobs = [
      { v: 'Employed', l: p.jobEmployed },
      { v: 'SelfEmployed', l: p.jobSelfEmployed },
      { v: 'Student', l: p.jobStudent },
      { v: 'Unemployed', l: p.jobUnemployed },
      { v: 'Retired', l: p.jobRetired },
    ];
    return (
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>{p.socialInfo}</Text>
        <Text style={styles.label}>{p.maritalStatus}</Text>
        <ChipRow>{maritals.map(m => <Chip key={m.v} label={m.l} selected={maritalStatus === m.v} onPress={() => setMaritalStatus(maritalStatus === m.v ? '' : m.v)} />)}</ChipRow>

        <Text style={[styles.label, { marginTop: 10 }]}>{p.childrenCount}</Text>
        <TextInput style={styles.input} value={childrenCount} onChangeText={setChildrenCount} placeholder="0" keyboardType="numeric" textAlign={isRTL ? 'right' : 'left'} />

        <Text style={styles.label}>{p.wantChildrenLabel}</Text>
        <ChipRow>
          <Chip label={p.yes} selected={wantChildren === true} onPress={() => setWantChildren(wantChildren === true ? null : true)} />
          <Chip label={p.no} selected={wantChildren === false} onPress={() => setWantChildren(wantChildren === false ? null : false)} />
        </ChipRow>

        <Text style={[styles.label, { marginTop: 10 }]}>{p.educationLabel}</Text>
        <ChipRow>{edus.map(e => <Chip key={e.v} label={e.l} selected={educationLevel === e.v} onPress={() => setEducationLevel(educationLevel === e.v ? '' : e.v)} />)}</ChipRow>

        <Text style={[styles.label, { marginTop: 10 }]}>{p.jobStatusLabel}</Text>
        <ChipRow>{jobs.map(j => <Chip key={j.v} label={j.l} selected={jobStatus === j.v} onPress={() => setJobStatus(jobStatus === j.v ? '' : j.v)} />)}</ChipRow>

        <Text style={[styles.label, { marginTop: 10 }]}>{p.incomeLabel}</Text>
        <ChipRow>
          {[
            { v: 'Below3k', l: p.incomeBelow3k },
            { v: '3to6k', l: p.income3to6k },
            { v: '6to10k', l: p.income6to10k },
            { v: '10to20k', l: p.income10to20k },
            { v: '20kPlus', l: p.income20kPlus },
            { v: 'PreferNot', l: p.incomePreferNot },
          ].map(i => <Chip key={i.v} label={i.l} selected={income === i.v} onPress={() => setIncome(income === i.v ? '' : i.v)} />)}
        </ChipRow>

        {childrenCount && parseInt(childrenCount, 10) > 0 && (
          <>
            <Text style={[styles.label, { marginTop: 10 }]}>{p.custodyLabel}</Text>
            <TextInput style={styles.input} value={custodyInfo} onChangeText={setCustodyInfo} placeholder={p.custodyPlaceholder} textAlign={isRTL ? 'right' : 'left'} />
          </>
        )}
      </View>
    );
  };

  const renderStep5 = () => {
    const smokes = [
      { v: 'NonSmoker', l: p.smokingNo },
      { v: 'Smoker', l: p.smokingYes },
      { v: 'Occasional', l: p.smokingOccasional },
    ];
    const drinks = [
      { v: 'No', l: p.alcoholNo },
      { v: 'Yes', l: p.alcoholYes },
      { v: 'Occasional', l: p.alcoholOccasional },
    ];
    const fitnesses = [
      { v: 'Active', l: p.fitnessActive },
      { v: 'Moderate', l: p.fitnessModerate },
      { v: 'Light', l: p.fitnessLight },
      { v: 'None', l: p.fitnessNone },
    ];
    const livings = [
      { v: 'Own', l: p.livingOwn },
      { v: 'Rental', l: p.livingRent },
      { v: 'WithFamily', l: p.livingFamily },
    ];
    const healths = [
      { v: 'Good', l: p.healthGood },
      { v: 'HasCondition', l: p.healthConditionExists },
    ];
    const womenWorkOptions = isRTL
      ? [
          { v: 'Yes', l: 'نعم أقبل' },
          { v: 'No', l: 'لا أقبل' },
          { v: 'Condition', l: 'بشروط' },
        ]
      : [
          { v: 'Yes', l: 'Yes' },
          { v: 'No', l: 'No' },
          { v: 'Condition', l: 'With conditions' },
        ];
    return (
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>{p.lifestyleInfo}</Text>
        <Text style={styles.label}>{p.smokingLabel}</Text>
        <ChipRow>{smokes.map(s => <Chip key={s.v} label={s.l} selected={smoking === s.v} onPress={() => setSmoking(smoking === s.v ? '' : s.v)} />)}</ChipRow>

        <Text style={[styles.label, { marginTop: 10 }]}>{p.alcoholLabel}</Text>
        <ChipRow>{drinks.map(d => <Chip key={d.v} label={d.l} selected={alcohol === d.v} onPress={() => setAlcohol(alcohol === d.v ? '' : d.v)} />)}</ChipRow>

        <Text style={[styles.label, { marginTop: 10 }]}>{p.fitnessLabel}</Text>
        <ChipRow>{fitnesses.map(f => <Chip key={f.v} label={f.l} selected={fitnessLevel === f.v} onPress={() => setFitnessLevel(fitnessLevel === f.v ? '' : f.v)} />)}</ChipRow>

        <Text style={[styles.label, { marginTop: 10 }]}>{p.livingLabel}</Text>
        <ChipRow>{livings.map(l => <Chip key={l.v} label={l.l} selected={livingArrangement === l.v} onPress={() => setLivingArrangement(livingArrangement === l.v ? '' : l.v)} />)}</ChipRow>

        <Text style={[styles.label, { marginTop: 10 }]}>{p.willingRelocateLabel}</Text>
        <ChipRow>
          <Chip label={p.yes} selected={willingToRelocate === true} onPress={() => setWillingToRelocate(willingToRelocate === true ? null : true)} />
          <Chip label={p.no} selected={willingToRelocate === false} onPress={() => setWillingToRelocate(willingToRelocate === false ? null : false)} />
        </ChipRow>

        <Text style={[styles.label, { marginTop: 10 }]}>{isRTL ? 'هل تقبل عمل/دراسة المرأة؟' : 'Accept women working/studying?'}</Text>
        <ChipRow>
          {womenWorkOptions.map(w => <Chip key={w.v} label={w.l} selected={womenWorkStudy === w.v} onPress={() => setWomenWorkStudy(womenWorkStudy === w.v ? '' : w.v)} />)}
        </ChipRow>

        <Text style={[styles.label, { marginTop: 10 }]}>{p.healthLabel}</Text>
        <ChipRow>{healths.map(h => <Chip key={h.v} label={h.l} selected={healthStatus === h.v} onPress={() => setHealthStatus(healthStatus === h.v ? '' : h.v)} />)}</ChipRow>

        {healthStatus === 'HasCondition' && (
          <>
            <Text style={[styles.label, { marginTop: 10 }]}>{p.healthConditionLabel}</Text>
            <TextInput style={styles.input} value={healthCondition} onChangeText={setHealthCondition} placeholder={p.healthConditionPlaceholder} textAlign={isRTL ? 'right' : 'left'} />
          </>
        )}
      </View>
    );
  };

  const renderStep6 = () => {
    const interestOptions = [
      { v: 'Sports', l: p.interestSports },
      { v: 'Reading', l: p.interestReading },
      { v: 'Travel', l: p.interestTravel },
      { v: 'Cooking', l: p.interestCooking },
      { v: 'Tech', l: p.interestTech },
      { v: 'Art', l: p.interestArt },
      { v: 'Music', l: p.interestMusic },
      { v: 'Gaming', l: p.interestGaming },
      { v: 'Fashion', l: p.interestFashion },
      { v: 'Photography', l: p.interestPhotography },
      { v: 'Writing', l: p.interestWriting },
      { v: 'Volunteer', l: p.interestVolunteer },
      { v: 'Fitness', l: p.interestFitness },
      { v: 'Nature', l: p.interestNature },
      { v: 'Business', l: p.interestBusiness },
    ];
    return (
    <View style={styles.card}>
      <Text style={styles.sectionTitle}>{p.aboutMeSection}</Text>
      <Text style={styles.label}>{p.aboutMeLabel}</Text>
      <TextInput style={[styles.input, styles.textArea]} value={aboutMe} onChangeText={setAboutMe} placeholder={p.aboutMePlaceholder} multiline numberOfLines={4} textAlignVertical="top" textAlign={isRTL ? 'right' : 'left'} />

      <Text style={styles.label}>{p.partnerPrefs}</Text>
      <TextInput style={[styles.input, styles.textArea]} value={partnerPrefs} onChangeText={setPartnerPrefs} placeholder={p.partnerPrefsPlaceholder} multiline numberOfLines={4} textAlignVertical="top" textAlign={isRTL ? 'right' : 'left'} />

      <Text style={[styles.label, { marginTop: 10 }]}>{p.guardianSection}</Text>
      <Text style={styles.helperText}>{p.guardianHint}</Text>

      <Text style={styles.label}>{p.guardianName}</Text>
      <TextInput style={styles.input} value={guardianName} onChangeText={setGuardianName} placeholder={p.guardianNamePlaceholder} textAlign={isRTL ? 'right' : 'left'} />

      <Text style={styles.label}>{p.guardianRelation}</Text>
      <TextInput style={styles.input} value={guardianRelation} onChangeText={setGuardianRelation} placeholder={p.guardianRelationPlaceholder} textAlign={isRTL ? 'right' : 'left'} />

      <Text style={styles.label}>{p.guardianContact}</Text>
      <TextInput style={styles.input} value={guardianContact} onChangeText={setGuardianContact} placeholder={p.guardianContactPlaceholder} keyboardType="phone-pad" textAlign={isRTL ? 'right' : 'left'} />

      <Text style={[styles.label, { marginTop: 10 }]}>{p.interestsLabel}</Text>
      <ChipRow>
        {interestOptions.map(i => (
          <Chip key={i.v} label={i.l} selected={interests.includes(i.v)} onPress={() => setInterests(prev => prev.includes(i.v) ? prev.filter(x => x !== i.v) : [...prev, i.v])} />
        ))}
      </ChipRow>
    </View>
    );
  };

  const renderStep7 = () => {
    const timelines = [
      { v: 'ASAP', l: p.timelineAsap },
      { v: '6Months', l: p.timeline6months },
      { v: '1Year', l: p.timeline1year },
      { v: '2Years', l: p.timeline2years },
      { v: 'NotSure', l: p.timelineNotSure },
    ];
    const showOptions = [
      { v: 'Everyone', l: p.showEveryone },
      { v: 'MenOnly', l: p.showMenOnly },
      { v: 'WomenOnly', l: p.showWomenOnly },
    ];
    return (
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>{p.marriageInfo}</Text>

        <Text style={styles.label}>{p.marriageTimelineLabel}</Text>
        <ChipRow>{timelines.map(t => <Chip key={t.v} label={t.l} selected={marriageTimeline === t.v} onPress={() => setMarriageTimeline(marriageTimeline === t.v ? '' : t.v)} />)}</ChipRow>

        <Text style={[styles.label, { marginTop: 10 }]}>{p.mahrLabel}</Text>
        <View style={{ flexDirection: 'row-reverse', gap: 10 }}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.label, { fontSize: 12 }]}>{p.mahrMinLabel}</Text>
            <TextInput style={styles.input} value={mahrMin} onChangeText={setMahrMin} placeholder="0" keyboardType="numeric" textAlign={isRTL ? 'right' : 'left'} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.label, { fontSize: 12 }]}>{p.mahrMaxLabel}</Text>
            <TextInput style={styles.input} value={mahrMax} onChangeText={setMahrMax} placeholder="0" keyboardType="numeric" textAlign={isRTL ? 'right' : 'left'} />
          </View>
        </View>

        <Text style={[styles.label, { marginTop: 10 }]}>{p.dowryLabel}</Text>
        <View style={{ flexDirection: 'row-reverse', gap: 10 }}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.label, { fontSize: 12 }]}>{p.dowryMinLabel}</Text>
            <TextInput style={styles.input} value={dowryMin} onChangeText={setDowryMin} placeholder="0" keyboardType="numeric" textAlign={isRTL ? 'right' : 'left'} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.label, { fontSize: 12 }]}>{p.dowryMaxLabel}</Text>
            <TextInput style={styles.input} value={dowryMax} onChangeText={setDowryMax} placeholder="0" keyboardType="numeric" textAlign={isRTL ? 'right' : 'left'} />
          </View>
        </View>

        <Text style={[styles.label, { marginTop: 10 }]}>{p.showMeToLabel}</Text>
        <ChipRow>{showOptions.map(s => <Chip key={s.v} label={s.l} selected={showMeTo === s.v} onPress={() => setShowMeTo(showMeTo === s.v ? '' : s.v)} />)}</ChipRow>
      </View>
    );
  };

  const stepRenderers = [renderStep0, renderStep1, renderStep2, renderStep3, renderStep4, renderStep5, renderStep6, renderStep7];

  /* ── render ──────────────────────────────────────────── */
  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.container}>
      <ScrollView ref={scrollRef} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {/* Hero */}
        <View style={styles.hero}>
          <Text style={styles.heroTitle}>{p.completeProfile}</Text>
          <Text style={styles.heroSubtitle}>{p.completeProfileHint}</Text>
        </View>

        {/* Progress bar */}
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${progress}%` }]} />
        </View>
        <Text style={styles.stepLabel}>{step + 1} / {TOTAL_STEPS}</Text>

        {/* Current step */}
        {stepRenderers[step]()}

        {/* Nav buttons */}
        <View style={styles.navRow}>
          {step > 0 && (
            <TouchableOpacity style={styles.backBtn} onPress={prevStep}>
              <Text style={styles.backBtnText}>{isRTL ? '→' : '←'}</Text>
            </TouchableOpacity>
          )}
          <View style={{ flex: 1 }} />
          {step < TOTAL_STEPS - 1 ? (
            <TouchableOpacity style={[styles.nextBtn, !canNext() && styles.btnDisabled]} onPress={nextStep} disabled={!canNext()}>
              <Text style={styles.nextBtnText}>{isRTL ? '←' : '→'}</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={[styles.saveButton, !canNext() && styles.btnDisabled]} onPress={handleSave} disabled={saving || !canNext()}>
              <Text style={styles.saveButtonText}>{saving ? t.common.loading : t.common.save}</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

/* ── styles ─────────────────────────────────────────────── */
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f6efe6' },
  content: { padding: 20, paddingTop: 50, paddingBottom: 40 },
  hero: { backgroundColor: '#17313e', borderRadius: 24, padding: 24, marginBottom: 12 },
  heroTitle: { color: '#fff', fontSize: 26, fontWeight: '800', textAlign: 'right', marginBottom: 8 },
  heroSubtitle: { color: '#c8dce5', fontSize: 15, textAlign: 'right', lineHeight: 22 },
  progressTrack: { height: 6, borderRadius: 3, backgroundColor: '#e0d5cc', marginBottom: 4, overflow: 'hidden' },
  progressFill: { height: 6, borderRadius: 3, backgroundColor: '#c84767' },
  stepLabel: { textAlign: 'center', color: '#777', fontSize: 13, marginBottom: 14, fontWeight: '600' },
  card: { backgroundColor: '#fff', borderRadius: 20, padding: 20, marginBottom: 14, shadowColor: '#40241b', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.06, shadowRadius: 14, elevation: 4 },
  sectionTitle: { fontSize: 20, fontWeight: '800', textAlign: 'right', color: '#23161a', marginBottom: 16 },
  label: { fontSize: 14, color: '#555', marginBottom: 6, textAlign: 'right', fontWeight: '600' },
  helperText: { fontSize: 12, color: '#9ca3af', marginBottom: 10, textAlign: 'right', lineHeight: 18 },
  input: { borderWidth: 1, borderColor: '#e7d8dc', borderRadius: 14, paddingVertical: 14, paddingHorizontal: 16, fontSize: 16, color: '#23161a', marginBottom: 14, backgroundColor: '#fffdfd' },
  textArea: { height: 100 },
  genderRow: { flexDirection: 'row-reverse', gap: 12 },
  genderBtn: { flex: 1, borderWidth: 2, borderColor: '#e0d5cc', borderRadius: 16, paddingVertical: 16, alignItems: 'center', backgroundColor: '#faf6f2' },
  genderBtnActive: { backgroundColor: '#c84767', borderColor: '#c84767' },
  genderBtnText: { fontSize: 17, fontWeight: '700', color: '#5a4a44' },
  genderBtnTextActive: { color: '#fff' },
  chipRow: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, borderWidth: 1.5, borderColor: '#e0d5cc', backgroundColor: '#faf6f2' },
  chipActive: { backgroundColor: '#c84767', borderColor: '#c84767' },
  chipText: { fontSize: 14, fontWeight: '600', color: '#5a4a44' },
  chipTextActive: { color: '#fff' },
  navRow: { flexDirection: 'row', alignItems: 'center', marginTop: 10 },
  backBtn: { width: 52, height: 52, borderRadius: 26, backgroundColor: '#e0d5cc', alignItems: 'center', justifyContent: 'center' },
  backBtnText: { fontSize: 22, fontWeight: '700', color: '#5a4a44' },
  nextBtn: { width: 52, height: 52, borderRadius: 26, backgroundColor: '#c84767', alignItems: 'center', justifyContent: 'center' },
  nextBtnText: { fontSize: 22, fontWeight: '700', color: '#fff' },
  saveButton: { backgroundColor: '#d84b6b', borderRadius: 18, paddingVertical: 16, paddingHorizontal: 32, alignItems: 'center' },
  btnDisabled: { opacity: 0.4 },
  saveButtonText: { color: '#fff', fontSize: 18, fontWeight: '800' },
});
