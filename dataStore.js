import { supabase } from './supabase';

const STORAGE_KEY = '@organizator_store_v1';

const getTodayStr = () => new Date().toISOString().split('T')[0];

const daysAgoStr = (days) => {
    const d = new Date();
    d.setDate(d.getDate() - days);
    return d.toISOString().split('T')[0];
};

// Estado inicial realista la primera vez que se abre la app
const createDefaultState = () => {
    const today = getTodayStr();
    const yesterday = daysAgoStr(1);
    const twoDaysAgo = daysAgoStr(2);
    const fiveDaysAgo = daysAgoStr(5);

    return {
        profile: {
            nombre: '',
            aviso_entreno_minutos: 30,
            // Objetivos configurables (si vale 0 o null, no se muestra su anillo)
            objetivo_calorico_diario: 2400,
            objetivo_horas_semanales: 40,
            objetivo_ahorro_mensual: 1500,
            objetivo_entrenos_semanales: 4,
            ciudad: 'Madrid',
            gimnasio_nombre: 'Basic-Fit, avenida Adolfo Suarez',
            horario_preferido_gym: 'tarde',
            gemini_api_key: '',
        },
        customFoods: [],
        appointments: [
            {
                id: 'apt-seed-1',
                titulo: 'Revisión de objetivos semanales',
                fecha: today,
                hora: '17:30',
                tipo: 'Reunión',
                estado: 'pendiente',
                nota: 'Repasar entregas pendientes y planificar bloques de mañana.',
            },
            {
                id: 'apt-seed-2',
                titulo: 'Llamada con gestoría',
                fecha: yesterday,
                hora: '11:00',
                tipo: 'Cita',
                estado: 'pendiente',
                nota: 'Confirmar facturas del trimestre.',
            },
        ],
        workSessions: [
            {
                id: 'wk-seed-1',
                fecha: today,
                hora_inicio: `${today}T09:00:00`,
                hora_fin: `${today}T13:30:00`,
                jornada_partida: false,
                turno1_inicio: '09:00',
                turno1_fin: '13:30',
                turno2_inicio: '',
                turno2_fin: '',
                descanso_minutos: 15,
                horas_ordinarias: 4.25,
                horas_extra: 0,
                precio_hora: 45,
                precio_hora_extra: 60,
                ingreso_generado: 191.25,
                nota: 'Desarrollo de producto y seguimiento',
            },
            {
                id: 'wk-seed-2',
                fecha: yesterday,
                hora_inicio: `${yesterday}T09:00:00`,
                hora_fin: `${yesterday}T18:30:00`,
                jornada_partida: true,
                turno1_inicio: '09:00',
                turno1_fin: '14:00',
                turno2_inicio: '15:30',
                turno2_fin: '18:30',
                descanso_minutos: 20,
                horas_ordinarias: 6.67,
                horas_extra: 1.0,
                precio_hora: 45,
                precio_hora_extra: 60,
                ingreso_generado: 360.15,
                nota: 'Jornada partida con entrega a cliente',
            },
            {
                id: 'wk-seed-3',
                fecha: twoDaysAgo,
                hora_inicio: `${twoDaysAgo}T09:00:00`,
                hora_fin: `${twoDaysAgo}T16:30:00`,
                jornada_partida: false,
                turno1_inicio: '09:00',
                turno1_fin: '16:30',
                turno2_inicio: '',
                turno2_fin: '',
                descanso_minutos: 30,
                horas_ordinarias: 7.0,
                horas_extra: 0,
                precio_hora: 45,
                precio_hora_extra: 60,
                ingreso_generado: 315.0,
                nota: 'Planificación técnica',
            },
        ],
        transactions: [
            {
                id: 'tx-seed-1',
                fecha: `${today}T14:00:00`,
                tipo: 'gasto',
                categoria: 'Alimentación',
                cantidad: 42.5,
                descripcion: 'Carne de ternera, huevos camperos y arroz',
            },
            {
                id: 'tx-seed-2',
                fecha: `${yesterday}T11:20:00`,
                tipo: 'gasto',
                categoria: 'Infraestructura',
                cantidad: 45.0,
                descripcion: 'Servidores y dominio mensual',
            },
            {
                id: 'tx-seed-3',
                fecha: `${fiveDaysAgo}T10:00:00`,
                tipo: 'ingreso',
                categoria: 'Facturación',
                cantidad: 1150.0,
                descripcion: 'Proyecto de consultoría',
            },
        ],
        meals: [
            {
                id: 'meal-seed-1',
                fecha: today,
                hora: '14:15',
                nombre_personalizado: 'Almuerzo',
                alimentos: [
                    {
                        nombre: 'Carne picada de ternera (15%)',
                        gramos: 250,
                        kcal: 538,
                        proteina: 48.8,
                        carbohidratos: 0,
                        grasas: 37.5,
                    },
                    {
                        nombre: 'Arroz blanco cocido',
                        gramos: 220,
                        kcal: 286,
                        proteina: 5.9,
                        carbohidratos: 61.6,
                        grasas: 0.7,
                    },
                ],
            },
            {
                id: 'meal-seed-2',
                fecha: today,
                hora: '09:30',
                nombre_personalizado: 'Desayuno',
                alimentos: [
                    {
                        nombre: 'Huevos camperos enteros',
                        gramos: 240,
                        kcal: 343,
                        proteina: 31.2,
                        carbohidratos: 2.6,
                        grasas: 22.8,
                    },
                ],
            },
        ],
        workouts: [
            {
                id: 'wko-seed-1',
                fecha: today,
                hora_inicio: '18:00',
                duracion_minutos: 58,
                gasto_calorico: 430,
                tipo_entrenamiento: 'Fuerza - Torso',
                tonelaje: 6840,
                series_totales: 9,
                ejercicios_detalle: [
                    {
                        nombre: 'Press de Banca Plano',
                        grupo_muscular: 'Pectoral',
                        series: [
                            { serie: 1, peso: 80, reps: 8 },
                            { serie: 2, peso: 80, reps: 8 },
                            { serie: 3, peso: 82.5, reps: 7 },
                        ],
                    },
                    {
                        nombre: 'Remo con Barra',
                        grupo_muscular: 'Espalda',
                        series: [
                            { serie: 1, peso: 75, reps: 10 },
                            { serie: 2, peso: 75, reps: 10 },
                            { serie: 3, peso: 75, reps: 9 },
                        ],
                    },
                    {
                        nombre: 'Press Militar con Barra',
                        grupo_muscular: 'Hombros',
                        series: [
                            { serie: 1, peso: 50, reps: 8 },
                            { serie: 2, peso: 50, reps: 8 },
                            { serie: 3, peso: 50, reps: 7 },
                        ],
                    },
                ],
            },
            {
                id: 'wko-seed-2',
                fecha: twoDaysAgo,
                hora_inicio: '18:15',
                duracion_minutos: 62,
                gasto_calorico: 495,
                tipo_entrenamiento: 'Fuerza - Pierna',
                tonelaje: 9400,
                series_totales: 8,
                ejercicios_detalle: [
                    {
                        nombre: 'Sentadilla Trasera',
                        grupo_muscular: 'Pierna',
                        series: [
                            { serie: 1, peso: 100, reps: 8 },
                            { serie: 2, peso: 105, reps: 8 },
                            { serie: 3, peso: 105, reps: 7 },
                            { serie: 4, peso: 100, reps: 8 },
                        ],
                    },
                    {
                        nombre: 'Peso Muerto Convencional',
                        grupo_muscular: 'Espalda / Pierna',
                        series: [
                            { serie: 1, peso: 120, reps: 5 },
                            { serie: 2, peso: 125, reps: 5 },
                            { serie: 3, peso: 125, reps: 5 },
                            { serie: 4, peso: 120, reps: 5 },
                        ],
                    },
                ],
            },
        ],
    };
};

