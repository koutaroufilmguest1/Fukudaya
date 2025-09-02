/**
 * センサー管理システム
 * 温泉旅館AR - 各種デバイスセンサーの統合管理
 */

class SensorManager {
    constructor() {
        this.sensors = {
            accelerometer: null,
            gyroscope: null,
            magnetometer: null,
            barometer: null,
            wifi: null
        };
        
        this.currentPosition = {
            x: 0,
            y: 0,
            z: 0,
            floor: 1,
            accuracy: 0,
            timestamp: Date.now()
        };
        
        this.callbacks = [];
        this.isInitialized = false;
        this.calibrationData = {};
    }
    
    /**
     * センサーシステム初期化
     */
    async initialize() {
        console.log('センサーマネージャー初期化開始');
        
        try {
            // 権限要求
            await this.requestPermissions();
            
            // 各センサー初期化
            await this.initializeAccelerometer();
            await this.initializeGyroscope();
            await this.initializeMagnetometer();
            await this.initializeBarometer();
            await this.initializeWiFiRSSI();
            
            // キャリブレーション
            await this.performCalibration();
            
            this.isInitialized = true;
            console.log('センサーマネージャー初期化完了');
            
        } catch (error) {
            console.error('センサー初期化エラー:', error);
            throw error;
        }
    }
    
    /**
     * 必要な権限の要求
     */
    async requestPermissions() {
        // DeviceMotionEvent権限
        if (typeof DeviceMotionEvent.requestPermission === 'function') {
            const permission = await DeviceMotionEvent.requestPermission();
            if (permission !== 'granted') {
                throw new Error('DeviceMotion権限が必要です');
            }
        }
        
        // DeviceOrientationEvent権限
        if (typeof DeviceOrientationEvent.requestPermission === 'function') {
            const permission = await DeviceOrientationEvent.requestPermission();
            if (permission !== 'granted') {
                throw new Error('DeviceOrientation権限が必要です');
            }
        }
    }
    
    /**
     * 加速度センサー初期化
     */
    async initializeAccelerometer() {
        return new Promise((resolve) => {
            let stepCount = 0;
            let lastStep = 0;
            let stepThreshold = 12; // 歩数検出閾値
            
            window.addEventListener('devicemotion', (event) => {
                if (!event.accelerationIncludingGravity) return;
                
                const { x, y, z } = event.accelerationIncludingGravity;
                const acceleration = Math.sqrt(x*x + y*y + z*z);
                
                // 歩数カウント
                if (acceleration > stepThreshold && Date.now() - lastStep > 500) {
                    stepCount++;
                    lastStep = Date.now();
                    this.onStepDetected(stepCount);
                }
                
                // 位置推定更新
                this.updatePositionFromAcceleration({ x, y, z });
            });
            
            this.sensors.accelerometer = { stepCount, lastStep };
            resolve();
        });
    }
    
    /**
     * ジャイロスコープ初期化
     */
    async initializeGyroscope() {
        return new Promise((resolve) => {
            window.addEventListener('deviceorientation', (event) => {
                const orientation = {
                    alpha: event.alpha, // Z軸回転（方位）
                    beta: event.beta,   // X軸回転（前後傾斜）
                    gamma: event.gamma  // Y軸回転（左右傾斜）
                };
                
                this.updateOrientationData(orientation);
            });
            
            resolve();
        });
    }
    
    /**
     * 地磁気センサー初期化
     */
    async initializeMagnetometer() {
        return new Promise((resolve) => {
            // 絶対方位での方向検出
            window.addEventListener('deviceorientationabsolute', (event) => {
                if (event.absolute) {
                    const trueHeading = event.alpha;
                    this.updateMagneticHeading(trueHeading);
                }
            });
            
            resolve();
        });
    }
    
    /**
     * 気圧センサー初期化（フロア判定用）
     */
    async initializeBarometer() {
        return new Promise((resolve) => {
            // 気圧センサーが利用可能な場合
            if ('AmbientLightSensor' in window) {
                // 代替として環境光センサーを使用
                try {
                    const sensor = new AmbientLightSensor();
                    sensor.addEventListener('reading', () => {
                        // 簡易フロア判定（光量ベース）
                        this.estimateFloorFromLight(sensor.illuminance);
                    });
                    sensor.start();
                } catch (error) {
                    console.log('環境光センサー利用不可');
                }
            }
            
            // 標高ベースのフロア推定
            navigator.geolocation.watchPosition(
                (position) => {
                    if (position.coords.altitude) {
                        this.estimateFloorFromAltitude(position.coords.altitude);
                    }
                },
                null,
                { enableHighAccuracy: true }
            );
            
            resolve();
        });
    }
    
