/**
 * ナビゲーションシステム
 * 温泉旅館AR - 位置ベースナビゲーションと経路案内
 */

class NavigationSystem {
    constructor() {
        this.destinations = new Map();
        this.currentRoute = null;
        this.isNavigating = false;
        this.routeUpdateInterval = null;
        
        // 館内レイアウト定義
        this.floorPlans = new Map();
        this.waypoints = new Map();
        this.obstacles = [];
        
        // ナビゲーション設定
        this.settings = {
            routeRecalculationDistance: 5, // 5m以上逸れたら再計算
            arrivalDistance: 2, // 到着判定距離
            waypointDistance: 3, // ウェイポイント通過判定距離
            walkingSpeed: 60, // 1分60m
            maxDetourDistance: 10 // 最大迂回距離
        };
        
        this.callbacks = [];
    }
    
    /**
     * ナビゲーションシステム初期化
     */
    async initialize() {
        console.log('ナビゲーションシステム初期化開始');
        
        try {
            // 館内データ読み込み
            await this.loadLocationData();
            await this.loadFloorPlans();
            
            // 経路探索アルゴリズム準備
            this.initializePathfinding();
            
            console.log('ナビゲーションシステム初期化完了');
            
        } catch (error) {
            console.error('ナビゲーション初期化エラー:', error);
            throw error;
        }
    }
    
    /**
     * 館内位置データ読み込み
     */
    async loadLocationData() {
        // 温泉旅館の典型的なレイアウト
        const locations = {
            // 1階
            'entrance': { x: 0, y: 0, z: 0, floor: 1, name: 'エントランス' },
            'reception': { x: 10, y: 5, z: 0, floor: 1, name: 'フロント・受付' },
            'lounge': { x: 15, y: 10, z: 0, floor: 1, name: 'ラウンジ' },
            'restaurant': { x: 25, y: 8, z: 0, floor: 1, name: 'レストラン' },
            'shop': { x: 8, y: 15, z: 0, floor: 1, name: '売店' },
            'elevator_1f': { x: 20, y: 2, z: 0, floor: 1, name: 'エレベーター' },
            'stairs_1f': { x: 22, y: 2, z: 0, floor: 1, name: '階段' },
            'toilet_1f': { x: 12, y: 18, z: 0, floor: 1, name: 'お手洗い（1F）' },
            
            // 2階
            'elevator_2f': { x: 20, y: 2, z: 3.5, floor: 2, name: 'エレベーター' },
            'stairs_2f': { x: 22, y: 2, z: 3.5, floor: 2, name: '階段' },
            'onsen_entrance': { x: 30, y: 10, z: 3.5, floor: 2, name: '大浴場入口' },
            'onsen_men': { x: 35, y: 8, z: 3.5, floor: 2, name: '男湯' },
            'onsen_women': { x: 35, y: 12, z: 3.5, floor: 2, name: '女湯' },
            'toilet_2f': { x: 12, y: 18, z: 3.5, floor: 2, name: 'お手洗い（2F）' },
            'rest_area': { x: 18, y: 15, z: 3.5, floor: 2, name: '休憩所' },
            
            // 地下1階
            'parking_entrance': { x: 5, y: -10, z: -3, floor: -1, name: '駐車場入口' },
            'parking_area': { x: 0, y: -20, z: -3, floor: -1, name: '駐車場' },
            'storage': { x: -10, y: -5, z: -3, floor: -1, name: '倉庫' }
        };
        
        for (const [key, location] of Object.entries(locations)) {
            this.destinations.set(key, location);
        }
        
        console.log('位置データ読み込み完了:', this.destinations.size, '件');
    }
    
