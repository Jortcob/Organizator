import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { supabase } from './supabase'; // Ajusta la ruta si lo metes en otra carpeta

export default function ProfileScreen() {
    const [loading, setLoading] = useState(true);
    const [objetivoCalorico, setObjetivoCalorico] = useState('');
    const [avisoEntreno, setAvisoEntreno] = useState('');
    const [userId, setUserId] = useState(null);

    useEffect(() => {
        getProfile();
    }, []);

    async function getProfile() {
        try {
            setLoading(true);

            // Obtiene el usuario actualmente logueado en la app
            const { data: { user }, error: authError } = await supabase.auth.getUser();

            if (authError || !user) {
                Alert.alert('Atención', 'Necesitas iniciar sesión primero.');
                setLoading(false);
                return;
            }

            setUserId(user.id);

            // Consulta a la tabla perfiles que creamos en SQL
            const { data, error } = await supabase
                .from('perfiles')
                .select('objetivo_calorico_diario, aviso_entreno_minutos')
                .eq('id', user.id)
                .single();

            if (error && error.code !== 'PGRST116') {
                throw error;
            }

            if (data) {
                setObjetivoCalorico(data.objetivo_calorico_diario?.toString() || '');
                setAvisoEntreno(data.aviso_entreno_minutos?.toString() || '');
            }
        } catch (error) {
            Alert.alert('Error al cargar', error.message);
        } finally {
            setLoading(false);
        }
    }

    async function updateProfile() {
        if (!userId) return;

        try {
            setLoading(true);

            const { error } = await supabase
                .from('perfiles')
                .upsert({
                    id: userId, // Primary key
                    objetivo_calorico_diario: parseFloat(objetivoCalorico),
                    aviso_entreno_minutos: parseInt(avisoEntreno, 10),
                    // El created_at se mantiene intacto si ya existía
                });

            if (error) throw error;
            Alert.alert('Guardado', 'Tus preferencias de Superhombre han sido actualizadas.');
        } catch (error) {
            Alert.alert('Error al guardar', error.message);
        } finally {
            setLoading(false);
        }
    }

    if (loading) {
        return (
            <View style={styles.centerContainer}>
                <ActivityIndicator size="large" color="#3b82f6" />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Mi Perfil</Text>

            <View style={styles.inputGroup}>
                <Text style={styles.label}>Objetivo Calórico Diario (Kcal)</Text>
                <TextInput
                    style={styles.input}
                    keyboardType="numeric"
                    value={objetivoCalorico}
                    onChangeText={setObjetivoCalorico}
                    placeholder="Ej. 2500"
                    placeholderTextColor="#555"
                />
            </View>

            <View style={styles.inputGroup}>
                <Text style={styles.label}>Aviso Pre-Entreno (Minutos)</Text>
                <TextInput
                    style={styles.input}
                    keyboardType="numeric"
                    value={avisoEntreno}
                    onChangeText={setAvisoEntreno}
                    placeholder="Ej. 30"
                    placeholderTextColor="#555"
                />
            </View>

            <TouchableOpacity style={styles.button} onPress={updateProfile}>
                <Text style={styles.buttonText}>Guardar Configuración</Text>
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000000', // Dark mode puro
        padding: 24,
        justifyContent: 'center',
    },
    centerContainer: {
        flex: 1,
        backgroundColor: '#000000',
        justifyContent: 'center',
        alignItems: 'center',
    },
    title: {
        fontSize: 34,
        fontWeight: 'bold',
        color: '#ffffff',
        marginBottom: 40,
        textAlign: 'center',
    },
    inputGroup: {
        marginBottom: 28,
    },
    label: {
        color: '#a1a1aa',
        fontSize: 15,
        marginBottom: 10,
        marginLeft: 4,
        fontWeight: '500',
    },
    input: {
        backgroundColor: '#1c1c1e',
        color: '#ffffff',
        borderRadius: 16,
        padding: 20,
        fontSize: 20,
        borderWidth: 1,
        borderColor: '#2c2c2e',
    },
    button: {
        backgroundColor: '#0a84ff', // Azul iOS
        padding: 20,
        borderRadius: 16,
        alignItems: 'center',
        marginTop: 20,
    },
    buttonText: {
        color: '#ffffff',
        fontSize: 18,
        fontWeight: '600',
    }
});
