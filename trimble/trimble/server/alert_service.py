# server/alert_service.py
from datetime import datetime
import time
import threading
import requests
from flask import current_app, jsonify
from flask_socketio import emit
import os
from pathlib import Path
from dotenv import load_dotenv

env_path = Path(__file__).resolve().parents[1] / '.env'
load_dotenv(dotenv_path=env_path)

class AlertService:
    def __init__(self, app, socketio):
        self.app = app
        self.socketio = socketio
        self.thread = None
        self.running = False
        self.latest_rainfall = 0  # Store latest rainfall data
        self.last_updated = None

    def get_current_rainfall(self):
        """Fetch rainfall data from OpenWeatherMap"""
        with self.app.app_context():
            try:
                lat, lon = 13.0827, 80.2707  # Chennai coordinates
                api_key = os.getenv('OPENWEATHER_API_KEY')
                if not api_key:
                    current_app.logger.warning("No OpenWeatherMap API key configured")
                    return 0
                    
                url = f"https://api.openweathermap.org/data/2.5/weather?lat={lat}&lon={lon}&appid={api_key}&units=metric"
                response = requests.get(url, timeout=5)
                response.raise_for_status()
                data = response.json()
                
                rainfall = data.get("rain", {}).get("1h", 0)
                
                # Store the latest data
                self.latest_rainfall = rainfall
                self.last_updated = datetime.now()
                
                return rainfall
            except Exception as e:
                current_app.logger.error(f"Rainfall API error: {str(e)}")
                return 0

    def get_forecast_data(self, rainfall):
        """Generate forecast data based on current rainfall"""
        if rainfall > 20:
            return {
                'risk': 'extreme',
                'action': 'Evacuate immediately from flood-prone areas'
            }
        elif rainfall > 10:
            return {
                'risk': 'high', 
                'action': 'Prepare evacuation plans and monitor conditions'
            }
        elif rainfall > 5:
            return {
                'risk': 'moderate',
                'action': 'Monitor weather conditions closely'
            }
        else:
            return {
                'risk': 'low',
                'action': 'Normal monitoring'
            }

    def get_rainfall_data(self):
        """Get current rainfall data for API endpoint"""
        # If data is older than 10 minutes, fetch fresh data
        if (not self.last_updated or 
            (datetime.now() - self.last_updated).total_seconds() > 600):
            self.get_current_rainfall()
        
        return {
            'rain_last_hour': self.latest_rainfall,
            'forecast': self.get_forecast_data(self.latest_rainfall),
            'last_updated': self.last_updated.isoformat() if self.last_updated else None
        }

    def run(self):
        """Main monitoring loop"""
        self.running = True
        while self.running:
            with self.app.app_context():
                try:
                    rainfall = self.get_current_rainfall()
                    current_app.logger.info(f"Current rainfall: {rainfall}mm/h")
                        
                    if rainfall > 10:
                        alert_msg = {
                            'type': 'flood_warning',
                            'message': f'Heavy rainfall detected: {rainfall}mm/h',
                            'severity': 'high' if rainfall < 20 else 'extreme',
                            'timestamp': datetime.now().isoformat(),
                            'recommendation': 'Prepare evacuation plans' if rainfall < 20 else 'Evacuate immediately'
                        }
                        self.socketio.emit('alert', alert_msg, namespace='/alerts')
                        
                    time.sleep(300)  # Check every 5 minutes
                except Exception as e:
                    current_app.logger.error(f"Alert service error: {str(e)}")
                    time.sleep(60)  # Wait before retrying on error

    def start(self):
        """Start the alert service"""
        if not self.thread or not self.thread.is_alive():
            self.thread = threading.Thread(target=self.run, daemon=True)
            self.thread.start()
            # Use app context for logging
            with self.app.app_context():
                current_app.logger.info("Alert service started")

    def stop(self):
        """Stop the alert service"""
        self.running = False
        if self.thread:
            self.thread.join(timeout=5)

# Global alert service instance
alert_service = None

def init_alert_service(app, socketio):
    """Initialize the alert service"""
    global alert_service
    if alert_service is None:
        alert_service = AlertService(app, socketio)
        alert_service.start()

def register_socket_events(socketio):
    """Register socket events"""
    @socketio.on('connect')
    def handle_connect():
        emit('status', {'message': 'Connected to alert service'})
        
    @socketio.on('disconnect')
    def handle_disconnect():
        emit('status', {'message': 'Disconnected from alert service'})

