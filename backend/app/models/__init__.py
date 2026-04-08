"""Customer domain SQLAlchemy models."""

from app.models.address import CustomerAddress
from app.models.base import Base
from app.models.contact import CustomerContact
from app.models.customer import Customer
from app.models.customer_document import CustomerDocument
from app.models.history import CustomerHistory
from app.models.wash_profile import CustomerWashProfile

__all__ = [
    "Base",
    "Customer",
    "CustomerAddress",
    "CustomerContact",
    "CustomerDocument",
    "CustomerWashProfile",
    "CustomerHistory",
]

