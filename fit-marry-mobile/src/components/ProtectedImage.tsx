import React, { useState, useEffect } from 'react';
import { View, Image, TouchableOpacity, Text, StyleSheet, ImageProps } from 'react-native';
import { useI18n } from '../i18n';

interface ProtectedImageProps extends Omit<ImageProps, 'source'> {
  uri?: string;
}

export const ProtectedImage = ({ uri, style, ...rest }: ProtectedImageProps) => {
  const { t } = useI18n();
  const [isBlurred, setIsBlurred] = useState(true);
  const [timeLeft, setTimeLeft] = useState(0);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (timeLeft > 0 && !isBlurred) {
      timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
    } else if (timeLeft === 0 && !isBlurred) {
      setIsBlurred(true);
    }
    return () => clearTimeout(timer);
  }, [timeLeft, isBlurred]);

  const handlePress = () => {
    if (isBlurred) {
      setIsBlurred(false);
      setTimeLeft(5);
    }
  };

  const currentUri = uri || 'https://via.placeholder.com/300';

  return (
    <TouchableOpacity activeOpacity={0.9} onPress={handlePress} style={[style, styles.container]}>
      <Image
        source={{ uri: currentUri }}
        style={StyleSheet.absoluteFill}
        blurRadius={isBlurred ? 30 : 0}
        {...rest}
      />
      {isBlurred && (
        <View style={styles.overlay}>
          <Text style={styles.text}>{t.chat.tapToViewImage} 👁️</Text>
          <Text style={styles.subtext}>{t.chat.imageTimer}</Text>
        </View>
      )}
      {!isBlurred && timeLeft > 0 && (
        <View style={styles.timerBadge}>
          <Text style={styles.timerText}>{timeLeft}s</Text>
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#eee',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  text: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
    textAlign: 'center',
  },
  subtext: {
    color: '#fff',
    fontSize: 12,
    marginTop: 4,
    opacity: 0.8,
  },
  timerBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
    zIndex: 2,
  },
  timerText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  }
});
