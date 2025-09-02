/**
 * 多言語翻訳システム
 * 温泉旅館AR - リアルタイム音声・テキスト多言語対応
 */

class TranslationManager {
    constructor() {
        this.currentLanguage = 'ja';
        this.supportedLanguages = ['ja', 'en', 'zh-CN', 'ko'];
        this.translations = new Map();
        this.speechSynthesis = null;
        this.voices = new Map();
        
        // 翻訳キャッシュ
        this.translationCache = new Map();
        
        // 音声設定
        this.voiceSettings = {
            'ja': { rate: 1.0, pitch: 1.0, volume: 1.0 },
            'en': { rate: 0.9, pitch: 1.1, volume: 1.0 },
            'zh-CN': { rate: 0.8, pitch: 1.0, volume: 1.0 },
            'ko': { rate: 0.9, pitch: 1.0, volume: 1.0 }
        };
        
        this.callbacks = [];
    }
    
    /**
     * 翻訳システム初期化
     */
    async initialize() {
        console.log('翻訳システム初期化開始');
        
        try {
            // 基本翻訳データ読み込み
            this.loadBaseTranslations();
            
            // 音声合成初期化
            await this.initializeSpeechSynthesis();
            
            // ブラウザ言語検出
            this.detectBrowserLanguage();
            
            console.log('翻訳システム初期化完了');
            
        } catch (error) {
            console.error('翻訳システム初期化エラー:', error);
            throw error;
        }
    }
    
