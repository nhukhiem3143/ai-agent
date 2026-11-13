from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from pathlib import Path
@dataclass
class PipelineState:
    user_prompt: str
    workspace: Path
    prd: str = ""
    issues: list = field(default_factory=list)
    template_id: str = ""
    design_id: str = ""
    app_name: str = ""
class BaseAgent(ABC):
    name: str = "base"
    @abstractmethod
    async def run(self, state: PipelineState) -> PipelineState: ...
    async def execute(self, state: PipelineState) -> PipelineState:
        print(f"[{self.name}] running...")
        state = await self.run(state)
        print(f"[{self.name}] done")
        return state
