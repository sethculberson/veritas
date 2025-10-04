from flask import Blueprint

# create a Blueprint (name, import_name)
autofill_bp = Blueprint('autofill', __name__)

@autofill_bp.route('/autofill')
def autofill():
    return {"message": "Hello from routes!"}
