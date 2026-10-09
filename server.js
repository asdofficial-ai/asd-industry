/* ASD Industry v0.3 reconstruction — static demo, no personal data API. */
const express = require("express");
const path = require("node:path");
const app = express();
const PORT = Number(process.env.PORT) || 3000;
app.disable("x-powered-by");
app.use((req, res, next) => {
  res.set({
    "Content-Security-Policy": "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data: https://images.unsplash.com; connect-src 'self'; object-src 'none'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'",
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "no-referrer",
    "Permissions-Policy": "camera=(), microphone=(), geolocation=()"
  });
  next();
});
app.get("/health", (req, res) => res.json({
  status: "ok",
  service: "asd-industry",
  version: "v0.4-account-foundation",
  mode: "demo"
}));
app.get("/api/status", (req, res) => res.json({
  mode: "demo",
  message: "No accounts, payments, real matching, or personal information endpoints are enabled."
}));
// Beta API fails closed unless all server-side secrets and invite flags are configured.
app.use("/api/beta", require("./lib/account-api").accountRouter());
app.use(express.static(path.join(__dirname, "public")));
app.use((req, res) => res.status(404).json({ error: "Not found" }));
if (require.main === module) {
  app.listen(PORT, "0.0.0.0", () => console.log("ASD Industry demo listening on " + PORT));
}
module.exports = app;
