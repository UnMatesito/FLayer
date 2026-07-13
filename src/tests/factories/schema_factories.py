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

    work_type = "impresion_3d"
    customer = factory.SubFactory(CustomerCreateFactory)
    description = Faker("sentence")
    files = None
    skip_client_notification = False
    status = None


class PublicOrderCreateFactory(factory.Factory):
    class Meta:
        model = PublicOrderCreate

    work_type = "impresion_3d"
    customer = factory.SubFactory(CustomerCreateFactory)
    description = Faker("sentence")
    files = None
    skip_client_notification = False
