/* ==========================================================================
   LÓGICA PRINCIPAL: EXTENSIÓN DE NUEVA PESTAÑA MICHIRU KAGEMORI
   ========================================================================== */

// CONFIGURACIÓN DE APIS POR DEFECTO (Se pueden sobreescribir en Configuración)
const DEFAULT_DANBOORU_LOGIN = '';
const DEFAULT_DANBOORU_API_KEY = '';
const DEFAULT_GELBOORU_USER_ID = '';
const DEFAULT_GELBOORU_API_KEY = '';

// Motores de Búsqueda
const SEARCH_ENGINES = {
  google: {
    name: 'Google',
    url: 'https://www.google.com/search?q=',
    icon: '🌐'
  },
  brave: {
    name: 'Brave',
    url: 'https://search.brave.com/search?q=',
    icon: '🦁'
  },
  ddg: {
    name: 'DuckDuckGo',
    url: 'https://duckduckgo.com/?q=',
    icon: '🦆'
  }
};

// Accesos Directos por Defecto
const DEFAULT_SHORTCUTS = [
  { id: 'sc1', name: 'YouTube', url: 'https://www.youtube.com' },
  { id: 'sc2', name: 'GitHub', url: 'https://www.github.com' },
  { id: 'sc3', name: 'Twitter / X', url: 'https://twitter.com' },
  { id: 'sc4', name: 'Reddit', url: 'https://www.reddit.com' },
  { id: 'sc5', name: 'Discord', url: 'https://discord.com' }
];

// Valores por Defecto de Configuración
const DEFAULT_SETTINGS = {
  sources: {
    danbooru: true,
    gelbooru: true
  },
  safeSearch: true,
  streamerMode: false,
  searchEngine: 'google',
  blur: 0,
  opacity: 30,
  imageFit: 'contain',
  customTags: '',
  customApis: [],
  bgEnabled: true,
  // Credenciales editables
  danbooruUsername: DEFAULT_DANBOORU_LOGIN,
  danbooruApiKey: DEFAULT_DANBOORU_API_KEY,
  gelbooruUserId: DEFAULT_GELBOORU_USER_ID,
  gelbooruApiKey: DEFAULT_GELBOORU_API_KEY
};

// Estado global en memoria de la pestaña
let currentSettings = { ...DEFAULT_SETTINGS };
let currentImage = null;
let isFetchingImages = false; // Candado para evitar peticiones simultáneas
let loadRetries = 0; // Contador de fallos consecutivos al cargar imágenes de fondo

// Elementos del DOM
const elClockTime = document.getElementById('clock-time');
const elClockDate = document.getElementById('clock-date');
const elSearchForm = document.getElementById('search-form');
const elSearchInput = document.getElementById('search-input');
const elCurrentEngineBtn = document.getElementById('current-engine-btn');
const elCurrentEngineIcon = document.getElementById('current-engine-icon');
const elEngineDropdown = document.getElementById('engine-dropdown');
const elShortcutsGrid = document.getElementById('shortcuts-grid');

const elBgActive = document.getElementById('bg-active');
const elBgNext = document.getElementById('bg-next');

let activeLayer = elBgActive;
let inactiveLayer = elBgNext;

// Inicializar z-indices de las capas de fondo
elBgActive.style.zIndex = '-2';
elBgNext.style.zIndex = '-3';

const elImageSourceBadge = document.getElementById('image-source-badge');
const elImageScore = document.getElementById('image-score');
const elImageArtistLink = document.getElementById('image-artist-link');
const elImageViewOriginal = document.getElementById('image-view-original');

const elRefreshBtn = document.getElementById('refresh-btn');
const elRefreshIcon = document.getElementById('refresh-icon');
const elSettingsBtn = document.getElementById('settings-btn');
const elSettingsDrawer = document.getElementById('settings-drawer');
const elCloseSettingsBtn = document.getElementById('close-settings-btn');
const elSaveSettingsBtn = document.getElementById('save-settings-btn');
const elToggleBgBtn = document.getElementById('toggle-bg-btn');
const elToggleUiBtn = document.getElementById('toggle-ui-btn');
const elToggleUiIcon = document.getElementById('toggle-ui-icon');

// Ajustes del Drawer
const elSourceDanbooru = document.getElementById('source-danbooru');
const elSourceGelbooru = document.getElementById('source-gelbooru');
const elSafeSearchToggle = document.getElementById('safe-search-toggle');
const elStreamerModeToggle = document.getElementById('streamer-mode-toggle');
const elBlurSlider = document.getElementById('blur-slider');
const elBlurValue = document.getElementById('blur-value');
const elOpacitySlider = document.getElementById('opacity-slider');
const elOpacityValue = document.getElementById('opacity-value');
const elFitSelect = document.getElementById('fit-select');
const elCustomTagsInput = document.getElementById('custom-tags-input');
const elCustomApisContainer = document.getElementById('custom-apis-container');
const elCustomSourcesContainer = document.getElementById('custom-sources-container');
const elAddCustomApiBtn = document.getElementById('add-custom-api-btn');
const elCacheCount = document.getElementById('cache-count');
const elClearCacheBtn = document.getElementById('clear-cache-btn');

// Inputs de Credenciales en el Drawer
const elDanbooruUsername = document.getElementById('danbooru-username-input');
const elDanbooruApiKey = document.getElementById('danbooru-api-key-input');
const elGelbooruUserId = document.getElementById('gelbooru-user-id-input');
const elGelbooruApiKey = document.getElementById('gelbooru-api-key-input');

// Dialog de Accesos Directos
const elShortcutDialog = document.getElementById('shortcut-dialog');
const elShortcutForm = document.getElementById('shortcut-form');
const elShortcutName = document.getElementById('shortcut-name');
const elShortcutUrl = document.getElementById('shortcut-url');
const elCancelShortcutBtn = document.getElementById('cancel-shortcut-btn');
const elDeleteShortcutBtn = document.getElementById('delete-shortcut-btn');
const elShortcutDialogTitle = document.getElementById('shortcut-dialog-title');

let editingShortcutId = null;

// ==========================================================================
// 1. RELOJ Y FECHA
// ==========================================================================

function updateClock() {
  const now = new Date();
  
  // Hora formato HH:MM:SS
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  elClockTime.textContent = `${hours}:${minutes}:${seconds}`;

  // Fecha formato: "Viernes, 5 de Junio" / "Friday, June 5"
  const options = { weekday: 'long', day: 'numeric', month: 'long' };
  const locale = (typeof chrome !== 'undefined' && chrome.i18n) ? chrome.i18n.getUILanguage() : 'es-ES';
  let dateStr = now.toLocaleDateString(locale, options);
  // Capitalizar la primera letra
  dateStr = dateStr.charAt(0).toUpperCase() + dateStr.slice(1);
  elClockDate.textContent = dateStr;
}

// Iniciar reloj
updateClock();
setInterval(updateClock, 1000);

// ==========================================================================
// 2. MOTORES DE BÚSQUEDA Y NAVEGACIÓN
// ==========================================================================

