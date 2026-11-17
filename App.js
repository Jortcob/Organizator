import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    SafeAreaView,
    StatusBar,
    Platform,
} from 'react-native';
import DashboardScreen from './DashboardScreen';
import AnalyticsScreen from './AnalyticsScreen';
import WorkScreen from './WorkScreen';
import FinanceScreen from './FinanceScreen';
import AddMealScreen from './AddMealScreen';
import WorkoutScreen from './WorkoutScreen';
import CalendarScreen from './CalendarScreen';
import ProfileScreen from './ProfileScreen';
import AssistantScreen from './AssistantScreen';
import CelebrationOverlay from './CelebrationOverlay';
import { subscribeGoalCelebration } from './dataStore';

const BOTTOM_TABS = [
    { id: 'dashboard', label: 'Inicio', icon: '🏠' },
    { id: 'assistant', label: 'Asistente', icon: '🧠' },
    { id: 'analytics', label: 'Análisis', icon: '📊' },
    { id: 'calendar', label: 'Agenda', icon: '📅' },
    { id: 'profile', label: 'Ajustes', icon: '⚙️' },
];

export default function App() {
    const [currentScreen, setCurrentScreen] = useState('dashboard');
    const [celebration, setCelebration] = useState({ visible: false, goalTitle: '', message: '' });

    useEffect(() => {
        const unsub = subscribeGoalCelebration((payload) => {
            if (payload) {
                setCelebration({
                    visible: true,
                    goalTitle: payload.goalTitle || 'Objetivo completado',
                    message: payload.message || '',
                });
            }
        });
        return unsub;
    }, []);

    const renderScreen = () => {
        switch (currentScreen) {
            case 'dashboard':
                return <DashboardScreen onNavigate={setCurrentScreen} />;
            case 'assistant':
                return <AssistantScreen onNavigate={setCurrentScreen} />;
            case 'analytics':
                return <AnalyticsScreen onNavigate={setCurrentScreen} />;
            case 'work':
                return <WorkScreen onNavigate={setCurrentScreen} />;
            case 'finance':
                return <FinanceScreen onNavigate={setCurrentScreen} />;
            case 'meal':
                return <AddMealScreen onNavigate={setCurrentScreen} />;
            case 'workout':
                return <WorkoutScreen onNavigate={setCurrentScreen} />;
            case 'calendar':
                return <CalendarScreen onNavigate={setCurrentScreen} />;
            case 'profile':
                return <ProfileScreen onNavigate={setCurrentScreen} />;
            default:
                return <DashboardScreen onNavigate={setCurrentScreen} />;
        }
    };

    const isModuleScreen = ['work', 'finance', 'meal', 'workout'].includes(currentScreen);

    return (
        <SafeAreaView style={styles.safeContainer}>
            <StatusBar barStyle="light-content" backgroundColor="#000000" />

            <View style={styles.content}>
                {renderScreen()}
            </View>

            {/* Barra de navegación inferior limpia y espaciosa */}
            <View style={styles.navBarOuter}>
                <View style={styles.navBarInner}>
                    {BOTTOM_TABS.map((tab) => {
                        const active =
                            currentScreen === tab.id ||
                            (tab.id === 'dashboard' && isModuleScreen);
                        return (
                            <TouchableOpacity
                                key={tab.id}
                                style={styles.navItem}
                                activeOpacity={0.7}
                                onPress={() => setCurrentScreen(tab.id)}
                            >
                                <Text
                                    style={[
                                        styles.navIcon,
                                        active && styles.navIconActive,
                                    ]}
                                >
                                    {tab.icon}
                                </Text>
                                <Text
                                    style={[
                                        styles.navLabel,
                                        active && styles.navLabelActive,
                                    ]}
                                >
                                    {tab.label}
                                </Text>
                            </TouchableOpacity>
                        );
                    })}
                </View>
            </View>

            <CelebrationOverlay
                visible={celebration.visible}
                goalTitle={celebration.goalTitle}
                message={celebration.message}
                onDismiss={() => setCelebration({ visible: false, goalTitle: '', message: '' })}
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeContainer: {
        flex: 1,
        backgroundColor: '#000000',
        paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight || 0 : 0,
        height: '100%',
    },
    content: {
        flex: 1,
        width: '100%',
    },
    navBarOuter: {
        backgroundColor: '#09090B',
        borderTopWidth: 1,
        borderTopColor: '#1E1E24',
        paddingTop: 8,
        paddingBottom: Platform.OS === 'ios' ? 14 : 10,
        paddingHorizontal: 16,
    },
    navBarInner: {
        flexDirection: 'row',
        width: '100%',
        maxWidth: 520,
        alignSelf: 'center',
    },
    navItem: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 4,
    },
    navIcon: {
        fontSize: 19,
        opacity: 0.45,
        marginBottom: 3,
    },
    navIconActive: {
        opacity: 1,
    },
    navLabel: {
        color: '#71717A',
        fontSize: 11,
        fontWeight: '500',
    },
    navLabelActive: {
        color: '#FAFAFA',
        fontWeight: '700',
    },
});
