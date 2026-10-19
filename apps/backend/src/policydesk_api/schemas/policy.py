from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


def _to_camel(value: str) -> str:
    first, *rest = value.split("_")
    return first + "".join(part.capitalize() for part in rest)


class PolicyInput(BaseModel):
    model_config = ConfigDict(alias_generator=_to_camel, populate_by_name=True)

    name: str = Field(min_length=1, max_length=160)
    description: str = Field(default="", max_length=10000)
    labels: list[str] = Field(default_factory=list)
    status: Literal["draft", "active", "inactive"] = "draft"
    effective_from: str | None = None
    effective_until: str | None = None


class PolicyStatusInput(BaseModel):
    status: Literal["draft", "active", "inactive"]


class ActivityInput(BaseModel):
    model_config = ConfigDict(alias_generator=_to_camel, populate_by_name=True)

    policy_id: str
    policy_name: str
    activity_type: Literal["added", "removed", "draft", "scheduled"]