    /**
     * フロアプラン読み込み
     */
    async loadFloorPlans() {
        // 各フロアの構造定義
        const floorPlans = {
            1: {
                walls: [
                    { start: { x: -5, y: -2 }, end: { x: 40, y: -2 } }, // 南壁
                    { start: { x: -5, y: 20 }, end: { x: 40, y: 20 } }, // 北壁
                    { start: { x: -5, y: -2 }, end: { x: -5, y: 20 } }, // 西壁
                    { start: { x: 40, y: -2 }, end: { x: 40, y: 20 } }  // 東壁
                ],
                rooms: [
                    { id: 'reception_room', bounds: { x: 8, y: 3, w: 8, h: 4 } },
                    { id: 'restaurant_room', bounds: { x: 20, y: 5, w: 15, h: 8 } },
                    { id: 'lounge_room', bounds: { x: 12, y: 8, w: 8, h: 6 } }
                ],
                doors: [
                    { x: 0, y: 0 }, // エントランス
                    { x: 10, y: 3 }, // 受付入口
                    { x: 20, y: 5 }  // レストラン入口
                ]
            },
            2: {
                walls: [
                    { start: { x: -5, y: -2 }, end: { x: 45, y: -2 } },
                    { start: { x: -5, y: 20 }, end: { x: 45, y: 20 } },
                    { start: { x: -5, y: -2 }, end: { x: -5, y: 20 } },
                    { start: { x: 45, y: -2 }, end: { x: 45, y: 20 } }
                ],
                rooms: [
                    { id: 'onsen_men_room', bounds: { x: 32, y: 5, w: 8, h: 6 } },
                    { id: 'onsen_women_room', bounds: { x: 32, y: 11, w: 8, h: 6 } },
                    { id: 'rest_room', bounds: { x: 15, y: 12, w: 8, h: 6 } }
                ],
                doors: [
                    { x: 20, y: 2 }, // エレベーター
                    { x: 30, y: 10 }, // 大浴場入口
                    { x: 35, y: 8 },  // 男湯入口
                    { x: 35, y: 12 }  // 女湯入口
                ]
            },
            '-1': {
                walls: [
                    { start: { x: -20, y: -30 }, end: { x: 20, y: -30 } },
                    { start: { x: -20, y: 5 }, end: { x: 20, y: 5 } },
                    { start: { x: -20, y: -30 }, end: { x: -20, y: 5 } },
                    { start: { x: 20, y: -30 }, end: { x: 20, y: 5 } }
                ],
                rooms: [
                    { id: 'parking_space', bounds: { x: -15, y: -25, w: 30, h: 20 } }
                ],
                doors: [
                    { x: 5, y: -10 } // 駐車場入口
                ]
            }
        };
        
        for (const [floor, plan] of Object.entries(floorPlans)) {
            this.floorPlans.set(parseInt(floor), plan);
        }
        
        console.log('フロアプラン読み込み完了');
    }
    
    /**
     * 経路探索アルゴリズム初期化
     */
    initializePathfinding() {
        // A*アルゴリズム用のヒューリスティック関数
        this.heuristic = (a, b) => {
            const dx = a.x - b.x;
            const dy = a.y - b.y;
            const dz = a.z - b.z;
            return Math.sqrt(dx*dx + dy*dy + dz*dz);
        };
        
        // ウェイポイント生成
        this.generateWaypoints();
        
        console.log('経路探索準備完了');
    }
    
    /**
     * ウェイポイント自動生成
     */
    generateWaypoints() {
        const waypoints = [];
        
        // 各フロアの主要通路にウェイポイント配置
        for (const [floor, plan] of this.floorPlans.entries()) {
            // 廊下の中央にウェイポイント配置
            for (let x = 0; x <= 35; x += 5) {
                for (let y = 0; y <= 15; y += 5) {
                    if (this.isWalkable(x, y, floor)) {
                        waypoints.push({
                            id: `wp_${floor}_${x}_${y}`,
                            x, y, z: floor * 3.5, floor,
                            type: 'waypoint'
                        });
                    }
                }
            }
        }
        
        // 階段・エレベーター接続ポイント
        waypoints.push(
            { id: 'elevator_connect_1_2', x: 20, y: 2, z: 1.75, floor: 1.5, type: 'vertical' },
            { id: 'stairs_connect_1_2', x: 22, y: 2, z: 1.75, floor: 1.5, type: 'vertical' }
        );
        
        for (const waypoint of waypoints) {
            this.waypoints.set(waypoint.id, waypoint);
        }
        
        console.log('ウェイポイント生成完了:', waypoints.length, '個');
    }
    
