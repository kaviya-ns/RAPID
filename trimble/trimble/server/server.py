from flask import Flask, jsonify, request, session
from flask_sqlalchemy import SQLAlchemy
from geoalchemy2 import Geometry
from sqlalchemy import func, text, cast, Integer, case
import logging
from datetime import datetime
import os
from urllib.parse import quote_plus
from pathlib import Path
from dotenv import load_dotenv
from geoalchemy2.shape import to_shape as geo_to_shape
from flask_cors import CORS # Import CORS
from flask_socketio import SocketIO
from functools import wraps
import json 
import pytz

app = Flask(__name__)

CORS(app, supports_credentials=True, origins=["http://localhost:3000"]) 

# Load configuration
env_path = Path(__file__).resolve().parents[1] / '.env'
load_dotenv(dotenv_path=env_path)
logger = logging.getLogger(__name__)
socketio = SocketIO(app, cors_allowed_origins="*")

# Database configuration
DB_USER = os.getenv('DB_USER')
DB_PASSWORD = quote_plus(os.getenv('DB_PASSWORD'))
DB_HOST = os.getenv('DB_HOST', 'localhost')
DB_PORT = os.getenv('DB_PORT', '5432')
DB_NAME = os.getenv('DB_NAME')

ADMIN_PASS=os.getenv('ADMIN_PASS')
FIELD_PASS=os.getenv('FIELD_PASS')
COMM_PASS=os.getenv('COMM_PASS')

app.config['SQLALCHEMY_DATABASE_URI'] = f"postgresql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}"
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.secret_key = os.environ.get('FLASK_SECRET_KEY') # Provide a fallback for local testing
# Initialize extensions with app
db = SQLAlchemy(app)

def serialize(self):
        try:
            geojson = db.session.scalar(func.ST_AsGeoJSON(self.geometry))
        except Exception:
            geojson = None

        return {
            'id': self.id,
            'zone_name': self.zone_name,
            'risk_level': self.risk_level,
            'water_level': self.water_level,
            'last_updated': self.last_updated.isoformat() if self.last_updated else None,
            'description': self.description,
            'geometry': json.loads(geojson) if geojson else None
        }

# Database Models 
class FloodRiskZone(db.Model):
    __tablename__ = 'flood_risk_zones'
    id = db.Column(db.Integer, primary_key=True)
    zone_name = db.Column(db.String(255), nullable=False, unique=True)
    # Polygon geometry for the flood zone boundary
    geometry = db.Column(Geometry('POLYGON', srid=4326), nullable=False)
    risk_level = db.Column(db.String(50), nullable=False) # e.g., 'low', 'moderate', 'high', 'extreme'
    water_level = db.Column(db.Float, default=0.0) # Current water level in meters
    last_updated = db.Column(db.DateTime, default=datetime.utcnow)
    description = db.Column(db.Text)

    def serialize(self):
        try:
            geojson = db.session.scalar(func.ST_AsGeoJSON(self.geometry))
        except Exception:
            geojson = None

        return {
            'id': self.id,
            'zone_name': self.zone_name,
            'risk_level': self.risk_level,
            'water_level': self.water_level,
            'last_updated': self.last_updated.isoformat() if self.last_updated else None,
            'description': self.description,
            'geometry': json.loads(geojson) if geojson else None
        }

class EmergencyFacility(db.Model):
    __tablename__ = 'emergency_facilities'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(255), nullable=False)
    type = db.Column(db.String(50), nullable=False)
    location = db.Column(Geometry('POINT', srid=4326), nullable=False)
    status = db.Column(db.String(50), default='operational')
    contact_info = db.Column(db.String(255))
    capacity_overall = db.Column(db.Integer)
    description = db.Column(db.Text)
    last_updated = db.Column(db.DateTime, default=datetime.utcnow)
    
    personnel = db.relationship('Personnel', backref='facility', lazy=True)
    vehicles = db.relationship('Vehicle', backref='facility', lazy=True)
    supplies = db.relationship('SupplyItem', backref='facility', lazy=True)