function setupSearch() {
  // Manejar submit del buscador
  elSearchForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const query = elSearchInput.value.trim();
    if (!query) return;

    const engine = SEARCH_ENGINES[currentSettings.searchEngine] || SEARCH_ENGINES.google;
    window.location.href = engine.url + encodeURIComponent(query);
  });

  // Mostrar/ocultar selector de motores
  elCurrentEngineBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    elEngineDropdown.classList.toggle('hidden');
  });

  // Cerrar dropdown al hacer click fuera
  document.addEventListener('click', () => {
    elEngineDropdown.classList.add('hidden');
  });

  // Cambiar motor de búsqueda
  elEngineDropdown.querySelectorAll('.engine-option').forEach(option => {
    option.addEventListener('click', async (e) => {
      const selectedEngine = e.currentTarget.getAttribute('data-engine');
      currentSettings.searchEngine = selectedEngine;
      
      // Guardar
      await chrome.storage.local.set({ settings: currentSettings });
      updateSearchEngineUI();
    });
  });
}

function updateSearchEngineUI() {
  const engine = SEARCH_ENGINES[currentSettings.searchEngine] || SEARCH_ENGINES.google;
  elCurrentEngineIcon.textContent = engine.icon;
  elSearchInput.placeholder = `Buscar en ${engine.name}...`;
}

// ==========================================================================
// 3. ACCESOS DIRECTOS (CRUD)
// ==========================================================================

async function loadShortcuts() {
  const data = await chrome.storage.local.get('shortcuts');
  const shortcuts = data.shortcuts || DEFAULT_SHORTCUTS;
  renderShortcuts(shortcuts);
}

function renderShortcuts(shortcuts) {
  elShortcutsGrid.innerHTML = '';
  
  shortcuts.forEach(sc => {
    const tile = document.createElement('a');
    tile.href = sc.url;
    tile.className = 'shortcut-tile glass-panel';
    tile.setAttribute('data-id', sc.id);

    // Obtener letra inicial
    const initial = sc.name.charAt(0);

    tile.innerHTML = `
      <button type="button" class="shortcut-edit-btn" title="Editar enlace">✏️</button>
      <div class="shortcut-icon-wrapper">
        <span class="shortcut-letter">${initial}</span>
      </div>
      <span class="shortcut-name">${sc.name}</span>
    `;

    // Manejar edición
    tile.querySelector('.shortcut-edit-btn').addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      openShortcutModal(sc);
    });

    elShortcutsGrid.appendChild(tile);
  });

  // Añadir botón de "+" si son menos de 10
  if (shortcuts.length < 10) {
    const addTile = document.createElement('div');
    addTile.className = 'shortcut-tile add-shortcut';
    addTile.innerHTML = `
      <div class="shortcut-icon-wrapper">
        <span class="shortcut-add-plus">+</span>
      </div>
      <span class="shortcut-name">Añadir</span>
    `;
    addTile.addEventListener('click', () => openShortcutModal());
    elShortcutsGrid.appendChild(addTile);
  }
}

function openShortcutModal(shortcut = null) {
  if (shortcut) {
    // Modo edición
    editingShortcutId = shortcut.id;
    elShortcutDialogTitle.textContent = (typeof chrome !== 'undefined' && chrome.i18n)
      ? chrome.i18n.getMessage('editShortcutTitle')
      : 'Editar Acceso Directo';
    elShortcutName.value = shortcut.name;
    elShortcutUrl.value = shortcut.url;
    elDeleteShortcutBtn.classList.remove('hidden');
  } else {
    // Modo creación
    editingShortcutId = null;
    elShortcutDialogTitle.textContent = (typeof chrome !== 'undefined' && chrome.i18n)
      ? chrome.i18n.getMessage('addShortcutTitle')
      : 'Añadir Acceso Directo';
    elShortcutName.value = '';
    elShortcutUrl.value = 'https://';
    elDeleteShortcutBtn.classList.add('hidden');
  }
  elShortcutDialog.showModal();
}

function setupShortcutsDialog() {
  // Cancelar
  elCancelShortcutBtn.addEventListener('click', () => {
    elShortcutDialog.close();
  });

  // Form submit (Guardar / Crear)
  elShortcutForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = elShortcutName.value.trim();
    let url = elShortcutUrl.value.trim();

    // Validar protocolo
    if (!/^https?:\/\//i.test(url)) {
      url = 'https://' + url;
    }

    const data = await chrome.storage.local.get('shortcuts');
    let shortcuts = data.shortcuts || [...DEFAULT_SHORTCUTS];

    if (editingShortcutId) {
      // Editar existente
      shortcuts = shortcuts.map(sc => sc.id === editingShortcutId ? { ...sc, name, url } : sc);
    } else {
      // Crear nuevo
      const newShortcut = {
        id: 'sc_' + Date.now(),
        name,
        url
      };
      shortcuts.push(newShortcut);
    }

    await chrome.storage.local.set({ shortcuts });
    elShortcutDialog.close();
    renderShortcuts(shortcuts);
  });

  // Eliminar
  elDeleteShortcutBtn.addEventListener('click', async () => {
    if (!editingShortcutId) return;

    const data = await chrome.storage.local.get('shortcuts');
    let shortcuts = data.shortcuts || [];
    shortcuts = shortcuts.filter(sc => sc.id !== editingShortcutId);

    await chrome.storage.local.set({ shortcuts });
    elShortcutDialog.close();
    renderShortcuts(shortcuts);
  });
}

// ==========================================================================
// 4. CLIENTE API Y SISTEMA DE CACHÉ DE IMÁGENES
// ==========================================================================

// Mezclador aleatorio (Fisher-Yates)
function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

// Filtra formatos inválidos (videos, zips, etc)
function isValidImage(url) {
  if (!url) return false;
  const lower = url.toLowerCase();
  return lower.endsWith('.jpg') || lower.endsWith('.jpeg') || lower.endsWith('.png') || 
         lower.endsWith('.webp') || lower.endsWith('.gif');
}

