from openai import AsyncOpenAI
from .config import settings

client = AsyncOpenAI(
    api_key=settings.deepseek_api_key, 
    base_url="https://api.deepseek.com",
    timeout=30.0  # Tự động ngắt nếu AI không trả lời sau 30s
)

async def chat(system: str, user: str) -> str:
    print(f"[llm] Đang gọi DeepSeek API. Key: {settings.deepseek_api_key[:5]}***")
    try:
        res = await client.chat.completions.create(
            model="deepseek-chat",
            messages=[
                {"role": "system", "content": system},
                {"role": "user", "content": user}
            ],
            temperature=0.3,
            max_tokens=4000
        )
        return res.choices[0].message.content
    except Exception as e:
        print(f"[llm] LỖI GỌI API: {e}")
        raise e