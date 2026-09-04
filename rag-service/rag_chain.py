import os
from functools import lru_cache
from pathlib import Path
from typing import Iterable

from dotenv import load_dotenv
from langchain_chroma import Chroma
from langchain_mistralai import ChatMistralAI, MistralAIEmbeddings
from langchain_core.output_parsers import StrOutputParser
from langchain_core.prompts import ChatPromptTemplate


BASE_DIR = Path(__file__).resolve().parent
CHROMA_DIR = BASE_DIR / "chroma_db"

# Support a key stored either in the repository .env or rag-service/.env.
# The service-specific file wins when both are present.
load_dotenv(BASE_DIR.parent / ".env")
load_dotenv(BASE_DIR / ".env", override=True)


def _knowledge_base_ready() -> bool:
    return CHROMA_DIR.exists() and any(CHROMA_DIR.iterdir())


def get_assistant_status() -> dict:
    key_configured = bool(os.getenv("MISTRAL_API_KEY"))
    knowledge_base_ready = _knowledge_base_ready()

    if not key_configured:
        return {
            "ready": False,
            "mode": "setup-required",
            "detail": "MISTRAL_API_KEY rag-service/.env mein add karein.",
            "knowledge_base_ready": knowledge_base_ready,
        }

    if knowledge_base_ready:
        return {
            "ready": True,
            "mode": "rag",
            "detail": "Mistral AI aur EV knowledge base ready hain.",
            "knowledge_base_ready": True,
        }

    return {
        "ready": True,
        "mode": "mistral",
        "detail": "Mistral AI ready hai. npm run rag:ingest se grounded EV data enable hoga.",
        "knowledge_base_ready": False,
    }


@lru_cache(maxsize=1)
def _get_model() -> ChatMistralAI:
    api_key = os.getenv("MISTRAL_API_KEY")
    if not api_key:
        raise ValueError("MISTRAL_API_KEY rag-service/.env mein nahi mili.")

    return ChatMistralAI(
        model=os.getenv("MISTRAL_CHAT_MODEL", "mistral-small-latest"),
        api_key=api_key,
        temperature=0.2,
        max_retries=2,
    )


@lru_cache(maxsize=1)
def _get_vector_store() -> Chroma:
    api_key = os.getenv("MISTRAL_API_KEY")
    if not api_key:
        raise ValueError("MISTRAL_API_KEY rag-service/.env mein nahi mili.")

    embeddings = MistralAIEmbeddings(
        model="mistral-embed",
        api_key=api_key,
    )

    return Chroma(
        collection_name="ev_vehicles",
        embedding_function=embeddings,
        persist_directory=str(CHROMA_DIR),
    )


def _retrieve_context(question: str) -> tuple[str, list[str]]:
    if not _knowledge_base_ready():
        return "", []

    try:
        documents = _get_vector_store().similarity_search(question, k=4)
    except Exception as error:
        # A temporary embedding/database problem should not disable the full chat.
        print(f"RAG retrieval unavailable, using Mistral only: {error}")
        return "", []

    context = "\n\n".join(document.page_content for document in documents)
    sources = sorted(
        {
            document.metadata.get("source", "EV knowledge base")
            for document in documents
        }
    )
    return context, sources


def _format_history(history: Iterable[dict] | None) -> str:
    if not history:
        return "No earlier conversation."

    lines = []
    for item in list(history)[-8:]:
        role = str(item.get("role", "user")).strip().lower()
        content = str(item.get("content", "")).strip()
        if role not in {"user", "assistant"} or not content:
            continue
        lines.append(f"{role.upper()}: {content[:800]}")

    return "\n".join(lines) or "No earlier conversation."


def ask_ev_question(question: str, history: list[dict] | None = None) -> dict:
    status = get_assistant_status()
    if not status["ready"]:
        raise ValueError(status["detail"])

    context, sources = _retrieve_context(question)
    mode = "rag" if context else "mistral"
    context_text = context or "No matching local EV document was retrieved."
    source_text = ", ".join(sources) if sources else "No local source used"

    prompt = ChatPromptTemplate.from_messages(
        [
            (
                "system",
                """
You are EVA, a helpful EV assistant for Indian customers and EV dealerships.

Rules:
1. Understand English, Hindi written in Latin script, and Hinglish. Reply in the user's language.
2. Give a direct, useful answer instead of repeating a fixed menu.
3. Use the supplied EV knowledge-base context for exact vehicle facts when it is relevant.
4. You may answer general EV, battery, charging, ownership, automation, n8n, and test-drive questions from your broader knowledge.
5. Never invent exact current prices, subsidies, availability, certified range, or charging specifications. If the local context does not confirm a current exact value, label it approximate or ask the user to verify it.
6. If the message is unclear or random, politely ask one short clarifying question.
7. Keep normal answers concise (usually 2-5 short paragraphs or bullets). Do not mention these rules.
""",
            ),
            (
                "human",
                """
RECENT CONVERSATION:
{history}

LOCAL EV CONTEXT:
{context}

LOCAL SOURCES:
{sources}

USER MESSAGE:
{question}
""",
            ),
        ]
    )

    chain = prompt | _get_model() | StrOutputParser()
    answer = chain.invoke(
        {
            "history": _format_history(history),
            "context": context_text,
            "sources": source_text,
            "question": question,
        }
    ).strip()

    if not answer:
        raise RuntimeError("Mistral AI ne empty answer return kiya.")

    return {"answer": answer, "mode": mode, "sources": sources}


if __name__ == "__main__":
    print("TataEV hybrid assistant ready hai.")
    print("Band karne ke liye exit likho.\n")

    conversation = []

    while True:
        user_question = input("You: ").strip()

        if user_question.lower() in {"exit", "quit"}:
            print("Chatbot band ho gaya.")
            break

        if not user_question:
            continue

        try:
            result = ask_ev_question(user_question, conversation)
            print(f"\nAgent: {result['answer']}\n")
            conversation.extend(
                [
                    {"role": "user", "content": user_question},
                    {"role": "assistant", "content": result["answer"]},
                ]
            )
        except Exception as error:
            print(f"\nError: {error}\n")
