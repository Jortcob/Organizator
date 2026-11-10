import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    RefreshControl,
    ActivityIndicator,
    StatusBar,
} from 'react-native';
import { supabase } from './supabase';

export default function DashboardScreen({ onNavigate }) {
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    // Métricas de los 3 Pilares
    const [financialData, setFinancialData] = useState({
        monthlyIncome: 0,
        monthlyExpenses: 0,
        netBalance: 0,
        savingsRate: 0,
    });

    const [nutritionData, setNutritionData] = useState({
        kcalConsumed: 0,
        kcalTarget: 2400,
        kcalBurned: 0,
        netKcal: 0,
        protein: 0,
        carbs: 0,
        fats: 0,
    });

    const [workData, setWorkData] = useState({
        weeklyHours: 0,
        weeklyGoalHours: 40,
        weeklyIncome: 0,
        avgHourlyRate: 0,
        activeDays: 0,
    });

    // Cargar datos consolidados
    const fetchDashboardMetrics = useCallback(async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            const userId = user?.id || null;

            // Fechas de referencia
            const now = new Date();
            const todayStr = now.toISOString().split('T')[0];

            // Inicio de mes (YYYY-MM-01)
            const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

            // Inicio de semana (Lunes)
            const dayOfWeek = now.getDay() === 0 ? 6 : now.getDay() - 1; // 0 = Lunes
            const startOfWeek = new Date(now);
            startOfWeek.setDate(now.getDate() - dayOfWeek);
            startOfWeek.setHours(0, 0, 0, 0);
            const startOfWeekStr = startOfWeek.toISOString().split('T')[0];

            // 1. Perfil de Usuario (Objetivo Calórico)
            let objetivoCalorico = 2400;
            if (userId) {
                const { data: perfil } = await supabase
                    .from('perfiles')
                    .select('objetivo_calorico_diario')
                    .eq('id', userId)
                    .single();

                if (perfil?.objetivo_calorico_diario) {
                    objetivoCalorico = Number(perfil.objetivo_calorico_diario);
                }
            }

            // 2. Pilar Salud: Registro diario de comidas y entrenamientos de hoy
            let kcalSum = 0;
            let protSum = 0;
            let carbSum = 0;
            let fatSum = 0;
            let gastoCaloricoSum = 0;

            if (userId) {
                // Obtener registro de hoy
                const { data: regDiario } = await supabase
                    .from('registros_diarios')
                    .select('id')
                    .eq('user_id', userId)
                    .eq('fecha', todayStr)
                    .single();

                if (regDiario?.id) {
                    const { data: ingestas } = await supabase
                        .from('ingestas')
                        .select('alimentos')
                        .eq('registro_diario_id', regDiario.id);

                    if (ingestas && ingestas.length > 0) {
                        ingestas.forEach((ingesta) => {
                            const list = Array.isArray(ingesta.alimentos) ? ingesta.alimentos : [];
                            list.forEach((item) => {
                                kcalSum += Number(item.kcal || item.calorias || 0);
                                protSum += Number(item.proteina || 0);
                                carbSum += Number(item.carbohidratos || 0);
                                fatSum += Number(item.grasas || 0);
                            });
                        });
                    }
                }

                // Gasto de entrenamientos de hoy
                const { data: entrenosHoy } = await supabase
                    .from('entrenamientos')
                    .select('gasto_calorico')
                    .eq('user_id', userId)
                    .eq('fecha', todayStr);

                if (entrenosHoy && entrenosHoy.length > 0) {
                    gastoCaloricoSum = entrenosHoy.reduce((acc, curr) => acc + (Number(curr.gasto_calorico) || 0), 0);
                }
            } else {
                // Datos de muestra si aún no hay sesión activa
                kcalSum = 1850;
                protSum = 145;
                carbSum = 180;
                fatSum = 55;
                gastoCaloricoSum = 420;
            }

            setNutritionData({
                kcalConsumed: Math.round(kcalSum),
                kcalTarget: Math.round(objetivoCalorico),
                kcalBurned: Math.round(gastoCaloricoSum),
                netKcal: Math.round(objetivoCalorico + gastoCaloricoSum - kcalSum),
                protein: Math.round(protSum),
                carbs: Math.round(carbSum),
                fats: Math.round(fatSum),
            });

            // 3. Pilar Trabajo: Horas e ingresos generados de esta semana
            let totalHorasSemana = 0;
            let totalIngresoJornadasSemana = 0;
            let totalTarifaSum = 0;
            let conteoTarifas = 0;

            if (userId) {
                const { data: jornadas } = await supabase
                    .from('jornadas_trabajo')
                    .select('hora_inicio, hora_fin, precio_hora, ingreso_generado, fecha')
                    .eq('user_id', userId)
                    .gte('fecha', startOfWeekStr);

                if (jornadas && jornadas.length > 0) {
                    jornadas.forEach((j) => {
                        let duracionHoras = 0;
                        if (j.hora_inicio && j.hora_fin) {
                            const diffMs = new Date(j.hora_fin) - new Date(j.hora_inicio);
                            duracionHoras = Math.max(0, diffMs / (1000 * 60 * 60));
                        }
                        totalHorasSemana += duracionHoras;
                        totalIngresoJornadasSemana += Number(j.ingreso_generado) || (duracionHoras * Number(j.precio_hora || 0));

                        if (j.precio_hora) {
                            totalTarifaSum += Number(j.precio_hora);
                            conteoTarifas++;
                        }
                    });
                }
            } else {
                totalHorasSemana = 28.5;
                totalIngresoJornadasSemana = 1140;
                totalTarifaSum = 40;
                conteoTarifas = 1;
            }

            const avgRate = conteoTarifas > 0 ? (totalTarifaSum / conteoTarifas) : 0;
            setWorkData({
                weeklyHours: Number(totalHorasSemana.toFixed(1)),
                weeklyGoalHours: 40,
                weeklyIncome: Math.round(totalIngresoJornadasSemana),
                avgHourlyRate: Math.round(avgRate),
                activeDays: Math.min(dayOfWeek + 1, 7),
            });

            // 4. Pilar Economía: Transacciones del mes + Ingresos de trabajo del mes
            let totalIngresosMes = 0;
            let totalGastosMes = 0;

            if (userId) {
                // Transacciones económicas manuales o periódicas
                const { data: transacciones } = await supabase
                    .from('transacciones_economicas')
                    .select('tipo, cantidad, fecha')
                    .eq('user_id', userId)
                    .gte('fecha', startOfMonth);

                if (transacciones && transacciones.length > 0) {
                    transacciones.forEach((tx) => {
                        const cant = Number(tx.cantidad) || 0;
                        if (tx.tipo?.toLowerCase() === 'ingreso') {
                            totalIngresosMes += cant;
                        } else if (tx.tipo?.toLowerCase() === 'gasto') {
                            totalGastosMes += cant;
                        }
                    });
                }

                // Sumar los ingresos generados por jornadas en el mes
                const { data: jornadasMes } = await supabase
                    .from('jornadas_trabajo')
                    .select('ingreso_generado')
                    .eq('user_id', userId)
                    .gte('fecha', startOfMonth.split('T')[0]);

                if (jornadasMes && jornadasMes.length > 0) {
                    const ingresoJornadasMes = jornadasMes.reduce((acc, curr) => acc + (Number(curr.ingreso_generado) || 0), 0);
                    totalIngresosMes += ingresoJornadasMes;
                }
            } else {
                totalIngresosMes = 3850;
                totalGastosMes = 1620;
            }

            const net = totalIngresosMes - totalGastosMes;
            const savings = totalIngresosMes > 0 ? Math.round((net / totalIngresosMes) * 100) : 0;

            setFinancialData({
                monthlyIncome: Math.round(totalIngresosMes),
                monthlyExpenses: Math.round(totalGastosMes),
                netBalance: Math.round(net),
                savingsRate: savings,
            });

        } catch (error) {
            console.error('Error al compilar métricas del Dashboard:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        fetchDashboardMetrics();
    }, [fetchDashboardMetrics]);

    const onRefresh = () => {
        setRefreshing(true);
        fetchDashboardMetrics();
    };

    // EL CEREBRO: Motor de Recomendación Analítico Transversal
    const insights = useMemo(() => {
        const list = [];
        const { monthlyIncome, monthlyExpenses, netBalance } = financialData;
        const { kcalConsumed, kcalTarget, kcalBurned, netKcal, protein } = nutritionData;
        const { weeklyHours, weeklyGoalHours, weeklyIncome } = workData;

        // 1. Cruce: Margen Económico + Margen Calórico (Comida Trampa / Premio Productivo)
        if (netKcal >= 350 && netBalance > 400) {
            list.push({
                id: 'cheat_meal_approved',
                type: 'opportunity',
                tag: 'SALUD × ECONOMÍA',
                title: 'Margen Óptimo para Comida Trampa',
                message: `Tienes un remanente de +${netKcal} kcal hoy y un balance financiero holgado (+${netBalance}€ netos este mes). Puedes permitirte una cena social sin romper tu déficit ni presupuesto de ocio.`,
                accentColor: '#10b981',
            });
        }

        // 2. Cruce: Rendimiento de Trabajo vs Proyección Financiera
        const dayOfWeekIndex = new Date().getDay() || 7; // Lunes=1, Domingo=7
        const expectedHoursToDate = (weeklyGoalHours / 5) * Math.min(dayOfWeekIndex, 5);

        if (weeklyHours < expectedHoursToDate - 4) {
            const horasFaltantes = Math.round(expectedHoursToDate - weeklyHours);
            list.push({
                id: 'work_lag',
                type: 'warning',
                tag: 'TRABAJO × ECONOMÍA',
                title: 'Desaceleración de Horas Facturables',
                message: `Estás ${horasFaltantes}h por debajo del ritmo semanal fijado (${weeklyHours}h / ${expectedHoursToDate}h esperadas). Esto repercutirá directamente en ~${horasFaltantes * (workData.avgHourlyRate || 35)}€ menos de facturación estimada este mes.`,
                accentColor: '#f59e0b',
            });
        } else if (weeklyHours >= expectedHoursToDate) {
            list.push({
                id: 'work_optimal',
                type: 'success',
                tag: 'TRABAJO × ECONOMÍA',
                title: 'Ritmo de Producción Ejecutivo',
                message: `Cumpliendo el ritmo proyectado de ${weeklyGoalHours}h con ${weeklyIncome}€ devengados esta semana. Flujo de caja protegido y disciplina horaria óptima.`,
                accentColor: '#06b6d4',
            });
        }

        // 3. Cruce: Intensidad Física (Gasto) + Recuperación Metabólica
        if (kcalBurned > 300 && protein < 130) {
            list.push({
                id: 'recovery_alert',
                type: 'alert',
                tag: 'SALUD // RECUPERACIÓN',
                title: 'Déficit Proteico post-Entrenamiento',
                message: `Has consumido ${kcalBurned} kcal en entrenamiento de fuerza pero solo registras ${protein}g de proteína. Eleva el consumo proteico en la siguiente comida tradicional para preservar masa muscular.`,
                accentColor: '#ec4899',
            });
        }

        // 4. Cruce: Control de Gasto Fijo vs Tasa de Ahorro
        if (monthlyIncome > 0 && (monthlyExpenses / monthlyIncome) > 0.70) {
            list.push({
                id: 'budget_pressure',
                type: 'warning',
                tag: 'ECONOMÍA // CONTROL DE FLUJO',
                title: 'Presión en Tasa de Ahorro Mensual',
                message: `Tus gastos representan el ${Math.round((monthlyExpenses / monthlyIncome) * 100)}% de tus ingresos consolidados. Mantén los gastos variables de ocio y comida externa acotados hasta cerrar el ciclo.`,
                accentColor: '#ef4444',
            });
        }

        return list;
    }, [financialData, nutritionData, workData]);

    // Helpers de formateo
    const formatCurrency = (val) => {
        try {
            return `${Number(val || 0).toLocaleString('es-ES')} €`;
        } catch (e) {
            return `${val || 0} €`;
        }
    };
    const formatHours = (val) => `${val}h`;

    const currentDateFormatted = useMemo(() => {
        try {
            const d = new Date();
            const options = { weekday: 'long', day: 'numeric', month: 'long' };
            return d.toLocaleDateString('es-ES', options).toUpperCase();
        } catch (e) {
            return 'HOY // DASHBOARD';
        }
    }, []);

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor="#000000" />

            <ScrollView
                contentContainerStyle={styles.scrollContent}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        tintColor="#06b6d4"
                        colors={['#06b6d4']}
                    />
                }
            >
                {/* Header Ejecutivo */}
                <View style={styles.header}>
                    <View>
                        <Text style={styles.headerTag}>ORGANIZATOR // PLAN DE SUPERHOMBRE</Text>
                        <Text style={styles.headerDate}>{currentDateFormatted}</Text>
                    </View>
                    <View style={styles.liveIndicator}>
                        <View style={styles.liveDot} />
                        <Text style={styles.liveText}>360° ENGINE</Text>
                    </View>
                </View>

                {loading ? (
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="large" color="#06b6d4" />
                        <Text style={styles.loadingText}>Compilando analíticas de los 3 pilares...</Text>
                    </View>
                ) : (
                    <>
                        {/* WIDGET 1: RESUMEN FINANCIERO MENSUAL (Pilar Economía / Trabajo) */}
                        <View style={[styles.card, styles.financeCard]}>
                            <View style={styles.cardHeader}>
                                <View style={styles.cardIconBoxFinance}>
                                    <Text style={styles.cardIconText}>💼</Text>
                                </View>
                                <View style={styles.cardHeaderTitleWrap}>
                                    <Text style={styles.cardSuperTitle}>PILAR ECONOMÍA</Text>
                                    <Text style={styles.cardTitle}>Balance Financiero Mensual</Text>
                                </View>
                                <View style={styles.badgeWrap}>
                                    <Text style={styles.badgeText}>
                                        {financialData.savingsRate >= 0 ? `+${financialData.savingsRate}% Ahorro` : 'Déficit'}
                                    </Text>
                                </View>
                            </View>

                            <View style={styles.netBalanceRow}>
                                <View>
                                    <Text style={styles.netBalanceLabel}>Flujo de Caja Neto</Text>
                                    <Text style={[
                                        styles.netBalanceValue,
                                        { color: financialData.netBalance >= 0 ? '#10b981' : '#ef4444' }
                                    ]}>
                                        {financialData.netBalance >= 0 ? '+' : ''}{formatCurrency(financialData.netBalance)}
                                    </Text>
                                </View>
                                <View style={styles.metricItemRight}>
                                    <Text style={styles.metricSubLabel}>Integración Trabajo</Text>
                                    <Text style={styles.integratedTag}>Auto-Calculado</Text>
                                </View>
                            </View>

                            <View style={styles.divider} />

                            <View style={styles.multiMetricGrid}>
                                <View style={styles.metricColumn}>
                                    <Text style={styles.subMetricLabel}>Ingresos Consolidados</Text>
                                    <Text style={[styles.subMetricValue, { color: '#10b981' }]}>
                                        +{formatCurrency(financialData.monthlyIncome)}
                                    </Text>
                                    <Text style={styles.microLegend}>Jornadas + Facturas</Text>
                                </View>
                                <View style={styles.verticalDivider} />
                                <View style={styles.metricColumn}>
                                    <Text style={styles.subMetricLabel}>Gastos Totales</Text>
                                    <Text style={[styles.subMetricValue, { color: '#ef4444' }]}>
                                        -{formatCurrency(financialData.monthlyExpenses)}
                                    </Text>
                                    <Text style={styles.microLegend}>Fijos + Variables</Text>
                                </View>
                            </View>
                        </View>

                        {/* WIDGET 2: BALANCE CALÓRICO DE HOY (Pilar Salud / Físico) */}
                        <View style={[styles.card, styles.healthCard]}>
                            <View style={styles.cardHeader}>
                                <View style={styles.cardIconBoxHealth}>
                                    <Text style={styles.cardIconText}>⚡</Text>
                                </View>
                                <View style={styles.cardHeaderTitleWrap}>
                                    <Text style={styles.cardSuperTitle}>PILAR SALUD & FÍSICO</Text>
                                    <Text style={styles.cardTitle}>Balance Calórico Diario</Text>
                                </View>
                                <View style={[styles.badgeWrap, { backgroundColor: 'rgba(245, 158, 11, 0.15)' }]}>
                                    <Text style={[styles.badgeText, { color: '#fbbf24' }]}>
                                        {nutritionData.netKcal >= 0 ? `${nutritionData.netKcal} kcal disp.` : 'Superávit'}
                                    </Text>
                                </View>
                            </View>

                            {/* Barra de progreso calórico */}
                            <View style={styles.calorieProgressSection}>
                                <View style={styles.calorieRow}>
                                    <Text style={styles.bigCalorieText}>
                                        {nutritionData.kcalConsumed}
                                        <Text style={styles.smallCalorieUnit}> / {nutritionData.kcalTarget + nutritionData.kcalBurned} kcal</Text>
                                    </Text>
                                    <Text style={styles.calorieBurnedTag}>
                                        🔥 +{nutritionData.kcalBurned} quemadas
                                    </Text>
                                </View>

                                <View style={styles.progressBarTrack}>
                                    <View
                                        style={[
                                            styles.progressBarFill,
                                            {
                                                width: `${Math.min(
                                                    100,
                                                    ((nutritionData.kcalConsumed) /
                                                        (nutritionData.kcalTarget + nutritionData.kcalBurned || 1)) * 100
                                                )}%`,
                                                backgroundColor: nutritionData.netKcal >= 0 ? '#f59e0b' : '#ef4444',
                                            },
                                        ]}
                                    />
                                </View>
                            </View>

                            {/* Desglose de Macronutrientes (Comida Tradicional) */}
                            <View style={styles.macrosContainer}>
                                <View style={styles.macroPill}>
                                    <Text style={styles.macroPillLabel}>PROTEÍNA</Text>
                                    <Text style={styles.macroPillValue}>{nutritionData.protein}g</Text>
                                </View>
                                <View style={styles.macroPill}>
                                    <Text style={styles.macroPillLabel}>CARBOS</Text>
                                    <Text style={styles.macroPillValue}>{nutritionData.carbs}g</Text>
                                </View>
                                <View style={styles.macroPill}>
                                    <Text style={styles.macroPillLabel}>GRASAS</Text>
                                    <Text style={styles.macroPillValue}>{nutritionData.fats}g</Text>
                                </View>
                            </View>
                        </View>

                        {/* WIDGET 3: HORAS TRABAJADAS EN LA SEMANA (Pilar Trabajo / Productividad) */}
                        <View style={[styles.card, styles.workCard]}>
                            <View style={styles.cardHeader}>
                                <View style={styles.cardIconBoxWork}>
                                    <Text style={styles.cardIconText}>⏱️</Text>
                                </View>
                                <View style={styles.cardHeaderTitleWrap}>
                                    <Text style={styles.cardSuperTitle}>PILAR TRABAJO</Text>
                                    <Text style={styles.cardTitle}>Rendimiento Semanal</Text>
                                </View>
                                <View style={[styles.badgeWrap, { backgroundColor: 'rgba(6, 182, 212, 0.15)' }]}>
                                    <Text style={[styles.badgeText, { color: '#38bdf8' }]}>
                                        {Math.round((workData.weeklyHours / workData.weeklyGoalHours) * 100)}% Meta
                                    </Text>
                                </View>
                            </View>

                            <View style={styles.workMetricsRow}>
                                <View>
                                    <Text style={styles.subMetricLabel}>Horas Dedicadas</Text>
                                    <Text style={styles.workHoursMain}>
                                        {formatHours(workData.weeklyHours)}
                                        <Text style={styles.workHoursGoal}> / {formatHours(workData.weeklyGoalHours)}</Text>
                                    </Text>
                                </View>

                                <View style={styles.metricItemRight}>
                                    <Text style={styles.subMetricLabel}>Ingreso Generado</Text>
                                    <Text style={styles.workIncomeValue}>
                                        +{formatCurrency(workData.weeklyIncome)}
                                    </Text>
                                    <Text style={styles.microRateLegend}>
                                        {workData.avgHourlyRate > 0 ? `~${workData.avgHourlyRate}€/hora` : 'Tarifa activa'}
                                    </Text>
                                </View>
                            </View>

                            {/* Barra de progreso semanal */}
                            <View style={styles.progressBarTrack}>
                                <View
                                    style={[
                                        styles.progressBarFill,
                                        {
                                            width: `${Math.min(100, (workData.weeklyHours / workData.weeklyGoalHours) * 100)}%`,
                                            backgroundColor: '#06b6d4',
                                        },
                                    ]}
                                />
                            </View>
                        </View>

                        {/* SECCIÓN "EL CEREBRO": MOTOR DE RECOMENDACIÓN ANALÍTICO */}
                        <View style={[styles.card, styles.brainCard]}>
                            <View style={styles.brainHeader}>
                                <View style={styles.brainIconBox}>
                                    <Text style={styles.cardIconText}>🧠</Text>
                                </View>
                                <View style={styles.cardHeaderTitleWrap}>
                                    <Text style={styles.brainSuperTitle}>SISTEMA NERVIOSO CENTRAL</Text>
                                    <Text style={styles.brainTitle}>El Cerebro // Insights Transversales</Text>
                                </View>
                            </View>

                            <Text style={styles.brainDescription}>
                                Evaluación cruzada en tiempo real entre tus finanzas, desgaste físico y horas de producción.
                            </Text>

                            <View style={styles.insightsList}>
                                {insights.map((item) => (
                                    <View
                                        key={item.id}
                                        style={[styles.insightItem, { borderLeftColor: item.accentColor }]}
                                    >
                                        <View style={styles.insightTagWrap}>
                                            <Text style={[styles.insightTag, { color: item.accentColor }]}>
                                                {item.tag}
                                            </Text>
                                        </View>
                                        <Text style={styles.insightTitle}>{item.title}</Text>
                                        <Text style={styles.insightMessage}>{item.message}</Text>
                                    </View>
                                ))}

                                {insights.length === 0 && (
                                    <View style={styles.emptyInsightBox}>
                                        <Text style={styles.emptyInsightText}>
                                            Sin desequilibrios detectados. Tus 3 pilares se encuentran en sincronía matemática.
                                        </Text>
                                    </View>
                                )}
                            </View>
                        </View>

                        {/* One-Tap Fast Actions Bar */}
                        <View style={styles.fastActionsSection}>
                            <Text style={styles.fastActionsTitle}>ENTRADA RÁPIDA 1-TAP</Text>
                            <View style={styles.actionButtonsRow}>
                                <TouchableOpacity
                                    style={styles.actionButton}
                                    activeOpacity={0.7}
                                    onPress={() => onNavigate && onNavigate('work')}
                                >
                                    <Text style={styles.actionButtonIcon}>⏱️</Text>
                                    <Text style={styles.actionButtonText}>Jornada</Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={styles.actionButton}
                                    activeOpacity={0.7}
                                    onPress={() => onNavigate && onNavigate('meal')}
                                >
                                    <Text style={styles.actionButtonIcon}>🥩</Text>
                                    <Text style={styles.actionButtonText}>Comida</Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={styles.actionButton}
                                    activeOpacity={0.7}
                                    onPress={() => onNavigate && onNavigate('workout')}
                                >
                                    <Text style={styles.actionButtonIcon}>🏋️‍♂️</Text>
                                    <Text style={styles.actionButtonText}>Fuerza</Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={styles.actionButton}
                                    activeOpacity={0.7}
                                    onPress={() => onNavigate && onNavigate('finance')}
                                >
                                    <Text style={styles.actionButtonIcon}>💳</Text>
                                    <Text style={styles.actionButtonText}>Gasto/Ing.</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </>
                )}
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
        alignItems: 'flex-start',
        marginBottom: 20,
    },
    headerTag: {
        color: '#71717a',
        fontSize: 11,
        fontWeight: '800',
        letterSpacing: 1.2,
    },
    headerDate: {
        color: '#f4f4f5',
        fontSize: 22,
        fontWeight: '900',
        letterSpacing: -0.5,
        marginTop: 2,
    },
    liveIndicator: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(6, 182, 212, 0.12)',
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: 'rgba(6, 182, 212, 0.25)',
    },
    liveDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: '#06b6d4',
        marginRight: 6,
    },
    liveText: {
        color: '#06b6d4',
        fontSize: 10,
        fontWeight: '800',
        letterSpacing: 0.8,
    },
    loadingContainer: {
        paddingVertical: 60,
        alignItems: 'center',
    },
    loadingText: {
        color: '#a1a1aa',
        marginTop: 12,
        fontSize: 13,
    },

    // Tarjeta Base (Dashboard Ejecutivo)
    card: {
        backgroundColor: '#0a0a0c',
        borderRadius: 16,
        padding: 18,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#1f1f23',
    },
    financeCard: {
        borderColor: 'rgba(16, 185, 129, 0.25)',
    },
    healthCard: {
        borderColor: 'rgba(245, 158, 11, 0.25)',
    },
    workCard: {
        borderColor: 'rgba(6, 182, 212, 0.25)',
    },
    brainCard: {
        backgroundColor: '#0e0b16',
        borderColor: 'rgba(168, 85, 247, 0.35)',
        marginTop: 6,
    },

    // Cabecera de Widget
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 14,
    },
    cardIconBoxFinance: {
        width: 36,
        height: 36,
        borderRadius: 10,
        backgroundColor: 'rgba(16, 185, 129, 0.15)',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 10,
    },
    cardIconBoxHealth: {
        width: 36,
        height: 36,
        borderRadius: 10,
        backgroundColor: 'rgba(245, 158, 11, 0.15)',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 10,
    },
    cardIconBoxWork: {
        width: 36,
        height: 36,
        borderRadius: 10,
        backgroundColor: 'rgba(6, 182, 212, 0.15)',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 10,
    },
    cardIconText: {
        fontSize: 17,
    },
    cardHeaderTitleWrap: {
        flex: 1,
    },
    cardSuperTitle: {
        color: '#71717a',
        fontSize: 10,
        fontWeight: '800',
        letterSpacing: 1,
    },
    cardTitle: {
        color: '#f4f4f5',
        fontSize: 16,
        fontWeight: '700',
    },
    badgeWrap: {
        backgroundColor: 'rgba(16, 185, 129, 0.12)',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: 'rgba(16, 185, 129, 0.25)',
    },
    badgeText: {
        color: '#34d399',
        fontSize: 11,
        fontWeight: '700',
    },

    // Sub-bloques Financieros
    netBalanceRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-end',
        marginVertical: 4,
    },
    netBalanceLabel: {
        color: '#a1a1aa',
        fontSize: 12,
        fontWeight: '500',
        marginBottom: 2,
    },
    netBalanceValue: {
        fontSize: 28,
        fontWeight: '900',
        letterSpacing: -0.5,
    },
    metricItemRight: {
        alignItems: 'flex-end',
    },
    metricSubLabel: {
        color: '#71717a',
        fontSize: 11,
        fontWeight: '600',
    },
    integratedTag: {
        color: '#06b6d4',
        fontSize: 11,
        fontWeight: '700',
        marginTop: 2,
    },
    divider: {
        height: 1,
        backgroundColor: '#1f1f23',
        marginVertical: 14,
    },
    verticalDivider: {
        width: 1,
        backgroundColor: '#1f1f23',
        marginHorizontal: 12,
    },
    multiMetricGrid: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    metricColumn: {
        flex: 1,
    },
    subMetricLabel: {
        color: '#a1a1aa',
        fontSize: 11,
        fontWeight: '500',
        marginBottom: 4,
    },
    subMetricValue: {
        fontSize: 16,
        fontWeight: '800',
    },
    microLegend: {
        color: '#52525b',
        fontSize: 10,
        fontWeight: '500',
        marginTop: 2,
    },

    // Sub-bloques Salud
    calorieProgressSection: {
        marginBottom: 14,
    },
    calorieRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'baseline',
        marginBottom: 8,
    },
    bigCalorieText: {
        color: '#f4f4f5',
        fontSize: 24,
        fontWeight: '900',
    },
    smallCalorieUnit: {
        color: '#71717a',
        fontSize: 13,
        fontWeight: '500',
    },
    calorieBurnedTag: {
        color: '#fb923c',
        fontSize: 12,
        fontWeight: '700',
    },
    progressBarTrack: {
        height: 6,
        backgroundColor: '#1c1c20',
        borderRadius: 4,
        overflow: 'hidden',
    },
    progressBarFill: {
        height: '100%',
        borderRadius: 4,
    },
    macrosContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 10,
    },
    macroPill: {
        flex: 1,
        backgroundColor: '#141418',
        paddingVertical: 8,
        paddingHorizontal: 10,
        borderRadius: 10,
        alignItems: 'center',
        marginHorizontal: 3,
        borderWidth: 1,
        borderColor: '#22222a',
    },
    macroPillLabel: {
        color: '#71717a',
        fontSize: 9,
        fontWeight: '800',
        letterSpacing: 0.8,
        marginBottom: 2,
    },
    macroPillValue: {
        color: '#f4f4f5',
        fontSize: 13,
        fontWeight: '800',
    },

    // Sub-bloques Trabajo
    workMetricsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-end',
        marginBottom: 12,
    },
    workHoursMain: {
        color: '#f4f4f5',
        fontSize: 26,
        fontWeight: '900',
        marginTop: 2,
    },
    workHoursGoal: {
        color: '#71717a',
        fontSize: 14,
        fontWeight: '500',
    },
    workIncomeValue: {
        color: '#06b6d4',
        fontSize: 18,
        fontWeight: '800',
    },
    microRateLegend: {
        color: '#71717a',
        fontSize: 10,
        fontWeight: '600',
        marginTop: 1,
    },

    // El Cerebro
    brainHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    brainIconBox: {
        width: 36,
        height: 36,
        borderRadius: 10,
        backgroundColor: 'rgba(168, 85, 247, 0.15)',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 10,
    },
    brainSuperTitle: {
        color: '#a855f7',
        fontSize: 10,
        fontWeight: '800',
        letterSpacing: 1.2,
    },
    brainTitle: {
        color: '#f4f4f5',
        fontSize: 16,
        fontWeight: '700',
    },
    brainDescription: {
        color: '#a1a1aa',
        fontSize: 12,
        lineHeight: 16,
        marginBottom: 14,
    },
    insightsList: {
        gap: 10,
    },
    insightItem: {
        backgroundColor: '#141120',
        borderRadius: 10,
        padding: 12,
        borderLeftWidth: 3,
        borderWidth: 1,
        borderColor: '#241b38',
    },
    insightTagWrap: {
        marginBottom: 4,
    },
    insightTag: {
        fontSize: 9,
        fontWeight: '800',
        letterSpacing: 0.8,
    },
    insightTitle: {
        color: '#f4f4f5',
        fontSize: 13,
        fontWeight: '700',
        marginBottom: 4,
    },
    insightMessage: {
        color: '#d4d4d8',
        fontSize: 12,
        lineHeight: 17,
    },
    emptyInsightBox: {
        padding: 12,
        alignItems: 'center',
    },
    emptyInsightText: {
        color: '#71717a',
        fontSize: 12,
        fontStyle: 'italic',
    },

    // Fast 1-Tap Entry
    fastActionsSection: {
        marginTop: 6,
    },
    fastActionsTitle: {
        color: '#71717a',
        fontSize: 10,
        fontWeight: '800',
        letterSpacing: 1.2,
        marginBottom: 10,
    },
    actionButtonsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: 8,
    },
    actionButton: {
        flex: 1,
        backgroundColor: '#121216',
        borderRadius: 12,
        paddingVertical: 12,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#22222a',
    },
    actionButtonIcon: {
        fontSize: 18,
        marginBottom: 4,
    },
    actionButtonText: {
        color: '#e4e4e7',
        fontSize: 11,
        fontWeight: '700',
    },
});

