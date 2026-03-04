import React, { useEffect, useState, useRef } from 'react';
import { View, StyleSheet, Image, Animated, Easing, StatusBar } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../contexts/AuthContext';
import { LinearGradient } from 'expo-linear-gradient';

export default function Index() {
  const { isLoading, isAuthenticated } = useAuth();
  const router = useRouter();
  const [showSplash, setShowSplash] = useState(true);
  
  // Animations - TikTok/Uber Eats style
  const logoScale = useRef(new Animated.Value(0.6)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const circleScale = useRef(new Animated.Value(0)).current;
  const pulseScale = useRef(new Animated.Value(1)).current;
  const screenOpacity = useRef(new Animated.Value(1)).current;
  const glowOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Smooth animation sequence inspired by TikTok/Uber Eats
    const animationSequence = Animated.sequence([
      // Phase 1: Circle appears first with spring effect
      Animated.spring(circleScale, {
        toValue: 1,
        tension: 60,
        friction: 7,
        useNativeDriver: true,
      }),
      // Phase 2: Logo fades in inside the circle
      Animated.parallel([
        Animated.timing(logoOpacity, {
          toValue: 1,
          duration: 400,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(glowOpacity, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
      ]),
      // Phase 3: Subtle "breathing" pulse effect (like TikTok)
      Animated.sequence([
        Animated.timing(pulseScale, {
          toValue: 1.05,
          duration: 350,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseScale, {
          toValue: 1,
          duration: 350,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
      // Phase 4: Hold briefly
      Animated.delay(500),
      // Phase 5: Elegant exit - scale up and fade out (Uber Eats style)
      Animated.parallel([
        Animated.timing(logoScale, {
          toValue: 1.2,
          duration: 350,
          easing: Easing.in(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(circleScale, {
          toValue: 1.2,
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

  // Combined scale transforms
  const combinedLogoScale = Animated.multiply(logoScale, pulseScale);
  const combinedCircleScale = Animated.multiply(circleScale, pulseScale);

  if (showSplash) {
    return (
      <Animated.View style={[styles.splashContainer, { opacity: screenOpacity }]}>
        <StatusBar barStyle="light-content" backgroundColor="#0A0A0A" />
        <View style={styles.contentContainer}>
          {/* Glow effect behind the circle */}
          <Animated.View 
            style={[
              styles.glowEffect,
              {
                opacity: glowOpacity,
                transform: [{ scale: combinedCircleScale }],
              }
            ]}
          />
          
          {/* Main circle container with gradient */}
          <Animated.View
            style={[
              styles.circleContainer,
              {
                transform: [{ scale: combinedCircleScale }],
              },
            ]}
          >
            <LinearGradient
              colors={['#D63864', '#B8295A', '#8B1E4A']}
              style={styles.gradientCircle}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              {/* Logo inside the circle */}
              <Animated.View
                style={[
                  styles.logoWrapper,
                  {
                    opacity: logoOpacity,
                    transform: [{ scale: combinedLogoScale }],
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
        </View>
      </Animated.View>
    );
  }

  // Transition container
  return (
    <View style={styles.loadingContainer}>
      <StatusBar barStyle="light-content" backgroundColor="#0A0A0A" />
    </View>
  );
}

const styles = StyleSheet.create({
  splashContainer: {
    flex: 1,
    backgroundColor: '#0A0A0A',
  },
  contentContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0A0A0A',
  },
  glowEffect: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: '#D63864',
    opacity: 0.3,
    shadowColor: '#D63864',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 40,
    elevation: 20,
  },
  circleContainer: {
    width: 180,
    height: 180,
    borderRadius: 90,
    overflow: 'hidden',
    // Shadow for depth
    shadowColor: '#D63864',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 25,
    elevation: 15,
  },
  gradientCircle: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 90,
  },
  logoWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    width: 110,
    height: 110,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#0A0A0A',
  },
});
