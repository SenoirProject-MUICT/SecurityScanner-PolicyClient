from pydantic import BaseModel, ConfigDict, Field


def _to_camel(value: str) -> str:
    first, *rest = value.split("_")
    return first + "".join(part.capitalize() for part in rest)


class LinkedRepositoriesInput(BaseModel):
    model_config = ConfigDict(alias_generator=_to_camel, populate_by_name=True)

    # The full set to follow; repositories left out are unlinked.
    repository_ids: list[str] = Field(max_length=1000)
