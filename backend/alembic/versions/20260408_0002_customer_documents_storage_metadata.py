"""Add customer_documents metadata table for object storage pointers.

Revision ID: 20260408_0002
Revises: 20260407_0001
Create Date: 2026-04-08 00:02:00
"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = "20260408_0002"
down_revision = "20260407_0001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "customer_documents",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("customer_id", sa.Integer(), sa.ForeignKey("customers.id", ondelete="CASCADE"), nullable=False),
        sa.Column("storage_provider", sa.String(length=32), nullable=False),
        sa.Column("container_name", sa.String(length=128), nullable=False),
        sa.Column("object_key", sa.String(length=512), nullable=False),
        sa.Column("original_filename", sa.String(length=255), nullable=False),
        sa.Column("content_type", sa.String(length=255), nullable=True),
        sa.Column("size_bytes", sa.BigInteger(), nullable=False, server_default="0"),
        sa.Column("checksum_sha256", sa.String(length=128), nullable=True),
        sa.Column("status", sa.String(length=32), nullable=False, server_default="uploaded"),
        sa.Column("uploaded_by", sa.String(length=255), nullable=True),
        sa.Column("uploaded_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("metadata_json", sa.JSON(), nullable=False, server_default=sa.text("'{}'")),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_customer_documents_customer_id", "customer_documents", ["customer_id"], unique=False)
    op.create_index("ix_customer_documents_status", "customer_documents", ["status"], unique=False)
    op.create_index("ix_customer_documents_uploaded_at", "customer_documents", ["uploaded_at"], unique=False)


def downgrade() -> None:
    op.drop_index("ix_customer_documents_uploaded_at", table_name="customer_documents")
    op.drop_index("ix_customer_documents_status", table_name="customer_documents")
    op.drop_index("ix_customer_documents_customer_id", table_name="customer_documents")
    op.drop_table("customer_documents")
