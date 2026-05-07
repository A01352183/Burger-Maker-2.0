/*
  =====================================================================
  BURGER RUSH - Lógica del juego (JavaScript)
  =====================================================================
  Este archivo contiene TODA la lógica del juego:
  - Cómo se mueve el jugador
  - Cómo caen los ingredientes
  - Cómo se detectan los choques
  - Cuándo gana o pierde el jugador
  - Cómo se muestran las estadísticas
  =====================================================================
*/

// =====================================================================
// SECCIÓN 1: REFERENCIAS A ELEMENTOS DEL HTML
// =====================================================================
// Aquí "agarramos" los elementos del HTML para poder controlarlos.
// Es como buscar herramientas en una caja antes de empezar a trabajar.

const canvas = document.getElementById('canvas-juego');
const ctx = canvas.getContext('2d');  // ctx = "contexto", lo que usamos para dibujar

// Audio
const musicaFondo = document.getElementById('musica-fondo');

// Elementos de la UI superior
const listaReceta = document.getElementById('lista-receta');
const tiempoSpan = document.getElementById('tiempo');
const ingredientesContador = document.getElementById('ingredientes-contador');
const hamburguesasContador = document.getElementById('hamburguesas-contador');

// Modales (pantallas de inicio y game over)
const modalInicio = document.getElementById('modal-inicio');
const modalGameOver = document.getElementById('modal-gameover');
const botonIniciar = document.getElementById('boton-iniciar');
const botonReiniciar = document.getElementById('boton-reiniciar');
const mensajeFinal = document.getElementById('mensaje-final');
const statTiempo = document.getElementById('stat-tiempo');
const statIngredientes = document.getElementById('stat-ingredientes');
const statHamburguesas = document.getElementById('stat-hamburguesas');


// =====================================================================
// SECCIÓN 2: CONFIGURACIÓN DEL JUEGO (CONSTANTES)
// =====================================================================
// Aquí están todos los "números mágicos" del juego.
// Si quieres hacer el juego más fácil/difícil, MODIFICA AQUÍ.

const ANCHO = canvas.width;   // ancho del área de juego (800)
const ALTO = canvas.height;   // alto del área de juego (600)

// Velocidades y tamaños
const VELOCIDAD_JUGADOR = 6;             // qué tan rápido se mueve el pan
const VELOCIDAD_INGREDIENTE_MIN = 1;   // velocidad mínima de caída
const VELOCIDAD_INGREDIENTE_MAX = 3;     // velocidad máxima de caída
const TAMANO_INGREDIENTE = 60;           // tamaño en píxeles de cada ingrediente
const ANCHO_JUGADOR = 120;               // ancho del pan inferior
const ALTO_JUGADOR = 70;                 // alto del pan inferior

// Spawning (aparición) de ingredientes
const INTERVALO_SPAWN_INICIAL = 1100;    // milisegundos entre cada spawn
const INTERVALO_SPAWN_MIN = 500;         // intervalo mínimo (más difícil)
const REDUCCION_SPAWN_POR_SEGUNDO = 8;   // qué tanto se acelera cada segundo

// Probabilidad de que aparezca el ingrediente correcto (vs uno random)
const PROBABILIDAD_INGREDIENTE_CORRECTO = 0.45;  // 45% de las veces

// Tamaño de la receta
const RECETA_MIN = 3;   // mínimo de ingredientes en una receta
const RECETA_MAX = 5;   // máximo de ingredientes en una receta

// Lista de todos los ingredientes posibles
const INGREDIENTES = ['carne', 'lechuga', 'tomate', 'queso', 'cebolla'];

// Mapeo: nombre del ingrediente -> ruta del sprite
// OJO: el archivo de lechuga se llama "lechuge.png" (sin la 'a')
const RUTAS_SPRITES = {
    carne:   'Assets/sprites/carne.png',
    lechuga: 'Assets/sprites/lechuga.png',
    tomate:  'Assets/sprites/tomate.png',
    queso:   'Assets/sprites/queso.png',
    cebolla: 'Assets/sprites/onion.png'
};


// =====================================================================
// SECCIÓN 3: VARIABLES GLOBALES (ESTADO DEL JUEGO)
// =====================================================================
// Estas variables cambian durante el juego.
// Llevan el control de qué está pasando en cada momento.

let imagenes = {};            // aquí guardamos todas las imágenes cargadas
let estadoJuego = null;       // se inicializa cuando el jugador da "JUGAR"
const teclasPresionadas = {}; // qué teclas están presionadas en este momento


// =====================================================================
// SECCIÓN 4: CARGA DE IMÁGENES
// =====================================================================
// Antes de empezar a jugar, necesitamos cargar TODAS las imágenes.
// Si no, el juego intentaría dibujar imágenes que no existen.

