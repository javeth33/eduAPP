import os
import uuid
import json
import fitz
import io
from io import BytesIO
from PIL import Image
from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from dotenv import load_dotenv
from gtts import gTTS
from google import genai
from google.genai import types
from supabase import create_client

# ─── Configuración ────────────────────────────────────────
load_dotenv()
client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))
MODEL = "gemini-2.5-flash"
supabase = create_client(os.getenv("SUPABASE_URL"), os.getenv("SUPABASE_KEY"))

app = FastAPI(title="EduAdapt API")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

import traceback
from fastapi import Request
from fastapi.responses import JSONResponse

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    print("=" * 60)
    print("ERROR COMPLETO:")
    traceback.print_exc()
    print("=" * 60)
    return JSONResponse(status_code=500, content={"detail": str(exc)})

# ─── Prompts ──────────────────────────────────────────────
PROMPTS = {
    "tdah": """Eres un diseñador pedagógico especializado en Universal Design for Learning (UDL). Adapta el texto para estudiantes con TDAH. REGLAS: Divide en bloques de MÁXIMO 30 palabras. Una sola idea por bloque. Usa un emoji al inicio de cada bloque. Solo pon en **negrita** el concepto más importante de cada bloque. IMPORTANTE: NO incluyas conteo de palabras como (14 palabras) o (16 palabras) en ningún bloque ni en ningún campo del JSON. TEXTO: {texto} Responde SOLO en este JSON: {{"resumen": "1 oración gancho", "bloques": ["🎯 bloque 1", "⚡ bloque 2"], "glosario": [{{"termino": "Concepto", "definicion": "Analogía simple"}}], "mapa_mermaid": "graph TD\\n A[Idea Principal] --> B[Detalle]", "quiz": [{{"pregunta": "Pregunta rápida", "opciones": ["A", "B", "C"], "respuesta": 0}}], "resumen_oral": "versión corta para audio"}}""",

    "dislexia": """Eres un diseñador pedagógico especializado en dislexia. REGLAS: PROHIBIDO usar cursivas o subrayados. PROHIBIDO usar emojis de cualquier tipo en cualquier campo. Solo pon en **negrita** el concepto más importante de cada oración. Oraciones cortas, párrafos de 2 líneas. Tono calmado. IMPORTANTE: NO incluyas conteo de palabras como (14 palabras) o (16 palabras) en ningún bloque ni en ningún campo del JSON. NO uses ningún emoji en ningún campo. TEXTO: {texto} Responde SOLO en este JSON: {{"resumen": "Resumen simple.", "bloques": ["Oración simple 1.", "Oración simple 2."], "glosario": [{{"termino": "palabra", "definicion": "explicación simple"}}], "mapa_mermaid": "graph TD\\n A[Paso 1] --> B[Paso 2]", "quiz": [{{"pregunta": "Pregunta clara", "opciones": ["A", "B", "C"], "respuesta": 0}}], "resumen_oral": "versión simple para escuchar"}}""",

    "auditivo": """Eres un diseñador pedagógico especializado en aprendizaje auditivo. REGLAS: Narrativa hablada natural, tono de podcast/cuento. IMPORTANTE: NO incluyas conteo de palabras como (14 palabras) o (16 palabras) en ningún campo del JSON. TEXTO: {texto} Responde SOLO en este JSON: {{"resumen": "intro estilo podcast", "bloques": ["narrativa 1", "narrativa 2"], "glosario": [{{"termino": "palabra", "definicion": "metáfora"}}], "mapa_mermaid": "graph TD\\n A[Concepto] --> B[Ejemplo]", "quiz": [{{"pregunta": "pregunta", "opciones": ["A", "B", "C"], "respuesta": 0}}], "resumen_oral": "guión completo para narrar en voz alta"}}"""
}

# ─── Modelo de Datos ──────────────────────────────────────
class TextInput(BaseModel):
    texto: str
    perfil: str
    session_id: str | None = None

