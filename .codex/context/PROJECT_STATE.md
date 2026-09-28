# Project State

## Purpose

ARDU es una aplicación personal, mobile-first, para registrar compras de supermercado, reutilizar un catálogo de productos y convertir cada compra finalizada en un histórico privado de precios. Su identidad visual incluye una ardilla como mascota. El flujo central permite iniciar una compra, seleccionar tienda, buscar o crear productos, registrar precio y cantidad, observar subtotales y total en tiempo real, finalizar la compra y consultar después el histórico por compra, producto y tienda.

## Stack

- Frontend: React 19, TypeScript y Vite.
- UI: CSS propio responsive con perfil `futuristic`; iconos `lucide-react`.
- Acceso a datos: `@supabase/supabase-js` desde una capa de servicios del frontend.
- Backend propio: ninguno.
- BaaS: Supabase.
- Persistencia: PostgreSQL administrado por Supabase.
- Authentication: Supabase Auth con email y contraseña; no hay registro público en la interfaz.
- Authorization: PostgreSQL Row Level Security (RLS) basada en `auth.uid()`.
- Pruebas frontend: Vitest, Testing Library y jsdom.

## Main structure

- `frontend/src/auth`: sesión persistente y pantalla de login.
- `frontend/src/components`: shell, formularios y piezas visuales reutilizables.
- `frontend/src/pages`: Inicio, Compra, Historial, Detalle de compra, Productos y Detalle de producto.
- `frontend/src/services`: único límite de acceso a Supabase para productos, tiendas, compras e histórico.
- `frontend/src/lib`: cliente Supabase y respaldo local del borrador.
- `frontend/src/types`: tipos de dominio y contrato de base de datos.
- `supabase/migrations`: esquema PostgreSQL, restricciones, índices, RLS, vistas, triggers y RPCs versionados.

Los componentes no hacen consultas Supabase directamente. Las páginas consumen servicios, los servicios mapean filas PostgreSQL al modelo de UI y PostgreSQL conserva las invariantes que cruzan el límite de confianza.

## Data model and ownership

Las tablas principales son `stores`, `products`, `shopping_trips` y `shopping_items`. Todas contienen `user_id uuid` vinculado a `auth.users(id)`. Las claves foráneas compuestas incluyen `user_id` para impedir relaciones entre datos de propietarios diferentes incluso si un cliente manipula identificadores.

`products` separa `presentation_quantity` y `presentation_unit`; las unidades iniciales son `g`, `kg`, `ml`, `L` y `unidades`. `shopping_items` separa `unit_price` de `quantity_purchased`. El precio usa `numeric(14,2)` y nunca floating point. Cada línea guarda un snapshot mínimo de nombre y presentación, rellenado por un trigger a partir de un producto activo del mismo usuario, para que editar el catálogo no reescriba una compra histórica.

No se almacenan subtotal ni total. `shopping_trip_summaries` los deriva de `unit_price * quantity_purchased`, eliminando el riesgo de valores calculados desincronizados. `product_price_history` expone precios únicamente de compras finalizadas. Ambas vistas usan `security_invoker` para conservar RLS sobre las tablas base.

## Authentication and authorization

Sin sesión no se montan las rutas de la aplicación. Supabase persiste y renueva la sesión del navegador. La anon key es configuración pública permitida; nunca se utiliza `SUPABASE_SERVICE_ROLE_KEY` en el frontend.

RLS está habilitado en las cuatro tablas. Existen políticas explícitas SELECT, INSERT, UPDATE y DELETE para el propietario autenticado. Las líneas solo pueden insertarse, cambiarse o eliminarse mientras su compra esté en estado `draft`; una compra `completed` es inmutable. Los privilegios de columna impiden cambiar `user_id`, snapshots o `status` directamente desde el cliente.

`finalize_shopping_trip` es una función transaccional `security definer` que valida `auth.uid()`, bloquea la compra, exige al menos una línea y cambia el estado a `completed`. `ensure_initial_stores` crea de forma idempotente D1, Ara, Éxito, Olímpica, Carulla e Ísimo para cada usuario. Se eligieron tiendas iniciales por usuario porque mantiene ownership y RLS simples; duplicar seis nombres pequeños evita un modelo híbrido global/personal.

## Durable business rules

- Subtotal: `unit_price * quantity_purchased`.
- Total: suma de subtotales calculada en frontend para respuesta inmediata y en PostgreSQL para consultas.
- `unit_price` no puede ser negativo y `quantity_purchased` debe ser un entero mayor que cero.
- Una compra requiere una tienda del mismo usuario y no puede finalizarse vacía.
- Solo puede existir una compra `draft` por usuario.
- Una compra finalizada y sus líneas no se pueden modificar ni eliminar.
- El histórico de precios proviene de `shopping_items`; no existe una tabla separada de price history.
- La comparación por tienda significa “último precio registrado”, nunca precio actual externo.
- La moneda inicial es COP y la presentación usa formato colombiano.

## Current workflows

La UI incluye login, dashboard basado en datos reales, catálogo y creación rápida de productos, tiendas iniciales y personalizadas, compra reanudable, búsqueda/autocompletado, precio, stepper de cantidad, subtotal y total inmediatos, eliminación de líneas, finalización, historial de compras, detalle histórico, estadísticas por producto, gráfica de evolución y último precio por tienda.

La compra actual se guarda en Supabase. Mientras se edita, React actualiza inmediatamente y agrupa escrituras rápidas durante una pausa corta. Un respaldo en `localStorage` protege cambios aún no sincronizados y se reconcilia al volver; se elimina al finalizar o cerrar sesión.

## Configuration and commands

El frontend requiere exclusivamente `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` en `frontend/.env`; `frontend/.env.example` documenta ambas sin valores reales.

- Instalar: `cd frontend && npm install`
- Desarrollo: `npm run dev`
- Pruebas: `npm test`
- Lint: `npm run lint`
- Typecheck/build: `npm run build`
- Base de datos: aplicar las migraciones de `supabase/migrations` mediante `supabase db push` o el SQL Editor del proyecto.

## Important known issues

La migración debe aplicarse y debe crearse al menos un usuario en Supabase Auth antes del primer acceso. El repositorio no contiene credenciales ni un proyecto Supabase enlazado. Sin variables de entorno, la aplicación muestra una pantalla de configuración en lugar de intentar conectarse.
