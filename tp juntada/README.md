# Coordinador de Juntadas

> **Prototipo de Solución — Proyecto Design Thinking**  
> **Integrantes:** Simon Yocco, Lucas Martino, Mateo Bertin, Pedro Ravanelli, Salvador Tosar, Robertino Joffre.

---

## 📋 Resumen del Proyecto

Este prototipo web aborda la fricción organizativa previa al coordinar un encuentro grupal, con foco en dos dolores validados empíricamente:
1. **La dificultad de definir la sede (76,1% de resistencia a recibir en el domicilio):** El principal obstáculo es la carga posterior de limpieza y orden.
2. **Confirmaciones tardías (59,5%):** Falta de visibilidad y demoras en las respuestas en los canales de mensajería.

---

## 🛠️ Estructura de la Solución

* **Panel multi-evento:** Permite gestionar múltiples juntadas y crear nuevas reuniones.
* **Votación ágil de fechas y confirmación en un toque:** Sin necesidad de registro de usuario.
* **Rotación equitativa de anfitrión:** Sugiere de forma ordenada a quién le corresponde recibir según el historial previo, con opción de punto de encuentro neutro.
* **Compromiso de orden y distribución de tareas:** Incorpora una responsabilidad explícita de orden mutuo final para no recargar al anfitrión.
* **División de gastos y liquidación de deudas:** Permite cargar gastos (quién pagó y cuánto), calcula el costo por persona y define exactamente quién le transfiere a quién para saldar.
* **Integración con WhatsApp:** Genera un resumen formal con detalles, cuentas y enlace directo para compartir en el canal habitual del grupo.

---

## 🚀 Ejecución

* **Directa:** Abrir `index.html` en cualquier navegador web.
* **Servidor local (Node.js):**
  ```bash
  npm start
  ```
  Acceso en: `http://localhost:3000`
