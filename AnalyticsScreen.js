import React, { useState, useEffect, useMemo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    ActivityIndicator,
} from 'react-native';
import {
    getStoreState,
    subscribeStore,
    computePeriodMetrics,
    generateCategoryAnalysis,
} from './dataStore';

const PERIODS = [
    { id: 'diario', label: 'Hoy' },
    { id: 'semanal', label: 'Semana' },
    { id: 'mensual', label: 'Mes' },
    { id: 'anual', label: 'Año' },
];

const CATEGORIES = [
    { id: 'general', label: 'General', color: '#FAFAFA' },
    { id: 'training', label: 'Entrenamiento', color: '#FB7185' },
    { id: 'diet', label: 'Dieta', color: '#F59E0B' },
    { id: 'work', label: 'Jornada', color: '#38BDF8' },
    { id: 'economy', label: 'Economía', color: '#34D399' },
];

export default function AnalyticsScreen() {
    const [storeState, setStoreState] = useState(null);
    const [period, setPeriod] = useState('semanal');
    const [category, setCategory] = useState('general');

    useEffect(() => {
        let mounted = true;
        getStoreState(true).then((s) => {
            if (mounted) setStoreState(s);
        });
        const unsub = subscribeStore((s) => {
            if (mounted) setStoreState({ ...s });
        });
        return () => {
            mounted = false;
            unsub();
        };
    }, []);

    const metrics = useMemo(() => {
        if (!storeState) return null;
        return computePeriodMetrics(storeState, period);
    }, [storeState, period]);

    const analysis = useMemo(() => {
        if (!storeState) return null;
        return generateCategoryAnalysis(storeState, period, category);
    }, [storeState, period, category]);

    const combinedRecords = useMemo(() => {
        if (!metrics) return [];
        const items = [];

        if (category === 'general' || category === 'work') {
            metrics.records.work.forEach((w) => {
                const hrs = (w.horas_ordinarias !== undefined || w.horas_extra !== undefined)
                    ? (Number(w.horas_ordinarias) || 0) + (Number(w.horas_extra) || 0)
                    : (w.hora_inicio && w.hora_fin
                        ? Math.max(0, (new Date(w.hora_fin) - new Date(w.hora_inicio)) / 3600000)
                        : 0);
                items.push({
                    id: `w-${w.id}`,
                    date: w.fecha || String(w.hora_inicio).split('T')[0],
                    category: w.jornada_partida ? 'Jornada partida' : 'Jornada',
                    title: `${hrs.toFixed(1)}h${Number(w.horas_extra) > 0 ? ` (+${w.horas_extra}h extra)` : ''} · ${w.precio_hora} €/h`,
                    value: `+${Number(w.ingreso_generado || 0).toFixed(0)} €`,
                    color: '#38BDF8',
                });
            });
        }

        if (category === 'general' || category === 'economy') {
            metrics.records.transactions.forEach((t) => {
                const isInc = t.tipo?.toLowerCase() === 'ingreso';
                items.push({
                    id: `tx-${t.id}`,
                    date: String(t.fecha).split('T')[0],
                    category: t.categoria || 'Economía',
                    title: t.descripcion || t.categoria,
                    value: `${isInc ? '+' : '-'}${Number(t.cantidad || 0).toFixed(0)} €`,
                    color: isInc ? '#34D399' : '#FB7185',
                });
            });
        }

        if (category === 'general' || category === 'diet') {
            metrics.records.meals.forEach((m) => {
                const list = Array.isArray(m.alimentos) ? m.alimentos : [];
                const kcal = list.reduce((a, f) => a + Number(f.kcal || f.kcal_totales || 0), 0);
                const prot = list.reduce((a, f) => a + Number(f.proteina || 0), 0);
                items.push({
                    id: `m-${m.id}`,
                    date: m.fecha,
                    category: 'Dieta',
                    title: `${m.nombre_personalizado || 'Comida'} (${list.map((f) => f.nombre).join(', ')})`,
                    value: `${Math.round(kcal)} kcal · ${Math.round(prot)}g P`,
                    color: '#F59E0B',
                });
            });
        }

        if (category === 'general' || category === 'training') {
            metrics.records.workouts.forEach((w) => {
                items.push({
                    id: `wko-${w.id}`,
                    date: w.fecha,
                    category: 'Entrenamiento',
                    title: `${w.tipo_entrenamiento || 'Fuerza'} · ${w.duracion_minutos || 0} min${w.tonelaje ? ` (${w.tonelaje} kg)` : ''}`,
                    value: `${w.gasto_calorico || 0} kcal`,
                    color: '#FB7185',
                });
            });
        }

        items.sort((a, b) => String(b.date).localeCompare(String(a.date)));
        return items;
    }, [metrics, category]);

    if (!metrics) {
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
            >
                <View style={styles.innerWrap}>
                    {/* Header limpio */}
                    <View style={styles.header}>
                        <Text style={styles.headerTitle}>Análisis y Datos</Text>
                        <Text style={styles.headerSubtitle}>
                            Revisa tu historial guardado por día, semana, mes o año
                        </Text>
                    </View>

                    {/* Selector temporal: Diario / Semanal / Mensual / Anual */}
                    <View style={styles.periodBar}>
                        {PERIODS.map((p) => {
                            const active = period === p.id;
                            return (
                                <TouchableOpacity
                                    key={p.id}
                                    style={[styles.periodBtn, active && styles.periodBtnActive]}
                                    onPress={() => setPeriod(p.id)}
                                    activeOpacity={0.75}
                                >
                                    <Text style={[styles.periodText, active && styles.periodTextActive]}>
                                        {p.label}
                                    </Text>
                                </TouchableOpacity>
                            );
                        })}
                    </View>

                    {/* Selector de categoría individual */}
                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.filterRow}
                    >
                        {CATEGORIES.map((c) => {
                            const active = category === c.id;
                            return (
                                <TouchableOpacity
                                    key={c.id}
                                    style={[
                                        styles.filterPill,
                                        active && { backgroundColor: c.color, borderColor: c.color },
                                    ]}
                                    onPress={() => setCategory(c.id)}
                                >
                                    <Text
                                        style={[
                                            styles.filterText,
                                            active && styles.filterTextActive,
                                        ]}
                                    >
                                        {c.label}
                                    </Text>
                                </TouchableOpacity>
                            );
                        })}
                    </ScrollView>

                    {/* Tarjeta de KPIs de la categoría */}
                    {analysis && (
                        <View style={styles.summaryCard}>
                            <Text style={styles.cardTitle}>{analysis.title}</Text>
                            <Text style={styles.summaryText}>{analysis.subtitle}</Text>

                            <View style={styles.kpiGrid}>
                                {analysis.kpis.map((kpi, idx) => (
                                    <View key={idx} style={styles.kpiItem}>
                                        <Text style={styles.kpiLabel}>{kpi.label}</Text>
                                        <Text style={[styles.kpiValue, { color: kpi.color }]}>
                                            {kpi.value}
                                        </Text>
                                    </View>
                                ))}
                            </View>
                        </View>
                    )}

                    {/* Entrenador Personal y Asistente Personal */}
                    {analysis && (
                        <View style={styles.coachingSection}>
                            <Text style={styles.sectionTitle}>Tu entrenador y asistente personal</Text>
                            <View style={styles.coachingList}>
                                {analysis.cards.map((card) => {
                                    const isCoach = card.role === 'Entrenador Personal';
                                    const badgeColor = isCoach ? '#FB7185' : '#38BDF8';
                                    return (
                                        <View key={card.id} style={styles.coachingCard}>
                                            <View style={styles.coachingHeader}>
                                                <View style={[styles.roleBadge, { borderColor: badgeColor }]}>
                                                    <Text style={[styles.roleBadgeText, { color: badgeColor }]}>
                                                        {card.role}
                                                    </Text>
                                                </View>
                                            </View>
                                            <Text style={styles.coachingTitle}>{card.title}</Text>
                                            <Text style={styles.coachingMsg}>{card.message}</Text>
                                        </View>
                                    );
                                })}
                            </View>
                        </View>
                    )}

                    {/* Registros filtrados por la categoría */}
                    <View style={styles.recordsSection}>
                        <Text style={styles.sectionTitle}>
                            Registros ({CATEGORIES.find((c) => c.id === category)?.label || 'Todo'})
                        </Text>

                        {combinedRecords.length === 0 ? (
                            <View style={styles.emptyCard}>
                                <Text style={styles.emptyText}>
                                    No hay registros guardados en este periodo para este filtro.
                                </Text>
                            </View>
                        ) : (
                            <View style={styles.recordsList}>
                                {combinedRecords.map((item) => (
                                    <View key={item.id} style={styles.recordCard}>
                                        <View style={[styles.recordDot, { backgroundColor: item.color }]} />
                                        <View style={styles.recordBody}>
                                            <View style={styles.recordTopRow}>
                                                <Text style={styles.recordCategory}>{item.category}</Text>
                                                <Text style={styles.recordDate}>{item.date}</Text>
                                            </View>
                                            <Text style={styles.recordTitle} numberOfLines={2}>
                                                {item.title}
                                            </Text>
                                        </View>
                                        <Text style={[styles.recordValue, { color: item.color }]}>
                                            {item.value}
                                        </Text>
                                    </View>
                                ))}
                            </View>
                        )}
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
        marginBottom: 18,
    },
    headerTitle: {
        color: '#FAFAFA',
        fontSize: 26,
        fontWeight: '700',
        letterSpacing: -0.5,
    },
    headerSubtitle: {
        color: '#A1A1AA',
        fontSize: 13,
        marginTop: 4,
        lineHeight: 18,
    },
    periodBar: {
        flexDirection: 'row',
        backgroundColor: '#111114',
        borderRadius: 14,
        padding: 4,
        borderWidth: 1,
        borderColor: '#232329',
        marginBottom: 18,
    },
    periodBtn: {
        flex: 1,
        paddingVertical: 9,
        alignItems: 'center',
        borderRadius: 10,
    },
    periodBtnActive: {
        backgroundColor: '#27272E',
    },
    periodText: {
        color: '#71717A',
        fontSize: 13,
        fontWeight: '600',
    },
    periodTextActive: {
        color: '#FAFAFA',
        fontWeight: '700',
    },
    summaryCard: {
        backgroundColor: '#111114',
        borderRadius: 20,
        padding: 18,
        borderWidth: 1,
        borderColor: '#232329',
        marginBottom: 22,
    },
    cardTitle: {
        color: '#FAFAFA',
        fontSize: 16,
        fontWeight: '700',
        marginBottom: 8,
    },
    summaryText: {
        color: '#A1A1AA',
        fontSize: 13,
        lineHeight: 19,
        marginBottom: 16,
    },
    kpiGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        gap: 10,
    },
    kpiItem: {
        width: '48%',
        backgroundColor: '#18181C',
        borderRadius: 14,
        padding: 12,
        borderWidth: 1,
        borderColor: '#232329',
    },
    kpiLabel: {
        color: '#71717A',
        fontSize: 12,
        marginBottom: 4,
    },
    kpiValue: {
        fontSize: 18,
        fontWeight: '700',
    },
    kpiSub: {
        color: '#A1A1AA',
        fontSize: 11,
        marginTop: 2,
    },
    recordsSection: {
        marginTop: 2,
    },
    sectionTitle: {
        color: '#FAFAFA',
        fontSize: 16,
        fontWeight: '700',
        marginBottom: 12,
    },
    filterRow: {
        gap: 8,
        paddingBottom: 14,
    },
    filterPill: {
        paddingVertical: 7,
        paddingHorizontal: 14,
        borderRadius: 20,
        backgroundColor: '#111114',
        borderWidth: 1,
        borderColor: '#232329',
    },
    filterPillActive: {
        backgroundColor: '#FAFAFA',
        borderColor: '#FAFAFA',
    },
    filterText: {
        color: '#A1A1AA',
        fontSize: 12,
        fontWeight: '600',
    },
    filterTextActive: {
        color: '#000000',
        fontWeight: '700',
    },
    recordsList: {
        gap: 10,
    },
    recordCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#111114',
        borderRadius: 16,
        padding: 14,
        borderWidth: 1,
        borderColor: '#232329',
    },
    recordDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        marginRight: 12,
    },
    recordBody: {
        flex: 1,
        marginRight: 10,
    },
    recordTopRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 2,
    },
    recordCategory: {
        color: '#A1A1AA',
        fontSize: 11,
        fontWeight: '600',
    },
    recordDate: {
        color: '#71717A',
        fontSize: 11,
    },
    recordTitle: {
        color: '#F4F4F5',
        fontSize: 13,
        fontWeight: '600',
    },
    recordValue: {
        fontSize: 13,
        fontWeight: '700',
    },
    emptyCard: {
        backgroundColor: '#111114',
        borderRadius: 16,
        padding: 24,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#232329',
    },
    emptyText: {
        color: '#71717A',
        fontSize: 13,
        textAlign: 'center',
    },
    coachingSection: {
        marginBottom: 22,
    },
    coachingList: {
        gap: 10,
    },
    coachingCard: {
        backgroundColor: '#111114',
        borderRadius: 18,
        padding: 16,
        borderWidth: 1,
        borderColor: '#232329',
    },
    coachingHeader: {
        flexDirection: 'row',
        marginBottom: 8,
    },
    roleBadge: {
        borderWidth: 1,
        borderRadius: 8,
        paddingHorizontal: 8,
        paddingVertical: 3,
        backgroundColor: '#18181C',
    },
    roleBadgeText: {
        fontSize: 11,
        fontWeight: '700',
    },
    coachingTitle: {
        color: '#FAFAFA',
        fontSize: 15,
        fontWeight: '700',
        marginBottom: 4,
    },
    coachingMsg: {
        color: '#A1A1AA',
        fontSize: 13,
        lineHeight: 19,
    },
});

