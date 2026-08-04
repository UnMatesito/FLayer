import uuid
from datetime import date, datetime, timedelta

import factory
from factory import Faker

from backend.models.printer import Printer, PrinterMaintenance


class PrinterFactory(factory.Factory):
    class Meta:
        model = Printer

    id = factory.LazyFunction(uuid.uuid4)
    user_id = uuid.UUID("00000000-0000-0000-0000-000000000001")
    name = factory.Sequence(lambda n: f"Printer {n}")
    brand = "Creality"
    model = "Ender 3 Pro"
    nozzle_sizes = ["0.4"]
    power_watts = 120
    lifespan_hours = 4320
    spare_parts_cost = 400
    image_url = None
    notes = None
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


class PrinterMaintenanceFactory(factory.Factory):
    class Meta:
        model = PrinterMaintenance

    id = factory.LazyFunction(uuid.uuid4)
    user_id = uuid.UUID("00000000-0000-0000-0000-000000000001")
    printer_id = uuid.uuid4()
    maintenance_type = "cleaning"
    maintenance_date = factory.LazyFunction(lambda: date.today() - timedelta(days=1))
    description = Faker("sentence")
    cost = None
    created_at = factory.LazyFunction(datetime.now)

    @classmethod
    def create(cls, session=None, **kwargs):
        instance = cls.build(**kwargs)
        if session is not None:
            session.add(instance)
            session.flush()
            session.refresh(instance)
        return instance
