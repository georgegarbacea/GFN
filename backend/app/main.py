from fastapi import FastAPI

app = FastAPI(title="GFN Portal API")

@app.get("/health")
def health():
    return {"status": "ok"}

