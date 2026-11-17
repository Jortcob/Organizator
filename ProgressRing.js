import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

/**
 * Anillo de progreso circular puro React Native (compatible con iOS, Android y Web sin dependencias nativas extra).
 */
export default function ProgressRing({
    size = 68,
    strokeWidth = 6,
    progress = 0,
    color = '#34D399',
    trackColor = '#232329',
    completed = false,
}) {
    const pct = Math.max(0, Math.min(100, Number(progress) || 0));
    const displayPct = Math.round(Number(progress) || 0);
    const activeColor = completed ? '#34D399' : color;

    const halfSize = size / 2;
    const rightRotate = pct <= 50 ? -135 + (pct / 50) * 180 : 45;
    const leftRotate = pct <= 50 ? 45 : 45 + ((pct - 50) / 50) * 180;

    return (
        <View style={[styles.container, { width: size, height: size }]}>
            {/* Pista base del anillo */}
            <View
                style={[
                    styles.track,
                    {
                        width: size,
                        height: size,
                        borderRadius: halfSize,
                        borderWidth: strokeWidth,
                        borderColor: trackColor,
                    },
                ]}
            />

            {/* Mitad derecha (0% - 50%) */}
            <View style={[styles.clipHalf, { width: halfSize, height: size, left: halfSize }]}>
                <View
                    style={[
                        styles.arcCircle,
                        {
                            width: size,
                            height: size,
                            borderRadius: halfSize,
                            borderWidth: strokeWidth,
                            borderTopColor: activeColor,
                            borderRightColor: activeColor,
                            borderBottomColor: 'transparent',
                            borderLeftColor: 'transparent',
                            left: -halfSize,
                            transform: [{ rotate: `${rightRotate}deg` }],
                        },
                    ]}
                />
            </View>

            {/* Mitad izquierda (50% - 100%) */}
            <View style={[styles.clipHalf, { width: halfSize, height: size, left: 0 }]}>
                <View
                    style={[
                        styles.arcCircle,
                        {
                            width: size,
                            height: size,
                            borderRadius: halfSize,
                            borderWidth: strokeWidth,
                            borderTopColor: activeColor,
                            borderRightColor: activeColor,
                            borderBottomColor: 'transparent',
                            borderLeftColor: 'transparent',
                            left: 0,
                            transform: [{ rotate: `${leftRotate}deg` }],
                        },
                    ]}
                />
            </View>

            {/* Contenido central */}
            <View style={styles.centerContent}>
                {completed ? (
                    <Text style={[styles.completedText, { color: activeColor }]}>✓</Text>
                ) : (
                    <Text style={styles.percentText}>{displayPct}%</Text>
                )}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        justifyContent: 'center',
        alignItems: 'center',
        position: 'relative',
    },
    track: {
        position: 'absolute',
    },
    clipHalf: {
        position: 'absolute',
        top: 0,
        overflow: 'hidden',
    },
    arcCircle: {
        position: 'absolute',
        top: 0,
    },
    centerContent: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    percentText: {
        color: '#F4F4F5',
        fontSize: 13,
        fontWeight: '700',
    },
    completedText: {
        fontSize: 18,
        fontWeight: '800',
    },
});

