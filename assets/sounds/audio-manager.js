/**
 * 音声ファイル管理クラス
 * 温泉旅館ARナビ - 音声再生・管理システム
 */

class AudioManager {
    constructor() {
        this.audioCache = new Map();
        this.currentLanguage = 'ja';
        this.isEnabled = true;
        this.volume = 1.0;
        
        // 音声ファイルパス定義
        this.audioBasePath = '/assets/sounds/';
        this.audioFiles = {
            'ja': {
                'navigation-start': 'ja/navigation-start.mp3',
                'turn-left': 'ja/turn-left.mp3',
                'turn-right': 'ja/turn-right.mp3',
                'go-straight': 'ja/go-straight.mp3',
                'go-upstairs': 'ja/go-upstairs.mp3',
                'go-downstairs': 'ja/go-downstairs.mp3',
                'use-elevator': 'ja/use-elevator.mp3',
                'arrived': 'ja/arrived.mp3',
                'system-ready': 'ja/system-ready.mp3',
                'distance-remaining': 'ja/distance-remaining.mp3',
                'floor-changed': 'ja/floor-changed.mp3',
                'destination-reception': 'ja/destination-reception.mp3',
                'destination-onsen': 'ja/destination-onsen.mp3',
                'destination-restaurant': 'ja/destination-restaurant.mp3',
                'destination-toilet': 'ja/destination-toilet.mp3',
                'destination-shop': 'ja/destination-shop.mp3',
                'destination-parking': 'ja/destination-parking.mp3',
                'recalibrating': 'ja/recalibrating.mp3',
                'connection-lost': 'ja/connection-lost.mp3',
                'battery-warning': 'ja/battery-warning.mp3'
            },
            'en': {
                'navigation-start': 'en/navigation-start.mp3',
                'turn-left': 'en/turn-left.mp3',
                'turn-right': 'en/turn-right.mp3',
                'go-straight': 'en/go-straight.mp3',
                'go-upstairs': 'en/go-upstairs.mp3',
                'go-downstairs': 'en/go-downstairs.mp3',
                'use-elevator': 'en/use-elevator.mp3',
                'arrived': 'en/arrived.mp3',
                'system-ready': 'en/system-ready.mp3',
                'distance-remaining': 'en/distance-remaining.mp3',
                'floor-changed': 'en/floor-changed.mp3',
                'destination-reception': 'en/destination-reception.mp3',
                'destination-onsen': 'en/destination-onsen.mp3',
                'destination-restaurant': 'en/destination-restaurant.mp3',
                'destination-toilet': 'en/destination-toilet.mp3',
                'destination-shop': 'en/destination-shop.mp3',
                'destination-parking': 'en/destination-parking.mp3',
                'recalibrating': 'en/recalibrating.mp3',
                'connection-lost': 'en/connection-lost.mp3',
                'battery-warning': 'en/battery-warning.mp3'
            },
            'zh': {
                // 中国語音声ファイル（同様の構造）
                'navigation-start': 'zh/navigation-start.mp3',
                'turn-left': 'zh/turn-left.mp3',
                'turn-right': 'zh/turn-right.mp3',
                'go-straight': 'zh/go-straight.mp3',
                'go-upstairs': 'zh/go-upstairs.mp3',
                'go-downstairs': 'zh/go-downstairs.mp3',
                'use-elevator': 'zh/use-elevator.mp3',
                'arrived': 'zh/arrived.mp3',
                'system-ready': 'zh/system-ready.mp3'
            },
            'ko': {
                // 韓国語音声ファイル（同様の構造）
                'navigation-start': 'ko/navigation-start.mp3',
                'turn-left': 'ko/turn-left.mp3',
                'turn-right': 'ko/turn-right.mp3',
                'go-straight': 'ko/go-straight.mp3',
                'go-upstairs': 'ko/go-upstairs.mp3',
                'go-downstairs': 'ko/go-downstairs.mp3',
                'use-elevator': 'ko/use-elevator.mp3',
                'arrived': 'ko/arrived.mp3',
                'system-ready': 'ko/system-ready.mp3'
            }
        };
        
        // フォールバック用テキスト
        this.fallbackTexts = {
            'ja': {
                'navigation-start': 'ナビゲーションを開始します',
                'turn-left': '左に曲がってください',
                'turn-right': '右に曲がってください',
                'go-straight': '直進してください',
                'go-upstairs': '階段を上ってください',
                'go-downstairs': '階段を下りてください',
                'use-elevator': 'エレベーターをご利用ください',
                'arrived': '目的地に到着しました',
                'system-ready': 'ARシステムの準備が完了しました'
            },
            'en': {
                'navigation-start': 'Navigation started',
                'turn-left': 'Turn left',
                'turn-right': 'Turn right',
                'go-straight': 'Go straight',
                'go-upstairs': 'Go upstairs',
                'go-downstairs': 'Go downstairs',
                'use-elevator': 'Please use the elevator',
                'arrived': 'You have arrived',
                'system-ready': 'AR system ready'
            }
        };
    }
    
