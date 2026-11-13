import json
import traceback
from pathlib import Path
from .base import BaseAgent, PipelineState
from ..llm import chat
from ..tools import parse_patches

CODE_BLOCK = "```"

# ==========================================
# PROMPT 1: DÙNG KHI CÓ TEMPLATE (Chỉ sinh App.jsx và Data)
# ==========================================
AI_APP_JSX_PROMPT = (
    "Bạn là Developer. Viết code giao diện React (App.jsx) cho web bán hàng theo yêu cầu: \n"
    "{prompt}\n\n"
    "Hệ thống ĐÃ CÓ SẴN Backend API (cổng 5001) và Database MySQL. BẠN CHỈ CẦN VIẾT FILE App.jsx:\n"
    "// Form Login gửi POST tới: http://${window.location.hostname}:5001/api/login với body {username, password}.\n"
    "// Lưu token vào localStorage.\n"
    "// Nếu đã đăng nhập, hiện danh sách sản phẩm (GET http://${window.location.hostname}:5001/api/products).\n"
    "// Nếu role === 'admin', hiển thị Form Thêm/Sửa/Xóa. Gửi kèm header Authorization: Bearer <token>.\n"
    "Chỉ trả về code JSX, không markdown fence."
)

AI_SEED_SQL_PROMPT = (
    "Viết các câu lệnh SQL INSERT INTO bảng `products` (name, price, image, description).\n"
    "Tạo CHÍNH XÁC 8 sản phẩm mẫu phù hợp yêu cầu: {prompt}\n"
    "Dùng ảnh thật từ Unsplash. Chỉ trả về SQL, không markdown."
)

