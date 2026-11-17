import React, { useState, useEffect, useMemo } from 'react';
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
    addTransaction,
    deleteTransaction,
    computePeriodMetrics,
} from './dataStore';

const CATEGORIES_EXPENSE = [
    { id: 'Alimentación', label: '🥩 Alimentación' },
    { id: 'Infraestructura', label: '🖥️ Infraestructura' },
    { id: 'Gastos fijos', label: '🏠 Gastos fijos' },
    { id: 'Ocio', label: '🍸 Ocio' },
    { id: 'Otros', label: '📦 Otros' },
];

const CATEGORIES_INCOME = [
    { id: 'Facturación', label: '💼 Facturación' },
    { id: 'Inversiones', label: '📈 Inversiones' },
    { id: 'Extra', label: '✨ Extra' },
];

export default function FinanceScreen({ onNavigate }) {
    const [storeState, setStoreState] = useState(null);
    const [filterTab, setFilterTab] = useState('all');
    const [saving, setSaving] = useState(false);

    const [modalVisible, setModalVisible] = useState(false);
    const [txType, setTxType] = useState('gasto');
    const [txAmount, setTxAmount] = useState('');
    const [txCategory, setTxCategory] = useState('Alimentación');
    const [txDescription, setTxDescription] = useState('');

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

    const monthMetrics = useMemo(() => computePeriodMetrics(storeState, 'mensual'), [storeState]);

    const unifiedFeed = useMemo(() => {
        if (!storeState) return [];
        const list = [];

        (storeState.transactions || []).forEach((tx) => {
            list.push({
                id: tx.id,
                isAutoWork: false,
                date: new Date(tx.fecha),
                type: tx.tipo?.toLowerCase(),
                category: tx.categoria,
                amount: Number(tx.cantidad || 0),
                description: tx.descripcion,
            });
        });

        (storeState.workSessions || []).forEach((wk) => {
            const diffMs = new Date(wk.hora_fin) - new Date(wk.hora_inicio);
            const hrs = Math.max(0, diffMs / 3600000).toFixed(1);
            list.push({
                id: `auto-${wk.id}`,
                isAutoWork: true,
                date: new Date(wk.hora_inicio || wk.fecha),
                type: 'ingreso',
                category: 'Jornada de trabajo',
                amount: Number(wk.ingreso_generado || 0),
                description: `${hrs}h a ${wk.precio_hora} €/h`,
            });
        });

        list.sort((a, b) => b.date - a.date);

        if (filterTab === 'expense') return list.filter((i) => i.type === 'gasto');
        if (filterTab === 'income') return list.filter((i) => i.type === 'ingreso');
        return list;
    }, [storeState, filterTab]);

    const handleSaveTx = async () => {
        const amount = parseFloat(txAmount);
        if (isNaN(amount) || amount <= 0) {
            Alert.alert('Cantidad requerida', 'Introduce un importe válido mayor que 0.');
            return;
        }
        try {
            setSaving(true);
            await addTransaction({
                fecha: new Date().toISOString(),
                tipo: txType,
                categoria: txCategory,
                cantidad: amount,
                descripcion: txDescription.trim() || txCategory,
            });
            setModalVisible(false);
            setTxAmount('');
            setTxDescription('');
        } catch (err) {
            Alert.alert('Error', err.message);
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = (id) => {
        Alert.alert('Eliminar movimiento', '¿Quieres borrar este registro?', [
            { text: 'Cancelar', style: 'cancel' },
            { text: 'Eliminar', style: 'destructive', onPress: () => deleteTransaction(id) },
        ]);
    };

    if (!storeState || !monthMetrics) {
        return (
            <View style={styles.loadingWrap}>
                <ActivityIndicator color="#34D399" />
            </View>
        );
    }

    const { economy } = monthMetrics;

    return (
        <View style={styles.container}>
            <ScrollView
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                <View style={styles.innerWrap}>
                    {/* Cabecera limpia */}
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
                            style={styles.newBtn}
                            onPress={() => setModalVisible(true)}
                        >
                            <Text style={styles.newBtnText}>+ Nuevo movimiento</Text>
                        </TouchableOpacity>
                    </View>

                    <Text style={styles.title}>Economía</Text>
                    <Text style={styles.subtitle}>
                        Tus ingresos de trabajo y tus gastos del mes en un solo lugar.
                    </Text>

                    {/* Tarjeta Balance */}
                    <View style={styles.balanceCard}>
                        <View style={styles.balanceTop}>
                            <Text style={styles.balanceLabel}>Balance neto este mes</Text>
                            <Text
                                style={[
                                    styles.savingsBadge,
                                    { color: economy.savingsRate >= 0 ? '#34D399' : '#FB7185' },
                                ]}
                            >
                                {economy.savingsRate >= 0 ? `${economy.savingsRate}% ahorro` : 'Déficit'}
                            </Text>
                        </View>

                        <Text
                            style={[
                                styles.balanceValue,
                                { color: economy.netBalance >= 0 ? '#34D399' : '#FB7185' },
                            ]}
                        >
                            {economy.netBalance >= 0 ? '+' : ''}
                            {economy.netBalance.toLocaleString('es-ES')} €
                        </Text>

                        <View style={styles.divider} />

                        <View style={styles.splitRow}>
                            <View style={styles.splitCol}>
                                <Text style={styles.splitLabel}>Ingresos</Text>
                                <Text style={[styles.splitValue, { color: '#34D399' }]}>
                                    +{economy.totalIncome.toLocaleString('es-ES')} €
                                </Text>
                                <Text style={styles.splitSub}>
                                    {economy.workIncome} € de jornadas
                                </Text>
                            </View>
                            <View style={styles.vDivider} />
                            <View style={styles.splitCol}>
                                <Text style={styles.splitLabel}>Gastos</Text>
                                <Text style={[styles.splitValue, { color: '#FB7185' }]}>
                                    -{economy.expenses.toLocaleString('es-ES')} €
                                </Text>
                                <Text style={styles.splitSub}>
                                    {economy.foodExpenses} € en comida
                                </Text>
                            </View>
                        </View>
                    </View>

                    {/* Filtros */}
                    <View style={styles.filterRow}>
                        {[
                            { id: 'all', label: 'Todos' },
                            { id: 'income', label: 'Ingresos' },
                            { id: 'expense', label: 'Gastos' },
                        ].map((t) => (
                            <TouchableOpacity
                                key={t.id}
                                style={[styles.filterBtn, filterTab === t.id && styles.filterBtnActive]}
                                onPress={() => setFilterTab(t.id)}
                            >
                                <Text
                                    style={[
                                        styles.filterText,
                                        filterTab === t.id && styles.filterTextActive,
                                    ]}
                                >
                                    {t.label}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    {/* Listado */}
                    {unifiedFeed.length === 0 ? (
                        <View style={styles.emptyCard}>
                            <Text style={styles.emptyText}>No hay movimientos registrados.</Text>
                        </View>
                    ) : (
                        unifiedFeed.map((item) => {
                            const isInc = item.type === 'ingreso';
                            let dateStr = '';
                            try {
                                dateStr = item.date.toLocaleDateString('es-ES', {
                                    day: '2-digit',
                                    month: 'short',
                                });
                            } catch {
                                dateStr = 'Hoy';
                            }

                            return (
                                <View key={item.id} style={styles.txCard}>
                                    <View style={{ flex: 1, marginRight: 10 }}>
                                        <Text style={styles.txCategory}>{item.category}</Text>
                                        <Text style={styles.txDesc} numberOfLines={1}>
                                            {item.description}
                                        </Text>
                                        <Text style={styles.txDate}>{dateStr}</Text>
                                    </View>
                                    <View style={styles.txRight}>
                                        <Text
                                            style={[
                                                styles.txAmount,
                                                { color: isInc ? '#34D399' : '#FB7185' },
                                            ]}
                                        >
                                            {isInc ? '+' : '-'}
                                            {item.amount.toLocaleString('es-ES')} €
                                        </Text>
                                        {!item.isAutoWork && (
                                            <TouchableOpacity
                                                style={styles.deleteBtn}
                                                onPress={() => handleDelete(item.id)}
                                            >
                                                <Text style={styles.deleteText}>✕</Text>
                                            </TouchableOpacity>
                                        )}
                                    </View>
                                </View>
                            );
                        })
                    )}
                </View>
            </ScrollView>

            {/* Modal */}
            <Modal
                visible={modalVisible}
                transparent
                animationType="fade"
                onRequestClose={() => setModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalCard}>
                        <Text style={styles.modalTitle}>Nuevo movimiento</Text>

                        <View style={styles.typeRow}>
                            <TouchableOpacity
                                style={[styles.typeBtn, txType === 'gasto' && styles.typeBtnExpense]}
                                onPress={() => {
                                    setTxType('gasto');
                                    setTxCategory('Alimentación');
                                }}
                            >
                                <Text
                                    style={[
                                        styles.typeBtnText,
                                        txType === 'gasto' && styles.typeBtnTextActive,
                                    ]}
                                >
                                    Gasto
                                </Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[styles.typeBtn, txType === 'ingreso' && styles.typeBtnIncome]}
                                onPress={() => {
                                    setTxType('ingreso');
                                    setTxCategory('Facturación');
                                }}
                            >
                                <Text
                                    style={[
                                        styles.typeBtnText,
                                        txType === 'ingreso' && styles.typeBtnTextActive,
                                    ]}
                                >
                                    Ingreso
                                </Text>
                            </TouchableOpacity>
                        </View>

                        <Text style={styles.inputLabel}>Importe (€)</Text>
                        <TextInput
                            style={styles.modalInput}
                            keyboardType="numeric"
                            placeholder="0.00"
                            placeholderTextColor="#52525B"
                            value={txAmount}
                            onChangeText={setTxAmount}
                        />

                        <Text style={styles.inputLabel}>Categoría</Text>
                        <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={styles.catRow}
                        >
                            {(txType === 'gasto' ? CATEGORIES_EXPENSE : CATEGORIES_INCOME).map((c) => (
                                <TouchableOpacity
                                    key={c.id}
                                    style={[styles.catPill, txCategory === c.id && styles.catPillActive]}
                                    onPress={() => setTxCategory(c.id)}
                                >
                                    <Text
                                        style={[
                                            styles.catText,
                                            txCategory === c.id && styles.catTextActive,
                                        ]}
                                    >
                                        {c.label}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>

                        <Text style={styles.inputLabel}>Descripción</Text>
                        <TextInput
                            style={styles.modalInput}
                            placeholder="Ej. Compra semanal"
                            placeholderTextColor="#52525B"
                            value={txDescription}
                            onChangeText={setTxDescription}
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
                                onPress={handleSaveTx}
                                disabled={saving}
                            >
                                {saving ? (
                                    <ActivityIndicator color="#000000" />
                                ) : (
                                    <Text style={styles.modalConfirmText}>Guardar</Text>
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
    container: { flex: 1, backgroundColor: '#000000' },
    loadingWrap: { flex: 1, backgroundColor: '#000000', justifyContent: 'center', alignItems: 'center' },
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
    newBtn: {
        backgroundColor: '#111114',
        paddingHorizontal: 12,
        paddingVertical: 7,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#232329',
    },
    newBtnText: { color: '#34D399', fontSize: 12, fontWeight: '600' },
    title: { color: '#FAFAFA', fontSize: 26, fontWeight: '700', letterSpacing: -0.5 },
    subtitle: { color: '#A1A1AA', fontSize: 13, marginTop: 4, marginBottom: 18, lineHeight: 18 },
    balanceCard: {
        backgroundColor: '#111114',
        borderRadius: 20,
        padding: 18,
        borderWidth: 1,
        borderColor: '#232329',
        marginBottom: 18,
    },
    balanceTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    balanceLabel: { color: '#A1A1AA', fontSize: 13 },
    savingsBadge: { fontSize: 12, fontWeight: '700' },
    balanceValue: { fontSize: 32, fontWeight: '700', marginTop: 4 },
    divider: { height: 1, backgroundColor: '#232329', marginVertical: 14 },
    splitRow: { flexDirection: 'row' },
    splitCol: { flex: 1 },
    vDivider: { width: 1, backgroundColor: '#232329', marginHorizontal: 12 },
    splitLabel: { color: '#71717A', fontSize: 12, marginBottom: 2 },
    splitValue: { fontSize: 16, fontWeight: '700' },
    splitSub: { color: '#71717A', fontSize: 11, marginTop: 2 },
    filterRow: { flexDirection: 'row', gap: 8, marginBottom: 14 },
    filterBtn: {
        paddingVertical: 7,
        paddingHorizontal: 14,
        borderRadius: 20,
        backgroundColor: '#111114',
        borderWidth: 1,
        borderColor: '#232329',
    },
    filterBtnActive: { backgroundColor: '#FAFAFA', borderColor: '#FAFAFA' },
    filterText: { color: '#A1A1AA', fontSize: 12, fontWeight: '600' },
    filterTextActive: { color: '#000000', fontWeight: '700' },
    txCard: {
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
    txCategory: { color: '#FAFAFA', fontSize: 14, fontWeight: '600' },
    txDesc: { color: '#A1A1AA', fontSize: 12, marginTop: 2 },
    txDate: { color: '#71717A', fontSize: 11, marginTop: 4 },
    txRight: { alignItems: 'flex-end', gap: 4 },
    txAmount: { fontSize: 15, fontWeight: '700' },
    deleteBtn: { padding: 4 },
    deleteText: { color: '#52525B', fontSize: 13, fontWeight: '700' },
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
    modalTitle: { color: '#FAFAFA', fontSize: 18, fontWeight: '700', marginBottom: 14 },
    typeRow: { flexDirection: 'row', gap: 10, marginBottom: 14 },
    typeBtn: {
        flex: 1,
        paddingVertical: 10,
        borderRadius: 10,
        backgroundColor: '#18181C',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#27272E',
    },
    typeBtnExpense: { backgroundColor: 'rgba(251, 113, 133, 0.16)', borderColor: '#FB7185' },
    typeBtnIncome: { backgroundColor: 'rgba(52, 211, 153, 0.16)', borderColor: '#34D399' },
    typeBtnText: { color: '#A1A1AA', fontSize: 13, fontWeight: '600' },
    typeBtnTextActive: { color: '#FAFAFA', fontWeight: '700' },
    inputLabel: { color: '#A1A1AA', fontSize: 12, marginBottom: 6 },
    modalInput: {
        backgroundColor: '#18181C',
        borderRadius: 12,
        paddingHorizontal: 14,
        paddingVertical: 11,
        color: '#FAFAFA',
        fontSize: 15,
        borderWidth: 1,
        borderColor: '#27272E',
        marginBottom: 14,
    },
    catRow: { gap: 8, marginBottom: 14 },
    catPill: {
        paddingVertical: 7,
        paddingHorizontal: 12,
        borderRadius: 10,
        backgroundColor: '#18181C',
        borderWidth: 1,
        borderColor: '#27272E',
    },
    catPillActive: { backgroundColor: '#27272E', borderColor: '#52525B' },
    catText: { color: '#A1A1AA', fontSize: 12 },
    catTextActive: { color: '#FAFAFA', fontWeight: '600' },
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
        backgroundColor: '#FAFAFA',
        borderRadius: 12,
        paddingVertical: 12,
        alignItems: 'center',
    },
    modalConfirmText: { color: '#000000', fontSize: 14, fontWeight: '700' },
});