    /**
     * 通行可能判定
     */
    isWalkable(x, y, floor) {
        const plan = this.floorPlans.get(floor);
        if (!plan) return false;
        
        // 壁との衝突判定
        for (const wall of plan.walls) {
            if (this.isPointOnWall(x, y, wall)) {
                return false;
            }
        }
        
        // 部屋内部判定
        for (const room of plan.rooms) {
            if (this.isPointInRoom(x, y, room.bounds)) {
                return false; // 部屋内は通行不可
            }
        }
        
        return true;
    }
    
    /**
     * 点が壁上にあるかチェック
     */
    isPointOnWall(x, y, wall) {
        const buffer = 0.5; // 壁の厚み
        
        // 線分上の点かチェック
        const A = wall.start;
        const B = wall.end;
        
        const crossProduct = (y - A.y) * (B.x - A.x) - (x - A.x) * (B.y - A.y);
        if (Math.abs(crossProduct) > buffer) return false;
        
        const dotProduct = (x - A.x) * (B.x - A.x) + (y - A.y) * (B.y - A.y);
        const lengthSquared = (B.x - A.x) * (B.x - A.x) + (B.y - A.y) * (B.y - A.y);
        
        return dotProduct >= 0 && dotProduct <= lengthSquared;
    }
    
    /**
     * 点が部屋内にあるかチェック
     */
    isPointInRoom(x, y, bounds) {
        return x >= bounds.x && x <= bounds.x + bounds.w &&
               y >= bounds.y && y <= bounds.y + bounds.h;
    }
    
    /**
     * 目的地への経路計算
     */
    calculateRoute(startPos, destinationId) {
        const destination = this.destinations.get(destinationId);
        if (!destination) {
            throw new Error(`目的地が見つかりません: ${destinationId}`);
        }
        
        console.log('経路計算開始:', startPos, '->', destination);
        
        // 同一フロアの場合
        if (startPos.floor === destination.floor) {
            return this.calculateSameFloorRoute(startPos, destination);
        }
        
        // 異なるフロアの場合
        return this.calculateMultiFloorRoute(startPos, destination);
    }
    
    /**
     * 同一フロア経路計算
     */
    calculateSameFloorRoute(start, end) {
        // 直線経路チェック
        if (this.isDirectPathClear(start, end)) {
            return {
                waypoints: [start, end],
                distance: this.heuristic(start, end),
                estimatedTime: Math.ceil(this.heuristic(start, end) / this.settings.walkingSpeed),
                floors: [start.floor]
            };
        }
        
        // A*アルゴリズムで経路探索
        return this.findPathAStar(start, end);
    }
    
    /**
     * 複数フロア経路計算
     */
    calculateMultiFloorRoute(start, end) {
        // 最適な昇降手段を選択
        const verticalConnection = this.findBestVerticalConnection(start, end);
        
        const route = {
            waypoints: [],
            distance: 0,
            estimatedTime: 0,
            floors: []
        };
        
        // 開始フロアから昇降位置まで
        const toVertical = this.calculateSameFloorRoute(start, verticalConnection.start);
        route.waypoints.push(...toVertical.waypoints);
        route.distance += toVertical.distance;
        
        // 昇降移動
        route.waypoints.push(verticalConnection.end);
        route.distance += Math.abs(end.floor - start.floor) * 3.5; // 垂直移動
        route.estimatedTime += Math.abs(end.floor - start.floor) * 0.5; // エレベーター待ち時間
        
        // 到着フロアから目的地まで
        const fromVertical = this.calculateSameFloorRoute(verticalConnection.end, end);
        route.waypoints.push(...fromVertical.waypoints);
        route.distance += fromVertical.distance;
        
        route.estimatedTime += Math.ceil(route.distance / this.settings.walkingSpeed);
        route.floors = [start.floor, end.floor];
        
        return route;
    }
    
