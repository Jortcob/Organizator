import React, { useState, useEffect, useMemo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    ActivityIndicator,
    Modal,
    TextInput,
    Alert,
} from 'react-native';
import {
    getStoreState,
    subscribeStore,
    addAppointment,
    updateAppointmentStatus,
    deleteAppointment,
} from './dataStore';

const WEEKDAYS = ['D', 'L', 'M', 'X', 'J', 'V', 'S'];

const APPT_TYPES = ['Cita', 'Reunión', 'Tarea'];

const APPT_STATUSES = [
    { id: 'pendiente', label: 'Pendiente', color: '#38BDF8', bg: 'rgba(56, 189, 248, 0.14)' },
    { id: 'realizada', label: 'Realizada ✓', color: '#34D399', bg: 'rgba(52, 211, 153, 0.14)' },
    { id: 'olvidada', label: 'Olvidada', color: '#F59E0B', bg: 'rgba(245, 158, 11, 0.14)' },
    { id: 'cancelada', label: 'Cancelada', color: '#71717A', bg: 'rgba(113, 113, 122, 0.16)' },
];

export default function CalendarScreen({ onNavigate }) {
    const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split('T')[0]);
    const [currentMonth] = useState(() => new Date());
    const [storeState, setStoreState] = useState(null);

    // Modal nueva cita / reunión
    const [modalVisible, setModalVisible] = useState(false);
    const [newTitle, setNewTitle] = useState('');
    const [newTime, setNewTime] = useState('17:00');
    const [newType, setNewType] = useState('Reunión');
    const [newNote, setNewNote] = useState('');

    useEffect(() => {
        let mounted = true;
        getStoreState(true).then((s) => {
            if (mounted) setStoreState({ ...s });
        });
        const unsub = subscribeStore((s) => {
            if (mounted) setStoreState({ ...s });
        });
        return () => {
            mounted = false;
            unsub();
        };
    }, []);

    // Mapa de indicadores por fecha para los puntitos del calendario
    const dateIndicators = useMemo(() => {
        if (!storeState) return {};
        const map = {};
        const mark = (d, key) => {
            const day = String(d || '').split('T')[0];
            if (!day) return;
            if (!map[day]) map[day] = { hasAppt: false, hasPending: false, hasActivity: false };
            map[day][key] = true;
        };

        (storeState.appointments || []).forEach((a) => {
            mark(a.fecha, 'hasAppt');
            if (a.estado === 'pendiente' || a.estado === 'olvidada') {
                mark(a.fecha, 'hasPending');
            }
        });
        (storeState.workSessions || []).forEach((w) => mark(w.fecha || w.hora_inicio, 'hasActivity'));
        (storeState.meals || []).forEach((m) => mark(m.fecha, 'hasActivity'));
        (storeState.workouts || []).forEach((w) => mark(w.fecha, 'hasActivity'));
        (storeState.transactions || []).forEach((t) => mark(t.fecha, 'hasActivity'));
        return map;
    }, [storeState]);

    const daysInMonth = useMemo(() => {
        const year = currentMonth.getFullYear();
        const month = currentMonth.getMonth();
        const date = new Date(year, month, 1);
        const days = [];
        const todayStr = new Date().toISOString().split('T')[0];

        while (date.getMonth() === month) {
            const dateStr = date.toISOString().split('T')[0];
            days.push({
                dateStr,
                dayNum: date.getDate(),
                dayOfWeek: WEEKDAYS[date.getDay()],
                isToday: dateStr === todayStr,
            });
            date.setDate(date.getDate() + 1);
        }
        return days;
    }, [currentMonth]);

    const dayData = useMemo(() => {
        if (!storeState) return null;
        const matchDate = (val) => String(val || '').split('T')[0] === selectedDate;

        const appointments = (storeState.appointments || [])
            .filter((a) => matchDate(a.fecha))
            .sort((a, b) => String(a.hora || '').localeCompare(String(b.hora || '')));

        const work = (storeState.workSessions || []).filter((w) => matchDate(w.fecha || w.hora_inicio));
        const meals = (storeState.meals || []).filter((m) => matchDate(m.fecha));
        const workouts = (storeState.workouts || []).filter((w) => matchDate(w.fecha));
        const transactions = (storeState.transactions || []).filter((t) => matchDate(t.fecha));

        let workHours = 0;
        let workIncome = 0;
        work.forEach((w) => {
            if (w.horas_ordinarias !== undefined || w.horas_extra !== undefined) {
                workHours += (Number(w.horas_ordinarias) || 0) + (Number(w.horas_extra) || 0);
            } else if (w.hora_inicio && w.hora_fin) {
                workHours += Math.max(0, (new Date(w.hora_fin) - new Date(w.hora_inicio)) / 3600000);
            }
            workIncome += Number(w.ingreso_generado || 0);
        });

        let manualIncome = 0;
        let expenses = 0;
        transactions.forEach((t) => {
            const amt = Number(t.cantidad || 0);
            if (t.tipo?.toLowerCase() === 'ingreso') manualIncome += amt;
            else expenses += amt;
        });

        let caloriesIn = 0;
        let proteinIn = 0;
        meals.forEach((m) => {
            (Array.isArray(m.alimentos) ? m.alimentos : []).forEach((f) => {
                caloriesIn += Number(f.kcal || f.kcal_totales || 0);
                proteinIn += Number(f.proteina || 0);
            });
        });

        const caloriesBurned = workouts.reduce((a, w) => a + Number(w.gasto_calorico || 0), 0);

        const events = [];
        work.forEach((w) => {
            const timeStr = w.turno1_inicio
                ? w.turno1_inicio
                : (w.hora_inicio ? new Date(w.hora_inicio).toTimeString().slice(0, 5) : '09:00');
            const hrs = (w.horas_ordinarias !== undefined || w.horas_extra !== undefined)
                ? ((Number(w.horas_ordinarias) || 0) + (Number(w.horas_extra) || 0)).toFixed(1)
                : (w.hora_fin
                    ? Math.max(0, (new Date(w.hora_fin) - new Date(w.hora_inicio)) / 3600000).toFixed(1)
                    : '0.0');
            events.push({
                id: `w-${w.id}`,
                time: timeStr,
                category: w.jornada_partida ? 'Jornada partida' : 'Trabajo',
                title: w.nota ? `Jornada · ${w.nota}` : 'Jornada laboral',
                details: `${hrs} h (${w.precio_hora} €/h)${Number(w.horas_extra) > 0 ? ` · +${w.horas_extra}h extra` : ''}`,
                badge: `+${Number(w.ingreso_generado || 0).toFixed(0)} €`,
                color: '#38BDF8',
            });
        });

        meals.forEach((m) => {
            const list = Array.isArray(m.alimentos) ? m.alimentos : [];
            const k = list.reduce((a, f) => a + Number(f.kcal || f.kcal_totales || 0), 0);
            const p = list.reduce((a, f) => a + Number(f.proteina || 0), 0);
            events.push({
                id: `m-${m.id}`,
                time: String(m.hora || '14:00').slice(0, 5),
                category: 'Dieta',
                title: m.nombre_personalizado || 'Comida',
                details: list.map((f) => `${f.nombre} (${f.gramos}g)`).join(', '),
                badge: `${Math.round(k)} kcal · ${Math.round(p)}g P`,
                color: '#F59E0B',
            });
        });

        workouts.forEach((w) => {
            events.push({
                id: `wko-${w.id}`,
                time: String(w.hora_inicio || '18:00').slice(0, 5),
                category: 'Entrenamiento',
                title: w.tipo_entrenamiento || 'Fuerza',
                details: `${w.duracion_minutos || 0} min${w.tonelaje ? ` · ${w.tonelaje} kg` : ''}`,
                badge: `${w.gasto_calorico || 0} kcal`,
                color: '#FB7185',
            });
        });

        transactions.forEach((tx) => {
            const timeStr = tx.fecha && String(tx.fecha).includes('T')
                ? String(tx.fecha).split('T')[1].slice(0, 5)
                : '12:00';
            const isGasto = tx.tipo?.toLowerCase() === 'gasto';
            events.push({
                id: `tx-${tx.id}`,
                time: timeStr,
                category: 'Economía',
                title: tx.categoria || (isGasto ? 'Gasto' : 'Ingreso'),
                details: tx.descripcion || '',
                badge: `${isGasto ? '-' : '+'}${Number(tx.cantidad || 0).toFixed(0)} €`,
                color: isGasto ? '#FB7185' : '#34D399',
            });
        });

        events.sort((a, b) => a.time.localeCompare(b.time));

        return {
            appointments,
            workHours: workHours.toFixed(1),
            workIncome: Math.round(workIncome),
            netDayCash: Math.round(workIncome + manualIncome - expenses),
            caloriesIn: Math.round(caloriesIn),
            proteinIn: Math.round(proteinIn),
            caloriesBurned: Math.round(caloriesBurned),
            events,
        };
    }, [storeState, selectedDate]);

    const handleSaveAppointment = async () => {
        if (!newTitle.trim()) {
            Alert.alert('Falta el título', 'Escribe un título para tu cita o reunión.');
            return;
        }
        await addAppointment({
            titulo: newTitle.trim(),
            fecha: selectedDate,
            hora: newTime.trim() || '10:00',
            tipo: newType,
            estado: 'pendiente',
            nota: newNote.trim(),
        });
        setModalVisible(false);
        setNewTitle('');
        setNewNote('');
        setNewTime('17:00');
    };

    const handleDeleteAppt = (id) => {
        Alert.alert('Eliminar cita', '¿Quieres borrar esta cita de tu agenda?', [
            { text: 'Cancelar', style: 'cancel' },
            { text: 'Eliminar', style: 'destructive', onPress: () => deleteAppointment(id) },
        ]);
    };

    const selectedDateLabel = useMemo(() => {
        try {
            const d = new Date(`${selectedDate}T12:00:00`);
            const text = d.toLocaleDateString('es-ES', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
            });
            return text.charAt(0).toUpperCase() + text.slice(1);
        } catch {
            return selectedDate;
        }
    }, [selectedDate]);

    const monthLabel = useMemo(() => {
        try {
            const text = currentMonth.toLocaleDateString('es-ES', {
                month: 'long',
                year: 'numeric',
            });
            return text.charAt(0).toUpperCase() + text.slice(1);
        } catch {
            return 'Mes actual';
        }
    }, [currentMonth]);

    if (!storeState || !dayData) {
        return (
            <View style={styles.loadingWrap}>
                <ActivityIndicator color="#34D399" />
            </View>
        );
    }

    const pendingCount = dayData.appointments.filter((a) => a.estado === 'pendiente').length;
    const forgottenCount = dayData.appointments.filter((a) => a.estado === 'olvidada').length;

    return (
        <View style={styles.container}>
            <ScrollView
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                <View style={styles.innerWrap}>
                    {/* Cabecera */}
                    <View style={styles.topNav}>
                        {onNavigate ? (
                            <TouchableOpacity
                                style={styles.backBtn}
                                onPress={() => onNavigate('dashboard')}
                            >
                                <Text style={styles.backBtnText}>← Inicio</Text>
                            </TouchableOpacity>
                        ) : <Text style={styles.monthLabel}>{monthLabel}</Text>}
                        <TouchableOpacity
                            style={styles.addApptBtn}
                            onPress={() => setModalVisible(true)}
                        >
                            <Text style={styles.addApptBtnText}>+ Cita / Reunión</Text>
                        </TouchableOpacity>
                    </View>

                    <Text style={styles.title}>Agenda</Text>
                    <Text style={styles.subtitle}>
                        {monthLabel} · Planifica citas, revisa su estado real y consulta tus actividades realizadas.
                    </Text>

                    {/* Selector horizontal de días con indicadores */}
                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.daysScroll}
                    >
                        {daysInMonth.map((day) => {
                            const active = day.dateStr === selectedDate;
                            const ind = dateIndicators[day.dateStr];
                            return (
                                <TouchableOpacity
                                    key={day.dateStr}
                                    style={[
                                        styles.dayPill,
                                        active && styles.dayPillActive,
                                        day.isToday && !active && styles.dayPillToday,
                                    ]}
                                    onPress={() => setSelectedDate(day.dateStr)}
                                >
                                    <Text style={[styles.dayWeek, active && styles.dayTextActive]}>
                                        {day.dayOfWeek}
                                    </Text>
                                    <Text style={[styles.dayNum, active && styles.dayTextActive]}>
                                        {day.dayNum}
                                    </Text>
                                    <View style={styles.dotsRow}>
                                        {ind?.hasAppt && (
                                            <View
                                                style={[
                                                    styles.miniDot,
                                                    { backgroundColor: ind.hasPending ? '#38BDF8' : '#34D399' },
                                                ]}
                                            />
                                        )}
                                        {ind?.hasActivity && (
                                            <View style={[styles.miniDot, { backgroundColor: '#F59E0B' }]} />
                                        )}
                                    </View>
                                </TouchableOpacity>
                            );
                        })}
                    </ScrollView>

                    {/* Resumen del día */}
                    <View style={styles.summaryCard}>
                        <View style={styles.summaryTopRow}>
                            <Text style={styles.summaryDate}>{selectedDateLabel}</Text>
                            <View style={styles.apptStatusChip}>
                                <Text style={styles.apptStatusChipText}>
                                    {dayData.appointments.length === 0
                                        ? 'Sin citas'
                                        : `${dayData.appointments.length} cita(s)${pendingCount > 0 ? ` · ${pendingCount} pend.` : ''}${forgottenCount > 0 ? ` · ${forgottenCount} olv.` : ''}`}
                                </Text>
                            </View>
                        </View>
                        <View style={styles.summaryRow}>
                            <View style={styles.summaryCol}>
                                <Text style={styles.summaryLabel}>Trabajo</Text>
                                <Text style={[styles.summaryVal, { color: '#38BDF8' }]}>
                                    {dayData.workHours}h
                                </Text>
                            </View>
                            <View style={styles.summaryDivider} />
                            <View style={styles.summaryCol}>
                                <Text style={styles.summaryLabel}>Comidas</Text>
                                <Text style={[styles.summaryVal, { color: '#F59E0B' }]}>
                                    {dayData.caloriesIn}
                                </Text>
                            </View>
                            <View style={styles.summaryDivider} />
                            <View style={styles.summaryCol}>
                                <Text style={styles.summaryLabel}>Entreno</Text>
                                <Text style={[styles.summaryVal, { color: '#FB7185' }]}>
                                    {dayData.caloriesBurned}
                                </Text>
                            </View>
                            <View style={styles.summaryDivider} />
                            <View style={styles.summaryCol}>
                                <Text style={styles.summaryLabel}>Caja</Text>
                                <Text
                                    style={[
                                        styles.summaryVal,
                                        { color: dayData.netDayCash >= 0 ? '#34D399' : '#FB7185' },
                                    ]}
                                >
                                    {dayData.netDayCash >= 0 ? '+' : ''}
                                    {dayData.netDayCash}€
                                </Text>
                            </View>
                        </View>
                    </View>

                    {/* Sección 1: Citas y reuniones con control de estado */}
                    <View style={styles.sectionHeaderRow}>
                        <Text style={styles.sectionTitle}>Citas y reuniones</Text>
                        <TouchableOpacity onPress={() => setModalVisible(true)}>
                            <Text style={styles.inlineAddText}>+ Añadir</Text>
                        </TouchableOpacity>
                    </View>

                    {dayData.appointments.length === 0 ? (
                        <View style={[styles.emptyCard, { marginBottom: 22 }]}>
                            <Text style={styles.emptyText}>
                                No tienes citas ni reuniones programadas para este día.
                            </Text>
                        </View>
                    ) : (
                        <View style={{ marginBottom: 22, gap: 10 }}>
                            {dayData.appointments.map((appt) => {
                                const st = APPT_STATUSES.find((s) => s.id === appt.estado) || APPT_STATUSES[0];
                                return (
                                    <View key={appt.id} style={styles.apptCard}>
                                        <View style={styles.apptTop}>
                                            <View style={styles.apptMetaRow}>
                                                <Text style={styles.apptTime}>{appt.hora}</Text>
                                                <Text style={styles.apptType}>{appt.tipo}</Text>
                                                <View style={[styles.statusBadge, { backgroundColor: st.bg }]}>
                                                    <Text style={[styles.statusBadgeText, { color: st.color }]}>
                                                        {st.label}
                                                    </Text>
                                                </View>
                                            </View>
                                            <TouchableOpacity onPress={() => handleDeleteAppt(appt.id)}>
                                                <Text style={styles.deleteText}>✕</Text>
                                            </TouchableOpacity>
                                        </View>

                                        <Text
                                            style={[
                                                styles.apptTitle,
                                                appt.estado === 'cancelada' && { textDecorationLine: 'line-through', color: '#71717A' },
                                            ]}
                                        >
                                            {appt.titulo}
                                        </Text>
                                        {appt.nota ? (
                                            <Text style={styles.apptNote}>{appt.nota}</Text>
                                        ) : null}

                                        {/* Botones rápidos para cambiar el estado si se olvidó o completó */}
                                        <View style={styles.statusSelectorRow}>
                                            {APPT_STATUSES.map((opt) => {
                                                const isCurr = appt.estado === opt.id;
                                                return (
                                                    <TouchableOpacity
                                                        key={opt.id}
                                                        style={[
                                                            styles.statusOptBtn,
                                                            isCurr && { backgroundColor: opt.bg, borderColor: opt.color },
                                                        ]}
                                                        onPress={() => updateAppointmentStatus(appt.id, opt.id)}
                                                    >
                                                        <Text
                                                            style={[
                                                                styles.statusOptText,
                                                                isCurr && { color: opt.color, fontWeight: '700' },
                                                            ]}
                                                        >
                                                            {opt.id === 'realizada' ? 'Realizada' : opt.label}
                                                        </Text>
                                                    </TouchableOpacity>
                                                );
                                            })}
                                        </View>
                                    </View>
                                );
                            })}
                        </View>
                    )}

                    {/* Sección 2: Actividad ya realizada (desde módulos) */}
                    <Text style={styles.sectionTitle}>Actividad realizada del día</Text>
                    {dayData.events.length === 0 ? (
                        <View style={styles.emptyCard}>
                            <Text style={styles.emptyText}>No hay actividad registrada este día.</Text>
                        </View>
                    ) : (
                        dayData.events.map((ev, idx) => (
                            <View key={ev.id} style={styles.timelineRow}>
                                <View style={styles.lineCol}>
                                    <View style={[styles.dot, { backgroundColor: ev.color }]} />
                                    {idx !== dayData.events.length - 1 && <View style={styles.line} />}
                                </View>
                                <View style={styles.eventCard}>
                                    <View style={styles.eventTop}>
                                        <View style={styles.eventCatRow}>
                                            <Text style={[styles.eventCat, { color: ev.color }]}>
                                                {ev.category}
                                            </Text>
                                            <View style={styles.donePill}>
                                                <Text style={styles.donePillText}>Realizada ✓</Text>
                                            </View>
                                        </View>
                                        <Text style={styles.eventTime}>{ev.time}</Text>
                                    </View>
                                    <Text style={styles.eventTitle}>{ev.title}</Text>
                                    {ev.details ? (
                                        <Text style={styles.eventDetails}>{ev.details}</Text>
                                    ) : null}
                                    <Text style={[styles.eventBadge, { color: ev.color }]}>
                                        {ev.badge}
                                    </Text>
                                </View>
                            </View>
                        ))
                    )}
                </View>
            </ScrollView>

            {/* Modal para añadir Cita o Reunión */}
            <Modal
                visible={modalVisible}
                transparent
                animationType="fade"
                onRequestClose={() => setModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalCard}>
                        <Text style={styles.modalTitle}>Nueva cita o reunión</Text>
                        <Text style={styles.modalSub}>Fecha: {selectedDateLabel}</Text>

                        <Text style={styles.inputLabel}>Tipo</Text>
                        <View style={styles.typeRow}>
                            {APPT_TYPES.map((t) => (
                                <TouchableOpacity
                                    key={t}
                                    style={[styles.typeChip, newType === t && styles.typeChipActive]}
                                    onPress={() => setNewType(t)}
                                >
                                    <Text style={[styles.typeChipText, newType === t && styles.typeChipTextActive]}>
                                        {t}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        <Text style={styles.inputLabel}>Título</Text>
                        <TextInput
                            style={styles.modalInput}
                            placeholder="Ej: Dentista, Reunión equipo, Entrega..."
                            placeholderTextColor="#52525B"
                            value={newTitle}
                            onChangeText={setNewTitle}
                        />

                        <Text style={styles.inputLabel}>Hora (HH:MM)</Text>
                        <TextInput
                            style={styles.modalInput}
                            placeholder="17:00"
                            placeholderTextColor="#52525B"
                            value={newTime}
                            onChangeText={setNewTime}
                        />

                        <Text style={styles.inputLabel}>Nota (opcional)</Text>
                        <TextInput
                            style={styles.modalInput}
                            placeholder="Dirección, enlace o detalles"
                            placeholderTextColor="#52525B"
                            value={newNote}
                            onChangeText={setNewNote}
                        />

                        <View style={styles.modalActions}>
                            <TouchableOpacity
                                style={styles.modalCancelBtn}
                                onPress={() => setModalVisible(false)}
                            >
                                <Text style={styles.modalCancelText}>Cancelar</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.modalConfirmBtn}
                                onPress={handleSaveAppointment}
                            >
                                <Text style={styles.modalConfirmText}>Añadir a agenda</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#000000' },
    loadingWrap: { flex: 1, backgroundColor: '#000000', justifyContent: 'center', alignItems: 'center' },
    scrollContent: { paddingHorizontal: 20, paddingTop: 14, paddingBottom: 40 },
    innerWrap: { width: '100%', maxWidth: 520, alignSelf: 'center' },
    topNav: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
    },
    backBtn: { paddingVertical: 6, paddingRight: 12 },
    backBtnText: { color: '#A1A1AA', fontSize: 14, fontWeight: '600' },
    monthLabel: { color: '#A1A1AA', fontSize: 13, fontWeight: '600' },
    addApptBtn: {
        backgroundColor: '#111114',
        paddingHorizontal: 12,
        paddingVertical: 7,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#232329',
    },
    addApptBtnText: { color: '#38BDF8', fontSize: 12, fontWeight: '600' },
    title: { color: '#FAFAFA', fontSize: 26, fontWeight: '700', letterSpacing: -0.5 },
    subtitle: { color: '#A1A1AA', fontSize: 13, marginTop: 4, marginBottom: 16, lineHeight: 18 },
    daysScroll: { gap: 8, paddingVertical: 4, marginBottom: 18 },
    dayPill: {
        width: 48,
        height: 68,
        borderRadius: 14,
        backgroundColor: '#111114',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#232329',
    },
    dayPillActive: { backgroundColor: '#FAFAFA', borderColor: '#FAFAFA' },
    dayPillToday: { borderColor: '#52525B' },
    dayWeek: { color: '#71717A', fontSize: 11, fontWeight: '600', marginBottom: 2 },
    dayNum: { color: '#FAFAFA', fontSize: 15, fontWeight: '700' },
    dayTextActive: { color: '#000000' },
    dotsRow: { flexDirection: 'row', gap: 3, marginTop: 4, height: 6 },
    miniDot: { width: 5, height: 5, borderRadius: 3 },
    summaryCard: {
        backgroundColor: '#111114',
        borderRadius: 18,
        padding: 16,
        borderWidth: 1,
        borderColor: '#232329',
        marginBottom: 22,
    },
    summaryTopRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
        gap: 8,
    },
    summaryDate: { color: '#FAFAFA', fontSize: 14, fontWeight: '600', flex: 1 },
    apptStatusChip: {
        backgroundColor: '#18181C',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#27272E',
    },
    apptStatusChipText: { color: '#A1A1AA', fontSize: 11, fontWeight: '600' },
    summaryRow: { flexDirection: 'row' },
    summaryCol: { flex: 1, alignItems: 'center' },
    summaryDivider: { width: 1, backgroundColor: '#232329' },
    summaryLabel: { color: '#71717A', fontSize: 11, marginBottom: 2 },
    summaryVal: { fontSize: 15, fontWeight: '700' },
    sectionHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    sectionTitle: { color: '#FAFAFA', fontSize: 16, fontWeight: '700', marginBottom: 12 },
    inlineAddText: { color: '#38BDF8', fontSize: 13, fontWeight: '600', marginBottom: 12 },
    apptCard: {
        backgroundColor: '#111114',
        borderRadius: 16,
        padding: 14,
        borderWidth: 1,
        borderColor: '#232329',
    },
    apptTop: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 6,
    },
    apptMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
    apptTime: { color: '#FAFAFA', fontSize: 13, fontWeight: '700' },
    apptType: { color: '#A1A1AA', fontSize: 12, fontWeight: '600' },
    statusBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
    statusBadgeText: { fontSize: 11, fontWeight: '700' },
    deleteText: { color: '#52525B', fontSize: 14, fontWeight: '700', paddingHorizontal: 4 },
    apptTitle: { color: '#FAFAFA', fontSize: 15, fontWeight: '600' },
    apptNote: { color: '#A1A1AA', fontSize: 12, marginTop: 3 },
    statusSelectorRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 6,
        marginTop: 12,
        paddingTop: 10,
        borderTopWidth: 1,
        borderTopColor: '#1E1E24',
    },
    statusOptBtn: {
        paddingHorizontal: 8,
        paddingVertical: 5,
        borderRadius: 8,
        backgroundColor: '#18181C',
        borderWidth: 1,
        borderColor: '#27272E',
    },
    statusOptText: { color: '#71717A', fontSize: 11, fontWeight: '600' },
    timelineRow: { flexDirection: 'row', marginBottom: 12 },
    lineCol: { width: 20, alignItems: 'center', marginRight: 10 },
    dot: { width: 8, height: 8, borderRadius: 4, marginTop: 8 },
    line: { flex: 1, width: 1.5, backgroundColor: '#232329', marginTop: 4 },
    eventCard: {
        flex: 1,
        backgroundColor: '#111114',
        borderRadius: 16,
        padding: 14,
        borderWidth: 1,
        borderColor: '#232329',
    },
    eventTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
    eventCatRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    eventCat: { fontSize: 11, fontWeight: '600' },
    donePill: {
        backgroundColor: 'rgba(52, 211, 153, 0.12)',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 6,
    },
    donePillText: { color: '#34D399', fontSize: 10, fontWeight: '700' },
    eventTime: { color: '#71717A', fontSize: 11 },
    eventTitle: { color: '#FAFAFA', fontSize: 14, fontWeight: '600' },
    eventDetails: { color: '#A1A1AA', fontSize: 12, marginTop: 3 },
    eventBadge: { fontSize: 12, fontWeight: '700', marginTop: 6 },
    emptyCard: {
        backgroundColor: '#111114',
        borderRadius: 16,
        padding: 20,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#232329',
    },
    emptyText: { color: '#71717A', fontSize: 13, textAlign: 'center' },
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
        maxWidth: 400,
        borderWidth: 1,
        borderColor: '#27272E',
    },
    modalTitle: { color: '#FAFAFA', fontSize: 18, fontWeight: '700', marginBottom: 4 },
    modalSub: { color: '#A1A1AA', fontSize: 12, marginBottom: 14 },
    typeRow: { flexDirection: 'row', gap: 8, marginBottom: 14 },
    typeChip: {
        flex: 1,
        paddingVertical: 9,
        borderRadius: 10,
        backgroundColor: '#18181C',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#27272E',
    },
    typeChipActive: { backgroundColor: '#38BDF8', borderColor: '#38BDF8' },
    typeChipText: { color: '#A1A1AA', fontSize: 12, fontWeight: '600' },
    typeChipTextActive: { color: '#000000', fontWeight: '700' },
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
    modalActions: { flexDirection: 'row', gap: 10, marginTop: 4 },
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
