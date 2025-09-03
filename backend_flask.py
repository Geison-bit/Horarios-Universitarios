import os
import re
import random
import json
from flask import Flask, request, jsonify
from flask_cors import CORS
from itertools import product
from supabase import create_client, Client

# --- Configuración de la Aplicación ---
app = Flask(__name__)

# Dominios permitidos (puedes agregar más separados por coma en la var de entorno)
ALLOWED_ORIGINS = os.getenv(
    "ALLOWED_ORIGINS",
    "https://horarios-universitarios.vercel.app,http://localhost:5173"
).split(",")

# CORS estricto + preflight
CORS(
    app,
    resources={r"/*": {"origins": ALLOWED_ORIGINS}},
    supports_credentials=True,
    methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization"],
)

@app.after_request
def apply_cors(response):
    origin = request.headers.get("Origin")
    if origin and origin in ALLOWED_ORIGINS:
        response.headers["Access-Control-Allow-Origin"] = origin
        response.headers["Vary"] = "Origin"
        response.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization"
        response.headers["Access-Control-Allow-Methods"] = "GET, POST, OPTIONS"
    return response

# --- Configuración de Supabase (Forma Segura) ---
SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_KEY")
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# --- Clases de Modelo de Datos ---
class Sesion:
    def __init__(self, dia, hora_inicio, hora_fin, aula, docente, nombre_curso, liga, nrc, tipo_componente, nombre_grupo):
        self.dia = dia
        self.hora_inicio = hora_inicio
        self.hora_fin = hora_fin
        self.aula = aula
        self.docente = docente
        self.nombreCurso = nombre_curso
        self.liga = liga
        self.nrc = nrc
        self.tipo_componente = tipo_componente
        self.nombre_grupo = nombre_grupo

class Curso:
    def __init__(self, nombre):
        self.nombre = nombre
        self.opciones = []

    def agregar_opcion_completa(self, paquete_de_sesiones):
        self.opciones.append(paquete_de_sesiones)

# --- Funciones de Lógica de Horarios ---
def to_minutes(time_str):
    try:
        parts = list(map(int, time_str.split(':')))
        return parts[0] * 60 + parts[1]
    except (ValueError, AttributeError, IndexError):
        return 0

def es_horario_valido(horario_completo):
    for i in range(len(horario_completo)):
        for j in range(i + 1, len(horario_completo)):
            sesion_a = horario_completo[i]
            sesion_b = horario_completo[j]
            if sesion_a.dia == sesion_b.dia:
                inicio_a, fin_a = to_minutes(sesion_a.hora_inicio), to_minutes(sesion_a.hora_fin)
                inicio_b, fin_b = to_minutes(sesion_b.hora_inicio), to_minutes(sesion_b.hora_fin)
                if not (fin_a <= inicio_b or fin_b <= inicio_a):
                    return False
    return True

def generar_horarios(cursos, filtro_func=None):
    if not cursos: return []
    opciones_por_curso = [curso.opciones for curso in cursos if curso.opciones]
    if not opciones_por_curso: return []
    combinaciones_posibles = product(*opciones_por_curso)
    horarios_validos = []
    for combinacion in combinaciones_posibles:
        horario_actual = [sesion for opcion_curso in combinacion for sesion in opcion_curso]
        if es_horario_valido(horario_actual):
            if filtro_func and not filtro_func(horario_actual):
                continue
            horarios_validos.append(horario_actual)
    return horarios_validos

# --- Funciones de Filtro ---
def solo_manana(horario): return all(to_minutes(s.hora_fin) <= 840 for s in horario)
def solo_tarde(horario): return all(to_minutes(s.hora_inicio) >= 780 for s in horario)
def dia_libre(horario, dia_a_liberar): return all(s.dia.upper() != dia_a_liberar.upper() for s in horario)

