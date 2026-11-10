# JUNTAPP — Coordinador de Juntadas

Prototipo de solución del proyecto de Design Thinking (materia **Diseño de Sistemas**).
Grupo: Simon Yocco, Lucas Martino, Mateo Bertin, Pedro Ravanelli, Salvador Tosar, Robertino Joffre.

**Público:** jóvenes de 18 a 25 años que se juntan seguido con amigos y organizan por WhatsApp.
**Uso principal desde el celular:** diseñar siempre mobile-first.

## Problemas que resuelve (encuesta, 42 respuestas)
- **76,1%** no quiere ser sede por la carga de limpieza y orden posterior.
- **59,5%** sufre confirmaciones tardías y falta de visibilidad en los chats.
- El menú y la postergación **no** resultaron problemas reales: no agregar funciones para eso.

## Reglas de negocio
- **Asistencia:** estados `yes` (Asistiré), `maybe` (En duda), `no` (No voy). Una sola respuesta por persona; se puede cambiar.
- **Fechas:** cada persona puede votar varias opciones (toggle). Cualquier miembro puede proponer una fecha nueva, que queda votada por quien la propone. No se duplican etiquetas. La fecha elegida es la más votada.
- **Plazo para confirmar** (deadline): se define al crear la juntada (4, 6, 12 o 24 h).
- **Sede:** modo casa (anfitrión) o punto neutro (Bar / Plaza). Rotación equitativa: le toca al integrante que menos veces fue anfitrión en otras juntadas (sin contar al actual; en empate, el que se sumó primero). Se puede ceder el turno o elegir a mano. El organizador es el anfitrión inicial.
- **Tareas:** cada tarea tiene un cupo máximo de responsables. Al crearla se puede asignar un responsable (cualquier integrante) o dejarla sin asignar. La tarea de limpieza (`isPact`) es el compromiso de orden mutuo: existe siempre, para no recargar al anfitrión.
- **Gastos:** el monto es siempre > 0. Cada gasto tiene quién pagó y entre quiénes se divide (por defecto, todos). La liquidación minimiza la cantidad de transferencias (greedy deudores/acreedores) y redondea a pesos. El costo por persona se promedia sobre los confirmados.
- **Compartir:** resumen para WhatsApp con fecha, sede, confirmados, gastos y transferencias, más el link a la juntada.

## Decisiones tomadas (no re-discutir)
- **Backend Node + Express con MySQL** (ya implementado) (el grupo usa MySQL Workbench), usando **Sequelize** como ORM (modelos y asociaciones en Sequelize, driver `mysql2`; nada de SQL armado a mano).
- **Login con usuario y contraseña. Todo requiere cuenta:** quien entra por el link de invitación se registra o inicia sesión y queda sumado a la juntada.
- **Orden de trabajo:** backend + login primero; después, las mejoras restantes del informe de testing.
- **Seguridad:** contraseñas siempre hasheadas (bcrypt); acceso a datos por Sequelize (si alguna vez hace falta SQL crudo, con replacements, nunca concatenando); credenciales en `.env`, que nunca se commitea.

## Testing con usuarios
Documentos: `Plan_de_testing_JUNTAPP.pdf` y `Informe_resultados_testing_JUNTAPP.pdf`.
Las 4 tareas del test: confirmar asistencia, proponer otro día y horario, anotar "comprar hielo y carbón" asignada a un amigo, registrar un gasto de $12.000 en bebidas.

**Hecho:**
- Barra de navegación por secciones.
- Proponer fecha nueva, separado de la votación.
- Asignar responsable al anotar una tarea.

**Pendiente:**
- Cartel visible al confirmar la asistencia.
- Botón de proponer fecha desactivado si el campo está vacío.
- Separar mejor la lista de tareas del formulario para anotar una nueva.
- Que el input del monto no permita negativos.
- Asociar un gasto a una tarea.

La base ya tiene `expenses.task_id` para asociar un gasto a una tarea; falta la parte del front.

## Estructura y cómo correr
```
tp juntada/
├── server.js            Express: API en /api + archivos de public/ (solo public/ es accesible)
├── public/
│   ├── index.html       vistas: login, lista de juntadas y detalle (secciones desplegables)
│   ├── js/api.js        wrapper de fetch (lanza ApiError con status y code)
│   ├── js/app.js        render y acciones; cada acción llama a la API y re-renderiza con la respuesta
│   └── css/styles.css
└── src/
    ├── db.js            Sequelize + crea la base si no existe
    ├── models/index.js  modelos y asociaciones
    ├── auth.js          JWT en cookie httpOnly, middleware requireAuth
    ├── errors.js        HttpError + manejador central
    ├── eventView.js     arma el JSON de una juntada (misma forma que usa el front)
    ├── eventService.js  reglas compartidas: crear juntada, proponer fecha, próximo anfitrión
    ├── routes/          auth.js y events.js
    └── seed.js          datos de ejemplo (BORRA todo)
```
- Desde `tp juntada/`: `npm install`, copiar `.env.example` a `.env`, `npm start` → http://localhost:3000
- `npm run seed`: carga a los 6 integrantes (contraseña `juntapp123`) y dos juntadas de ejemplo.

## Cómo está hecha la API
- Todas las rutas de `/api/events` requieren sesión, y las de una juntada además ser integrante (`requireMember`). Si no lo es, se responde 403 con `code: "NOT_MEMBER"` y el front llama a `POST /:id/join`.
- Las rutas que modifican devuelven la juntada actualizada (`buildEventView`), así el front re-renderiza con un solo pedido.
- En el JSON, las personas se identifican por `userId`; el nombre sale de `attendees` (en el front, `nameOf(userId)`).
- Los ids de juntada son UUID, para que el link de invitación no se pueda adivinar.
- Todo texto que escriben los usuarios se inserta con `escapeHtml()`.
- Permisos: solo el organizador elimina la juntada; solo el anfitrión actual cede el turno; un gasto lo pueden borrar quien lo cargó, quien pagó o el organizador.

## Convenciones
- Textos de la interfaz en español rioplatense, con voseo ("Ingresá", "Proponé").
- Estilos con Tailwind (CDN) + `css/styles.css`. Mantener la estética sobria actual (slate, emerald).
- Un commit por mejora.
