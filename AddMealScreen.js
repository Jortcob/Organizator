import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    Alert,
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    Modal,
} from 'react-native';
import { supabase } from './supabase';
import {
    getStoreState,
    subscribeStore,
    addMealRecord,
    deleteMealRecord,
    addCustomFood,
} from './dataStore';

const TRADITIONAL_FOOD_PRESETS = [
    { id: 'p-1', nombre: 'Carne picada de ternera (15%)', kcal_100g: 215, proteina_100g: 19.5, carbohidratos_100g: 0, grasas_100g: 15 },
    { id: 'p-2', nombre: 'Huevos camperos enteros', kcal_100g: 143, proteina_100g: 13, carbohidratos_100g: 1.1, grasas_100g: 9.5 },
    { id: 'p-3', nombre: 'Arroz blanco cocido', kcal_100g: 130, proteina_100g: 2.7, carbohidratos_100g: 28, grasas_100g: 0.3 },
    { id: 'p-4', nombre: 'Pechuga de pollo', kcal_100g: 120, proteina_100g: 22.5, carbohidratos_100g: 0, grasas_100g: 2.6 },
    { id: 'p-5', nombre: 'Patata cocida o asada', kcal_100g: 87, proteina_100g: 1.9, carbohidratos_100g: 20.1, grasas_100g: 0.1 },
    { id: 'p-6', nombre: 'Salmón fresco', kcal_100g: 208, proteina_100g: 20, carbohidratos_100g: 0, grasas_100g: 13 },
    { id: 'p-7', nombre: 'Aceite de oliva virgen extra', kcal_100g: 884, proteina_100g: 0, carbohidratos_100g: 0, grasas_100g: 100 },
    { id: 'p-8', nombre: 'Queso curado', kcal_100g: 380, proteina_100g: 25, carbohidratos_100g: 1.5, grasas_100g: 31 },
];

const FOOD_CATEGORIES = ['Proteína', 'Carbohidrato', 'Grasa', 'Lácteo', 'Fruta', 'Otro'];

