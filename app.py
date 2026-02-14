"""
AirPulse - Enhanced Flask Backend
India's Premier Air Quality Monitoring System
Protecting Families Across India, One Breath at a Time

Version 6.0.0 - AirPulse Rebrand Edition
"""

from flask import Flask, render_template, jsonify, request, send_from_directory
from flask_cors import CORS
import requests
import os
from datetime import datetime, timedelta
import json
import logging
from functools import wraps
import time

# Initialize Flask app
app = Flask(__name__)
CORS(app)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# ==========================================
# CONFIGURATION
# ==========================================

class Config:
    # Use environment variable for API key (SECURITY IMPROVEMENT)
    API_KEY = os.getenv('OPENWEATHER_API_KEY', 'f7618e66e4b549ed214664ce91f8e870')
    BASE_URL = 'https://api.openweathermap.org/data/2.5/air_pollution'
    GEO_URL = 'https://api.openweathermap.org/geo/1.0/direct'
    WEATHER_URL = 'https://api.openweathermap.org/data/2.5/weather'
    FORECAST_URL = 'https://api.openweathermap.org/data/2.5/air_pollution/forecast'
    HISTORY_URL = 'https://api.openweathermap.org/data/2.5/air_pollution/history'
    
    # Cache settings
    CACHE_TIMEOUT = 300  # 5 minutes
    REQUEST_TIMEOUT = 10
    
    # AQI Categories with AirPulse voice
    AQI_CATEGORIES = {
        'good': {
            'min': 0,
            'max': 50,
            'color': '#10b981',
            'label': 'Good',
            'description': '✅ Perfect day to step outside! Air quality is excellent.',
            'icon': 'fa-smile',
            'advice': 'Breathe easy - ideal conditions for all outdoor activities!'
        },
        'moderate': {
            'min': 51,
            'max': 100,
            'color': '#fbbf24',
            'label': 'Moderate',
            'description': '⚠️ Generally safe, but sensitive friends should take it easy outdoors.',
            'icon': 'fa-meh',
            'advice': 'Most people can enjoy outdoor activities normally'
        },
        'sensitive': {
            'min': 101,
            'max': 150,
            'color': '#fb923c',
            'label': 'Unhealthy for Sensitive Groups',
            'description': '⚠️ Kids, seniors, and those with breathing conditions should limit outdoor time.',
            'icon': 'fa-frown',
            'advice': 'Vulnerable groups should reduce prolonged outdoor activities'
        },
        'unhealthy': {
            'min': 151,
            'max': 200,
            'color': '#ef4444',
            'label': 'Unhealthy',
            'description': '❌ Stay indoors today. Air quality affects everyone, especially kids and elders.',
            'icon': 'fa-sad-tear',
            'advice': 'Everyone should limit outdoor activities and wear masks if going out'
        },
        'very_unhealthy': {
            'min': 201,
            'max': 300,
            'color': '#a855f7',
            'label': 'Very Unhealthy',
            'description': '❌ Serious health risk - stay inside with windows closed.',
            'icon': 'fa-dizzy',
            'advice': 'Stay indoors. Use air purifiers. Avoid all outdoor activities.'
        },
        'hazardous': {
            'min': 301,
            'max': 500,
            'color': '#7f1d1d',
            'label': 'Hazardous',
            'description': '🚫 EMERGENCY: Do NOT go outside. Close windows. Call 102 if breathing difficulty.',
            'icon': 'fa-skull-crossbones',
            'advice': 'Health emergency - complete indoor isolation required immediately'
        }
    }
    
    # Age-specific safety guidelines (AirPulse Voice Enhanced)
    AGE_GROUP_SAFETY = {
        'children': {
            'name': 'Protecting Our Kids (0-12)',
            'icon': 'fa-child',
            'color': '#3b82f6',
            'description': 'Children breathe faster and their lungs are still developing - they need extra protection from air pollution',
            'guidelines': {
                'good': {
                    'outdoor_activities': '✅ Perfect for outdoor play and sports',
                    'precautions': 'No restrictions - let kids enjoy the fresh air!',
                    'recommendations': [
                        'Great day for park visits and playground fun',
                        'School sports and PE classes are perfectly safe',
                        'Encourage outdoor activities - it\'s healthy!',
                        'Perfect time for cycling, running, and games',
                        'Fresh air is great for growing lungs'
                    ]
                },
                'moderate': {
                    'outdoor_activities': '✅ Generally safe - just watch for sensitive kids',
                    'precautions': 'Keep an eye on children with asthma or allergies',
                    'recommendations': [
                        'Outdoor play is fine for most children',
                        'Kids with asthma should have their inhaler nearby',
                        'Reduce high-intensity games during peak pollution hours',
                        'Take breaks if your child seems uncomfortable',
                        'Stay hydrated during outdoor activities',
                        'Watch for coughing or unusual tiredness'
                    ]
                },
                'sensitive': {
                    'outdoor_activities': '⚠️ Limit outdoor playtime to 1-2 hours',
                    'precautions': 'Children with breathing issues should stay inside when possible',
                    'recommendations': [
                        'Keep outdoor play short - under 2 hours is best',
                        'Skip intense sports - choose calmer activities',
                        'Indoor games are a better choice today',
                        'Have rescue medications ready and accessible',
                        'Watch closely for coughing or wheezing',
                        'Early morning has cleaner air for outdoor time'
                    ]
                },
                'unhealthy': {
                    'outdoor_activities': '❌ Keep kids indoors - outdoor air is harmful',
                    'precautions': 'This is serious - children should stay inside',
                    'recommendations': [
                        'Cancel all outdoor sports and PE classes',
                        'Close windows at home and school',
                        'Run air purifiers in kids\' rooms',
                        'Reschedule outdoor birthday parties',
                        'Children with asthma must stay indoors',
                        'Call doctor if breathing problems develop',
                        'Use N95 masks if brief outdoor trips are unavoidable'
                    ]
                },
                'very_unhealthy': {
                    'outdoor_activities': '❌ Children must stay indoors - this is very serious',
                    'precautions': 'Dangerous conditions for children - complete indoor protection needed',
                    'recommendations': [
                        'All outdoor activities must be cancelled immediately',
                        'Seal all windows and doors',
                        'Run HEPA air purifiers continuously in all rooms',
                        'Even indoor exercise should be light and calm',
                        'See a doctor immediately if breathing symptoms appear',
                        'Consider keeping children home from school',
                        'Keep emergency medications within easy reach',
                        'Monitor children closely for any health changes'
                    ]
                },
                'hazardous': {
                    'outdoor_activities': '🚫 EMERGENCY: Children must stay inside at all times',
                    'precautions': 'CRITICAL health emergency - protect children immediately',
                    'recommendations': [
                        'Keep children indoors with zero exceptions',
                        'Completely seal windows and doors',
                        'Use high-quality HEPA air purifiers everywhere',
                        'Schools should be closed - keep kids home',
                        'Rush to hospital for any breathing difficulty (Call 102)',
                        'Have all emergency medications ready',
                        'Consider evacuating to area with cleaner air',
                        'Follow all emergency broadcasts and health alerts'
                    ]
                }
            }
        },
        'elderly': {
            'name': 'Caring for Seniors (65+)',
            'icon': 'fa-user-clock',
            'color': '#8b5cf6',
            'description': 'Older adults face higher risks due to weakened immune systems and existing health conditions',
            'guidelines': {
                'good': {
                    'outdoor_activities': '✅ Enjoy your morning walk - the air is clean!',
                    'precautions': 'None needed - perfect day for outdoor activities',
                    'recommendations': [
                        'Excellent conditions for morning walks',
                        'Gardening is safe and enjoyable today',
                        'Outdoor yoga and light exercise recommended',
                        'Great time for social activities in parks',
                        'Visit outdoor markets and green spaces safely'
                    ]
                },
                'moderate': {
                    'outdoor_activities': '✅ Safe for most activities - just take normal precautions',
                    'precautions': 'Listen to your body - rest if you feel unusual fatigue',
                    'recommendations': [
                        'Morning walks are fine - enjoy the fresh air',
                        'Avoid busy streets during rush hours (7-10 AM, 5-8 PM)',
                        'Stay hydrated during outdoor activities',
                        'Those with heart/lung conditions should be extra cautious',
                        'Take frequent rest breaks',
                        'Keep your mobile phone handy for emergencies'
                    ]
                },
                'sensitive': {
                    'outdoor_activities': '⚠️ Limit your time outside, especially if you have health conditions',
                    'precautions': 'Heart and lung patients should minimize outdoor exposure',
                    'recommendations': [
                        'Keep walks short - 30 minutes maximum',
                        'Skip any strenuous activities completely',
                        'Stay indoors during midday pollution peaks',
                        'Have all medications readily accessible',
                        'Monitor your heart rate and breathing carefully',
                        'Rest frequently during any outdoor time',
                        'Have someone accompany you outdoors for safety'
                    ]
                },
                'unhealthy': {
                    'outdoor_activities': '❌ Please stay indoors - outdoor air is dangerous',
                    'precautions': 'Serious risk for anyone with heart or lung conditions',
                    'recommendations': [
                        'Avoid all outdoor activities today',
                        'Keep all windows and doors closed',
                        'Use air purifiers in your living spaces',
                        'Check your blood pressure and oxygen levels regularly',
                        'Keep emergency medications nearby and ready',
                        'Postpone medical appointments if possible',
                        'Contact your doctor if symptoms worsen',
                        'Keep emergency contacts (102/108/112) readily available'
                    ]
                },
                'very_unhealthy': {
                    'outdoor_activities': '❌ You must stay inside - this is an emergency',
                    'precautions': 'Emergency alert for all seniors - immediate action required',
                    'recommendations': [
                        'Complete indoor isolation is necessary',
                        'Seal all windows and doors immediately',
                        'Run air purifiers continuously',
                        'Monitor blood pressure and oxygen levels closely',
                        'Keep emergency contacts immediately available',
                        'Have someone check on you regularly',
                        'Seek immediate medical help for any symptoms',
                        'Hospital admission may be needed for vulnerable seniors'
                    ]
                },
                'hazardous': {
                    'outdoor_activities': '🚫 MEDICAL EMERGENCY - Absolute indoor isolation required',
                    'precautions': 'Life-threatening conditions for seniors - call 102 if needed',
                    'recommendations': [
                        'Absolute indoor isolation required immediately',
                        'Continuous medical monitoring strongly recommended',
                        'Have someone stay with you if possible',
                        'Emergency services should be on standby',
                        'Consider temporary relocation to cleaner area',
                        'Hospital admission may be necessary for safety',
                        'Follow all emergency medical protocols',
                        'Keep oxygen support ready if prescribed'
                    ]
                }
            }
        },
        'respiratory': {
            'name': 'Asthma & Breathing Support',
            'icon': 'fa-lungs',
            'color': '#06b6d4',
            'description': 'People with asthma, COPD, or other breathing conditions need extra care during pollution',
            'guidelines': {
                'good': {
                    'outdoor_activities': '✅ Safe to breathe freely - enjoy the clean air',
                    'precautions': 'Keep your rescue inhaler handy as usual',
                    'recommendations': [
                        'Normal outdoor activities are perfectly safe',
                        'Regular exercise actually helps lung health',
                        'Continue your regular medication schedule',
                        'Good time for outdoor breathing exercises',
                        'Pulmonary rehabilitation activities are safe'
                    ]
                },
                'moderate': {
                    'outdoor_activities': '⚠️ Be cautious - have your inhaler ready',
                    'precautions': 'Keep rescue medications accessible at all times',
                    'recommendations': [
                        'Reduce the intensity of outdoor exercise',
                        'Take more frequent breaks than usual',
                        'Avoid outdoor activities during rush hour pollution',
                        'Watch for early warning signs (cough, wheeze, tightness)',
                        'Have your asthma action plan ready',
                        'Consider using preventive inhaler before going out'
                    ]
                },
                'sensitive': {
                    'outdoor_activities': '❌ Stay inside - outdoor air can trigger attacks',
                    'precautions': 'High risk for breathing problems and attacks',
                    'recommendations': [
                        'Avoid going outdoors completely today',
                        'Keep all rescue medications nearby',
                        'Monitor your breathing closely (peak flow if applicable)',
                        'Talk to your doctor about increasing preventive meds',
                        'Contact doctor immediately if symptoms worsen',
                        'Have your emergency action plan ready',
                        'Use N95 masks if you absolutely must go outside'
                    ]
                },
                'unhealthy': {
                    'outdoor_activities': '❌ Do not go outside - serious attack risk',
                    'precautions': 'High risk of severe attacks and breathing emergencies',
                    'recommendations': [
                        'Complete indoor isolation required',
                        'Use all prescribed medications exactly as directed',
                        'Run HEPA air purifiers continuously',
                        'Monitor peak flow if you have a meter',
                        'Keep emergency medications ready',
                        'Call your doctor if symptoms increase',
                        'Go to ER immediately for severe symptoms (Call 102)',
                        'Keep nebulizer ready if prescribed'
                    ]
                },
                'very_unhealthy': {
                    'outdoor_activities': '🚫 EMERGENCY - Life-threatening conditions',
                    'precautions': 'Breathing emergency likely - medical help may be needed',
                    'recommendations': [
                        'Absolute indoor isolation necessary',
                        'Medical supervision strongly recommended',
                        'Increase preventive medications per doctor advice',
                        'Continuous symptom monitoring required',
                        'Emergency services (102/108) on alert',
                        'Hospital admission may be needed',
                        'Consider evacuation to cleaner air area',
                        'Have oxygen support ready if prescribed'
                    ]
                },
                'hazardous': {
                    'outdoor_activities': '🚫 CRITICAL EMERGENCY - Immediate medical attention',
                    'precautions': 'Life-threatening - hospital care may be required immediately',
                    'recommendations': [
                        'Medical emergency protocols active',
                        'Hospital admission strongly advised immediately',
                        'Continuous medical monitoring necessary',
                        'Maximum medication dosing per doctor orders',
                        'Emergency evacuation if possible',
                        'Life support may be necessary',
                        'Follow all medical directives immediately',
                        'ICU admission may be required for severe cases'
                    ]
                }
            }
        },
        'cardiovascular': {
            'name': 'Heart Health Protection',
            'icon': 'fa-heartbeat',
            'color': '#ef4444',
            'description': 'Heart disease and high blood pressure patients need special protection from air pollution',
            'guidelines': {
                'good': {
                    'outdoor_activities': '✅ Perfect for your doctor-approved exercise routine',
                    'precautions': 'Take normal cardiac precautions',
                    'recommendations': [
                        'Doctor-approved exercise is safe and beneficial',
                        'Walking and light cardio are recommended',
                        'Monitor heart rate as you normally would',
                        'Excellent conditions for cardiac rehabilitation',
                        'Take medications on regular schedule'
                    ]
                },
                'moderate': {
                    'outdoor_activities': '⚠️ Take it easy - reduce exercise intensity',
                    'precautions': 'Watch for chest discomfort or unusual fatigue',
                    'recommendations': [
                        'Light walks are fine - avoid intense exercise',
                        'Take all medications exactly as prescribed',
                        'Check blood pressure before and after activity',
                        'Rest frequently and listen to your body',
                        'Avoid outdoor activity during hot hours',
                        'Keep nitroglycerin with you if prescribed'
                    ]
                },
                'sensitive': {
                    'outdoor_activities': '❌ Stay inside - outdoor air strains your heart',
                    'precautions': 'Increased risk of cardiac events',
                    'recommendations': [
                        'Stay indoors as much as possible',
                        'Avoid any physical exertion',
                        'Take all prescribed medications on schedule',
                        'Monitor vital signs regularly (BP, pulse)',
                        'Have nitroglycerin/emergency meds ready',
                        'Contact your cardiologist if any symptoms occur',
                        'Keep phone nearby at all times for emergencies'
                    ]
                },
                'unhealthy': {
                    'outdoor_activities': '❌ Rest indoors - serious heart attack/stroke risk',
                    'precautions': 'High risk of heart attack or stroke',
                    'recommendations': [
                        'Complete indoor rest required',
                        'Minimal physical activity only',
                        'Monitor blood pressure frequently',
                        'Watch for warning signs (chest pain, shortness of breath)',
                        'Have someone with you if possible',
                        'Emergency medical plan ready',
                        'Call 102/108/112 immediately for any cardiac symptoms',
                        'Keep aspirin readily available'
                    ]
                },
                'very_unhealthy': {
                    'outdoor_activities': '🚫 CARDIAC EMERGENCY ALERT',
                    'precautions': 'Critical cardiac risk level - medical help ready',
                    'recommendations': [
                        'Medical supervision strongly recommended',
                        'Consider hospital admission for high-risk patients',
                        'Continuous vital sign monitoring',
                        'Maximum medical support needed',
                        'Emergency services on standby',
                        'Evacuation if conditions persist',
                        'Follow cardiologist directives strictly',
                        'Have emergency medications immediately accessible'
                    ]
                },
                'hazardous': {
                    'outdoor_activities': '🚫 LIFE-THREATENING - Hospital care required',
                    'precautions': 'Immediate hospitalization recommended',
                    'recommendations': [
                        'Hospital admission required for vulnerable patients',
                        'ICU monitoring may be necessary',
                        'Complete cardiac support systems ready',
                        'Emergency protocols active',
                        'Life-saving interventions on standby',
                        'Immediate evacuation strongly advised',
                        'Maximum medical intervention required',
                        'Defibrillator access essential'
                    ]
                }
            }
        }
    }

