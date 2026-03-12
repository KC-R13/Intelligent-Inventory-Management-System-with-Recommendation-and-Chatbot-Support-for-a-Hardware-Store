
import uvicorn
from fastapi import FastAPI
from starlette.middleware.cors import CORSMiddleware

from store.api.routers import assistant, auth, products


app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(assistant.router)
app.include_router(auth.router)
app.include_router(products.router)


def main():
    uvicorn.run(app, port=8000)


if __name__ == '__main__':
    main()
