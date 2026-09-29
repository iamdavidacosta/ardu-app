# ARDU

Aplicación personal, mobile-first, para registrar compras de supermercado y construir un histórico privado de precios. Su mascota es una ardilla: ARDU recuerda lo importante para tu próxima compra.

## Configuración

1. Crea un proyecto en Supabase.
2. Aplica las migraciones de `supabase/migrations` en orden con Supabase CLI (`supabase db push`) o desde el SQL Editor. La primera crea el esquema, la segunda añade el catálogo colombiano y los códigos de barras, la tercera carga los datos y la cuarta habilita las contribuciones al catálogo compartido.
3. Configura Supabase Auth para permitir registro con correo y contraseña si deseas crear cuentas desde la interfaz.
4. Copia `frontend/.env.example` a `frontend/.env` y configura:

```dotenv
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_ANON_KEY=tu-anon-key
```

La aplicación no utiliza ni necesita una service role key en el navegador.

## Catálogo de Open Food Facts

El catálogo compartido conserva únicamente `code`, `product_name` y `quantity`. Para generar la migración de datos completa desde la búsqueda paginada de Colombia:

```bash
node scripts/import-openfoodfacts-colombia.mjs net
```

El API puede restringir las solicitudes automatizadas. Si sucede, descarga el CSV de Open Food Facts y genera el seed localmente. El importador filtra `countries_tags=en:colombia`, toma `code` y `quantity`, y elige el primer nombre disponible entre español, idioma del producto e inglés:

```bash
node scripts/import-openfoodfacts-colombia.mjs --csv insumos/openfoodfacts_export.csv 6794
```

El número final es el recuento esperado del archivo recibido; el script rechaza un archivo incompleto o códigos duplicados. `insumos/` está excluido de Git; solo se versiona el SQL con las tres columnas necesarias. Aplica `202609290002_seed_colombia_catalog.sql` después de `202609290001_catalog_and_barcodes.sql` y luego `202609290003_catalog_contributions.sql`. No uses la anon key del frontend para importar el seed masivo. La aplicación consulta Open Food Facts por código cuando un producto no existe y lo agrega al catálogo compartido; los usuarios autenticados pueden corregir nombre y presentación, con historial de cambios. Los datos proceden de [Open Food Facts](https://world.openfoodfacts.org/) y se atribuyen bajo ODbL.

No reapliques el seed después de recibir correcciones de usuarios: su `ON CONFLICT DO UPDATE` reemplazaría esos datos compartidos.

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