# Simple in-memory cache
cache = {}

# ==========================================
# HELPER FUNCTIONS
# ==========================================

def cache_get(key):
    """Get value from cache"""
    if key in cache:
        data, timestamp = cache[key]
        if time.time() - timestamp < Config.CACHE_TIMEOUT:
            logger.info(f"Cache hit for: {key}")
            return data
        else:
            del cache[key]
    return None

def cache_set(key, value):
    """Set value in cache"""
    cache[key] = (value, time.time())
    logger.info(f"Cache set for: {key}")

def error_response(message, status_code=500):
    """Return error response"""
    logger.error(f"Error response: {message} (Status: {status_code})")
    return jsonify({
        'success': False,
        'error': message,
        'timestamp': datetime.now().isoformat()
    }), status_code

def success_response(data):
    """Return success response"""
    return jsonify({
        'success': True,
        'data': data,
        'timestamp': datetime.now().isoformat()
    })

def get_aqi_category_name(aqi):
    """Get category name from AQI value"""
    if aqi <= 50:
        return 'good'
    elif aqi <= 100:
        return 'moderate'
    elif aqi <= 150:
        return 'sensitive'
    elif aqi <= 200:
        return 'unhealthy'
    elif aqi <= 300:
        return 'very_unhealthy'
    else:
        return 'hazardous'

