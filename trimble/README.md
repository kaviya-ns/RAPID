# RAPID (Risk Assessment and Planning for Incident Disasters)

Emergency Management Web Application: Chennai District Flood Response

# Project Overview
This project delivers a critical web-based emergency management application designed for the Chennai District government. Its primary purpose is to provide robust flood risk assessment and response planning capabilities, serving various government officials and NGOs during emergency situations. The application supports simultaneous use by multiple emergency responders across different organizational hierarchy levels, from field personnel to command center operations and senior government officials. A key feature is the integration of Geographic Information System (GIS) capabilities for spatial analysis and visualization.

# Scenario
With heavy rainfall forecasted for the upcoming week, emergency coordinators require a comprehensive tool to efficiently manage and coordinate flood response efforts. This application aims to centralize critical information, streamline resource allocation, and enhance decision-making in real-time.

## Key Features
Role-Based Access Control (RBAC): Differentiated access and functionality for admin, command, and field personnel.

Dynamic Dashboard: Provides real-time aggregated summaries of critical emergency resources (supplies, vehicles, personnel, shelters).

Comprehensive Resource Management:

Detailed listing of individual emergency facilities (shelters, hospitals, supply centers, vehicle bays, command centers).

CRUD Operations: Ability to Add, Update, and Delete facility records (restricted to admin and command roles).

Facility-Wise Resource Summary: A consolidated view showing detailed breakdowns of supplies, personnel, and vehicles associated with each specific facility.

Geographic Information System (GIS) Integration: Visualizes flood risk zones and facility locations on a map (future implementation for map component).

Personnel & Vehicle Tracking: Management and overview of available and deployed personnel and vehicles.

Supply Chain Monitoring: Tracks inventory levels of essential supplies.

Response Action Planning: Create, update, and manage emergency response actions.

User Authentication: Secure login and logout functionality.

# Technology Stack
## Frontend:

React.js: For building a dynamic and responsive user interface.

Tailwind CSS: For utility-first styling and responsive design.

Lucide React: For modern and customizable SVG icons.

react-router-dom: For client-side routing.
## Backend:

Flask: A lightweight Python web framework for API development.

Flask-SQLAlchemy: ORM for interacting with the database.

GeoAlchemy2: Extends SQLAlchemy to work with spatial databases (PostGIS).

Flask-CORS: For handling Cross-Origin Resource Sharing.

Flask-SocketIO: For potential real-time communication (though not fully leveraged in all features yet).

python-dotenv: For managing environment variables.

psycopg2: PostgreSQL adapter for Python.

pytz: For timezone handling in datetime objects.

# Database:

PostgreSQL: A powerful open-source relational database.

PostGIS: A spatial database extender for PostgreSQL, enabling geographic object storage and queries.

Setup Instructions
Follow these steps to get the project up and running on your local machine.

Prerequisites
Node.js & npm (or yarn):

Download Node.js (includes npm).

Python 3.8+:

Download Python

PostgreSQL with PostGIS Extension:

Download PostgreSQL

Ensure the PostGIS extension is installed and enabled in your database. You might need to run CREATE EXTENSION postgis; in your PostgreSQL database after creation.

## 1. Database Setup
Create a PostgreSQL Database:

CREATE DATABASE chennai_dm;

Enable PostGIS Extension: Connect to your newly created database and run:

\c chennai_dm;
CREATE EXTENSION postgis;

Create .env file: In the root directory of your project (e.g., trimble/.env), create a .env file with your database credentials and user passwords:

DB_USER=your_db_username
DB_PASSWORD=your_db_password
DB_HOST=localhost
DB_PORT=5432
DB_NAME=chennai_dm

FLASK_SECRET_KEY=a_strong_random_secret_key_for_flask_session

ADMIN_PASS=adminpass
FIELD_PASS=fieldpass
COMM_PASS=commandpass

Replace your_db_username and your_db_password with your actual PostgreSQL credentials.

## 2. Backend Setup
Navigate to the server directory:

cd server

Create a Python Virtual Environment:

python -m venv venv

Activate the Virtual Environment:

Windows: venv\Scripts\activate

macOS/Linux: source venv/bin/activate

Install Python Dependencies:

pip install -r requirements.txt

Start the Flask Backend Server:

python server.py

The server should run on http://localhost:5001.

## 3. Initial Data Load (Optional but Recommended)
Once the backend is running, you can load dummy data to populate your database:

Log in as an Admin: Use username: admin, password: adminpass (as defined in .env).

Send a POST request to the /admin/load-data endpoint. You can use tools like Postman, Insomnia, or a simple fetch from your browser's console (after logging in):

fetch('http://localhost:5001/admin/load-data', { method: 'POST' })
    .then(response => response.json())
    .then(data => console.log(data));

This will populate your emergency_facilities, personnel, vehicles, supply_items, flood_risk_zones, and response_actions tables with sample data.

## 4. Frontend Setup
Navigate to the project root directory (where package.json is located, likely trimble/).

cd .. # if you are in the server directory

Install Node.js Dependencies:

npm install

The frontend application should open in your browser at http://localhost:3000.

#User Roles and Access
The application supports three distinct user roles with varying permissions:

### admin:

Username: admin

Access: Full access to all dashboards, detailed resource views, and all CRUD (Create, Read, Update, Delete) operations for facilities and other resources. Can load initial data.

### command:

Username: command

Access: Access to all dashboards, detailed resource views, and CRUD operations for facilities and other resources. Can view high-risk zones and manage response actions.

### field:

Username: field

Access: Limited to viewing dashboards, detailed resource lists (without CRUD buttons), and high-risk zones. Cannot add, edit, or delete resources.

# to run flask backend run python main.py

