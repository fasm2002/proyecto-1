// ============================================================= 
// Pastelería Mishky · Catálogo dinámico + Carrito de Pedidos
// ============================================================= 

const RUTA_DATOS = "data/productos.json"; 
const TODAS = "Todas"; 
const CLAVE_STORAGE = "mishky_pedido_v1";
const TELEFONO_PEDIDOS = "51984000111";

// --- Referencias al DOM --------------------------------------- 
const contFiltros = document.querySelector("#filtros"); 
const grilla = document.querySelector("#grilla"); 
const estado = document.querySelector("#estado"); 
const plantilla = document.querySelector("#tpl-producto"); 

const inputBuscador = document.querySelector("#buscador");
const selectOrden = document.querySelector("#orden");
const checkStock = document.querySelector("#solo-stock");

const modalDetalle = document.querySelector("#modal-detalle");
const modalImg = document.querySelector("#modal-img");
const modalCategoria = document.querySelector("#modal-categoria");
const modalTitulo = document.querySelector("#modal-titulo");
const modalDescripcion = document.querySelector("#modal-descripcion");
const modalPrecio = document.querySelector("#modal-precio");
const modalStock = document.querySelector("#modal-stock");
const modalBtnAgregar = document.querySelector("#modal-btn-agregar");
const btnCerrarModal = document.querySelector("#modal-cerrar");

// Referencias del Carrito de Pedidos
const btnAbrirPedido = document.querySelector("#btn-abrir-pedido");
const contadorPedido = document.querySelector("#contador-pedido");
const modalPedido = document.querySelector("#modal-pedido");
const btnCerrarPedido = document.querySelector("#pedido-cerrar");
const pedidoVacio = document.querySelector("#pedido-vacio");
const listaPedido = document.querySelector("#lista-pedido");
const pedidoResumen = document.querySelector("#pedido-resumen");
const pedidoTotal = document.querySelector("#pedido-total");
const inputClienteNombre = document.querySelector("#cliente-nombre");
const btnVaciarPedido = document.querySelector("#btn-vaciar-pedido");
const btnWhatsapp = document.querySelector("#btn-whatsapp");
const toastEl = document.querySelector("#toast");

// --- Estado Global -------------------------------------------- 
let productos = []; 
let categoriaActiva = TODAS; 
let tarjetaDisparadora = null;
let productoEnModal = null;
let pedido = []; // Array de { id, cantidad }
let temporizadorToast = null;

const soles = new Intl.NumberFormat("es-PE", { style: "currency", currency: "PEN" }); 

// --- 1. Tarjetas Fantasma (Skeleton Screen) -------------------
function mostrarEsqueleto() {
  grilla.setAttribute("aria-busy", "true");
  const fragmento = document.createDocumentFragment();
  for (let i = 0; i < 8; i++) {
    const li = document.createElement("li");
    li.className = "tarjeta tarjeta--fantasma";
    li.setAttribute("aria-hidden", "true");
    fragmento.append(li);
  }
  grilla.replaceChildren(fragmento);
}

// --- 2. Validación de Productos --------------------------------
function validarProductos(datos) {
  const idsVistos = new Set();
  const extValidas = /\.(jpg|jpeg|png|webp)$/i;

  return datos.filter((p, index) => {
    const idValido = typeof p.id === "number" && !idsVistos.has(p.id);
    const precioValido = typeof p.precio === "number" && p.precio > 0;
    const stockValido = Number.isInteger(p.stock) && p.stock >= 0;
    const catValida = typeof p.categoria === "string" && p.categoria.trim() !== "";
    const imgValida = typeof p.imagen === "string" && extValidas.test(p.imagen);

    const esValido = idValido && precioValido && stockValido && catValida && imgValida;

    if (esValido) {
      idsVistos.add(p.id);
      return true;
    } else {
      console.warn(`Producto descartado en el índice ${index} por datos inválidos:`, p);
      return false;
    }
  });
}

