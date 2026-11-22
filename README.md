# Pastelería Mishky · Catálogo Web y Pedidos

Catálogo interactivo de tortas, postres peruanos, panes y galletas artesanales hecho con **HTML5 semántico, CSS3 y JavaScript Vanilla (ES6+)**.

## Características

- **Carga dinámica y validación:** Lectura de `data/productos.json` mediante `fetch`, validación de esquema y pantallas de carga (*skeletons*).
- **Filtros combinados en tiempo real:** Filtrado por categoría sincronizado con `location.hash`, buscador por nombre, ordenamiento (destacados, precio, A–Z) y disponibilidad de stock.
- **Vista detallada accesible:** Modal nativo (`<dialog>`) con navegación por teclado (`Enter` y `Esc`) y retorno de foco.
- **Carrito de pedidos persistente (`localStorage`):** Selección de productos con control estricto de inventario, cálculo automático de subtotales/total en soles (`PEN`) y generación directa de mensaje de pedido para **WhatsApp**.

## Ejecución local

Al usar `fetch()` para cargar el archivo JSON, ábrelo mediante un servidor local (por ejemplo, **Live Server** en VS Code o `python -m http.server 8000`).
