
import uvicorn
from fastapi import FastAPI

from store.api.routers import assistant, auth, products


app = FastAPI()
app.include_router(assistant.router)
app.include_router(auth.router)
app.include_router(products.router)


def main():
    uvicorn.run(app, port=8000)


if __name__ == '__main__':
    main()
