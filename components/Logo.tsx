import { Image, View, StyleSheet } from 'react-native';

const ICON_SOURCE = require('@/assets/icon.png');

interface LogoProps {
  size?: 'small' | 'medium' | 'large';
  style?: any;
}

export default function Logo({ size = 'medium', style }: LogoProps) {
  const sizes = {
    small: 48,
    medium: 60,
    large: 100,
  };

  const dimension = sizes[size];

  return (
    <View style={[styles.logoContainer, style]}>
      <Image
        source={ICON_SOURCE}
        defaultSource={ICON_SOURCE}
        fadeDuration={0}
        style={{
          width: dimension,
          height: dimension,
        }}
        resizeMode="contain"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  logoContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
});
