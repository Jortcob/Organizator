import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    TextInput,
    Alert,
    ActivityIndicator,
    Modal,
} from 'react-native';
import { supabase } from './supabase';

// Ejercicios de fuerza tradicionales predeterminados
const DEFAULT_EXERCISES = [
    { id: 'ex-1', nombre: 'Press de Banca Plano', grupo_muscular: 'Pecho', descanso_segundos: 120 },
    { id: 'ex-2', nombre: 'Sentadilla Trasera con Barra', grupo_muscular: 'Pierna', descanso_segundos: 180 },
    { id: 'ex-3', nombre: 'Peso Muerto Convencional / Rumano', grupo_muscular: 'Espalda / Isquios', descanso_segundos: 180 },
    { id: 'ex-4', nombre: 'Press Militar de Hombro con Barra', grupo_muscular: 'Hombro', descanso_segundos: 120 },
    { id: 'ex-5', nombre: 'Remo con Barra 90º / 45º', grupo_muscular: 'Espalda', descanso_segundos: 90 },
    { id: 'ex-6', nombre: 'Dominadas con Lastre / Libres', grupo_muscular: 'Espalda', descanso_segundos: 120 },
    { id: 'ex-7', nombre: 'Fondos en Paralelas con Lastre', grupo_muscular: 'Pecho / Tríceps', descanso_segundos: 90 },
    { id: 'ex-8', nombre: 'Prensa de Piernas Inclinada', grupo_muscular: 'Pierna', descanso_segundos: 120 },
];