# ─── Función central ──────────────────────────────────────
async def adaptar_texto(texto: str, perfil: str) -> dict:
    mapeo = {"ADHD": "tdah", "DYSLEXIA": "dislexia", "AUDITIVO": "auditivo"}
    perfil = mapeo.get(perfil, perfil).lower()

    print(f">>> [adaptar_texto] perfil final: '{perfil}'")

    if perfil not in PROMPTS:
        raise HTTPException(status_code=400, detail=f"Perfil no válido: '{perfil}'. Usa: tdah, dislexia, auditivo")

    for intento in range(2):
        try:
            print(f">>> [adaptar_texto] Llamando a Gemini (intento {intento + 1})...")
            response = client.models.generate_content(
                model=MODEL,
                contents=PROMPTS[perfil].format(texto=texto),
                config=types.GenerateContentConfig(
                    response_mime_type="application/json"
                )
            )
            print(f">>> [adaptar_texto] Gemini respondió OK")
            return json.loads(response.text)
        except json.JSONDecodeError:
            print(f">>> [adaptar_texto] ERROR: Gemini no devolvió JSON válido")
            if intento == 1:
                raise HTTPException(status_code=500, detail="Gemini no devolvió JSON válido")
            continue
        except Exception as e:
            print(f">>> [adaptar_texto] ERROR inesperado: {e}")
            traceback.print_exc()
            raise HTTPException(status_code=500, detail=str(e))

def guardar_adaptacion(share_id, session_id, perfil, texto_original,
                       content_json, file_url=None, file_type=None):
    print(f">>> [guardar_adaptacion] Guardando share_id={share_id}, perfil={perfil}")
    supabase.table("adaptations").insert({
        "share_id": share_id,
        "session_id": str(session_id) if session_id else None,
        "perfil": perfil,
        "texto_original": texto_original,
        "content_json": content_json,
        "file_url": file_url,
        "file_type": file_type,
    }).execute()
    print(f">>> [guardar_adaptacion] Guardado OK")

# ─── Endpoints ────────────────────────────────────────────

@app.get("/")
def root():
    return {"status": "EduAdapt API corriendo ✅", "perfiles": ["tdah", "dislexia", "auditivo"]}

@app.get("/health")
def health():
    return {"status": "ok"}

@app.post("/adapt/text")
async def adapt_text(input: TextInput):
    print(f">>> [adapt_text] perfil={input.perfil}, texto_len={len(input.texto)}")
    resultado = await adaptar_texto(input.texto, input.perfil)
    share_id = str(uuid.uuid4())[:8]
    guardar_adaptacion(share_id, input.session_id, input.perfil,
                       input.texto, resultado, file_type="text")
    return {"share_id": share_id, "resultado": resultado}

