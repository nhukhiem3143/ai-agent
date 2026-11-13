import json
import shutil
import traceback
from pathlib import Path
from .base import BaseAgent, PipelineState
from ..llm import chat
from ..tools import copy_static, write_workspace, parse_patches

CODE_BLOCK = "```"

FILL_PROMPT = """Bạn là Developer. Điền các placeholder {{...}} trong file template sau.
Đề tài người dùng: "{user_prompt}"
Tên app: "{app_name}"
Nội dung file cần điền:
{content}
Quy tắc: Giữ nguyên cấu trúc, chỉ thay {{...}}. Trả về TOÀN BỘ nội dung file, không markdown fence."""

GENERATE_PROMPT = (
    "Bạn là Developer. Viết code cho web bán hàng theo yêu cầu: \n"
    "{prompt}\n\n"
    "BẮT BUỘC PHẢI SINH RA ĐẦY ĐỦ 10 FILE SAU THEO ĐÚNG ĐỊNH DẠNG MARKDOWN:\n\n"
    + CODE_BLOCK + "yaml path=docker-compose.yml\n"
    "version: '3.8'\n"
    "services:\n"
    "  backend:\n"
    "    build: ./backend\n"
    "    ports: [\"5001:5000\"]\n"
    "  frontend:\n"
    "    build: ./frontend\n"
    "    ports: [\"8888:80\"]\n"
    + CODE_BLOCK + "\n\n"
    + CODE_BLOCK + "dockerfile path=backend/Dockerfile\n"
    "FROM node:20-alpine\n"
    "WORKDIR /app\n"
    "COPY package*.json ./\n"
    "RUN npm install\n"
    "COPY . .\n"
    "EXPOSE 5000\n"
    "CMD [\"node\", \"server.js\"]\n"
    + CODE_BLOCK + "\n\n"
    + CODE_BLOCK + "json path=backend/package.json\n"
    "{\n"
    "  \"name\": \"backend\",\n"
    "  \"dependencies\": { \"express\": \"^4.19.2\", \"cors\": \"^2.8.5\" }\n"
    "}\n"
    + CODE_BLOCK + "\n\n"
    + CODE_BLOCK + "javascript path=backend/server.js\n"
    "// Viết code API Express ở đây. BẮT BUỘC phải có 'app.use(cors())' và API /api/products trả về mảng 5 sản phẩm (có id, name, price, image, description).\n"
    + CODE_BLOCK + "\n\n"
    + CODE_BLOCK + "dockerfile path=frontend/Dockerfile\n"
    "FROM node:20-alpine AS build\n"
    "WORKDIR /app\n"
    "COPY package*.json ./\n"
    "RUN npm install\n"
    "COPY . .\n"
    "RUN npm run build\n"
    "FROM nginx:alpine\n"
    "COPY --from=build /app/dist /usr/share/nginx/html\n"
    + CODE_BLOCK + "\n\n"
    + CODE_BLOCK + "json path=frontend/package.json\n"
    "{\n"
    "  \"name\": \"frontend\",\n"
    "  \"scripts\": { \"build\": \"vite build\" },\n"
    "  \"dependencies\": { \"react\": \"^18.2.0\", \"react-dom\": \"^18.2.0\" },\n"
    "  \"devDependencies\": { \"vite\": \"^5.0.0\", \"@vitejs/plugin-react\": \"^4.2.0\" }\n"
    "}\n"
    + CODE_BLOCK + "\n\n"
    + CODE_BLOCK + "javascript path=frontend/vite.config.js\n"
    "import { defineConfig } from 'vite';\n"
    "import react from '@vitejs/plugin-react';\n"
    "export default defineConfig({ plugins: [react()] });\n"
    + CODE_BLOCK + "\n\n"
    + CODE_BLOCK + "html path=frontend/index.html\n"
    "<div id=\"root\"></div>\n"
    "<script type=\"module\" src=\"/src/main.jsx\"></script>\n"
    + CODE_BLOCK + "\n\n"
    + CODE_BLOCK + "jsx path=frontend/src/main.jsx\n"
    "import React from 'react';\n"
    "import ReactDOM from 'react-dom/client';\n"
    "import App from './App';\n"
    "ReactDOM.createRoot(document.getElementById('root')).render(<App />);\n"
    + CODE_BLOCK + "\n\n"
    + CODE_BLOCK + "jsx path=frontend/src/App.jsx\n"
    "// Viết giao diện React ở đây. Gọi API lấy sản phẩm và hiển thị dạng lưới.\n"
    + CODE_BLOCK + "\n\n"
    "LƯU Ý SỐNG CÒN (BẮT BUỘC TUÂN THỦ):\n"
    "1. Trong file App.jsx, TUYỆT ĐỐI KHÔNG ĐƯỢC viết 'http://localhost:5001'. Hãy dùng biến động: fetch(`http://${window.location.hostname}:5001/api/products`).\n"
    "2. Bắt buộc phải bọc fetch trong useEffect của React.\n"
)

