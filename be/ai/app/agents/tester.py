from .base import BaseAgent, PipelineState

class TesterAgent(BaseAgent):
    """Đơn giản: chỉ kiểm tra file tồn tại. Bật docker verify bằng flag."""
    name = "tester"

    async def run(self, state: PipelineState) -> PipelineState:
        ws = state.workspace
        required = ["docker-compose.yml", "backend/Dockerfile", "frontend/Dockerfile"]
        missing = [f for f in required if not (ws / f).exists()]
        state.issues = [{"problem": f"Thiếu file {f}"} for f in missing]
        return state