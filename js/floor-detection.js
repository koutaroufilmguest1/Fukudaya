/**
 * フロア検出システム
 * 温泉旅館AR - 複数センサー統合による高精度フロア判定
 */

class FloorDetectionSystem {
    constructor() {
        this.currentFloor = 1;
        this.confidence = 0;
        this.detectionMethods = [];
        
        // センサーデータ
        this.sensorData = {
            barometric: { pressure: null, altitude: null, baseline: null },
            wifi: { networks: [], rssiMap: new Map() },
            accelerometer: { stepCount: 0, verticalMovement: 0 },
            qrCode: { lastFloor: null, timestamp: null },
            manual: { floor: null, timestamp: null }
        };
        
        // フロア判定設定
        this.settings = {
            pressurePerFloor: 1.2, // hPa per floor (3.5m/floor ÷ 8.5m/hPa)
            altitudePerFloor: 3.5, // meters per floor
            confidenceThreshold: 0.7, // 判定確度閾値
            qrCodeTrustDuration: 30000, // QRコード情報の信頼期間（30秒）
            manualOverrideDuration: 60000, // 手動設定の有効期間（60秒）
            wifiThreshold: -70 // WiFi信号強度閾値（dBm）
        };
        
        // フロア固有WiFiネットワーク定義
        this.floorWifiSignatures = {
            1: ['Ryokan_1F_Guest', 'Ryokan_1F_Staff', 'Lobby_WiFi'],
            2: ['Ryokan_2F_Guest', 'Ryokan_2F_Staff', 'Onsen_WiFi'],
            '-1': ['Ryokan_B1_Parking', 'Ryokan_B1_Staff']
        };
        
        this.callbacks = [];
        this.isInitialized = false;
    }
    
    /**
     * フロア検出システム初期化
     */
    async initialize() {
        console.log('フロア検出システム初期化開始');
        
        try {
            // 各検出手法を初期化
            await this.initializeBarometricDetection();
            await this.initializeWiFiDetection();
            await this.initializeAccelerometerDetection();
            this.initializeQRCodeDetection();
            
            // ベースライン校正
            await this.performBaselineCalibration();
            
            // 定期検出開始
            this.startPeriodicDetection();
            
            this.isInitialized = true;
            console.log('フロア検出システム初期化完了');
            
        } catch (error) {
            console.error('フロア検出初期化エラー:', error);
            throw error;
        }
    }
    
    /**
     * 気圧センサー検出初期化
     */
    async initializeBarometricDetection() {
        console.log('気圧センサー検出初期化');
        
        // 標準気圧センサーは直接アクセス不可のため、
        // 位置情報の高度データを使用
        if (navigator.geolocation) {
            const watchId = navigator.geolocation.watchPosition(
                (position) => {
                    if (position.coords.altitude !== null) {
                        this.updateAltitudeData(position.coords.altitude, position.coords.altitudeAccuracy);
                    }
                },
                (error) => {
                    console.warn('高度データ取得エラー:', error);
                },
                {
                    enableHighAccuracy: true,
                    maximumAge: 5000,
                    timeout: 10000
                }
            );
            
            this.altitudeWatchId = watchId;
        }
        
        // 代替：デバイスモーションによる垂直移動検出
        if (window.DeviceMotionEvent) {
            window.addEventListener('devicemotion', (event) => {
                if (event.accelerationIncludingGravity) {
                    this.processVerticalAcceleration(event.accelerationIncludingGravity);
                }
            });
        }
        
        this.detectionMethods.push('barometric');
    }
    
    /**
     * WiFi RSSI検出初期化
     */
    async initializeWiFiDetection() {
        console.log('WiFi検出初期化');
        
        // ブラウザではWiFiネットワーク一覧の直接取得は不可
        // 代替として接続情報とネットワーク品質を監視
        if ('connection' in navigator) {
            const connection = navigator.connection;
            
            const updateConnection = () => {
                this.updateWiFiData({
                    type: connection.effectiveType,
                    downlink: connection.downlink,
                    rtt: connection.rtt,
                    saveData: connection.saveData
                });
            };
            
            connection.addEventListener('change', updateConnection);
            updateConnection();
        }
        
        // Service Worker経由でのネットワーク情報収集
        this.initializeNetworkMonitoring();
        
        this.detectionMethods.push('wifi');
    }
    
