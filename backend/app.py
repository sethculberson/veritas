from flask import Flask, jsonify
from flask_cors import CORS
from routes.autofill import autofill_bp  # autofill route
from routes.getInfo import getInfo_bp  # getInfo route


app = Flask(__name__)
CORS(app)  # allow requests from React

app.register_blueprint(autofill_bp)  # register autofill blueprint
app.register_blueprint(getInfo_bp)  # register getInfo blueprint


@app.route("/api/hello")
def hello():
    return jsonify({"message": "Hello from Flask!"})

if __name__ == "__main__":
    app.run(port=5000, debug=True)