// Memoria activa en sesión (funciona en iOS/Android/Web al instante)
let memoryState = null;
const listeners = new Set();
const celebrationListeners = new Set();

function notifyListeners() {
    listeners.forEach((fn) => {
        try {
            fn(memoryState);
        } catch (e) {
            // ignorar listener error
        }
    });
}

export function subscribeGoalCelebration(listener) {
    celebrationListeners.add(listener);
    return () => celebrationListeners.delete(listener);
}

export function triggerGoalCelebration(payload) {
    celebrationListeners.forEach((fn) => {
        try {
            fn(payload);
        } catch (e) {
            // ignorar error
        }
    });
}

function checkGoalCompletionTransition(prevState, nextState) {
    try {
        const before = evaluateGoalsAndAdvice(prevState).goals;
        const after = evaluateGoalsAndAdvice(nextState).goals;

        const newlyCompleted = after.find((g) => {
            if (!g.completed) return false;
            const prev = before.find((b) => b.id === g.id);
            return !prev || !prev.completed;
        });

        if (newlyCompleted) {
            const messages = {
                'goal-calories': `Has alcanzado ${newlyCompleted.current} kcal hoy (${newlyCompleted.progress}% de tu meta diaria).`,
                'goal-work': `Meta semanal de ${newlyCompleted.target}h cumplida. Gran ritmo de enfoque.`,
                'goal-savings': `Balance neto mensual de ${newlyCompleted.current} € alcanzado. Objetivo cumplido.`,
                'goal-workouts': `¡${newlyCompleted.current} sesiones completadas esta semana! Disciplina constante.`,
            };
            triggerGoalCelebration({
                goalId: newlyCompleted.id,
                goalTitle: newlyCompleted.title,
                message: messages[newlyCompleted.id] || `Has completado el objetivo "${newlyCompleted.title}".`,
            });
        }
    } catch (e) {
        // Silencioso para no bloquear guardados
    }
}

function readLocalStorage() {
    try {
        if (typeof window !== 'undefined' && window.localStorage) {
            const raw = window.localStorage.getItem(STORAGE_KEY);
            if (raw) {
                const parsed = JSON.parse(raw);
                const def = createDefaultState();
                return {
                    ...def,
                    ...parsed,
                    profile: {
                        ...def.profile,
                        ...(parsed.profile || {}),
                        gimnasio_nombre: (parsed.profile?.gimnasio_nombre || def.profile.gimnasio_nombre),
                    },
                    customFoods: Array.isArray(parsed.customFoods) ? parsed.customFoods : [],
                    appointments: Array.isArray(parsed.appointments) ? parsed.appointments : def.appointments,
                };
            }
        }
    } catch (e) {
        // Sin localStorage disponible
    }
    return null;
}

function writeLocalStorage(state) {
    try {
        if (typeof window !== 'undefined' && window.localStorage) {
            window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
        }
    } catch (e) {
        // Sin localStorage disponible
    }
}

export function subscribeStore(listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
}

export async function getStoreState(forceRemote = false) {
    if (!memoryState) {
        const local = readLocalStorage();
        memoryState = local || createDefaultState();
        if (!local) writeLocalStorage(memoryState);
    }

    if (forceRemote) {
        await syncFromSupabase();
    }

    return memoryState;
}

export async function syncFromSupabase() {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return memoryState;

        const [
            { data: perfil },
            { data: jornadas },
            { data: transacciones },
            { data: entrenos },
            { data: registros },
        ] = await Promise.all([
            supabase.from('perfiles').select('*').eq('id', user.id).single(),
            supabase.from('jornadas_trabajo').select('*').eq('user_id', user.id).order('hora_inicio', { ascending: false }),
            supabase.from('transacciones_economicas').select('*').eq('user_id', user.id).order('fecha', { ascending: false }),
            supabase.from('entrenamientos').select('*').eq('user_id', user.id).order('fecha', { ascending: false }),
            supabase.from('registros_diarios').select('id, fecha, ingestas(*)').eq('user_id', user.id).order('fecha', { ascending: false }),
        ]);

        const next = { ...memoryState };

        if (perfil) {
            next.profile = {
                ...next.profile,
                nombre: perfil.nombre || next.profile.nombre,
                objetivo_calorico_diario: Number(perfil.objetivo_calorico_diario ?? next.profile.objetivo_calorico_diario),
                aviso_entreno_minutos: Number(perfil.aviso_entreno_minutos ?? next.profile.aviso_entreno_minutos),
            };
        }

        if (Array.isArray(jornadas) && jornadas.length > 0) {
            next.workSessions = jornadas;
        }
        if (Array.isArray(transacciones) && transacciones.length > 0) {
            next.transactions = transacciones;
        }
        if (Array.isArray(entrenos) && entrenos.length > 0) {
            next.workouts = entrenos;
        }
        if (Array.isArray(registros) && registros.length > 0) {
            const flatMeals = [];
            registros.forEach((reg) => {
                (reg.ingestas || []).forEach((ing) => {
                    flatMeals.push({ ...ing, fecha: reg.fecha });
                });
            });
            if (flatMeals.length > 0) next.meals = flatMeals;
        }

        memoryState = next;
        writeLocalStorage(memoryState);
        notifyListeners();
    } catch (e) {
        // Mantiene estado local si falla la red
    }
    return memoryState;
}

