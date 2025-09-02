import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient'; // Asegúrate que este archivo exporta tu cliente de Supabase
import AuthModal from './AuthModal'; // El modal de autenticación
import HorarioForm from './HorarioForm'; // Tu formulario de cursos rediseñado
import HorarioGenerator from './HorarioGenerator'; // Tu parrilla de horarios rediseñada
import { Toaster, toast } from 'react-hot-toast';

// =================================================================
// COMPONENTE PRINCIPAL: App
// Gestiona la sesión y la vista actual.
// =================================================================
export default function App() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [vista, setVista] = useState('formulario');

  useEffect(() => {
    const getSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);
      setLoading(false);
    };
    
    getSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  const mostrarGenerador = () => setVista('generador');
  const mostrarFormulario = () => setVista('formulario');
  
  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
        toast.error('Error al cerrar sesión.');
    } else {
        toast.success('Has cerrado sesión.');
    }
  }
  
  if (loading) {
    return <div style={{textAlign: 'center', padding: '50px', fontFamily: 'Inter, sans-serif'}}>Cargando...</div>;
  }

  return (
    <>
      <Toaster position="top-right" reverseOrder={false} />
      <div style={{ filter: !session ? 'blur(5px)' : 'none', transition: 'filter 0.3s' }}>
        <header style={{ padding: '20px 40px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', borderBottom: '1px solid #e5e7eb', backgroundColor: 'white' }}>
            <h1 style={{ fontSize: '1.5em', fontWeight: 'bold', fontFamily: 'Inter, sans-serif' }}>Planificador de Horarios 🗓️</h1>
            {session && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                <span style={{ color: '#4b5563', fontFamily: 'Inter, sans-serif' }}>{session.user.email}</span>
                <button 
                    onClick={handleLogout} 
                    style={{ 
                        padding: '8px 12px', 
                        cursor: 'pointer', 
                        border: '1px solid #d1d5db', 
                        borderRadius: '6px',
                        background: '#f9fafb',
                        fontFamily: 'Inter, sans-serif'
                    }}
                >
                    Cerrar Sesión
                </button>
              </div>
            )}
        </header>
        
        {/* Renderiza la vista actual solo si hay una sesión activa */}
        {session && (
            vista === 'formulario' ? (
              <HorarioForm onMostrarHorarios={mostrarGenerador} />
            ) : (
              <HorarioGenerator onVolver={mostrarFormulario} />
            )
        )}
      </div>
      <AuthModal isOpen={!session} />
    </>
  );
}