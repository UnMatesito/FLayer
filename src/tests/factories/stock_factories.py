import uuid
from datetime import datetime

import factory
from factory import Faker

from backend.models.filament import Filament
from backend.models.stock_movement import StockMovement
from backend.models.supply import Supply


import uuid
from datetime import datetime

import factory
from factory import Faker

from backend.models.filament import Filament
from backend.models.stock_movement import StockMovement
from backend.models.supply import Supply


class FilamentFactory(factory.Factory):
    class Meta:
        model = Filament

    id = factory.LazyFunction(uuid.uuid4)
    user_id = uuid.UUID("00000000-0000-0000-0000-000000000001")
    color_name = factory.Sequence(lambda n: f"PLA Color {n}")
    color_hex = factory.Iterator(["#FF0000", "#00FF00", "#0000FF", "#FFD700", "#C0C0C0"])
    brand = ""
    filament_type = factory.Iterator(["PLA", "PETG", "TPU", "ABS"])
    settings = None
    weight_grams = 1000.00
    price_per_kg = 25.00
    min_stock_warning_grams = 200.00
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


class StockMovementFactory(factory.Factory):
    class Meta:
        model = StockMovement

    id = factory.LazyFunction(uuid.uuid4)
    user_id = uuid.UUID("00000000-0000-0000-0000-000000000001")
    filament_id = uuid.UUID("00000000-0000-0000-0000-000000000010")
    movement_type = "adjustment"
    quantity_grams = 50.00
    order_id = None
    created_by_user_id = uuid.UUID("00000000-0000-0000-0000-000000000001")
    notes = None
    created_at = factory.LazyFunction(datetime.now)

    @classmethod
    def create(cls, session=None, **kwargs):
        instance = cls.build(**kwargs)
        if session is not None:
            session.add(instance)
            session.flush()
            session.refresh(instance)
        return instance


class SupplyFactory(factory.Factory):
    class Meta:
        model = Supply

    id = factory.LazyFunction(uuid.uuid4)
    user_id = uuid.UUID("00000000-0000-0000-0000-000000000001")
    name = factory.Sequence(lambda n: f"Isopropyl Alcohol {n}")
    quantity = 5.00
    unit = factory.Iterator(["liters", "units", "kg", "meters"])
    min_stock_warning = 1.00
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