/**
 * Carga UNA imagen y devuelve una promesa.
 * Una "promesa" es JS para "te aviso cuando termine".
 */
function cargarImagen(ruta) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error('No cargo: ' + ruta));
        img.src = ruta;
    });
}

/**
 * Carga TODAS las imágenes del juego en paralelo.
 */
async function cargarTodasLasImagenes() {
    // Imágenes "fijas" del escenario y panes
    imagenes.background = await cargarImagen('Assets/sprites/background.png');
    imagenes.panAbajo   = await cargarImagen('Assets/sprites/pan_abajo.png');
    imagenes.panArriba  = await cargarImagen('Assets/sprites/pan_arriba.png');

    // Cargar cada sprite de ingrediente
    for (const nombre in RUTAS_SPRITES) {
        imagenes[nombre] = await cargarImagen(RUTAS_SPRITES[nombre]);
    }

    console.log('Todas las imagenes cargaron correctamente');
}


// =====================================================================
// SECCIÓN 5: GENERACIÓN DE RECETAS ALEATORIAS
// =====================================================================

/**
 * Crea una receta nueva con ingredientes al azar.
 * Devuelve un array como ['carne', 'queso', 'tomate']
 */
function generarRecetaAleatoria() {
    // Elegir un tamaño aleatorio entre RECETA_MIN y RECETA_MAX
    const tamano = RECETA_MIN + Math.floor(Math.random() * (RECETA_MAX - RECETA_MIN + 1));
    const receta = [];

    for (let i = 0; i < tamano; i++) {
        const indice = Math.floor(Math.random() * INGREDIENTES.length);
        receta.push(INGREDIENTES[indice]);
    }
    return receta;
}

/**
 * Actualiza la lista de receta visible en la UI.
 * Marca como "completado" los ya atrapados y "actual" el siguiente.
 */
function actualizarUIReceta() {
    listaReceta.innerHTML = '';  // borrar lista anterior

    estadoJuego.receta.forEach((ingrediente, indice) => {
        const li = document.createElement('li');
        li.textContent = (indice + 1) + '. ' + ingrediente;

        if (indice < estadoJuego.indiceRecetaActual) {
            li.classList.add('completado');  // ya lo atrapó
        } else if (indice === estadoJuego.indiceRecetaActual) {
            li.classList.add('actual');      // es el siguiente
        }
        listaReceta.appendChild(li);
    });
}


// =====================================================================
// SECCIÓN 6: SPAWN DE INGREDIENTES (HACER QUE APAREZCAN)
// =====================================================================

/**
 * Crea un ingrediente nuevo en la parte superior de la pantalla.
 * A veces aparece el correcto, a veces uno aleatorio (para hacerlo difícil).
 */
function spawnearIngrediente() {
    let tipo;

    // Decidir si spawneamos el ingrediente correcto o uno aleatorio
    const debeSpawnearCorrecto = Math.random() < PROBABILIDAD_INGREDIENTE_CORRECTO;
    const todaviaQuedanIngredientes = estadoJuego.indiceRecetaActual < estadoJuego.receta.length;

    if (debeSpawnearCorrecto && todaviaQuedanIngredientes) {
        tipo = estadoJuego.receta[estadoJuego.indiceRecetaActual];
    } else {
        tipo = INGREDIENTES[Math.floor(Math.random() * INGREDIENTES.length)];
    }

    // Crear el objeto ingrediente con posición y velocidad aleatorias
    const nuevoIngrediente = {
        tipo: tipo,
        x: Math.random() * (ANCHO - TAMANO_INGREDIENTE),
        y: -TAMANO_INGREDIENTE,
        ancho: TAMANO_INGREDIENTE,
        alto: TAMANO_INGREDIENTE,
        velocidad: VELOCIDAD_INGREDIENTE_MIN + Math.random() * (VELOCIDAD_INGREDIENTE_MAX - VELOCIDAD_INGREDIENTE_MIN)
    };

    estadoJuego.ingredientesCayendo.push(nuevoIngrediente);
}


// =====================================================================
// SECCIÓN 7: ACTUALIZACIÓN DEL JUGADOR (MOVIMIENTO)
// =====================================================================

/**
 * Mueve al jugador según las teclas presionadas.
 * Soporta flechas y A/D.
 */
function actualizarJugador() {
    const j = estadoJuego.jugador;

    // Mover a la izquierda
    if (teclasPresionadas['ArrowLeft'] || teclasPresionadas['a'] || teclasPresionadas['A']) {
        j.x -= VELOCIDAD_JUGADOR;
    }
    // Mover a la derecha
    if (teclasPresionadas['ArrowRight'] || teclasPresionadas['d'] || teclasPresionadas['D']) {
        j.x += VELOCIDAD_JUGADOR;
    }

    // No dejar que se salga de la pantalla
    if (j.x < 0) j.x = 0;
    if (j.x + j.ancho > ANCHO) j.x = ANCHO - j.ancho;
}


