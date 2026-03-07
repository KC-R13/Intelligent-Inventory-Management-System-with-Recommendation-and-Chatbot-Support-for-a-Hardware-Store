from sqlalchemy.orm import Session

from store.database.engine import engine
from store.database.schema import Product

PRODUCTS = [
    {"name": "DeWalt 20V Cordless Drill",           "price": 89.99,  "stock": 24},
    {"name": "Makita 7-1/4\" Circular Saw",         "price": 129.99, "stock": 12},
    {"name": "Bosch 4-1/2\" Angle Grinder",         "price": 64.50,  "stock": 18},
    {"name": "Black+Decker Jigsaw",                 "price": 49.99,  "stock": 10},
    {"name": "Hilti TE 2-A22 Rotary Hammer",        "price": 249.00, "stock": 6},
]

def seed():
    print('seeding...')

    with Session(engine) as session:
        for data in PRODUCTS:
            product = Product(
                name=data["name"],
                stock=data["stock"],
                price=data["price"],
            )
            session.add(product)
        session.commit()

    print(f"seeded {len(PRODUCTS)} products")


if __name__ == "__main__":
    seed()