class Personnel(db.Model):
    __tablename__ = 'personnel'
    id = db.Column(db.Integer, primary_key=True)
    base_facility_id = db.Column(db.Integer, db.ForeignKey('emergency_facilities.id'))
    name = db.Column(db.String(255), nullable=False)
    role = db.Column(db.String(100), nullable=False)
    skills = db.Column(db.Text)
    status = db.Column(db.String(50), default='available')
    current_assignment = db.Column(db.String(255))
    contact_number = db.Column(db.String(20))
    last_updated = db.Column(db.DateTime, default=datetime.utcnow)

class Vehicle(db.Model):
    __tablename__ = 'vehicles'
    id = db.Column(db.Integer, primary_key=True)
    home_facility_id = db.Column(db.Integer, db.ForeignKey('emergency_facilities.id'))
    vehicle_type = db.Column(db.String(50), nullable=False)
    license_plate = db.Column(db.String(20), unique=True)
    current_location = db.Column(Geometry('POINT', srid=4326))
    status = db.Column(db.String(50), default='available')
    capacity_load = db.Column(db.String(100))
    assigned_to = db.Column(db.String(255))
    last_updated = db.Column(db.DateTime, default=datetime.utcnow)

class SupplyItem(db.Model):
    __tablename__ = 'supply_items'
    id = db.Column(db.Integer, primary_key=True)
    facility_id = db.Column(db.Integer, db.ForeignKey('emergency_facilities.id'))
    item_name = db.Column(db.String(100), nullable=False)
    quantity_current = db.Column(db.Integer, nullable=False, default=0)
    quantity_capacity = db.Column(db.Integer)
    unit = db.Column(db.String(20))
    status = db.Column(db.String(50), default='adequate')
    last_updated = db.Column(db.DateTime, default=datetime.utcnow)

class ResponseAction(db.Model):
    __tablename__ = 'response_actions'
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(255), nullable=False)
    team = db.Column(db.String(100))
    location = db.Column(db.String(255))
    timeframe = db.Column(db.String(100))
    importance=db.Column(db.String(100))
    status = db.Column(db.String(50), default='active') # 'active', 'pending', 'completed'
    created_at = db.Column(db.DateTime, default=datetime.now(pytz.utc))
    updated_at = db.Column(db.DateTime, default=datetime.now(pytz.utc), onupdate=datetime.now(pytz.utc))

def _serialize_geometry(geom):
    """Serializes a PostGIS geometry object to GeoJSON format."""
    if geom:
        return json.loads(geo_to_shape(geom).to_json()) # Use the aliased name
    return None

def _flood_risk_zone_to_dict(zone):
    """Helper to serialize FloodRiskZone object including geometry."""
    return {
        "id": zone.id,
        "zone_name": zone.zone_name,
        "risk_level": zone.risk_level,
        "water_level": zone.water_level,
        "last_updated": zone.last_updated.isoformat() if zone.last_updated else None,
        "description": zone.description,
        "geometry": _serialize_geometry(zone.geometry)
    }

def _facility_to_dict(facility):
    """Helper to serialize EmergencyFacility object including geometry."""
    return {
        "id": facility.id,
        "name": facility.name,
        "type": facility.type,
        "status": facility.status,
        "contact_info": facility.contact_info,
        "capacity_overall": facility.capacity_overall,
        "description": facility.description,
        "last_updated": facility.last_updated.isoformat() if facility.last_updated else None,
        "location": {
            'lat': db.session.scalar(func.ST_Y(facility.location)),
            'lng': db.session.scalar(func.ST_X(facility.location))
        } if facility.location else None
    }

def _personnel_to_dict(p):
    return {
        'id': p.id,
        'base_facility_id': p.base_facility_id,
        'name': p.name,
        'role': p.role,
        'skills': p.skills,
        'status': p.status,
        'current_assignment': p.current_assignment,
        'contact_number': p.contact_number,
        'last_updated': p.last_updated.isoformat() if p.last_updated else None,
    }

def _vehicle_to_dict(v):
    return {
        'id': v.id,
        'home_facility_id': v.home_facility_id,
        'vehicle_type': v.vehicle_type,
        'license_plate': v.license_plate,
        'current_location': {
            'lat': db.session.scalar(func.ST_Y(v.current_location)),
            'lng': db.session.scalar(func.ST_X(v.current_location))
        } if v.current_location else None,
        'status': v.status,
        'capacity_load': v.capacity_load,
        'assigned_to': v.assigned_to,
        'last_updated': v.last_updated.isoformat() if v.last_updated else None,
    }

