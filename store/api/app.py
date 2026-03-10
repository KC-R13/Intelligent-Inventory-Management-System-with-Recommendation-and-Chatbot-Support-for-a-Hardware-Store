
import uvicorn
from fastapi import FastAPI

from store.api.routers import assistant
from store.api.routers import auth

app = FastAPI()
app.include_router(assistant.router)
app.include_router(auth.router)


def main():
    uvicorn.run(app, port=8000)


if __name__ == '__main__':
    main()
