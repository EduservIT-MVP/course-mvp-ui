from flask import Blueprint, request, jsonify
from extensions import db
from models.category import Category
from auth import require_auth, current_user

bp = Blueprint("categories", __name__, url_prefix="/categories")

@bp.route("", methods=["GET"])
@require_auth
def list_categories():
    """List all categories."""
    categories = Category.query.order_by(Category.name).all()
    return jsonify({"categories": [c.to_dict() for c in categories]}), 200

@bp.route("", methods=["POST"])
@require_auth
def create_category():
    """Create a new category."""
    data = request.json or {}
    name = data.get("name", "").strip()

    if not name:
        return jsonify({"error": "Category name is required"}), 400

    existing = Category.query.filter_by(name=name).first()
    if existing:
        return jsonify({"error": f"Category '{name}' already exists"}), 409

    category = Category(name=name)
    db.session.add(category)
    db.session.commit()

    return jsonify(category.to_dict()), 201

@bp.route("/<category_id>", methods=["DELETE"])
@require_auth
def delete_category(category_id):
    """Delete a category."""
    # Check permission
    user = current_user()
    if not user.has_permission("course:delete"):
        return jsonify({"error": "Unauthorized"}), 403

    category = Category.query.get(category_id)
    if not category:
        return jsonify({"error": "Category not found"}), 404

    db.session.delete(category)
    db.session.commit()

    return jsonify({"success": True}), 200
