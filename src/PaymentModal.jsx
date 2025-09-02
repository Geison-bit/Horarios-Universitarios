import React, { useState } from 'react';
import styles from './PaymentModal.module.css';
import { supabase } from './supabaseClient';
import { toast } from 'react-hot-toast';

// =================================================================
// IMPORTANTE: Importamos tu imagen QR estática.
// Asegúrate de que la imagen se llame 'yape-qr.jpg' y esté en 'src/imagenes/'
// =================================================================
import yapeQrImageUrl from './imagenes/Imagen de WhatsApp 2025-08-16 a las 13.29.33_395ca218.jpg';

export default function PaymentModal({ isOpen, onClose }) {
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [operationId, setOperationId] = useState('');
  const [isConfirming, setIsConfirming] = useState(false);

  if (!isOpen) return null;

  const plans = [
    { id: '3_soles', name: '3 Intentos', price: 3.00, attempts: 3 },
    { id: '6_soles', name: '7 Intentos', price: 6.00, attempts: 7 },
    { id: '10_soles', name: '10 Intentos Premium', price: 10.00, attempts: 10, isPremium: true },
  ];

  const handleConfirmPayment = async () => {
    if (!selectedPlan) {
      toast.error('Por favor, primero selecciona un plan.');
      return;
    }
    if (!operationId.trim()) {
      toast.error('Por favor, ingresa el N° de operación de tu Yape.');
      return;
    }

    setIsConfirming(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No se encontró usuario.');

      const { error } = await supabase.from('payments').insert({
        user_id: user.id,
        plan_selected: selectedPlan.id,
        yape_operation_id: operationId.trim(),
        status: 'pending'
      });

      if (error) throw error;

      toast.success('¡Gracias! Tu pago ha sido registrado y se verificará pronto.');
      onClose();
      
    } catch (error) {
      toast.error(`Error al registrar el pago: ${error.message}`);
    } finally {
      setIsConfirming(false);
    }
  };

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <button onClick={onClose} className={styles.closeButton}>&times;</button>
        <h2>¡Se te acabaron los intentos!</h2>
        <p>Elige un paquete para seguir generando más combinaciones de horarios.</p>
        
        <div className={styles.content}>
          <div className={styles.plans}>
            {plans.map(plan => (
              <div 
                key={plan.id}
                className={`${styles.planCard} ${plan.isPremium ? styles.premium : ''} ${selectedPlan?.id === plan.id ? styles.selected : ''}`}
                onClick={() => setSelectedPlan(plan)}
              >
                <strong>{plan.name}</strong>
                <span>S/ {plan.price.toFixed(2)}</span>
              </div>
            ))}
          </div>

          <div className={styles.qrSection}>
            {/* Ahora mostramos siempre tu imagen QR estática */}
            <img 
              src={yapeQrImageUrl} 
              alt="Código QR de Yape" 
              className={styles.qrImage} // Usamos una clase para darle estilo
            />
            
            {/* El texto cambia según si se ha seleccionado un plan */}
            {!selectedPlan ? (
              <p>Selecciona un plan y escanea el QR para pagar.</p>
            ) : (
              <p>Escanea para pagar <strong>S/ {selectedPlan.price.toFixed(2)}</strong> con Yape</p>
            )}

            <input 
              type="text" 
              placeholder="Ingresa el N° de operación" 
              className={styles.input}
              value={operationId}
              onChange={(e) => setOperationId(e.target.value)}
            />
            <button 
              onClick={handleConfirmPayment} 
              className={styles.confirmButton}
              disabled={isConfirming}
            >
              {isConfirming ? 'Confirmando...' : 'Confirmar Pago'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
