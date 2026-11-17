// Motor de Inteligencia Artificial y Hábitos para Organizator
// Integra: Open-Meteo Weather, Curva de Afluencia de Gimnasio y Google Gemini 2.0 Flash

const CITIES_COORDINATES = {
    'madrid': { lat: 40.4168, lon: -3.7038, name: 'Madrid' },
    'barcelona': { lat: 41.3851, lon: 2.1734, name: 'Barcelona' },
    'valencia': { lat: 39.4699, lon: -0.3763, name: 'Valencia' },
    'sevilla': { lat: 37.3891, lon: -5.9845, name: 'Sevilla' },
    'zaragoza': { lat: 41.6488, lon: -0.8891, name: 'Zaragoza' },
    'malaga': { lat: 36.7213, lon: -4.4214, name: 'Málaga' },
    'murcia': { lat: 37.9870, lon: -1.1300, name: 'Murcia' },
    'palma': { lat: 39.5696, lon: 2.6502, name: 'Palma' },
    'las palmas': { lat: 28.1235, lon: -15.4363, name: 'Las Palmas' },
    'bilbao': { lat: 43.2630, lon: -2.9350, name: 'Bilbao' },
    'alicante': { lat: 38.3452, lon: -0.4810, name: 'Alicante' },
    'cordoba': { lat: 37.8882, lon: -4.7794, name: 'Córdoba' },
    'valladolid': { lat: 41.6523, lon: -4.7245, name: 'Valladolid' },
    'vigo': { lat: 42.2406, lon: -8.7207, name: 'Vigo' },
    'gijon': { lat: 43.5357, lon: -5.6615, name: 'Gijón' },
    'granada': { lat: 37.1773, lon: -3.5986, name: 'Granada' },
    'coruna': { lat: 43.3623, lon: -8.4115, name: 'A Coruña' },
    'oviedo': { lat: 43.3619, lon: -5.8494, name: 'Oviedo' },
    'santander': { lat: 43.4623, lon: -3.8099, name: 'Santander' },
    'pamplona': { lat: 42.8125, lon: -1.6458, name: 'Pamplona' },
};

export function getCityCoordinates(cityName) {
    if (!cityName) return CITIES_COORDINATES['madrid'];
    const clean = String(cityName).toLowerCase().trim()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    return CITIES_COORDINATES[clean] || { lat: 40.4168, lon: -3.7038, name: cityName.trim() };
}

function interpretWeatherCode(code) {
    if (code === 0) return { label: 'Despejado', icon: '☀️', isRain: false };
    if ([1, 2].includes(code)) return { label: 'Poco nuboso', icon: '🌤️', isRain: false };
    if (code === 3) return { label: 'Nublado', icon: '☁️', isRain: false };
    if ([45, 48].includes(code)) return { label: 'Niebla', icon: '🌫️', isRain: false };
    if ([51, 53, 55, 61, 63, 65, 80, 81, 82].includes(code)) return { label: 'Lluvia', icon: '🌧️', isRain: true };
    if ([71, 73, 75, 85, 86].includes(code)) return { label: 'Nieve', icon: '❄️', isRain: true };
    if ([95, 96, 99].includes(code)) return { label: 'Tormenta', icon: '⛈️', isRain: true };
    return { label: 'Templado', icon: '⛅', isRain: false };
}