def _supply_item_to_dict(s):
    return {
        'id': s.id,
        'facility_id': s.facility_id,
        'item_name': s.item_name,
        'quantity_current': s.quantity_current,
        'quantity_capacity': s.quantity_capacity,
        'unit': s.unit,
        'status': s.status,
        'last_updated': s.last_updated.isoformat() if s.last_updated else None,
    }

# --- API Endpoints ---
@app.route('/login', methods=['POST'])
def login():
    """
    Handle user login authentication
    """
    try:
        data = request.get_json()
        username = data.get('username')
        password = data.get('password')
        
        if not username or not password:
            return jsonify({
                'success': False,
                'error': 'Username and password are required'
            }), 400

        valid_users = {
            'admin': {'password': ADMIN_PASS, 'role': 'admin'},
            'command': {'password': COMM_PASS, 'role': 'command'},
            'field': {'password': FIELD_PASS, 'role': 'field'}
        }
        
        if username in valid_users and valid_users[username]['password'] == password:
            # Store user session
            session['username'] = username
            session['role'] = valid_users[username]['role']
            
            return jsonify({
                'success': True,
                'user': {
                    'username': username,
                    'role': valid_users[username]['role']
                }
            }), 200
        else:
            return jsonify({
                'success': False,
                'error': 'Invalid username or password'
            }), 401
            
    except Exception as e:
        logger.error(f"Login error: {e}")
        return jsonify({
            'success': False,
            'error': 'Server error occurred'
        }), 500
    
@app.route('/api/user/profile', methods=['GET'])
def get_user_profile():
    """
    Fetch user profile information including username and role
    """
    try:
        # Check if user is logged in
        if 'username' not in session:
            return jsonify({
                'success': False,
                'error': 'User not authenticated'
            }), 401
        
        username = session.get('username')
        role = session.get('role')
        
        return jsonify({
            'success': True,
            'user': {
                'username': username,
                'role': role
            },
            'username': username,  # For direct access
            'role': role          # For direct access
        }), 200
        
    except Exception as e:
        logger.error(f"Profile fetch error: {e}")
        return jsonify({
            'success': False,
            'error': 'Server error occurred'
        }), 500
    
@app.route('/logout', methods=['POST'])
def logout():
    """
    Handle user logout
    """
    session.clear()
    return jsonify({'success': True, 'message': 'Logged out successfully'}), 200

@app.route('/api/auth/status', methods=['GET'])
def auth_status():
    """
    Check if user is authenticated
    """
    if 'username' in session:
        return jsonify({
            'authenticated': True,
            'user': {
                'username': session['username'],
                'role': session.get('role')
            }
        }), 200
    else:
        return jsonify({'authenticated': False}), 401
    
# Updated login_required decorator to handle list of roles
def login_required(role=None):
    def decorator(f):
        @wraps(f)
        def wrapped(*args, **kwargs):
            if 'username' not in session:
                return jsonify({"error": "Authentication required"}), 401
            
            # Handle both single role and list of roles
            if role:
                user_role = session.get('role')
                if isinstance(role, list):
                    if user_role not in role:
                        return jsonify({"error": "Unauthorized"}), 403
                elif user_role != role:
                    return jsonify({"error": "Unauthorized"}), 403
            
            return f(*args, **kwargs)
        return wrapped
    return decorator


