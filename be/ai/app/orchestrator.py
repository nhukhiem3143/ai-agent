import uuid
import json
from pathlib import Path
from .config import settings
from .agents.base import PipelineState
from .agents.analyst import AnalystAgent
from .agents.architect import ArchitectAgent
from .agents.developer import DeveloperAgent
from .agents.tester import TesterAgent
from .tools import zip_workspace

ENABLE_TESTER = True
MAX_RETRY = 2

async def orchestrate(user_prompt: str, run_id: str | None = None) -> dict:
    run_id = run_id or uuid.uuid4().hex[:12]
    ws = Path(settings.outputs_dir) / run_id / "workspace"
    ws.mkdir(parents=True, exist_ok=True)

    state = PipelineState(user_prompt=user_prompt, workspace=ws)

    analyst = AnalystAgent()
    architect = ArchitectAgent()
    developer = DeveloperAgent()
    tester = TesterAgent()

    state = await analyst.execute(state)
    state = await architect.execute(state)
    state = await developer.execute(state)

    if ENABLE_TESTER:
        for attempt in range(MAX_RETRY + 1):
            state.retry_count = attempt
            state = await tester.execute(state)
            if not state.issues:
                break
            if attempt < MAX_RETRY:
                state = await developer.execute(state)

    zip_path = Path(settings.outputs_dir) / run_id / f"{run_id}.zip"
    zip_workspace(ws, zip_path)

    return {
        "run_id": run_id,
        "template_id": state.template_id,
        "design_id": state.design_id,
        "app_name": state.app_name,
        "file_count": sum(1 for _ in ws.rglob("*") if _.is_file()),
        "issues": state.issues,
        "zip_path": f"/outputs/{run_id}/{run_id}.zip",
    }