    /**
     * 最適な昇降手段検索
     */
    findBestVerticalConnection(start, end) {
        const connections = [
            {
                start: this.destinations.get('elevator_1f'),
                end: this.destinations.get('elevator_2f'),
                type: 'elevator'
            },
            {
                start: this.destinations.get('stairs_1f'),
                end: this.destinations.get('stairs_2f'),
                type: 'stairs'
            }
        ];
        
        let bestConnection = null;
        let bestScore = Infinity;
        
        for (const connection of connections) {
            const distanceToStart = this.heuristic(start, connection.start);
            const distanceFromEnd = this.heuristic(connection.end, end);
            const totalDistance = distanceToStart + distanceFromEnd;
            
            if (totalDistance < bestScore) {
                bestScore = totalDistance;
                bestConnection = connection;
            }
        }
        
        return bestConnection;
    }
    
    /**
     * 直線経路の障害物チェック
     */
    isDirectPathClear(start, end) {
        const steps = Math.ceil(this.heuristic(start, end));
        
        for (let i = 0; i <= steps; i++) {
            const t = i / steps;
            const x = start.x + (end.x - start.x) * t;
            const y = start.y + (end.y - start.y) * t;
            
            if (!this.isWalkable(x, y, start.floor)) {
                return false;
            }
        }
        
        return true;
    }
    
    /**
     * A*アルゴリズム経路探索
     */
    findPathAStar(start, goal) {
        const openSet = [start];
        const cameFrom = new Map();
        const gScore = new Map();
        const fScore = new Map();
        
        gScore.set(this.pointToKey(start), 0);
        fScore.set(this.pointToKey(start), this.heuristic(start, goal));
        
        while (openSet.length > 0) {
            // 最小f値のノードを選択
            let current = openSet.reduce((min, node) => 
                fScore.get(this.pointToKey(node)) < fScore.get(this.pointToKey(min)) ? node : min
            );
            
            if (this.heuristic(current, goal) < 1) {
                // ゴール到達
                return this.reconstructPath(cameFrom, current, start, goal);
            }
            
            openSet.splice(openSet.indexOf(current), 1);
            
            // 隣接ノード探索
            const neighbors = this.getNeighbors(current);
            for (const neighbor of neighbors) {
                const tentativeGScore = gScore.get(this.pointToKey(current)) + this.heuristic(current, neighbor);
                
                if (!gScore.has(this.pointToKey(neighbor)) || tentativeGScore < gScore.get(this.pointToKey(neighbor))) {
                    cameFrom.set(this.pointToKey(neighbor), current);
                    gScore.set(this.pointToKey(neighbor), tentativeGScore);
                    fScore.set(this.pointToKey(neighbor), tentativeGScore + this.heuristic(neighbor, goal));
                    
                    if (!openSet.includes(neighbor)) {
                        openSet.push(neighbor);
                    }
                }
            }
        }
        
        // 経路が見つからない場合は直線経路を返す
        return {
            waypoints: [start, goal],
            distance: this.heuristic(start, goal),
            estimatedTime: Math.ceil(this.heuristic(start, goal) / this.settings.walkingSpeed),
            floors: [start.floor]
        };
    }
    
    /**
     * 隣接ノード取得
     */
    getNeighbors(point) {
        const neighbors = [];
        const directions = [
            { x: 1, y: 0 }, { x: -1, y: 0 }, { x: 0, y: 1 }, { x: 0, y: -1 },
            { x: 1, y: 1 }, { x: -1, y: -1 }, { x: 1, y: -1 }, { x: -1, y: 1 }
        ];
        
        for (const dir of directions) {
            const neighbor = {
                x: point.x + dir.x,
                y: point.y + dir.y,
                z: point.z,
                floor: point.floor
            };
            
            if (this.isWalkable(neighbor.x, neighbor.y, neighbor.floor)) {
                neighbors.push(neighbor);
            }
        }
        
        return neighbors;
    }
    
    /**
     * 座標をキーに変換
     */
    pointToKey(point) {
        return `${Math.round(point.x)},${Math.round(point.y)},${point.floor}`;
    }
    