// =====================================================================
// SECCIÓN 8: COLISIONES Y ACTUALIZACIÓN DE INGREDIENTES
// =====================================================================

/**
 * Detecta si dos rectángulos están chocando.
 * Es básicamente: "se traslapan en X y en Y?"
 */
function detectarColision(a, b) {
    return a.x < b.x + b.ancho &&
           a.x + a.ancho > b.x &&
           a.y < b.y + b.alto &&
           a.y + a.alto > b.y;
}

/**
 * Actualiza la posición de cada ingrediente cayendo
 * y detecta si choca con el jugador o sale de la pantalla.
 */
function actualizarIngredientes() {
    // Recorremos al revés para poder eliminar elementos sin problemas
    for (let i = estadoJuego.ingredientesCayendo.length - 1; i >= 0; i--) {
        const ing = estadoJuego.ingredientesCayendo[i];

        // Hacer que caiga
        ing.y += ing.velocidad;

        // Choco con el jugador?
        if (detectarColision(ing, estadoJuego.jugador)) {
            const ingredienteEsperado = estadoJuego.receta[estadoJuego.indiceRecetaActual];

            if (ing.tipo === ingredienteEsperado) {
                // CORRECTO
                estadoJuego.indiceRecetaActual++;
                estadoJuego.ingredientesAtrapados++;
                estadoJuego.ingredientesEnLaPila.push(ing.tipo);
                estadoJuego.ingredientesCayendo.splice(i, 1);

                // Completo la hamburguesa entera?
                if (estadoJuego.indiceRecetaActual >= estadoJuego.receta.length) {
                    estadoJuego.hamburguesasCompletas++;
                    // Generar receta NUEVA y resetear pila visual
                    estadoJuego.receta = generarRecetaAleatoria();
                    estadoJuego.indiceRecetaActual = 0;

                    // Pequeña pausa visual: limpiamos pila después de 600ms
                    setTimeout(() => {
                        if (estadoJuego && estadoJuego.jugando) {
                            estadoJuego.ingredientesEnLaPila = [];
                        }
                    }, 600);
                }
                actualizarUIReceta();
            } else {
                // INCORRECTO - Game Over
                terminarJuego('Atrapaste ' + ing.tipo.toUpperCase() + ' pero la receta pedia ' + ingredienteEsperado.toUpperCase());
                return;
            }
        }

        // Si el ingrediente salio por abajo de la pantalla, eliminarlo
        if (ing.y > ALTO) {
            estadoJuego.ingredientesCayendo.splice(i, 1);
        }
    }
}


// =====================================================================
// SECCIÓN 9: DIBUJADO DEL JUEGO
// =====================================================================

/**
 * Dibuja TODO en pantalla en el orden correcto:
 * 1. Fondo
 * 2. Ingredientes cayendo
 * 3. Pila de ingredientes ya atrapados
 * 4. Pan inferior (jugador)
 * 5. Pan superior (cuando la pila está casi completa)
 */
function dibujar() {
    // 1. Limpiar y dibujar fondo
    ctx.drawImage(imagenes.background, 0, 0, ANCHO, ALTO);

    // 2. Dibujar todos los ingredientes cayendo
    estadoJuego.ingredientesCayendo.forEach(ing => {
        ctx.drawImage(imagenes[ing.tipo], ing.x, ing.y, ing.ancho, ing.alto);
    });

    // 3. Dibujar la pila de ingredientes encima del pan
    const j = estadoJuego.jugador;
    const altoIngredientePila = 18;

    estadoJuego.ingredientesEnLaPila.forEach((tipo, i) => {
        const offsetY = -(i + 1) * altoIngredientePila;
        ctx.drawImage(
            imagenes[tipo],
            j.x + 10,
            j.y + offsetY,
            j.ancho - 20,
            altoIngredientePila + 8
        );
    });

    // 4. Dibujar el pan superior si la pila tiene al menos 2 ingredientes
    if (estadoJuego.ingredientesEnLaPila.length >= 2) {
        const offsetY = -(estadoJuego.ingredientesEnLaPila.length + 1) * altoIngredientePila;
        ctx.drawImage(
            imagenes.panArriba,
            j.x,
            j.y + offsetY - 10,
            j.ancho,
            30
        );
    }

    // 5. Dibujar el pan inferior (jugador)
    ctx.drawImage(imagenes.panAbajo, j.x, j.y, j.ancho, j.alto);
}


// =====================================================================
// SECCIÓN 10: BUCLE PRINCIPAL DEL JUEGO
// =====================================================================
// Esta función se ejecuta ~60 veces por segundo.
// Es el "corazón" del juego.

