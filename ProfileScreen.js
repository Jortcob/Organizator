import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    ScrollView,
    Alert,
    ActivityIndicator,
} from 'react-native';
import { supabase } from './supabase';
import { getStoreState, updateProfileAndGoals } from './dataStore';

export default function ProfileScreen({ onNavigate }) {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [savedBanner, setSavedBanner] = useState(false);

    const [nombre, setNombre] = useState('');
    const [objetivoCalorico, setObjetivoCalorico] = useState('2400');
    const [objetivoHoras, setObjetivoHoras] = useState('40');
    const [objetivoAhorro, setObjetivoAhorro] = useState('1500');
    const [objetivoEntrenos, setObjetivoEntrenos] = useState('4');
    const [avisoEntreno, setAvisoEntreno] = useState('30');

    // Configuración Asistente e IA
    const [ciudad, setCiudad] = useState('Madrid');
    const [gimnasioNombre, setGimnasioNombre] = useState('Basic-Fit Centro');
    const [horarioPreferido, setHorarioPreferido] = useState('tarde');
    const [geminiApiKey, setGeminiApiKey] = useState('');

    // Estado opcional de sesión Supabase
    const [userEmail, setUserEmail] = useState(null);
    const [authEmail, setAuthEmail] = useState('');
    const [authPassword, setAuthPassword] = useState('');
    const [authOpen, setAuthOpen] = useState(false);

    useEffect(() => {
        async function load() {
            const state = await getStoreState(true);
            const p = state.profile || {};
            setNombre(p.nombre || '');
            setObjetivoCalorico(String(p.objetivo_calorico_diario ?? '2400'));
            setObjetivoHoras(String(p.objetivo_horas_semanales ?? '40'));
            setObjetivoAhorro(String(p.objetivo_ahorro_mensual ?? '1500'));
            setObjetivoEntrenos(String(p.objetivo_entrenos_semanales ?? '4'));
            setAvisoEntreno(String(p.aviso_entreno_minutos ?? '30'));
            setCiudad(p.ciudad || 'Madrid');
            setGimnasioNombre(p.gimnasio_nombre || 'Basic-Fit Centro');
            setHorarioPreferido(p.horario_preferido_gym || 'tarde');
            setGeminiApiKey(p.gemini_api_key || '');

            try {
                const { data: { user } } = await supabase.auth.getUser();
                if (user?.email) setUserEmail(user.email);
            } catch {
                // Sesión local
            }
            setLoading(false);
        }
        load();
    }, []);

    const handleSave = async () => {
        try {
            setSaving(true);
            await updateProfileAndGoals({
                nombre: nombre.trim(),
                objetivo_calorico_diario: parseFloat(objetivoCalorico) || 0,
                objetivo_horas_semanales: parseFloat(objetivoHoras) || 0,
                objetivo_ahorro_mensual: parseFloat(objetivoAhorro) || 0,
                objetivo_entrenos_semanales: parseInt(objetivoEntrenos, 10) || 0,
                aviso_entreno_minutos: parseInt(avisoEntreno, 10) || 30,
                ciudad: ciudad.trim() || 'Madrid',
                gimnasio_nombre: gimnasioNombre.trim() || 'Basic-Fit Centro',
                horario_preferido_gym: horarioPreferido,
                gemini_api_key: geminiApiKey.trim(),
            });
            setSavedBanner(true);
            setTimeout(() => setSavedBanner(false), 3000);
        } catch (err) {
            Alert.alert('No se pudo guardar', err.message);
        } finally {
            setSaving(false);
        }
    };

    const handleSignIn = async () => {
        if (!authEmail.trim() || !authPassword) {
            Alert.alert('Campos requeridos', 'Introduce tu correo y contraseña.');
            return;
        }
        try {
            setSaving(true);
            const { data, error } = await supabase.auth.signInWithPassword({
                email: authEmail.trim(),
                password: authPassword,
            });
            if (error) throw error;
            setUserEmail(data.user?.email || authEmail.trim());
            setAuthOpen(false);
            await getStoreState(true);
            Alert.alert('Conectado', 'Tu cuenta está sincronizada con la nube.');
        } catch (err) {
            Alert.alert('Error al iniciar sesión', err.message);
        } finally {
            setSaving(false);
        }
    };

    const handleSignOut = async () => {
        await supabase.auth.signOut();
        setUserEmail(null);
    };

    if (loading) {
        return (
            <View style={styles.loadingWrap}>
                <ActivityIndicator color="#34D399" />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <ScrollView
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                <View style={styles.innerWrap}>
                    {/* Cabecera con botón volver */}
                    <View style={styles.topNav}>
                        {onNavigate && (
                            <TouchableOpacity
                                style={styles.backBtn}
                                onPress={() => onNavigate('dashboard')}
                            >
                                <Text style={styles.backBtnText}>← Inicio</Text>
                            </TouchableOpacity>
                        )}
                    </View>

                    <Text style={styles.title}>Configuración</Text>
                    <Text style={styles.subtitle}>
                        Ajusta tus objetivos para que los anillos y consejos se adapten a ti. Si dejas un objetivo en 0, se ocultará.
                    </Text>

                    {/* Tarjeta Perfil */}
                    <View style={styles.card}>
                        <Text style={styles.cardTitle}>Sobre ti</Text>
                        <Text style={styles.label}>Tu nombre (opcional)</Text>
                        <TextInput
                            style={styles.input}
                            value={nombre}
                            onChangeText={setNombre}
                            placeholder="Ej. Carlos"
                            placeholderTextColor="#52525B"
                        />
                    </View>

                    {/* Tarjeta Objetivos */}
                    <View style={styles.card}>
                        <Text style={styles.cardTitle}>Tus objetivos</Text>

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Calorías diarias (kcal)</Text>
                            <TextInput
                                style={styles.input}
                                keyboardType="numeric"
                                value={objetivoCalorico}
                                onChangeText={setObjetivoCalorico}
                                placeholder="2400"
                                placeholderTextColor="#52525B"
                            />
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Horas de trabajo semanales (h)</Text>
                            <TextInput
                                style={styles.input}
                                keyboardType="numeric"
                                value={objetivoHoras}
                                onChangeText={setObjetivoHoras}
                                placeholder="40"
                                placeholderTextColor="#52525B"
                            />
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Ahorro neto mensual (€)</Text>
                            <TextInput
                                style={styles.input}
                                keyboardType="numeric"
                                value={objetivoAhorro}
                                onChangeText={setObjetivoAhorro}
                                placeholder="1500"
                                placeholderTextColor="#52525B"
                            />
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Entrenamientos por semana (sesiones)</Text>
                            <TextInput
                                style={styles.input}
                                keyboardType="numeric"
                                value={objetivoEntrenos}
                                onChangeText={setObjetivoEntrenos}
                                placeholder="4"
                                placeholderTextColor="#52525B"
                            />
                        </View>

                        <View style={styles.inputGroupLast}>
                            <Text style={styles.label}>Aviso antes de entrenar (minutos)</Text>
                            <TextInput
                                style={styles.input}
                                keyboardType="numeric"
                                value={avisoEntreno}
                                onChangeText={setAvisoEntreno}
                                placeholder="30"
                                placeholderTextColor="#52525B"
                            />
                        </View>
                    </View>

                    {/* Asistente Personal e IA */}
                    <View style={styles.card}>
                        <Text style={styles.cardTitle}>Asistente Personal e IA</Text>
                        <Text style={styles.cardSub}>
                            Datos para calcular afluencia del gimnasio, clima y tiempos óptimos.
                        </Text>

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Tu ciudad (clima y temperatura en tiempo real)</Text>
                            <TextInput
                                style={styles.input}
                                value={ciudad}
                                onChangeText={setCiudad}
                                placeholder="Madrid, Barcelona, Valencia, Sevilla..."
                                placeholderTextColor="#52525B"
                            />
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Tu gimnasio habitual</Text>
                            <TextInput
                                style={styles.input}
                                value={gimnasioNombre}
                                onChangeText={setGimnasioNombre}
                                placeholder="Basic-Fit Centro, McFit, Gimnasio Municipal..."
                                placeholderTextColor="#52525B"
                            />
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Momento preferido para entrenar</Text>
                            <View style={styles.prefRow}>
                                {[
                                    { id: 'mañana', label: 'Mañana' },
                                    { id: 'mediodia', label: 'Mediodía' },
                                    { id: 'tarde', label: 'Tarde' },
                                    { id: 'noche', label: 'Noche' },
                                ].map((p) => (
                                    <TouchableOpacity
                                        key={p.id}
                                        style={[styles.prefPill, horarioPreferido === p.id && styles.prefPillActive]}
                                        onPress={() => setHorarioPreferido(p.id)}
                                    >
                                        <Text style={[styles.prefPillText, horarioPreferido === p.id && styles.prefPillTextActive]}>
                                            {p.label}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>

                        <View style={styles.inputGroupLast}>
                            <Text style={styles.label}>Clave API de Gemini (Opcional)</Text>
                            <TextInput
                                style={styles.input}
                                value={geminiApiKey}
                                onChangeText={setGeminiApiKey}
                                placeholder="AIzaSy... (Usa el motor integrado si está vacío)"
                                placeholderTextColor="#52525B"
                                secureTextEntry
                            />
                            <Text style={styles.helpText}>
                                Organizator incluye un motor de hábitos y asistente experto integrado sin coste. Si configuras una clave de Google AI Studio, activarás Gemini 2.0 Flash para respuestas extendidas.
                            </Text>
                        </View>
                    </View>

                    {savedBanner && (
                        <View style={styles.savedBanner}>
                            <Text style={styles.savedBannerText}>✓ Cambios guardados correctamente</Text>
                        </View>
                    )}

                    <TouchableOpacity
                        style={styles.saveBtn}
                        onPress={handleSave}
                        disabled={saving}
                        activeOpacity={0.8}
                    >
                        {saving ? (
                            <ActivityIndicator color="#000000" />
                        ) : (
                            <Text style={styles.saveBtnText}>Guardar objetivos</Text>
                        )}
                    </TouchableOpacity>

                    {/* Sincronización en la nube (Opcional) */}
                    <View style={styles.cloudCard}>
                        <View style={styles.cloudHeader}>
                            <View>
                                <Text style={styles.cardTitle}>Sincronización en la nube</Text>
                                <Text style={styles.cloudSub}>
                                    {userEmail
                                        ? `Conectado como ${userEmail}`
                                        : 'Modo local activo. Inicia sesión si quieres sincronizar con Supabase.'}
                                </Text>
                            </View>
                        </View>

                        {userEmail ? (
                            <TouchableOpacity style={styles.secondaryBtn} onPress={handleSignOut}>
                                <Text style={styles.secondaryBtnText}>Cerrar sesión</Text>
                            </TouchableOpacity>
                        ) : !authOpen ? (
                            <TouchableOpacity
                                style={styles.secondaryBtn}
                                onPress={() => setAuthOpen(true)}
                            >
                                <Text style={styles.secondaryBtnText}>Conectar cuenta</Text>
                            </TouchableOpacity>
                        ) : (
                            <View style={styles.authForm}>
                                <TextInput
                                    style={[styles.input, { marginBottom: 10 }]}
                                    placeholder="Correo electrónico"
                                    placeholderTextColor="#52525B"
                                    autoCapitalize="none"
                                    keyboardType="email-address"
                                    value={authEmail}
                                    onChangeText={setAuthEmail}
                                />
                                <TextInput
                                    style={[styles.input, { marginBottom: 12 }]}
                                    placeholder="Contraseña"
                                    placeholderTextColor="#52525B"
                                    secureTextEntry
                                    value={authPassword}
                                    onChangeText={setAuthPassword}
                                />
                                <View style={styles.authBtnsRow}>
                                    <TouchableOpacity
                                        style={[styles.secondaryBtn, { flex: 1 }]}
                                        onPress={() => setAuthOpen(false)}
                                    >
                                        <Text style={styles.secondaryBtnText}>Cancelar</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={[styles.saveBtn, { flex: 1, marginTop: 0, paddingVertical: 12 }]}
                                        onPress={handleSignIn}
                                    >
                                        <Text style={styles.saveBtnText}>Entrar</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        )}
                    </View>
                </View>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000000',
    },
    loadingWrap: {
        flex: 1,
        backgroundColor: '#000000',
        justifyContent: 'center',
        alignItems: 'center',
    },
    scrollContent: {
        paddingHorizontal: 20,
        paddingTop: 14,
        paddingBottom: 40,
    },
    innerWrap: {
        width: '100%',
        maxWidth: 520,
        alignSelf: 'center',
    },
    topNav: {
        marginBottom: 10,
    },
    backBtn: {
        alignSelf: 'flex-start',
        paddingVertical: 6,
        paddingRight: 12,
    },
    backBtnText: {
        color: '#A1A1AA',
        fontSize: 14,
        fontWeight: '600',
    },
    title: {
        color: '#FAFAFA',
        fontSize: 26,
        fontWeight: '700',
        letterSpacing: -0.5,
    },
    subtitle: {
        color: '#A1A1AA',
        fontSize: 13,
        lineHeight: 19,
        marginTop: 4,
        marginBottom: 20,
    },
    card: {
        backgroundColor: '#111114',
        borderRadius: 20,
        padding: 18,
        borderWidth: 1,
        borderColor: '#232329',
        marginBottom: 16,
    },
    cardTitle: {
        color: '#FAFAFA',
        fontSize: 16,
        fontWeight: '700',
        marginBottom: 12,
    },
    cardSub: {
        color: '#71717A',
        fontSize: 12,
        lineHeight: 17,
        marginTop: -6,
        marginBottom: 14,
    },
    prefRow: {
        flexDirection: 'row',
        gap: 8,
    },
    prefPill: {
        flex: 1,
        backgroundColor: '#18181C',
        borderRadius: 10,
        paddingVertical: 9,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#27272E',
    },
    prefPillActive: {
        backgroundColor: '#38BDF8',
        borderColor: '#38BDF8',
    },
    prefPillText: {
        color: '#A1A1AA',
        fontSize: 12,
        fontWeight: '600',
    },
    prefPillTextActive: {
        color: '#000000',
        fontWeight: '700',
    },
    helpText: {
        color: '#71717A',
        fontSize: 11,
        lineHeight: 16,
        marginTop: 6,
    },
    inputGroup: {
        marginBottom: 14,
    },
    inputGroupLast: {
        marginBottom: 2,
    },
    label: {
        color: '#A1A1AA',
        fontSize: 13,
        marginBottom: 6,
        fontWeight: '500',
    },
    input: {
        backgroundColor: '#18181C',
        color: '#FAFAFA',
        borderRadius: 12,
        paddingHorizontal: 14,
        paddingVertical: 12,
        fontSize: 15,
        borderWidth: 1,
        borderColor: '#27272E',
    },
    savedBanner: {
        backgroundColor: 'rgba(52, 211, 153, 0.12)',
        borderRadius: 12,
        paddingVertical: 10,
        paddingHorizontal: 14,
        marginBottom: 12,
        alignItems: 'center',
    },
    savedBannerText: {
        color: '#34D399',
        fontSize: 13,
        fontWeight: '600',
    },
    saveBtn: {
        backgroundColor: '#FAFAFA',
        borderRadius: 14,
        paddingVertical: 15,
        alignItems: 'center',
        marginBottom: 20,
    },
    saveBtnText: {
        color: '#000000',
        fontSize: 15,
        fontWeight: '700',
    },
    cloudCard: {
        backgroundColor: '#111114',
        borderRadius: 20,
        padding: 18,
        borderWidth: 1,
        borderColor: '#232329',
    },
    cloudHeader: {
        marginBottom: 12,
    },
    cloudSub: {
        color: '#71717A',
        fontSize: 12,
        lineHeight: 17,
        marginTop: -6,
    },
    secondaryBtn: {
        backgroundColor: '#18181C',
        borderRadius: 12,
        paddingVertical: 12,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#27272E',
    },
    secondaryBtnText: {
        color: '#E4E4E7',
        fontSize: 13,
        fontWeight: '600',
    },
    authForm: {
        marginTop: 6,
    },
    authBtnsRow: {
        flexDirection: 'row',
        gap: 10,
    },
});
