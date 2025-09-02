/**
 * 3Dモデル生成・管理システム
 * A-Frame用の軽量3Dモデル
 */

class AR3DModels {
    constructor() {
        this.models = new Map();
        this.textures = new Map();
    }
    
    /**
     * 基本3Dモデル定義
     */
    generateBasicModels() {
        // 球体マーカー（目的地用）
        const sphereModel = {
            geometry: 'sphere',
            material: {
                color: '#FF6B6B',
                metalness: 0.1,
                roughness: 0.5,
                transparent: true,
                opacity: 0.8
            },
            animation: {
                property: 'rotation',
                to: '0 360 0',
                loop: true,
                dur: 4000
            },
            scale: '0.5 0.5 0.5'
        };
        
        // 円柱マーカー（中間地点用）
        const cylinderModel = {
            geometry: {
                primitive: 'cylinder',
                height: 2,
                radius: 0.3
            },
            material: {
                color: '#4CAF50',
                metalness: 0.2,
                roughness: 0.3
            },
            animation: {
                property: 'position',
                to: '0 1 0',
                direction: 'alternate',
                loop: true,
                dur: 2000
            }
        };
        
        // 矢印モデル（方向指示用）
        const arrowModel = {
            geometry: {
                primitive: 'cone',
                height: 1,
                radiusBottom: 0.3,
                radiusTop: 0
            },
            material: {
                color: '#2196F3',
                metalness: 0.1,
                roughness: 0.4
            },
            rotation: '0 0 0',
            scale: '1 2 1'
        };
        
        // テキストプレーン（施設名表示用）
        const textPlane = {
            geometry: {
                primitive: 'plane',
                width: 3,
                height: 1
            },
            material: {
                color: '#FFFFFF',
                transparent: true,
                opacity: 0.9
            },
            text: {
                value: '目的地',
                align: 'center',
                color: '#000000',
                font: 'roboto',
                width: 6
            }
        };
        
        this.models.set('sphere', sphereModel);
        this.models.set('cylinder', cylinderModel);
        this.models.set('arrow', arrowModel);
        this.models.set('textPlane', textPlane);
        
        return this.models;
    }
    
    /**
     * AR要素生成
     */
    createARElement(type, options = {}) {
        const baseModel = this.models.get(type);
        if (!baseModel) {
            console.warn(`不明な3Dモデルタイプ: ${type}`);
            return null;
        }
        
        // A-Frame要素作成
        const element = document.createElement('a-entity');
        
        // ジオメトリ設定
        if (typeof baseModel.geometry === 'string') {
            element.setAttribute('geometry', `primitive: ${baseModel.geometry}`);
        } else {
            const geoAttr = Object.entries(baseModel.geometry)
                .map(([key, value]) => `${key}: ${value}`)
                .join('; ');
            element.setAttribute('geometry', geoAttr);
        }
        
        // マテリアル設定
        const matAttr = Object.entries(baseModel.material)
            .map(([key, value]) => `${key}: ${value}`)
            .join('; ');
        element.setAttribute('material', matAttr);
        
        // アニメーション設定
        if (baseModel.animation) {
            const animAttr = Object.entries(baseModel.animation)
                .map(([key, value]) => `${key}: ${value}`)
                .join('; ');
            element.setAttribute('animation', animAttr);
        }
        
        // その他の属性
        if (baseModel.scale) {
            element.setAttribute('scale', baseModel.scale);
        }
        if (baseModel.rotation) {
            element.setAttribute('rotation', baseModel.rotation);
        }
        
        // オプション適用
        if (options.position) {
            element.setAttribute('position', options.position);
        }
        if (options.text && baseModel.text) {
            const textAttr = { ...baseModel.text, ...options.text };
            const textAttrStr = Object.entries(textAttr)
                .map(([key, value]) => `${key}: ${value}`)
                .join('; ');
            element.setAttribute('text', textAttrStr);
        }
        if (options.color) {
            element.setAttribute('material', `color: ${options.color}`);
        }
        
        return element;
    }
    
    /**
     * 目的地マーカー作成
     */
    createDestinationMarker(destination, position) {
        const marker = this.createARElement('sphere', {
            position: `${position.x} ${position.y + 2} ${position.z}`,
            color: this.getDestinationColor(destination)
        });
        
        // テキストラベル追加
        const label = this.createARElement('textPlane', {
            position: `${position.x} ${position.y + 3} ${position.z}`,
            text: {
                value: this.getDestinationName(destination)
            }
        });
        
        // グループ化
        const group = document.createElement('a-entity');
        group.appendChild(marker);
        group.appendChild(label);
        
        return group;
    }
    
    /**
     * 方向矢印作成
     */
    createDirectionArrow(direction, distance) {
        const arrow = this.createARElement('arrow', {
            position: `0 1.5 -${Math.min(distance, 5)}`,
            color: '#2196F3'
        });
        
        // 方向に応じて回転
        const rotation = this.calculateArrowRotation(direction);
        arrow.setAttribute('rotation', rotation);
        
        return arrow;
    }
    
    /**
     * 経路表示作成
     */
    createRoutePath(waypoints) {
        const path = document.createElement('a-entity');
        
        for (let i = 0; i < waypoints.length - 1; i++) {
            const start = waypoints[i];
            const end = waypoints[i + 1];
            
            // ウェイポイント間のライン
            const line = document.createElement('a-entity');
            line.setAttribute('line', {
                start: `${start.x} ${start.y + 0.1} ${start.z}`,
                end: `${end.x} ${end.y + 0.1} ${end.z}`,
                color: '#4CAF50',
                opacity: 0.7
            });
            
            path.appendChild(line);
            
            // 中間マーカー
            if (i < waypoints.length - 2) {
                const waypoint = this.createARElement('cylinder', {
                    position: `${end.x} ${end.y} ${end.z}`,
                    color: '#4CAF50'
                });
                path.appendChild(waypoint);
            }
        }
        
        return path;
    }
    
    /**
     * 目的地の色取得
     */
    getDestinationColor(destination) {
        const colors = {
            'reception': '#FF9800',
            'onsen': '#FF5722',
            'restaurant': '#4CAF50',
            'toilet': '#2196F3',
            'elevator': '#9C27B0',
            'shop': '#E91E63',
            'parking': '#607D8B',
            'lounge': '#795548'
        };
        return colors[destination] || '#FF6B6B';
    }
    
    /**
     * 目的地名取得
     */
    getDestinationName(destination) {
        const names = {
            'reception': 'フロント',
            'onsen': '大浴場',
            'restaurant': 'レストラン',
            'toilet': 'お手洗い',
            'elevator': 'エレベーター',
            'shop': '売店',
            'parking': '駐車場',
            'lounge': 'ラウンジ'
        };
        return names[destination] || '目的地';
    }
    
    /**
     * 矢印回転角度計算
     */
    calculateArrowRotation(direction) {
        // 方向角度をA-Frameの回転に変換
        const yRotation = -direction + 90; // North = 0° をY軸回転に変換
        return `0 ${yRotation} 0`;
    }
    
    /**
     * 全モデル初期化
     */
    initialize() {
        console.log('3Dモデルシステム初期化開始');
        this.generateBasicModels();
        console.log('3Dモデル生成完了:', this.models.size, '種類');
    }
    
    /**
     * デバッグ情報
     */
    getDebugInfo() {
        return {
            modelsCount: this.models.size,
            availableModels: Array.from(this.models.keys()),
            texturesCount: this.textures.size
        };
    }
}

// グローバル公開
window.AR3DModels = AR3DModels;