// Utilidad para escapar HTML de forma segura
function escapeHtml(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// Obtiene el enlace de búsqueda del artista según la API y motor utilizado
function getArtistUrl(apiUrl, artistName) {
  if (!apiUrl || !artistName || artistName === 'Desconocido' || artistName === 'Unknown') {
    return '#';
  }
  try {
    const parsedUrl = new URL(apiUrl);
    const origin = parsedUrl.origin;
    const path = parsedUrl.pathname;
    const search = parsedUrl.search;
    
    const formattedArtist = artistName.replace(/ /g, '_');
    
    // Si es tipo Gelbooru (usa index.php?page=dapi)
    if (search.includes('page=dapi') || search.includes('gelbooru') || path.includes('index.php')) {
      return `${origin}/index.php?page=post&s=list&tags=${encodeURIComponent(formattedArtist)}`;
    }
    
    // Si es tipo Danbooru (usa posts.json)
    if (path.includes('/posts.json') || path.includes('/posts')) {
      return `${origin}/posts?tags=${encodeURIComponent(formattedArtist)}`;
    }
    
    // Si es tipo Moebooru (usa post.json)
    if (path.includes('/post.json') || path.includes('/post')) {
      return `${origin}/post?tags=${encodeURIComponent(formattedArtist)}`;
    }
    
    // Formato genérico para otros Boorus
    return `${origin}/post?tags=${encodeURIComponent(formattedArtist)}`;
  } catch (e) {
    console.error('Error al generar la URL del artista:', e);
    return '#';
  }
}

// Genera el enlace de búsqueda del artista intentando extraerlo de los datos de la imagen
function getArtistUrlFromImage(img) {
  if (!img || !img.artist || img.artist === 'Desconocido' || img.artist === 'Unknown') {
    return '#';
  }
  const artistName = img.artist;
  let domainUrl = '';
  try {
    if (img.original_url && img.original_url.startsWith('http')) {
      domainUrl = img.original_url;
    } else if (img.source_link && img.source_link.startsWith('http')) {
      domainUrl = img.source_link;
    }
  } catch (e) {}

  if (domainUrl) {
    try {
      const parsed = new URL(domainUrl);
      const origin = parsed.origin;
      const hostname = parsed.hostname;
      const formattedArtist = artistName.replace(/ /g, '_');
      
      if (hostname.includes('yande.re') || hostname.includes('konachan')) {
        return `${origin}/post?tags=${encodeURIComponent(formattedArtist)}`;
      }
      if (hostname.includes('danbooru')) {
        return `${origin}/posts?tags=${encodeURIComponent(formattedArtist)}`;
      }
      return `${origin}/index.php?page=post&s=list&tags=${encodeURIComponent(formattedArtist)}`;
    } catch (e) {}
  }
  
  // Fallback a Gelbooru
  return `https://gelbooru.com/index.php?page=post&s=list&tags=${encodeURIComponent(artistName.replace(/ /g, '_'))}`;
}

// Llama a Danbooru y recupera posts
async function fetchDanbooruBatch(tags, safeSearch) {
  try {
    let tagsList = [];
    if (tags && tags.trim() !== '') {
      tagsList = tags.split(/[\s+]+/);
    } else {
      // Búsqueda OR de ambas etiquetas por defecto
      tagsList = ['~kagemori_michiru', '~michiru_kagemori'];
    }
    
    if (safeSearch) {
      tagsList.push('rating:g'); // rating:g es General/Safe en Danbooru
    }
    tagsList.push('order:random');
    
    const tagsQuery = tagsList.map(t => encodeURIComponent(t)).join('%20');
    
    const login = currentSettings.danbooruUsername || DEFAULT_DANBOORU_LOGIN;
    const apiKey = currentSettings.danbooruApiKey || DEFAULT_DANBOORU_API_KEY;
    
    // Solo permitir consulta si se han proporcionado credenciales
    if (!login || !apiKey) {
      console.log('Danbooru: No se han configurado credenciales. Omitiendo consulta.');
      return [];
    }
    
    let url = `https://danbooru.donmai.us/posts.json?tags=${tagsQuery}&limit=20&login=${encodeURIComponent(login)}&api_key=${encodeURIComponent(apiKey)}`;
    console.log('Fetching Danbooru:', url);
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'EverythingMichiruExtension/2.0'
      }
    });
    if (!response.ok) throw new Error(`Danbooru respondió con status ${response.status}`);
    
    const data = await response.json();
    if (!Array.isArray(data)) return [];

    // Normalizar
    return data
      .filter(post => isValidImage(post.large_file_url || post.file_url))
      .map(post => {
        const artist = post.tag_string_artist ? post.tag_string_artist.replace(/_/g, ' ') : 'Desconocido';
        return {
          id: post.id,
          source: 'danbooru',
          image_url: post.large_file_url || post.file_url,
          original_url: post.file_url,
          rating: post.rating, // 'g', 's', 'q', 'e'
          score: post.score || 0,
          artist: artist,
          artist_url: getArtistUrl(url, artist),
          source_link: post.source || `https://danbooru.donmai.us/posts/${post.id}`
        };
      });
  } catch (err) {
    console.error('Error cargando Danbooru:', err);
    return [];
  }
}

// Llama a Gelbooru y recupera posts
async function fetchGelbooruBatch(tags, safeSearch) {
  try {
    let tagsList = [];
    if (tags && tags.trim() !== '') {
      tagsList = tags.split(/[\s+]+/);
    } else {
      tagsList = ['michiru_kagemori'];
    }
    
    if (safeSearch) {
      tagsList.push('rating:general'); // rating:general es Safe en Gelbooru
    }
    tagsList.push('sort:random');
    
    const tagsQuery = tagsList.map(t => encodeURIComponent(t)).join('%20');
    
    const userId = currentSettings.gelbooruUserId || DEFAULT_GELBOORU_USER_ID;
    const apiKey = currentSettings.gelbooruApiKey || DEFAULT_GELBOORU_API_KEY;
    
    // Solo permitir consulta si se han proporcionado credenciales
    if (!userId || !apiKey) {
      console.log('Gelbooru: No se han configurado credenciales. Omitiendo consulta.');
      return [];
    }
    
    let url = `https://gelbooru.com/index.php?page=dapi&s=post&q=index&json=1&tags=${tagsQuery}&limit=20&api_key=${encodeURIComponent(apiKey)}&user_id=${encodeURIComponent(userId)}`;
    console.log('Fetching Gelbooru:', url);
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Gelbooru respondió con status ${response.status}`);
    
    const data = await response.json();
    // En Gelbooru, la lista de posts viene en la propiedad "post"
    if (!data || !Array.isArray(data.post)) return [];

    // Normalizar
    return data.post
      .filter(post => isValidImage(post.sample_url || post.file_url))
      .map(post => {
        const artist = post.owner || 'Desconocido';
        return {
          id: post.id,
          source: 'gelbooru',
          image_url: post.sample_url || post.file_url,
          original_url: post.file_url,
          rating: post.rating, // 'safe', 'questionable', 'explicit'
          score: post.score || 0,
          artist: artist,
          artist_url: getArtistUrl(url, artist),
          source_link: post.source || `https://gelbooru.com/index.php?page=post&s=view&id=${post.id}`
        };
      });
  } catch (err) {
    console.error('Error cargando Gelbooru:', err);
    return [];
  }
}

