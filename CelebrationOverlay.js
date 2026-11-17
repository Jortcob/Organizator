import React, { useEffect, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Animated,
    Dimensions,
    TouchableOpacity,
} from 'react-native';

const PARTICLE_COLORS = ['#34D399', '#FBBF24', '#38BDF8', '#FB7185', '#A78BFA', '#FDE68A'];
const PARTICLE_COUNT = 30;

export default function CelebrationOverlay({ visible, goalTitle, message, onDismiss }) {
    const { width, height } = Dimensions.get('window');
    const cardScale = useRef(new Animated.Value(0.85)).current;
    const cardOpacity = useRef(new Animated.Value(0)).current;

    const particles = useRef(
        Array.from({ length: PARTICLE_COUNT }).map((_, i) => ({
            x: new Animated.Value(Math.random() * width),
            y: new Animated.Value(-30 - Math.random() * 180),
            rotate: new Animated.Value(0),
            opacity: new Animated.Value(1),
            size: 6 + (i % 4) * 2.5,
            isRound: i % 3 === 0,
            color: PARTICLE_COLORS[i % PARTICLE_COLORS.length],
            targetX: Math.random() * width,
            duration: 2100 + Math.random() * 1400,
        }))
    ).current;

    useEffect(() => {
        if (!visible) return;

        cardScale.setValue(0.85);
        cardOpacity.setValue(0);

        Animated.parallel([
            Animated.spring(cardScale, {
                toValue: 1,
                friction: 6,
                tension: 80,
                useNativeDriver: true,
            }),
            Animated.timing(cardOpacity, {
                toValue: 1,
                duration: 260,
                useNativeDriver: true,
            }),
        ]).start();

        particles.forEach((p) => {
            const startX = Math.random() * width;
            p.x.setValue(startX);
            p.y.setValue(-20 - Math.random() * 160);
            p.rotate.setValue(0);
            p.opacity.setValue(1);

            Animated.parallel([
                Animated.timing(p.y, {
                    toValue: height * 0.75 + Math.random() * 120,
                    duration: p.duration,
                    useNativeDriver: true,
                }),
                Animated.timing(p.x, {
                    toValue: startX + (Math.random() - 0.5) * 140,
                    duration: p.duration,
                    useNativeDriver: true,
                }),
                Animated.timing(p.rotate, {
                    toValue: 4 + Math.random() * 6,
                    duration: p.duration,
                    useNativeDriver: true,
                }),
                Animated.timing(p.opacity, {
                    toValue: 0,
                    duration: p.duration,
                    useNativeDriver: true,
                }),
            ]).start();
        });

        const timer = setTimeout(() => {
            if (onDismiss) onDismiss();
        }, 4200);

        return () => clearTimeout(timer);
    }, [visible, goalTitle]);

    if (!visible) return null;

    return (
        <View style={styles.overlay} pointerEvents="box-none">
            {/* Confeti y purpurina cayendo */}
            <View style={StyleSheet.absoluteFill} pointerEvents="none">
                {particles.map((p, idx) => {
                    const spin = p.rotate.interpolate({
                        inputRange: [0, 10],
                        outputRange: ['0deg', '720deg'],
                    });
                    return (
                        <Animated.View
                            key={idx}
                            style={[
                                styles.particle,
                                {
                                    width: p.size,
                                    height: p.isRound ? p.size : p.size * 0.55,
                                    borderRadius: p.isRound ? p.size / 2 : 2,
                                    backgroundColor: p.color,
                                    opacity: p.opacity,
                                    transform: [
                                        { translateX: p.x },
                                        { translateY: p.y },
                                        { rotate: spin },
                                    ],
                                },
                            ]}
                        />
                    );
                })}
            </View>

            {/* Tarjeta vistosa de objetivo cumplido */}
            <Animated.View
                style={[
                    styles.card,
                    {
                        opacity: cardOpacity,
                        transform: [{ scale: cardScale }],
                    },
                ]}
            >
                <View style={styles.badge}>
                    <Text style={styles.badgeText}>✨ OBJETIVO CUMPLIDO ✨</Text>
                </View>
                <Text style={styles.title}>{goalTitle || '¡Buen trabajo!'}</Text>
                <Text style={styles.message}>
                    {message || 'Has alcanzado tu meta. Sigue manteniendo este gran ritmo.'}
                </Text>
                <TouchableOpacity style={styles.closeBtn} onPress={onDismiss} activeOpacity={0.8}>
                    <Text style={styles.closeBtnText}>¡Genial!</Text>
                </TouchableOpacity>
            </Animated.View>
        </View>
    );
}

const styles = StyleSheet.create({
    overlay: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 24,
        zIndex: 999,
        backgroundColor: 'rgba(0, 0, 0, 0.45)',
    },
    particle: {
        position: 'absolute',
        top: 0,
        left: 0,
    },
    card: {
        width: '100%',
        maxWidth: 360,
        backgroundColor: '#141419',
        borderRadius: 24,
        padding: 24,
        alignItems: 'center',
        borderWidth: 1.5,
        borderColor: '#34D399',
        shadowColor: '#34D399',
        shadowOpacity: 0.25,
        shadowRadius: 20,
        elevation: 10,
    },
    badge: {
        backgroundColor: 'rgba(52, 211, 153, 0.16)',
        paddingHorizontal: 14,
        paddingVertical: 6,
        borderRadius: 20,
        marginBottom: 14,
    },
    badgeText: {
        color: '#34D399',
        fontSize: 12,
        fontWeight: '800',
        letterSpacing: 0.5,
    },
    title: {
        color: '#FAFAFA',
        fontSize: 22,
        fontWeight: '800',
        textAlign: 'center',
        marginBottom: 8,
    },
    message: {
        color: '#D4D4D8',
        fontSize: 14,
        lineHeight: 20,
        textAlign: 'center',
        marginBottom: 20,
    },
    closeBtn: {
        backgroundColor: '#34D399',
        paddingHorizontal: 28,
        paddingVertical: 12,
        borderRadius: 14,
    },
    closeBtnText: {
        color: '#000000',
        fontSize: 14,
        fontWeight: '800',
    },
});

