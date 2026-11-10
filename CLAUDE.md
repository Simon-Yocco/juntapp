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
- **Sede:** modo casa (anfitrión) o punto neutro (Bar / Plaza). Rotación equitativa: le toca al que menos veces fue anfitrión. Se puede ceder el turno o elegir a mano.
- **Tareas:** cada tarea tiene un cupo máximo de responsables. Al crearla se puede asignar un responsable (cualquier integrante) o dejarla sin asignar. La tarea de limpieza (`isPact`) es el compromiso de orden mutuo: existe siempre, para no recargar al anfitrión.
- **Gastos:** el monto es siempre > 0. Cada gasto tiene quién pagó y entre quiénes se divide (por defecto, todos). La liquidación minimiza la cantidad de transferencias (greedy deudores/acreedores) y redondea a pesos. El costo por persona se promedia sobre los confirmados.
- **Compartir:** resumen para WhatsApp con fecha, sede, confirmados, gastos y transferencias, más el link a la juntada.

## Decisiones tomadas (no re-discutir)
- Se agrega un **backend Node + Express con MySQL** (el grupo usa MySQL Workbench), usando **Sequelize** como ORM (modelos y asociaciones en Sequelize, driver `mysql2`; nada de SQL armado a mano).
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

**Bugs conocidos:**
- El link compartido no funciona en otro dispositivo, porque los datos están en `localStorage`. Se resuelve con el backend.
- El mensaje de WhatsApp usa la primera fecha y no la más votada.
- El contador del plazo queda en "Calculando plazo..." hasta 1 minuto después de abrir una juntada.
- Se inserta HTML sin escapar en `innerHTML` (nombres, títulos, conceptos).

## Estructura y cómo correr
```
tp juntada/
├── index.html      vistas: lista de juntadas y detalle (secciones desplegables)
├── js/app.js       toda la lógica (render, votos, sede, tareas, gastos, WhatsApp)
├── css/styles.css
└── server.js       servidor estático en el puerto 3000
```
- Desde `tp juntada/`: `npm start` → http://localhost:3000
- **Estado actual:** solo front; los datos viven en `localStorage`.

## Convenciones
- Textos de la interfaz en español rioplatense, con voseo ("Ingresá", "Proponé").
- Estilos con Tailwind (CDN) + `css/styles.css`. Mantener la estética sobria actual (slate, emerald).
- Un commit por mejora.
