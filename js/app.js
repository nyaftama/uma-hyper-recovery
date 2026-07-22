document.addEventListener('DOMContentLoaded', () => {
    // Canvas & State
    const canvas = document.getElementById('previewCanvas');
    const ctx = canvas.getContext('2d');

    // Helper: Generate 10 randomized sparkle positions
    function generateRandomSparkles() {
        const sparkles = [];
        const count = 10;

        for (let i = 0; i < count; i++) {
            const angle = (i / count) * Math.PI * 2 + (Math.random() * 0.4 - 0.2);
            const rx = 200 + Math.random() * 220;
            const ry = 55 + Math.random() * 75;

            const x = Math.cos(angle) * rx;
            const y = Math.sin(angle) * ry;

            const size = Math.round(14 + Math.random() * 26);
            const rot = Math.round((Math.random() - 0.5) * 90);

            sparkles.push({ x, y, size, rot });
        }
        return sparkles;
    }

    const state = {
        bgImage: null,
        imgRotation: 0, // 0, 90, 180, 270 degrees
        textLine1: '超回復',
        textKeyword: '温泉',
        textSize: 70,  // default 70
        textSlant: -8, // Fixed -8 deg slant
        posX: 50, // percentage 0 - 100
        posY: 75, // default 75%
        imgX: 0,  // percentage offset
        imgY: 0,  // percentage offset
        imgScale: 100, // percentage
        dragTarget: 'text', // 'text' or 'image'
        sparkles: generateRandomSparkles(),
        isDragging: false,
        dragStart: { x: 0, y: 0 }
    };

    // DOM Elements
    const dropzone = document.getElementById('dropzone');
    const fileInput = document.getElementById('fileInput');
    const pasteImgBtn = document.getElementById('pasteImgBtn');
    const rotateImgLeftBtn = document.getElementById('rotateImgLeftBtn');
    const rotateImgRightBtn = document.getElementById('rotateImgRightBtn');
    const resetImgBtn = document.getElementById('resetImgBtn');

    const textKeywordInput = document.getElementById('textKeyword');
    const textKeywordError = document.getElementById('textKeywordError');
    const presetChips = document.querySelectorAll('.preset-chip');

    // NG Words Filter State & Loader
    let ngWords = [];
    let isNgWordDetected = false;

    // Fallback NG words in case fetch or decoding fails
    const DEFAULT_NG_WORDS = [
        '死', '殺', 'ババア', '予後不良', '怪我', '下手', 'アンチ', '駄馬', '八百長',
        '駄作', 'オワコン', '炎上', '害悪', '粗品', 'ゴミ', 'クソ', 'くそ', '害', '豚',
        'キモ', '雑魚', 'ヘイト', '晒', 'エロ', 'エッチ', '性', 'セックス', 'ちんこ',
        'ちんちん', 'まんこ', 'おっぱい', '巨乳', '乳', '尻', 'フェラ', '手コキ',
        '本番', '風俗', '中出し', '潮吹き', '精液', '精子', 'オナニー', '自慰',
        '猥褻', 'わいせつ', '処女', '童貞', 'AV', 'レイプ', '淫乱', '売春', '買春',
        '810', '114514', '1919', '野獣', '淫夢', '先輩', '田所', '遠野',
        'インム', 'ヤジュウ', 'センパイ', 'タドコロ', 'トオノ', 'イキソウ', 'ヨゴフリョウ',
        'ヤオチョウ', 'キョニュウ', 'テコキ', 'ホンバン', 'フウゾク', 'ナカダシ', 'シオフキ',
        'セイエキ', 'セイシ', 'ショジョ', 'ドウテイ', 'いんむ', 'やじゅう', 'せんぱい',
        'たどころ', 'とおの', 'いきそう', 'よごふりょう', 'やおちょう', 'きょにゅう', 'てこき',
        'ほんばん', 'ふうぞく', 'なかだし', 'しおふき', 'せいえき', 'せいし', 'しょじょ', 'どうてい'
    ];

    async function loadNgWords() {
        try {
            const response = await fetch('data/ng_words.txt');
            if (response.ok) {
                const rawText = await response.text();
                const trimmed = rawText.trim();
                if (trimmed) {
                    let current = trimmed.replace(/\s+/g, '');
                    let decodedText = '';

                    try {
                        const pass1 = atob(current);
                        const pass2 = atob(pass1);
                        const pass3Binary = atob(pass2);
                        const bytes = new Uint8Array(pass3Binary.length);
                        for (let j = 0; j < pass3Binary.length; j++) {
                            bytes[j] = pass3Binary.charCodeAt(j);
                        }
                        decodedText = new TextDecoder('utf-8').decode(bytes);
                    } catch (e) {
                        console.warn('Failed to decode ng_words.txt Base64:', e);
                    }

                    if (decodedText) {
                        const parsed = decodedText
                            .split(/\r?\n/)
                            .map(w => w.trim())
                            .filter(w => w.length > 0 && !w.includes('\uFFFD') && /^[\u3040-\u30FF\u4E00-\u9FAF\uFF00-\uFFEF\w]+$/u.test(w));
                        if (parsed.length > 0) {
                            ngWords = parsed;
                        }
                    }
                }
            }
        } catch (err) {
            console.warn('Could not fetch ng_words.txt, using fallback NG words list:', err);
        }

        if (ngWords.length === 0) {
            ngWords = DEFAULT_NG_WORDS;
        }

        validateKeywordInput();
    }

    function normalizeText(str) {
        if (!str) return '';
        // NFKC normalization (converts half-width kana to full-width, etc.)
        let normalized = str.normalize('NFKC').toLowerCase();
        // Convert Katakana (U+30A1 - U+30F6) to Hiragana (U+3041 - U+3096)
        return normalized.replace(/[\u30a1-\u30f6]/g, (ch) => {
            return String.fromCharCode(ch.charCodeAt(0) - 0x60);
        });
    }

    function validateKeywordInput() {
        const text = textKeywordInput ? textKeywordInput.value : '';
        let matched = false;

        if (ngWords.length > 0 && text && text.trim().length > 0) {
            const normalizedText = normalizeText(text);
            for (const word of ngWords) {
                const normalizedWord = normalizeText(word);
                if (normalizedWord && normalizedText.includes(normalizedWord)) {
                    matched = true;
                    break;
                }
            }
        }

        isNgWordDetected = matched;

        if (textKeywordInput) {
            if (matched) {
                textKeywordInput.classList.add('input-error');
                if (textKeywordError) textKeywordError.style.display = 'flex';
            } else {
                textKeywordInput.classList.remove('input-error');
                if (textKeywordError) textKeywordError.style.display = 'none';
            }
        }

        renderCanvasSafe(50);
        return matched;
    }

    const textSizeInput = document.getElementById('textSize');
    const textSizeVal = document.getElementById('textSizeVal');
    const posYInput = document.getElementById('posY');
    const posYVal = document.getElementById('posYVal');
    const posXInput = document.getElementById('posX');
    const posXVal = document.getElementById('posXVal');
    const imgScaleInput = document.getElementById('imgScale');
    const imgScaleVal = document.getElementById('imgScaleVal');
    const dragTargetRadios = document.querySelectorAll('input[name="dragTarget"]');

    const shuffleSparklesBtn = document.getElementById('shuffleSparklesBtn');
    const resetBtn = document.getElementById('resetBtn');
    const generateBtn = document.getElementById('generateBtn');
    const copyBtn = document.getElementById('copyBtn');

    const shareModal = document.getElementById('shareModal');
    const shareStep1 = document.getElementById('shareStep1');
    const shareStep2 = document.getElementById('shareStep2');
    const shareImagePreview = document.getElementById('shareImagePreview');
    const downloadModalBtn = document.getElementById('downloadModalBtn');
    const twitterShareBtn = document.getElementById('twitterShareBtn');
    const closeModalBtn = document.getElementById('closeModalBtn');
    const copyAndShareBtn = document.getElementById('copyAndShareBtn');
    const shareStep2BackBtn = document.getElementById('shareStep2BackBtn');

    let hasSavedOrCopied = false;

    // Default Canvas Dimensions
    const CANVAS_WIDTH = 900;
    const CANVAS_HEIGHT = 600;

    // --- Toast Notification (Matched exactly with uma-ouen-baken) ---
    let toastTimeout;
    function showToast(msg, duration = 2500) {
        const toast = document.getElementById('toast');
        if (!toast) return;
        toast.textContent = msg;
        toast.classList.add('show');
        clearTimeout(toastTimeout);
        toastTimeout = setTimeout(() => toast.classList.remove('show'), duration);
    }

    // Offscreen Canvas Cache for Text Rendering Optimization
    const textCacheCanvas = document.createElement('canvas');
    textCacheCanvas.width = CANVAS_WIDTH;
    textCacheCanvas.height = CANVAS_HEIGHT;
    const textCacheCtx = textCacheCanvas.getContext('2d');
    let isTextCacheDirty = true;

    function markTextCacheDirty() {
        isTextCacheDirty = true;
    }

    // WebFont Loading Safety Wrapper
    let fontLoadTimer = null;
    function renderCanvasSafe(delay = 100) {
        markTextCacheDirty();
        if (fontLoadTimer) clearTimeout(fontLoadTimer);
        fontLoadTimer = setTimeout(() => {
            if (document.fonts && document.fonts.ready) {
                document.fonts.ready.then(() => {
                    renderCanvas();
                }).catch(() => {
                    renderCanvas();
                });
            } else {
                renderCanvas();
            }
        }, delay);
    }

    // --- Render Text & Sparkles to Offscreen Cache ---
    function renderTextToCache() {
        textCacheCtx.clearRect(0, 0, textCacheCanvas.width, textCacheCanvas.height);

        textCacheCtx.shadowColor = 'transparent';
        textCacheCtx.shadowBlur = 0;
        textCacheCtx.shadowOffsetX = 0;
        textCacheCtx.shadowOffsetY = 0;

        const centerX = textCacheCanvas.width / 2;
        const centerY = textCacheCanvas.height / 2;
        const baseSize = state.textSize;
        const line1Text = '超回復';
        const line2FullText = `${state.textKeyword || ''}パワー発動!`;

        textCacheCtx.save();
        textCacheCtx.translate(centerX, centerY);

        const slantRad = (state.textSlant * Math.PI) / 180;
        textCacheCtx.transform(1, 0, Math.tan(slantRad), 1, 0, 0);

        textCacheCtx.textAlign = 'center';
        textCacheCtx.textBaseline = 'middle';

        const fontStack = "'Noto Sans JP', -apple-system, sans-serif";
        const sharedFontSize = baseSize;
        const line1Y = -sharedFontSize * 0.6;
        const line2Y = sharedFontSize * 0.6;
        const sharedFont = `900 ${sharedFontSize}px ${fontStack}`;

        function drawTextLayers(text, font, xOffset, yOffset, size, gradientStops) {
            textCacheCtx.font = font;

            const gradHeight = size * 0.95;
            const textGrad = textCacheCtx.createLinearGradient(0, yOffset - gradHeight / 2, 0, yOffset + gradHeight / 2);
            gradientStops.forEach(stop => {
                textGrad.addColorStop(stop.offset, stop.color);
            });

            const shadowBaseX = xOffset;
            const shadowBaseY = yOffset;

            textCacheCtx.save();
            textCacheCtx.lineJoin = 'round';

            const shadowPasses = [
                { r: size * 0.07, strokeW: size * 0.12, alpha: 0.025 },
                { r: size * 0.045, strokeW: size * 0.08, alpha: 0.05 },
                { r: size * 0.025, strokeW: size * 0.05, alpha: 0.09 },
                { r: size * 0.01, strokeW: size * 0.03, alpha: 0.15 },
                { r: 0, strokeW: size * 0.02, alpha: 0.25 }
            ];

            const shadowColorPrefix = 'rgba(97, 48, 3, ';

            shadowPasses.forEach(pass => {
                const passColor = shadowColorPrefix + pass.alpha + ')';
                textCacheCtx.strokeStyle = passColor;
                textCacheCtx.fillStyle = passColor;
                textCacheCtx.lineWidth = pass.strokeW;

                if (pass.r === 0) {
                    textCacheCtx.strokeText(text, shadowBaseX, shadowBaseY);
                    textCacheCtx.fillText(text, shadowBaseX, shadowBaseY);
                } else {
                    const angles = 8;
                    for (let i = 0; i < angles; i++) {
                        const angle = (i * Math.PI * 2) / angles;
                        const dx = shadowBaseX + Math.cos(angle) * pass.r;
                        const dy = shadowBaseY + Math.sin(angle) * pass.r;
                        textCacheCtx.strokeText(text, dx, dy);
                        textCacheCtx.fillText(text, dx, dy);
                    }
                }
            });
            textCacheCtx.restore();

            textCacheCtx.save();
            textCacheCtx.strokeStyle = '#613003';
            textCacheCtx.lineWidth = 2;
            textCacheCtx.lineJoin = 'round';
            textCacheCtx.strokeText(text, xOffset, yOffset);

            textCacheCtx.fillStyle = textGrad;
            textCacheCtx.fillText(text, xOffset, yOffset);
            textCacheCtx.restore();
        }

        const line1GradStops = [
            { offset: 0.0, color: '#FFFDDC' },
            { offset: 0.33, color: '#FEDF4D' },
            { offset: 0.66, color: '#FF8E1D' },
            { offset: 1.0, color: '#F86F12' }
        ];

        drawTextLayers(line1Text, sharedFont, 0, line1Y, sharedFontSize, line1GradStops);

        const line2GradStops = [
            { offset: 0.0, color: '#FFFFD7' },
            { offset: 1.0, color: '#F6C13C' }
        ];

        let line2Main = line2FullText;
        let exclamChar = '';

        if (line2FullText.endsWith('！') || line2FullText.endsWith('!')) {
            line2Main = line2FullText.slice(0, -1);
            exclamChar = '!';
        }

        if (exclamChar) {
            textCacheCtx.font = sharedFont;
            const mainWidth = textCacheCtx.measureText(line2Main).width;
            const exclamWidth = textCacheCtx.measureText(exclamChar).width;

            const scaledExclamWidth = exclamWidth * 1.1;
            const totalWidth = mainWidth + scaledExclamWidth;

            const startX = -totalWidth / 2;
            const mainX = startX + mainWidth / 2;
            const exclamX = startX + mainWidth + scaledExclamWidth / 2;

            drawTextLayers(line2Main, sharedFont, mainX, line2Y, sharedFontSize, line2GradStops);

            const exclamOffsetX = sharedFontSize * 0.06;
            const exclamOffsetY = sharedFontSize * 0.04;

            textCacheCtx.save();
            textCacheCtx.translate(exclamX + exclamOffsetX, line2Y + exclamOffsetY);
            textCacheCtx.scale(1.1, 1.1);
            textCacheCtx.rotate((15 * Math.PI) / 180);

            drawTextLayers(exclamChar, sharedFont, 0, 0, sharedFontSize, line2GradStops);
            textCacheCtx.restore();
        } else {
            drawTextLayers(line2FullText, sharedFont, 0, line2Y, sharedFontSize, line2GradStops);
        }

        textCacheCtx.restore();

        function drawSparkleShape(c) {
            const r = 4;
            c.beginPath();
            c.moveTo(0.00, -10.00);
            c.arcTo(1.06, -1.06, 10.00, 0.00, r);
            c.lineTo(10.00, 0.00);
            c.arcTo(1.06, 1.06, 0.00, 10.00, r);
            c.lineTo(0.00, 10.00);
            c.arcTo(-1.06, 1.06, -10.00, 0.00, r);
            c.lineTo(-10.00, 0.00);
            c.arcTo(-1.06, -1.06, 0.00, -10.00, r);
            c.closePath();
        }

        const scaleFactor = baseSize / 80;
        state.sparkles.forEach(sparkle => {
            const sparkleX = centerX + sparkle.x * scaleFactor;
            const sparkleY = centerY + sparkle.y * scaleFactor;
            const effectiveSize = sparkle.size * scaleFactor;
            const scale = effectiveSize / 20;

            textCacheCtx.save();
            textCacheCtx.translate(sparkleX, sparkleY);

            const shadowPasses = [
                { r: effectiveSize * 0.20, strokeW: effectiveSize * 0.28, alpha: 0.015 },
                { r: effectiveSize * 0.14, strokeW: effectiveSize * 0.20, alpha: 0.03 },
                { r: effectiveSize * 0.09, strokeW: effectiveSize * 0.14, alpha: 0.05 },
                { r: effectiveSize * 0.05, strokeW: effectiveSize * 0.09, alpha: 0.08 },
                { r: effectiveSize * 0.02, strokeW: effectiveSize * 0.05, alpha: 0.12 },
                { r: 0, strokeW: effectiveSize * 0.03, alpha: 0.20 }
            ];

            textCacheCtx.save();
            textCacheCtx.globalAlpha = 0.5;
            textCacheCtx.shadowColor = 'rgba(255, 142, 29, 0.5)';
            textCacheCtx.shadowBlur = effectiveSize * 0.25;

            shadowPasses.forEach(pass => {
                const passColor = `rgba(255, 142, 29, ${pass.alpha})`;
                textCacheCtx.strokeStyle = passColor;
                textCacheCtx.fillStyle = passColor;
                textCacheCtx.lineWidth = pass.strokeW;
                textCacheCtx.lineJoin = 'round';

                if (pass.r === 0) {
                    textCacheCtx.save();
                    textCacheCtx.scale(scale, scale);
                    drawSparkleShape(textCacheCtx);
                    textCacheCtx.stroke();
                    textCacheCtx.fill();
                    textCacheCtx.restore();
                } else {
                    const angles = 8;
                    for (let i = 0; i < angles; i++) {
                        const angle = (i * Math.PI * 2) / angles;
                        const dx = Math.cos(angle) * pass.r;
                        const dy = Math.sin(angle) * pass.r;
                        textCacheCtx.save();
                        textCacheCtx.translate(dx, dy);
                        textCacheCtx.scale(scale, scale);
                        drawSparkleShape(textCacheCtx);
                        textCacheCtx.stroke();
                        textCacheCtx.fill();
                        textCacheCtx.restore();
                    }
                }
            });
            textCacheCtx.restore();

            textCacheCtx.save();
            textCacheCtx.scale(scale, scale);
            drawSparkleShape(textCacheCtx);
            textCacheCtx.fillStyle = '#ffffff';
            textCacheCtx.fill();
            textCacheCtx.restore();

            textCacheCtx.restore();
        });
    }

    // --- Clamp Image Position (Prevent gaps when scale >= 100%) ---
    function clampImagePosition() {
        if (!state.bgImage || state.imgScale < 100) return;

        const rotDeg = state.imgRotation || 0;
        const isSwapped = (rotDeg === 90 || rotDeg === 270);

        const effImgW = isSwapped ? state.bgImage.height : state.bgImage.width;
        const effImgH = isSwapped ? state.bgImage.width : state.bgImage.height;

        const imgRatio = effImgW / effImgH;
        const canvasRatio = canvas.width / canvas.height;
        let renderW, renderH;

        if (imgRatio > canvasRatio) {
            renderH = canvas.height;
            renderW = canvas.height * imgRatio;
        } else {
            renderW = canvas.width;
            renderH = canvas.width / imgRatio;
        }

        const scaleRatio = state.imgScale / 100;
        const finalW = renderW * scaleRatio;
        const finalH = renderH * scaleRatio;

        const maxOffsetX = (finalW - canvas.width) / 2;
        const maxOffsetY = (finalH - canvas.height) / 2;

        const maxImgX = (maxOffsetX / canvas.width) * 100;
        const maxImgY = (maxOffsetY / canvas.height) * 100;

        state.imgX = Math.max(-maxImgX, Math.min(maxImgX, state.imgX));
        state.imgY = Math.max(-maxImgY, Math.min(maxImgY, state.imgY));
    }

    // --- Render Canvas ---
    function renderCanvas() {
        clampImagePosition();

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;

        // 1. Draw Background Image or Default Solid Black
        if (state.bgImage) {
            const rotDeg = state.imgRotation || 0;
            const isSwapped = (rotDeg === 90 || rotDeg === 270);

            const effImgW = isSwapped ? state.bgImage.height : state.bgImage.width;
            const effImgH = isSwapped ? state.bgImage.width : state.bgImage.height;

            const imgRatio = effImgW / effImgH;
            const canvasRatio = canvas.width / canvas.height;
            let renderW, renderH, baseRenderX, baseRenderY;

            if (imgRatio > canvasRatio) {
                renderH = canvas.height;
                renderW = canvas.height * imgRatio;
                baseRenderX = (canvas.width - renderW) / 2;
                baseRenderY = 0;
            } else {
                renderW = canvas.width;
                renderH = canvas.width / imgRatio;
                baseRenderX = 0;
                baseRenderY = (canvas.height - renderH) / 2;
            }

            const scaleRatio = state.imgScale / 100;
            const finalW = renderW * scaleRatio;
            const finalH = renderH * scaleRatio;
            const offsetX = (state.imgX * canvas.width) / 100;
            const offsetY = (state.imgY * canvas.height) / 100;

            const finalCenterX = baseRenderX + renderW / 2 + offsetX;
            const finalCenterY = baseRenderY + renderH / 2 + offsetY;

            ctx.save();
            ctx.translate(finalCenterX, finalCenterY);
            ctx.rotate((rotDeg * Math.PI) / 180);

            const drawW = isSwapped ? finalH : finalW;
            const drawH = isSwapped ? finalW : finalH;
            ctx.drawImage(state.bgImage, -drawW / 2, -drawH / 2, drawW, drawH);
            ctx.restore();
        } else {
            ctx.fillStyle = '#000000';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
        }

        // Skip text layer rendering if NG word is detected
        if (isNgWordDetected) {
            return;
        }

        // 2. Draw Cached Text Layer
        if (isTextCacheDirty) {
            renderTextToCache();
            isTextCacheDirty = false;
        }

        const centerX = (canvas.width * state.posX) / 100;
        const centerY = (canvas.height * state.posY) / 100;

        ctx.drawImage(textCacheCanvas, centerX - CANVAS_WIDTH / 2, centerY - CANVAS_HEIGHT / 2);
    }

    // --- Interactive Drag & Drop on Canvas (Text or Image) ---
    function getCanvasCoords(e) {
        const rect = canvas.getBoundingClientRect();
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;

        return {
            x: (clientX - rect.left) * scaleX,
            y: (clientY - rect.top) * scaleY
        };
    }

    canvas.addEventListener('mousedown', (e) => {
        state.isDragging = true;
        state.dragStart = getCanvasCoords(e);
    });

    canvas.addEventListener('touchstart', (e) => {
        state.isDragging = true;
        state.dragStart = getCanvasCoords(e);
    }, { passive: true });

    window.addEventListener('mousemove', (e) => {
        if (!state.isDragging) return;
        const coords = getCanvasCoords(e);
        const dx = coords.x - state.dragStart.x;
        const dy = coords.y - state.dragStart.y;
        state.dragStart = coords;

        if (state.dragTarget === 'image') {
            // Drag Image
            state.imgX = Math.max(-100, Math.min(100, state.imgX + (dx / canvas.width) * 100));
            state.imgY = Math.max(-100, Math.min(100, state.imgY + (dy / canvas.height) * 100));
        } else {
            // Drag Text
            state.posX = Math.max(5, Math.min(95, state.posX + (dx / canvas.width) * 100));
            state.posY = Math.max(5, Math.min(95, state.posY + (dy / canvas.height) * 100));

            posXInput.value = Math.round(state.posX);
            posXVal.textContent = `${Math.round(state.posX)}%`;
            posYInput.value = Math.round(state.posY);
            posYVal.textContent = `${Math.round(state.posY)}%`;
        }

        renderCanvas();
    });

    window.addEventListener('touchmove', (e) => {
        if (!state.isDragging) return;
        const coords = getCanvasCoords(e);
        const dx = coords.x - state.dragStart.x;
        const dy = coords.y - state.dragStart.y;
        state.dragStart = coords;

        if (state.dragTarget === 'image') {
            // Drag Image
            state.imgX = Math.max(-100, Math.min(100, state.imgX + (dx / canvas.width) * 100));
            state.imgY = Math.max(-100, Math.min(100, state.imgY + (dy / canvas.height) * 100));
        } else {
            // Drag Text
            state.posX = Math.max(5, Math.min(95, state.posX + (dx / canvas.width) * 100));
            state.posY = Math.max(5, Math.min(95, state.posY + (dy / canvas.height) * 100));

            posXInput.value = Math.round(state.posX);
            posXVal.textContent = `${Math.round(state.posX)}%`;
            posYInput.value = Math.round(state.posY);
            posYVal.textContent = `${Math.round(state.posY)}%`;
        }

        renderCanvas();
    }, { passive: true });

    window.addEventListener('mouseup', () => { state.isDragging = false; });
    window.addEventListener('touchend', () => { state.isDragging = false; });

    // --- Image File Upload Handlers (Native Decode First -> heic2any Fallback) ---
    function handleFile(file) {
        if (!file) return;

        const isHeic = file.name && (file.name.toLowerCase().endsWith('.heic') ||
            file.name.toLowerCase().endsWith('.heif')) ||
            file.type === 'image/heic' ||
            file.type === 'image/heif';

        if (!isHeic && file.type && !file.type.startsWith('image/')) {
            showToast('画像ファイルを選択してください');
            return;
        }

        // Step 1: Try Native Image Loading (Safari / iOS natively loads HEIC images)
        const objectUrl = URL.createObjectURL(file);
        const img = new Image();

        img.onload = () => {
            state.bgImage = img;
            state.imgRotation = 0;
            renderCanvasSafe(50);
            showToast('画像を読み込みました');
        };

        img.onerror = async () => {
            URL.revokeObjectURL(objectUrl);

            // Step 2: Fallback to JS heic2any for browsers that don't support native HEIC (e.g. Chrome on Windows/Android)
            if (isHeic) {
                showToast('HEIC画像を変換中...', 4000);
                try {
                    if (typeof heic2any === 'undefined') {
                        showToast('HEIC画像の変換に対応していません。JPEG/PNG画像をご利用ください');
                        return;
                    }

                    const heicBlob = new Blob([file], { type: 'image/heic' });
                    const convertedBlob = await heic2any({
                        blob: heicBlob,
                        toType: 'image/jpeg',
                        quality: 0.92
                    });

                    const targetBlob = Array.isArray(convertedBlob) ? convertedBlob[0] : convertedBlob;
                    readBlobAndRender(targetBlob);
                } catch (err) {
                    console.error('HEIC conversion error:', err);
                    showToast('HEIC画像の変換に対応していません。JPEG/PNG形式をお試しください', 4000);
                }
            } else {
                showToast('画像の読み込みに失敗しました');
            }
        };

        img.src = objectUrl;
    }

    function readBlobAndRender(blob) {
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                state.bgImage = img;
                state.imgRotation = 0;
                renderCanvasSafe(50);
                showToast('画像を読み込みました');
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(blob);
    }

    dropzone.addEventListener('click', () => fileInput.click());

    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            handleFile(e.target.files[0]);
        }
    });

    dropzone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropzone.classList.add('dragover');
    });

    dropzone.addEventListener('dragleave', () => {
        dropzone.classList.remove('dragover');
    });

    dropzone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropzone.classList.remove('dragover');
        if (e.dataTransfer.files.length > 0) {
            handleFile(e.dataTransfer.files[0]);
        }
    });

    // Paste Image via Button (Clipboard API for mobile/desktop)
    if (pasteImgBtn) {
        pasteImgBtn.addEventListener('click', async () => {
            try {
                if (!navigator.clipboard || !navigator.clipboard.read) {
                    showToast('お使いのブラウザはクリップボードの読み取りに対応していません');
                    return;
                }
                const clipboardItems = await navigator.clipboard.read();
                let imageFound = false;

                for (const item of clipboardItems) {
                    const imageType = item.types.find(type => type.startsWith('image/'));
                    if (imageType) {
                        const blob = await item.getType(imageType);
                        handleFile(blob);
                        imageFound = true;
                        break;
                    }
                }

                if (!imageFound) {
                    showToast('クリップボードに画像が見つかりませんでした');
                }
            } catch (err) {
                console.error(err);
                showToast('クリップボードの画像読み取りに失敗しました（権限が必要です）');
            }
        });
    }

    // Rotate Image Left Button (Rotate 90 degrees counter-clockwise)
    if (rotateImgLeftBtn) {
        rotateImgLeftBtn.addEventListener('click', () => {
            if (!state.bgImage) {
                showToast('回転する画像が選択されていません');
                return;
            }
            state.imgRotation = (state.imgRotation + 270) % 360;
            renderCanvas();
            showToast(`画像を ${state.imgRotation}° 回転しました`);
        });
    }

    // Rotate Image Right Button (Rotate 90 degrees clockwise)
    if (rotateImgRightBtn) {
        rotateImgRightBtn.addEventListener('click', () => {
            if (!state.bgImage) {
                showToast('回転する画像が選択されていません');
                return;
            }
            state.imgRotation = (state.imgRotation + 90) % 360;
            renderCanvas();
            showToast(`画像を ${state.imgRotation}° 回転しました`);
        });
    }

    // Reset Image Button
    if (resetImgBtn) {
        resetImgBtn.addEventListener('click', () => {
            state.bgImage = null;
            state.imgRotation = 0;
            state.imgX = 0;
            state.imgY = 0;
            state.imgScale = 100;
            fileInput.value = '';
            if (imgScaleInput) {
                imgScaleInput.value = 100;
                imgScaleVal.textContent = '100%';
            }
            renderCanvasSafe(50);
            showToast('選択中の画像をリセットしました');
        });
    }

    // Paste Image from Keyboard Shortcut (Ctrl+V / Cmd+V)
    window.addEventListener('paste', (e) => {
        const items = (e.clipboardData || e.originalEvent.clipboardData).items;
        for (let item of items) {
            if (item.kind === 'file' && item.type.startsWith('image/')) {
                const blob = item.getAsFile();
                handleFile(blob);
                break;
            }
        }
    });

    // --- Input Control Listeners ---
    textKeywordInput.addEventListener('input', (e) => {
        state.textKeyword = e.target.value;
        validateKeywordInput();
    });

    presetChips.forEach(chip => {
        chip.addEventListener('click', () => {
            const presetVal = chip.getAttribute('data-preset');
            textKeywordInput.value = presetVal;
            state.textKeyword = presetVal;
            validateKeywordInput();
        });
    });

    textSizeInput.addEventListener('input', (e) => {
        state.textSize = parseInt(e.target.value, 10);
        textSizeVal.textContent = state.textSize;
        markTextCacheDirty();
        renderCanvas();
    });

    posYInput.addEventListener('input', (e) => {
        state.posY = parseInt(e.target.value, 10);
        posYVal.textContent = `${state.posY}%`;
        renderCanvas();
    });

    posXInput.addEventListener('input', (e) => {
        state.posX = parseInt(e.target.value, 10);
        posXVal.textContent = `${state.posX}%`;
        renderCanvas();
    });

    if (imgScaleInput) {
        imgScaleInput.addEventListener('input', (e) => {
            state.imgScale = parseInt(e.target.value, 10);
            imgScaleVal.textContent = `${state.imgScale}%`;
            renderCanvas();
        });
    }

    dragTargetRadios.forEach(radio => {
        radio.addEventListener('change', (e) => {
            if (e.target.checked) {
                state.dragTarget = e.target.value;
            }
        });
    });

    // Buttons
    if (shuffleSparklesBtn) {
        shuffleSparklesBtn.addEventListener('click', () => {
            state.sparkles = generateRandomSparkles();
            markTextCacheDirty();
            renderCanvas();
            showToast('キラキラの配置をシャッフルしました');
        });
    }

    resetBtn.addEventListener('click', () => {
        state.textSize = 70;
        state.posX = 50;
        state.posY = 75;
        state.imgX = 0;
        state.imgY = 0;
        state.imgScale = 100;
        state.imgRotation = 0;
        state.sparkles = generateRandomSparkles();

        textSizeInput.value = 70;
        textSizeVal.textContent = '70';
        posXInput.value = 50;
        posXVal.textContent = '50%';
        posYInput.value = 75;
        posYVal.textContent = '75%';

        if (imgScaleInput) {
            imgScaleInput.value = 100;
            imgScaleVal.textContent = '100%';
        }

        renderCanvasSafe(50);
        showToast('初期位置にリセットしました');
    });

    // --- Generate & Share Handlers ---
    function getGeneratedDataURL() {
        return canvas.toDataURL('image/png');
    }

    // Record saved/copied state on image preview right-click or long press
    if (shareImagePreview) {
        shareImagePreview.addEventListener('contextmenu', () => {
            hasSavedOrCopied = true;
        });

        let pressTimer = null;
        const startPress = () => {
            pressTimer = setTimeout(() => {
                hasSavedOrCopied = true;
            }, 400);
        };
        const cancelPress = () => {
            if (pressTimer) {
                clearTimeout(pressTimer);
                pressTimer = null;
            }
        };
        shareImagePreview.addEventListener('touchstart', startPress, { passive: true });
        shareImagePreview.addEventListener('touchend', cancelPress, { passive: true });
        shareImagePreview.addEventListener('touchcancel', cancelPress, { passive: true });
        shareImagePreview.addEventListener('pointerdown', startPress);
        shareImagePreview.addEventListener('pointerup', cancelPress);
        shareImagePreview.addEventListener('pointercancel', cancelPress);
    }

    generateBtn.addEventListener('click', () => {
        if (isNgWordDetected) {
            showToast('使用できないキーワードが含まれています');
            return;
        }
        const dataUrl = getGeneratedDataURL();
        shareImagePreview.src = dataUrl;

        // Reset saved/copied flag and switch back to step 1
        hasSavedOrCopied = false;
        if (shareStep1) shareStep1.style.display = '';
        if (shareStep2) shareStep2.style.display = 'none';

        // Twitter Intent Link Setup
        const text = encodeURIComponent(`「超回復 ${state.textKeyword || '温泉'}パワー発動!」画像を作成しました！\n#なんでも超回復メーカー #ウマ娘`);
        twitterShareBtn.href = `https://twitter.com/intent/tweet?text=${text}`;

        shareModal.classList.add('active');
    });

    downloadModalBtn.addEventListener('click', () => {
        hasSavedOrCopied = true;
        const dataUrl = getGeneratedDataURL();
        const a = document.createElement('a');
        a.href = dataUrl;
        a.download = `hyper_recovery_${Date.now()}.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        showToast('画像を保存しました');
    });

    twitterShareBtn.addEventListener('click', (e) => {
        if (!hasSavedOrCopied) {
            e.preventDefault();
            if (shareStep1) shareStep1.style.display = 'none';
            if (shareStep2) shareStep2.style.display = '';
        }
    });

    if (copyAndShareBtn) {
        copyAndShareBtn.addEventListener('click', async () => {
            hasSavedOrCopied = true;
            const twitterUrl = twitterShareBtn.href;
            try {
                canvas.toBlob(async (blob) => {
                    if (blob && navigator.clipboard && navigator.clipboard.write) {
                        try {
                            const item = new ClipboardItem({ 'image/png': blob });
                            await navigator.clipboard.write([item]);
                            showToast('画像をクリップボードにコピーしました');
                        } catch (err) {
                            showToast('コピーに失敗しました');
                        }
                    } else {
                        showToast('お使いの環境ではコピーに対応していません');
                    }
                    if (twitterUrl) {
                        window.open(twitterUrl, '_blank', 'noopener,noreferrer');
                    }
                });
            } catch (err) {
                if (twitterUrl) {
                    window.open(twitterUrl, '_blank', 'noopener,noreferrer');
                }
            }
        });
    }

    if (shareStep2BackBtn) {
        shareStep2BackBtn.addEventListener('click', () => {
            if (shareStep2) shareStep2.style.display = 'none';
            if (shareStep1) shareStep1.style.display = '';
        });
    }

    copyBtn.addEventListener('click', async () => {
        if (isNgWordDetected) {
            showToast('使用できないキーワードが含まれています');
            return;
        }
        try {
            canvas.toBlob(async (blob) => {
                if (!blob) {
                    showToast('画像の生成に失敗しました');
                    return;
                }
                const item = new ClipboardItem({ 'image/png': blob });
                await navigator.clipboard.write([item]);
                hasSavedOrCopied = true;
                showToast('画像をクリップボードにコピーしました');
            });
        } catch (err) {
            showToast('コピーに失敗しました（ブラウザ非対応）');
        }
    });

    closeModalBtn.addEventListener('click', () => {
        shareModal.classList.remove('active');
    });

    shareModal.addEventListener('click', (e) => {
        if (e.target === shareModal) {
            shareModal.classList.remove('active');
        }
    });

    // Prevent double-tap zoom on mobile devices (e.g. iOS Safari)
    let lastTouchEnd = 0;
    document.addEventListener('touchend', (e) => {
        const now = Date.now();
        if (now - lastTouchEnd <= 300) {
            const target = e.target;
            const isInputField = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;
            if (!isInputField) {
                e.preventDefault();
            }
        }
        lastTouchEnd = now;
    }, { passive: false });

    // Initial Setup: Load NG words and render Canvas safely once WebFont is ready
    loadNgWords();
    renderCanvasSafe(100);
});
