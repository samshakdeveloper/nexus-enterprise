import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

import dotenv from "dotenv";

function runCommand(command: string, envParams: Record<string, string>): void {
  execSync(command, {
    stdio: "inherit",
    env: { ...process.env, ...envParams },
  });
}

function replaceEnvVariables(manifest: string, envConfig: Record<string, string>): string {
  return manifest.replace(/\$\{([^}]+)\}/g, (match: string, envName: string) => {
    const envValue = Object.prototype.hasOwnProperty.call(envConfig, envName)
      ? envConfig[envName]
      : process.env[envName];

    if (!envValue) {
      throw new Error(`❌ Deployment Failed: Missing environment variable "\${${envName}}" in .env or process.env`);
    }

    return envValue;
  });
}

const REQUIRED_CRDS: Array<{ crd: string; provider: string }> = [
  { crd: "servicemonitors.monitoring.coreos.com", provider: "kube-prometheus-stack (ArgoCD app)" },
  { crd: "clusters.postgresql.cnpg.io", provider: "CloudNativePG operator" },
  { crd: "kafkas.kafka.strimzi.io", provider: "Strimzi operator" },
  { crd: "gateways.gateway.networking.k8s.io", provider: "Gateway API / Envoy Gateway" },
];

function sleepMs(ms: number): void {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

// اگر اپراتورها نصب نباشند، apply با خطای گنگ "no matches for kind" می‌شکند و pod ها هرگز بالا نمی‌آیند.
function waitForCrds(timeoutMs = 300_000): void {
  const deadline = Date.now() + timeoutMs;
  const missing = new Set(REQUIRED_CRDS.map((item) => item.crd));

  while (missing.size > 0 && Date.now() < deadline) {
    for (const crd of [...missing]) {
      try {
        execSync(`kubectl get crd ${crd}`, { stdio: "ignore" });
        missing.delete(crd);
      } catch {
        // هنوز نصب نشده
      }
    }
    if (missing.size > 0) sleepMs(5000);
  }

  if (missing.size > 0) {
    const details = REQUIRED_CRDS.filter((item) => missing.has(item.crd))
      .map((item) => `  - ${item.crd}  →  ${item.provider}`)
      .join("\n");
    throw new Error(`CRDهای زیر در کلستر نیستند (اپراتور مربوطه را نصب کن):\n${details}`);
  }
}

function main(): void {
  const rootDir = process.cwd();
  const envPath = path.join(rootDir, ".env");

  if (!fs.existsSync(envPath)) {
    console.error("❌ Error: .env file not found in root directory!");
    process.exit(1);
  }

  const envConfig = dotenv.parse(fs.readFileSync(envPath));
  const mergedEnv = { ...process.env, ...envConfig, DOCKER_BUILDKIT: "1" };

  // ۱. بیلد موازی تمام سرویس‌ها و ورکرها با استفاده از Turborepo و npm
  console.log("⚡ [1/3] Building ALL Docker Images in Parallel using npx turbo...");
  runCommand("npx turbo run docker:build --concurrency=100%", mergedEnv);

  // ۲. اعمال Applicationهای ArgoCD مربوط به مانیتورینگ
  console.log("📈 [2/3] Applying ArgoCD Applications for Monitoring Stack...");
  runCommand("kubectl apply -n argocd -f platform/argocd/apps/", mergedEnv);

  console.log("🔎 Checking required CRDs / operators...");
  waitForCrds();

  // ۳. اعمال مانیفست‌های اصلی پروژه روی کوبرنتیز
  console.log("🚀 [3/3] Applying Manifests to Kubernetes Cluster...");
  const rawManifests = execSync("kubectl kustomize k8s/overlays/dev", {
    encoding: "utf8",
    env: mergedEnv,
  });

  const processedManifests = replaceEnvVariables(rawManifests, envConfig);

  // spec.template در Job تغییرناپذیر است؛ Jobهای یک‌بارمصرف را قبل از apply پاک می‌کنیم تا دوباره ساخته شوند
  execSync("kubectl -n nexus-dev delete job minio-create-bucket --ignore-not-found", { stdio: "inherit" });

  execSync("kubectl apply -f -", {
    input: processedManifests,
    stdio: ["pipe", "inherit", "inherit"],
  });

  console.log("✅ Enterprise Deployment Pipeline Executed Successfully!");
}

try {
  main();
} catch (err) {
  console.error("❌ Deployment script failed:", err);
  process.exit(1);
}
