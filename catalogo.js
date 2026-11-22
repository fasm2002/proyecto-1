// ============================================================= 
// Pastelería Mishky · Catálogo dinámico optimizado
// ============================================================= 

const RUTA_DATOS = "data/productos.json"; 
const TODAS = "Todas"; 

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
const btnCerrarModal = document.querySelector("#modal-cerrar");

// --- Estado Global -------------------------------------------- 
let productos = []; 
let categoriaActiva = TODAS; 
let tarjetaDisparadora = null;

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
  const nuevoHash = cat === TODAS ? "catalogo.html" : `#${encodeURIComponent(cat)}`;
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

// --- 6. Creación de Tarjetas Dinámicas ------------------------ 
function crearTarjeta(p) { 
  const nodo = plantilla.content.cloneNode(true); 
  const tarjeta = nodo.querySelector(".tarjeta"); 
  const img = nodo.querySelector("img"); 
  const etiqueta = nodo.querySelector(".etiqueta"); 

  tarjeta.dataset.id = p.id;

  img.src = p.imagen; 
  img.srcset = `${p.imagen} 600w`;
  img.alt = p.nombre; 

  img.addEventListener("load", () => img.classList.add("foto--cargada"));
  img.onerror = () => { 
    img.onerror = null; 
    img.src = "img/sin-imagen.jpg"; 
    img.srcset = "img/sin-imagen.jpg 600w";
    img.classList.add("foto--cargada");
  }; 

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
  return nodo; 
} 

// --- 7. Aplicar Filtros Combinados y Ordenamiento --------------
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

// --- 8. Renderizar Catálogo en pantalla ------------------------- 
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

// --- 9. Delegación y Registro de Eventos ----------------------- 

// Evento sobre Filtros por Categoría
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

// Escuchar cambios en Buscador, Select de Ordenamiento y Checkbox de Stock
inputBuscador.addEventListener("input", renderizarCatalogo);
selectOrden.addEventListener("change", renderizarCatalogo);
checkStock.addEventListener("change", renderizarCatalogo);

// Delegación de eventos sobre Grilla para abrir Modal Nativo (<dialog>)
grilla.addEventListener("click", (e) => {
  const tarjeta = e.target.closest(".tarjeta");
  if (!tarjeta) return;

  const id = Number(tarjeta.dataset.id);
  const prod = productos.find((p) => p.id === id);
  if (!prod) return;

  tarjetaDisparadora = tarjeta;
  abrirModal(prod);
});

// Soporte para interacción con teclado (Enter)
grilla.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    const tarjeta = e.target.closest(".tarjeta");
    if (tarjeta) tarjeta.click();
  }
});

function abrirModal(p) {
  modalImg.src = p.imagen;
  modalImg.alt = p.nombre;
  modalCategoria.textContent = p.categoria;
  modalTitulo.textContent = p.nombre;
  modalDescripcion.textContent = p.descripcion;
  modalPrecio.textContent = soles.format(p.precio);
  modalStock.textContent = p.stock > 0 ? `Stock disponible: ${p.stock} unid.` : "Sin stock disponible";

  modalDetalle.showModal();
}

function cerrarModal() {
  modalDetalle.close();
}

btnCerrarModal.addEventListener("click", cerrarModal);

// Retorno de foco a la tarjeta que abrió el modal (vía botón o Escape)
modalDetalle.addEventListener("close", () => {
  if (tarjetaDisparadora) {
    tarjetaDisparadora.focus();
  }
});

// --- 10. Función de Inicialización con Manejo de Errores -------- 
async function iniciar() { 
  estado.className = "estado";
  estado.textContent = "Cargando productos…"; 

  try { 
    productos = await cargarProductos(); 
    const categorias = obtenerCategorias(productos);

    categoriaActiva = obtenerCategoriaDeHash(categorias);
    renderizarFiltros(categorias); 
    renderizarCatalogo(); 
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