import os
import shutil
from pathlib import Path

from dotenv import load_dotenv
from langchain_community.document_loaders import TextLoader, PyPDFLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_mistralai import MistralAIEmbeddings
from langchain_chroma import Chroma

BASE_DIR = Path(__file__).resolve().parent
DATA_DIR = BASE_DIR / "data"
CHROMA_DIR = BASE_DIR / "chroma_db"

load_dotenv(BASE_DIR.parent / ".env")
load_dotenv(BASE_DIR / ".env", override=True)


def load_all_documents():
    documents = []

    if not DATA_DIR.exists():
        raise FileNotFoundError(f"Data folder nahi mila: {DATA_DIR}")

    supported_files = list(DATA_DIR.glob("*.txt"))
    supported_files += list(DATA_DIR.glob("*.md"))
    supported_files += list(DATA_DIR.glob("*.pdf"))

    if not supported_files:
        raise FileNotFoundError(
            f"Data folder mein koi .txt, .md ya .pdf file nahi mili: {DATA_DIR}"
        )

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

    if CHROMA_DIR.exists():
        print("Purana Chroma database remove ho raha hai...")
        shutil.rmtree(CHROMA_DIR)

    print("Mistral embeddings generate ho rahi hain...")

    embeddings = MistralAIEmbeddings(
        model="mistral-embed",
        api_key=api_key
    )

    vector_store = Chroma.from_documents(
        documents=chunks,
        embedding=embeddings,
        persist_directory=str(CHROMA_DIR),
        collection_name="ev_vehicles"
    )

    print("\nChroma vector database successfully create ho gaya.")
    print(f"Database location: {CHROMA_DIR}")

    brand_files = sorted(
        set(chunk.metadata.get("brand", "unknown") for chunk in chunks)
    )

    print(f"Brands added: {', '.join(brand_files)}")

    return vector_store


if __name__ == "__main__":
    create_vector_database()
