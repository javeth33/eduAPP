import os
import uuid
import json
import fitz  # PyMuPDF
from io import BytesIO
from PIL import Image
from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv
import google.generativeai as genai
from supabase import create_client

# ─── Configuración ────────────────────────────────────────
load_dotenv()
genai.configure(api_key=os.getenv("GEMINI_API_KEY"))
model = genai.GenerativeModel("gemini-2.5-flash")
supabase = create_client(os.getenv("SUPABASE_URL"), os.getenv("SUPABASE_KEY"))

app = FastAPI(title="EduAdapt API")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Prompts por perfil ────────────────────────────────────
PROMPTS = {
    "tdah": """
Eres un diseñador pedagógico especializado en Universal Design for Learning (UDL)
y teoría de carga cognitiva de Sweller. Adapta el texto para estudiantes con TDAH.

REGLAS:
- Divide en bloques de MÁXIMO 40 palabras
- Una sola idea por bloque
- Emoji relevante al inicio de cada bloque
- Identifica 3 conceptos difíciles con analogía mexicana (fútbol/tacos/TikTok)
- Resalta verbos de acción
- 2 preguntas de verificación al final
- Genera diagrama Mermaid simple del tema

TEXTO: {texto}

Responde SOLO en este JSON sin texto adicional:
{{
  "resumen": "3 oraciones máximo",
  "bloques": ["🎯 bloque1", "⚡ bloque2"],
  "glosario": [
    {{"termino": "palabra", "definicion": "analogía mexicana simple"}}
  ],
  "mapa_mermaid": "graph TD\\n A[Concepto] --> B[Sub-concepto]",
  "quiz": [
    {{"pregunta": "pregunta", "opciones": ["A", "B", "C"], "respuesta": 0}}
  ],
  "resumen_oral": "versión corta para audio, máx 3 oraciones",
  "nivel_complejidad": 7
}}
""",

    "dislexia": """
Eres un diseñador pedagógico especializado en dislexia y UDL.

REGLAS:
- Bloques de MÁXIMO 30 palabras
- Separa sílabas en palabras de más de 6 letras: (fo-to-sín-te-sis)
- Oraciones simples: Sujeto + Verbo + Objeto
- Sustituye palabras rebuscadas por palabras comunes
- 3 conceptos clave con analogía mexicana muy simple
- 2 preguntas simples de verificación
- Diagrama Mermaid muy simple (máx 4 nodos)

TEXTO: {texto}

Responde SOLO en este JSON sin texto adicional:
{{
  "resumen": "2 oraciones simples",
  "bloques": ["bloque1", "bloque2"],
  "glosario": [
    {{"termino": "palabra", "definicion": "explicación simple"}}
  ],
  "mapa_mermaid": "graph TD\\n A[Idea] --> B[Resultado]",
  "quiz": [
    {{"pregunta": "pregunta simple", "opciones": ["A", "B", "C"], "respuesta": 0}}
  ],
  "resumen_oral": "versión muy simple para escuchar",
  "nivel_complejidad": 5
}}
""",

    "auditivo": """
Eres un diseñador pedagógico especializado en aprendizaje auditivo y UDL.

REGLAS:
- Convierte el texto en una narrativa hablada natural
- Usa frases conversacionales como "imagina que..." o "piénsalo así..."
- Analogías sonoras y rítmicas
- Estructura como si fuera un podcast o cuento
- 3 conceptos clave explicados con metáforas auditivas
- 2 preguntas reflexivas al final

TEXTO: {texto}

Responde SOLO en este JSON sin texto adicional:
{{
  "resumen": "intro estilo podcast, 2 oraciones",
  "bloques": ["bloque narrativo 1", "bloque narrativo 2"],
  "glosario": [
    {{"termino": "palabra", "definicion": "metáfora auditiva o narrativa"}}
  ],
  "mapa_mermaid": "graph TD\\n A[Concepto] --> B[Ejemplo]",
  "quiz": [
    {{"pregunta": "pregunta reflexiva", "opciones": ["A", "B", "C"], "respuesta": 0}}
  ],
  "resumen_oral": "guión completo para narrar en voz alta",
  "nivel_complejidad": 6
}}
"""
}

# ─── Modelos de datos ──────────────────────────────────────
class TextInput(BaseModel):
    texto: str
    perfil: str
    session_id: str | None = None

