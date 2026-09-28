# ARDU

Aplicación personal, mobile-first, para registrar compras de supermercado y construir un histórico privado de precios. Su mascota es una ardilla: ARDU recuerda lo importante para tu próxima compra.

## Configuración

1. Crea un proyecto en Supabase.
2. Aplica [`supabase/migrations/202609280001_initial_schema.sql`](supabase/migrations/202609280001_initial_schema.sql) con Supabase CLI (`supabase db push`) o desde el SQL Editor.
3. Crea el usuario que utilizará la aplicación en Supabase Auth; la interfaz no expone registro público.
4. Copia `frontend/.env.example` a `frontend/.env` y configura:

```dotenv
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_ANON_KEY=tu-anon-key
```

La aplicación no utiliza ni necesita una service role key en el navegador.

## Desarrollo

```bash
cd frontend
npm install
npm run dev
```

Validación local:

```bash
npm test
npm run lint
npm run build
```