// --- 3. Carga de datos Fetch ---------------------------------- 
async function cargarProductos() { 
  mostrarEsqueleto();
  const respuesta = await fetch(RUTA_DATOS); 
  if (!respuesta.ok) { 
    throw new Error(`No se pudo acceder a ${RUTA_DATOS} (HTTP ${respuesta.status})`); 
  } 
  const datos = await respuesta.json(); 
  if (!Array.isArray(datos)) { 
    throw new Error("El archivo JSON debe contener un arreglo de productos."); 
  } 
  return validarProductos(datos); 
} 

// --- 4. Gestión de Categorías y location.hash ------------------
function obtenerCategorias(lista) { 
  return [TODAS, ...new Set(lista.map((p) => p.categoria))]; 
} 

function obtenerCategoriaDeHash(categoriasValidas) {
  const hash = decodeURIComponent(location.hash.replace("#", "").trim());
  return categoriasValidas.includes(hash) ? hash : TODAS;
}

function actualizarHashURL(cat) {
  const nuevoHash = cat === TODAS ? location.pathname : `#${encodeURIComponent(cat)}`;
  history.replaceState(null, "", nuevoHash);
}

// --- 5. Botones de Filtro y Función actualizarContadores() ---- 
function renderizarFiltros(categorias) { 
  const fragmento = document.createDocumentFragment(); 
  categorias.forEach((cat) => { 
    const boton = document.createElement("button"); 
    boton.type = "button"; 
    boton.className = "filtro"; 
    boton.dataset.categoria = cat; 
    boton.setAttribute("aria-pressed", String(cat === categoriaActiva)); 
    fragmento.append(boton); 
  }); 
  contFiltros.replaceChildren(fragmento); 
  actualizarContadores();
} 

function actualizarContadores() {
  const termino = inputBuscador.value.trim().toLowerCase();
  const soloDisponibles = checkStock.checked;

  const botones = contFiltros.querySelectorAll(".filtro");
  botones.forEach((boton) => {
    const cat = boton.dataset.categoria;
    const conteo = productos.filter((p) => {
      const coincideCat = cat === TODAS || p.categoria === cat;
      const coincideBusqueda = p.nombre.toLowerCase().includes(termino);
      const coincideStock = !soloDisponibles || p.stock > 0;
      return coincideCat && coincideBusqueda && coincideStock;
    }).length;

    boton.textContent = `${cat} (${conteo})`;
  });
}

// --- 6. Gestión del Carrito (localStorage + Stock) -------------
function cargarPedidoDesdeStorage() {
  try {
    const guardado = JSON.parse(localStorage.getItem(CLAVE_STORAGE));
    if (!Array.isArray(guardado)) return [];
    return guardado.filter(
      (item) => typeof item.id === "number" && Number.isInteger(item.cantidad) && item.cantidad > 0
    );
  } catch {
    return [];
  }
}

function sincronizarPedidoConStock() {
  pedido = cargarPedidoDesdeStorage()
    .map((item) => {
      const prod = productos.find((p) => p.id === item.id);
      if (!prod || prod.stock <= 0) return null;
      return { id: prod.id, cantidad: Math.min(item.cantidad, prod.stock) };
    })
    .filter(Boolean);

  guardarPedidoEnStorage();
}

function guardarPedidoEnStorage() {
  try {
    localStorage.setItem(CLAVE_STORAGE, JSON.stringify(pedido));
  } catch (err) {
    console.warn("No se pudo guardar el pedido en localStorage:", err);
  }
}

function obtenerCantidadEnPedido(id) {
  const item = pedido.find((i) => i.id === id);
  return item ? item.cantidad : 0;
}

