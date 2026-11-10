import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    FlatList,
    Alert,
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
} from 'react-native';
import { supabase } from './supabase';

// Comidas tradicionales esenciales (Acceso 1-Tap)
const TRADITIONAL_FOOD_PRESETS = [
    { id: 'p-1', nombre: 'Carne picada de ternera (15% grasa)', kcal_100g: 215, proteina_100g: 19.5, carbohidratos_100g: 0, grasas_100g: 15 },
    { id: 'p-2', nombre: 'Huevos camperos enteros', kcal_100g: 143, proteina_100g: 13, carbohidratos_100g: 1.1, grasas_100g: 9.5 },
    { id: 'p-3', nombre: 'Arroz blanco cocido', kcal_100g: 130, proteina_100g: 2.7, carbohidratos_100g: 28, grasas_100g: 0.3 },
    { id: 'p-4', nombre: 'Pechuga de pollo', kcal_100g: 120, proteina_100g: 22.5, carbohidratos_100g: 0, grasas_100g: 2.6 },
    { id: 'p-5', nombre: 'Patata asada / cocida', kcal_100g: 87, proteina_100g: 1.9, carbohidratos_100g: 20.1, grasas_100g: 0.1 },
    { id: 'p-6', nombre: 'Salmón fresco', kcal_100g: 208, proteina_100g: 20, carbohidratos_100g: 0, grasas_100g: 13 },
    { id: 'p-7', nombre: 'Aceite de oliva virgen extra', kcal_100g: 884, proteina_100g: 0, carbohidratos_100g: 0, grasas_100g: 100 },
    { id: 'p-8', nombre: 'Queso curado / semicurado', kcal_100g: 380, proteina_100g: 25, carbohidratos_100g: 1.5, grasas_100g: 31 },
];