function bucleJuego(timestamp) {
    // Si el juego se detuvo (game over), salir del bucle
    if (!estadoJuego || !estadoJuego.jugando) return;

    // Calcular tiempo transcurrido en segundos
    const ahora = Date.now();
    estadoJuego.tiempoTranscurrido = Math.floor((ahora - estadoJuego.tiempoInicio) / 1000);

    // Actualizar UI de stats en tiempo real
    tiempoSpan.textContent = estadoJuego.tiempoTranscurrido;
    ingredientesContador.textContent = estadoJuego.ingredientesAtrapados;
    hamburguesasContador.textContent = estadoJuego.hamburguesasCompletas;

    // Calcular intervalo de spawn dinámico (más rápido conforme pasa el tiempo)
    const intervaloActual = Math.max(
        INTERVALO_SPAWN_MIN,
        INTERVALO_SPAWN_INICIAL - estadoJuego.tiempoTranscurrido * REDUCCION_SPAWN_POR_SEGUNDO
    );

    // Es momento de spawnear un nuevo ingrediente?
    if (timestamp - estadoJuego.ultimoSpawn > intervaloActual) {
        spawnearIngrediente();
        estadoJuego.ultimoSpawn = timestamp;
    }

    // Actualizar lógica
    actualizarJugador();
    actualizarIngredientes();

    // Si terminarJuego se llamo dentro de actualizarIngredientes, no dibujar mas
    if (!estadoJuego.jugando) return;

    // Dibujar todo
    dibujar();

    // Pedir el siguiente frame al navegador
    requestAnimationFrame(bucleJuego);
}


// =====================================================================
// SECCIÓN 11: INICIO Y FIN DEL JUEGO
// =====================================================================

/**
 * Inicializa (o reinicia) el estado del juego y arranca el bucle.
 */
function iniciarJuego() {
    // Crear estado limpio
    estadoJuego = {
        jugando: true,
        jugador: {
            x: ANCHO / 2 - ANCHO_JUGADOR / 2,
            y: ALTO - ALTO_JUGADOR - 20,
            ancho: ANCHO_JUGADOR,
            alto: ALTO_JUGADOR
        },
        ingredientesCayendo: [],
        ingredientesEnLaPila: [],
        receta: generarRecetaAleatoria(),
        indiceRecetaActual: 0,
        tiempoInicio: Date.now(),
        tiempoTranscurrido: 0,
        ingredientesAtrapados: 0,
        hamburguesasCompletas: 0,
        ultimoSpawn: 0
    };

    // Actualizar UI
    actualizarUIReceta();
    tiempoSpan.textContent = 0;
    ingredientesContador.textContent = 0;
    hamburguesasContador.textContent = 0;

    // Ocultar modales
    modalInicio.classList.add('oculto');
    modalGameOver.classList.add('oculto');

    // Reiniciar y reproducir música
    musicaFondo.currentTime = 0;
    musicaFondo.volume = 0.5;
    musicaFondo.play().catch(err => {
        console.warn('No se pudo reproducir musica automaticamente:', err);
    });

    // A jugar!
    requestAnimationFrame(bucleJuego);
}

/**
 * Termina el juego, detiene música y muestra estadísticas finales.
 */
function terminarJuego(razon) {
    estadoJuego.jugando = false;

    // Detener música
    musicaFondo.pause();

    // Mostrar mensaje y stats
    mensajeFinal.textContent = razon;
    statTiempo.textContent = estadoJuego.tiempoTranscurrido;
    statIngredientes.textContent = estadoJuego.ingredientesAtrapados;
    statHamburguesas.textContent = estadoJuego.hamburguesasCompletas;

    // Mostrar modal de Game Over
    modalGameOver.classList.remove('oculto');
}


// =====================================================================
// SECCIÓN 12: EVENTOS (TECLADO Y BOTONES)
// =====================================================================

// Detectar tecla presionada
document.addEventListener('keydown', evento => {
    teclasPresionadas[evento.key] = true;
});

// Detectar tecla soltada
document.addEventListener('keyup', evento => {
    teclasPresionadas[evento.key] = false;
});

// Botón "JUGAR" (pantalla inicial)
botonIniciar.addEventListener('click', iniciarJuego);

// Botón "VOLVER A JUGAR" (pantalla de game over)
botonReiniciar.addEventListener('click', iniciarJuego);


// =====================================================================
// SECCIÓN 13: ARRANQUE INICIAL
// =====================================================================
// Lo PRIMERO que hace el script: cargar las imágenes.
// Mientras tanto, el modal de inicio está visible esperando al jugador.

cargarTodasLasImagenes()
    .then(() => {
        console.log('Burger Rush listo. Da clic en JUGAR.');
    })
    .catch(error => {
        console.error('Error cargando assets:', error);
        alert('Hubo un problema cargando las imagenes. Revisa que la carpeta Assets este en su lugar y que los nombres de archivo coincidan.');
    });