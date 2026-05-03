from fastapi import FastAPI
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
import redis
import json
import os

app = FastAPI(title="CloudShop - Cart Service")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)

redis_client = redis.Redis(
    host=os.getenv("REDIS_HOST", "localhost"),
    port=int(os.getenv("REDIS_PORT", 6379)),
    decode_responses=True
)

class CartItem(BaseModel):
    product_id: int
    name: str
    price: float
    quantity: int

@app.get("/")
def root():
    return {"service": "cart", "status": "ok"}

@app.get("/cart/{user_id}")
def get_cart(user_id: str):
    cart = redis_client.get(f"cart:{user_id}")
    if not cart:
        return {"user_id": user_id, "items": [], "total": 0}
    items = json.loads(cart)
    total = sum(i["price"] * i["quantity"] for i in items)
    return {"user_id": user_id, "items": items, "total": round(total, 2)}

@app.post("/cart/{user_id}")
def add_to_cart(user_id: str, item: CartItem):
    cart = redis_client.get(f"cart:{user_id}")
    items = json.loads(cart) if cart else []
    
    existing = next((i for i in items if i["product_id"] == item.product_id), None)
    if existing:
        existing["quantity"] += item.quantity
    else:
        items.append(item.dict())
    
    redis_client.set(f"cart:{user_id}", json.dumps(items))
    return {"message": "Item added", "cart": items}

@app.delete("/cart/{user_id}")
def clear_cart(user_id: str):
    redis_client.delete(f"cart:{user_id}")
    return {"message": "Cart cleared"}