export default function AddMealScreen({ onNavigate }) {
    const [loading, setLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [alimentos, setAlimentos] = useState([]);
    const [alimentoSeleccionado, setAlimentoSeleccionado] = useState(null);
    const [gramos, setGramos] = useState('200');
    const [todayIngestas, setTodayIngestas] = useState([]);
    const [customFoods, setCustomFoods] = useState([]);

    const [createModalVisible, setCreateModalVisible] = useState(false);
    const [newNombre, setNewNombre] = useState('');
    const [newCategoria, setNewCategoria] = useState('Proteína');
    const [newKcal, setNewKcal] = useState('');
    const [newProt, setNewProt] = useState('');
    const [newCarbs, setNewCarbs] = useState('');
    const [newGrasas, setNewGrasas] = useState('');

    const todayStr = new Date().toISOString().split('T')[0];

    useEffect(() => {
        let mounted = true;
        getStoreState(true).then((s) => {
            if (mounted) {
                setTodayIngestas((s.meals || []).filter((m) => m.fecha === todayStr));
                setCustomFoods(s.customFoods || []);
            }
        });
        const unsub = subscribeStore((s) => {
            if (mounted) {
                setTodayIngestas((s.meals || []).filter((m) => m.fecha === todayStr));
                setCustomFoods(s.customFoods || []);
            }
        });
        return () => {
            mounted = false;
            unsub();
        };
    }, [todayStr]);

    useEffect(() => {
        if (searchQuery.trim().length > 1) {
            buscarAlimentos();
        } else {
            setAlimentos([]);
        }
    }, [searchQuery, customFoods]);

    async function buscarAlimentos() {
        const localAll = [...customFoods, ...TRADITIONAL_FOOD_PRESETS];
        const localMatches = localAll.filter((f) =>
            f.nombre.toLowerCase().includes(searchQuery.trim().toLowerCase())
        );

        try {
            const { data, error } = await supabase
                .from('alimentos')
                .select('*')
                .ilike('nombre', `%${searchQuery.trim()}%`)
                .limit(10);

            if (!error && data && data.length > 0) {
                const existingNames = new Set(localMatches.map((m) => m.nombre.toLowerCase()));
                const merged = [...localMatches];
                data.forEach((d) => {
                    if (!existingNames.has((d.nombre || '').toLowerCase())) {
                        merged.push(d);
                    }
                });
                setAlimentos(merged);
                return;
            }
        } catch {
            // Fallback local
        }
        setAlimentos(localMatches);
    }

    const openCreateFoodModal = (prefillName = '') => {
        setNewNombre(prefillName);
        setNewCategoria('Proteína');
        setNewKcal('');
        setNewProt('');
        setNewCarbs('');
        setNewGrasas('');
        setCreateModalVisible(true);
    };

    const handleSaveCustomFood = async () => {
        if (!newNombre.trim() || !newKcal.trim()) {
            Alert.alert('Campos obligatorios', 'Introduce al menos el nombre y las calorías por 100g.');
            return;
        }
        const created = await addCustomFood({
            nombre: newNombre.trim(),
            categoria: newCategoria,
            kcal_100g: parseFloat(newKcal) || 0,
            proteina_100g: parseFloat(newProt) || 0,
            carbohidratos_100g: parseFloat(newCarbs) || 0,
            grasas_100g: parseFloat(newGrasas) || 0,
        });
        setCreateModalVisible(false);
        setAlimentoSeleccionado(created);
        setSearchQuery('');
    };

    async function guardarIngesta() {
        const cantGramos = parseFloat(gramos);
        if (!alimentoSeleccionado || isNaN(cantGramos) || cantGramos <= 0) {
            Alert.alert('Faltan datos', 'Selecciona un alimento e introduce una cantidad válida.');
            return;
        }

        try {
            setLoading(true);
            const factor = cantGramos / 100;
            const kcalItem = Math.round(Number(alimentoSeleccionado.kcal_100g || 0) * factor);
            const protItem = Math.round(Number(alimentoSeleccionado.proteina_100g || 0) * factor * 10) / 10;
            const carbItem = Math.round(Number(alimentoSeleccionado.carbohidratos_100g || 0) * factor * 10) / 10;
            const fatItem = Math.round(Number(alimentoSeleccionado.grasas_100g || 0) * factor * 10) / 10;

            const now = new Date();
            const horaActual = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

            await addMealRecord({
                fecha: todayStr,
                hora: horaActual,
                nombre_personalizado: alimentoSeleccionado.nombre,
                alimentos: [
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
                ],
            });

            Alert.alert(
                'Comida registrada',
                `+${kcalItem} kcal · ${protItem}g proteína sumadas a tu día.`
            );

            setAlimentoSeleccionado(null);
            setSearchQuery('');
            setGramos('200');
        } catch (error) {
            Alert.alert('Error al guardar', error.message);
        } finally {
            setLoading(false);
        }
    }

    const handleDelete = (id) => {
        Alert.alert('Eliminar comida', '¿Quieres borrar este registro?', [
            { text: 'Cancelar', style: 'cancel' },
            { text: 'Eliminar', style: 'destructive', onPress: () => deleteMealRecord(id) },
        ]);
    };

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
                        ) : <View />}
                        <TouchableOpacity
                            style={styles.createFoodTopBtn}
                            onPress={() => openCreateFoodModal(searchQuery.trim())}
                        >
                            <Text style={styles.createFoodTopText}>+ Crear alimento</Text>
                        </TouchableOpacity>
                    </View>

                    <Text style={styles.title}>Dieta</Text>
                    <Text style={styles.subtitle}>
                        Añade lo que comes en el momento, sin horarios ni menús cerrados.
                    </Text>

                    {!alimentoSeleccionado ? (
                        <View style={styles.card}>
                            <Text style={styles.label}>Buscar alimento</Text>
                            <TextInput
                                style={styles.searchInput}
                                placeholder="Ternera, huevos, arroz, salmón..."
                                placeholderTextColor="#52525B"
                                value={searchQuery}
                                onChangeText={setSearchQuery}
                            />

                            {alimentos.length > 0 && (
                                <View style={styles.resultsBox}>
                                    {alimentos.map((item) => (
                                        <TouchableOpacity
                                            key={item.id}
                                            style={styles.resultRow}
                                            onPress={() => setAlimentoSeleccionado(item)}
                                        >
                                            <Text style={styles.resultName}>{item.nombre}</Text>
                                            <Text style={styles.resultMeta}>
                                                {item.kcal_100g} kcal · {item.proteina_100g}g P
                                            </Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            )}

                            {searchQuery.trim().length > 1 && alimentos.length === 0 && (
                                <TouchableOpacity
                                    style={styles.notFoundCreateBtn}
                                    onPress={() => openCreateFoodModal(searchQuery.trim())}
                                >
                                    <Text style={styles.notFoundCreateText}>
                                        ¿No aparece "{searchQuery.trim()}"? Añadirlo a mi base →
                                    </Text>
                                </TouchableOpacity>
                            )}

                            {customFoods.length > 0 && (
                                <>
                                    <Text style={[styles.label, { marginTop: 18 }]}>
                                        Mis alimentos añadidos
                                    </Text>
                                    <View style={styles.presetsGrid}>
                                        {customFoods.map((food) => (
                                            <TouchableOpacity
                                                key={food.id}
                                                style={[styles.presetCard, { borderColor: 'rgba(245,158,11,0.35)' }]}
                                                onPress={() => setAlimentoSeleccionado(food)}
                                            >
                                                <Text style={styles.presetName} numberOfLines={2}>
                                                    {food.nombre}
                                                </Text>
                                                <Text style={styles.presetMeta}>
                                                    {food.kcal_100g} kcal · {food.proteina_100g}g P
                                                </Text>
                                            </TouchableOpacity>
                                        ))}
                                    </View>
                                </>
                            )}

                            <Text style={[styles.label, { marginTop: 18 }]}>
                                Alimentos frecuentes
                            </Text>
                            <View style={styles.presetsGrid}>
                                {TRADITIONAL_FOOD_PRESETS.map((food) => (
                                    <TouchableOpacity
                                        key={food.id}
                                        style={styles.presetCard}
                                        onPress={() => setAlimentoSeleccionado(food)}
                                    >
                                        <Text style={styles.presetName} numberOfLines={2}>
                                            {food.nombre}
                                        </Text>
                                        <Text style={styles.presetMeta}>
                                            {food.kcal_100g} kcal · {food.proteina_100g}g P
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>
                    ) : (
                        <View style={styles.card}>
                            <View style={styles.selectedTop}>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.selectedLabel}>Seleccionado</Text>
                                    <Text style={styles.selectedName}>{alimentoSeleccionado.nombre}</Text>
                                </View>
                                <TouchableOpacity
                                    style={styles.changeBtn}
                                    onPress={() => setAlimentoSeleccionado(null)}
                                >
                                    <Text style={styles.changeBtnText}>Cambiar</Text>
                                </TouchableOpacity>
                            </View>

                            <Text style={styles.label}>Cantidad (gramos)</Text>
                            <TextInput
                                style={styles.gramsInput}
                                keyboardType="numeric"
                                value={gramos}
                                onChangeText={setGramos}
                            />

                            <View style={styles.gramRow}>
                                {['100', '150', '200', '250', '300'].map((g) => (
                                    <TouchableOpacity
                                        key={g}
                                        style={[styles.gramPill, gramos === g && styles.gramPillActive]}
                                        onPress={() => setGramos(g)}
                                    >
                                        <Text
                                            style={[
                                                styles.gramPillText,
                                                gramos === g && styles.gramPillTextActive,
                                            ]}
                                        >
                                            {g}g
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>

                            <View style={styles.macrosBox}>
                                <View style={styles.macroItem}>
                                    <Text style={styles.macroLabel}>Calorías</Text>
                                    <Text style={[styles.macroVal, { color: '#F59E0B' }]}>{previewKcal}</Text>
                                </View>
                                <View style={styles.macroItem}>
                                    <Text style={styles.macroLabel}>Proteína</Text>
                                    <Text style={[styles.macroVal, { color: '#FB7185' }]}>{previewProt}g</Text>
                                </View>
                                <View style={styles.macroItem}>
                                    <Text style={styles.macroLabel}>Carbos</Text>
                                    <Text style={[styles.macroVal, { color: '#38BDF8' }]}>{previewCarb}g</Text>
                                </View>
                                <View style={styles.macroItem}>
                                    <Text style={styles.macroLabel}>Grasas</Text>
                                    <Text style={[styles.macroVal, { color: '#34D399' }]}>{previewFat}g</Text>
                                </View>
                            </View>

                            <TouchableOpacity
                                style={styles.saveBtn}
                                onPress={guardarIngesta}
                                disabled={loading}
                            >
                                {loading ? (
                                    <ActivityIndicator color="#000000" />
                                ) : (
                                    <Text style={styles.saveBtnText}>Registrar comida</Text>
                                )}
                            </TouchableOpacity>
                        </View>
                    )}

                    {/* Comidas de hoy */}
                    <Text style={styles.sectionTitle}>Comidas de hoy</Text>
                    {todayIngestas.length === 0 ? (
                        <View style={styles.emptyCard}>
                            <Text style={styles.emptyText}>No has registrado comidas hoy todavía.</Text>
                        </View>
                    ) : (
                        todayIngestas.map((item) => {
                            const foods = Array.isArray(item.alimentos) ? item.alimentos : [];
                            const totalKcal = foods.reduce((a, f) => a + Number(f.kcal || f.kcal_totales || 0), 0);
                            const totalProt = foods.reduce((a, f) => a + Number(f.proteina || 0), 0);
                            return (
                                <View key={item.id} style={styles.mealCard}>
                                    <View style={{ flex: 1, marginRight: 10 }}>
                                        <Text style={styles.mealName}>
                                            {item.nombre_personalizado || 'Comida'} · {String(item.hora || '').slice(0, 5)}
                                        </Text>
                                        <Text style={styles.mealDetails}>
                                            {foods.map((f) => `${f.nombre} (${f.gramos}g)`).join(', ')}
                                        </Text>
                                    </View>
                                    <View style={styles.mealRight}>
                                        <Text style={styles.mealKcal}>{Math.round(totalKcal)} kcal</Text>
                                        <Text style={styles.mealProt}>{Math.round(totalProt)}g prot</Text>
                                        <TouchableOpacity onPress={() => handleDelete(item.id)}>
                                            <Text style={styles.deleteText}>✕</Text>
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            );
                        })
                    )}
                </View>
            </ScrollView>

            {/* Modal para crear alimento nuevo */}
            <Modal
                visible={createModalVisible}
                transparent
                animationType="fade"
                onRequestClose={() => setCreateModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalCard}>
                        <Text style={styles.modalTitle}>Nuevo alimento (por 100g)</Text>

                        <Text style={styles.modalLabel}>Nombre</Text>
                        <TextInput
                            style={styles.modalInput}
                            placeholder="Ej: Lomo embuchado o Yogur griego"
                            placeholderTextColor="#52525B"
                            value={newNombre}
                            onChangeText={setNewNombre}
                        />

                        <Text style={styles.modalLabel}>Categoría</Text>
                        <View style={styles.catRow}>
                            {FOOD_CATEGORIES.map((cat) => (
                                <TouchableOpacity
                                    key={cat}
                                    style={[styles.catChip, newCategoria === cat && styles.catChipActive]}
                                    onPress={() => setNewCategoria(cat)}
                                >
                                    <Text style={[styles.catChipText, newCategoria === cat && styles.catChipTextActive]}>
                                        {cat}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        <View style={styles.macroInputsRow}>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.modalLabel}>Kcal</Text>
                                <TextInput
                                    style={styles.modalInput}
                                    placeholder="200"
                                    placeholderTextColor="#52525B"
                                    keyboardType="numeric"
                                    value={newKcal}
                                    onChangeText={setNewKcal}
                                />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.modalLabel}>Proteína (g)</Text>
                                <TextInput
                                    style={styles.modalInput}
                                    placeholder="22"
                                    placeholderTextColor="#52525B"
                                    keyboardType="numeric"
                                    value={newProt}
                                    onChangeText={setNewProt}
                                />
                            </View>
                        </View>

                        <View style={styles.macroInputsRow}>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.modalLabel}>Carbos (g)</Text>
                                <TextInput
                                    style={styles.modalInput}
                                    placeholder="5"
                                    placeholderTextColor="#52525B"
                                    keyboardType="numeric"
                                    value={newCarbs}
                                    onChangeText={setNewCarbs}
                                />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.modalLabel}>Grasas (g)</Text>
                                <TextInput
                                    style={styles.modalInput}
                                    placeholder="8"
                                    placeholderTextColor="#52525B"
                                    keyboardType="numeric"
                                    value={newGrasas}
                                    onChangeText={setNewGrasas}
                                />
                            </View>
                        </View>

                        <View style={styles.modalActions}>
                            <TouchableOpacity
                                style={styles.modalCancelBtn}
                                onPress={() => setCreateModalVisible(false)}
                            >
                                <Text style={styles.modalCancelText}>Cancelar</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.modalConfirmBtn}
                                onPress={handleSaveCustomFood}
                            >
                                <Text style={styles.modalConfirmText}>Guardar alimento</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </KeyboardAvoidingView>
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
        marginBottom: 10,
    },
    backBtn: { alignSelf: 'flex-start', paddingVertical: 6, paddingRight: 12 },
    backBtnText: { color: '#A1A1AA', fontSize: 14, fontWeight: '600' },
    createFoodTopBtn: {
        backgroundColor: '#111114',
        paddingHorizontal: 12,
        paddingVertical: 7,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#232329',
    },
    createFoodTopText: { color: '#F59E0B', fontSize: 12, fontWeight: '600' },
    title: { color: '#FAFAFA', fontSize: 26, fontWeight: '700', letterSpacing: -0.5 },
    subtitle: { color: '#A1A1AA', fontSize: 13, marginTop: 4, marginBottom: 18, lineHeight: 18 },
    card: {
        backgroundColor: '#111114',
        borderRadius: 20,
        padding: 18,
        borderWidth: 1,
        borderColor: '#232329',
        marginBottom: 22,
    },
    label: { color: '#A1A1AA', fontSize: 12, fontWeight: '600', marginBottom: 8 },
    searchInput: {
        backgroundColor: '#18181C',
        borderRadius: 12,
        paddingHorizontal: 14,
        paddingVertical: 12,
        color: '#FAFAFA',
        fontSize: 14,
        borderWidth: 1,
        borderColor: '#27272E',
    },
    resultsBox: {
        marginTop: 8,
        backgroundColor: '#18181C',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#27272E',
    },
    resultRow: {
        paddingVertical: 12,
        paddingHorizontal: 14,
        borderBottomWidth: 1,
        borderBottomColor: '#232329',
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    resultName: { color: '#FAFAFA', fontSize: 13, fontWeight: '600', flex: 1 },
    resultMeta: { color: '#A1A1AA', fontSize: 12 },
    presetsGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 10 },
    presetCard: {
        width: '48%',
        backgroundColor: '#18181C',
        borderRadius: 14,
        padding: 12,
        borderWidth: 1,
        borderColor: '#232329',
    },
    presetName: { color: '#FAFAFA', fontSize: 13, fontWeight: '600', marginBottom: 4 },
    presetMeta: { color: '#71717A', fontSize: 11 },
    selectedTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
    selectedLabel: { color: '#F59E0B', fontSize: 11, fontWeight: '600' },
    selectedName: { color: '#FAFAFA', fontSize: 17, fontWeight: '700', marginTop: 2 },
    changeBtn: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        backgroundColor: '#18181C',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#27272E',
    },
    changeBtnText: { color: '#A1A1AA', fontSize: 12, fontWeight: '600' },
    gramsInput: {
        backgroundColor: '#18181C',
        borderRadius: 14,
        paddingVertical: 12,
        color: '#F59E0B',
        fontSize: 30,
        fontWeight: '700',
        textAlign: 'center',
        borderWidth: 1,
        borderColor: '#27272E',
    },
    gramRow: { flexDirection: 'row', justifyContent: 'center', gap: 8, marginTop: 10, marginBottom: 16 },
    gramPill: {
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 10,
        backgroundColor: '#18181C',
        borderWidth: 1,
        borderColor: '#27272E',
    },
    gramPillActive: { backgroundColor: '#F59E0B', borderColor: '#F59E0B' },
    gramPillText: { color: '#A1A1AA', fontSize: 12, fontWeight: '600' },
    gramPillTextActive: { color: '#000000', fontWeight: '700' },
    macrosBox: {
        flexDirection: 'row',
        backgroundColor: '#18181C',
        borderRadius: 14,
        padding: 12,
        marginBottom: 16,
    },
    macroItem: { flex: 1, alignItems: 'center' },
    macroLabel: { color: '#71717A', fontSize: 11, marginBottom: 2 },
    macroVal: { fontSize: 14, fontWeight: '700' },
    saveBtn: {
        backgroundColor: '#F59E0B',
        borderRadius: 14,
        paddingVertical: 14,
        alignItems: 'center',
    },
    saveBtnText: { color: '#000000', fontSize: 14, fontWeight: '700' },
    sectionTitle: { color: '#FAFAFA', fontSize: 16, fontWeight: '700', marginBottom: 12 },
    mealCard: {
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
    mealName: { color: '#FAFAFA', fontSize: 14, fontWeight: '600' },
    mealDetails: { color: '#A1A1AA', fontSize: 12, marginTop: 2 },
    mealRight: { alignItems: 'flex-end', gap: 2 },
    mealKcal: { color: '#F59E0B', fontSize: 14, fontWeight: '700' },
    mealProt: { color: '#A1A1AA', fontSize: 11 },
    deleteText: { color: '#52525B', fontSize: 13, fontWeight: '700', marginTop: 2 },
    emptyCard: {
        backgroundColor: '#111114',
        borderRadius: 16,
        padding: 20,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#232329',
    },
    emptyText: { color: '#71717A', fontSize: 13 },
    notFoundCreateBtn: {
        marginTop: 10,
        backgroundColor: 'rgba(245, 158, 11, 0.1)',
        borderRadius: 12,
        padding: 12,
        borderWidth: 1,
        borderColor: 'rgba(245, 158, 11, 0.3)',
        alignItems: 'center',
    },
    notFoundCreateText: { color: '#F59E0B', fontSize: 13, fontWeight: '600' },
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
    modalTitle: { color: '#FAFAFA', fontSize: 18, fontWeight: '700', marginBottom: 14 },
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
        marginBottom: 12,
    },
    catRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 12 },
    catChip: {
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 8,
        backgroundColor: '#18181C',
        borderWidth: 1,
        borderColor: '#27272E',
    },
    catChipActive: { backgroundColor: '#F59E0B', borderColor: '#F59E0B' },
    catChipText: { color: '#A1A1AA', fontSize: 11, fontWeight: '600' },
    catChipTextActive: { color: '#000000', fontWeight: '700' },
    macroInputsRow: { flexDirection: 'row', gap: 10 },
    modalActions: { flexDirection: 'row', gap: 10, marginTop: 6 },
    modalCancelBtn: {
        flex: 1,
        backgroundColor: '#18181C',
        borderRadius: 12,
        paddingVertical: 12,
        alignItems: 'center',
    },
    modalCancelText: { color: '#A1A1AA', fontSize: 13, fontWeight: '600' },
    modalConfirmBtn: {
        flex: 1,
        backgroundColor: '#F59E0B',
        borderRadius: 12,
        paddingVertical: 12,
        alignItems: 'center',
    },
    modalConfirmText: { color: '#000000', fontSize: 13, fontWeight: '700' },
});
