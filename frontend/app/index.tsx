import React, { useEffect, useState, useRef } from 'react';
import { View, StyleSheet, Image, Animated, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../contexts/AuthContext';
import { LinearGradient } from 'expo-linear-gradient';

const { width, height } = Dimensions.get('window');

export default function Index() {
  const { isLoading, isAuthenticated } = useAuth();
  const router = useRouter();
  const [showSplash, setShowSplash] = useState(true);
  
  // Animations
  const logoScale = useRef(new Animated.Value(0.3)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const bgOpacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Animation sequence like TikTok/Uber
    Animated.sequence([
      // 1. Fade in + scale up logo
      Animated.parallel([
        Animated.timing(logoOpacity, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.spring(logoScale, {
          toValue: 1,
          tension: 50,
          friction: 7,
          useNativeDriver: true,
        }),
      ]),
      // 2. Hold for a moment
      Animated.delay(1500),
      // 3. Scale up bigger + fade out
      Animated.parallel([
        Animated.timing(logoScale, {
          toValue: 1.5,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.timing(logoOpacity, {
          toValue: 0,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.timing(bgOpacity, {
          toValue: 0,
          duration: 400,
          useNativeDriver: true,
        }),
      ]),
    ]).start(() => {
      setShowSplash(false);
    });
  }, []);

  useEffect(() => {
    if (!showSplash && !isLoading) {
      if (isAuthenticated) {
        router.replace('/(tabs)/home');
      } else {
        router.replace('/(auth)/login');
      }
    }
  }, [showSplash, isLoading, isAuthenticated]);

  if (showSplash) {
    return (
      <Animated.View style={[styles.splashContainer, { opacity: bgOpacity }]}>
        <LinearGradient
          colors={['#1a0a1a', '#0A0A0A', '#0a0a1a']}
          style={styles.gradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <Animated.View
            style={[
              styles.logoContainer,
              {
                opacity: logoOpacity,
                transform: [{ scale: logoScale }],
              },
            ]}
          >
            <Image
              source={require('../assets/images/logo-newschool.png')}
              style={styles.logo}
              resizeMode="contain"
            />
          </Animated.View>
        </LinearGradient>
      </Animated.View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#1a0a1a', '#0A0A0A']}
        style={styles.gradient}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  splashContainer: {
    flex: 1,
  },
  gradient: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    width: 150,
    height: 150,
  },
  container: {
    flex: 1,
    backgroundColor: '#0A0A0A',
  },
});
