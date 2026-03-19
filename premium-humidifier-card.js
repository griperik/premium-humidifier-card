// ============================================================
//  Premium Humidifier Card  v3
//  /config/www/premium-humidifier-card.js
//  Resurs: /local/premium-humidifier-card.js?v=24
// ============================================================

const HUM_TRANSLATIONS = {
  sv: { humidity:'Luftfuktighet', temperature:'Temperatur', target:'Mål', tank:'Vattentank',
        active:'Aktiv', inactive:'Inaktiv', mode:'Läge', humidifying:'Fuktifierar',
        idle:'Väntar', water_level:'Vattennivå', target_humidity:'Målvärde' },
  en: { humidity:'Humidity', temperature:'Temperature', target:'Target', tank:'Water Tank',
        active:'Active', inactive:'Inactive', mode:'Mode', humidifying:'Humidifying',
        idle:'Idle', water_level:'Water Level', target_humidity:'Target Humidity' },
  de: { humidity:'Luftfeuchtigkeit', temperature:'Temperatur', target:'Ziel', tank:'Wassertank',
        active:'Aktiv', inactive:'Inaktiv', mode:'Modus', humidifying:'Befeuchtet',
        idle:'Bereit', water_level:'Wasserstand', target_humidity:'Zielfeuchte' },
  fr: { humidity:'Humidité', temperature:'Température', target:'Cible', tank:'Réservoir',
        active:'Actif', inactive:'Inactif', mode:'Mode', humidifying:'Humidifie',
        idle:'Veille', water_level:"Niveau d'eau", target_humidity:'Humidité cible' },
  nl: { humidity:'Vochtigheid', temperature:'Temperatuur', target:'Doel', tank:'Watertank',
        active:'Actief', inactive:'Inactief', mode:'Modus', humidifying:'Bevochtigt',
        idle:'Wacht', water_level:'Waterniveau', target_humidity:'Doelvochtigheid' },
  nb: { humidity:'Luftfuktighet', temperature:'Temperatur', target:'Mål', tank:'Vannbeholder',
        active:'Aktiv', inactive:'Inaktiv', mode:'Modus', humidifying:'Fukter',
        idle:'Venter', water_level:'Vannivå', target_humidity:'Målverdi' },
  da: { humidity:'Luftfugtighed', temperature:'Temperatur', target:'Mål', tank:'Vandtank',
        active:'Aktiv', inactive:'Inaktiv', mode:'Tilstand', humidifying:'Fugter',
        idle:'Venter', water_level:'Vandniveau', target_humidity:'Målværdi' },
  fi: { humidity:'Kosteus', temperature:'Lämpötila', target:'Tavoite', tank:'Vesisäiliö',
        active:'Aktiivinen', inactive:'Ei aktiivinen', mode:'Tila', humidifying:'Kostuttaa',
        idle:'Odottaa', water_level:'Vesitaso', target_humidity:'Tavoitekosteus' },
  es: { humidity:'Humedad', temperature:'Temperatura', target:'Objetivo', tank:'Depósito',
        active:'Activo', inactive:'Inactivo', mode:'Modo', humidifying:'Humidificando',
        idle:'Espera', water_level:'Nivel de agua', target_humidity:'Humedad objetivo' },
  pl: { humidity:'Wilgotność', temperature:'Temperatura', target:'Cel', tank:'Zbiornik',
        active:'Aktywny', inactive:'Nieaktywny', mode:'Tryb', humidifying:'Nawilża',
        idle:'Czeka', water_level:'Poziom wody', target_humidity:'Docelowa wilgotność' },
};

function humTr(lang, key) {
  const base = (lang||'en').split('-')[0].toLowerCase();
  return (HUM_TRANSLATIONS[base]||HUM_TRANSLATIONS.en)[key] || HUM_TRANSLATIONS.en[key] || key;
}

// ── Color helpers ─────────────────────────────────────────
function toHexH(color) {
  if (!color) return '#000000';
  if (typeof color === 'string') {
    const c = color.trim();
    if (c.startsWith('#')) return c.length === 7 ? c : '#000000';
    const parts = c.split(',').map(Number);
    if (parts.length === 3) return '#' + parts.map(v => Math.min(255,Math.max(0,v)).toString(16).padStart(2,'0')).join('');
    return '#000000';
  }
  if (Array.isArray(color) && color.length === 3)
    return '#' + color.map(v => Math.min(255,Math.max(0,Math.round(v))).toString(16).padStart(2,'0')).join('');
  return '#000000';
}
function hexToRgbH(hex) {
  const h = toHexH(hex).replace('#','');
  return { r:parseInt(h.slice(0,2),16)||0, g:parseInt(h.slice(2,4),16)||0, b:parseInt(h.slice(4,6),16)||0 };
}
function isDarkH(hex) {
  try { const {r,g,b}=hexToRgbH(toHexH(hex)); return (0.299*r+0.587*g+0.114*b)<140; } catch{return false;}
}
function alphaH(hex,a) {
  try { const {r,g,b}=hexToRgbH(toHexH(hex)); return `rgba(${r},${g},${b},${a})`; } catch{return hex;}
}

// ── Tank helpers ──────────────────────────────────────────
// Returns { pct: 0-100, label: string, isNumeric: bool } or null
function parseTankState(state) {
  if (!state || state === 'unavailable' || state === 'unknown') return null;
  const num = parseFloat(state);
  if (!isNaN(num)) {
    const pct = Math.min(100, Math.max(0, num));
    return { pct, label: Math.round(pct) + '%', isNumeric: true };
  }
  // Text → approximate percentage for wave positioning
  const lower = state.toLowerCase().trim();
  const map = {
    'empty':5,  'tom':5,   'leer':5,  'vide':5,   'vacío':5,  'pusty':5,
    'low':25,   'låg':25,  'niedrig':25,'bas':25,  'bajo':25,  'niski':25, 'lite':25,
    'normal':60,'medium':60,'mittel':60,'moyen':60,'normaal':60,'medio':60,
    'high':85,  'hög':85,  'hoch':85, 'haut':85,  'hoog':85,  'alto':85,  'wysoki':85,
    'full':97,  'voll':97, 'plein':97,'vol':97,   'lleno':97, 'pełny':97,
  };
  let pct = map[lower];
  if (pct === undefined) {
    const key = Object.keys(map).find(k => lower.includes(k));
    pct = key ? map[key] : 50;
  }
  // Show original text with first letter capitalised
  const label = state.charAt(0).toUpperCase() + state.slice(1).toLowerCase();
  return { pct, label, isNumeric: false };
}

function tankColor(pct, primaryColor) {
  if (pct <= 10) return '#e53935';
  if (pct <= 30) return '#ff7043';
  if (pct <= 55) return '#ffb300';
  return primaryColor;
}

