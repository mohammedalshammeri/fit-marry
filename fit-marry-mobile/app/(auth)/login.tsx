import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Link } from 'expo-router';
import { useAuth } from '../../src/context/AuthContext';
import api from '../../src/services/api';
import type { OtpRequestState } from '../../src/types';
import { buildIdentifierPayload, getOtpChannel, getReadableError } from '../../src/utils/auth';
import { useI18n } from '../../src/i18n';

const RESEND_SECONDS = 60;

export default function Login() {
  const { login } = useAuth();
  const { t, lang, setLanguage } = useI18n();
  const [identifier, setIdentifier] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [otpState, setOtpState] = useState<OtpRequestState | null>(null);
  const [loading, setLoading] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(0);

  useEffect(() => {
    if (!secondsLeft) {
      return undefined;
    }

    const timer = setInterval(() => {
      setSecondsLeft((current) => (current > 0 ? current - 1 : 0));
    }, 1000);

    return () => clearInterval(timer);
  }, [secondsLeft]);

  const canSubmitOtp = useMemo(() => otpCode.trim().length === 6, [otpCode]);

  const handleRequestOtp = async () => {
    const trimmedIdentifier = identifier.trim();
    if (!trimmedIdentifier) {
      Alert.alert(t.common.error, t.auth.enterEmailFirst);
      return;
    }

    setLoading(true);
    try {
      const response = await api.post('/auth/login', buildIdentifierPayload(trimmedIdentifier));
      setOtpState({
        identifier: trimmedIdentifier,
        channel: getOtpChannel(trimmedIdentifier),
        purpose: 'LOGIN',
        userId: response.data.userId,
      });
      setSecondsLeft(RESEND_SECONDS);
      Alert.alert(t.common.done, t.auth.otpSentSuccess);
    } catch (error) {
      Alert.alert(t.auth.loginFailed, getReadableError(error, t.auth.otpVerifyFailed));
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
      Alert.alert(t.auth.otpResentTitle, t.auth.otpResent);
    } catch (error) {
      Alert.alert(t.auth.sendFailed, getReadableError(error, t.auth.otpResendFailed));
    } finally {
      setLoading(false);
    }
  };

  const resetFlow = () => {
    setOtpCode('');
    setOtpState(null);
    setSecondsLeft(0);
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.container}
    >
      <View style={styles.card}>
        {/* Language Switcher */}
        <View style={styles.langRow}>
          <TouchableOpacity
            style={[styles.langBtn, lang === 'ar' && styles.langBtnActive]}
            onPress={() => setLanguage('ar')}
          >
            <Text style={[styles.langBtnText, lang === 'ar' && styles.langBtnTextActive]}>العربية</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.langBtn, lang === 'en' && styles.langBtnActive]}
            onPress={() => setLanguage('en')}
          >
            <Text style={[styles.langBtnText, lang === 'en' && styles.langBtnTextActive]}>English</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.title}>{t.auth.login}</Text>
        <Text style={styles.subtitle}>{t.auth.loginSubtitle}</Text>

        {!otpState ? (
          <>
            <TextInput
              style={styles.input}
              placeholder={t.auth.emailOrPhone}
              value={identifier}
              onChangeText={setIdentifier}
              autoCapitalize="none"
              keyboardType="email-address"
              textAlign={lang === 'ar' ? 'right' : 'left'}
            />

            <TouchableOpacity style={styles.primaryButton} onPress={handleRequestOtp} disabled={loading}>
              <Text style={styles.primaryButtonText}>{loading ? t.auth.sending : t.auth.sendOtp}</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <View style={styles.infoBox}>
              <Text style={styles.infoText}>{t.auth.codeSentTo} {otpState.identifier}</Text>
            </View>

            <TextInput
              style={styles.input}
              placeholder={t.auth.enterOtp6Digits}
              value={otpCode}
              onChangeText={setOtpCode}
              keyboardType="number-pad"
              maxLength={6}
              textAlign="center"
            />

            <TouchableOpacity
              style={[styles.primaryButton, !canSubmitOtp && styles.disabledButton]}
              onPress={handleVerifyOtp}
              disabled={loading || !canSubmitOtp}
            >
              <Text style={styles.primaryButtonText}>{loading ? t.auth.verifying : t.auth.verifyAndLogin}</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.secondaryButton} onPress={handleResendOtp} disabled={loading || secondsLeft > 0}>
              <Text style={styles.secondaryButtonText}>
                {secondsLeft > 0 ? `${t.auth.resendIn} ${secondsLeft}s` : t.auth.resendOtp}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.textButton} onPress={resetFlow}>
              <Text style={styles.textButtonText}>{t.auth.changeEmailOrPhone}</Text>
            </TouchableOpacity>
          </>
        )}

        <Link href="/(auth)/signup" asChild>
          <TouchableOpacity style={styles.footerLink}>
            <Text style={styles.footerLinkText}>{t.auth.noAccountCreate}</Text>
          </TouchableOpacity>
        </Link>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
    backgroundColor: '#fff6f7',
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 24,
    shadowColor: '#7a2034',
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.08,
    shadowRadius: 24,
    elevation: 6,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    textAlign: 'right',
    color: '#23161a',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'right',
    color: '#6f5a61',
    marginBottom: 24,
  },
  input: {
    borderWidth: 1,
    borderColor: '#e7d8dc',
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 18,
    fontSize: 16,
    color: '#23161a',
    marginBottom: 14,
    backgroundColor: '#fffdfd',
  },
  infoBox: {
    backgroundColor: '#fff1e4',
    borderRadius: 16,
    padding: 14,
    marginBottom: 14,
  },
  infoText: {
    textAlign: 'right',
    color: '#7b4d19',
    fontSize: 14,
    fontWeight: '600',
  },
  primaryButton: {
    backgroundColor: '#d84b6b',
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
  },
  disabledButton: {
    opacity: 0.55,
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
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
  textButton: {
    marginTop: 12,
    alignItems: 'center',
  },
  textButtonText: {
    color: '#7b5d66',
    fontSize: 14,
  },
  footerLink: {
    marginTop: 18,
    alignItems: 'center',
  },
  footerLinkText: {
    color: '#b23f5a',
    fontSize: 14,
    fontWeight: '600',
  },
  langRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 18,
    backgroundColor: '#f3f4f6',
    borderRadius: 10,
    padding: 2,
    alignSelf: 'center',
  },
  langBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 },
  langBtnActive: { backgroundColor: '#d84b6b' },
  langBtnText: { fontSize: 14, color: '#6b7280', fontWeight: '600' },
  langBtnTextActive: { color: '#fff' },
});
