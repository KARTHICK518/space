
from app import app, db, CelestialBody, Moon

with app.app_context():
    count = CelestialBody.query.count()
    print(f"Celestial bodies count: {count}")
    bodies = CelestialBody.query.all()
    for b in bodies:
        print(f"- {b.name} ({b.type})")
    
    moons_count = Moon.query.count()
    print(f"Moons count: {moons_count}")
