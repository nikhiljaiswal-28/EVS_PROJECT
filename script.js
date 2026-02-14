/* ==========================================
   AIRPULSE - COMPLETE JAVASCRIPT
   Professional Air Quality Monitor
   Version 6.0.0 - Complete Edition
   ========================================== */

// ==========================================
// CONFIGURATION
// ==========================================
const CONFIG = {
    API_KEY: 'f7618e66e4b549ed214664ce91f8e870',
    BASE_URL: 'https://api.openweathermap.org/data/2.5/air_pollution',
    GEO_URL: 'https://api.openweathermap.org/geo/1.0/direct',
    WEATHER_URL: 'https://api.openweathermap.org/data/2.5/weather',
    FORECAST_URL: 'https://api.openweathermap.org/data/2.5/air_pollution/forecast',
    HISTORY_URL: 'https://api.openweathermap.org/data/2.5/air_pollution/history'
};

// Indian Cities Database
const INDIAN_CITIES = [
    'Mumbai', 'Delhi', 'Bangalore', 'Hyderabad', 'Ahmedabad', 'Chennai',
    'Kolkata', 'Pune', 'Jaipur', 'Surat', 'Lucknow', 'Kanpur',
    'Nagpur', 'Indore', 'Thane', 'Bhopal', 'Visakhapatnam', 'Patna',
    'Vadodara', 'Ghaziabad', 'Ludhiana', 'Agra', 'Nashik', 'Faridabad',
    'Meerut', 'Rajkot', 'Varanasi', 'Srinagar', 'Aurangabad', 'Dhanbad',
    'Amritsar', 'Allahabad', 'Ranchi', 'Howrah', 'Coimbatore', 'Jabalpur',
    'Gwalior', 'Vijayawada', 'Jodhpur', 'Madurai', 'Raipur', 'Kota',
    'Chandigarh', 'Guwahati', 'Solapur', 'Mysore', 'Tiruchirappalli'
];

// ==========================================
// STATE MANAGEMENT
// ==========================================
const appState = {
    currentCity: null,
    favorites: JSON.parse(localStorage.getItem('favorites')) || [],
    theme: localStorage.getItem('theme') || 'light',
    comparisonCities: [],
    aqiHistory: [],
    map: null,
    charts: {}
};

// ==========================================
// AIRPULSE SAFETY FEATURES
// ==========================================
let currentSafetyGroup = 'children';
let currentSafetyAqi = null;

// ==========================================
// UTILITY FUNCTIONS
// ==========================================

function showLoader(text = 'Loading...') {
    const loader = document.getElementById('loader');
    const loaderText = document.getElementById('loaderText');
    if (loader) {
        if (loaderText) loaderText.textContent = text;
        loader.classList.add('show');
    }
}

function hideLoader() {
    const loader = document.getElementById('loader');
    if (loader) loader.classList.remove('show');
}

function showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    if (!container) return;
    
    const toast = document.createElement('div');
    toast.className = `toast ${type} animate__animated animate__fadeInRight`;
    
    const icons = {
        success: 'fa-check-circle',
        error: 'fa-exclamation-circle',
        warning: 'fa-exclamation-triangle',
        info: 'fa-info-circle'
    };
    
    toast.innerHTML = `
        <i class="fas ${icons[type]}"></i>
        <span>${message}</span>
    `;
    
    container.appendChild(toast);
    
    setTimeout(() => {
        toast.classList.remove('animate__fadeInRight');
        toast.classList.add('animate__fadeOutRight');
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}

function updateDateTime() {
    const now = new Date();
    const timeElement = document.getElementById('currentTime');
    const dateElement = document.getElementById('currentDate');
    
    if (timeElement) {
        timeElement.textContent = now.toLocaleTimeString('en-IN', {
            hour: '2-digit',
            minute: '2-digit'
        });
    }
    
    if (dateElement) {
        dateElement.textContent = now.toLocaleDateString('en-IN', {
            weekday: 'short',
            month: 'short',
            day: 'numeric'
        });
    }
}

// ==========================================
// AQI CALCULATION FUNCTIONS
// ==========================================

function linearScale(value, inMin, inMax, outMin, outMax) {
    if (value <= inMin) return outMin;
    if (value >= inMax) return outMax;
    return Math.round(((value - inMin) / (inMax - inMin)) * (outMax - outMin) + outMin);
}

function calcPM25AQI(pm25) {
    if (pm25 <= 12.0) return linearScale(pm25, 0, 12.0, 0, 50);
    if (pm25 <= 35.4) return linearScale(pm25, 12.1, 35.4, 51, 100);
    if (pm25 <= 55.4) return linearScale(pm25, 35.5, 55.4, 101, 150);
    if (pm25 <= 150.4) return linearScale(pm25, 55.5, 150.4, 151, 200);
    if (pm25 <= 250.4) return linearScale(pm25, 150.5, 250.4, 201, 300);
    if (pm25 <= 350.4) return linearScale(pm25, 250.5, 350.4, 301, 400);
    if (pm25 <= 500.4) return linearScale(pm25, 350.5, 500.4, 401, 500);
    return 500;
}

function calcPM10AQI(pm10) {
    if (pm10 <= 54) return linearScale(pm10, 0, 54, 0, 50);
    if (pm10 <= 154) return linearScale(pm10, 55, 154, 51, 100);
    if (pm10 <= 254) return linearScale(pm10, 155, 254, 101, 150);
    if (pm10 <= 354) return linearScale(pm10, 255, 354, 151, 200);
    if (pm10 <= 424) return linearScale(pm10, 355, 424, 201, 300);
    if (pm10 <= 504) return linearScale(pm10, 425, 504, 301, 400);
    if (pm10 <= 604) return linearScale(pm10, 505, 604, 401, 500);
    return 500;
}

function calcO3AQI(o3) {
    const o3ppb = o3 * 0.5;
    if (o3ppb <= 54) return linearScale(o3ppb, 0, 54, 0, 50);
    if (o3ppb <= 70) return linearScale(o3ppb, 55, 70, 51, 100);
    if (o3ppb <= 85) return linearScale(o3ppb, 71, 85, 101, 150);
    if (o3ppb <= 105) return linearScale(o3ppb, 86, 105, 151, 200);
    if (o3ppb <= 200) return linearScale(o3ppb, 106, 200, 201, 300);
    return 300;
}

function calcNO2AQI(no2) {
    const no2ppb = no2 * 0.53;
    if (no2ppb <= 53) return linearScale(no2ppb, 0, 53, 0, 50);
    if (no2ppb <= 100) return linearScale(no2ppb, 54, 100, 51, 100);
    if (no2ppb <= 360) return linearScale(no2ppb, 101, 360, 101, 150);
    if (no2ppb <= 649) return linearScale(no2ppb, 361, 649, 151, 200);
    if (no2ppb <= 1249) return linearScale(no2ppb, 650, 1249, 201, 300);
    return 300;
}

function calculateAQI(pollutants) {
    try {
        const pm25 = pollutants.pm2_5 || 0;
        const pm10 = pollutants.pm10 || 0;
        const o3 = pollutants.o3 || 0;
        const no2 = pollutants.no2 || 0;
        
        const aqiValues = [
            calcPM25AQI(pm25),
            calcPM10AQI(pm10),
            calcO3AQI(o3),
            calcNO2AQI(no2)
        ];
        
        return Math.max(...aqiValues);
    } catch (error) {
        console.error('AQI calculation error:', error);
        return 0;
    }
}

function getAQICategory(aqi) {
    if (aqi <= 50) return { label: 'Good', class: 'good', color: '#10b981' };
    if (aqi <= 100) return { label: 'Moderate', class: 'moderate', color: '#fbbf24' };
    if (aqi <= 150) return { label: 'Unhealthy for Sensitive Groups', class: 'sensitive', color: '#fb923c' };
    if (aqi <= 200) return { label: 'Unhealthy', class: 'unhealthy', color: '#ef4444' };
    if (aqi <= 300) return { label: 'Very Unhealthy', class: 'very-unhealthy', color: '#a855f7' };
    return { label: 'Hazardous', class: 'hazardous', color: '#7f1d1d' };
}

function getHealthRecommendations(category) {
    const recommendations = {
        'good': {
            general: '✅ Perfect day to step outside! Air quality is excellent.',
            outdoor: 'Ideal conditions for exercise and outdoor sports.',
            indoor: 'No special precautions needed.'
        },
        'moderate': {
            general: '⚠️ Generally safe for most people.',
            outdoor: 'Sensitive individuals should limit prolonged outdoor exertion.',
            indoor: 'Normal indoor activities are safe.'
        },
        'sensitive': {
            general: '⚠️ Kids, seniors, and those with breathing conditions should be cautious.',
            outdoor: 'Vulnerable groups should reduce outdoor activities.',
            indoor: 'Consider closing windows if you are sensitive to air pollution.'
        },
        'unhealthy': {
            general: '❌ Everyone should limit outdoor time.',
            outdoor: 'Wear N95/N99 masks when going outside.',
            indoor: 'Keep windows closed and use air purifiers.'
        },
        'very-unhealthy': {
            general: '❌ Stay indoors - serious health risk.',
            outdoor: 'Avoid all outdoor activities. Wear N95 masks if you must go out.',
            indoor: 'Use air purifiers and keep all windows closed.'
        },
        'hazardous': {
            general: '🚫 EMERGENCY: Do NOT go outside.',
            outdoor: 'Stay indoors. Do not go outside unless absolutely necessary.',
            indoor: 'Use air purifiers, seal windows. Consider evacuation if possible.'
        }
    };
    
    return recommendations[category] || recommendations['good'];
}

// ==========================================
// API FUNCTIONS
// ==========================================

async function getCityCoordinates(cityName) {
    try {
        const url = `${CONFIG.GEO_URL}?q=${encodeURIComponent(cityName)},IN&limit=5&appid=${CONFIG.API_KEY}`;
        console.log('Fetching coordinates for:', cityName);
        
        const response = await fetch(url);
        
        if (!response.ok) {
            throw new Error(`API Error: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('Geocoding response:', data);
        
        if (!data || data.length === 0) {
            throw new Error(`City "${cityName}" not found. Please check spelling.`);
        }
        
        const indiaResult = data.find(item => item.country === 'IN') || data[0];
        
        return {
            lat: indiaResult.lat,
            lon: indiaResult.lon,
            name: indiaResult.name,
            state: indiaResult.state || '',
            country: indiaResult.country
        };
    } catch (error) {
        console.error('Geocoding error:', error);
        throw new Error(error.message || 'Unable to find city location');
    }
}

async function getAirQualityData(lat, lon) {
    try {
        const url = `${CONFIG.BASE_URL}?lat=${lat}&lon=${lon}&appid=${CONFIG.API_KEY}`;
        console.log('Fetching air quality data...');
        
        const response = await fetch(url);
        
        if (!response.ok) {
            throw new Error(`API Error: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('Air quality response:', data);
        
        if (!data || !data.list || data.list.length === 0) {
            throw new Error('No air quality data available');
        }
        
        return data;
    } catch (error) {
        console.error('Air quality fetch error:', error);
        throw new Error('Unable to fetch air quality data');
    }
}

async function getWeatherData(lat, lon) {
    try {
        const url = `${CONFIG.WEATHER_URL}?lat=${lat}&lon=${lon}&units=metric&appid=${CONFIG.API_KEY}`;
        console.log('Fetching weather data...');
        
        const response = await fetch(url);
        
        if (!response.ok) {
            throw new Error(`API Error: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('Weather response:', data);
        
        return data;
    } catch (error) {
        console.error('Weather fetch error:', error);
        throw new Error('Unable to fetch weather data');
    }
}

async function fetchCityData(cityName) {
    try {
        showLoader(`Fetching data for ${cityName}...`);
        
        const location = await getCityCoordinates(cityName);
        console.log('Location found:', location);
        
        const [airQualityData, weatherData] = await Promise.all([
            getAirQualityData(location.lat, location.lon),
            getWeatherData(location.lat, location.lon)
        ]);
        
        const pollutants = airQualityData.list[0].components;
        const aqi = calculateAQI(pollutants);
        const category = getAQICategory(aqi);
        
        const cityData = {
            name: location.name,
            state: location.state,
            country: location.country,
            coordinates: {
                lat: location.lat,
                lon: location.lon
            },
            aqi: aqi,
            category: category,
            pollutants: {
                pm2_5: pollutants.pm2_5 || 0,
                pm10: pollutants.pm10 || 0,
                o3: pollutants.o3 || 0,
                no2: pollutants.no2 || 0,
                so2: pollutants.so2 || 0,
                co: pollutants.co || 0
            },
            weather: {
                temp: Math.round(weatherData.main.temp),
                feelsLike: Math.round(weatherData.main.feels_like),
                humidity: weatherData.main.humidity,
                windSpeed: Math.round(weatherData.wind.speed * 3.6),
                pressure: weatherData.main.pressure,
                description: weatherData.weather[0].description
            },
            timestamp: new Date()
        };
        
        hideLoader();
        console.log('City data processed:', cityData);
        return cityData;
        
    } catch (error) {
        hideLoader();
        console.error('Fetch city data error:', error);
        throw error;
    }
}

// ==========================================
// UI UPDATE FUNCTIONS
// ==========================================

function updateGaugeProgress(aqi, color) {
    const gaugeProgress = document.getElementById('gaugeProgress');
    if (!gaugeProgress) return;
    
    const radius = 80;
    const circumference = 2 * Math.PI * radius;
    const percentage = Math.min(aqi / 500, 1);
    const offset = circumference - (percentage * circumference);
    
    const gradient = document.querySelector('#gaugeGradient stop:first-child');
    const gradient2 = document.querySelector('#gaugeGradient stop:last-child');
    if (gradient && gradient2) {
        gradient.style.stopColor = color;
        gradient2.style.stopColor = color;
    }
    
    gaugeProgress.style.strokeDashoffset = offset;
    gaugeProgress.style.stroke = color;
}

function displayCityData(cityData) {
    try {
        console.log('Displaying city data:', cityData);
        
        const dashboard = document.getElementById('aqiDashboard');
        if (dashboard) {
            dashboard.style.display = 'block';
            dashboard.classList.add('animate__animated', 'animate__fadeIn');
        }
        
        const cityName = document.getElementById('cityName');
        const cityState = document.getElementById('cityState');
        if (cityName) cityName.textContent = cityData.name;
        if (cityState) cityState.textContent = cityData.state || 'India';
        
        const aqiValue = document.getElementById('aqiValue');
        const aqiStatus = document.getElementById('aqiStatus');
        if (aqiValue) aqiValue.textContent = cityData.aqi;
        if (aqiStatus) {
            aqiStatus.textContent = cityData.category.label;
            aqiStatus.className = `aqi-status ${cityData.category.class}`;
            aqiStatus.style.background = `${cityData.category.color}20`;
            aqiStatus.style.color = cityData.category.color;
            aqiStatus.style.border = `2px solid ${cityData.category.color}`;
        }
        
        updateGaugeProgress(cityData.aqi, cityData.category.color);
        
        const elements = {
            'temp': cityData.weather.temp,
            'humidity': cityData.weather.humidity,
            'wind': cityData.weather.windSpeed,
            'pm25Main': cityData.pollutants.pm2_5.toFixed(1)
        };
        
        Object.keys(elements).forEach(id => {
            const el = document.getElementById(id);
            if (el) el.textContent = elements[id];
        });
        
        const pollutants = {
            'pm25': cityData.pollutants.pm2_5.toFixed(1),
            'pm10': cityData.pollutants.pm10.toFixed(1),
            'o3': cityData.pollutants.o3.toFixed(1),
            'no2': cityData.pollutants.no2.toFixed(1)
        };
        
        Object.keys(pollutants).forEach(id => {
            const el = document.getElementById(id);
            if (el) el.textContent = pollutants[id];
            
            const progressBar = document.getElementById(`${id}Progress`);
            if (progressBar) {
                const maxValue = id === 'pm25' ? 250 : id === 'pm10' ? 430 : id === 'o3' ? 240 : 200;
                const percentage = Math.min((parseFloat(pollutants[id]) / maxValue) * 100, 100);
                progressBar.style.width = `${percentage}%`;
            }
        });
        
        const advice = getHealthRecommendations(cityData.category.class);
        const adviceGeneral = document.getElementById('adviceGeneral');
        const adviceOutdoor = document.getElementById('adviceOutdoor');
        const adviceIndoor = document.getElementById('adviceIndoor');
        
        if (adviceGeneral) adviceGeneral.textContent = advice.general;
        if (adviceOutdoor) adviceOutdoor.textContent = advice.outdoor;
        if (adviceIndoor) adviceIndoor.textContent = advice.indoor;
        
        updatePollutantChart(cityData.pollutants);
        
        appState.currentCity = cityData;
        
        appState.aqiHistory.push({
            city: cityData.name,
            aqi: cityData.aqi,
            timestamp: new Date()
        });
        
        updateFavoriteButton();
        checkAlerts(cityData);
        
        setTimeout(() => {
            dashboard?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 100);
        
        showToast(`Data loaded for ${cityData.name} successfully!`, 'success');

        // ── Dynamic browser tab title ──────────────────────────────
        const aqiEmoji = cityData.aqi <= 50  ? '🟢' :
                         cityData.aqi <= 100 ? '🟡' :
                         cityData.aqi <= 150 ? '🟠' :
                         cityData.aqi <= 200 ? '🔴' :
                         cityData.aqi <= 300 ? '🟣' : '💀';
        document.title = `${aqiEmoji} ${cityData.name} — AQI ${cityData.aqi} | AirPulse`;
        // ──────────────────────────────────────────────────────────
        
        // CRITICAL: Update safety tab
        updateSafetyTab(cityData.aqi);

        // Refresh new tabs if they're currently active
        refreshNewTabsOnCityLoad();

        // Update map marker if map is already loaded
        if (appState.map) {
            addCityMarkerToMap(cityData);
            appState.map.setView([cityData.coordinates.lat, cityData.coordinates.lon], 10);
        }

        // Update trends chart if Trends tab is active
        const trendsSection = document.getElementById('trendsSection');
        if (trendsSection && trendsSection.classList.contains('active')) {
            loadTrendsSection();
        }
        
    } catch (error) {
        console.error('Display error:', error);
        showToast('Error displaying data', 'error');
    }
}

function updatePollutantChart(pollutants) {
    const canvas = document.getElementById('pollutantChart');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    
    if (appState.charts.pollutant) {
        appState.charts.pollutant.destroy();
    }
    
    appState.charts.pollutant = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['PM2.5', 'PM10', 'O₃', 'NO₂', 'SO₂', 'CO'],
            datasets: [{
                label: 'Concentration (µg/m³)',
                data: [
                    pollutants.pm2_5,
                    pollutants.pm10,
                    pollutants.o3,
                    pollutants.no2,
                    pollutants.so2,
                    pollutants.co / 1000
                ],
                backgroundColor: [
                    'rgba(239, 68, 68, 0.8)',
                    'rgba(251, 146, 60, 0.8)',
                    'rgba(251, 191, 36, 0.8)',
                    'rgba(59, 130, 246, 0.8)',
                    'rgba(168, 85, 247, 0.8)',
                    'rgba(99, 102, 241, 0.8)'
                ],
                borderColor: [
                    'rgb(239, 68, 68)',
                    'rgb(251, 146, 60)',
                    'rgb(251, 191, 36)',
                    'rgb(59, 130, 246)',
                    'rgb(168, 85, 247)',
                    'rgb(99, 102, 241)'
                ],
                borderWidth: 2,
                borderRadius: 8
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    padding: 12,
                    titleFont: { size: 14, weight: 'bold' },
                    bodyFont: { size: 13 },
                    callbacks: {
                        label: function(context) {
                            let label = context.parsed.y.toFixed(2);
                            if (context.dataIndex === 5) {
                                label += ' mg/m³';
                            } else {
                                label += ' µg/m³';
                            }
                            return label;
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: {
                        color: 'rgba(0, 0, 0, 0.05)'
                    }
                },
                x: {
                    grid: {
                        display: false
                    }
                }
            }
        }
    });
}

// Continuing in next part due to character limit...

// ==========================================
// CITY SELECTION
// ==========================================

async function selectCity(cityName) {
    try {
        console.log('Selecting city:', cityName);
        const cityData = await fetchCityData(cityName);
        displayCityData(cityData);
    } catch (error) {
        console.error('Select city error:', error);
        showToast(error.message || `Unable to fetch data for ${cityName}`, 'error');
    }
}

// ==========================================
// AUTO LOCATION DETECTION
// ==========================================

async function detectUserLocation() {
    if (!navigator.geolocation) {
        showToast('Geolocation is not supported by your browser', 'error');
        return;
    }
    
    showLoader('Detecting your location...');
    
    const options = {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
    };
    
    navigator.geolocation.getCurrentPosition(
        async (position) => {
            try {
                console.log('Location detected:', position.coords);
                const lat = position.coords.latitude;
                const lon = position.coords.longitude;
                
                showLoader('Fetching air quality data...');
                
                const [airQualityData, weatherData] = await Promise.all([
                    getAirQualityData(lat, lon),
                    getWeatherData(lat, lon)
                ]);
                
                const pollutants = airQualityData.list[0].components;
                const aqi = calculateAQI(pollutants);
                const category = getAQICategory(aqi);
                
                const locationData = {
                    name: weatherData.name || 'Your Location',
                    state: '',
                    country: weatherData.sys.country || 'IN',
                    coordinates: { lat, lon },
                    aqi: aqi,
                    category: category,
                    pollutants: {
                        pm2_5: pollutants.pm2_5 || 0,
                        pm10: pollutants.pm10 || 0,
                        o3: pollutants.o3 || 0,
                        no2: pollutants.no2 || 0,
                        so2: pollutants.so2 || 0,
                        co: pollutants.co || 0
                    },
                    weather: {
                        temp: Math.round(weatherData.main.temp),
                        feelsLike: Math.round(weatherData.main.feels_like),
                        humidity: weatherData.main.humidity,
                        windSpeed: Math.round(weatherData.wind.speed * 3.6),
                        pressure: weatherData.main.pressure
                    },
                    timestamp: new Date()
                };
                
                hideLoader();
                displayLocationData(locationData);
                
                if (document.getElementById('dashboardSection').classList.contains('active')) {
                    displayCityData(locationData);
                }
                
                showToast('Location detected successfully!', 'success');
                
            } catch (error) {
                hideLoader();
                console.error('Location data error:', error);
                showToast('Failed to fetch air quality data', 'error');
            }
        },
        (error) => {
            hideLoader();
            console.error('Geolocation error:', error);
            
            let message = 'Failed to detect location. ';
            switch(error.code) {
                case error.PERMISSION_DENIED:
                    message += 'Please allow location access.';
                    break;
                case error.POSITION_UNAVAILABLE:
                    message += 'Location information unavailable.';
                    break;
                case error.TIMEOUT:
                    message += 'Request timed out.';
                    break;
                default:
                    message += 'Unknown error occurred.';
            }
            
            showToast(message, 'error');
        },
        options
    );
}

function displayLocationData(data) {
    const container = document.getElementById('locationData');
    if (!container) return;
    
    const category = getAQICategory(data.aqi);
    const advice = getHealthRecommendations(category.class);
    
    container.innerHTML = `
        <div class="city-info-card animate__animated animate__fadeInUp" style="margin-top: 2rem;">
            <div class="city-header">
                <div class="city-details">
                    <h2 class="city-name">${data.name}</h2>
                    <p class="city-location">
                        <i class="fas fa-map-marker-alt"></i>
                        Lat: ${data.coordinates.lat.toFixed(4)}, Lon: ${data.coordinates.lon.toFixed(4)}
                    </p>
                </div>
                <div class="city-actions">
                    <span class="aqi-status ${category.class}" style="background: ${category.color}20; color: ${category.color}; border: 2px solid ${category.color};">
                        ${category.label}
                    </span>
                </div>
            </div>
            
            <div class="aqi-main-display">
                <div class="aqi-gauge">
                    <div style="text-align: center;">
                        <div style="font-size: 5rem; font-weight: 900; color: ${category.color}; margin-bottom: 1rem;">${data.aqi}</div>
                        <div style="font-size: 1.25rem; color: var(--text-secondary); font-weight: 600;">AQI</div>
                    </div>
                </div>
                
                <div class="weather-stats">
                    <div class="stat-item">
                        <div class="stat-icon" style="background: linear-gradient(135deg, #f59e0b, #d97706);"><i class="fas fa-temperature-high"></i></div>
                        <div class="stat-content"><div class="stat-label">Temperature</div><div class="stat-value">${data.weather.temp}°C</div></div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-icon" style="background: linear-gradient(135deg, #3b82f6, #2563eb);"><i class="fas fa-tint"></i></div>
                        <div class="stat-content"><div class="stat-label">Humidity</div><div class="stat-value">${data.weather.humidity}%</div></div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-icon" style="background: linear-gradient(135deg, #10b981, #059669);"><i class="fas fa-wind"></i></div>
                        <div class="stat-content"><div class="stat-label">Wind Speed</div><div class="stat-value">${data.weather.windSpeed} km/h</div></div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-icon" style="background: linear-gradient(135deg, #a855f7, #9333ea);"><i class="fas fa-smog"></i></div>
                        <div class="stat-content"><div class="stat-label">PM2.5</div><div class="stat-value">${data.pollutants.pm2_5.toFixed(1)}</div></div>
                    </div>
                </div>
            </div>
            
            <div class="pollutants-grid" style="margin-top: 2rem;">
                <div class="pollutant-card">
                    <div class="pollutant-header">
                        <div class="pollutant-icon" style="background: linear-gradient(135deg, #ef4444, #dc2626);"><i class="fas fa-smog"></i></div>
                        <div class="pollutant-info"><h4>PM2.5</h4><p>Fine Particles</p></div>
                    </div>
                    <div class="pollutant-value">${data.pollutants.pm2_5.toFixed(1)} <span class="unit">µg/m³</span></div>
                </div>
                <div class="pollutant-card">
                    <div class="pollutant-header">
                        <div class="pollutant-icon" style="background: linear-gradient(135deg, #fb923c, #f97316);"><i class="fas fa-cloud"></i></div>
                        <div class="pollutant-info"><h4>PM10</h4><p>Coarse Particles</p></div>
                    </div>
                    <div class="pollutant-value">${data.pollutants.pm10.toFixed(1)} <span class="unit">µg/m³</span></div>
                </div>
                <div class="pollutant-card">
                    <div class="pollutant-header">
                        <div class="pollutant-icon" style="background: linear-gradient(135deg, #fbbf24, #f59e0b);"><i class="fas fa-sun"></i></div>
                        <div class="pollutant-info"><h4>O₃</h4><p>Ozone</p></div>
                    </div>
                    <div class="pollutant-value">${data.pollutants.o3.toFixed(1)} <span class="unit">µg/m³</span></div>
                </div>
                <div class="pollutant-card">
                    <div class="pollutant-header">
                        <div class="pollutant-icon" style="background: linear-gradient(135deg, #3b82f6, #2563eb);"><i class="fas fa-car"></i></div>
                        <div class="pollutant-info"><h4>NO₂</h4><p>Nitrogen Dioxide</p></div>
                    </div>
                    <div class="pollutant-value">${data.pollutants.no2.toFixed(1)} <span class="unit">µg/m³</span></div>
                </div>
            </div>
            
            <div class="health-advisory" style="margin-top: 2rem;">
                <h3 class="section-title"><i class="fas fa-shield-alt"></i>Health Advisory</h3>
                <div class="advisory-cards">
                    <div class="advisory-card">
                        <div class="advisory-icon"><i class="fas fa-users"></i></div>
                        <div class="advisory-content"><h4>General Population</h4><p>${advice.general}</p></div>
                    </div>
                    <div class="advisory-card">
                        <div class="advisory-icon"><i class="fas fa-running"></i></div>
                        <div class="advisory-content"><h4>Outdoor Activities</h4><p>${advice.outdoor}</p></div>
                    </div>
                    <div class="advisory-card">
                        <div class="advisory-icon"><i class="fas fa-home"></i></div>
                        <div class="advisory-content"><h4>Indoor Safety</h4><p>${advice.indoor}</p></div>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    container.style.display = 'block';
    container.classList.add('animate__animated', 'animate__fadeIn');
}

// ==========================================
// FAVORITES MANAGEMENT
// ==========================================

function saveFavorites() {
    localStorage.setItem('favorites', JSON.stringify(appState.favorites));
}

function addToFavorites(cityData) {
    const exists = appState.favorites.some(f => 
        f.name.toLowerCase() === cityData.name.toLowerCase()
    );
    
    if (exists) {
        showToast(`${cityData.name} is already in favorites`, 'info');
        return;
    }
    
    appState.favorites.push(cityData);
    saveFavorites();
    updateFavoritesDisplay();
    updateFavoriteButton();
    showToast(`${cityData.name} added to favorites!`, 'success');
}

function removeFromFavorites(cityName) {
    appState.favorites = appState.favorites.filter(f => f.name !== cityName);
    saveFavorites();
    updateFavoritesDisplay();
    updateFavoriteButton();
    showToast(`${cityName} removed from favorites`, 'info');
}

function updateFavoritesDisplay() {
    const container = document.getElementById('favoritesGrid');
    if (!container) return;
    
    if (appState.favorites.length === 0) {
        container.innerHTML = `
            <div style="grid-column: 1/-1; text-align: center; padding: 4rem 2rem;">
                <i class="fas fa-star" style="font-size: 4rem; color: var(--text-muted); opacity: 0.3; margin-bottom: 1rem;"></i>
                <h3 style="color: var(--text-secondary); margin-bottom: 0.5rem;">No Saved Cities</h3>
                <p style="color: var(--text-muted);">Add cities to quickly access their AQI data</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = appState.favorites.map(city => {
        const category = getAQICategory(city.aqi);
        return `
            <div class="favorite-card animate__animated animate__fadeInUp" onclick="selectCity('${city.name}')">
                <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 1.5rem;">
                    <div>
                        <h4 style="margin: 0; font-size: 1.25rem;">${city.name}</h4>
                        <p style="color: var(--text-muted); font-size: 0.875rem; margin: 0.25rem 0 0 0;">
                            <i class="fas fa-map-marker-alt"></i> ${city.state || 'India'}
                        </p>
                    </div>
                    <button class="action-icon-btn" onclick="event.stopPropagation(); removeFromFavorites('${city.name}')" 
                            style="background: rgba(239, 68, 68, 0.1); color: var(--danger);">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
                <div style="display: flex; justify-content: space-between; align-items: end;">
                    <div>
                        <div style="font-size: 3rem; font-weight: 900; color: ${category.color}; line-height: 1;">${city.aqi}</div>
                        <div style="font-size: 0.875rem; color: var(--text-muted); margin-top: 0.5rem;">${category.label}</div>
                    </div>
                    <div style="text-align: right; font-size: 0.875rem; color: var(--text-secondary);">
                        <div style="margin-bottom: 0.5rem;"><i class="fas fa-smog"></i> PM2.5: ${city.pollutants.pm2_5.toFixed(1)}</div>
                        <div><i class="fas fa-temperature-high"></i> ${city.weather.temp}°C</div>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

function updateFavoriteButton() {
    const btn = document.getElementById('favoriteBtn');
    if (!btn || !appState.currentCity) return;
    
    const isFavorite = appState.favorites.some(f => 
        f.name.toLowerCase() === appState.currentCity.name.toLowerCase()
    );
    
    const icon = btn.querySelector('i');
    if (icon) {
        icon.className = isFavorite ? 'fas fa-heart' : 'far fa-heart';
    }
    btn.style.color = isFavorite ? 'var(--danger)' : '';
}

// ==========================================
// NAVIGATION
// ==========================================

function switchTab(tabName) {
    console.log('Switching to tab:', tabName);
    
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
    });
    const activeNav = document.querySelector(`[data-tab="${tabName}"]`);
    if (activeNav) activeNav.classList.add('active');
    
    document.querySelectorAll('.content-section').forEach(section => {
        section.classList.remove('active');
    });
    const activeSection = document.getElementById(`${tabName}Section`);
    if (activeSection) {
        activeSection.classList.add('active');
        activeSection.classList.add('animate__animated', 'animate__fadeIn');
    }
    
    switch(tabName) {
        case 'cities':
            loadCitiesExplorer();
            break;
        case 'comparison':
            loadComparisonSection();
            break;
        case 'trends':
            loadTrendsSection();
            break;
        case 'map':
            loadMapSection();
            break;
        case 'alerts':
            loadAlertsSection();
            break;
        case 'rankings':
            loadRankingsSection();
            break;
        case 'forecast':
            loadForecastSection();
            break;
        case 'sources':
            loadSourcesSection();
            break;
        case 'reportcard':
            loadReportCard();
            break;
    }
}

// Continuing in final part...

// ==========================================
// AIRPULSE SAFETY GUIDE FUNCTIONS
// ==========================================

function initSafetyTabs() {
    const safetyTabs = document.querySelectorAll('.safety-tab');
    
    safetyTabs.forEach(tab => {
        tab.addEventListener('click', function() {
            safetyTabs.forEach(t => t.classList.remove('active'));
            this.classList.add('active');
            
            currentSafetyGroup = this.dataset.group;
            
            if (currentSafetyAqi !== null) {
                loadSafetyGuidelines(currentSafetyGroup, currentSafetyAqi);
            }
        });
    });
    
    console.log('Safety tabs initialized');
}

// ---- Embedded safety data (mirrors Flask Config.AGE_GROUP_SAFETY) ----
const AGE_GROUP_SAFETY = {
    children: {
        name: 'Protecting Our Kids (0-12)',
        icon: 'fa-child',
        color: '#3b82f6',
        description: 'Children breathe faster and their lungs are still developing — they need extra protection from air pollution.',
        guidelines: {
            good:        { outdoor_activities: '✅ Perfect for outdoor play and sports', precautions: 'No restrictions — let kids enjoy the fresh air!', recommendations: ['Great day for park visits and playground fun', 'School sports and PE classes are perfectly safe', 'Encourage outdoor activities — it\'s healthy!', 'Perfect time for cycling, running, and games', 'Fresh air is great for growing lungs'] },
            moderate:    { outdoor_activities: '✅ Generally safe — just watch for sensitive kids', precautions: 'Keep an eye on children with asthma or allergies', recommendations: ['Outdoor play is fine for most children', 'Kids with asthma should have their inhaler nearby', 'Reduce high-intensity games during peak pollution hours', 'Take breaks if your child seems uncomfortable', 'Stay hydrated during outdoor activities', 'Watch for coughing or unusual tiredness'] },
            sensitive:   { outdoor_activities: '⚠️ Limit outdoor playtime to 1–2 hours', precautions: 'Children with breathing issues should stay inside when possible', recommendations: ['Keep outdoor play short — under 2 hours is best', 'Skip intense sports — choose calmer activities', 'Indoor games are a better choice today', 'Have rescue medications ready and accessible', 'Watch closely for coughing or wheezing', 'Early morning has cleaner air for outdoor time'] },
            unhealthy:   { outdoor_activities: '❌ Keep kids indoors — outdoor air is harmful', precautions: 'This is serious — children should stay inside', recommendations: ['Cancel all outdoor sports and PE classes', 'Close windows at home and school', 'Run air purifiers in kids\' rooms', 'Reschedule outdoor events', 'Children with asthma must stay indoors', 'Call doctor if breathing problems develop', 'Use N95 masks if brief outdoor trips are unavoidable'] },
            very_unhealthy: { outdoor_activities: '❌ Children must stay indoors — this is very serious', precautions: 'Dangerous conditions for children — complete indoor protection needed', recommendations: ['All outdoor activities must be cancelled immediately', 'Seal all windows and doors', 'Run HEPA air purifiers continuously', 'Consider keeping children home from school', 'See a doctor immediately if breathing symptoms appear', 'Keep emergency medications within easy reach'] },
            hazardous:   { outdoor_activities: '🚫 EMERGENCY: Children must stay inside at all times', precautions: 'CRITICAL health emergency — protect children immediately', recommendations: ['Keep children indoors with zero exceptions', 'Completely seal windows and doors', 'Use high-quality HEPA air purifiers everywhere', 'Schools should be closed — keep kids home', 'Rush to hospital for any breathing difficulty (Call 102)', 'Consider evacuating to an area with cleaner air'] }
        }
    },
    elderly: {
        name: 'Caring for Seniors (65+)',
        icon: 'fa-user-clock',
        color: '#8b5cf6',
        description: 'Older adults face higher risks due to weakened immune systems and existing health conditions.',
        guidelines: {
            good:        { outdoor_activities: '✅ Enjoy your morning walk — the air is clean!', precautions: 'None needed — perfect day for outdoor activities', recommendations: ['Excellent conditions for morning walks', 'Yoga and light exercise outdoors are safe', 'Garden visits are perfectly fine', 'Socialize outdoors with confidence', 'No special precautions needed'] },
            moderate:    { outdoor_activities: '✅ Outdoor activities are generally fine', precautions: 'Take breaks and stay hydrated', recommendations: ['Morning walks are safe for most seniors', 'Carry any regular medications as usual', 'Avoid strenuous activity during peak hours', 'Stay well hydrated', 'Rest if you feel short of breath'] },
            sensitive:   { outdoor_activities: '⚠️ Limit time outdoors and take it easy', precautions: 'Seniors with heart or lung conditions should be cautious', recommendations: ['Keep outdoor time under 1–2 hours', 'Avoid strenuous exertion', 'Carry inhalers and heart medications', 'Rest frequently if outside', 'Stay in shade and avoid midday peak pollution', 'Watch for dizziness, chest tightness, or shortness of breath'] },
            unhealthy:   { outdoor_activities: '❌ Stay indoors — air quality is harmful', precautions: 'Seniors should remain indoors today', recommendations: ['Avoid all outdoor activities', 'Close windows and use air purifiers', 'Keep all medications readily accessible', 'Have emergency contact numbers visible', 'Monitor breathing and heart rate', 'Call doctor if any unusual symptoms arise'] },
            very_unhealthy: { outdoor_activities: '❌ Remain indoors — serious health risk', precautions: 'Very dangerous for seniors — do not go outside', recommendations: ['Stay completely indoors', 'Run HEPA air purifiers at all times', 'Seal windows and any air gaps', 'Have family or carers check in regularly', 'Emergency numbers: 102, 108, 112', 'Seek medical help for any respiratory symptoms'] },
            hazardous:   { outdoor_activities: '🚫 LIFE-THREATENING — stay indoors immediately', precautions: 'Emergency conditions — medical monitoring advised', recommendations: ['Do not step outside under any circumstances', 'Seal all openings to outdoor air', 'HEPA purifier must run continuously', 'Call 102 or 108 for any chest pain or breathing difficulty', 'Consider hospital admission for high-risk seniors', 'Follow all emergency health broadcasts'] }
        }
    },
    respiratory: {
        name: 'Asthma & Breathing Conditions',
        icon: 'fa-lungs',
        color: '#06b6d4',
        description: 'People with asthma, COPD, or other breathing conditions are significantly more vulnerable to air pollution.',
        guidelines: {
            good:        { outdoor_activities: '✅ Safe for most outdoor activities', precautions: 'Keep reliever inhaler with you as usual', recommendations: ['Outdoor exercise is fine today', 'Great day to enjoy fresh air', 'Maintain your usual medication routine', 'No extra precautions required'] },
            moderate:    { outdoor_activities: '⚠️ Monitor symptoms — take breaks as needed', precautions: 'Keep rescue inhaler accessible at all times', recommendations: ['Carry your rescue inhaler everywhere', 'Reduce intensity of outdoor workouts', 'Avoid outdoor activity during rush hours', 'Monitor peak flow if you track it', 'Stay hydrated'] },
            sensitive:   { outdoor_activities: '⚠️ Limit outdoor time — stay alert for symptoms', precautions: 'High-risk day — consider staying indoors', recommendations: ['Limit outdoor time to 30–60 minutes', 'Use preventive inhaler before going outside', 'Avoid triggers like dust and smoke', 'Keep all medications handy', 'Use a mask outdoors if necessary', 'Call doctor if symptoms worsen'] },
            unhealthy:   { outdoor_activities: '❌ Stay indoors — dangerous for asthma patients', precautions: 'Do not go outside without medical guidance', recommendations: ['Remain indoors all day', 'Run air purifiers and keep windows shut', 'Have nebulizer or spacer ready', 'Increase preventer medication if prescribed', 'Call doctor or emergency if severe attack occurs', 'Emergency: 102 | 108 | 112'] },
            very_unhealthy: { outdoor_activities: '❌ Do NOT go outside — emergency risk', precautions: 'Extreme danger for respiratory patients', recommendations: ['Absolutely no outdoor exposure', 'Maximum preventer medication regimen (consult doctor)', 'HEPA purifier running in all rooms', 'Have emergency medication kit ready', 'Seek immediate help for any attack', 'Consider hospital stay for severe cases'] },
            hazardous:   { outdoor_activities: '🚫 MEDICAL EMERGENCY RISK — stay indoors', precautions: 'Immediate medical supervision recommended', recommendations: ['Hospital admission may be necessary', 'Zero outdoor exposure', 'Continuous air purification', 'Emergency contacts on speed dial', 'Follow doctor\'s emergency protocol', 'Evacuate to cleaner air area if possible'] }
        }
    },
    cardiovascular: {
        name: 'Heart Health',
        icon: 'fa-heartbeat',
        color: '#ef4444',
        description: 'Heart disease patients face elevated risk — air pollution can trigger cardiac events and worsen symptoms.',
        guidelines: {
            good:        { outdoor_activities: '✅ Great day for gentle outdoor exercise', precautions: 'Continue normal medication routine', recommendations: ['Light walking and outdoor activities are safe', 'Ideal conditions for cardiac rehabilitation exercises', 'Keep all heart medications as usual', 'Stay well hydrated'] },
            moderate:    { outdoor_activities: '✅ Light activity is fine — avoid intense exertion', precautions: 'Monitor heart rate and avoid overexertion', recommendations: ['Gentle walks are acceptable', 'Avoid high-intensity cardio outdoors', 'Monitor for palpitations or chest tightness', 'Keep nitroglycerin or emergency medication handy', 'Rest if symptoms appear'] },
            sensitive:   { outdoor_activities: '⚠️ Limit outdoor time — no strenuous exercise', precautions: 'Heart patients should be extra cautious today', recommendations: ['Keep outdoor time to a minimum', 'No strenuous exercise outdoors', 'Check blood pressure before going out', 'Carry emergency heart medications', 'Watch for chest pain, dizziness, or irregular heartbeat', 'Rest indoors if possible'] },
            unhealthy:   { outdoor_activities: '❌ Stay indoors — cardiac risk elevated', precautions: 'Avoid outdoor exposure entirely', recommendations: ['Do not go outside today', 'Close all windows and use air purifiers', 'Take all heart medications as prescribed', 'Monitor blood pressure and heart rate regularly', 'Call cardiologist if any symptoms arise', 'Emergency: 102 | 108 | 112'] },
            very_unhealthy: { outdoor_activities: '❌ Serious cardiac risk — stay indoors', precautions: 'High danger for heart patients — seek medical advice', recommendations: ['Complete indoor isolation', 'HEPA air purifiers running continuously', 'Strict medication compliance', 'Telemedicine consultation recommended', 'Emergency kit fully stocked and accessible', 'Have someone stay with you today'] },
            hazardous:   { outdoor_activities: '🚫 LIFE-THREATENING — hospital care may be needed', precautions: 'Immediate medical monitoring recommended', recommendations: ['Hospital admission strongly advised for high-risk patients', 'ICU monitoring may be necessary', 'Emergency cardiac support on standby', 'Call 102 immediately for any chest pain', 'Evacuate to cleaner air area if possible', 'Maximum medical intervention protocols active'] }
        }
    }
};

function getCategoryKeyFromAqi(aqi) {
    if (aqi <= 50)  return 'good';
    if (aqi <= 100) return 'moderate';
    if (aqi <= 150) return 'sensitive';
    if (aqi <= 200) return 'unhealthy';
    if (aqi <= 300) return 'very_unhealthy';
    return 'hazardous';
}

async function loadSafetyGuidelines(group, aqi) {
    try {
        const groupData = AGE_GROUP_SAFETY[group];
        if (!groupData) throw new Error(`Unknown group: ${group}`);

        const catKey = getCategoryKeyFromAqi(aqi);
        const guidelines = groupData.guidelines[catKey];

        displaySafetyGuidelines({
            name: groupData.name,
            icon: 'fas ' + groupData.icon,
            color: groupData.color,
            description: groupData.description,
            outdoor_activities: guidelines.outdoor_activities,
            precautions: guidelines.precautions,
            recommendations: guidelines.recommendations
        });

    } catch (error) {
        console.error('Error loading safety guidelines:', error);
        document.getElementById('safetyContent').innerHTML = `
            <div style="text-align: center; padding: 40px; color: #ef4444;">
                <i class="fas fa-exclamation-circle" style="font-size: 48px; margin-bottom: 16px;"></i>
                <h3>Error Loading Guidelines</h3>
                <p>${error.message}</p>
            </div>
        `;
    }
}

function displaySafetyGuidelines(data) {
    const content = document.getElementById('safetyContent');
    if (!content) return;
    
    const getStatusColor = (status) => {
        if (status.includes('✅')) return '#10b981';
        if (status.includes('⚠️')) return '#f59e0b';
        if (status.includes('❌')) return '#ef4444';
        if (status.includes('🚫')) return '#7f1d1d';
        return '#6b7280';
    };
    
    const statusColor = getStatusColor(data.outdoor_activities);
    
    content.innerHTML = `
        <div style="padding: 30px;">
            <div style="display: flex; align-items: center; gap: 20px; margin-bottom: 30px; padding-bottom: 20px; border-bottom: 2px solid #e5e7eb;">
                <div style="width: 60px; height: 60px; background: ${data.color}; border-radius: 12px; display: flex; align-items: center; justify-content: center; color: white; font-size: 28px;">
                    <i class="${data.icon}"></i>
                </div>
                <div style="flex: 1;">
                    <h3 style="font-size: 22px; font-weight: 700; margin-bottom: 5px; color: var(--text-primary);">${data.name}</h3>
                    <p style="color: #6b7280; font-size: 14px; margin: 0;">${data.description}</p>
                </div>
            </div>
            
            <div style="background: ${statusColor}15; border-left: 4px solid ${statusColor}; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
                <div style="display: flex; align-items: center; gap: 15px;">
                    <div style="width: 40px; height: 40px; background: ${statusColor}; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; flex-shrink: 0;">
                        <i class="fas fa-exclamation-triangle"></i>
                    </div>
                    <div style="flex: 1;">
                        <h4 style="font-weight: 600; margin-bottom: 5px; font-size: 16px; color: var(--text-primary);">Outdoor Activities Status</h4>
                        <p style="margin: 0; font-size: 15px; color: #374151;">${data.outdoor_activities}</p>
                    </div>
                </div>
            </div>
            
            <div style="background: #f9fafb; padding: 20px; border-radius: 12px; margin-bottom: 20px; border: 1px solid #e5e7eb;">
                <h4 style="display: flex; align-items: center; gap: 10px; color: #10b981; margin-bottom: 15px; font-size: 16px;">
                    <i class="fas fa-exclamation-circle"></i>
                    Important Precautions
                </h4>
                <p style="color: #374151; line-height: 1.6; margin: 0; font-size: 15px;">${data.precautions}</p>
            </div>
            
            <div style="background: #f9fafb; padding: 20px; border-radius: 12px; margin-bottom: 20px; border: 1px solid #e5e7eb;">
                <h4 style="display: flex; align-items: center; gap: 10px; color: #10b981; margin-bottom: 15px; font-size: 16px;">
                    <i class="fas fa-clipboard-list"></i>
                    What You Should Do
                </h4>
                <ul style="list-style: none; padding: 0; margin: 0;">
                    ${data.recommendations.map(rec => `
                        <li style="padding: 12px 0; border-bottom: 1px solid #e5e7eb; display: flex; gap: 12px; align-items: flex-start;">
                            <div style="width: 20px; height: 20px; background: #10b981; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-size: 11px; font-weight: 700; flex-shrink: 0; margin-top: 2px;">✓</div>
                            <span style="color: #374151; flex: 1; font-size: 14px; line-height: 1.5;">${rec}</span>
                        </li>
                    `).join('')}
                </ul>
            </div>
            
            <div style="background: linear-gradient(135deg, #fee2e2, #fecaca); padding: 20px; border-radius: 12px; border: 2px solid #fca5a5;">
                <h4 style="display: flex; align-items: center; gap: 10px; color: #dc2626; margin-bottom: 15px; font-size: 16px;">
                    <i class="fas fa-phone-alt"></i>
                    Emergency Numbers
                </h4>
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 12px;">
                    <div style="background: white; padding: 12px; border-radius: 8px; text-align: center; border: 1px solid #fca5a5;">
                        <div style="font-size: 11px; color: #6b7280; margin-bottom: 5px; font-weight: 600;">AMBULANCE</div>
                        <a href="tel:102" style="font-size: 20px; font-weight: 700; color: #dc2626; text-decoration: none; display: block;">102</a>
                    </div>
                    <div style="background: white; padding: 12px; border-radius: 8px; text-align: center; border: 1px solid #fca5a5;">
                        <div style="font-size: 11px; color: #6b7280; margin-bottom: 5px; font-weight: 600;">MEDICAL</div>
                        <a href="tel:108" style="font-size: 20px; font-weight: 700; color: #dc2626; text-decoration: none; display: block;">108</a>
                    </div>
                    <div style="background: white; padding: 12px; border-radius: 8px; text-align: center; border: 1px solid #fca5a5;">
                        <div style="font-size: 11px; color: #6b7280; margin-bottom: 5px; font-weight: 600;">EMERGENCY</div>
                        <a href="tel:112" style="font-size: 20px; font-weight: 700; color: #dc2626; text-decoration: none; display: block;">112</a>
                    </div>
                </div>
                <p style="margin-top: 12px; font-size: 12px; color: #991b1b; text-align: center; font-style: italic;">
                    Call immediately if you experience breathing difficulty or chest pain
                </p>
            </div>
        </div>
    `;
    
    content.classList.add('animate__animated', 'animate__fadeIn');
}

function updateSafetyTab(aqi) {
    currentSafetyAqi = aqi;
    
    const aqiElement = document.getElementById('safetyAqi');
    if (aqiElement) aqiElement.textContent = aqi;
    
    let statusText = 'Unknown';
    let statusColor = '#6b7280';
    
    if (aqi <= 50) {
        statusText = '✅ Perfect day to step outside!';
        statusColor = '#10b981';
    } else if (aqi <= 100) {
        statusText = '⚠️ Generally safe for most people';
        statusColor = '#fbbf24';
    } else if (aqi <= 150) {
        statusText = '⚠️ Sensitive groups should be cautious';
        statusColor = '#fb923c';
    } else if (aqi <= 200) {
        statusText = '❌ Everyone should limit outdoor time';
        statusColor = '#ef4444';
    } else if (aqi <= 300) {
        statusText = '❌ Stay indoors - serious health risk';
        statusColor = '#a855f7';
    } else {
        statusText = '🚫 EMERGENCY - stay inside immediately!';
        statusColor = '#7f1d1d';
    }
    
    const statusElement = document.getElementById('safetyStatus');
    if (statusElement) {
        statusElement.textContent = statusText;
        statusElement.style.color = statusColor;
    }
    
    const badge = document.querySelector('#safetyAqi');
    if (badge && badge.parentElement) {
        badge.parentElement.style.background = `linear-gradient(135deg, ${statusColor}, ${statusColor}dd)`;
    }
    
    loadSafetyGuidelines(currentSafetyGroup, aqi);
    
    if (aqi > 300) {
        showEmergencyBanner(aqi);
    } else {
        hideEmergencyBanner();
    }
}

function showEmergencyBanner(aqi) {
    hideEmergencyBanner();
    
    const banner = document.createElement('div');
    banner.id = 'emergencyBanner';
    banner.className = 'emergency-banner';
    banner.innerHTML = `
        <div>
            <i class="fas fa-exclamation-triangle"></i>
            <strong>🚫 HAZARDOUS AIR QUALITY ALERT</strong> - AQI: ${aqi}
        </div>
        <div style="font-size: 0.9rem; font-weight: 600;">
            STAY INDOORS IMMEDIATELY • Close All Windows • Emergency: 
            <a href="tel:102" style="color: white; text-decoration: underline;">102</a> | 
            <a href="tel:108" style="color: white; text-decoration: underline;">108</a> | 
            <a href="tel:112" style="color: white; text-decoration: underline;">112</a>
        </div>
    `;
    
    document.body.prepend(banner);
    
    const mainContent = document.querySelector('.main-content');
    if (mainContent) {
        mainContent.style.marginTop = '100px';
        mainContent.style.transition = 'margin-top 0.3s ease';
    }
}

function hideEmergencyBanner() {
    const banner = document.getElementById('emergencyBanner');
    if (banner) {
        banner.remove();
        const mainContent = document.querySelector('.main-content');
        if (mainContent) mainContent.style.marginTop = '0';
    }
}

// ==========================================
// OTHER TAB FUNCTIONS (Placeholder)
// ==========================================

async function loadCitiesExplorer() {
    const container = document.getElementById('citiesGrid');
    if (!container) return;

    // Show skeleton loaders
    container.innerHTML = Array(6).fill(0).map(() => `
        <div style="background: var(--bg-secondary); border-radius: 16px; padding: 1.5rem; border: 1px solid var(--border-color); animation: pulse 1.5s ease-in-out infinite;">
            <div style="height: 1.2rem; background: var(--text-muted); border-radius: 4px; opacity: 0.15; margin-bottom: 1rem; width: 60%;"></div>
            <div style="height: 3rem; background: var(--text-muted); border-radius: 4px; opacity: 0.1; margin-bottom: 0.75rem; width: 40%;"></div>
            <div style="height: 0.8rem; background: var(--text-muted); border-radius: 4px; opacity: 0.1; width: 80%;"></div>
        </div>
    `).join('');

    // Fetch a representative set of major Indian cities in parallel
    const citiesToLoad = ['Mumbai', 'Delhi', 'Bangalore', 'Chennai', 'Kolkata', 'Hyderabad', 'Pune', 'Ahmedabad', 'Jaipur', 'Lucknow', 'Surat', 'Chandigarh'];

    const results = await Promise.allSettled(
        citiesToLoad.map(city => fetchCityData(city))
    );

    const cities = results
        .filter(r => r.status === 'fulfilled')
        .map(r => r.value);

    if (cities.length === 0) {
        container.innerHTML = `
            <div style="grid-column: 1/-1; text-align: center; padding: 4rem 2rem;">
                <i class="fas fa-exclamation-circle" style="font-size: 3rem; color: var(--danger); margin-bottom: 1rem;"></i>
                <h3>Unable to Load Cities</h3>
                <p style="color: var(--text-muted);">Check your internet connection and API key, then try again.</p>
                <button onclick="loadCitiesExplorer()" style="margin-top: 1rem; padding: 0.6rem 1.5rem; background: var(--primary); color: white; border: none; border-radius: 8px; cursor: pointer; font-size: 0.9rem;">
                    <i class="fas fa-redo"></i> Retry
                </button>
            </div>
        `;
        return;
    }

    container.innerHTML = cities.map(city => {
        const cat = city.category;
        return `
            <div class="city-card animate__animated animate__fadeInUp" 
                 onclick="selectCity('${city.name}')"
                 style="background: var(--bg-secondary); border-radius: 16px; padding: 1.5rem;
                        border: 1px solid var(--border-color); cursor: pointer; transition: all 0.2s;
                        border-top: 4px solid ${cat.color};"
                 onmouseover="this.style.transform='translateY(-4px)';this.style.boxShadow='0 12px 24px rgba(0,0,0,0.15)'"
                 onmouseout="this.style.transform='';this.style.boxShadow=''">
                <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1rem;">
                    <div>
                        <h4 style="font-size: 1.1rem; font-weight: 700; margin: 0 0 0.25rem 0;">${city.name}</h4>
                        <p style="color: var(--text-muted); font-size: 0.8rem; margin: 0;">
                            <i class="fas fa-map-marker-alt"></i> ${city.state || 'India'}
                        </p>
                    </div>
                    <span style="font-size: 0.7rem; font-weight: 700; padding: 3px 10px; border-radius: 999px;
                                 background: ${cat.color}20; color: ${cat.color}; white-space: nowrap;">
                        ${cat.label}
                    </span>
                </div>
                <div style="display: flex; align-items: flex-end; justify-content: space-between;">
                    <div>
                        <div style="font-size: 3rem; font-weight: 900; color: ${cat.color}; line-height: 1;">${city.aqi}</div>
                        <div style="font-size: 0.75rem; color: var(--text-muted); margin-top: 0.25rem;">AQI</div>
                    </div>
                    <div style="text-align: right; font-size: 0.8rem; color: var(--text-secondary);">
                        <div><i class="fas fa-smog"></i> PM2.5: ${city.pollutants.pm2_5.toFixed(1)}</div>
                        <div style="margin-top: 0.3rem;"><i class="fas fa-temperature-high"></i> ${city.weather.temp}°C</div>
                        <div style="margin-top: 0.3rem;"><i class="fas fa-tint"></i> ${city.weather.humidity}%</div>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

function loadComparisonSection() {
    const selectorEl = document.getElementById('comparisonSelector');
    const gridEl     = document.getElementById('comparisonGrid');
    if (!selectorEl || !gridEl) return;

    // Pre-select current city if available
    if (appState.currentCity && !appState.comparisonCities.find(c => c.name === appState.currentCity.name)) {
        appState.comparisonCities.push(appState.currentCity);
    }

    renderComparisonSelector(selectorEl);
    renderComparisonCards(gridEl);
}

function renderComparisonSelector(container) {
    const selected = appState.comparisonCities.map(c => c.name);

    container.innerHTML = `
        <div style="background: var(--bg-secondary); border: 1px solid var(--border-color);
                    border-radius: 16px; padding: 1.25rem 1.5rem; margin-bottom: 1.5rem;">
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 1rem; flex-wrap: wrap; gap: 0.5rem;">
                <div>
                    <h4 style="margin: 0 0 0.2rem 0; font-size: 0.95rem; font-weight: 700;">
                        <i class="fas fa-sliders-h" style="color: var(--primary); margin-right: 6px;"></i>
                        Choose cities to compare
                    </h4>
                    <p style="margin: 0; font-size: 0.78rem; color: var(--text-muted);">Select up to 4 cities, then click Compare.</p>
                </div>
                <button id="runCompareBtn"
                    style="padding: 0.5rem 1.3rem; background: var(--primary); color: white;
                           border: none; border-radius: 10px; cursor: pointer; font-size: 0.85rem;
                           font-weight: 700; font-family: inherit; display: flex; align-items: center; gap: 6px;
                           opacity: ${selected.length >= 2 ? 1 : 0.4}; pointer-events: ${selected.length >= 2 ? 'auto' : 'none'};">
                    <i class="fas fa-balance-scale"></i> Compare
                </button>
            </div>
            <div style="display: flex; flex-wrap: wrap; gap: 0.5rem; max-height: 130px; overflow-y: auto;">
                ${INDIAN_CITIES.map(city => {
                    const isSelected = selected.includes(city);
                    return `
                        <button onclick="toggleComparisonCity('${city}')"
                            style="padding: 5px 14px; border-radius: 999px; font-size: 0.78rem; font-weight: 600;
                                   cursor: pointer; font-family: inherit; transition: all 0.15s;
                                   border: 2px solid ${isSelected ? 'var(--primary)' : 'var(--border-color)'};
                                   background: ${isSelected ? 'var(--primary)' : 'transparent'};
                                   color: ${isSelected ? 'white' : 'var(--text-secondary)'};">
                            ${isSelected ? '<i class="fas fa-check" style="margin-right:4px;font-size:0.7rem;"></i>' : ''}${city}
                        </button>`;
                }).join('')}
            </div>
        </div>
    `;

    document.getElementById('runCompareBtn')?.addEventListener('click', runComparison);
}

function toggleComparisonCity(cityName) {
    const idx = appState.comparisonCities.findIndex(c => c.name === cityName);
    if (idx >= 0) {
        appState.comparisonCities.splice(idx, 1);
    } else {
        if (appState.comparisonCities.length >= 4) {
            showToast('Maximum 4 cities for comparison', 'warning');
            return;
        }
        appState.comparisonCities.push({ name: cityName, _pending: true });
    }
    const selectorEl = document.getElementById('comparisonSelector');
    if (selectorEl) renderComparisonSelector(selectorEl);
    // Re-render cards in case we removed one that was already fetched
    const gridEl = document.getElementById('comparisonGrid');
    if (gridEl) renderComparisonCards(gridEl);
}

async function runComparison() {
    const gridEl = document.getElementById('comparisonGrid');
    if (!gridEl) return;

    if (appState.comparisonCities.length < 2) {
        showToast('Select at least 2 cities to compare', 'warning');
        return;
    }

    gridEl.innerHTML = `
        <div style="grid-column: 1/-1; text-align: center; padding: 3rem; color: var(--text-muted);">
            <i class="fas fa-spinner fa-spin" style="font-size: 2rem; margin-bottom: 1rem;"></i>
            <p>Fetching data for ${appState.comparisonCities.length} cities…</p>
        </div>`;

    const results = await Promise.allSettled(
        appState.comparisonCities.map(c => c._pending ? fetchCityData(c.name) : Promise.resolve(c))
    );

    appState.comparisonCities = results
        .map(r => r.status === 'fulfilled' ? r.value : null)
        .filter(Boolean);

    renderComparisonCards(gridEl);
    renderComparisonChart(appState.comparisonCities);
}

function renderComparisonCards(container) {
    const cities = appState.comparisonCities.filter(c => !c._pending);
    if (cities.length === 0) {
        container.innerHTML = `
            <div style="grid-column: 1/-1; text-align: center; padding: 4rem 2rem; color: var(--text-muted);">
                <i class="fas fa-balance-scale" style="font-size: 3rem; opacity: 0.25; margin-bottom: 1rem;"></i>
                <p>Select cities above and click <strong>Compare</strong> to see results.</p>
            </div>`;
        return;
    }

    const best  = cities.reduce((a, b) => a.aqi < b.aqi ? a : b);
    const worst = cities.reduce((a, b) => a.aqi > b.aqi ? a : b);

    container.innerHTML = cities.map(city => {
        const cat = city.category;
        const isBest  = cities.length > 1 && city.name === best.name;
        const isWorst = cities.length > 1 && city.name === worst.name;
        const badge = isBest  ? `<span style="font-size:0.68rem;font-weight:700;padding:2px 10px;border-radius:999px;background:#10b98120;color:#10b981;margin-left:8px;">🏆 Cleanest</span>`
                    : isWorst ? `<span style="font-size:0.68rem;font-weight:700;padding:2px 10px;border-radius:999px;background:#ef444420;color:#ef4444;margin-left:8px;">⚠ Most Polluted</span>` : '';

        const pollRows = [
            { label: 'PM2.5', value: city.pollutants.pm2_5, max: 250, color: '#ef4444' },
            { label: 'PM10',  value: city.pollutants.pm10,  max: 430, color: '#fb923c' },
            { label: 'O₃',    value: city.pollutants.o3,    max: 240, color: '#fbbf24' },
            { label: 'NO₂',   value: city.pollutants.no2,   max: 200, color: '#3b82f6' },
        ];

        return `
            <div style="background: var(--bg-secondary); border-radius: 16px; border: 1px solid var(--border-color);
                        border-top: 5px solid ${cat.color}; padding: 1.5rem; display: flex; flex-direction: column; gap: 1rem;">
                <div style="display: flex; align-items: flex-start; justify-content: space-between; flex-wrap: wrap; gap: 0.5rem;">
                    <div>
                        <h4 style="margin: 0; font-size: 1.05rem; font-weight: 800;">${city.name}${badge}</h4>
                        <p style="margin: 3px 0 0; font-size: 0.78rem; color: var(--text-muted);">${city.state || 'India'}</p>
                    </div>
                    <button onclick="toggleComparisonCity('${city.name}')"
                        style="background: rgba(239,68,68,0.08); border: 1px solid rgba(239,68,68,0.2);
                               color: #ef4444; border-radius: 8px; padding: 3px 10px; cursor: pointer;
                               font-size: 0.72rem; font-weight: 700; font-family: inherit;">
                        <i class="fas fa-times"></i> Remove
                    </button>
                </div>

                <div style="display: flex; align-items: flex-end; gap: 1rem;">
                    <div style="font-size: 3.5rem; font-weight: 900; color: ${cat.color}; line-height: 1;">${city.aqi}</div>
                    <div>
                        <div style="font-size: 0.78rem; color: var(--text-muted);">AQI</div>
                        <div style="font-size: 0.82rem; font-weight: 700; color: ${cat.color};">${cat.label}</div>
                        <div style="font-size: 0.74rem; color: var(--text-muted); margin-top: 3px;">
                            🌡 ${city.weather.temp}°C &nbsp;💧 ${city.weather.humidity}% &nbsp;💨 ${city.weather.windSpeed} km/h
                        </div>
                    </div>
                </div>

                <div style="display: flex; flex-direction: column; gap: 0.6rem;">
                    ${pollRows.map(p => {
                        const pct = Math.min((p.value / p.max) * 100, 100).toFixed(1);
                        return `
                        <div>
                            <div style="display: flex; justify-content: space-between; font-size: 0.75rem; margin-bottom: 3px;">
                                <span style="color: var(--text-secondary); font-weight: 600;">${p.label}</span>
                                <span style="color: ${p.color}; font-weight: 700;">${p.value.toFixed(1)} µg/m³</span>
                            </div>
                            <div style="height: 6px; background: var(--border-color); border-radius: 4px; overflow: hidden;">
                                <div style="height: 100%; width: ${pct}%; background: ${p.color}; border-radius: 4px; transition: width 0.8s ease;"></div>
                            </div>
                        </div>`;
                    }).join('')}
                </div>
            </div>`;
    }).join('');

    // Sync selector chips
    const selectorEl = document.getElementById('comparisonSelector');
    if (selectorEl) renderComparisonSelector(selectorEl);
}

function renderComparisonChart(cities) {
    let chartCard = document.getElementById('comparisonChartCard');
    if (!chartCard) {
        chartCard = document.createElement('div');
        chartCard.id = 'comparisonChartCard';
        chartCard.style.cssText = 'background: var(--bg-secondary); border: 1px solid var(--border-color); border-radius: 16px; padding: 1.5rem; margin-top: 1.5rem;';
        chartCard.innerHTML = `
            <h4 style="margin: 0 0 1rem 0; font-size: 0.9rem; font-weight: 700; color: var(--text-secondary);">
                <i class="fas fa-chart-bar" style="margin-right: 6px;"></i>Pollutant Comparison
            </h4>
            <div style="height: 280px; position: relative;"><canvas id="comparisonChart"></canvas></div>`;
        document.getElementById('comparisonSection').appendChild(chartCard);
    } else {
        const old = chartCard.querySelector('canvas');
        const fresh = document.createElement('canvas');
        fresh.id = 'comparisonChart';
        old.replaceWith(fresh);
    }

    if (appState.charts.comparison) { appState.charts.comparison.destroy(); }

    const palette = ['#6366f1', '#10b981', '#f59e0b', '#ef4444'];
    appState.charts.comparison = new Chart(
        document.getElementById('comparisonChart').getContext('2d'),
        {
            type: 'bar',
            data: {
                labels: ['PM2.5', 'PM10', 'O₃', 'NO₂'],
                datasets: cities.map((city, i) => ({
                    label: city.name,
                    data: [city.pollutants.pm2_5, city.pollutants.pm10, city.pollutants.o3, city.pollutants.no2],
                    backgroundColor: palette[i % palette.length] + 'bb',
                    borderColor:     palette[i % palette.length],
                    borderWidth: 2, borderRadius: 6
                }))
            },
            options: {
                responsive: true, maintainAspectRatio: false,
                plugins: { legend: { position: 'top' } },
                scales: {
                    y: { beginAtZero: true, title: { display: true, text: 'µg/m³' }, grid: { color: 'rgba(0,0,0,0.05)' } },
                    x: { grid: { display: false } }
                }
            }
        }
    );
}

window.toggleComparisonCity = toggleComparisonCity;

async function loadTrendsSection() {
    const canvas = document.getElementById('trendsChart');
    if (!canvas) return;

    // Destroy previous chart instance if exists
    if (appState.charts.trends) {
        appState.charts.trends.destroy();
        appState.charts.trends = null;
    }

    // If no city selected yet, show a prompt
    if (!appState.currentCity) {
        const parent = canvas.parentElement;
        if (parent) {
            parent.innerHTML = `
                <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; 
                            padding: 4rem 2rem; text-align: center;">
                    <i class="fas fa-chart-line" style="font-size: 3rem; color: var(--text-muted); opacity: 0.4; margin-bottom: 1rem;"></i>
                    <h3 style="color: var(--text-secondary); margin-bottom: 0.5rem;">No City Selected</h3>
                    <p style="color: var(--text-muted);">Search for a city on the Dashboard to view its AQI trend.</p>
                </div>
            `;
        }
        return;
    }

    const city = appState.currentCity;
    showLoader('Loading trend data...');

    try {
        // Fetch 48-hour AQI forecast
        const forecastUrl = `${CONFIG.FORECAST_URL}?lat=${city.coordinates.lat}&lon=${city.coordinates.lon}&appid=${CONFIG.API_KEY}`;
        const resp = await fetch(forecastUrl);
        if (!resp.ok) throw new Error('Forecast fetch failed');
        const forecastData = await resp.json();
        hideLoader();

        const items = forecastData.list.slice(0, 24); // next 24 data points (~24h)
        const labels = items.map(item => {
            const d = new Date(item.dt * 1000);
            return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
        });
        const aqiValues = items.map(item => {
            return calculateAQI(item.components);
        });
        const colors = aqiValues.map(aqi => getAQICategory(aqi).color);

        const ctx = canvas.getContext('2d');
        appState.charts.trends = new Chart(ctx, {
            type: 'line',
            data: {
                labels,
                datasets: [{
                    label: `AQI Forecast — ${city.name}`,
                    data: aqiValues,
                    borderColor: '#10b981',
                    backgroundColor: 'rgba(16,185,129,0.08)',
                    pointBackgroundColor: colors,
                    pointBorderColor: colors,
                    pointRadius: 5,
                    pointHoverRadius: 8,
                    borderWidth: 2.5,
                    fill: true,
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: true },
                    tooltip: {
                        backgroundColor: 'rgba(0,0,0,0.85)',
                        padding: 12,
                        callbacks: {
                            label: ctx => {
                                const aqi = ctx.parsed.y;
                                const cat = getAQICategory(aqi);
                                return ` AQI: ${aqi} — ${cat.label}`;
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        max: 300,
                        title: { display: true, text: 'AQI Value' },
                        grid: { color: 'rgba(0,0,0,0.06)' }
                    },
                    x: {
                        grid: { display: false },
                        ticks: { maxTicksLimit: 12 }
                    }
                }
            }
        });

    } catch (error) {
        hideLoader();
        const parent = canvas.parentElement;
        if (parent) {
            parent.innerHTML = `
                <div style="text-align: center; padding: 3rem; color: var(--danger);">
                    <i class="fas fa-exclamation-circle" style="font-size: 2.5rem; margin-bottom: 1rem;"></i>
                    <h4>Could Not Load Trend Data</h4>
                    <p style="color: var(--text-muted);">${error.message}</p>
                    <button onclick="loadTrendsSection()" style="margin-top: 1rem; padding: 0.5rem 1.2rem; 
                            background: var(--primary); color: white; border: none; border-radius: 8px; cursor: pointer;">
                        <i class="fas fa-redo"></i> Retry
                    </button>
                </div>
            `;
        }
    }
}

function loadMapSection() {
    const mapDiv = document.getElementById('map');
    if (!mapDiv) return;

    // If map already initialized, just invalidate size (handles tab-switch visibility issue)
    if (appState.map) {
        setTimeout(() => appState.map.invalidateSize(), 150);
        // If a city is selected, re-center on it
        if (appState.currentCity) {
            const { lat, lon } = appState.currentCity.coordinates;
            appState.map.setView([lat, lon], 10);
        }
        return;
    }

    // Initialize Leaflet map centered on India
    const defaultLat = appState.currentCity ? appState.currentCity.coordinates.lat : 20.5937;
    const defaultLon = appState.currentCity ? appState.currentCity.coordinates.lon : 78.9629;
    const defaultZoom = appState.currentCity ? 10 : 5;

    appState.map = L.map('map', { zoomControl: true }).setView([defaultLat, defaultLon], defaultZoom);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© <a href="https://openstreetmap.org">OpenStreetMap</a> contributors',
        maxZoom: 18
    }).addTo(appState.map);

    // Pin current city if available
    if (appState.currentCity) {
        addCityMarkerToMap(appState.currentCity);
    }

    // Add markers for all favorited cities
    appState.favorites.forEach(city => {
        if (city.coordinates) addCityMarkerToMap(city);
    });

    setTimeout(() => appState.map.invalidateSize(), 300);
}

function addCityMarkerToMap(cityData) {
    if (!appState.map || !cityData.coordinates) return;
    const { lat, lon } = cityData.coordinates;
    const cat = cityData.category || getAQICategory(cityData.aqi);

    const icon = L.divIcon({
        className: '',
        html: `<div style="
            background: ${cat.color};
            color: white;
            border-radius: 50% 50% 50% 0;
            transform: rotate(-45deg);
            width: 36px; height: 36px;
            display: flex; align-items: center; justify-content: center;
            font-weight: 900; font-size: 11px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.3);
            border: 2px solid white;">
            <span style="transform: rotate(45deg);">${cityData.aqi}</span>
        </div>`,
        iconSize: [36, 36],
        iconAnchor: [18, 36]
    });

    L.marker([lat, lon], { icon })
        .addTo(appState.map)
        .bindPopup(`
            <div style="font-family: sans-serif; min-width: 160px;">
                <strong style="font-size: 1rem;">${cityData.name}</strong>
                <div style="margin: 6px 0; font-size: 1.6rem; font-weight: 900; color: ${cat.color};">${cityData.aqi}</div>
                <div style="font-size: 0.8rem; color: ${cat.color}; font-weight: 600;">${cat.label}</div>
                <hr style="margin: 8px 0; border-color: #eee;">
                <div style="font-size: 0.78rem;">
                    🌡️ ${cityData.weather?.temp ?? '--'}°C &nbsp;&nbsp; 
                    💨 PM2.5: ${cityData.pollutants?.pm2_5?.toFixed(1) ?? '--'}
                </div>
            </div>
        `);
}

function checkAlerts(cityData) {
    const threshold = 100;
    if (cityData.aqi > threshold) loadAlertsSection();
    
    const alertBadge = document.getElementById('alertBadge');
    const alertCount = appState.favorites.filter(c => c.aqi > threshold).length;
    if (alertBadge) {
        alertBadge.textContent = alertCount;
        alertBadge.style.display = alertCount > 0 ? 'block' : 'none';
    }
}

function loadAlertsSection() {
    const container = document.getElementById('alertsList');
    if (!container) return;
    
    const alerts = appState.favorites.filter(city => city.aqi > 100);
    if (alerts.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 4rem 2rem;">
                <i class="fas fa-check-circle" style="font-size: 4rem; color: var(--success); margin-bottom: 1rem;"></i>
                <h3>No Air Quality Alerts</h3>
                <p>All monitored cities have acceptable air quality</p>
            </div>
        `;
    }
}

// ==========================================
// THEME TOGGLE
// ==========================================

function toggleTheme() {
    appState.theme = appState.theme === 'light' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', appState.theme);
    localStorage.setItem('theme', appState.theme);
    
    const themeBtn = document.getElementById('themeToggle');
    if (themeBtn) {
        const icon = themeBtn.querySelector('i');
        const text = themeBtn.querySelector('span');
        
        if (appState.theme === 'dark') {
            icon.className = 'fas fa-sun';
            text.textContent = 'Light Mode';
        } else {
            icon.className = 'fas fa-moon';
            text.textContent = 'Dark Mode';
        }
    }
    
    showToast(`${appState.theme === 'dark' ? 'Dark' : 'Light'} mode activated`, 'success');
}

// ==========================================
// AUTOCOMPLETE
// ==========================================

function setupAutocomplete() {
    const input = document.getElementById('cityInput');
    const autocompleteList = document.getElementById('autocompleteList');
    
    if (!input || !autocompleteList) return;
    
    input.addEventListener('input', function() {
        const value = this.value.trim().toLowerCase();
        
        if (value.length < 2) {
            autocompleteList.style.display = 'none';
            return;
        }
        
        const matches = INDIAN_CITIES.filter(city => 
            city.toLowerCase().includes(value)
        ).slice(0, 5);
        
        if (matches.length === 0) {
            autocompleteList.style.display = 'none';
            return;
        }
        
        autocompleteList.innerHTML = matches.map(city => `
            <div class="autocomplete-item" onclick="selectFromAutocomplete('${city}')">
                <i class="fas fa-map-marker-alt"></i>
                ${city}
            </div>
        `).join('');
        
        autocompleteList.style.display = 'block';
    });
    
    document.addEventListener('click', function(e) {
        if (!input.contains(e.target) && !autocompleteList.contains(e.target)) {
            autocompleteList.style.display = 'none';
        }
    });
}

function selectFromAutocomplete(city) {
    const input = document.getElementById('cityInput');
    const autocompleteList = document.getElementById('autocompleteList');
    
    if (input) input.value = city;
    if (autocompleteList) autocompleteList.style.display = 'none';
    
    selectCity(city);
}

// ==========================================
// EVENT LISTENERS & INITIALIZATION
// ==========================================

document.addEventListener('DOMContentLoaded', function() {
    console.log('AirPulse initializing...');
    
    document.documentElement.setAttribute('data-theme', appState.theme);
    const themeBtn = document.getElementById('themeToggle');
    if (themeBtn) {
        const icon = themeBtn.querySelector('i');
        const text = themeBtn.querySelector('span');
        if (appState.theme === 'dark') {
            icon.className = 'fas fa-sun';
            text.textContent = 'Light Mode';
        }
    }
    
    updateDateTime();
    setInterval(updateDateTime, 60000);
    
    updateFavoritesDisplay();
    setupAutocomplete();
    initSafetyTabs();
    
    const checkBtn = document.getElementById('checkBtn');
    if (checkBtn) {
        checkBtn.addEventListener('click', () => {
            const cityInput = document.getElementById('cityInput');
            const city = cityInput?.value.trim();
            if (city) {
                selectCity(city);
            } else {
                showToast('Please enter a city name', 'warning');
            }
        });
    }
    
    const cityInput = document.getElementById('cityInput');
    if (cityInput) {
        cityInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                const city = cityInput.value.trim();
                if (city) {
                    selectCity(city);
                    const autocompleteList = document.getElementById('autocompleteList');
                    if (autocompleteList) autocompleteList.style.display = 'none';
                }
            }
        });
    }
    
    document.querySelectorAll('.city-pill:not(.safety-tab)').forEach(pill => {
        pill.addEventListener('click', function() {
            const city = this.getAttribute('data-city');
            if (city) selectCity(city);
        });
    });
    
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', function() {
            const tab = this.getAttribute('data-tab');
            if (tab) switchTab(tab);
        });
    });
    
    const autoDetectBtn = document.getElementById('autoDetectBtn');
    const detectLocationBtn = document.getElementById('detectLocationBtn');
    
    if (autoDetectBtn) autoDetectBtn.addEventListener('click', detectUserLocation);
    if (detectLocationBtn) {
        detectLocationBtn.addEventListener('click', () => {
            detectUserLocation();
            switchTab('location');
        });
    }
    
    const favoriteBtn = document.getElementById('favoriteBtn');
    if (favoriteBtn) {
        favoriteBtn.addEventListener('click', () => {
            if (!appState.currentCity) {
                showToast('Please select a city first', 'warning');
                return;
            }
            
            const isFavorite = appState.favorites.some(f => 
                f.name.toLowerCase() === appState.currentCity.name.toLowerCase()
            );
            
            if (isFavorite) {
                removeFromFavorites(appState.currentCity.name);
            } else {
                addToFavorites(appState.currentCity);
            }
        });
    }
    
    if (themeBtn) themeBtn.addEventListener('click', toggleTheme);
    
    const refreshBtn = document.getElementById('refreshBtn');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', () => {
            if (appState.currentCity) {
                selectCity(appState.currentCity.name);
            } else {
                showToast('No city selected to refresh', 'info');
            }
        });
    }
    
    const menuToggle = document.getElementById('menuToggle');
    const sidebar = document.getElementById('sidebar');
    if (menuToggle && sidebar) {
        menuToggle.addEventListener('click', () => {
            sidebar.classList.toggle('active');
        });
    }
    
    document.addEventListener('click', (e) => {
        if (sidebar && window.innerWidth <= 992) {
            if (!sidebar.contains(e.target) && !menuToggle?.contains(e.target)) {
                sidebar.classList.remove('active');
            }
        }
    });
    
    console.log('AirPulse initialized successfully! 🇮🇳');
    showToast('Welcome to AirPulse! 🫁', 'success');
});