    /**
     * 加速度センサー検出初期化
     */
    async initializeAccelerometerDetection() {
        console.log('加速度センサー検出初期化');
        
        let lastVerticalVelocity = 0;
        let verticalPosition = 0;
        
        window.addEventListener('devicemotion', (event) => {
            if (event.accelerationIncludingGravity) {
                const { x, y, z } = event.accelerationIncludingGravity;
                
                // 垂直方向の加速度（重力補正）
                const verticalAccel = z - 9.81;
                
                // 速度と位置の積分計算
                lastVerticalVelocity += verticalAccel * 0.1; // 100ms間隔想定
                verticalPosition += lastVerticalVelocity * 0.1;
                
                // 垂直移動検出
                if (Math.abs(verticalPosition) > this.settings.altitudePerFloor) {
                    const floorChange = Math.round(verticalPosition / this.settings.altitudePerFloor);
                    this.detectFloorChangeFromMovement(floorChange);
                    
                    // リセット
                    verticalPosition = 0;
                    lastVerticalVelocity *= 0.8; // 減衰
                }
                
                this.sensorData.accelerometer.verticalMovement = verticalPosition;
            }
        });
        
        this.detectionMethods.push('accelerometer');
    }
    
    /**
     * QRコード検出初期化
     */
    initializeQRCodeDetection() {
        console.log('QRコード検出初期化');
        
        // QRコード読み取りイベントリスナー
        document.addEventListener('qrCodeScanned', (event) => {
            const qrData = event.detail;
            this.processQRCodeData(qrData);
        });
        
        this.detectionMethods.push('qrcode');
    }
    
    /**
     * ネットワーク監視初期化
     */
    async initializeNetworkMonitoring() {
        // Service Workerでのネットワーク監視（簡易実装）
        if ('serviceWorker' in navigator) {
            try {
                const registration = await navigator.serviceWorker.register('/network-monitor-sw.js');
                
                // Service Workerからのメッセージ受信
                navigator.serviceWorker.addEventListener('message', (event) => {
                    if (event.data.type === 'network-info') {
                        this.processNetworkInfo(event.data);
                    }
                });
                
            } catch (error) {
                console.warn('Service Worker登録失敗:', error);
            }
        }
    }
    
    /**
     * ベースライン校正
     */
    async performBaselineCalibration() {
        console.log('ベースライン校正開始');
        
        // 現在位置を1階として設定
        this.currentFloor = 1;
        
        // 10秒間のデータ収集
        const calibrationData = await this.collectCalibrationData(10000);
        
        // ベースライン設定
        if (calibrationData.altitude) {
            this.sensorData.barometric.baseline = calibrationData.altitude;
        }
        
        if (calibrationData.wifi) {
            this.updateWiFiBaseline(calibrationData.wifi);
        }
        
        console.log('ベースライン校正完了:', this.sensorData.barometric.baseline);
    }
    
    /**
     * 校正データ収集
     */
    async collectCalibrationData(duration) {
        return new Promise((resolve) => {
            const data = { altitude: [], wifi: [] };
            const startTime = Date.now();
            
            const collect = () => {
                // 高度データ収集
                navigator.geolocation.getCurrentPosition(
                    (position) => {
                        if (position.coords.altitude !== null) {
                            data.altitude.push(position.coords.altitude);
                        }
                    },
                    null,
                    { enableHighAccuracy: true }
                );
                
                // WiFiデータ収集
                if (navigator.connection) {
                    data.wifi.push({
                        downlink: navigator.connection.downlink,
                        rtt: navigator.connection.rtt,
                        timestamp: Date.now()
                    });
                }
                
                if (Date.now() - startTime < duration) {
                    setTimeout(collect, 1000);
                } else {
                    // 平均値計算
                    const result = {};
                    
                    if (data.altitude.length > 0) {
                        result.altitude = data.altitude.reduce((a, b) => a + b) / data.altitude.length;
                    }
                    
                    if (data.wifi.length > 0) {
                        result.wifi = data.wifi;
                    }
                    
                    resolve(result);
                }
            };
            
            collect();
        });
    }
    
    /**
     * 定期検出開始
     */
    startPeriodicDetection() {
        // 1秒ごとにフロア判定実行
        setInterval(() => {
            this.performFloorDetection();
        }, 1000);
        
        console.log('定期フロア検出開始');
    }
    
    /**
     * 高度データ更新
     */
    updateAltitudeData(altitude, accuracy) {
        this.sensorData.barometric.altitude = altitude;
        
        if (this.sensorData.barometric.baseline) {
            const heightDiff = altitude - this.sensorData.barometric.baseline;
            const estimatedFloor = Math.round(heightDiff / this.settings.altitudePerFloor) + 1;
            
            this.updateFloorEstimate('barometric', estimatedFloor, this.calculateAltitudeConfidence(accuracy));
        }
    }
    
