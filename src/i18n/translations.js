/**
 * translations.js
 * Multi-language dictionary and state manager for Japanese (JA) and English (EN).
 */

export const translations = {
  ja: {
    // Top Header
    appTitle: 'RJOO / ITM',
    appSubtitle: '大阪伊丹空港 離陸・伊丹カーブ 3Dシミュレーター',
    rwyTag: 'RWY 32L',

    // Camera Views
    views: {
      chase: '後方追従',
      cockpit: '操縦席',
      wing: '主翼窓',
      tower: '管制塔',
      free: '自由視点',
      radar: 'レーダー',
    },

    // Control Panel
    panelTitle: 'フライト制御',
    modeLabel: 'シミュレーション方式',
    modeAuto: '自動航路',
    modeManual: '手動操縦',
    presetLabel: '飛行ルートプリセット',
    presets: {
      standard: '標準',
      sharp: '急旋回',
      heavy: '大型機',
      crashMountain: '💥 山岳直撃',
      crashDive: '🚨 急降下失速',
    },
    sliders: {
      speed: '対気速度 (V)',
      liftoffDist: '離陸滑走距離',
      climbAngDeg: '初期上昇角度',
      d1Total: '直線飛行距離',
      rTurn: '旋回半径 (R)',
      turnArcDeg: '旋回角度',
      cruiseClimbDeg: '巡航上昇/降下角',
      hdgRwyDeg: '滑走路32L方位',
    },
    manual: {
      throttleTitle: '推力・スロットル',
      aeroTitle: '空力設定',
      flaps: 'フラップ [F]',
      gear: '車輪 [G]',
      brakes: 'ブレーキ [B]',
      cheatSheetTitle: '操縦キー早見表',
      kThrottle: '推力 増 / 減',
      kPitch: '機首 上げ / 下げ',
      kRoll: 'ロール 左 / 右 (バンク)',
      kRudder: 'ラダー 左 / 右',
      kGearFlaps: '車輪 格納/展開 & フラップ',
      kReset: '滑走路32Lへリセット',
    },
    env: {
      title: '空・時間帯',
      sunset: '🌅 夕暮れ',
      day: '☀️ 昼間',
      night: '🌙 夜間',
    },
    resetBtn: 'フライトリセット',

    // Telemetry Dock
    telem: {
      alt: '高度',
      spd: '対気速度',
      hdg: '磁方位',
      bank: 'バンク角',
      g: '荷重倍数',
      vs: '昇降速度',
      ph1: 'PH1 (滑走/上昇)',
      ph2: 'PH2 (伊丹カーブ)',
      ph3: 'PH3 (神戸離脱)',
      playPauseTitle: '再生 / 一時停止 (Space)',
      loopTitle: 'ループ再生 (L)',
      audioTitle: 'エンジン音 ON/OFF (M)',
    },

    // Crash Modal
    crash: {
      title: 'TERRAIN COLLISION',
      subtitle: '山岳・地形衝突 / FLIGHT TERMINATED',
      speed: '衝撃速度',
      elev: '衝突標高',
      loc: '衝突地点',
      restart: 'フライトを再開 [R]',
      locMountain: '六甲山系・中山連峰',
      locUrban: '市街地・地上',
    },

    // PFD Phase Annunciation
    pfd: {
      ph1: 'PHASE 1: 離陸 / 上昇',
      ph2: 'PHASE 2: 伊丹カーブ旋回',
      ph3: 'PHASE 3: 神戸方面離脱',
      ph3Dive: 'PHASE 3: 急降下失速ダイブ',
      manual: 'MANUAL FREE FLIGHT',
    },
  },
  en: {
    // Top Header
    appTitle: 'RJOO / ITM',
    appSubtitle: 'Osaka Departure & Itami Curve 3D Simulator',
    rwyTag: 'RWY 32L',

    // Camera Views
    views: {
      chase: 'Chase Cam',
      cockpit: 'Cockpit HUD',
      wing: 'Wing View',
      tower: 'Tower Spotter',
      free: 'Free Orbit',
      radar: 'Radar Map',
    },

    // Control Panel
    panelTitle: 'Flight Controls',
    modeLabel: 'Flight Simulation Mode',
    modeAuto: 'Auto Route',
    modeManual: 'Manual Flight',
    presetLabel: 'Flight Route Preset',
    presets: {
      standard: 'Standard',
      sharp: 'Sharp Turn',
      heavy: 'Heavy Jet',
      crashMountain: '💥 Mountain Impact',
      crashDive: '🚨 Stall Dive',
    },
    sliders: {
      speed: 'Airspeed (V)',
      liftoffDist: 'Liftoff Roll Dist',
      climbAngDeg: 'Initial Climb Angle',
      d1Total: 'Phase 1 Distance',
      rTurn: 'Itami Curve Radius (R)',
      turnArcDeg: 'Turn Sweep Angle',
      cruiseClimbDeg: 'Cruise Climb Angle',
      hdgRwyDeg: 'Runway 32L Heading',
    },
    manual: {
      throttleTitle: 'Throttle & Thrust',
      aeroTitle: 'Aero Configurations',
      flaps: 'Flaps [F]',
      gear: 'Gear [G]',
      brakes: 'Brakes [B]',
      cheatSheetTitle: 'Flight Controls Cheat Sheet',
      kThrottle: 'Throttle Up / Down',
      kPitch: 'Pitch Up (Lift) / Down',
      kRoll: 'Roll Left / Right (Bank)',
      kRudder: 'Rudder Left / Right',
      kGearFlaps: 'Gear Up/Down & Flaps',
      kReset: 'Reset to Runway 32L',
    },
    env: {
      title: 'Sky & Atmosphere',
      sunset: '🌅 Sunset',
      day: '☀️ Day',
      night: '🌙 Night',
    },
    resetBtn: 'Reset Flight',

    // Telemetry Dock
    telem: {
      alt: 'ALTITUDE',
      spd: 'AIRSPEED',
      hdg: 'HEADING',
      bank: 'BANK ANGLE',
      g: 'G-FORCE',
      vs: 'VERT SPEED',
      ph1: 'PH1',
      ph2: 'PH2 (Curve)',
      ph3: 'PH3',
      playPauseTitle: 'Play / Pause (Space)',
      loopTitle: 'Toggle Loop (L)',
      audioTitle: 'Toggle Jet Engine Sound (M)',
    },

    // Crash Modal
    crash: {
      title: 'TERRAIN COLLISION',
      subtitle: 'TERRAIN COLLISION / FLIGHT TERMINATED',
      speed: 'Impact Speed',
      elev: 'Elevation',
      loc: 'Location',
      restart: 'Restart Flight [R]',
      locMountain: 'Rokko Mountain Range',
      locUrban: 'Urban Area / Ground',
    },

    // PFD Phase Annunciation
    pfd: {
      ph1: 'PHASE 1: RUNWAY / CLIMB',
      ph2: 'PHASE 2: ITAMI CURVE',
      ph3: 'PHASE 3: KOBE DEPARTURE',
      ph3Dive: 'PHASE 3: ENGINE STALL DIVE',
      manual: 'MANUAL FREE FLIGHT',
    },
  },
};

