import React, { useState, useEffect } from 'react';
import {
    View, Text, TextInput, TouchableOpacity, StyleSheet,
    FlatList, Alert, ActivityIndicator, KeyboardAvoidingView, Platform
} from 'react-native';
import { supabase } from './supabase';

export default function AddMealScreen() {
    const [loading, setLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [alimentos, setAlimentos] = useState([]);
    const [alimentoSeleccionado, setAlimentoSeleccionado] = useState(null);
    const [gramos, setGramos] = useState('');

    // Busca alimentos en tu base de datos cada vez que escribes
    useEffect(() => {
        if (searchQuery.length > 2) {
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
                .ilike('nombre', `%${searchQuery}%`)
                .limit(10); // Mostramos los 10 primeros para no saturar la pantalla

            if (error) throw error;
            setAlimentos(data);
        } catch (error) {
            console.error('Error buscando alimentos:', error.message);
        }
    }

    async function guardarIngesta() {
        if (!alimentoSeleccionado || !gramos) {
            Alert.alert('Faltan datos', 'Selecciona un alimento e introduce los gramos.');
            return;
        }

        try {
            setLoading(true);
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Debes iniciar sesión');

            // 1. Obtener la fecha de hoy en formato YYYY-MM-DD
            const hoy = new Date().toISOString().split('T')[0];

            // 2. Buscar si ya existe un registro_diario para hoy
            let { data: registroDiario, error: registroError } = await supabase
                .from('registros_diarios')
                .select('id')
                .eq('user_id', user.id)
                .eq('fecha', hoy)
                .single();

            // 3. Si no existe, lo creamos
            if (!registroDiario) {
                const { data: nuevoRegistro, error: insertError } = await supabase
                    .from('registros_diarios')
                    .insert([{ user_id: user.id, fecha: hoy }])
                    .select('id')
                    .single();

                if (insertError) throw insertError;
                registroDiario = nuevoRegistro;
            }

            // 4. Obtener hora actual para la ingesta
            const horaActual = new Date().toTimeString().split(' ')[0];

            // 5. Guardar la ingesta en formato JSONB
            const payloadAlimentos = [
                {
                    alimento_id: alimentoSeleccionado.id,
                    nombre: alimentoSeleccionado.nombre,
                    gramos: parseFloat(gramos),
                    // Calculamos las Kcal totales de esta ingesta para facilitarte analíticas luego
                    kcal_totales: (alimentoSeleccionado.kcal_100g / 100) * parseFloat(gramos)
                }
            ];

            const { error: ingestaError } = await supabase
                .from('ingestas')
                .insert([{
                    registro_diario_id: registroDiario.id,
                    hora: horaActual,
                    nombre_personalizado: 'Comida', // Aquí podrías poner un input extra si quieres especificar "Almuerzo", "Cena", etc.
                    alimentos: payloadAlimentos
                }]);

            if (ingestaError) throw ingestaError;

            Alert.alert('Éxito', 'Comida registrada en tu Plan.');

            // Limpiar el formulario para la siguiente ingesta
            setSearchQuery('');
            setAlimentoSeleccionado(null);
            setGramos('');

        } catch (error) {
            Alert.alert('Error', error.message);
        } finally {
            setLoading(false);
        }
    }

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.container}
        >
            <Text style={styles.title}>Añadir Comida</Text>

            {!alimentoSeleccionado ? (
                <View style={styles.searchSection}>
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Buscar alimento..."
                        placeholderTextColor="#666"
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                        autoFocus={true}
                    />

                    <FlatList
                        data={alimentos}
                        keyExtractor={(item) => item.id}
                        keyboardShouldPersistTaps="handled"
                        renderItem={({ item }) => (
                            <TouchableOpacity
                                style={styles.foodItem}
                                onPress={() => setAlimentoSeleccionado(item)}
                            >
                                <Text style={styles.foodName}>{item.nombre}</Text>
                                <Text style={styles.foodMacros}>
                                    {item.kcal_100g} kcal | {item.proteina_100g}g P
                                </Text>
                            </TouchableOpacity>
                        )}
                    />
                </View>
            ) : (
                <View style={styles.selectedSection}>
                    <View style={styles.selectedCard}>
                        <Text style={styles.selectedName}>{alimentoSeleccionado.nombre}</Text>
                        <TouchableOpacity onPress={() => setAlimentoSeleccionado(null)}>
                            <Text style={styles.changeText}>Cambiar</Text>
                        </TouchableOpacity>
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Cantidad (gramos)</Text>
                        <TextInput
                            style={styles.gramsInput}
                            keyboardType="numeric"
                            value={gramos}
                            onChangeText={setGramos}
                            placeholder="Ej. 250"
                            placeholderTextColor="#555"
                            autoFocus={true}
                        />
                    </View>

                    <TouchableOpacity
                        style={[styles.button, (!gramos || loading) && styles.buttonDisabled]}
                        onPress={guardarIngesta}
                        disabled={!gramos || loading}
                    >
                        {loading ? (
                            <ActivityIndicator color="#fff" />
                        ) : (
                            <Text style={styles.buttonText}>Registrar Comida</Text>
                        )}
                    </TouchableOpacity>
                </View>
            )}
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000000',
        padding: 24,
        paddingTop: 60,
    },
    title: {
        fontSize: 34,
        fontWeight: 'bold',
        color: '#ffffff',
        marginBottom: 30,
    },
    searchSection: {
        flex: 1,
    },
    searchInput: {
        backgroundColor: '#1c1c1e',
        color: '#ffffff',
        borderRadius: 16,
        padding: 20,
        fontSize: 18,
        marginBottom: 20,
    },
    foodItem: {
        backgroundColor: '#1c1c1e',
        padding: 20,
        borderRadius: 16,
        marginBottom: 10,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    foodName: {
        color: '#ffffff',
        fontSize: 16,
        fontWeight: '600',
        flex: 1,
    },
    foodMacros: {
        color: '#a1a1aa',
        fontSize: 14,
    },
    selectedSection: {
        flex: 1,
    },
    selectedCard: {
        backgroundColor: '#1c1c1e',
        padding: 20,
        borderRadius: 16,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 30,
        borderWidth: 1,
        borderColor: '#333',
    },
    selectedName: {
        color: '#34c759', // Verde iOS para indicar selección
        fontSize: 18,
        fontWeight: 'bold',
        flex: 1,
    },
    changeText: {
        color: '#0a84ff',
        fontSize: 16,
    },
    inputGroup: {
        marginBottom: 30,
    },
    label: {
        color: '#a1a1aa',
        fontSize: 15,
        marginBottom: 10,
        marginLeft: 4,
        fontWeight: '500',
    },
    gramsInput: {
        backgroundColor: '#1c1c1e',
        color: '#ffffff',
        borderRadius: 16,
        padding: 24,
        fontSize: 32, // Muy grande para facilitar el uso a una mano
        fontWeight: 'bold',
        textAlign: 'center',
    },
    button: {
        backgroundColor: '#0a84ff',
        padding: 20,
        borderRadius: 16,
        alignItems: 'center',
    },
    buttonDisabled: {
        backgroundColor: '#0a84ff55',
    },
    buttonText: {
        color: '#ffffff',
        fontSize: 18,
        fontWeight: '600',
    }
});