    /**
     * 垂直加速度処理
     */
    processVerticalAcceleration(acceleration) {
        // 垂直方向の動きを検出してフロア変更を推定
        const verticalG = Math.abs(acceleration.z) - 9.81;
        
        if (Math.abs(verticalG) > 2) { // 閾値以上の垂直加速度
            this.sensorData.accelerometer.verticalMovement += verticalG * 0.1;
        }
    }
    
    /**
     * 移動によるフロア変更検出
     */
    detectFloorChangeFromMovement(floorChange) {
        const newFloor = this.currentFloor + floorChange;
        
        if (newFloor >= -1 && newFloor <= 3) { // 有効範囲チェック
            this.updateFloorEstimate('accelerometer', newFloor, 0.6);
            console.log('移動によるフロア変更検出:', this.currentFloor, '->', newFloor);
        }
    }
    
    /**
     * WiFiデータ更新
     */
    updateWiFiData(connectionData) {
        // 接続品質からフロア推定
        const estimatedFloor = this.estimateFloorFromWiFi(connectionData);
        
        if (estimatedFloor) {
            this.updateFloorEstimate('wifi', estimatedFloor, 0.5);
        }
    }
    
    /**
     * WiFiからのフロア推定
     */
    estimateFloorFromWiFi(connectionData) {
        // 接続品質パターンからフロア推定（簡易実装）
        const { downlink, rtt } = connectionData;
        
        if (downlink > 10 && rtt < 50) {
            return 1; // 1階（ロビー周辺の良好な接続）
        } else if (downlink > 5 && rtt < 100) {
            return 2; // 2階（中程度の接続）
        } else if (downlink < 3 || rtt > 150) {
            return -1; // 地下（接続不良）
        }
        
        return null;
    }
    
    /**
     * QRコードデータ処理
     */
    processQRCodeData(qrData) {
        // QRコードからフロア情報抽出
        const floorMatch = qrData.match(/floor[:\-_](\d+|B\d+)/i);
        
        if (floorMatch) {
            let floor = floorMatch[1];
            
            // B1形式の処理
            if (floor.startsWith('B')) {
                floor = -parseInt(floor.substring(1));
            } else {
                floor = parseInt(floor);
            }
            
            this.sensorData.qrCode.lastFloor = floor;
            this.sensorData.qrCode.timestamp = Date.now();
            
            // 高信頼度でフロア設定
            this.updateFloorEstimate('qrcode', floor, 0.95);
            
            console.log('QRコードからフロア検出:', floor);
        }
    }
    
    /**
     * フロア推定値更新
     */
    updateFloorEstimate(method, floor, confidence) {
        const estimate = {
            method,
            floor,
            confidence,
            timestamp: Date.now()
        };
        
        // 推定値を記録
        if (!this.floorEstimates) {
            this.floorEstimates = [];
        }
        
        this.floorEstimates.push(estimate);
        
        // 古い推定値を削除（10秒以上前）
        const cutoff = Date.now() - 10000;
        this.floorEstimates = this.floorEstimates.filter(e => e.timestamp > cutoff);
    }
    
    /**
     * フロア検出実行
     */
    performFloorDetection() {
        if (!this.floorEstimates || this.floorEstimates.length === 0) {
            return;
        }
        
        // 手動設定チェック
        if (this.sensorData.manual.floor !== null) {
            const manualAge = Date.now() - this.sensorData.manual.timestamp;
            if (manualAge < this.settings.manualOverrideDuration) {
                this.setCurrentFloor(this.sensorData.manual.floor, 1.0, 'manual');
                return;
            }
        }
        
        // QRコード情報チェック
        if (this.sensorData.qrCode.lastFloor !== null) {
            const qrAge = Date.now() - this.sensorData.qrCode.timestamp;
            if (qrAge < this.settings.qrCodeTrustDuration) {
                this.setCurrentFloor(this.sensorData.qrCode.lastFloor, 0.95, 'qrcode');
                return;
            }
        }
        
        // 重み付き平均による総合判定
        const floorScores = this.calculateFloorScores();
        const bestFloor = this.selectBestFloor(floorScores);
        
        if (bestFloor && bestFloor.confidence > this.settings.confidenceThreshold) {
            this.setCurrentFloor(bestFloor.floor,bestFloor.confidence, 'composite');
        }
    }
    
    /**
     * フロアスコア計算
     */
    calculateFloorScores() {
        const scores = new Map();
        const methodWeights = {
            'barometric': 0.4,
            'wifi': 0.3,
            'accelerometer': 0.2,
            'qrcode': 0.9,
            'manual': 1.0
        };
        
        for (const estimate of this.floorEstimates) {
            const floor = estimate.floor;
            const weight = methodWeights[estimate.method] || 0.1;
            const score = estimate.confidence * weight;
            
            if (scores.has(floor)) {
                scores.set(floor, scores.get(floor) + score);
            } else {
                scores.set(floor, score);
            }
        }
        
        return scores;
    }
    
