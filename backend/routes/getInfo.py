from flask import Blueprint

# create a Blueprint (name, import_name)
getInfo_bp = Blueprint('getInfo', __name__)

@getInfo_bp.route('/getInfo/<string:CIK>')
def getInfo(CIK):
    return {"message": f"Hello from getInfo route! CIK: {CIK}"}
