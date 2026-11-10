# Coordinador de Juntadas (JUNTAPP)

> **Prototipo de Solución — Proyecto Design Thinking**
> **Integrantes:** Simon Yocco, Lucas Martino, Mateo Bertin, Pedro Ravanelli, Salvador Tosar, Robertino Joffre.

---

## 📋 Resumen del Proyecto

Este prototipo web aborda la fricción organizativa previa al coordinar un encuentro grupal, con foco en dos dolores validados empíricamente:
1. **La dificultad de definir la sede (76,1% de resistencia a recibir en el domicilio):** El principal obstáculo es la carga posterior de limpieza y orden.
2. **Confirmaciones tardías (59,5%):** Falta de visibilidad y demoras en las respuestas en los canales de mensajería.

---

## 🛠️ Estructura de la Solución

* **Cuentas de usuario:** registro e inicio de sesión con usuario y contraseña. Quien entra por el link de invitación se registra y queda sumado a la juntada.
* **Panel multi-evento:** Permite gestionar múltiples juntadas y crear nuevas reuniones.
* **Votación de fechas y confirmación en un toque**, con la opción de proponer una fecha nueva.
* **Rotación equitativa de anfitrión:** Sugiere a quién le corresponde recibir según cuántas veces recibió cada uno, con opción de punto de encuentro neutro.
* **Compromiso de orden y distribución de tareas:** responsabilidad explícita de orden mutuo final y tareas con responsable.
* **División de gastos y liquidación de deudas:** calcula el costo por persona y quién le transfiere a quién para saldar.
* **Integración con WhatsApp:** resumen con detalles, cuentas y link para compartir en el grupo.

---

## 🧱 Tecnologías

* **Front:** HTML + JavaScript + Tailwind (carpeta `public/`).
* **Back:** Node.js + Express (API en `/api`).
* **Base de datos:** MySQL con Sequelize como ORM.
* **Sesiones:** contraseñas hasheadas con bcrypt y sesión en cookie httpOnly (JWT).

### Arquitectura en capas del backend

```
Pedido HTTP
   │
routes/         URL → controlador
   │
controllers/    traduce HTTP: lee el pedido, llama al servicio, responde
   │
services/       reglas de negocio, validaciones y permisos ──► views/ (arma el JSON de respuesta)
   │
repositories/   acceso a datos con Sequelize
   │
models/         tablas y relaciones
   │
MySQL
```
Cada capa solo usa la de abajo. Transversales: `middlewares/` (sesión y errores), `errors/`, `utils/` y `config/`.

```
tp juntada/
├── server.js            arranque (conexión a MySQL + servidor)
├── public/              front (index.html, js/, css/)
└── src/
    ├── app.js           armado de Express
    ├── config/          variables de entorno y conexión a la base
    ├── routes/          rutas de /api/auth y /api/events
    ├── middlewares/     sesión obligatoria y manejo de errores
    ├── controllers/     auth, juntadas, fechas, tareas, sede, gastos
    ├── services/        reglas de negocio por área
    ├── repositories/    consultas a la base por entidad
    ├── models/          modelos Sequelize
    ├── views/           presentación de las respuestas
    ├── errors/          errores de la aplicación
    ├── utils/           validaciones y sesión
    └── scripts/seed.js  datos de ejemplo
```

---

## 🚀 Cómo correrlo

### 1. Requisitos
* [Node.js](https://nodejs.org/) 18 o más nuevo.
* [MySQL Server](https://dev.mysql.com/downloads/installer/) corriendo (con Workbench para ver los datos).

### 2. Configurar
Dentro de `tp juntada/`:
```bash
npm install
```
Copiá `.env.example` como `.env` y completá la contraseña de tu usuario de MySQL. La base `juntapp` y sus tablas se crean solas al iniciar.

### 3. (Opcional) Cargar datos de ejemplo
```bash
npm run seed
```
⚠️ **Borra todas las tablas** y carga a los integrantes del grupo con dos juntadas de ejemplo.
Usuarios: `simon`, `lucas`, `mateo`, `pedro`, `salvador`, `robertino` — contraseña: `juntapp123`.

### 4. Iniciar
```bash
npm start
```
Acceso en: `http://localhost:3000`
