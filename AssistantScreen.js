import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    TextInput,
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
    Modal,
    Alert,
} from 'react-native';
import { getStoreState, subscribeStore, updateProfileAndGoals } from './dataStore';
import {
    fetchWeather,
    calculateGymRecommendation,
    askPersonalAssistant,
} from './aiAssistant';

const QUICK_ACTIONS = [
    { id: 'gym', label: '🏋️‍♂️ ¿A qué hora voy al gym hoy?', query: '¿A qué hora exacta me recomiendas ir hoy a mi gimnasio según la afluencia y el tiempo, y qué grupo muscular debo entrenar?' },
    { id: 'afternoon', label: '⚡ Organiza mi tarde', query: 'Organiza el resto de mi tarde teniendo en cuenta mi jornada, descansos y citas pendientes.' },
    { id: 'macros', label: '🥩 ¿Qué me falta para mis macros?', query: 'Revisa las comidas y calorías que llevo hoy. ¿Qué me recomiendas comer o cenar para completar mis objetivos?' },
    { id: 'agenda', label: '📅 Repasar citas y tareas', query: '¿Qué citas o tareas tengo pendientes para hoy y cuáles quedaron olvidadas para reprogramar?' },
    { id: 'habits', label: '🧠 Diagnóstico de mis hábitos', query: 'Hazme un diagnóstico veraz de mis hábitos de trabajo, entrenamiento y nutrición según mis datos registrados.' },
];