    /**
     * 基本翻訳データ読み込み
     */
    loadBaseTranslations() {
        const baseTranslations = {
            // システムメッセージ
            'system.initializing': {
                'ja': 'ARシステムを初期化しています...',
                'en': 'Initializing AR system...',
                'zh-CN': '正在初始化AR系统...',
                'ko': 'AR 시스템을 초기화하는 중...'
            },
            'system.ready': {
                'ja': 'AR準備完了',
                'en': 'AR Ready',
                'zh-CN': 'AR准备就绪',
                'ko': 'AR 준비 완료'
            },
            'system.error': {
                'ja': 'システムエラーが発生しました',
                'en': 'System error occurred',
                'zh-CN': '发生系统错误',
                'ko': '시스템 오류가 발생했습니다'
            },
            
            // ナビゲーションメッセージ
            'nav.start': {
                'ja': '{destination}へのご案内を開始します',
                'en': 'Starting navigation to {destination}',
                'zh-CN': '开始导航到{destination}',
                'ko': '{destination}으로 안내를 시작합니다'
            },
            'nav.arrived': {
                'ja': '{destination}に到着しました',
                'en': 'Arrived at {destination}',
                'zh-CN': '已到达{destination}',
                'ko': '{destination}에 도착했습니다'
            },
            'nav.turn_left': {
                'ja': '左に曲がってください',
                'en': 'Turn left',
                'zh-CN': '请向左转',
                'ko': '왼쪽으로 돌아주세요'
            },
            'nav.turn_right': {
                'ja': '右に曲がってください',
                'en': 'Turn right',
                'zh-CN': '请向右转',
                'ko': '오른쪽으로 돌아주세요'
            },
            'nav.go_straight': {
                'ja': '直進してください',
                'en': 'Go straight',
                'zh-CN': '请直行',
                'ko': '직진해 주세요'
            },
            'nav.go_up': {
                'ja': '上の階へ向かってください',
                'en': 'Go upstairs',
                'zh-CN': '请上楼',
                'ko': '위층으로 가세요'
            },
            'nav.go_down': {
                'ja': '下の階へ向かってください',
                'en': 'Go downstairs',
                'zh-CN': '请下楼',
                'ko': '아래층으로 가세요'
            },
            'nav.use_elevator': {
                'ja': 'エレベーターをご利用ください',
                'en': 'Please use the elevator',
                'zh-CN': '请使用电梯',
                'ko': '엘리베이터를 이용해 주세요'
            },
            'nav.distance_remaining': {
                'ja': '残り{distance}メートルです',
                'en': '{distance} meters remaining',
                'zh-CN': '剩余{distance}米',
                'ko': '남은 거리 {distance}미터'
            },
            
            // 目的地名称
            'dest.reception': {
                'ja': 'フロント・受付',
                'en': 'Front Desk・Reception',
                'zh-CN': '前台・接待处',
                'ko': '프런트・접수처'
            },
            'dest.onsen': {
                'ja': '大浴場・温泉',
                'en': 'Public Bath・Hot Spring',
                'zh-CN': '大浴场・温泉',
                'ko': '대욕장・온천'
            },
            'dest.onsen_men': {
                'ja': '男湯',
                'en': "Men's Bath",
                'zh-CN': '男汤',
                'ko': '남탕'
            },
            'dest.onsen_women': {
                'ja': '女湯',
                'en': "Women's Bath",
                'zh-CN': '女汤',
                'ko': '여탕'
            },
            'dest.restaurant': {
                'ja': 'レストラン・食事処',
                'en': 'Restaurant・Dining',
                'zh-CN': '餐厅・用餐处',
                'ko': '레스토랑・식당'
            },
            'dest.elevator': {
                'ja': 'エレベーター',
                'en': 'Elevator',
                'zh-CN': '电梯',
                'ko': '엘리베이터'
            },
            'dest.toilet': {
                'ja': 'お手洗い',
                'en': 'Restroom',
                'zh-CN': '洗手间',
                'ko': '화장실'
            },
            'dest.shop': {
                'ja': '売店・お土産',
                'en': 'Shop・Souvenir',
                'zh-CN': '商店・纪念品',
                'ko': '매점・기념품'
            },
            'dest.lounge': {
                'ja': 'ラウンジ・休憩所',
                'en': 'Lounge・Rest Area',
                'zh-CN': '休息室・休息处',
                'ko': '라운지・휴게소'
            },
            'dest.parking': {
                'ja': '駐車場',
                'en': 'Parking',
                'zh-CN': '停车场',
                'ko': '주차장'
            },
            
            // フロア表示
            'floor.1f': {
                'ja': '1階',
                'en': '1st Floor',
                'zh-CN': '1楼',
                'ko': '1층'
            },
            'floor.2f': {
                'ja': '2階',
                'en': '2nd Floor',
                'zh-CN': '2楼',
                'ko': '2층'
            },
            'floor.b1f': {
                'ja': '地下1階',
                'en': 'Basement 1',
                'zh-CN': '地下1层',
                'ko': '지하1층'
            },
            
            // UI要素
            'ui.select_destination': {
                'ja': '目的地を選択',
                'en': 'Select Destination',
                'zh-CN': '选择目的地',
                'ko': '목적지 선택'
            },
            'ui.distance': {
                'ja': '距離',
                'en': 'Distance',
                'zh-CN': '距离',
                'ko': '거리'
            },
            'ui.eta': {
                'ja': '到着予定',
                'en': 'ETA',
                'zh-CN': '预计到达',
                'ko': '도착 예정'
            },
            'ui.floor': {
                'ja': 'フロア',
                'en': 'Floor',
                'zh-CN': '楼层',
                'ko': '층'
            },
            'ui.recalibrate': {
                'ja': '位置を再校正',
                'en': 'Recalibrate Position',
                'zh-CN': '重新校准位置',
                'ko': '위치 재보정'
            },
            'ui.help': {
                'ja': 'ヘルプ',
                'en': 'Help',
                'zh-CN': '帮助',
                'ko': '도움말'
            },
            
            // ヘルプメッセージ
            'help.usage': {
                'ja': 'ARナビの使い方:\n\n1. スマホをかざしてAR画面を確認\n2. 目的地を選択\n3. 画面の矢印に従って移動\n4. 音声案内を聞きながら進む\n\n困った時は館内スタッフにお声がけください。',
                'en': 'How to use AR Navigation:\n\n1. Hold up your smartphone to view AR\n2. Select your destination\n3. Follow the arrows on screen\n4. Listen to voice guidance\n\nPlease ask hotel staff if you need assistance.',
                'zh-CN': 'AR导航使用方法:\n\n1. 举起手机查看AR画面\n2. 选择目的地\n3. 跟随屏幕上的箭头移动\n4. 听取语音导航\n\n如有困难请联系酒店工作人员。',
                'ko': 'AR 내비게이션 사용법:\n\n1. 스마트폰을 들어 AR 화면 확인\n2. 목적지 선택\n3. 화면의 화살표를 따라 이동\n4. 음성 안내를 들으며 진행\n\n문의사항은 호텔 직원에게 문의해 주세요.'
            },
            
            // エラーメッセージ
            'error.camera_permission': {
                'ja': 'カメラへのアクセス許可が必要です',
                'en': 'Camera access permission required',
                'zh-CN': '需要相机访问权限',
                'ko': '카메라 접근 권한이 필요합니다'
            },
            'error.location_permission': {
                'ja': '位置情報へのアクセス許可が必要です',
                'en': 'Location access permission required',
                'zh-CN': '需要位置信息访问权限',
                'ko': '위치 정보 접근 권한이 필요합니다'
            },
            'error.sensor_unavailable': {
                'ja': 'センサーが利用できません',
                'en': 'Sensors unavailable',
                'zh-CN': '传感器不可用',
                'ko': '센서를 사용할 수 없습니다'
            },
            'error.destination_not_found': {
                'ja': '目的地が見つかりません',
                'en': 'Destination not found',
                'zh-CN': '未找到目的地',
                'ko': '목적지를 찾을 수 없습니다'
            }
        };
        
        for (const [key, translations] of Object.entries(baseTranslations)) {
            this.translations.set(key, translations);
        }
        
        console.log('基本翻訳データ読み込み完了:', this.translations.size, '項目');
    }
    
