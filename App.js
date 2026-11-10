import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, StatusBar, ScrollView } from 'react-native';
import DashboardScreen from './DashboardScreen';
import WorkScreen from './WorkScreen';
import FinanceScreen from './FinanceScreen';
import AddMealScreen from './AddMealScreen';
import ProfileScreen from './ProfileScreen';
import WorkoutScreen from './WorkoutScreen';
import CalendarScreen from './CalendarScreen';

export default function App() {
    // Pantalla activa: 'dashboard' | 'work' | 'finance' | 'meal' | 'workout' | 'calendar' | 'profile'
    const [currentScreen, setCurrentScreen] = useState('dashboard');

    const renderScreen = () => {
        switch (currentScreen) {
            case 'dashboard':
                return <DashboardScreen onNavigate={(screen) => setCurrentScreen(screen)} />;
            case 'work':
                return <WorkScreen onNavigate={(screen) => setCurrentScreen(screen)} />;
            case 'finance':
                return <FinanceScreen onNavigate={(screen) => setCurrentScreen(screen)} />;
            case 'meal':
                return <AddMealScreen onNavigate={(screen) => setCurrentScreen(screen)} />;
            case 'profile':
                return <ProfileScreen onNavigate={(screen) => setCurrentScreen(screen)} />;
            case 'workout':
                return <WorkoutScreen onNavigate={(screen) => setCurrentScreen(screen)} />;
            case 'calendar':
                return <CalendarScreen onNavigate={(screen) => setCurrentScreen(screen)} />;
            default:
                return <DashboardScreen onNavigate={(screen) => setCurrentScreen(screen)} />;
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor="#000000" />

            {/* Contenido Dinámico */}
            <View style={styles.content}>
                {renderScreen()}
            </View>

            {/* Barra de Navegación Ejecutiva Inferior */}
            <View style={styles.navBar}>
                <TouchableOpacity
                    style={styles.navItem}
                    onPress={() => setCurrentScreen('dashboard')}
                >
                    <Text style={[styles.navIcon, currentScreen === 'dashboard' && styles.navIconActive]}>
                        📊
                    </Text>
                    <Text style={[styles.navText, currentScreen === 'dashboard' && styles.activeNavText]}>
                        Dashboard
                    </Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.navItem}
                    onPress={() => setCurrentScreen('work')}
                >
                    <Text style={[styles.navIcon, currentScreen === 'work' && styles.navIconActive]}>
                        ⏱️
                    </Text>
                    <Text style={[styles.navText, currentScreen === 'work' && styles.activeNavText]}>
                        Jornada
                    </Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.navItem}
                    onPress={() => setCurrentScreen('finance')}
                >
                    <Text style={[styles.navIcon, currentScreen === 'finance' && styles.navIconActive]}>
                        💳
                    </Text>
                    <Text style={[styles.navText, currentScreen === 'finance' && styles.activeNavText]}>
                        Economía
                    </Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.navItem}
                    onPress={() => setCurrentScreen('meal')}
                >
                    <Text style={[styles.navIcon, currentScreen === 'meal' && styles.navIconActive]}>
                        🥩
                    </Text>
                    <Text style={[styles.navText, currentScreen === 'meal' && styles.activeNavText]}>
                        Dietas
                    </Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.navItem}
                    onPress={() => setCurrentScreen('workout')}
                >
                    <Text style={[styles.navIcon, currentScreen === 'workout' && styles.navIconActive]}>
                        🏋️‍♂️
                    </Text>
                    <Text style={[styles.navText, currentScreen === 'workout' && styles.activeNavText]}>
                        Entreno
                    </Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.navItem}
                    onPress={() => setCurrentScreen('calendar')}
                >
                    <Text style={[styles.navIcon, currentScreen === 'calendar' && styles.navIconActive]}>
                        📅
                    </Text>
                    <Text style={[styles.navText, currentScreen === 'calendar' && styles.activeNavText]}>
                        Agenda
                    </Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.navItem}
                    onPress={() => setCurrentScreen('profile')}
                >
                    <Text style={[styles.navIcon, currentScreen === 'profile' && styles.navIconActive]}>
                        ⚙️
                    </Text>
                    <Text style={[styles.navText, currentScreen === 'profile' && styles.activeNavText]}>
                        Perfil
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
        height: '100%',
    },
    content: {
        flex: 1,
    },
    navBar: {
        flexDirection: 'row',
        backgroundColor: '#0a0a0c',
        borderTopWidth: 1,
        borderTopColor: '#1f1f23',
        paddingBottom: 16,
        paddingTop: 8,
        paddingHorizontal: 4,
    },
    navItem: {
        flex: 1,
        alignItems: 'center',
        paddingVertical: 4,
    },
    navIcon: {
        fontSize: 18,
        opacity: 0.5,
        marginBottom: 2,
    },
    navIconActive: {
        opacity: 1,
    },
    navText: {
        color: '#71717a',
        fontSize: 10,
        fontWeight: '600',
    },
    activeNavText: {
        color: '#06b6d4',
        fontWeight: '800',
    },
    placeholderContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 30,
        backgroundColor: '#000000',
    },
    placeholderIcon: {
        fontSize: 54,
        marginBottom: 16,
    },
    placeholderTitle: {
        color: '#ffffff',
        fontSize: 22,
        fontWeight: '900',
        marginBottom: 8,
        textAlign: 'center',
    },
    placeholderSub: {
        color: '#a1a1aa',
        fontSize: 14,
        textAlign: 'center',
        lineHeight: 20,
        marginBottom: 24,
    },
    backToHomeBtn: {
        backgroundColor: '#18181b',
        paddingHorizontal: 18,
        paddingVertical: 10,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#27272a',
    },
    backToHomeBtnText: {
        color: '#06b6d4',
        fontSize: 13,
        fontWeight: '700',
    },
});
