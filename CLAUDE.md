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
- **Plazo para confirmar** (deadline): se define al crear la juntada: 6 h, 12 h, 1 día, 2 días, 3 días (por defecto) o 1 semana. La cuenta regresiva muestra días y horas si falta más de un día.
- **Sede:** modo casa (anfitrión) o punto neutro (Bar / Plaza). Rotación equitativa: le toca al integrante que menos veces fue anfitrión en otras juntadas (sin contar al actual; en empate, el que se sumó primero). Se puede ceder el turno o elegir a mano. El organizador es el anfitrión inicial.
- **Tareas:** cada tarea tiene un cupo máximo de responsables. Al crearla se puede asignar un responsable (cualquier integrante) o dejarla sin asignar. La tarea de limpieza (`isPact`) es el compromiso de orden mutuo: existe siempre, para no recargar al anfitrión.
- **Gastos:** el monto es siempre > 0. Cada gasto tiene quién pagó y entre quiénes se divide (por defecto, todos). La liquidación minimiza la cantidad de transferencias (greedy deudores/acreedores) y redondea a pesos. El costo por persona se promedia sobre los confirmados.
- **Compartir:** resumen para WhatsApp con fecha, sede, confirmados, gastos y transferencias, más el link y el código de la juntada.
- **Código para unirse:** cada juntada tiene un código único de 6 caracteres (`A-Z` y `2-9`, sin I, O, 0 ni 1 para no confundirlos), generado al crearla. Cualquier usuario con sesión lo escribe en "Tus Juntadas" y queda como integrante (`POST /api/events/join-by-code`). Al escribirlo se ignoran mayúsculas/minúsculas, espacios y guiones. Si ya era integrante, no cambia nada.

## Decisiones tomadas (no re-discutir)
- **Backend Node + Express con MySQL** (ya implementado) (el grupo usa MySQL Workbench), usando **Sequelize** como ORM (modelos y asociaciones en Sequelize, driver `mysql2`; nada de SQL armado a mano).
- **Login con usuario y contraseña. Todo requiere cuenta:** quien entra por el link de invitación se registra o inicia sesión y queda sumado a la juntada.
- **Orden de trabajo:** backend + login primero; después, las mejoras restantes del informe de testing.
- **Seguridad:** contraseñas siempre hasheadas (bcrypt); acceso a datos por Sequelize (si alguna vez hace falta SQL crudo, con replacements, nunca concatenando); credenciales en `.env`, que nunca se commitea.

## Testing con usuarios
Documentos: `Plan_de_testing_JUNTAPP.pdf` y `Informe_resultados_testing_JUNTAPP.pdf`.
Las 4 tareas del test: confirmar asistencia, proponer otro día y horario, anotar "comprar hielo y carbón" asignada a un amigo, registrar un gasto de $12.000 en bebidas.

**Hecho (todas las mejoras del informe):**
- Barra de navegación por secciones.
- Cartel visible con el estado de mi asistencia, botón elegido resaltado y aviso al confirmar.
- Votación de fechas y "proponer otra" como pasos 1 y 2 separados. El botón de proponer está desactivado hasta tener día y hora.
- Lista de tareas separada del recuadro para anotar una nueva (con responsable). El botón de agregar está desactivado si el campo está vacío.
- El monto del gasto no admite negativos (`min="0"`, bloquea "-" y corrige a 0).
- Gasto asociado a una tarea (opcional). Al elegirla, completa el concepto, y la tarea muestra cuánto se gastó.

**Próximo paso:** volver a testear con usuarios nuevos para ver si se resolvieron los problemas.

## Convenciones del front
- Nada de `alert()`: los mensajes van con `showToast(mensaje, "success" | "error" | "info")`.
- `flash(id)` resalta un bloque que acaba de cambiar.
- Los botones de un formulario quedan desactivados hasta que los datos estén completos (`updateFormButtons`).