function configurarBotonAgregar(boton, producto) {
  const enPedido = obtenerCantidadEnPedido(producto.id);
  boton.classList.toggle("btn-agregar--en-pedido", enPedido > 0);

  if (producto.stock === 0) {
    boton.textContent = "Agotado";
    boton.disabled = true;
  } else if (enPedido >= producto.stock) {
    boton.textContent = `Máx. disponible (${enPedido})`;
    boton.disabled = true;
  } else if (enPedido > 0) {
    boton.textContent = `Agregar (+1) · En pedido: ${enPedido}`;
    boton.disabled = false;
  } else {
    boton.textContent = "Agregar al pedido";
    boton.disabled = false;
  }
}

function mostrarToast(mensaje) {
  toastEl.textContent = mensaje;
  toastEl.classList.add("toast--visible");
  clearTimeout(temporizadorToast);
  temporizadorToast = setTimeout(() => {
    toastEl.classList.remove("toast--visible");
  }, 2200);
}

function agregarAlPedido(id) {
  const prod = productos.find((p) => p.id === id);
  if (!prod || prod.stock <= 0) return;

  const existente = pedido.find((item) => item.id === id);
  if (existente) {
    if (existente.cantidad >= prod.stock) {
      mostrarToast(`Solo hay ${prod.stock} unidades disponibles.`);
      return;
    }
    existente.cantidad += 1;
  } else {
    pedido.push({ id: prod.id, cantidad: 1 });
  }

  guardarPedidoEnStorage();
  actualizarInterfazPedido();
  mostrarToast(`Agregado: ${prod.nombre}`);
}

function cambiarCantidadPedido(id, delta) {
  const prod = productos.find((p) => p.id === id);
  const idx = pedido.findIndex((item) => item.id === id);
  if (!prod || idx === -1) return;

  const nuevaCant = pedido[idx].cantidad + delta;
  if (nuevaCant <= 0) {
    pedido.splice(idx, 1);
  } else if (nuevaCant <= prod.stock) {
    pedido[idx].cantidad = nuevaCant;
  }

  guardarPedidoEnStorage();
  actualizarInterfazPedido();
}

function vaciarPedido() {
  pedido = [];
  guardarPedidoEnStorage();
  actualizarInterfazPedido();
}

function actualizarEnlaceWhatsapp(total) {
  const nombre = inputClienteNombre.value.trim();
  const lineas = pedido.map((item) => {
    const prod = productos.find((p) => p.id === item.id);
    const subtotal = prod.precio * item.cantidad;
    return `- ${item.cantidad}x ${prod.nombre} (${soles.format(subtotal)})`;
  });

  let mensaje = `Hola Pastelería Mishky, quisiera hacer el siguiente pedido:\n\n${lineas.join("\n")}\n\nTotal estimado: ${soles.format(total)}`;
  if (nombre) {
    mensaje += `\nCliente: ${nombre}`;
  }

  btnWhatsapp.href = `https://wa.me/${TELEFONO_PEDIDOS}?text=${encodeURIComponent(mensaje)}`;
}

