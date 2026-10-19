from pydantic import BaseModel, ConfigDict


def _to_camel(value: str) -> str:
    first, *rest = value.split("_")
    return first + "".join(part.capitalize() for part in rest)


class WorkspaceAction(BaseModel):
    model_config = ConfigDict(alias_generator=_to_camel, populate_by_name=True, extra="ignore")

    action: str
    workspace_id: str | None = None
    name: str | None = None
    code: str | None = None
    email: str | None = None
    role: str | None = None
    status: str | None = None
    member_id: str | None = None
    code_id: str | None = None
    expires_in_days: int | None = None
