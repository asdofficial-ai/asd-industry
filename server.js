/* ASD Industry v0.3 reconstruction — static demo, no personal data API. */
const express = require("express");
const path = require("node:path");
const app = express();
const PORT = Number(process.env.PORT) || 3000;
app.disable("x-powered-by");
app.use((req, res, next) => {
  const founderGooglePage=req.path==="/founder-login.html";
  // Only the Founder sign-in page may load Google's official identity widget.
  const csp=founderGooglePage
    ? "default-src 'self'; script-src 'self' https://accounts.google.com/gsi/client; style-src 'self' 'unsafe-inline' https://accounts.google.com; img-src 'self' data: https://accounts.google.com https://lh3.googleusercontent.com; frame-src https://accounts.google.com; connect-src 'self' https://accounts.google.com; object-src 'none'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'"
    : "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data: https://images.unsplash.com; connect-src 'self'; object-src 'none'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'";
  res.set({
    "Content-Security-Policy": csp,
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "no-referrer",
    "Permissions-Policy": "camera=(), microphone=(), geolocation=()"
  });
  next();
});
app.get("/health", (req, res) => res.json({
  status: "ok",
  service: "asd-industry",
  version: "v0.7-staff-backend-staged",
  mode: "demo"
}));
app.get("/api/status", (req, res) => res.json({
  mode: "demo",
  message: "No accounts, payments, real matching, or personal information endpoints are enabled."
}));
// Staff API is fail-closed and has no open registration. It requires dedicated credentials and database.
app.use("/api/staff", require("./lib/human-staff-api").router());
app.use(express.static(path.join(__dirname, "public")));
app.use((req, res) => res.status(404).json({ error: "Not found" }));
if (require.main === module) {
  app.listen(PORT, "0.0.0.0", () => console.log("ASD Industry demo listening on " + PORT));
}
module.exports = app;