    /**
     * 音声合成初期化
     */
    async initializeSpeechSynthesis() {
        if (!('speechSynthesis' in window)) {
            console.warn('音声合成がサポートされていません');
            return;
        }
        
        this.speechSynthesis = window.speechSynthesis;
        
        // 音声リスト読み込み完了まで待機
        return new Promise((resolve) => {
            const loadVoices = () => {
                const voices = this.speechSynthesis.getVoices();
                
                if (voices.length > 0) {
                    this.processVoices(voices);
                    resolve();
                } else {
                    // 音声リスト読み込み待ち
                    this.speechSynthesis.addEventListener('voiceschanged', () => {
                        this.processVoices(this.speechSynthesis.getVoices());
                        resolve();
                    }, { once: true });
                }
            };
            
            loadVoices();
        });
    }
    
    /**
     * 利用可能音声の処理
     */
    processVoices(voices) {
        const languageVoices = {
            'ja': [],
            'en': [],
            'zh-CN': [],
            'ko': []
        };
        
        for (const voice of voices) {
            const lang = voice.lang.toLowerCase();
            
            if (lang.startsWith('ja')) {
                languageVoices['ja'].push(voice);
            } else if (lang.startsWith('en')) {
                languageVoices['en'].push(voice);
            } else if (lang.startsWith('zh-cn') || lang.startsWith('zh')) {
                languageVoices['zh-CN'].push(voice);
            } else if (lang.startsWith('ko')) {
                languageVoices['ko'].push(voice);
            }
        }
        
        // 各言語で最適な音声を選択
        for (const [lang, voiceList] of Object.entries(languageVoices)) {
            if (voiceList.length > 0) {
                // より自然な音声を優先選択
                const bestVoice = voiceList.find(v => 
                    v.name.includes('Neural') || 
                    v.name.includes('Premium') || 
                    v.localService
                ) || voiceList[0];
                
                this.voices.set(lang, bestVoice);
            }
        }
        
        console.log('音声合成準備完了:', this.voices.size, '言語対応');
    }
    
    /**
     * ブラウザ言語検出
     */
    detectBrowserLanguage() {
        const browserLang = navigator.language || navigator.userLanguage;
        
        if (browserLang.startsWith('ja')) {
            this.currentLanguage = 'ja';
        } else if (browserLang.startsWith('en')) {
            this.currentLanguage = 'en';
        } else if (browserLang.startsWith('zh')) {
            this.currentLanguage = 'zh-CN';
        } else if (browserLang.startsWith('ko')) {
            this.currentLanguage = 'ko';
        }
        
        console.log('検出言語:', browserLang, '->', this.currentLanguage);
    }
    
    /**
     * 翻訳実行
     */
    translate(key, params = {}) {
        const translations = this.translations.get(key);
        
        if (!translations) {
            console.warn('翻訳キーが見つかりません:', key);
            return key;
        }
        
        let text = translations[this.currentLanguage] || translations['ja'] || key;
        
        // パラメータ置換
        for (const [param, value] of Object.entries(params)) {
            text = text.replace(new RegExp(`\\{${param}\\}`, 'g'), value);
        }
        
        return text;
    }
    
    /**
     * 複数翻訳実行
     */
    translateMultiple(keys) {
        const results = {};
        for (const key of keys) {
            results[key] = this.translate(key);
        }
        return results;
    }
    
    /**
     * 音声読み上げ
     */
    speak(textOrKey, params = {}) {
        if (!this.speechSynthesis) {
            console.warn('音声合成が利用できません');
            return Promise.resolve();
        }
        
        // 翻訳キーの場合は翻訳実行
        const text = this.translations.has(textOrKey) 
            ? this.translate(textOrKey, params)
            : textOrKey;
        
        return new Promise((resolve, reject) => {
            const utterance = new SpeechSynthesisUtterance(text);
            
            // 音声設定
            const voice = this.voices.get(this.currentLanguage);
            if (voice) {
                utterance.voice = voice;
            }
            
            const settings = this.voiceSettings[this.currentLanguage];
            utterance.rate = settings.rate;
            utterance.pitch = settings.pitch;
            utterance.volume = settings.volume;
            utterance.lang = this.getLanguageCode();
            
            // イベントリスナー
            utterance.onend = () => resolve();
            utterance.onerror = (error) => {
                console.error('音声合成エラー:', error);
                reject(error);
            };
            
            // 読み上げ実行
            this.speechSynthesis.speak(utterance);
            
            console.log('音声読み上げ:', text, `(${this.currentLanguage})`);
        });
    }
    