# ==========================================
# PROMPT 2: DÙNG KHI KHÔNG CÓ TEMPLATE (AI phải tự sinh toàn bộ)
# ==========================================
AI_FULL_GENERATE_PROMPT = (
    "Bạn là một Fullstack Developer xuất sắc. Hãy tạo mã nguồn hoàn chỉnh cho một trang web bán hàng dựa trên yêu cầu sau:\n"
    "{prompt}\n\n"
    "Hệ thống sẽ chạy bằng Docker Compose, bao gồm Backend (Node.js + Express), Frontend (React + Vite) và Database (MySQL).\n"
    "Hãy sinh ra CHÍNH XÁC CÁC FILE SAU THEO ĐỊNH DẠNG MARKDOWN (không giải thích thêm):\n\n"

    + CODE_BLOCK + "yaml path=docker-compose.yml\n"
    "version: '3.8'\n"
    "services:\n"
    "  db:\n"
    "    image: mysql:8.0\n"
    "    environment:\n"
    "      MYSQL_ROOT_PASSWORD: '123456'\n"
    "      MYSQL_DATABASE: 'app_db'\n"
    "    volumes:\n"
    "      - ./database/init.sql:/docker-entrypoint-initdb.d/1-init.sql\n"
    "      - ./database/seed.sql:/docker-entrypoint-initdb.d/2-seed.sql\n"
    "    ports: [\"3307:3306\"]\n"
    "    healthcheck:\n"
    "      test: [\"CMD\", \"mysqladmin\", \"ping\", \"-h\", \"localhost\", \"-p123456\"]\n"
    "      interval: 5s\n"
    "      retries: 10\n"
    "  backend:\n"
    "    build: ./backend\n"
    "    ports: [\"5001:5000\"]\n"
    "    environment:\n"
    "      DB_HOST: db\n"
    "      DB_USER: root\n"
    "      DB_PASSWORD: '123456'\n"
    "      DB_NAME: app_db\n"
    "    depends_on:\n"
    "      db:\n"
    "        condition: service_healthy\n"
    "  frontend:\n"
    "    build: ./frontend\n"
    "    ports: [\"8888:80\"]\n"
    + CODE_BLOCK + "\n\n"

    + CODE_BLOCK + "dockerfile path=backend/Dockerfile\n"
    "FROM node:20-alpine\nWORKDIR /app\nCOPY package*.json ./\nRUN npm install\nCOPY . .\nEXPOSE 5000\nCMD [\"node\", \"server.js\"]\n"
    + CODE_BLOCK + "\n\n"

    + CODE_BLOCK + "json path=backend/package.json\n"
    "{\n  \"name\": \"backend\",\n  \"dependencies\": {\n    \"express\": \"^4.19.2\",\n    \"cors\": \"^2.8.5\",\n    \"mysql2\": \"^3.9.7\"\n  }\n}\n"
    + CODE_BLOCK + "\n\n"

    + CODE_BLOCK + "javascript path=backend/server.js\n"
    "// Code Express API: Kết nối MySQL, tạo API /api/products (GET) và /api/products (POST, PUT, DELETE) để quản lý sản phẩm. Có sử dụng cors().\n"
    "// Đảm bảo lắng nghe ở process.env.PORT || 5000.\n"
    + CODE_BLOCK + "\n\n"

    + CODE_BLOCK + "dockerfile path=frontend/Dockerfile\n"
    "FROM node:20-alpine AS build\nWORKDIR /app\nCOPY package*.json ./\nRUN npm install\nCOPY . .\nRUN npm run build\nFROM nginx:alpine\nCOPY --from=build /app/dist /usr/share/nginx/html\n"
    + CODE_BLOCK + "\n\n"

    + CODE_BLOCK + "json path=frontend/package.json\n"
    "{\n  \"name\": \"frontend\",\n  \"scripts\": { \"build\": \"vite build\" },\n  \"dependencies\": { \"react\": \"^18.2.0\", \"react-dom\": \"^18.2.0\" },\n  \"devDependencies\": { \"vite\": \"^5.0.0\", \"@vitejs/plugin-react\": \"^4.2.0\" }\n}\n"
    + CODE_BLOCK + "\n\n"

    + CODE_BLOCK + "javascript path=frontend/vite.config.js\n"
    "import { defineConfig } from 'vite';\nimport react from '@vitejs/plugin-react';\nexport default defineConfig({ plugins: [react()] });\n"
    + CODE_BLOCK + "\n\n"

    + CODE_BLOCK + "html path=frontend/index.html\n"
    "<div id=\"root\"></div>\n<script type=\"module\" src=\"/src/main.jsx\"></script>\n"
    + CODE_BLOCK + "\n\n"

    + CODE_BLOCK + "jsx path=frontend/src/main.jsx\n"
    "import React from 'react';\nimport ReactDOM from 'react-dom/client';\nimport App from './App';\nReactDOM.createRoot(document.getElementById('root')).render(<App />);\n"
    + CODE_BLOCK + "\n\n"

    + CODE_BLOCK + "jsx path=frontend/src/App.jsx\n"
    "// Viết code giao diện React. Gọi API từ http://${window.location.hostname}:5001/api/products. Hiển thị danh sách sản phẩm. Có form thêm/sửa/xóa.\n"
    + CODE_BLOCK + "\n\n"

    + CODE_BLOCK + "sql path=database/init.sql\n"
    "CREATE DATABASE IF NOT EXISTS app_db;\nUSE app_db;\nCREATE TABLE IF NOT EXISTS products (id INT AUTO_INCREMENT PRIMARY KEY, name VARCHAR(255), price INT, image TEXT, description TEXT);\n"
    + CODE_BLOCK + "\n\n"

    + CODE_BLOCK + "sql path=database/seed.sql\n"
    "// Viết 8 câu lệnh INSERT INTO products để tạo data mẫu phù hợp yêu cầu.\n"
    + CODE_BLOCK + "\n\n"
)