export default function AddMealScreen({ onNavigate }) {
    const [loading, setLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [alimentos, setAlimentos] = useState([]);
    const [alimentoSeleccionado, setAlimentoSeleccionado] = useState(null);
    const [gramos, setGramos] = useState('200');

    // Historial de comidas de hoy
    const [todayIngestas, setTodayIngestas] = useState([]);
    const [loadingFeed, setLoadingFeed] = useState(true);
    const [userId, setUserId] = useState(null);

    // Cargar ingestas de hoy
    const fetchTodayIngestas = useCallback(async () => {
        try {
            setLoadingFeed(true);
            const { data: { user } } = await supabase.auth.getUser();
            const currentUserId = user?.id || null;
            setUserId(currentUserId);

            const hoy = new Date().toISOString().split('T')[0];

            if (!currentUserId) {
                // Demo local si no hay login aún
                setTodayIngestas([
                    {
                        id: 'demo-ing-1',
                        hora: '14:30',
                        nombre_personalizado: 'Almuerzo Fuerza',
                        alimentos: [
                            { nombre: 'Carne de ternera', gramos: 250, kcal: 537, proteina: 48.7, carbohidratos: 0, grasas: 37.5 },
                            { nombre: 'Arroz blanco cocido', gramos: 200, kcal: 260, proteina: 5.4, carbohidratos: 56, grasas: 0.6 }
                        ]
                    }
                ]);
                return;
            }

            const { data: regDiario } = await supabase
                .from('registros_diarios')
                .select('id')
                .eq('user_id', currentUserId)
                .eq('fecha', hoy)
                .single();

            if (regDiario?.id) {
                const { data: ingestas, error } = await supabase
                    .from('ingestas')
                    .select('*')
                    .eq('registro_diario_id', regDiario.id)
                    .order('hora', { ascending: false });

                if (error) throw error;
                setTodayIngestas(ingestas || []);
            } else {
                setTodayIngestas([]);
            }
        } catch (error) {
            console.error('Error al cargar ingestas de hoy:', error.message);
        } finally {
            setLoadingFeed(false);
        }
    }, []);

    useEffect(() => {
        fetchTodayIngestas();
    }, [fetchTodayIngestas]);

    // Búsqueda en la tabla `alimentos` de Supabase
    useEffect(() => {
        if (searchQuery.trim().length > 1) {
            buscarAlimentos();
        } else {
            setAlimentos([]);
        }
    }, [searchQuery]);

    async function buscarAlimentos() {
        try {
            const { data, error } = await supabase
                .from('alimentos')
                .select('*')
                .ilike('nombre', `%${searchQuery.trim()}%`)
                .limit(10);

            if (error) throw error;
            setAlimentos(data || []);
        } catch (error) {
            console.error('Error buscando alimentos en Supabase:', error.message);
            // Fallback a filtrar presets locales
            const filtered = TRADITIONAL_FOOD_PRESETS.filter((f) =>
                f.nombre.toLowerCase().includes(searchQuery.toLowerCase())
            );
            setAlimentos(filtered);
        }
    }

    // Registrar ingesta con cálculo completo de macronutrientes
    async function guardarIngesta() {
        const cantGramos = parseFloat(gramos);
        if (!alimentoSeleccionado || isNaN(cantGramos) || cantGramos <= 0) {
            Alert.alert('Datos requeridos', 'Selecciona un alimento e introduce una cantidad válida en gramos.');
            return;
        }

        try {
            setLoading(true);
            const factor = cantGramos / 100;
            const kcalItem = Math.round(Number(alimentoSeleccionado.kcal_100g || 0) * factor);
            const protItem = Math.round(Number(alimentoSeleccionado.proteina_100g || 0) * factor * 10) / 10;
            const carbItem = Math.round(Number(alimentoSeleccionado.carbohidratos_100g || 0) * factor * 10) / 10;
            const fatItem = Math.round(Number(alimentoSeleccionado.grasas_100g || 0) * factor * 10) / 10;

            const hoy = new Date().toISOString().split('T')[0];
            const horaActual = new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });

            const payloadAlimentos = [
                {
                    alimento_id: alimentoSeleccionado.id,
                    nombre: alimentoSeleccionado.nombre,
                    gramos: cantGramos,
                    kcal: kcalItem,
                    kcal_totales: kcalItem,
                    proteina: protItem,
                    carbohidratos: carbItem,
                    grasas: fatItem,
                },
            ];

            if (userId) {
                // Obtener o crear registro_diario de hoy
                let { data: regDiario } = await supabase
                    .from('registros_diarios')
                    .select('id')
                    .eq('user_id', userId)
                    .eq('fecha', hoy)
                    .single();

                if (!regDiario) {
                    const { data: nuevoReg, error: regError } = await supabase
                        .from('registros_diarios')
                        .insert([{ user_id: userId, fecha: hoy }])
                        .select('id')
                        .single();

                    if (regError) throw regError;
                    regDiario = nuevoReg;
                }

                const { data: newIngesta, error: ingError } = await supabase
                    .from('ingestas')
                    .insert([
                        {
                            registro_diario_id: regDiario.id,
                            hora: horaActual,
                            nombre_personalizado: alimentoSeleccionado.nombre,
                            alimentos: payloadAlimentos,
                        },
                    ])
                    .select();

                if (ingError) throw ingError;
                if (newIngesta && newIngesta.length > 0) {
                    setTodayIngestas((prev) => [newIngesta[0], ...prev]);
                }
            } else {
                const demoIngesta = {
                    id: `demo-local-${Date.now()}`,
                    hora: horaActual,
                    nombre_personalizado: alimentoSeleccionado.nombre,
                    alimentos: payloadAlimentos,
                };
                setTodayIngestas((prev) => [demoIngesta, ...prev]);
            }

            Alert.alert(
                'Comida Registrada 🥩',
                `+${kcalItem} kcal | ${protItem}g Prot | ${carbItem}g Carb | ${fatItem}g Grasas.\nSincronizado con el balance del Dashboard.`
            );

            // Limpiar selección
            setAlimentoSeleccionado(null);
            setSearchQuery('');
            setGramos('200');
        } catch (error) {
            Alert.alert('Error al registrar comida', error.message);
        } finally {
            setLoading(false);
        }
    }

    // Eliminar ingesta
    const handleDeleteIngesta = async (ingestaId) => {
        Alert.alert(
            'Eliminar Comida',
            '¿Deseas suprimir este registro de tu ingesta de hoy?',
            [
                { text: 'Cancelar', style: 'cancel' },
                {
                    text: 'Eliminar',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            if (userId) {
                                await supabase
                                    .from('ingestas')
                                    .delete()
                                    .eq('id', ingestaId);
                            }
                            setTodayIngestas((prev) => prev.filter((i) => i.id !== ingestaId));
                        } catch (err) {
                            Alert.alert('Error', err.message);
                        }
                    },
                },
            ]
        );
    };

    // Cálculos de macros del alimento seleccionado actualmente
    const factorPreview = (parseFloat(gramos) || 0) / 100;
    const previewKcal = alimentoSeleccionado ? Math.round(Number(alimentoSeleccionado.kcal_100g || 0) * factorPreview) : 0;
    const previewProt = alimentoSeleccionado ? (Number(alimentoSeleccionado.proteina_100g || 0) * factorPreview).toFixed(1) : 0;
    const previewCarb = alimentoSeleccionado ? (Number(alimentoSeleccionado.carbohidratos_100g || 0) * factorPreview).toFixed(1) : 0;
    const previewFat = alimentoSeleccionado ? (Number(alimentoSeleccionado.grasas_100g || 0) * factorPreview).toFixed(1) : 0;

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.container}
        >
            <ScrollView contentContainerStyle={styles.scrollContent}>
                {/* Cabecera */}
                <View style={styles.header}>
                    <View>
                        <Text style={styles.superTitle}>PILAR SALUD & NUTRICIÓN</Text>
                        <Text style={styles.mainTitle}>Comida Tradicional</Text>
                    </View>
                    <View style={styles.badgeWrap}>
                        <Text style={styles.badgeText}>SIN HORARIOS FIJOS</Text>
                    </View>
                </View>

                {/* SELECTOR O ENTRADA DEL ALIMENTO */}
                {!alimentoSeleccionado ? (
                    <View style={styles.selectionCard}>
                        <Text style={styles.sectionLabel}>BUSCAR ALIMENTO</Text>
                        <TextInput
                            style={styles.searchInput}
                            placeholder="Ej. Ternera, huevos, arroz, salmón..."
                            placeholderTextColor="#52525b"
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                        />

                        {/* Resultados de búsqueda si escribe */}
                        {alimentos.length > 0 && (
                            <View style={styles.searchResultsContainer}>
                                {alimentos.map((item) => (
                                    <TouchableOpacity
                                        key={item.id}
                                        style={styles.foodItemRow}
                                        onPress={() => setAlimentoSeleccionado(item)}
                                    >
                                        <Text style={styles.foodItemName}>{item.nombre}</Text>
                                        <Text style={styles.foodItemMacros}>
                                            {item.kcal_100g} kcal • {item.proteina_100g}g P
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        )}

                        {/* Accesos Rápidos de Comida Tradicional (1-Tap) */}
                        <Text style={[styles.sectionLabel, { marginTop: 16 }]}>
                            PRESETS DE COMIDA TRADICIONAL
                        </Text>
                        <View style={styles.presetsGrid}>
                            {TRADITIONAL_FOOD_PRESETS.map((food) => (
                                <TouchableOpacity
                                    key={food.id}
                                    style={styles.presetFoodBtn}
                                    onPress={() => setAlimentoSeleccionado(food)}
                                >
                                    <Text style={styles.presetFoodName} numberOfLines={1}>
                                        {food.nombre}
                                    </Text>
                                    <Text style={styles.presetFoodStats}>
                                        {food.kcal_100g} kcal / {food.proteina_100g}g P
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>
                ) : (
                    /* FORMULARIO DE PESAJE Y CONFIRMACIÓN */
                    <View style={styles.selectedContainer}>
                        <View style={styles.selectedHeader}>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.selectedSuper}>ALIMENTO SELECCIONADO</Text>
                                <Text style={styles.selectedTitle}>{alimentoSeleccionado.nombre}</Text>
                            </View>
                            <TouchableOpacity
                                style={styles.changeBtn}
                                onPress={() => setAlimentoSeleccionado(null)}
                            >
                                <Text style={styles.changeBtnText}>Cambiar</Text>
                            </TouchableOpacity>
                        </View>

                        {/* Selector de Gramos */}
                        <Text style={styles.sectionLabel}>CANTIDAD (GRAMOS)</Text>
                        <TextInput
                            style={styles.gramsBigInput}
                            keyboardType="numeric"
                            value={gramos}
                            onChangeText={setGramos}
                            autoFocus
                        />

                        {/* Presets de Gramos */}
                        <View style={styles.gramPresetsRow}>
                            {['100', '150', '200', '250', '300'].map((g) => (
                                <TouchableOpacity
                                    key={g}
                                    style={[
                                        styles.gramPill,
                                        gramos === g && styles.gramPillActive,
                                    ]}
                                    onPress={() => setGramos(g)}
                                >
                                    <Text style={[
                                        styles.gramPillText,
                                        gramos === g && styles.gramPillTextActive,
                                    ]}>
                                        {g}g
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        {/* Preview Dinámico de Macros en Vivo */}
                        <View style={styles.macrosLiveCard}>
                            <View style={styles.macroCol}>
                                <Text style={styles.macroColLabel}>CALORÍAS</Text>
                                <Text style={styles.macroColKcal}>{previewKcal} kcal</Text>
                            </View>
                            <View style={styles.macroColDivider} />
                            <View style={styles.macroCol}>
                                <Text style={styles.macroColLabel}>PROTEÍNA</Text>
                                <Text style={styles.macroColProt}>{previewProt}g</Text>
                            </View>
                            <View style={styles.macroColDivider} />
                            <View style={styles.macroCol}>
                                <Text style={styles.macroColLabel}>CARBOS</Text>
                                <Text style={styles.macroColCarb}>{previewCarb}g</Text>
                            </View>
                            <View style={styles.macroColDivider} />
                            <View style={styles.macroCol}>
                                <Text style={styles.macroColLabel}>GRASAS</Text>
                                <Text style={styles.macroColFat}>{previewFat}g</Text>
                            </View>
                        </View>

                        <TouchableOpacity
                            style={[styles.saveBtn, loading && styles.saveBtnDisabled]}
                            onPress={guardarIngesta}
                            disabled={loading}
                        >
                            {loading ? (
                                <ActivityIndicator color="#000000" />
                            ) : (
                                <Text style={styles.saveBtnText}>REGISTRAR INGESTA</Text>
                            )}
                        </TouchableOpacity>
                    </View>
                )}

                {/* HISTORIAL DE HOY */}
                <View style={styles.todaySection}>
                    <Text style={styles.todaySectionTitle}>INGESTAS DE HOY</Text>

                    {loadingFeed ? (
                        <ActivityIndicator color="#f59e0b" style={{ marginTop: 12 }} />
                    ) : todayIngestas.length === 0 ? (
                        <View style={styles.emptyFeedBox}>
                            <Text style={styles.emptyFeedText}>No hay comidas registradas hoy todavía.</Text>
                        </View>
                    ) : (
                        todayIngestas.map((item) => {
                            const foods = Array.isArray(item.alimentos) ? item.alimentos : [];
                            const totalKcal = foods.reduce((acc, f) => acc + Number(f.kcal || f.kcal_totales || 0), 0);
                            const totalProt = foods.reduce((acc, f) => acc + Number(f.proteina || 0), 0);

                            return (
                                <View key={item.id} style={styles.ingestaCard}>
                                    <View style={styles.ingestaLeft}>
                                        <View style={styles.ingestaTitleRow}>
                                            <Text style={styles.ingestaName}>
                                                {item.nombre_personalizado || 'Comida'}
                                            </Text>
                                            <Text style={styles.ingestaHora}>⏱️ {item.hora?.slice(0, 5)}</Text>
                                        </View>
                                        <Text style={styles.ingestaDetails}>
                                            {foods.map((f) => `${f.nombre} (${f.gramos}g)`).join(', ')}
                                        </Text>
                                    </View>

                                    <View style={styles.ingestaRight}>
                                        <Text style={styles.ingestaKcal}>{totalKcal} kcal</Text>
                                        <Text style={styles.ingestaProt}>{totalProt.toFixed(0)}g prot</Text>
                                        <TouchableOpacity
                                            onPress={() => handleDeleteIngesta(item.id)}
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
        </KeyboardAvoidingView>
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
        color: '#f59e0b',
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
        backgroundColor: 'rgba(245, 158, 11, 0.12)',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: 'rgba(245, 158, 11, 0.25)',
    },
    badgeText: {
        color: '#fbbf24',
        fontSize: 9,
        fontWeight: '800',
    },

    // Selección
    selectionCard: {
        backgroundColor: '#0a0a0c',
        borderRadius: 18,
        padding: 16,
        borderWidth: 1,
        borderColor: '#1f1f23',
        marginBottom: 20,
    },
    sectionLabel: {
        color: '#71717a',
        fontSize: 10,
        fontWeight: '800',
        letterSpacing: 0.8,
        marginBottom: 8,
    },
    searchInput: {
        backgroundColor: '#141418',
        borderRadius: 12,
        paddingHorizontal: 14,
        paddingVertical: 12,
        color: '#ffffff',
        fontSize: 14,
        borderWidth: 1,
        borderColor: '#27272a',
    },
    searchResultsContainer: {
        marginTop: 8,
        backgroundColor: '#121216',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#27272a',
        overflow: 'hidden',
    },
    foodItemRow: {
        paddingVertical: 12,
        paddingHorizontal: 14,
        borderBottomWidth: 1,
        borderBottomColor: '#1f1f23',
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    foodItemName: {
        color: '#f4f4f5',
        fontSize: 13,
        fontWeight: '600',
        flex: 1,
    },
    foodItemMacros: {
        color: '#a1a1aa',
        fontSize: 12,
        fontWeight: '500',
    },

    // Presets Grid
    presetsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    presetFoodBtn: {
        width: '48.5%',
        backgroundColor: '#141418',
        padding: 12,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#22222a',
    },
    presetFoodName: {
        color: '#f4f4f5',
        fontSize: 12,
        fontWeight: '700',
        marginBottom: 4,
    },
    presetFoodStats: {
        color: '#71717a',
        fontSize: 10,
        fontWeight: '600',
    },

    // Formulario de pesaje
    selectedContainer: {
        backgroundColor: '#0a0a0c',
        borderRadius: 18,
        padding: 18,
        borderWidth: 1,
        borderColor: 'rgba(245, 158, 11, 0.3)',
        marginBottom: 20,
    },
    selectedHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 16,
    },
    selectedSuper: {
        color: '#f59e0b',
        fontSize: 10,
        fontWeight: '800',
        letterSpacing: 1,
    },
    selectedTitle: {
        color: '#f4f4f5',
        fontSize: 17,
        fontWeight: '800',
        marginTop: 2,
    },
    changeBtn: {
        paddingHorizontal: 10,
        paddingVertical: 5,
        backgroundColor: '#18181c',
        borderRadius: 6,
        borderWidth: 1,
        borderColor: '#27272a',
    },
    changeBtnText: {
        color: '#06b6d4',
        fontSize: 11,
        fontWeight: '700',
    },
    gramsBigInput: {
        backgroundColor: '#141418',
        borderRadius: 14,
        paddingVertical: 14,
        color: '#f59e0b',
        fontSize: 34,
        fontWeight: '900',
        textAlign: 'center',
        borderWidth: 1,
        borderColor: '#27272a',
    },
    gramPresetsRow: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 8,
        marginTop: 10,
        marginBottom: 16,
    },
    gramPill: {
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 8,
        backgroundColor: '#141418',
        borderWidth: 1,
        borderColor: '#22222a',
    },
    gramPillActive: {
        backgroundColor: '#f59e0b',
        borderColor: '#f59e0b',
    },
    gramPillText: {
        color: '#71717a',
        fontSize: 12,
        fontWeight: '700',
    },
    gramPillTextActive: {
        color: '#000000',
        fontWeight: '900',
    },

    // Macros Live Card
    macrosLiveCard: {
        flexDirection: 'row',
        backgroundColor: '#141118',
        borderRadius: 12,
        padding: 12,
        borderWidth: 1,
        borderColor: '#2a2233',
        marginBottom: 16,
    },
    macroCol: {
        flex: 1,
        alignItems: 'center',
    },
    macroColDivider: {
        width: 1,
        backgroundColor: '#2a2233',
    },
    macroColLabel: {
        color: '#71717a',
        fontSize: 8,
        fontWeight: '800',
        letterSpacing: 0.8,
        marginBottom: 2,
    },
    macroColKcal: {
        color: '#f59e0b',
        fontSize: 13,
        fontWeight: '900',
    },
    macroColProt: {
        color: '#ec4899',
        fontSize: 13,
        fontWeight: '900',
    },
    macroColCarb: {
        color: '#38bdf8',
        fontSize: 13,
        fontWeight: '900',
    },
    macroColFat: {
        color: '#10b981',
        fontSize: 13,
        fontWeight: '900',
    },

    saveBtn: {
        backgroundColor: '#f59e0b',
        borderRadius: 12,
        paddingVertical: 14,
        alignItems: 'center',
    },
    saveBtnDisabled: {
        opacity: 0.5,
    },
    saveBtnText: {
        color: '#000000',
        fontSize: 13,
        fontWeight: '900',
        letterSpacing: 1,
    },

    // Historial
    todaySection: {
        marginTop: 6,
    },
    todaySectionTitle: {
        color: '#71717a',
        fontSize: 10,
        fontWeight: '800',
        letterSpacing: 1.2,
        marginBottom: 10,
    },
    emptyFeedBox: {
        backgroundColor: '#0a0a0c',
        borderRadius: 12,
        padding: 16,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#1f1f23',
    },
    emptyFeedText: {
        color: '#71717a',
        fontSize: 12,
        fontStyle: 'italic',
    },
    ingestaCard: {
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
    ingestaLeft: {
        flex: 1,
        marginRight: 10,
    },
    ingestaTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    ingestaName: {
        color: '#f4f4f5',
        fontSize: 13,
        fontWeight: '700',
    },
    ingestaHora: {
        color: '#71717a',
        fontSize: 11,
    },
    ingestaDetails: {
        color: '#a1a1aa',
        fontSize: 11,
        marginTop: 3,
    },
    ingestaRight: {
        alignItems: 'flex-end',
        gap: 2,
    },
    ingestaKcal: {
        color: '#f59e0b',
        fontSize: 14,
        fontWeight: '900',
    },
    ingestaProt: {
        color: '#ec4899',
        fontSize: 11,
        fontWeight: '700',
    },
    deleteBtn: {
        padding: 4,
        marginTop: 2,
    },
    deleteBtnText: {
        color: '#52525b',
        fontSize: 12,
        fontWeight: '700',
    },
});
