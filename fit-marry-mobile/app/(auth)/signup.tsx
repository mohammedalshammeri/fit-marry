import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Link } from 'expo-router';
import { useAuth } from '../../src/context/AuthContext';
import type { MarriageType, OtpRequestState } from '../../src/types';
import api from '../../src/services/api';
import { buildIdentifierPayload, getDeviceId, getOtpChannel, getReadableError } from '../../src/utils/auth';
import { useI18n } from '../../src/i18n';

const RESEND_SECONDS = 60;

export default function SignUp() {
  const { login } = useAuth();
  const { t, lang, setLanguage } = useI18n();
  const [step, setStep] = useState(1);
  const [marriageCategory, setMarriageCategory] = useState<'PERMANENT' | 'TEMPORARY'>('PERMANENT');
  const [marriageType, setMarriageType] = useState<MarriageType>('PERMANENT');
  const [identifier, setIdentifier] = useState('');
  const [ageConfirmed, setAgeConfirmed] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [otpState, setOtpState] = useState<OtpRequestState | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!secondsLeft) {
      return undefined;
    }

    const timer = setInterval(() => {
      setSecondsLeft((current) => (current > 0 ? current - 1 : 0));
    }, 1000);

    return () => clearInterval(timer);
  }, [secondsLeft]);

  const canContinueAccountStep = useMemo(() => identifier.trim().length > 0 && ageConfirmed, [identifier, ageConfirmed]);
  const canVerify = useMemo(() => otpCode.trim().length === 6, [otpCode]);

  const handleContinueToAccount = () => {
    if (!marriageType) {
      Alert.alert(t.common.warning, t.auth.chooseMarriageType);
      return;
    }
    setStep(2);
  };

  const handleSignup = async () => {
    const trimmedIdentifier = identifier.trim();
    if (!canContinueAccountStep) {
      Alert.alert(t.common.error, t.auth.enterContactAndAge);
      return;
    }

    setLoading(true);
    try {
      const deviceId = await getDeviceId();
      const response = await api.post('/auth/signup', {
        ...buildIdentifierPayload(trimmedIdentifier),
        marriageType,
        ageConfirmed,
        deviceId,
      });

      setOtpState({
        identifier: trimmedIdentifier,
        channel: getOtpChannel(trimmedIdentifier),
        purpose: 'SIGNUP',
        userId: response.data.userId,
      });
      setStep(3);
      setSecondsLeft(RESEND_SECONDS);
      Alert.alert(t.auth.accountCreated, t.auth.accountCreatedMsg);
    } catch (error) {
      Alert.alert(t.auth.accountCreateFailed, getReadableError(error, t.auth.signupFailed));
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!otpState) {
      return;
    }

    setLoading(true);
    try {
      const response = await api.post('/auth/verify-otp', {
        identifier: otpState.identifier,
        channel: otpState.channel,
        purpose: otpState.purpose,
        code: otpCode.trim(),
      });

      await login(
        response.data.accessToken,
        {
          id: otpState.userId,
          marriageType,
          profileCompleted: response.data.profileCompleted ?? false,
          [otpState.channel === 'EMAIL' ? 'email' : 'phone']: otpState.identifier,
        },
        response.data.refreshToken,
      );
    } catch (error) {
      Alert.alert(t.auth.wrongOtp, getReadableError(error, t.auth.otpVerifyFailed));
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (!otpState || secondsLeft > 0) {
      return;
    }

    setLoading(true);
    try {
      await api.post('/auth/resend-otp', {
        identifier: otpState.identifier,
        channel: otpState.channel,
        purpose: otpState.purpose,
      });
      setSecondsLeft(RESEND_SECONDS);
      Alert.alert(t.auth.otpResentTitle, t.auth.otpResentMsg);
    } catch (error) {
      Alert.alert(t.auth.sendFailed, getReadableError(error, t.auth.otpResendFailed2));
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.hero}>
          <Text style={styles.kicker}>{t.auth.signupTitle}</Text>
          <Text style={styles.title}>{t.auth.signupSubtitle}</Text>
          <Text style={styles.subtitle}>{t.auth.signupStepsHint}</Text>
        </View>

        <View style={styles.stepsRow}>
          {[1, 2, 3].map((item) => (
            <View key={item} style={[styles.stepChip, step >= item && styles.stepChipActive]}>
              <Text style={[styles.stepChipText, step >= item && styles.stepChipTextActive]}>{item}</Text>
            </View>
          ))}
        </View>

        {step === 1 && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>{t.auth.step1Choose}</Text>
            <View style={styles.optionsGrid}>
              <Pressable
                style={[styles.optionCard, marriageCategory === 'PERMANENT' && styles.optionCardActive]}
                onPress={() => { setMarriageCategory('PERMANENT'); setMarriageType('PERMANENT'); }}
              >
                <Text style={[styles.optionTitle, marriageCategory === 'PERMANENT' && styles.optionTitleActive]}>{t.auth.permanentMarriage}</Text>
                <Text style={[styles.optionText, marriageCategory === 'PERMANENT' && styles.optionTextActive]}>
                  {t.auth.permanentDesc}
                </Text>
              </Pressable>

              <Pressable
                style={[styles.optionCard, marriageCategory === 'TEMPORARY' && styles.optionCardActive]}
                onPress={() => { setMarriageCategory('TEMPORARY'); setMarriageType('MISYAR'); }}
              >
                <Text style={[styles.optionTitle, marriageCategory === 'TEMPORARY' && styles.optionTitleActive]}>{t.auth.temporaryMarriage}</Text>
                <Text style={[styles.optionText, marriageCategory === 'TEMPORARY' && styles.optionTextActive]}>
                  {t.auth.chooseTempType}
                </Text>
              </Pressable>
            </View>

            {marriageCategory === 'TEMPORARY' && (
              <View style={styles.subOptionsGrid}>
                {([
                  { key: 'MISYAR' as MarriageType, label: t.auth.misyar, desc: t.auth.misyarDesc },
                  { key: 'MUTAA' as MarriageType, label: t.auth.mutaa, desc: t.auth.mutaaDesc },
                  { key: 'URFI' as MarriageType, label: t.auth.urfi, desc: t.auth.urfiDesc },
                  { key: 'TRAVEL_MARRIAGE' as MarriageType, label: t.auth.travelMarriage, desc: t.auth.travelMarriageDesc },
                ]).map((item) => (
                  <Pressable
                    key={item.key}
                    style={[styles.subOptionCard, marriageType === item.key && styles.subOptionCardActive]}
                    onPress={() => setMarriageType(item.key)}
                  >
                    <Text style={[styles.subOptionTitle, marriageType === item.key && styles.subOptionTitleActive]}>{item.label}</Text>
                    <Text style={[styles.subOptionText, marriageType === item.key && styles.subOptionTextActive]}>{item.desc}</Text>
                  </Pressable>
                ))}
              </View>
            )}

            <TouchableOpacity style={styles.primaryButton} onPress={handleContinueToAccount}>
              <Text style={styles.primaryButtonText}>{t.common.next}</Text>
            </TouchableOpacity>
          </View>
        )}

        {step === 2 && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>{t.auth.step2Account}</Text>
            <TextInput
              style={styles.input}
              placeholder={t.auth.emailOrPhone}
              value={identifier}
              onChangeText={setIdentifier}
              autoCapitalize="none"
              keyboardType="email-address"
              textAlign={lang === 'ar' ? 'right' : 'left'}
            />

            <View style={styles.confirmRow}>
              <View style={styles.confirmTextWrap}>
                <Text style={styles.confirmTitle}>{t.auth.ageConfirmation}</Text>
                <Text style={styles.confirmHint}>{t.auth.ageConfirmationHint}</Text>
              </View>
              <Switch value={ageConfirmed} onValueChange={setAgeConfirmed} trackColor={{ false: '#d7d3d4', true: '#e49aae' }} thumbColor={ageConfirmed ? '#c4385e' : '#ffffff'} />
            </View>

            <TouchableOpacity
              style={[styles.primaryButton, !canContinueAccountStep && styles.disabledButton]}
              onPress={handleSignup}
              disabled={loading || !canContinueAccountStep}
            >
              <Text style={styles.primaryButtonText}>{loading ? t.auth.creating : t.auth.createAndSendOtp}</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.secondaryTextButton} onPress={() => setStep(1)}>
              <Text style={styles.secondaryTextButtonText}>{t.auth.goBack}</Text>
            </TouchableOpacity>
          </View>
        )}

        {step === 3 && otpState && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>{t.auth.step3Verify}</Text>
            <View style={styles.infoBox}>
              <Text style={styles.infoText}>{t.auth.codeSentTo} {otpState.identifier}</Text>
            </View>

            <TextInput
              style={styles.otpInput}
              placeholder="000000"
              value={otpCode}
              onChangeText={setOtpCode}
              keyboardType="number-pad"
              maxLength={6}
              textAlign="center"
            />

            <TouchableOpacity
              style={[styles.primaryButton, !canVerify && styles.disabledButton]}
              onPress={handleVerifyOtp}
              disabled={loading || !canVerify}
            >
              <Text style={styles.primaryButtonText}>{loading ? t.auth.verifying : t.auth.activateAndLogin}</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.secondaryButton} onPress={handleResendOtp} disabled={loading || secondsLeft > 0}>
              <Text style={styles.secondaryButtonText}>
                {secondsLeft > 0 ? `${t.auth.resendIn} ${secondsLeft}s` : t.auth.resendOtp}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.secondaryTextButton} onPress={() => setStep(2)}>
              <Text style={styles.secondaryTextButtonText}>{t.auth.editAccountInfo}</Text>
            </TouchableOpacity>
          </View>
        )}

        <Link href="/(auth)/login" asChild>
          <TouchableOpacity style={styles.footerLink}>
            <Text style={styles.footerLinkText}>{t.auth.alreadyHaveLogin}</Text>
          </TouchableOpacity>
        </Link>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f6efe6',
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  hero: {
    backgroundColor: '#17313e',
    borderRadius: 28,
    padding: 24,
    marginBottom: 18,
  },
  kicker: {
    color: '#efc88b',
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'right',
    marginBottom: 8,
  },
  title: {
    color: '#ffffff',
    fontSize: 28,
    fontWeight: '800',
    textAlign: 'right',
    marginBottom: 8,
  },
  subtitle: {
    color: '#d3e0e5',
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'right',
  },
  stepsRow: {
    flexDirection: 'row-reverse',
    gap: 10,
    marginBottom: 18,
    justifyContent: 'center',
  },
  stepChip: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#eadfd3',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepChipActive: {
    backgroundColor: '#c84767',
  },
  stepChipText: {
    color: '#8a6e62',
    fontWeight: '700',
  },
  stepChipTextActive: {
    color: '#ffffff',
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 22,
    marginBottom: 14,
    shadowColor: '#40241b',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 5,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '800',
    textAlign: 'right',
    color: '#23161a',
    marginBottom: 18,
  },
  optionsGrid: {
    gap: 14,
    marginBottom: 18,
  },
  optionCard: {
    borderWidth: 1,
    borderColor: '#eadad2',
    borderRadius: 20,
    padding: 18,
    backgroundColor: '#fffdfa',
  },
  optionCardActive: {
    backgroundColor: '#c84767',
    borderColor: '#c84767',
  },
  optionTitle: {
    fontSize: 18,
    fontWeight: '800',
    textAlign: 'right',
    color: '#2b1e18',
    marginBottom: 8,
  },
  optionTitleActive: {
    color: '#ffffff',
  },
  optionText: {
    fontSize: 14,
    lineHeight: 22,
    textAlign: 'right',
    color: '#6d5a53',
  },
  optionTextActive: {
    color: '#fff0f3',
  },
  input: {
    borderWidth: 1,
    borderColor: '#e7d8dc',
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 18,
    fontSize: 16,
    color: '#23161a',
    marginBottom: 16,
    backgroundColor: '#fffdfd',
  },
  confirmRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
    backgroundColor: '#f7f2ec',
    borderRadius: 18,
    padding: 14,
    marginBottom: 18,
  },
  confirmTextWrap: {
    flex: 1,
  },
  confirmTitle: {
    textAlign: 'right',
    fontSize: 15,
    fontWeight: '700',
    color: '#2c1d1f',
    marginBottom: 4,
  },
  confirmHint: {
    textAlign: 'right',
    fontSize: 13,
    color: '#7f6a69',
  },
  infoBox: {
    backgroundColor: '#fff1e4',
    borderRadius: 16,
    padding: 14,
    marginBottom: 16,
  },
  infoText: {
    textAlign: 'right',
    color: '#7b4d19',
    fontSize: 14,
    fontWeight: '600',
  },
  otpInput: {
    borderWidth: 1,
    borderColor: '#e7d8dc',
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 18,
    fontSize: 24,
    letterSpacing: 8,
    color: '#23161a',
    marginBottom: 16,
    backgroundColor: '#fffdfd',
  },
  primaryButton: {
    backgroundColor: '#d84b6b',
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  disabledButton: {
    opacity: 0.55,
  },
  secondaryButton: {
    marginTop: 12,
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
    backgroundColor: '#f6eaed',
  },
  secondaryButtonText: {
    color: '#8f3e54',
    fontSize: 15,
    fontWeight: '600',
  },
  secondaryTextButton: {
    marginTop: 12,
    alignItems: 'center',
  },
  secondaryTextButtonText: {
    color: '#6b5960',
    fontSize: 14,
  },
  footerLink: {
    alignItems: 'center',
    marginTop: 8,
  },
  footerLinkText: {
    color: '#0f556a',
    fontWeight: '700',
    fontSize: 14,
  },
  subOptionsGrid: {
    gap: 10,
    marginBottom: 18,
    marginTop: 4,
  },
  subOptionCard: {
    borderWidth: 1,
    borderColor: '#e0d5cc',
    borderRadius: 14,
    padding: 14,
    backgroundColor: '#faf6f2',
  },
  subOptionCardActive: {
    backgroundColor: '#2a5a6e',
    borderColor: '#2a5a6e',
  },
  subOptionTitle: {
    fontSize: 15,
    fontWeight: '700',
    textAlign: 'right',
    color: '#2b1e18',
    marginBottom: 4,
  },
  subOptionTitleActive: {
    color: '#ffffff',
  },
  subOptionText: {
    fontSize: 13,
    textAlign: 'right',
    color: '#6d5a53',
  },
  subOptionTextActive: {
    color: '#d4e8ef',
  },
});
