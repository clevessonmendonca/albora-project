import http from "k6/http";
import { check, sleep } from "k6";
import { Rate, Trend } from "k6/metrics";
import { uuidv4 } from "https://jslib.k6.io/k6-utils/1.4.0/index.js";

const uploadLatency = new Trend("upload_latency", true);
const presignLatency = new Trend("presign_latency", true);
const r2UploadLatency = new Trend("r2_upload_latency", true);
const confirmLatency = new Trend("confirm_latency", true);
const uploadFailRate = new Rate("upload_fail_rate");

export const options = {
  scenarios: {
    wedding_rush: {
      executor: "ramping-vus",
      startVUs: 0,
      stages: [
        { duration: "2m", target: 30 },
        { duration: "16m", target: 30 },
        { duration: "2m", target: 0 },
      ],
    },
  },
  thresholds: {
    upload_latency: ["p(95)<3000"],
    upload_fail_rate: ["rate<0.01"],
    http_req_failed: ["rate<0.01"],
  },
};

const SAMPLE_JPEG = open("./sample-400kb.jpg", "b");

export default function () {
  const base = __ENV.BASE_URL;
  const eventId = __ENV.EVENT_ID;
  const token = __ENV.GUEST_TOKEN;

  if (!base || !eventId || !token) {
    console.error("Missing env vars: BASE_URL, EVENT_ID, GUEST_TOKEN");
    uploadFailRate.add(1);
    return;
  }

  const uploadId = uuidv4();
  const startTime = Date.now();

  // Step 1: Presign
  const presignStart = Date.now();
  const presignRes = http.post(
    `${base}/api/uploads/presign`,
    JSON.stringify({ uploadId, mime: "image/jpeg", bytes: SAMPLE_JPEG.length }),
    {
      headers: {
        "Content-Type": "application/json",
        Cookie: `sessao_convidado=${token}`,
      },
    }
  );
  const presignTime = Date.now() - presignStart;
  presignLatency.add(presignTime);

  const presignOk = check(presignRes, {
    "presign 200": (r) => r.status === 200,
  });
  if (!presignOk) {
    uploadFailRate.add(1);
    return;
  }

  let presignData;
  try {
    presignData = presignRes.json();
  } catch (e) {
    uploadFailRate.add(1);
    return;
  }

  if (!presignData.full || !presignData.chave) {
    uploadFailRate.add(1);
    return;
  }

  // Step 2: Upload to R2 (full)
  const r2UploadStart = Date.now();
  const uploadRes = http.put(presignData.full, SAMPLE_JPEG, {
    headers: { "Content-Type": "image/jpeg" },
  });
  const r2UploadTime = Date.now() - r2UploadStart;
  r2UploadLatency.add(r2UploadTime);

  const uploadOk = check(uploadRes, {
    "R2 upload 200": (r) => r.status === 200,
  });

  if (!uploadOk) {
    uploadFailRate.add(1);
    return;
  }

  // Step 3: Confirm
  const confirmStart = Date.now();
  const confirmRes = http.post(
    `${base}/api/uploads/confirm`,
    JSON.stringify({ uploadId, chave: presignData.chave, mime: "image/jpeg", legenda: "test" }),
    {
      headers: {
        "Content-Type": "application/json",
        Cookie: `sessao_convidado=${token}`,
      },
    }
  );
  const confirmTime = Date.now() - confirmStart;
  confirmLatency.add(confirmTime);

  check(confirmRes, {
    "confirm 200": (r) => r.status === 200,
    "confirm success state": (r) => {
      try {
        return r.json().estado === "criado";
      } catch {
        return false;
      }
    }
  });

  const totalTime = Date.now() - startTime;
  uploadLatency.add(totalTime);
  uploadFailRate.add(!uploadOk ? 1 : 0);

  sleep(Math.random() * 4 + 1);
}
