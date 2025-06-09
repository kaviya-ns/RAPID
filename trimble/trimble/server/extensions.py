from flask_sqlalchemy import SQLAlchemy
from flask_socketio import SocketIO
from geoalchemy2 import Geometry

db = SQLAlchemy()
socketio = SocketIO()