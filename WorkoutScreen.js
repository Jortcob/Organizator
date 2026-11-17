import React, { useState, useEffect, useRef, useMemo } from 'react';
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
import {
    getStoreState,
    subscribeStore,
    addWorkoutRecord,
} from './dataStore';

const DEFAULT_EXERCISES = [
    { id: 'ex-1', nombre: 'Press de banca plano', grupo_muscular: 'Pecho', descanso_segundos: 120 },
    { id: 'ex-2', nombre: 'Sentadilla con barra', grupo_muscular: 'Pierna', descanso_segundos: 180 },
    { id: 'ex-3', nombre: 'Peso muerto', grupo_muscular: 'Espalda y pierna', descanso_segundos: 180 },
    { id: 'ex-4', nombre: 'Press militar con barra', grupo_muscular: 'Hombro', descanso_segundos: 120 },
    { id: 'ex-5', nombre: 'Remo con barra', grupo_muscular: 'Espalda', descanso_segundos: 90 },
    { id: 'ex-6', nombre: 'Dominadas', grupo_muscular: 'Espalda', descanso_segundos: 120 },
    { id: 'ex-7', nombre: 'Fondos en paralelas', grupo_muscular: 'Pecho y tríceps', descanso_segundos: 90 },
    { id: 'ex-8', nombre: 'Prensa inclinada', grupo_muscular: 'Pierna', descanso_segundos: 120 },
];

