import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from fastapi import FastAPI, HTTPException, Response, status, Header
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel
from typing import Optional
import uvicorn

# Products
from products.list_products import list_products
from products.get_product import get_product
from products.create_product import create_product
from products.update_product import update_product
from products.delete_product import delete_product

# Copy Types
from copy_types.list_copy_types import list_copy_types
from copy_types.get_copy_type import get_copy_type
from copy_types.create_copy_type import create_copy_type
from copy_types.update_copy_type import update_copy_type
from copy_types.delete_copy_type import delete_copy_type

# Copies
from copies.list_copies import list_copies
from copies.get_copy import get_copy
from copies.create_copy import create_copy
from copies.update_copy import update_copy
from copies.delete_copy import delete_copy

# Checklists
from checklists.list_checklists import list_checklists
from checklists.get_stats import get_checklist_stats
from checklists.update_checklist import update_checklist
from checklists.init_week import init_week_checklists

# Best Copies
from best_copies.list_best import list_best_copies
from best_copies.create_best import create_best_copy

# AI
from ai.generate_copy import generate_ad_copy
from ai.regenerate_copy import regenerate_copy

# Teams
from teams.list_teams import list_teams
from teams.create_team import create_team
from teams.delete_team import delete_team

# Team Products
from team_products.list_team_products import list_team_products
from team_products.create_team_product import create_team_product
from team_products.delete_team_product import delete_team_product

# Auth
from auth.register import register_user
from auth.login import login_user
from auth.me import get_current_user
from auth.approve import approve_user
from auth.list_users import list_users