    /**
     * 音声停止
     */
    stopSpeaking() {
        if (this.speechSynthesis) {
            this.speechSynthesis.cancel();
        }
    }
    
    /**
     * 言語変更
     */
    setLanguage(language) {
        if (!this.supportedLanguages.includes(language)) {
            console.warn('サポートされていない言語:', language);
            return false;
        }
        
        const oldLanguage = this.currentLanguage;
        this.currentLanguage = language;
        
        console.log('言語変更:', oldLanguage, '->', language);
        
        // 言語変更コールバック
        this.triggerCallback('languageChanged', {
            oldLanguage,
            newLanguage: language
        });
        
        return true;
    }
    
    /**
     * 現在の言語取得
     */
    getCurrentLanguage() {
        return this.currentLanguage;
    }
    
    /**
     * サポート言語一覧取得
     */
    getSupportedLanguages() {
        return [...this.supportedLanguages];
    }
    
    /**
     * 言語コード取得
     */
    getLanguageCode() {
        const codes = {
            'ja': 'ja-JP',
            'en': 'en-US',
            'zh-CN': 'zh-CN',
            'ko': 'ko-KR'
        };
        return codes[this.currentLanguage] || 'ja-JP';
    }
    
    /**
     * 言語名取得
     */
    getLanguageName(language = this.currentLanguage) {
        const names = {
            'ja': '日本語',
            'en': 'English',
            'zh-CN': '中文',
            'ko': '한국어'
        };
        return names[language] || language;
    }
    
    /**
     * リアルタイム翻訳（Web翻訳API使用）
     */
    async translateText(text, targetLanguage = this.currentLanguage) {
        // キャッシュチェック
        const cacheKey = `${text}_${targetLanguage}`;
        if (this.translationCache.has(cacheKey)) {
            return this.translationCache.get(cacheKey);
        }
        
        try {
            // Google Translate API代替（簡易実装）
            const translatedText = await this.performTranslation(text, targetLanguage);
            
            // キャッシュに保存
            this.translationCache.set(cacheKey, translatedText);
            
            return translatedText;
            
        } catch (error) {
            console.error('リアルタイム翻訳エラー:', error);
            return text; // 翻訳失敗時は元のテキストを返す
        }
    }
    
    /**
     * 翻訳実行（簡易実装）
     */
    async performTranslation(text, targetLanguage) {
        // 実際の実装では外部翻訳APIを使用
        // ここでは基本的な単語置換で代用
        const basicTranslations = {
            'en': {
                '直進': 'go straight',
                '左': 'left',
                '右': 'right',
                '上': 'up',
                '下': 'down',
                'メートル': 'meters',
                '分': 'minutes'
            },
            'zh-CN': {
                '直進': '直行',
                '左': '左',
                '右': '右',
                '上': '上',
                '下': '下',
                'メートル': '米',
                '分': '分钟'
            },
            'ko': {
                '直進': '직진',
                '左': '왼쪽',
                '右': '오른쪽',
                '上': '위',
                '下': '아래',
                'メートル': '미터',
                '分': '분'
            }
        };
        
        const translations = basicTranslations[targetLanguage];
        if (!translations) return text;
        
        let result = text;
        for (const [original, translated] of Object.entries(translations)) {
            result = result.replace(new RegExp(original, 'g'), translated);
        }
        
        return result;
    }
    
    /**
     * ナビゲーション音声案内
     */
    async announceNavigation(type, params = {}) {
        const announcements = {
            'start': 'nav.start',
            'turn_left': 'nav.turn_left',
            'turn_right': 'nav.turn_right',
            'go_straight': 'nav.go_straight',
            'go_up': 'nav.go_up',
            'go_down': 'nav.go_down',
            'use_elevator': 'nav.use_elevator',
            'arrived': 'nav.arrived',
            'distance_remaining': 'nav.distance_remaining'
        };
        
        const key = announcements[type];
        if (key) {
            await this.speak(key, params);
        }
    }
    