// Llama a una API personalizada y procesa la respuesta JSON para extraer imágenes
async function fetchCustomApi(url, customName = '') {
  try {
    console.log('Fetching Custom API:', url, 'with label:', customName);
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Custom API respondió con status ${response.status}`);
    
    const data = await response.json();
    let posts = [];
    
    if (Array.isArray(data)) {
      posts = data;
    } else if (data && typeof data === 'object') {
      // Buscar cualquier propiedad que sea un array (estilo Gelbooru con "post")
      for (const key in data) {
        if (Array.isArray(data[key])) {
          posts = data[key];
          break;
        }
      }
    }
    
    if (!Array.isArray(posts) || posts.length === 0) return [];
    
    // Nombre de origen basado en el label personalizado, o extraído de la URL si está vacío
    let sourceName = customName ? customName.trim() : '';
    if (!sourceName) {
      try {
        const parsed = new URL(url);
        sourceName = parsed.hostname.replace('www.', '').split('.')[0];
      } catch (e) {
        sourceName = 'Custom';
      }
    }
    
    return posts
      .map(post => {
        // Buscar propiedad de URL de la imagen (formatos válidos)
        const imgUrl = post.large_file_url || post.file_url || post.sample_url || post.image_url || post.url || post.image;
        if (!isValidImage(imgUrl)) return null;
        
        const score = post.score || 0;
        const artist = post.tag_string_artist 
          ? post.tag_string_artist.replace(/_/g, ' ') 
          : (post.owner || post.artist || sourceName);
          
        return {
          id: post.id || Math.random().toString(36).substring(2, 9),
          source: sourceName,
          image_url: imgUrl,
          original_url: post.file_url || imgUrl,
          rating: post.rating || 'unknown',
          score: score,
          artist: artist,
          artist_url: getArtistUrl(url, artist),
          source_link: post.source || url
        };
      })
      .filter(p => p !== null);
  } catch (err) {
    console.error('Error cargando API personalizada:', url, err);
    return [];
  }
}

// Rellenar el caché local
async function refillCache() {
  if (isFetchingImages) return;
  isFetchingImages = true;
  console.log('Iniciando recarga del caché...');

  try {
    const data = await chrome.storage.local.get('image_cache');
    let cache = data.image_cache || [];

    // Si ya hay suficientes imágenes, no hacemos petición
    if (cache.length >= 10) {
      isFetchingImages = false;
      return;
    }

    const { sources, customTags, customApis } = currentSettings;
    const safeSearch = currentSettings.safeSearch || currentSettings.streamerMode;
    let newImages = [];

    // Procesar búsquedas de etiquetas
    // Danbooru y Gelbooru usan tags ligeramente distintas. Si el usuario ingresó tags customizadas, las usamos tal cual
    // Si están vacías, usamos las predeterminadas.
    let danbooruTags = customTags ? customTags : 'kagemori_michiru';
    let gelbooruTags = customTags ? customTags : 'michiru_kagemori';

    const promises = [];
    if (sources.danbooru) promises.push(fetchDanbooruBatch(danbooruTags, safeSearch));
    if (sources.gelbooru) promises.push(fetchGelbooruBatch(gelbooruTags, safeSearch));

    // Consultar APIs personalizadas
    const apisList = customApis || [];
    if (Array.isArray(apisList) && apisList.length > 0) {
      apisList.forEach(api => {
        if (api.url && api.url.trim() !== '') {
          // Omitir si la API está deshabilitada
          if (api.enabled === false) {
            console.log(`Custom API "${api.name}": Deshabilitada. Omitiendo consulta.`);
            return;
          }
          // Omitir si Búsqueda Segura está activa y la API es NSFW
          if (safeSearch && api.nsfw) {
            console.log(`Custom API "${api.name}": NSFW con Búsqueda Segura activa. Omitiendo consulta.`);
            return;
          }
          promises.push(fetchCustomApi(api.url, api.name));
        }
      });
    }

    const results = await Promise.all(promises);
    results.forEach(res => {
      newImages = newImages.concat(res);
    });

    if (newImages.length === 0) {
      console.log('No se pudieron obtener imágenes nuevas. ¿Sin internet?');
      isFetchingImages = false;
      return;
    }

    // Mezclar las nuevas imágenes
    shuffleArray(newImages);

    // Evitar duplicados comparando IDs y Orígenes
    const existingKeys = new Set(cache.map(img => `${img.source}_${img.id}`));
    const uniqueNew = newImages.filter(img => !existingKeys.has(`${img.source}_${img.id}`));

    cache = cache.concat(uniqueNew);
    
    // Limitar el caché máximo a 50
    if (cache.length > 50) {
      cache = cache.slice(0, 50);
    }

    await chrome.storage.local.set({ image_cache: cache });
    console.log(`Caché recargado con éxito. Total actual: ${cache.length}`);
    elCacheCount.textContent = cache.length;
  } catch (e) {
    console.error('Error al rellenar el caché:', e);
  } finally {
    isFetchingImages = false;
  }
}

// Consumir una imagen del caché
async function getNextImageFromCache() {
  const data = await chrome.storage.local.get('image_cache');
  let cache = data.image_cache || [];

  if (cache.length === 0) {
    // Si el caché está vacío, intentamos hacer un fetch rápido e instantáneo
    await refillCache();
    // Leer otra vez
    const freshData = await chrome.storage.local.get('image_cache');
    cache = freshData.image_cache || [];
  }

  if (cache.length === 0) {
    return null; // Aún vacío (sin red)
  }

  // Extraer el primer elemento
  const nextImg = cache.shift();
  
  // Guardar el caché actualizado
  await chrome.storage.local.set({ image_cache: cache });
  elCacheCount.textContent = cache.length;

  // Disparar recarga en segundo plano si queda poco
  if (cache.length < 5) {
    refillCache();
  }

  return nextImg;
}

// ==========================================================================
// 5. TRANSICIONES DE FONDO E INTERFAZ
// ==========================================================================

// Limpia las imágenes de fondo de una capa
function clearBackgroundImages(layer) {
  layer.style.backgroundImage = 'none';
  layer.style.background = '';
  layer.style.backgroundColor = '';
  const ambient = layer.querySelector('.bg-ambient');
  const foreground = layer.querySelector('.bg-foreground');
  if (ambient && foreground) {
    ambient.style.backgroundImage = 'none';
    foreground.style.backgroundImage = 'none';
  }
}

// Resetea todas las capas a su estado base y limpia z-indices
function resetBackgroundLayers() {
  clearBackgroundImages(elBgActive);
  clearBackgroundImages(elBgNext);
  elBgActive.style.zIndex = '-2';
  elBgNext.style.zIndex = '-3';
  activeLayer = elBgActive;
  inactiveLayer = elBgNext;
  elBgActive.style.opacity = '1';
  elBgNext.style.opacity = '0';
}

// Aplica el efecto de cross-fade entre las dos capas de fondo sin parpadeos negros
function setBackgroundImage(imageUrl) {
  // Pre-cargar y decodificar la imagen en memoria para evitar parpadeos y lag de renderizado
  elRefreshIcon.classList.add('spinning');
  elRefreshBtn.disabled = true;

  const img = new Image();
  img.src = imageUrl;
  
  img.decode().then(() => {
    loadRetries = 0; // Resetear intentos al cargar con éxito
    
    // 1. Limpiar e insertar la nueva imagen en la capa inactiva (que está oculta con opacity 0)
    clearBackgroundImages(inactiveLayer);
    
    const ambient = inactiveLayer.querySelector('.bg-ambient');
    const foreground = inactiveLayer.querySelector('.bg-foreground');
    if (ambient && foreground) {
      ambient.style.backgroundImage = `url('${imageUrl}')`;
      foreground.style.backgroundImage = `url('${imageUrl}')`;
    } else {
      inactiveLayer.style.backgroundImage = `url('${imageUrl}')`;
    }
    
    // 2. Iniciar la transición de opacidad (cross-fade) sin cambiar z-indices de inmediato.
    // La capa inactiva (detrás, z-index -3) pasa a opacity 1.
    // La capa activa (delante, z-index -2) pasa a opacity 0.
    inactiveLayer.style.opacity = '1';
    activeLayer.style.opacity = '0';
    
    // 3. Esperar a que la transición CSS de 1 segundo se complete antes de hacer el cambio de z-index
    setTimeout(() => {
      // Ahora que la capa inactiva está totalmente visible (opacity 1) y la activa invisible (opacity 0),
      // traemos la inactiva al frente (zIndex -2) y enviamos la activa al fondo (zIndex -3).
      // Como una es completamente transparente y la otra completamente opaca, este cambio es imperceptible visualmente.
      inactiveLayer.style.zIndex = '-2';
      activeLayer.style.zIndex = '-3';
      
      // Intercambiar las referencias de las capas activa e inactiva para el próximo refresco
      const temp = activeLayer;
      activeLayer = inactiveLayer;
      inactiveLayer = temp;
      
      // Detener animación del botón de refresco
      elRefreshIcon.classList.remove('spinning');
      elRefreshBtn.disabled = false;
    }, 1000);
  }).catch(err => {
    console.error('Fallo al decodificar la imagen de fondo:', imageUrl, err);
    loadRetries++; // Incrementar reintentos
    elRefreshIcon.classList.remove('spinning');
    elRefreshBtn.disabled = false;
    // Si falla, intentamos cargar otra
    loadNextImage();
  });
}

function updateImageMetadataUI(img) {
  if (!img) {
    // Mostrar metadatos offline
    elImageSourceBadge.textContent = (typeof chrome !== 'undefined' && chrome.i18n)
      ? chrome.i18n.getMessage('sourceOffline')
      : 'Desconectado';
    elImageSourceBadge.className = 'image-source-badge';
    elImageScore.textContent = '';
    elImageArtistLink.textContent = 'Michiru Kagemori';
    elImageArtistLink.href = '#';
    elImageViewOriginal.classList.add('hidden');
    return;
  }

  // Origen
  elImageSourceBadge.textContent = img.source;
  elImageSourceBadge.className = `image-source-badge ${img.source}`;
  
  // Puntuación
  elImageScore.textContent = `★ ${img.score}`;
  
  // Artista
  const artistName = (img.artist === 'Desconocido' || img.artist === 'Unknown')
    ? ((typeof chrome !== 'undefined' && chrome.i18n) ? chrome.i18n.getMessage('unknownArtist') : 'Desconocido')
    : img.artist;
  elImageArtistLink.textContent = artistName;
  if (img.artist_url) {
    elImageArtistLink.href = img.artist_url;
  } else if (img.source === 'danbooru') {
    elImageArtistLink.href = `https://danbooru.donmai.us/posts?tags=${encodeURIComponent(img.artist.replace(/ /g, '_'))}`;
  } else if (img.source === 'gelbooru') {
    elImageArtistLink.href = `https://gelbooru.com/index.php?page=post&s=list&tags=${encodeURIComponent(img.artist.replace(/ /g, '_'))}`;
  } else {
    elImageArtistLink.href = getArtistUrlFromImage(img);
  }

  // Enlace original
  elImageViewOriginal.href = img.original_url;
  elImageViewOriginal.classList.remove('hidden');
}