    /**
     * 最適フロア選択
     */
    selectBestFloor(scores) {
        let bestFloor = null;
        let bestScore = 0;
        
        for (const [floor, score] of scores.entries()) {
            if (score > bestScore) {
                bestScore = score;
                bestFloor = floor;
            }
        }
        
        return bestFloor ? {
            floor: bestFloor,
            confidence: Math.min(bestScore, 1.0)
        } : null;
    }
    
    /**
     * 現在フロア設定
     */
    setCurrentFloor(floor, confidence, method) {
        const oldFloor = this.currentFloor;
        
        if (oldFloor !== floor) {
            this.currentFloor = floor;
            this.confidence = confidence;
            
            console.log(`フロア変更検出: ${oldFloor} -> ${floor} (確度: ${(confidence*100).toFixed(1)}%, 方法: ${method})`);
            
            // フロア変更コールバック
            this.triggerCallback('floorChanged', {
                oldFloor,
                newFloor: floor,
                confidence,
                method,
                timestamp: Date.now()
            });
        } else {
            // 同じフロアでも確度を更新
            this.confidence = Math.max(this.confidence, confidence);
        }
    }
    
    /**
     * 手動フロア設定
     */
    setManualFloor(floor) {
        this.sensorData.manual.floor = floor;
        this.sensorData.manual.timestamp = Date.now();
        
        console.log('手動フロア設定:', floor);
        this.setCurrentFloor(floor, 1.0, 'manual');
    }
    
    /**
     * 高度信頼度計算
     */
    calculateAltitudeConfidence(accuracy) {
        if (!accuracy) return 0.5;
        
        // 精度が良いほど信頼度が高い
        if (accuracy < 5) return 0.8;
        if (accuracy < 10) return 0.6;
        if (accuracy < 20) return 0.4;
        return 0.2;
    }
    
    /**
     * WiFiベースライン更新
     */
    updateWiFiBaseline(wifiData) {
        // WiFi品質のベースライン設定
        this.sensorData.wifi.baseline = {
            downlink: wifiData.reduce((sum, d) => sum + d.downlink, 0) / wifiData.length,
            rtt: wifiData.reduce((sum, d) => sum + d.rtt, 0) / wifiData.length
        };
    }
    
    /**
     * 現在フロア取得
     */
    getCurrentFloor() {
        return {
            floor: this.currentFloor,
            confidence: this.confidence,
            timestamp: Date.now()
        };
    }
    
    /**
     * フロア名取得
     */
    getFloorName(floor = this.currentFloor) {
        const names = {
            '-1': '地下1階',
            '1': '1階',
            '2': '2階',
            '3': '3階'
        };
        return names[floor.toString()] || `${floor}階`;
    }
    
    /**
     * 検出方法一覧取得
     */
    getDetectionMethods() {
        return [...this.detectionMethods];
    }
    
    /**
     * センサー状態取得
     */
    getSensorStatus() {
        return {
            barometric: {
                available: this.sensorData.barometric.altitude !== null,
                baseline: this.sensorData.barometric.baseline,
                current: this.sensorData.barometric.altitude
            },
            wifi: {
                available: navigator.connection !== undefined,
                quality: navigator.connection ? {
                    downlink: navigator.connection.downlink,
                    rtt: navigator.connection.rtt
                } : null
            },
            accelerometer: {
                available: true,
                verticalMovement: this.sensorData.accelerometer.verticalMovement
            },
            qrcode: {
                lastFloor: this.sensorData.qrCode.lastFloor,
                timestamp: this.sensorData.qrCode.timestamp
            }
        };
    }
    
    /**
     * コールバック登録
     */
    onFloorEvent(eventType, callback) {
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
     * デバッグ情報取得
     */
    getDebugInfo() {
        return {
            currentFloor: this.currentFloor,
            confidence: this.confidence,
            detectionMethods: this.detectionMethods,
            sensorData: this.sensorData,
            estimatesCount: this.floorEstimates ? this.floorEstimates.length : 0,
            isInitialized: this.isInitialized
        };
    }
    
    /**
     * リセット
     */
    reset() {
        this.currentFloor = 1;
        this.confidence = 0;
        this.floorEstimates = [];
        this.sensorData.manual.floor = null;
        this.sensorData.qrCode.lastFloor = null;
        
        console.log('フロア検出システムリセット');
    }
}

// グローバル公開
window.FloorDetectionSystem = FloorDetectionSystem;
