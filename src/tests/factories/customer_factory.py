import uuid
from datetime import datetime

import factory
from factory import Faker

from backend.models.customer import Customer


class CustomerFactory(factory.Factory):
    class Meta:
        model = Customer

    id = factory.LazyFunction(uuid.uuid4)
    user_id = uuid.UUID("00000000-0000-0000-0000-000000000001")
    name = Faker("name")
    email = Faker("email")
    phone = Faker("phone_number")
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