// Aplica el estado de habilitación del fondo (ON/OFF)
function applyBackgroundState() {
  if (currentSettings.bgEnabled) {
    elToggleBgBtn.classList.remove('off');
    elToggleBgBtn.title = "Apagar imágenes de fondo (ON)";
    document.getElementById('image-info-widget').classList.remove('hidden');
    elRefreshBtn.disabled = false;
    elRefreshBtn.style.opacity = '1';
    elRefreshBtn.style.pointerEvents = 'auto';
  } else {
    elToggleBgBtn.classList.add('off');
    elToggleBgBtn.title = "Encender imágenes de fondo (OFF)";
    document.getElementById('image-info-widget').classList.add('hidden');
    elRefreshBtn.disabled = true;
    elRefreshBtn.style.opacity = '0.5';
    elRefreshBtn.style.pointerEvents = 'none';
    
    // Aplicar degradado cyberpunk por defecto
    resetBackgroundLayers();
    elBgActive.style.backgroundColor = 'var(--clr-bg-deep)';
    elBgActive.style.background = 'radial-gradient(circle, rgba(0,240,255,0.06) 0%, rgba(255,0,127,0.06) 100%), var(--clr-bg-deep)';
  }
}

// Carga la siguiente imagen
async function loadNextImage() {
  if (!currentSettings.bgEnabled) {
    applyBackgroundState();
    return;
  }

  // Si hemos fallado demasiadas veces seguidas, mostramos el degradado por defecto
  if (loadRetries >= 3) {
    console.warn('Demasiados fallos al cargar imágenes. Usando fondo por defecto.');
    currentImage = null;
    updateImageMetadataUI(null);
    
    resetBackgroundLayers();
    elBgActive.style.backgroundColor = 'var(--clr-bg-deep)';
    elBgActive.style.background = 'radial-gradient(circle, rgba(0,240,255,0.08) 0%, rgba(255,0,127,0.08) 100%), var(--clr-bg-deep)';
    elRefreshIcon.classList.remove('spinning');
    elRefreshBtn.disabled = false;
    
    loadRetries = 0; // reset
    return;
  }

  const nextImg = await getNextImageFromCache();
  
  if (nextImg) {
    currentImage = nextImg;
    setBackgroundImage(nextImg.image_url);
    updateImageMetadataUI(nextImg);
  } else {
    // Si no hay imagen, usar el fondo por defecto (Cyberpunk Gradient / Logo)
    currentImage = null;
    updateImageMetadataUI(null);
    resetBackgroundLayers();
    elBgActive.style.backgroundColor = 'var(--clr-bg-deep)';
    // Agregar un gradiente por defecto
    elBgActive.style.background = 'radial-gradient(circle, rgba(0,240,255,0.08) 0%, rgba(255,0,127,0.08) 100%), var(--clr-bg-deep)';
    elRefreshIcon.classList.remove('spinning');
    elRefreshBtn.disabled = false;
  }
}

// ==========================================================================
// 6. CONTROLADORES DEL PANEL DE CONFIGURACIÓN
// ==========================================================================

