import os
from pathlib import Path

from dotenv import load_dotenv
from langchain_community.document_loaders import TextLoader, PyPDFLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_mistralai import MistralAIEmbeddings
from langchain_chroma import Chroma
from langchain_core.documents import Document
from catalog_documents import catalog_documents
from index_paths import new_index, publish_index

BASE_DIR = Path(__file__).resolve().parent
DATA_DIR = BASE_DIR / "data"
CHROMA_DIR = BASE_DIR / "chroma_db"

load_dotenv(BASE_DIR.parent / ".env")
load_dotenv(BASE_DIR / ".env", override=True)


def load_all_documents():
    documents = [Document(**entry) for entry in catalog_documents()]
    print(f"Loaded shared catalog: {len(documents)} model documents")

    if not DATA_DIR.exists():
        return documents

    supported_files = list(DATA_DIR.glob("*.txt"))
    supported_files += list(DATA_DIR.glob("*.md"))
    supported_files += list(DATA_DIR.glob("*.pdf"))


    for file_path in supported_files:
        try:
            if file_path.stat().st_size == 0:
                print(f"Empty file skip: {file_path.name}")
                continue

            if file_path.suffix.lower() in [".txt", ".md"]:
                loader = TextLoader(
                    str(file_path),
                    encoding="utf-8"
                )
            elif file_path.suffix.lower() == ".pdf":
                loader = PyPDFLoader(str(file_path))
            else:
                continue

            file_documents = loader.load()

            brand_name = file_path.stem.lower()

            for document in file_documents:
                document.metadata["source"] = file_path.name
                document.metadata["brand"] = brand_name

            documents.extend(file_documents)

            print(
                f"Loaded: {file_path.name} "
                f"({len(file_documents)} document)"
            )

        except Exception as error:
            print(f"File load error {file_path.name}: {error}")

    return documents


def create_vector_database():
    api_key = os.getenv("MISTRAL_API_KEY")

    if not api_key:
        raise ValueError(
            "MISTRAL_API_KEY .env file mein nahi mili."
        )

    print("\nEV files load ho rahi hain...")

    documents = load_all_documents()

    if not documents:
        raise ValueError(
            "Koi valid document load nahi hua. Data files check karo."
        )

    splitter = RecursiveCharacterTextSplitter(
        chunk_size=900,
        chunk_overlap=120,
        separators=["\n\n", "\n", ". ", " ", ""]
    )

    chunks = splitter.split_documents(documents)

    print(f"\nTotal documents loaded: {len(documents)}")
    print(f"Total chunks created: {len(chunks)}")

    candidate = new_index(CHROMA_DIR)
    print("Building a new index; the previous working index is preserved.")

    print("Mistral embeddings generate ho rahi hain...")

    embeddings = MistralAIEmbeddings(
        model="mistral-embed",
        api_key=api_key
    )

    vector_store = Chroma.from_documents(
        documents=chunks,
        embedding=embeddings,
        persist_directory=str(candidate),
        collection_name="ev_vehicles"
    )

    if len(vector_store.get()["ids"]) != len(chunks):
        raise RuntimeError("Incomplete index; the previous active index was preserved.")
    publish_index(CHROMA_DIR, candidate)

    print("\nChroma vector database successfully create ho gaya. Restart the RAG service to use it.")
    print(f"Database location: {CHROMA_DIR}")

    brand_files = sorted(
        set(chunk.metadata.get("brand", "unknown") for chunk in chunks)
    )

    print(f"Brands added: {', '.join(brand_files)}")

    return vector_store


if __name__ == "__main__":
    create_vector_database()
