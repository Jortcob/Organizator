import React, { useState, useEffect, useMemo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    RefreshControl,
    ActivityIndicator,
} from 'react-native';
import ProgressRing from './ProgressRing';
import {
    getStoreState,
    subscribeStore,
    computePeriodMetrics,
    evaluateGoalsAndAdvice,
} from './dataStore';
import { fetchWeather, calculateGymRecommendation } from './aiAssistant';

const PERIODS = [
    { id: 'diario', label: 'Hoy' },
    { id: 'semanal', label: 'Semana' },
    { id: 'mensual', label: 'Mes' },
    { id: 'anual', label: 'Año' },
];

export default function DashboardScreen({ onNavigate }) {
    const [storeState, setStoreState] = useState(null);
    const [refreshing, setRefreshing] = useState(false);
    const [period, setPeriod] = useState('diario');
    const [weatherData, setWeatherData] = useState(null);
    const [gymRec, setGymRec] = useState(null);

    const refreshAssistant = async (state) => {
        const city = state?.profile?.ciudad || 'Madrid';
        const w = await fetchWeather(city);
        setWeatherData(w);
        const g = calculateGymRecommendation(state, w);
        setGymRec(g);
    };

    useEffect(() => {
        let mounted = true;
        getStoreState(true).then((s) => {
            if (mounted) {
                setStoreState({ ...s });
                refreshAssistant(s);
            }
        });
        const unsub = subscribeStore((s) => {
            if (mounted) {
                setStoreState({ ...s });
                refreshAssistant(s);
            }
        });
        return () => {
            mounted = false;
            unsub();
        };
    }, []);

    const onRefresh = async () => {
        setRefreshing(true);
        const s = await getStoreState(true);
        setStoreState({ ...s });
        await refreshAssistant(s);
        setRefreshing(false);
    };

    const greeting = useMemo(() => {
        const hour = new Date().getHours();
        const base = hour < 13 ? 'Buenos días' : hour < 20 ? 'Buenas tardes' : 'Buenas noches';
        const name = storeState?.profile?.nombre?.trim();
        return name ? `${base}, ${name}` : base;
    }, [storeState?.profile?.nombre]);

    const todayLabel = useMemo(() => {
        try {
            const d = new Date();
            const raw = d.toLocaleDateString('es-ES', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
            });
            return raw.charAt(0).toUpperCase() + raw.slice(1);
        } catch {
            return 'Hoy';
        }
    }, []);

    const todayMetrics = useMemo(() => computePeriodMetrics(storeState, 'diario'), [storeState]);
    const periodMetrics = useMemo(() => computePeriodMetrics(storeState, period), [storeState, period]);
    const { goals, advice, completedCount } = useMemo(
        () => evaluateGoalsAndAdvice(storeState),
        [storeState]
    );

    // 6 Módulos en estructura de 2 cuadrados por fila
    const modules = useMemo(() => {
        if (!todayMetrics || !periodMetrics) return [];
        const targetKcal = Number(storeState?.profile?.objetivo_calorico_diario || 0);
        const kcalSubtitle = targetKcal > 0
            ? `${todayMetrics.health.caloriesIn} / ${targetKcal} kcal`
            : `${todayMetrics.health.caloriesIn} kcal hoy`;

        const monthMetrics = computePeriodMetrics(storeState, 'mensual');

        return [
            {
                id: 'workout',
                title: 'Entrenamiento',
                icon: '🏋️‍♂️',
                tint: 'rgba(251, 113, 133, 0.14)',
                subtitle: todayMetrics.training.sessionsCount > 0
                    ? `${todayMetrics.training.caloriesBurned} kcal hoy`
                    : 'Registrar sesión',
            },
            {
                id: 'meal',
                title: 'Dieta',
                icon: '🥩',
                tint: 'rgba(245, 158, 11, 0.14)',
                subtitle: kcalSubtitle,
            },
            {
                id: 'work',
                title: 'Jornada',
                icon: '⏱️',
                tint: 'rgba(56, 189, 248, 0.14)',
                subtitle: `${todayMetrics.work.hours} h trabajadas hoy`,
            },
            {
                id: 'finance',
                title: 'Economía',
                icon: '💳',
                tint: 'rgba(52, 211, 153, 0.14)',
                subtitle: `${monthMetrics.economy.netBalance >= 0 ? '+' : ''}${monthMetrics.economy.netBalance} € este mes`,
            },
            {
                id: 'calendar',
                title: 'Agenda',
                icon: '📅',
                tint: 'rgba(167, 139, 250, 0.14)',
                subtitle: 'Tu día en orden',
            },
            {
                id: 'profile',
                title: 'Configuración',
                icon: '⚙️',
                tint: 'rgba(161, 161, 170, 0.14)',
                subtitle: 'Objetivos y perfil',
            },
        ];
    }, [storeState, todayMetrics, periodMetrics]);

    if (!storeState || !todayMetrics || !periodMetrics) {
        return (
            <View style={styles.loadingWrap}>
                <ActivityIndicator color="#34D399" />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <ScrollView
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        tintColor="#A1A1AA"
                    />
                }
            >
                <View style={styles.innerWrap}>
                    {/* Cabecera cálida y simple */}
                    <View style={styles.header}>
                        <View>
                            <Text style={styles.dateText}>{todayLabel}</Text>
                            <Text style={styles.greetingText}>{greeting}</Text>
                        </View>
                    </View>

                    {/* TARJETA ASISTENTE PERSONAL 360° */}
                    <TouchableOpacity
                        style={styles.assistantBanner}
                        activeOpacity={0.8}
                        onPress={() => onNavigate && onNavigate('assistant')}
                    >
                        <View style={styles.assistantTopRow}>
                            <View style={styles.assistantBadge}>
                                <Text style={styles.assistantBadgeText}>Asistente 360° · Oportunidad hoy</Text>
                            </View>
                            <Text style={styles.assistantActionLink}>Abrir chat ›</Text>
                        </View>

                        <Text style={styles.assistantHeadline}>
                            {gymRec
                                ? `Hora óptima de gym en ${gymRec.gymName} a las ${gymRec.bestSlot.timeLabel} (${gymRec.bestSlot.crowd}% de afluencia, ${gymRec.bestSlot.crowdLabel.toLowerCase()}). Toca ${gymRec.suggestedMuscle}.`
                                : 'Calculando tu hueco de entrenamiento óptimo según afluencia, jornada y clima...'}
                        </Text>

                        {weatherData && gymRec && (
                            <View style={styles.assistantPillsRow}>
                                <View style={styles.assistantSmallPill}>
                                    <Text style={styles.assistantSmallPillText}>
                                        {weatherData.temp}°C {weatherData.icon} {weatherData.city}
                                    </Text>
                                </View>
                                <View style={styles.assistantSmallPill}>
                                    <Text style={styles.assistantSmallPillText}>
                                        🏋️‍♂️ {gymRec.bestSlot.timeLabel} ({gymRec.bestSlot.crowd}%)
                                    </Text>
                                </View>
                                <View style={styles.assistantSmallPill}>
                                    <Text style={styles.assistantSmallPillText}>
                                        🎯 {gymRec.suggestedMuscle.split('/')[0].trim()}
                                    </Text>
                                </View>
                            </View>
                        )}
                    </TouchableOpacity>

                    {/* ANILLOS DE OBJETIVOS (solo si hay objetivos configurados) */}
                    {goals.length > 0 ? (
                        <View style={styles.section}>
                            <View style={styles.sectionHeaderRow}>
                                <Text style={styles.sectionTitle}>Tus objetivos</Text>
                                <TouchableOpacity onPress={() => onNavigate && onNavigate('profile')}>
                                    <Text style={styles.sectionAction}>
                                        {completedCount > 0 ? `${completedCount}/${goals.length} completados · Editar` : 'Editar'}
                                    </Text>
                                </TouchableOpacity>
                            </View>

                            <View style={styles.ringsGrid}>
                                {goals.map((g) => (
                                    <View key={g.id} style={styles.ringCard}>
                                        <ProgressRing
                                            size={64}
                                            strokeWidth={6}
                                            progress={g.progress}
                                            color={g.color}
                                            completed={g.completed}
                                        />
                                        <View style={styles.ringInfo}>
                                            <Text style={styles.ringTitle}>{g.title}</Text>
                                            <Text style={styles.ringValues}>
                                                {g.current} / {g.target} {g.unit}
                                            </Text>
                                            {g.completed && (
                                                <View style={styles.completedPill}>
                                                    <Text style={styles.completedPillText}>Completado</Text>
                                                </View>
                                            )}
                                        </View>
                                    </View>
                                ))}
                            </View>
                        </View>
                    ) : (
                        <TouchableOpacity
                            style={styles.emptyGoalsBanner}
                            onPress={() => onNavigate && onNavigate('profile')}
                            activeOpacity={0.8}
                        >
                            <Text style={styles.emptyGoalsTitle}>Define tus objetivos</Text>
                            <Text style={styles.emptyGoalsSub}>
                                Configura tus metas diarias o semanales para ver tu progreso aquí.
                            </Text>
                        </TouchableOpacity>
                    )}

                    {/* CUADRÍCULA DE MÓDULOS: 2 CUADRADOS POR FILA */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Tu espacio</Text>
                        <View style={styles.modulesGrid}>
                            {modules.map((mod) => (
                                <TouchableOpacity
                                    key={mod.id}
                                    style={styles.moduleSquare}
                                    activeOpacity={0.75}
                                    onPress={() => onNavigate && onNavigate(mod.id)}
                                >
                                    <View style={[styles.moduleIconCircle, { backgroundColor: mod.tint }]}>
                                        <Text style={styles.moduleIcon}>{mod.icon}</Text>
                                    </View>
                                    <View>
                                        <Text style={styles.moduleTitle}>{mod.title}</Text>
                                        <Text style={styles.moduleSubtitle} numberOfLines={1}>
                                            {mod.subtitle}
                                        </Text>
                                    </View>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>

                    {/* RESUMEN POR PERIODO (Hoy / Semana / Mes / Año) */}
                    <View style={styles.section}>
                        <View style={styles.sectionHeaderRow}>
                            <Text style={styles.sectionTitle}>Resumen</Text>
                            <TouchableOpacity onPress={() => onNavigate && onNavigate('analytics')}>
                                <Text style={styles.sectionAction}>Ver historial →</Text>
                            </TouchableOpacity>
                        </View>

                        <View style={styles.periodBar}>
                            {PERIODS.map((p) => {
                                const active = period === p.id;
                                return (
                                    <TouchableOpacity
                                        key={p.id}
                                        style={[styles.periodBtn, active && styles.periodBtnActive]}
                                        onPress={() => setPeriod(p.id)}
                                    >
                                        <Text style={[styles.periodText, active && styles.periodTextActive]}>
                                            {p.label}
                                        </Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>

                        <View style={styles.quickSummaryCard}>
                            <View style={styles.quickSummaryItem}>
                                <Text style={styles.quickLabel}>Balance</Text>
                                <Text
                                    style={[
                                        styles.quickValue,
                                        { color: periodMetrics.economy.netBalance >= 0 ? '#34D399' : '#FB7185' },
                                    ]}
                                >
                                    {periodMetrics.economy.netBalance >= 0 ? '+' : ''}
                                    {periodMetrics.economy.netBalance} €
                                </Text>
                            </View>
                            <View style={styles.quickDivider} />
                            <View style={styles.quickSummaryItem}>
                                <Text style={styles.quickLabel}>Trabajo</Text>
                                <Text style={[styles.quickValue, { color: '#38BDF8' }]}>
                                    {periodMetrics.work.hours} h
                                </Text>
                            </View>
                            <View style={styles.quickDivider} />
                            <View style={styles.quickSummaryItem}>
                                <Text style={styles.quickLabel}>Calorías</Text>
                                <Text style={[styles.quickValue, { color: '#F59E0B' }]}>
                                    {periodMetrics.health.caloriesIn.toLocaleString('es-ES')}
                                </Text>
                            </View>
                        </View>
                    </View>

                    {/* MENSAJES DE AYUDA Y CONSEJOS PERSONALIZADOS */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Consejos y seguimiento</Text>
                        <View style={styles.adviceList}>
                            {advice.map((item) => (
                                <View
                                    key={item.id}
                                    style={[
                                        styles.adviceCard,
                                        item.type === 'completed' && styles.adviceCardCompleted,
                                    ]}
                                >
                                    <View style={styles.adviceHeader}>
                                        <Text style={styles.adviceTitle}>{item.title}</Text>
                                        {item.type === 'completed' && (
                                            <Text style={styles.adviceBadge}>Logrado</Text>
                                        )}
                                    </View>
                                    <Text style={styles.adviceMessage}>{item.message}</Text>
                                </View>
                            ))}
                        </View>
                    </View>
                </View>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000000',
    },
    loadingWrap: {
        flex: 1,
        backgroundColor: '#000000',
        justifyContent: 'center',
        alignItems: 'center',
    },
    scrollContent: {
        paddingHorizontal: 20,
        paddingTop: 16,
        paddingBottom: 40,
    },
    innerWrap: {
        width: '100%',
        maxWidth: 520,
        alignSelf: 'center',
    },
    header: {
        marginBottom: 22,
    },
    dateText: {
        color: '#A1A1AA',
        fontSize: 13,
        fontWeight: '500',
        marginBottom: 2,
    },
    greetingText: {
        color: '#FAFAFA',
        fontSize: 28,
        fontWeight: '700',
        letterSpacing: -0.5,
    },
    assistantBanner: {
        backgroundColor: '#111114',
        borderRadius: 20,
        padding: 16,
        borderWidth: 1,
        borderColor: '#232329',
        marginBottom: 22,
    },
    assistantTopRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    assistantBadge: {
        backgroundColor: 'rgba(56, 189, 248, 0.12)',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 8,
    },
    assistantBadgeText: {
        color: '#38BDF8',
        fontSize: 11,
        fontWeight: '700',
    },
    assistantActionLink: {
        color: '#A1A1AA',
        fontSize: 12,
        fontWeight: '600',
    },
    assistantHeadline: {
        color: '#FAFAFA',
        fontSize: 13,
        lineHeight: 19,
        fontWeight: '500',
        marginBottom: 10,
    },
    assistantPillsRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 6,
    },
    assistantSmallPill: {
        backgroundColor: '#18181C',
        borderRadius: 8,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderWidth: 1,
        borderColor: '#27272E',
    },
    assistantSmallPillText: {
        color: '#A1A1AA',
        fontSize: 11,
        fontWeight: '600',
    },
    section: {
        marginBottom: 24,
    },
    sectionHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    sectionTitle: {
        color: '#FAFAFA',
        fontSize: 17,
        fontWeight: '700',
        marginBottom: 12,
    },
    sectionAction: {
        color: '#A1A1AA',
        fontSize: 13,
        fontWeight: '500',
        marginBottom: 12,
    },

    // Anillos de objetivos
    ringsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        gap: 12,
    },
    ringCard: {
        width: '48%',
        backgroundColor: '#111114',
        borderRadius: 20,
        padding: 14,
        borderWidth: 1,
        borderColor: '#232329',
        alignItems: 'center',
    },
    ringInfo: {
        alignItems: 'center',
        marginTop: 10,
    },
    ringTitle: {
        color: '#F4F4F5',
        fontSize: 13,
        fontWeight: '600',
    },
    ringValues: {
        color: '#A1A1AA',
        fontSize: 12,
        marginTop: 2,
    },
    completedPill: {
        marginTop: 6,
        backgroundColor: 'rgba(52, 211, 153, 0.14)',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 10,
    },
    completedPillText: {
        color: '#34D399',
        fontSize: 11,
        fontWeight: '600',
    },
    emptyGoalsBanner: {
        backgroundColor: '#111114',
        borderRadius: 18,
        padding: 16,
        borderWidth: 1,
        borderColor: '#232329',
        marginBottom: 24,
    },
    emptyGoalsTitle: {
        color: '#FAFAFA',
        fontSize: 15,
        fontWeight: '600',
    },
    emptyGoalsSub: {
        color: '#A1A1AA',
        fontSize: 13,
        marginTop: 4,
    },

    // Grid de 2 cuadrados por fila
    modulesGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        gap: 12,
    },
    moduleSquare: {
        width: '48%',
        minHeight: 126,
        backgroundColor: '#111114',
        borderRadius: 20,
        padding: 16,
        borderWidth: 1,
        borderColor: '#232329',
        justifyContent: 'space-between',
    },
    moduleIconCircle: {
        width: 42,
        height: 42,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 14,
    },
    moduleIcon: {
        fontSize: 20,
    },
    moduleTitle: {
        color: '#FAFAFA',
        fontSize: 15,
        fontWeight: '700',
    },
    moduleSubtitle: {
        color: '#A1A1AA',
        fontSize: 12,
        marginTop: 3,
    },

    // Selector temporal y resumen rápido
    periodBar: {
        flexDirection: 'row',
        backgroundColor: '#111114',
        borderRadius: 12,
        padding: 4,
        borderWidth: 1,
        borderColor: '#232329',
        marginBottom: 10,
    },
    periodBtn: {
        flex: 1,
        paddingVertical: 7,
        alignItems: 'center',
        borderRadius: 9,
    },
    periodBtnActive: {
        backgroundColor: '#27272E',
    },
    periodText: {
        color: '#71717A',
        fontSize: 12,
        fontWeight: '600',
    },
    periodTextActive: {
        color: '#FAFAFA',
        fontWeight: '700',
    },
    quickSummaryCard: {
        flexDirection: 'row',
        backgroundColor: '#111114',
        borderRadius: 18,
        paddingVertical: 14,
        paddingHorizontal: 12,
        borderWidth: 1,
        borderColor: '#232329',
    },
    quickSummaryItem: {
        flex: 1,
        alignItems: 'center',
    },
    quickDivider: {
        width: 1,
        backgroundColor: '#232329',
    },
    quickLabel: {
        color: '#71717A',
        fontSize: 11,
        marginBottom: 4,
    },
    quickValue: {
        fontSize: 16,
        fontWeight: '700',
    },

    // Consejos y seguimiento
    adviceList: {
        gap: 10,
    },
    adviceCard: {
        backgroundColor: '#111114',
        borderRadius: 16,
        padding: 15,
        borderWidth: 1,
        borderColor: '#232329',
    },
    adviceCardCompleted: {
        backgroundColor: 'rgba(52, 211, 153, 0.06)',
        borderColor: 'rgba(52, 211, 153, 0.25)',
    },
    adviceHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 4,
    },
    adviceTitle: {
        color: '#FAFAFA',
        fontSize: 14,
        fontWeight: '600',
        flex: 1,
    },
    adviceBadge: {
        color: '#34D399',
        fontSize: 11,
        fontWeight: '600',
        marginLeft: 8,
    },
    adviceMessage: {
        color: '#A1A1AA',
        fontSize: 13,
        lineHeight: 19,
    },
});
