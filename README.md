# Pastelería Mishky · Catálogo Web

Catálogo interactivo de tortas, postres peruanos, panes y galletas artesanales hecho con **HTML5 semántico, CSS3 y JavaScript Vanilla (ES6+)**.

## Características

- **Carga dinámica** desde `data/productos.json` mediante `fetch` con validación de datos y pantallas de carga (*skeletons*).
- **Filtros combinados en tiempo real:** por categoría (sincronizado con `location.hash`), buscador por nombre, ordenamiento (destacados, precio, A–Z) y disponibilidad de stock.
- **Vista detallada accesible:** modal nativo (`<dialog>`) con navegación por teclado (`Enter` y `Esc`) y retorno de foco.

## Ejecución local

Al usar `fetch()` para leer el archivo JSON, ábrelo mediante un servidor local (por ejemplo, la extensión **Live Server** en VS Code o `python -m http.server 8000`) en lugar de hacer doble clic directo sobre el archivo HTML.
