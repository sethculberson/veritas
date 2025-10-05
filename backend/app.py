from flask import Flask, jsonify
from flask_cors import CORS
from routes.autofill import autofill_bp  # autofill route
from routes.getInfo import getInfo_bp  # getInfo route


app = Flask(__name__)
CORS(app)  # allow requests from React

app.register_blueprint(autofill_bp)  # register autofill blueprint
app.register_blueprint(getInfo_bp)  # register getInfo blueprint

if __name__ == "__main__":
    import os
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port, debug=False)