    /**
     * 経路復元
     */
    reconstructPath(cameFrom, current, start, goal) {
        const path = [goal];
        
        while (cameFrom.has(this.pointToKey(current))) {
            current = cameFrom.get(this.pointToKey(current));
            path.unshift(current);
        }
        
        path.unshift(start);
        
        // 距離計算
        let totalDistance = 0;
        for (let i = 1; i < path.length; i++) {
            totalDistance += this.heuristic(path[i-1], path[i]);
        }
        
        return {
            waypoints: path,
            distance: totalDistance,
            estimatedTime: Math.ceil(totalDistance / this.settings.walkingSpeed),
            floors: [start.floor]
        };
    }
    
    /**
     * ナビゲーション開始
     */
    startNavigation(destinationId, currentPosition) {
        try {
            this.currentRoute = this.calculateRoute(currentPosition, destinationId);
            this.isNavigating = true;
            this.currentWaypointIndex = 0;
            
            console.log('ナビゲーション開始:', this.currentRoute);
            
            // 定期更新開始
            this.routeUpdateInterval = setInterval(() => {
                this.updateNavigation(currentPosition);
            }, 1000);
            
            // 開始コールバック
            this.triggerCallback('navigationStart', {
                destination: destinationId,
                route: this.currentRoute
            });
            
            return this.currentRoute;
            
        } catch (error) {
            console.error('ナビゲーション開始エラー:', error);
            throw error;
        }
    }
    
    /**
     * ナビゲーション更新
     */
    updateNavigation(currentPosition) {
        if (!this.isNavigating || !this.currentRoute) return;
        
        const currentWaypoint = this.currentRoute.waypoints[this.currentWaypointIndex];
        const nextWaypoint = this.currentRoute.waypoints[this.currentWaypointIndex + 1];
        
        if (!currentWaypoint) {
            this.stopNavigation();
            return;
        }
        
        // 現在のウェイポイントに到達チェック
        const distanceToWaypoint = this.heuristic(currentPosition, currentWaypoint);
        
        if (distanceToWaypoint < this.settings.waypointDistance) {
            this.currentWaypointIndex++;
            
            // 次のウェイポイントがある場合
            if (nextWaypoint) {
                this.triggerCallback('waypointReached', {
                    waypoint: currentWaypoint,
                    next: nextWaypoint,
                    progress: this.currentWaypointIndex / this.currentRoute.waypoints.length
                });
            } else {
                // 目的地到着
                this.triggerCallback('destinationReached', {
                    destination: this.currentRoute.waypoints[this.currentRoute.waypoints.length - 1]
                });
                this.stopNavigation();
                return;
            }
        }
        
        // 経路逸脱チェック
        const distanceToRoute = this.getDistanceToRoute(currentPosition);
        if (distanceToRoute > this.settings.routeRecalculationDistance) {
            console.log('経路逸脱検出、再計算中...');
            this.recalculateRoute(currentPosition);
        }
        
        // ナビゲーション情報更新
        this.triggerCallback('navigationUpdate', {
            currentPosition,
            nextWaypoint: nextWaypoint || currentWaypoint,
            distanceRemaining: this.calculateRemainingDistance(currentPosition),
            estimatedTimeRemaining: this.calculateRemainingTime(currentPosition)
        });
    }
    
    /**
     * 経路までの距離計算
     */
    getDistanceToRoute(position) {
        if (!this.currentRoute || this.currentRoute.waypoints.length < 2) return 0;
        
        let minDistance = Infinity;
        
        for (let i = this.currentWaypointIndex; i < this.currentRoute.waypoints.length - 1; i++) {
            const segmentStart = this.currentRoute.waypoints[i];
            const segmentEnd = this.currentRoute.waypoints[i + 1];
            
            const distance = this.distancePointToSegment(position, segmentStart, segmentEnd);
            minDistance = Math.min(minDistance, distance);
        }
        
        return minDistance;
    }
    
    /**
     * 点と線分の距離計算
     */
    distancePointToSegment(point, segmentStart, segmentEnd) {
        const A = segmentStart;
        const B = segmentEnd;
        const P = point;
        
        const AB = { x: B.x - A.x, y: B.y - A.y };
        const AP = { x: P.x - A.x, y: P.y - A.y };
        
        const ABdotAB = AB.x * AB.x + AB.y * AB.y;
        const APdotAB = AP.x * AB.x + AP.y * AB.y;
        
        const t = Math.max(0, Math.min(1, APdotAB / ABdotAB));
        
        const projection = {
            x: A.x + t * AB.x,
            y: A.y + t * AB.y
        };
        
        return this.heuristic(point, projection);
    }
    
