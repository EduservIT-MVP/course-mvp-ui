from flask import Blueprint, request, jsonify
from extensions import db
from models.category import Category
from models.course import Course
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

@bp.route("/<category_id>", methods=["PUT"])
@require_auth
def update_category(category_id):
    """Update a category name."""
    # Check permission
    user = current_user()
    if not user.has_permission("course:create"):
        return jsonify({"error": "Unauthorized"}), 403

    category = Category.query.get(category_id)
    if not category:
        return jsonify({"error": "Category not found"}), 404

    data = request.json or {}
    new_name = data.get("name", "").strip()

    if not new_name:
        return jsonify({"error": "Category name is required"}), 400

    if new_name != category.name:
        existing = Category.query.filter_by(name=new_name).first()
        if existing:
            return jsonify({"error": f"Category '{new_name}' already exists"}), 409
        
        # Cascade update to all courses using this category
        old_name = category.name
        category.name = new_name
        
        courses = Course.query.filter_by(category=old_name).all()
        for course in courses:
            course.category = new_name

        db.session.commit()

    return jsonify(category.to_dict()), 200

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

    cat_name = category.name
    db.session.delete(category)
    
    # Cascade delete to un-categorize courses
    courses = Course.query.filter_by(category=cat_name).all()
    for course in courses:
        course.category = "Uncategorized"

    db.session.commit()

    return jsonify({"success": True}), 200