async function getCurrentUserId() {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        return user?.id || null;
    } catch {
        return null;
    }
}

export async function updateProfileAndGoals(updates) {
    await getStoreState();
    memoryState = {
        ...memoryState,
        profile: {
            ...memoryState.profile,
            ...updates,
        },
    };
    writeLocalStorage(memoryState);
    notifyListeners();

    const userId = await getCurrentUserId();
    if (userId) {
        await supabase.from('perfiles').upsert({
            id: userId,
            nombre: memoryState.profile.nombre,
            objetivo_calorico_diario: Number(memoryState.profile.objetivo_calorico_diario || 0),
            aviso_entreno_minutos: parseInt(memoryState.profile.aviso_entreno_minutos || 30, 10),
        });
    }
    return memoryState.profile;
}

export async function addCustomFood(food) {
    await getStoreState();
    const cleanFood = {
        id: `food-${Date.now()}`,
        nombre: String(food.nombre || '').trim(),
        categoria: String(food.categoria || 'Personalizado').trim(),
        kcal_100g: Number(food.kcal_100g) || 0,
        proteina_100g: Number(food.proteina_100g) || 0,
        carbohidratos_100g: Number(food.carbohidratos_100g) || 0,
        grasas_100g: Number(food.grasas_100g) || 0,
        custom: true,
    };

    try {
        const userId = await getCurrentUserId();
        if (userId) {
            const { data } = await supabase
                .from('alimentos')
                .insert([
                    {
                        nombre: cleanFood.nombre,
                        categoria: cleanFood.categoria,
                        kcal_100g: cleanFood.kcal_100g,
                        proteina_100g: cleanFood.proteina_100g,
                        carbohidratos_100g: cleanFood.carbohidratos_100g,
                        grasas_100g: cleanFood.grasas_100g,
                    },
                ])
                .select()
                .single();
            if (data?.id) cleanFood.id = data.id;
        }
    } catch (e) {
        // Guardar localmente aunque no haya red o tabla con RLS
    }

    memoryState = {
        ...memoryState,
        customFoods: [cleanFood, ...(memoryState.customFoods || [])],
    };
    writeLocalStorage(memoryState);
    notifyListeners();
    return cleanFood;
}

export async function addAppointment(appt) {
    await getStoreState();
    const newItem = {
        id: `apt-${Date.now()}`,
        titulo: String(appt.titulo || '').trim(),
        fecha: appt.fecha || getTodayStr(),
        hora: appt.hora || '10:00',
        tipo: appt.tipo || 'Cita',
        estado: appt.estado || 'pendiente',
        nota: String(appt.nota || '').trim(),
    };

    memoryState = {
        ...memoryState,
        appointments: [newItem, ...(memoryState.appointments || [])],
    };
    writeLocalStorage(memoryState);
    notifyListeners();
    return newItem;
}

export async function updateAppointmentStatus(id, estado) {
    await getStoreState();
    memoryState = {
        ...memoryState,
        appointments: (memoryState.appointments || []).map((a) =>
            a.id === id ? { ...a, estado } : a
        ),
    };
    writeLocalStorage(memoryState);
    notifyListeners();
}

export async function deleteAppointment(id) {
    await getStoreState();
    memoryState = {
        ...memoryState,
        appointments: (memoryState.appointments || []).filter((a) => a.id !== id),
    };
    writeLocalStorage(memoryState);
    notifyListeners();
}

export async function addWorkSession(session) {
    const prevState = await getStoreState();
    const newItem = {
        id: `wk-${Date.now()}`,
        ...session,
    };

    try {
        const userId = await getCurrentUserId();
        if (userId) {
            const { data } = await supabase
                .from('jornadas_trabajo')
                .insert([
                    {
                        user_id: userId,
                        hora_inicio: session.hora_inicio,
                        hora_fin: session.hora_fin,
                        precio_hora: session.precio_hora,
                        ingreso_generado: session.ingreso_generado,
                    },
                ])
                .select()
                .single();
            if (data) newItem.id = data.id;
        }
    } catch (e) {
        // Persistencia local garantizada
    }

    const nextState = {
        ...memoryState,
        workSessions: [newItem, ...memoryState.workSessions],
    };
    memoryState = nextState;
    writeLocalStorage(memoryState);
    notifyListeners();
    checkGoalCompletionTransition(prevState, nextState);
    return newItem;
}

export async function deleteWorkSession(id) {
    await getStoreState();
    const userId = await getCurrentUserId();
    if (userId && !String(id).startsWith('wk-')) {
        await supabase.from('jornadas_trabajo').delete().eq('id', id);
    }
    memoryState = {
        ...memoryState,
        workSessions: memoryState.workSessions.filter((w) => w.id !== id),
    };
    writeLocalStorage(memoryState);
    notifyListeners();
}

export async function addTransaction(tx) {
    const prevState = await getStoreState();
    const newItem = {
        id: `tx-${Date.now()}`,
        ...tx,
    };

    try {
        const userId = await getCurrentUserId();
        if (userId) {
            const { data } = await supabase
                .from('transacciones_economicas')
                .insert([{ user_id: userId, ...tx }])
                .select()
                .single();
            if (data) newItem.id = data.id;
        }
    } catch (e) {
        // Persistencia local garantizada
    }

    const nextState = {
        ...memoryState,
        transactions: [newItem, ...memoryState.transactions],
    };
    memoryState = nextState;
    writeLocalStorage(memoryState);
    notifyListeners();
    checkGoalCompletionTransition(prevState, nextState);
    return newItem;
}

export async function deleteTransaction(id) {
    await getStoreState();
    const userId = await getCurrentUserId();
    if (userId && !String(id).startsWith('tx-')) {
        await supabase.from('transacciones_economicas').delete().eq('id', id);
    }
    memoryState = {
        ...memoryState,
        transactions: memoryState.transactions.filter((t) => t.id !== id),
    };
    writeLocalStorage(memoryState);
    notifyListeners();
}

