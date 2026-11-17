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
    addWorkSession,
    deleteWorkSession,
} from './dataStore';

function parseHHMMToMinutes(hhmm) {
    if (!hhmm || !String(hhmm).includes(':')) return null;
    const parts = String(hhmm).trim().split(':');
    const h = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10);
    if (isNaN(h) || isNaN(m) || h < 0 || h > 23 || m < 0 || m > 59) return null;
    return h * 60 + m;
}

function calcSpanMinutes(startStr, endStr) {
    const s = parseHHMMToMinutes(startStr);
    const e = parseHHMMToMinutes(endStr);
    if (s === null || e === null) return 0;
    if (e >= s) return e - s;
    return 1440 - s + e;
}

export default function WorkScreen({ onNavigate }) {
    const todayDefault = new Date().toISOString().split('T')[0];

    const [isTimerRunning, setIsTimerRunning] = useState(false);
    const [isOnBreak, setIsOnBreak] = useState(false);
    const [secondsElapsed, setSecondsElapsed] = useState(0);
    const [breakSeconds, setBreakSeconds] = useState(0);
    const [sessionStartTime, setSessionStartTime] = useState(null);
    const [hourlyRate, setHourlyRate] = useState('45');
    const [liveNote, setLiveNote] = useState('');

    const [sessions, setSessions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // Modal completo de jornada
    const [manualModalVisible, setManualModalVisible] = useState(false);
    const [manualDate, setManualDate] = useState(todayDefault);
    const [isSplitShift, setIsSplitShift] = useState(false);
    const [t1Start, setT1Start] = useState('09:00');
    const [t1End, setT1End] = useState('14:00');
    const [t2Start, setT2Start] = useState('15:30');
    const [t2End, setT2End] = useState('18:30');
    const [breakMinutesInput, setBreakMinutesInput] = useState('15');
    const [manualRate, setManualRate] = useState('45');
    const [extraHoursInput, setExtraHoursInput] = useState('0');
    const [extraRateInput, setExtraRateInput] = useState('60');
    const [manualNote, setManualNote] = useState('');

    const timerRef = useRef(null);

    useEffect(() => {
        let mounted = true;
        getStoreState(true).then((s) => {
            if (mounted) {
                setSessions(s.workSessions || []);
                setLoading(false);
            }
        });
        const unsub = subscribeStore((s) => {
            if (mounted) setSessions([...(s.workSessions || [])]);
        });
        return () => {
            mounted = false;
            unsub();
        };
    }, []);

    useEffect(() => {
        if (isTimerRunning) {
            timerRef.current = setInterval(() => {
                if (isOnBreak) {
                    setBreakSeconds((prev) => prev + 1);
                } else {
                    setSecondsElapsed((prev) => prev + 1);
                }
            }, 1000);
        } else if (timerRef.current) {
            clearInterval(timerRef.current);
        }
        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, [isTimerRunning, isOnBreak]);

    const formatTime = (totalSeconds) => {
        const hrs = Math.floor(totalSeconds / 3600);
        const mins = Math.floor((totalSeconds % 3600) / 60);
        const secs = totalSeconds % 60;
        return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    };

    const liveEarnings = useMemo(() => {
        const numRate = parseFloat(hourlyRate) || 0;
        return ((secondsElapsed / 3600) * numRate).toFixed(2);
    }, [secondsElapsed, hourlyRate]);

    // Cálculo en vivo del formulario manual
    const manualPreview = useMemo(() => {
        const m1 = calcSpanMinutes(t1Start, t1End);
        const m2 = isSplitShift ? calcSpanMinutes(t2Start, t2End) : 0;
        const breakM = Math.max(0, parseInt(breakMinutesInput, 10) || 0);
        const netMinutes = Math.max(0, m1 + m2 - breakM);
        const netHours = netMinutes / 60;

        const rate = Math.max(0, parseFloat(manualRate) || 0);
        const extraHrs = Math.max(0, parseFloat(extraHoursInput) || 0);
        const extraRate = Math.max(0, parseFloat(extraRateInput) || rate);

        const ordinaryHrs = Math.max(0, netHours - Math.min(netHours, extraHrs));
        const totalPay = ordinaryHrs * rate + extraHrs * extraRate;

        return {
            netHours: Number(netHours.toFixed(2)),
            ordinaryHours: Number(ordinaryHrs.toFixed(2)),
            extraHours: Number(extraHrs.toFixed(2)),
            breakMinutes: breakM,
            totalPay: Number(totalPay.toFixed(2)),
            valid: m1 > 0 && (!isSplitShift || m2 > 0),
        };
    }, [t1Start, t1End, t2Start, t2End, isSplitShift, breakMinutesInput, manualRate, extraHoursInput, extraRateInput]);

    const handleStartTimer = () => {
        const rate = parseFloat(hourlyRate);
        if (isNaN(rate) || rate <= 0) {
            Alert.alert('Tarifa requerida', 'Introduce una tarifa por hora válida antes de empezar.');
            return;
        }
        setSessionStartTime(new Date());
        setIsOnBreak(false);
        setBreakSeconds(0);
        setIsTimerRunning(true);
    };

    const handleToggleBreak = () => {
        setIsOnBreak((prev) => !prev);
    };

    const resetLiveTimer = () => {
        setIsTimerRunning(false);
        setIsOnBreak(false);
        setSecondsElapsed(0);
        setBreakSeconds(0);
        setSessionStartTime(null);
        setLiveNote('');
    };

    const saveLiveSession = async (startTime, endTime, rate, totalGenerated) => {
        try {
            setSaving(true);
            const workedHrs = Number((secondsElapsed / 3600).toFixed(2));
            const breakMins = Math.round(breakSeconds / 60);
            const tStartStr = `${String(startTime.getHours()).padStart(2, '0')}:${String(startTime.getMinutes()).padStart(2, '0')}`;
            const tEndStr = `${String(endTime.getHours()).padStart(2, '0')}:${String(endTime.getMinutes()).padStart(2, '0')}`;

            await addWorkSession({
                fecha: startTime.toISOString().split('T')[0],
                hora_inicio: startTime.toISOString(),
                hora_fin: endTime.toISOString(),
                jornada_partida: false,
                turno1_inicio: tStartStr,
                turno1_fin: tEndStr,
                turno2_inicio: '',
                turno2_fin: '',
                descanso_minutos: breakMins,
                horas_ordinarias: workedHrs,
                horas_extra: 0,
                precio_hora: rate,
                precio_hora_extra: rate,
                ingreso_generado: totalGenerated,
                nota: liveNote.trim(),
            });

            Alert.alert(
                'Jornada guardada',
                `Has generado +${totalGenerated.toLocaleString('es-ES')} € (${workedHrs}h trabajadas, ${breakMins} min de descanso).`
            );
            resetLiveTimer();
        } catch (error) {
            Alert.alert('Error al guardar', error.message);
        } finally {
            setSaving(false);
        }
    };

    const handleStopTimer = async () => {
        if (!sessionStartTime) return;
        const endTime = new Date();
        const durationHours = secondsElapsed / 3600;
        const rate = parseFloat(hourlyRate) || 0;
        const totalGenerated = Number((durationHours * rate).toFixed(2));

        if (secondsElapsed < 60) {
            Alert.alert(
                'Sesión muy corta',
                'La sesión activa duró menos de un minuto. ¿Quieres descartarla o guardarla?',
                [
                    { text: 'Descartar', style: 'destructive', onPress: resetLiveTimer },
                    { text: 'Guardar', onPress: () => saveLiveSession(sessionStartTime, endTime, rate, totalGenerated) },
                ]
            );
            return;
        }

        await saveLiveSession(sessionStartTime, endTime, rate, totalGenerated);
    };

    const handleSaveManualSession = async () => {
        if (!manualPreview.valid) {
            Alert.alert('Horarios inválidos', 'Revisa el formato HH:MM en inicio y fin de cada turno (ej. 09:00 y 14:00).');
            return;
        }
        const rate = parseFloat(manualRate);
        if (isNaN(rate) || rate <= 0) {
            Alert.alert('Tarifa requerida', 'Introduce una tarifa normal válida.');
            return;
        }

        try {
            setSaving(true);
            const dateStr = manualDate.trim() || todayDefault;
            const endTimeStr = isSplitShift ? t2End.trim() : t1End.trim();
            await addWorkSession({
                fecha: dateStr,
                hora_inicio: `${dateStr}T${t1Start.trim()}:00`,
                hora_fin: `${dateStr}T${endTimeStr}:00`,
                jornada_partida: isSplitShift,
                turno1_inicio: t1Start.trim(),
                turno1_fin: t1End.trim(),
                turno2_inicio: isSplitShift ? t2Start.trim() : '',
                turno2_fin: isSplitShift ? t2End.trim() : '',
                descanso_minutos: manualPreview.breakMinutes,
                horas_ordinarias: manualPreview.ordinaryHours,
                horas_extra: manualPreview.extraHours,
                precio_hora: rate,
                precio_hora_extra: parseFloat(extraRateInput) || rate,
                ingreso_generado: manualPreview.totalPay,
                nota: manualNote.trim(),
            });

            setManualModalVisible(false);
            setManualNote('');
            setExtraHoursInput('0');
            Alert.alert(
                'Jornada registrada',
                `+${manualPreview.totalPay.toLocaleString('es-ES')} € (${manualPreview.ordinaryHours}h ord. + ${manualPreview.extraHours}h extra).`
            );
        } catch (error) {
            Alert.alert('Error al guardar', error.message);
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = (id) => {
        Alert.alert('Eliminar registro', '¿Quieres borrar esta jornada?', [
            { text: 'Cancelar', style: 'cancel' },
            { text: 'Eliminar', style: 'destructive', onPress: () => deleteWorkSession(id) },
        ]);
    };

    const todayStr = new Date().toISOString().split('T')[0];
    const yesterdayDate = new Date();
    yesterdayDate.setDate(yesterdayDate.getDate() - 1);
    const yesterdayStr = yesterdayDate.toISOString().split('T')[0];

    const todaySessions = sessions.filter((s) => (s.fecha || '').startsWith(todayStr));
    const todayHours = todaySessions.reduce((acc, s) => {
        if (s.horas_ordinarias !== undefined || s.horas_extra !== undefined) {
            return acc + (Number(s.horas_ordinarias) || 0) + (Number(s.horas_extra) || 0);
        }
        const diff = new Date(s.hora_fin) - new Date(s.hora_inicio);
        return acc + Math.max(0, diff / 3600000);
    }, 0);
    const todayBreaks = todaySessions.reduce((acc, s) => acc + (Number(s.descanso_minutos) || 0), 0);
    const todayIncome = todaySessions.reduce((acc, s) => acc + (Number(s.ingreso_generado) || 0), 0);

    return (
        <View style={styles.container}>
            <ScrollView
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                <View style={styles.innerWrap}>
                    {/* Barra superior */}
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
                            style={styles.manualBtn}
                            onPress={() => {
                                setManualDate(todayStr);
                                setManualRate(hourlyRate || '45');
                                setManualModalVisible(true);
                            }}
                        >
                            <Text style={styles.manualBtnText}>+ Registrar turno / partida</Text>
                        </TouchableOpacity>
                    </View>

                    <Text style={styles.title}>Jornada</Text>
                    <Text style={styles.subtitle}>
                        Fichaje en vivo con pausas, o registro completo de jornada partida, descansos y horas extra.
                    </Text>

                    {/* Resumen de hoy */}
                    <View style={styles.kpiCard}>
                        <View style={styles.kpiItem}>
                            <Text style={styles.kpiLabel}>Horas hoy</Text>
                            <Text style={[styles.kpiValue, { color: '#38BDF8' }]}>
                                {todayHours.toFixed(1)} h
                            </Text>
                        </View>
                        <View style={styles.kpiDivider} />
                        <View style={styles.kpiItem}>
                            <Text style={styles.kpiLabel}>Descansos</Text>
                            <Text style={styles.kpiValue}>{todayBreaks} min</Text>
                        </View>
                        <View style={styles.kpiDivider} />
                        <View style={styles.kpiItem}>
                            <Text style={styles.kpiLabel}>Generado hoy</Text>
                            <Text style={[styles.kpiValue, { color: '#34D399' }]}>
                                +{todayIncome.toFixed(0)} €
                            </Text>
                        </View>
                    </View>

                    {/* Temporizador con Pausa/Descanso */}
                    <View style={styles.timerCard}>
                        <Text style={[styles.timerStatus, isOnBreak && { color: '#F59E0B' }]}>
                            {!isTimerRunning
                                ? 'Listo para empezar'
                                : isOnBreak
                                    ? `En descanso (${formatTime(breakSeconds)})`
                                    : 'Jornada activa'}
                        </Text>
                        <Text style={[styles.timerDisplay, isOnBreak && { color: '#A1A1AA' }]}>
                            {formatTime(secondsElapsed)}
                        </Text>
                        <Text style={styles.liveEarnings}>+{liveEarnings} € acumulados</Text>
                        {breakSeconds > 0 && (
                            <Text style={styles.breakInfoText}>
                                Descanso acumulado: {Math.floor(breakSeconds / 60)} min {breakSeconds % 60}s
                            </Text>
                        )}

                        {!isTimerRunning && (
                            <View style={styles.rateSection}>
                                <Text style={styles.rateLabel}>Tarifa ordinaria por hora</Text>
                                <View style={styles.rateRow}>
                                    {['35', '45', '60', '80'].map((preset) => (
                                        <TouchableOpacity
                                            key={preset}
                                            style={[
                                                styles.ratePill,
                                                hourlyRate === preset && styles.ratePillActive,
                                            ]}
                                            onPress={() => setHourlyRate(preset)}
                                        >
                                            <Text
                                                style={[
                                                    styles.ratePillText,
                                                    hourlyRate === preset && styles.ratePillTextActive,
                                                ]}
                                            >
                                                {preset} €
                                            </Text>
                                        </TouchableOpacity>
                                    ))}
                                    <TextInput
                                        style={styles.customRateInput}
                                        keyboardType="numeric"
                                        value={hourlyRate}
                                        onChangeText={setHourlyRate}
                                        placeholder="Otra"
                                        placeholderTextColor="#52525B"
                                    />
                                </View>
                            </View>
                        )}

                        <TextInput
                            style={styles.liveNoteInput}
                            placeholder="Nota o proyecto de la jornada (opcional)"
                            placeholderTextColor="#52525B"
                            value={liveNote}
                            onChangeText={setLiveNote}
                        />

                        {!isTimerRunning ? (
                            <TouchableOpacity
                                style={styles.startBtn}
                                activeOpacity={0.8}
                                onPress={handleStartTimer}
                            >
                                <Text style={styles.startBtnText}>Iniciar jornada</Text>
                            </TouchableOpacity>
                        ) : (
                            <View style={styles.timerBtnsRow}>
                                <TouchableOpacity
                                    style={[styles.breakBtn, isOnBreak && styles.breakBtnResume]}
                                    activeOpacity={0.8}
                                    onPress={handleToggleBreak}
                                >
                                    <Text style={styles.breakBtnText}>
                                        {isOnBreak ? 'Reanudar' : 'Pausa / Descanso'}
                                    </Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.stopBtn, { flex: 1, marginTop: 0 }]}
                                    activeOpacity={0.8}
                                    onPress={handleStopTimer}
                                    disabled={saving}
                                >
                                    {saving ? (
                                        <ActivityIndicator color="#000000" />
                                    ) : (
                                        <Text style={styles.stopBtnText}>Finalizar</Text>
                                    )}
                                </TouchableOpacity>
                            </View>
                        )}
                    </View>

                    {/* Historial detallado */}
                    <Text style={styles.sectionTitle}>Últimas jornadas</Text>
                    {loading ? (
                        <ActivityIndicator color="#38BDF8" />
                    ) : sessions.length === 0 ? (
                        <View style={styles.emptyCard}>
                            <Text style={styles.emptyText}>No hay jornadas registradas todavía.</Text>
                        </View>
                    ) : (
                        sessions.slice(0, 12).map((item) => {
                            const netHrs = (item.horas_ordinarias !== undefined || item.horas_extra !== undefined)
                                ? (Number(item.horas_ordinarias) || 0) + (Number(item.horas_extra) || 0)
                                : Math.max(0, (new Date(item.hora_fin) - new Date(item.hora_inicio)) / 3600000);

                            const horarioStr = item.turno1_inicio && item.turno1_fin
                                ? (item.jornada_partida && item.turno2_inicio && item.turno2_fin
                                    ? `${item.turno1_inicio}–${item.turno1_fin} / ${item.turno2_inicio}–${item.turno2_fin}`
                                    : `${item.turno1_inicio}–${item.turno1_fin}`)
                                : '';

                            return (
                                <View key={item.id} style={styles.sessionCard}>
                                    <View style={{ flex: 1, paddingRight: 10 }}>
                                        <View style={styles.sessionTopRow}>
                                            <Text style={styles.sessionDate}>
                                                {item.fecha} · {netHrs.toFixed(1)} h
                                            </Text>
                                            {item.jornada_partida && (
                                                <View style={styles.splitBadge}>
                                                    <Text style={styles.splitBadgeText}>Partida</Text>
                                                </View>
                                            )}
                                            {Number(item.horas_extra) > 0 && (
                                                <View style={styles.extraBadge}>
                                                    <Text style={styles.extraBadgeText}>
                                                        +{item.horas_extra}h extra
                                                    </Text>
                                                </View>
                                            )}
                                        </View>
                                        <Text style={styles.sessionSub}>
                                            {horarioStr ? `${horarioStr} · ` : ''}
                                            {item.descanso_minutos ? `Desc. ${item.descanso_minutos}m · ` : ''}
                                            {item.precio_hora} €/h
                                            {Number(item.horas_extra) > 0 && item.precio_hora_extra
                                                ? ` (extra ${item.precio_hora_extra} €/h)`
                                                : ''}
                                        </Text>
                                        {item.nota ? (
                                            <Text style={styles.sessionNote} numberOfLines={2}>
                                                {item.nota}
                                            </Text>
                                        ) : null}
                                    </View>
                                    <View style={styles.sessionRight}>
                                        <Text style={styles.sessionIncome}>
                                            +{Number(item.ingreso_generado || 0).toFixed(2)} €
                                        </Text>
                                        <TouchableOpacity
                                            style={styles.deleteBtn}
                                            onPress={() => handleDelete(item.id)}
                                        >
                                            <Text style={styles.deleteText}>✕</Text>
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            );
                        })
                    )}
                </View>
            </ScrollView>

            {/* Modal completo de Jornada Continua / Partida + Descansos + Horas Extra */}
            <Modal
                visible={manualModalVisible}
                transparent
                animationType="fade"
                onRequestClose={() => setManualModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalCard}>
                        <ScrollView showsVerticalScrollIndicator={false}>
                            <Text style={styles.modalTitle}>Registrar jornada completa</Text>
                            <Text style={styles.modalSub}>
                                Incluye horario continuo o partido, descanso y tarifa de hora extra.
                            </Text>

                            {/* Fecha */}
                            <View style={styles.dateRow}>
                                <TouchableOpacity
                                    style={[styles.smallChip, manualDate === todayStr && styles.smallChipActive]}
                                    onPress={() => setManualDate(todayStr)}
                                >
                                    <Text style={[styles.smallChipText, manualDate === todayStr && styles.smallChipTextActive]}>
                                        Hoy
                                    </Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.smallChip, manualDate === yesterdayStr && styles.smallChipActive]}
                                    onPress={() => setManualDate(yesterdayStr)}
                                >
                                    <Text style={[styles.smallChipText, manualDate === yesterdayStr && styles.smallChipTextActive]}>
                                        Ayer
                                    </Text>
                                </TouchableOpacity>
                                <TextInput
                                    style={styles.dateInput}
                                    value={manualDate}
                                    onChangeText={setManualDate}
                                    placeholder="AAAA-MM-DD"
                                    placeholderTextColor="#52525B"
                                />
                            </View>

                            {/* Tipo de jornada */}
                            <Text style={styles.inputLabel}>Tipo de jornada</Text>
                            <View style={styles.toggleRow}>
                                <TouchableOpacity
                                    style={[styles.toggleBtn, !isSplitShift && styles.toggleBtnActive]}
                                    onPress={() => setIsSplitShift(false)}
                                >
                                    <Text style={[styles.toggleText, !isSplitShift && styles.toggleTextActive]}>
                                        Continua
                                    </Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.toggleBtn, isSplitShift && styles.toggleBtnActive]}
                                    onPress={() => setIsSplitShift(true)}
                                >
                                    <Text style={[styles.toggleText, isSplitShift && styles.toggleTextActive]}>
                                        Jornada partida
                                    </Text>
                                </TouchableOpacity>
                            </View>

                            {/* Turno 1 */}
                            <Text style={styles.inputLabel}>
                                {isSplitShift ? 'Turno mañana (Inicio — Fin)' : 'Horario (Inicio — Fin)'}
                            </Text>
                            <View style={styles.twoCol}>
                                <TextInput
                                    style={[styles.modalInput, { flex: 1 }]}
                                    value={t1Start}
                                    onChangeText={setT1Start}
                                    placeholder="09:00"
                                    placeholderTextColor="#52525B"
                                />
                                <TextInput
                                    style={[styles.modalInput, { flex: 1 }]}
                                    value={t1End}
                                    onChangeText={setT1End}
                                    placeholder="14:00"
                                    placeholderTextColor="#52525B"
                                />
                            </View>

                            {/* Turno 2 si partida */}
                            {isSplitShift && (
                                <>
                                    <Text style={styles.inputLabel}>Turno tarde (Inicio — Fin)</Text>
                                    <View style={styles.twoCol}>
                                        <TextInput
                                            style={[styles.modalInput, { flex: 1 }]}
                                            value={t2Start}
                                            onChangeText={setT2Start}
                                            placeholder="15:30"
                                            placeholderTextColor="#52525B"
                                        />
                                        <TextInput
                                            style={[styles.modalInput, { flex: 1 }]}
                                            value={t2End}
                                            onChangeText={setT2End}
                                            placeholder="18:30"
                                            placeholderTextColor="#52525B"
                                        />
                                    </View>
                                </>
                            )}

                            {/* Descanso y Tarifa normal */}
                            <View style={styles.twoCol}>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.inputLabel}>Descanso (min)</Text>
                                    <TextInput
                                        style={styles.modalInput}
                                        keyboardType="numeric"
                                        value={breakMinutesInput}
                                        onChangeText={setBreakMinutesInput}
                                        placeholder="15"
                                        placeholderTextColor="#52525B"
                                    />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.inputLabel}>Tarifa normal (€/h)</Text>
                                    <TextInput
                                        style={styles.modalInput}
                                        keyboardType="numeric"
                                        value={manualRate}
                                        onChangeText={setManualRate}
                                        placeholder="45"
                                        placeholderTextColor="#52525B"
                                    />
                                </View>
                            </View>

                            {/* Horas extra y tarifa extra */}
                            <View style={styles.twoCol}>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.inputLabel}>Horas extra</Text>
                                    <TextInput
                                        style={styles.modalInput}
                                        keyboardType="numeric"
                                        value={extraHoursInput}
                                        onChangeText={setExtraHoursInput}
                                        placeholder="0"
                                        placeholderTextColor="#52525B"
                                    />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.inputLabel}>Precio hora extra (€)</Text>
                                    <TextInput
                                        style={styles.modalInput}
                                        keyboardType="numeric"
                                        value={extraRateInput}
                                        onChangeText={setExtraRateInput}
                                        placeholder="60"
                                        placeholderTextColor="#52525B"
                                    />
                                </View>
                            </View>

                            <Text style={styles.inputLabel}>Nota / tarea (opcional)</Text>
                            <TextInput
                                style={styles.modalInput}
                                value={manualNote}
                                onChangeText={setManualNote}
                                placeholder="Ej: Cierre de sprint o guardia"
                                placeholderTextColor="#52525B"
                            />

                            {/* Previsualización */}
                            <View style={styles.previewBox}>
                                <Text style={styles.previewTitle}>Resumen calculado</Text>
                                <Text style={styles.previewLine}>
                                    {manualPreview.ordinaryHours}h ord. + {manualPreview.extraHours}h extra · Descanso {manualPreview.breakMinutes}m
                                </Text>
                                <Text style={styles.previewTotal}>+{manualPreview.totalPay.toFixed(2)} €</Text>
                            </View>

                            <View style={styles.modalActions}>
                                <TouchableOpacity
                                    style={styles.modalCancelBtn}
                                    onPress={() => setManualModalVisible(false)}
                                >
                                    <Text style={styles.modalCancelText}>Cancelar</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={styles.modalConfirmBtn}
                                    onPress={handleSaveManualSession}
                                    disabled={saving}
                                >
                                    <Text style={styles.modalConfirmText}>Guardar jornada</Text>
                                </TouchableOpacity>
                            </View>
                        </ScrollView>
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
    manualBtn: {
        backgroundColor: '#111114',
        paddingHorizontal: 12,
        paddingVertical: 7,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#232329',
    },
    manualBtnText: { color: '#38BDF8', fontSize: 12, fontWeight: '600' },
    title: { color: '#FAFAFA', fontSize: 26, fontWeight: '700', letterSpacing: -0.5 },
    subtitle: { color: '#A1A1AA', fontSize: 13, marginTop: 4, marginBottom: 18, lineHeight: 18 },
    kpiCard: {
        flexDirection: 'row',
        backgroundColor: '#111114',
        borderRadius: 18,
        paddingVertical: 14,
        borderWidth: 1,
        borderColor: '#232329',
        marginBottom: 18,
    },
    kpiItem: { flex: 1, alignItems: 'center' },
    kpiDivider: { width: 1, backgroundColor: '#232329' },
    kpiLabel: { color: '#71717A', fontSize: 11, marginBottom: 3 },
    kpiValue: { color: '#FAFAFA', fontSize: 16, fontWeight: '700' },
    timerCard: {
        backgroundColor: '#111114',
        borderRadius: 22,
        padding: 20,
        borderWidth: 1,
        borderColor: '#232329',
        alignItems: 'center',
        marginBottom: 24,
    },
    timerStatus: { color: '#A1A1AA', fontSize: 13, fontWeight: '600', marginBottom: 8 },
    timerDisplay: { color: '#FAFAFA', fontSize: 44, fontWeight: '700', letterSpacing: 1 },
    liveEarnings: { color: '#34D399', fontSize: 15, fontWeight: '600', marginTop: 6 },
    breakInfoText: { color: '#F59E0B', fontSize: 12, marginTop: 4 },
    rateSection: { width: '100%', marginTop: 18, marginBottom: 4 },
    rateLabel: { color: '#71717A', fontSize: 12, textAlign: 'center', marginBottom: 8 },
    rateRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8 },
    ratePill: {
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 10,
        backgroundColor: '#18181C',
        borderWidth: 1,
        borderColor: '#27272E',
    },
    ratePillActive: { backgroundColor: '#38BDF8', borderColor: '#38BDF8' },
    ratePillText: { color: '#A1A1AA', fontSize: 13, fontWeight: '600' },
    ratePillTextActive: { color: '#000000', fontWeight: '700' },
    customRateInput: {
        backgroundColor: '#18181C',
        color: '#FAFAFA',
        borderRadius: 10,
        paddingHorizontal: 10,
        paddingVertical: 7,
        width: 56,
        textAlign: 'center',
        fontSize: 13,
        fontWeight: '600',
        borderWidth: 1,
        borderColor: '#27272E',
    },
    liveNoteInput: {
        width: '100%',
        backgroundColor: '#18181C',
        borderRadius: 12,
        paddingHorizontal: 12,
        paddingVertical: 10,
        color: '#FAFAFA',
        fontSize: 13,
        borderWidth: 1,
        borderColor: '#232329',
        marginTop: 14,
    },
    startBtn: {
        width: '100%',
        backgroundColor: '#38BDF8',
        borderRadius: 14,
        paddingVertical: 15,
        alignItems: 'center',
        marginTop: 14,
    },
    startBtnText: { color: '#000000', fontSize: 15, fontWeight: '700' },
    timerBtnsRow: {
        flexDirection: 'row',
        width: '100%',
        gap: 10,
        marginTop: 14,
    },
    breakBtn: {
        flex: 1,
        backgroundColor: '#18181C',
        borderRadius: 14,
        paddingVertical: 15,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#F59E0B',
    },
    breakBtnResume: {
        backgroundColor: 'rgba(245, 158, 11, 0.16)',
    },
    breakBtnText: { color: '#F59E0B', fontSize: 14, fontWeight: '700' },
    stopBtn: {
        backgroundColor: '#FB7185',
        borderRadius: 14,
        paddingVertical: 15,
        alignItems: 'center',
    },
    stopBtnText: { color: '#000000', fontSize: 15, fontWeight: '700' },
    sectionTitle: { color: '#FAFAFA', fontSize: 16, fontWeight: '700', marginBottom: 12 },
    sessionCard: {
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
    sessionTopRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6 },
    sessionDate: { color: '#F4F4F5', fontSize: 14, fontWeight: '600' },
    splitBadge: {
        backgroundColor: 'rgba(56, 189, 248, 0.14)',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 6,
    },
    splitBadgeText: { color: '#38BDF8', fontSize: 10, fontWeight: '700' },
    extraBadge: {
        backgroundColor: 'rgba(245, 158, 11, 0.14)',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 6,
    },
    extraBadgeText: { color: '#F59E0B', fontSize: 10, fontWeight: '700' },
    sessionSub: { color: '#71717A', fontSize: 12, marginTop: 3 },
    sessionNote: { color: '#A1A1AA', fontSize: 12, marginTop: 3 },
    sessionRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    sessionIncome: { color: '#34D399', fontSize: 15, fontWeight: '700' },
    deleteBtn: { padding: 4 },
    deleteText: { color: '#52525B', fontSize: 14, fontWeight: '700' },
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
        backgroundColor: 'rgba(0,0,0,0.82)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    modalCard: {
        backgroundColor: '#111114',
        borderRadius: 20,
        padding: 20,
        width: '100%',
        maxWidth: 420,
        maxHeight: '88%',
        borderWidth: 1,
        borderColor: '#27272E',
    },
    modalTitle: { color: '#FAFAFA', fontSize: 18, fontWeight: '700', marginBottom: 4 },
    modalSub: { color: '#A1A1AA', fontSize: 13, marginBottom: 14 },
    dateRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 },
    smallChip: {
        paddingHorizontal: 10,
        paddingVertical: 8,
        borderRadius: 10,
        backgroundColor: '#18181C',
        borderWidth: 1,
        borderColor: '#27272E',
    },
    smallChipActive: { backgroundColor: '#38BDF8', borderColor: '#38BDF8' },
    smallChipText: { color: '#A1A1AA', fontSize: 12, fontWeight: '600' },
    smallChipTextActive: { color: '#000000', fontWeight: '700' },
    dateInput: {
        flex: 1,
        backgroundColor: '#18181C',
        borderRadius: 10,
        paddingHorizontal: 10,
        paddingVertical: 7,
        color: '#FAFAFA',
        fontSize: 13,
        borderWidth: 1,
        borderColor: '#27272E',
    },
    toggleRow: { flexDirection: 'row', gap: 8, marginBottom: 14 },
    toggleBtn: {
        flex: 1,
        paddingVertical: 10,
        borderRadius: 10,
        backgroundColor: '#18181C',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#27272E',
    },
    toggleBtnActive: { backgroundColor: '#38BDF8', borderColor: '#38BDF8' },
    toggleText: { color: '#A1A1AA', fontSize: 13, fontWeight: '600' },
    toggleTextActive: { color: '#000000', fontWeight: '700' },
    twoCol: { flexDirection: 'row', gap: 10 },
    inputLabel: { color: '#A1A1AA', fontSize: 12, marginBottom: 6 },
    modalInput: {
        backgroundColor: '#18181C',
        borderRadius: 12,
        paddingHorizontal: 12,
        paddingVertical: 10,
        color: '#FAFAFA',
        fontSize: 14,
        borderWidth: 1,
        borderColor: '#27272E',
        marginBottom: 12,
    },
    previewBox: {
        backgroundColor: '#18181C',
        borderRadius: 14,
        padding: 12,
        borderWidth: 1,
        borderColor: '#27272E',
        marginBottom: 14,
        alignItems: 'center',
    },
    previewTitle: { color: '#71717A', fontSize: 11, fontWeight: '600' },
    previewLine: { color: '#A1A1AA', fontSize: 12, marginTop: 2 },
    previewTotal: { color: '#34D399', fontSize: 19, fontWeight: '700', marginTop: 4 },
    modalActions: { flexDirection: 'row', gap: 10 },
    modalCancelBtn: {
        flex: 1,
        backgroundColor: '#18181C',
        borderRadius: 12,
        paddingVertical: 12,
        alignItems: 'center',
    },
    modalCancelText: { color: '#A1A1AA', fontSize: 14, fontWeight: '600' },
    modalConfirmBtn: {
        flex: 1,
        backgroundColor: '#38BDF8',
        borderRadius: 12,
        paddingVertical: 12,
        alignItems: 'center',
    },
    modalConfirmText: { color: '#000000', fontSize: 14, fontWeight: '700' },
});