    /**
     * 音声システム初期化
     */
    async initialize() {
        console.log('音声マネージャー初期化開始');
        
        try {
            // 基本音声ファイルをプリロード
            await this.preloadEssentialAudio();
            
            console.log('音声マネージャー初期化完了');
            return true;
            
        } catch (error) {
            console.warn('音声ファイル読み込み失敗、Web Speech APIを使用:', error);
            return false;
        }
    }
    
    /**
     * 必須音声ファイルのプリロード
     */
    async preloadEssentialAudio() {
        const essentialFiles = [
            'navigation-start',
            'turn-left', 
            'turn-right',
            'go-straight',
            'arrived',
            'system-ready'
        ];
        
        const promises = essentialFiles.map(key => this.loadAudioFile(key));
        await Promise.all(promises);
        
        console.log('必須音声ファイルプリロード完了');
    }
    
    /**
     * 音声ファイル読み込み
     */
    async loadAudioFile(key) {
        const cacheKey = `${this.currentLanguage}_${key}`;
        
        if (this.audioCache.has(cacheKey)) {
            return this.audioCache.get(cacheKey);
        }
        
        try {
            const filePath = this.audioFiles[this.currentLanguage][key];
            if (!filePath) {
                throw new Error(`音声ファイルが見つかりません: ${key}`);
            }
            
            const audio = new Audio(this.audioBasePath + filePath);
            audio.preload = 'auto';
            audio.volume = this.volume;
            
            // 読み込み完了を待機
            await new Promise((resolve, reject) => {
                audio.addEventListener('canplaythrough', resolve);
                audio.addEventListener('error', reject);
                audio.load();
            });
            
            this.audioCache.set(cacheKey, audio);
            return audio;
            
        } catch (error) {
            console.warn(`音声ファイル読み込み失敗: ${key}`, error);
            return null;
        }
    }
    
    /**
     * 音声再生
     */
    async play(key, params = {}) {
        if (!this.isEnabled) {
            return;
        }
        
        try {
            // 音声ファイル再生を試行
            const audio = await this.loadAudioFile(key);
            
            if (audio) {
                audio.currentTime = 0;
                audio.volume = this.volume;
                await audio.play();
                console.log(`音声再生: ${key}`);
                return true;
            }
            
        } catch (error) {
            console.warn(`音声ファイル再生失敗: ${key}`, error);
        }
        
        // フォールバック: Web Speech API
        return this.playWithSpeechAPI(key, params);
    }
    