@app.route('/api/facilities', methods=['GET'])
@login_required(role=[ 'command', 'admin'])  # All authenticated users can view facilities
def get_facilities():
    """
    Retrieves a list of all emergency facilities.
    Supports optional filtering by type (e.g., /api/facilities?type=Hospital).
    """
    facility_type = request.args.get('type')
    try:
        query = EmergencyFacility.query
        if facility_type:
                query = query.filter(func.lower(EmergencyFacility.type) == facility_type.lower())        
        facilities = query.all()
        result = []
        for facility in facilities:
            location_data = None
            if facility.location:
                try:
                    location_data = {
                        'lat': float(facility.location.data.split('(')[1].split(')')[0].split(' ')[1]),
                        'lng': float(facility.location.data.split('(')[1].split(')')[0].split(' ')[0])
                    }
                except (AttributeError, IndexError, ValueError):
                    location_data = {
                        'lat': db.session.scalar(func.ST_Y(facility.location)),
                        'lng': db.session.scalar(func.ST_X(facility.location))
                    }
            
            result.append({
                'id': facility.id,
                'name': facility.name,
                'type': facility.type,
                'location': location_data,
                'status': facility.status,
                'contact_info': facility.contact_info,
                'capacity_overall': facility.capacity_overall,
                'description': facility.description
            })
        
        return jsonify({
            'facilities': result,
            'total': len(result)
        })
    except Exception as e:
        logging.error(f"Error fetching facilities: {e}")
        return jsonify({
            'error': 'Failed to retrieve facilities data', 
            'details': str(e),
            'facilities': []
        }), 500

@app.route('/api/high-risk-zones', methods=['GET'])
@login_required(role=['command', 'admin'])  # All authenticated users can view risk zones
def get_high_risk_zones():
    """
    Retrieves all flood risk zones from the database and returns them as GeoJSON.
    """
    try:
        zones = FloodRiskZone.query.all()
        zones_data = [zone.serialize() for zone in zones]
        return jsonify({'zones': zones_data}), 200
    except Exception as e:
        print(f"Error fetching high-risk zones: {e}")
        return jsonify({'error': 'Failed to retrieve flood risk zones', 'details': str(e)}), 500

@app.route('/api/facilities/<int:facility_id>/resources', methods=['GET'])
@login_required(role=['command', 'admin'])  # Only command/admin can view detailed resources
def get_facility_resources(facility_id):
    """
    Retrieves detailed personnel, vehicle, and supply information for a specific facility.
    """
    try:
        facility = EmergencyFacility.query.get_or_404(facility_id)
        
        personnel_data = [{
            'id': p.id,
            'name': p.name,
            'role': p.role,
            'skills': p.skills,
            'status': p.status,
            'current_assignment': p.current_assignment,
            'contact': p.contact_number
        } for p in facility.personnel]
        
        vehicles_data = []
        for v in facility.vehicles:
            vehicle_location = None
            if v.current_location:
                try:
                    vehicle_location = {
                        'lat': db.session.scalar(func.ST_Y(v.current_location)),
                        'lng': db.session.scalar(func.ST_X(v.current_location))
                    }
                except:
                    vehicle_location = None
            
            vehicles_data.append({
                'id': v.id,
                'type': v.vehicle_type,
                'license_plate': v.license_plate,
                'current_location': vehicle_location,
                'status': v.status,
                'capacity': v.capacity_load,
                'assigned_to': v.assigned_to
            })
        
        supplies_data = [{
            'id': s.id,
            'name': s.item_name,
            'quantity_current': s.quantity_current,
            'quantity_capacity': s.quantity_capacity,
            'unit': s.unit,
            'status': s.status
        } for s in facility.supplies]
        
        return jsonify({
            'facility_id': facility.id,
            'facility_name': facility.name,
            'facility_type': facility.type,
            'personnel': personnel_data,
            'vehicles': vehicles_data,
            'supplies': supplies_data
        })
    except Exception as e:
        logging.error(f"Error fetching resources for facility {facility_id}: {e}")
        return jsonify({'error': 'Failed to retrieve facility resources', 'details': str(e)}), 500
    
#---api endpoints for resources.js---

@app.route('/api/supply_items', methods=['GET'])
@login_required(role=['command', 'admin', 'field'])
def get_supply_items():
    """Retrieves all supply items."""
    try:
        items = SupplyItem.query.all()
        return jsonify([_supply_item_to_dict(item) for item in items]), 200
    except Exception as e:
        logger.error(f"Error fetching supply items: {e}")
        return jsonify({'error': 'Failed to retrieve supply items', 'details': str(e)}), 500