// Renderiza dinámicamente una fila para una API personalizada con su nombre, URL, interruptor NSFW y estado habilitado
function addCustomApiRow(name = '', url = '', nsfw = false, enabled = true, id = '') {
  if (!id) {
    id = 'api_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9);
  }
  
  const row = document.createElement('div');
  row.className = 'custom-api-row';
  row.setAttribute('data-id', id);
  row.dataset.enabled = enabled ? 'true' : 'false';
  
  const sfwText = (typeof chrome !== 'undefined' && chrome.i18n) ? chrome.i18n.getMessage('sfwText') || 'SFW' : 'SFW';
  const nsfwText = (typeof chrome !== 'undefined' && chrome.i18n) ? chrome.i18n.getMessage('nsfwText') || 'NSFW' : 'NSFW';
  const labelText = nsfw ? nsfwText : sfwText;
  const labelClass = nsfw ? 'nsfw' : 'sfw';
  
  const streamerModeActive = elStreamerModeToggle && elStreamerModeToggle.checked;
  const displayStyle = streamerModeActive ? 'display: none;' : '';
  const disabledAttr = streamerModeActive ? 'disabled' : '';

  row.innerHTML = `
    <input type="text" class="custom-api-name" placeholder="Nombre (ej. Safebooru)" value="${name}" ${disabledAttr}>
    <input type="text" class="custom-api-url" placeholder="URL de la API JSON" value="${url}" ${disabledAttr}>
    <label class="switch mini-switch" title="NSFW / SFW" style="${displayStyle}">
      <input type="checkbox" class="custom-api-nsfw" ${nsfw ? 'checked' : ''} ${disabledAttr}>
      <span class="slider round"></span>
    </label>
    <span class="custom-api-nsfw-label ${labelClass}" style="${displayStyle}">${labelText}</span>
    <button type="button" class="custom-api-delete-btn" title="Eliminar API" ${disabledAttr}>✕</button>
  `;
  
  const nsfwToggle = row.querySelector('.custom-api-nsfw');
  const nsfwLabel = row.querySelector('.custom-api-nsfw-label');
  
  nsfwToggle.addEventListener('change', () => {
    const isNsfw = nsfwToggle.checked;
    nsfwLabel.textContent = isNsfw ? nsfwText : sfwText;
    nsfwLabel.className = `custom-api-nsfw-label ${isNsfw ? 'nsfw' : 'sfw'}`;
    renderSourcesChecklist();
  });
  
  const nameInput = row.querySelector('.custom-api-name');
  nameInput.addEventListener('input', () => {
    const checkbox = elCustomSourcesContainer.querySelector(`.custom-source-checkbox[data-id="${id}"]`);
    if (checkbox) {
      const labelSpan = checkbox.parentElement.querySelector('.custom-source-label');
      if (labelSpan) {
        labelSpan.textContent = nameInput.value.trim() || 'Custom API';
      }
    }
  });

  row.querySelector('.custom-api-delete-btn').addEventListener('click', () => {
    row.remove();
    renderSourcesChecklist();
  });
  
  elCustomApisContainer.appendChild(row);
  renderSourcesChecklist();
}

// Obtiene la lista actual de APIs personalizadas leyendo desde el DOM
function getCustomApisFromDOM() {
  const apis = [];
  elCustomApisContainer.querySelectorAll('.custom-api-row').forEach(row => {
    const id = row.getAttribute('data-id');
    const name = row.querySelector('.custom-api-name').value.trim() || 'Custom API';
    const url = row.querySelector('.custom-api-url').value.trim();
    const nsfw = row.querySelector('.custom-api-nsfw').checked;
    const checkbox = elCustomSourcesContainer.querySelector(`.custom-source-checkbox[data-id="${id}"]`);
    const enabled = checkbox ? checkbox.checked : (row.dataset.enabled === 'true');
    apis.push({ id, name, url, nsfw, enabled });
  });
  return apis;
}

// Renderiza dinámicamente el checklist de Fuentes de Imágenes para APIs personalizadas
function renderSourcesChecklist() {
  const apis = getCustomApisFromDOM();
  elCustomSourcesContainer.innerHTML = '';
  
  const safeSearch = elSafeSearchToggle.checked;
  const streamerMode = elStreamerModeToggle && elStreamerModeToggle.checked;
  const skippedText = (typeof chrome !== 'undefined' && chrome.i18n) 
    ? chrome.i18n.getMessage('skippedBySafeSearch') || 'Omitida por Búsqueda Segura' 
    : 'Omitida por Búsqueda Segura';
  
  apis.forEach(api => {
    // Si el modo streamer está activo y la API es NSFW, no se muestra en el checklist de fuentes
    if (streamerMode && api.nsfw) {
      return;
    }
    const container = document.createElement('label');
    const isNsfwFiltered = safeSearch && api.nsfw;
    
    container.className = `checkbox-container ${isNsfwFiltered ? 'nsfw-disabled' : ''}`;
    if (isNsfwFiltered) {
      container.title = skippedText;
    }
    
    container.innerHTML = `
      <input type="checkbox" class="custom-source-checkbox" data-id="${api.id}" ${api.enabled ? 'checked' : ''} ${isNsfwFiltered ? 'disabled' : ''}>
      <span class="checkmark"></span>
      <span class="custom-source-label">${escapeHtml(api.name)}</span>
      ${api.nsfw ? `<span class="nsfw-warning-badge" title="${isNsfwFiltered ? skippedText : ''}">NSFW</span>` : ''}
    `;
    
    const checkbox = container.querySelector('.custom-source-checkbox');
    checkbox.addEventListener('change', () => {
      const row = elCustomApisContainer.querySelector(`.custom-api-row[data-id="${api.id}"]`);
      if (row) {
        row.dataset.enabled = checkbox.checked ? 'true' : 'false';
      }
    });
    
    elCustomSourcesContainer.appendChild(container);
  });
}

// Aplica el estado de la UI según el Modo Streamer
function applyStreamerModeUIState() {
  const isStreamer = elStreamerModeToggle.checked;
  
  if (isStreamer) {
    // Forzar Búsqueda Segura activa y deshabilitarla
    elSafeSearchToggle.checked = true;
    elSafeSearchToggle.disabled = true;
    
    // Ocultar las filas de APIs que sean NSFW. En las SFW, ocultar el switch NSFW y deshabilitar edición
    elCustomApisContainer.querySelectorAll('.custom-api-row').forEach(row => {
      const nsfwToggle = row.querySelector('.custom-api-nsfw');
      const isNsfw = nsfwToggle && nsfwToggle.checked;
      
      if (isNsfw) {
        row.style.display = 'none'; // Ocultar por completo la API si es NSFW
      } else {
        row.style.display = '';
        const switchEl = row.querySelector('.switch.mini-switch');
        if (switchEl) switchEl.style.display = 'none';
        const labelEl = row.querySelector('.custom-api-nsfw-label');
        if (labelEl) labelEl.style.display = 'none';
        
        const nameInput = row.querySelector('.custom-api-name');
        if (nameInput) nameInput.disabled = true;
        const urlInput = row.querySelector('.custom-api-url');
        if (urlInput) urlInput.disabled = true;
        const deleteBtn = row.querySelector('.custom-api-delete-btn');
        if (deleteBtn) deleteBtn.disabled = true;
      }
    });
    
    // Deshabilitar la adición de nuevas APIs
    elAddCustomApiBtn.disabled = true;
    elAddCustomApiBtn.style.opacity = '0.5';
    elAddCustomApiBtn.style.cursor = 'not-allowed';
  } else {
    // Restaurar estado normal
    elSafeSearchToggle.disabled = false;
    
    elCustomApisContainer.querySelectorAll('.custom-api-row').forEach(row => {
      row.style.display = ''; // Mostrar todas las filas
      const switchEl = row.querySelector('.switch.mini-switch');
      if (switchEl) switchEl.style.display = '';
      const labelEl = row.querySelector('.custom-api-nsfw-label');
      if (labelEl) labelEl.style.display = '';
      
      const nameInput = row.querySelector('.custom-api-name');
      if (nameInput) nameInput.disabled = false;
      const urlInput = row.querySelector('.custom-api-url');
      if (urlInput) urlInput.disabled = false;
      const deleteBtn = row.querySelector('.custom-api-delete-btn');
      if (deleteBtn) deleteBtn.disabled = false;
    });
    
    elAddCustomApiBtn.disabled = false;
    elAddCustomApiBtn.style.opacity = '';
    elAddCustomApiBtn.style.cursor = '';
  }
  
  // Actualizar checklist de fuentes para ocultar/mostrar las NSFW
  renderSourcesChecklist();
}