// Make functions globally available
window.selectCity = selectCity;
window.removeFromFavorites = removeFromFavorites;
window.switchTab = switchTab;
window.selectFromAutocomplete = selectFromAutocomplete;
window.setRankingsFilter = setRankingsFilter;
window.inlineSelectCity  = inlineSelectCity;
window.inlineLoadCity    = inlineLoadCity;

console.log('AirPulse Complete JavaScript Loaded - Version 6.0.0');

// ╔══════════════════════════════════════════════════════════════╗
//   INLINE CITY SEARCH — shared by Forecast, Sources, Report
// ╚══════════════════════════════════════════════════════════════╝

async function inlineLoadCity(cityName, tab) {
    // Show spinner inside the relevant content area
    const contentId = tab === 'forecast'   ? 'forecastContent'    :
                      tab === 'sources'    ? 'sourcesContent'      :
                      tab === 'reportcard' ? 'reportCardContent'   : null;
    if (!contentId) return;

    const contentEl = document.getElementById(contentId);
    if (contentEl) {
        contentEl.style.display = 'block';
        contentEl.innerHTML = `
            <div style="text-align:center;padding:3rem;color:var(--text-muted);">
                <i class="fas fa-spinner fa-spin" style="font-size:2rem;color:var(--primary);display:block;margin-bottom:0.75rem;"></i>
                <p style="font-weight:600;">Fetching data for ${cityName}…</p>
            </div>`;
    }

    try {
        const cityData = await fetchCityData(cityName);
        // Store as current city so tab functions work
        appState.currentCity = cityData;

        // Also update the dashboard display silently
        if (tab === 'forecast')   { await loadForecastSection(); }
        if (tab === 'sources')    { loadSourcesSection(); }
        if (tab === 'reportcard') { loadReportCard(); }

        // Update browser title
        const aqiEmoji = cityData.aqi <= 50  ? '🟢' :
                         cityData.aqi <= 100 ? '🟡' :
                         cityData.aqi <= 150 ? '🟠' :
                         cityData.aqi <= 200 ? '🔴' : '🟣';
        document.title = `${aqiEmoji} ${cityData.name} — AQI ${cityData.aqi} | AirPulse`;

    } catch(err) {
        if (contentEl) {
            contentEl.innerHTML = `
                <div style="text-align:center;padding:2rem;color:#ef4444;">
                    <i class="fas fa-exclamation-circle" style="font-size:2rem;margin-bottom:0.5rem;display:block;"></i>
                    <p>Could not load <strong>${cityName}</strong>: ${err.message}</p>
                    <button onclick="inlineLoadCity('${cityName}','${tab}')" 
                        style="margin-top:0.75rem;padding:0.4rem 1rem;background:var(--primary);color:white;border:none;border-radius:8px;cursor:pointer;font-family:inherit;">
                        Retry
                    </button>
                </div>`;
        }
    }
}

