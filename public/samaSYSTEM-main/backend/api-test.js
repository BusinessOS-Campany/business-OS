export default (req, res) => {
  res.status(200).json({ ok: true, cwd: process.cwd(), node: process.version, file: import.meta.url });
};
