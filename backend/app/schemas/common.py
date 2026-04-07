from pydantic import BaseModel, Field


class HealthResponse(BaseModel):
    status: str = Field(default="ok")
    cors_origins: list[str] = Field(default_factory=list)

