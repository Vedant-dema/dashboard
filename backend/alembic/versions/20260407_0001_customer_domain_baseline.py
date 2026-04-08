"""Customer domain baseline tables for PostgreSQL migration.

Revision ID: 20260407_0001
Revises:
Create Date: 2026-04-07 00:00:00
"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = "20260407_0001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "customers",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("kunden_nr", sa.String(length=64), nullable=False),
        sa.Column("firmenname", sa.String(length=255), nullable=False),
        sa.Column("branche", sa.String(length=255), nullable=True),
        sa.Column("strasse", sa.String(length=255), nullable=True),
        sa.Column("plz", sa.String(length=64), nullable=True),
        sa.Column("ort", sa.String(length=255), nullable=True),
        sa.Column("land_code", sa.String(length=16), nullable=True),
        sa.Column("deleted", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("aufnahme", sa.String(length=64), nullable=True),
        sa.Column("created_by_name", sa.String(length=255), nullable=True),
        sa.Column("created_by_email", sa.String(length=255), nullable=True),
        sa.Column("last_edited_by_name", sa.String(length=255), nullable=True),
        sa.Column("last_edited_by_email", sa.String(length=255), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("payload", sa.JSON(), nullable=False, server_default=sa.text("'{}'")),
        sa.UniqueConstraint("kunden_nr", name="uq_customers_kunden_nr"),
    )
    op.create_index("ix_customers_kunden_nr", "customers", ["kunden_nr"], unique=False)
    op.create_index("ix_customers_firmenname", "customers", ["firmenname"], unique=False)

    op.create_table(
        "customer_addresses",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("customer_id", sa.Integer(), sa.ForeignKey("customers.id", ondelete="CASCADE"), nullable=False),
        sa.Column("typ", sa.String(length=64), nullable=False, server_default="Hauptadresse"),
        sa.Column("strasse", sa.String(length=255), nullable=True),
        sa.Column("plz", sa.String(length=64), nullable=True),
        sa.Column("ort", sa.String(length=255), nullable=True),
        sa.Column("land_code", sa.String(length=16), nullable=True),
        sa.Column("art_land_code", sa.String(length=16), nullable=True),
        sa.Column("ust_id_nr", sa.String(length=64), nullable=True),
        sa.Column("steuer_nr", sa.String(length=64), nullable=True),
        sa.Column("branchen_nr", sa.String(length=64), nullable=True),
        sa.Column("raw_payload", sa.JSON(), nullable=False, server_default=sa.text("'{}'")),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_customer_addresses_customer_id", "customer_addresses", ["customer_id"], unique=False)

    op.create_table(
        "customer_contacts",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("customer_id", sa.Integer(), sa.ForeignKey("customers.id", ondelete="CASCADE"), nullable=False),
        sa.Column("kind", sa.String(length=32), nullable=False, server_default="CONTACT"),
        sa.Column("name", sa.String(length=255), nullable=True),
        sa.Column("role", sa.String(length=255), nullable=True),
        sa.Column("phone", sa.String(length=128), nullable=True),
        sa.Column("email", sa.String(length=255), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("raw_payload", sa.JSON(), nullable=False, server_default=sa.text("'{}'")),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_customer_contacts_customer_id", "customer_contacts", ["customer_id"], unique=False)

    op.create_table(
        "customer_wash_profiles",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("customer_id", sa.Integer(), sa.ForeignKey("customers.id", ondelete="CASCADE"), nullable=False),
        sa.Column("bukto", sa.String(length=128), nullable=True),
        sa.Column("limit_betrag", sa.Numeric(14, 2), nullable=True),
        sa.Column("rechnung_zusatz", sa.String(length=255), nullable=True),
        sa.Column("rechnung_plz", sa.String(length=64), nullable=True),
        sa.Column("rechnung_ort", sa.String(length=255), nullable=True),
        sa.Column("rechnung_strasse", sa.String(length=255), nullable=True),
        sa.Column("kunde_gesperrt", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("bankname", sa.String(length=255), nullable=True),
        sa.Column("bic", sa.String(length=64), nullable=True),
        sa.Column("iban", sa.String(length=64), nullable=True),
        sa.Column("wichtige_infos", sa.Text(), nullable=True),
        sa.Column("bemerkungen", sa.Text(), nullable=True),
        sa.Column("lastschrift", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("kennzeichen", sa.String(length=128), nullable=True),
        sa.Column("wasch_fahrzeug_typ", sa.String(length=128), nullable=True),
        sa.Column("wasch_programm", sa.String(length=255), nullable=True),
        sa.Column("netto_preis", sa.Numeric(14, 2), nullable=True),
        sa.Column("brutto_preis", sa.Numeric(14, 2), nullable=True),
        sa.Column("wasch_intervall", sa.String(length=128), nullable=True),
        sa.Column("payload", sa.JSON(), nullable=False, server_default=sa.text("'{}'")),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.UniqueConstraint("customer_id", name="uq_customer_wash_profiles_customer_id"),
    )
    op.create_index("ix_customer_wash_profiles_customer_id", "customer_wash_profiles", ["customer_id"], unique=False)

    op.create_table(
        "customer_history",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("customer_id", sa.Integer(), sa.ForeignKey("customers.id", ondelete="CASCADE"), nullable=False),
        sa.Column("timestamp", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("action", sa.String(length=32), nullable=False, server_default="updated"),
        sa.Column("editor_name", sa.String(length=255), nullable=True),
        sa.Column("editor_email", sa.String(length=255), nullable=True),
        sa.Column("entity_type", sa.String(length=64), nullable=True),
        sa.Column("entity_id", sa.Integer(), nullable=True),
        sa.Column("changed_by", sa.String(length=255), nullable=True),
        sa.Column("changed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("source", sa.String(length=255), nullable=True),
        sa.Column("changes", sa.JSON(), nullable=False, server_default=sa.text("'[]'")),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_customer_history_customer_id", "customer_history", ["customer_id"], unique=False)
    op.create_index("ix_customer_history_timestamp", "customer_history", ["timestamp"], unique=False)


def downgrade() -> None:
    op.drop_index("ix_customer_history_timestamp", table_name="customer_history")
    op.drop_index("ix_customer_history_customer_id", table_name="customer_history")
    op.drop_table("customer_history")

    op.drop_index("ix_customer_wash_profiles_customer_id", table_name="customer_wash_profiles")
    op.drop_table("customer_wash_profiles")

    op.drop_index("ix_customer_contacts_customer_id", table_name="customer_contacts")
    op.drop_table("customer_contacts")

    op.drop_index("ix_customer_addresses_customer_id", table_name="customer_addresses")
    op.drop_table("customer_addresses")

    op.drop_index("ix_customers_firmenname", table_name="customers")
    op.drop_index("ix_customers_kunden_nr", table_name="customers")
    op.drop_table("customers")

