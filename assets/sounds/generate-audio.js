/**
 * 音声ファイル生成スクリプト
 * Web Speech API を使用してMP3音声ファイルを生成
 */

class AudioGenerator {
    constructor() {
        this.synthesis = window.speechSynthesis;
        this.audioFiles = new Map();
        
        // 音声テキスト定義
        this.audioTexts = {
            'ja': {
                'navigation-start': 'ナビゲーションを開始します',
                'turn-left': '左に曲がってください',
                'turn-right': '右に曲がってください', 
                'go-straight': '直進してください',
                'go-upstairs': '階段を上ってください',
                'go-downstairs': '階段を下りてください',
                'use-elevator': 'エレベーターをご利用ください',
                'arrived': '目的地に到着しました',
                'system-ready': 'ARシステムの準備が完了しました',
                'distance-remaining': '残り{distance}メートルです',
                'floor-changed': '{floor}に移動しました',
                'destination-reception': 'フロント・受付へご案内します',
                'destination-onsen': '大浴場・温泉へご案内します',
                'destination-restaurant': 'レストラン・食事処へご案内します',
                'destination-toilet': 'お手洗いへご案内します',
                'destination-shop': '売店・お土産コーナーへご案内します',
                'destination-parking': '駐車場へご案内します',
                'recalibrating': '位置を再校正しています',
                'connection-lost': '接続が不安定です',
                'battery-warning': 'バッテリー残量にご注意ください'
            },
            'en': {
                'navigation-start': 'Navigation started',
                'turn-left': 'Turn left',
                'turn-right': 'Turn right',
                'go-straight': 'Go straight',
                'go-upstairs': 'Go upstairs',
                'go-downstairs': 'Go downstairs', 
                'use-elevator': 'Please use the elevator',
                'arrived': 'You have arrived at your destination',
                'system-ready': 'AR system is ready',
                'distance-remaining': '{distance} meters remaining',
                'floor-changed': 'Moved to {floor}',
                'destination-reception': 'Navigating to Front Desk',
                'destination-onsen': 'Navigating to Public Bath',
                'destination-restaurant': 'Navigating to Restaurant',
                'destination-toilet': 'Navigating to Restroom',
                'destination-shop': 'Navigating to Shop',
                'destination-parking': 'Navigating to Parking',
                'recalibrating': 'Recalibrating position',
                'connection-lost': 'Connection is unstable',
                'battery-warning': 'Please check your battery level'
            },
            'zh': {
                'navigation-start': '开始导航',
                'turn-left': '请向左转',
                'turn-right': '请向右转',
                'go-straight': '请直行',
                'go-upstairs': '请上楼',
                'go-downstairs': '请下楼',
                'use-elevator': '请使用电梯',
                'arrived': '已到达目的地',
                'system-ready': 'AR系统已准备就绪',
                'distance-remaining': '剩余{distance}米',
                'floor-changed': '已移动到{floor}',
                'destination-reception': '前往前台',
                'destination-onsen': '前往大浴场',
                'destination-restaurant': '前往餐厅',
                'destination-toilet': '前往洗手间',
                'destination-shop': '前往商店',
                'destination-parking': '前往停车场',
                'recalibrating': '正在重新校准位置',
                'connection-lost': '连接不稳定',
                'battery-warning': '请注意电池电量'
            },
            'ko': {
                'navigation-start': '내비게이션을 시작합니다',
                'turn-left': '왼쪽으로 돌아주세요',
                'turn-right': '오른쪽으로 돌아주세요',
                'go-straight': '직진해 주세요',
                'go-upstairs': '위층으로 가세요',
                'go-downstairs': '아래층으로 가세요',
                'use-elevator': '엘리베이터를 이용해 주세요',
                'arrived': '목적지에 도착했습니다',
                'system-ready': 'AR 시스템이 준비되었습니다',
                'distance-remaining': '남은 거리 {distance}미터',
                'floor-changed': '{floor}으로 이동했습니다',
                'destination-reception': '프런트로 안내합니다',
                'destination-onsen': '대욕장으로 안내합니다',
                'destination-restaurant': '레스토랑으로 안내합니다',
                'destination-toilet': '화장실로 안내합니다',
                'destination-shop': '매점으로 안내합니다',
                'destination-parking': '주차장으로 안내합니다',
                'recalibrating': '위치를 재보정하고 있습니다',
                'connection-lost': '연결이 불안정합니다',
                'battery-warning': '배터리 잔량을 확인해 주세요'
            }
        };
        
        // 音声設定
        this.voiceSettings = {
            'ja': { rate: 1.0, pitch: 1.0, volume: 1.0, lang: 'ja-JP' },
            'en': { rate: 0.9, pitch: 1.1, volume: 1.0, lang: 'en-US' },
            'zh': { rate: 0.8, pitch: 1.0, volume: 1.0, lang: 'zh-CN' },
            'ko': { rate: 0.9, pitch: 1.0, volume: 1.0, lang: 'ko-KR' }
        };
    }
    
