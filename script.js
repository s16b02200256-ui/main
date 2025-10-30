const videoElement = document.getElementsByClassName('input_video')[0];
const canvasElement = document.getElementsByClassName('output_canvas')[0];
const canvasCtx = canvasElement.getContext('2d');

let historyUpper = [];
let historyLower = [];
let historyCombined = [];

// Poseモジュールのインスタンス生成方法を修正！ 111
const pose = new Pose({
  locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`,
});

pose.setOptions({
  modelComplexity: 1,
  smoothLandmarks: true,
  minDetectionConfidence: 0.5,
  minTrackingConfidence: 0.5,
});

pose.onResults(onResults);

function onResults(results) {
  canvasCtx.save();
  canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);

  canvasCtx.drawImage(results.image, 0, 0, canvasElement.width, canvasElement.height);

  if (!results.poseLandmarks) return;

  drawConnectors(canvasCtx, results.poseLandmarks, Pose.POSE_CONNECTIONS,
    {color: '#00FFAA', lineWidth: 2});
  drawLandmarks(canvasCtx, results.poseLandmarks,
    {color: '#FFFFFF', lineWidth: 1});

  const landmarks = results.poseLandmarks;
  const upperBodyIdx = [11, 12, 23, 24];
  const lowerBodyIdx = [23, 24, 27, 28];

  const centroidUpper = calcCentroid(upperBodyIdx, landmarks);
  const centroidLower = calcCentroid(lowerBodyIdx, landmarks);
  const centroidCombined = {
    x: (centroidUpper.x + centroidLower.x) / 2,
    y: (centroidUpper.y + centroidLower.y) / 2
  };

  drawPoint(centroidUpper, "blue", "Upper");
  drawPoint(centroidLower, "magenta", "Lower");
  drawPoint(centroidCombined, "red", "Combined");

  historyUpper.push(centroidUpper);
  historyLower.push(centroidLower);
  historyCombined.push(centroidCombined);
  if (historyUpper.length > 50) historyUpper.shift();
  if (historyLower.length > 50) historyLower.shift();
  if (historyCombined.length > 50) historyCombined.shift();

  drawTrajectory(historyUpper, "blue");
  drawTrajectory(historyLower, "magenta");
  drawTrajectory(historyCombined, "red");

  canvasCtx.restore();
}

function calcCentroid(indexes, landmarks) {
  let sumX = 0, sumY = 0;
  indexes.forEach(i => {
    sumX += landmarks[i].x;
    sumY += landmarks[i].y;
  });
  return {x: sumX / indexes.length, y: sumY / indexes.length};
}

function drawPoint(centroid, color, label) {
  const x = centroid.x * canvasElement.width;
  const y = centroid.y * canvasElement.height;
  canvasCtx.beginPath();
  canvasCtx.arc(x, y, 5, 0, 2 * Math.PI);
  canvasCtx.fillStyle = color;
  canvasCtx.fill();
  canvasCtx.font = "12px Arial";
  canvasCtx.fillText(label, x + 8, y - 8);
}

function drawTrajectory(history, color) {
  if (history.length < 2) return;
  canvasCtx.beginPath();
  canvasCtx.moveTo(history[0].x * canvasElement.width, history[0].y * canvasElement.height);
  for (let i = 1; i < history.length; i++) {
    canvasCtx.lineTo(history[i].x * canvasElement.width, history[i].y * canvasElement.height);
  }
  canvasCtx.strokeStyle = color;
  canvasCtx.lineWidth = 2;
  canvasCtx.stroke();
}

// ✅ カメラ起動部（最新版の呼び出し方法）
const camera = new Camera(videoElement, {
  onFrame: async () => {
    await pose.send({image: videoElement});
  },
  width: 640,
  height: 480,
});
camera.start();