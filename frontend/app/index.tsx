import React, { useEffect, useState, useRef } from 'react';
import { View, StyleSheet, Image, Animated, Easing, StatusBar } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../contexts/AuthContext';

export default function Index() {
  const { isLoading, isAuthenticated } = useAuth();
  const router = useRouter();
  const [showSplash, setShowSplash] = useState(true);
  
  // Animations - TikTok/Uber Eats style
  const logoScale = useRef(new Animated.Value(0.5)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const pulseScale = useRef(new Animated.Value(1)).current;
  const screenOpacity = useRef(new Animated.Value(1)).current;
  const glowOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Smooth animation sequence inspired by TikTok/Uber Eats
    const animationSequence = Animated.sequence([
      // Phase 1: Logo appears with spring effect + glow
      Animated.parallel([
        Animated.spring(logoScale, {
          toValue: 1,
          tension: 60,
          friction: 7,
          useNativeDriver: true,
        }),
        Animated.timing(logoOpacity, {
          toValue: 1,
          duration: 500,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(glowOpacity, {
          toValue: 0.6,
          duration: 700,
          useNativeDriver: true,
        }),
      ]),
      // Phase 2: Subtle "breathing" pulse effect (like TikTok)
      Animated.sequence([
        Animated.timing(pulseScale, {
          toValue: 1.06,
          duration: 400,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseScale, {
          toValue: 1,
          duration: 400,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
      // Phase 3: Hold briefly
      Animated.delay(600),
      // Phase 4: Elegant exit - scale up and fade out (Uber Eats style)
      Animated.parallel([
        Animated.timing(logoScale, {
          toValue: 1.3,
          duration: 350,
          easing: Easing.in(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(logoOpacity, {
          toValue: 0,
          duration: 300,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(glowOpacity, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(screenOpacity, {
          toValue: 0,
          duration: 350,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    ]);

    animationSequence.start(() => {
      setShowSplash(false);
    });

    return () => animationSequence.stop();
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

  // Combined scale transform
  const combinedScale = Animated.multiply(logoScale, pulseScale);

  if (showSplash) {
    return (
      <Animated.View style={[styles.splashContainer, { opacity: screenOpacity }]}>
        <StatusBar barStyle="light-content" backgroundColor="#0C0A12" />
        <View style={styles.contentContainer}>
          {/* Glow effect behind the logo */}
          <Animated.View 
            style={[
              styles.glowEffect,
              {
                opacity: glowOpacity,
                transform: [{ scale: combinedScale }],
              }
            ]}
          />
          
          {/* Circular logo */}
          <Animated.View
            style={[
              styles.logoContainer,
              {
                opacity: logoOpacity,
                transform: [{ scale: combinedScale }],
              },
            ]}
          >
            <Image
              source={require('../assets/images/logo-newschool-circle.png')}
              style={styles.logo}
              resizeMode="contain"
            />
          </Animated.View>
        </View>
      </Animated.View>
    );
  }

  // Transition container
  return (
    <View style={styles.loadingContainer}>
      <StatusBar barStyle="light-content" backgroundColor="#0C0A12" />
    </View>
  );
}

const styles = StyleSheet.create({
  splashContainer: {
    flex: 1,
    backgroundColor: '#0C0A12',
  },
  contentContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0C0A12',
  },
  glowEffect: {
    position: 'absolute',
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: '#D63864',
    shadowColor: '#D63864',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 50,
    elevation: 20,
  },
  logoContainer: {
    width: 220,
    height: 220,
    borderRadius: 110,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    // Shadow for depth
    shadowColor: '#D63864',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 30,
    elevation: 15,
  },
  logo: {
    width: 220,
    height: 220,
    borderRadius: 110,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#0C0A12',
  },
});
