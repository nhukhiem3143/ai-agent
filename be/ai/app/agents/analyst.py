import json, re
from .base import BaseAgent, PipelineState
from ..llm import chat
PROMPT = """Bạn là Analyst. Đề tài: "{prompt}". Trả JSON (không markdown):
{{"template_id":"ecommerce_basic","design_id":"coffee_warm","app_name":"Tên shop"}}"""
class AnalystAgent(BaseAgent):
    name = "analyst"
    async def run(self, state: PipelineState) -> PipelineState:
        try:
            resp = await chat(PROMPT.format(prompt=state.user_prompt), state.user_prompt)
            m = re.search(r"\{.*\}", resp, re.DOTALL)
            data = json.loads(m.group(0)) if m else {}
        except: data = {}
        state.template_id = data.get("template_id", "ecommerce_basic")
        state.design_id = data.get("design_id", "minimal")
        state.app_name = data.get("app_name", "My Shop")
        return state
