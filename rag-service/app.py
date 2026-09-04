from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from rag_chain import ask_ev_question, get_assistant_status


app = FastAPI(
    title="TataEV RAG Chatbot API",
    version="1.0.0"
)


# React frontend ko API call karne ki permission
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000"
    ],
    allow_credentials=False,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Content-Type"]
)


class HistoryMessage(BaseModel):
    role: str = Field(pattern="^(user|assistant)$")
    content: str = Field(min_length=1, max_length=1200)


class ChatRequest(BaseModel):
    message: str = Field(
        min_length=1,
        max_length=500
    )
    history: list[HistoryMessage] = Field(
        default_factory=list,
        max_length=10
    )


class ChatResponse(BaseModel):
    answer: str
    mode: str
    sources: list[str] = Field(default_factory=list)


@app.get("/health")
def health_check():
    assistant = get_assistant_status()
    return {
        "status": "ok" if assistant["ready"] else "setup-required",
        "service": "TataEV Hybrid AI Assistant",
        **assistant,
    }


@app.post("/chat", response_model=ChatResponse)
def chat(request: ChatRequest):
    question = request.message.strip()

    try:
        result = ask_ev_question(
            question,
            [item.model_dump() for item in request.history]
        )

        return ChatResponse(
            answer=result["answer"],
            mode=result["mode"],
            sources=result["sources"]
        )

    except Exception as error:
        print(f"Chat API error: {error}")

        error_text = str(error).lower()
        if "429" in error_text or "rate limit" in error_text:
            detail = "Mistral API rate limit reached. Thodi der baad retry karein."
        elif "401" in error_text or "unauthorized" in error_text:
            detail = "Mistral API key invalid hai. rag-service/.env check karein."
        elif "mistral_api_key" in error_text:
            detail = "MISTRAL_API_KEY rag-service/.env mein add karein."
        else:
            detail = "AI answer generate nahi kar paaya. RAG terminal ka error check karein."

        raise HTTPException(
            status_code=503,
            detail=detail
        )