export default function WorkoutScreen({ onNavigate }) {
    const [userId, setUserId] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // Estado del Entrenamiento Activo
    const [workoutActive, setWorkoutActive] = useState(false);
    const [workoutStartTime, setWorkoutStartTime] = useState(null);
    const [elapsedSeconds, setElapsedSeconds] = useState(0);

    // Temporizador de Descanso entre series
    const [restSeconds, setRestSeconds] = useState(0);
    const [restActive, setRestActive] = useState(false);

    // Lista de Ejercicios en la sesión activa
    const [activeExercises, setActiveExercises] = useState([
        {
            exerciseId: 'ex-1',
            nombre: 'Press de Banca Plano',
            grupo_muscular: 'Pecho',
            descanso_segundos: 120,
            sets: [
                { id: 's-1', serie_numero: 1, reps: 8, peso: 80, completado: false },
                { id: 's-2', serie_numero: 2, reps: 8, peso: 80, completado: false },
                { id: 's-3', serie_numero: 3, reps: 6, peso: 85, completado: false },
            ],
        },
        {
            exerciseId: 'ex-5',
            nombre: 'Remo con Barra 90º / 45º',
            grupo_muscular: 'Espalda',
            descanso_segundos: 90,
            sets: [
                { id: 's-4', serie_numero: 1, reps: 10, peso: 70, completado: false },
                { id: 's-5', serie_numero: 2, reps: 10, peso: 70, completado: false },
                { id: 's-6', serie_numero: 3, reps: 8, peso: 75, completado: false },
            ],
        },
    ]);

    // Modal para agregar nuevo ejercicio
    const [addExerciseModalVisible, setAddExerciseModalVisible] = useState(false);

    // Historial de entrenamientos anteriores
    const [workoutHistory, setWorkoutHistory] = useState([]);

    const workoutTimerRef = useRef(null);
    const restTimerRef = useRef(null);

    // Cronómetro general de la sesión
    useEffect(() => {
        if (workoutActive) {
            workoutTimerRef.current = setInterval(() => {
                setElapsedSeconds((prev) => prev + 1);
            }, 1000);
        } else {
            if (workoutTimerRef.current) clearInterval(workoutTimerRef.current);
        }
        return () => {
            if (workoutTimerRef.current) clearInterval(workoutTimerRef.current);
        };
    }, [workoutActive]);

    // Cronómetro regresivo de descanso
    useEffect(() => {
        if (restActive && restSeconds > 0) {
            restTimerRef.current = setInterval(() => {
                setRestSeconds((prev) => {
                    if (prev <= 1) {
                        clearInterval(restTimerRef.current);
                        setRestActive(false);
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
        } else {
            if (restTimerRef.current) clearInterval(restTimerRef.current);
        }
        return () => {
            if (restTimerRef.current) clearInterval(restTimerRef.current);
        };
    }, [restActive, restSeconds]);

    // Cargar historial de entrenamientos desde Supabase
    const fetchWorkoutHistory = useCallback(async () => {
        try {
            setLoading(true);
            const { data: { user } } = await supabase.auth.getUser();
            const currentUserId = user?.id || null;
            setUserId(currentUserId);

            if (!currentUserId) {
                // Demo history
                setWorkoutHistory([
                    {
                        id: 'demo-wkout-1',
                        fecha: new Date().toISOString().split('T')[0],
                        duracion_minutos: 62,
                        gasto_calorico: 485,
                        tipo_entrenamiento: 'Fuerza // Torso Pesado',
                        tonelaje: 8420,
                        series_totales: 16,
                    },
                    {
                        id: 'demo-wkout-2',
                        fecha: new Date(Date.now() - 86400000 * 2).toISOString().split('T')[0],
                        duracion_minutos: 55,
                        gasto_calorico: 520,
                        tipo_entrenamiento: 'Fuerza // Pierna & Cadena Post.',
                        tonelaje: 11200,
                        series_totales: 14,
                    },
                ]);
                return;
            }

            const { data, error } = await supabase
                .from('entrenamientos')
                .select('*')
                .eq('user_id', currentUserId)
                .order('fecha', { ascending: false })
                .limit(10);

            if (error) throw error;
            setWorkoutHistory(data || []);
        } catch (error) {
            console.error('Error cargando entrenamientos:', error.message);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchWorkoutHistory();
    }, [fetchWorkoutHistory]);

    // FÓRMULA MATEMÁTICA DEL MOTOR DE GASTO CALÓRICO DINÁMICO
    // Basada en:
    // 1. Tonelaje Total Levantado (Volumen Mecánico = sum(peso * reps))
    // 2. Esfuerzo Anaeróbico de Alta Intensidad (Costo metabólico por serie)
    // 3. Duración de Sesión y EPOC (Excess Post-exercise Oxygen Consumption)
    const stats = useMemo(() => {
        let totalTonnage = 0;
        let completedSets = 0;
        let totalSets = 0;

        activeExercises.forEach((ex) => {
            ex.sets.forEach((s) => {
                totalSets++;
                if (s.completado) {
                    completedSets++;
                    const w = parseFloat(s.peso) || 0;
                    const r = parseInt(s.reps, 10) || 0;
                    totalTonnage += w * r;
                }
            });
        });

        const durationMinutes = Math.max(1, Math.floor(elapsedSeconds / 60));

        // Coeficientes biomecánicos:
        // - 0.045 kcal por kg de tonelaje acumulado
        // - 4.5 kcal metabólicas por serie de fuerza completada
        // - 2.8 kcal/min por costo base basal + EPOC
        const mechanicalBurn = totalTonnage * 0.045;
        const setIntensityBurn = completedSets * 4.5;
        const epocBurn = durationMinutes * 2.8;

        const calculatedKcal = Math.round(mechanicalBurn + setIntensityBurn + (workoutActive ? epocBurn : 0));

        return {
            totalTonnage: Math.round(totalTonnage),
            completedSets,
            totalSets,
            durationMinutes,
            calculatedKcal,
        };
    }, [activeExercises, elapsedSeconds, workoutActive]);

    // Iniciar Sesión de Entrenamiento
    const handleStartWorkout = () => {
        setWorkoutStartTime(new Date());
        setWorkoutActive(true);
        setElapsedSeconds(0);
    };

    // Toggle para marcar serie completada
    const handleToggleSet = (exerciseIndex, setIndex) => {
        setActiveExercises((prev) => {
            const next = [...prev];
            const currentExercise = { ...next[exerciseIndex] };
            const currentSets = [...currentExercise.sets];
            const targetSet = { ...currentSets[setIndex] };

            const willComplete = !targetSet.completado;
            targetSet.completado = willComplete;
            currentSets[setIndex] = targetSet;
            currentExercise.sets = currentSets;
            next[exerciseIndex] = currentExercise;

            // Si se acaba de completar, disparar temporizador de descanso
            if (willComplete) {
                const restTime = currentExercise.descanso_segundos || 90;
                setRestSeconds(restTime);
                setRestActive(true);
            }

            return next;
        });
    };

    // Actualizar valor de repeticiones o peso de una serie
    const handleUpdateSet = (exerciseIndex, setIndex, field, value) => {
        setActiveExercises((prev) => {
            const next = [...prev];
            const currentExercise = { ...next[exerciseIndex] };
            const currentSets = [...currentExercise.sets];
            currentSets[setIndex] = {
                ...currentSets[setIndex],
                [field]: value,
            };
            currentExercise.sets = currentSets;
            next[exerciseIndex] = currentExercise;
            return next;
        });
    };

    // Añadir una nueva serie al ejercicio
    const handleAddSet = (exerciseIndex) => {
        setActiveExercises((prev) => {
            const next = [...prev];
            const currentExercise = { ...next[exerciseIndex] };
            const currentSets = [...currentExercise.sets];
            const lastSet = currentSets[currentSets.length - 1] || { reps: 8, peso: 60 };

            currentSets.push({
                id: `s-${Date.now()}`,
                serie_numero: currentSets.length + 1,
                reps: lastSet.reps,
                peso: lastSet.peso,
                completado: false,
            });

            currentExercise.sets = currentSets;
            next[exerciseIndex] = currentExercise;
            return next;
        });
    };

    // Añadir ejercicio desde el catálogo
    const handleSelectExercise = (ex) => {
        setActiveExercises((prev) => [
            ...prev,
            {
                exerciseId: ex.id,
                nombre: ex.nombre,
                grupo_muscular: ex.grupo_muscular,
                descanso_segundos: ex.descanso_segundos || 120,
                sets: [
                    { id: `s-${Date.now()}-1`, serie_numero: 1, reps: 8, peso: 60, completado: false },
                    { id: `s-${Date.now()}-2`, serie_numero: 2, reps: 8, peso: 60, completado: false },
                    { id: `s-${Date.now()}-3`, serie_numero: 3, reps: 8, peso: 60, completado: false },
                ],
            },
        ]);
        setAddExerciseModalVisible(false);
    };

    // Finalizar y guardar sesión en Supabase
    const handleFinishWorkout = async () => {
        if (stats.completedSets === 0) {
            Alert.alert('Atención', 'No has completado ninguna serie de fuerza todavía.');
            return;
        }

        try {
            setSaving(true);
            const now = new Date();
            const dateStr = now.toISOString().split('T')[0];
            const startTimeStr = workoutStartTime
                ? workoutStartTime.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
                : now.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });

            const workoutPayload = {
                user_id: userId,
                fecha: dateStr,
                hora_inicio: startTimeStr,
                duracion_minutos: stats.durationMinutes,
                gasto_calorico: stats.calculatedKcal,
                tipo_entrenamiento: 'Fuerza // Sobrecarga Progresiva',
            };

            if (userId) {
                // 1. Guardar en tabla `entrenamientos`
                const { data: insertedWorkout, error: wkError } = await supabase
                    .from('entrenamientos')
                    .insert([workoutPayload])
                    .select()
                    .single();

                if (wkError) throw wkError;

                // 2. Guardar las series completadas en `series_entrenamiento`
                const seriesPayload = [];
                activeExercises.forEach((ex) => {
                    ex.sets.forEach((s) => {
                        if (s.completado) {
                            seriesPayload.push({
                                entrenamiento_id: insertedWorkout.id,
                                ejercicio_id: ex.exerciseId.startsWith('ex-') ? null : ex.exerciseId,
                                serie_numero: s.serie_numero,
                                repeticiones_reales: parseInt(s.reps, 10) || 0,
                                peso_real: parseFloat(s.peso) || 0,
                                completado: true,
                            });
                        }
                    });
                });

                if (seriesPayload.length > 0) {
                    await supabase.from('series_entrenamiento').insert(seriesPayload);
                }

                setWorkoutHistory((prev) => [
                    {
                        ...insertedWorkout,
                        tonelaje: stats.totalTonnage,
                        series_totales: stats.completedSets,
                    },
                    ...prev,
                ]);
            } else {
                const demoEntry = {
                    id: `demo-${Date.now()}`,
                    ...workoutPayload,
                    tonelaje: stats.totalTonnage,
                    series_totales: stats.completedSets,
                };
                setWorkoutHistory((prev) => [demoEntry, ...prev]);
            }

            Alert.alert(
                'Entrenamiento Liquidado 🏋️‍♂️',
                `Tonelaje movido: ${stats.totalTonnage.toLocaleString('es-ES')} kg.\nGasto calórico extra: +${stats.calculatedKcal} kcal.\nSincronizado automáticamente con tu balance del Dashboard.`
            );

            // Reiniciar sesión activa
            setWorkoutActive(false);
            setElapsedSeconds(0);
            setRestActive(false);
            setRestSeconds(0);
        } catch (error) {
            Alert.alert('Error al guardar entrenamiento', error.message);
        } finally {
            setSaving(false);
        }
    };

    const formatTimer = (secs) => {
        const m = Math.floor(secs / 60);
        const s = secs % 60;
        return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    };

    return (
        <View style={styles.container}>
            <ScrollView contentContainerStyle={styles.scrollContent}>
                {/* Cabecera */}
                <View style={styles.header}>
                    <View>
                        <Text style={styles.superTitle}>PILAR SALUD & FÍSICO</Text>
                        <Text style={styles.mainTitle}>Rutina de Fuerza</Text>
                    </View>
                    <View style={styles.badgeWrap}>
                        <Text style={styles.badgeText}>HIPERTROFIA & TONELAJE</Text>
                    </View>
                </View>

                {/* KPI LIVE CARD: TONELAJE, CALORÍAS Y TIEMPO */}
                <View style={styles.kpiPanel}>
                    <View style={styles.kpiCol}>
                        <Text style={styles.kpiLabel}>TONELAJE</Text>
                        <Text style={styles.kpiValueRed}>{stats.totalTonnage} kg</Text>
                        <Text style={styles.kpiSub}>Volumen Levantado</Text>
                    </View>
                    <View style={styles.kpiDivider} />
                    <View style={styles.kpiCol}>
                        <Text style={styles.kpiLabel}>GASTO DINÁMICO</Text>
                        <Text style={styles.kpiValueOrange}>+{stats.calculatedKcal} kcal</Text>
                        <Text style={styles.kpiSub}>Cálculo Mecánico</Text>
                    </View>
                    <View style={styles.kpiDivider} />
                    <View style={styles.kpiCol}>
                        <Text style={styles.kpiLabel}>DURACIÓN</Text>
                        <Text style={styles.kpiValueWhite}>
                            {workoutActive ? formatTimer(elapsedSeconds) : '00:00'}
                        </Text>
                        <Text style={styles.kpiSub}>
                            {stats.completedSets}/{stats.totalSets} Series
                        </Text>
                    </View>
                </View>

                {/* TEMPORIZADOR DE DESCANSO TÁCTICO */}
                {restActive && (
                    <View style={styles.restBanner}>
                        <View style={styles.restLeft}>
                            <Text style={styles.restSuper}>INTERVALO DE DESCANSO</Text>
                            <Text style={styles.restTimerText}>{formatTimer(restSeconds)}</Text>
                        </View>
                        <TouchableOpacity
                            style={styles.skipRestBtn}
                            onPress={() => {
                                setRestActive(false);
                                setRestSeconds(0);
                            }}
                        >
                            <Text style={styles.skipRestText}>Omitir</Text>
                        </TouchableOpacity>
                    </View>
                )}

                {/* BOTÓN CONTROL DE SESIÓN (Iniciar / Finalizar) */}
                {!workoutActive ? (
                    <TouchableOpacity
                        style={styles.startWorkoutBtn}
                        activeOpacity={0.8}
                        onPress={handleStartWorkout}
                    >
                        <Text style={styles.startWorkoutBtnIcon}>▶</Text>
                        <Text style={styles.startWorkoutBtnText}>INICIAR SESIÓN DE FUERZA</Text>
                    </TouchableOpacity>
                ) : (
                    <TouchableOpacity
                        style={styles.finishWorkoutBtn}
                        activeOpacity={0.8}
                        onPress={handleFinishWorkout}
                        disabled={saving}
                    >
                        {saving ? (
                            <ActivityIndicator color="#ffffff" />
                        ) : (
                            <>
                                <Text style={styles.finishWorkoutBtnIcon}>■</Text>
                                <Text style={styles.finishWorkoutBtnText}>
                                    FINALIZAR SESIÓN // COMPUTAR GASTO
                                </Text>
                            </>
                        )}
                    </TouchableOpacity>
                )}

                {/* LISTA DE EJERCICIOS Y SERIES */}
                <View style={styles.exercisesSection}>
                    <View style={styles.exercisesSectionHeader}>
                        <Text style={styles.sectionHeaderTitle}>EJERCICIOS ACTIVOS</Text>
                        <TouchableOpacity
                            style={styles.addExerciseBtn}
                            onPress={() => setAddExerciseModalVisible(true)}
                        >
                            <Text style={styles.addExerciseBtnText}>+ Ejercicio</Text>
                        </TouchableOpacity>
                    </View>

                    {activeExercises.map((ex, exIdx) => (
                        <View key={ex.exerciseId + exIdx} style={styles.exerciseCard}>
                            <View style={styles.exerciseCardHeader}>
                                <View>
                                    <Text style={styles.exerciseMuscleTag}>{ex.grupo_muscular}</Text>
                                    <Text style={styles.exerciseName}>{ex.nombre}</Text>
                                </View>
                                <Text style={styles.exerciseRestInfo}>
                                    ⏱️ {ex.descanso_segundos}s descanso
                                </Text>
                            </View>

                            {/* Cabecera de Tabla de Series */}
                            <View style={styles.setTableHeader}>
                                <Text style={[styles.setTableColHeader, { width: 44 }]}>SET</Text>
                                <Text style={[styles.setTableColHeader, { flex: 1, textAlign: 'center' }]}>PESO (KG)</Text>
                                <Text style={[styles.setTableColHeader, { flex: 1, textAlign: 'center' }]}>REPS</Text>
                                <Text style={[styles.setTableColHeader, { width: 50, textAlign: 'right' }]}>CHECK</Text>
                            </View>

                            {/* Filas de Series */}
                            {ex.sets.map((set, setIdx) => (
                                <View
                                    key={set.id}
                                    style={[
                                        styles.setRow,
                                        set.completado && styles.setRowCompleted,
                                    ]}
                                >
                                    <Text style={styles.setNumber}>{set.serie_numero}</Text>

                                    <View style={styles.setInputBox}>
                                        <TextInput
                                            style={[styles.setTextInput, set.completado && styles.setTextInputDone]}
                                            keyboardType="numeric"
                                            value={String(set.peso)}
                                            onChangeText={(v) => handleUpdateSet(exIdx, setIdx, 'peso', v)}
                                            editable={!set.completado}
                                        />
                                    </View>

                                    <View style={styles.setInputBox}>
                                        <TextInput
                                            style={[styles.setTextInput, set.completado && styles.setTextInputDone]}
                                            keyboardType="numeric"
                                            value={String(set.reps)}
                                            onChangeText={(v) => handleUpdateSet(exIdx, setIdx, 'reps', v)}
                                            editable={!set.completado}
                                        />
                                    </View>

                                    <TouchableOpacity
                                        style={[
                                            styles.checkSetBtn,
                                            set.completado && styles.checkSetBtnDone,
                                        ]}
                                        onPress={() => handleToggleSet(exIdx, setIdx)}
                                    >
                                        <Text style={styles.checkSetBtnIcon}>
                                            {set.completado ? '✓' : ''}
                                        </Text>
                                    </TouchableOpacity>
                                </View>
                            ))}

                            {/* Añadir Serie al Ejercicio */}
                            <TouchableOpacity
                                style={styles.addSetBtn}
                                onPress={() => handleAddSet(exIdx)}
                            >
                                <Text style={styles.addSetBtnText}>+ Añadir Serie</Text>
                            </TouchableOpacity>
                        </View>
                    ))}
                </View>

                {/* HISTORIAL RECIENTE */}
                <View style={styles.historySection}>
                    <Text style={styles.historyTitle}>ENTRENAMIENTOS PREVIOS</Text>

                    {loading ? (
                        <ActivityIndicator color="#ef4444" style={{ marginTop: 16 }} />
                    ) : workoutHistory.length === 0 ? (
                        <View style={styles.emptyCard}>
                            <Text style={styles.emptyCardText}>No hay entrenamientos archivados.</Text>
                        </View>
                    ) : (
                        workoutHistory.map((w) => (
                            <View key={w.id} style={styles.historyCard}>
                                <View>
                                    <Text style={styles.historyCardType}>
                                        {w.tipo_entrenamiento || 'Fuerza'}
                                    </Text>
                                    <Text style={styles.historyCardMeta}>
                                        {w.fecha} • {w.duracion_minutos} min de sesión
                                    </Text>
                                </View>
                                <View style={styles.historyRight}>
                                    <Text style={styles.historyKcal}>+{w.gasto_calorico} kcal</Text>
                                    {w.tonelaje && (
                                        <Text style={styles.historyTonnage}>{w.tonelaje} kg vol.</Text>
                                    )}
                                </View>
                            </View>
                        ))
                    )}
                </View>
            </ScrollView>

            {/* MODAL PARA AGREGAR EJERCICIO DEL CATÁLOGO */}
            <Modal
                visible={addExerciseModalVisible}
                transparent
                animationType="fade"
                onRequestClose={() => setAddExerciseModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalCard}>
                        <Text style={styles.modalTitle}>Catálogo de Fuerza Tradicional</Text>
                        <Text style={styles.modalSub}>
                            Selecciona un ejercicio básico compuesto para la sesión de hoy.
                        </Text>

                        <ScrollView style={{ maxHeight: 320 }}>
                            {DEFAULT_EXERCISES.map((item) => (
                                <TouchableOpacity
                                    key={item.id}
                                    style={styles.exerciseSelectRow}
                                    onPress={() => handleSelectExercise(item)}
                                >
                                    <View>
                                        <Text style={styles.exerciseSelectName}>{item.nombre}</Text>
                                        <Text style={styles.exerciseSelectGroup}>{item.grupo_muscular}</Text>
                                    </View>
                                    <Text style={styles.exerciseSelectRest}>{item.descanso_segundos}s</Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>

                        <TouchableOpacity
                            style={styles.modalCloseBtn}
                            onPress={() => setAddExerciseModalVisible(false)}
                        >
                            <Text style={styles.modalCloseBtnText}>Cerrar</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
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
        color: '#ef4444',
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
    badgeWrap: {
        backgroundColor: 'rgba(239, 68, 68, 0.15)',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: 'rgba(239, 68, 68, 0.3)',
    },
    badgeText: {
        color: '#f87171',
        fontSize: 9,
        fontWeight: '800',
    },

    // KPI Panel
    kpiPanel: {
        flexDirection: 'row',
        backgroundColor: '#0a0a0c',
        borderRadius: 18,
        paddingVertical: 14,
        paddingHorizontal: 14,
        borderWidth: 1,
        borderColor: '#1f1f23',
        marginBottom: 16,
    },
    kpiCol: {
        flex: 1,
        alignItems: 'center',
    },
    kpiDivider: {
        width: 1,
        backgroundColor: '#1f1f23',
    },
    kpiLabel: {
        color: '#71717a',
        fontSize: 8,
        fontWeight: '800',
        letterSpacing: 0.8,
        marginBottom: 3,
    },
    kpiValueRed: {
        color: '#ef4444',
        fontSize: 16,
        fontWeight: '900',
    },
    kpiValueOrange: {
        color: '#f59e0b',
        fontSize: 16,
        fontWeight: '900',
    },
    kpiValueWhite: {
        color: '#ffffff',
        fontSize: 16,
        fontWeight: '900',
    },
    kpiSub: {
        color: '#52525b',
        fontSize: 9,
        fontWeight: '600',
        marginTop: 2,
    },

    // Rest Banner
    restBanner: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#18111e',
        borderRadius: 14,
        padding: 14,
        borderWidth: 1,
        borderColor: 'rgba(168, 85, 247, 0.4)',
        marginBottom: 16,
    },
    restLeft: {
        flex: 1,
    },
    restSuper: {
        color: '#a855f7',
        fontSize: 9,
        fontWeight: '800',
        letterSpacing: 1,
    },
    restTimerText: {
        color: '#ffffff',
        fontSize: 26,
        fontWeight: '900',
        marginTop: 2,
    },
    skipRestBtn: {
        backgroundColor: '#271c36',
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 8,
    },
    skipRestText: {
        color: '#c084fc',
        fontSize: 12,
        fontWeight: '700',
    },

    // Session Control
    startWorkoutBtn: {
        flexDirection: 'row',
        backgroundColor: '#ef4444',
        borderRadius: 14,
        paddingVertical: 16,
        justifyContent: 'center',
        alignItems: 'center',
        gap: 10,
        marginBottom: 20,
    },
    startWorkoutBtnIcon: {
        color: '#ffffff',
        fontSize: 14,
        fontWeight: '900',
    },
    startWorkoutBtnText: {
        color: '#ffffff',
        fontSize: 13,
        fontWeight: '900',
        letterSpacing: 1,
    },
    finishWorkoutBtn: {
        flexDirection: 'row',
        backgroundColor: '#10b981',
        borderRadius: 14,
        paddingVertical: 16,
        justifyContent: 'center',
        alignItems: 'center',
        gap: 10,
        marginBottom: 20,
    },
    finishWorkoutBtnIcon: {
        color: '#000000',
        fontSize: 14,
        fontWeight: '900',
    },
    finishWorkoutBtnText: {
        color: '#000000',
        fontSize: 13,
        fontWeight: '900',
        letterSpacing: 1,
    },

    // Ejercicios
    exercisesSection: {
        marginBottom: 20,
    },
    exercisesSectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    sectionHeaderTitle: {
        color: '#71717a',
        fontSize: 10,
        fontWeight: '800',
        letterSpacing: 1.2,
    },
    addExerciseBtn: {
        backgroundColor: '#121216',
        paddingHorizontal: 12,
        paddingVertical: 5,
        borderRadius: 6,
        borderWidth: 1,
        borderColor: '#27272a',
    },
    addExerciseBtnText: {
        color: '#f87171',
        fontSize: 11,
        fontWeight: '700',
    },
    exerciseCard: {
        backgroundColor: '#0a0a0c',
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
        borderColor: '#1f1f23',
        marginBottom: 14,
    },
    exerciseCardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 12,
    },
    exerciseMuscleTag: {
        color: '#ef4444',
        fontSize: 9,
        fontWeight: '800',
        letterSpacing: 0.8,
    },
    exerciseName: {
        color: '#f4f4f5',
        fontSize: 16,
        fontWeight: '800',
        marginTop: 2,
    },
    exerciseRestInfo: {
        color: '#71717a',
        fontSize: 11,
    },
    setTableHeader: {
        flexDirection: 'row',
        paddingHorizontal: 6,
        marginBottom: 8,
    },
    setTableColHeader: {
        color: '#52525b',
        fontSize: 9,
        fontWeight: '800',
        letterSpacing: 0.5,
    },
    setRow: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#121216',
        borderRadius: 10,
        paddingVertical: 6,
        paddingHorizontal: 8,
        marginBottom: 6,
        borderWidth: 1,
        borderColor: '#1f1f23',
    },
    setRowCompleted: {
        backgroundColor: 'rgba(16, 185, 129, 0.08)',
        borderColor: 'rgba(16, 185, 129, 0.3)',
    },
    setNumber: {
        width: 32,
        color: '#71717a',
        fontSize: 13,
        fontWeight: '800',
        textAlign: 'center',
    },
    setInputBox: {
        flex: 1,
        paddingHorizontal: 4,
    },
    setTextInput: {
        backgroundColor: '#18181c',
        color: '#ffffff',
        borderRadius: 6,
        textAlign: 'center',
        paddingVertical: 6,
        fontSize: 14,
        fontWeight: '800',
        borderWidth: 1,
        borderColor: '#27272a',
    },
    setTextInputDone: {
        color: '#34d399',
    },
    checkSetBtn: {
        width: 36,
        height: 36,
        borderRadius: 8,
        backgroundColor: '#1c1c22',
        justifyContent: 'center',
        alignItems: 'center',
        marginLeft: 6,
        borderWidth: 1,
        borderColor: '#27272a',
    },
    checkSetBtnDone: {
        backgroundColor: '#10b981',
        borderColor: '#10b981',
    },
    checkSetBtnIcon: {
        color: '#000000',
        fontSize: 16,
        fontWeight: '900',
    },
    addSetBtn: {
        marginTop: 8,
        alignItems: 'center',
        paddingVertical: 8,
        backgroundColor: '#121216',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#222228',
    },
    addSetBtnText: {
        color: '#71717a',
        fontSize: 11,
        fontWeight: '700',
    },

    // Historial
    historySection: {
        marginTop: 4,
    },
    historyTitle: {
        color: '#71717a',
        fontSize: 10,
        fontWeight: '800',
        letterSpacing: 1.2,
        marginBottom: 10,
    },
    emptyCard: {
        backgroundColor: '#0a0a0c',
        borderRadius: 12,
        padding: 16,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#1f1f23',
    },
    emptyCardText: {
        color: '#71717a',
        fontSize: 12,
    },
    historyCard: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#0a0a0c',
        borderRadius: 12,
        padding: 14,
        borderWidth: 1,
        borderColor: '#1f1f23',
        marginBottom: 8,
    },
    historyCardType: {
        color: '#f4f4f5',
        fontSize: 13,
        fontWeight: '700',
    },
    historyCardMeta: {
        color: '#71717a',
        fontSize: 11,
        marginTop: 2,
    },
    historyRight: {
        alignItems: 'flex-end',
    },
    historyKcal: {
        color: '#f59e0b',
        fontSize: 14,
        fontWeight: '900',
    },
    historyTonnage: {
        color: '#a1a1aa',
        fontSize: 11,
        fontWeight: '600',
        marginTop: 1,
    },

    // Modal
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.85)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    modalCard: {
        backgroundColor: '#101014',
        borderRadius: 18,
        padding: 20,
        width: '100%',
        maxWidth: 380,
        borderWidth: 1,
        borderColor: '#27272a',
    },
    modalTitle: {
        color: '#ffffff',
        fontSize: 17,
        fontWeight: '800',
        marginBottom: 4,
    },
    modalSub: {
        color: '#a1a1aa',
        fontSize: 12,
        marginBottom: 16,
        lineHeight: 16,
    },
    exerciseSelectRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#1f1f23',
    },
    exerciseSelectName: {
        color: '#f4f4f5',
        fontSize: 13,
        fontWeight: '700',
    },
    exerciseSelectGroup: {
        color: '#71717a',
        fontSize: 11,
        marginTop: 2,
    },
    exerciseSelectRest: {
        color: '#ef4444',
        fontSize: 11,
        fontWeight: '700',
    },
    modalCloseBtn: {
        marginTop: 16,
        backgroundColor: '#1c1c20',
        borderRadius: 10,
        paddingVertical: 12,
        alignItems: 'center',
    },
    modalCloseBtnText: {
        color: '#a1a1aa',
        fontSize: 13,
        fontWeight: '700',
    },
});