function renderizarModalPedido() {
  if (pedido.length === 0) {
    pedidoVacio.hidden = false;
    pedidoResumen.hidden = true;
    listaPedido.replaceChildren();
    return;
  }

  pedidoVacio.hidden = true;
  pedidoResumen.hidden = false;

  let totalGeneral = 0;
  const fragmento = document.createDocumentFragment();

  pedido.forEach((item) => {
    const prod = productos.find((p) => p.id === item.id);
    if (!prod) return;

    const subtotal = prod.precio * item.cantidad;
    totalGeneral += subtotal;

    const li = document.createElement("li");
    li.className = "pedido__item";
    li.dataset.id = prod.id;

    const info = document.createElement("div");
    info.className = "pedido__item-info";

    const nombre = document.createElement("p");
    nombre.className = "pedido__item-nombre";
    nombre.textContent = prod.nombre;

    const detalle = document.createElement("p");
    detalle.className = "pedido__item-subtotal";
    detalle.textContent = `${soles.format(prod.precio)} c/u · Subtotal: ${soles.format(subtotal)}`;

    info.append(nombre, detalle);

    const controles = document.createElement("div");
    controles.className = "pedido__controles";

    const btnMenos = document.createElement("button");
    btnMenos.type = "button";
    btnMenos.className = "btn-cant";
    btnMenos.dataset.accion = "restar";
    btnMenos.setAttribute("aria-label", `Quitar una unidad de ${prod.nombre}`);
    btnMenos.textContent = "−";

    const cant = document.createElement("span");
    cant.className = "pedido__cant-valor";
    cant.textContent = String(item.cantidad);

    const btnMas = document.createElement("button");
    btnMas.type = "button";
    btnMas.className = "btn-cant";
    btnMas.dataset.accion = "sumar";
    btnMas.disabled = item.cantidad >= prod.stock;
    btnMas.setAttribute("aria-label", `Agregar una unidad de ${prod.nombre}`);
    btnMas.textContent = "+";

    const btnEliminar = document.createElement("button");
    btnEliminar.type = "button";
    btnEliminar.className = "btn-eliminar-item";
    btnEliminar.dataset.accion = "eliminar";
    btnEliminar.setAttribute("aria-label", `Eliminar ${prod.nombre} del pedido`);
    btnEliminar.innerHTML = "&times;";

    controles.append(btnMenos, cant, btnMas, btnEliminar);
    li.append(info, controles);
    fragmento.append(li);
  });

  listaPedido.replaceChildren(fragmento);
  pedidoTotal.textContent = soles.format(totalGeneral);
  actualizarEnlaceWhatsapp(totalGeneral);
}

function actualizarInterfazPedido() {
  const totalUnidades = pedido.reduce((acc, item) => acc + item.cantidad, 0);
  contadorPedido.textContent = String(totalUnidades);

  // Actualizar botones en las tarjetas visibles
  grilla.querySelectorAll(".tarjeta").forEach((tarjeta) => {
    const prod = productos.find((p) => p.id === Number(tarjeta.dataset.id));
    const btn = tarjeta.querySelector(".btn-agregar");
    if (prod && btn) configurarBotonAgregar(btn, prod);
  });

  // Actualizar botón dentro del modal de detalle si está abierto
  if (productoEnModal) {
    configurarBotonAgregar(modalBtnAgregar, productoEnModal);
  }

  // Actualizar contenido del modal de pedido
  renderizarModalPedido();
}

// --- 7. Creación de Tarjetas Dinámicas ------------------------ 
function crearTarjeta(p) { 
  const nodo = plantilla.content.cloneNode(true); 
  const tarjeta = nodo.querySelector(".tarjeta"); 
  const img = nodo.querySelector("img"); 
  const etiqueta = nodo.querySelector(".etiqueta"); 
  const btnAgregar = nodo.querySelector(".btn-agregar");

  tarjeta.dataset.id = p.id;

  img.addEventListener("load", () => img.classList.add("foto--cargada"));
  img.onerror = () => { 
    img.onerror = null; 
    img.src = "img/sin-imagen.jpg"; 
    img.srcset = "img/sin-imagen.jpg 600w";
    img.classList.add("foto--cargada");
  }; 

  img.src = p.imagen; 
  img.srcset = `${p.imagen} 600w`;
  img.alt = p.nombre; 

  if (img.complete && img.naturalWidth > 0) {
    img.classList.add("foto--cargada");
  }

  nodo.querySelector(".tarjeta__categoria").textContent = p.categoria; 
  nodo.querySelector(".tarjeta__nombre").textContent = p.nombre; 
  nodo.querySelector(".tarjeta__descripcion").textContent = p.descripcion; 
  nodo.querySelector(".tarjeta__precio").textContent = soles.format(p.precio); 
  nodo.querySelector(".tarjeta__porciones").textContent = 
    p.porciones > 1 ? `${p.porciones} porciones` : "1 unidad"; 

  if (p.stock === 0) { 
    etiqueta.textContent = "Agotado"; 
    etiqueta.classList.add("etiqueta--agotado"); 
    etiqueta.hidden = false; 
    tarjeta.classList.add("tarjeta--agotado"); 
  } else if (p.destacado) { 
    etiqueta.textContent = "Favorito"; 
    etiqueta.hidden = false; 
  } 

  configurarBotonAgregar(btnAgregar, p);
  return nodo; 
} 

