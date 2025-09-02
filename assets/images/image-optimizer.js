/**
 * 画像最適化ユーティリティ
 * パフォーマンス向上のための画像処理
 */

class ImageOptimizer {
    constructor() {
        this.cache = new Map();
        this.loadedImages = new Set();
    }
    
    /**
     * 画像プリロード
     */
    async preloadImages(imageList) {
        console.log('画像プリロード開始...');
        
        const promises = imageList.map(src => this.loadImage(src));
        const results = await Promise.allSettled(promises);
        
        const successful = results.filter(r => r.status === 'fulfilled').length;
        console.log(`画像プリロード完了: ${successful}/${imageList.length}`);
        
        return results;
    }
    
    /**
     * 単一画像読み込み
     */
    loadImage(src) {
        return new Promise((resolve, reject) => {
            if (this.loadedImages.has(src)) {
                resolve(this.cache.get(src));
                return;
            }
            
            const img = new Image();
            img.crossOrigin = 'anonymous';
            
            img.onload = () => {
                this.cache.set(src, img);
                this.loadedImages.add(src);
                resolve(img);
            };
            
            img.onerror = () => {
                console.warn(`画像読み込み失敗: ${src}`);
                reject(new Error(`Failed to load image: ${src}`));
            };
            
            img.src = src;
        });
    }
    
    /**
     * WebP対応チェック
     */
    supportsWebP() {
        const canvas = document.createElement('canvas');
        canvas.width = 1;
        canvas.height = 1;
        
        try {
            return canvas.toDataURL('image/webp').indexOf('data:image/webp') === 0;
        } catch (e) {
            return false;
        }
    }
    
    /**
     * 最適な画像形式選択
     */
    getOptimalImageSrc(baseName) {
        const webpSupported = this.supportsWebP();
        
        if (webpSupported) {
            return `/assets/images/${baseName}.webp`;
        } else {
            return `/assets/images/${baseName}.png`;
        }
    }
    
    /**
     * レスポンシブ画像ソース生成
     */
    getResponsiveImageSrc(baseName, size = 'medium') {
        const sizes = {
            'small': '_sm',
            'medium': '_md', 
            'large': '_lg'
        };
        
        const suffix = sizes[size] || '_md';
        return this.getOptimalImageSrc(baseName + suffix);
    }
    
    /**
     * 画像リサイズ（Canvas使用）
     */
    resizeImage(img, maxWidth, maxHeight) {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        // アスペクト比を保持してリサイズ
        let { width, height } = img;
        
        if (width > height) {
            if (width > maxWidth) {
                height = (height * maxWidth) / width;
                width = maxWidth;
            }
        } else {
            if (height > maxHeight) {
                width = (width * maxHeight) / height;
                height = maxHeight;
            }
        }
        
        canvas.width = width;
        canvas.height = height;
        
        ctx.drawImage(img, 0, 0, width, height);
        
        return canvas;
    }
    
    /**
     * Base64エンコード
     */
    toBase64(canvas, quality = 0.8) {
        return canvas.toDataURL('image/jpeg', quality);
    }
    
    /**
     * 画像圧縮
     */
    async compressImage(file, maxSize = 800, quality = 0.8) {
        return new Promise((resolve) => {
            const img = new Image();
            img.onload = () => {
                const canvas = this.resizeImage(img, maxSize, maxSize);
                const compressed = this.toBase64(canvas, quality);
                resolve(compressed);
            };
            img.src = URL.createObjectURL(file);
        });
    }
}

// 使用する画像リスト
const ESSENTIAL_IMAGES = [
    '/assets/images/icons/navigation-arrow.svg',
    '/assets/images/icons/destination-marker.svg',
    '/assets/images/facilities/onsen.svg',
    '/assets/images/facilities/reception.svg',
    '/assets/images/facilities/restaurant.svg',
    '/assets/images/facilities/toilet.svg',
    '/assets/images/facilities/elevator.svg',
    '/assets/images/facilities/shop.svg',
    '/assets/images/facilities/parking.svg'
];

// グローバル公開
window.ImageOptimizer = ImageOptimizer;
window.ESSENTIAL_IMAGES = ESSENTIAL_IMAGES;