## Estructura y cómo correr
```
tp juntada/
├── server.js            arranque: conecta a MySQL, sincroniza tablas y levanta createApp()
├── public/              front (lo único que sirve Express como archivos)
│   ├── index.html       vistas: login, lista de juntadas y detalle (secciones desplegables)
│   ├── js/api.js        wrapper de fetch (lanza ApiError con status y code)
│   ├── js/app.js        render y acciones; cada acción llama a la API y re-renderiza con la respuesta
│   └── css/styles.css
└── src/
    ├── app.js           arma Express (middlewares, /api, estáticos, errorHandler)
    ├── config/          env.js (lee .env) y database.js (Sequelize + crea la base si no existe)
    ├── routes/          URL → controlador. index.js monta /auth y /events (con requireAuth)
    ├── middlewares/     requireAuth, errorHandler, apiNotFound
    ├── controllers/     HTTP: leen req, llaman a un servicio, responden. Uno por área
    ├── services/        reglas de negocio y permisos. Uno por área (auth, event, date, task, host, expense) + accessService
    ├── repositories/    acceso a datos con Sequelize. Uno por agregado + transaction.js
    ├── models/          modelos Sequelize y asociaciones
    ├── views/           eventPresenter.js: entidad de la base → JSON del front (funciones puras)
    ├── errors/          AppError y subclases (BadRequest, Unauthorized, Forbidden, NotFound, Conflict)
    ├── utils/           validators, sessionToken (JWT), sessionCookie, joinCode
    ├── seeders/         sampleData.js: datos de prueba (usuarios del grupo + juntadas de ejemplo)
    └── scripts/         seed.js: reinicia la base (BORRA todo y carga los datos de prueba)
                         buildMockup.js: arma mockup/JUNTAPP_mockup.html
mockup/
├── mock-api.js          reemplaza a public/js/api.js: misma interfaz, todo en memoria
└── JUNTAPP_mockup.html  generado: index.html + styles.css + mock-api.js + app.js en un solo archivo
```
- Desde `tp juntada/`: `npm install`, copiar `.env.example` a `.env`, `npm start` → http://localhost:3000
- **Al arrancar,** `server.js` crea la base si no existe y las tablas que falten. **Si no hay ningún usuario, carga los datos de prueba solo** (`seedIfEmpty`). Nunca borra ni pisa datos. Se desactiva con `SEED_SAMPLE_DATA=false` en `.env`, y en producción (`NODE_ENV=production`) no se cargan nunca.
- **Mockup sin persistencia** (para entregar o mostrar sin instalar nada): `npm run mockup` genera `mockup/JUNTAPP_mockup.html`. Usa el front real con `mock-api.js`, que copia las reglas de `src/services` y el JSON de `eventPresenter`. **Si cambia una regla de negocio o una ruta, actualizar también `mock-api.js`; si cambia el front, volver a correr `npm run mockup`** y commitear el HTML generado.
- `npm run seed`: reinicia la base. **Borra todo** y vuelve a cargar los datos de prueba.
- Los datos de prueba se definen en un solo lugar: `src/seeders/sampleData.js`. Si se cambian ahí, se aplican tanto al arranque como al seed.
- **Cambios en los modelos:** `sequelize.sync()` crea las tablas que faltan, pero no agrega columnas a las que ya existen. Si se agrega un campo a un modelo, hay que volver a correr `npm run seed`, que borra todo, o hacer el `ALTER TABLE` a mano en Workbench.

## Usuarios de prueba
Se crean solos la primera vez que arranca la app con la base vacía, o con `npm run seed`. Están definidos en `tp juntada/src/seeders/sampleData.js` y son solo para desarrollo y demos.

| Usuario     | Nombre visible   | Contraseña   |
|-------------|------------------|--------------|
| `simon`     | Simon Yocco      | `juntapp123` |
| `lucas`     | Lucas Martino    | `juntapp123` |
| `mateo`     | Mateo Bertin     | `juntapp123` |
| `pedro`     | Pedro Ravanelli  | `juntapp123` |
| `salvador`  | Salvador Tosar   | `juntapp123` |
| `robertino` | Robertino Joffre | `juntapp123` |

Juntadas de ejemplo:
- **"Juntada de Fin de Semana":** organiza `salvador`. Están los 6 usuarios. Anfitrión: `lucas`.
- **"Asado de Fin de Mes":** organiza `mateo`. Integrantes: `mateo`, `simon`, `salvador` y `lucas`. **`pedro` y `robertino` no son parte**, así que sirven para probar unirse con el código o con el link.

Cualquier usuario creado desde "Crear cuenta" también sirve para probar.

## Arquitectura en capas (respetarla siempre)
```
routes → controllers → services → repositories → models → MySQL
                          ↓
                        views (presentación)
```
- **routes:** solo asocian URL y método a un controlador (y middlewares). Nada de lógica.
- **controllers:** traducen HTTP. Leen `req.params`, `req.body` y `req.user`, llaman a **un** método de servicio y responden con el status. No validan reglas ni tocan modelos o repositorios. La cookie de sesión se maneja acá (`authController`).
- **services:** toda regla de negocio, validación de datos y permiso. No conocen `req` ni `res`: reciben datos simples (`eventId`, `userId`, objeto con los datos) y devuelven datos o lanzan un `AppError`. Las transacciones se abren acá con `runInTransaction` y se pasan a los repositorios como `{ transaction }`.
- **repositories:** únicas que usan los modelos de Sequelize. Sin reglas de negocio. Aceptan `options` para transacciones.
- **views:** funciones puras que arman el JSON de respuesta; no consultan la base.
- Las dependencias van solo hacia abajo: un controlador nunca importa un repositorio, un servicio nunca importa `express` ni un modelo.
- Los errores se lanzan como `AppError` desde los servicios; `middlewares/errorHandler` los convierte en `{ error, code }` con su status. Express 5 propaga solo los errores de funciones `async`.
- **Para agregar un endpoint:** método en el repositorio (si hace falta un dato nuevo) → método en el servicio con validaciones y permisos → función en el controlador → línea en el archivo de rutas.

## Cómo está hecha la API
- Todas las rutas de `/api/events` requieren sesión, y las de una juntada además ser integrante (`accessService.requireMember`). Si no lo es, se responde 403 con `code: "NOT_MEMBER"` y el front llama a `POST /:id/join`.
- Las rutas que modifican devuelven la juntada actualizada (`eventService.buildView`), así el front re-renderiza con un solo pedido.
- En el JSON, las personas se identifican por `userId`; el nombre sale de `attendees` (en el front, `nameOf(userId)`).
- Los ids de juntada son UUID, para que el link de invitación no se pueda adivinar.
- Todo texto que escriben los usuarios se inserta con `escapeHtml()`.
- Permisos: solo el organizador elimina la juntada; solo el anfitrión actual cede el turno; un gasto lo pueden borrar quien lo cargó, quien pagó o el organizador.

## Convenciones
- Textos de la interfaz en español rioplatense, con voseo ("Ingresá", "Proponé").
- Estilos con Tailwind (CDN) + `css/styles.css`. Mantener la estética sobria actual (slate, emerald).
- Un commit por mejora.
