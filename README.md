# Pastelería Mishky · Catálogo Web, Favoritos y Checkout

Catálogo interactivo de tortas, postres peruanos, panes y galletas artesanales hecho con **HTML5 semántico, CSS3 y JavaScript Vanilla (ES6+)**.

## Características

- **Carga dinámica y validación:** Lectura de `data/productos.json` mediante `fetch`, validación de esquema y pantallas de carga (*skeletons*).
- **Filtros combinados en tiempo real:** Filtrado por categoría sincronizado con `location.hash`, buscador por nombre, ordenamiento (destacados, precio, A–Z), disponibilidad de stock y lista de favoritos.
- **Lista de Favoritos (*Wishlist*):** Guardado persistente en `localStorage` con sincronización entre tarjetas, modal de detalle y filtro dedicado.
- **Carrito y *Checkout* personalizado:** Control estricto de inventario, modalidad de entrega (recojo en tienda o delivery en Cusco), fecha de entrega validada, dedicatoria personalizada, cupones de descuento (`MISHKY10` y `DULCE15`) y envío directo del pedido por **WhatsApp**.

## Ejecución local

Al usar `fetch()` para cargar el archivo JSON, ábrelo mediante un servidor local (por ejemplo, **Live Server** en VS Code o `python -m http.server 8000`).