function setupSettingsPanel() {
  // Configurar listener para agregar nuevas filas de APIs personalizadas
  elAddCustomApiBtn.addEventListener('click', () => {
    addCustomApiRow('', '', false, true);
  });

  // Escuchar cambios en Búsqueda Segura para actualizar el checklist de fuentes en tiempo real
  elSafeSearchToggle.addEventListener('change', () => {
    renderSourcesChecklist();
  });

  // Escuchar cambios en Modo Streamer para actualizar la UI en tiempo real
  elStreamerModeToggle.addEventListener('change', () => {
    applyStreamerModeUIState();
  });

  // Abrir Ajustes
  elSettingsBtn.addEventListener('click', () => {
    // Cargar valores actuales en los controles del formulario
    elSourceDanbooru.checked = currentSettings.sources.danbooru;
    elSourceGelbooru.checked = currentSettings.sources.gelbooru;
    elSafeSearchToggle.checked = currentSettings.safeSearch;
    elStreamerModeToggle.checked = currentSettings.streamerMode || false;
    elBlurSlider.value = currentSettings.blur;
    elBlurValue.textContent = `${currentSettings.blur}px`;
    elOpacitySlider.value = currentSettings.opacity;
    elOpacityValue.textContent = `${currentSettings.opacity}%`;
    elFitSelect.value = currentSettings.imageFit || 'contain';
    elCustomTagsInput.value = currentSettings.customTags;

    // Cargar APIs personalizadas dinámicamente
    elCustomApisContainer.innerHTML = '';
    elCustomSourcesContainer.innerHTML = '';
    const apisList = currentSettings.customApis || [];
    if (Array.isArray(apisList)) {
      apisList.forEach(api => {
        addCustomApiRow(api.name, api.url, api.nsfw || false, api.enabled !== false, api.id || '');
      });
    }

    // Aplicar el estado del Modo Streamer en la UI
    applyStreamerModeUIState();

    // Credenciales
    elDanbooruUsername.value = currentSettings.danbooruUsername || '';
    elDanbooruApiKey.value = currentSettings.danbooruApiKey || '';
    elGelbooruUserId.value = currentSettings.gelbooruUserId || '';
    elGelbooruApiKey.value = currentSettings.gelbooruApiKey || '';

    // Abrir drawer
    elSettingsDrawer.classList.remove('hidden');
    elSettingsDrawer.offsetHeight;
    elSettingsDrawer.classList.add('active');
  });

  // Cerrar Ajustes
  const closeDrawer = () => {
    elSettingsDrawer.classList.remove('active');
    setTimeout(() => {
      elSettingsDrawer.classList.add('hidden');
    }, 400);
  };

  elCloseSettingsBtn.addEventListener('click', closeDrawer);

  // Guardar Ajustes
  elSaveSettingsBtn.addEventListener('click', async () => {
    const isDanbooru = elSourceDanbooru.checked;
    const isGelbooru = elSourceGelbooru.checked;

    // Leer todas las APIs personalizadas configuradas en la lista
    const newCustomApis = [];
    elCustomApisContainer.querySelectorAll('.custom-api-row').forEach(row => {
      const id = row.getAttribute('data-id');
      const name = row.querySelector('.custom-api-name').value.trim();
      const url = row.querySelector('.custom-api-url').value.trim();
      const nsfw = row.querySelector('.custom-api-nsfw').checked;
      const enabled = row.dataset.enabled === 'true';
      if (url) {
        newCustomApis.push({
          id: id,
          name: name || 'Custom API',
          url: url,
          nsfw: nsfw,
          enabled: enabled
        });
      }
    });

    // Validar que al menos una fuente esté activa y habilitada
    const hasEnabledCustomApi = newCustomApis.some(api => api.enabled);
    if (!isDanbooru && !isGelbooru && !hasEnabledCustomApi) {
      const errorMsg = (typeof chrome !== 'undefined' && chrome.i18n)
        ? chrome.i18n.getMessage('errorSelectSource')
        : 'Debes seleccionar al menos una fuente de imágenes (Danbooru, Gelbooru o una API Personalizada).';
      alert(errorMsg);
      return;
    }

    const newCustomTags = elCustomTagsInput.value.trim();
    const newSafeSearch = elSafeSearchToggle.checked;
    const newStreamerMode = elStreamerModeToggle.checked;
    const danUsername = elDanbooruUsername.value.trim();
    const danApiKey = elDanbooruApiKey.value.trim();
    const gelUserId = elGelbooruUserId.value.trim();
    const gelApiKey = elGelbooruApiKey.value.trim();

    // Detectar si hubo cambios críticos que invaliden el caché actual
    const tagsChanged = currentSettings.customTags !== newCustomTags;
    const customApisChanged = JSON.stringify(currentSettings.customApis) !== JSON.stringify(newCustomApis);
    const safeSearchChanged = currentSettings.safeSearch !== newSafeSearch;
    const streamerModeChanged = currentSettings.streamerMode !== newStreamerMode;
    const sourcesChanged = currentSettings.sources.danbooru !== isDanbooru || 
                           currentSettings.sources.gelbooru !== isGelbooru;
    const credentialsChanged = currentSettings.danbooruUsername !== danUsername ||
                               currentSettings.danbooruApiKey !== danApiKey ||
                               currentSettings.gelbooruUserId !== gelUserId ||
                               currentSettings.gelbooruApiKey !== gelApiKey;

    // Actualizar configuración local
    currentSettings = {
      sources: {
        danbooru: isDanbooru,
        gelbooru: isGelbooru
      },
      safeSearch: newSafeSearch,
      streamerMode: newStreamerMode,
      searchEngine: currentSettings.searchEngine,
      blur: parseInt(elBlurSlider.value),
      opacity: parseInt(elOpacitySlider.value),
      imageFit: elFitSelect.value,
      customTags: newCustomTags,
      customApis: newCustomApis,
      bgEnabled: currentSettings.bgEnabled,
      danbooruUsername: danUsername,
      danbooruApiKey: danApiKey,
      gelbooruUserId: gelUserId,
      gelbooruApiKey: gelApiKey
    };

    // Guardar en chrome.storage
    await chrome.storage.local.set({ settings: currentSettings });

    // Aplicar estilos visuales de inmediato
    applyVisualSettings();

    // Si cambiaron las etiquetas, el filtro, el modo streamer, las fuentes, las credenciales o las APIs personalizadas, vaciamos el caché y hacemos fetch nuevo
    if (tagsChanged || customApisChanged || safeSearchChanged || streamerModeChanged || sourcesChanged || credentialsChanged) {
      console.log('Se detectaron cambios que invalidan el caché. Vaciando caché antiguo...');
      await chrome.storage.local.set({ image_cache: [] });
      await refillCache();
      loadNextImage();
    }

    closeDrawer();
  });

  // Escuchar Sliders para previsualización en tiempo real
  elBlurSlider.addEventListener('input', (e) => {
    const val = e.target.value;
    elBlurValue.textContent = `${val}px`;
    document.documentElement.style.setProperty('--bg-blur', `${val}px`);
  });

  elOpacitySlider.addEventListener('input', (e) => {
    const val = e.target.value;
    elOpacityValue.textContent = `${val}%`;
    document.documentElement.style.setProperty('--bg-overlay-opacity', val / 100);
  });

  elFitSelect.addEventListener('change', (e) => {
    const val = e.target.value;
    if (val === 'cover') {
      document.body.classList.add('fit-cover');
    } else {
      document.body.classList.remove('fit-cover');
    }
  });

  // Vaciar Caché
  elClearCacheBtn.addEventListener('click', async () => {
    const confirmMsg = (typeof chrome !== 'undefined' && chrome.i18n)
      ? chrome.i18n.getMessage('confirmClearCache')
      : '¿Seguro que quieres vaciar el caché de imágenes? Se descargarán nuevas.';
    if (confirm(confirmMsg)) {
      await chrome.storage.local.set({ image_cache: [] });
      elCacheCount.textContent = '0';
      await refillCache();
      loadNextImage();
    }
  });

  // Botón manual de Siguiente Imagen
  elRefreshBtn.addEventListener('click', () => {
    loadNextImage();
  });
}