function inlineSelectCity(inputId) {
    const input = document.getElementById(inputId);
    const city  = input?.value.trim();
    if (!city) { showToast('Please enter a city name', 'warning'); return; }

    const tab = inputId === 'forecastCityInput' ? 'forecast'   :
                inputId === 'sourcesCityInput'  ? 'sources'    :
                inputId === 'reportCityInput'   ? 'reportcard' : null;
    if (tab) inlineLoadCity(city, tab);
}

// Allow Enter key on inline inputs
document.addEventListener('DOMContentLoaded', () => {
    ['forecastCityInput','sourcesCityInput','reportCityInput'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.addEventListener('keypress', e => {
            if (e.key === 'Enter') inlineSelectCity(id);
        });
    });
});

// ╔══════════════════════════════════════════════════════════════╗
//   TAB 1 — INDIA RANKINGS
// ╚══════════════════════════════════════════════════════════════╝

const RANKINGS_CITIES = [
    'Delhi','Mumbai','Bangalore','Chennai','Kolkata','Hyderabad',
    'Pune','Ahmedabad','Jaipur','Lucknow','Surat','Chandigarh',
    'Nagpur','Indore','Patna','Bhopal','Visakhapatnam','Ludhiana',
    'Agra','Varanasi','Kanpur','Rajkot','Meerut','Faridabad'
];