@app.route('/api/supply_items', methods=['POST'])
@login_required(role=['admin', 'command'])
def add_supply_item():
    """Adds a new supply item."""
    try:
        data = request.get_json()
        if not data or not all(k in data for k in ['item_name', 'quantity_current', 'unit', 'facility_id']):
            return jsonify({"error": "Missing required supply item data (item_name, quantity_current, unit, facility_id)"}), 400
        
        new_item = SupplyItem(
            item_name=data['item_name'],
            quantity_current=data['quantity_current'],
            quantity_capacity=data.get('quantity_capacity'),
            unit=data['unit'],
            status=data.get('status', 'adequate'),
            facility_id=data['facility_id'],
            last_updated=datetime.now(pytz.utc)
        )
        db.session.add(new_item)
        db.session.commit()
        return jsonify(_supply_item_to_dict(new_item)), 201
    except Exception as e:
        db.session.rollback()
        logger.error(f"Error adding supply item: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/supply_items/<int:item_id>', methods=['PUT', 'PATCH'])
@login_required(role=['admin', 'command'])
def update_supply_item(item_id):
    """Updates a supply item by ID."""
    try:
        updates = request.get_json()
        if not updates:
            return jsonify({"error": "No update data provided"}), 400
        
        item = db.session.query(SupplyItem).get(item_id)
        if not item:
            return jsonify({"error": "Supply item not found"}), 404
        
        for key, value in updates.items():
            if hasattr(item, key):
                setattr(item, key, value)
        item.last_updated = datetime.now(pytz.utc)
        db.session.commit()
        return jsonify(_supply_item_to_dict(item)), 200
    except Exception as e:
        db.session.rollback()
        logger.error(f"Error updating supply item {item_id}: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/supply_items/<int:item_id>', methods=['DELETE'])
@login_required(role=['admin', 'command'])
def delete_supply_item(item_id):
    """Deletes a supply item by ID."""
    try:
        item = db.session.query(SupplyItem).get(item_id)
        if not item:
            return jsonify({"error": "Supply item not found"}), 404
        db.session.delete(item)
        db.session.commit()
        return jsonify({"status": "Supply item deleted successfully", "id": item_id}), 200
    except Exception as e:
        db.session.rollback()
        logger.error(f"Error deleting supply item {item_id}: {e}")
        return jsonify({"error": str(e)}), 500


@app.route('/api/personnel', methods=['GET'])
@login_required(role=['command', 'admin', 'field'])
def get_personnel():
    """Retrieves all personnel."""
    try:
        personnel = Personnel.query.all()
        return jsonify([_personnel_to_dict(p) for p in personnel]), 200
    except Exception as e:
        logger.error(f"Error fetching personnel: {e}")
        return jsonify({'error': 'Failed to retrieve personnel', 'details': str(e)}), 500

@app.route('/api/personnel', methods=['POST'])
@login_required(role=['admin', 'command'])
def add_personnel():
    """Adds new personnel."""
    try:
        data = request.get_json()
        if not data or not all(k in data for k in ['name', 'role']):
            return jsonify({"error": "Missing required personnel data (name, role)"}), 400
        
        new_person = Personnel(
            name=data['name'],
            role=data['role'],
            skills=data.get('skills'),
            status=data.get('status', 'available'),
            current_assignment=data.get('current_assignment'),
            contact_number=data.get('contact_number'),
            base_facility_id=data.get('base_facility_id'),
            last_updated=datetime.now(pytz.utc)
        )
        db.session.add(new_person)
        db.session.commit()
        return jsonify(_personnel_to_dict(new_person)), 201
    except Exception as e:
        db.session.rollback()
        logger.error(f"Error adding personnel: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/personnel/<int:personnel_id>', methods=['PUT', 'PATCH'])
@login_required(role=['admin', 'command'])
def update_personnel(personnel_id):
    """Updates personnel by ID."""
    try:
        updates = request.get_json()
        if not updates:
            return jsonify({"error": "No update data provided"}), 400
        
        person = db.session.query(Personnel).get(personnel_id)
        if not person:
            return jsonify({"error": "Personnel not found"}), 404
        
        for key, value in updates.items():
            if hasattr(person, key):
                setattr(person, key, value)
        person.last_updated = datetime.now(pytz.utc)
        db.session.commit()
        return jsonify(_personnel_to_dict(person)), 200
    except Exception as e:
        db.session.rollback()
        logger.error(f"Error updating personnel {personnel_id}: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/personnel/<int:personnel_id>', methods=['DELETE'])
@login_required(role=['admin', 'command'])
def delete_personnel(personnel_id):
    """Deletes personnel by ID."""
    try:
        person = db.session.query(Personnel).get(personnel_id)
        if not person:
            return jsonify({"error": "Personnel not found"}), 404
        db.session.delete(person)
        db.session.commit()
        return jsonify({"status": "Personnel deleted successfully", "id": personnel_id}), 200
    except Exception as e:
        db.session.rollback()
        logger.error(f"Error deleting personnel {personnel_id}: {e}")
        return jsonify({"error": str(e)}), 500


@app.route('/api/vehicles', methods=['GET'])
@login_required(role=['command', 'admin', 'field'])
def get_vehicles():
    """Retrieves all vehicles."""
    try:
        vehicles = Vehicle.query.all()
        return jsonify([_vehicle_to_dict(v) for v in vehicles]), 200
    except Exception as e:
        logger.error(f"Error fetching vehicles: {e}")
        return jsonify({'error': 'Failed to retrieve vehicles', 'details': str(e)}), 500

@app.route('/api/vehicles', methods=['POST'])
@login_required(role=['admin', 'command'])
def add_vehicle():
    """Adds a new vehicle."""
    try:
        data = request.get_json()
        if not data or not all(k in data for k in ['vehicle_type', 'license_plate']):
            return jsonify({"error": "Missing required vehicle data (vehicle_type, license_plate)"}), 400
        
        current_location_point = None
        if 'lat' in data and 'lng' in data:
            current_location_point = func.ST_SetSRID(func.ST_MakePoint(data['lng'], data['lat']), 4326)

        new_vehicle = Vehicle(
            vehicle_type=data['vehicle_type'],
            license_plate=data['license_plate'],
            current_location=current_location_point,
            status=data.get('status', 'available'),
            capacity_load=data.get('capacity_load'),
            assigned_to=data.get('assigned_to'),
            home_facility_id=data.get('home_facility_id'),
            last_updated=datetime.now(pytz.utc)
        )
        db.session.add(new_vehicle)
        db.session.commit()
        return jsonify(_vehicle_to_dict(new_vehicle)), 201
    except Exception as e:
        db.session.rollback()
        logger.error(f"Error adding vehicle: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/vehicles/<int:vehicle_id>', methods=['PUT', 'PATCH'])
@login_required(role=['admin', 'command'])
def update_vehicle(vehicle_id):
    """Updates a vehicle by ID."""
    try:
        updates = request.get_json()
        if not updates:
            return jsonify({"error": "No update data provided"}), 400
        
        vehicle = db.session.query(Vehicle).get(vehicle_id)
        if not vehicle:
            return jsonify({"error": "Vehicle not found"}), 404
        
        if 'lat' in updates and 'lng' in updates:
            vehicle.current_location = func.ST_SetSRID(func.ST_MakePoint(updates['lng'], updates['lat']), 4326)
            del updates['lat']
            del updates['lng']

        for key, value in updates.items():
            if hasattr(vehicle, key):
                setattr(vehicle, key, value)
        vehicle.last_updated = datetime.now(pytz.utc)
        db.session.commit()
        return jsonify(_vehicle_to_dict(vehicle)), 200
    except Exception as e:
        db.session.rollback()
        logger.error(f"Error updating vehicle {vehicle_id}: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/vehicles/<int:vehicle_id>', methods=['DELETE'])
@login_required(role=['admin', 'command'])
def delete_vehicle(vehicle_id):
    """Deletes a vehicle by ID."""
    try:
        vehicle = db.session.query(Vehicle).get(vehicle_id)
        if not vehicle:
            return jsonify({"error": "Vehicle not found"}), 404
        db.session.delete(vehicle)
        db.session.commit()
        return jsonify({"status": "Vehicle deleted successfully", "id": vehicle_id}), 200
    except Exception as e:
        db.session.rollback()
        logger.error(f"Error deleting vehicle {vehicle_id}: {e}")
        return jsonify({"error": str(e)}), 500
       

@app.route('/api/dashboard/summary', methods=['GET'])
@login_required(role=['field','command', 'admin'])  # Only command/admin can view dashboard summary
def get_dashboard_summary():
    """
    Provides aggregated summaries for the dashboard: supplies, vehicles, personnel, and shelters.
    This replaces the hardcoded frontend data.
    """
    try:
        # --- Supplies Summary ---
        supplies_summary_raw = db.session.query(
            SupplyItem.item_name,
            func.sum(SupplyItem.quantity_current).label('current'),
            func.sum(SupplyItem.quantity_capacity).label('total')
        ).group_by(SupplyItem.item_name).all()

        supplies_data = []
        for item_name, current, total in supplies_summary_raw:
            current = current or 0
            total = total or 0
            percentage = (current / total * 100) if total > 0 else 0
            status = 'adequate'
            if percentage < 60:
                status = 'low'
            if percentage < 30:
                status = 'critical'
            
            supplies_data.append({
                'name': item_name,
                'current': current,
                'total': total,
                'unit': 'units',
                'status': status,
                'percentage': round(percentage, 2),
                'needsReplenishment': True if status in ['low', 'critical'] else False
            })

        # --- Vehicles Summary ---
        vehicles_summary_raw = db.session.query(
            Vehicle.vehicle_type,
            func.count(Vehicle.id).label('total'),
            func.sum(case((Vehicle.status == 'available', 1), else_=0)).label('available_count')
        ).group_by(Vehicle.vehicle_type).all()
        
        vehicles_data = []
        for vehicle_type, total, available_count in vehicles_summary_raw:
            available_count = available_count or 0
            total = total or 0
            percentage = (available_count / total * 100) if total > 0 else 0
            status = 'adequate'
            if percentage < 60:
                status = 'low'
            if percentage < 30:
                status = 'critical'
            
            vehicles_data.append({
                'name': vehicle_type,
                'current': available_count,
                'total': total,
                'unit': 'vehicles',
                'status': status,
                'percentage': round(percentage, 2)
            })

        # --- Personnel Summary ---
        personnel_summary_raw = db.session.query(
            Personnel.role,
            func.count(Personnel.id).label('total'),
            func.sum(case((Personnel.status == 'available', 1), else_=0)).label('available_count')
        ).group_by(Personnel.role).all()

        personnel_data = []
        for role, total, available_count in personnel_summary_raw:
            available_count = available_count or 0
            total = total or 0
            percentage = (available_count / total * 100) if total > 0 else 0
            status = 'adequate'
            if percentage < 60:
                status = 'low'
            if percentage < 30:
                status = 'critical'
            
            personnel_data.append({
                'name': role,
                'current': available_count,
                'total': total,
                'unit': 'people',
                'status': status,
                'percentage': round(percentage, 2),
                'needsReplenishment': True if status in ['low', 'critical'] else False
            })

        # --- Shelters Summary ---
        total_shelter_facilities = EmergencyFacility.query.filter_by(type='shelter').count()
        operational_shelter_facilities = EmergencyFacility.query.filter_by(type='shelter', status='operational').count()
        total_shelter_capacity_result = db.session.query(
            func.sum(EmergencyFacility.capacity_overall)
        ).filter(EmergencyFacility.type == 'shelter', EmergencyFacility.status == 'operational').scalar() or 0

        shelter_percentage = (operational_shelter_facilities / total_shelter_facilities * 100) if total_shelter_facilities > 0 else 0
        shelter_status = 'adequate'
        if shelter_percentage < 60:
            shelter_status = 'low'
        shelters_data = [
            {
                'name': 'Evacuation Centers',
                'current': operational_shelter_facilities,
                'total': total_shelter_facilities,
                'unit': 'centers',
                'status': shelter_status,
                'percentage': round(shelter_percentage, 2)
            },
            {
                'name': 'Capacity (People)',
                'current': total_shelter_capacity_result,
                'total': total_shelter_capacity_result,
                'unit': 'people',
                'status': 'adequate',
                'percentage': 100
            }
        ]

        return jsonify({
            'supplies': supplies_data,
            'vehicles': vehicles_data,
            'personnel': personnel_data,
            'shelters': shelters_data
        })

    except Exception as e:
        logging.error(f"Error fetching dashboard summary: {e}")
        return jsonify({'error': 'Failed to retrieve dashboard summary', 'details': str(e)}), 500

#---api endpoints for response.js---
@app.route('/api/response-actions', methods=['GET'])
@login_required(role=['command', 'admin', 'field']) # Field can view, command/admin can manage
def get_response_actions():
    """Get all response actions."""
    try:
        # You could add filtering here based on request.args (e.g., status='active', team='Team Alpha')
        actions = ResponseAction.query.order_by(ResponseAction.created_at.desc()).all()
        return jsonify([{
            "id": action.id,
            "title": action.title,
            "team": action.team,
            "location": action.location,
            "timeframe": action.timeframe,
            "status": action.status,
            "created_at": action.created_at.isoformat(),
            "updated_at": action.updated_at.isoformat()
        } for action in actions])
    except Exception as e:
        logger.error(f"Error fetching response actions: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/response-actions', methods=['POST'])
@login_required(role=['command', 'admin']) # Only command/admin can add new actions
def add_response_action():
    """Add a new response action."""
    try:
        data = request.get_json()
        if not data or not data.get('title'):
            return jsonify({"error": "Title is required"}), 400

        new_action = ResponseAction(
            title=data['title'],
            team=data.get('team'),
            location=data.get('location'),
            timeframe=data.get('timeframe'),
            status=data.get('status', 'active')
        )
        db.session.add(new_action)
        db.session.commit()
        return jsonify({
            "id": new_action.id,
            "title": new_action.title,
            "team": new_action.team,
            "location": new_action.location,
            "timeframe": new_action.timeframe,
            "status": new_action.status,
            "created_at": new_action.created_at.isoformat(),
            "updated_at": new_action.updated_at.isoformat()
        }), 201
    except Exception as e:
        db.session.rollback()
        logger.error(f"Error adding response action: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/response-actions/<int:action_id>', methods=['PUT'])
@login_required(role=['command', 'admin', 'field']) # Field might update status on their tasks
def update_response_action(action_id):
    """Update details of an existing response action."""
    try:
        data = request.get_json()
        action = ResponseAction.query.get(action_id)
        if not action:
            return jsonify({"error": "Action not found"}), 404

        action.title = data.get('title', action.title)
        action.team = data.get('team', action.team)
        action.location = data.get('location', action.location)
        action.timeframe = data.get('timeframe', action.timeframe)
        action.status = data.get('status', action.status) # Allow status update
        action.updated_at = datetime.now(pytz.utc) # Manually update updated_at if not handled by onupdate

        db.session.commit()
        return jsonify({
            "id": action.id,
            "title": action.title,
            "team": action.team,
            "location": action.location,
            "timeframe": action.timeframe,
            "status": action.status,
            "created_at": action.created_at.isoformat(),
            "updated_at": action.updated_at.isoformat()
        })
    except Exception as e:
        db.session.rollback()
        logger.error(f"Error updating response action {action_id}: {e}")
        return jsonify({"error": str(e)}), 500

# Also add your new delete endpoint
@app.route('/api/response-actions/<int:action_id>', methods=['DELETE'])
@login_required(role=['command', 'admin'])  # Only command/admin can delete actions
def delete_response_action(action_id):
    """Delete a response action."""
    try:
        action = ResponseAction.query.get(action_id)
        if not action:
            return jsonify({"error": "Action not found"}), 404

        db.session.delete(action)
        db.session.commit()
        return jsonify({"status": "Action deleted successfully"}), 200
    except Exception as e:
        db.session.rollback()
        logger.error(f"Error deleting response action {action_id}: {e}")
        return jsonify({"error": str(e)}), 500

from .alert_service import init_alert_service, register_socket_events, alert_service

# Initialize alert service
init_alert_service(app, socketio)

# Register socket events
register_socket_events(socketio)

@app.route('/api/rainfall', methods=['GET'])
@login_required(role=['command', 'admin'])
def get_rainfall():
    from .alert_service import alert_service
    if alert_service is None:
        return {"error": "Alert service not initialized"}, 500
    return alert_service.get_rainfall_data()