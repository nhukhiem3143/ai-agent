from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse
from pydantic import BaseModel
from pathlib import Path
from .config import settings
from .orchestrator import orchestrate
import yaml

app = FastAPI(title="Ecom Generator AI")

class GenReq(BaseModel):
    prompt: str
    run_id: str | None = None

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
    for d in root.iterdir():
        if d.is_dir() and (d / "manifest.json").exists():
            m = __import__("json").loads((d / "manifest.json").read_text())
            result.append({"id": d.name, "name": m.get("name", d.name)})
    return result

@app.get("/skills")
def list_skills():
    root = Path(__file__).parent / "skills" / "design"
    result = []
    for f in root.glob("*.yaml"):
        data = yaml.safe_load(f.read_text(encoding="utf-8"))
        result.append({"id": f.stem, "name": data.get("name", f.stem)})
    return result

@app.get("/health")
def health():
    return {"status": "ok"}