# ==========================================
# API ENDPOINTS
# ==========================================

@app.route('/api/age-group-safety/<group>')
def get_age_group_safety(group):
    """Get safety information for specific age group"""
    try:
        aqi = request.args.get('aqi', type=int)
        if aqi is None:
            return error_response('AQI parameter is required', 400)
        
        if group not in Config.AGE_GROUP_SAFETY:
            return error_response(f'Invalid age group: {group}', 400)
        
        category = get_aqi_category_name(aqi)
        age_data = Config.AGE_GROUP_SAFETY[group]
        guidelines = age_data['guidelines'][category]
        
        return success_response({
            'group': group,
            'name': age_data['name'],
            'icon': age_data['icon'],
            'color': age_data['color'],
            'description': age_data['description'],
            'aqi': aqi,
            'category': category,
            'outdoor_activities': guidelines['outdoor_activities'],
            'precautions': guidelines['precautions'],
            'recommendations': guidelines['recommendations']
        })
    
    except Exception as e:
        logger.error(f"Error getting age group safety: {str(e)}")
        return error_response(str(e))

@app.route('/api/all-age-groups-safety')
def get_all_age_groups_safety():
    """Get safety information for all age groups"""
    try:
        aqi = request.args.get('aqi', type=int)
        if aqi is None:
            return error_response('AQI parameter is required', 400)
        
        category = get_aqi_category_name(aqi)
        all_groups = {}
        
        for group_key, age_data in Config.AGE_GROUP_SAFETY.items():
            guidelines = age_data['guidelines'][category]
            all_groups[group_key] = {
                'name': age_data['name'],
                'icon': age_data['icon'],
                'color': age_data['color'],
                'description': age_data['description'],
                'outdoor_activities': guidelines['outdoor_activities'],
                'precautions': guidelines['precautions'],
                'recommendations': guidelines['recommendations']
            }
        
        return success_response({
            'aqi': aqi,
            'category': category,
            'category_info': Config.AQI_CATEGORIES[category],
            'age_groups': all_groups
        })
    
    except Exception as e:
        logger.error(f"Error getting all age groups safety: {str(e)}")
        return error_response(str(e))

