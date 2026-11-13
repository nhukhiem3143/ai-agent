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
from .agents.chat_agent import ChatAgent
from .llm import chat

ENABLE_TESTER = False # TẠM THỜI TẮT TESTER ĐỂ CHẠY NHANH VÀ TRÁNH LẶP VÔ HẠN
MAX_RETRY = 1

async def orchestrate(user_prompt: str, run_id: str | None = None) -> dict:
    run_id = run_id or uuid.uuid4().hex[:12]
    ws = Path(settings.outputs_dir) / run_id / "workspace"
    ws.mkdir(parents=True, exist_ok=True)

    state = PipelineState(user_prompt=user_prompt, workspace=ws)

    print(f"=== [Orchestrator] BẮT ĐẦU TẠO WEB CHO RUN_ID: {run_id} ===")
    
    analyst = AnalystAgent()
    print("=== [Orchestrator] Đang chạy Analyst... ===")
    state = await analyst.execute(state)
    
    architect = ArchitectAgent()
    print("=== [Orchestrator] Đang chạy Architect... ===")
    state = await architect.execute(state)
    
    developer = DeveloperAgent()
    print("=== [Orchestrator] Đang chạy Developer... ===")
    state = await developer.execute(state)

    if ENABLE_TESTER:
        tester = TesterAgent()
        for attempt in range(MAX_RETRY + 1):
            print(f"=== [Orchestrator] Đang chạy Tester (Lần {attempt+1})... ===")
            state.retry_count = attempt
            state = await tester.execute(state)
            if not state.issues:
                break
            if attempt < MAX_RETRY:
                state = await developer.execute(state)

    print("=== [Orchestrator] Đang nén file ZIP... ===")
    zip_path = Path(settings.outputs_dir) / run_id / f"{run_id}.zip"
    zip_workspace(ws, zip_path)

    print("=== [Orchestrator] HOÀN TẤT! ===")
    return {
        "run_id": run_id,
        "template_id": state.template_id,
        "design_id": state.design_id,
        "app_name": state.app_name,
        "file_count": sum(1 for _ in ws.rglob("*") if _.is_file()),
        "issues": state.issues,
        "zip_path": f"/outputs/{run_id}/{run_id}.zip",
    }

async def summarize_chat(history: list) -> str:
    hist_text = "\n".join([f"{m['role']}: {m['content']}" for m in history])
    prompt = (
        "Dựa vào đoạn hội thoại sau, hãy viết 1 câu lệnh (prompt) duy nhất bằng tiếng Việt để yêu cầu lập trình viên tạo web.\n"
        "Yêu cầu: Câu lệnh phải bao gồm Tên mặt hàng, phong cách màu sắc, và các chức năng. Nếu người dùng cắt ngang bắt tạo luôn mà thiếu thông tin, hãy tự động suy luận và điền thông tin hợp lý vào câu lệnh.\n"
        "Chỉ trả về đúng 1 câu lệnh, không giải thích gì thêm.\n\n"
        f"Hội thoại:\n{hist_text}"
    )
    return await chat("Bạn là AI tổng hợp yêu cầu.", prompt)