import React, { useState, useEffect, useCallback } from "react";
import { supabase } from "./supabaseClient";
import styles from './HorarioForm.module.css';
import { Toaster, toast } from 'react-hot-toast';

const TIPOS_DE_COMPONENTE = ["TEORIA", "PRACTICA", "LABORATORIO"];

// ===================================================================
// COMPONENTE PRINCIPAL
// ===================================================================
export default function HorarioForm({ onMostrarHorarios }) {
  const [cursosGuardados, setCursosGuardados] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cursoParaEditar, setCursoParaEditar] = useState(null);

  // =================================================================
  // FUNCIÓN fetchCursos MODIFICADA
  // Ahora filtra los cursos por el ID del usuario actual.
  // =================================================================
  const fetchCursos = useCallback(async () => {
    try {
      setLoading(true);
      
      // 1. Obtenemos la información del usuario actual
      const { data: { user } } = await supabase.auth.getUser();

      if (user) {
        // 2. Hacemos la consulta filtrando por user_id
        const { data, error } = await supabase
          .from("cursos")
          .select("*, grupos(*, sesiones(*))")
          .eq('user_id', user.id) // ¡ESTA LÍNEA ES LA CLAVE!
          .order("created_at", { ascending: false });

        if (error) throw error;
        setCursosGuardados(data || []);
      } else {
        // Si no hay usuario, la lista de cursos estará vacía
        setCursosGuardados([]);
      }
    } catch (error) {
      console.error("Error cargando los cursos:", error);
      toast.error(`Error al cargar los cursos: ${error.message}`);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCursos();
  }, [fetchCursos]);

  const handleDeleteCurso = async (cursoId) => {
    if (!window.confirm("¿Estás seguro de eliminar este curso?")) return;
    const promise = supabase.from("cursos").delete().eq("id", cursoId);
    toast.promise(promise, {
      loading: 'Eliminando curso...',
      success: () => {
        fetchCursos();
        return 'Curso eliminado con éxito ✅';
      },
      error: (err) => `Error al eliminar: ${err.message}`,
    });
  };

  const handleSetCursoParaEditar = (curso) => {
    setCursoParaEditar(curso);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleFinishEditing = () => {
    setCursoParaEditar(null);
    fetchCursos();
  }

  const handleGenerarHorariosClick = () => {
    if (cursosGuardados.length === 0) {
      toast.error("Primero agrega al menos un curso.");
      return;
    }
    onMostrarHorarios(cursosGuardados);
  }

  return (
    <>
      <Toaster position="top-right" reverseOrder={false} />
      <div className={styles.appContainer}>
        {/* --- Columna 1: Formulario --- */}
        <div className={styles.formColumn}>
          <CourseForm 
            key={cursoParaEditar ? cursoParaEditar.id : 'new'}
            cursoInicial={cursoParaEditar} 
            onFormSubmit={handleFinishEditing} 
          />
        </div>
        
        {/* --- Columna 2: Lista de Cursos --- */}
        <div className={styles.listColumn}>
          <h2>📚 Mis Cursos</h2>
          <CourseList
            cursos={cursosGuardados}
            loading={loading}
            onEdit={handleSetCursoParaEditar}
            onDelete={handleDeleteCurso}
          />
        </div>

        {/* --- Columna 3: Botón de Acción --- */}
        <div className={styles.actionColumn}>
          <button onClick={handleGenerarHorariosClick} className={`${styles.btn} ${styles.btnPrimary} ${styles.btnGenerar}`}>
            ➡️ Generar Horarios
          </button>
          <p className={styles.motivationalText}>
            ¡Visualiza aquí el horario de tus sueños!
          </p>
        </div>
      </div>
    </>
  );
}


// ===================================================================
// COMPONENTE FORMULARIO
// ===================================================================
function CourseForm({ cursoInicial, onFormSubmit }) {
    const [editandoId, setEditandoId] = useState(cursoInicial?.id || null);
    const [nombreCurso, setNombreCurso] = useState(cursoInicial?.nombre || "");
    const [componentes, setComponentes] = useState({ TEORIA: [], PRACTICA: [], LABORATORIO: [] });
    const [saving, setSaving] = useState(false);
  
    useEffect(() => {
      const initialState = { TEORIA: [], PRACTICA: [], LABORATORIO: [] };
      if (cursoInicial && cursoInicial.grupos) {
        cursoInicial.grupos.forEach(grupo => {
          if (initialState[grupo.tipo_componente]) {
              initialState[grupo.tipo_componente].push({
              nombre_grupo: grupo.nombre_grupo,
              nrc: grupo.nrc,
              sesiones: grupo.sesiones.map(s => ({ 
                  dia: s.dia, 
                  horaInicio: s.hora_inicio, 
                  horaFin: s.hora_fin, 
                  aula: s.aula || "", 
                  docente: s.docente || "" 
              }))
            });
          }
        });
      }
      setComponentes(initialState);
    }, [cursoInicial]);
  
    const resetFormulario = () => {
      setEditandoId(null);
      setNombreCurso("");
      setComponentes({ TEORIA: [], PRACTICA: [], LABORATORIO: [] });
      if(cursoInicial) onFormSubmit();
    };
    
    const addGrupo = (tipo) => setComponentes(prev => ({ ...prev, [tipo]: [...prev[tipo], { nombre_grupo: "", nrc: "", sesiones: [{ dia: "", horaInicio: "", horaFin: "", aula: "", docente: "" }] }] }));
    const removeGrupo = (tipo, grupoIndex) => setComponentes(prev => ({ ...prev, [tipo]: prev[tipo].filter((_, i) => i !== grupoIndex) }));
    const handleGrupoChange = (tipo, grupoIndex, field, value) => { const n = { ...componentes }; n[tipo][grupoIndex][field] = value; setComponentes(n); };
    const addSesion = (tipo, grupoIndex) => { const n = { ...componentes }; n[tipo][grupoIndex].sesiones.push({ dia: "", horaInicio: "", horaFin: "", aula: "", docente: "" }); setComponentes(n); };
    const removeSesion = (tipo, grupoIndex, sesionIndex) => { const n = { ...componentes }; n[tipo][grupoIndex].sesiones = n[tipo][grupoIndex].sesiones.filter((_, i) => i !== sesionIndex); setComponentes(n); };
    const handleSesionChange = (tipo, grupoIndex, sesionIndex, field, value) => { const n = { ...componentes }; n[tipo][grupoIndex].sesiones[sesionIndex][field] = value; setComponentes(n); };
    
    // =================================================================
    // FUNCIÓN handleSubmit MODIFICADA
    // Ahora, al crear un curso, le asigna el ID del usuario.
    // =================================================================
    const handleSubmit = async (e) => {
      e.preventDefault();
      if (!nombreCurso.trim()) {
        toast.error("El nombre del curso no puede estar vacío.");
        return;
      }
      setSaving(true);
      
      try {
        // 1. Obtenemos el usuario actual ANTES de hacer nada
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("¡Debes iniciar sesión para guardar cursos!");

        let cursoId = editandoId;
        if (editandoId) {
          const { error } = await supabase.from("cursos").update({ nombre: nombreCurso }).eq("id", editandoId);
          if (error) throw error;
          await supabase.from("grupos").delete().eq("curso_id", editandoId);
        } else {
          // 2. Al insertar un nuevo curso, incluimos el user_id
          const { data, error } = await supabase
            .from("cursos")
            .insert({ nombre: nombreCurso, user_id: user.id }) // ¡ESTA LÍNEA ES LA CLAVE!
            .select("id")
            .single();
          if (error) throw error;
          if (!data || !data.id) throw new Error("No se pudo obtener el ID del nuevo curso.");
          cursoId = data.id;
        }
  
        const todosLosGruposDelForm = [];
        for (const tipo in componentes) {
          componentes[tipo].forEach(grupo => {
            if (grupo.nrc && grupo.nombre_grupo) {
              todosLosGruposDelForm.push({ curso_id: cursoId, tipo_componente: tipo, nombre_grupo: grupo.nombre_grupo, nrc: grupo.nrc, sesiones_temp: grupo.sesiones });
            }
          });
        }
  
        if (todosLosGruposDelForm.length > 0) {
          const gruposParaInsertar = todosLosGruposDelForm.map(g => ({ curso_id: g.curso_id, tipo_componente: g.tipo_componente, nombre_grupo: g.nombre_grupo, nrc: g.nrc }));
          const { data: gruposInsertados, error: gruposError } = await supabase.from("grupos").insert(gruposParaInsertar).select("id, nrc");
          if (gruposError) throw gruposError;
  
          const todasLasSesiones = [];
          gruposInsertados.forEach(grupoDB => {
              const grupoDelForm = todosLosGruposDelForm.find(g => g.nrc === grupoDB.nrc);
              if (grupoDelForm) {
                  grupoDelForm.sesiones_temp.forEach(sesion => {
                      if (sesion.dia && sesion.horaInicio && sesion.horaFin) {
                          todasLasSesiones.push({ grupo_id: grupoDB.id, dia: sesion.dia.trim().toUpperCase(), hora_inicio: sesion.horaInicio, hora_fin: sesion.horaFin, aula: sesion.aula ? sesion.aula.trim() : null, docente: sesion.docente ? sesion.docente.trim() : null });
                      }
                  });
              }
          });
  
          if (todasLasSesiones.length > 0) {
              const { error: sesionesError } = await supabase.from("sesiones").insert(todasLasSesiones);
              if (sesionesError) throw sesionesError;
          }
        }
  
        toast.success(editandoId ? "Curso actualizado correctamente ✅" : "Curso guardado correctamente ✅");
        resetFormulario();
        onFormSubmit();
      } catch(error) {
          console.error("Error al guardar:", error);
          toast.error(`Error al guardar: ${error.message}`);
      } finally {
          setSaving(false);
      }
    };
  
    return (
      <form onSubmit={handleSubmit} className={styles.form}>
        <h3>{editandoId ? "✏️ Editando Curso" : "➕ Agregar Nuevo Curso"}</h3>
        <input value={nombreCurso} onChange={(e) => setNombreCurso(e.target.value)} placeholder="NOMBRE DEL CURSO (Ej: CÁLCULO I)" required className={styles.inputLargo} />
        <hr className={styles.hr} />
  
        {TIPOS_DE_COMPONENTE.map(tipo => (
          <div key={tipo} className={styles.componenteContainer}>
            <h4>Componente: {tipo}</h4>
            {componentes[tipo].map((grupo, grupoIndex) => (
              <div key={grupoIndex} className={styles.grupoContainer}>
                <div className={styles.grupoHeader}>
                  <h5>Grupo {grupoIndex + 1}</h5>
                  <button type="button" onClick={() => removeGrupo(tipo, grupoIndex)} className={`${styles.btn} ${styles.btnQuitar}`}>Quitar</button>
                </div>
                <div className={styles.inputGrid}>
                  <input value={grupo.nrc} onChange={e => handleGrupoChange(tipo, grupoIndex, 'nrc', e.target.value)} placeholder="NRC (Ej: 12345)" required className={styles.input} />
                  <input value={grupo.nombre_grupo} onChange={e => handleGrupoChange(tipo, grupoIndex, 'nombre_grupo', e.target.value)} placeholder="Nombre Grupo (Ej: T1)" required className={styles.input} />
                </div>
                {grupo.sesiones.map((sesion, sesionIndex) => (
                  <div key={sesionIndex} className={styles.sesionContainer}>
                    <input type="text" placeholder="Día (LUN, MAR)" value={sesion.dia} onChange={e => handleSesionChange(tipo, grupoIndex, sesionIndex, 'dia', e.target.value)} required className={styles.input} />
                    <input type="time" value={sesion.horaInicio} onChange={e => handleSesionChange(tipo, grupoIndex, sesionIndex, 'horaInicio', e.target.value)} required className={styles.input} />
                    <input type="time" value={sesion.horaFin} onChange={e => handleSesionChange(tipo, grupoIndex, sesionIndex, 'horaFin', e.target.value)} required className={styles.input} />
                    {grupo.sesiones.length > 1 && <button type="button" onClick={() => removeSesion(tipo, grupoIndex, sesionIndex)} className={styles.btnQuitarMini}>🗑️</button>}
                  </div>
                ))}
                <button type="button" onClick={() => addSesion(tipo, grupoIndex)} className={`${styles.btn} ${styles.btnSecondary}`}>➕ Sesión</button>
              </div>
            ))}
            <button type="button" onClick={() => addGrupo(tipo)} className={`${styles.btn} ${styles.btnSecondary}`} style={{marginTop: '10px'}}>➕ Añadir Grupo de {tipo}</button>
          </div>
        ))}
        <hr className={styles.hr} />
        <div className={styles.formActions}>
          <button type="submit" disabled={saving} className={`${styles.btn} ${styles.btnPrimary}`}>
            {saving ? 'Guardando...' : (editandoId ? 'Actualizar Curso' : 'Guardar Curso')}
          </button>
          {editandoId && <button type="button" onClick={resetFormulario} className={`${styles.btn} ${styles.btnSecondary}`}>Cancelar Edición</button>}
        </div>
      </form>
    );
}

// ===================================================================
// COMPONENTE LISTA DE CURSOS
// ===================================================================
function CourseList({ cursos, loading, onEdit, onDelete }) {
    if (loading) {
        return (
            <div>
                <div className={`${styles.skeleton} ${styles.skeletonCard}`}></div>
                <div className={`${styles.skeleton} ${styles.skeletonCard}`}></div>
            </div>
        );
      }
      if (cursos.length === 0) {
        return <p>Aún no has agregado ningún curso. ¡Usa el formulario para empezar!</p>;
      }
    
      const tagStyles = {
        TEORIA: styles.tagTeoria,
        PRACTICA: styles.tagPractica,
        LABORATORIO: styles.tagLaboratorio
      };
    
      return (
        <div>
          {cursos.map((curso) => (
            <div key={curso.id} className={styles.cursoCard}>
              <div className={styles.cursoCardHeader}>
                <h4>{curso.nombre}</h4>
                <div className={styles.cursoCardActions}>
                  <button onClick={() => onEdit(curso)} title="Editar">✏️</button>
                  <button onClick={() => onDelete(curso.id)} title="Eliminar">🗑️</button>
                </div>
              </div>
              {curso.grupos && [...curso.grupos].sort((a,b) => a.tipo_componente.localeCompare(b.tipo_componente)).map(grupo => (
                <div key={grupo.id} className={styles.grupoDetalle}>
                  <p>
                    <span className={`${styles.tag} ${tagStyles[grupo.tipo_componente]}`}>{grupo.tipo_componente}</span>
                    <b>{grupo.nombre_grupo}</b> (NRC: {grupo.nrc})
                  </p>
                  <ul className={styles.sesionesList}>
                    {grupo.sesiones.map(s => (
                      <li key={s.id}>
                        {s.dia.toUpperCase()}: {(s.hora_inicio || "").slice(0,5)} - {(s.hora_fin || "").slice(0,5)}
                        {s.aula && ` | Aula: ${s.aula}`}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          ))}
        </div>
      );
}
