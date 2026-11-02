from flask import Blueprint, jsonify

from services.clearaer_service import download_count, record_download

clearaer_bp = Blueprint("clearaer", __name__)


@clearaer_bp.route("/clearaer/downloads/stats", methods=["GET"])
def clearaer_download_stats():
    try:
        return jsonify({"status": "success", "total": download_count()}), 200
    except Exception as exc:
        return jsonify({"status": "error", "message": str(exc), "total": 0}), 200


@clearaer_bp.route("/clearaer/downloads", methods=["POST"])
def clearaer_record_download():
    try:
        return jsonify({"status": "success", "total": record_download()}), 201
    except Exception as exc:
        return jsonify({"status": "error", "message": str(exc), "total": 0}), 500
