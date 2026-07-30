import uuid
from datetime import datetime

import factory
from factory import Faker

from backend.models.product import FixedProduct


class FixedProductFactory(factory.Factory):
    class Meta:
        model = FixedProduct

    id = factory.LazyFunction(uuid.uuid4)
    user_id = uuid.UUID("00000000-0000-0000-0000-000000000001")
    name = factory.Sequence(lambda n: f"Product {n}")
    description = Faker("sentence")
    price = 10.00
    stock_quantity = 5
    image_url = None
    is_active = True
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