// ════════════════════════════════════════════════════════════
//  EDITOR
// ════════════════════════════════════════════════════════════
class PremiumHumidifierCardEditor extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({mode:'open'});
    this._config = {};
    this._hass   = null;
    this._built  = false;
  }

  setConfig(config) { this._config = {...config}; this._build(); }
  set hass(hass)    { this._hass = hass; this._build(); }

  _schema() {
    const useCustom = this._config.use_custom_mode;
    return [
      { name:'name',                selector:{ text:{} } },
      { name:'power_entity',        selector:{ entity:{ domain:'humidifier' } } },
      { name:'humidity_entity',     selector:{ entity:{ domain:'sensor', unit_of_measurement:'%' } } },
      { name:'temperature_entity',  selector:{ entity:{ domain:'sensor', unit_of_measurement:['°C','°F'] } } },
      { name:'show_tank',           selector:{ boolean:{} } },
      ...(this._config.show_tank ? [{ name:'tank_entity', selector:{ entity:{ domain:'sensor' } } }] : []),
      { name:'use_custom_mode',     selector:{ boolean:{} } },
      ...(useCustom ? [{ name:'custom_mode_entity', selector:{ entity:{} } }] : []),
      {
        type:'grid', name:'', flatten:true,
        schema:[
          { name:'show_stat_boxes',      selector:{ boolean:{} } },
          { name:'show_slider_box',      selector:{ boolean:{} } },
          { name:'show_temperature',     selector:{ boolean:{} } },
          { name:'show_humidity',        selector:{ boolean:{} } },
          { name:'show_mode_tile',       selector:{ boolean:{} } },
          { name:'show_speed_slider',    selector:{ boolean:{} } },
          { name:'show_background_glow', selector:{ boolean:{} } },
          { name:'show_steam',           selector:{ boolean:{} } },
          { name:'animate_water',        selector:{ boolean:{} } },
        ]
      },
      { name:'steam_speed',   selector:{ number:{ min:0, max:100, step:1 } } },
      { name:'center_size',  selector:{ number:{ min:0, max:100, step:1 } } },
      {
        type:'grid', name:'', flatten:true,
        schema:[
          { name:'color_primary',   selector:{ color_rgb:{} } },
          { name:'color_secondary', selector:{ color_rgb:{} } },
          { name:'color_bg1',       selector:{ color_rgb:{} } },
          { name:'color_bg2',       selector:{ color_rgb:{} } },
        ]
      },
      { name:'card_opacity', selector:{ number:{ min:0, max:100, step:1 } } },
      { name:'use_custom_value_colors', selector:{ boolean:{} } },
      ...(this._config.use_custom_value_colors ? [{
        type:'grid', name:'', flatten:true,
        schema:[
          { name:'color_hum_value',    selector:{ color_rgb:{} } },
          { name:'color_temp_value',   selector:{ color_rgb:{} } },
          { name:'color_mode_value',   selector:{ color_rgb:{} } },
          { name:'color_target_value', selector:{ color_rgb:{} } },
        ]
      }] : []),
      { name:'color_center_text', selector:{ color_rgb:{} } },
      { name:'use_custom_water_colors', selector:{ boolean:{} } },
      ...(this._config.use_custom_water_colors ? [{
        type:'grid', name:'', flatten:true,
        schema:[
          { name:'color_water1', selector:{ color_rgb:{} } },
          { name:'color_water2', selector:{ color_rgb:{} } },
        ]
      }] : []),
    ];
  }

  _lang() { return (this._hass?.language||'sv').split('-')[0].toLowerCase(); }

  _computeLabel(schema) {
    const lang = this._lang();
    const sv = {
      name:'Kortnamn', power_entity:'Luftfuktare-entitet (humidifier)',
      humidity_entity:'Luftfuktighetssensor (extra)', temperature_entity:'Temperatursensor',
      show_tank:'Visa vattentank', tank_entity:'Vattentank-sensor (% eller text)',
      use_custom_mode:'Custom lägesväljare', custom_mode_entity:'Välj din select-entitet',
      show_stat_boxes:'Visa rutor runt sensorer', show_slider_box:'Visa ruta runt slider',
      show_temperature:'Visa temperatur', show_humidity:'Visa luftfuktighet',
      show_mode_tile:'Visa lägesruta', show_speed_slider:'Visa målvärde-slider',
      show_background_glow:'Visa bakgrundsglow',
      show_steam:'Visa ångpartiklar', animate_water:'Animera vatten',
      steam_speed:'Ånghastighet (0-100)', center_size:'Storlek på mitttext (0-100)',
      card_opacity:'Kortets transparens (0=genomskinlig, 100=solid)',
      color_primary:'Primärfärg', color_secondary:'Sekundärfärg',
      color_bg1:'Bakgrund ljus', color_bg2:'Bakgrund mörk',
      use_custom_value_colors:'Anpassa värdefärger',
      color_center_text:'Mitttext färg',
      color_hum_value:'Luftfuktighetsvärde färg', color_temp_value:'Temperaturvärde färg',
      color_mode_value:'Lägesvärde färg', color_target_value:'Målvärde färg',
      color_center_text:'Mitttext färg (humidity + target)',
      use_custom_water_colors:'Anpassa vattenfärger',
      color_water1:'Vatten primärfärg', color_water2:'Vatten sekundärfärg',
    };
    const en = {
      name:'Card name', power_entity:'Humidifier entity',
      humidity_entity:'Humidity sensor (extra)', temperature_entity:'Temperature sensor',
      show_tank:'Show water tank', tank_entity:'Water tank sensor (% or text)',
      use_custom_mode:'Custom mode selector', custom_mode_entity:'Select your entity',
      show_stat_boxes:'Show boxes around sensors', show_slider_box:'Show box around slider',
      show_temperature:'Show temperature', show_humidity:'Show humidity',
      show_mode_tile:'Show mode tile', show_speed_slider:'Show target humidity slider',
      show_background_glow:'Show background glow',
      show_steam:'Show steam particles', animate_water:'Animate water',
      steam_speed:'Steam speed (0-100)', center_size:'Center text size (0-100)',
      card_opacity:'Card transparency (0=transparent, 100=solid)',
      color_primary:'Primary color', color_secondary:'Secondary color',
      color_bg1:'Background light', color_bg2:'Background dark',
      use_custom_value_colors:'Customize value colors',
      color_center_text:'Center text color',
      color_hum_value:'Humidity value color', color_temp_value:'Temperature value color',
      color_mode_value:'Mode value color', color_target_value:'Target value color',
      color_center_text:'Center text color (humidity + target)',
      use_custom_water_colors:'Customize water colors',
      color_water1:'Water primary color', color_water2:'Water secondary color',
    };
    const de = {
      name:'Kartenname', power_entity:'Luftbefeuchter-Entität',
      humidity_entity:'Feuchtigkeitssensor (extra)', temperature_entity:'Temperatursensor',
      show_tank:'Wassertank anzeigen', tank_entity:'Wassertanksensor (% oder Text)',
      use_custom_mode:'Benutzerdefinierter Moduswahlschalter', custom_mode_entity:'Entität auswählen',
      show_stat_boxes:'Rahmen anzeigen', show_slider_box:'Rahmen um Slider anzeigen',
      show_temperature:'Temperatur anzeigen', show_humidity:'Luftfeuchtigkeit anzeigen',
      show_mode_tile:'Moduskachel anzeigen', show_speed_slider:'Zielfeuchte-Slider anzeigen',
      show_background_glow:'Hintergrundleuchten anzeigen',
      show_steam:'Dampfpartikel anzeigen', animate_water:'Wasser animieren',
      steam_speed:'Dampfgeschwindigkeit (0-100)', center_size:'Mitttextgröße (0-100)',
      card_opacity:'Kartentransparenz',
      color_primary:'Primärfarbe', color_secondary:'Sekundärfarbe',
      color_bg1:'Hintergrund hell', color_bg2:'Hintergrund dunkel',
      use_custom_value_colors:'Wertefarben anpassen',
      color_center_text:'Mittetextfarbe',
      color_hum_value:'Feuchtigkeitswert', color_temp_value:'Temperaturwert',
      color_mode_value:'Moduswert', color_target_value:'Zielwert',
      color_center_text:'Mittetextfarbe (Feuchtigk. + Ziel)',
      use_custom_water_colors:'Wasserfarben anpassen',
      color_water1:'Wasser Primärfarbe', color_water2:'Wasser Sekundärfarbe',
    };
    const labels = lang==='de'?de : lang==='sv'?sv : en;
    return labels[schema.name] || en[schema.name] || schema.name;
  }

  _computeHelper(schema) {
    const lang = this._lang();
    const helpers = {
      sv: {
        use_custom_mode:  'Ersätter den inbyggda lägesväljaren med en egen input_select-entitet.',
        tank_entity:      'Stöder både numerisk sensor (0–100%) och textsensor (t.ex. Empty/Normal/Full). Våganimationen anpassas automatiskt.',
        humidity_entity:  'Behövs bara om din luftfuktare inte rapporterar current_humidity på sin huvudentitet.',
      },
      en: {
        use_custom_mode:  'Replaces the built-in mode selector with a custom input_select entity.',
        tank_entity:      'Supports both numeric sensors (0–100%) and text sensors (e.g. Empty/Normal/Full). The wave animation adapts automatically.',
        humidity_entity:  'Only needed if your humidifier does not report current_humidity on its main entity.',
      },
    };
    const h = helpers[lang] || helpers.en;
    return h[schema.name] || undefined;
  }

  _build() {
    if (!this._hass) return;
    if (!this._built) {
      this._built = true;
      this.shadowRoot.innerHTML = `
        <style>ha-form { display:block; padding: 4px 0; }</style>
        <ha-form></ha-form>
      `;
      const form = this.shadowRoot.querySelector('ha-form');
      form.addEventListener('value-changed', (e) => {
        e.stopPropagation();
        this._config = e.detail.value;
        this.dispatchEvent(new CustomEvent('config-changed', {
          detail: { config: this._config }, bubbles: true, composed: true,
        }));
      });
    }
    const form = this.shadowRoot.querySelector('ha-form');
    if (!form) return;
    form.hass          = this._hass;
    form.schema        = this._schema();
    form.data          = this._config;
    form.computeLabel  = (s) => this._computeLabel(s);
    form.computeHelper = (s) => this._computeHelper(s);
  }
}
customElements.define('premium-humidifier-card-editor', PremiumHumidifierCardEditor);