let rankingsData = [];
let rankingsFilter = 'all';

async function loadRankingsSection() {
    const container = document.getElementById('rankingsList');
    if (!container) return;

    // If already loaded, just re-render with current filter
    if (rankingsData.length > 0) {
        renderRankings(container);
        return;
    }

    container.innerHTML = `
        <div style="text-align:center;padding:3rem;color:var(--text-muted);">
            <i class="fas fa-spinner fa-spin" style="font-size:2.5rem;margin-bottom:1rem;color:var(--primary);display:block;"></i>
            <p style="font-weight:600;">Fetching live data for ${RANKINGS_CITIES.length} cities…</p>
            <p style="font-size:0.8rem;margin-top:0.5rem;opacity:0.7;">This may take a few seconds</p>
        </div>`;

    const results = await Promise.allSettled(
        RANKINGS_CITIES.map(c => fetchCityData(c))
    );

    rankingsData = results
        .filter(r => r.status === 'fulfilled')
        .map(r => r.value)
        .sort((a, b) => a.aqi - b.aqi);

    renderRankings(container);
}

function setRankingsFilter(filter) {
    rankingsFilter = filter;
    document.querySelectorAll('.rankings-filter').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.filter === filter);
    });
    const container = document.getElementById('rankingsList');
    if (container && rankingsData.length > 0) renderRankings(container);
}