export async function addMealRecord(meal) {
    const prevState = await getStoreState();
    const fecha = meal.fecha || getTodayStr();
    const newItem = {
        id: `meal-${Date.now()}`,
        fecha,
        hora: meal.hora,
        nombre_personalizado: meal.nombre_personalizado,
        alimentos: meal.alimentos,
    };

    try {
        const userId = await getCurrentUserId();
        if (userId) {
            let { data: regDiario } = await supabase
                .from('registros_diarios')
                .select('id')
                .eq('user_id', userId)
                .eq('fecha', fecha)
                .single();

            if (!regDiario) {
                const { data: nuevoReg } = await supabase
                    .from('registros_diarios')
                    .insert([{ user_id: userId, fecha }])
                    .select('id')
                    .single();
                regDiario = nuevoReg;
            }

            if (regDiario?.id) {
                const { data: inserted } = await supabase
                    .from('ingestas')
                    .insert([
                        {
                            registro_diario_id: regDiario.id,
                            hora: meal.hora,
                            nombre_personalizado: meal.nombre_personalizado,
                            alimentos: meal.alimentos,
                        },
                    ])
                    .select()
                    .single();
                if (inserted) newItem.id = inserted.id;
            }
        }
    } catch (e) {
        // Persistencia local garantizada
    }

    const nextState = {
        ...memoryState,
        meals: [newItem, ...memoryState.meals],
    };
    memoryState = nextState;
    writeLocalStorage(memoryState);
    notifyListeners();
    checkGoalCompletionTransition(prevState, nextState);
    return newItem;
}

export async function deleteMealRecord(id) {
    await getStoreState();
    const userId = await getCurrentUserId();
    if (userId && !String(id).startsWith('meal-')) {
        await supabase.from('ingestas').delete().eq('id', id);
    }
    memoryState = {
        ...memoryState,
        meals: memoryState.meals.filter((m) => m.id !== id),
    };
    writeLocalStorage(memoryState);
    notifyListeners();
}

export async function addWorkoutRecord(workout, seriesList = [], exercisesDetail = []) {
    const prevState = await getStoreState();
    const newItem = {
        id: `wko-${Date.now()}`,
        ...workout,
        ejercicios_detalle: exercisesDetail,
    };

    try {
        const userId = await getCurrentUserId();
        if (userId) {
            const { data: insertedWorkout } = await supabase
                .from('entrenamientos')
                .insert([
                    {
                        user_id: userId,
                        fecha: workout.fecha,
                        hora_inicio: workout.hora_inicio,
                        duracion_minutos: workout.duracion_minutos,
                        gasto_calorico: workout.gasto_calorico,
                        tipo_entrenamiento: workout.tipo_entrenamiento,
                    },
                ])
                .select()
                .single();

            if (insertedWorkout) {
                newItem.id = insertedWorkout.id;
                if (seriesList.length > 0) {
                    const payload = seriesList.map((s) => ({
                        ...s,
                        entrenamiento_id: insertedWorkout.id,
                    }));
                    await supabase.from('series_entrenamiento').insert(payload);
                }
            }
        }
    } catch (e) {
        // Persistencia local garantizada
    }

    const nextState = {
        ...memoryState,
        workouts: [newItem, ...memoryState.workouts],
    };
    memoryState = nextState;
    writeLocalStorage(memoryState);
    notifyListeners();
    checkGoalCompletionTransition(prevState, nextState);
    return newItem;
}

export async function clearAllLocalData() {
    memoryState = {
        profile: { ...memoryState?.profile },
        customFoods: [],
        appointments: [],
        workSessions: [],
        transactions: [],
        meals: [],
        workouts: [],
    };
    writeLocalStorage(memoryState);
    notifyListeners();
    return memoryState;
}

// Cálculo de rangos de fecha según periodo: 'diario' | 'semanal' | 'mensual' | 'anual'
export function getDateRangeForPeriod(period) {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

    if (period === 'diario') {
        return { startStr: todayStr, endStr: todayStr, label: 'Hoy' };
    }

    if (period === 'semanal') {
        const day = now.getDay() === 0 ? 6 : now.getDay() - 1;
        const start = new Date(now);
        start.setDate(now.getDate() - day);
        return { startStr: start.toISOString().split('T')[0], endStr: todayStr, label: 'Esta semana' };
    }

    if (period === 'mensual') {
        const start = new Date(now.getFullYear(), now.getMonth(), 1);
        return { startStr: start.toISOString().split('T')[0], endStr: todayStr, label: 'Este mes' };
    }

    const start = new Date(now.getFullYear(), 0, 1);
    return { startStr: start.toISOString().split('T')[0], endStr: todayStr, label: `Año ${now.getFullYear()}` };
}

function getDateOnly(dateOrIso) {
    if (!dateOrIso) return '';
    return String(dateOrIso).split('T')[0];
}