export default function AssistantScreen({ onNavigate }) {
    const [storeState, setStoreState] = useState(null);
    const [weather, setWeather] = useState(null);
    const [gymRec, setGymRec] = useState(null);
    const [loadingData, setLoadingData] = useState(true);

    // Consulta activa única (reemplaza a la anterior, sin chat infinito)
    const [currentQuery, setCurrentQuery] = useState('');
    const [currentResponse, setCurrentResponse] = useState(null);
    const [isConsulting, setIsConsulting] = useState(false);
    const [inputQuery, setInputQuery] = useState('');

    // Modal de Configuración Rápida (Ubicación, Gym y Clave IA)
    const [configModalOpen, setConfigModalOpen] = useState(false);
    const [cfgCiudad, setCfgCiudad] = useState('');
    const [cfgGym, setCfgGym] = useState('');
    const [cfgHorario, setCfgHorario] = useState('tarde');
    const [cfgApiKey, setCfgApiKey] = useState('');
    const [savingCfg, setSavingCfg] = useState(false);

    const refreshData = async (state) => {
        const p = state?.profile || {};
        const cityName = p.ciudad || 'Madrid';
        const w = await fetchWeather(cityName);
        setWeather(w);
        const g = calculateGymRecommendation(state, w);
        setGymRec(g);

        setCfgCiudad(cityName);
        setCfgGym(p.gimnasio_nombre || 'Basic-Fit Centro');
        setCfgHorario(p.horario_preferido_gym || 'tarde');
        setCfgApiKey(p.gemini_api_key || '');
    };

    useEffect(() => {
        let mounted = true;
        async function init() {
            const state = await getStoreState(true);
            if (!mounted) return;
            setStoreState(state);
            await refreshData(state);
            setLoadingData(false);
        }
        init();

        const unsub = subscribeStore(async (s) => {
            if (!mounted) return;
            setStoreState({ ...s });
        });

        return () => {
            mounted = false;
            unsub();
        };
    }, []);

    const handleConsult = async (queryText) => {
        const q = (queryText || inputQuery).trim();
        if (!q || isConsulting) return;

        setInputQuery('');
        setCurrentQuery(q);
        setIsConsulting(true);

        try {
            const res = await askPersonalAssistant(q, storeState, weather);
            setCurrentResponse({
                query: q,
                text: res.text,
                source: res.source,
                timestamp: new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }),
            });
        } catch (e) {
            setCurrentResponse({
                query: q,
                text: `Error al procesar consulta: ${e.message}`,
                source: 'error',
                timestamp: new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }),
            });
        } finally {
            setIsConsulting(false);
        }
    };

    const handleSaveConfig = async () => {
        try {
            setSavingCfg(true);
            const updated = await updateProfileAndGoals({
                ciudad: cfgCiudad.trim() || 'Madrid',
                gimnasio_nombre: cfgGym.trim() || 'Basic-Fit Centro',
                horario_preferido_gym: cfgHorario,
                gemini_api_key: cfgApiKey.trim(),
            });
            const state = await getStoreState(true);
            setStoreState(state);
            await refreshData(state);
            setConfigModalOpen(false);
            Alert.alert('Datos actualizados', 'Ubicación, gimnasio y motor de IA guardados correctamente.');
        } catch (e) {
            Alert.alert('Error al guardar', e.message);
        } finally {
            setSavingCfg(false);
        }
    };

    const hasApiKey = !!((storeState?.profile?.gemini_api_key || '').trim() ||
        (typeof process !== 'undefined' && process.env && process.env.EXPO_PUBLIC_GEMINI_API_KEY));

    if (loadingData || !gymRec || !weather) {
        return (
            <View style={styles.loadingWrap}>
                <ActivityIndicator color="#38BDF8" size="large" />
                <Text style={styles.loadingText}>Sincronizando ubicación, afluencia y clima...</Text>
            </View>
        );
    }

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.container}
        >
            <ScrollView
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                <View style={styles.innerWrap}>
                    {/* Barra Superior con botón Inicio y Configuración de IA/Gym */}
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
                            style={styles.cfgBtn}
                            onPress={() => setConfigModalOpen(true)}
                        >
                            <Text style={styles.cfgBtnText}>⚙️ Ubicación, Gym e IA</Text>
                        </TouchableOpacity>
                    </View>

                    <Text style={styles.title}>Asistente 360°</Text>
                    <Text style={styles.subtitle}>
                        Consultas directas basadas en tus datos reales. Cada respuesta reemplaza a la anterior.
                    </Text>

                    {/* Estado de Configuración (Gimnasio, Ciudad y Estado IA) */}
                    <View style={styles.configStatusCard}>
                        <View style={styles.statusRow}>
                            <Text style={styles.statusLabel}>Ubicación:</Text>
                            <Text style={styles.statusValue}>{weather.city} ({weather.temp}°C {weather.icon} {weather.label})</Text>
                        </View>
                        <View style={styles.statusRow}>
                            <Text style={styles.statusLabel}>Gimnasio:</Text>
                            <Text style={styles.statusValue}>{gymRec.gymName}</Text>
                        </View>
                        <View style={styles.statusRow}>
                            <Text style={styles.statusLabel}>Motor IA:</Text>
                            <Text style={[styles.statusValue, { color: hasApiKey ? '#34D399' : '#F59E0B' }]}>
                                {hasApiKey ? 'Google Gemini 2.0 Flash activo ✓' : 'Pendiente de clave API (pulsa ⚙️)'}
                            </Text>
                        </View>
                    </View>

                    {/* Tarjeta de Recomendación de Gimnasio en Tiempo Real */}
                    <View style={styles.gymCard}>
                        <View style={styles.gymHeader}>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.gymOverline}>Momento óptimo de entreno</Text>
                                <Text style={styles.gymNameText}>{gymRec.gymName}</Text>
                            </View>
                            <View style={styles.bestTimeBadge}>
                                <Text style={styles.bestTimeText}>{gymRec.bestSlot.timeLabel}</Text>
                            </View>
                        </View>

                        <View style={styles.gymKpisRow}>
                            <View style={styles.gymKpiItem}>
                                <Text style={styles.gymKpiLabel}>Afluencia</Text>
                                <Text style={[styles.gymKpiValue, { color: gymRec.bestSlot.crowdColor }]}>
                                    {gymRec.bestSlot.crowd}% ({gymRec.bestSlot.crowdLabel})
                                </Text>
                            </View>
                            <View style={styles.gymDivider} />
                            <View style={styles.gymKpiItem}>
                                <Text style={styles.gymKpiLabel}>Clima en la zona</Text>
                                <Text style={styles.gymKpiValue}>
                                    {gymRec.bestSlot.temp}°C {gymRec.bestSlot.weatherIcon}
                                </Text>
                            </View>
                            <View style={styles.gymDivider} />
                            <View style={styles.gymKpiItem}>
                                <Text style={styles.gymKpiLabel}>Objetivo hoy</Text>
                                <Text style={[styles.gymKpiValue, { color: '#FB7185' }]}>
                                    {gymRec.suggestedMuscle}
                                </Text>
                            </View>
                        </View>

                        <View style={styles.tipBox}>
                            <Text style={styles.tipTitle}>Consejo de combustible</Text>
                            <Text style={styles.tipText}>{gymRec.fuelTip}</Text>
                        </View>

                        <Text style={styles.hoursStripTitle}>Curva de afluencia por horas ({weather.city})</Text>
                        <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={styles.hoursScroll}
                        >
                            {gymRec.slots.map((s) => {
                                const isBest = s.hour === gymRec.bestSlot.hour;
                                return (
                                    <View
                                        key={s.hour}
                                        style={[
                                            styles.hourCard,
                                            isBest && styles.hourCardBest,
                                            !s.isFree && styles.hourCardBusy,
                                        ]}
                                    >
                                        <Text style={[styles.hourTime, isBest && styles.hourTimeBest]}>
                                            {s.timeLabel}
                                        </Text>
                                        <View style={[styles.crowdBar, { backgroundColor: s.crowdColor, height: Math.max(12, Math.round(s.crowd * 0.45)) }]} />
                                        <Text style={styles.hourCrowdVal}>{s.crowd}%</Text>
                                        <Text style={styles.hourWeatherIcon}>{s.weatherIcon}</Text>
                                        <Text style={styles.hourFreeTag}>
                                            {isBest ? 'Óptimo' : s.isFree ? 'Libre' : 'Ocupado'}
                                        </Text>
                                    </View>
                                );
                            })}
                        </ScrollView>
                    </View>

                    {/* Acciones Rápidas */}
                    <Text style={styles.sectionTitle}>Consultas rápidas</Text>
                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.actionsScroll}
                    >
                        {QUICK_ACTIONS.map((action) => (
                            <TouchableOpacity
                                key={action.id}
                                style={styles.actionPill}
                                activeOpacity={0.75}
                                onPress={() => handleConsult(action.query)}
                                disabled={isConsulting}
                            >
                                <Text style={styles.actionPillText}>{action.label}</Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>

                    {/* Área de Entrada de Consulta */}
                    <View style={styles.searchBarWrap}>
                        <TextInput
                            style={styles.chatInput}
                            placeholder="Pregunta algo (ej: ¿qué ceno hoy según mis macros?)..."
                            placeholderTextColor="#52525B"
                            value={inputQuery}
                            onChangeText={setInputQuery}
                            onSubmitEditing={() => handleConsult()}
                            returnKeyType="search"
                        />
                        <TouchableOpacity
                            style={[styles.sendBtn, (!inputQuery.trim() || isConsulting) && styles.sendBtnDisabled]}
                            onPress={() => handleConsult()}
                            disabled={!inputQuery.trim() || isConsulting}
                        >
                            <Text style={styles.sendBtnText}>{isConsulting ? '...' : 'Consultar'}</Text>
                        </TouchableOpacity>
                    </View>

                    {/* TARJETA DE RESULTADO ÚNICO (Reemplaza a la anterior, sin acumular) */}
                    {isConsulting ? (
                        <View style={styles.loadingResultCard}>
                            <ActivityIndicator color="#38BDF8" size="small" />
                            <Text style={styles.loadingResultText}>Analizando tus registros y verificando datos...</Text>
                        </View>
                    ) : currentResponse ? (
                        <View style={styles.resultCard}>
                            <View style={styles.resultHeader}>
                                <View style={{ flex: 1, paddingRight: 8 }}>
                                    <Text style={styles.resultQueryLabel}>Consulta realizada</Text>
                                    <Text style={styles.resultQueryText}>"{currentResponse.query}"</Text>
                                </View>
                                <TouchableOpacity
                                    style={styles.clearBtn}
                                    onPress={() => setCurrentResponse(null)}
                                >
                                    <Text style={styles.clearBtnText}>Cerrar ✕</Text>
                                </TouchableOpacity>
                            </View>

                            <View style={styles.resultDivider} />

                            <View style={styles.resultBody}>
                                <View style={styles.resultBadgeRow}>
                                    <View style={[
                                        styles.sourceBadge,
                                        currentResponse.source === 'gemini' && styles.sourceBadgeGemini,
                                        currentResponse.source === 'config_required' && styles.sourceBadgeConfig,
                                    ]}>
                                        <Text style={[
                                            styles.sourceBadgeText,
                                            currentResponse.source === 'gemini' && { color: '#34D399' },
                                            currentResponse.source === 'config_required' && { color: '#F59E0B' },
                                        ]}>
                                            {currentResponse.source === 'gemini' ? 'Google Gemini 2.0 Flash' : 'Aviso de configuración'}
                                        </Text>
                                    </View>
                                    <Text style={styles.resultTime}>{currentResponse.timestamp}</Text>
                                </View>

                                <Text style={styles.resultText}>{currentResponse.text}</Text>

                                {currentResponse.source === 'config_required' && (
                                    <TouchableOpacity
                                        style={styles.configActionBtn}
                                        onPress={() => setConfigModalOpen(true)}
                                    >
                                        <Text style={styles.configActionBtnText}>Configurar clave de Gemini ahora →</Text>
                                    </TouchableOpacity>
                                )}
                            </View>
                        </View>
                    ) : (
                        <View style={styles.emptyPromptCard}>
                            <Text style={styles.emptyPromptTitle}>Haz una consulta a tu asistente</Text>
                            <Text style={styles.emptyPromptSub}>
                                Pulsa una de las consultas rápidas arriba o escribe tu pregunta. La respuesta aparecerá aquí de forma limpia y directa.
                            </Text>
                        </View>
                    )}
                </View>
            </ScrollView>

            {/* Modal de Configuración (Ciudad, Gimnasio y Clave Gemini) */}
            <Modal
                visible={configModalOpen}
                transparent
                animationType="fade"
                onRequestClose={() => setConfigModalOpen(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalCard}>
                        <ScrollView showsVerticalScrollIndicator={false}>
                            <Text style={styles.modalTitle}>Configurar Ubicación, Gym e IA</Text>
                            <Text style={styles.modalSub}>
                                Ajusta estos datos para que el asistente consulte la afluencia y el clima correctos.
                            </Text>

                            <Text style={styles.modalLabel}>Tu ciudad (para clima en tiempo real)</Text>
                            <TextInput
                                style={styles.modalInput}
                                value={cfgCiudad}
                                onChangeText={setCfgCiudad}
                                placeholder="Ej: Madrid, Barcelona, Valencia, Alicante..."
                                placeholderTextColor="#52525B"
                            />

                            <Text style={styles.modalLabel}>Nombre de tu gimnasio</Text>
                            <TextInput
                                style={styles.modalInput}
                                value={cfgGym}
                                onChangeText={setCfgGym}
                                placeholder="Ej: Basic-Fit Gran Vía, McFit, Fitness Park..."
                                placeholderTextColor="#52525B"
                            />

                            <Text style={styles.modalLabel}>Momento habitual preferido para entrenar</Text>
                            <View style={styles.prefRow}>
                                {[
                                    { id: 'mañana', label: 'Mañana' },
                                    { id: 'mediodia', label: 'Mediodía' },
                                    { id: 'tarde', label: 'Tarde' },
                                    { id: 'noche', label: 'Noche' },
                                ].map((p) => (
                                    <TouchableOpacity
                                        key={p.id}
                                        style={[styles.prefPill, cfgHorario === p.id && styles.prefPillActive]}
                                        onPress={() => setCfgHorario(p.id)}
                                    >
                                        <Text style={[styles.prefPillText, cfgHorario === p.id && styles.prefPillTextActive]}>
                                            {p.label}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>

                            <Text style={styles.modalLabel}>Clave API de Google Gemini (Para IA real)</Text>
                            <TextInput
                                style={styles.modalInput}
                                value={cfgApiKey}
                                onChangeText={setCfgApiKey}
                                placeholder="AIzaSy..."
                                placeholderTextColor="#52525B"
                                secureTextEntry
                            />
                            <Text style={styles.helpText}>
                                Para que la IA procese tus datos con un modelo de lenguaje real, genera una clave gratuita en aistudio.google.com (toma 1 min y no pide tarjeta) y pégala aquí o en tu archivo .env.
                            </Text>

                            <View style={styles.modalActions}>
                                <TouchableOpacity
                                    style={styles.modalCancelBtn}
                                    onPress={() => setConfigModalOpen(false)}
                                >
                                    <Text style={styles.modalCancelText}>Cancelar</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={styles.modalConfirmBtn}
                                    onPress={handleSaveConfig}
                                    disabled={savingCfg}
                                >
                                    <Text style={styles.modalConfirmText}>{savingCfg ? 'Guardando...' : 'Guardar'}</Text>
                                </TouchableOpacity>
                            </View>
                        </ScrollView>
                    </View>
                </View>
            </Modal>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#000000' },
    loadingWrap: { flex: 1, backgroundColor: '#000000', justifyContent: 'center', alignItems: 'center', padding: 24 },
    loadingText: { color: '#A1A1AA', fontSize: 13, marginTop: 12 },
    scrollContent: { paddingHorizontal: 20, paddingTop: 14, paddingBottom: 36 },
    innerWrap: { width: '100%', maxWidth: 520, alignSelf: 'center' },
    topNav: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    backBtn: { paddingVertical: 6, paddingRight: 12 },
    backBtnText: { color: '#A1A1AA', fontSize: 14, fontWeight: '600' },
    cfgBtn: {
        backgroundColor: '#111114',
        borderRadius: 10,
        paddingHorizontal: 12,
        paddingVertical: 7,
        borderWidth: 1,
        borderColor: '#232329',
    },
    cfgBtnText: { color: '#38BDF8', fontSize: 12, fontWeight: '600' },
    title: { color: '#FAFAFA', fontSize: 26, fontWeight: '700', letterSpacing: -0.5 },
    subtitle: { color: '#A1A1AA', fontSize: 13, marginTop: 4, marginBottom: 16, lineHeight: 18 },
    configStatusCard: {
        backgroundColor: '#111114',
        borderRadius: 14,
        padding: 12,
        borderWidth: 1,
        borderColor: '#232329',
        marginBottom: 16,
        gap: 6,
    },
    statusRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    statusLabel: { color: '#71717A', fontSize: 11, fontWeight: '600' },
    statusValue: { color: '#FAFAFA', fontSize: 12, fontWeight: '600' },
    gymCard: {
        backgroundColor: '#111114',
        borderRadius: 20,
        padding: 18,
        borderWidth: 1,
        borderColor: '#232329',
        marginBottom: 20,
    },
    gymHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 14,
    },
    gymOverline: { color: '#38BDF8', fontSize: 11, fontWeight: '700', letterSpacing: 0.5, textTransform: 'uppercase' },
    gymNameText: { color: '#FAFAFA', fontSize: 17, fontWeight: '700', marginTop: 2 },
    bestTimeBadge: {
        backgroundColor: 'rgba(56, 189, 248, 0.15)',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#38BDF8',
    },
    bestTimeText: { color: '#38BDF8', fontSize: 16, fontWeight: '800' },
    gymKpisRow: {
        flexDirection: 'row',
        backgroundColor: '#18181C',
        borderRadius: 14,
        padding: 12,
        marginBottom: 12,
    },
    gymKpiItem: { flex: 1, alignItems: 'center' },
    gymDivider: { width: 1, backgroundColor: '#232329' },
    gymKpiLabel: { color: '#71717A', fontSize: 11, marginBottom: 3 },
    gymKpiValue: { color: '#FAFAFA', fontSize: 12, fontWeight: '700', textAlign: 'center' },
    tipBox: {
        backgroundColor: '#18181C',
        borderRadius: 12,
        padding: 12,
        borderWidth: 1,
        borderColor: '#27272E',
        marginBottom: 14,
    },
    tipTitle: { color: '#F59E0B', fontSize: 11, fontWeight: '700', marginBottom: 2 },
    tipText: { color: '#A1A1AA', fontSize: 12, lineHeight: 17 },
    hoursStripTitle: { color: '#A1A1AA', fontSize: 12, fontWeight: '600', marginBottom: 8 },
    hoursScroll: { gap: 8, paddingBottom: 4 },
    hourCard: {
        width: 60,
        backgroundColor: '#18181C',
        borderRadius: 12,
        paddingVertical: 8,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#232329',
    },
    hourCardBest: {
        borderColor: '#38BDF8',
        backgroundColor: 'rgba(56, 189, 248, 0.1)',
    },
    hourCardBusy: {
        opacity: 0.5,
    },
    hourTime: { color: '#FAFAFA', fontSize: 11, fontWeight: '700', marginBottom: 6 },
    hourTimeBest: { color: '#38BDF8' },
    crowdBar: { width: 6, borderRadius: 3, marginBottom: 4 },
    hourCrowdVal: { color: '#A1A1AA', fontSize: 10, fontWeight: '600' },
    hourWeatherIcon: { fontSize: 11, marginTop: 2 },
    hourFreeTag: { color: '#71717A', fontSize: 9, marginTop: 4, fontWeight: '600' },
    sectionTitle: { color: '#FAFAFA', fontSize: 15, fontWeight: '700', marginBottom: 10 },
    actionsScroll: { gap: 8, paddingBottom: 4 },
    actionPill: {
        backgroundColor: '#111114',
        paddingHorizontal: 14,
        paddingVertical: 9,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#27272E',
    },
    actionPillText: { color: '#FAFAFA', fontSize: 12, fontWeight: '600' },
    searchBarWrap: {
        flexDirection: 'row',
        gap: 8,
        marginTop: 14,
        marginBottom: 16,
    },
    chatInput: {
        flex: 1,
        backgroundColor: '#18181C',
        borderRadius: 14,
        paddingHorizontal: 14,
        paddingVertical: 11,
        color: '#FAFAFA',
        fontSize: 13,
        borderWidth: 1,
        borderColor: '#27272E',
    },
    sendBtn: {
        backgroundColor: '#38BDF8',
        paddingHorizontal: 16,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
    },
    sendBtnDisabled: { opacity: 0.4 },
    sendBtnText: { color: '#000000', fontSize: 13, fontWeight: '700' },
    loadingResultCard: {
        backgroundColor: '#111114',
        borderRadius: 18,
        padding: 20,
        alignItems: 'center',
        gap: 10,
        borderWidth: 1,
        borderColor: '#232329',
    },
    loadingResultText: { color: '#A1A1AA', fontSize: 13 },
    resultCard: {
        backgroundColor: '#111114',
        borderRadius: 20,
        padding: 18,
        borderWidth: 1,
        borderColor: '#232329',
    },
    resultHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
    },
    resultQueryLabel: { color: '#71717A', fontSize: 11, fontWeight: '600' },
    resultQueryText: { color: '#FAFAFA', fontSize: 14, fontWeight: '700', marginTop: 2 },
    clearBtn: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        backgroundColor: '#18181C',
        borderRadius: 8,
    },
    clearBtnText: { color: '#71717A', fontSize: 11, fontWeight: '600' },
    resultDivider: { height: 1, backgroundColor: '#232329', marginVertical: 12 },
    resultBody: { gap: 8 },
    resultBadgeRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    sourceBadge: {
        backgroundColor: '#18181C',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 6,
        borderWidth: 1,
        borderColor: '#27272E',
    },
    sourceBadgeGemini: {
        borderColor: 'rgba(52, 211, 153, 0.4)',
        backgroundColor: 'rgba(52, 211, 153, 0.1)',
    },
    sourceBadgeConfig: {
        borderColor: 'rgba(245, 158, 11, 0.4)',
        backgroundColor: 'rgba(245, 158, 11, 0.1)',
    },
    sourceBadgeText: { fontSize: 11, fontWeight: '700', color: '#A1A1AA' },
    resultTime: { color: '#71717A', fontSize: 11 },
    resultText: { color: '#FAFAFA', fontSize: 14, lineHeight: 21 },
    configActionBtn: {
        marginTop: 10,
        backgroundColor: 'rgba(56, 189, 248, 0.15)',
        borderRadius: 12,
        paddingVertical: 12,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#38BDF8',
    },
    configActionBtnText: { color: '#38BDF8', fontSize: 13, fontWeight: '700' },
    emptyPromptCard: {
        backgroundColor: '#111114',
        borderRadius: 18,
        padding: 20,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#232329',
    },
    emptyPromptTitle: { color: '#FAFAFA', fontSize: 15, fontWeight: '700', marginBottom: 4 },
    emptyPromptSub: { color: '#71717A', fontSize: 13, textAlign: 'center', lineHeight: 18 },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.85)',
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
        maxHeight: '90%',
        borderWidth: 1,
        borderColor: '#27272E',
    },
    modalTitle: { color: '#FAFAFA', fontSize: 18, fontWeight: '700', marginBottom: 4 },
    modalSub: { color: '#A1A1AA', fontSize: 12, lineHeight: 17, marginBottom: 16 },
    modalLabel: { color: '#A1A1AA', fontSize: 12, fontWeight: '600', marginBottom: 6 },
    modalInput: {
        backgroundColor: '#18181C',
        borderRadius: 12,
        paddingHorizontal: 12,
        paddingVertical: 10,
        color: '#FAFAFA',
        fontSize: 14,
        borderWidth: 1,
        borderColor: '#27272E',
        marginBottom: 14,
    },
    prefRow: { flexDirection: 'row', gap: 6, marginBottom: 14 },
    prefPill: {
        flex: 1,
        backgroundColor: '#18181C',
        borderRadius: 10,
        paddingVertical: 8,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#27272E',
    },
    prefPillActive: { backgroundColor: '#38BDF8', borderColor: '#38BDF8' },
    prefPillText: { color: '#A1A1AA', fontSize: 11, fontWeight: '600' },
    prefPillTextActive: { color: '#000000', fontWeight: '700' },
    helpText: { color: '#71717A', fontSize: 11, lineHeight: 16, marginBottom: 14 },
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
