import React, { useState, useEffect, useRef, useCallback } from 'react';
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

export default function WorkScreen({ onNavigate }) {
    // Estado del temporizador en vivo
    const [isTimerRunning, setIsTimerRunning] = useState(false);
    const [secondsElapsed, setSecondsElapsed] = useState(0);
    const [sessionStartTime, setSessionStartTime] = useState(null);
    const [hourlyRate, setHourlyRate] = useState('45'); // Tarifa predeterminada €/h

    // Sesiones y Métricas
    const [sessions, setSessions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [userId, setUserId] = useState(null);

    // Modal de Registro Manual
    const [manualModalVisible, setManualModalVisible] = useState(false);
    const [manualHours, setManualHours] = useState('');
    const [manualRate, setManualRate] = useState('45');
    const [manualDescription, setManualDescription] = useState('');

    const timerRef = useRef(null);

    // Formatear segundos a HH:MM:SS
    const formatTime = (totalSeconds) => {
        const hrs = Math.floor(totalSeconds / 3600);
        const mins = Math.floor((totalSeconds % 3600) / 60);
        const secs = totalSeconds % 60;
        return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    };

    // Dinero devengado en tiempo real durante la sesión activa
    const liveEarnings = useMemoFormula(secondsElapsed, hourlyRate);

    function useMemoFormula(seconds, rate) {
        const numRate = parseFloat(rate) || 0;
        const hours = seconds / 3600;
        return (hours * numRate).toFixed(2);
    }

    // Efecto del cronómetro
    useEffect(() => {
        if (isTimerRunning) {
            timerRef.current = setInterval(() => {
                setSecondsElapsed((prev) => prev + 1);
            }, 1000);
        } else {
            if (timerRef.current) clearInterval(timerRef.current);
        }

        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, [isTimerRunning]);

    // Cargar historial de jornadas desde Supabase
    const fetchWorkSessions = useCallback(async () => {
        try {
            setLoading(true);
            const { data: { user } } = await supabase.auth.getUser();
            const currentUserId = user?.id || null;
            setUserId(currentUserId);

            if (!currentUserId) {
                // Datos de demostración en modo offline/preview
                setSessions([
                    {
                        id: 'demo-1',
                        fecha: new Date().toISOString().split('T')[0],
                        hora_inicio: new Date(Date.now() - 4 * 3600000).toISOString(),
                        hora_fin: new Date(Date.now() - 3600000).toISOString(),
                        precio_hora: 45,
                        ingreso_generado: 135.0,
                    },
                    {
                        id: 'demo-2',
                        fecha: new Date(Date.now() - 86400000).toISOString().split('T')[0],
                        hora_inicio: new Date(Date.now() - 90000000).toISOString(),
                        hora_fin: new Date(Date.now() - 72000000).toISOString(),
                        precio_hora: 45,
                        ingreso_generado: 225.0,
                    },
                ]);
                return;
            }

            const { data, error } = await supabase
                .from('jornadas_trabajo')
                .select('*')
                .eq('user_id', currentUserId)
                .order('hora_inicio', { ascending: false })
                .limit(20);

            if (error) throw error;
            setSessions(data || []);
        } catch (error) {
            console.error('Error al cargar jornadas:', error.message);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchWorkSessions();
    }, [fetchWorkSessions]);

    // Iniciar temporizador
    const handleStartTimer = () => {
        const rate = parseFloat(hourlyRate);
        if (isNaN(rate) || rate <= 0) {
            Alert.alert('Tarifa inválida', 'Por favor ingresa una tarifa por hora válida antes de iniciar.');
            return;
        }
        setSessionStartTime(new Date());
        setIsTimerRunning(true);
    };

    // Detener temporizador y liquidar jornada
    const handleStopTimer = async () => {
        if (!sessionStartTime) return;

        const endTime = new Date();
        const durationHours = secondsElapsed / 3600;
        const rate = parseFloat(hourlyRate) || 0;
        const totalGenerated = Number((durationHours * rate).toFixed(2));

        if (secondsElapsed < 60) {
            Alert.alert(
                'Sesión muy corta',
                'La sesión duró menos de 1 minuto. ¿Deseas descartarla o guardarla?',
                [
                    {
                        text: 'Descartar',
                        style: 'destructive',
                        onPress: () => {
                            setIsTimerRunning(false);
                            setSecondsElapsed(0);
                            setSessionStartTime(null);
                        },
                    },
                    {
                        text: 'Guardar de todos modos',
                        onPress: () => saveSession(sessionStartTime, endTime, rate, totalGenerated),
                    },
                ]
            );
            return;
        }

        await saveSession(sessionStartTime, endTime, rate, totalGenerated);
    };

    // Guardar sesión en Supabase
    const saveSession = async (startTime, endTime, rate, totalGenerated) => {
        try {
            setSaving(true);
            const dateStr = startTime.toISOString().split('T')[0];

            if (userId) {
                const { data, error } = await supabase
                    .from('jornadas_trabajo')
                    .insert([
                        {
                            user_id: userId,
                            fecha: dateStr,
                            hora_inicio: startTime.toISOString(),
                            hora_fin: endTime.toISOString(),
                            precio_hora: rate,
                            ingreso_generado: totalGenerated,
                        },
                    ])
                    .select();

                if (error) throw error;

                if (data && data.length > 0) {
                    setSessions((prev) => [data[0], ...prev]);
                }
            } else {
                // Actualizar estado local si no hay login
                const newDemo = {
                    id: `local-${Date.now()}`,
                    fecha: dateStr,
                    hora_inicio: startTime.toISOString(),
                    hora_fin: endTime.toISOString(),
                    precio_hora: rate,
                    ingreso_generado: totalGenerated,
                };
                setSessions((prev) => [newDemo, ...prev]);
            }

            Alert.alert(
                'Jornada Liquidada 💰',
                `Has devengado +${totalGenerated.toLocaleString('es-ES')} € en esta sesión.\nIntegrado automáticamente en tu flujo económico.`
            );

            // Resetear temporizador
            setIsTimerRunning(false);
            setSecondsElapsed(0);
            setSessionStartTime(null);
        } catch (error) {
            Alert.alert('Error al guardar sesión', error.message);
        } finally {
            setSaving(false);
        }
    };

    // Guardar sesión manual
    const handleSaveManualSession = async () => {
        const hrs = parseFloat(manualHours);
        const rate = parseFloat(manualRate);

        if (isNaN(hrs) || hrs <= 0) {
            Alert.alert('Datos requeridos', 'Ingresa la cantidad de horas trabajadas.');
            return;
        }
        if (isNaN(rate) || rate <= 0) {
            Alert.alert('Datos requeridos', 'Ingresa una tarifa horaria válida.');
            return;
        }

        const totalEarned = Number((hrs * rate).toFixed(2));
        const now = new Date();
        const start = new Date(now.getTime() - hrs * 3600000);

        await saveSession(start, now, rate, totalEarned);
        setManualModalVisible(false);
        setManualHours('');
    };

    // Eliminar una sesión
    const handleDeleteSession = async (sessionId) => {
        Alert.alert(
            'Eliminar Jornada',
            '¿Seguro que deseas eliminar este registro? Se recalculará tu ingreso mensual.',
            [
                { text: 'Cancelar', style: 'cancel' },
                {
                    text: 'Eliminar',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            if (userId) {
                                await supabase
                                    .from('jornadas_trabajo')
                                    .delete()
                                    .eq('id', sessionId);
                            }
                            setSessions((prev) => prev.filter((s) => s.id !== sessionId));
                        } catch (err) {
                            Alert.alert('Error', err.message);
                        }
                    },
                },
            ]
        );
    };

    // Métricas calculadas para la cabecera
    const todayStr = new Date().toISOString().split('T')[0];
    const todaySessions = sessions.filter((s) => s.fecha === todayStr);

    const todayHours = todaySessions.reduce((acc, s) => {
        const diff = new Date(s.hora_fin) - new Date(s.hora_inicio);
        return acc + Math.max(0, diff / (1000 * 3600));
    }, 0);

    const todayIncome = todaySessions.reduce((acc, s) => acc + (Number(s.ingreso_generado) || 0), 0);

    const totalHistoryIncome = sessions.reduce((acc, s) => acc + (Number(s.ingreso_generado) || 0), 0);
    const totalHistoryHours = sessions.reduce((acc, s) => {
        const diff = new Date(s.hora_fin) - new Date(s.hora_inicio);
        return acc + Math.max(0, diff / (1000 * 3600));
    }, 0);

    return (
        <View style={styles.container}>
            <ScrollView contentContainerStyle={styles.scrollContent}>
                {/* Cabecera */}
                <View style={styles.header}>
                    <View>
                        <Text style={styles.superTitle}>PILAR TRABAJO & PRODUCTIVIDAD</Text>
                        <Text style={styles.mainTitle}>Control de Jornada</Text>
                    </View>
                    <TouchableOpacity
                        style={styles.manualEntryBtn}
                        onPress={() => setManualModalVisible(true)}
                    >
                        <Text style={styles.manualEntryBtnText}>+ Manual</Text>
                    </TouchableOpacity>
                </View>

                {/* KPI Bar de Hoy */}
                <View style={styles.kpiContainer}>
                    <View style={styles.kpiBox}>
                        <Text style={styles.kpiLabel}>HORAS HOY</Text>
                        <Text style={styles.kpiValueCyan}>{todayHours.toFixed(1)}h</Text>
                    </View>
                    <View style={styles.kpiDivider} />
                    <View style={styles.kpiBox}>
                        <Text style={styles.kpiLabel}>INGRESADO HOY</Text>
                        <Text style={styles.kpiValueGreen}>+{todayIncome.toLocaleString('es-ES')} €</Text>
                    </View>
                    <View style={styles.kpiDivider} />
                    <View style={styles.kpiBox}>
                        <Text style={styles.kpiLabel}>TARIFA ACTIVA</Text>
                        <Text style={styles.kpiValueWhite}>{hourlyRate}€/h</Text>
                    </View>
                </View>

                {/* TEMPORIZADOR EJECUTIVO EN VIVO */}
                <View style={[styles.timerCard, isTimerRunning && styles.timerCardActive]}>
                    <View style={styles.timerStatusRow}>
                        <View style={[styles.statusDot, isTimerRunning && styles.statusDotActive]} />
                        <Text style={[styles.statusLabel, isTimerRunning && styles.statusLabelActive]}>
                            {isTimerRunning ? 'PRODUCCIÓN EN CURSO // LIQUIDANDO TIEMPO' : 'SISTEMA EN ESPERA'}
                        </Text>
                    </View>

                    {/* Digital Clock */}
                    <Text style={styles.timerDisplay}>{formatTime(secondsElapsed)}</Text>

                    {/* Ticker de dinero devengado en vivo */}
                    <View style={styles.liveCashRow}>
                        <Text style={styles.liveCashPrefix}>Valor Generado:</Text>
                        <Text style={styles.liveCashAmount}>+{liveEarnings} €</Text>
                    </View>

                    {/* Configuración de Tarifa Horaria */}
                    {!isTimerRunning && (
                        <View style={styles.rateConfigSection}>
                            <Text style={styles.rateConfigTitle}>TARIFA DE LA SESIÓN (€ / HORA)</Text>
                            <View style={styles.ratePresetsRow}>
                                {['35', '45', '60', '80'].map((preset) => (
                                    <TouchableOpacity
                                        key={preset}
                                        style={[
                                            styles.presetPill,
                                            hourlyRate === preset && styles.presetPillActive,
                                        ]}
                                        onPress={() => setHourlyRate(preset)}
                                    >
                                        <Text
                                            style={[
                                                styles.presetPillText,
                                                hourlyRate === preset && styles.presetPillTextActive,
                                            ]}
                                        >
                                            {preset}€
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                                <View style={styles.customRateWrap}>
                                    <TextInput
                                        style={styles.customRateInput}
                                        keyboardType="numeric"
                                        value={hourlyRate}
                                        onChangeText={setHourlyRate}
                                        placeholder="Otro"
                                        placeholderTextColor="#52525b"
                                    />
                                    <Text style={styles.customRateUnit}>€/h</Text>
                                </View>
                            </View>
                        </View>
                    )}

                    {/* Botón Principal (Start / Stop) */}
                    <View style={styles.actionsContainer}>
                        {!isTimerRunning ? (
                            <TouchableOpacity
                                style={styles.startBtn}
                                activeOpacity={0.8}
                                onPress={handleStartTimer}
                            >
                                <Text style={styles.startBtnIcon}>▶</Text>
                                <Text style={styles.startBtnText}>INICIAR JORNADA</Text>
                            </TouchableOpacity>
                        ) : (
                            <TouchableOpacity
                                style={styles.stopBtn}
                                activeOpacity={0.8}
                                onPress={handleStopTimer}
                                disabled={saving}
                            >
                                {saving ? (
                                    <ActivityIndicator color="#ffffff" />
                                ) : (
                                    <>
                                        <Text style={styles.stopBtnIcon}>■</Text>
                                        <Text style={styles.stopBtnText}>FINALIZAR Y FACTURAR</Text>
                                    </>
                                )}
                            </TouchableOpacity>
                        )}
                    </View>
                </View>

                {/* HISTORIAL RECIENTE DE JORNADAS */}
                <View style={styles.historySection}>
                    <View style={styles.historyHeader}>
                        <Text style={styles.historyTitle}>SESIONES RECIENTES</Text>
                        <Text style={styles.historySubtitle}>
                            {sessions.length} registros • {totalHistoryHours.toFixed(1)}h acumuladas
                        </Text>
                    </View>

                    {loading ? (
                        <ActivityIndicator color="#06b6d4" style={{ marginTop: 20 }} />
                    ) : sessions.length === 0 ? (
                        <View style={styles.emptyCard}>
                            <Text style={styles.emptyCardText}>No hay jornadas registradas aún.</Text>
                            <Text style={styles.emptyCardSubText}>Inicia el temporizador al empezar tu jornada de trabajo.</Text>
                        </View>
                    ) : (
                        sessions.map((item) => {
                            const diffMs = new Date(item.hora_fin) - new Date(item.hora_inicio);
                            const durationHrs = Math.max(0, diffMs / (1000 * 3600)).toFixed(2);
                            const startTimeStr = new Date(item.hora_inicio).toLocaleTimeString('es-ES', {
                                hour: '2-digit',
                                minute: '2-digit',
                            });
                            const endTimeStr = new Date(item.hora_fin).toLocaleTimeString('es-ES', {
                                hour: '2-digit',
                                minute: '2-digit',
                            });

                            return (
                                <View key={item.id} style={styles.sessionCard}>
                                    <View style={styles.sessionInfoWrap}>
                                        <View style={styles.sessionDateRow}>
                                            <Text style={styles.sessionDate}>{item.fecha}</Text>
                                            <Text style={styles.sessionHoursRange}>
                                                {startTimeStr} - {endTimeStr} ({durationHrs}h)
                                            </Text>
                                        </View>
                                        <Text style={styles.sessionRateLegend}>
                                            Tarifa aplicada: {item.precio_hora} €/h
                                        </Text>
                                    </View>

                                    <View style={styles.sessionRight}>
                                        <Text style={styles.sessionIncome}>
                                            +{Number(item.ingreso_generado || 0).toLocaleString('es-ES')} €
                                        </Text>
                                        <TouchableOpacity
                                            onPress={() => handleDeleteSession(item.id)}
                                            style={styles.deleteBtn}
                                        >
                                            <Text style={styles.deleteBtnText}>✕</Text>
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            );
                        })
                    )}
                </View>
            </ScrollView>

            {/* MODAL REGISTRO MANUAL */}
            <Modal
                visible={manualModalVisible}
                transparent
                animationType="fade"
                onRequestClose={() => setManualModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalCard}>
                        <Text style={styles.modalTitle}>Añadir Jornada Manual</Text>
                        <Text style={styles.modalSub}>
                            Registra horas de trabajo previas para computar ingresos y flujo de caja.
                        </Text>

                        <Text style={styles.inputLabel}>HORAS TRABAJADAS</Text>
                        <TextInput
                            style={styles.modalInput}
                            keyboardType="numeric"
                            placeholder="Ej. 4.5"
                            placeholderTextColor="#52525b"
                            value={manualHours}
                            onChangeText={setManualHours}
                        />

                        <Text style={styles.inputLabel}>TARIFA POR HORA (€)</Text>
                        <TextInput
                            style={styles.modalInput}
                            keyboardType="numeric"
                            placeholder="45"
                            placeholderTextColor="#52525b"
                            value={manualRate}
                            onChangeText={setManualRate}
                        />

                        {manualHours && manualRate && !isNaN(parseFloat(manualHours)) && !isNaN(parseFloat(manualRate)) ? (
                            <View style={styles.modalPreview}>
                                <Text style={styles.modalPreviewLabel}>Ingreso Devengado a Liquidar:</Text>
                                <Text style={styles.modalPreviewAmount}>
                                    +{(parseFloat(manualHours) * parseFloat(manualRate)).toFixed(2)} €
                                </Text>
                            </View>
                        ) : null}

                        <View style={styles.modalActions}>
                            <TouchableOpacity
                                style={styles.modalCancelBtn}
                                onPress={() => setManualModalVisible(false)}
                            >
                                <Text style={styles.modalCancelBtnText}>Cancelar</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.modalConfirmBtn}
                                onPress={handleSaveManualSession}
                                disabled={saving}
                            >
                                {saving ? (
                                    <ActivityIndicator color="#000000" />
                                ) : (
                                    <Text style={styles.modalConfirmBtnText}>Guardar</Text>
                                )}
                            </TouchableOpacity>
                        </View>
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
    manualEntryBtn: {
        backgroundColor: '#121216',
        paddingHorizontal: 14,
        paddingVertical: 7,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#27272a',
    },
    manualEntryBtnText: {
        color: '#38bdf8',
        fontSize: 12,
        fontWeight: '700',
    },
    kpiContainer: {
        flexDirection: 'row',
        backgroundColor: '#0a0a0c',
        borderRadius: 14,
        paddingVertical: 14,
        paddingHorizontal: 16,
        borderWidth: 1,
        borderColor: '#1f1f23',
        marginBottom: 20,
        justifyContent: 'space-between',
    },
    kpiBox: {
        flex: 1,
        alignItems: 'center',
    },
    kpiDivider: {
        width: 1,
        backgroundColor: '#1f1f23',
    },
    kpiLabel: {
        color: '#71717a',
        fontSize: 9,
        fontWeight: '800',
        letterSpacing: 0.8,
        marginBottom: 4,
    },
    kpiValueCyan: {
        color: '#06b6d4',
        fontSize: 17,
        fontWeight: '900',
    },
    kpiValueGreen: {
        color: '#10b981',
        fontSize: 17,
        fontWeight: '900',
    },
    kpiValueWhite: {
        color: '#f4f4f5',
        fontSize: 17,
        fontWeight: '900',
    },

    // Tarjeta del Cronómetro
    timerCard: {
        backgroundColor: '#0a0a0c',
        borderRadius: 20,
        padding: 22,
        borderWidth: 1,
        borderColor: '#1f1f23',
        alignItems: 'center',
        marginBottom: 24,
    },
    timerCardActive: {
        borderColor: 'rgba(6, 182, 212, 0.5)',
        backgroundColor: '#081016',
    },
    timerStatusRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
    },
    statusDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#52525b',
        marginRight: 8,
    },
    statusDotActive: {
        backgroundColor: '#06b6d4',
    },
    statusLabel: {
        color: '#71717a',
        fontSize: 10,
        fontWeight: '800',
        letterSpacing: 1.2,
    },
    statusLabelActive: {
        color: '#06b6d4',
    },
    timerDisplay: {
        color: '#ffffff',
        fontSize: 54,
        fontWeight: '900',
        letterSpacing: 2,
    },
    liveCashRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 8,
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        paddingHorizontal: 14,
        paddingVertical: 6,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: 'rgba(16, 185, 129, 0.25)',
    },
    liveCashPrefix: {
        color: '#a1a1aa',
        fontSize: 12,
        fontWeight: '600',
        marginRight: 6,
    },
    liveCashAmount: {
        color: '#10b981',
        fontSize: 15,
        fontWeight: '800',
    },

    // Tarifas
    rateConfigSection: {
        width: '100%',
        marginTop: 20,
        marginBottom: 10,
    },
    rateConfigTitle: {
        color: '#71717a',
        fontSize: 10,
        fontWeight: '800',
        letterSpacing: 0.8,
        marginBottom: 8,
        textAlign: 'center',
    },
    ratePresetsRow: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 8,
    },
    presetPill: {
        paddingVertical: 8,
        paddingHorizontal: 14,
        borderRadius: 10,
        backgroundColor: '#141418',
        borderWidth: 1,
        borderColor: '#27272a',
    },
    presetPillActive: {
        backgroundColor: '#06b6d4',
        borderColor: '#06b6d4',
    },
    presetPillText: {
        color: '#a1a1aa',
        fontSize: 13,
        fontWeight: '700',
    },
    presetPillTextActive: {
        color: '#000000',
        fontWeight: '900',
    },
    customRateWrap: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#141418',
        borderRadius: 10,
        paddingHorizontal: 10,
        borderWidth: 1,
        borderColor: '#27272a',
        height: 38,
    },
    customRateInput: {
        color: '#ffffff',
        fontSize: 13,
        fontWeight: '700',
        width: 36,
        padding: 0,
    },
    customRateUnit: {
        color: '#71717a',
        fontSize: 11,
        fontWeight: '600',
    },

    // Botones
    actionsContainer: {
        width: '100%',
        marginTop: 20,
    },
    startBtn: {
        flexDirection: 'row',
        backgroundColor: '#06b6d4',
        borderRadius: 14,
        paddingVertical: 16,
        justifyContent: 'center',
        alignItems: 'center',
        gap: 10,
    },
    startBtnIcon: {
        color: '#000000',
        fontSize: 16,
        fontWeight: '900',
    },
    startBtnText: {
        color: '#000000',
        fontSize: 14,
        fontWeight: '900',
        letterSpacing: 1,
    },
    stopBtn: {
        flexDirection: 'row',
        backgroundColor: '#ef4444',
        borderRadius: 14,
        paddingVertical: 16,
        justifyContent: 'center',
        alignItems: 'center',
        gap: 10,
    },
    stopBtnIcon: {
        color: '#ffffff',
        fontSize: 14,
        fontWeight: '900',
    },
    stopBtnText: {
        color: '#ffffff',
        fontSize: 14,
        fontWeight: '900',
        letterSpacing: 1,
    },

    // Historial
    historySection: {
        marginTop: 8,
    },
    historyHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'baseline',
        marginBottom: 12,
    },
    historyTitle: {
        color: '#71717a',
        fontSize: 11,
        fontWeight: '800',
        letterSpacing: 1,
    },
    historySubtitle: {
        color: '#52525b',
        fontSize: 11,
        fontWeight: '600',
    },
    sessionCard: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#0a0a0c',
        borderRadius: 14,
        padding: 14,
        borderWidth: 1,
        borderColor: '#1f1f23',
        marginBottom: 10,
    },
    sessionInfoWrap: {
        flex: 1,
    },
    sessionDateRow: {
        flexDirection: 'row',
        alignItems: 'baseline',
        gap: 8,
        marginBottom: 3,
    },
    sessionDate: {
        color: '#f4f4f5',
        fontSize: 14,
        fontWeight: '700',
    },
    sessionHoursRange: {
        color: '#a1a1aa',
        fontSize: 12,
        fontWeight: '500',
    },
    sessionRateLegend: {
        color: '#71717a',
        fontSize: 11,
    },
    sessionRight: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    sessionIncome: {
        color: '#10b981',
        fontSize: 16,
        fontWeight: '900',
    },
    deleteBtn: {
        padding: 6,
    },
    deleteBtnText: {
        color: '#52525b',
        fontSize: 14,
        fontWeight: '700',
    },
    emptyCard: {
        backgroundColor: '#0a0a0c',
        borderRadius: 14,
        padding: 24,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#1f1f23',
    },
    emptyCardText: {
        color: '#a1a1aa',
        fontSize: 14,
        fontWeight: '600',
    },
    emptyCardSubText: {
        color: '#52525b',
        fontSize: 12,
        marginTop: 4,
        textAlign: 'center',
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
        fontSize: 18,
        fontWeight: '800',
        marginBottom: 4,
    },
    modalSub: {
        color: '#a1a1aa',
        fontSize: 12,
        marginBottom: 16,
        lineHeight: 16,
    },
    inputLabel: {
        color: '#71717a',
        fontSize: 10,
        fontWeight: '800',
        letterSpacing: 0.8,
        marginBottom: 6,
    },
    modalInput: {
        backgroundColor: '#18181b',
        borderRadius: 10,
        paddingHorizontal: 14,
        paddingVertical: 10,
        color: '#ffffff',
        fontSize: 15,
        fontWeight: '700',
        borderWidth: 1,
        borderColor: '#27272a',
        marginBottom: 14,
    },
    modalPreview: {
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        padding: 12,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: 'rgba(16, 185, 129, 0.25)',
        marginBottom: 16,
        alignItems: 'center',
    },
    modalPreviewLabel: {
        color: '#a1a1aa',
        fontSize: 11,
        fontWeight: '600',
    },
    modalPreviewAmount: {
        color: '#10b981',
        fontSize: 20,
        fontWeight: '900',
        marginTop: 2,
    },
    modalActions: {
        flexDirection: 'row',
        gap: 10,
    },
    modalCancelBtn: {
        flex: 1,
        backgroundColor: '#1c1c20',
        borderRadius: 10,
        paddingVertical: 12,
        alignItems: 'center',
    },
    modalCancelBtnText: {
        color: '#a1a1aa',
        fontSize: 13,
        fontWeight: '700',
    },
    modalConfirmBtn: {
        flex: 1,
        backgroundColor: '#06b6d4',
        borderRadius: 10,
        paddingVertical: 12,
        alignItems: 'center',
    },
    modalConfirmBtnText: {
        color: '#000000',
        fontSize: 13,
        fontWeight: '900',
    },
});

