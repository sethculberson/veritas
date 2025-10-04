from flask import Flask, jsonify
from flask_cors import CORS
from routes.autofill import autofill_bp  # import your blueprint


app = Flask(__name__)
CORS(app)  # allow requests from React

app.register_blueprint(autofill_bp)  # register your blueprint

@app.route("/api/hello")
def hello():
    return jsonify({"message": "Hello from Flask!"})

if __name__ == "__main__":
    app.run(port=5000, debug=True)
