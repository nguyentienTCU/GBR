from pydantic import BaseModel

class CallBackResponse(BaseModel):
    message: str
    query_params: dict[str, str]