    /**
     * WiFi RSSI測位初期化
     */
    async initializeWiFiRSSI() {
        return new Promise((resolve) => {
            // WiFi接続情報の監視
            if ('connection' in navigator) {
                const connection = navigator.connection;
                
                const updateConnection = () => {
                    const wifiData = {
                        type: connection.effectiveType,
                        downlink: connection.downlink,
                        rtt: connection.rtt
                    };
                    
                    this.updateWiFiPosition(wifiData);
                };
                
                connection.addEventListener('change', updateConnection);
                updateConnection();
            }
            
            resolve();
        });
    }
    
    /**
     * キャリブレーション実行
     */
    async performCalibration() {
        console.log('センサーキャリブレーション開始');
        
        // 1秒間のデータ収集でキャリブレーション
        return new Promise((resolve) => {
            const calibrationData = [];
            const startTime = Date.now();
            
            const collectData = () => {
                if (Date.now() - startTime < 1000) {
                    calibrationData.push({
                        timestamp: Date.now(),
                        position: { ...this.currentPosition }
                    });
                    requestAnimationFrame(collectData);
                } else {
                    this.processCalibrationData(calibrationData);
                    resolve();
                }
            };
            
            collectData();
        });
    }
    
    /**
     * キャリブレーションデータ処理
     */
    processCalibrationData(data) {
        // 基準点設定
        this.calibrationData = {
            basePosition: data[0].position,
            drift: this.calculateDrift(data),
            timestamp: Date.now()
        };
        
        console.log('キャリブレーション完了:', this.calibrationData);
    }
    
    /**
     * ドリフト計算
     */
    calculateDrift(data) {
        const first = data[0].position;
        const last = data[data.length - 1].position;
        
        return {
            x: last.x - first.x,
            y: last.y - first.y,
            z: last.z - first.z
        };
    }
    
    /**
     * 歩数検出時の処理
     */
    onStepDetected(stepCount) {
        console.log('歩数検出:', stepCount);
        
        // 歩幅から移動距離を推定（平均歩幅: 0.7m）
        const distance = stepCount * 0.7;
        
        // 方向と組み合わせて位置更新
        this.updatePositionFromSteps(distance);
        
        // コールバック実行
        this.callbacks.forEach(callback => {
            if (callback.type === 'step') {
                callback.handler({ stepCount, distance });
            }
        });
    }
    
    /**
     * 加速度からの位置更新
     */
    updatePositionFromAcceleration(acceleration) {
        // 重力除去と位置積分（簡略化）
        const deltaTime = 0.1; // 100ms想定
        
        this.currentPosition.x += acceleration.x * deltaTime * deltaTime;
        this.currentPosition.y += acceleration.y * deltaTime * deltaTime;
        this.currentPosition.z += acceleration.z * deltaTime * deltaTime;
        
        this.currentPosition.timestamp = Date.now();
    }
    
    /**
     * 歩数からの位置更新
     */
    updatePositionFromSteps(distance) {
        // 現在の方向を取得
        const heading = this.getCurrentHeading();
        
        // 移動量を計算
        const deltaX = distance * Math.sin(heading * Math.PI / 180);
        const deltaY = distance * Math.cos(heading * Math.PI / 180);
        
        this.currentPosition.x += deltaX;
        this.currentPosition.y += deltaY;
        this.currentPosition.timestamp = Date.now();
    }
    
    /**
     * 方位データ更新
     */
    updateOrientationData(orientation) {
        this.currentOrientation = orientation;
        
        // コールバック実行
        this.callbacks.forEach(callback => {
            if (callback.type === 'orientation') {
                callback.handler(orientation);
            }
        });
    }
    
    /**
     * 地磁気方位更新
     */
    updateMagneticHeading(heading) {
        this.magneticHeading = heading;
        
        // コールバック実行
        this.callbacks.forEach(callback => {
            if (callback.type === 'heading') {
                callback.handler(heading);
            }
        });
    }
    
