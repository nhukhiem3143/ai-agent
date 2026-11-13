from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse
from pydantic import BaseModel
from pathlib import Path
from .config import settings
import yaml
from typing import List

from .agents.chat_agent import ChatAgent
from .orchestrator import orchestrate, summarize_chat

app = FastAPI(title="Ecom Generator AI")

# --- Định nghĩa Data Models ---
class ChatReq(BaseModel):
    history: List[dict]

class SumReq(BaseModel):
    history: List[dict]

class GenReq(BaseModel):
    prompt: str
    run_id: str | None = None

# --- Các API Endpoints ---

@app.post("/chat")
async def chat_endpoint(req: ChatReq):
    agent = ChatAgent()
    reply = await agent.run(req.history)
    return {"reply": reply}

@app.post("/summarize")
async def summarize_endpoint(req: SumReq):
    # Tổng hợp lịch sử chat thành câu prompt duy nhất
    prompt = await summarize_chat(req.history)
    return {"prompt": prompt}

@app.post("/generate")
async def generate(req: GenReq):
    try:
        result = await orchestrate(req.prompt, req.run_id)
        return result
    except Exception as e:
        raise HTTPException(500, detail=str(e))

@app.get("/runs/{run_id}/download")
async def download(run_id: str):
    p = Path(settings.outputs_dir) / run_id / f"{run_id}.zip"
    if not p.exists():
        raise HTTPException(404, "Not found")
    return FileResponse(p, filename=f"{run_id}.zip", media_type="application/zip")

@app.get("/templates")
def list_templates():
    root = Path(__file__).parent.parent / "template"
    result = []
    if root.exists():
        for d in root.iterdir():
            if d.is_dir() and (d / "manifest.json").exists():
                m = __import__("json").loads((d / "manifest.json").read_text())
                result.append({"id": d.name, "name": m.get("name", d.name)})
    return result

@app.get("/skills")
def list_skills():
    root = Path(__file__).parent / "skills" / "design"
    result = []
    if root.exists():
        for f in root.glob("*.yaml"):
            data = yaml.safe_load(f.read_text(encoding="utf-8"))
            result.append({"id": f.stem, "name": data.get("name", f.stem)})
    return result

@app.get("/health")
def health():
    return {"status": "ok"}