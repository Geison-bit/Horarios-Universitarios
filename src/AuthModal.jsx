import React, { useState } from 'react';
import { supabase } from './supabaseClient';
import styles from './Auth.module.css'; // Asegúrate de tener este archivo CSS
import { toast } from 'react-hot-toast';

// Este componente ahora solo exporta el modal, como debe ser.
export default function AuthModal({ isOpen }) {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);

  const handleLogin = async (event) => {
    event.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) toast.error(error.message);
    setLoading(false);
  };
  
  const handleSignUp = async (event) => {
    event.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) {
      toast.error(error.message);
    } else {
      toast.success('¡Registro exitoso! Revisa tu correo para verificar tu cuenta.');
    }
    setLoading(false);
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({ provider: 'google' });
    if (error) {
      toast.error(error.message);
      setLoading(false);
    }
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div className={styles.overlay}>
      <div className={styles.modalCard}>
        <h1 className={styles.header}>{isSignUp ? 'Crea tu Cuenta' : 'Inicia Sesión'}</h1>
        <p className={styles.description}>
          Para guardar tus cursos y generar horarios necesitas una cuenta.
        </p>
        <form onSubmit={isSignUp ? handleSignUp : handleLogin}>
          <div className={styles.inputGroup}>
            <label htmlFor="email" className={styles.label}>Correo Electrónico</label>
            <input id="email" className={styles.input} type="email" placeholder="tu.correo@example.com" value={email} required onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className={styles.inputGroup}>
            <label htmlFor="password" className={styles.label}>Contraseña</label>
            <input id="password" className={styles.input} type="password" placeholder="••••••••" value={password} required minLength="6" onChange={(e) => setPassword(e.target.value)} />
          </div>
          <div className={styles.buttonGroup}>
            <button type="submit" className={styles.primaryButton} disabled={loading}>
              {loading ? <span>Cargando...</span> : <span>{isSignUp ? 'Registrarse' : 'Iniciar Sesión'}</span>}
            </button>
          </div>
        </form>
        <div className={styles.divider}><span className={styles.dividerText}>O</span></div>
        <div className={styles.buttonGroup}>
          <button onClick={handleGoogleLogin} className={styles.googleButton} disabled={loading}>
            <svg style={{ marginRight: '10px' }} width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M19.8398 10.22C19.8398 9.54 19.7798 8.85 19.6598 8.18H10.1998V11.85H15.6398C15.4198 13.06 14.7398 14.11 13.7298 14.78V17.25H16.6398C18.5598 15.46 19.8398 13.06 19.8398 10.22Z" fill="#4285F4"></path><path d="M10.1998 20C12.9398 20 15.2398 19.09 16.6398 17.25L13.7298 14.78C12.8298 15.37 11.6198 15.74 10.1998 15.74C7.60984 15.74 5.43984 14.04 4.64984 11.71H1.61984V14.28C3.04984 17.44 6.38984 20 10.1998 20Z" fill="#34A853"></path><path d="M4.6498 11.71C4.4498 11.12 4.3298 10.48 4.3298 9.82C4.3298 9.16 4.4498 8.51 4.6498 7.93V5.36H1.6198C0.829797 6.88 0.329797 8.59 0.329797 9.82C0.329797 11.05 0.829797 12.76 1.6198 14.28L4.6498 11.71Z" fill="#FBBC05"></path><path d="M10.1998 4.28C11.7098 4.28 13.0198 4.82 14.0698 5.79L16.7098 3.22C15.2298 1.83 12.9398 0.909999 10.1998 0.909999C6.38984 0.909999 3.04984 3.55 1.61984 6.72L4.64984 9.29C5.43984 6.96 7.60984 4.28 10.1998 4.28Z" fill="#EA4335"></path></svg>
            Continuar con Google
          </button>
        </div>
        <div className={styles.toggleAuth}>
          <p>
            {isSignUp ? '¿Ya tienes una cuenta? ' : '¿No tienes una cuenta? '}
            <span onClick={() => setIsSignUp(!isSignUp)} className={styles.toggleLink}>
              {isSignUp ? 'Inicia Sesión' : 'Regístrate'}
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}
