import factory
from factory import Faker

from backend.schemas.order import CustomerCreate, FileInfo, OrderCreate, PublicOrderCreate


class CustomerCreateFactory(factory.Factory):
    class Meta:
        model = CustomerCreate

    name = "Juan Perez"
    email = Faker("email")
    phone = Faker("phone_number")


class FileInfoFactory(factory.Factory):
    class Meta:
        model = FileInfo

    filename = Faker("file_name")
    url = Faker("url")


class OrderCreateFactory(factory.Factory):
    class Meta:
        model = OrderCreate

    work_type = factory.Iterator(["impresion_3d", "diseno_3d"])
    customer = factory.SubFactory(CustomerCreateFactory)
    description = Faker("sentence")
    files = None
    skip_client_notification = False
    status = None
    order_category = factory.LazyAttribute(lambda o: "print")
    needs_3d_printing = factory.LazyAttribute(lambda o: o.work_type == "impresion_3d")
    needs_3d_modelling = factory.LazyAttribute(lambda o: o.work_type == "diseno_3d")
    dimensions = None
    type_of_delivery = "Presencial acordado"


class PublicOrderCreateFactory(factory.Factory):
    class Meta:
        model = PublicOrderCreate

    work_type = factory.Iterator(["impresion_3d", "diseno_3d"])
    customer = factory.SubFactory(CustomerCreateFactory)
    description = Faker("sentence")
    files = None
    token = None
    skip_client_notification = False
    order_category = factory.LazyAttribute(lambda o: "print")
    needs_3d_printing = factory.LazyAttribute(lambda o: o.work_type == "impresion_3d")
    needs_3d_modelling = factory.LazyAttribute(lambda o: o.work_type == "diseno_3d")
    dimensions = None
    type_of_delivery = "Presencial acordado"
