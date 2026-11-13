from .base import BaseAgent
from ..llm import chat
import json
import re

# 1. Nâng cấp Prompt để AI trích xuất thông tin chính xác và hiểu các từ khóa như "full chức năng"
CHAT_PROMPT = """Bạn là một hệ thống trích xuất dữ liệu. Đọc lịch sử chat:
{history}

Nhiệm vụ: Trích xuất 3 thông tin sau:
1. item: Mặt hàng khách muốn bán (Ví dụ: Điện thoại, Quần áo, Trà sữa)
2. color: Phong cách màu sắc (Ví dụ: Tươi sáng, Tối giản, Sang trọng, Xanh lam)
3. features: Các chức năng (Ví dụ: Giỏ hàng, Thanh toán, Tìm kiếm, Thêm, Sửa, Xóa. Nếu khách nói "full chức năng", hãy điền "Đầy đủ chức năng Thêm, Sửa, Xóa, Xem")

Chỉ trả về ĐÚNG định dạng JSON sau, KHÔNG giải thích gì thêm:
{{
  "item": "...",
  "color": "...",
  "features": "..."
}}
Nếu thông tin nào khách CHƯA NÓI, hãy điền null.
"""

class ChatAgent(BaseAgent):
    name = "chat"
    
    async def run(self, history: list) -> str:
        print("=== [AI] NHẬN ĐƯỢC LỊCH SỬ TỪ BACKEND ===")
        hist_text = "\n".join([f"{'Khách' if m['role']=='user' else 'AI'}: {m['content']}" for m in history])
        
        response = await chat(CHAT_PROMPT.format(history=hist_text), "Chỉ trả về JSON.")
        
        try:
            json_match = re.search(r'\{.*\}', response, re.DOTALL)
            if json_match:
                data = json.loads(json_match.group(0))
                item = data.get('item')
                color = data.get('color')
                features = data.get('features')

                # Kiểm tra lệnh cưỡng chế (nếu khách bảo tạo luôn)
                build_commands = ["tạo luôn", "làm luôn", "bắt đầu đi", "đừng hỏi", "tạo đi", "ok tạo đi"]
                user_said_build = any(
                    any(cmd in m['content'].lower() for cmd in build_commands) 
                    for m in history if m['role'] == 'user'
                )

                # Nếu đã đủ thông tin HOẶC khách bắt tạo luôn -> Chốt
                if (item and color and features) or user_said_build:
                    item = item or "Sản phẩm"
                    color = color or "Tươi sáng, hiện đại"
                    features = features or "Đầy đủ chức năng Thêm, Sửa, Xóa"
                    return f"[READY]\n- Mặt hàng: {item}\n- Màu sắc: {color}\n- Chức năng: {features}\n[/READY]"
                
                # Nếu thiếu thông tin -> Hỏi tự nhiên và sâu hơn
                questions = []
                if not item:
                    questions.append("bạn muốn kinh doanh mặt hàng gì")
                if not color:
                    questions.append("bạn thích phong cách màu sắc nào (ví dụ: tối giản, sang trọng, xanh lam...)")
                if not features:
                    questions.append("bạn cần những chức năng gì (ví dụ: thêm, sửa, xóa, giỏ hàng, thanh toán...)")
                
                # Nối các câu hỏi lại cho mượt
                if len(questions) == 1:
                    reply = f"Mình đã ghi nhận. Để thiết kế web chuẩn nhất, {questions[0]} nhé?"
                elif len(questions) == 2:
                    reply = f"Mình đã ghi nhận. {questions[0].capitalize()}, và {questions[1]} nhé?"
                else:
                    reply = "Chào bạn! Để bắt đầu tạo web, cho mình hỏi: Bạn muốn bán mặt hàng gì, thích phong cách màu sắc ra sao, và cần những chức năng gì?"
                
                return reply
        except Exception as e:
            print("Lỗi parse JSON:", e)
            pass
        
        return "Bạn có thể nói rõ hơn về mặt hàng, màu sắc và chức năng bạn mong muốn không?"