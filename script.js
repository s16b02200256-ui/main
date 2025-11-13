// HTML要素を取得
const videoElement = document.getElementById('video');
const canvasElement = document.getElementById('canvas');
const canvasCtx = canvasElement.getContext('2d');
const centerText = document.getElementById('centerText');
const stopButton = document.getElementById('stopButton');

// =======================
// 🔸 設定
// =======================
const TRAIL_LENGTH = 50; // 軌跡の長さ（過去50フレーム分）
let centerTrail = [];    // 重心の軌跡を格納

// =======================
// 🔸 MediaPipe Pose 初期化
// =======================
const pose = new Pose({
  locateFile: (file) => {
    return `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`;
  }
});

pose.setOptions({
  modelComplexity: 1,
  smoothLandmarks: true,
  enableSegmentation: false,
  smoothSegmentation: true,
  minDetectionConfidence: 0.5,
  minTrackingConfidence: 0.5
});

// =======================
// 🔸 onResults：描画処理
// =======================
pose.onResults((results) => {
  canvasCtx.save();
  canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
  canvasCtx.drawImage(results.image, 0, 0, canvasElement.width, canvasElement.height);

  if (results.poseLandmarks) {
    // ----------- ランドマーク描画 -----------
    drawConnectors(canvasCtx, results.poseLandmarks, POSE_CONNECTIONS, {
      color: '#00FF00',
      lineWidth: 2
    });
    drawLandmarks(canvasCtx, results.poseLandmarks, {
      color: '#FF0000',
      radius: 3
    });

    // ----------- 重心計算 -----------
    let cx = 0, cy = 0;
    results.poseLandmarks.forEach((lm) => {
      cx += lm.x;
      cy += lm.y;
    });
    cx /= results.poseLandmarks.length;
    cy /= results.poseLandmarks.length;

    // ピクセル座標に変換
    const px = cx * canvasElement.width;
    const py = cy * canvasElement.height;

    // ----------- 軌跡を更新 -----------
    centerTrail.push({ x: px, y: py });
    if (centerTrail.length > TRAIL_LENGTH) {
      centerTrail.shift(); // 古い点を削除
    }

    // ----------- 軌跡を描画 -----------
    canvasCtx.beginPath();
    for (let i = 0; i < centerTrail.length; i++) {
      const alpha = i / centerTrail.length; // 古い点ほど薄く
      const pt = centerTrail[i];
      canvasCtx.fillStyle = `rgba(255, 215, 0, ${alpha})`;
      canvasCtx.beginPath();
      canvasCtx.arc(pt.x, pt.y, 4, 0, 2 * Math.PI);
      canvasCtx.fill();
    }

    // ----------- 現在の重心点を描画 -----------
    canvasCtx.beginPath();
    canvasCtx.arc(px, py, 8, 0, 2 * Math.PI);
    canvasCtx.fillStyle = 'rgba(0, 191, 255, 0.9)'; // 水色
    canvasCtx.fill();

    // ----------- テキスト更新 -----------
    centerText.innerText = `重心 (x, y) = (${cx.toFixed(3)}, ${cy.toFixed(3)})`;
  }

  canvasCtx.restore();
});

// =======================
// 🔸 カメラ起動処理
// =======================
const camera = new Camera(videoElement, {
  onFrame: async () => {
    await pose.send({ image: videoElement });
  },
  width: 640,
  height: 480
});
camera.start();

// =======================
// 🔸 カメラ停止処理
// =======================
stopButton.addEventListener('click', () => {
  camera.stop();
  centerText.innerText = 'カメラ停止中';
  centerTrail = []; // 軌跡リセット
});