    /**
     * 全音声ファイル生成
     */
    async generateAllAudio() {
        console.log('音声ファイル生成開始...');
        
        for (const [lang, texts] of Object.entries(this.audioTexts)) {
            console.log(`${lang} 音声生成中...`);
            
            for (const [key, text] of Object.entries(texts)) {
                await this.generateAudioFile(lang, key, text);
                await this.delay(500); // 0.5秒待機
            }
        }
        
        console.log('全音声ファイル生成完了');
        this.downloadAllAudio();
    }
    
    /**
     * 単一音声ファイル生成
     */
    async generateAudioFile(language, key, text) {
        return new Promise((resolve, reject) => {
            const utterance = new SpeechSynthesisUtterance(text);
            const settings = this.voiceSettings[language];
            
            // 音声設定
            utterance.rate = settings.rate;
            utterance.pitch = settings.pitch;
            utterance.volume = settings.volume;
            utterance.lang = settings.lang;
            
            // 対応音声を検索
            const voices = this.synthesis.getVoices();
            const voice = voices.find(v => v.lang.startsWith(language));
            if (voice) {
                utterance.voice = voice;
            }
            
            // 録音準備（Web Audio API使用）
            this.startRecording(language, key, utterance, resolve, reject);
        });
    }
    
    /**
     * 録音開始
     */
    startRecording(language, key, utterance, resolve, reject) {
        // AudioContext for recording
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const mediaStreamDestination = audioContext.createMediaStreamDestination();
        
        // Record the audio
        const mediaRecorder = new MediaRecorder(mediaStreamDestination.stream);
        const audioChunks = [];
        
        mediaRecorder.ondataavailable = (event) => {
            audioChunks.push(event.data);
        };
        
        mediaRecorder.onstop = () => {
            const audioBlob = new Blob(audioChunks, { type: 'audio/mp3' });
            const fileName = `${language}/${key}.mp3`;
            
            this.audioFiles.set(fileName, audioBlob);
            console.log(`生成完了: ${fileName}`);
            resolve();
        };
        
        // Start recording
        mediaRecorder.start();
        
        // Setup utterance events
        utterance.onend = () => {
            setTimeout(() => {
                mediaRecorder.stop();
            }, 100);
        };
        
        utterance.onerror = (error) => {
            console.error(`音声生成エラー: ${language}/${key}`, error);
            mediaRecorder.stop();
            reject(error);
        };
        
        // Speak
        this.synthesis.speak(utterance);
    }
    
    /**
     * 全音声ファイルダウンロード
     */
    downloadAllAudio() {
        console.log('音声ファイルダウンロード開始...');
        
        for (const [fileName, blob] of this.audioFiles.entries()) {
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = fileName.replace('/', '_');
            a.click();
            URL.revokeObjectURL(url);
        }
        
        console.log('全音声ファイルダウンロード完了');
    }
    
    /**
     * 遅延ユーティリティ
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    
    /**
     * 音声プレビュー
     */
    previewAudio(language, key) {
        const text = this.audioTexts[language][key];
        const utterance = new SpeechSynthesisUtterance(text);
        const settings = this.voiceSettings[language];
        
        utterance.rate = settings.rate;
        utterance.pitch = settings.pitch;
        utterance.volume = settings.volume;
        utterance.lang = settings.lang;
        
        this.synthesis.speak(utterance);
    }
}

// 使用例
const generator = new AudioGenerator();

// 個別音声プレビュー
// generator.previewAudio('ja', 'navigation-start');

// 全音声生成（注意：時間がかかります）
// generator.generateAllAudio();

// グローバル公開
window.AudioGenerator = AudioGenerator;