    /**
     * 光量ベースフロア推定
     */
    estimateFloorFromLight(illuminance) {
        // 光量からフロアを推定（簡略化）
        let estimatedFloor = 1;
        
        if (illuminance < 100) estimatedFloor = -1; // 地下
        else if (illuminance < 300) estimatedFloor = 1;
        else if (illuminance < 500) estimatedFloor = 2;
        else estimatedFloor = 3;
        
        this.updateFloor(estimatedFloor);
    }
    
    /**
     * 標高ベースフロア推定
     */
    estimateFloorFromAltitude(altitude) {
        if (!this.baseAltitude) {
            this.baseAltitude = altitude;
            return;
        }
        
        const heightDiff = altitude - this.baseAltitude;
        const estimatedFloor = Math.round(heightDiff / 3.5) + 1; // 3.5m/フロア想定
        
        this.updateFloor(estimatedFloor);
    }
    
    /**
     * WiFi位置推定
     */
    updateWiFiPosition(wifiData) {
        // WiFi信号強度から位置を推定（簡略化）
        const rssi = -50 - Math.random() * 40; // デモ用
        const estimatedDistance = Math.pow(10, (27.55 - 20 * Math.log10(2400) + Math.abs(rssi)) / 20);
        
        this.currentPosition.accuracy = estimatedDistance;
    }
    
    /**
     * フロア更新
     */
    updateFloor(floor) {
        if (this.currentPosition.floor !== floor) {
            console.log('フロア変更検出:', this.currentPosition.floor, '->', floor);
            this.currentPosition.floor = floor;
            
            // フロア変更コールバック
            this.callbacks.forEach(callback => {
                if (callback.type === 'floor') {
                    callback.handler(floor);
                }
            });
        }
    }
    
    /**
     * 現在の方位取得
     */
    getCurrentHeading() {
        if (this.magneticHeading !== undefined) {
            return this.magneticHeading;
        }
        
        if (this.currentOrientation) {
            return this.currentOrientation.alpha || 0;
        }
        
        return 0;
    }
    
    /**
     * 現在位置取得
     */
    getCurrentPosition() {
        return { ...this.currentPosition };
    }
    
    /**
     * 位置精度取得
     */
    getPositionAccuracy() {
        const age = Date.now() - this.currentPosition.timestamp;
        const baseAccuracy = this.currentPosition.accuracy || 5;
        
        // 時間経過による精度劣化
        const timeDegradation = Math.min(age / 1000, 10);
        
        return {
            horizontal: baseAccuracy + timeDegradation,
            vertical: (baseAccuracy + timeDegradation) * 0.5,
            floor: 0.9 // 90%の確度
        };
    }
    
    /**
     * コールバック登録
     */
    onSensorUpdate(type, handler) {
        this.callbacks.push({ type, handler });
    }
    
    /**
     * コールバック削除
     */
    removeSensorUpdate(type, handler) {
        this.callbacks = this.callbacks.filter(
            cb => !(cb.type === type && cb.handler === handler)
        );
    }
    
    /**
     * 手動位置設定（QRコード読取時など）
     */
    setPosition(x, y, z, floor) {
        this.currentPosition = {
            x, y, z, floor,
            accuracy: 1, // 高精度
            timestamp: Date.now()
        };
        
        console.log('手動位置設定:', this.currentPosition);
        
        // 位置更新コールバック
        this.callbacks.forEach(callback => {
            if (callback.type === 'position') {
                callback.handler(this.currentPosition);
            }
        });
    }
    
    /**
     * センサーリセット
     */
    reset() {
        this.currentPosition = {
            x: 0, y: 0, z: 0, floor: 1,
            accuracy: 0, timestamp: Date.now()
        };
        
        this.calibrationData = {};
        console.log('センサーリセット完了');
    }
    
    /**
     * デバッグ情報取得
     */
    getDebugInfo() {
        return {
            position: this.currentPosition,
            orientation: this.currentOrientation,
            heading: this.getCurrentHeading(),
            accuracy: this.getPositionAccuracy(),
            sensors: Object.keys(this.sensors).map(key => ({
                name: key,
                available: this.sensors[key] !== null
            }))
        };
    }
}

// グローバル公開
window.SensorManager = SensorManager;