// Motor de métricas por periodo ('diario' | 'semanal' | 'mensual' | 'anual')
export function computePeriodMetrics(state, period = 'diario') {
    if (!state) return null;
    const { startStr, endStr, label } = getDateRangeForPeriod(period);
    const inRange = (d) => {
        const day = getDateOnly(d);
        return day >= startStr && day <= endStr;
    };

    const filteredWork = (state.workSessions || []).filter((w) => inRange(w.fecha || w.hora_inicio));
    const filteredTx = (state.transactions || []).filter((t) => inRange(t.fecha));
    const filteredMeals = (state.meals || []).filter((m) => inRange(m.fecha));
    const filteredWorkouts = (state.workouts || []).filter((w) => inRange(w.fecha));

    // Trabajo (ordinarias, extra y descansos)
    let workHours = 0;
    let ordinaryHours = 0;
    let overtimeHours = 0;
    let breakMinutes = 0;
    let workIncome = 0;
    let splitShiftCount = 0;

    filteredWork.forEach((w) => {
        const breakMin = Number(w.descanso_minutos) || 0;
        breakMinutes += breakMin;
        if (w.jornada_partida) splitShiftCount += 1;

        if (w.horas_ordinarias !== undefined || w.horas_extra !== undefined) {
            const ord = Number(w.horas_ordinarias) || 0;
            const ext = Number(w.horas_extra) || 0;
            ordinaryHours += ord;
            overtimeHours += ext;
            workHours += ord + ext;
        } else if (w.hora_inicio && w.hora_fin) {
            const diff = new Date(w.hora_fin) - new Date(w.hora_inicio);
            const rawHours = Math.max(0, diff / 3600000);
            const netHours = Math.max(0, rawHours - breakMin / 60);
            ordinaryHours += netHours;
            workHours += netHours;
        }
        workIncome += Number(w.ingreso_generado) || 0;
    });

    // Economía
    let extraIncome = 0;
    let expenses = 0;
    let foodExpenses = 0;
    const expensesByCategory = {};

    filteredTx.forEach((tx) => {
        const amt = Number(tx.cantidad) || 0;
        if (tx.tipo?.toLowerCase() === 'ingreso') {
            extraIncome += amt;
        } else {
            expenses += amt;
            const cat = tx.categoria || 'General';
            expensesByCategory[cat] = (expensesByCategory[cat] || 0) + amt;
            if (cat.toLowerCase().includes('aliment')) {
                foodExpenses += amt;
            }
        }
    });

    const totalIncome = workIncome + extraIncome;
    const netBalance = totalIncome - expenses;
    const savingsRate = totalIncome > 0 ? Math.round((netBalance / totalIncome) * 100) : 0;

    // Nutrición
    let caloriesIn = 0;
    let protein = 0;
    let carbs = 0;
    let fats = 0;
    const foodFrequency = {};

    filteredMeals.forEach((m) => {
        const list = Array.isArray(m.alimentos) ? m.alimentos : [];
        list.forEach((item) => {
            caloriesIn += Number(item.kcal || item.kcal_totales || 0);
            protein += Number(item.proteina || 0);
            carbs += Number(item.carbohidratos || 0);
            fats += Number(item.grasas || 0);
            if (item.nombre) {
                foodFrequency[item.nombre] = (foodFrequency[item.nombre] || 0) + 1;
            }
        });
    });

    const macroKcal = protein * 4 + carbs * 4 + fats * 9;
    const proteinPct = macroKcal > 0 ? Math.round(((protein * 4) / macroKcal) * 100) : 0;
    const carbsPct = macroKcal > 0 ? Math.round(((carbs * 4) / macroKcal) * 100) : 0;
    const fatsPct = macroKcal > 0 ? Math.max(0, 100 - proteinPct - carbsPct) : 0;

    // Entrenamiento
    let caloriesBurned = 0;
    let totalMinutes = 0;
    let totalTonnage = 0;
    let totalSets = 0;
    const muscleCounts = {};

    filteredWorkouts.forEach((w) => {
        caloriesBurned += Number(w.gasto_calorico) || 0;
        totalMinutes += Number(w.duracion_minutos) || 0;
        totalTonnage += Number(w.tonelaje) || 0;
        totalSets += Number(w.series_totales) || 0;
        if (Array.isArray(w.ejercicios_detalle)) {
            w.ejercicios_detalle.forEach((ex) => {
                const grp = ex.grupo_muscular || 'General';
                muscleCounts[grp] = (muscleCounts[grp] || 0) + (Array.isArray(ex.series) ? ex.series.length : 1);
            });
        }
    });

    return {
        period,
        label,
        startStr,
        endStr,
        records: {
            work: filteredWork,
            transactions: filteredTx,
            meals: filteredMeals,
            workouts: filteredWorkouts,
        },
        work: {
            hours: Number(workHours.toFixed(1)),
            ordinaryHours: Number(ordinaryHours.toFixed(1)),
            overtimeHours: Number(overtimeHours.toFixed(1)),
            breakMinutes: Math.round(breakMinutes),
            splitShiftCount,
            income: Math.round(workIncome),
            effectiveHourlyRate: workHours > 0 ? Math.round(workIncome / workHours) : 0,
            sessionsCount: filteredWork.length,
        },
        economy: {
            totalIncome: Math.round(totalIncome),
            workIncome: Math.round(workIncome),
            extraIncome: Math.round(extraIncome),
            expenses: Math.round(expenses),
            foodExpenses: Math.round(foodExpenses),
            expensesByCategory,
            netBalance: Math.round(netBalance),
            savingsRate,
        },
        health: {
            caloriesIn: Math.round(caloriesIn),
            protein: Math.round(protein),
            carbs: Math.round(carbs),
            fats: Math.round(fats),
            proteinPct,
            carbsPct,
            fatsPct,
            mealsCount: filteredMeals.length,
            foodFrequency,
        },
        training: {
            sessionsCount: filteredWorkouts.length,
            caloriesBurned: Math.round(caloriesBurned),
            totalMinutes,
            totalTonnage: Math.round(totalTonnage),
            avgTonnage: filteredWorkouts.length > 0 ? Math.round(totalTonnage / filteredWorkouts.length) : 0,
            totalSets,
            muscleCounts,
        },
    };
}

