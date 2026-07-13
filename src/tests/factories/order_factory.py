import uuid
from datetime import datetime

import factory
from factory import Faker

from backend.models.order import Order, OrderNote


class OrderFactory(factory.Factory):
    class Meta:
        model = Order

    id = factory.LazyFunction(uuid.uuid4)
    user_id = uuid.UUID("00000000-0000-0000-0000-000000000001")
    customer_id = uuid.UUID("00000000-0000-0000-0000-000000000002")
    work_type = factory.Iterator(["impresion_3d", "diseno_3d"])
    description = Faker("sentence")
    files = None
    status = "new"
    client_notified = False
    created_at = factory.LazyFunction(datetime.now)
    updated_at = factory.LazyFunction(datetime.now)

    @classmethod
    def create(cls, session=None, **kwargs):
        instance = cls.build(**kwargs)
        if session is not None:
            session.add(instance)
            session.flush()
            session.refresh(instance)
        return instance


class OrderNoteFactory(factory.Factory):
    class Meta:
        model = OrderNote

    id = factory.LazyFunction(uuid.uuid4)
    order_id = uuid.UUID("00000000-0000-0000-0000-000000000003")
    content = Faker("text")
    created_at = factory.LazyFunction(datetime.now)

    @classmethod
    def create(cls, session=None, **kwargs):
        instance = cls.build(**kwargs)
        if session is not None:
            session.add(instance)
            session.flush()
            session.refresh(instance)
        return instance