// --- 8. Aplicar Filtros Combinados y Ordenamiento --------------
function obtenerListaFiltradaYOrdenada() {
  const termino = inputBuscador.value.trim().toLowerCase();
  const soloDisponibles = checkStock.checked;

  let filtrados = productos.filter((p) => {
    const coincideCat = categoriaActiva === TODAS || p.categoria === categoriaActiva;
    const coincideBusqueda = p.nombre.toLowerCase().includes(termino);
    const coincideStock = !soloDisponibles || p.stock > 0;
    return coincideCat && coincideBusqueda && coincideStock;
  });

  const criterio = selectOrden.value;
  const copia = [...filtrados];

  if (criterio === "precio-asc") {
    copia.sort((a, b) => a.precio - b.precio);
  } else if (criterio === "precio-desc") {
    copia.sort((a, b) => b.precio - a.precio);
  } else if (criterio === "nombre-asc") {
    copia.sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
  } else if (criterio === "destacados") {
    copia.sort((a, b) => (b.destacado ? 1 : 0) - (a.destacado ? 1 : 0));
  }

  return copia;
}

// --- 9. Renderizar Catálogo en pantalla ------------------------- 
function renderizarCatalogo() { 
  const lista = obtenerListaFiltradaYOrdenada();
  actualizarContadores();

  if (lista.length === 0) { 
    grilla.replaceChildren(); 
    estado.textContent = "No se encontraron productos con los filtros aplicados."; 
    return; 
  } 

  const fragmento = document.createDocumentFragment(); 
  lista.forEach((p) => fragmento.append(crearTarjeta(p))); 
  grilla.replaceChildren(fragmento); 

  const complemento = categoriaActiva === TODAS ? "en total" : `en «${categoriaActiva}»`; 
  estado.textContent = `Mostrando ${lista.length} productos ${complemento}.`; 
} 

// --- 10. Delegación y Registro de Eventos ---------------------- 

// Filtros por categoría
contFiltros.addEventListener("click", (evento) => { 
  const boton = evento.target.closest(".filtro"); 
  if (!boton || boton.dataset.categoria === categoriaActiva) return; 

  categoriaActiva = boton.dataset.categoria; 
  actualizarHashURL(categoriaActiva);

  contFiltros.querySelectorAll(".filtro").forEach((b) => { 
    b.setAttribute("aria-pressed", String(b === boton)); 
  }); 

  renderizarCatalogo(); 
}); 

// Buscador, Ordenamiento y Checkbox de Stock
inputBuscador.addEventListener("input", renderizarCatalogo);
selectOrden.addEventListener("change", renderizarCatalogo);
checkStock.addEventListener("change", renderizarCatalogo);

// Delegación sobre Grilla (Agregar al pedido o abrir Modal de detalle)
grilla.addEventListener("click", (e) => {
  const tarjeta = e.target.closest(".tarjeta");
  if (!tarjeta) return;

  const id = Number(tarjeta.dataset.id);

  // Si hizo clic en el botón "Agregar al pedido", no abrir el modal
  if (e.target.closest(".btn-agregar")) {
    agregarAlPedido(id);
    return;
  }

  const prod = productos.find((p) => p.id === id);
  if (!prod) return;

  tarjetaDisparadora = tarjeta;
  abrirModal(prod);
});

