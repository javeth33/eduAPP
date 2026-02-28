import os
import uuid
import json
import fitz
from io import BytesIO
import io
from PIL import Image
from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from dotenv import load_dotenv
from gtts import gTTS
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

# ─── Prompts ──────────────────────────────────────────────
PROMPTS = {
    "tdah": """
Eres un diseñador pedagógico especializado en Universal Design for Learning (UDL).
Adapta el texto para estudiantes con TDAH.

REGLAS:
- Divide en bloques de MÁXIMO 30 palabras.
- Una sola idea por bloque.
- Usa un emoji relevante al inicio de cada bloque.
- NO resaltes verbos. Solo pon en **negrita** el concepto más importante del bloque (máximo 3 palabras por bloque).
- Usa un tono dinámico y directo.

TEXTO: {texto}

Responde SOLO en este JSON:
{{
  "resumen": "1 oración gancho para atrapar la atención",
  "bloques": ["🎯 bloque 1", "⚡ bloque 2"],
  "glosario": [{{"termino": "Concepto", "definicion": "Analogía con la vida real o cultura pop"}}],
  "mapa_mermaid": "graph TD\\n A[Idea Principal] --> B[Detalle]",
  "quiz": [{{"pregunta": "Pregunta rápida", "opciones": ["A", "B", "C"], "respuesta": 0}}]
}}
""",
    "dislexia": """
Eres un diseñador pedagógico especializado en dislexia.

REGLAS ESTRICTAS:
- PROHIBIDO usar negritas (**), cursivas o subrayados en el texto.
- Oraciones cortas: Sujeto + Verbo + Objeto.
- Párrafos de máximo 2 líneas.
- Sustituye palabras complejas por palabras muy comunes.
- El tono debe ser calmado y explicativo.

TEXTO: {texto}

Responde SOLO en este JSON:
{{
  "resumen": "Resumen de 2 oraciones muy simples.",
  "bloques": ["Oración simple 1.", "Oración simple 2."],
  "glosario": [{{"termino": "palabra", "definicion": "explicación simple sin tecnicismos"}}],
  "mapa_mermaid": "graph TD\\n A[Paso 1] --> B[Paso 2]",
  "quiz": [{{"pregunta": "Pregunta clara", "opciones": ["A", "B", "C"], "respuesta": 0}}]
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
  "glosario": [{{"termino": "palabra", "definicion": "metáfora auditiva o narrativa"}}],
  "mapa_mermaid": "graph TD\\n A[Concepto] --> B[Ejemplo]",
  "quiz": [{{"pregunta": "pregunta reflexiva", "opciones": ["A", "B", "C"], "respuesta": 0}}],
  "resumen_oral": "guión completo para narrar en voz alta",
  "nivel_complejidad": 6
}}
"""
}

# ─── Modelos ──────────────────────────────────────────────
class TextInput(BaseModel):
    texto: str
    perfil: str
    session_id: str | None = None

# ─── Función central con retry ────────────────────────────
async def adaptar_texto(texto: str, perfil: str) -> dict:
    if perfil not in PROMPTS:
        raise HTTPException(status_code=400, detail="Perfil no válido. Usa: tdah, dislexia, auditivo")

    prompt = PROMPTS[perfil].format(texto=texto)

    for intento in range(2):
        try:
            response = await model.generate_content_async(
                prompt,
                generation_config={"response_mime_type": "application/json"}
            )
            return json.loads(response.text)

        except json.JSONDecodeError:
            if intento == 1:
                raise HTTPException(status_code=500, detail="Gemini no devolvió JSON válido")
            continue
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))


# ─── Guardar en Supabase ──────────────────────────────────
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

# 1. Adaptar texto
@app.post("/adapt/text")
async def adapt_text(input: TextInput):
    resultado = await adaptar_texto(input.texto, input.perfil)
    share_id = str(uuid.uuid4())[:8]
    guardar_adaptacion(share_id, input.session_id, input.perfil,
                       input.texto, resultado, file_type="text")
    return {"share_id": share_id, "resultado": resultado}