export class I18nManager {
  constructor(initialLang = 'ja') {
    const saved = typeof localStorage !== 'undefined' ? localStorage.getItem('flight_sim_lang') : null;
    this.currentLang = saved === 'en' || saved === 'ja' ? saved : initialLang;
    this.listeners = [];
  }

  getLang() {
    return this.currentLang;
  }

  setLang(lang) {
    if (lang !== 'ja' && lang !== 'en') return;
    this.currentLang = lang;
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('flight_sim_lang', lang);
    }
    this.notify();
  }

  toggleLang() {
    const next = this.currentLang === 'ja' ? 'en' : 'ja';
    this.setLang(next);
    return next;
  }

  t(keyPath) {
    const keys = keyPath.split('.');
    let cur = translations[this.currentLang];
    for (const k of keys) {
      if (!cur || cur[k] === undefined) {
        // Fallback to English if missing
        let fb = translations['en'];
        for (const fbk of keys) {
          if (!fb || fb[fbk] === undefined) return keyPath;
          fb = fb[fbk];
        }
        return fb;
      }
      cur = cur[k];
    }
    return cur;
  }

  onChange(listener) {
    this.listeners.push(listener);
  }

  notify() {
    this.listeners.forEach((fn) => fn(this.currentLang));
  }
}

export const i18n = new I18nManager('ja');
