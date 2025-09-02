import React, { useState, useEffect, useMemo, useRef } from "react";
import styles from './HorarioGenerator.module.css';
import { supabase } from "./supabaseClient"; // Asegúrate de que tu cliente de Supabase se exporta desde este archivo
import PaymentModal from "./PaymentModal";   // Importamos el nuevo modal de pago

// Las librerías para PDF siguen siendo necesarias en tu index.html
// <script src="https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js"></script>
// <script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"></script>

export default function HorarioGenerator({ onVolver }) {
  const [filtro, setFiltro] = useState("todos");
  const [horarios, setHorarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [allSchedules, setAllSchedules] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const scheduleTableRef = useRef(null);

  // --- NUEVOS ESTADOS PARA LOS INTENTOS ---
  const [attemptsRemaining, setAttemptsRemaining] = useState(null);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);

  // =================================================================
  // FUNCIÓN MODIFICADA PARA ENVIAR EL TOKEN DE USUARIO
  // =================================================================
  const fetchUserDataAndSchedules = async (currentFiltro) => {
    setLoading(true);
    setHorarios([]);
    
    try {
      // 1. Obtenemos la sesión actual del usuario para conseguir su token
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) throw sessionError;
      if (!session) throw new Error("No hay sesión de usuario activa. Por favor, inicia sesión de nuevo.");

      // Obtenemos el perfil del usuario para los intentos
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('attempts_remaining')
          .eq('id', user.id)
          .single();
        
        if (profileError && profileError.code !== 'PGRST116') {
          console.error('Error fetching profile:', profileError);
        }
        setAttemptsRemaining(profileData ? profileData.attempts_remaining : 3);
      }

      // 2. Hacemos la petición al servidor, enviando el token en los encabezados
      const res = await fetch(`http://localhost:5000/horarios?filtro=${currentFiltro}`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      if (!res.ok) throw new Error(`Error del servidor: ${res.statusText}`);
      const data = await res.json();
      if (data && data.length > 0) {
        setAllSchedules(data);
        setHorarios(data[0]);
        setCurrentIndex(0);
      } else {
        setAllSchedules([]);
        setHorarios([]);
      }
    } catch (error) {
      console.error("Error obteniendo horarios:", error);
      alert(`No se pudieron cargar los horarios: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUserDataAndSchedules(filtro);
  }, [filtro]);

  // --- LÓGICA DE BOTONES (MODIFICADA) ---
  const handleNextCombination = async () => {
    if (allSchedules.length <= 1) {
      alert("No hay más combinaciones únicas.");
      return;
    }
    if (attemptsRemaining > 0) {
      const nextIndex = (currentIndex + 1) % allSchedules.length;
      setCurrentIndex(nextIndex);
      setHorarios(allSchedules[nextIndex]);

      const newAttempts = attemptsRemaining - 1;
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { error } = await supabase
          .from('profiles')
          .update({ attempts_remaining: newAttempts })
          .eq('id', user.id);
        
        if (error) {
            console.error("Error updating attempts:", error);
        } else {
            setAttemptsRemaining(newAttempts);
        }
      }
    } else {
      setIsPaymentModalOpen(true);
    }
  };

  const handleDownloadPDF = () => {
    const scheduleToCapture = scheduleTableRef.current;
    if (!scheduleToCapture) {
        alert("No se puede encontrar el horario para descargar.");
        return;
    }
    const options = { scale: 2, useCORS: true, backgroundColor: '#ffffff' };
    window.html2canvas(scheduleToCapture, options).then(canvas => {
        const imgData = canvas.toDataURL('image/png');
        const pdf = new window.jspdf.jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();
        const imgProps = pdf.getImageProperties(imgData);
        const imgWidth = imgProps.width;
        const imgHeight = imgProps.height;
        const pdfRatio = pdfWidth / pdfHeight;
        const imgRatio = imgWidth / imgHeight;
        let finalWidth, finalHeight, x, y;
        const margin = 40;
        if (imgRatio > pdfRatio) {
            finalWidth = pdfWidth - margin;
            finalHeight = finalWidth / imgRatio;
        } else {
            finalHeight = pdfHeight - margin;
            finalWidth = finalHeight * imgRatio;
        }
        x = (pdfWidth - finalWidth) / 2;
        y = (pdfHeight - finalHeight) / 2;
        pdf.addImage(imgData, 'PNG', x, y, finalWidth, finalHeight);
        pdf.save("mi_horario_universitario.pdf");
    });
  };

  // --- LÓGICA DE RENDERIZADO ---
  const dias = ["LUNES", "MARTES", "MIERCOLES", "JUEVES", "VIERNES", "SABADO"];
  const START_HOUR = 7;
  const END_HOUR = 23; 
  const totalMinutesInRange = (END_HOUR - START_HOUR) * 60;

  const timeToMinutes = (time) => {
    const [h, m] = time.split(':').map(Number);
    return h * 60 + m;
  };

  const dynamicTimeSlots = useMemo(() => {
    if (!horarios || horarios.length === 0) return { timeLabels: [], hourLines: [] };
    const timePoints = new Set();
    horarios.forEach(clase => {
        timePoints.add(clase.hora_inicio);
        timePoints.add(clase.hora_fin);
    });
    const sortedTimePoints = Array.from(timePoints).sort((a, b) => a.localeCompare(b));
    const timeLabels = sortedTimePoints.map(hora => ({
        label: hora,
        top: ((timeToMinutes(hora) - START_HOUR * 60) / totalMinutesInRange) * 100
    }));
    const hourLines = [];
    for (let i = START_HOUR; i < END_HOUR; i++) {
        hourLines.push({ top: (((i - START_HOUR) * 60) / totalMinutesInRange) * 100, isDashed: false });
        hourLines.push({ top: (((i - START_HOUR) * 60 + 30) / totalMinutesInRange) * 100, isDashed: true });
    }
    return { timeLabels, hourLines };
  }, [horarios]);

  const courseColors = useMemo(() => {
    const colors = ['#8ecae6', '#2a9d8f', '#e9c46a', '#f4a261', '#e76f51', '#b5838d', '#00b4d8', '#ef476f', '#ffbe0b', '#fb5607'];
    const colorMap = new Map();
    let colorIndex = 0;
    const getBaseCourseName = (fullName) => fullName.split(' - ')[0];
    const uniqueCourses = new Set((horarios || []).map(h => getBaseCourseName(h.nombreCurso)));
    uniqueCourses.forEach(courseName => {
        if (!colorMap.has(courseName)) {
            colorMap.set(courseName, colors[colorIndex % colors.length]);
            colorIndex++;
        }
    });
    return colorMap;
  }, [horarios]);

  return (
    <>
      <div className={styles.pageContainer}>
        <button onClick={onVolver} className={`${styles.btn} ${styles.btnVolver}`}>⬅️ Volver a Planificar</button>
        
        <div className={styles.controlPanel}>
          <div className={styles.filterGroup}>
            <label htmlFor="filtro">Preferencias de Horario</label>
            <select id="filtro" value={filtro} onChange={(e) => setFiltro(e.target.value)} className={styles.select}>
              <option value="todos">Sin preferencias</option>
              <option value="manana">Priorizar mañanas</option>
              <option value="tarde">Priorizar tardes</option>
              <option value="dia_libre_LUNES">Lunes libre</option>
              <option value="dia_libre_MARTES">Martes libre</option>
              <option value="dia_libre_MIERCOLES">Miércoles libre</option>
              <option value="dia_libre_JUEVES">Jueves libre</option>
              <option value="dia_libre_VIERNES">Viernes libre</option>
            </select>
          </div>
          <div className={styles.attemptsCounter}>
            <span>Intentos Restantes:</span>
            <strong>{attemptsRemaining ?? '...'}</strong>
          </div>
          <div className={styles.actionGroup}>
              <button onClick={handleNextCombination} className={`${styles.btn} ${styles.btnPrimary}`} disabled={loading || allSchedules.length <= 1}>
                  🔄 Otra Combinación
              </button>
              <button onClick={handleDownloadPDF} className={`${styles.btn} ${styles.btnSecondary}`} disabled={loading || !Array.isArray(horarios) || horarios.length === 0}>
                  📄 Descargar PDF
              </button>
          </div>
        </div>

        {loading && <div className={styles.loader}>Buscando la mejor combinación...</div>}

        {!loading && Array.isArray(horarios) && horarios.length > 0 && (
          <div className={styles.scheduleContainer} ref={scheduleTableRef}>
            <h3 className={styles.scheduleTitle}>Horario Sugerido ({currentIndex + 1} / {allSchedules.length})</h3>
            <div className={styles.scheduleGrid}>
                  <div className={styles.headerCorner}></div>
                  {dias.map(dia => <div key={dia} className={styles.headerCell}>{dia}</div>)}
                  <div className={styles.timeColumn}>
                      {dynamicTimeSlots.timeLabels.map(({ label, top }) => (
                          <div key={label} className={styles.timeCell} style={{ top: `${top}%` }}>
                              <span>{label}</span>
                          </div>
                      ))}
                  </div>
                  {dias.map(dia => (
                      <div key={dia} className={styles.dayColumn}>
                          {dynamicTimeSlots.hourLines.map(({ top, isDashed }) => (
                              <div key={top} className={isDashed ? styles.rowLineDashed : styles.rowLine} style={{ top: `${top}%` }}></div>
                          ))}
                          {horarios
                              .filter(clase => clase.dia.toUpperCase().trim() === dia)
                              .map((clase, index) => {
                                  const startMinutes = timeToMinutes(clase.hora_inicio) - (START_HOUR * 60);
                                  const endMinutes = timeToMinutes(clase.hora_fin) - (START_HOUR * 60);
                                  const durationMinutes = endMinutes - startMinutes;
                                  const topPercent = (startMinutes / totalMinutesInRange) * 100;
                                  const heightPercent = (durationMinutes / totalMinutesInRange) * 100;
                                  const baseCourseName = clase.nombreCurso.split(' - ')[0];
                                  const positionStyle = {
                                      top: `${topPercent}%`,
                                      height: `${heightPercent}%`,
                                      backgroundColor: courseColors.get(baseCourseName)
                                  };
                                  return (
                                      <div 
                                          key={`${clase.nrc}-${index}`}
                                          className={styles.classCell} 
                                          style={positionStyle}
                                      >
                                          <strong>{clase.nombreCurso}</strong>
                                          <span>{`${clase.hora_inicio} - ${clase.hora_fin}`}</span>
                                          <small>{clase.tipo_componente} - {clase.nombre_grupo}</small>
                                          <small>NRC: {clase.nrc} | {clase.aula}</small>
                                      </div>
                                  );
                              })}
                      </div>
                  ))}
            </div>
          </div>
        )}

        {!loading && (!Array.isArray(horarios) || horarios.length === 0) && (
          <div className={styles.emptyState}>
              <h3>🚫 Sin resultados</h3>
              <p>No se encontró ninguna combinación de horario con los filtros actuales. Prueba con otra preferencia.</p>
          </div>
        )}
      </div>
      
      <PaymentModal 
        isOpen={isPaymentModalOpen} 
        onClose={() => setIsPaymentModalOpen(false)} 
      />
    </>
  );
}
