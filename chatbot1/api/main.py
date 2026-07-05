from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles

from route.auth_route import router as auth_router
from route.admin_route import router as admin_router
from route.media_route import router as media_router
from route.resource_route import router as resource_router
from route.api_key_route import router as api_key_router
from route.widget_install_route import router as widget_install_router
from route.chat_route import router as chat_router
from route.chat_history_route import router as chat_history_router
from route.voice_route import router as voice_router
from app.settings.cors import setup_cors

app = FastAPI(title="BotAPI")

setup_cors(app)

app.mount("/uploads", StaticFiles(directory="storage/uploads"), name="uploads")
app.mount("/resource-files", StaticFiles(directory="storage/resources"), name="resource-files")

app.include_router(auth_router)
app.include_router(admin_router)
app.include_router(media_router)
app.include_router(resource_router)
app.include_router(api_key_router)
app.include_router(widget_install_router)
app.include_router(chat_router)
app.include_router(chat_history_router)
app.include_router(voice_router)


@app.get("/")
async def root():
    return {"message": "API Running"}