function applyVisualSettings() {
  document.documentElement.style.setProperty('--bg-blur', `${currentSettings.blur}px`);
  document.documentElement.style.setProperty('--bg-overlay-opacity', currentSettings.opacity / 100);
  
  if (currentSettings.imageFit === 'cover') {
    document.body.classList.add('fit-cover');
  } else {
    document.body.classList.remove('fit-cover');
  }
}

// Traduce la interfaz según el idioma del usuario
function translateHTML() {
  const isExtensionContext = typeof chrome !== 'undefined' && chrome.i18n;
  if (!isExtensionContext) return;

  document.title = chrome.i18n.getMessage('tabTitle') || document.title;

  document.querySelectorAll('[data-i18n]').forEach(element => {
    const key = element.getAttribute('data-i18n');
    const message = chrome.i18n.getMessage(key);
    if (message) {
      element.textContent = message;
    }
  });

  document.querySelectorAll('[data-i18n-placeholder]').forEach(element => {
    const key = element.getAttribute('data-i18n-placeholder');
    const message = chrome.i18n.getMessage(key);
    if (message) {
      element.placeholder = message;
    }
  });

  document.querySelectorAll('[data-i18n-title]').forEach(element => {
    const key = element.getAttribute('data-i18n-title');
    const message = chrome.i18n.getMessage(key);
    if (message) {
      element.title = message;
    }
  });
}

// ==========================================================================
// 7. INICIALIZACIÓN DE LA EXTENSIÓN
// ==========================================================================

async function init() {
  // Traducir la página antes de mostrar contenido
  translateHTML();

  // Cargar configuración de almacenamiento
  const data = await chrome.storage.local.get(['settings', 'image_cache']);
  
  if (data.settings) {
    currentSettings = { ...DEFAULT_SETTINGS, ...data.settings };
    // Migración: si customApis es un string, lo convertimos a un array de objetos
    if (typeof currentSettings.customApis === 'string') {
      if (currentSettings.customApis.trim() !== '') {
        currentSettings.customApis = currentSettings.customApis
          .split('\n')
          .map(line => line.trim())
          .filter(line => line !== '')
          .map((url, idx) => ({ 
            id: 'api_' + (Date.now() + idx) + '_' + Math.random().toString(36).substring(2, 9),
            name: '', 
            url, 
            nsfw: false, 
            enabled: true 
          }));
      } else {
        currentSettings.customApis = [];
      }
    } else if (Array.isArray(currentSettings.customApis)) {
      // Si ya es un array, nos aseguramos de que todos tengan id, nsfw y enabled
      currentSettings.customApis = currentSettings.customApis.map((api, idx) => {
        const updatedApi = { ...api };
        if (!updatedApi.id) {
          updatedApi.id = 'api_' + (Date.now() + idx) + '_' + Math.random().toString(36).substring(2, 9);
        }
        if (updatedApi.nsfw === undefined) {
          updatedApi.nsfw = false;
        }
        if (updatedApi.enabled === undefined) {
          updatedApi.enabled = true;
        }
        return updatedApi;
      });
    }
  } else {
    currentSettings = { ...DEFAULT_SETTINGS };
    await chrome.storage.local.set({ settings: currentSettings });
  }

  // Actualizar UI del buscador
  updateSearchEngineUI();

  // Aplicar configuraciones visuales (Desenfoque, opacidad)
  applyVisualSettings();

  // Aplicar estado del fondo (ON/OFF)
  applyBackgroundState();

  // Botón toggle de fondo ON/OFF
  elToggleBgBtn.addEventListener('click', async () => {
    currentSettings.bgEnabled = !currentSettings.bgEnabled;
    await chrome.storage.local.set({ settings: currentSettings });
    applyBackgroundState();
    
    // Si se acaba de activar, cargar la primera imagen de inmediato
    if (currentSettings.bgEnabled) {
      loadNextImage();
    }
  });

  // Botón toggle de visibilidad de UI (Modo Zen)
  elToggleUiBtn.addEventListener('click', () => {
    const isHidden = document.body.classList.toggle('ui-hidden');
    
    // Cambiar el icono SVG y el título del botón según el estado
    if (isHidden) {
      elToggleUiIcon.innerHTML = `
        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
        <line x1="1" y1="1" x2="23" y2="23"></line>
      `;
      const hiddenTooltip = (typeof chrome !== 'undefined' && chrome.i18n)
        ? (chrome.i18n.getUILanguage().startsWith('es') ? 'Mostrar interfaz' : 'Show interface')
        : 'Mostrar interfaz';
      elToggleUiBtn.title = hiddenTooltip;
    } else {
      elToggleUiIcon.innerHTML = `
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
        <circle cx="12" cy="12" r="3"></circle>
      `;
      const shownTooltip = (typeof chrome !== 'undefined' && chrome.i18n)
        ? chrome.i18n.getMessage('toggleUiTooltip') || 'Ocultar interfaz (Modo Zen)'
        : 'Ocultar interfaz (Modo Zen)';
      elToggleUiBtn.title = shownTooltip;
    }
  });

  // Configurar listeners del panel de ajustes
  setupSettingsPanel();

  // Configurar buscador
  setupSearch();

  // Inicializar accesos directos
  await loadShortcuts();
  setupShortcutsDialog();

  // Mostrar conteo inicial del caché en los ajustes
  const cache = data.image_cache || [];
  elCacheCount.textContent = cache.length;

  // Cargar la primera imagen de fondo (si el fondo está activo)
  if (currentSettings.bgEnabled) {
    await loadNextImage();
  }

  // Rellenar caché si está vacío o bajo (independiente de si está ON u OFF para estar listo cuando se active)
  if (cache.length < 5) {
    refillCache();
  }
}

// Ejecutar inicialización al cargar el DOM
document.addEventListener('DOMContentLoaded', init);