// Evaluar objetivos activos y generar anillos + consejos humanos
export function evaluateGoalsAndAdvice(state) {
    if (!state) return { goals: [], advice: [], completedCount: 0 };

    const todayMetrics = computePeriodMetrics(state, 'diario');
    const weekMetrics = computePeriodMetrics(state, 'semanal');
    const monthMetrics = computePeriodMetrics(state, 'mensual');
    const p = state.profile || {};

    const goals = [];
    const advice = [];

    // 1. Objetivo calórico diario
    if (Number(p.objetivo_calorico_diario) > 0) {
        const target = Number(p.objetivo_calorico_diario) + todayMetrics.training.caloriesBurned;
        const current = todayMetrics.health.caloriesIn;
        const pct = Math.round((current / target) * 100);

        goals.push({
            id: 'goal-calories',
            title: 'Calorías hoy',
            current,
            target,
            unit: 'kcal',
            progress: pct,
            completed: current >= target,
            color: '#F59E0B',
        });

        if (current >= target) {
            advice.push({
                id: 'adv-cal-done',
                type: 'completed',
                title: 'Objetivo calórico cubierto',
                message: 'Tu aporte energético de hoy ya está cubierto teniendo en cuenta tu entrenamiento. Prioriza hidratación y buen descanso esta noche.',
            });
        } else {
            const left = target - current;
            advice.push({
                id: 'adv-cal-help',
                type: 'help',
                title: `Te faltan ${left} kcal hoy`,
                message: todayMetrics.health.protein < 110
                    ? `Como entrenador te recomiendo priorizar proteína en tu próxima ingesta (${todayMetrics.health.protein}g acumulados): pollo, ternera o huevos.`
                    : `Vas sólido en proteína (${todayMetrics.health.protein}g). Completa las ${left} kcal restantes con carbohidratos limpios como arroz, patata o fruta.`,
            });
        }
    }

    // 2. Objetivo de horas semanales
    if (Number(p.objetivo_horas_semanales) > 0) {
        const target = Number(p.objetivo_horas_semanales);
        const current = weekMetrics.work.hours;
        const pct = Math.round((current / target) * 100);
        const completed = current >= target;

        goals.push({
            id: 'goal-work',
            title: 'Trabajo semanal',
            current,
            target,
            unit: 'h',
            progress: pct,
            completed,
            color: '#38BDF8',
        });

        if (completed) {
            advice.push({
                id: 'adv-work-done',
                type: 'completed',
                title: 'Meta semanal de trabajo completada',
                message: `Has alcanzado ${current}h productivas (+${weekMetrics.work.income} €). Como asistente te sugiero proteger tu tiempo libre y evitar horas extra innecesarias.`,
            });
        } else {
            const left = Math.max(0, Number((target - current).toFixed(1)));
            advice.push({
                id: 'adv-work-help',
                type: 'help',
                title: `${left}h para tu objetivo semanal`,
                message: `Llevas ${current}h netas (${weekMetrics.work.overtimeHours}h extra) y ${weekMetrics.work.income} € generados. Bloquea tramos continuos de foco y respeta pausas de 15 min.`,
            });
        }
    }

    // 3. Objetivo de ahorro mensual
    if (Number(p.objetivo_ahorro_mensual) > 0) {
        const target = Number(p.objetivo_ahorro_mensual);
        const current = monthMetrics.economy.netBalance;
        const pct = Math.max(0, Math.round((current / target) * 100));
        const completed = current >= target;

        goals.push({
            id: 'goal-savings',
            title: 'Ahorro mensual',
            current,
            target,
            unit: '€',
            progress: pct,
            completed,
            color: '#34D399',
        });

        if (completed) {
            advice.push({
                id: 'adv-sav-done',
                type: 'completed',
                title: 'Objetivo de ahorro conseguido',
                message: `Tu balance neto del mes (${current} €) supera tu meta de ${target} €. Reserva ese excedente antes de cerrar el mes.`,
            });
        } else if (monthMetrics.economy.expenses > monthMetrics.economy.totalIncome * 0.6) {
            advice.push({
                id: 'adv-sav-help',
                type: 'tip',
                title: 'Vigila el margen de ahorro mensual',
                message: `Llevas el ${pct}% de tu meta de ahorro. Recortar pequeños gastos fuera de lo esencial elevará tu tasa del ${monthMetrics.economy.savingsRate}% al objetivo.`,
            });
        }
    }

    // 4. Objetivo de entrenamientos semanales
    if (Number(p.objetivo_entrenos_semanales) > 0) {
        const target = Number(p.objetivo_entrenos_semanales);
        const current = weekMetrics.training.sessionsCount;
        const pct = Math.round((current / target) * 100);
        const completed = current >= target;

        goals.push({
            id: 'goal-workouts',
            title: 'Entrenos semana',
            current,
            target,
            unit: 'ses.',
            progress: pct,
            completed,
            color: '#FB7185',
        });

        if (completed) {
            advice.push({
                id: 'adv-wko-done',
                type: 'completed',
                title: 'Rutina semanal completada',
                message: `¡${current} sesiones completadas esta semana! Mantén al menos 7-8h de sueño para consolidar tus ganancias de fuerza.`,
            });
        }
    }

    const pendingAppts = (state.appointments || []).filter((a) => a.estado === 'pendiente').length;
    advice.push({
        id: 'adv-org-summary',
        type: 'summary',
        title: 'Nota de tu asistente personal',
        message: `Esta semana sumas ${weekMetrics.work.hours}h de jornada, ${weekMetrics.training.sessionsCount} entrenamientos y ${pendingAppts} cita(s) pendiente(s) en agenda.`,
    });

    const completedCount = goals.filter((g) => g.completed).length;
    return { goals, advice, completedCount };
}

