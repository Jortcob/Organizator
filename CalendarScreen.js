import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    ActivityIndicator,
    StatusBar,
} from 'react-native';
import { supabase } from './supabase';

export default function CalendarScreen({ onNavigate }) {
    const [selectedDate, setSelectedDate] = useState(() => {
        const today = new Date();
        return today.toISOString().split('T')[0];
    });

    const [currentMonth, setCurrentMonth] = useState(() => new Date());
    const [loading, setLoading] = useState(true);
    const [userId, setUserId] = useState(null);

    // Datos del día seleccionado
    const [dayWorkSessions, setDayWorkSessions] = useState([]);
    const [dayMeals, setDayMeals] = useState([]);
    const [dayWorkouts, setDayWorkouts] = useState([]);
    const [dayTransactions, setDayTransactions] = useState([]);

    // Generar días del mes para el selector interactivo
    const WEEKDAYS = ['D', 'L', 'M', 'X', 'J', 'V', 'S'];
    const daysInMonth = useMemo(() => {
        const year = currentMonth.getFullYear();
        const month = currentMonth.getMonth();
        const date = new Date(year, month, 1);
        const days = [];

        while (date.getMonth() === month) {
            const dateStr = date.toISOString().split('T')[0];
            const dayNum = date.getDate();
            const dayOfWeek = WEEKDAYS[date.getDay()];

            days.push({
                dateStr,
                dayNum,
                dayOfWeek,
                isToday: dateStr === new Date().toISOString().split('T')[0],
            });
            date.setDate(date.getDate() + 1);
        }
        return days;
    }, [currentMonth]);

    // Cargar datos consolidados para la fecha seleccionada
    const fetchDayTimeline = useCallback(async (dateStr) => {
        try {
            setLoading(true);
            const { data: { user } } = await supabase.auth.getUser();
            const currentUserId = user?.id || null;
            setUserId(currentUserId);

            if (!currentUserId) {
                // Mock demostrativo para el timeline si no hay sesión activa
                setDayWorkSessions([
                    {
                        id: 'demo-wk-1',
                        hora_inicio: `${dateStr}T09:00:00`,
                        hora_fin: `${dateStr}T13:30:00`,
                        precio_hora: 45,
                        ingreso_generado: 202.5,
                    },
                ]);

                setDayMeals([
                    {
                        id: 'demo-meal-1',
                        hora: '14:15',
                        nombre_personalizado: 'Almuerzo Fuerza',
                        alimentos: [
                            { nombre: 'Carne de ternera', gramos: 250, kcal: 537, proteina: 48 },
                            { nombre: 'Arroz blanco', gramos: 200, kcal: 260, proteina: 5.4 },
                        ],
                    },
                ]);

                setDayWorkouts([
                    {
                        id: 'demo-wko-1',
                        hora_inicio: '18:00',
                        duracion_minutos: 60,
                        gasto_calorico: 480,
                        tipo_entrenamiento: 'Sobrecarga Progresiva // Torso',
                    },
                ]);

                setDayTransactions([
                    {
                        id: 'demo-tx-1',
                        hora: '20:30',
                        tipo: 'gasto',
                        categoria: '🥩 Alimentación',
                        cantidad: 34.20,
                        descripcion: 'Compra carne fresca carnicería',
                    },
                ]);
                return;
            }

            // 1. Jornadas de trabajo del día
            const { data: workData } = await supabase
                .from('jornadas_trabajo')
                .select('*')
                .eq('user_id', currentUserId)
                .eq('fecha', dateStr);
            setDayWorkSessions(workData || []);

            // 2. Comidas del día
            const { data: regDiario } = await supabase
                .from('registros_diarios')
                .select('id')
                .eq('user_id', currentUserId)
                .eq('fecha', dateStr)
                .single();

            if (regDiario?.id) {
                const { data: ingestasData } = await supabase
                    .from('ingestas')
                    .select('*')
                    .eq('registro_diario_id', regDiario.id);
                setDayMeals(ingestasData || []);
            } else {
                setDayMeals([]);
            }

            // 3. Entrenamientos del día
            const { data: workoutData } = await supabase
                .from('entrenamientos')
                .select('*')
                .eq('user_id', currentUserId)
                .eq('fecha', dateStr);
            setDayWorkouts(workoutData || []);

            // 4. Transacciones económicas del día (comparando por fecha inicial)
            const nextDay = new Date(new Date(dateStr).getTime() + 86400000).toISOString().split('T')[0];
            const { data: txData } = await supabase
                .from('transacciones_economicas')
                .select('*')
                .eq('user_id', currentUserId)
                .gte('fecha', `${dateStr}T00:00:00`)
                .lt('fecha', `${nextDay}T00:00:00`);
            setDayTransactions(txData || []);

        } catch (error) {
            console.error('Error al compilar timeline 360°:', error.message);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchDayTimeline(selectedDate);
    }, [selectedDate, fetchDayTimeline]);

    // Calcular KPIs del Día Seleccionado
    const dayStats = useMemo(() => {
        // Trabajo & Ganancias
        const workHours = dayWorkSessions.reduce((acc, w) => {
            if (w.hora_inicio && w.hora_fin) {
                const diffMs = new Date(w.hora_fin) - new Date(w.hora_inicio);
                return acc + Math.max(0, diffMs / (1000 * 3600));
            }
            return acc;
        }, 0);
        const workIncome = dayWorkSessions.reduce((acc, w) => acc + (Number(w.ingreso_generado) || 0), 0);

        // Finanzas extras del día
        const manualIncome = dayTransactions
            .filter((t) => t.tipo?.toLowerCase() === 'ingreso')
            .reduce((acc, t) => acc + (Number(t.cantidad) || 0), 0);
        const expenses = dayTransactions
            .filter((t) => t.tipo?.toLowerCase() === 'gasto')
            .reduce((acc, t) => acc + (Number(t.cantidad) || 0), 0);

        const netDayCash = workIncome + manualIncome - expenses;

        // Nutrición & Calorías
        let caloriesIn = 0;
        let proteinIn = 0;
        dayMeals.forEach((m) => {
            const list = Array.isArray(m.alimentos) ? m.alimentos : [];
            list.forEach((f) => {
                caloriesIn += Number(f.kcal || f.kcal_totales || 0);
                proteinIn += Number(f.proteina || 0);
            });
        });

        // Gasto Calórico de Entrenamientos
        const caloriesBurned = dayWorkouts.reduce((acc, w) => acc + (Number(w.gasto_calorico) || 0), 0);

        return {
            workHours: workHours.toFixed(1),
            workIncome: Math.round(workIncome),
            expenses: Math.round(expenses),
            netDayCash: Math.round(netDayCash),
            caloriesIn: Math.round(caloriesIn),
            proteinIn: Math.round(proteinIn),
            caloriesBurned: Math.round(caloriesBurned),
        };
    }, [dayWorkSessions, dayMeals, dayWorkouts, dayTransactions]);

    // Combinar los 3 pilares en un único Timeline cronológico
    const unifiedEvents = useMemo(() => {
        const events = [];

        dayWorkSessions.forEach((w) => {
            const timeStr = w.hora_inicio ? new Date(w.hora_inicio).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }) : '09:00';
            const diffMs = w.hora_fin ? new Date(w.hora_fin) - new Date(w.hora_inicio) : 0;
            const hrs = (diffMs / (1000 * 3600)).toFixed(1);
            events.push({
                id: `w-${w.id}`,
                time: timeStr,
                pillar: 'TRABAJO',
                title: 'Jornada de Trabajo',
                details: `${hrs}h dedicadas a ${w.precio_hora}€/h`,
                badge: `+${Number(w.ingreso_generado || 0).toLocaleString('es-ES')} €`,
                badgeColor: '#06b6d4',
                icon: '⏱️',
            });
        });

        dayMeals.forEach((m) => {
            const timeStr = m.hora?.slice(0, 5) || '14:00';
            const list = Array.isArray(m.alimentos) ? m.alimentos : [];
            const k = list.reduce((acc, f) => acc + Number(f.kcal || f.kcal_totales || 0), 0);
            const p = list.reduce((acc, f) => acc + Number(f.proteina || 0), 0);
            events.push({
                id: `m-${m.id}`,
                time: timeStr,
                pillar: 'NUTRICIÓN',
                title: m.nombre_personalizado || 'Comida Tradicional',
                details: list.map((f) => `${f.nombre} (${f.gramos}g)`).join(', ') || 'Alimentos registrados',
                badge: `${k} kcal | ${p.toFixed(0)}g P`,
                badgeColor: '#f59e0b',
                icon: '🥩',
            });
        });

        dayWorkouts.forEach((w) => {
            const timeStr = w.hora_inicio?.slice(0, 5) || '18:00';
            events.push({
                id: `wko-${w.id}`,
                time: timeStr,
                pillar: 'FUERZA',
                title: w.tipo_entrenamiento || 'Rutina de Fuerza',
                details: `${w.duracion_minutos} min de sobrecarga progresiva`,
                badge: `🔥 +${w.gasto_calorico} kcal`,
                badgeColor: '#ef4444',
                icon: '🏋️‍♂️',
            });
        });

        dayTransactions.forEach((tx) => {
            const timeStr = tx.fecha ? new Date(tx.fecha).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }) : '12:00';
            const isGasto = tx.tipo?.toLowerCase() === 'gasto';
            events.push({
                id: `tx-${tx.id}`,
                time: timeStr,
                pillar: 'ECONOMÍA',
                title: tx.categoria || (isGasto ? 'Gasto' : 'Ingreso Extra'),
                details: tx.descripcion || 'Transacción registrada',
                badge: `${isGasto ? '-' : '+'}${Number(tx.cantidad).toLocaleString('es-ES')} €`,
                badgeColor: isGasto ? '#ef4444' : '#10b981',
                icon: isGasto ? '💳' : '💰',
            });
        });

        events.sort((a, b) => a.time.localeCompare(b.time));
        return events;
    }, [dayWorkSessions, dayMeals, dayWorkouts, dayTransactions]);

    const formattedSelectedDateHeader = useMemo(() => {
        try {
            const d = new Date(selectedDate);
            return d.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).toUpperCase();
        } catch (e) {
            return selectedDate;
        }
    }, [selectedDate]);

    const formattedMonthBadge = useMemo(() => {
        try {
            return currentMonth.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' }).toUpperCase();
        } catch (e) {
            return 'MES ACTUAL';
        }
    }, [currentMonth]);

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor="#000000" />

            <ScrollView contentContainerStyle={styles.scrollContent}>
                {/* Cabecera */}
                <View style={styles.header}>
                    <View>
                        <Text style={styles.superTitle}>NÚCLEO 360° // TIMELINE TOTAL</Text>
                        <Text style={styles.mainTitle}>Agenda & Calendario</Text>
                    </View>
                    <View style={styles.monthBadge}>
                        <Text style={styles.monthBadgeText}>
                            {formattedMonthBadge}
                        </Text>
                    </View>
                </View>

                {/* SELECTOR HORIZONTAL DE DÍAS */}
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.daysScroll}
                >
                    {daysInMonth.map((day) => {
                        const isSelected = day.dateStr === selectedDate;
                        return (
                            <TouchableOpacity
                                key={day.dateStr}
                                style={[
                                    styles.dayPill,
                                    isSelected && styles.dayPillSelected,
                                    day.isToday && !isSelected && styles.dayPillToday,
                                ]}
                                onPress={() => setSelectedDate(day.dateStr)}
                            >
                                <Text style={[styles.dayOfWeekText, isSelected && styles.dayOfWeekTextSelected]}>
                                    {day.dayOfWeek}
                                </Text>
                                <Text style={[styles.dayNumText, isSelected && styles.dayNumTextSelected]}>
                                    {day.dayNum}
                                </Text>
                                {day.isToday && <View style={styles.todayIndicatorDot} />}
                            </TouchableOpacity>
                        );
                    })}
                </ScrollView>

                {/* RESUMEN DEL DÍA SELECCIONADO (CONVERGENCIA DE LOS 3 PILARES) */}
                <View style={styles.summaryCard}>
                    <Text style={styles.summaryDateTitle}>{formattedSelectedDateHeader}</Text>

                    <View style={styles.summaryRow}>
                        <View style={styles.summaryCol}>
                            <Text style={styles.summaryColLabel}>TRABAJO</Text>
                            <Text style={styles.summaryValueCyan}>{dayStats.workHours}h</Text>
                            <Text style={styles.summaryColSub}>+{dayStats.workIncome} €</Text>
                        </View>

                        <View style={styles.summaryDivider} />

                        <View style={styles.summaryCol}>
                            <Text style={styles.summaryColLabel}>NUTRICIÓN</Text>
                            <Text style={styles.summaryValueOrange}>{dayStats.caloriesIn} kcal</Text>
                            <Text style={styles.summaryColSub}>{dayStats.proteinIn}g Prot</Text>
                        </View>

                        <View style={styles.summaryDivider} />

                        <View style={styles.summaryCol}>
                            <Text style={styles.summaryColLabel}>FUERZA</Text>
                            <Text style={styles.summaryValueRed}>+{dayStats.caloriesBurned}</Text>
                            <Text style={styles.summaryColSub}>Kcal Quemadas</Text>
                        </View>

                        <View style={styles.summaryDivider} />

                        <View style={styles.summaryCol}>
                            <Text style={styles.summaryColLabel}>CAJA NETA</Text>
                            <Text style={[
                                styles.summaryValueGreen,
                                { color: dayStats.netDayCash >= 0 ? '#10b981' : '#ef4444' }
                            ]}>
                                {dayStats.netDayCash >= 0 ? '+' : ''}{dayStats.netDayCash} €
                            </Text>
                            <Text style={styles.summaryColSub}>Balance Día</Text>
                        </View>
                    </View>
                </View>

                {/* TIMELINE CRONOLÓGICO UNIFICADO */}
                <View style={styles.timelineSection}>
                    <Text style={styles.timelineSectionTitle}>CRONOLOGÍA DEL DÍA // EVENTOS 360°</Text>

                    {loading ? (
                        <ActivityIndicator color="#06b6d4" style={{ marginTop: 24 }} />
                    ) : unifiedEvents.length === 0 ? (
                        <View style={styles.emptyTimelineCard}>
                            <Text style={styles.emptyTimelineText}>No hay registros para este día.</Text>
                            <Text style={styles.emptyTimelineSub}>
                                Inicia jornadas, añade comidas o registra entrenos para poblar el timeline.
                            </Text>
                        </View>
                    ) : (
                        unifiedEvents.map((ev, idx) => (
                            <View key={ev.id} style={styles.timelineItem}>
                                {/* Línea vertical del timeline */}
                                <View style={styles.timelineLineContainer}>
                                    <View style={styles.timelineDot} />
                                    {idx !== unifiedEvents.length - 1 && <View style={styles.timelineLine} />}
                                </View>

                                {/* Tarjeta del Evento */}
                                <View style={styles.eventCard}>
                                    <View style={styles.eventHeader}>
                                        <View style={styles.eventIconTitleWrap}>
                                            <Text style={styles.eventIcon}>{ev.icon}</Text>
                                            <View>
                                                <Text style={styles.eventPillarTag}>{ev.pillar}</Text>
                                                <Text style={styles.eventTitle}>{ev.title}</Text>
                                            </View>
                                        </View>
                                        <Text style={styles.eventTime}>{ev.time}</Text>
                                    </View>

                                    <Text style={styles.eventDetails}>{ev.details}</Text>

                                    <View style={styles.eventBadgeWrap}>
                                        <Text style={[styles.eventBadgeText, { color: ev.badgeColor }]}>
                                            {ev.badge}
                                        </Text>
                                    </View>
                                </View>
                            </View>
                        ))
                    )}
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
    scrollContent: {
        paddingHorizontal: 16,
        paddingTop: 20,
        paddingBottom: 48,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    superTitle: {
        color: '#06b6d4',
        fontSize: 10,
        fontWeight: '800',
        letterSpacing: 1.2,
    },
    mainTitle: {
        color: '#f4f4f5',
        fontSize: 22,
        fontWeight: '900',
        letterSpacing: -0.5,
        marginTop: 2,
    },
    monthBadge: {
        backgroundColor: '#121216',
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#27272a',
    },
    monthBadgeText: {
        color: '#a1a1aa',
        fontSize: 11,
        fontWeight: '700',
        letterSpacing: 0.5,
    },

    // Selector Horizontal de Días
    daysScroll: {
        gap: 8,
        paddingVertical: 6,
        marginBottom: 18,
    },
    dayPill: {
        width: 48,
        height: 64,
        borderRadius: 14,
        backgroundColor: '#0a0a0c',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#1f1f23',
    },
    dayPillSelected: {
        backgroundColor: '#06b6d4',
        borderColor: '#06b6d4',
    },
    dayPillToday: {
        borderColor: 'rgba(6, 182, 212, 0.4)',
    },
    dayOfWeekText: {
        color: '#71717a',
        fontSize: 10,
        fontWeight: '700',
        marginBottom: 2,
    },
    dayOfWeekTextSelected: {
        color: '#000000',
        fontWeight: '900',
    },
    dayNumText: {
        color: '#f4f4f5',
        fontSize: 16,
        fontWeight: '800',
    },
    dayNumTextSelected: {
        color: '#000000',
        fontWeight: '900',
    },
    todayIndicatorDot: {
        width: 4,
        height: 4,
        borderRadius: 2,
        backgroundColor: '#06b6d4',
        marginTop: 3,
    },

    // Tarjeta Resumen
    summaryCard: {
        backgroundColor: '#0a0a0c',
        borderRadius: 18,
        padding: 16,
        borderWidth: 1,
        borderColor: '#1f1f23',
        marginBottom: 22,
    },
    summaryDateTitle: {
        color: '#71717a',
        fontSize: 10,
        fontWeight: '800',
        letterSpacing: 1,
        marginBottom: 12,
        textAlign: 'center',
    },
    summaryRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    summaryCol: {
        flex: 1,
        alignItems: 'center',
    },
    summaryDivider: {
        width: 1,
        backgroundColor: '#1f1f23',
    },
    summaryColLabel: {
        color: '#71717a',
        fontSize: 8,
        fontWeight: '800',
        letterSpacing: 0.6,
        marginBottom: 3,
    },
    summaryValueCyan: {
        color: '#06b6d4',
        fontSize: 15,
        fontWeight: '900',
    },
    summaryValueOrange: {
        color: '#f59e0b',
        fontSize: 15,
        fontWeight: '900',
    },
    summaryValueRed: {
        color: '#ef4444',
        fontSize: 15,
        fontWeight: '900',
    },
    summaryValueGreen: {
        fontSize: 15,
        fontWeight: '900',
    },
    summaryColSub: {
        color: '#52525b',
        fontSize: 9,
        fontWeight: '600',
        marginTop: 1,
    },

    // Timeline
    timelineSection: {
        marginTop: 4,
    },
    timelineSectionTitle: {
        color: '#71717a',
        fontSize: 10,
        fontWeight: '800',
        letterSpacing: 1.2,
        marginBottom: 14,
    },
    emptyTimelineCard: {
        backgroundColor: '#0a0a0c',
        borderRadius: 14,
        padding: 24,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#1f1f23',
    },
    emptyTimelineText: {
        color: '#a1a1aa',
        fontSize: 14,
        fontWeight: '600',
    },
    emptyTimelineSub: {
        color: '#52525b',
        fontSize: 12,
        marginTop: 4,
        textAlign: 'center',
    },
    timelineItem: {
        flexDirection: 'row',
        marginBottom: 12,
    },
    timelineLineContainer: {
        width: 24,
        alignItems: 'center',
        marginRight: 8,
    },
    timelineDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#06b6d4',
        marginTop: 6,
    },
    timelineLine: {
        flex: 1,
        width: 2,
        backgroundColor: '#1f1f23',
        marginTop: 4,
    },
    eventCard: {
        flex: 1,
        backgroundColor: '#0a0a0c',
        borderRadius: 14,
        padding: 14,
        borderWidth: 1,
        borderColor: '#1f1f23',
    },
    eventHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 4,
    },
    eventIconTitleWrap: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    eventIcon: {
        fontSize: 18,
    },
    eventPillarTag: {
        color: '#71717a',
        fontSize: 8,
        fontWeight: '800',
        letterSpacing: 0.8,
    },
    eventTitle: {
        color: '#f4f4f5',
        fontSize: 14,
        fontWeight: '700',
    },
    eventTime: {
        color: '#71717a',
        fontSize: 11,
        fontWeight: '600',
    },
    eventDetails: {
        color: '#a1a1aa',
        fontSize: 12,
        marginTop: 4,
        lineHeight: 16,
    },
    eventBadgeWrap: {
        alignSelf: 'flex-start',
        marginTop: 8,
        backgroundColor: '#141418',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 6,
        borderWidth: 1,
        borderColor: '#222228',
    },
    eventBadgeText: {
        fontSize: 11,
        fontWeight: '800',
    },
});