@app.post("/adapt/file")
async def adapt_file(
    file: UploadFile = File(...),
    perfil: str = Form(...),
    session_id: str = Form(None)
):
    print(f">>> [adapt_file] INICIO - archivo='{file.filename}', content_type='{file.content_type}', perfil='{perfil}'")

    TIPOS_ACEPTADOS = ["application/pdf", "image/jpeg", "image/jpg",
                       "image/pjpeg", "image/png", "image/webp"]

    if file.content_type not in TIPOS_ACEPTADOS:
        print(f">>> [adapt_file] ERROR: tipo no aceptado: {file.content_type}")
        raise HTTPException(status_code=400, detail=f"Formato no aceptado: '{file.content_type}'. Usa PDF, JPG o PNG")

    contents = await file.read()
    print(f">>> [adapt_file] Archivo leído: {len(contents)} bytes")

    filename = f"{uuid.uuid4()}_{file.filename}"

    # ── PASO 1: Subir a Supabase ──
    try:
        print(f">>> [adapt_file] Subiendo a Supabase Storage como '{filename}'...")
        supabase.storage.from_("uploads").upload(
            filename, contents,
            file_options={"content-type": file.content_type}
        )
        file_url = supabase.storage.from_("uploads").get_public_url(filename)
        print(f">>> [adapt_file] Supabase upload OK. URL: {file_url}")
    except Exception as e:
        print(f">>> [adapt_file] ERROR en Supabase upload: {e}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error subiendo archivo: {str(e)}")

    # ── PASO 2: Extraer texto ──
    try:
        if file.content_type == "application/pdf":
            print(f">>> [adapt_file] Extrayendo texto de PDF con PyMuPDF...")
            pdf = fitz.open(stream=contents, filetype="pdf")
            texto_extraido = "".join(page.get_text() for page in pdf)
            print(f">>> [adapt_file] Texto extraído del PDF: {len(texto_extraido)} caracteres")
        else:
            print(f">>> [adapt_file] Extrayendo texto de imagen con Gemini...")
            response = client.models.generate_content(
                model=MODEL,
                contents=[
                    types.Part.from_bytes(data=contents, mime_type=file.content_type),
                    "Extrae TODO el texto de esta imagen exactamente como está. Solo el texto, sin comentarios."
                ]
            )
            texto_extraido = response.text.strip()
            print(f">>> [adapt_file] Texto extraído de imagen: {len(texto_extraido)} caracteres")
    except Exception as e:
        print(f">>> [adapt_file] ERROR extrayendo texto: {e}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error extrayendo texto: {str(e)}")

    if not texto_extraido.strip():
        print(f">>> [adapt_file] ERROR: no se extrajo texto del archivo")
        raise HTTPException(status_code=422, detail="No se pudo extraer texto del archivo. ¿Está vacío o es una imagen sin texto?")

    # ── PASO 3: Adaptar texto con Gemini ──
    print(f">>> [adapt_file] Adaptando texto con perfil='{perfil}'...")
    resultado = await adaptar_texto(texto_extraido, perfil)
    print(f">>> [adapt_file] Adaptación OK")

    # ── PASO 4: Guardar en Supabase ──
    share_id = str(uuid.uuid4())[:8]
    guardar_adaptacion(share_id, session_id, perfil,
                       texto_extraido, resultado, file_url, file.content_type)

    print(f">>> [adapt_file] FIN OK - share_id={share_id}")
    return {
        "share_id": share_id,
        "file_url": file_url,
        "texto_extraido": texto_extraido,
        "resultado": resultado
    }

@app.get("/view/{share_id}")
async def view_content(share_id: str):
    try:
        response = supabase.table("adaptations").select("*")\
            .eq("share_id", share_id).single().execute()
    except Exception:
        raise HTTPException(status_code=404, detail="Link no encontrado")
    supabase.table("adaptations")\
        .update({"vistas": response.data["vistas"] + 1})\
        .eq("share_id", share_id).execute()
    return response.data

@app.get("/compare/{share_id}")
async def compare(share_id: str):
    try:
        response = supabase.table("adaptations")\
            .select("texto_original, content_json, perfil, created_at")\
            .eq("share_id", share_id).single().execute()
    except Exception:
        raise HTTPException(status_code=404, detail="No encontrado")
    return {
        "antes": response.data["texto_original"],
        "despues": response.data["content_json"],
        "perfil": response.data["perfil"],
        "created_at": response.data["created_at"]
    }

@app.get("/history/{session_id}")
async def get_history(session_id: str):
    response = supabase.table("adaptations")\
        .select("share_id, perfil, file_type, created_at, vistas")\
        .eq("session_id", session_id)\
        .order("created_at", desc=True)\
        .limit(10).execute()
    return {"history": response.data}

@app.post("/audio/{share_id}")
async def get_audio(share_id: str):
    try:
        response = supabase.table("adaptations")\
            .select("content_json").eq("share_id", share_id).single().execute()
    except Exception:
        raise HTTPException(status_code=404, detail="No encontrado")
    content = response.data["content_json"]
    texto = content.get("resumen_oral", content.get("resumen", "No hay audio disponible"))
    tts = gTTS(text=texto, lang="es", slow=False)
    audio_buffer = io.BytesIO()
    tts.write_to_fp(audio_buffer)
    audio_buffer.seek(0)
    return StreamingResponse(audio_buffer, media_type="audio/mpeg")

@app.get("/stats")
async def get_stats():
    total = supabase.table("adaptations").select("id", count="exact").execute()
    rows = supabase.table("adaptations").select("perfil, vistas").execute()
    perfiles = {"tdah": 0, "dislexia": 0, "auditivo": 0}
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