import os
from flask import Flask, jsonify
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy

app = Flask(__name__)
CORS(app)

# Database Configuration
basedir = os.path.abspath(os.path.dirname(__file__))
app.config['SQLALCHEMY_DATABASE_URI'] = os.environ.get(
    "DATABASE_URL",
    'sqlite:///' + os.path.join(basedir, 'space.db')
)
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db = SQLAlchemy(app)

class CelestialBody(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    type = db.Column(db.String(50), nullable=False) # e.g., Planet, Star, Moon
    radius = db.Column(db.Float, nullable=False)
    distance_from_sun = db.Column(db.Float, nullable=False) # Scaled distance for visualization
    orbital_speed = db.Column(db.Float, nullable=False) # Multiplier for rotation
    color = db.Column(db.String(20), nullable=False) # Hex color fallback
    texture = db.Column(db.String(100), nullable=True) # Texture filename
    description = db.Column(db.Text, nullable=True)
    
    moons = db.relationship('Moon', backref='planet', lazy=True, cascade="all, delete-orphan")

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'type': self.type,
            'radius': self.radius,
            'distance_from_sun': self.distance_from_sun,
            'orbital_speed': self.orbital_speed,
            'color': self.color,
            'texture': self.texture,
            'description': self.description,
            'moons': [moon.to_dict() for moon in self.moons]
        }

class Moon(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    planet_id = db.Column(db.Integer, db.ForeignKey('celestial_body.id'), nullable=False)
    name = db.Column(db.String(100), nullable=False)
    radius = db.Column(db.Float, nullable=False)
    distance_from_planet = db.Column(db.Float, nullable=False)
    orbital_speed = db.Column(db.Float, nullable=False)
    color = db.Column(db.String(20), nullable=False)

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'radius': self.radius,
            'distance_from_planet': self.distance_from_planet,
            'orbital_speed': self.orbital_speed,
            'color': self.color
        }

@app.route('/')
def home():
    return "Backend is running successfully 🚀"

@app.route('/api/health', methods=['GET'])
def health_check():
    return jsonify({"status": "healthy", "message": "Space Explorer backend is running!"})

@app.route('/api/bodies', methods=['GET'])
def get_bodies():
    bodies = CelestialBody.query.all()
    return jsonify([body.to_dict() for body in bodies])

with app.app_context():
    try:
        db.create_all()
        
        # Check if we need to seed (if count < 5 or whatever threshold)
        if CelestialBody.query.count() < 5:
            print("Seeding database...")
            # Wipe existing data to avoid duplicates/partial states
            db.session.query(Moon).delete()
            db.session.query(CelestialBody).delete()
            db.session.commit()

            # Full Dataset: Sun + 8 Planets
            bodies_data = [
                {"name": "Sun",     "type": "Star",   "radius": 4.0,  "distance_from_sun": 0.0,  "orbital_speed": 0.0,    "color": "#fbbf24", "texture": "sun.jpg",     "description": "The star at the center of the Solar System."},
                {"name": "Mercury", "type": "Planet", "radius": 0.38, "distance_from_sun": 6.0,  "orbital_speed": 0.41,   "color": "#a8a29e", "texture": "mercury.jpg", "description": "The smallest planet in our solar system and closest to the Sun."},
                {"name": "Venus",   "type": "Planet", "radius": 0.95, "distance_from_sun": 9.0,  "orbital_speed": 0.16,   "color": "#fcd34d", "texture": "venus.jpg",   "description": "Spinning in the opposite direction to most planets, Venus is the hottest planet."},
                {"name": "Earth",   "type": "Planet", "radius": 1.0,  "distance_from_sun": 13.0, "orbital_speed": 0.1,    "color": "#3b82f6", "texture": "earth.jpg",   "description": "The only place we know of so far that's inhabited by living things."},
                {"name": "Mars",    "type": "Planet", "radius": 0.53, "distance_from_sun": 17.0, "orbital_speed": 0.05,   "color": "#ef4444", "texture": "mars.jpg",    "description": "A dusty, cold, desert world with a very thin atmosphere."},
                {"name": "Jupiter", "type": "Planet", "radius": 2.5,  "distance_from_sun": 25.0, "orbital_speed": 0.008,  "color": "#d97706", "texture": "jupiter.jpg", "description": "More than twice as massive as the other planets of our solar system combined."},
                {"name": "Saturn",  "type": "Planet", "radius": 2.1,  "distance_from_sun": 34.0, "orbital_speed": 0.003,  "color": "#fde047", "texture": "saturn.jpg",  "description": "Adorned with a dazzling, complex system of icy rings."},
                {"name": "Uranus",  "type": "Planet", "radius": 1.5,  "distance_from_sun": 44.0, "orbital_speed": 0.001,  "color": "#38bdf8", "texture": "uranus.jpg",  "description": "The seventh planet from the Sun rotates at a nearly 90-degree angle from the plane of its orbit."},
                {"name": "Neptune", "type": "Planet", "radius": 1.4,  "distance_from_sun": 53.0, "orbital_speed": 0.0006, "color": "#1d4ed8", "texture": "neptune.jpg", "description": "The eighth and most distant major planet orbiting our Sun."},
            ]

            planet_map = {}
            for data in bodies_data:
                body = CelestialBody(**data)
                db.session.add(body)
                planet_map[data['name']] = body
            
            # Commit planets first to get IDs for moons
            db.session.commit()

            # Seed moons
            moons_data = [
                {"planet_name": "Earth",   "name": "Luna",     "radius": 0.27, "distance_from_planet": 1.5, "orbital_speed": 1.3, "color": "#d1d5db"},
                {"planet_name": "Mars",    "name": "Phobos",   "radius": 0.1,  "distance_from_planet": 0.8, "orbital_speed": 2.0, "color": "#9ca3af"},
                {"planet_name": "Mars",    "name": "Deimos",   "radius": 0.08, "distance_from_planet": 1.1, "orbital_speed": 1.5, "color": "#9ca3af"},
                {"planet_name": "Jupiter", "name": "Io",       "radius": 0.3,  "distance_from_planet": 3.0, "orbital_speed": 1.8, "color": "#fde047"},
                {"planet_name": "Jupiter", "name": "Europa",   "radius": 0.25, "distance_from_planet": 3.5, "orbital_speed": 1.4, "color": "#e5e7eb"},
                {"planet_name": "Jupiter", "name": "Ganymede", "radius": 0.4,  "distance_from_planet": 4.2, "orbital_speed": 1.0, "color": "#9ca3af"},
                {"planet_name": "Jupiter", "name": "Callisto", "radius": 0.38, "distance_from_planet": 5.0, "orbital_speed": 0.7, "color": "#6b7280"},
                {"planet_name": "Saturn",  "name": "Titan",    "radius": 0.4,  "distance_from_planet": 3.2, "orbital_speed": 1.2, "color": "#fcd34d"},
            ]

            for data in moons_data:
                planet = planet_map.get(data['planet_name'])
                if planet:
                    moon = Moon(
                        planet_id=planet.id,
                        name=data['name'],
                        radius=data['radius'],
                        distance_from_planet=data['distance_from_planet'],
                        orbital_speed=data['orbital_speed'],
                        color=data['color']
                    )
                    db.session.add(moon)
            
            db.session.commit()
            print("Database seeded successfully!")
    except Exception as e:
        db.session.rollback()
        print(f"Error during database initialization/seeding: {e}")



if __name__ == '__main__':
    app.run(host="0.0.0.0", port=5000)