    /**
     * Web Speech API による音声再生
     */
    async playWithSpeechAPI(key, params = {}) {
        if (!('speechSynthesis' in window)) {
            console.warn('音声合成がサポートされていません');
            return false;
        }
        
        const text = this.fallbackTexts[this.currentLanguage][key];
        if (!text) {
            console.warn(`フォールバックテキストが見つかりません: ${key}`);
            return false;
        }
        
        return new Promise((resolve) => {
            const utterance = new SpeechSynthesisUtterance(text);
            
            // 言語設定
            const langCodes = {
                'ja': 'ja-JP',
                'en': 'en-US', 
                'zh': 'zh-CN',
                'ko': 'ko-KR'
            };
            utterance.lang = langCodes[this.currentLanguage] || 'ja-JP';
            
            // 音声設定
            utterance.rate = 1.0;
            utterance.pitch = 1.0;
            utterance.volume = this.volume;
            
            // パラメータ置換
            let finalText = text;
            for (const [param, value] of Object.entries(params)) {
                finalText = finalText.replace(`{${param}}`, value);
            }
            utterance.text = finalText;
            
            utterance.onend = () => resolve(true);
            utterance.onerror = () => resolve(false);
            
            window.speechSynthesis.speak(utterance);
            console.log(`Web Speech API再生: ${key} - ${finalText}`);
        });
    }
    
    /**
     * 音声停止
     */
    stop() {
        // 全ての音声を停止
        for (const audio of this.audioCache.values()) {
            if (audio && !audio.paused) {
                audio.pause();
                audio.currentTime = 0;
            }
        }
        
        // Web Speech API停止
        if ('speechSynthesis' in window) {
            window.speechSynthesis.cancel();
        }
    }
    
    /**
     * 言語設定
     */
    setLanguage(language) {
        if (this.audioFiles[language]) {
            this.currentLanguage = language;
            console.log(`音声言語設定: ${language}`);
            return true;
        }
        
        console.warn(`サポートされていない言語: ${language}`);
        return false;
    }
    
    /**
     * 音声有効/無効切り替え
     */
    setEnabled(enabled) {
        this.isEnabled = enabled;
        
        if (!enabled) {
            this.stop();
        }
        
        console.log(`音声${enabled ? '有効' : '無効'}`);
    }
    
    /**
     * 音量設定
     */
    setVolume(volume) {
        this.volume = Math.max(0, Math.min(1, volume));
        
        // キャッシュされた音声の音量更新
        for (const audio of this.audioCache.values()) {
            if (audio) {
                audio.volume = this.volume;
            }
        }
        
        console.log(`音量設定: ${this.volume}`);
    }
    
    /**
     * ナビゲーション音声再生（便利メソッド）
     */
    async playNavigation(type, params = {}) {
        const navigationSounds = {
            'start': 'navigation-start',
            'left': 'turn-left',
            'right': 'turn-right',
            'straight': 'go-straight',
            'up': 'go-upstairs',
            'down': 'go-downstairs',
            'elevator': 'use-elevator',
            'arrived': 'arrived'
        };
        
        const soundKey = navigationSounds[type];
        if (soundKey) {
            return await this.play(soundKey, params);
        }
        
        console.warn(`不明なナビゲーションタイプ: ${type}`);
        return false;
    }
    
    /**
     * 目的地案内音声（便利メソッド）
     */
    async playDestination(destination) {
        const key = `destination-${destination}`;
        return await this.play(key);
    }
    
    /**
     * システム音声（便利メソッド）
     */
    async playSystem(type) {
        const systemSounds = {
            'ready': 'system-ready',
            'recalibrating': 'recalibrating',
            'connection-lost': 'connection-lost',
            'battery-warning': 'battery-warning'
        };
        
        const soundKey = systemSounds[type];
        if (soundKey) {
            return await this.play(soundKey);
        }
        
        return false;
    }
    
    /**
     * デバッグ情報取得
     */
    getDebugInfo() {
        return {
            currentLanguage: this.currentLanguage,
            isEnabled: this.isEnabled,
            volume: this.volume,
            cachedAudioCount: this.audioCache.size,
            supportedLanguages: Object.keys(this.audioFiles),
            speechSynthesisAvailable: 'speechSynthesis' in window
        };
    }
}

// グローバル公開
window.AudioManager = AudioManager;
