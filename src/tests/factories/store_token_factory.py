import uuid
from datetime import datetime

import factory

from backend.models.store_token import StoreToken


class StoreTokenFactory(factory.Factory):
    class Meta:
        model = StoreToken

    id = factory.LazyFunction(uuid.uuid4)
    user_id = uuid.UUID("00000000-0000-0000-0000-000000000001")
    token = factory.LazyFunction(lambda: uuid.uuid4().hex)
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
