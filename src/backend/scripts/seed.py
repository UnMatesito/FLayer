import asyncio

import bcrypt
from faker import Faker
from sqlalchemy import select

from backend.database import async_session, engine
from backend.models import Customer, Order, OrderNote, User

fake = Faker("es-MX")

WORK_TYPES = ["impresion_3d", "diseno_3d"]
STATUSES = ["new", "in_progress", "completed", "cancelled"]


async def seed() -> None:
    async with async_session() as session:
        result = await session.execute(select(User).where(User.email == "admin@flayer.com"))
        if result.scalar_one_or_none():
            print("Database already seeded. Skipping.")
            return

        admin = User(
            email="admin@flayer.com",
            name="Admin",
            hashed_password=bcrypt.hashpw(b"admin123", bcrypt.gensalt()).decode(),
        )
        session.add(admin)
        await session.flush()

        customers = []
        for _ in range(3):
            customer = Customer(
                user_id=admin.id,
                name=fake.name(),
                email=fake.email(),
                phone=fake.phone_number() if fake.boolean() else None,
            )
            session.add(customer)
            customers.append(customer)
        await session.flush()

        orders = []
        for customer in customers:
            for _ in range(fake.random_int(1, 3)):
                order = Order(
                    user_id=admin.id,
                    customer_id=customer.id,
                    work_type=fake.random_element(WORK_TYPES),
                    description=fake.paragraph(nb_sentences=3),
                    files=[{"filename": f"{fake.uuid4()}.stl", "url": f"https://storage.example.com/{fake.uuid4()}.stl"}],
                    status=fake.random_element(STATUSES),
                    client_notified=fake.boolean(chance_of_getting_true=30),
                )
                session.add(order)
                orders.append(order)
        await session.flush()

        notes_count = 0
        for order in orders[:3]:
            for _ in range(fake.random_int(1, 2)):
                note = OrderNote(
                    order_id=order.id,
                    content=fake.sentence(nb_words=10),
                )
                session.add(note)
                notes_count += 1

        await session.commit()

    print("  Admin: admin@flayer.com / admin123")
    print(f"  Customers: {len(customers)}")
    print(f"  Orders: {len(orders)}")
    print(f"  Order notes: {notes_count}")


async def main() -> None:
    print("Seeding database...")
    try:
        await seed()
        print("Done.")
    finally:
        await engine.dispose()


if __name__ == "__main__":
    asyncio.run(main())
