from pydantic import BaseModel
from typing import Any, Dict

class ControlCreate(BaseModel):
    result: str = "conform"
    control_type: str = "tematic"
    payload: Dict[str, Any]

class ControlOut(BaseModel):
    id: int
    result: str
    control_type: str
    payload: Dict[str, Any]
