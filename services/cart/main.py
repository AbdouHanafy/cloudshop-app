from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
import redis
import json
import os

app = FastAPI(title="CloudShop Learn - Learning List Service")

SERVICE_METADATA = {
    "product": "cloudshop-learn",
    "service": "learning-list",
    "status": "ok",
    "domain": "e-learning",
}

def get_cors_origins():
    raw_origins = os.getenv("CORS_ORIGINS", "http://localhost:5173")
    return [origin.strip() for origin in raw_origins.split(",") if origin.strip()]


app.add_middleware(
    CORSMiddleware,
    allow_origins=get_cors_origins(),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

redis_client = redis.Redis(
    host=os.getenv("REDIS_HOST", "localhost"),
    port=int(os.getenv("REDIS_PORT", 6379)),
    decode_responses=True,
)


class LearningListItem(BaseModel):
    course_id: int
    title: str
    category: str
    instructor: str
    price: float
    level: str
    duration: str


def learning_list_key(user_id: str) -> str:
    return f"learning-list:{user_id}"


def read_learning_list(user_id: str):
    try:
        items_json = redis_client.get(learning_list_key(user_id))
    except redis.RedisError as exc:
        raise HTTPException(status_code=503, detail="Learning list storage unavailable") from exc

    return json.loads(items_json) if items_json else []


def write_learning_list(user_id: str, items):
    try:
        redis_client.set(learning_list_key(user_id), json.dumps(items))
    except redis.RedisError as exc:
        raise HTTPException(status_code=503, detail="Learning list storage unavailable") from exc


@app.get("/")
def root():
    return {
        **SERVICE_METADATA,
        "capabilities": ["saved-courses", "learning-list-total", "redis-backed-state"],
    }


@app.get("/health")
def health():
    try:
        redis_client.ping()
        redis_status = "ok"
    except redis.RedisError:
        redis_status = "unavailable"

    return {
        **SERVICE_METADATA,
        "dependencies": [{"name": "redis", "status": redis_status}],
    }


@app.get("/learning-list/{user_id}")
def get_learning_list(user_id: str):
    items = read_learning_list(user_id)
    total = round(sum(item["price"] for item in items), 2)
    return {
        "user_id": user_id,
        "items": items,
        "count": len(items),
        "total": total,
    }


@app.post("/learning-list/{user_id}")
def add_to_learning_list(user_id: str, item: LearningListItem):
    items = read_learning_list(user_id)

    exists = next((existing for existing in items if existing["course_id"] == item.course_id), None)
    if exists:
        return {
            "message": "Course already saved",
            "items": items,
            "count": len(items),
            "total": round(sum(existing_item["price"] for existing_item in items), 2),
        }

    items.append(item.model_dump())
    write_learning_list(user_id, items)
    return {
        "message": "Course saved",
        "items": items,
        "count": len(items),
        "total": round(sum(existing_item["price"] for existing_item in items), 2),
    }


@app.delete("/learning-list/{user_id}/{course_id}")
def remove_from_learning_list(user_id: str, course_id: int):
    items = read_learning_list(user_id)
    filtered_items = [item for item in items if item["course_id"] != course_id]

    if len(filtered_items) == len(items):
        raise HTTPException(status_code=404, detail="Course not found in learning list")

    write_learning_list(user_id, filtered_items)
    return {
        "message": "Course removed",
        "items": filtered_items,
        "count": len(filtered_items),
        "total": round(sum(item["price"] for item in filtered_items), 2),
    }


@app.delete("/learning-list/{user_id}")
def clear_learning_list(user_id: str):
    try:
        redis_client.delete(learning_list_key(user_id))
    except redis.RedisError as exc:
        raise HTTPException(status_code=503, detail="Learning list storage unavailable") from exc
    return {"message": "Learning list cleared"}