class DeveloperAgent(BaseAgent):
    name = "developer"

    async def run(self, state: PipelineState) -> PipelineState:
        try:
            ws = state.workspace
            ws.mkdir(parents=True, exist_ok=True)

            # Xác định đường dẫn Template (Dựa trên cấu trúc thư mục Docker của bạn)
            tpl_dir = Path(__file__).parent.parent.parent / "template" / "ecommerce_basic"
            files_dir = tpl_dir / "files"
            has_template = tpl_dir.exists() and (tpl_dir / "manifest.json").exists()

            if has_template:
                print(f"[developer] TÌM THẤY TEMPLATE tại: {tpl_dir}")
                manifest = json.loads((tpl_dir / "manifest.json").read_text(encoding="utf-8"))
                
                # 1. COPY CÁC FILE TĨNH TỪ TEMPLATE
                for path in manifest.get("static_files", []):
                    src = files_dir / path
                    dst = ws / path
                    dst.parent.mkdir(parents=True, exist_ok=True)
                    if src.exists():
                        dst.write_text(src.read_text(encoding="utf-8"), encoding="utf-8")
                    else:
                        # NẾU TEMPLATE THIẾU FILE -> BÁO LỖI NGAY, KHÔNG TỰ BỊA
                        raise Exception(f"Lỗi Template: Thiếu file '{path}' trong thư mục files.")

                # 2. GỌI AI SINH GIAO DIỆN (App.jsx)
                print("[developer] Gọi AI sinh giao diện React (App.jsx)...")
                final_jsx_prompt = AI_APP_JSX_PROMPT.replace("{prompt}", state.user_prompt)
                app_jsx_code = await chat(final_jsx_prompt, "Sinh code React")
                
                # Làm sạch code nếu AI lỡ trả về markdown
                app_jsx_code = app_jsx_code.strip()
                if app_jsx_code.startswith(CODE_BLOCK):
                    lines = app_jsx_code.split("\n")
                    app_jsx_code = "\n".join(lines[1:-1]) if len(lines) > 2 else app_jsx_code

                (ws / "frontend/src/App.jsx").write_text(app_jsx_code, encoding="utf-8")

                # 3. GỌI AI SINH DATA MẪU (seed.sql)
                print("[developer] Gọi AI sinh data mẫu SQL (seed.sql)...")
                final_sql_prompt = AI_SEED_SQL_PROMPT.replace("{prompt}", state.user_prompt)
                seed_sql_code = await chat(final_sql_prompt, "Sinh SQL Data")
                
                seed_sql_code = seed_sql_code.strip()
                if seed_sql_code.startswith(CODE_BLOCK):
                    lines = seed_sql_code.split("\n")
                    seed_sql_code = "\n".join(lines[1:-1]) if len(lines) > 2 else seed_sql_code

                (ws / "database/seed.sql").write_text(seed_sql_code, encoding="utf-8")

            else:
                # TRƯỜNG HỢP KHÔNG CÓ TEMPLATE -> AI TỰ SINH TOÀN BỘ
                print("[developer] KHÔNG TÌM THẤY TEMPLATE. Gọi AI sinh TOÀN BỘ hệ thống...")
                
                final_prompt = AI_FULL_GENERATE_PROMPT.replace("{prompt}", state.user_prompt)
                resp = await chat(final_prompt, "Sinh toàn bộ code")
                patches = parse_patches(resp)
                
                # Ghi từng file AI sinh ra vào workspace
                for path, content in patches.items():
                    dst = ws / path
                    dst.parent.mkdir(parents=True, exist_ok=True)
                    dst.write_text(content, encoding="utf-8")
                    print(f"[developer] Đã ghi file AI sinh: {path}")

                # Kiểm tra xem AI có sinh thiếu file sống còn nào không
                required_files = ["docker-compose.yml", "backend/Dockerfile", "frontend/Dockerfile"]
                for req in required_files:
                    if not (ws / req).exists():
                        raise Exception(f"AI sinh thiếu file hạ tầng quan trọng: {req}")

            # ÁP DỤNG CSS DESIGN
            self._apply_design(state, ws)
            print("[developer] HOÀN TẤT SINH CODE!")
            return state
            
        except Exception as e:
            print("========================================")
            print(f"[developer] BỊ LỖI: {e}")
            traceback.print_exc()
            print("========================================")
            raise e

    def _apply_design(self, state: PipelineState, ws: Path):
        import yaml
        design_path = Path(__file__).parent.parent.parent / "skills" / "design" / f"{state.design_id}.yaml"
        if not design_path.exists():
            design_path = Path(__file__).parent.parent.parent / "skills" / "design" / "minimal.yaml"
        
        if not design_path.exists():
            return

        try:
            data = yaml.safe_load(design_path.read_text(encoding="utf-8"))
            if not data or not isinstance(data, dict):
                return

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