class ShareRequest(BaseModel):
    content_json: dict
    perfil: str
    texto_original: str
    session_id: str | None = None

# ─── Función central de adaptación ────────────────────────
async def adaptar_texto(texto: str, perfil: str) -> dict:
    if perfil not in PROMPTS:
        raise HTTPException(status_code=400, detail="Perfil no válido. Usa: tdah, dislexia, auditivo")

    prompt = PROMPTS[perfil].format(texto=texto)

    try:
        response = model.generate_content(prompt)
        raw = response.text.strip()

        # Limpia markdown si Gemini lo agrega
        if "```" in raw:
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]

        return json.loads(raw.strip())

    except json.JSONDecodeError:
        raise HTTPException(status_code=500, detail="Error procesando respuesta de Gemini")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ─── Guardar en Supabase ───────────────────────────────────
def guardar_adaptacion(share_id, session_id, perfil, texto_original,
                       content_json, file_url=None, file_type=None):
    supabase.table("adaptations").insert({
        "share_id": share_id,
        "session_id": str(session_id) if session_id else None,
        "perfil": perfil,
        "texto_original": texto_original,
        "content_json": content_json,
        "file_url": file_url,
        "file_type": file_type,
    }).execute()

# ─── Endpoints ────────────────────────────────────────────

@app.get("/")
def root():
    return {"status": "EduAdapt API corriendo ✅", "perfiles": ["tdah", "dislexia", "auditivo"]}

@app.get("/health")
def health():
    return {"status": "ok"}


# 1. Adaptar texto directo
@app.post("/adapt/text")
async def adapt_text(input: TextInput):
    resultado = await adaptar_texto(input.texto, input.perfil)
    share_id = str(uuid.uuid4())[:8]

    guardar_adaptacion(
        share_id=share_id,
        session_id=input.session_id,
        perfil=input.perfil,
        texto_original=input.texto,
        content_json=resultado,
        file_type="text"
    )

    return {"share_id": share_id, "resultado": resultado}


# 2. Adaptar desde imagen o PDF
@app.post("/adapt/file")
async def adapt_file(
    file: UploadFile = File(...),
    perfil: str = Form(...),
    session_id: str = Form(None)
):
    contents = await file.read()
    filename = f"{uuid.uuid4()}_{file.filename}"
    file_type = file.content_type

    # ── Sube a Supabase Storage ──
    supabase.storage.from_("uploads").upload(
        path=filename,
        file=contents,
        file_options={"content-type": file_type}
    )
    file_url = supabase.storage.from_("uploads").get_public_url(filename)

    # ── Extrae texto ──
    if file_type == "application/pdf":
        pdf = fitz.open(stream=contents, filetype="pdf")
        texto_extraido = "".join(page.get_text() for page in pdf)
    else:
        image = Image.open(BytesIO(contents))
        response = model.generate_content([
            "Extrae TODO el texto de esta imagen exactamente como está. Solo el texto, sin comentarios.",
            image
        ])
        texto_extraido = response.text.strip()

    # ── Adapta ──
    resultado = await adaptar_texto(texto_extraido, perfil)
    share_id = str(uuid.uuid4())[:8]

    guardar_adaptacion(
        share_id=share_id,
        session_id=session_id,
        perfil=perfil,
        texto_original=texto_extraido,
        content_json=resultado,
        file_url=file_url,
        file_type=file_type
    )

    return {
        "share_id": share_id,
        "file_url": file_url,
        "texto_extraido": texto_extraido,
        "resultado": resultado
    }


# 3. Ver contenido compartido (Modo Maestro)
@app.get("/view/{share_id}")
async def view_content(share_id: str):
    response = supabase.table("adaptations")\
        .select("*")\
        .eq("share_id", share_id)\
        .single()\
        .execute()

    if not response.data:
        raise HTTPException(status_code=404, detail="Link no encontrado")

    # Suma una vista
    supabase.table("adaptations")\
        .update({"vistas": response.data["vistas"] + 1})\
        .eq("share_id", share_id)\
        .execute()

    return response.data


# 4. Historial por sesión
@app.get("/history/{session_id}")
async def get_history(session_id: str):
    response = supabase.table("adaptations")\
        .select("share_id, perfil, file_type, created_at, vistas")\
        .eq("session_id", session_id)\
        .order("created_at", desc=True)\
        .limit(10)\
        .execute()

    return {"history": response.data}