# --- Endpoint Principal de la API ---
@app.route("/horarios", methods=["GET", "OPTIONS"])
def obtener_horarios_endpoint():
    # Responder el preflight (OPTIONS) aquí mismo
    if request.method == "OPTIONS":
        return ("", 204)

    print("\n" + "="*50)
    print("--- [INICIO] Solicitud a /horarios recibida ---")

    # Verificación del Token de Usuario
    auth_header = request.headers.get('Authorization')
    if not auth_header or not auth_header.startswith('Bearer '):
        return jsonify({"error": "Falta el token de autorización."}), 401

    jwt_token = auth_header.split(' ')[1]

    try:
        user_response = supabase.auth.get_user(jwt_token)
        user = getattr(user_response, "user", None) or user_response  # compatible con versiones
        if not user:
            raise Exception("Token inválido o expirado.")
        print(f"Usuario verificado: {getattr(user, 'email', 's/ correo')} (ID: {user.id})")
    except Exception as e:
        print(f"Error de autenticación: {e}")
        return jsonify({"error": "Token inválido o no autorizado."}), 401

    filtro_param = request.args.get("filtro", "todos")
    print(f"Filtro solicitado: {filtro_param}")

    try:
        cursos_del_usuario_res = supabase.table('cursos').select('id').eq('user_id', user.id).execute()
        if not cursos_del_usuario_res.data:
            print("El usuario no tiene cursos.")
            return jsonify([])

        ids_de_cursos = [curso['id'] for curso in cursos_del_usuario_res.data]
        grupos_res = supabase.table('grupos').select('*, cursos(nombre), sesiones(*)').in_('curso_id', ids_de_cursos).execute()
        grupos_data = grupos_res.data

    except Exception as e:
        print(f"Error en la consulta a la base de datos: {e}")
        return jsonify({"error": "No se pudo conectar con la base de datos."}), 500

    # Procesamiento
    temp_cursos_struct = {}

    for grupo_raw in grupos_data:
        nombre_curso_padre = grupo_raw.get("cursos", {}).get("nombre")
        tipo_componente_raw = grupo_raw.get("tipo_componente")
        nombre_grupo = grupo_raw.get('nombre_grupo', 'N/A')

        if not all([nombre_curso_padre, tipo_componente_raw, nombre_grupo]):
            continue

        match_key = re.search(r'(\d+)$', nombre_grupo)
        if not match_key:
            print(f"ADVERTENCIA: No se pudo encontrar clave de vínculo en '{nombre_grupo}'. Saltando.")
            continue
        link_key = match_key.group(1)

        match_type = re.match(r"\s*([A-Z]+)", tipo_componente_raw.upper())
        if not match_type:
            continue
        tipo_componente = match_type.group(1)

        if nombre_curso_padre not in temp_cursos_struct:
            temp_cursos_struct[nombre_curso_padre] = {}
        if link_key not in temp_cursos_struct[nombre_curso_padre]:
            temp_cursos_struct[nombre_curso_padre][link_key] = {}
        if tipo_componente not in temp_cursos_struct[nombre_curso_padre][link_key]:
            temp_cursos_struct[nombre_curso_padre][link_key][tipo_componente] = []

        if not grupo_raw.get("sesiones"):
            continue

        for sesion_raw in grupo_raw["sesiones"]:
            sesion_obj = Sesion(
                dia=sesion_raw.get("dia", "").strip().upper(),
                hora_inicio=sesion_raw.get("hora_inicio"),
                hora_fin=sesion_raw.get("hora_fin"),
                aula=sesion_raw.get("aula", "N/A"),
                docente=sesion_raw.get("docente", "N/A"),
                nombre_curso=f'{nombre_curso_padre} - {nombre_grupo}',
                liga=nombre_grupo,
                nrc=grupo_raw.get('nrc', 'N/A'),
                tipo_componente=tipo_componente,
                nombre_grupo=nombre_grupo
            )
            temp_cursos_struct[nombre_curso_padre][link_key][tipo_componente].append([sesion_obj])

    cursos_finales = []
    for course_name, linked_groups in temp_cursos_struct.items():
        curso_obj = Curso(nombre=course_name)
        for link_key, components in linked_groups.items():
            list_of_component_options = list(components.values())
            combinations_for_this_link = product(*list_of_component_options)
            for combo in combinations_for_this_link:
                package = [session for option in combo for session in option]
                curso_obj.agregar_opcion_completa(package)
        if curso_obj.opciones:
            cursos_finales.append(curso_obj)
            print(f"Curso '{curso_obj.nombre}' tiene {len(curso_obj.opciones)} opciones completas vinculadas.")

    filtro_func = None
    if filtro_param == "manana":
        filtro_func = solo_manana
    elif filtro_param == "tarde":
        filtro_func = solo_tarde
    elif filtro_param.startswith("dia_libre_"):
        dia = filtro_param.replace("dia_libre_", "").upper()
        filtro_func = lambda h: dia_libre(h, dia)

    horarios_generados = generar_horarios(cursos_finales, filtro_func)
    print(f"Se encontraron {len(horarios_generados)} horarios válidos.")

    random.shuffle(horarios_generados)
    horarios_json = [[vars(sesion) for sesion in horario] for horario in horarios_generados]

    print(f"Enviando {len(horarios_json)} horarios al frontend.")
    print("--- [FIN] Solicitud completada ---")
    print("="*50 + "\n")

    return jsonify(horarios_json)

if __name__ == "__main__":
    # En Railway es clave escuchar en 0.0.0.0 y el puerto que te asignan
    app.run(host="0.0.0.0", port=int(os.environ.get("PORT", 5000)))
