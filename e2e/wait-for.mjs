// 둘째 webServer가 첫째 서버의 빌드가 끝날 때까지 기다린다(같은 .next를 쓰므로 동시에 빌드하지 않게).
const url = process.argv[2];
const deadline = Date.now() + 280_000;
for (;;) {
  try {
    const r = await fetch(url);
    if (r.status < 500) process.exit(0);
  } catch {
    /* 아직 */
  }
  if (Date.now() > deadline) process.exit(1);
  await new Promise((r) => setTimeout(r, 500));
}
