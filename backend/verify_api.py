
import requests
import json

try:
    response = requests.get("http://localhost:5000/api/bodies")
    if response.status_code == 200:
        data = response.json()
        print(f"Number of bodies: {len(data)}")
        for body in data:
            print(f"- {body['name']} ({body['type']}) with {len(body.get('moons', []))} moons")
    else:
        print(f"Error: {response.status_code}")
except Exception as e:
    print(f"Connection failed: {e}")