@app.route('/api/age-groups')
def get_age_groups():
    """Get list of all age groups with basic info"""
    try:
        groups = []
        for key, data in Config.AGE_GROUP_SAFETY.items():
            groups.append({
                'key': key,
                'name': data['name'],
                'icon': data['icon'],
                'color': data['color'],
                'description': data['description']
            })
        
        return success_response(groups)
    
    except Exception as e:
        logger.error(f"Error getting age groups: {str(e)}")
        return error_response(str(e))

@app.route('/')
def index():
    """Serve the main application"""
    return render_template('index.html')

@app.route('/static/<path:filename>')
def serve_static(filename):
    """Serve static files"""
    return send_from_directory('static', filename)

# ==========================================
# RUN APPLICATION
# ==========================================

if __name__ == '__main__':
    # Create directories if they don't exist
    os.makedirs('templates', exist_ok=True)
    os.makedirs('static', exist_ok=True)
    
    logger.info("=" * 70)
    logger.info("🫁 Starting AirPulse - India's Premier Air Quality Monitor")
    logger.info("=" * 70)
    logger.info(f"Version: 6.0.0 - AirPulse Rebrand Edition")
    logger.info(f"Tagline: Protecting Families Across India, One Breath at a Time 🇮🇳")
    logger.info(f"API Key Configured: {bool(Config.API_KEY)}")
    logger.info(f"Age-Specific Safety Groups: {len(Config.AGE_GROUP_SAFETY)}")
    logger.info(f"Protected Groups: 👶 Children | 👴 Seniors | 🫁 Respiratory | 💓 Heart")
    logger.info("=" * 70)
    
    # Run the app
    app.run(
        debug=True,
        host='0.0.0.0',
        port=5000,
        threaded=True
    )