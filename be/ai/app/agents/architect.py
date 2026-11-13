from pathlib import Path
from .base import BaseAgent, PipelineState

class ArchitectAgent(BaseAgent):
    name = "architect"
    async def run(self, state: PipelineState) -> PipelineState:
        tpl_dir = Path("/app/template") / state.template_id
        if not tpl_dir.exists():
            tpl_dir = Path("/app/template/ecommerce_basic")
        
        state.__dict__["_template_dir"] = str(tpl_dir)
        return state