// Soporte para interacción con teclado (Enter) en la tarjeta
grilla.addEventListener("keydown", (e) => {
  if (e.target.closest(".btn-agregar")) return;
  if (e.key === "Enter") {
    const tarjeta = e.target.closest(".tarjeta");
    if (tarjeta) tarjeta.click();
  }
});

// Modal de Detalle
function abrirModal(p) {
  productoEnModal = p;
  modalImg.onerror = () => {
    modalImg.onerror = null;
    modalImg.src = "img/sin-imagen.jpg";
  };
  modalImg.src = p.imagen;
  modalImg.alt = p.nombre;
  modalCategoria.textContent = p.categoria;
  modalTitulo.textContent = p.nombre;
  modalDescripcion.textContent = p.descripcion;
  modalPrecio.textContent = soles.format(p.precio);
  modalStock.textContent = p.stock > 0 ? `Stock disponible: ${p.stock} unid.` : "Sin stock disponible";

  configurarBotonAgregar(modalBtnAgregar, p);
  modalDetalle.showModal();
}

modalBtnAgregar.addEventListener("click", () => {
  if (productoEnModal) {
    agregarAlPedido(productoEnModal.id);
  }
});

btnCerrarModal.addEventListener("click", () => modalDetalle.close());

modalDetalle.addEventListener("click", (e) => {
  if (e.target === modalDetalle) modalDetalle.close();
});

modalDetalle.addEventListener("close", () => {
  productoEnModal = null;
  if (tarjetaDisparadora) {
    tarjetaDisparadora.focus();
  }
});

// Modal de Pedido (Carrito)
btnAbrirPedido.addEventListener("click", () => {
  renderizarModalPedido();
  modalPedido.showModal();
});

btnCerrarPedido.addEventListener("click", () => modalPedido.close());

modalPedido.addEventListener("click", (e) => {
  if (e.target === modalPedido) modalPedido.close();
});

modalPedido.addEventListener("close", () => {
  btnAbrirPedido.focus();
});

listaPedido.addEventListener("click", (e) => {
  const boton = e.target.closest("button[data-accion]");
  if (!boton) return;

  const itemEl = boton.closest(".pedido__item");
  const id = Number(itemEl.dataset.id);
  const accion = boton.dataset.accion;

  if (accion === "sumar") cambiarCantidadPedido(id, 1);
  if (accion === "restar") cambiarCantidadPedido(id, -1);
  if (accion === "eliminar") cambiarCantidadPedido(id, -Infinity);
});

btnVaciarPedido.addEventListener("click", vaciarPedido);

inputClienteNombre.addEventListener("input", () => {
  const total = pedido.reduce((acc, item) => {
    const prod = productos.find((p) => p.id === item.id);
    return acc + (prod ? prod.precio * item.cantidad : 0);
  }, 0);
  actualizarEnlaceWhatsapp(total);
});

// --- 11. Inicialización con Manejo de Errores ------------------ 
async function iniciar() { 
  estado.className = "estado";
  estado.textContent = "Cargando productos…"; 

  try { 
    productos = await cargarProductos(); 
    sincronizarPedidoConStock();

    const categorias = obtenerCategorias(productos);
    categoriaActiva = obtenerCategoriaDeHash(categorias);

    renderizarFiltros(categorias); 
    renderizarCatalogo(); 
    actualizarInterfazPedido();
  } catch (error) { 
    console.error(error); 
    estado.className = "estado estado--error"; 
    estado.replaceChildren();

    const textoError = document.createTextNode("No se pudo cargar el catálogo. ");
    const btnReintentar = document.createElement("button");
    btnReintentar.type = "button";
    btnReintentar.className = "btn-reintentar";
    btnReintentar.textContent = "Reintentar";
    btnReintentar.addEventListener("click", iniciar);

    estado.append(textoError, btnReintentar);
  } finally { 
    grilla.setAttribute("aria-busy", "false"); 
  } 
} 

iniciar();