app = FastAPI(
    title="Ad Copy Dashboard API",
    description="API for managing health supplement ad copies",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ============================================
# Pydantic Models
# ============================================

# Product Models
class ProductCreate(BaseModel):
    name: str
    usp: Optional[str] = None
    appeal_points: Optional[list[str]] = None
    mechanism: Optional[str] = None
    features: Optional[list[str]] = None
    english_name: Optional[str] = None
    shape: Optional[str] = None
    herb_keywords: Optional[list[str]] = None
    default_utm_code: Optional[str] = None


class ProductUpdate(BaseModel):
    name: Optional[str] = None
    usp: Optional[str] = None
    appeal_points: Optional[list[str]] = None
    mechanism: Optional[str] = None
    features: Optional[list[str]] = None
    english_name: Optional[str] = None
    shape: Optional[str] = None
    herb_keywords: Optional[list[str]] = None
    default_utm_code: Optional[str] = None


# Copy Type Models
class CopyTypeCreate(BaseModel):
    code: str
    name: str
    description: Optional[str] = None
    core_concept: Optional[str] = None
    example_copy: Optional[str] = None
    prompt_template: Optional[str] = None


class CopyTypeUpdate(BaseModel):
    code: Optional[str] = None
    name: Optional[str] = None
    description: Optional[str] = None
    core_concept: Optional[str] = None
    example_copy: Optional[str] = None
    prompt_template: Optional[str] = None


# Generated Copy Models
class GeneratedCopyCreate(BaseModel):
    product_id: str
    copy_type_id: str
    content: str
    ad_spend: Optional[float] = None


class GeneratedCopyUpdate(BaseModel):
    content: Optional[str] = None
    is_best: Optional[bool] = None
    ad_spend: Optional[float] = None


# Checklist Models
class ChecklistUpdate(BaseModel):
    status: Optional[str] = None
    notes: Optional[str] = None
    utm_code: Optional[str] = None


# Best Copy Models
class BestCopyCreate(BaseModel):
    copy_id: str
    month: str
    ad_spend: float


# AI Models
class AIGenerateRequest(BaseModel):
    product_id: str
    copy_type_id: str
    custom_prompt: Optional[str] = None


# Team Models
class TeamCreate(BaseModel):
    name: str


# Team Product Models
class TeamProductCreate(BaseModel):
    team_id: str
    product_id: str


# Auth Models
class AuthRegister(BaseModel):
    email: str
    password: str
    name: str
    team_id: str


class AuthLogin(BaseModel):
    email: str
    password: str


# ============================================
# Products API
# ============================================

@app.get("/api/products")
def api_list_products():
    return list_products()


@app.get("/api/products/{id}")
def api_get_product(id: str):
    result = get_product(id)
    if not result:
        raise HTTPException(status_code=404, detail="Product not found")
    return result


@app.post("/api/products", status_code=status.HTTP_201_CREATED)
def api_create_product(data: ProductCreate):
    product_data = data.model_dump(exclude_none=True)
    return create_product(product_data)


@app.put("/api/products/{id}")
def api_update_product(id: str, data: ProductUpdate):
    product_data = data.model_dump(exclude_none=True)
    return update_product(id, product_data)


@app.delete("/api/products/{id}", status_code=status.HTTP_204_NO_CONTENT)
def api_delete_product(id: str):
    delete_product(id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


# ============================================
# Copy Types API
# ============================================

@app.get("/api/copy-types")
def api_list_copy_types():
    return list_copy_types()


@app.get("/api/copy-types/{id}")
def api_get_copy_type(id: str):
    result = get_copy_type(id)
    if not result:
        raise HTTPException(status_code=404, detail="Copy type not found")
    return result


@app.post("/api/copy-types", status_code=status.HTTP_201_CREATED)
def api_create_copy_type(data: CopyTypeCreate):
    copy_type_data = data.model_dump(exclude_none=True)
    return create_copy_type(copy_type_data)


@app.put("/api/copy-types/{id}")
def api_update_copy_type(id: str, data: CopyTypeUpdate):
    copy_type_data = data.model_dump(exclude_none=True)
    return update_copy_type(id, copy_type_data)


@app.delete("/api/copy-types/{id}", status_code=status.HTTP_204_NO_CONTENT)
def api_delete_copy_type(id: str):
    delete_copy_type(id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


# ============================================
# Copies API
# ============================================

@app.get("/api/copies")
def api_list_copies(product_id: Optional[str] = None, copy_type_id: Optional[str] = None):
    return list_copies(product_id, copy_type_id)


@app.get("/api/copies/{id}")
def api_get_copy(id: str):
    result = get_copy(id)
    if not result:
        raise HTTPException(status_code=404, detail="Copy not found")
    return result


@app.post("/api/copies", status_code=status.HTTP_201_CREATED)
def api_create_copy(data: GeneratedCopyCreate):
    copy_data = {
        "product_id": data.product_id,
        "copy_type_id": data.copy_type_id,
        "content": data.content,
    }
    if data.ad_spend is not None:
        copy_data["ad_spend"] = data.ad_spend
    return create_copy(copy_data)


@app.put("/api/copies/{id}")
def api_update_copy(id: str, data: GeneratedCopyUpdate):
    copy_data = data.model_dump(exclude_none=True)
    return update_copy(id, copy_data)


@app.delete("/api/copies/{id}", status_code=status.HTTP_204_NO_CONTENT)
def api_delete_copy(id: str):
    delete_copy(id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


# ============================================
# Checklists API
# ============================================

@app.get("/api/checklists")
def api_list_checklists(week: Optional[str] = None, team_id: Optional[str] = None):
    return list_checklists(week, team_id)


@app.post("/api/checklists/init-week")
def api_init_week(week: Optional[str] = None):
    return init_week_checklists(week)


@app.get("/api/checklists/stats")
def api_get_checklist_stats():
    return get_checklist_stats()


@app.put("/api/checklists/{id}")
def api_update_checklist(id: str, data: ChecklistUpdate):
    checklist_data = data.model_dump(exclude_none=True)
    return update_checklist(id, checklist_data)


# ============================================
# Best Copies API
# ============================================

@app.get("/api/best-copies")
def api_list_best_copies(month: Optional[str] = None):
    return list_best_copies(month)


@app.post("/api/best-copies", status_code=status.HTTP_201_CREATED)
def api_create_best_copy(data: BestCopyCreate):
    best_copy_data = {
        "copy_id": data.copy_id,
        "month": data.month,
        "ad_spend": data.ad_spend,
    }
    return create_best_copy(best_copy_data)


# ============================================
# Teams API
# ============================================

@app.get("/api/teams")
def api_list_teams():
    return list_teams()


@app.post("/api/teams", status_code=status.HTTP_201_CREATED)
def api_create_team(data: TeamCreate):
    return create_team(data.name)


@app.delete("/api/teams/{id}", status_code=status.HTTP_204_NO_CONTENT)
def api_delete_team(id: str):
    delete_team(id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


# ============================================
# Team Products API
# ============================================

@app.get("/api/team-products")
def api_list_team_products(team_id: Optional[str] = None):
    return list_team_products(team_id)


@app.post("/api/team-products", status_code=status.HTTP_201_CREATED)
def api_create_team_product(data: TeamProductCreate):
    return create_team_product(data.team_id, data.product_id)


@app.delete("/api/team-products/{id}", status_code=status.HTTP_204_NO_CONTENT)
def api_delete_team_product(id: str):
    delete_team_product(id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


# ============================================
# Auth API
# ============================================

@app.post("/api/auth/register", status_code=status.HTTP_201_CREATED)
def api_register(data: AuthRegister):
    return register_user(data.email, data.password, data.name, data.team_id)


@app.post("/api/auth/login")
def api_login(data: AuthLogin):
    return login_user(data.email, data.password)


@app.get("/api/auth/me")
def api_get_me(authorization: str = Header(None)):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid token")
    token = authorization.replace("Bearer ", "")
    return get_current_user(token)


@app.get("/api/auth/users")
def api_list_users():
    return list_users()


@app.put("/api/auth/approve/{id}")
def api_approve_user(id: str):
    return approve_user(id)


# ============================================
# AI API
# ============================================

@app.post("/api/ai/generate", status_code=status.HTTP_201_CREATED)
def api_generate_copy(data: AIGenerateRequest):
    return generate_ad_copy(data.product_id, data.copy_type_id, data.custom_prompt)


@app.post("/api/ai/regenerate/{copy_id}", status_code=status.HTTP_201_CREATED)
def api_regenerate_copy(copy_id: str):
    return regenerate_copy(copy_id)


# ============================================
# Static File Serving (Production)
# ============================================

# Serve static files from frontend build
frontend_dist = os.path.join(os.path.dirname(__file__), "..", "frontend", "dist")
if os.path.exists(frontend_dist):
    app.mount("/assets", StaticFiles(directory=os.path.join(frontend_dist, "assets")), name="assets")

    @app.get("/")
    async def serve_root():
        return FileResponse(os.path.join(frontend_dist, "index.html"))

    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        # API 경로는 제외
        if full_path.startswith("api/"):
            return {"error": "Not found"}
        file_path = os.path.join(frontend_dist, full_path)
        if os.path.exists(file_path) and os.path.isfile(file_path):
            return FileResponse(file_path)
        return FileResponse(os.path.join(frontend_dist, "index.html"))


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run("api:app", host="0.0.0.0", port=port, reload=True)