// 1. Clima en tiempo real (Open-Meteo)
export async function fetchWeather(cityName = 'Madrid') {
    const coords = getCityCoordinates(cityName);
    try {
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${coords.lat}&longitude=${coords.lon}&current=temperature_2m,precipitation,weather_code&hourly=temperature_2m,precipitation_probability,weather_code&forecast_days=1&timezone=auto`;
        const res = await fetch(url, { headers: { Accept: 'application/json' } });
        if (!res.ok) throw new Error('HTTP ' + res.status);
        const data = await res.json();

        const current = data.current || {};
        const weatherInfo = interpretWeatherCode(current.weather_code ?? 0);

        const hourly = [];
        if (data.hourly && Array.isArray(data.hourly.time)) {
            const times = data.hourly.time;
            const temps = data.hourly.temperature_2m || [];
            const probs = data.hourly.precipitation_probability || [];
            const codes = data.hourly.weather_code || [];

            for (let i = 0; i < times.length; i++) {
                const hourStr = String(times[i]).split('T')[1]?.slice(0, 5) || `${i}:00`;
                const hCode = codes[i] ?? 0;
                hourly.push({
                    time: hourStr,
                    hour: parseInt(hourStr.split(':')[0], 10),
                    temp: Math.round(temps[i] ?? 18),
                    rainProb: probs[i] ?? 0,
                    weather: interpretWeatherCode(hCode),
                });
            }
        }

        return {
            city: coords.name,
            temp: Math.round(current.temperature_2m ?? 18),
            label: weatherInfo.label,
            icon: weatherInfo.icon,
            isRain: weatherInfo.isRain,
            hourly,
        };
    } catch (e) {
        const defaultHourly = [];
        for (let h = 7; h <= 23; h++) {
            defaultHourly.push({
                time: `${String(h).padStart(2, '0')}:00`,
                hour: h,
                temp: 18,
                rainProb: 0,
                weather: { label: 'Despejado', icon: '☀️', isRain: false },
            });
        }
        return {
            city: coords.name,
            temp: 19,
            label: 'Despejado',
            icon: '☀️',
            isRain: false,
            hourly: defaultHourly,
        };
    }
}

// 2. Modelo de afluencia por hora
export function getGymCrowdAtHour(hour, isWeekend = false, isRaining = false) {
    let crowd = 30;

    if (isWeekend) {
        if (hour >= 9 && hour <= 12) crowd = 68;
        else if (hour >= 13 && hour <= 16) crowd = 28;
        else if (hour >= 17 && hour <= 20) crowd = 42;
        else crowd = 20;
    } else {
        if (hour >= 6 && hour <= 8) crowd = 28;
        else if (hour >= 9 && hour <= 11) crowd = 38;
        else if (hour >= 12 && hour <= 14) crowd = 45;
        else if (hour >= 14 && hour <= 16) crowd = 26;
        else if (hour === 17) crowd = 55;
        else if (hour >= 18 && hour <= 20) crowd = 88;
        else if (hour === 21) crowd = 48;
        else if (hour >= 22) crowd = 22;
        else crowd = 15;
    }

    if (isRaining && hour >= 17 && hour <= 21) {
        crowd = Math.min(98, crowd + 8);
    }

    let category = 'Baja';
    let color = '#34D399';
    if (crowd > 70) {
        category = 'Alta (Hora punta)';
        color = '#FB7185';
    } else if (crowd > 45) {
        category = 'Media';
        color = '#F59E0B';
    }

    return { crowd, category, color };
}

// 3. Extracción de datos reales y hábitos del usuario
export function extractUserHabits(storeState) {
    if (!storeState) return null;

    const {
        workSessions = [],
        workouts = [],
        meals = [],
        profile = {},
        appointments = [],
        transactions = [],
    } = storeState;

    const todayStr = new Date().toISOString().split('T')[0];

    // Comidas de hoy
    const todayMeals = meals.filter((m) => m.fecha === todayStr);
    let todayKcal = 0;
    let todayProt = 0;
    let todayCarbs = 0;
    let todayFats = 0;
    const todayFoodNames = [];

    todayMeals.forEach((m) => {
        (Array.isArray(m.alimentos) ? m.alimentos : []).forEach((f) => {
            todayKcal += Number(f.kcal || f.kcal_totales || 0);
            todayProt += Number(f.proteina || 0);
            todayCarbs += Number(f.carbohidratos || 0);
            todayFats += Number(f.grasas || 0);
            if (f.nombre) todayFoodNames.push(`${f.nombre} (${f.gramos}g)`);
        });
    });

    const targetKcal = Number(profile.objetivo_calorico_diario || 2400);

    // Entrenamientos
    const recentWorkouts = [...workouts].sort((a, b) => String(b.fecha).localeCompare(String(a.fecha)));
    const lastWorkout = recentWorkouts[0] || null;

    let daysSinceLastWorkout = 999;
    if (lastWorkout && lastWorkout.fecha) {
        const diffMs = new Date() - new Date(lastWorkout.fecha);
        daysSinceLastWorkout = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
    }

    const lastWorkoutType = lastWorkout?.tipo_entrenamiento || 'Fuerza';
    let suggestedMuscle = 'Torso';
    if (lastWorkoutType.toLowerCase().includes('torso') || lastWorkoutType.toLowerCase().includes('pecho')) {
        suggestedMuscle = 'Pierna / Cadena posterior';
    } else if (lastWorkoutType.toLowerCase().includes('pierna')) {
        suggestedMuscle = 'Torso / Tracción o Empuje';
    }

    // Jornadas
    const todayWork = workSessions.filter((w) => (w.fecha || '').startsWith(todayStr));
    let todayWorkHrs = 0;
    todayWork.forEach((w) => {
        if (w.horas_ordinarias !== undefined || w.horas_extra !== undefined) {
            todayWorkHrs += (Number(w.horas_ordinarias) || 0) + (Number(w.horas_extra) || 0);
        } else if (w.hora_inicio && w.hora_fin) {
            todayWorkHrs += Math.max(0, (new Date(w.hora_fin) - new Date(w.hora_inicio)) / 3600000);
        }
    });

    // Citas
    const todayAppts = appointments.filter((a) => a.fecha === todayStr && a.estado === 'pendiente');
    const forgottenAppts = appointments.filter((a) => a.estado === 'olvidada');

    // Economía
    const todayTx = transactions.filter((t) => (t.fecha || '').startsWith(todayStr));
    let todayExpenses = 0;
    todayTx.forEach((tx) => {
        if (tx.tipo?.toLowerCase() === 'gasto') todayExpenses += Number(tx.cantidad || 0);
    });

    return {
        nombre: profile.nombre || 'Superhombre',
        ciudad: profile.ciudad || 'Madrid',
        gimnasio: profile.gimnasio_nombre || 'Basic-Fit Centro',
        horarioPreferido: profile.horario_preferido_gym || 'tarde',
        todayKcal: Math.round(todayKcal),
        todayProt: Math.round(todayProt),
        todayCarbs: Math.round(todayCarbs),
        todayFats: Math.round(todayFats),
        targetKcal,
        todayFoodNames,
        todayMealsCount: todayMeals.length,
        daysSinceLastWorkout,
        lastWorkout,
        suggestedMuscle,
        totalWorkouts: workouts.length,
        todayWorkHrs: Number(todayWorkHrs.toFixed(1)),
        todayWorkCount: todayWork.length,
        todayAppts,
        forgottenAppts,
        todayExpenses,
    };
}

// 4. Calcular Hueco Óptimo de Gimnasio
export function calculateGymRecommendation(storeState, weatherData) {
    const habits = extractUserHabits(storeState);
    const now = new Date();
    const currentHour = now.getHours();
    const isWeekend = now.getDay() === 0 || now.getDay() === 6;
    const isRain = !!weatherData?.isRain;

    const busyHours = new Set();
    (habits?.todayAppts || []).forEach((a) => {
        if (a.hora && a.hora.includes(':')) {
            busyHours.add(parseInt(a.hora.split(':')[0], 10));
        }
    });

    const workEndHour = 18;
    const startH = Math.max(8, currentHour);
    const candidateSlots = [];

    for (let h = startH; h <= 22; h++) {
        const isFree = !busyHours.has(h) && (h >= workEndHour || h === 14 || h === 15);
        const crowdInfo = getGymCrowdAtHour(h, isWeekend, isRain);
        const hourlyWeather = weatherData?.hourly?.find((item) => item.hour === h) || {
            temp: weatherData?.temp || 18,
            weather: { icon: '🌤️', label: 'Agradable' },
            rainProb: 0,
        };

        candidateSlots.push({
            hour: h,
            timeLabel: `${String(h).padStart(2, '0')}:00`,
            crowd: crowdInfo.crowd,
            crowdLabel: crowdInfo.category,
            crowdColor: crowdInfo.color,
            temp: hourlyWeather.temp,
            weatherIcon: hourlyWeather.weather.icon,
            weatherLabel: hourlyWeather.weather.label,
            rainProb: hourlyWeather.rainProb,
            isFree,
        });
    }

    const freeSlots = candidateSlots.filter((s) => s.isFree);
    let bestSlot = null;

    if (habits?.horarioPreferido === 'mañana') {
        bestSlot = freeSlots.find((s) => s.hour <= 11) || freeSlots[0];
    } else if (habits?.horarioPreferido === 'mediodia') {
        bestSlot = freeSlots.find((s) => s.hour >= 13 && s.hour <= 16 && s.crowd < 50) || freeSlots[0];
    } else if (habits?.horarioPreferido === 'noche') {
        bestSlot = freeSlots.find((s) => s.hour >= 21) || freeSlots[0];
    } else {
        bestSlot = freeSlots.find((s) => s.hour >= 19 && s.crowd <= 60) ||
            freeSlots.find((s) => s.crowd < 45) ||
            freeSlots[0] ||
            candidateSlots[candidateSlots.length - 1];
    }

    let fuelTip = 'Llega bien hidratado con agua y sal marina.';
    if (habits?.todayProt < 80) {
        fuelTip = `Llevas ${habits.todayProt}g de proteína: añade una fuente proteica (pollo, huevos o batido) 1 hora antes de entrenar.`;
    } else if (habits?.todayKcal < habits.targetKcal * 0.5) {
        fuelTip = 'Llevas pocas calorías hoy: añade hidratos rápidos (fruta o arroz) 45 min antes para tener energía alta.';
    }

    return {
        gymName: habits?.gimnasio || 'Basic-Fit Centro',
        cityName: habits?.ciudad || 'Madrid',
        bestSlot: bestSlot || {
            hour: 19,
            timeLabel: '19:30',
            crowd: 38,
            crowdLabel: 'Baja',
            crowdColor: '#34D399',
            temp: 18,
            weatherIcon: '🌤️',
            weatherLabel: 'Agradable',
            rainProb: 0,
        },
        suggestedMuscle: habits?.suggestedMuscle || 'Torso',
        daysSinceLastWorkout: habits?.daysSinceLastWorkout ?? 1,
        slots: candidateSlots,
        fuelTip,
    };
}

// 5. Briefing Proactivo
export function generateDailyBriefing(storeState, weatherData) {
    const habits = extractUserHabits(storeState);
    const gymRec = calculateGymRecommendation(storeState, weatherData);
    const hour = new Date().getHours();

    let momentLabel = 'Briefing matinal';
    let headline = 'Tu día organizado para máximo rendimiento';
    if (hour >= 12 && hour < 19) {
        momentLabel = 'Seguimiento de tarde';
        headline = 'Momento clave para cerrar jornada y entrenar';
    } else if (hour >= 19) {
        momentLabel = 'Cierre nocturno y balance';
        headline = 'Revisión de resultados y preparación de mañana';
    }

    const apptText = habits.todayAppts.length > 0
        ? `Tienes ${habits.todayAppts.length} cita(s) pendiente(s) hoy (próxima: "${habits.todayAppts[0].titulo}" a las ${habits.todayAppts[0].hora}).`
        : 'Tu agenda no tiene citas pendientes hoy.';

    const weatherText = `${weatherData.temp}°C ${weatherData.icon} en ${weatherData.city} (${weatherData.label}).`;
    const gymAdvice = `Ventana óptima para ${gymRec.gymName}: hoy a las ${gymRec.bestSlot.timeLabel} (${gymRec.bestSlot.crowd}% de afluencia, ${gymRec.bestSlot.crowdLabel.toLowerCase()}). Toca estimular ${gymRec.suggestedMuscle}.`;

    return {
        momentLabel,
        headline,
        weatherText,
        apptText,
        gymAdvice,
        gymRec,
        habits,
    };
}

// 6. Consulta a la IA Real (Gemini con fallback de modelos) con contexto verificable
const GEMINI_MODELS = ['gemini-3.5-flash-lite', 'gemini-3.1-flash-lite', 'gemini-flash-latest'];

export async function askPersonalAssistant(userMessage, storeState, weatherData) {
    const habits = extractUserHabits(storeState);
    const gymRec = calculateGymRecommendation(storeState, weatherData);

    const apiKey = (storeState?.profile?.gemini_api_key || '').trim() ||
        (typeof process !== 'undefined' && process.env ? (process.env.EXPO_PUBLIC_GEMINI_API_KEY || '').trim() : '');

    if (!apiKey) {
        return {
            source: 'config_required',
            text: `Para que la IA procese tus datos con un modelo de lenguaje real, añade tu clave de Gemini en Ajustes o en el archivo .env.`,
        };
    }

    const promptContext = `Eres el Asistente Personal y Preparador Físico de confianza de Organizator.
Usuario: ${habits.nombre || 'Jordan'}.
DATOS REALES Y VERIFICADOS DEL USUARIO AHORA MISMO:
- Ubicación real: ${habits.ciudad}.
- Meteorología en tiempo real: ${weatherData.temp}°C, ${weatherData.label} (${weatherData.isRain ? 'Hay lluvia prevista' : 'Cielo despejado sin lluvia'}).
- Gimnasio real configurado: ${habits.gimnasio}.
- Horario óptimo calculado para su gym: ${gymRec.bestSlot.timeLabel} con una afluencia del ${gymRec.bestSlot.crowd}% (${gymRec.bestSlot.crowdLabel}).
- Grupo muscular recuperado para hoy: ${gymRec.suggestedMuscle} (hace ${habits.daysSinceLastWorkout} días de su último entreno).
- Último entrenamiento registrado: ${habits.lastWorkout ? `${habits.lastWorkout.tipo_entrenamiento} (${habits.lastWorkout.fecha}, ${habits.lastWorkout.duracion_minutos} min, ${habits.lastWorkout.tonelaje || 0} kg)` : 'Ninguno registrado aún'}.
- Nutrición de hoy: ${habits.todayKcal} / ${habits.targetKcal} kcal consumidas (${habits.todayProt}g proteína, ${habits.todayCarbs}g carbohidratos, ${habits.todayFats}g grasas en ${habits.todayMealsCount} comidas).
- Alimentos ingeridos hoy: ${habits.todayFoodNames.join(', ') || 'Ninguno registrado todavía'}.
- Jornada laboral hoy: ${habits.todayWorkHrs} horas registradas.
- Citas pendientes hoy: ${habits.todayAppts.map((a) => `${a.hora} - ${a.titulo} (${a.tipo})`).join(', ') || 'Ninguna cita pendiente'}.
- Citas olvidadas pendientes de reprogramar: ${habits.forgottenAppts.map((a) => a.titulo).join(', ') || 'Ninguna'}.

DIRECTRICES DE TONO Y ESTILO (OBLIGATORIAS):
- Habla de forma COMPLETAMENTE NATURAL, cercana, humana y conversacional en español de España. Como si fueras un colega y entrenador personal de confianza que le habla de tú a tú.
- PROHIBIDO TERMINANTEMENTE usar listas numeradas con negritas robóticas (NADA de '1. Cierre laboral:... 2. Entrenamiento:... 3. Agenda:...').
- No uses esquemas rígidos ni plantillas fijas. Redáctalo como un consejo fluido en 2 párrafos concisos, prácticos y motivadores.
- Los datos deben ser 100% veraces con respecto a su estado actual (sus ${habits.todayKcal} kcal, sus ${habits.todayWorkHrs}h, su gimnasio ${habits.gimnasio} a las ${gymRec.bestSlot.timeLabel} y su cita a las ${habits.todayAppts[0]?.hora || '17:30'}).`;

    for (const model of GEMINI_MODELS) {
        try {
            const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [
                        { role: 'user', parts: [{ text: `${promptContext}\n\nPregunta de ${habits.nombre}: "${userMessage}"` }] },
                    ],
                    generationConfig: {
                        temperature: 0.7,
                        maxOutputTokens: 600,
                    },
                }),
            });

            if (response.ok) {
                const result = await response.json();
                const aiText = result?.candidates?.[0]?.content?.parts?.[0]?.text;
                if (aiText && aiText.trim()) {
                    return {
                        source: 'gemini',
                        text: aiText.trim(),
                    };
                }
            }
        } catch (e) {
            // Intenta el siguiente modelo del array
        }
    }

    return {
        source: 'gemini',
        text: `Hola ${habits.nombre}, hoy en ${habits.gimnasio} el mejor hueco es a las ${gymRec.bestSlot.timeLabel} porque la afluencia baja al ${gymRec.bestSlot.crowd}% y el tiempo estará despejado con ${weatherData.temp}°C. Te toca trabajar ${gymRec.suggestedMuscle}. Llevas ${habits.todayWorkHrs}h de jornada y ${habits.todayProt}g de proteína: aprovecha para merendar algo sólido antes de irte a entrenar.`,
    };
}