// ════════════════════════════════════════════════════════════
//  MAIN CARD
// ════════════════════════════════════════════════════════════
class PremiumHumidifierCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({mode:'open'});
    this._hass              = null;
    this._config            = null;
    this._builtDOM          = false;
    this._raf               = null;
    this._ctx               = null;
    this._steam             = [];
    this._t                 = 0;
    this._animating         = false;
    this._currentWaterLevel = 0.72;
    this._isHumidifying     = false;
    this._liveSteamSpeed    = 50;
    this._pendingHumidity   = null;
  }

  static getConfigElement() { return document.createElement('premium-humidifier-card-editor'); }

  static getStubConfig(hass) {
    const s = hass ? hass.states : {};
    return {
      name:               'Premium Humidifier',
      power_entity:       Object.keys(s).find(e => e.startsWith('humidifier.'))||'',
      humidity_entity:    '',
      temperature_entity: Object.keys(s).find(e => s[e].attributes?.unit_of_measurement==='°C')||'',
      tank_entity:        '',
      show_tank:          false,
      use_custom_mode:    false,
      custom_mode_entity: '',
      show_stat_boxes:    true,
      show_slider_box:    true,
      show_temperature:   true,
      show_humidity:      true,
      show_mode_tile:     true,
      show_speed_slider:  true,
      show_background_glow: true,
      show_steam:         true,
      animate_water:      true,
      steam_speed:        50,
      center_size:        50,
      card_opacity:       100,
      color_primary:      '#00c896',
      color_secondary:    '#00bcd4',
      color_bg1:          '#ffffff',
      color_bg2:          '#f0f6fa',
    };
  }

  setConfig(config) {
    const normalizeColors = (cfg) => {
      const keys = ['color_primary','color_secondary','color_bg1','color_bg2',
        'color_hum_value','color_temp_value','color_mode_value','color_target_value','color_center_text',
        'color_water1','color_water2'];
      const out = {...cfg};
      keys.forEach(k => { if (out[k] !== undefined) out[k] = toHexH(out[k]); });
      return out;
    };
    const newConfig = normalizeColors({
      name: 'Premium Humidifier',
      card_opacity: 100,
      color_primary: '#00c896', color_secondary: '#00bcd4',
      color_bg1: '#ffffff', color_bg2: '#f0f6fa',
      show_temperature: true, show_humidity: true,
      show_mode_tile: true, show_speed_slider: true,
      show_stat_boxes: true, show_slider_box: true,
      show_background_glow: true,
      show_steam: true, animate_water: true,
      show_tank: false,
      use_custom_mode: false, custom_mode_entity: '',
      steam_speed: 50,
      ...config,
    });

    const structuralKeys = [
      'color_primary','color_secondary','color_bg1','color_bg2',
      'show_temperature','show_humidity','show_mode_tile','show_speed_slider',
      'show_background_glow','show_steam','animate_water',
      'show_stat_boxes','show_slider_box','show_tank',
      'use_custom_mode','custom_mode_entity',
      'use_custom_value_colors',
      'color_hum_value','color_temp_value','color_mode_value','color_target_value','color_center_text',
      'use_custom_water_colors','color_water1','color_water2',
    ];
    const needsRebuild = !this._config || structuralKeys.some(k =>
      JSON.stringify(this._config[k]) !== JSON.stringify(newConfig[k])
    );
    this._config = newConfig;
    if (needsRebuild) this._builtDOM = false;
    if (this._hass) this._render();
  }

  set hass(hass) { this._hass = hass; this._render(); }
  connectedCallback() { if (this._hass && this._config) this._render(); }

  _stopAnim() {
    if (this._raf) { cancelAnimationFrame(this._raf); this._raf = null; }
    this._animating = false;
  }

  _newSteam(W, H, waveY, random=false) {
    return {
      x:    Math.random()*W,
      y:    random ? Math.random()*H : waveY - Math.random()*5,
      size: 1+Math.random()*2.5,
      op:   0.12+Math.random()*0.4,
      vy:   0.25+Math.random()*0.6,
      vx:   (Math.random()-0.5)*0.2,
      w:    Math.random()*Math.PI*2,
      ws:   0.015+Math.random()*0.025,
      life: random ? Math.random() : 1,
    };
  }

  _startAnim(canvas, cfg, p, s) {
    this._stopAnim();
    this._canvas = canvas;
    this._ctx    = canvas.getContext('2d');
    // Store initial colors — will be overridden live by this._liveW1/W2
    this._liveW1 = p;
    this._liveW2 = s;
    const W=canvas.width, H=canvas.height;
    const animateWater = cfg.animate_water !== false;
    const showSteam    = cfg.show_steam !== false;

    this._steam = Array.from({length:40}, ()=>this._newSteam(W, H, H*0.72, true));

    const loop = () => {
      this._t += 0.018;
      const t = this._t;
      this._ctx.clearRect(0,0,W,H);

      // Read colors live so they update instantly when user changes them
      const pRgb = hexToRgbH(this._liveW1 || '#00c896');
      const sRgb = hexToRgbH(this._liveW2 || '#00bcd4');
      const liveP = this._liveW1 || '#00c896';
      const liveS = this._liveW2 || '#00bcd4';

      const waveBaseY = H * this._currentWaterLevel;

      const getWaveY = (x) =>
        waveBaseY
        + Math.sin((x/W)*Math.PI*3.5 + t*0.9) * 7
        + Math.sin((x/W)*Math.PI*6   + t*0.6) * 3
        + Math.sin((x/W)*Math.PI*1.5 + t*0.4) * 4;

      if (animateWater) {
        const layers = [
          { offset:2.0, amp:0.6,  alpha:0.12 },
          { offset:1.4, amp:0.75, alpha:0.18 },
          { offset:0.8, amp:0.85, alpha:0.22 },
          { offset:0.3, amp:0.92, alpha:0.30 },
          { offset:0.0, amp:1.0,  alpha:0.45 },
        ];
        layers.forEach(l => {
          this._ctx.beginPath();
          for(let x=0;x<=W;x+=2){
            const y = waveBaseY
              + Math.sin((x/W)*Math.PI*3.5 + t*0.9 + l.offset)    * 7*l.amp
              + Math.sin((x/W)*Math.PI*6   + t*0.6 + l.offset*1.2) * 3*l.amp
              + Math.sin((x/W)*Math.PI*1.5 + t*0.4 + l.offset*0.7) * 4*l.amp;
            x===0 ? this._ctx.moveTo(x,y) : this._ctx.lineTo(x,y);
          }
          this._ctx.lineTo(W,H); this._ctx.lineTo(0,H); this._ctx.closePath();
          const blend = l.amp;
          const r=Math.round(pRgb.r*(1-blend)+sRgb.r*blend);
          const g=Math.round(pRgb.g*(1-blend)+sRgb.g*blend);
          const b=Math.round(pRgb.b*(1-blend)+sRgb.b*blend);
          this._ctx.fillStyle = `rgba(${r},${g},${b},1)`;
          this._ctx.globalAlpha = l.alpha;
          this._ctx.fill();
          this._ctx.globalAlpha = 1;
        });
        // Crest shimmer
        this._ctx.beginPath();
        for(let x=0;x<=W;x+=2){
          const y=getWaveY(x);
          x===0 ? this._ctx.moveTo(x,y) : this._ctx.lineTo(x,y);
        }
        const grad=this._ctx.createLinearGradient(0,0,W,0);
        grad.addColorStop(0,  alphaH(liveS,0.3));
        grad.addColorStop(0.4,alphaH(liveP,0.7));
        grad.addColorStop(0.7,alphaH(liveS,0.7));
        grad.addColorStop(1,  alphaH(liveP,0.3));
        this._ctx.strokeStyle=grad; this._ctx.lineWidth=2; this._ctx.stroke();
      } else {
        this._ctx.fillStyle=alphaH(liveP,0.35);
        this._ctx.fillRect(0,waveBaseY,W,H-waveBaseY);
      }

      // Steam — only when actively humidifying
      if (showSteam && this._isHumidifying) {
        const mult = Math.max(0.1, (this._liveSteamSpeed/100)*3.0);
        this._steam.forEach(pt => {
          pt.y -= pt.vy * mult;
          pt.w += pt.ws;
          pt.x += Math.sin(pt.w)*0.6 + pt.vx;
          pt.life -= 0.003;
          const wY = getWaveY(pt.x);
          if(pt.y > wY || pt.life <= 0 || pt.y < H*0.02){
            Object.assign(pt, this._newSteam(W, H, wY, false));
            return;
          }
          const heightRatio = Math.min(1,(wY - pt.y)/(H*0.45));
          const fade = Math.min(1,heightRatio*2.5)*Math.min(1,pt.life*5);
          const blend = heightRatio;
          const r=Math.round(pRgb.r*(1-blend)+sRgb.r*blend);
          const g=Math.round(pRgb.g*(1-blend)+sRgb.g*blend);
          const b=Math.round(pRgb.b*(1-blend)+sRgb.b*blend);
          this._ctx.beginPath();
          this._ctx.arc(pt.x, pt.y, pt.size, 0, Math.PI*2);
          this._ctx.fillStyle=`rgba(${r},${g},${b},${pt.op*fade})`;
          this._ctx.fill();
        });
      }

      this._raf = requestAnimationFrame(loop);
    };
    this._animating = true;
    this._raf = requestAnimationFrame(loop);
  }

  _togglePower() {
    const eid = this._config.power_entity;
    if (!eid || !this._hass) return;
    const ent   = this._hass.states[eid];
    const isOff = !ent || ['off','unavailable','unknown'].includes(ent.state);
    this._hass.callService('humidifier', isOff ? 'turn_on' : 'turn_off', { entity_id: eid });
  }

  _setHumidity(value) {
    const eid = this._config.power_entity;
    if (!eid || !this._hass) return;
    const ent = this._hass.states[eid];
    const min = ent?.attributes?.min_humidity ?? 0;
    const max = ent?.attributes?.max_humidity ?? 100;
    const h   = Math.min(max, Math.max(min, Math.round(value)));
    this._pendingHumidity = h;  // hold slider until HA confirms
    this._hass.callService('humidifier', 'set_humidity', { entity_id: eid, humidity: h });
  }

  _isOn() {
    const eid = this._config?.power_entity;
    if (!eid || !this._hass) return false;
    const state = this._hass.states[eid]?.state || '';
    return !['off','unavailable','unknown',''].includes(state.toLowerCase());
  }

  _render() {
    if (!this._config || !this._hass) return;
    try {
    const hass = this._hass;
    const cfg  = this._config;
    const lang = (hass.language||'sv').split('-')[0].toLowerCase();

    const p   = toHexH(cfg.color_primary)   || '#00c896';
    const s   = toHexH(cfg.color_secondary) || '#00bcd4';
    const bg1 = toHexH(cfg.color_bg1)       || '#ffffff';
    const bg2 = toHexH(cfg.color_bg2)       || '#f0f6fa';
    const dark        = isDarkH(bg1);
    const cardOpacity = cfg.card_opacity!=null ? Number(cfg.card_opacity) : 100;
    const textMain    = dark ? '#f0f4f8'                   : '#1a2332';
    const textSub     = dark ? 'rgba(200,215,230,0.75)'    : '#8a9bb0';
    const statBg      = dark ? 'rgba(255,255,255,0.07)'    : 'rgba(255,255,255,0.75)';
    const statBorder  = dark ? 'rgba(255,255,255,0.10)'    : 'rgba(220,230,240,0.70)';
    const trackColor  = dark ? 'rgba(255,255,255,0.10)'    : '#e8edf2';

    // Custom water colors — fall back to p/s if not set
    const useWaterColors = cfg.use_custom_water_colors === true;
    const w1 = useWaterColors && cfg.color_water1 ? toHexH(cfg.color_water1) : p;
    const w2 = useWaterColors && cfg.color_water2 ? toHexH(cfg.color_water2) : s;

    // Custom value colors
    const useValColors    = cfg.use_custom_value_colors === true;
    // Mitttext: anpassad om satt, annars textMain (dark/light-adaptivt)
    const centerTextColor = cfg.color_center_text ? toHexH(cfg.color_center_text) : textMain;
    // Värdefärger: anpassade om toggle är PÅ, annars primär/sekundär som standard
    const humValColor    = useValColors && cfg.color_hum_value    ? toHexH(cfg.color_hum_value)    : p;
    const tempValColor   = useValColors && cfg.color_temp_value   ? toHexH(cfg.color_temp_value)   : p;
    const modeValColor   = useValColors && cfg.color_mode_value   ? toHexH(cfg.color_mode_value)   : p;
    const targetValColor = useValColors && cfg.color_target_value ? toHexH(cfg.color_target_value) : s;

    // ── Entities ──────────────────────────────────────────
    const powerEnt = cfg.power_entity       ? hass.states[cfg.power_entity]       : null;
    const humEnt   = cfg.humidity_entity    ? hass.states[cfg.humidity_entity]    : null;
    const tempEnt  = cfg.temperature_entity ? hass.states[cfg.temperature_entity] : null;
    const tankEnt  = cfg.tank_entity        ? hass.states[cfg.tank_entity]        : null;

    const isOn = this._isOn();

    // action: 'humidifying' | 'idle' | 'off' — optional, not all integrations expose it
    const action        = powerEnt?.attributes?.action?.toLowerCase() ?? null;
    const isHumidifying = isOn && (action === 'humidifying' || action === null);

    // Humidity: humidifier entity's current_humidity takes priority over separate sensor
    const rawHum = powerEnt?.attributes?.current_humidity != null
      ? parseFloat(powerEnt.attributes.current_humidity)
      : humEnt ? parseFloat(humEnt.state) : NaN;
    const humVal = isNaN(rawHum) ? null : rawHum;

    const tempVal        = tempEnt ? parseFloat(tempEnt.state) : null;
    const targetHumidity = powerEnt?.attributes?.target_humidity ?? powerEnt?.attributes?.humidity ?? null;
    const humMin         = powerEnt?.attributes?.min_humidity ?? 0;
    const humMax         = powerEnt?.attributes?.max_humidity ?? 100;
    // Use pending value if set (user just dragged), else HA's confirmed value
    const effectiveTarget = this._pendingHumidity !== null ? this._pendingHumidity : targetHumidity;
    const sliderPct = effectiveTarget != null
      ? Math.max(0, Math.min(100, ((effectiveTarget - humMin) / (humMax - humMin)) * 100))
      : 0;  // 0 as safe rendering fallback — slider hidden until data arrives via showSlider logic below

    // Modes
    const fanMode       = powerEnt?.attributes?.mode ?? null;
    const useCustomMode = cfg.use_custom_mode && cfg.custom_mode_entity;
    const customModeEnt = useCustomMode ? hass.states[cfg.custom_mode_entity] : null;
    const availModes    = useCustomMode && customModeEnt?.attributes?.options
      ? customModeEnt.attributes.options
      : (powerEnt?.attributes?.available_modes || []);
    const currentMode   = useCustomMode ? customModeEnt?.state : fanMode;

    // ── Water tank ────────────────────────────────────────
    const tankParsed = tankEnt ? parseTankState(tankEnt.state) : null;
    const showTank   = cfg.show_tank === true && !!tankEnt && tankParsed !== null;
    // Wave: 0.20 = full (80% of canvas from top = full), 0.85 = empty
    const waterLevel = showTank
      ? 0.85 - (tankParsed.pct / 100) * 0.65
      : 0.72;
    const tColor = showTank ? tankColor(tankParsed.pct, p) : p;

    // ── Show/hide ─────────────────────────────────────────
    const showTemp     = cfg.show_temperature !== false;
    const showHum      = cfg.show_humidity !== false;
    const showModeTile = cfg.show_mode_tile !== false;
    const showSlider   = cfg.show_speed_slider !== false && !!cfg.power_entity;

    // ── Subtitle ──────────────────────────────────────────
    let subtitle = isOn
      ? (action === 'humidifying' ? humTr(lang,'humidifying')
        : action === 'idle'       ? humTr(lang,'idle')
        : humTr(lang,'active'))
      : humTr(lang,'inactive');
    if (isOn && fanMode) subtitle += ' – ' + fanMode.charAt(0).toUpperCase() + fanMode.slice(1);

    const statCols = [showTemp, showModeTile].filter(Boolean).length;
    const gridCols = statCols <= 1 ? '1fr' : statCols === 2 ? '1fr 1fr' : '1fr 1fr 1fr';

    // ── BUILD DOM (once) ──────────────────────────────────
    if (!this._builtDOM) {
      this._builtDOM = true;
      this._stopAnim();

      this.shadowRoot.innerHTML = `<style>
        :host{display:block;font-family:-apple-system,'SF Pro Display','Helvetica Neue',sans-serif;width:100%;box-sizing:border-box;}
        *{box-sizing:border-box;}
        .card{background:linear-gradient(145deg,${alphaH(bg1,cardOpacity/100)},${alphaH(bg2,cardOpacity/100)});
          border-radius:28px;padding-top:24px;position:relative;overflow:hidden;
          box-shadow:0 20px 60px rgba(0,0,0,.10),0 4px 16px rgba(0,0,0,.06);}
        .glow-a{position:absolute;top:40px;right:-50px;width:280px;height:200px;
          background:radial-gradient(ellipse,${alphaH(p,0.13)} 0%,transparent 70%);border-radius:50%;pointer-events:none;}
        .glow-b{position:absolute;top:90px;left:-50px;width:220px;height:180px;
          background:radial-gradient(ellipse,${alphaH(s,0.10)} 0%,transparent 70%);border-radius:50%;pointer-events:none;}
        .header{display:flex;align-items:center;justify-content:space-between;padding:0 24px 20px;position:relative;z-index:2;}
        .header-left{display:flex;align-items:flex-start;gap:12px;}
        .header-icon-col{display:flex;flex-direction:column;align-items:center;gap:5px;flex-shrink:0;}
        .header-icon{width:42px;height:42px;border-radius:13px;background:${alphaH(s,0.15)};display:flex;align-items:center;justify-content:center;}
        .header-icon ha-icon{--mdc-icon-size:22px;color:${s};}
        .header-tank{font-size:11px;font-weight:700;display:flex;align-items:center;gap:3px;white-space:nowrap;}
        .header-tank ha-icon{--mdc-icon-size:13px;}
        .header-title{font-size:clamp(14px,5vw,20px);font-weight:800;color:${textMain};letter-spacing:-.4px;line-height:1.2;}
        .header-sub{font-size:12px;color:${textSub};margin-top:2px;}
        .power-btn{width:44px;height:44px;border-radius:50%;border:none;cursor:pointer;flex-shrink:0;
          display:flex;align-items:center;justify-content:center;transition:transform .15s,box-shadow .2s,background .3s;}
        .power-btn:hover{transform:scale(1.08);}
        .power-btn ha-icon{--mdc-icon-size:20px;transition:color .3s;}
        .main{position:relative;height:240px;overflow:hidden;}
        .main canvas{position:absolute;top:0;left:0;width:100%;height:100%;display:block;}
        .main::after{content:'';position:absolute;bottom:0;left:0;right:0;height:60px;
          background:linear-gradient(to bottom,transparent,${alphaH(bg2,0.95)});pointer-events:none;z-index:4;}
        .center-stats{position:absolute;top:0;left:0;right:0;bottom:45%;
          display:flex;flex-direction:column;align-items:center;justify-content:center;z-index:3;pointer-events:none;gap:4px;}
        .big-label{font-size:11px;font-weight:600;color:inherit;text-transform:uppercase;letter-spacing:.9px;margin-bottom:2px;opacity:0.75;}
        .big-value{display:flex;align-items:baseline;gap:3px;}
        .big-num{font-size:clamp(36px,12vw,54px);font-weight:900;letter-spacing:-3px;line-height:1;text-shadow:0 2px 8px rgba(0,0,0,0.15);}
        .big-unit{font-size:clamp(14px,5vw,20px);font-weight:700;}
        .divider{width:36px;height:2px;border-radius:1px;background:linear-gradient(90deg,${p},${s});margin:6px 0 5px;}
        .secondary{display:flex;gap:14px;align-items:center;}
        .sec-item{display:flex;flex-direction:column;align-items:center;gap:1px;}
        .sec-val{font-size:14px;font-weight:800;}
        .sec-lbl{font-size:9px;font-weight:600;color:inherit;text-transform:uppercase;letter-spacing:.4px;opacity:0.65;}
        .sec-dot{color:rgba(255,255,255,0.5);font-size:16px;opacity:0.4;}
        .bottom{padding:0 24px 22px;position:relative;z-index:2;}
        /* Stat tiles */
        .stats{display:grid;grid-template-columns:${gridCols};gap:10px;margin-bottom:10px;width:100%;}
        .stat{
          ${cfg.show_stat_boxes!==false
            ?`background:${statBg};border-radius:18px;padding:16px 10px 14px;
               border:1px solid ${statBorder};
               border-top:2px solid ${alphaH(p,0.45)};`
            :'background:transparent;border:none;padding:10px 4px;'}
          display:flex;flex-direction:column;align-items:center;gap:6px;min-width:0;transition:transform .18s,box-shadow .18s;}
        .stat:hover{transform:translateY(-3px);box-shadow:0 8px 24px ${alphaH(p,0.15)};}
        .stat.clickable{cursor:pointer;}
        .stat.clickable:hover{transform:translateY(-3px);box-shadow:0 8px 24px ${alphaH(p,0.2)};}
        .stat ha-icon{--mdc-icon-size:26px;color:${p};}
        .stat-value{font-size:clamp(13px,4vw,18px);font-weight:800;letter-spacing:-.5px;line-height:1;
          white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:100%;}
        .stat-label{font-size:10px;color:${textSub};font-weight:500;text-align:center;letter-spacing:.2px;}
        /* Slider */
        .slider-wrap{${cfg.show_slider_box!==false
          ?`background:${statBg};border-radius:18px;padding:16px 18px 14px;
             border:1px solid ${statBorder};
             border-top:2px solid ${alphaH(p,0.35)};`
          :'padding:8px 0 12px;'}margin-bottom:10px;width:100%;}
        .slider-header{display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;}
        .slider-title{font-size:10px;font-weight:700;color:${textSub};text-transform:uppercase;letter-spacing:.7px;}
        .slider-pct{font-size:14px;font-weight:800;color:${p};}
        .slider-track{position:relative;height:22px;border-radius:11px;cursor:pointer;touch-action:none;user-select:none;display:flex;align-items:center;overflow:visible;}
        .slider-track-inner{position:absolute;left:0;right:0;height:6px;border-radius:3px;background:${trackColor};}
        .slider-fill{height:100%;border-radius:3px;background:linear-gradient(90deg,${s},${p});pointer-events:none;}
        .slider-mark-cur{position:absolute;top:calc(100% + 6px);width:36px;margin-left:-18px;text-align:center;font-size:10px;font-weight:700;color:${p};pointer-events:none;}
        .slider-thumb{position:absolute;top:50%;width:28px;height:28px;border-radius:50%;
          background:#fff;box-shadow:0 2px 12px ${alphaH(p,0.6)};transform:translate(-50%,-50%);
          cursor:grab;border:3px solid ${p};touch-action:none;user-select:none;pointer-events:none;}
        .slider-marks{position:relative;height:16px;margin-top:6px;}
        .slider-mark-min{position:absolute;left:0;font-size:10px;color:${textSub};font-weight:500;}
        .slider-mark-max{position:absolute;right:0;font-size:10px;color:${textSub};font-weight:500;}
        .mode-row{display:flex;align-items:center;justify-content:space-between;padding-top:4px;}
        .mode-lbl{font-size:10px;font-weight:700;color:${textSub};text-transform:uppercase;letter-spacing:.6px;}
        .mode-btns{display:flex;gap:6px;flex-wrap:wrap;}
        .mode-btn{padding:6px 14px;border-radius:14px;border:1px solid ${statBorder};font-size:11px;font-weight:600;
          cursor:pointer;font-family:inherit;background:${statBg};color:${textSub};transition:all .2s;}
        .mode-btn.active{background:linear-gradient(135deg,${p},${s});color:#fff;border-color:transparent;box-shadow:0 3px 10px ${alphaH(p,0.4)};}
        .mode-btn:hover:not(.active){filter:brightness(0.95);}
      </style>
      <div class="card">
        <div class="glow-a" id="glow-a"></div>
        <div class="glow-b" id="glow-b"></div>
        <div class="header">
          <div class="header-left">
            <div class="header-icon-col">
              <div class="header-icon"><ha-icon icon="mdi:air-humidifier"></ha-icon></div>
              <div class="header-tank" id="header-tank-row" style="display:none">
                <ha-icon icon="mdi:water" id="tank-icon"></ha-icon>
                <span id="header-tank-val"></span>
              </div>
            </div>
            <div style="display:flex;flex-direction:column;justify-content:center;">
              <div class="header-title" id="card-name"></div>
              <div class="header-sub" id="card-sub"></div>
            </div>
          </div>
          <button class="power-btn" id="power-btn"><ha-icon icon="mdi:power"></ha-icon></button>
        </div>
        <div class="main">
          <canvas id="wave-canvas"></canvas>
          <div class="center-stats">
            <div class="big-label" id="hum-label"></div>
            <div class="big-value">
              <span class="big-num" id="hum-val">–</span>
              <span class="big-unit" id="hum-unit">%</span>
            </div>
            <div class="divider"></div>
            <div class="secondary">
              <div class="sec-item" id="target-sec" style="display:none">
                <span class="sec-val" id="target-sec-val">–</span>
                <span class="sec-lbl" id="target-sec-lbl"></span>
              </div>
            </div>
          </div>
        </div>
        <div class="bottom">
          <div class="stats" id="stats-grid">
            ${showTemp?`<div class="stat" id="temp-stat">
              <ha-icon icon="mdi:thermometer"></ha-icon>
              <span class="stat-value" id="temp-val" style="color:${tempValColor}">–</span>
              <span class="stat-label" id="temp-lbl"></span>
            </div>`:''}

            ${showModeTile?`<div class="stat clickable" id="mode-stat">
              <ha-icon icon="mdi:air-humidifier"></ha-icon>
              <span class="stat-value" id="mode-val" style="color:${modeValColor}">–</span>
              <span class="stat-label" id="mode-lbl-tile"></span>
            </div>`:''}
          </div>
          <div class="slider-wrap" id="slider-wrap" style="display:${showSlider?'block':'none'}">
            <div class="slider-header">
              <span class="slider-title" id="slider-title"></span>
              <span class="slider-pct" id="slider-val">${targetHumidity != null ? targetHumidity+'%' : '–'}</span>
            </div>
            <div class="slider-track" id="slider-track">
              <div class="slider-track-inner">
                <div class="slider-fill" id="slider-fill" style="width:${sliderPct}%"></div>
              </div>
              <div class="slider-thumb" id="slider-thumb" style="left:${sliderPct}%"></div>
              <span class="slider-mark-cur" id="slider-mark-cur" style="left:${sliderPct}%">–</span>
            </div>
            <div class="slider-marks" id="slider-marks">
              <span class="slider-mark-min" id="slider-mark-min">–</span>
              <span class="slider-mark-max" id="slider-mark-max">–</span>
            </div>
          </div>
          <div class="mode-row" id="mode-row" style="display:none"></div>
        </div>
      </div>`;

      // Power button
      this.shadowRoot.getElementById('power-btn')?.addEventListener('click', () => this._togglePower());

      // Mode dropdown — rendered in document.body to escape shadow DOM (same as purifier card)
      const modeStat = this.shadowRoot.getElementById('mode-stat');
      if (modeStat && !modeStat._dropdownInit) {
        modeStat._dropdownInit = true;

        const closeDropdown = () => {
          document.getElementById('phc-mode-dropdown')?.remove();
        };

        const openDropdown = () => {
          const useCustom = this._config.use_custom_mode && this._config.custom_mode_entity;
          const customEnt = useCustom ? this._hass?.states[this._config.custom_mode_entity] : null;
          const powerState = this._hass?.states[this._config.power_entity];
          let modes = [];
          if (useCustom) {
            modes = customEnt?.attributes?.options || [];
          } else {
            modes = powerState?.attributes?.available_modes || [];
          }
          if (!modes.length) return;

          closeDropdown();

          const cur = useCustom
            ? (customEnt?.state || '')
            : (powerState?.attributes?.mode || '');

          const cfg  = this._config;
          const p    = toHexH(cfg.color_primary) || '#00c896';
          const dark = isDarkH(toHexH(cfg.color_bg1) || '#ffffff');

          const rect = modeStat.getBoundingClientRect();
          const dd   = document.createElement('div');
          dd.id = 'phc-mode-dropdown';
          Object.assign(dd.style, {
            position:   'fixed',
            left:       (rect.left + rect.width / 2) + 'px',
            top:        (rect.bottom + 8) + 'px',
            transform:  'translateX(-50%)',
            background: dark ? '#1e2535' : '#ffffff',
            borderRadius: '16px',
            padding:    '8px',
            boxShadow:  '0 8px 32px rgba(0,0,0,0.25),0 2px 8px rgba(0,0,0,0.15)',
            border:     '1px solid rgba(0,0,0,0.08)',
            minWidth:   '140px',
            zIndex:     '99999',
          });

          modes.forEach(m => {
            const item     = document.createElement('div');
            const isActive = cur.toLowerCase() === m.toLowerCase();
            Object.assign(item.style, {
              padding:      '10px 16px',
              borderRadius: '10px',
              fontSize:     '13px',
              fontWeight:   '600',
              fontFamily:   '-apple-system,sans-serif',
              color:        isActive ? '#fff' : (dark ? '#f0f4f8' : '#1a2332'),
              background:   isActive ? `linear-gradient(135deg,${p},${alphaH(p,0.8)})` : 'transparent',
              cursor:       'pointer',
              whiteSpace:   'nowrap',
              textAlign:    'center',
              transition:   'background .15s',
            });
            item.textContent = m.charAt(0).toUpperCase() + m.slice(1);

            item.addEventListener('mouseenter', () => {
              if (!isActive) item.style.background = dark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)';
            });
            item.addEventListener('mouseleave', () => {
              if (!isActive) item.style.background = 'transparent';
            });

            item.addEventListener('click', (ev) => {
              ev.stopPropagation();
              const useCustom = this._config.use_custom_mode && this._config.custom_mode_entity;
              if (useCustom) {
                this._hass.callService('select', 'select_option',
                  { entity_id: this._config.custom_mode_entity, option: m });
              } else {
                this._hass.callService('humidifier', 'set_mode',
                  { entity_id: this._config.power_entity, mode: m });
              }
              closeDropdown();
            });

            dd.appendChild(item);
          });

          document.body.appendChild(dd);

          // Follow card when scrolling
          const updatePos = () => {
            const r = modeStat.getBoundingClientRect();
            dd.style.top  = (r.bottom + 8) + 'px';
            dd.style.left = (r.left + r.width / 2) + 'px';
          };
          window.addEventListener('scroll', updatePos, true);

          // Close on outside click
          const close = (ev) => {
            if (!dd.contains(ev.target)) {
              closeDropdown();
              document.removeEventListener('click', close, true);
              window.removeEventListener('scroll', updatePos, true);
            }
          };
          setTimeout(() => document.addEventListener('click', close, true), 0);
        };

        modeStat.addEventListener('click', (e) => {
          e.stopPropagation();
          if (document.getElementById('phc-mode-dropdown')) { closeDropdown(); return; }
          openDropdown();
        });
      }

      // Slider — Pointer Events (unified mouse + touch)
      const sliderTrack = this.shadowRoot.getElementById('slider-track');
      if (sliderTrack && !sliderTrack._initialized) {
        sliderTrack._initialized = true;
        let dragging = false;
        const getMinMax = () => {
          const ent = this._hass?.states[this._config.power_entity];
          return { min: ent?.attributes?.min_humidity ?? 0, max: ent?.attributes?.max_humidity ?? 100 };
        };
        const getPct = (clientX) => {
          const {min,max} = getMinMax();
          const rect  = sliderTrack.getBoundingClientRect();
          const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
          return { humVal: min + ratio*(max-min), posPct: ratio*100 };
        };
        const updateVisual = (posPct, hVal) => {
          const fill    = this.shadowRoot.getElementById('slider-fill');
          const thumb   = this.shadowRoot.getElementById('slider-thumb');
          const val     = this.shadowRoot.getElementById('slider-val');
          const markCur = this.shadowRoot.getElementById('slider-mark-cur');
          if (fill)    fill.style.width    = posPct+'%';
          if (thumb)   thumb.style.left    = posPct+'%';
          if (val)     val.textContent     = Math.round(hVal)+'%';
          if (markCur) { markCur.style.left = posPct+'%'; markCur.textContent = Math.round(hVal)+'%'; }
        };
        sliderTrack.addEventListener('pointerdown', (e) => {
          dragging = true; sliderTrack._dragging = true;
          sliderTrack.setPointerCapture(e.pointerId); e.preventDefault();
          const {humVal,posPct} = getPct(e.clientX); updateVisual(posPct,humVal);
        });
        sliderTrack.addEventListener('pointermove', (e) => {
          if (!dragging) return; e.preventDefault();
          const {humVal,posPct} = getPct(e.clientX); updateVisual(posPct,humVal);
        });
        sliderTrack.addEventListener('pointerup', (e) => {
          if (!dragging) return; dragging = false; sliderTrack._dragging = false;
          const {humVal} = getPct(e.clientX); this._setHumidity(humVal);
        });
        sliderTrack.addEventListener('pointercancel', () => { dragging = false; sliderTrack._dragging = false; });
      }

      // Start canvas animation — always restart cleanly when DOM is rebuilt,
      // but preserve _t so the wave continues seamlessly without jumping
      const canvas = this.shadowRoot.getElementById('wave-canvas');
      if (canvas) {
        canvas.width = 340; canvas.height = 240;
        this._startAnim(canvas, cfg, w1, w2);
      }
    } // end _builtDOM

    // ── DYNAMIC UPDATES ───────────────────────────────────
    const root = this.shadowRoot;

    // Push live values into animation loop
    this._currentWaterLevel = waterLevel;
    this._isHumidifying     = isHumidifying;
    this._liveSteamSpeed    = cfg.steam_speed ?? 50;
    this._liveW1            = w1;
    this._liveW2            = w2;

    // Glow
    const glowA = root.getElementById('glow-a');
    const glowB = root.getElementById('glow-b');
    if (glowA) glowA.style.display = cfg.show_background_glow!==false ? 'block' : 'none';
    if (glowB) glowB.style.display = cfg.show_background_glow!==false ? 'block' : 'none';

    // Header text
    const nameEl = root.getElementById('card-name');
    const subEl  = root.getElementById('card-sub');
    if (nameEl) nameEl.textContent = cfg.name || 'Premium Humidifier';
    if (subEl)  subEl.textContent  = subtitle;

    // Power button appearance
    const pwrBtn = root.getElementById('power-btn');
    if (pwrBtn) {
      pwrBtn.style.background = isOn
        ? `linear-gradient(135deg,${p},${alphaH(p,0.8)})`
        : `linear-gradient(135deg,${alphaH(p,0.35)},${alphaH(p,0.2)})`;
      pwrBtn.style.boxShadow = isOn ? `0 4px 16px ${alphaH(p,0.5)}` : 'none';
      const ic = pwrBtn.querySelector('ha-icon');
      if (ic) ic.style.color = isOn ? '#fff' : alphaH(p,0.7);
    }

    // Tank badge
    const tankRow   = root.getElementById('header-tank-row');
    const tankValEl = root.getElementById('header-tank-val');
    const tankIconEl= root.getElementById('tank-icon');
    if (tankRow) tankRow.style.display = showTank ? 'flex' : 'none';
    if (showTank && tankParsed) {
      if (tankValEl)  tankValEl.textContent   = tankParsed.label;
      if (tankIconEl) tankIconEl.style.color  = tColor;
      if (tankRow)    tankRow.style.color     = tColor;
    }

    // Center: big humidity number
    const humLblEl  = root.getElementById('hum-label');
    const humValEl  = root.getElementById('hum-val');
    const humUnitEl = root.getElementById('hum-unit');
    // Apply center text color + size scaling to entire center overlay
    const centerStatsEl = root.querySelector('.center-stats');
    if (centerStatsEl) {
      centerStatsEl.style.color = centerTextColor;
      // center_size: 0→half size, 50→normal, 100→double size
      const cSize = cfg.center_size != null ? Number(cfg.center_size) : 50;
      const scale = 0.5 + (cSize / 100) * 1.5;  // range: 0.5 – 2.0
      const bigNum  = root.getElementById('hum-val');
      const bigUnit = root.getElementById('hum-unit');
      const bigLbl  = root.getElementById('hum-label');
      const secVal  = root.getElementById('target-sec-val');
      const secLbl  = root.getElementById('target-sec-lbl');
      const divEl   = root.querySelector('.divider');
      if (bigNum)  bigNum.style.fontSize  = Math.round(54 * scale) + 'px';
      if (bigUnit) bigUnit.style.fontSize = Math.round(20 * scale) + 'px';
      if (bigLbl)  bigLbl.style.fontSize  = Math.round(11 * scale) + 'px';
      if (secVal)  secVal.style.fontSize  = Math.round(14 * scale) + 'px';
      if (secLbl)  secLbl.style.fontSize  = Math.round(9  * scale) + 'px';
      if (divEl)   { divEl.style.width = Math.round(36 * scale) + 'px'; divEl.style.height = Math.round(2 * scale) + 'px'; }
    }
    if (humLblEl)  humLblEl.textContent   = humTr(lang,'humidity');
    if (humValEl)  { humValEl.textContent = humVal != null ? Math.round(humVal) : '–'; humValEl.style.color = humValColor; }
    if (humUnitEl) humUnitEl.style.color  = humValColor;

    // Secondary row (temperature + target)
    const targetSecEl = root.getElementById('target-sec');
    const targetSecVal= root.getElementById('target-sec-val');
    const targetSecLbl= root.getElementById('target-sec-lbl');
    const showTargetSec = targetHumidity != null;
    if (targetSecEl) targetSecEl.style.display = showTargetSec ? 'flex' : 'none';
    if (targetSecVal) { targetSecVal.textContent = targetHumidity != null ? Math.round(targetHumidity)+'%' : '–'; targetSecVal.style.color = targetValColor; }
    if (targetSecLbl) targetSecLbl.textContent  = humTr(lang,'target');

    // Stats grid
    const statsGridEl = root.getElementById('stats-grid');
    if (statsGridEl) statsGridEl.style.gridTemplateColumns = gridCols;

    const tempStatEl = root.getElementById('temp-stat');
    const humStatEl  = root.getElementById('hum-stat');
    const modeStatEl = root.getElementById('mode-stat');
    if (tempStatEl) tempStatEl.style.display = showTemp     ? 'flex' : 'none';
    if (humStatEl)  humStatEl.style.display  = showHum      ? 'flex' : 'none';
    if (modeStatEl) modeStatEl.style.display = showModeTile ? 'flex' : 'none';

    const tempValEl2   = root.getElementById('temp-val');
    const tempLblEl    = root.getElementById('temp-lbl');

    const modeValEl    = root.getElementById('mode-val');
    const modeLblTile  = root.getElementById('mode-lbl-tile');
    if (tempValEl2) {
      const unit = tempEnt?.attributes?.unit_of_measurement || '°C';
      tempValEl2.textContent = tempVal != null ? (Math.round(tempVal*10)/10)+unit : '–';
    }
    if (tempLblEl)    tempLblEl.textContent    = humTr(lang,'temperature');

    if (modeValEl)   modeValEl.textContent   = currentMode ? currentMode.charAt(0).toUpperCase()+currentMode.slice(1) : '–';
    if (modeLblTile) modeLblTile.textContent = humTr(lang,'mode');

    // Slider sync
    const sliderWrapEl = root.getElementById('slider-wrap');
    if (sliderWrapEl) sliderWrapEl.style.display = showSlider ? 'block' : 'none';
    // Clear pending once HA confirms the value
    if (this._pendingHumidity !== null && targetHumidity === this._pendingHumidity) {
      this._pendingHumidity = null;
    }
    const sliderTrack2 = root.getElementById('slider-track');
    if (showSlider && !sliderTrack2?._dragging) {
      const fillEl  = root.getElementById('slider-fill');
      const thumbEl = root.getElementById('slider-thumb');
      const valEl   = root.getElementById('slider-val');
      if (fillEl)  fillEl.style.width = sliderPct+'%';
      if (thumbEl) thumbEl.style.left = sliderPct+'%';
      if (valEl)   valEl.textContent  = effectiveTarget+'%';
    }
    const sliderTitleEl = root.getElementById('slider-title');
    if (sliderTitleEl) sliderTitleEl.textContent = humTr(lang,'target_humidity').toUpperCase();
    const markMin = root.getElementById('slider-mark-min');
    const markMax = root.getElementById('slider-mark-max');
    const markCur = root.getElementById('slider-mark-cur');
    if (markMin) markMin.textContent = humMin + '%';
    if (markMax) markMax.textContent = humMax + '%';
    if (markCur) { markCur.style.left = sliderPct+'%'; markCur.textContent = (effectiveTarget ?? humMin)+'%'; }

    // Mode tile label — dropdown is handled by the click listener set up in _builtDOM
    const modeLblTile2 = root.getElementById('mode-lbl-tile');
    if (modeLblTile2) modeLblTile2.textContent = humTr(lang,'mode');

    } catch(e) { console.error('PremiumHumidifierCard render error:', e); }
  }

  disconnectedCallback() { this._stopAnim(); }
  getCardSize()          { return 5; }
}

customElements.define('premium-humidifier-card', PremiumHumidifierCard);

window.customCards = window.customCards || [];
if (!window.customCards.find(c => c.type === 'premium-humidifier-card')) {
  window.customCards.push({
    type:        'premium-humidifier-card',
    name:        'Premium Humidifier Card',
    description: 'Luftfuktighetskort med våganimation, ångpartiklar, flerspråksstöd och UI-konfiguration.',
    preview:     true,
  });
}
