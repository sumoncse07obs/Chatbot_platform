from pathlib import Path

from docx import Document
from fastapi import HTTPException
from pypdf import PdfReader

from app.models.resource_model import Resource


RESOURCE_UPLOAD_DIR = Path("storage/resources")


def extract_pdf_text(path: Path) -> str:
    reader = PdfReader(str(path))
    pages = [page.extract_text() or "" for page in reader.pages]
    return "\n".join(pages).strip()


def extract_docx_text(path: Path) -> str:
    document = Document(str(path))
    return "\n".join(paragraph.text for paragraph in document.paragraphs).strip()


def extract_text_file(path: Path) -> str:
    return path.read_text(encoding="utf-8", errors="ignore").strip()


def extract_resource_text(resource: Resource) -> str:
    if resource.content:
        return resource.content.strip()

    if not resource.filename:
        raise HTTPException(status_code=400, detail="Resource has no content or file")

    path = RESOURCE_UPLOAD_DIR / resource.filename

    if not path.exists():
        raise HTTPException(status_code=404, detail="Resource file not found")

    suffix = path.suffix.lower()

    if suffix in {".txt", ".md"}:
        return extract_text_file(path)

    if suffix == ".pdf":
        return extract_pdf_text(path)

    if suffix == ".docx":
        return extract_docx_text(path)

    raise HTTPException(
        status_code=400,
        detail="Only text, markdown, PDF, and DOCX resources can be indexed",
    )