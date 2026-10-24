from flask import Flask, render_template, request, jsonify
import sqlite3

app = Flask(__name__)
DATABASE = "shopeasy.db"


def get_db():
    connection = sqlite3.connect(DATABASE)
    connection.row_factory = sqlite3.Row
    return connection


def initialize_database():
    connection = get_db()

    connection.execute("""
        CREATE TABLE IF NOT EXISTS products (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            category TEXT NOT NULL,
            price REAL NOT NULL,
            image TEXT NOT NULL,
            description TEXT NOT NULL
        )
    """)

    connection.execute("""
        CREATE TABLE IF NOT EXISTS orders (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            customer_name TEXT NOT NULL,
            email TEXT NOT NULL,
            address TEXT NOT NULL,
            items TEXT NOT NULL,
            total REAL NOT NULL
        )
    """)

    count = connection.execute(
        "SELECT COUNT(*) FROM products"
    ).fetchone()[0]

    if count == 0:
        products = [
            ("Wireless Headphones", "Electronics", 1499,
             "https://placehold.co/400x300?text=Headphones",
             "Enjoy clear sound and comfortable listening."),
            ("Smart Watch", "Electronics", 1999,
             "https://placehold.co/400x300?text=Smart+Watch",
             "Track your daily activity in style."),
            ("Casual T-Shirt", "Fashion", 599,
             "https://placehold.co/400x300?text=T-Shirt",
             "A comfortable everyday T-shirt."),
            ("Running Shoes", "Fashion", 1299,
             "https://placehold.co/400x300?text=Running+Shoes",
             "Lightweight shoes for everyday movement."),
            ("Travel Backpack", "Accessories", 899,
             "https://placehold.co/400x300?text=Backpack",
             "Carry your essentials wherever you go."),
            ("Desk Lamp", "Home", 699,
             "https://placehold.co/400x300?text=Desk+Lamp",
             "A simple lamp for your study table.")
        ]

        connection.executemany("""
            INSERT INTO products
            (name, category, price, image, description)
            VALUES (?, ?, ?, ?, ?)
        """, products)

    connection.commit()
    connection.close()


@app.route("/")
def home():
    return render_template("index.html")


@app.route("/api/products")
def get_products():
    connection = get_db()

    products = connection.execute(
        "SELECT * FROM products ORDER BY id"
    ).fetchall()

    connection.close()

    return jsonify([dict(product) for product in products])


@app.route("/api/orders", methods=["POST"])
def create_order():
    data = request.get_json(silent=True) or {}

    name = str(data.get("name", "")).strip()
    email = str(data.get("email", "")).strip()
    address = str(data.get("address", "")).strip()
    items = data.get("items", [])

    if not name or not email or not address or not isinstance(items, list) or not items:
        return jsonify({"error": "Please complete all checkout fields."}), 400

    connection = get_db()
    total = 0
    validated_items = []

    try:
        for item in items:
            product_id = int(item["id"])
            quantity = int(item["quantity"])

            if quantity < 1 or quantity > 100:
                raise ValueError("Invalid quantity.")

            product = connection.execute(
                "SELECT id, name, price FROM products WHERE id = ?",
                (product_id,)
            ).fetchone()

            if product is None:
                raise ValueError("Invalid product.")

            total += product["price"] * quantity

            validated_items.append({
                "id": product["id"],
                "name": product["name"],
                "quantity": quantity
            })

        cursor = connection.execute("""
            INSERT INTO orders
            (customer_name, email, address, items, total)
            VALUES (?, ?, ?, ?, ?)
        """, (name, email, address, str(validated_items), total))

        connection.commit()

        return jsonify({
            "message": "Order placed successfully!",
            "order_id": cursor.lastrowid,
            "total": round(total, 2)
        }), 201

    except (ValueError, TypeError, KeyError):
        connection.rollback()
        return jsonify({"error": "Invalid order details."}), 400

    finally:
        connection.close()


initialize_database()

if __name__ == "__main__":
    app.run(debug=True)