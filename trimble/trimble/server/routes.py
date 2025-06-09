# server/routes.py
from flask import jsonify, request
from .extensions import db
from .server import app

@app.route('/')
def home():
    return jsonify({"status": "OK"})