export default function WorkoutScreen({ onNavigate }) {
    const [saving, setSaving] = useState(false);

    const [workoutActive, setWorkoutActive] = useState(false);
    const [workoutStartTime, setWorkoutStartTime] = useState(null);
    const [elapsedSeconds, setElapsedSeconds] = useState(0);

    const [restSeconds, setRestSeconds] = useState(0);
    const [restActive, setRestActive] = useState(false);

    const [activeExercises, setActiveExercises] = useState([
        {
            exerciseId: 'ex-1',
            nombre: 'Press de banca plano',
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
            nombre: 'Remo con barra',
            grupo_muscular: 'Espalda',
            descanso_segundos: 90,
            sets: [
                { id: 's-4', serie_numero: 1, reps: 10, peso: 70, completado: false },
                { id: 's-5', serie_numero: 2, reps: 10, peso: 70, completado: false },
                { id: 's-6', serie_numero: 3, reps: 8, peso: 75, completado: false },
            ],
        },
    ]);

    const [addExerciseModalVisible, setAddExerciseModalVisible] = useState(false);
    const [workoutHistory, setWorkoutHistory] = useState([]);
    const [selectedSession, setSelectedSession] = useState(null);

    const workoutTimerRef = useRef(null);
    const restTimerRef = useRef(null);

    useEffect(() => {
        let mounted = true;
        getStoreState(true).then((s) => {
            if (mounted) setWorkoutHistory(s.workouts || []);
        });
        const unsub = subscribeStore((s) => {
            if (mounted) setWorkoutHistory([...(s.workouts || [])]);
        });
        return () => {
            mounted = false;
            unsub();
        };
    }, []);

    useEffect(() => {
        if (workoutActive) {
            workoutTimerRef.current = setInterval(() => {
                setElapsedSeconds((prev) => prev + 1);
            }, 1000);
        } else if (workoutTimerRef.current) {
            clearInterval(workoutTimerRef.current);
        }
        return () => {
            if (workoutTimerRef.current) clearInterval(workoutTimerRef.current);
        };
    }, [workoutActive]);

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
        } else if (restTimerRef.current) {
            clearInterval(restTimerRef.current);
        }
        return () => {
            if (restTimerRef.current) clearInterval(restTimerRef.current);
        };
    }, [restActive, restSeconds]);

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

    const handleStartWorkout = () => {
        setWorkoutStartTime(new Date());
        setWorkoutActive(true);
        setElapsedSeconds(0);
    };

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

            if (willComplete) {
                setRestSeconds(currentExercise.descanso_segundos || 90);
                setRestActive(true);
            }

            return next;
        });
    };

    const handleUpdateSet = (exerciseIndex, setIndex, field, value) => {
        setActiveExercises((prev) => {
            const next = [...prev];
            const currentExercise = { ...next[exerciseIndex] };
            const currentSets = [...currentExercise.sets];
            currentSets[setIndex] = { ...currentSets[setIndex], [field]: value };
            currentExercise.sets = currentSets;
            next[exerciseIndex] = currentExercise;
            return next;
        });
    };

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

    const handleFinishWorkout = async () => {
        if (stats.completedSets === 0) {
            Alert.alert('Sin series marcadas', 'Marca al menos una serie completada antes de guardar.');
            return;
        }

        try {
            setSaving(true);
            const now = new Date();
            const dateStr = now.toISOString().split('T')[0];
            const startTimeStr = workoutStartTime
                ? `${String(workoutStartTime.getHours()).padStart(2, '0')}:${String(workoutStartTime.getMinutes()).padStart(2, '0')}`
                : `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

            const seriesPayload = [];
            const exercisesDetail = [];
            activeExercises.forEach((ex) => {
                const doneSets = ex.sets.filter((s) => s.completado);
                if (doneSets.length > 0) {
                    exercisesDetail.push({
                        nombre: ex.nombre,
                        grupo_muscular: ex.grupo_muscular,
                        series: doneSets.map((s) => ({
                            serie: s.serie_numero,
                            peso: parseFloat(s.peso) || 0,
                            reps: parseInt(s.reps, 10) || 0,
                        })),
                    });
                }
                doneSets.forEach((s) => {
                    seriesPayload.push({
                        ejercicio_id: ex.exerciseId.startsWith('ex-') ? null : ex.exerciseId,
                        serie_numero: s.serie_numero,
                        repeticiones_reales: parseInt(s.reps, 10) || 0,
                        peso_real: parseFloat(s.peso) || 0,
                        completado: true,
                    });
                });
            });

            await addWorkoutRecord(
                {
                    fecha: dateStr,
                    hora_inicio: startTimeStr,
                    duracion_minutos: stats.durationMinutes,
                    gasto_calorico: stats.calculatedKcal,
                    tipo_entrenamiento: 'Fuerza',
                    tonelaje: stats.totalTonnage,
                    series_totales: stats.completedSets,
                },
                seriesPayload,
                exercisesDetail
            );

            Alert.alert(
                'Entrenamiento guardado',
                `Moviste ${stats.totalTonnage.toLocaleString('es-ES')} kg y quemaste ${stats.calculatedKcal} kcal.`
            );

            setWorkoutActive(false);
            setElapsedSeconds(0);
            setRestActive(false);
            setRestSeconds(0);
        } catch (error) {
            Alert.alert('Error al guardar', error.message);
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
            <ScrollView
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                <View style={styles.innerWrap}>
                    {/* Cabecera */}
                    <View style={styles.topNav}>
                        {onNavigate && (
                            <TouchableOpacity
                                style={styles.backBtn}
                                onPress={() => onNavigate('dashboard')}
                            >
                                <Text style={styles.backBtnText}>← Inicio</Text>
                            </TouchableOpacity>
                        )}
                        <TouchableOpacity
                            style={styles.addExBtn}
                            onPress={() => setAddExerciseModalVisible(true)}
                        >
                            <Text style={styles.addExBtnText}>+ Ejercicio</Text>
                        </TouchableOpacity>
                    </View>

                    <Text style={styles.title}>Entrenamiento</Text>
                    <Text style={styles.subtitle}>
                        Anota tus series y calculamos tu gasto calórico según el peso y descanso.
                    </Text>

                    {/* KPI */}
                    <View style={styles.kpiCard}>
                        <View style={styles.kpiItem}>
                            <Text style={styles.kpiLabel}>Volumen</Text>
                            <Text style={[styles.kpiValue, { color: '#FB7185' }]}>
                                {stats.totalTonnage} kg
                            </Text>
                        </View>
                        <View style={styles.kpiDivider} />
                        <View style={styles.kpiItem}>
                            <Text style={styles.kpiLabel}>Gasto est.</Text>
                            <Text style={[styles.kpiValue, { color: '#F59E0B' }]}>
                                +{stats.calculatedKcal} kcal
                            </Text>
                        </View>
                        <View style={styles.kpiDivider} />
                        <View style={styles.kpiItem}>
                            <Text style={styles.kpiLabel}>Tiempo</Text>
                            <Text style={styles.kpiValue}>
                                {workoutActive ? formatTimer(elapsedSeconds) : '00:00'}
                            </Text>
                        </View>
                    </View>

                    {/* Descanso */}
                    {restActive && (
                        <View style={styles.restBanner}>
                            <View>
                                <Text style={styles.restLabel}>Descanso</Text>
                                <Text style={styles.restTime}>{formatTimer(restSeconds)}</Text>
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

                    {/* Botón Start/Finish */}
                    {!workoutActive ? (
                        <TouchableOpacity
                            style={styles.startBtn}
                            activeOpacity={0.8}
                            onPress={handleStartWorkout}
                        >
                            <Text style={styles.startBtnText}>Empezar entrenamiento</Text>
                        </TouchableOpacity>
                    ) : (
                        <TouchableOpacity
                            style={styles.finishBtn}
                            activeOpacity={0.8}
                            onPress={handleFinishWorkout}
                            disabled={saving}
                        >
                            {saving ? (
                                <ActivityIndicator color="#000000" />
                            ) : (
                                <Text style={styles.finishBtnText}>Finalizar y guardar sesión</Text>
                            )}
                        </TouchableOpacity>
                    )}

                    {/* Ejercicios */}
                    {activeExercises.map((ex, exIdx) => (
                        <View key={ex.exerciseId + exIdx} style={styles.exerciseCard}>
                            <View style={styles.exerciseHeader}>
                                <View>
                                    <Text style={styles.exerciseMuscle}>{ex.grupo_muscular}</Text>
                                    <Text style={styles.exerciseName}>{ex.nombre}</Text>
                                </View>
                                <Text style={styles.exerciseRest}>{ex.descanso_segundos}s desc.</Text>
                            </View>

                            <View style={styles.tableHeader}>
                                <Text style={[styles.colHeader, { width: 34 }]}>Set</Text>
                                <Text style={[styles.colHeader, { flex: 1, textAlign: 'center' }]}>Peso (kg)</Text>
                                <Text style={[styles.colHeader, { flex: 1, textAlign: 'center' }]}>Reps</Text>
                                <Text style={[styles.colHeader, { width: 42, textAlign: 'right' }]}>Ok</Text>
                            </View>

                            {ex.sets.map((set, setIdx) => (
                                <View
                                    key={set.id}
                                    style={[styles.setRow, set.completado && styles.setRowDone]}
                                >
                                    <Text style={styles.setNum}>{set.serie_numero}</Text>
                                    <View style={styles.setInputWrap}>
                                        <TextInput
                                            style={[styles.setInput, set.completado && styles.setInputDone]}
                                            keyboardType="numeric"
                                            value={String(set.peso)}
                                            onChangeText={(v) => handleUpdateSet(exIdx, setIdx, 'peso', v)}
                                            editable={!set.completado}
                                        />
                                    </View>
                                    <View style={styles.setInputWrap}>
                                        <TextInput
                                            style={[styles.setInput, set.completado && styles.setInputDone]}
                                            keyboardType="numeric"
                                            value={String(set.reps)}
                                            onChangeText={(v) => handleUpdateSet(exIdx, setIdx, 'reps', v)}
                                            editable={!set.completado}
                                        />
                                    </View>
                                    <TouchableOpacity
                                        style={[styles.checkBtn, set.completado && styles.checkBtnDone]}
                                        onPress={() => handleToggleSet(exIdx, setIdx)}
                                    >
                                        <Text style={styles.checkIcon}>{set.completado ? '✓' : ''}</Text>
                                    </TouchableOpacity>
                                </View>
                            ))}

                            <TouchableOpacity
                                style={styles.addSetBtn}
                                onPress={() => handleAddSet(exIdx)}
                            >
                                <Text style={styles.addSetText}>+ Añadir serie</Text>
                            </TouchableOpacity>
                        </View>
                    ))}

                    {/* Historial */}
                    <Text style={styles.sectionTitle}>Sesiones anteriores</Text>
                    <Text style={styles.sectionHint}>Toca cualquier sesión para revisar ejercicios, pesos y repeticiones.</Text>
                    {workoutHistory.length === 0 ? (
                        <View style={styles.emptyCard}>
                            <Text style={styles.emptyText}>Sin entrenamientos guardados todavía.</Text>
                        </View>
                    ) : (
                        workoutHistory.slice(0, 12).map((w) => (
                            <TouchableOpacity
                                key={w.id}
                                style={styles.historyCard}
                                activeOpacity={0.75}
                                onPress={() => setSelectedSession(w)}
                            >
                                <View style={{ flex: 1, paddingRight: 10 }}>
                                    <Text style={styles.historyType}>
                                        {w.tipo_entrenamiento || 'Fuerza'}
                                    </Text>
                                    <Text style={styles.historyMeta}>
                                        {w.fecha} · {w.hora_inicio ? `${w.hora_inicio} · ` : ''}{w.duracion_minutos} min
                                        {Array.isArray(w.ejercicios_detalle) && w.ejercicios_detalle.length > 0
                                            ? ` · ${w.ejercicios_detalle.length} ej.`
                                            : ''}
                                    </Text>
                                </View>
                                <View style={{ alignItems: 'flex-end' }}>
                                    <Text style={styles.historyKcal}>+{w.gasto_calorico} kcal</Text>
                                    <Text style={styles.historyVol}>
                                        {w.tonelaje ? `${w.tonelaje} kg · ` : ''}Ver detalle ›
                                    </Text>
                                </View>
                            </TouchableOpacity>
                        ))
                    )}
                </View>
            </ScrollView>

            {/* Modal */}
            <Modal
                visible={addExerciseModalVisible}
                transparent
                animationType="fade"
                onRequestClose={() => setAddExerciseModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalCard}>
                        <Text style={styles.modalTitle}>Añadir ejercicio</Text>
                        <ScrollView style={{ maxHeight: 320 }}>
                            {DEFAULT_EXERCISES.map((item) => (
                                <TouchableOpacity
                                    key={item.id}
                                    style={styles.exSelectRow}
                                    onPress={() => handleSelectExercise(item)}
                                >
                                    <View>
                                        <Text style={styles.exSelectName}>{item.nombre}</Text>
                                        <Text style={styles.exSelectGroup}>{item.grupo_muscular}</Text>
                                    </View>
                                    <Text style={styles.exSelectRest}>{item.descanso_segundos}s</Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                        <TouchableOpacity
                            style={styles.modalCloseBtn}
                            onPress={() => setAddExerciseModalVisible(false)}
                        >
                            <Text style={styles.modalCloseText}>Cerrar</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {/* Modal Detalle de Sesión Anterior */}
            <Modal
                visible={!!selectedSession}
                transparent
                animationType="fade"
                onRequestClose={() => setSelectedSession(null)}
            >
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalCard, { maxWidth: 440, maxHeight: '82%' }]}>
                        {selectedSession && (
                            <>
                                <Text style={styles.detailOverline}>
                                    {selectedSession.fecha}{selectedSession.hora_inicio ? ` · ${selectedSession.hora_inicio}` : ''}
                                </Text>
                                <Text style={styles.modalTitle}>
                                    {selectedSession.tipo_entrenamiento || 'Sesión de Fuerza'}
                                </Text>

                                <View style={styles.detailStatsRow}>
                                    <View style={styles.detailStatBox}>
                                        <Text style={styles.detailStatLabel}>Duración</Text>
                                        <Text style={styles.detailStatVal}>{selectedSession.duracion_minutos} min</Text>
                                    </View>
                                    <View style={styles.detailStatBox}>
                                        <Text style={styles.detailStatLabel}>Tonelaje</Text>
                                        <Text style={styles.detailStatVal}>{selectedSession.tonelaje || 0} kg</Text>
                                    </View>
                                    <View style={styles.detailStatBox}>
                                        <Text style={styles.detailStatLabel}>Gasto</Text>
                                        <Text style={[styles.detailStatVal, { color: '#F59E0B' }]}>+{selectedSession.gasto_calorico} kcal</Text>
                                    </View>
                                </View>

                                <ScrollView style={{ maxHeight: 340, marginTop: 8 }}>
                                    {Array.isArray(selectedSession.ejercicios_detalle) && selectedSession.ejercicios_detalle.length > 0 ? (
                                        selectedSession.ejercicios_detalle.map((ex, idx) => (
                                            <View key={idx} style={styles.detailExCard}>
                                                <View style={styles.detailExHeader}>
                                                    <Text style={styles.detailExName}>{ex.nombre}</Text>
                                                    <Text style={styles.detailExGroup}>{ex.grupo_muscular}</Text>
                                                </View>
                                                {(ex.series || []).map((s, sIdx) => (
                                                    <View key={sIdx} style={styles.detailSetRow}>
                                                        <Text style={styles.detailSetNum}>Serie {s.serie || sIdx + 1}</Text>
                                                        <Text style={styles.detailSetVal}>
                                                            {s.peso} kg × {s.reps} reps
                                                        </Text>
                                                        <Text style={styles.detailSetVol}>
                                                            {Math.round((Number(s.peso) || 0) * (Number(s.reps) || 0))} kg
                                                        </Text>
                                                    </View>
                                                ))}
                                            </View>
                                        ))
                                    ) : (
                                        <View style={styles.emptyCard}>
                                            <Text style={styles.emptyText}>
                                                {selectedSession.series_totales
                                                    ? `Sesión registrada con ${selectedSession.series_totales} series totales.`
                                                    : 'No se guardó el desglose por ejercicio en esta sesión.'}
                                            </Text>
                                        </View>
                                    )}
                                </ScrollView>

                                <TouchableOpacity
                                    style={styles.modalCloseBtn}
                                    onPress={() => setSelectedSession(null)}
                                >
                                    <Text style={styles.modalCloseText}>Cerrar detalle</Text>
                                </TouchableOpacity>
                            </>
                        )}
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#000000' },
    scrollContent: { paddingHorizontal: 20, paddingTop: 14, paddingBottom: 40 },
    innerWrap: { width: '100%', maxWidth: 520, alignSelf: 'center' },
    topNav: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    backBtn: { paddingVertical: 6, paddingRight: 12 },
    backBtnText: { color: '#A1A1AA', fontSize: 14, fontWeight: '600' },
    addExBtn: {
        backgroundColor: '#111114',
        paddingHorizontal: 12,
        paddingVertical: 7,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#232329',
    },
    addExBtnText: { color: '#FB7185', fontSize: 12, fontWeight: '600' },
    title: { color: '#FAFAFA', fontSize: 26, fontWeight: '700', letterSpacing: -0.5 },
    subtitle: { color: '#A1A1AA', fontSize: 13, marginTop: 4, marginBottom: 18, lineHeight: 18 },
    kpiCard: {
        flexDirection: 'row',
        backgroundColor: '#111114',
        borderRadius: 18,
        paddingVertical: 14,
        borderWidth: 1,
        borderColor: '#232329',
        marginBottom: 16,
    },
    kpiItem: { flex: 1, alignItems: 'center' },
    kpiDivider: { width: 1, backgroundColor: '#232329' },
    kpiLabel: { color: '#71717A', fontSize: 11, marginBottom: 3 },
    kpiValue: { color: '#FAFAFA', fontSize: 16, fontWeight: '700' },
    restBanner: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#18181C',
        borderRadius: 16,
        padding: 14,
        borderWidth: 1,
        borderColor: '#27272E',
        marginBottom: 16,
    },
    restLabel: { color: '#A1A1AA', fontSize: 11, fontWeight: '600' },
    restTime: { color: '#FAFAFA', fontSize: 24, fontWeight: '700', marginTop: 2 },
    skipRestBtn: {
        backgroundColor: '#27272E',
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 10,
    },
    skipRestText: { color: '#FAFAFA', fontSize: 12, fontWeight: '600' },
    startBtn: {
        backgroundColor: '#FB7185',
        borderRadius: 14,
        paddingVertical: 15,
        alignItems: 'center',
        marginBottom: 20,
    },
    startBtnText: { color: '#000000', fontSize: 15, fontWeight: '700' },
    finishBtn: {
        backgroundColor: '#34D399',
        borderRadius: 14,
        paddingVertical: 15,
        alignItems: 'center',
        marginBottom: 20,
    },
    finishBtnText: { color: '#000000', fontSize: 15, fontWeight: '700' },
    exerciseCard: {
        backgroundColor: '#111114',
        borderRadius: 18,
        padding: 16,
        borderWidth: 1,
        borderColor: '#232329',
        marginBottom: 14,
    },
    exerciseHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 12,
    },
    exerciseMuscle: { color: '#FB7185', fontSize: 11, fontWeight: '600' },
    exerciseName: { color: '#FAFAFA', fontSize: 16, fontWeight: '700', marginTop: 2 },
    exerciseRest: { color: '#71717A', fontSize: 12 },
    tableHeader: { flexDirection: 'row', paddingHorizontal: 4, marginBottom: 8 },
    colHeader: { color: '#71717A', fontSize: 11, fontWeight: '600' },
    setRow: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#18181C',
        borderRadius: 10,
        paddingVertical: 6,
        paddingHorizontal: 8,
        marginBottom: 6,
    },
    setRowDone: { backgroundColor: 'rgba(52, 211, 153, 0.1)' },
    setNum: { width: 28, color: '#71717A', fontSize: 13, fontWeight: '700', textAlign: 'center' },
    setInputWrap: { flex: 1, paddingHorizontal: 4 },
    setInput: {
        backgroundColor: '#111114',
        color: '#FAFAFA',
        borderRadius: 8,
        textAlign: 'center',
        paddingVertical: 6,
        fontSize: 14,
        fontWeight: '600',
        borderWidth: 1,
        borderColor: '#27272E',
    },
    setInputDone: { color: '#34D399' },
    checkBtn: {
        width: 34,
        height: 34,
        borderRadius: 8,
        backgroundColor: '#111114',
        justifyContent: 'center',
        alignItems: 'center',
        marginLeft: 6,
        borderWidth: 1,
        borderColor: '#27272E',
    },
    checkBtnDone: { backgroundColor: '#34D399', borderColor: '#34D399' },
    checkIcon: { color: '#000000', fontSize: 15, fontWeight: '800' },
    addSetBtn: {
        marginTop: 6,
        alignItems: 'center',
        paddingVertical: 8,
        backgroundColor: '#18181C',
        borderRadius: 10,
    },
    addSetText: { color: '#A1A1AA', fontSize: 12, fontWeight: '600' },
    sectionTitle: { color: '#FAFAFA', fontSize: 16, fontWeight: '700', marginTop: 8, marginBottom: 4 },
    sectionHint: { color: '#71717A', fontSize: 12, marginBottom: 12 },
    historyCard: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#111114',
        borderRadius: 16,
        padding: 14,
        borderWidth: 1,
        borderColor: '#232329',
        marginBottom: 10,
    },
    historyType: { color: '#FAFAFA', fontSize: 14, fontWeight: '600' },
    historyMeta: { color: '#71717A', fontSize: 12, marginTop: 2 },
    historyKcal: { color: '#F59E0B', fontSize: 14, fontWeight: '700' },
    historyVol: { color: '#A1A1AA', fontSize: 11, marginTop: 2 },
    emptyCard: {
        backgroundColor: '#111114',
        borderRadius: 16,
        padding: 20,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#232329',
    },
    emptyText: { color: '#71717A', fontSize: 13 },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.8)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    modalCard: {
        backgroundColor: '#111114',
        borderRadius: 20,
        padding: 20,
        width: '100%',
        maxWidth: 380,
        borderWidth: 1,
        borderColor: '#27272E',
    },
    modalTitle: { color: '#FAFAFA', fontSize: 18, fontWeight: '700', marginBottom: 12 },
    exSelectRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#232329',
    },
    exSelectName: { color: '#FAFAFA', fontSize: 14, fontWeight: '600' },
    exSelectGroup: { color: '#71717A', fontSize: 12, marginTop: 2 },
    exSelectRest: { color: '#FB7185', fontSize: 12, fontWeight: '600' },
    modalCloseBtn: {
        marginTop: 14,
        backgroundColor: '#18181C',
        borderRadius: 12,
        paddingVertical: 12,
        alignItems: 'center',
    },
    modalCloseText: { color: '#A1A1AA', fontSize: 14, fontWeight: '600' },
    detailOverline: { color: '#FB7185', fontSize: 12, fontWeight: '600', marginBottom: 4 },
    detailStatsRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
    detailStatBox: {
        flex: 1,
        backgroundColor: '#18181C',
        borderRadius: 12,
        padding: 10,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#232329',
    },
    detailStatLabel: { color: '#71717A', fontSize: 11 },
    detailStatVal: { color: '#FAFAFA', fontSize: 14, fontWeight: '700', marginTop: 2 },
    detailExCard: {
        backgroundColor: '#18181C',
        borderRadius: 14,
        padding: 12,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: '#232329',
    },
    detailExHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    detailExName: { color: '#FAFAFA', fontSize: 14, fontWeight: '700', flex: 1 },
    detailExGroup: { color: '#FB7185', fontSize: 11, fontWeight: '600' },
    detailSetRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: 5,
        borderTopWidth: 1,
        borderTopColor: '#232329',
    },
    detailSetNum: { color: '#71717A', fontSize: 12, width: 65 },
    detailSetVal: { color: '#FAFAFA', fontSize: 13, fontWeight: '600', flex: 1 },
    detailSetVol: { color: '#A1A1AA', fontSize: 12 },
});