function renderRankings(container) {
    let data = [...rankingsData];
    if (rankingsFilter === 'best')  data = data.slice(0, 8);
    if (rankingsFilter === 'worst') data = data.sort((a,b) => b.aqi - a.aqi).slice(0, 8);

    const best  = rankingsData[0];
    const worst = rankingsData[rankingsData.length - 1];

    // Summary bar
    const summary = `
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:1rem;margin-bottom:1.5rem;">
            <div style="background:rgba(16,185,129,0.1);border:1px solid rgba(16,185,129,0.3);border-radius:14px;padding:1rem;text-align:center;">
                <div style="font-size:0.72rem;font-weight:700;color:#10b981;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:0.3rem;">🏆 Cleanest City</div>
                <div style="font-size:1.1rem;font-weight:800;">${best?.name || '--'}</div>
                <div style="font-size:1.8rem;font-weight:900;color:#10b981;">${best?.aqi || '--'}</div>
            </div>
            <div style="background:var(--bg-secondary);border:1px solid var(--border-color);border-radius:14px;padding:1rem;text-align:center;">
                <div style="font-size:0.72rem;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.08em;margin-bottom:0.3rem;">📊 Cities Tracked</div>
                <div style="font-size:2rem;font-weight:900;color:var(--primary);">${rankingsData.length}</div>
                <div style="font-size:0.75rem;color:var(--text-muted);">Live right now</div>
            </div>
            <div style="background:rgba(239,68,68,0.1);border:1px solid rgba(239,68,68,0.3);border-radius:14px;padding:1rem;text-align:center;">
                <div style="font-size:0.72rem;font-weight:700;color:#ef4444;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:0.3rem;">⚠️ Most Polluted</div>
                <div style="font-size:1.1rem;font-weight:800;">${worst?.name || '--'}</div>
                <div style="font-size:1.8rem;font-weight:900;color:#ef4444;">${worst?.aqi || '--'}</div>
            </div>
        </div>`;

    const rows = data.map((city, i) => {
        const rank    = rankingsFilter === 'worst' ? rankingsData.length - i : i + 1;
        const cat     = city.category;
        const medal   = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `#${rank}`;
        const barPct  = Math.min((city.aqi / 300) * 100, 100).toFixed(0);

        return `
            <div onclick="selectCity('${city.name}')" style="
                display:grid;grid-template-columns:52px 1fr auto;align-items:center;gap:1rem;
                padding:0.9rem 1.25rem;background:var(--bg-secondary);border:1px solid var(--border-color);
                border-radius:12px;margin-bottom:0.5rem;cursor:pointer;transition:all 0.15s;border-left:4px solid ${cat.color};"
                onmouseover="this.style.transform='translateX(4px)'"
                onmouseout="this.style.transform=''">
                <div style="font-size:1.3rem;font-weight:900;text-align:center;color:var(--text-muted);">${medal}</div>
                <div>
                    <div style="font-weight:700;font-size:0.95rem;">${city.name}
                        <span style="font-size:0.72rem;color:var(--text-muted);font-weight:500;margin-left:6px;">${city.state || 'India'}</span>
                    </div>
                    <div style="margin-top:5px;height:5px;background:var(--border-color);border-radius:4px;overflow:hidden;max-width:220px;">
                        <div style="height:100%;width:${barPct}%;background:${cat.color};border-radius:4px;transition:width 0.6s ease;"></div>
                    </div>
                    <div style="font-size:0.73rem;color:var(--text-muted);margin-top:3px;">PM2.5: ${city.pollutants.pm2_5.toFixed(1)} · ${city.weather.temp}°C · ${city.weather.humidity}% RH</div>
                </div>
                <div style="text-align:right;">
                    <div style="font-size:2rem;font-weight:900;color:${cat.color};line-height:1;">${city.aqi}</div>
                    <div style="font-size:0.68rem;font-weight:700;color:${cat.color};white-space:nowrap;">${cat.label}</div>
                </div>
            </div>`;
    }).join('');

    container.innerHTML = summary + rows;
}

