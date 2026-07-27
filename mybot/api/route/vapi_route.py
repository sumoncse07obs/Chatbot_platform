import hmac
import json
import os

from fastapi import APIRouter, Depends, Header, HTTPException, Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.controller.chat_controller import chat_with_api_key
from app.database.db import get_db
from app.schemas.chat_schema import ChatRequest

router = APIRouter(
    prefix="/vapi",
    tags=["Vapi"],
)


def verify_vapi_tool_secret(x_vapi_tool_secret: str | None) -> None:
    expected_secret = os.getenv("VAPI_TOOL_SECRET", "")

    if not expected_secret:
        raise HTTPException(
            status_code=500,
            detail="VAPI_TOOL_SECRET is not configured on the server.",
        )

    if not x_vapi_tool_secret or not hmac.compare_digest(
        x_vapi_tool_secret,
        expected_secret,
    ):
        raise HTTPException(status_code=401, detail="Invalid Vapi tool secret.")


def parse_tool_arguments(tool_call: dict) -> dict:
    arguments = tool_call.get("function", {}).get("arguments", {})

    if isinstance(arguments, dict):
        return arguments

    if isinstance(arguments, str):
        try:
            parsed = json.loads(arguments)
            return parsed if isinstance(parsed, dict) else {}
        except json.JSONDecodeError:
            return {}

    return {}


@router.post("/ask-mybot")
async def ask_mybot(
    request: Request,
    x_vapi_tool_secret: str | None = Header(default=None),
    db: AsyncSession = Depends(get_db),
):
    verify_vapi_tool_secret(x_vapi_tool_secret)

    chat_api_key = os.getenv("VAPI_CHAT_API_KEY", "")

    if not chat_api_key:
        raise HTTPException(
            status_code=500,
            detail="VAPI_CHAT_API_KEY is not configured on the server.",
        )

    payload = await request.json()
    message = payload.get("message", {})
    tool_call_list = message.get("toolCallList", [])

    if not isinstance(tool_call_list, list) or not tool_call_list:
        raise HTTPException(status_code=400, detail="No Vapi tool calls were received.")

    call_id = (
        message.get("call", {}).get("id")
        or payload.get("call", {}).get("id")
        or "unknown-call"
    )

    results = []

    for tool_call in tool_call_list:
        if tool_call.get("function", {}).get("name") != "ask_mybot":
            continue

        arguments = parse_tool_arguments(tool_call)
        question = str(arguments.get("question", "")).strip()

        if not question:
            results.append(
                {
                    "toolCallId": tool_call.get("id"),
                    "result": "No question was provided.",
                }
            )
            continue

        try:
            chat_result = await chat_with_api_key(
                ChatRequest(
                    api_key=chat_api_key,
                    message=question,
                    external_user_id=f"vapi-{call_id}",
                ),
                db,
            )

            answer = chat_result["answer"]
        except HTTPException as exc:
            answer = exc.detail if isinstance(exc.detail, str) else "Unable to answer."
        except Exception:
            answer = "I’m sorry, I’m unable to look that up right now."

        results.append(
            {
                "toolCallId": tool_call.get("id"),
                "result": answer,
            }
        )

    return {"results": results}