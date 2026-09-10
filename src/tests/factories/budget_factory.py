import uuid
from datetime import datetime

import factory

from backend.models.budget import Budget


class BudgetFactory(factory.Factory):
    class Meta:
        model = Budget

    id = factory.LazyFunction(uuid.uuid4)
    order_id = uuid.UUID("00000000-0000-0000-0000-000000000003")
    user_id = uuid.UUID("00000000-0000-0000-0000-000000000001")
    currency = "ARS"
    version = factory.Sequence(lambda n: n + 1)
    filament_items = []
    manual_filament_cost = None
    manual_grams = None
    hours = 0
    minutes = 0
    extra_costs = 0.0
    assembly_cost = 0.0
    sanding_cost = 0.0
    painting_cost = 0.0
    margin_type = "retail"
    error_margin_percent = 5.0
    margin_multiplier = 4.0
    printer_id = None
    power_watts = None
    lifespan_hours = None
    spare_parts_cost = None
    final_price = 0.0
    manual_price = None
    notes = None
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
