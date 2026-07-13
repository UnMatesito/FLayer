import uuid

import factory
from factory import Faker

from backend.models.user import User


class UserFactory(factory.Factory):
    class Meta:
        model = User

    id = factory.LazyFunction(uuid.uuid4)
    email = Faker("email")
    name = Faker("name")
    hashed_password = "fakehash"

    @classmethod
    def create(cls, session=None, **kwargs):
        instance = cls.build(**kwargs)
        if session is not None:
            session.add(instance)
            session.flush()
            session.refresh(instance)
        return instance