# 2. Adaptar imagen o PDF
@app.post("/adapt/file")
async def adapt_file(
    file: UploadFile = File(...),
    perfil: str = Form(...),
    session_id: str = Form(None)
):
    if file.content_type not in ["application/pdf", "image/jpeg", "image/png", "image/webp"]:
        raise HTTPException(status_code=400, detail="Solo se aceptan PDF, JPG, PNG o WEBP")
    
    contents = await file.read()
    filename = f"{uuid.uuid4()}_{file.filename}"
    file_type = file.content_type

    supabase.storage.from_("uploads").upload(
        path=filename,
        file=contents,
        file_options={"content-type": file_type}
    )
    file_url = supabase.storage.from_("uploads").get_public_url(filename)

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

    resultado = await adaptar_texto(texto_extraido, perfil)
    share_id = str(uuid.uuid4())[:8]
    guardar_adaptacion(share_id, session_id, perfil,
                       texto_extraido, resultado, file_url, file_type)

    return {
        "share_id": share_id,
        "file_url": file_url,
        "texto_extraido": texto_extraido,
        "resultado": resultado
    }

# 3. Ver contenido compartido
@app.get("/view/{share_id}")
async def view_content(share_id: str):
    try:
        response = supabase.table("adaptations").select("*").eq("share_id", share_id).single().execute()
    except Exception:
        raise HTTPException(status_code=404, detail="Link no encontrado")
    supabase.table("adaptations").update({"vistas": response.data["vistas"] + 1}).eq("share_id", share_id).execute()
    return response.data

# 4. Comparar antes y después
@app.get("/compare/{share_id}")
async def compare(share_id: str):
    try:
        response = supabase.table("adaptations").select("texto_original, content_json, perfil, created_at").eq("share_id", share_id).single().execute()
    except Exception:
        raise HTTPException(status_code=404, detail="No encontrado")
    return {
        "antes": response.data["texto_original"],
        "despues": response.data["content_json"],
        "perfil": response.data["perfil"],
        "created_at": response.data["created_at"]
    }

# 5. Historial por sesión
@app.get("/history/{session_id}")
async def get_history(session_id: str):
    response = supabase.table("adaptations")\
        .select("share_id, perfil, file_type, created_at, vistas")\
        .eq("session_id", session_id)\
        .order("created_at", desc=True)\
        .limit(10)\
        .execute()
    return {"history": response.data}

# 6. Audio del contenido adaptado
# 6. Audio del contenido adaptado
@app.post("/audio/{share_id}")
async def get_audio(share_id: str):
    try:
        response = supabase.table("adaptations").select("content_json").eq("share_id", share_id).single().execute()
    except Exception:
        raise HTTPException(status_code=404, detail="No encontrado")
    
    # Usamos .get() para evitar el KeyError
    content = response.data["content_json"]
    texto = content.get("resumen_oral", content.get("resumen", "No hay texto disponible para leer."))
    
    tts = gTTS(text=texto, lang="es", slow=False)
    audio_buffer = io.BytesIO()
    tts.write_to_fp(audio_buffer)
    audio_buffer.seek(0)
    return StreamingResponse(audio_buffer, media_type="audio/mpeg")

# 7. Estadísticas en tiempo real
@app.get("/stats")
async def get_stats():
    total = supabase.table("adaptations")\
        .select("id", count="exact")\
        .execute()
    rows = supabase.table("adaptations")\
        .select("perfil, vistas")\
        .execute()
    perfiles = {}
    vistas = 0
    for row in rows.data:
        p = row["perfil"]
        perfiles[p] = perfiles.get(p, 0) + 1
        vistas += row["vistas"]
    return {
        "total_adaptaciones": total.count,
        "por_perfil": perfiles,
        "total_vistas": vistas
    }
