import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, StatusBar } from 'react-native';
import ProfileScreen from './ProfileScreen';
import AddMealScreen from './AddMealScreen';

export default function App() {
    // Estado para controlar qué pantalla se muestra ('meal' o 'profile')
    const [currentScreen, setCurrentScreen] = useState('meal');

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="light-content" />

            {/* Contenedor dinámico que carga la pantalla seleccionada */}
            <View style={styles.content}>
                {currentScreen === 'profile' ? <ProfileScreen /> : <AddMealScreen />}
            </View>

            {/* Barra de navegación inferior */}
            <View style={styles.navBar}>
                <TouchableOpacity
                    style={styles.navItem}
                    onPress={() => setCurrentScreen('meal')}
                >
                    <Text style={[styles.navText, currentScreen === 'meal' && styles.activeNavText]}>
                        🍽️ Comidas
                    </Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.navItem}
                    onPress={() => setCurrentScreen('profile')}
                >
                    <Text style={[styles.navText, currentScreen === 'profile' && styles.activeNavText]}>
                        ⚙️ Perfil
                    </Text>
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000000',
    },
    content: {
        flex: 1,
    },
    navBar: {
        flexDirection: 'row',
        backgroundColor: '#1c1c1e',
        borderTopWidth: 1,
        borderTopColor: '#2c2c2e',
        paddingBottom: 20, // Margen seguro para el borde inferior del iPhone
        paddingTop: 10,
    },
    navItem: {
        flex: 1,
        alignItems: 'center',
        paddingVertical: 10,
    },
    navText: {
        color: '#666666',
        fontSize: 16,
        fontWeight: '500',
    },
    activeNavText: {
        color: '#0a84ff', // Azul iOS activo
        fontWeight: 'bold',
    }
});