// ╔══════════════════════════════════════════════════════════════╗
//   TAB 2 — 5-DAY FORECAST
// ╚══════════════════════════════════════════════════════════════╝

async function loadForecastSection() {
    const noCity  = document.getElementById('forecastNoCityMsg');
    const content = document.getElementById('forecastContent');
    if (!noCity || !content) return;

    if (!appState.currentCity) {
        noCity.style.display = 'block';
        content.style.display = 'none';
        return;
    }

    noCity.style.display = 'none';
    content.style.display = 'block';

    const cardsEl = document.getElementById('forecastCards');
    cardsEl.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:2rem;color:var(--text-muted);">
        <i class="fas fa-spinner fa-spin" style="font-size:1.5rem;"></i><p style="margin-top:0.5rem;">Loading forecast…</p></div>`;

    try {
        const { lat, lon } = appState.currentCity.coordinates;
        const resp = await fetch(`${CONFIG.FORECAST_URL}?lat=${lat}&lon=${lon}&appid=${CONFIG.API_KEY}`);
        if (!resp.ok) throw new Error('Forecast unavailable');
        const data = await resp.json();

        // Group by day (take 1 reading per day at noon, or first of day)
        const dayMap = {};
        data.list.forEach(item => {
            const d   = new Date(item.dt * 1000);
            const key = d.toLocaleDateString('en-IN', { weekday:'short', month:'short', day:'numeric' });
            if (!dayMap[key]) dayMap[key] = [];
            dayMap[key].push({ aqi: calculateAQI(item.components), dt: d });
        });

        const days = Object.entries(dayMap).slice(0, 5).map(([label, readings]) => {
            const avg = Math.round(readings.reduce((s, r) => s + r.aqi, 0) / readings.length);
            const max = Math.max(...readings.map(r => r.aqi));
            const min = Math.min(...readings.map(r => r.aqi));
            return { label, avg, max, min, cat: getAQICategory(avg) };
        });

        // Day cards
        cardsEl.innerHTML = days.map((day, i) => `
            <div style="background:var(--bg-secondary);border:1px solid var(--border-color);border-radius:16px;
                        padding:1.25rem;text-align:center;border-top:4px solid ${day.cat.color};
                        ${i===0?'box-shadow:0 4px 20px rgba(0,0,0,0.1);':''}" >
                <div style="font-size:0.78rem;font-weight:700;color:var(--text-muted);margin-bottom:0.5rem;">${i===0?'TODAY':day.label.split(',')[0].toUpperCase()}</div>
                <div style="font-size:0.72rem;color:var(--text-muted);margin-bottom:0.75rem;">${day.label}</div>
                <div style="font-size:2.5rem;font-weight:900;color:${day.cat.color};line-height:1;">${day.avg}</div>
                <div style="font-size:0.7rem;font-weight:700;color:${day.cat.color};margin:4px 0 8px;">${day.cat.label}</div>
                <div style="font-size:0.68rem;color:var(--text-muted);">↑${day.max} ↓${day.min}</div>
                <div style="margin-top:10px;font-size:1.6rem;">
                    ${day.avg<=50?'😊':day.avg<=100?'😐':day.avg<=150?'😷':day.avg<=200?'🤒':'🚫'}
                </div>
            </div>`).join('');

        // Chart
        if (appState.charts.forecast) appState.charts.forecast.destroy();
        const canvas = document.getElementById('forecastChart');
        if (canvas) {
            appState.charts.forecast = new Chart(canvas.getContext('2d'), {
                type: 'line',
                data: {
                    labels: days.map(d => d.label.split(',')[0]),
                    datasets: [
                        { label:'Avg AQI', data: days.map(d=>d.avg), borderColor:'#6366f1', backgroundColor:'rgba(99,102,241,0.08)', borderWidth:3, pointRadius:6, pointBackgroundColor: days.map(d=>d.cat.color), fill:true, tension:0.4 },
                        { label:'Max AQI', data: days.map(d=>d.max), borderColor:'#ef4444', borderDash:[5,5], borderWidth:1.5, pointRadius:3, fill:false, tension:0.4 },
                        { label:'Min AQI', data: days.map(d=>d.min), borderColor:'#10b981', borderDash:[5,5], borderWidth:1.5, pointRadius:3, fill:false, tension:0.4 }
                    ]
                },
                options: { responsive:true, maintainAspectRatio:false,
                    plugins:{ legend:{ position:'top' }, tooltip:{ callbacks:{ label: ctx => ` ${ctx.dataset.label}: ${ctx.parsed.y}` } } },
                    scales:{ y:{ beginAtZero:true, grid:{ color:'rgba(0,0,0,0.05)' } }, x:{ grid:{ display:false } } }
                }
            });
        }

    } catch(err) {
        cardsEl.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:2rem;color:#ef4444;">
            <i class="fas fa-exclamation-circle" style="font-size:2rem;margin-bottom:0.5rem;display:block;"></i>
            <p>Could not load forecast: ${err.message}</p>
            <button onclick="loadForecastSection()" style="margin-top:0.75rem;padding:0.4rem 1rem;background:var(--primary);color:white;border:none;border-radius:8px;cursor:pointer;font-family:inherit;">Retry</button>
        </div>`;
    }
}

// ╔══════════════════════════════════════════════════════════════╗
//   TAB 3 — POLLUTION SOURCES
// ╚══════════════════════════════════════════════════════════════╝

const POLLUTION_SOURCES_DB = {
    // Each source: { name, icon, color, triggers (what pollutant levels trigger it), desc, tips }
    vehicular:  { name:'Vehicular Emissions', icon:'fas fa-car',         color:'#ef4444', desc:'Cars, trucks, and two-wheelers burning petrol/diesel release NO₂, CO and fine particles directly into breathing air.', tips:['Use public transport or carpool','Avoid idling your engine','Switch to EV or CNG vehicles','Avoid peak traffic hours (8–10am, 6–9pm)'] },
    industrial: { name:'Industrial Activity',  icon:'fas fa-industry',    color:'#f97316', desc:'Factories, power plants and construction sites emit SO₂, PM10 and heavy metal particles that travel long distances.', tips:['Check factory compliance on CPCB portal','Report visible smoke stacks to local authorities','Keep windows closed near industrial zones','Use air purifier at home'] },
    crop:       { name:'Crop Burning',          icon:'fas fa-fire',        color:'#fbbf24', desc:'Stubble burning in Punjab, Haryana and UP spikes PM2.5 across North India, especially Oct–Nov.', tips:['Monitor SAFAR forecast for fire alerts','Wear N95 mask outdoors','Seal window gaps during burning season','Support farmers using happy seeders instead'] },
    dust:       { name:'Road & Construction Dust', icon:'fas fa-wind',    color:'#a78bfa', desc:'Unpaved roads, construction sites and dry soil contribute significantly to PM10 and coarse particle levels.', tips:['Wear a mask near construction zones','Water plants and keep surroundings moist','Use wet mopping instead of dry sweeping','Cover soil around your home'] },
    domestic:   { name:'Domestic Burning',      icon:'fas fa-home',       color:'#06b6d4', desc:'Burning wood, coal, or biomass for cooking and heating is a major indoor and outdoor pollution source in India.', tips:['Use LPG or induction cooking','Ensure good kitchen ventilation','Avoid burning waste at home','Switch to cleaner fuel schemes (PM Ujjwala)'] },
    secondary:  { name:'Secondary Pollutants',  icon:'fas fa-atom',       color:'#8b5cf6', desc:'Ozone (O₃) forms when sunlight reacts with NOx and VOCs in the air — peaks in afternoon on sunny days.', tips:['Avoid outdoor exercise between 12–4pm','Check O₃ levels separately in summer','Keep windows closed during afternoon peaks','Plant trees to reduce urban heat'] }
};