    /**
     * 残り距離計算
     */
    calculateRemainingDistance(currentPosition) {
        if (!this.currentRoute) return 0;
        
        let distance = 0;
        
        // 現在位置から次のウェイポイントまで
        if (this.currentWaypointIndex < this.currentRoute.waypoints.length) {
            const nextWaypoint = this.currentRoute.waypoints[this.currentWaypointIndex];
            distance += this.heuristic(currentPosition, nextWaypoint);
        }
        
        // 残りのウェイポイント間距離
        for (let i = this.currentWaypointIndex; i < this.currentRoute.waypoints.length - 1; i++) {
            distance += this.heuristic(
                this.currentRoute.waypoints[i],
                this.currentRoute.waypoints[i + 1]
            );
        }
        
        return distance;
    }
    
    /**
     * 残り時間計算
     */
    calculateRemainingTime(currentPosition) {
        const remainingDistance = this.calculateRemainingDistance(currentPosition);
        return Math.ceil(remainingDistance / this.settings.walkingSpeed);
    }
    
    /**
     * 経路再計算
     */
    recalculateRoute(currentPosition) {
        if (!this.currentRoute) return;
        
        const originalDestination = this.currentRoute.waypoints[this.currentRoute.waypoints.length - 1];
        
        try {
            // 目的地IDを逆引き
            let destinationId = null;
            for (const [id, location] of this.destinations.entries()) {
                if (location.x === originalDestination.x && 
                    location.y === originalDestination.y && 
                    location.floor === originalDestination.floor) {
                    destinationId = id;
                    break;
                }
            }
            
            if (destinationId) {
                const newRoute = this.calculateRoute(currentPosition, destinationId);
                this.currentRoute = newRoute;
                this.currentWaypointIndex = 0;
                
                this.triggerCallback('routeRecalculated', {
                    newRoute: this.currentRoute
                });
                
                console.log('経路再計算完了');
            }
            
        } catch (error) {
            console.error('経路再計算エラー:', error);
        }
    }
    
    /**
     * ナビゲーション停止
     */
    stopNavigation() {
        this.isNavigating = false;
        this.currentRoute = null;
        this.currentWaypointIndex = 0;
        
        if (this.routeUpdateInterval) {
            clearInterval(this.routeUpdateInterval);
            this.routeUpdateInterval = null;
        }
        
        this.triggerCallback('navigationStop', {});
        console.log('ナビゲーション停止');
    }
    
    /**
     * 目的地一覧取得
     */
    getDestinations() {
        const destinations = [];
        for (const [id, location] of this.destinations.entries()) {
            destinations.push({
                id,
                name: location.name,
                floor: location.floor,
                category: this.getDestinationCategory(id)
            });
        }
        return destinations;
    }
    
    /**
     * 目的地カテゴリ判定
     */
    getDestinationCategory(destinationId) {
        const categories = {
            'reception': 'service',
            'onsen_entrance': 'facility',
            'onsen_men': 'facility',
            'onsen_women': 'facility',
            'restaurant': 'dining',
            'shop': 'shopping',
            'lounge': 'relaxation',
            'elevator_1f': 'navigation',
            'elevator_2f': 'navigation',
            'stairs_1f': 'navigation',
            'stairs_2f': 'navigation',
            'toilet_1f': 'facility',
            'toilet_2f': 'facility',
            'parking_entrance': 'parking',
            'parking_area': 'parking'
        };
        
        return categories[destinationId] || 'other';
    }
    
    /**
     * コールバック登録
     */
    onNavigationEvent(eventType, callback) {
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
            isNavigating: this.isNavigating,
            currentRoute: this.currentRoute,
            currentWaypointIndex: this.currentWaypointIndex,
            destinationsCount: this.destinations.size,
            waypointsCount: this.waypoints.size,
            floorsCount: this.floorPlans.size
        };
    }
}

// グローバル公開
window.NavigationSystem = NavigationSystem;