    /**
     * UI要素の多言語化
     */
    updateUILanguage() {
        const elements = [
            { id: 'destination-panel-title', key: 'ui.select_destination' },
            { id: 'distance-label', key: 'ui.distance' },
            { id: 'eta-label', key: 'ui.eta' },
            { id: 'floor-label', key: 'ui.floor' }
        ];
        
        for (const element of elements) {
            const el = document.getElementById(element.id);
            if (el) {
                el.textContent = this.translate(element.key);
            }
        }
        
        // 目的地ボタンの更新
        this.updateDestinationButtons();
    }
    
    /**
     * 目的地ボタンの多言語化
     */
    updateDestinationButtons() {
        const buttons = [
            { id: 'btn-reception', key: 'dest.reception' },
            { id: 'btn-onsen', key: 'dest.onsen' },
            { id: 'btn-restaurant', key: 'dest.restaurant' },
            { id: 'btn-elevator', key: 'dest.elevator' },
            { id: 'btn-toilet', key: 'dest.toilet' },
            { id: 'btn-shop', key: 'dest.shop' },
            { id: 'btn-lounge', key: 'dest.lounge' },
            { id: 'btn-parking', key: 'dest.parking' }
        ];
        
        for (const button of buttons) {
            const el = document.querySelector(`[onclick*="${button.id.replace('btn-', '')}"]`);
            if (el) {
                const icon = el.textContent.split(' ')[0]; // 絵文字を保持
                el.textContent = `${icon} ${this.translate(button.key)}`;
            }
        }
    }
    
    /**
     * 言語切り替えUI作成
     */
    createLanguageSwitcher() {
        const switcher = document.createElement('div');
        switcher.className = 'language-switcher';
        switcher.style.cssText = `
            position: fixed;
            top: 15px;
            right: 70px;
            background: rgba(0,0,0,0.8);
            border-radius: 20px;
            padding: 5px;
            display: flex;
            gap: 5px;
            z-index: 1002;
        `;
        
        for (const lang of this.supportedLanguages) {
            const button = document.createElement('button');
            button.textContent = this.getLanguageDisplayCode(lang);
            button.className = 'lang-btn';
            button.style.cssText = `
                background: ${lang === this.currentLanguage ? '#4CAF50' : 'rgba(255,255,255,0.2)'};
                border: none;
                color: white;
                padding: 8px 12px;
                border-radius: 15px;
                cursor: pointer;
                font-size: 12px;
                transition: all 0.3s ease;
            `;
            
            button.addEventListener('click', () => {
                this.setLanguage(lang);
                this.updateLanguageSwitcher();
                this.updateUILanguage();
            });
            
            switcher.appendChild(button);
        }
        
        document.body.appendChild(switcher);
        this.languageSwitcher = switcher;
    }
    
    /**
     * 言語表示コード取得
     */
    getLanguageDisplayCode(language) {
        const codes = {
            'ja': 'JA',
            'en': 'EN',
            'zh-CN': 'CN',
            'ko': 'KO'
        };
        return codes[language] || language.toUpperCase();
    }
    
    /**
     * 言語切り替えUI更新
     */
    updateLanguageSwitcher() {
        if (!this.languageSwitcher) return;
        
        const buttons = this.languageSwitcher.querySelectorAll('.lang-btn');
        buttons.forEach((button, index) => {
            const lang = this.supportedLanguages[index];
            button.style.background = lang === this.currentLanguage 
                ? '#4CAF50' 
                : 'rgba(255,255,255,0.2)';
        });
    }
    
    /**
     * コールバック登録
     */
    onLanguageEvent(eventType, callback) {
        this.callbacks.push({ eventType, callback });
    }
    
    /**
     * コールバック実行
     */
    triggerCallback(eventType, data) {
        this.callbacks
            .filter(cb => cb.eventType === eventType)
            .forEach(cb => cb.callback(data));
    }
    
    /**
     * 翻訳データ追加
     */
    addTranslation(key, translations) {
        this.translations.set(key, translations);
    }
    
    /**
     * 翻訳データ一括追加
     */
    addTranslations(translationData) {
        for (const [key, translations] of Object.entries(translationData)) {
            this.translations.set(key, translations);
        }
    }
    
    /**
     * デバッグ情報取得
     */
    getDebugInfo() {
        return {
            currentLanguage: this.currentLanguage,
            supportedLanguages: this.supportedLanguages,
            translationsCount: this.translations.size,
            voicesAvailable: this.voices.size,
            cacheSize: this.translationCache.size,
            speechSynthesisAvailable: !!this.speechSynthesis
        };
    }
}

// グローバル公開
window.TranslationManager = TranslationManager;