function loadSourcesSection() {
    const noCity  = document.getElementById('sourcesNoCityMsg');
    const content = document.getElementById('sourcesContent');
    if (!noCity || !content) return;

    if (!appState.currentCity) {
        noCity.style.display = 'block';
        content.style.display = 'none';
        return;
    }

    noCity.style.display = 'none';
    content.style.display = 'block';

    const city = appState.currentCity;
    const p    = city.pollutants;
    const aqi  = city.aqi;

    // Determine which sources are likely active based on pollutant mix
    const activeSources = [];
    if (p.no2 > 20 || p.co > 500)                    activeSources.push({ ...POLLUTION_SOURCES_DB.vehicular,  level: Math.min(100, ((p.no2/80)*100)).toFixed(0) });
    if (p.so2 > 15 || p.pm10 > 60)                    activeSources.push({ ...POLLUTION_SOURCES_DB.industrial, level: Math.min(100, ((p.so2/40)*100)).toFixed(0) });
    if (p.pm2_5 > 35 && p.pm10 > 70)                  activeSources.push({ ...POLLUTION_SOURCES_DB.crop,       level: Math.min(100, ((p.pm2_5/150)*100)).toFixed(0) });
    if (p.pm10 > 50)                                   activeSources.push({ ...POLLUTION_SOURCES_DB.dust,       level: Math.min(100, ((p.pm10/200)*100)).toFixed(0) });
    if (aqi > 100)                                     activeSources.push({ ...POLLUTION_SOURCES_DB.domestic,   level: Math.min(100, (aqi/300*100)).toFixed(0) });
    if (p.o3 > 60)                                     activeSources.push({ ...POLLUTION_SOURCES_DB.secondary,  level: Math.min(100, ((p.o3/120)*100)).toFixed(0) });

    // Ensure at least 3 sources shown
    const allKeys = Object.keys(POLLUTION_SOURCES_DB);
    while (activeSources.length < 3) {
        const key = allKeys[activeSources.length];
        if (!activeSources.find(s => s.name === POLLUTION_SOURCES_DB[key].name)) {
            activeSources.push({ ...POLLUTION_SOURCES_DB[key], level: '15' });
        }
    }

    // Donut chart data
    const donutColors = activeSources.map(s => s.color);
    const donutData   = activeSources.map(s => parseInt(s.level));

    content.innerHTML = `
        <div style="background:var(--bg-secondary);border:1px solid var(--border-color);border-radius:16px;padding:1.5rem;margin-bottom:1.5rem;">
            <div style="display:flex;align-items:center;gap:1rem;flex-wrap:wrap;">
                <div style="background:${getAQICategory(aqi).color}20;border-radius:12px;padding:1rem 1.5rem;text-align:center;min-width:100px;">
                    <div style="font-size:2.2rem;font-weight:900;color:${getAQICategory(aqi).color};">${aqi}</div>
                    <div style="font-size:0.72rem;font-weight:700;color:${getAQICategory(aqi).color};">AQI</div>
                </div>
                <div>
                    <h3 style="margin:0 0 4px;font-size:1.1rem;font-weight:800;">Pollution Profile — ${city.name}</h3>
                    <p style="margin:0;font-size:0.82rem;color:var(--text-muted);">Based on live pollutant data, here are the most likely sources contributing to today's air quality.</p>
                </div>
            </div>
        </div>

        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:1rem;margin-bottom:1.5rem;">
            ${activeSources.map(src => `
                <div style="background:var(--bg-secondary);border:1px solid var(--border-color);border-radius:16px;padding:1.25rem;border-left:5px solid ${src.color};">
                    <div style="display:flex;align-items:center;gap:0.75rem;margin-bottom:0.75rem;">
                        <div style="width:40px;height:40px;background:${src.color}20;border-radius:10px;display:flex;align-items:center;justify-content:center;color:${src.color};font-size:1.1rem;flex-shrink:0;">
                            <i class="${src.icon}"></i>
                        </div>
                        <div style="flex:1;">
                            <div style="font-weight:700;font-size:0.9rem;">${src.name}</div>
                            <div style="height:6px;background:var(--border-color);border-radius:4px;overflow:hidden;margin-top:4px;">
                                <div style="height:100%;width:${src.level}%;background:${src.color};border-radius:4px;transition:width 0.8s ease;"></div>
                            </div>
                        </div>
                        <div style="font-size:0.85rem;font-weight:800;color:${src.color};">${src.level}%</div>
                    </div>
                    <p style="font-size:0.78rem;color:var(--text-muted);line-height:1.6;margin:0 0 0.75rem;">${src.desc}</p>
                    <div style="display:flex;flex-direction:column;gap:0.3rem;">
                        ${src.tips.slice(0,3).map(tip => `
                            <div style="display:flex;gap:0.5rem;align-items:flex-start;font-size:0.75rem;color:var(--text-secondary);">
                                <span style="color:${src.color};margin-top:2px;flex-shrink:0;">✓</span>${tip}
                            </div>`).join('')}
                    </div>
                </div>`).join('')}
        </div>

        <div style="background:var(--bg-secondary);border:1px solid var(--border-color);border-radius:16px;padding:1.5rem;">
            <h4 style="margin:0 0 1rem;font-size:0.9rem;font-weight:700;color:var(--text-secondary);">
                <i class="fas fa-chart-pie" style="margin-right:6px;"></i>Estimated Source Contribution
            </h4>
            <div style="height:240px;position:relative;"><canvas id="sourcesChart"></canvas></div>
        </div>`;

    // Donut chart
    if (appState.charts.sources) appState.charts.sources.destroy();
    const canvas = document.getElementById('sourcesChart');
    if (canvas) {
        appState.charts.sources = new Chart(canvas.getContext('2d'), {
            type: 'doughnut',
            data: {
                labels: activeSources.map(s => s.name),
                datasets: [{ data: donutData, backgroundColor: donutColors, borderWidth: 2, borderColor: 'var(--bg-secondary)' }]
            },
            options: {
                responsive: true, maintainAspectRatio: false, cutout: '65%',
                plugins: { legend: { position: 'right', labels: { font: { size: 11 }, padding: 16 } },
                    tooltip: { callbacks: { label: ctx => ` ${ctx.label}: ~${ctx.parsed}% contribution` } } }
            }
        });
    }
}

// ╔══════════════════════════════════════════════════════════════╗
//   TAB 4 — HEALTH REPORT CARD
// ╚══════════════════════════════════════════════════════════════╝

function loadReportCard() {
    const noCity  = document.getElementById('reportNoCityMsg');
    const content = document.getElementById('reportCardContent');
    if (!noCity || !content) return;

    if (!appState.currentCity) {
        noCity.style.display = 'block';
        content.style.display = 'none';
        return;
    }

    noCity.style.display = 'none';
    content.style.display = 'block';

    const city  = appState.currentCity;
    const aqi   = city.aqi;
    const cat   = city.category;
    const p     = city.pollutants;
    const now   = new Date();
    const dateStr = now.toLocaleDateString('en-IN', { weekday:'long', year:'numeric', month:'long', day:'numeric' });

    // Score out of 100 (inverse of AQI proportion)
    const score     = Math.max(0, Math.round(100 - (aqi / 500) * 100));
    const scoreGrade = score >= 80 ? { grade:'A', color:'#10b981', label:'Excellent' }
                     : score >= 60 ? { grade:'B', color:'#6366f1', label:'Good' }
                     : score >= 40 ? { grade:'C', color:'#fbbf24', label:'Moderate' }
                     : score >= 20 ? { grade:'D', color:'#f97316', label:'Poor' }
                     :               { grade:'F', color:'#ef4444', label:'Hazardous' };

    // Individual metric scores
    const metrics = [
        { name:'PM2.5',      value: p.pm2_5, unit:'µg/m³', safe:12,  warn:35,  color:'#ef4444' },
        { name:'PM10',       value: p.pm10,  unit:'µg/m³', safe:54,  warn:154, color:'#fb923c' },
        { name:'Ozone (O₃)', value: p.o3,    unit:'µg/m³', safe:60,  warn:120, color:'#fbbf24' },
        { name:'NO₂',        value: p.no2,   unit:'µg/m³', safe:40,  warn:100, color:'#3b82f6' },
        { name:'SO₂',        value: p.so2,   unit:'µg/m³', safe:20,  warn:80,  color:'#8b5cf6' },
    ].map(m => ({
        ...m,
        status: m.value <= m.safe ? '✅ Safe' : m.value <= m.warn ? '⚠️ Moderate' : '❌ High',
        statusColor: m.value <= m.safe ? '#10b981' : m.value <= m.warn ? '#fbbf24' : '#ef4444',
        barPct: Math.min((m.value / (m.warn * 1.5)) * 100, 100).toFixed(0)
    }));

    const advice = [
        { icon:'fas fa-person-running', label:'Outdoor Exercise', value: aqi<=50?'✅ Go for it!'     : aqi<=100?'⚠️ Limit intensity' : aqi<=150?'⚠️ Short walks only'  : '❌ Stay indoors', color: aqi<=100?'#10b981':aqi<=150?'#fbbf24':'#ef4444' },
        { icon:'fas fa-window-maximize',label:'Keep Windows',     value: aqi<=50?'✅ Open them wide'  : aqi<=100?'⚠️ Partly open'    : '❌ Keep closed',               color: aqi<=100?'#10b981':aqi<=150?'#fbbf24':'#ef4444' },
        { icon:'fas fa-masks-theater',  label:'Mask Needed',      value: aqi<=100?'No mask needed'    : aqi<=150?'Surgical mask OK'  : aqi<=200?'N95 recommended'     : 'N95/N99 required', color: aqi<=100?'#10b981':aqi<=200?'#fbbf24':'#ef4444' },
        { icon:'fas fa-child',          label:'Safe for Kids',    value: aqi<=50?'✅ Perfectly safe'  : aqi<=100?'⚠️ Monitor closely' : '❌ Keep indoors',             color: aqi<=100?'#10b981':aqi<=150?'#fbbf24':'#ef4444' },
    ];

    content.innerHTML = `
        <!-- Report Card -->
        <div id="printableReport" style="background:var(--bg-secondary);border:1px solid var(--border-color);border-radius:20px;overflow:hidden;margin-bottom:1.5rem;">

            <!-- Header -->
            <div style="background:linear-gradient(135deg,${cat.color},${cat.color}aa);padding:1.75rem;color:white;display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:1rem;">
                <div>
                    <div style="font-size:0.72rem;font-weight:700;opacity:0.85;letter-spacing:0.1em;text-transform:uppercase;margin-bottom:4px;">🫁 AirPulse Health Report</div>
                    <div style="font-size:1.5rem;font-weight:900;">${city.name}, ${city.state || 'India'}</div>
                    <div style="font-size:0.8rem;opacity:0.85;margin-top:3px;">${dateStr}</div>
                </div>
                <div style="text-align:center;background:rgba(255,255,255,0.2);border-radius:16px;padding:1rem 1.5rem;">
                    <div style="font-size:3.5rem;font-weight:900;line-height:1;">${score}</div>
                    <div style="font-size:0.72rem;font-weight:700;opacity:0.9;">AIR SCORE</div>
                    <div style="font-size:2rem;font-weight:900;margin-top:2px;">${scoreGrade.grade}</div>
                    <div style="font-size:0.7rem;opacity:0.85;">${scoreGrade.label}</div>
                </div>
            </div>

            <!-- AQI + Quick Advice -->
            <div style="display:grid;grid-template-columns:auto 1fr;gap:1.25rem;padding:1.25rem;border-bottom:1px solid var(--border-color);align-items:center;">
                <div style="background:${cat.color}15;border-radius:14px;padding:1rem 1.5rem;text-align:center;">
                    <div style="font-size:3rem;font-weight:900;color:${cat.color};line-height:1;">${aqi}</div>
                    <div style="font-size:0.68rem;font-weight:700;color:${cat.color};">CURRENT AQI</div>
                    <div style="font-size:0.72rem;color:var(--text-muted);margin-top:3px;">${cat.label}</div>
                </div>
                <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:0.6rem;">
                    ${advice.map(a => `
                        <div style="background:var(--bg-secondary);border:1px solid var(--border-color);border-radius:10px;padding:0.65rem 0.85rem;display:flex;gap:0.6rem;align-items:flex-start;">
                            <i class="${a.icon}" style="color:${a.color};font-size:0.9rem;margin-top:2px;flex-shrink:0;"></i>
                            <div>
                                <div style="font-size:0.68rem;font-weight:700;color:var(--text-muted);">${a.label}</div>
                                <div style="font-size:0.75rem;font-weight:600;color:${a.color};margin-top:1px;">${a.value}</div>
                            </div>
                        </div>`).join('')}
                </div>
            </div>

            <!-- Pollutant Breakdown -->
            <div style="padding:1.25rem;">
                <div style="font-size:0.8rem;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.08em;margin-bottom:0.85rem;">Pollutant Breakdown</div>
                <div style="display:flex;flex-direction:column;gap:0.65rem;">
                    ${metrics.map(m => `
                        <div style="display:grid;grid-template-columns:100px 1fr 80px 80px;align-items:center;gap:0.75rem;">
                            <div style="font-size:0.78rem;font-weight:600;color:var(--text-secondary);">${m.name}</div>
                            <div style="height:7px;background:var(--border-color);border-radius:4px;overflow:hidden;">
                                <div style="height:100%;width:${m.barPct}%;background:${m.color};border-radius:4px;transition:width 0.8s;"></div>
                            </div>
                            <div style="font-size:0.75rem;font-weight:700;color:${m.color};text-align:right;">${m.value.toFixed(1)} ${m.unit}</div>
                            <div style="font-size:0.72rem;font-weight:700;color:${m.statusColor};text-align:right;">${m.status}</div>
                        </div>`).join('')}
                </div>
            </div>

            <!-- Footer -->
            <div style="background:var(--border-color);padding:0.75rem 1.25rem;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:0.5rem;">
                <span style="font-size:0.72rem;color:var(--text-muted);">🫁 Generated by AirPulse · airpulse.in · ${now.toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'})}</span>
                <span style="font-size:0.72rem;color:var(--text-muted);">Data: OpenWeatherMap API · 🇮🇳 Made in India</span>
            </div>
        </div>

        <!-- Action buttons -->
        <div style="display:flex;gap:0.75rem;flex-wrap:wrap;">
            <button onclick="window.print()" style="padding:0.65rem 1.4rem;background:var(--primary);color:white;border:none;border-radius:10px;cursor:pointer;font-family:inherit;font-weight:700;font-size:0.85rem;display:flex;align-items:center;gap:6px;">
                <i class="fas fa-download"></i> Save / Print Report
            </button>
            <button onclick="shareReport('${city.name}', ${aqi}, '${cat.label}')" style="padding:0.65rem 1.4rem;background:transparent;color:var(--primary);border:2px solid var(--primary);border-radius:10px;cursor:pointer;font-family:inherit;font-weight:700;font-size:0.85rem;display:flex;align-items:center;gap:6px;">
                <i class="fas fa-share-alt"></i> Share Report
            </button>
        </div>`;
}

function shareReport(city, aqi, label) {
    const emoji = aqi<=50?'🟢':aqi<=100?'🟡':aqi<=150?'🟠':aqi<=200?'🔴':'🟣';
    const text  = `${emoji} AirPulse Health Report\n📍 ${city}\n🌫 AQI: ${aqi} — ${label}\n\nCheck your city's air quality at airpulse.in 🇮🇳`;
    if (navigator.share) {
        navigator.share({ title:`AirPulse — ${city} Air Quality`, text, url:'https://airpulse.in' })
            .catch(() => copyToClipboard(text));
    } else {
        copyToClipboard(text);
    }
}

function copyToClipboard(text) {
    navigator.clipboard.writeText(text)
        .then(() => showToast('Report copied to clipboard!', 'success'))
        .catch(() => showToast('Could not copy — please screenshot manually', 'warning'));
}

// Refresh new tabs when a city is loaded — called from the existing displayCityData hook
function refreshNewTabsOnCityLoad() {
    const active = document.querySelector('.content-section.active');
    if (!active) return;
    const id = active.id;
    if (id === 'forecastSection')   loadForecastSection();
    if (id === 'sourcesSection')    loadSourcesSection();
    if (id === 'reportcardSection') loadReportCard();
}
