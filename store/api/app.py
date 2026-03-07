
import uvicorn
from fastapi import FastAPI

from store.api.routers import assistant

app = FastAPI()
app.include_router(assistant.router, prefix='/assistant', tags=["assistant"])


def main():
    uvicorn.run(app, port=8000)


if __name__ == '__main__':
    main()
