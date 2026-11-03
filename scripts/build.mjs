import { cp, mkdir, rm } from "node:fs/promises";
await rm("site", { recursive: true, force: true });
await mkdir("site", { recursive: true });
await cp("public", "site", { recursive: true });
await cp("dist", "site/js", { recursive: true });