// Análisis experto profundo por categoría (Entrenador Personal + Asistente Personal)
export function generateCategoryAnalysis(state, period = 'semanal', category = 'general') {
    const m = computePeriodMetrics(state, period);
    const p = state?.profile || {};
    const name = p.nombre ? p.nombre.split(' ')[0] : '';
    const greet = name ? `${name}, ` : '';
    const today = getTodayStr();
    const pendingAppts = (state?.appointments || []).filter((a) => a.estado === 'pendiente');
    const forgottenAppts = (state?.appointments || []).filter((a) => a.estado === 'olvidada');

    if (category === 'training') {
        const topMuscle = Object.entries(m.training.muscleGroups || m.training.muscleCounts || {}).sort((a, b) => b[1] - a[1])[0];
        const cards = [
            {
                id: 'tr-coach-1',
                role: 'Entrenador Personal',
                tone: m.training.sessionsCount > 0 ? 'success' : 'focus',
                title: m.training.sessionsCount > 0 ? 'Lectura de carga y estímulo' : 'Sin sesiones registradas aún',
                message: m.training.sessionsCount > 0
                    ? `${greet}acumulas ${m.training.sessionsCount} sesiones (${m.training.totalMinutes} min totales) con un volumen medio de ${m.training.avgTonnage.toLocaleString()} kg por entreno.${topMuscle ? ` Tu grupo más estimulado es ${topMuscle[0]} (${topMuscle[1]} series).` : ''}`
                    : `${greet}no hay entrenamientos en este periodo (${m.label.toLowerCase()}). Una sesión de 45 min de básicos es suficiente para activar la semana sin fatiga excesiva.`,
            },
            {
                id: 'tr-coach-2',
                role: 'Entrenador Personal',
                tone: 'tip',
                title: 'Progresión y recuperación',
                message: m.training.totalSets > 0
                    ? `Has completado ${m.training.totalSets} series efectivas y quemado ${m.training.caloriesBurned} kcal. Si sientes pesadez en las articulaciones, prioriza 1,8–2 g de proteína/kg y deja 48h entre grupos grandes.`
                    : `Empieza con 3 ejercicios multiarticulares (sentadilla, press o remo) y anota cada peso para medir tu progresión real sesión a sesión.`,
            },
            {
                id: 'tr-asst-1',
                role: 'Asistente Personal',
                tone: 'tip',
                title: 'Encaje horario con tu jornada',
                message: m.work.hours > 0
                    ? `Tus sesiones promedian ${m.training.sessionsCount > 0 ? Math.round(m.training.totalMinutes / m.training.sessionsCount) : 55} min. En días de jornada partida (${m.work.splitShiftCount} registradas), entrenar al terminar el segundo bloque libera estrés acumulado sin restar horas productivas.`
                    : `Recuerda que tienes activado el aviso previo de ${p.aviso_entreno_minutos || 30} min en tu perfil para preparar tu mochila y comida pre-entreno.`,
            },
        ];

        return {
            title: 'Análisis de Entrenamiento',
            subtitle: `Seguimiento físico · ${m.label}`,
            kpis: [
                { label: 'Sesiones', value: `${m.training.sessionsCount}`, color: '#FB7185' },
                { label: 'Tonelaje', value: `${m.training.totalTonnage.toLocaleString()} kg`, color: '#FAFAFA' },
                { label: 'Media / sesión', value: `${m.training.avgTonnage.toLocaleString()} kg`, color: '#38BDF8' },
                { label: 'Gasto', value: `${m.training.caloriesBurned} kcal`, color: '#F59E0B' },
            ],
            cards,
        };
    }

    if (category === 'diet') {
        const targetPerDay = Number(p.objetivo_calorico_diario) || 2400;
        const avgMeals = m.health.mealsCount;
        const lowProtein = m.health.proteinPct < 22 && m.health.caloriesIn > 0;
        const cards = [
            {
                id: 'dt-coach-1',
                role: 'Entrenador Personal',
                tone: lowProtein ? 'focus' : 'success',
                title: lowProtein ? 'Refuerza la densidad proteica' : 'Distribución de macronutrientes',
                message: m.health.caloriesIn > 0
                    ? `${greet}tu reparto actual es ${m.health.proteinPct}% proteína (${m.health.protein}g), ${m.health.carbsPct}% carbohidratos (${m.health.carbs}g) y ${m.health.fatsPct}% grasas (${m.health.fats}g). ${lowProtein ? 'Subir la proteína hacia el 25-30% protegerá tu masa muscular mientras entrenas fuerza.' : 'El equilibrio de proteína y energía acompaña muy bien tus cargas de entrenamiento.'}`
                    : `Todavía no hay ingestas registradas en ${m.label.toLowerCase()}. Registrar desayuno y almuerzo te dará visibilidad real de tu energía.`,
            },
            {
                id: 'dt-coach-2',
                role: 'Entrenador Personal',
                tone: 'tip',
                title: 'Ajuste con tu gasto deportivo',
                message: period === 'diario'
                    ? `Tu meta ajustada hoy suma ${m.training.caloriesBurned} kcal del entreno a tus ${targetPerDay} kcal base (${targetPerDay + m.training.caloriesBurned} kcal totales). Usa alimentos completos y añade los que uses a diario desde "+ Crear alimento".`
                    : `Acumulas ${avgMeals} ingestas registradas en ${m.label.toLowerCase()} con un total de ${m.health.caloriesIn.toLocaleString()} kcal.`,
            },
            {
                id: 'dt-asst-1',
                role: 'Asistente Personal',
                tone: 'tip',
                title: 'Coste y eficiencia nutricional',
                message: m.economy.foodExpenses > 0
                    ? `Has destinado ${m.economy.foodExpenses} € a alimentación en este periodo. Planificar la compra semanal de básicos (huevos, carne, arroz, fruta) evita improvisar gastos fuera de casa.`
                    : `Si registras la compra en Economía bajo la categoría Alimentación, cruzaré cuánto te cuesta cada semana mantener tu dieta.`,
            },
        ];

        return {
            title: 'Análisis de Dieta',
            subtitle: `Nutrición y macros · ${m.label}`,
            kpis: [
                { label: 'Calorías', value: `${m.health.caloriesIn.toLocaleString()} kcal`, color: '#F59E0B' },
                { label: 'Proteína', value: `${m.health.protein}g (${m.health.proteinPct}%)`, color: '#38BDF8' },
                { label: 'Carbohidratos', value: `${m.health.carbs}g (${m.health.carbsPct}%)`, color: '#34D399' },
                { label: 'Grasas', value: `${m.health.fats}g (${m.health.fatsPct}%)`, color: '#FB7185' },
            ],
            cards,
        };
    }

    if (category === 'work') {
        const hasOvertime = m.work.overtimeHours > 0;
        const cards = [
            {
                id: 'wk-asst-1',
                role: 'Asistente Personal',
                tone: 'success',
                title: 'Rendimiento horario y tarifa efectiva',
                message: m.work.hours > 0
                    ? `${greet}has trabajado ${m.work.hours}h netas (${m.work.ordinaryHours}h ordinarias y ${m.work.overtimeHours}h extra) generando ${m.work.income} €, a una media efectiva de ${m.work.effectiveHourlyRate} €/h.`
                    : `No hay jornadas registradas en ${m.label.toLowerCase()}. Registra turnos continuos o partidos para medir tu rentabilidad real por hora.`,
            },
            {
                id: 'wk-asst-2',
                role: 'Asistente Personal',
                tone: m.work.breakMinutes < m.work.sessionsCount * 15 ? 'focus' : 'tip',
                title: 'Gestión de descansos y fatiga',
                message: m.work.sessionsCount > 0
                    ? `Sumas ${m.work.breakMinutes} min de descanso registrado entre ${m.work.sessionsCount} jornadas (${m.work.splitShiftCount} partidas). ${hasOvertime ? `Cuidado con las ${m.work.overtimeHours}h extra: asegúrate de compensarlas con sueño.` : 'Mantener pausas claras mejora la concentración del tramo final.'}`
                    : `Usa la pausa del cronómetro en Jornada para descontar automáticamente tus descansos.`,
            },
            {
                id: 'wk-coach-1',
                role: 'Entrenador Personal',
                tone: 'tip',
                title: 'Impacto laboral en tu energía física',
                message: m.work.hours >= 40
                    ? `Con ${m.work.hours}h acumuladas, el estrés cortical puede subir. No te saltes las comidas alrededor del entreno y evita recortar horas de sueño para no frenar tu recuperación.`
                    : `Tu carga de horas deja margen excelente para cumplir con tus sesiones de fuerza sin sobrecarga nerviosa.`,
            },
        ];

        return {
            title: 'Análisis de Jornada',
            subtitle: `Productividad y turnos · ${m.label}`,
            kpis: [
                { label: 'Horas netas', value: `${m.work.hours}h`, color: '#38BDF8' },
                { label: 'Horas extra', value: `${m.work.overtimeHours}h`, color: '#F59E0B' },
                { label: 'Descansos', value: `${m.work.breakMinutes} min`, color: '#A1A1AA' },
                { label: 'Generado', value: `${m.work.income} €`, color: '#34D399' },
            ],
            cards,
        };
    }

    if (category === 'economy') {
        const topExpenseCat = Object.entries(m.economy.expensesByCategory || {}).sort((a, b) => b[1] - a[1])[0];
        const cards = [
            {
                id: 'ec-asst-1',
                role: 'Asistente Personal',
                tone: m.economy.netBalance >= 0 ? 'success' : 'focus',
                title: m.economy.netBalance >= 0 ? 'Flujo de caja positivo' : 'Atención al balance del periodo',
                message: `${greet}tus ingresos totales son ${m.economy.totalIncome} € (${m.economy.workIncome} € de jornada y ${m.economy.extraIncome} € extra) frente a ${m.economy.expenses} € en gastos. Tu tasa de ahorro actual es del ${m.economy.savingsRate}%.`,
            },
            {
                id: 'ec-asst-2',
                role: 'Asistente Personal',
                tone: 'tip',
                title: 'Distribución del gasto',
                message: topExpenseCat
                    ? `Tu mayor partida de gasto en ${m.label.toLowerCase()} es ${topExpenseCat[0]} (${Math.round(topExpenseCat[1])} €).${m.economy.foodExpenses > 0 ? ` Alimentación supone ${m.economy.foodExpenses} € (${m.economy.expenses > 0 ? Math.round((m.economy.foodExpenses / m.economy.expenses) * 100) : 0}% del gasto total).` : ''}`
                    : `No hay gastos anotados en este periodo. Registrar incluso compras pequeñas evita fugas silenciosas.`,
            },
            {
                id: 'ec-coach-1',
                role: 'Entrenador Personal',
                tone: 'tip',
                title: 'Inversión en salud',
                message: `Cada euro bien invertido en comida real de calidad y descanso rinde el doble en rendimiento laboral y físico a medio plazo.`,
            },
        ];

        return {
            title: 'Análisis Económico',
            subtitle: `Balance y liquidez · ${m.label}`,
            kpis: [
                { label: 'Ingresos', value: `${m.economy.totalIncome} €`, color: '#34D399' },
                { label: 'Gastos', value: `${m.economy.expenses} €`, color: '#FB7185' },
                { label: 'Balance neto', value: `${m.economy.netBalance} €`, color: m.economy.netBalance >= 0 ? '#34D399' : '#FB7185' },
                { label: 'Tasa ahorro', value: `${m.economy.savingsRate}%`, color: '#38BDF8' },
            ],
            cards,
        };
    }

    // GENERAL (Visión combinada de Entrenador Personal + Asistente Personal)
    const todayAppts = (state?.appointments || []).filter((a) => a.fecha === today && a.estado === 'pendiente');
    const cards = [
        {
            id: 'gen-coach-1',
            role: 'Entrenador Personal',
            tone: m.training.sessionsCount > 0 ? 'success' : 'focus',
            title: 'Estado físico y combustible',
            message: `${greet}en ${m.label.toLowerCase()} llevas ${m.training.sessionsCount} sesiones (${m.training.totalTonnage.toLocaleString()} kg movidos) y ${m.health.protein}g de proteína registrados. ${m.training.sessionsCount > 0 && m.health.protein < 80 ? 'Sube algo más la proteína para acompañar el desgaste muscular.' : 'Buen tándem entre entrenamiento y nutrición.'}`,
        },
        {
            id: 'gen-asst-1',
            role: 'Asistente Personal',
            tone: m.economy.netBalance >= 0 ? 'success' : 'focus',
            title: 'Pulso de trabajo, finanzas y agenda',
            message: `Has acumulado ${m.work.hours}h productivas (+${m.work.income} €) con un balance neto de ${m.economy.netBalance} €. En tu agenda tienes ${pendingAppts.length} cita(s) pendiente(s)${todayAppts.length > 0 ? ` (${todayAppts.length} hoy)` : ''}${forgottenAppts.length > 0 ? ` y ${forgottenAppts.length} marcada(s) como olvidada(s) para reprogramar` : ''}.`,
        },
        {
            id: 'gen-asst-2',
            role: 'Asistente Personal',
            tone: 'tip',
            title: 'Siguiente palanca recomendada',
            message: m.work.overtimeHours > 3
                ? `Tienes varias horas extra acumuladas (${m.work.overtimeHours}h). Protege hoy un bloque sin pantallas antes de dormir.`
                : pendingAppts.length > 0
                    ? `Revisa tu próxima cita "${pendingAppts[0].titulo}" (${pendingAppts[0].fecha} a las ${pendingAppts[0].hora}) y actualiza su estado al terminarla.`
                    : `Todo bajo control. Aprovecha la pestaña de cada categoría arriba si quieres bajar al detalle técnico.`,
        },
    ];

    return {
        title: 'Visión General',
        subtitle: `Diagnóstico integral · ${m.label}`,
        kpis: [
            { label: 'Horas trabajo', value: `${m.work.hours}h`, color: '#38BDF8' },
            { label: 'Balance neto', value: `${m.economy.netBalance} €`, color: m.economy.netBalance >= 0 ? '#34D399' : '#FB7185' },
            { label: 'Energía dieta', value: `${m.health.caloriesIn.toLocaleString()} kcal`, color: '#F59E0B' },
            { label: 'Entrenos', value: `${m.training.sessionsCount} ses.`, color: '#FB7185' },
        ],
        cards,
    };
}
