# TÀI LIỆU KIẾN TRÚC DỰ ÁN AI-AGENT (E-COMMERCE GENERATOR)

Hệ thống Multi-Agent AI tự động sinh mã nguồn website bán hàng Full-stack (React + Node.js + MySQL) từ một câu lệnh (prompt) tiếng Việt.

## 1. CẤU TRÚC THƯ MỤC VÀ CÔNG DỤNG CHI TIẾT

```text
ai-agent/
├── .env.example                # Chứa các biến môi trường mẫu (DEEPSEEK_API_KEY, DB_PASS...)
├── .gitignore                  # Bỏ qua các file rác khi push lên Git (node_modules, outputs...)
├── README.md                   # Hướng dẫn cài đặt và khởi chạy
├── docker-compose.yml          # File điều phối toàn bộ hệ thống (MySQL, AI, Backend, Frontend)
│
├── fe/                         # FRONTEND (GIAO DIỆN STUDIO DÀNH CHO ADMIN)
│   ├── Dockerfile              # Cấu hình build React bằng Nginx
│   ├── index.html              # Template HTML gốc
│   ├── nginx.conf              # Cấu hình route SPA cho Nginx
│   ├── package.json            # Khai báo thư viện React, Vite, Axios
│   ├── vite.config.js          # Cấu hình build của Vite
│   └── src/
│       ├── main.jsx            # Entry point của React
│       ├── App.jsx             # Component chính (Chứa Layout, Router)
│       ├── api/
│       │   └── client.js       # Cấu hình Axios để gọi API tới Backend (cổng 5000)
│       ├── pages/
│       │   ├── GeneratePage.jsx# Trang nhập prompt và xem Preview (iframe)
│       │   ├── RunsPage.jsx    # Trang xem lịch sử các lần Generate
│       │   └── RunDetailPage.jsx# Xem chi tiết file AI đã sinh ra
│       └── components/
│           ├── FileTree.jsx    # Component hiển thị cây thư mục code vừa tạo
│           ├── Header.jsx      # Thanh điều hướng
│           ├── ProgressBar.jsx # Thanh tiến trình khi AI đang sinh code
│           └── PromptForm.jsx  # Form nhập câu lệnh (Input + Button)
│
└── be/                         # BACKEND TỔNG (GỒM NODE.JS VÀ PYTHON AI)
    ├── ai/                     # 1. AI SERVICE (Xử lý ngôn ngữ tự nhiên và sinh code)
    │   ├── Dockerfile          # Cấu hình Python 3.10
    │   ├── requirements.txt    # Thư viện Python (Fastapi, OpenAI, PyYAML...)
    │   ├── app/
    │   │   ├── main.py         # Entry point FastAPI (cung cấp API /generate)
    │   │   ├── config.py       # Load biến môi trường
    │   │   ├── llm.py          # Wrapper gọi API DeepSeek (cấu hình timeout, xử lý lỗi)
    │   │   ├── tools.py        # Hàm tiện ích: Regex bóc tách code Markdown, ghi file, nén ZIP
    │   │   ├── orchestrator.py # BỘ ĐIỀU PHỐI: Quản lý vòng đời các Agent
    │   │   ├── agents/         # CÁC TÁC NHÂN AI (MULTI-AGENT)
    │   │   │   ├── base.py     # Khuôn mẫu BaseAgent và State (dữ liệu truyền giữa các Agent)
    │   │   │   ├── analyst.py  # Phân tích yêu cầu, chọn Template & Design phù hợp
    │   │   │   ├── architect.py# Thiết kế cấu trúc thư mục
    │   │   │   ├── developer.py# Viết code chi tiết (Prompt DeepSeek) cho từng file
    │   │   │   └── tester.py   # Kiểm tra chất lượng code sinh ra
    │   │   ├── skills/         # BỘ KỸ NĂNG CỦA AI
    │   │   │   ├── registry.py # Hàm load các kỹ năng
    │   │   │   ├── components/ # Các UI Component mẫu (Header, ProductCard...)
    │   │   │   └── design/     # Các phong cách thiết kế (màu sắc, font chữ)
    │   │   │       ├── coffee_warm.yaml # Phong cách quán cafe (nâu, kem)
    │   │   │       ├── minimal.yaml     # Phong cách tối giản
    │   │   │       ├── tech_neon.yaml   # Phong cách công nghệ
    │   │   │       └── vibrant.yaml     # Phong cách trẻ trung, gradient
    │   │   └── template/       # MẪU DỰ ÁN (Dùng cho chế độ chèn template)
    │   │       └── ecommerce_basic/ # Template web bán hàng cơ bản
    │   │           ├── files/  # Chứa code mẫu tĩnh (Dockerfile, package.json...)
    │   │           ├── mandatory.yaml # Các yêu cầu bắt buộc của template
    │   │           ├── manifest.json  # Khai báo danh sách file
    │   │           └── skill_bindings.yaml
    │   └── template/           # (Lưu ý: Thư mục này đang bị trùng lặp với be/ai/template, có thể xóa)
    │
    └── data-service/           # 2. API GATEWAY & DATA SERVICE (Node.js)
        ├── Dockerfile          # Cấu hình Node.js 20 + Docker CLI
        ├── package.json        # Khai báo thư viện Express, MySQL2, Axios, Cors
        ├── server.js           # Entry point, khởi tạo Express (cổng 5000)
        ├── app.js              # Cấu hình Middlewares (CORS, JSON parse, Routes)
        ├── db.js               # Kết nối tới MySQL (mysql2/promise)
        ├── database/           # Script khởi tạo DB
        │   ├── init.sql        # Tạo bảng (users, runs)
        │   └── seed.sql        # Chèn dữ liệu mẫu
        ├── middlewares/        # Lớp bảo vệ
        │   ├── auth.js         # Xác thực JWT
        │   ├── errorHandler.js # Bắt lỗi toàn cục
        │   └── role.js         # Phân quyền (Admin/User)
        ├── models/             # Tầng tương tác Database
        │   ├── runModel.js     # Lưu lịch sử generate
        │   └── userModel.js    # Quản lý người dùng
        ├── routes/             # Các API Endpoints
        │   ├── auth.js         # API Đăng nhập/Đăng ký
        │   ├── generate.js     # API nhận prompt -> ném sang AI service -> nhận run_id
        │   ├── runs.js         # API lấy lịch sử generate
        │   └── templates.js    # API trả về danh sách templates/skills
        └── utils/
            └── response.js     # Chuẩn hóa format trả về (success, data, message)