class DeveloperAgent(BaseAgent):
    name = "developer"

    async def run(self, state: PipelineState) -> PipelineState:
        try:
            ws = state.workspace
            ws.mkdir(parents=True, exist_ok=True)

            tpl_dir_str = state.__dict__.get("_template_dir", "")
            tpl_dir = Path(tpl_dir_str) if tpl_dir_str else None
            has_template = False
            
            # 1. KIỂM TRA TEMPLATE
            if tpl_dir and (tpl_dir / "manifest.json").exists():
                print(f"[developer] Đang đọc manifest: {tpl_dir}/manifest.json")
                manifest = json.loads((tpl_dir / "manifest.json").read_text(encoding="utf-8"))
                files_dir = tpl_dir / "files"
                
                if files_dir.exists() and any(files_dir.iterdir()):
                    has_template = True
                    print("[developer] Tìm thấy template, bắt đầu copy...")
                    
                    for path in manifest.get("static_files", []):
                        copy_static(files_dir, ws, path)
                        print(f"[developer] Copied: {path}")

                    for path in manifest.get("placeholder_files", []):
                        src = files_dir / path
                        if not src.exists():
                            continue
                        content = src.read_text(encoding="utf-8")

                        if "{{" not in content:
                            dst = ws / path
                            dst.parent.mkdir(parents=True, exist_ok=True)
                            dst.write_text(content, encoding="utf-8")
                            continue

                        filled = await chat(
                            FILL_PROMPT.format(user_prompt=state.user_prompt, app_name=state.app_name, content=content),
                            "Điền file theo đúng quy tắc.",
                        )
                        filled = filled.strip()
                        if filled.startswith(CODE_BLOCK):
                            lines = filled.split("\n")
                            filled = "\n".join(lines[1:-1]) if len(lines) > 2 else filled

                        dst = ws / path
                        dst.parent.mkdir(parents=True, exist_ok=True)
                        dst.write_text(filled, encoding="utf-8")

                    self._apply_design(state, ws)

            # 2. FALLBACK: NẾU KHÔNG CÓ TEMPLATE -> GỌI AI SINH CODE
            if not has_template:
                print("[developer] Không có template, gọi AI sinh code trực tiếp...")
                # SỬA LỖI Ở ĐÂY: Dùng .replace thay vì .format để không bị lỗi KeyError với dấu ngoặc nhọn JSON
                final_prompt = GENERATE_PROMPT.replace("{prompt}", state.user_prompt)
                resp = await chat(final_prompt, "Sinh code")
                patches = parse_patches(resp)
                write_workspace(ws, patches)
                print("[developer] Đã ghi xong các file từ AI.")

            return state
            
        except Exception as e:
            print("========================================")
            print(f"[developer] BỊ LỖI CHÍ MẠNG: {e}")
            traceback.print_exc()
            print("========================================")
            raise e

    def _apply_design(self, state: PipelineState, ws: Path):
        import yaml
        design_path = Path(__file__).parent.parent / "skills" / "design" / f"{state.design_id}.yaml"
        if not design_path.exists():
            design_path = Path(__file__).parent.parent / "skills" / "design" / "minimal.yaml"
        
        if not design_path.exists():
            return

        try:
            data = yaml.safe_load(design_path.read_text(encoding="utf-8"))
            if not data or not isinstance(data, dict):
                return # Bỏ qua nếu file yaml rỗng hoặc sai định dạng

            css_lines = [":root {"]
            for k, v in data.get("tokens", {}).items():
                css_lines.append(f"  --{k}: {v};")
            css_lines.append("}")
            css_lines.append("\n@tailwind base;\n@tailwind components;\n@tailwind utilities;\n")
            css_lines.append(data.get("css_extra", ""))

            css_file = ws / "frontend" / "src" / "index.css"
            if css_file.parent.exists():
                css_file.write_text("\n".join(css_lines), encoding="utf-8")
        except Exception as e:
            print(f"[developer] Lỗi khi đọc design skill: {e}")