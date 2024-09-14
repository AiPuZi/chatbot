from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict
import dashscope
import os
from dotenv import load_dotenv

load_dotenv()  # 加载 .env 文件中的环境变量

app = FastAPI()

# 配置 CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 允许所有源，在生产环境中应该限制为您的前端域名
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 使用内存存储对话，在生产环境中应该使用数据库
conversations: Dict[int, List[Dict[str, str]]] = {}

class Message(BaseModel):
    role: str
    content: str

class Conversation(BaseModel):
    id: int
    messages: List[Message]

@app.post("/conversations")
async def create_conversation():
    conversation_id = len(conversations) + 1
    conversations[conversation_id] = []
    return {"id": conversation_id}

@app.delete("/conversations/{conversation_id}")
async def delete_conversation(conversation_id: int):
    if conversation_id not in conversations:
        raise HTTPException(status_code=404, detail="Conversation not found")
    del conversations[conversation_id]
    return {"status": "success"}

@app.post("/conversations/{conversation_id}/messages")
async def send_message(conversation_id: int, message: Message):
    if conversation_id not in conversations:
        raise HTTPException(status_code=404, detail="Conversation not found")
    
    conversations[conversation_id].append(message.dict())
    
    # 调用 DashScope API
    try:
        response = dashscope.Generation.call(
            "qwen-max",
            messages=conversations[conversation_id],
            result_format='message',
            stream=False
        )
        
        if response.status_code == 200:
            assistant_message = Message(role="assistant", content=response.output.choices[0]['message']['content'])
            conversations[conversation_id].append(assistant_message.dict())
            return assistant_message
        else:
            raise HTTPException(status_code=500, detail="Error calling DashScope API")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/conversations")
async def get_conversations():
    return [{"id": k, "messages": v} for k, v in conversations.items()]

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
