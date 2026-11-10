import React, { useState, useEffect, useCallback, useMemo } from 'react';
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

const CATEGORIES_EXPENSE = [
    { id: 'comida', label: '🥩 Alimentación', icon: '🥩' },
    { id: 'infra', label: '🖥️ Servidores/Infra', icon: '🖥️' },
    { id: 'fijos', label: '🏠 Gastos Fijos', icon: '🏠' },
    { id: 'ocio', label: '🍸 Ocio & Estilo', icon: '🍸' },
    { id: 'otros', label: '📦 Otros Gastos', icon: '📦' },
];

const CATEGORIES_INCOME = [
    { id: 'facturacion', label: '💼 Facturación', icon: '💼' },
    { id: 'inversiones', label: '📈 Inversiones', icon: '📈' },
    { id: 'extra', label: '⚡ Ingreso Extra', icon: '⚡' },
];

export default function FinanceScreen({ onNavigate }) {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [userId, setUserId] = useState(null);

    // Listas de datos
    const [transactions, setTransactions] = useState([]);
    const [workSessions, setWorkSessions] = useState([]);
    const [filterTab, setFilterTab] = useState('all'); // 'all', 'expense', 'income'

    // Modal de Nueva Transacción
    const [modalVisible, setModalVisible] = useState(false);
    const [txType, setTxType] = useState('gasto'); // 'gasto' | 'ingreso'
    const [txAmount, setTxAmount] = useState('');
    const [txCategory, setTxCategory] = useState('comida');
    const [txDescription, setTxDescription] = useState('');

    // Cargar datos consolidados
    const fetchFinanceData = useCallback(async () => {
        try {
            setLoading(true);
            const { data: { user } } = await supabase.auth.getUser();
            const currentUserId = user?.id || null;
            setUserId(currentUserId);

            const now = new Date();
            const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

            if (!currentUserId) {
                // Demo data si no hay sesión iniciada
                setTransactions([
                    {
                        id: 'demo-tx-1',
                        fecha: new Date(Date.now() - 3600000 * 5).toISOString(),
                        tipo: 'gasto',
                        categoria: '🥩 Alimentación',
                        cantidad: 78.50,
                        descripcion: 'Compra semanal supermercado (ternera, huevos, arroz)',
                    },
                    {
                        id: 'demo-tx-2',
                        fecha: new Date(Date.now() - 86400000).toISOString(),
                        tipo: 'gasto',
                        categoria: '🖥️ Servidores/Infra',
                        cantidad: 45.00,
                        descripcion: 'Hosting Supabase Pro + Dominios',
                    },
                    {
                        id: 'demo-tx-3',
                        fecha: new Date(Date.now() - 86400000 * 2).toISOString(),
                        tipo: 'ingreso',
                        categoria: '💼 Facturación',
                        cantidad: 1200.00,
                        descripcion: 'Pago hito cliente consultoría',
                    },
                ]);

                setWorkSessions([
                    {
                        id: 'demo-wk-1',
                        fecha: new Date().toISOString().split('T')[0],
                        hora_inicio: new Date(Date.now() - 3600000 * 4).toISOString(),
                        hora_fin: new Date().toISOString(),
                        precio_hora: 45,
                        ingreso_generado: 180.0,
                    },
                ]);
                return;
            }

            // 1. Transacciones manuales
            const { data: txData, error: txError } = await supabase
                .from('transacciones_economicas')
                .select('*')
                .eq('user_id', currentUserId)
                .gte('fecha', startOfMonth)
                .order('fecha', { ascending: false });

            if (txError) throw txError;
            setTransactions(txData || []);

            // 2. Ingresos de jornadas de trabajo
            const { data: wkData, error: wkError } = await supabase
                .from('jornadas_trabajo')
                .select('*')
                .eq('user_id', currentUserId)
                .gte('fecha', startOfMonth.split('T')[0])
                .order('hora_inicio', { ascending: false });

            if (wkError) throw wkError;
            setWorkSessions(wkData || []);

        } catch (error) {
            console.error('Error al cargar finanzas:', error.message);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchFinanceData();
    }, [fetchFinanceData]);

    // Guardar nueva transacción manual
    const handleSaveTransaction = async () => {
        const amount = parseFloat(txAmount);
        if (isNaN(amount) || amount <= 0) {
            Alert.alert('Cantidad requerida', 'Por favor ingresa un importe mayor que 0.');
            return;
        }

        const catObject = (txType === 'gasto' ? CATEGORIES_EXPENSE : CATEGORIES_INCOME)
            .find((c) => c.id === txCategory);
        const finalCategory = catObject ? catObject.label : txCategory;

        try {
            setSaving(true);
            const now = new Date();

            if (userId) {
                const { data, error } = await supabase
                    .from('transacciones_economicas')
                    .insert([
                        {
                            user_id: userId,
                            fecha: now.toISOString(),
                            tipo: txType,
                            categoria: finalCategory,
                            cantidad: amount,
                            descripcion: txDescription.trim() || finalCategory,
                        },
                    ])
                    .select();

                if (error) throw error;
                if (data && data.length > 0) {
                    setTransactions((prev) => [data[0], ...prev]);
                }
            } else {
                const newDemoTx = {
                    id: `local-tx-${Date.now()}`,
                    fecha: now.toISOString(),
                    tipo: txType,
                    categoria: finalCategory,
                    cantidad: amount,
                    descripcion: txDescription.trim() || finalCategory,
                };
                setTransactions((prev) => [newDemoTx, ...prev]);
            }

            setModalVisible(false);
            setTxAmount('');
            setTxDescription('');
            Alert.alert('Registrado', `${txType === 'gasto' ? 'Gasto' : 'Ingreso'} de ${amount} € anotado en el libro contable.`);
        } catch (error) {
            Alert.alert('Error', error.message);
        } finally {
            setSaving(false);
        }
    };

    // Eliminar transacción manual
    const handleDeleteTx = async (txId) => {
        Alert.alert(
            'Eliminar Asiento',
            '¿Deseas suprimir esta transacción?',
            [
                { text: 'Cancelar', style: 'cancel' },
                {
                    text: 'Eliminar',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            if (userId) {
                                await supabase
                                    .from('transacciones_economicas')
                                    .delete()
                                    .eq('id', txId);
                            }
                            setTransactions((prev) => prev.filter((t) => t.id !== txId));
                        } catch (err) {
                            Alert.alert('Error', err.message);
                        }
                    },
                },
            ]
        );
    };

    // Cálculos consolidados del mes
    const metrics = useMemo(() => {
        const manualIncome = transactions
            .filter((t) => t.tipo?.toLowerCase() === 'ingreso')
            .reduce((acc, t) => acc + (Number(t.cantidad) || 0), 0);

        const workIncome = workSessions
            .reduce((acc, w) => acc + (Number(w.ingreso_generado) || 0), 0);

        const totalIncome = manualIncome + workIncome;

        const totalExpenses = transactions
            .filter((t) => t.tipo?.toLowerCase() === 'gasto')
            .reduce((acc, t) => acc + (Number(t.cantidad) || 0), 0);

        const netBalance = totalIncome - totalExpenses;
        const savingsRate = totalIncome > 0 ? Math.round((netBalance / totalIncome) * 100) : 0;

        // Gasto en comida
        const foodExpenses = transactions
            .filter((t) => t.tipo?.toLowerCase() === 'gasto' && (t.categoria?.includes('Alimentación') || t.categoria?.includes('comida')))
            .reduce((acc, t) => acc + (Number(t.cantidad) || 0), 0);

        return {
            manualIncome,
            workIncome,
            totalIncome,
            totalExpenses,
            netBalance,
            savingsRate,
            foodExpenses,
        };
    }, [transactions, workSessions]);

    // Combinar lista unificada de transacciones + jornadas de trabajo
    const unifiedFeed = useMemo(() => {
        const list = [];

        // Añadir transacciones manuales
        transactions.forEach((tx) => {
            list.push({
                id: tx.id,
                isAutoWork: false,
                date: new Date(tx.fecha),
                type: tx.tipo?.toLowerCase(),
                category: tx.categoria,
                amount: Number(tx.cantidad),
                description: tx.descripcion,
            });
        });

        // Añadir jornadas de trabajo como ingresos automáticos
        workSessions.forEach((wk) => {
            const diffMs = new Date(wk.hora_fin) - new Date(wk.hora_inicio);
            const hrs = (diffMs / (1000 * 3600)).toFixed(1);
            list.push({
                id: `auto-wk-${wk.id}`,
                isAutoWork: true,
                date: new Date(wk.hora_inicio || wk.fecha),
                type: 'ingreso',
                category: '⏱️ Jornada Facturada',
                amount: Number(wk.ingreso_generado),
                description: `Liquidación automática: ${hrs}h a ${wk.precio_hora}€/h`,
            });
        });

        // Ordenar por fecha descendente
        list.sort((a, b) => b.date - a.date);

        // Filtrar según pestaña activa
        if (filterTab === 'expense') {
            return list.filter((item) => item.type === 'gasto');
        }
        if (filterTab === 'income') {
            return list.filter((item) => item.type === 'ingreso');
        }
        return list;
    }, [transactions, workSessions, filterTab]);

    return (
        <View style={styles.container}>
            <ScrollView contentContainerStyle={styles.scrollContent}>
                {/* Cabecera */}
                <View style={styles.header}>
                    <View>
                        <Text style={styles.superTitle}>PILAR ECONOMÍA & CAPITAL</Text>
                        <Text style={styles.mainTitle}>Libro Mayor Ejecutivo</Text>
                    </View>
                    <TouchableOpacity
                        style={styles.newTxBtn}
                        onPress={() => setModalVisible(true)}
                    >
                        <Text style={styles.newTxBtnText}>+ Transacción</Text>
                    </TouchableOpacity>
                </View>

                {/* TARJETA DE BALANCE PRINCIPAL */}
                <View style={styles.balanceCard}>
                    <View style={styles.balanceHeader}>
                        <Text style={styles.balanceLabel}>FLUJO DE CAJA NETO (ESTE MES)</Text>
                        <View style={[
                            styles.savingsBadge,
                            { backgroundColor: metrics.savingsRate >= 0 ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)' }
                        ]}>
                            <Text style={[
                                styles.savingsBadgeText,
                                { color: metrics.savingsRate >= 0 ? '#34d399' : '#f87171' }
                            ]}>
                                {metrics.savingsRate >= 0 ? `+${metrics.savingsRate}% Ahorro` : 'Déficit'}
                            </Text>
                        </View>
                    </View>

                    <Text style={[
                        styles.balanceAmount,
                        { color: metrics.netBalance >= 0 ? '#10b981' : '#ef4444' }
                    ]}>
                        {metrics.netBalance >= 0 ? '+' : ''}{metrics.netBalance.toLocaleString('es-ES')} €
                    </Text>

                    <View style={styles.cardDivider} />

                    <View style={styles.incomeExpenseRow}>
                        <View style={styles.subStatBox}>
                            <Text style={styles.subStatLabel}>Ingresos Consolidados</Text>
                            <Text style={styles.subStatIncome}>
                                +{metrics.totalIncome.toLocaleString('es-ES')} €
                            </Text>
                            <Text style={styles.microWorkNote}>
                                ⏱️ {metrics.workIncome.toLocaleString('es-ES')} € de jornadas
                            </Text>
                        </View>

                        <View style={styles.subStatDivider} />

                        <View style={styles.subStatBox}>
                            <Text style={styles.subStatLabel}>Gastos Consolidados</Text>
                            <Text style={styles.subStatExpense}>
                                -{metrics.totalExpenses.toLocaleString('es-ES')} €
                            </Text>
                            <Text style={styles.microFoodNote}>
                                🥩 {metrics.foodExpenses.toLocaleString('es-ES')} € en comida
                            </Text>
                        </View>
                    </View>
                </View>

                {/* Pestañas de Filtrado */}
                <View style={styles.filterTabsRow}>
                    {[
                        { id: 'all', label: 'Todos' },
                        { id: 'income', label: 'Ingresos' },
                        { id: 'expense', label: 'Gastos' },
                    ].map((tab) => (
                        <TouchableOpacity
                            key={tab.id}
                            style={[
                                styles.filterTab,
                                filterTab === tab.id && styles.filterTabActive,
                            ]}
                            onPress={() => setFilterTab(tab.id)}
                        >
                            <Text
                                style={[
                                    styles.filterTabText,
                                    filterTab === tab.id && styles.filterTabTextActive,
                                ]}
                            >
                                {tab.label}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>

                {/* LISTA UNIFICADA DE MOVIMIENTOS */}
                <View style={styles.feedSection}>
                    {loading ? (
                        <ActivityIndicator color="#10b981" style={{ marginTop: 20 }} />
                    ) : unifiedFeed.length === 0 ? (
                        <View style={styles.emptyCard}>
                            <Text style={styles.emptyCardText}>No hay movimientos registrados.</Text>
                            <Text style={styles.emptyCardSub}>
                                Añade gastos o inicia jornadas para ver tu flujo de caja en tiempo real.
                            </Text>
                        </View>
                    ) : (
                        unifiedFeed.map((item) => {
                            const isIncome = item.type === 'ingreso';
                            let dateStr = 'Hoy';
                            try {
                                dateStr = item.date.toLocaleDateString('es-ES', {
                                    day: '2-digit',
                                    month: 'short',
                                });
                            } catch (e) {
                                dateStr = item.date ? item.date.toISOString().slice(5, 10) : 'Hoy';
                            }

                            return (
                                <View key={item.id} style={styles.feedCard}>
                                    <View style={styles.feedLeft}>
                                        <View style={styles.feedHeaderRow}>
                                            <Text style={styles.feedCategory}>{item.category}</Text>
                                            {item.isAutoWork && (
                                                <View style={styles.autoWorkBadge}>
                                                    <Text style={styles.autoWorkBadgeText}>AUTO-JORNADA</Text>
                                                </View>
                                            )}
                                        </View>
                                        <Text style={styles.feedDescription} numberOfLines={1}>
                                            {item.description}
                                        </Text>
                                        <Text style={styles.feedDate}>{dateStr}</Text>
                                    </View>

                                    <View style={styles.feedRight}>
                                        <Text style={[
                                            styles.feedAmount,
                                            { color: isIncome ? '#10b981' : '#ef4444' }
                                        ]}>
                                            {isIncome ? '+' : '-'}{item.amount.toLocaleString('es-ES')} €
                                        </Text>
                                        {!item.isAutoWork && (
                                            <TouchableOpacity
                                                onPress={() => handleDeleteTx(item.id)}
                                                style={styles.feedDeleteBtn}
                                            >
                                                <Text style={styles.feedDeleteText}>✕</Text>
                                            </TouchableOpacity>
                                        )}
                                    </View>
                                </View>
                            );
                        })
                    )}
                </View>
            </ScrollView>

            {/* MODAL NUEVA TRANSACCIÓN */}
            <Modal
                visible={modalVisible}
                transparent
                animationType="fade"
                onRequestClose={() => setModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalCard}>
                        <Text style={styles.modalTitle}>Nuevo Movimiento</Text>
                        <Text style={styles.modalSub}>
                            Registra entradas y salidas de capital para auditoría inmediata.
                        </Text>

                        {/* Switch Tipo: Gasto / Ingreso */}
                        <View style={styles.typeSwitchRow}>
                            <TouchableOpacity
                                style={[
                                    styles.typeSwitchBtn,
                                    txType === 'gasto' && styles.typeSwitchBtnExpense,
                                ]}
                                onPress={() => {
                                    setTxType('gasto');
                                    setTxCategory('comida');
                                }}
                            >
                                <Text style={[
                                    styles.typeSwitchText,
                                    txType === 'gasto' && styles.typeSwitchTextActive
                                ]}>
                                    - Gasto
                                </Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[
                                    styles.typeSwitchBtn,
                                    txType === 'ingreso' && styles.typeSwitchBtnIncome,
                                ]}
                                onPress={() => {
                                    setTxType('ingreso');
                                    setTxCategory('facturacion');
                                }}
                            >
                                <Text style={[
                                    styles.typeSwitchText,
                                    txType === 'ingreso' && styles.typeSwitchTextActive
                                ]}>
                                    + Ingreso Extra
                                </Text>
                            </TouchableOpacity>
                        </View>

                        {/* Importe */}
                        <Text style={styles.inputLabel}>CANTIDAD (€)</Text>
                        <TextInput
                            style={styles.modalInputLarge}
                            keyboardType="numeric"
                            placeholder="0.00"
                            placeholderTextColor="#52525b"
                            value={txAmount}
                            onChangeText={setTxAmount}
                        />

                        {/* Selector de Categorías */}
                        <Text style={styles.inputLabel}>CATEGORÍA</Text>
                        <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={styles.categoryPillsRow}
                        >
                            {(txType === 'gasto' ? CATEGORIES_EXPENSE : CATEGORIES_INCOME).map((cat) => (
                                <TouchableOpacity
                                    key={cat.id}
                                    style={[
                                        styles.categoryPill,
                                        txCategory === cat.id && styles.categoryPillActive,
                                    ]}
                                    onPress={() => setTxCategory(cat.id)}
                                >
                                    <Text style={[
                                        styles.categoryPillText,
                                        txCategory === cat.id && styles.categoryPillTextActive,
                                    ]}>
                                        {cat.label}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>

                        {/* Descripción */}
                        <Text style={styles.inputLabel}>DESCRIPCIÓN / CONCEPTO</Text>
                        <TextInput
                            style={styles.modalInput}
                            placeholder="Ej. Compra carne y huevos, hosting AWS..."
                            placeholderTextColor="#52525b"
                            value={txDescription}
                            onChangeText={setTxDescription}
                        />

                        {/* Botones de Acción */}
                        <View style={styles.modalActions}>
                            <TouchableOpacity
                                style={styles.modalCancelBtn}
                                onPress={() => setModalVisible(false)}
                            >
                                <Text style={styles.modalCancelBtnText}>Cancelar</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[
                                    styles.modalConfirmBtn,
                                    { backgroundColor: txType === 'gasto' ? '#ef4444' : '#10b981' }
                                ]}
                                onPress={handleSaveTransaction}
                                disabled={saving}
                            >
                                {saving ? (
                                    <ActivityIndicator color="#ffffff" />
                                ) : (
                                    <Text style={styles.modalConfirmBtnText}>Registrar</Text>
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
        color: '#10b981',
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
    newTxBtn: {
        backgroundColor: '#121216',
        paddingHorizontal: 14,
        paddingVertical: 7,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#27272a',
    },
    newTxBtnText: {
        color: '#34d399',
        fontSize: 12,
        fontWeight: '700',
    },

    // Tarjeta de Balance
    balanceCard: {
        backgroundColor: '#0a0a0c',
        borderRadius: 20,
        padding: 20,
        borderWidth: 1,
        borderColor: 'rgba(16, 185, 129, 0.3)',
        marginBottom: 20,
    },
    balanceHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 6,
    },
    balanceLabel: {
        color: '#71717a',
        fontSize: 10,
        fontWeight: '800',
        letterSpacing: 1,
    },
    savingsBadge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: 'rgba(16, 185, 129, 0.3)',
    },
    savingsBadgeText: {
        fontSize: 11,
        fontWeight: '800',
    },
    balanceAmount: {
        fontSize: 36,
        fontWeight: '900',
        letterSpacing: -1,
        marginVertical: 4,
    },
    cardDivider: {
        height: 1,
        backgroundColor: '#1f1f23',
        marginVertical: 14,
    },
    incomeExpenseRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    subStatBox: {
        flex: 1,
    },
    subStatDivider: {
        width: 1,
        backgroundColor: '#1f1f23',
        marginHorizontal: 12,
    },
    subStatLabel: {
        color: '#a1a1aa',
        fontSize: 11,
        fontWeight: '500',
        marginBottom: 2,
    },
    subStatIncome: {
        color: '#10b981',
        fontSize: 17,
        fontWeight: '800',
    },
    subStatExpense: {
        color: '#ef4444',
        fontSize: 17,
        fontWeight: '800',
    },
    microWorkNote: {
        color: '#06b6d4',
        fontSize: 10,
        fontWeight: '600',
        marginTop: 2,
    },
    microFoodNote: {
        color: '#fbbf24',
        fontSize: 10,
        fontWeight: '600',
        marginTop: 2,
    },

    // Filtros
    filterTabsRow: {
        flexDirection: 'row',
        gap: 8,
        marginBottom: 16,
    },
    filterTab: {
        paddingVertical: 6,
        paddingHorizontal: 16,
        borderRadius: 8,
        backgroundColor: '#0f0f12',
        borderWidth: 1,
        borderColor: '#1f1f23',
    },
    filterTabActive: {
        backgroundColor: '#1c1c24',
        borderColor: '#3f3f46',
    },
    filterTabText: {
        color: '#71717a',
        fontSize: 12,
        fontWeight: '600',
    },
    filterTabTextActive: {
        color: '#ffffff',
        fontWeight: '800',
    },

    // Feed de Transacciones
    feedSection: {
        gap: 10,
    },
    feedCard: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#0a0a0c',
        borderRadius: 14,
        padding: 14,
        borderWidth: 1,
        borderColor: '#1f1f23',
    },
    feedLeft: {
        flex: 1,
        marginRight: 10,
    },
    feedHeaderRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 2,
    },
    feedCategory: {
        color: '#f4f4f5',
        fontSize: 13,
        fontWeight: '700',
    },
    autoWorkBadge: {
        backgroundColor: 'rgba(6, 182, 212, 0.15)',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
        borderWidth: 1,
        borderColor: 'rgba(6, 182, 212, 0.3)',
    },
    autoWorkBadgeText: {
        color: '#06b6d4',
        fontSize: 8,
        fontWeight: '800',
    },
    feedDescription: {
        color: '#a1a1aa',
        fontSize: 12,
        marginTop: 2,
    },
    feedDate: {
        color: '#52525b',
        fontSize: 10,
        marginTop: 4,
    },
    feedRight: {
        alignItems: 'flex-end',
        gap: 4,
    },
    feedAmount: {
        fontSize: 16,
        fontWeight: '900',
    },
    feedDeleteBtn: {
        padding: 4,
    },
    feedDeleteText: {
        color: '#52525b',
        fontSize: 13,
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
    emptyCardSub: {
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
    typeSwitchRow: {
        flexDirection: 'row',
        gap: 10,
        marginBottom: 16,
    },
    typeSwitchBtn: {
        flex: 1,
        paddingVertical: 10,
        borderRadius: 10,
        backgroundColor: '#18181b',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#27272a',
    },
    typeSwitchBtnExpense: {
        backgroundColor: 'rgba(239, 68, 68, 0.2)',
        borderColor: '#ef4444',
    },
    typeSwitchBtnIncome: {
        backgroundColor: 'rgba(16, 185, 129, 0.2)',
        borderColor: '#10b981',
    },
    typeSwitchText: {
        color: '#71717a',
        fontSize: 13,
        fontWeight: '700',
    },
    typeSwitchTextActive: {
        color: '#ffffff',
        fontWeight: '900',
    },
    inputLabel: {
        color: '#71717a',
        fontSize: 10,
        fontWeight: '800',
        letterSpacing: 0.8,
        marginBottom: 6,
    },
    modalInputLarge: {
        backgroundColor: '#18181b',
        borderRadius: 10,
        paddingHorizontal: 14,
        paddingVertical: 10,
        color: '#ffffff',
        fontSize: 22,
        fontWeight: '900',
        borderWidth: 1,
        borderColor: '#27272a',
        marginBottom: 14,
    },
    categoryPillsRow: {
        gap: 8,
        marginBottom: 14,
    },
    categoryPill: {
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 8,
        backgroundColor: '#18181b',
        borderWidth: 1,
        borderColor: '#27272a',
    },
    categoryPillActive: {
        backgroundColor: '#27272a',
        borderColor: '#52525b',
    },
    categoryPillText: {
        color: '#71717a',
        fontSize: 11,
        fontWeight: '600',
    },
    categoryPillTextActive: {
        color: '#ffffff',
        fontWeight: '800',
    },
    modalInput: {
        backgroundColor: '#18181b',
        borderRadius: 10,
        paddingHorizontal: 14,
        paddingVertical: 10,
        color: '#ffffff',
        fontSize: 14,
        borderWidth: 1,
        borderColor: '#27272a',
        marginBottom: 16,
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
        borderRadius: 10,
        paddingVertical: 12,
        alignItems: 'center',
    },
    modalConfirmBtnText: {
        color: '#ffffff',
        fontSize: 13,
        fontWeight: '900',
    },
});

